import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, test } from 'vitest';
import { catalogueFixture } from '../fixtures/catalogue.ts';
import { validateCatalogue, type Catalogue, type SittingRecord } from '../../src/source.ts';
import { applicationFingerprint } from '../../scripts/application-fingerprint.ts';
import { checkDocumentation, type DocumentationCandidate } from '../../scripts/check-documentation.ts';
import { evaluateBudgets, measureArtifact, type ArtifactSizes } from '../../scripts/check-performance.ts';
import { collectLab, type Boundary, type LabResult, type Session, type VerifiedInput } from '../../scripts/collect-performance.ts';
import { prepareCiInputs, verifyCiInputs, reconcileLabReport, type CiInputOptions, type CiLocator } from '../../scripts/ci-inputs.ts';
import { verifyPublicationOrigin, conditionsDigest, type PublicationOptions } from '../../scripts/publication.ts';

type Json = Record<string, any>;
const repository = 'eaglecheow/vote-better-malaysia';
const now = Date.parse('2026-10-10T04:00:00.000Z');
const tested = '1'.repeat(40); const checkedOut = '2'.repeat(40); const producing = '3'.repeat(40); const evidenceRevision = '4'.repeat(40);
const testOrigin = 'https://controlled-preview.example/vote-better-malaysia/';
const scratch: string[] = [];
interface CiFixture {
 root: string; work: string; artifact: string; locatorPath: string; options: CiInputOptions; locator: CiLocator;
 catalogue: Catalogue; candidate: DocumentationCandidate; sizes: ArtifactSizes; lab: LabResult;
 performance: Json; documentation: Json; automated: Json; source: Json; origin: Json; labOrigin: Json; manifest: Json;
 runs: Record<string, Json>; artifacts: Record<string, Json>; pull: Json; pullCommits: Json[]; comparison: Json; calls: string[]; commands: string[];
}

/** Removes only real temporary publication fixtures.
 * @returns Completion after isolated directory removal.
 * @throws On unexpected native cleanup errors.
 * @remarks Consumes the scratch list and removes its temporary directories.
 */
async function cleanup(): Promise<void> { for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true }); }
afterEach(cleanup);
/** Hashes exact fixture bytes independently of publication behavior.
 * @param bytes Original UTF-8 or stored bytes.
 * @returns Lowercase SHA-256 digest.
 */
function hash(bytes: string | Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Writes a controlled file without touching the real checkout.
 * @param root Temporary fixture directory.
 * @param path Relative controlled file path.
 * @param content Exact bytes or text.
 * @returns Completion after native file write.
 * @throws On genuine fixture filesystem failure.
 * @remarks Creates only temporary parent directories and file contents.
 */
async function put(root: string, path: string, content: string | Uint8Array): Promise<void> { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), content); }
/** Reads optional private metadata without creating a harness failure for a missing feature.
 * @param path Fixed expected private file.
 * @returns Parsed JSON or null for genuine absence.
 * @throws On errors other than missing file or on malformed existing JSON.
 */
async function json(path: string): Promise<Json | null> { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; } }
/** Formats a controlled UTC instant without a publication claim.
 * @param time Controlled UTC milliseconds.
 * @returns ISO timestamp.
 */
function iso(time: number): string { return new Date(time).toISOString(); }
/** Checks actual restored file presence without inventing a fallback artifact.
 * @param path Native expected deployed file path.
 * @returns Whether an actual regular file exists at that path.
 * @throws On native errors other than expected absence.
 */
async function regularFile(path: string): Promise<boolean> { try { return (await lstat(path)).isFile(); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } }
/** Builds complete synthetic enforcement data; it is never evidence of physical-device execution.
 * @param value Temporary measured artifact and exact candidate.
 * @returns A report independently accepted by the existing authoritative budget checker.
 */
