import { cp, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import { checkDocumentation, isCandidate, isCurrentReview, sameCandidate, type DocumentationCandidate } from './check-documentation.ts';
import { measureArtifact, evaluateBudgets, type ArtifactSizes } from './check-performance.ts';
import { acquisitionFingerprint, applicationFingerprint, conditionsDigest, githubValue, rankedFixtures, rankedPaths, validateTestOrigin, validateReviewedTdd } from './publication.ts';
import { readPublicationCheckpoint } from './acquire.ts';
import { DATA_LIMITS, validateCatalogue, validateSittingRecord, type Catalogue, type SittingRecord } from '../src/source.ts';

/** Immutable provider archive selection; it grants no publication authority. */
export interface CiArtifactSelection { runId: string; runAttempt: number; artifactId: string; archiveDigest: string }
/** Reviewed evidence locator retains the original tested PR context and producing identities. */
export interface CiLocator {
  schemaVersion: 1; repository: string; testedRevision: string;
  pullRequest: { number: number; headRepository: string; baseRepository: string; baseRevision: string };
  candidate: CiArtifactSelection; laboratory: CiArtifactSelection; evidence: CiArtifactSelection;
}
/** Actual CI execution context and fixed downloaded native inputs; controlled boundaries are test-only. */
export interface CiInputOptions {
  root: string; work: string; locatorPath: string; repository: string;
  runId: string; runAttempt: number; producingRevision: string; checkedOutRevision: string; pullRequest: number; baseRevision: string;
  sourceArtifact?: CiArtifactSelection; testOrigin?: string;
  transport?: typeof fetch; now?: () => number;
  command?: (kind: 'build' | 'checks', root: string) => Promise<void>;
}
/** CI artifacts are evidence for merge checks, never accepted/served publication state. */
export interface CiInputResult {
  scope: 'merge-only'; candidate: DocumentationCandidate; artifact: string;
  performanceReport: string; documentationReport: string;
  producingRevision: string; checkedOutRevision: string;
  publicationEligible: false;
}


type Json = Record<string, any>;
const week = 604_800_000;
/** Rejects an unverified CI requirement.
 * @param condition Independently checked requirement.
 * @param message Concrete failed boundary.
 * @returns Control only when the requirement holds.
 * @throws On a missing or inconsistent requirement.
 */
function requireInput(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
/** Narrows untrusted JSON without accepting trust flags.
 * @param value Parsed metadata.
 * @returns Original object.
 * @throws On null, arrays or scalar input.
 */
function object(value: unknown): Json { requireInput(value !== null && typeof value === 'object' && !Array.isArray(value), 'CI metadata object required'); return value as Json; }
/** Requires canonical positive provider identities.
 * @param value API integer or requested string.
 * @returns Lossless canonical ID.
 * @throws On unsafe, nonpositive or noncanonical input.
 */
function id(value: unknown): string { if (typeof value === 'number') { requireInput(Number.isSafeInteger(value) && value > 0, 'Invalid CI identifier'); return String(value); } requireInput(typeof value === 'string' && /^[1-9]\d*$/.test(value), 'Invalid CI identifier'); return value; }
/** Requires an exact hexadecimal identity.
 * @param value Revision or digest.
 * @param length Required hexadecimal length.
 * @returns Original validated identity.
 * @throws On malformed identity.
 */
function hex(value: unknown, length: number): string { requireInput(typeof value === 'string' && new RegExp('^[a-f0-9]{' + length + '}$').test(value), 'Invalid CI revision/digest'); return value; }
/** Requires a real UTC provider timestamp.
 * @param value Provider time.
 * @returns Exact milliseconds.
 * @throws On impossible or malformed UTC times.
 */
function instant(value: unknown): number { requireInput(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), 'Invalid CI timestamp'); const parsed = Date.parse(value); requireInput(Number.isFinite(parsed) && new Date(parsed).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z')), 'Impossible CI timestamp'); return parsed; }
/** Reads mandatory native ordinary-file JSON.
 * @param path Fixed downloaded metadata path.
 * @returns Original parsed metadata.
 * @throws On missing, symbolic, nonregular or malformed input.
 */
async function json(path: string): Promise<any> { requireInput((await lstat(path)).isFile(), 'Ordinary CI input file required'); return JSON.parse(await readFile(path, 'utf8')); }
/** Writes external merge-only result metadata.
 * @param path Fixed private output path.
 * @param value Actual observed result.
 * @returns Completion after native writing.
 * @throws On native write failure.
 * @remarks Creates private parents and writes metadata outside the frozen site.
 */
async function put(path: string, value: unknown): Promise<void> { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value)); }
/** Validates concrete execution options before provider access.
 * @param supplied Actual workflow context or controlled test boundary.
 * @returns Shape-checked execution context.
 * @throws On invalid paths, repository, IDs, revisions or clock.
 */
function context(supplied: unknown): CiInputOptions { const value = object(supplied); requireInput(typeof value.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository), 'Invalid CI repository'); for (const key of ['root', 'work', 'locatorPath']) requireInput(typeof value[key] === 'string' && resolve(value[key]) === value[key], 'Absolute CI paths required'); id(value.runId); requireInput(Number.isSafeInteger(value.runAttempt) && value.runAttempt > 0 && Number.isSafeInteger(value.pullRequest) && value.pullRequest > 0, 'Invalid CI attempt/PR'); hex(value.producingRevision, 40); hex(value.checkedOutRevision, 40); hex(value.baseRevision, 40); requireInput(Number.isFinite((value.now ?? Date.now)()), 'Invalid CI clock'); return supplied as CiInputOptions; }
/** Reads one independently authenticated provider object.
 * @param path Fixed validated repository REST path.
 * @param options Actual repository/token/transport context.
 * @returns Native provider metadata.
 * @throws On HTTP or malformed provider data.
 */
async function api(path: string, options: CiInputOptions): Promise<Json> { return object(await githubValue(path, options)); }
/** Accepts the documented optional workflow ref suffix without changing the reviewed path.
 * @param actual Native workflow run path.
 * @param expected Reviewed workflow resource path.
 * @returns Whether the underlying workflow is exact.
 */
function workflowPath(actual: unknown, expected: unknown): boolean { return typeof actual === 'string' && typeof expected === 'string' && actual.split('@')[0] === expected; }
/** Checks original PR metadata independently of the current checked-out head.
 * @param value Original downloaded PR context.
 * @param options Current authentic repository/PR context.
 * @returns Validated original PR context.
 * @throws On foreign PR identities or malformed frozen base revision.
 */
function prContext(value: unknown, options: CiInputOptions): CiLocator['pullRequest'] { const pr = object(value); requireInput(pr.number === options.pullRequest && pr.headRepository === options.repository && pr.baseRepository === options.repository, 'CI original PR context mismatch'); hex(pr.baseRevision, 40); return pr as CiLocator['pullRequest']; }
/** Authenticates actual producer and explicit PR checkout as separate facts.
 * @param options Actual execution context.
 * @param manual Whether preparation requires reviewed-main dispatch.
 * @returns Provider repository identity and current authentic PR context.
 * @throws On repository/workflow/head/base/merge-SHA mismatches.
 */
async function executing(options: CiInputOptions, manual: boolean): Promise<{ repositoryId: string; pull: Json }> {
 const repo = await api('', options); requireInput(repo.full_name === options.repository && repo.private === false && repo.default_branch === 'main', 'CI repository must be the reviewed public main repository'); const repositoryId = id(repo.id);
 const run = await api('/actions/runs/' + options.runId + '/attempts/' + options.runAttempt, options); const workflow = await api('/actions/workflows/ci.yml', options);
 requireInput(id(run.id) === options.runId && run.run_attempt === options.runAttempt && id(object(run.repository).id) === repositoryId && object(run.repository).full_name === options.repository && id(object(run.head_repository).id) === repositoryId && object(run.head_repository).full_name === options.repository, 'CI executing repository/run mismatch');
 requireInput(workflow.state === 'active' && workflow.path === '.github/workflows/ci.yml' && workflowPath(run.path, workflow.path) && id(run.workflow_id) === id(workflow.id), 'CI executing workflow mismatch');
 const pull = await api('/pulls/' + options.pullRequest, options); requireInput(pull.number === options.pullRequest && pull.state === 'open' && object(pull.head).sha === options.checkedOutRevision && object(pull.base).sha === options.baseRevision && object(pull.base).ref === 'main', 'Actual PR checkout/base mismatch');
 for (const side of ['head', 'base']) { const repository = object(object(pull[side]).repo); requireInput(repository.full_name === options.repository && id(repository.id) === repositoryId, 'Actual PR repository mismatch'); }
 const comparison = await api('/compare/' + options.baseRevision + '...' + options.checkedOutRevision, options); requireInput((comparison.status === 'ahead' || comparison.status === 'identical') && comparison.behind_by === 0 && object(comparison.base_commit).sha === options.baseRevision && object(comparison.merge_base_commit).sha === options.baseRevision, 'Current main base is not an ancestor of tested PR checkout');
 if (manual) requireInput(run.event === 'workflow_dispatch' && run.head_branch === 'main' && run.head_sha === options.producingRevision && Array.isArray(run.pull_requests) && run.pull_requests.length === 0, 'CI preparation requires actual reviewed-main manual producer');
 else { requireInput(run.event === 'pull_request' && run.head_sha === options.checkedOutRevision && pull.merge_commit_sha === options.producingRevision && Array.isArray(run.pull_requests) && run.pull_requests.length === 1, 'CI actual PR head/test-merge producer mismatch'); const linked = object(run.pull_requests[0]); requireInput(linked.number === options.pullRequest && object(linked.head).sha === options.checkedOutRevision && object(linked.base).sha === options.baseRevision, 'Executing PR association mismatch'); for (const side of ['head', 'base']) requireInput(id(object(object(linked[side]).repo).id) === repositoryId, 'Executing PR repository association mismatch'); }
 return { repositoryId, pull };
}
/** Validates immutable artifact selection shapes before using them as API paths.
 * @param value Requested fixed-role archive selection.
 * @returns Canonical selection with no authority inferred from downloaded claims.
 * @throws On malformed archive identities.
 */