function performance(value: Pick<CiFixture, 'candidate' | 'sizes'>): Json {
  const candidate = value.candidate; const servedBytes: Record<string, number> = {};
  for (const [path, size] of value.sizes.files) servedBytes[path] = size;
  const profiles: Json[] = [];
  for (const profile of ['mobile', 'desktop']) {
    const mobile = profile === 'mobile'; const processing: Json[] = [];
    for (const dataset of ['median', 'p95', 'largest']) { const path = `data/sittings/${dataset === 'median' ? 3 : 5}.json.gz`; processing.push({ dataset, fixturePath: path, fixtureHash: candidate.fixtureHashes[path], ms: Array(20).fill(10) }); }
    profiles.push({ profile, viewport: mobile ? [390, 844] : [1440, 900], downloadKbps: mobile ? 1600 : 10000, uploadKbps: mobile ? 750 : 2000,
      rttMs: mobile ? 150 : 40, cpuSlowdown: mobile ? 4 : 1, coldCacheCleared: true, repeatPrepopulated: true, completeValidatedResults: true,
      interactionKinds: ['selection', 'language', 'read'], lcpMs: Array(20).fill(100), cls: Array(20).fill(0), tbtMs: Array(20).fill(1),
      coldCatalogueMs: Array(20).fill(100), repeatReaderMs: Array(20).fill(100), interactionMs: Array(20).fill(1), processing });
  }
  const devices: Json[] = [];
  for (const [target, hardware] of [['android-chrome', 'Google Pixel 6a'], ['iphone-safari', 'Apple iPhone 13'],
    ['desktop-chrome', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'], ['desktop-edge', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'],
    ['desktop-firefox', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'], ['desktop-safari', 'MacBook Air M1, 8 GiB RAM, supported stable macOS']]) {
    const mobile = target === 'android-chrome' || target === 'iphone-safari'; const online: Json[] = [];
    for (let index = 0; index < 30; index++) { const sitting = value.sizes.sittings[index % 5]; online.push({ sittingId: String(index % 5 + 1), decodedBytes: sitting.decoded, ms: 100, success: true }); }
    devices.push({ target, hardware, url: testOrigin, candidate: structuredClone(candidate), reviewedAt: iso(now - 1000), os: 'Synthetic supported OS', browserVersion: 'Synthetic stable browser',
      stableAtAcceptance: true, localeChecks: ['ms', 'en'], viewport: mobile ? 'native' : [1440, 900], downloadKbps: mobile ? 1600 : 10000,
      uploadKbps: mobile ? 750 : 2000, rttMs: mobile ? 150 : 40, cpuSlowdown: 1, power: mobile ? 'native' : 'AC', batterySaver: false,
      unrelatedApplicationsClosed: true, offlineClosed: true, offlineNetworkDisabled: true, savedComplete: true, onlineComplete: true,
      offlineScenarios: ['largest', 'gaps'], offlineMs: Array(10).fill(100), online });
  }
  return { expectedCandidate: candidate, candidate: structuredClone(candidate), expectedRepository: repository, now: iso(now), reviewedAt: iso(now - 1000),
    origin: { trusted: true, repository, branch: 'main' }, sizes: value.sizes, sourceCoverage: { expected: 5, accounted: 5, availableRecords: 5, snapshotId: candidate.snapshotId },
    servedBytes, runner: { label: 'ubuntu-24.04', arch: 'x64', vcpus: 4, memoryGiB: 16, cpu: 'Synthetic CPU', image: 'Synthetic image', os: 'Ubuntu 24.04',
      node: '24.21.0', browser: 'Synthetic pinned Chromium', browserProcesses: 1, concurrentMeasurements: 1, tools: { playwright: 'Synthetic pinned version', vite: 'Synthetic pinned version' } },
    profiles, devices, field: { mobile: 'unavailable', desktop: 'unavailable' } };
}
/** Supplies documented GitHub workflow metadata, preserving producer/tested SHA separation.
 * @param id Producing workflow run ID.
 * @param sha Actual reviewed-main workflow revision.
 * @param path Reviewed workflow path.
 * @param active Whether this is the current unfinished execution.
 * @returns Native-shaped REST run metadata.
 */
function run(id: string, sha: string, path = '.github/workflows/ci.yml', active = false): Json {
 return { id: Number(id), run_attempt: 1, head_branch: 'main', head_sha: sha, path, workflow_id: path.endsWith('ci.yml') ? 75 : 71,
 event: 'workflow_dispatch', status: active ? 'in_progress' : 'completed', conclusion: active ? null : 'success', pull_requests: [],
 repository: { id: 123, full_name: repository }, head_repository: { id: 123, full_name: repository },
 html_url: `https://github.com/${repository}/actions/runs/${id}`, created_at: iso(now - 7_200_000), run_started_at: iso(now - 7_200_000), updated_at: iso(now - 100) };
}
/** Supplies fixed provider archive metadata independently from downloaded claims.
 * @param id Immutable archive ID.
 * @param runId Producing run ID.
 * @param name Reviewed archive role.
 * @param sha Actual producer SHA.
 * @returns Official-shaped artifact metadata with immutable digest and expiry.
 */
function archive(id: string, runId: string, name: string, sha: string): Json {
 return { id: Number(id), name, expired: false, created_at: iso(now - 300), expires_at: iso(now + 6 * 86_400_000), digest: 'sha256:' + hash(`Synthetic CI archive ${id}`),
 workflow_run: { id: Number(runId), repository_id: 123, head_repository_id: 123, head_branch: 'main', head_sha: sha } };
}
/** Supplies only controlled monotonic observations to the actual serial collector.
 * @param lastLcp Controlled observed largest-contentful-paint time.
 * @returns A collector session, never a native-browser/device claim.
 */
function session(lastLcp = 350): Session {
 return {
 /** Supplies a complete controlled cold trace. @returns Original observed trace fixture. */
 async cold() { return { fcpMs: 100, dclMs: 150, endMs: 7000, lcp: [200, lastLcp], shifts: [], tasks: [{ start: 200, duration: 100 }],
 requests: [{ start: 0, end: 1000 }], marks: [{ name: 'hansard.catalogue-ready', startTime: 400 }], observers: ['largest-contentful-paint', 'layout-shift', 'longtask'] }; },
 /** Accepts controlled saved fixture preparation. @param fixture Selected controlled input. @returns Completion without actual device persistence. */
 async prepare(fixture) { void fixture; },
 /** Supplies complete controlled repeat timing. @param fixture Selected controlled input. @returns Original timing observation. */
 async repeat(fixture) { void fixture; return { marks: [{ name: 'hansard.reader-ready', startTime: 100 }], complete: true }; },
 /** Supplies controlled interaction paint timing. @param fixture Selected controlled input. @param kind Required interaction. @returns Original trace-aligned observation. */
 async interact(fixture, kind) { void fixture; void kind; return { marks: [{ name: 'hansard.interaction-start', startTime: 100 }, { name: 'hansard.interaction-end', startTime: 120 }], paintMs: 110, complete: true }; },
 /** Supplies controlled full-processing timing. @param fixture Selected controlled input. @returns Original timing observation. */
 async process(fixture) { void fixture; return { marks: [{ name: 'hansard.processing-start', startTime: 100 }, { name: 'hansard.processing-end', startTime: 110 }], complete: true }; },
 /** Closes a controlled session. @returns Completion without actual browser effects. */
 async close() {},
 };
}
/** Runs the existing collector against independently controlled inputs.
 * @param value Actual measured temporary candidate and source files.
 * @param lastLcp Controlled original cold-trace LCP time.
 * @returns Complete collector-produced lab shape with original raw observations.
 */
async function laboratory(value: Pick<CiFixture, 'candidate' | 'sizes'>, lastLcp = 350): Promise<LabResult> {
 const servedBytes: Record<string, number> = {}; for (const [path, bytes] of value.sizes.files) servedBytes[path] = bytes;
 const fixtures: VerifiedInput['fixtures'] = [];
 for (const dataset of ['median', 'p95', 'largest'] as const) {
 const path = `data/sittings/${dataset === 'median' ? 3 : 5}.json.gz`; const sitting = value.sizes.sittings[dataset === 'median' ? 2 : 4];
 fixtures.push({ dataset, path, hash: value.candidate.fixtureHashes[path], decoded: sitting.decoded, memberId: '1839', sittingId: dataset === 'median' ? '3' : '5', hasGaps: dataset !== 'median', isLargest: dataset === 'largest' });
 }
 const input: VerifiedInput = { candidate: value.candidate, reviewedAt: iso(now - 120_000), servedBytes, fixtures, interactionFixtures: [fixtures[2]],
 runner: { label: 'ubuntu-24.04', arch: 'x64', os: 'Ubuntu 24.04', vcpus: 4, memoryGiB: 16, memoryBytes: 16 * 2 ** 30, cpu: 'Synthetic controlled CPU', image: 'Synthetic controlled image',
 node: '24.21.0', browser: 'Synthetic controlled pinned Chromium', browserProcesses: 1, concurrentMeasurements: 1, tools: { playwright: 'Synthetic controlled version', vite: 'Synthetic controlled version' } } };
 const boundary: Boundary = {
 /** Supplies already independently measured controlled inputs. @returns Complete frozen input fixture. */
 async verify() { return input; },
 /** Supplies one serial controlled browser boundary. @returns Session-producing boundary without native-browser claims. */
 async launch() { return { version: input.runner.browser,
 /** Opens one controlled profile. @param profile Required lab profile. @returns Controlled collector session. */
 async open(profile) { void profile; return session(lastLcp); },
 /** Closes the controlled browser. @returns Completion without native effects. */
 async close() {} }; },
 };
 return collectLab(boundary);
}
/** Creates a native temporary frozen site and complete enforcement-only reports.
 * @returns Coherent CI fixtures accepted by existing authoritative validators.
 * @throws On actual fixture filesystem/schema/checker failure.
 * @remarks Writes only tracked scratch directories; reports do not claim real devices or GitHub.
 */
async function fixture(): Promise<CiFixture> {
 const root = await mkdtemp(join(tmpdir(), 'hansard-ci-inputs-')); scratch.push(root); const work = join(root, 'ci'); const artifactPath = join(work, 'candidate/site');
 const catalogue = catalogueFixture(); catalogue.snapshotId = 'controlled-ci-frozen-snapshot'; catalogue.preparedAt = iso(now - 3_600_000); catalogue.publishedAt = null;
 catalogue.provenance.inventoryAcquiredAt = iso(now - 4_000_000); catalogue.provenance.membersAcquiredAt = iso(now - 4_000_001); catalogue.status.completedAt = iso(now - 3_600_001);
 catalogue.status.workflowUrl = `https://github.com/${repository}/actions/runs/99`; catalogue.status.lastConfirmedDeployment = null;
 const template = catalogue.sittings[0]; catalogue.sittings = []; catalogue.members = [catalogue.members[0]];
 for (let index = 1; index <= 5; index++) {
 const date = `2026-10-0${index}`; const sitting = structuredClone(template); sitting.id = String(index); sitting.date = date; sitting.filename = 'dr_' + date;
 sitting.sourceUrl = `https://hansard.parlimen.gov.my/hansard/dewan-rakyat/${date}`; sitting.isFinal = true;
 const record: SittingRecord = { schemaVersion: 1, sittingId: sitting.id, sourceUrl: sitting.sourceUrl,
 identity: { date, parliament: sitting.parliament, penggal: sitting.penggal, mesyuarat: sitting.mesyuarat, house: sitting.house, filename: sitting.filename, isFinal: true },
 items: [{ ordinal: 0, sourceIndex: 7, sectionPath: ['Synthetic section'], text: 'Synthetic original text.\n\n'.repeat(index * 10), rawAuthor: 'Synthetic speaker', sourceAuthorId: '1839', memberId: '1839', attribution: 'assigned', timestamp: null, gapReason: null }] };
 if (index === 5) record.items.push({ ordinal: 1, sourceIndex: 8, sectionPath: ['Synthetic section'], text: 'Synthetic retained visible gap.', rawAuthor: null, sourceAuthorId: null, memberId: null, attribution: 'unassigned', timestamp: null, gapReason: 'missing-id' });
 const decoded = Buffer.from(JSON.stringify(record)); const stored = gzipSync(decoded, { level: 9 });
 sitting.record = { availability: 'available', path: `data/sittings/${index}.json.gz`, digest: hash(decoded), decodedBytes: decoded.length, compressedBytes: stored.length,
 acquiredAt: iso(now - 4_100_000), lastAttemptAt: iso(now - 4_100_000), lastAttemptOutcome: 'success', sourceBuildId: 'synthetic-build', rawSourceDigest: hash('synthetic raw ' + index), sourcePublishedAt: null, sourceRevisedAt: null,
 accounting: { total: record.items.length, assigned: 1, unassigned: index === 5 ? 1 : 0, annotations: 0 } };
 catalogue.sittings.push(sitting); await put(artifactPath, sitting.record.path!, stored);
 }
 catalogue.coverage = { parliaments: [template.parliament], startDate: '2026-10-01', endDate: '2026-10-05', latestInventoryCount: 5, retainedSittingCount: 0, unavailableSittingCount: 0, attributionGapCount: 1 };
 validateCatalogue(catalogue); await put(artifactPath, 'data/catalogue.json.gz', gzipSync(JSON.stringify(catalogue), { level: 9 }));
 for (const [path, content] of [['index.html', '<!doctype html><title>Synthetic CI reader</title>'], ['assets/app.js', 'console.log("synthetic")'], ['assets/app.css', 'body{color:#111}'], ['manifest.webmanifest', '{"name":"Synthetic"}'], ['sw.js', '/* synthetic worker */'], ['icons/icon-192.png', 'synthetic icon'], ['icons/icon-512.png', 'synthetic icon']]) await put(artifactPath, path, content);
 const contents: Record<string, string> = { 'src/sample.ts': '/** Returns numeric input.\n * @param value Numeric input.\n * @returns Original number.\n */\nexport function sample(value:number):number{return value;}\n',
 'src/source.ts': '/** Controlled source-schema placeholder; no reader behavior. */\nexport const schema=1;\n', 'scripts/acquire.ts': '/** Controlled acquisition-input placeholder; no acquisition behavior. */\nexport const schema=1;\n', 'package-lock.json': '{}\n',
 'README.md': '[Development](docs/development.md)\n[Reader](docs/user-guide.md)\n', 'docs/development.md': 'Controlled developer guidance.\n', 'docs/user-guide.md': '## Bahasa Melayu\nPanduan ujian.\n## English\nControlled guide.\n' };
 const files: Record<string, string> = {}; for (const [path, content] of Object.entries(contents)) { await put(root, path, content); files[path] = hash(content); }
 const tddEvidence: Record<string, string> = {};
 for (const name of ['tdd.md', 'tdd-controlled.md']) { const path = 'specs/001-read-mp-hansard/evidence/' + name; const text = '# Controlled TDD narrative\nSynthetic assertion RED, GREEN and no-refactor review; not live acceptance.\n'; await put(root, path, text); tddEvidence[path] = hash(text); }
 const sizes = await measureArtifact(artifactPath); const fixtureHashes: Record<string, string> = {};
 for (const path of ['data/catalogue.json.gz', 'data/sittings/3.json.gz', 'data/sittings/5.json.gz']) fixtureHashes[path] = hash(await readFile(join(artifactPath, path)));
 delete files['package-lock.json'];
 const candidate: DocumentationCandidate = { sourceRevision: tested, applicationFingerprint: await applicationFingerprint(root), artifactDigest: sizes.artifactDigest, snapshotId: catalogue.snapshotId, fixtureHashes, conditionsDigest: conditionsDigest(), priorServedBaselineDigest: null };
 const lab = await laboratory({ candidate, sizes }); lab.candidate = structuredClone(candidate); const report = performance({ candidate, sizes }); report.profiles = structuredClone(lab.profiles); report.runner = structuredClone(lab.runner); report.raw = structuredClone(lab.raw);
 const documentation = { candidate, reviewer: 'Synthetic enforcement reviewer', reviewedAt: iso(now - 1000), accuracy: { purpose: true, parameters: true, returns: true, errors: true, sideEffects: true, commands: true }, guideCoverage: { bm: ['selection','reading','gaps','source','absence','errors','saved','install','updates'], en: ['selection','reading','gaps','source','absence','errors','saved','install','updates'] }, files };
 const artifacts = { '501': archive('501', '101', 'hansard-ci-candidate', producing), '502': archive('502', '102', 'hansard-ci-lab', producing), '601': archive('601', '201', 'hansard-evidence', evidenceRevision), '499': archive('499', '99', 'hansard-state', producing) };
 const originalPr = { number: 7, headRepository: repository, baseRepository: repository, baseRevision: producing };
 const locator: CiLocator = { schemaVersion: 1, repository, testedRevision: tested, pullRequest: structuredClone(originalPr), candidate: { runId: '101', runAttempt: 1, artifactId: '501', archiveDigest: artifacts['501'].digest.slice(7) }, laboratory: { runId: '102', runAttempt: 1, artifactId: '502', archiveDigest: artifacts['502'].digest.slice(7) }, evidence: { runId: '201', runAttempt: 1, artifactId: '601', archiveDigest: artifacts['601'].digest.slice(7) } };
 const locatorPath = join(root, 'specs/001-read-mp-hansard/evidence/ci-inputs.json');
 const origin = { schemaVersion: 1, scope: 'merge-only', publicationEligible: false, repository, runId: '101', runAttempt: 1, producingRevision: producing, checkedOutRevision: tested, pullRequest: structuredClone(originalPr), candidate, sourceArtifact: { runId: '99', runAttempt: 1, artifactId: '499', archiveDigest: artifacts['499'].digest.slice(7) } };
 const automated = { candidate, reviewedAt: iso(now - 1000), tddReviewed: true, tddReviewer: 'Synthetic named enforcement reviewer', tddEvidence, checkedOutRevision: tested, checks: { type: true, unit: true, build: true, browser: true, source: true }, browserEngines: ['chromium', 'firefox', 'webkit'] };
 const source = { candidate, reviewedAt: iso(now - 1000), reviewed: true, expected: 5, accounted: 5, available: 5, retained: 0, unavailable: 0, sourceArtifact: origin.sourceArtifact };
 const current = run('300', evidenceRevision, '.github/workflows/ci.yml', true); current.event = 'pull_request'; current.head_sha = checkedOut; current.head_branch = '001-read-mp-hansard'; current.pull_requests = [{ number: 7, head: { sha: checkedOut, repo: { id: 123, full_name: repository } }, base: { sha: producing, repo: { id: 123, full_name: repository } } }];
 const options: CiInputOptions = { root, work, locatorPath, repository, runId: '300', runAttempt: 1, producingRevision: evidenceRevision, testOrigin, checkedOutRevision: checkedOut, pullRequest: 7, baseRevision: producing, now: clock };
 const value: CiFixture = { root, work, artifact: artifactPath, locatorPath, locator, options, catalogue, candidate, sizes, lab, performance: report, documentation, automated, source, origin, labOrigin: { repository, runId: '102', runAttempt: 1, producingRevision: producing, checkedOutRevision: tested, pullRequest: structuredClone(originalPr), candidate: structuredClone(candidate), candidateArtifact: structuredClone(locator.candidate) }, manifest: { datasets: { median: { path: 'data/sittings/3.json.gz', memberId: '1839' }, p95: { path: 'data/sittings/5.json.gz', memberId: '1839' }, largest: { path: 'data/sittings/5.json.gz', memberId: '1839' } }, interactions: [{ path: 'data/sittings/5.json.gz', memberId: '1839' }] },
 runs: { '99': run('99', producing, '.github/workflows/pages.yml'), '101': run('101', producing), '102': run('102', producing), '201': run('201', evidenceRevision, '.github/workflows/pages.yml'), '300': current }, artifacts,
 pull: { number: 7, state: 'open', mergeable: true, merge_commit_sha: evidenceRevision, head: { sha: checkedOut, repo: { id: 123, full_name: repository } }, base: { sha: producing, ref: 'main', repo: { id: 123, full_name: repository } } }, pullCommits: [{ sha: tested }, { sha: checkedOut }], comparison: { status: 'ahead', ahead_by: 2, behind_by: 0, base_commit: { sha: producing }, merge_base_commit: { sha: producing } }, calls: [], commands: [] };
 const codeFingerprint = hash(Buffer.concat([await readFile(join(root, 'src/source.ts')), await readFile(join(root, 'scripts/acquire.ts')), await readFile(join(root, 'package-lock.json'))]));
 const shardDigests: Record<string, string> = {};
 for (const sitting of catalogue.sittings) { const bytes = await readFile(join(artifactPath, sitting.record.path!)); shardDigests[sitting.id] = hash(bytes); await put(work, 'source-state/snapshots/source/sittings/' + sitting.id + '.json.gz', bytes); }
 await put(work, 'source-state/checkpoint.json', JSON.stringify({ schemaVersion: 1, originKind: 'workflow-artifact', publicationEligible: true, repository, branch: 'main', runId: '99', workflowUrl: catalogue.status.workflowUrl, codeFingerprint, createdAt: catalogue.preparedAt, success: true, catalogue, catalogueDigest: hash(JSON.stringify(catalogue)), shardDigests, shardRoot: 'snapshots/source', servedReceipt: null }));
 await put(work, 'source-state/origin.json', JSON.stringify({ repository, branch: 'main', runId: '99', runAttempt: 1, sourceRevision: producing, codeFingerprint }));
 value.options.transport = transport.bind(null, value); value.options.command = command.bind(null, value); await save(value);
 return value;
}
/** Supplies an independent controlled clock. @returns Current controlled epoch milliseconds. */
function clock(): number { return now; }
/** Handles only fixed-origin official-shaped CI metadata requests.
 * @param value Coherent controlled fixture.
 * @param input Request URL.
 * @param init Optional request options.
 * @returns Native Response with independent provider metadata.
 * @throws For a request outside the known GitHub API.
 * @remarks Records requests for assertions without network access.
 */
async function transport(value: CiFixture, input: string | URL | Request, init?: RequestInit): Promise<Response> {
 void init; const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); value.calls.push(url.href);
 if (url.origin !== 'https://api.github.com') throw new Error('Unrecognized controlled CI origin');
 const path = url.pathname.replace(`/repos/${repository}`, ''); let body: unknown;
 if (path === '') body = { id: 123, full_name: repository, private: false, default_branch: 'main' };
 else if (path === '/pulls/7') body = value.pull;
 else if (path === '/pulls/7/commits') body = value.pullCommits;
 else if (path === '/actions/workflows/ci.yml') body = { id: 75, path: '.github/workflows/ci.yml', state: 'active' };
 else if (path === '/actions/workflows/pages.yml') body = { id: 71, path: '.github/workflows/pages.yml', state: 'active' };
 else if (/^\/actions\/runs\/\d+(?:\/attempts\/\d+)?$/.test(path)) body = value.runs[path.split('/')[3]];
 else if (/^\/actions\/artifacts\/\d+$/.test(path)) body = value.artifacts[path.split('/')[3]];
 else if (/^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}$/.test(path)) body = value.comparison;
 else if (/^\/commits\/[a-f0-9]{40}$/.test(path)) body = { sha: path.split('/')[2] };
 return new Response(JSON.stringify(body ?? { message: 'Not Found' }), { status: body ? 200 : 404, headers: { 'content-type': 'application/json' } });
}
/** Records actual invoked command kinds while supplying already-native fixture build bytes.
 * @param value Controlled fixture.
 * @param kind Concrete build/check command request.
 * @param root Actual temporary checkout root.
 * @returns Completion after copying the actual controlled build or recording checks.
 * @throws On real native fixture-copy failure.
 * @remarks Writes only the controlled dist build and command log; never claims native test execution.
 */