function selection(value: unknown): CiArtifactSelection { const chosen = object(value); id(chosen.runId); id(chosen.artifactId); requireInput(typeof chosen.runId === 'string' && typeof chosen.artifactId === 'string' && Number.isSafeInteger(chosen.runAttempt) && chosen.runAttempt > 0, 'Invalid CI archive selection'); hex(chosen.archiveDigest, 64); return chosen as CiArtifactSelection; }
/** Authenticates a fixed immutable archive and its completed reviewed-main producer.
 * @param input Original selected run/attempt/archive/digest.
 * @param role Fixed reviewed artifact role.
 * @param options Actual current execution context.
 * @param repositoryId Independent current repository ID.
 * @returns Genuine producing revision and archive metadata.
 * @throws On failed, foreign, expired, substituted or unreviewed origins.
 */
async function authenticate(input: unknown, role: 'hansard-ci-candidate' | 'hansard-ci-lab' | 'hansard-evidence' | 'hansard-state', options: CiInputOptions, repositoryId: string): Promise<{ revision: string; run: Json }> {
 const chosen = selection(input); const run = await api('/actions/runs/' + chosen.runId + '/attempts/' + chosen.runAttempt, options); const archive = await api('/actions/artifacts/' + chosen.artifactId, options); const file = role.startsWith('hansard-ci-') ? 'ci.yml' : 'pages.yml'; const workflow = await api('/actions/workflows/' + file, options);
 requireInput(id(run.id) === chosen.runId && run.run_attempt === chosen.runAttempt && run.status === 'completed' && run.conclusion === 'success' && run.head_branch === 'main' && (run.event === 'workflow_dispatch' || file === 'pages.yml' && run.event === 'schedule') && Array.isArray(run.pull_requests) && run.pull_requests.length === 0, 'CI imported producer did not complete reviewed-main work');
 for (const key of ['repository', 'head_repository']) requireInput(id(object(run[key]).id) === repositoryId && object(run[key]).full_name === options.repository, 'CI imported repository mismatch');
 requireInput(workflow.path === '.github/workflows/' + file && workflow.state === 'active' && workflowPath(run.path, workflow.path) && id(run.workflow_id) === id(workflow.id), 'CI imported workflow mismatch'); const revision = hex(run.head_sha, 40); const bound = object(archive.workflow_run);
 requireInput(id(archive.id) === chosen.artifactId && archive.name === role && archive.expired === false && archive.digest === 'sha256:' + chosen.archiveDigest && id(bound.id) === chosen.runId && id(bound.repository_id) === repositoryId && id(bound.head_repository_id) === repositoryId && bound.head_branch === 'main' && bound.head_sha === revision, 'CI immutable archive origin/digest mismatch');
 const at = (options.now ?? Date.now)(); const created = instant(archive.created_at); const expires = instant(archive.expires_at); const started = instant(run.run_started_at); requireInput(instant(run.created_at) <= started && started <= created && created <= instant(run.updated_at) && instant(run.updated_at) <= at && created <= at && at - created <= week && expires > at && expires - created <= week, 'CI artifact expiry/producer chronology mismatch'); return { revision, run };
}
/** Requires exact candidate and current applicability for one independent report.
 * @param report Original report metadata.
 * @param candidate Independently measured candidate.
 * @param now Independent current UTC time.
 * @throws On a mismatched or expired report.
 */
function reviewed(report: Json, candidate: DocumentationCandidate, now: string): void { requireInput(isCandidate(report.candidate) && sameCandidate(report.candidate, candidate) && isCurrentReview(report.reviewedAt, now), 'CI exact candidate/current review required'); }
/** Validates actual native automated receipts without treating source flags as provider authority.
 * @param report Complete native receipt.
 * @param candidate Original tested frozen candidate.
 * @param now Independent current time.
 * @throws On missing command/browser/source checks.
 */
function automated(report: Json, candidate: DocumentationCandidate, now: string): void { reviewed(report, candidate, now); requireInput(report.checkedOutRevision === candidate.sourceRevision && isDeepStrictEqual(report.browserEngines, ['chromium', 'firefox', 'webkit']), 'CI tested checkout/all browser engines required'); const checks = object(report.checks); for (const key of ['type', 'unit', 'build', 'browser', 'source']) requireInput(checks[key] === true, 'CI native ' + key + ' receipt failed'); }
/** Checks full native inventory accounting against the exact accepted catalogue.
 * @param report Source machine/human receipt.
 * @param candidate Exact tested frozen candidate.
 * @param catalogue Complete source catalogue.
 * @param original Independently selected source archive.
 * @param now Independent clock.
 * @param human Whether this is the separately reviewed full source report.
 * @throws On incomplete, mismatched or unapproved source evidence.
 */
function sourceReport(report: Json, candidate: DocumentationCandidate, catalogue: Catalogue, original: CiArtifactSelection, now: string, human: boolean): void { reviewed(report, candidate, now); let available = 0; let retained = 0; let unavailable = 0; for (const sitting of catalogue.sittings) { if (sitting.record.availability === 'unavailable') unavailable++; else available++; if (sitting.record.availability === 'retained') retained++; } requireInput(report.expected === catalogue.sittings.length && report.accounted === report.expected && report.available === available && report.retained === retained && report.unavailable === unavailable && isDeepStrictEqual(report.sourceArtifact, original) && (!human || report.reviewed === true), 'CI full source accounting/review mismatch'); }
/** Reads one already checksum-validated shard for actual member/gap fixture selection.
 * @param artifact Complete measured frozen site.
 * @param path Exact measured sitting path.
 * @param catalogue Coherent accepted source catalogue.
 * @returns Exact normalized source record.
 * @throws On mismatched sitting or invalid shard.
 */
async function record(artifact: string, path: string, catalogue: Catalogue): Promise<SittingRecord> { let sitting: Catalogue['sittings'][number] | null = null; for (const input of catalogue.sittings) if (input.record.path === path) sitting = input; requireInput(sitting, 'CI fixture is not an acquired sitting'); const value = JSON.parse(gunzipSync(await readFile(join(artifact, path)), { maxOutputLength: DATA_LIMITS.decoded }).toString('utf8')); return validateSittingRecord(value, sitting, catalogue); }
/** Selects a real assigned member without guessing from visible author labels.
 * @param value Exact normalized sitting record.
 * @returns Actual assigned member ID.
 * @throws If no matched member is available for the native reader fixture.
 */
function member(value: SittingRecord): string { for (const item of value.items) if (item.attribution === 'assigned' && item.memberId !== null) return item.memberId; throw new Error('CI fixture has no actual assigned member'); }
/** Validates collector roles, actual selected members and required largest/gap interactions.
 * @param manifest Downloaded collector-compatible fixture metadata.
 * @param candidate Exact measured candidate.
 * @param sizes Canonical full artifact measurements.
 * @param catalogue Actual accepted source catalogue.
 * @param artifact Fixed frozen site path.
 * @returns Validated collector manifest.
 * @throws On incorrect roles, absent members, unknown hashes or omitted interaction fixtures.
 */