async function command(value: CiFixture, kind: 'build' | 'checks', root: string): Promise<void> { value.commands.push(kind); if (kind === 'build') await cp(value.artifact, join(root, 'dist'), { recursive: true }); }
/** Stores original downloaded native inputs outside the frozen site.
 * @param value Coherent controlled fixture.
 * @returns Completion after native writes.
 * @remarks Writes only temporary locator/candidate/lab/report files.
 */
async function save(value: CiFixture): Promise<void> {
 const machine = structuredClone(value.automated); delete machine.tddReviewed; delete machine.tddReviewer; delete machine.tddEvidence;
 await put(value.root, 'specs/001-read-mp-hansard/evidence/ci-inputs.json', JSON.stringify(value.locator));
 for (const [path, data] of Object.entries({ 'candidate/candidate.json': value.candidate, 'candidate/origin.json': value.origin, 'candidate/automated.json': machine, 'candidate/source.json': value.source, 'candidate/fixtures.json': value.manifest, 'lab/lab.json': value.lab, 'lab/origin.json': value.labOrigin, 'reports/performance.json': value.performance, 'reports/documentation.json': value.documentation, 'reports/automated.json': value.automated, 'reports/source.json': value.source })) await put(value.work, path, JSON.stringify(data));
}

test('CI-HARNESS: complete native fixture and synthetic enforcement reports pass existing authorities',
 /** Verifies positive fixtures independently before missing CI behavior can count as RED.
  * @returns Completion after native bytes/schema/checker assertions.
  */
 async () => { const value = await fixture(); expect(value.sizes.complete).toBe(true); expect(value.lab.raw).toHaveLength(240); expect(evaluateBudgets(value.performance)).toBe(true);
 expect(checkDocumentation({ root: value.root, candidate: value.candidate, reportPath: join(value.work, 'reports/documentation.json'), now: iso(now) })).toEqual([]);
 expect(value.origin.producingRevision).not.toBe(value.origin.checkedOutRevision); expect(value.options.checkedOutRevision).not.toBe(value.candidate.sourceRevision);
 expect(Date.parse(value.artifacts['501'].created_at)).toBeLessThanOrEqual(Date.parse(value.runs['101'].updated_at)); });