async function fixtures(manifest: unknown, candidate: DocumentationCandidate, sizes: ArtifactSizes, catalogue: Catalogue, artifact: string): Promise<Json> {
 const value = object(manifest); const datasets = object(value.datasets); const ranks = rankedPaths(sizes); const required = rankedFixtures(sizes);
 for (const role of ['median', 'p95', 'largest'] as const) { const chosen = object(datasets[role]); requireInput(chosen.path === ranks[role], 'CI ranked fixture role mismatch'); await selectedFixture(chosen, candidate, catalogue, artifact); }
 requireInput(Array.isArray(value.interactions) && value.interactions.length > 0, 'CI gap/largest interaction fixtures missing'); let gap = false; let largest = false;
 for (const input of value.interactions) { const chosen = object(input); const value = await selectedFixture(chosen, candidate, catalogue, artifact); for (const [path, , digest] of sizes.files) if (path === chosen.path) required[path] = digest; if (chosen.path === ranks.largest) largest = true; for (const item of value.items) if (item.attribution === 'unassigned') gap = true; }
 requireInput(gap && largest, 'CI real gap and largest interactions required'); requireInput(isDeepStrictEqual(candidate.fixtureHashes, required), 'CI measured ranked/interaction fixture digest map mismatch'); return value;
}
/** Checks one exact source-backed reader pair.
 * @param chosen Selected path/member metadata.
 * @param candidate Complete fixture digest map.
 * @param catalogue Validated source catalogue.
 * @param artifact Frozen source path.
 * @returns Original normalized record.
 * @throws On an unmeasured file/member identity.
 */
async function selectedFixture(chosen: Json, candidate: DocumentationCandidate, catalogue: Catalogue, artifact: string): Promise<SittingRecord> { requireInput(typeof chosen.path === 'string' && Object.hasOwn(candidate.fixtureHashes, chosen.path) && typeof chosen.memberId === 'string', 'CI measured fixture identity required'); const value = await record(artifact, chosen.path, catalogue); let assigned = false; for (const item of value.items) if (item.attribution === 'assigned' && item.memberId === chosen.memberId) assigned = true; requireInput(assigned, 'CI fixture member absent'); return value; }
/** Reconciles every collector observation before applying the existing strict complete-report budgets.
 * @param lab Authenticated original laboratory-only output.
 * @param report Full reviewed report with actual targets and field disclosure.
 * @param candidate Independently measured candidate identity.
 * @param now Independent current UTC time.
 * @returns True only for exact copied laboratory facts and passing full-report budgets.
 * @throws On absent, substituted, expired or over-budget evidence.
 */
export function reconcileLabReport(lab: unknown, report: unknown, candidate: DocumentationCandidate, now: string): true { const original = object(lab); const full = object(report); requireInput(original.scope === 'laboratory-only', 'CI original laboratory scope required'); reviewed(original, candidate, now); reviewed(full, candidate, now); requireInput(Array.isArray(original.raw) && original.raw.length === 240, 'CI original raw lab observations incomplete'); for (const key of ['runner', 'profiles', 'servedBytes', 'raw']) requireInput(isDeepStrictEqual(original[key], full[key]), 'CI lab observation substituted: ' + key); return evaluateBudgets({ ...full, expectedCandidate: candidate, now }); }
/** Authenticates immutable CI inputs and current PR context without rebuilding frozen bytes.
 * @param supplied Actual PR checkout plus reviewed original locator and downloaded fixed inputs.
 * @returns Complete validated merge-only input paths and original producing/tested identities.
 * @throws On absent, untrusted, changed, stale or incomplete inputs/evidence.
 * @remarks Writes only the separate result.json after successful validation.
 */