/** Sets one controlled nested claim without changing independent expected metadata.
 * @param value Mutable fixture/report root.
 * @param path Dot-separated existing property path.
 * @param replacement Intentionally invalid scalar/collection.
 * @remarks Changes only the selected controlled claim.
 */
function set(value: Json, path: string, replacement: unknown): void {
 const keys = path.split('.'); let node = value; for (const key of keys.slice(0, -1)) node = node[key]; node[keys.at(-1)!] = replacement;
}
/** Captures actual rejection without exceptions caused by missing return shapes.
 * @param value Controlled fixture options.
 * @returns The feature result and error separately.
 */
async function verify(value: CiFixture): Promise<{ result: Awaited<ReturnType<typeof verifyCiInputs>> | null; error: unknown }> {
 try { return { result: await verifyCiInputs(value.options), error: null }; } catch (error) { return { result: null, error }; }
}
/** Captures synchronous pure reconciliation rejection behavior.
 * @param lab Independent original lab output.
 * @param report Full report being reviewed.
 * @param candidate Actual frozen candidate.
 * @returns Actual thrown error or null for acceptance.
 */
function labError(lab: unknown, report: unknown, candidate: DocumentationCandidate): unknown {
 try { reconcileLabReport(lab, report, candidate, iso(now)); return null; } catch (error) { return error; }
}

test('CI-ACCEPT: API-authenticated unchanged frozen PR candidate is merge-only after a docs/evidence-only head advance',
 /** Checks actual frozen bytes, original tested SHA and distinct producer/checkout context.
  * @returns Completion after reached acceptance assertions.
  */
 async () => { const value = await fixture(); const before = await measureArtifact(value.artifact); const observed = await verify(value);
 expect.soft(observed.error).toBeNull(); expect.soft(observed.result?.scope).toBe('merge-only'); expect.soft(observed.result?.publicationEligible).toBe(false);
 expect.soft(observed.result?.candidate).toEqual(value.candidate); expect.soft(observed.result?.producingRevision).toBe(producing); expect.soft(observed.result?.checkedOutRevision).toBe(checkedOut);
 expect.soft(observed.result?.artifact).toBe(value.artifact); expect.soft(observed.result?.performanceReport).toBe(join(value.work, 'reports/performance.json'));
 expect.soft(value.calls.some(isPullRequestRequest)).toBe(true); expect.soft(value.calls.some(isCandidateArchiveRequest)).toBe(true); expect.soft(value.calls.some(isPrCommitsRequest)).toBe(true);
 expect(value.commands).toEqual([]); expect(await measureArtifact(value.artifact)).toEqual(before); });
/** Identifies independent current PR API authentication. @param url Observed URL. @returns Whether the exact PR endpoint was queried. */
function isPullRequestRequest(url: string): boolean { return url.endsWith('/pulls/7'); }
/** Identifies independently authenticated candidate archive metadata. @param url Observed URL. @returns Whether the exact immutable archive was queried. */
function isCandidateArchiveRequest(url: string): boolean { return url.endsWith('/actions/artifacts/501'); }
/** Identifies original tested revision membership in the authenticated PR. @param url Observed URL. @returns Whether PR commit history was queried. */
function isPrCommitsRequest(url: string): boolean { return new URL(url).pathname.endsWith('/pulls/7/commits'); }

const providerFaults: Array<[string, string, unknown]> = [
 ['candidate failed producer', 'runs.101.conclusion', 'failure'], ['candidate unfinished producer', 'runs.101.status', 'in_progress'],
 ['candidate wrong repository', 'runs.101.repository.full_name', 'other/repository'], ['candidate forked producer', 'runs.101.head_repository.id', 456],
 ['candidate wrong workflow', 'runs.101.path', '.github/workflows/foreign.yml'], ['candidate workflow identity mismatch', 'runs.101.workflow_id', 999],
 ['candidate PR producer has no reviewed-main authority', 'runs.101.event', 'pull_request'], ['candidate producer branch mismatch', 'runs.101.head_branch', 'feature'],
 ['candidate wrong run attempt', 'runs.101.run_attempt', 2], ['candidate API run id mismatch', 'runs.101.id', 999],
 ['candidate archive wrong role', 'artifacts.501.name', 'hansard-state'], ['candidate archive wrong producer', 'artifacts.501.workflow_run.id', 999],
 ['candidate archive wrong SHA', 'artifacts.501.workflow_run.head_sha', evidenceRevision], ['candidate archive wrong repository', 'artifacts.501.workflow_run.repository_id', 999],
 ['candidate archive expired', 'artifacts.501.expired', true], ['candidate archive past expiry', 'artifacts.501.expires_at', iso(now - 1)],
 ['candidate archive future creation', 'artifacts.501.created_at', iso(now + 1)], ['candidate immutable archive digest changed', 'artifacts.501.digest', 'sha256:' + hash('foreign archive')],
 ['lab failed producer', 'runs.102.conclusion', 'failure'], ['lab wrong producing workflow', 'runs.102.path', '.github/workflows/pages.yml'],
 ['lab archive wrong role', 'artifacts.502.name', 'hansard-ci-candidate'], ['lab expired archive', 'artifacts.502.expired', true],
 ['evidence failed producer', 'runs.201.conclusion', 'failure'], ['evidence is PR-produced', 'runs.201.event', 'pull_request'],
 ['evidence non-main branch', 'runs.201.head_branch', 'feature'], ['evidence wrong workflow', 'runs.201.path', '.github/workflows/ci.yml'],
 ['evidence archive wrong role', 'artifacts.601.name', 'hansard-ci-lab'], ['evidence wrong attempt', 'runs.201.run_attempt', 2],
 ['current PR run is foreign', 'runs.300.repository.full_name', 'other/repository'], ['current executing attempt mismatch', 'runs.300.run_attempt', 2], ['current PR run head does not match explicit checked-out head', 'runs.300.head_sha', producing], ['current PR test merge SHA differs from actual GITHUB_SHA context', 'pull.merge_commit_sha', producing],
 ['current PR number mismatch', 'pull.number', 8], ['current checkout does not match actual PR head', 'pull.head.sha', tested],
 ['current PR head repository changed', 'pull.head.repo.full_name', 'other/repository'], ['current PR base repository changed', 'pull.base.repo.full_name', 'other/repository'],
 ['current PR base is not reviewed main', 'pull.base.ref', 'feature'], ['current PR is closed', 'pull.state', 'closed'],
 ['original tested checkout is absent from authenticated PR commit history', 'pullCommits', [{ sha: checkedOut }]],
 ['original complete source producer failed', 'runs.99.conclusion', 'failure'], ['original source archive role changed', 'artifacts.499.name', 'hansard-ci-candidate'],
 ['original source archive expired', 'artifacts.499.expired', true],
];
test.each(providerFaults)('CI-ORIGIN %s',
 /** Rejects one independently controlled API provenance failure.
  * @param label Observable provider boundary.
  * @param path Native metadata property to change.
  * @param replacement Independently invalid claim.
  * @returns Completion after behavioral rejection assertion.
  */
 async (label, path, replacement) => { void label; const value = await fixture(); set(value, path, replacement); const observed = await verify(value); expect(observed.error).toBeInstanceOf(Error); });

const claimFaults: Array<[string, string, unknown]> = [
 ['locator wrong repository', 'locator.repository', 'other/repository'], ['locator candidate run mismatch', 'locator.candidate.runId', '999'],
 ['locator candidate attempt mismatch', 'locator.candidate.runAttempt', 2], ['locator lab archive mismatch', 'locator.laboratory.artifactId', '501'],
 ['locator evidence digest mismatch', 'locator.evidence.archiveDigest', hash('wrong')], ['locator original tested revision mismatch', 'locator.testedRevision', checkedOut],
 ['locator original PR mismatch', 'locator.pullRequest.number', 8], ['locator original base mismatch', 'locator.pullRequest.baseRevision', evidenceRevision],
 ['candidate downloaded origin producer mismatch', 'origin.producingRevision', tested], ['candidate downloaded checkout mismatch', 'origin.checkedOutRevision', checkedOut],
 ['candidate downloaded original PR mismatch', 'origin.pullRequest.headRepository', 'other/repository'], ['candidate publication-eligible claim forbidden', 'origin.publicationEligible', true],
 ['candidate scope is not merge-only', 'origin.scope', 'publication'],
 ['lab origin producing revision differs from native producer', 'labOrigin.producingRevision', evidenceRevision], ['lab original checked-out revision differs from candidate', 'labOrigin.checkedOutRevision', checkedOut], ['lab selected original candidate artifact differs', 'labOrigin.candidateArtifact.artifactId', '999'], ['lab selected original candidate archive digest differs', 'labOrigin.candidateArtifact.archiveDigest', hash('foreign')],
 ['ranked median manifest role mismatch', 'manifest.datasets.median.path', 'data/sittings/1.json.gz'], ['manifest member identity absent', 'manifest.datasets.median.memberId', '999999'], ['manifest required gap interaction omitted', 'manifest.interactions', []],
 ['candidate snapshot mismatch', 'candidate.snapshotId', 'foreign-snapshot'], ['candidate source revision mismatch', 'candidate.sourceRevision', checkedOut],
 ['candidate app input fingerprint mismatch', 'candidate.applicationFingerprint', hash('foreign')], ['candidate every-file artifact digest mismatch', 'candidate.artifactDigest', hash('foreign')],
 ['candidate ranked fixture hash mismatch', 'candidate.fixtureHashes.data/sittings/3.json.gz', hash('foreign')],
 ['automated type check missing', 'automated.checks.type', false], ['automated unit check missing', 'automated.checks.unit', false],
 ['automated production build missing', 'automated.checks.build', false], ['automated native browser check missing', 'automated.checks.browser', false],
 ['automated source check missing', 'automated.checks.source', false], ['Firefox actual-engine receipt missing', 'automated.browserEngines', ['chromium','webkit']],
 ['automated original checked-out SHA changed', 'automated.checkedOutRevision', checkedOut], ['source original full inventory missing accounting', 'source.accounted', 4],
 ['source expected official count altered', 'source.expected', 6], ['source available records mismatch', 'source.available', 4],
 ['source review not approved', 'source.reviewed', false], ['source review expired', 'source.reviewedAt', iso(now - 7 * 86_400_000 - 1)],
 ['performance exact candidate mismatch', 'performance.candidate.sourceRevision', checkedOut], ['performance conditions digest mismatch', 'performance.candidate.conditionsDigest', hash('foreign')],
 ['performance prior-baseline mismatch', 'performance.candidate.priorServedBaselineDigest', hash('foreign')], ['performance expired review', 'performance.reviewedAt', iso(now - 7 * 86_400_000 - 1)],
 ['one actual device omitted', 'performance.devices', []], ['actual mobile wrong frozen candidate', 'performance.devices.0.candidate.artifactDigest', hash('foreign')],
 ['actual mobile online incomplete', 'performance.devices.0.onlineComplete', false], ['actual mobile offline incomplete', 'performance.devices.0.savedComplete', false],
 ['documentation reviewer missing', 'documentation.reviewer', ''], ['documentation review expired', 'documentation.reviewedAt', iso(now - 7 * 86_400_000 - 1)],
 ['documentation current source digest stale', 'documentation.files.src/sample.ts', hash('foreign')], ['documentation candidate mismatch', 'documentation.candidate.snapshotId', 'foreign'],
];
test.each(claimFaults)('CI-CLAIM %s',
 /** Rejects a downloaded scalar without treating payload flags as authority.
  * @param label Observable candidate/report boundary.
  * @param path Controlled claim to change.
  * @param replacement Invalid value.
  * @returns Completion after native-file save and behavioral assertion.
  */
 async (label, path, replacement) => { void label; const value = await fixture();
 if (path === 'candidate.fixtureHashes.data/sittings/3.json.gz') value.candidate.fixtureHashes['data/sittings/3.json.gz'] = replacement as string;
 else if (path === 'documentation.files.src/sample.ts') value.documentation.files['src/sample.ts'] = replacement;
 else set(value, path, replacement); await save(value); const observed = await verify(value); expect(observed.error).toBeInstanceOf(Error); });

for (const path of ['candidate/candidate.json','candidate/origin.json','candidate/fixtures.json','candidate/automated.json','candidate/source.json','lab/lab.json','lab/origin.json','reports/performance.json','reports/documentation.json','reports/automated.json','reports/source.json']) test(`CI-MISSING ${path}`,
 /** Rejects one genuinely absent downloaded input without fabricated replacement evidence.
  * @returns Completion after actual native removal and rejection assertion.
  * @remarks Removes only the selected temporary downloaded input.
  */
 async () => { const value = await fixture(); await rm(join(value.work, path)); expect((await verify(value)).error).toBeInstanceOf(Error); });

for (const [path, text] of [['src/sample.ts', '\nexport const changedApplication=true;'], ['README.md', '\nChanged current instructions.'], ['docs/user-guide.md', '\nChanged current guide.'], ['ci/candidate/site/assets/app.js', '\nChanged deployed bytes.']]) test(`CI-CURRENT ${path}`,
 /** Rejects current checkout or every-file artifact changes under unchanged evidence.
  * @returns Completion after actual native changed-byte rejection.
  * @remarks Mutates only a temporary file; original locator/reports remain unchanged.
  */
 async () => { const value = await fixture(); const file = join(value.root, path); await writeFile(file, (await readFile(file, 'utf8')) + text); expect((await verify(value)).error).toBeInstanceOf(Error); });