export async function verifyCiInputs(supplied: unknown): Promise<CiInputResult> {
 const options = context(supplied); const current = await executing(options, false); const locator = object(await json(options.locatorPath)); requireInput(locator.schemaVersion === 1 && locator.repository === options.repository, 'CI locator schema/repository mismatch'); const originalPr = prContext(locator.pullRequest, options); const tested = hex(locator.testedRevision, 40);
 const origin = object(await json(join(options.work, 'candidate/origin.json'))); const candidate = await json(join(options.work, 'candidate/candidate.json')); requireInput(isCandidate(candidate) && candidate.sourceRevision === tested && candidate.conditionsDigest === conditionsDigest(), 'CI original tested candidate/current conditions mismatch');
 const producer = await authenticate(locator.candidate, 'hansard-ci-candidate', options, current.repositoryId); requireInput(origin.schemaVersion === 1 && origin.scope === 'merge-only' && origin.publicationEligible === false && origin.repository === options.repository && origin.runId === locator.candidate.runId && origin.runAttempt === locator.candidate.runAttempt && origin.producingRevision === producer.revision && origin.checkedOutRevision === tested && isDeepStrictEqual(origin.pullRequest, originalPr) && isCandidate(origin.candidate) && sameCandidate(origin.candidate, candidate), 'CI downloaded candidate producer/context mismatch');
 let belongs = false; for (let page = 1; ; page++) { const commits = await githubValue('/pulls/' + options.pullRequest + '/commits?per_page=100&page=' + page, options); requireInput(Array.isArray(commits), 'CI PR commit history missing'); for (const input of commits) if (object(input).sha === tested) belongs = true; if (commits.length < 100) break; } requireInput(belongs, 'CI original tested revision does not belong to current PR');
 await api('/commits/' + producer.revision, options); await api('/commits/' + originalPr.baseRevision, options);
 const labProducer = await authenticate(locator.laboratory, 'hansard-ci-lab', options, current.repositoryId); await authenticate(locator.evidence, 'hansard-evidence', options, current.repositoryId); const originalSource = selection(origin.sourceArtifact); await authenticate(originalSource, 'hansard-state', options, current.repositoryId);
 const labOrigin = object(await json(join(options.work, 'lab/origin.json'))); requireInput(labOrigin.repository === options.repository && labOrigin.runId === locator.laboratory.runId && labOrigin.runAttempt === locator.laboratory.runAttempt && labOrigin.producingRevision === labProducer.revision && labOrigin.checkedOutRevision === tested && isDeepStrictEqual(labOrigin.pullRequest, originalPr) && isDeepStrictEqual(labOrigin.candidateArtifact, locator.candidate) && isCandidate(labOrigin.candidate) && sameCandidate(labOrigin.candidate, candidate), 'CI original lab producer/candidate archive mismatch');
 const artifact = join(options.work, 'candidate/site'); const sizes = await measureArtifact(artifact); requireInput(sizes.complete && sizes.artifactDigest === candidate.artifactDigest && sizes.snapshot?.snapshotId === candidate.snapshotId && candidate.applicationFingerprint === await applicationFingerprint(options.root), 'CI frozen artifact/current app/source mismatch'); const catalogue = validateCatalogue(JSON.parse(gunzipSync(await readFile(join(artifact, 'data/catalogue.json.gz')), { maxOutputLength: DATA_LIMITS.decoded }).toString('utf8')));
 await fixtures(await json(join(options.work, 'candidate/fixtures.json')), candidate, sizes, catalogue, artifact); const at = new Date((options.now ?? Date.now)()).toISOString();
 automated(object(await json(join(options.work, 'candidate/automated.json'))), candidate, at); sourceReport(object(await json(join(options.work, 'candidate/source.json'))), candidate, catalogue, originalSource, at, false);
 const reports: Record<string, Json> = {}; for (const name of ['performance', 'documentation', 'automated', 'source']) { reports[name] = object(await json(join(options.work, 'reports', name + '.json'))); reviewed(reports[name], candidate, at); }
 await validateReviewedTdd(reports.automated, options.root); automated(reports.automated, candidate, at); sourceReport(reports.source, candidate, catalogue, originalSource, at, true); requireInput(checkDocumentation({ root: options.root, candidate, reportPath: join(options.work, 'reports/documentation.json'), now: at }).length === 0, 'CI exact current documentation evidence failed');
 const performance = reports.performance; requireInput(isDeepStrictEqual(performance.sizes, sizes), 'CI performance full actual artifact measurements mismatch'); const coverage = object(performance.sourceCoverage); let available = 0; for (const sitting of catalogue.sittings) if (sitting.record.availability !== 'unavailable') available++; requireInput(coverage.expected === catalogue.sittings.length && coverage.accounted === coverage.expected && coverage.availableRecords === available && coverage.snapshotId === candidate.snapshotId, 'CI performance full source coverage mismatch');
 const testOrigin = validateTestOrigin(options.testOrigin, options.repository); requireInput(Array.isArray(performance.devices), 'CI physical target reports missing'); for (const input of performance.devices) requireInput(object(input).url === testOrigin, 'CI physical target test origin mismatch');
 reconcileLabReport(await json(join(options.work, 'lab/lab.json')), { ...performance, origin: { trusted: true, repository: options.repository, branch: 'main' }, expectedRepository: options.repository }, candidate, at);
 return result(options, candidate, producer.revision);
}
/** Runs actual build and required native validation once against the prebuilt dist.
 * @param kind Concrete build/check action.
 * @param root Actual explicit PR checkout.
 * @returns Completion only after native commands succeed.
 * @throws On real build/type/unit/browser failures.
 */