test('CI-LOCATOR: missing reviewed locator fails closed',
 /** Checks genuine absent reviewed metadata. @returns Completion after rejection assertion. @remarks Removes only temporary locator. */
 async () => { const value = await fixture(); await rm(value.locatorPath); expect((await verify(value)).error).toBeInstanceOf(Error); });

test('CI-LAB-ACCEPT: full report preserves every authentic collector observation and all six targets',
 /** Checks exact collector facts retain separate laboratory/field scopes.
  * @returns Completion after successful reconciliation assertion.
  */
 async () => { const value = await fixture(); const original = structuredClone(value.lab); expect(reconcileLabReport(value.lab, value.performance, value.candidate, iso(now))).toBe(true); expect(value.lab).toEqual(original); });
const laboratoryFaults: Array<[string, string, unknown]> = [
 ['original lab wrong scope', 'lab.scope', 'publication'], ['original lab candidate mismatch', 'lab.candidate.sourceRevision', checkedOut],
 ['original lab review expired', 'lab.reviewedAt', iso(now - 7 * 86_400_000 - 1)], ['original lab review future', 'lab.reviewedAt', iso(now + 1)],
 ['full report runner CPU substituted', 'performance.runner.cpu', 'Foreign CPU'], ['full report runner memory substituted', 'performance.runner.memoryBytes', 15 * 2 ** 30],
 ['full report browser substituted', 'performance.runner.browser', 'Foreign browser'], ['full report served wire byte differs', 'performance.servedBytes.index.html', 1],
 ['full report LCP sample differs', 'performance.profiles.0.lcpMs.0', 351], ['full report CLS sample differs', 'performance.profiles.0.cls.0', .01],
 ['full report TBT sample differs', 'performance.profiles.0.tbtMs.0', 51], ['full report cold catalogue sample differs', 'performance.profiles.0.coldCatalogueMs.0', 401],
 ['full report repeat sample differs', 'performance.profiles.1.repeatReaderMs.0', 101], ['full report interaction sample differs', 'performance.profiles.1.interactionMs.0', 11],
 ['full report processing sample differs', 'performance.profiles.0.processing.0.ms.0', 11], ['full report calculated percentile changed', 'performance.profiles.0.percentiles.lcpMs', 351],
 ['full report raw observation changed', 'performance.raw.0.observation.lcp.0', 201], ['full report raw operation changed', 'performance.raw.0.operation', 'repeat'],
 ['full report raw run index changed', 'performance.raw.0.run', 1], ['full report raw profile changed', 'performance.raw.0.profile', 'desktop'],
 ['full report raw trace order changed', 'performance.raw.0.observation.lcp', [350,200]], ['full report raw observations omitted', 'performance.raw', []],
 ['original lab raw observations omitted', 'lab.raw', []], ['full report profiles omitted', 'performance.profiles', []],
 ['actual six-target report incomplete', 'performance.devices', []], ['actual target misses offline result', 'performance.devices.0.offlineMs', []],
 ['mobile field disclosure missing', 'performance.field.mobile', 'compliant'], ['over-budget unmatched full report cannot replace original lab', 'performance.profiles.0.lcpMs', Array(20).fill(3000)],
];
test.each(laboratoryFaults)('CI-LAB %s',
 /** Rejects one altered authentic/raw/full-report field through the new reconciliation boundary.
  * @param label Observable lab-report boundary.
  * @param path Controlled metadata path.
  * @param replacement Independently invalid value.
  * @returns Completion after behavioral rejection assertion.
  */
 async (label, path, replacement) => { void label; const value = await fixture(); if (path === 'performance.servedBytes.index.html') value.performance.servedBytes['index.html'] = replacement; else set(value, path, replacement); expect(labError(value.lab, value.performance, value.candidate)).toBeInstanceOf(Error); });

for (const [path, data] of [['lab/origin.json', { repository, runId: '102', runAttempt: 1, producingRevision: producing, checkedOutRevision: tested, candidateArtifact: { runId: '101', runAttempt: 1, artifactId: '999', archiveDigest: hash('foreign') } }], ['reports/source.json', { trusted: true, reviewed: true }], ['reports/automated.json', { trusted: true, checks: { browser: true } }]] as Array<[string,Json]>) test(`CI-UNAUTHENTICATED ${path}`,
 /** Rejects downloaded booleans and source/lab bindings without their original candidate.
  * @returns Completion after native-file rejection assertion.
  * @remarks Changes only temporary downloaded metadata.
  */
 async () => { const value = await fixture(); await put(value.work, path, JSON.stringify(data)); expect((await verify(value)).error).toBeInstanceOf(Error); });

/** Selects an actual reviewed-main manual preparation context around current PR checkout.
 * @param value Controlled source/site fixture.
 * @returns Concrete preparation options with a complete independently selected main source archive.
 * @remarks Records the separate controlled current producing run.
 */
function preparation(value: CiFixture): CiInputOptions {
 value.runs['301'] = run('301', evidenceRevision, '.github/workflows/ci.yml', true);
 return { ...value.options, runId: '301', checkedOutRevision: checkedOut, sourceArtifact: value.origin.sourceArtifact };
}
/** Captures preparation errors rather than turning a missing return into a harness exception.
 * @param options Concrete controlled preparation execution.
 * @returns Actual result and rejection separately.
 */
async function prepare(options: CiInputOptions): Promise<{ result: Awaited<ReturnType<typeof prepareCiInputs>> | null; error: unknown }> {
 try { return { result: await prepareCiInputs(options), error: null }; } catch (error) { return { result: null, error }; }
}

test('CI-PREPARE: reviewed-main producer freezes complete source exactly once with actual tested PR SHA and merge-only scope',
 /** Checks source preservation and concrete command invocation before storing the candidate.
  * @returns Completion after independently reached prepared metadata assertions.
  */
 async () => { const value = await fixture(); const options = preparation(value); const before = await measureArtifact(value.artifact); const observed = await prepare(options); const origin = await json(join(value.work, 'candidate/origin.json'));
 expect.soft(observed.error).toBeNull(); expect.soft(value.commands).toEqual(['build','checks']); expect.soft(observed.result?.scope).toBe('merge-only'); expect.soft(observed.result?.publicationEligible).toBe(false);
 expect.soft(observed.result?.candidate.sourceRevision).toBe(checkedOut); expect.soft(observed.result?.producingRevision).toBe(evidenceRevision); expect.soft(observed.result?.checkedOutRevision).toBe(checkedOut);
 expect.soft(origin?.runId).toBe('301'); expect.soft(origin?.producingRevision).toBe(evidenceRevision); expect.soft(origin?.checkedOutRevision).toBe(checkedOut); expect.soft(origin?.publicationEligible).toBe(false); expect.soft((await json(join(value.work, 'result.json')))?.candidate?.sourceRevision).toBe(checkedOut);
 expect((await measureArtifact(value.artifact)).artifactDigest).toBe(before.artifactDigest); expect.soft(await regularFile(join(value.root, 'public/data/catalogue.json.gz'))).toBe(true);
 });
for (const [label, path, replacement] of [
 ['PR preparation cannot create reviewed-main authority', 'runs.301.event', 'pull_request'], ['foreign manual producer', 'runs.301.repository.full_name', 'other/repository'], ['wrong manual workflow', 'runs.301.path', '.github/workflows/pages.yml'],
 ['complete source failed producer', 'runs.99.conclusion', 'failure'], ['complete source invalid role', 'artifacts.499.name', 'hansard-ci-candidate'], ['complete source expired', 'artifacts.499.expired', true],
] as Array<[string,string,unknown]>) test(`CI-PREPARE-ORIGIN ${label}`,
 /** Rejects one concrete preparation/provider trust failure.
  * @returns Completion after actual preparation rejection assertion.
  */
 async () => { const value = await fixture(); const options = preparation(value); set(value, path, replacement); expect((await prepare(options)).error).toBeInstanceOf(Error); });
for (const path of ['source-state/checkpoint.json','source-state/origin.json','source-state/snapshots/source/sittings/5.json.gz']) test(`CI-PREPARE-MISSING ${path}`,
 /** Rejects incomplete source rather than freezing a fixture subset.
  * @returns Completion after genuine file absence rejection.
  * @remarks Removes only one controlled complete-source input.
  */
 async () => { const value = await fixture(); const options = preparation(value); await rm(join(value.work, path)); expect((await prepare(options)).error).toBeInstanceOf(Error); });