async function commands(kind: 'build' | 'checks', root: string): Promise<void> { if (kind === 'build') execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' }); else { execFileSync('npm', ['run', 'typecheck'], { cwd: root, stdio: 'inherit' }); execFileSync('npm', ['test', '--', '--run'], { cwd: root, stdio: 'inherit' }); execFileSync('npm', ['run', 'test:browser'], { cwd: root, stdio: 'inherit', env: { ...process.env, HANSARD_FROZEN_SITE: join(root, 'dist') } }); } }
/** Produces collector-compatible roles from exact accepted assigned records.
 * @param artifact Complete native frozen site.
 * @param sizes Canonical measured all-file sizes.
 * @param catalogue Exact accepted catalogue.
 * @returns Real ranked reader pairs and gap/largest interactions.
 * @throws On absent real assigned or gap fixtures.
 */
async function createFixtures(artifact: string, sizes: ArtifactSizes, catalogue: Catalogue): Promise<Json> { const ranks = rankedPaths(sizes); const datasets: Json = {}; for (const role of ['median', 'p95', 'largest'] as const) datasets[role] = { path: ranks[role], memberId: member(await record(artifact, ranks[role], catalogue)) }; const interactions: Json[] = [datasets.largest]; let hasGap = false; for (const input of (await record(artifact, ranks.largest, catalogue)).items) if (input.attribution === 'unassigned') hasGap = true; if (!hasGap) { for (const sitting of catalogue.sittings) { if (sitting.record.path === null) continue; const value = await record(artifact, sitting.record.path, catalogue); let gap = false; for (const item of value.items) if (item.attribution === 'unassigned') gap = true; if (gap) { interactions.push({ path: sitting.record.path, memberId: member(value) }); hasGap = true; break; } } } requireInput(hasGap, 'CI no actual source gap fixture is available'); return { datasets, interactions }; }
/** Stores only genuine complete source, build receipts and a merge-only frozen CI candidate.
 * @param supplied Actual reviewed-main manual producer and explicit PR checkout/source selection.
 * @returns New merge-only candidate after one actual build/check sequence.
 * @throws On authentication, complete-source compatibility or native command failure.
 * @remarks Restores validated source into generated public/data and writes candidate metadata after native checks; publication state is never advanced.
 */
export async function prepareCiInputs(supplied: unknown): Promise<CiInputResult> {
 const options = context(supplied); const current = await executing(options, true); const chosen = selection(options.sourceArtifact); const producer = await authenticate(chosen, 'hansard-state', options, current.repositoryId); const state = join(options.work, 'source-state'); const metadata = object(await json(join(state, 'checkpoint.json'))); const origin = object(await json(join(state, 'origin.json'))); const code = await acquisitionFingerprint(options.root);
 requireInput(origin.repository === options.repository && origin.branch === 'main' && origin.runId === chosen.runId && origin.runAttempt === chosen.runAttempt && origin.sourceRevision === producer.revision && origin.codeFingerprint === code && metadata.runId === chosen.runId && metadata.codeFingerprint === code, 'CI complete source origin/compatibility mismatch');
 const accepted = await readPublicationCheckpoint(metadata, { state, out: join(options.root, 'public/data'), mode: 'bootstrap', repository: options.repository, branch: 'main', codeFingerprint: code, workflowContext: true, now: options.now }); const catalogue = accepted.catalogue;
 const data = join(options.root, 'public/data'); await rm(data, { recursive: true, force: true }); await mkdir(join(data, 'sittings'), { recursive: true }); await writeFile(join(data, 'catalogue.json.gz'), gzipSync(JSON.stringify(catalogue), { level: 9 })); for (const [id, bytes] of accepted.shards) await writeFile(join(data, 'sittings', id + '.json.gz'), bytes);
 const command = options.command ?? commands; await command('build', options.root); await command('checks', options.root); const built = join(options.root, 'dist'); const sizes = await measureArtifact(built); requireInput(sizes.complete && sizes.snapshot?.snapshotId === catalogue.snapshotId, 'CI built complete source mismatch'); const manifest = await createFixtures(built, sizes, catalogue); const hashes = rankedFixtures(sizes); for (const input of manifest.interactions) if (!Object.hasOwn(hashes, input.path)) { for (const [path, , digest] of sizes.files) if (path === input.path) hashes[path] = digest; }
 const candidate: DocumentationCandidate = { sourceRevision: options.checkedOutRevision, applicationFingerprint: await applicationFingerprint(options.root), artifactDigest: sizes.artifactDigest, snapshotId: catalogue.snapshotId, fixtureHashes: hashes, conditionsDigest: conditionsDigest(), priorServedBaselineDigest: metadata.servedPublication?.artifactDigest ?? null };
 const at = new Date((options.now ?? Date.now)()).toISOString(); const pr = { number: options.pullRequest, headRepository: options.repository, baseRepository: options.repository, baseRevision: options.baseRevision }; const target = join(options.work, 'candidate'); await rm(target, { recursive: true, force: true }); await cp(built, join(target, 'site'), { recursive: true }); requireInput((await measureArtifact(join(target, 'site'))).artifactDigest === candidate.artifactDigest, 'CI frozen copy mismatch');
 await put(join(target, 'candidate.json'), candidate); await put(join(target, 'fixtures.json'), manifest); await put(join(target, 'origin.json'), { schemaVersion: 1, scope: 'merge-only', publicationEligible: false, repository: options.repository, runId: options.runId, runAttempt: options.runAttempt, producingRevision: options.producingRevision, checkedOutRevision: options.checkedOutRevision, pullRequest: pr, candidate, sourceArtifact: chosen }); await put(join(target, 'automated.json'), { candidate, reviewedAt: at, checkedOutRevision: options.checkedOutRevision, checks: { type: true, unit: true, build: true, browser: true, source: sizes.sourceVerified }, browserEngines: ['chromium', 'firefox', 'webkit'] }); let available = 0; let retained = 0; let unavailable = 0; for (const sitting of catalogue.sittings) { if (sitting.record.availability === 'unavailable') unavailable++; else available++; if (sitting.record.availability === 'retained') retained++; }
 await put(join(target, 'source.json'), { candidate, reviewedAt: at, expected: catalogue.sittings.length, accounted: catalogue.sittings.length, available, retained, unavailable, sourceArtifact: chosen }); return result(options, candidate, options.producingRevision);
}
/** Writes a successful external merge-only result while retaining original candidate identity.
 * @param options Actual current checked-out context.
 * @param candidate Original exact frozen candidate.
 * @param producingRevision Actual original candidate producer.
 * @returns Separate result with no publication authority.
 * @throws On private native metadata write failure.
 * @remarks Writes only work/result.json outside the frozen site.
 */
async function result(options: CiInputOptions, candidate: DocumentationCandidate, producingRevision: string): Promise<CiInputResult> { const value: CiInputResult = { scope: 'merge-only', candidate, artifact: join(options.work, 'candidate/site'), performanceReport: join(options.work, 'reports/performance.json'), documentationReport: join(options.work, 'reports/documentation.json'), producingRevision, checkedOutRevision: options.checkedOutRevision, publicationEligible: false }; await put(join(options.work, 'result.json'), value); return value; }
/** Runs the native fixed-context CLI; authentication inputs cannot be bypassed with trust flags.
 * @returns Completion only for actual successful preparation or verification.
 * @throws On missing actual GitHub execution inputs or failed native/provider validation.
 * @remarks Performs the requested authorized CI action and writes its separate result metadata.
 */
async function cli(): Promise<void> {
 const action = process.argv[2]; requireInput(action === 'prepare' || action === 'verify', 'Expected CI prepare or verify'); requireInput(process.env.GITHUB_ACTIONS === 'true' && process.env.GH_TOKEN && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID && process.env.GITHUB_RUN_ATTEMPT && process.env.GITHUB_SHA && process.env.HANSARD_CI_WORK && process.env.HANSARD_PR_NUMBER && process.env.HANSARD_PR_BASE_REVISION, 'Actual authenticated GitHub CI inputs required'); const root = process.cwd(); const options: CiInputOptions = { root, work: resolve(process.env.HANSARD_CI_WORK), locatorPath: resolve(process.env.HANSARD_CI_LOCATOR ?? 'specs/001-read-mp-hansard/evidence/ci-inputs.json'), repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), producingRevision: process.env.GITHUB_SHA, checkedOutRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), pullRequest: Number(process.env.HANSARD_PR_NUMBER), baseRevision: process.env.HANSARD_PR_BASE_REVISION, testOrigin: process.env.HANSARD_TEST_ORIGIN };
 if (action === 'prepare') { requireInput(process.env.GITHUB_REF_NAME === 'main', 'CI preparation is reviewed-main manual work'); options.sourceArtifact = { runId: process.env.HANSARD_SOURCE_RUN_ID!, runAttempt: Number(process.env.HANSARD_SOURCE_RUN_ATTEMPT), artifactId: process.env.HANSARD_SOURCE_ARTIFACT_ID!, archiveDigest: process.env.HANSARD_SOURCE_ARCHIVE_DIGEST! }; await prepareCiInputs(options); } else await verifyCiInputs(options);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await cli();