for (const [label, path, replacement] of [['source snapshot checksum', 'catalogueDigest', hash('foreign')], ['source original successful acquisition', 'success', false], ['source original compatible code', 'codeFingerprint', hash('foreign')], ['source branch origin', 'branch', 'feature']] as Array<[string,string,unknown]>) test(`CI-PREPARE-SOURCE ${label}`,
 /** Rejects actual source checkpoint authenticity/schema/checksum/compatibility failure.
  * @returns Completion after native invalid-checkpoint rejection.
  * @remarks Changes only temporary checkpoint bytes.
  */
 async () => { const value = await fixture(); const options = preparation(value); const checkpoint = await json(join(value.work, 'source-state/checkpoint.json')); set(checkpoint!, path, replacement); await put(value.work, 'source-state/checkpoint.json', JSON.stringify(checkpoint)); expect((await prepare(options)).error).toBeInstanceOf(Error); });
for (const kind of ['build','checks'] as const) test(`CI-PREPARE-COMMAND ${kind} failure leaves no successful new candidate claim`,
 /** Checks failed native work cannot be replaced by fake successful input flags.
  * @returns Completion after rejection and unchanged previous-candidate assertions.
  * @remarks Supplies one failed controlled command, with original candidate bytes preserved.
  */
 async () => { const value = await fixture(); const options = preparation(value); const original = await readFile(join(value.work, 'candidate/candidate.json'));
 options.command = failedCommand.bind(null, value, kind); expect.soft((await prepare(options)).error).toBeInstanceOf(Error); expect(await readFile(join(value.work, 'candidate/candidate.json'))).toEqual(original); });
/** Reproduces one concrete build/check process failure.
 * @param value Complete native controlled build fixture.
 * @param failed Requested operation to fail.
 * @param kind Actual invoked operation.
 * @param root Temporary checkout root.
 * @returns Completion only for the other controlled operation.
 * @throws For the selected command failure.
 */
async function failedCommand(value: CiFixture, failed: 'build'|'checks', kind: 'build'|'checks', root: string): Promise<void> { if (failed === kind) throw new Error('Controlled native ' + failed + ' failure'); await command(value, kind, root); }

test('CI-PREPARE-MISSING-SELECTION: complete source requires independently named immutable origin',
 /** Rejects missing source archive authority even when local files exist. @returns Completion after rejection assertion. */
 async () => { const value = await fixture(); const options = preparation(value); delete options.sourceArtifact; expect((await prepare(options)).error).toBeInstanceOf(Error); });

test('CI-PUBLICATION-CONTROL: main Pages verifier rejects CI candidate role after merge',
 /** Verifies the existing authority boundary remains closed; this is a GREEN control, not new RED.
  * @returns Completion after genuine publication verifier rejection.
  */
 async () => { const value = await fixture(); const options: PublicationOptions = { root: value.root, work: value.work, state: join(value.root,'.cache/hansard'), repository, branch: 'main', runId:'201', runAttempt:1, sourceRevision: evidenceRevision, codeFingerprint: hash('controlled-code'), transport: value.options.transport, now: clock };
 await expect(verifyPublicationOrigin({ runId:'101',artifactId:'501',name:'hansard-ci-candidate',sourceRevision:tested,archiveDigest:value.locator.candidate.archiveDigest }, options)).rejects.toThrow('Invalid requested publication artifact'); });
for (const action of ['prepare','verify','foreign']) test(`CI-CLI ${action} without required reviewed inputs fails nonzero`,
 /** Checks the concrete executable cannot report success with absent authentication inputs.
  * @returns Nothing after native process exit assertion.
  * @remarks Starts a real isolated Node process without HTTP/context credentials.
  */
 () => { const env = { ...process.env }; for (const key of ['GITHUB_TOKEN','GH_TOKEN','GITHUB_RUN_ID','GITHUB_ACTIONS','GITHUB_REPOSITORY','HANSARD_CI_WORK']) delete env[key];
 const observed = spawnSync(process.execPath, [resolve('scripts/ci-inputs.ts'),action], { env, encoding:'utf8' }); expect(observed.error).toBeUndefined(); expect(observed.status).not.toBe(0); });

for (const [index, target] of ['android-chrome','iphone-safari','desktop-chrome','desktop-edge','desktop-firefox','desktop-safari'].entries()) test(`CI-TARGET missing ${target} blocks merge-only reuse`,
 /** Rejects each independently missing actual target while the other five remain complete.
  * @returns Completion after native exact-report rejection assertion.
  * @remarks Removes only the selected controlled report entry.
  */
 async () => { const value = await fixture(); value.performance.devices.splice(index,1); await save(value); expect((await verify(value)).error).toBeInstanceOf(Error); });

for (const fault of ['missing','http','wrong-subpath','production-origin','device-url','missing-device-url'] as const) test(`CI-TEST-ORIGIN ${fault} cannot establish physical acceptance`,
 /** Rejects an independently configured test-origin or actual-target URL mismatch.
  * @returns Completion after the reached secure-origin assertion.
  * @remarks Changes only controlled options or one temporary report value.
  */
 async () => { const value = await fixture();
 if (fault === 'missing') delete value.options.testOrigin;
 if (fault === 'http') value.options.testOrigin = testOrigin.replace('https:','http:');
 if (fault === 'wrong-subpath') value.options.testOrigin = 'https://controlled-preview.example/';
 if (fault === 'production-origin') value.options.testOrigin = 'https://eaglecheow.github.io/vote-better-malaysia/';
 if (fault === 'device-url') value.performance.devices[0].url = 'https://foreign.example/vote-better-malaysia/';
 if (fault === 'missing-device-url') delete value.performance.devices[0].url;
 await save(value); expect((await verify(value)).error).toBeInstanceOf(Error); });

test('CI-LAB-MATCHING-BUDGET: original collected lab and full report match exactly but over-budget LCP blocks acceptance',
 /** Separately reaches the strict budget gate after an exact collector/report comparison.
  * @returns Completion after fixture coherence and behavioral rejection assertions.
  */
 async () => { const value = await fixture(); const overBudget = await laboratory(value, 3000); const report = structuredClone(value.performance);
 report.runner = structuredClone(overBudget.runner); report.profiles = structuredClone(overBudget.profiles); report.raw = structuredClone(overBudget.raw); report.servedBytes = structuredClone(overBudget.servedBytes);
 expect(report.profiles).toEqual(overBudget.profiles); expect(report.raw).toEqual(overBudget.raw); expect(overBudget.profiles[0].lcpMs).toEqual(Array(20).fill(3000));
 expect(evaluateOverBudget(report)).toBeInstanceOf(Error); expect(labError(overBudget, report, value.candidate)).toBeInstanceOf(Error); });
/** Captures the existing authoritative budget rejection independently of the new seam.
 * @param report Exact matching over-budget collector/full-report fixture.
 * @returns Actual budget error, or null if the positive harness is incorrect.
 */
function evaluateOverBudget(report: Json): unknown { try { evaluateBudgets(report); return null; } catch (error) { return error; } }

 test('CI-CURRENT-CONDITIONS: consistently substituted old conditions cannot authorize the current fixed contract',
 /** Rejects coherent copied conditions drift rather than only report disagreement.
  * @returns Completion after the independently reached current-conditions rejection assertion.
  * @remarks Changes only the controlled candidate copies and temporary downloaded files.
  */
 async () => { const value = await fixture(); value.candidate.conditionsDigest = hash('Foreign conditions copied coherently');
 value.lab.candidate = structuredClone(value.candidate); value.labOrigin.candidate = structuredClone(value.candidate);
 value.performance.candidate = structuredClone(value.candidate); value.performance.expectedCandidate = structuredClone(value.candidate);
 for (const device of value.performance.devices) device.candidate = structuredClone(value.candidate);
 await save(value); expect((await verify(value)).error).toBeInstanceOf(Error); });

/** Moves the one real controlled gap to an independently measured non-ranked sitting.
 * @param value Native source fixture.
 * @returns Completion after consistent accepted source/checkpoint updates.
 * @throws On actual native/source validation failure.
 * @remarks Changes only temporary source bytes, descriptors and matching accepted checkpoint hashes.
 */
async function gapOutsideRanks(value: CiFixture): Promise<void> {
 const checkpoint = await json(join(value.work, 'source-state/checkpoint.json'));
 for (const id of ['2', '5']) { const sitting = value.catalogue.sittings[Number(id) - 1]; const old = JSON.parse(gunzipSync(await readFile(join(value.artifact, sitting.record.path!))).toString('utf8')) as SittingRecord;
 if (id === '5') old.items.pop(); else old.items.push({ ordinal: 1, sourceIndex: 8, sectionPath: ['Synthetic section'], text: 'Synthetic actual separate gap.', rawAuthor: null, sourceAuthorId: null, memberId: null, attribution: 'unassigned', timestamp: null, gapReason: 'missing-id' });
 const decoded = Buffer.from(JSON.stringify(old)); const stored = gzipSync(decoded, { level: 9 }); sitting.record.digest = hash(decoded); sitting.record.decodedBytes = decoded.length; sitting.record.compressedBytes = stored.length; sitting.record.accounting = { total: old.items.length, assigned: 1, unassigned: id === '2' ? 1 : 0, annotations: 0 };
 await put(value.artifact, sitting.record.path!, stored); await put(value.work, 'source-state/snapshots/source/sittings/' + id + '.json.gz', stored); checkpoint!.shardDigests[id] = hash(stored); }
 validateCatalogue(value.catalogue); checkpoint!.catalogue = value.catalogue; checkpoint!.catalogueDigest = hash(JSON.stringify(value.catalogue)); await put(value.work, 'source-state/checkpoint.json', JSON.stringify(checkpoint)); await put(value.artifact, 'data/catalogue.json.gz', gzipSync(JSON.stringify(value.catalogue), { level: 9 })); value.sizes = await measureArtifact(value.artifact); expect(value.sizes.complete).toBe(true);
}

test('CI-GAP-ROUNDTRIP: prepared gap outside median/p95/largest remains an authenticated reusable frozen fixture',
 /** Exercises actual preparation output followed by independent full-report reuse.
  * @returns Completion after native measured original gap and actual reuse assertions.
  * @remarks Updates only controlled provider/report fixtures around real prepared bytes.
  */
 async () => { const value = await fixture(); await gapOutsideRanks(value); const prepared = await prepareCiInputs(preparation(value));
 expect(prepared.candidate.fixtureHashes['data/sittings/2.json.gz']).toBe(hash(await readFile(join(prepared.artifact, 'data/sittings/2.json.gz'))));
 value.candidate = prepared.candidate; value.origin = (await json(join(value.work, 'candidate/origin.json')))!; value.manifest = (await json(join(value.work, 'candidate/fixtures.json')))!; value.sizes = await measureArtifact(prepared.artifact);
 value.runs['301'].status = 'completed'; value.runs['301'].conclusion = 'success'; value.artifacts['503'] = archive('503', '301', 'hansard-ci-candidate', evidenceRevision); value.locator.testedRevision = checkedOut; value.locator.candidate = { runId: '301', runAttempt: 1, artifactId: '503', archiveDigest: value.artifacts['503'].digest.slice(7) };
 value.lab = await laboratory(value); value.performance = performance(value); value.performance.profiles = structuredClone(value.lab.profiles); value.performance.runner = structuredClone(value.lab.runner); value.performance.raw = structuredClone(value.lab.raw); value.documentation.candidate = value.candidate;
 const approval = { tddReviewed: value.automated.tddReviewed, tddReviewer: value.automated.tddReviewer, tddEvidence: value.automated.tddEvidence }; value.automated = { ...(await json(join(value.work, 'candidate/automated.json'))), ...approval }; value.source = { ...(await json(join(value.work, 'candidate/source.json'))), reviewed: true };
 value.labOrigin = { repository, runId: '102', runAttempt: 1, producingRevision: producing, checkedOutRevision: checkedOut, pullRequest: structuredClone(value.locator.pullRequest), candidate: structuredClone(value.candidate), candidateArtifact: structuredClone(value.locator.candidate) }; await save(value);
 const actual = await verify(value); expect.soft(actual.error).toBeNull(); expect.soft(actual.result?.candidate).toEqual(prepared.candidate);
 });

for (const role of ['candidate', 'laboratory', 'evidence', 'source'] as const) test(`CI-ATTEMPT ${role}: old archive cannot authorize a later successful attempt`,
 /** Reaches authentic provider rerun chronology with unchanged run and archive IDs.
  * @returns Completion after actual rejection assertion.
  * @remarks Changes only controlled later-attempt provider and downloaded origin metadata.
  */
 async () => { const value = await fixture(); const selected = role === 'source' ? value.origin.sourceArtifact : value.locator[role]; selected.runAttempt = 2; value.runs[selected.runId].run_attempt = 2; value.runs[selected.runId].run_started_at = iso(now - 200);
 if (role === 'candidate') value.origin.runAttempt = 2; if (role === 'laboratory') value.labOrigin.runAttempt = 2; value.labOrigin.candidateArtifact = structuredClone(value.locator.candidate); await save(value);
 expect((await verify(value)).error).toBeInstanceOf(Error); });

test('CI-NATIVE-CHECKPOINT: actual accepted state omits unsupported checkpoint attempt while authenticated origin preserves it',
 /** Exercises the exact native checkpoint shape emitted by acquisition and copied by publication.
  * @returns Completion after real preparation acceptance assertions.
  * @remarks Removes only the fixture-invented checkpoint field; provider/origin attempt bindings stay unchanged.
  */
 async () => { const value = await fixture(); const checkpoint = (await json(join(value.work, 'source-state/checkpoint.json')))!; delete checkpoint.runAttempt; await put(value.work, 'source-state/checkpoint.json', JSON.stringify(checkpoint));
 const observed = await prepare(preparation(value)); expect.soft(observed.error).toBeNull(); expect.soft(observed.result?.candidate.sourceRevision).toBe(checkedOut); expect.soft(value.commands).toEqual(['build', 'checks']); });

const tddFaults = ['missing-approval', 'false-approval', 'missing-reviewer', 'blank-reviewer', 'missing-manifest', 'array-manifest', 'omitted-narrative', 'malformed-digest', 'unsafe-extra', 'extra-narrative', 'current-drift', 'symbolic-narrative', 'missing-aggregate'] as const;
/** Supplies one independently invalid human TDD review or actual narrative change.
 * @param root Temporary actual checkout.
 * @param report Separately reviewed full automated report.
 * @param fault Concrete TDD evidence fault.
 * @returns Completion after controlled metadata/filesystem mutation.
 * @throws On genuine native fixture errors.
 * @remarks Changes only temporary full-report claims or exact current narrative files.
 */
async function tddFault(root: string, report: Json, fault: typeof tddFaults[number]): Promise<void> {
 const directory = 'specs/001-read-mp-hansard/evidence/'; const path = directory + 'tdd-controlled.md';
 switch (fault) {
 case 'missing-approval': delete report.tddReviewed; break; case 'false-approval': report.tddReviewed = false; break;
 case 'missing-reviewer': delete report.tddReviewer; break; case 'blank-reviewer': report.tddReviewer = ' '; break;
 case 'missing-manifest': delete report.tddEvidence; break; case 'array-manifest': report.tddEvidence = []; break;
 case 'omitted-narrative': delete report.tddEvidence[path]; break; case 'malformed-digest': report.tddEvidence[path] = 'malformed'; break;
 case 'unsafe-extra': report.tddEvidence['../outside.md'] = hash('outside'); break;
 case 'extra-narrative': await put(root, directory + 'tdd-new.md', '# Newly changed current TDD narrative\n'); break;
 case 'current-drift': await put(root, path, '# Changed RED evidence after review\n'); break;
 case 'symbolic-narrative': await rm(join(root, path)); await symlink(join(root, 'README.md'), join(root, path)); break;
 case 'missing-aggregate': await rm(join(root, directory + 'tdd.md')); break;
 }
}

test.each(tddFaults)('CI-TDD %s',
 /** Rejects stale or unreviewed RED evidence independently of native command success.
  * @param fault Concrete separately reviewed full-report boundary.
  * @returns Completion after a reached actual acceptance rejection assertion.
  */
 async (fault) => { const value = await fixture(); await tddFault(value.root, value.automated, fault); await save(value);
 expect((await verify(value)).error).toBeInstanceOf(Error); });

for (const action of ['prepare', 'verify'] as const) for (const status of ['behind', 'diverged', 'foreign-merge-base'] as const) test(`CI-BASE ${action} ${status}: unchanged old PR bytes cannot authorize a different current merged application`,
 /** Exercises coherent advanced-main provider metadata without changing old head/app/frozen bytes.
  * @returns Completion after actual rejection assertion.
  * @remarks Changes only controlled actual-base/test-merge/attempt associations and native compare response.
  */
 async () => { const value = await fixture(); const options = action === 'prepare' ? preparation(value) : value.options; const advancedBase = '6'.repeat(40); const actualMerge = '7'.repeat(40);
 options.baseRevision = advancedBase; options.producingRevision = actualMerge; value.pull.base.sha = advancedBase; value.pull.merge_commit_sha = actualMerge;
 if (action === 'prepare') value.runs['301'].head_sha = actualMerge; else value.runs['300'].pull_requests[0].base.sha = advancedBase;
 value.comparison = { status: status === 'foreign-merge-base' ? 'ahead' : status, ahead_by: 2, behind_by: status === 'foreign-merge-base' ? 0 : 1, base_commit: { sha: advancedBase }, merge_base_commit: { sha: producing } };
 const actual = action === 'prepare' ? await prepare(options) : await verify(value); expect(actual.error).toBeInstanceOf(Error); });
