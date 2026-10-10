import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { afterEach, expect, test } from 'vitest';
import { catalogueFixture } from '../fixtures/catalogue.ts';
import { validateCatalogue, validateSittingRecord, type Catalogue, type DeploymentReceipt, type SittingRecord } from '../../src/source.ts';
import { checkDocumentation, type DocumentationCandidate } from '../../scripts/check-documentation.ts';
import { evaluateBudgets, measureArtifact, type ArtifactSizes } from '../../scripts/check-performance.ts';
import { acquire, finalizeAcquiredCheckpoint, readPublicationCheckpoint, validateHistoricalServedBaseline, type AcquisitionOptions } from '../../scripts/acquire.ts';
import { finalizePublication, preparePublication, promotePublication, verifyPublicationOrigin, type PublicationOptions, type PublicationOrigin, type PublicationResult } from '../../scripts/publication.ts';

type Json = Record<string, any>;
const repository = 'eaglecheow/vote-better-malaysia';
const now = Date.parse('2026-10-10T04:00:00.000Z');
const revision = '1'.repeat(40); const laterRevision = '2'.repeat(40);
const historicalRun = '299'; const historicalArtifact = '899';
const testOrigin = 'https://controlled-preview.example/vote-better-malaysia/';
const scratch: string[] = [];
interface Fixture {
  root: string; state: string; work: string; artifact: string; options: PublicationOptions;
  catalogue: Catalogue; candidate: DocumentationCandidate; sizes: ArtifactSizes;
  performance: Json; documentation: Json; automated: Json; source: Json;
  runs: Record<string, Json>; artifacts: Record<string, Json>; deployment: Json; status: Json; pages: Json;
  calls: string[]; commands: string[]; oldServed: Uint8Array; checkpoint: Json; elapsed: number;
  priorCatalogue: Catalogue; priorArtifact: string; livePrior: boolean;
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
/** Supplies one independently controlled producing-run response.
 * @param id Exact controlled workflow run ID.
 * @param sha Authenticated producing revision, independent of tested candidate revision.
 * @param active Whether this is the currently executing unfinished workflow.
 * @returns Official-shaped GitHub REST workflow metadata.
 */
function run(id: string, sha: string, active = false): Json {
  return { id: Number(id), run_attempt: 1, head_branch: 'main', head_sha: sha, path: '.github/workflows/pages.yml', workflow_id: 71,
    event: 'workflow_dispatch', status: active ? 'in_progress' : 'completed', conclusion: active ? null : 'success', pull_requests: [],
    repository: { id: 123, full_name: repository }, head_repository: { id: 123, full_name: repository },
    html_url: `https://github.com/${repository}/actions/runs/${id}`, created_at: iso(now - 7_200_000), run_started_at: iso(now - 7_200_000), updated_at: iso(now - 600_000) };
}
/** Supplies one immutable API artifact binding instead of trusting downloaded payload flags.
 * @param id Exact controlled artifact ID.
 * @param runId Producing workflow ID.
 * @param name Fixed reviewed artifact name.
 * @param sha Producing revision.
 * @returns Official-shaped artifact metadata with independent origin and expiry.
 */
function artifact(id: string, runId: string, name: string, sha: string): Json {
  return { id: Number(id), name, expired: false, created_at: iso(now - 3_600_000), expires_at: iso(now + 6 * 86_400_000),
    digest: 'sha256:' + hash(`Synthetic immutable archive ${id}`), workflow_run: { id: Number(runId), repository_id: 123, head_repository_id: 123, head_branch: 'main', head_sha: sha } };
}
/** Builds complete synthetic enforcement data; it is never evidence of physical-device execution.
 * @param value Temporary measured artifact and exact candidate.
 * @returns A report independently accepted by the existing authoritative budget checker.
 */
function performance(value: Pick<Fixture, 'candidate' | 'sizes'>): Json {
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
/** Creates actual temporary source, artifact, reports and authenticated-transport fixtures.
 * @returns A coherent synthetic publication boundary, never a live GitHub/device attestation.
 * @throws On native setup or authoritative fixture validation failure.
 * @remarks Allocates tracked scratch directories and writes only their controlled files.
 */
async function fixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'hansard-publication-')); scratch.push(root);
  const state = join(root, '.cache', 'hansard'); const work = join(root, 'publication'); const artifactPath = join(work, 'artifact');
  const catalogue = catalogueFixture(); catalogue.snapshotId = 'controlled-frozen-candidate'; catalogue.preparedAt = iso(now - 3_600_000); catalogue.publishedAt = null;
  catalogue.provenance.inventoryAcquiredAt = iso(now - 4_000_000); catalogue.provenance.membersAcquiredAt = iso(now - 4_000_001); catalogue.status.completedAt = iso(now - 3_600_001);
  catalogue.status.workflowUrl = `https://github.com/${repository}/actions/runs/101`; catalogue.status.lastConfirmedDeployment = null;
  const template = catalogue.sittings[0]; catalogue.sittings = []; catalogue.members = [catalogue.members[0]];
  const shardDigests: Record<string, string> = {};
  for (let index = 1; index <= 5; index++) {
    const date = `2026-10-0${index}`; const sitting = structuredClone(template); sitting.id = String(index); sitting.date = date; sitting.filename = 'dr_' + date;
    sitting.sourceUrl = `https://hansard.parlimen.gov.my/hansard/dewan-rakyat/${date}`; sitting.isFinal = true;
    const record: SittingRecord = { schemaVersion: 1, sittingId: sitting.id, sourceUrl: sitting.sourceUrl,
      identity: { date, parliament: sitting.parliament, penggal: sitting.penggal, mesyuarat: sitting.mesyuarat, house: sitting.house, filename: sitting.filename, isFinal: true },
      items: [{ ordinal: 0, sourceIndex: 7, sectionPath: ['Synthetic section'], text: 'Synthetic original paragraphs.\n\n'.repeat(index * 10), rawAuthor: 'Synthetic speaker',
        sourceAuthorId: catalogue.members[0].id, memberId: catalogue.members[0].id, attribution: 'assigned', timestamp: null, gapReason: null }] };
    const decoded = Buffer.from(JSON.stringify(record)); const stored = gzipSync(decoded, { level: 9 });
    sitting.record = { availability: 'available', path: `data/sittings/${index}.json.gz`, digest: hash(decoded), decodedBytes: decoded.length, compressedBytes: stored.length,
      acquiredAt: iso(now - 4_100_000), lastAttemptAt: iso(now - 4_100_000), lastAttemptOutcome: 'success', sourceBuildId: 'synthetic-build', rawSourceDigest: hash('synthetic raw ' + index),
      sourcePublishedAt: null, sourceRevisedAt: null, accounting: { total: 1, assigned: 1, unassigned: 0, annotations: 0 } };
    catalogue.sittings.push(sitting); shardDigests[sitting.id] = hash(stored);
    await put(artifactPath, sitting.record.path!, stored); await put(state, 'snapshots/controlled/sittings/' + index + '.json.gz', stored);
  }
  catalogue.coverage = { parliaments: [template.parliament], startDate: '2026-10-01', endDate: '2026-10-05', latestInventoryCount: 5, retainedSittingCount: 0, unavailableSittingCount: 0, attributionGapCount: 0 };
  validateCatalogue(catalogue);
  const catalogueBytes = Buffer.from(JSON.stringify(catalogue)); await put(artifactPath, 'data/catalogue.json.gz', gzipSync(catalogueBytes, { level: 9 }));
  for (const [path, contents] of [['index.html', '<!doctype html><title>Synthetic reader</title>'], ['assets/app.js', 'console.log("synthetic")'], ['assets/app.css', 'body{color:#111}'],
    ['manifest.webmanifest', '{"name":"Synthetic"}'], ['sw.js', '/* synthetic worker bytes */'], ['icons/icon-192.png', 'synthetic icon'], ['icons/icon-512.png', 'synthetic icon']]) await put(artifactPath, path, contents);
  const sources: Record<string, string> = { 'src/sample.ts': '/** Returns its numeric input.\n * @param value Numeric input.\n * @returns The supplied number.\n */\nexport function sample(value:number):number{return value;}\n',
    'README.md': '[Development](docs/development.md)\n[Reader](docs/user-guide.md)\n', 'docs/development.md': '# Synthetic development\nControlled command guidance.\n',
    'docs/user-guide.md': '# Reader\n## Bahasa Melayu\nPanduan ujian terkawal.\n## English\nControlled test guidance.\n' };
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(sources)) { await put(root, path, content); files[path] = hash(content); }
 const tddEvidence: Record<string, string> = {};
 for (const name of ['tdd.md', 'tdd-controlled.md']) { const path = 'specs/001-read-mp-hansard/evidence/' + name; const text = '# Controlled TDD narrative\nSynthetic assertion RED, GREEN and no-refactor review; not live acceptance.\n'; await put(root, path, text); tddEvidence[path] = hash(text); }
  const sizes = await measureArtifact(artifactPath); const fixtureHashes: Record<string, string> = {};
  const priorCatalogue = structuredClone(catalogue); priorCatalogue.snapshotId = 'controlled-old-served'; priorCatalogue.preparedAt = iso(now - 2 * 86_400_000);
  priorCatalogue.status.completedAt = iso(now - 2 * 86_400_000 - 1); priorCatalogue.status.workflowUrl = `https://github.com/${repository}/actions/runs/99`;
  priorCatalogue.provenance.inventoryAcquiredAt = iso(now - 2 * 86_400_000 - 2000); priorCatalogue.provenance.membersAcquiredAt = iso(now - 2 * 86_400_000 - 2001);
  for (const sitting of priorCatalogue.sittings) { sitting.record.acquiredAt = iso(now - 2 * 86_400_000 - 3000); sitting.record.lastAttemptAt = sitting.record.acquiredAt; }
  validateCatalogue(priorCatalogue); const priorBytes = Buffer.from(JSON.stringify(priorCatalogue)); const priorArtifact = join(root, 'prior-served-artifact');
  await cp(artifactPath, priorArtifact, { recursive: true }); await put(priorArtifact, 'data/catalogue.json.gz', gzipSync(priorBytes, { level: 9 }));
  const priorSizes = await measureArtifact(priorArtifact);
  for (const path of ['data/catalogue.json.gz', 'data/sittings/3.json.gz', 'data/sittings/5.json.gz']) fixtureHashes[path] = hash(await readFile(join(artifactPath, path)));
  const candidate: DocumentationCandidate = { sourceRevision: revision, applicationFingerprint: hash(JSON.stringify([['src/sample.ts', Buffer.byteLength(sources['src/sample.ts']), hash(sources['src/sample.ts'])]])), artifactDigest: sizes.artifactDigest,
    snapshotId: catalogue.snapshotId, fixtureHashes, conditionsDigest: hash('Synthetic reviewed fixed measurement conditions'), priorServedBaselineDigest: priorSizes.artifactDigest };
  const documentation = { candidate: structuredClone(candidate), reviewedAt: iso(now - 1000), reviewer: 'Synthetic enforcement-only reviewer',
    accuracy: { purpose: true, parameters: true, returns: true, errors: true, sideEffects: true, commands: true },
    guideCoverage: { bm: ['selection', 'reading', 'gaps', 'source', 'absence', 'errors', 'saved', 'install', 'updates'], en: ['selection', 'reading', 'gaps', 'source', 'absence', 'errors', 'saved', 'install', 'updates'] }, files };
  const checkpoint = { schemaVersion: 1, originKind: 'workflow-artifact', publicationEligible: true, repository, branch: 'main', runId: '101', runAttempt: 1,
    workflowUrl: `https://github.com/${repository}/actions/runs/101`, codeFingerprint: hash('Synthetic current acquisition code'), createdAt: iso(now - 3_600_000), success: true,
    catalogue, catalogueDigest: hash(catalogueBytes), shardDigests, shardRoot: 'snapshots/controlled', servedReceipt: null };
  const oldServed = Buffer.from(JSON.stringify({ repository, branch: 'main', runId: '99', runAttempt: 1, sourceRevision: revision, codeFingerprint: hash('Synthetic original served code'),
    artifactId: '499', receipt: { snapshotId: 'controlled-old-served', deploymentId: '698', publishedAt: iso(now - 86_400_000), verifiedServedAt: iso(now - 86_399_000), workflowUrl: `https://github.com/${repository}/actions/runs/99` },
    artifactDigest: candidate.priorServedBaselineDigest, catalogueDigest: hash(priorBytes), shardDigests, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/', files: priorSizes.files }));
  const options: PublicationOptions = { root, state, work, repository, branch: 'main', runId: '300', runAttempt: 1, sourceRevision: laterRevision, codeFingerprint: checkpoint.codeFingerprint,
    candidateRunId: '101', candidateArtifactId: '501', pagesCandidateArtifactId: '502', evidenceRunId: '201', evidenceArtifactId: '601', pagesArtifactId: '900', servedRunId: '99', servedArtifactId: '499', testOrigin, candidateResult: 'success', deployResult: 'success' };
  const value: Fixture = { root, state, work, artifact: artifactPath, options, catalogue, candidate, sizes, performance: performance({ candidate, sizes }), documentation,
    automated: { candidate, reviewedAt: iso(now - 1000), tddReviewed: true, tddReviewer: 'Synthetic named enforcement reviewer', tddEvidence, checks: { type: true, unit: true, build: true, browser: true, source: true } },
    source: { candidate, reviewedAt: iso(now - 1000), reviewed: true, expected: 5, accounted: 5, available: 5, retained: 0, unavailable: 0 },
    runs: { '101': run('101', revision), '201': run('201', laterRevision), '300': run('300', laterRevision, true) },
    artifacts: { '501': artifact('501', '101', 'hansard-candidate', revision), '502': artifact('502', '101', 'hansard-pages-candidate', revision),
      '601': artifact('601', '201', 'hansard-evidence', laterRevision), '900': artifact('900', '300', 'github-pages', laterRevision) },
    deployment: { id: 700, sha: laterRevision, ref: 'main', environment: 'github-pages', creator: { login: 'github-actions[bot]' },
      payload: {}, statuses_url: `https://api.github.com/repos/${repository}/deployments/700/statuses` },
    status: { id: 701, state: 'success', created_at: iso(now - 1_800_000), environment: 'github-pages', environment_url: 'https://eaglecheow.github.io/vote-better-malaysia/',
      log_url: `https://github.com/${repository}/actions/runs/300/job/301`, deployment_url: `https://api.github.com/repos/${repository}/deployments/700` },
    pages: { status: 'succeed' }, calls: [], commands: [], oldServed, checkpoint, elapsed: 0, priorCatalogue, priorArtifact, livePrior: false };
  options.transport = transport.bind(null, value); options.now = currentTime.bind(null, value); options.sleep = advanceClock.bind(null, value); options.command = command.bind(null, value);
  value.runs['99'] = { ...run('99', revision), created_at: iso(now - 86_400_000 - 7_200_000), run_started_at: iso(now - 86_400_000 - 7_200_000), updated_at: iso(now - 86_397_000) };
  value.artifacts['499'] = artifact('499', '99', 'hansard-served', revision); value.artifacts['499'].created_at = iso(now - 86_398_000);
  await put(value.work, 'served-origin.json', JSON.stringify({ repository, branch: 'main', runId: '99', runAttempt: 1, sourceRevision: revision, codeFingerprint: hash('Synthetic original served code') }));
  await put(state, 'checkpoint.json', JSON.stringify(checkpoint)); await put(state, 'served-publication.json', oldServed);
  await save(value); return value;
}
/** Saves synthetic external metadata separately from deployed bytes.
 * @param value Controlled publication fixture.
 * @returns Completion after private candidate/report writes.
 * @throws On genuine isolated filesystem errors.
 * @remarks Replaces only fixture-private evidence files.
 */
async function save(value: Fixture): Promise<void> {
  await put(value.work, 'candidate.json', JSON.stringify(value.candidate)); await put(value.work, 'fixtures.json', JSON.stringify(value.candidate.fixtureHashes));
  await put(value.work, 'origin.json', JSON.stringify({ repository, branch: 'main', sourceRevision: revision, codeFingerprint: value.options.codeFingerprint, runId: '101', runAttempt: 1, trusted: true }));
  for (const [name, report] of [['performance', value.performance], ['documentation', value.documentation], ['automated', value.automated], ['source', value.source]]) await put(value.work, 'reports/' + name + '.json', JSON.stringify(report));
}
/** Supplies one fixed independent executing clock.
 * @param value Isolated controlled clock.
 * @returns Controlled UTC milliseconds.
 */
function currentTime(value: Fixture): number { return now + value.elapsed; }
/** Advances only the controlled source-acquisition pacing clock.
 * @param value Isolated controlled clock.
 * @param milliseconds Actual pacing/backoff duration requested by acquisition.
 * @returns Completion without a real wait.
 * @remarks Advances the synthetic elapsed time, never an official change timestamp.
 */
async function advanceClock(value: Fixture, milliseconds: number): Promise<void> { value.elapsed += milliseconds; }
/** Records controlled command invocation; no controller can mistake this fixture for a real CLI pass.
 * @param value Temporary fixture whose already-real artifact is used by controlled tests.
 * @param kind Requested build or automated-check command.
 * @param root Exact temporary checkout where the command must run.
 * @returns Completion after recording the bounded test command.
 * @throws On an unexpected command working directory.
 * @remarks Records commands and creates/validates real temporary build files; actual CLI uses native commands.
 */
async function command(value: Fixture, kind: 'build' | 'checks', root: string): Promise<void> {
  if (root !== value.root) throw new Error('Wrong controlled command directory'); value.commands.push(kind);
  if (kind === 'build') { await cp(value.artifact, join(root, 'dist'), { recursive: true }); await cp(join(root, 'public/data'), join(root, 'dist/data'), { recursive: true }); }
  else { const catalogue = await readFile(join(root, 'public/data/catalogue.json.gz')); validateCatalogue(JSON.parse(gunzipSync(catalogue).toString('utf8'))); }
}
/** Supplies independently controlled GitHub/served-source HTTP responses without network access.
 * @param value Temporary fixture containing authoritative-shape API responses.
 * @param input Requested native Fetch URL.
 * @param _init Request options retained by the publication boundary.
 * @returns Controlled API or exact stored served catalogue bytes, otherwise a bounded 404.
 * @throws On an unsupported unsafe URL.
 * @remarks Records every attempted URL for no-source-fetch/promotion assertions.
 */
async function transport(value: Fixture, input: string | URL | Request, _init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); value.calls.push(url.href);
  if (url.origin === 'https://api.github.com') {
    const prefix = '/repos/' + repository; const suffix = url.pathname.slice(prefix.length);
    if (!url.pathname.startsWith(prefix + '/')) return new Response('wrong repository', { status: 404 });
    if (suffix === '/actions/workflows/pages.yml') return Response.json({ id: 71, path: '.github/workflows/pages.yml', state: 'active' });
    const runMatch = /^\/actions\/runs\/(\d+)$/.exec(suffix); if (runMatch) return Response.json(value.runs[runMatch[1]] ?? {}, { status: value.runs[runMatch[1]] ? 200 : 404 });
    const artifactMatch = /^\/actions\/artifacts\/(\d+)$/.exec(suffix); if (artifactMatch) return Response.json(value.artifacts[artifactMatch[1]] ?? {}, { status: value.artifacts[artifactMatch[1]] ? 200 : 404 });
    if (/^\/actions\/runs\/\d+\/artifacts$/.test(suffix)) { const id = suffix.split('/')[3]; const list: Json[] = []; for (const record of Object.values(value.artifacts)) if (String(record.workflow_run.id) === id) list.push(record); return Response.json({ total_count: list.length, artifacts: list }); }
    if (suffix === '/deployments') return Response.json([value.deployment]);
    if (suffix === '/deployments/700') return Response.json(value.deployment);
    if (suffix === '/deployments/700/statuses') return Response.json([value.status]);
    if (suffix === '/pages/deployments/' + laterRevision) return Response.json(value.pages);
    if (suffix === '/pages') return Response.json({ html_url: 'https://eaglecheow.github.io/vote-better-malaysia/', status: 'built' });
    if (suffix === '/actions/runs/300/attempts/1/jobs') return Response.json({ jobs: [{ id: 301, run_id: 300, head_sha: laterRevision, name: 'deploy', status: 'completed', conclusion: 'success', html_url: `https://github.com/${repository}/actions/runs/300/job/301`,
      steps: [{ name: 'Deploy exact candidate', number: 4, status: 'completed', conclusion: 'success' }] }] });
    return new Response('unsupported controlled GitHub endpoint', { status: 404 });
  }
  if (['https://eaglecheow.github.io', 'https://controlled-preview.example'].includes(url.origin) && url.pathname.startsWith('/vote-better-malaysia/')) {
    const path = url.pathname.slice('/vote-better-malaysia/'.length); let known = false;
    for (const [file] of value.sizes.files) if (file === path) known = true;
    if (known) return new Response(Uint8Array.from(await readFile(join(url.origin === 'https://eaglecheow.github.io' && value.livePrior ? value.priorArtifact : value.artifact, path))));
  }
  if (url.origin === 'https://eaglecheow.github.io' && url.pathname === '/vote-better-malaysia/data/catalogue.json.gz') return new Response(Uint8Array.from(await readFile(join(value.livePrior ? value.priorArtifact : value.artifact, 'data/catalogue.json.gz'))));
  if (url.origin === 'https://eaglecheow.github.io' && /^\/vote-better-malaysia\/data\/sittings\/[1-9]\d*\.json\.gz$/.test(url.pathname)) return new Response(Uint8Array.from(await readFile(join(value.livePrior ? value.priorArtifact : value.artifact, url.pathname.slice('/vote-better-malaysia/'.length)))));
  if (url.origin === 'https://controlled-preview.example' && url.pathname === '/vote-better-malaysia/data/catalogue.json.gz') return new Response(Uint8Array.from(await readFile(join(value.artifact, 'data/catalogue.json.gz'))));
  if (url.origin === 'https://hansard.parlimen.gov.my') {
    if (url.pathname === '/') return new Response('<script id="__NEXT_DATA__">{"buildId":"synthetic-build"}</script>');
    if (url.pathname.endsWith('/cari-mp.json')) return Response.json({ pageProps: { speakers: [{ new_author_id: Number(value.catalogue.members[0].id), name: value.catalogue.members[0].name }] } });
    if (url.pathname.endsWith('/katalog/dewan-rakyat.json')) {
      const sitting_list: Json[] = []; for (const sitting of value.catalogue.sittings) sitting_list.push({ sitting_id: Number(sitting.id), date: sitting.date, filename: sitting.filename, is_final: sitting.isFinal });
      const span = { start_date: '2026-10-01', end_date: '2026-10-05' };
      return Response.json({ pageProps: { archive: { '13': { ...span, '2': { ...span, '0': { ...span, sitting_list } } } } } });
    }
    const date = url.searchParams.get('date');
    for (const sitting of value.catalogue.sittings) if (sitting.date === date) { const record = JSON.parse(gunzipSync(await readFile(join(value.artifact, sitting.record.path!))).toString('utf8')) as SittingRecord;
      return Response.json({ pageProps: { meta: { id: '/hansard/dewan-rakyat/' + date }, cycle: { house: 0, term: sitting.parliament, session: sitting.penggal, meeting: sitting.mesyuarat }, date, filename: sitting.filename, is_final: sitting.isFinal,
        speeches: [{ speech: record.items[0].text, author: record.items[0].rawAuthor, author_id: Number(record.items[0].sourceAuthorId), timestamp: null, is_annotation: false, index: 7 }] } }); }
    return new Response('controlled absent route', { status: 404 });
  }
  throw new Error('Unsafe publication URL');
}
/** Observes controller rejection without throwing or dereferencing an inert result in the harness.
 * @param operation Inert or implemented publication operation.
 * @param input Concrete controlled options.
 * @returns Actual result/error plus whether the boundary rejected it.
 */
async function observe(operation: (input: unknown) => Promise<PublicationResult>, input: unknown): Promise<{ result: PublicationResult | null; error: string | null; rejected: boolean }> {
  try { const result = await operation(input); return { result: result ?? null, error: null, rejected: result?.outcome === 'failed' }; }
  catch (error) { return { result: null, error: error instanceof Error ? error.message : String(error), rejected: true }; }
}
/** Selects the genuinely previous served site for a prepublication promotion fixture.
 * @param value Temporary server/candidate fixture.
 * @returns Original executing publication options.
 * @remarks Changes only the controlled live-site selector, never private confirmation metadata.
 */
function promotionOptions(value: Fixture): PublicationOptions { value.livePrior = true; return value.options; }
/** Proves the synthetic fixture passes existing source/size/report validators before new-feature RED.
 * @returns Completion after authoritative fixture-only controls.
 * @throws On genuine fixture setup/read errors.
 */
async function validatesHarness(): Promise<void> {
  const value = await fixture(); expect(value.sizes.complete).toBe(true); expect(evaluateBudgets(value.performance)).toBe(true);
  expect(checkDocumentation({ root: value.root, candidate: value.candidate, reportPath: join(value.work, 'reports/documentation.json'), now: iso(now) })).toEqual([]);
  for (const sitting of value.catalogue.sittings) validateSittingRecord(JSON.parse(gunzipSync(await readFile(join(value.artifact, sitting.record.path!))).toString('utf8')), sitting, value.catalogue);
}
test('PUB-HARNESS: controlled real files satisfy existing authoritative checks (positive harness control, not RED)', validatesHarness);

/** Requires independently API-validated default-branch candidate origin.
 * @returns Completion after accepted exact origin and independent request assertions.
 * @throws On genuine temporary fixture setup errors.
 */
async function acceptsOrigin(): Promise<void> {
  const value = await fixture(); const accepted = await verifyPublicationOrigin({ runId: '101', artifactId: '501', name: 'hansard-candidate', sourceRevision: revision }, value.options);
  expect(accepted).toMatchObject({ repository, runId: '101', runAttempt: 1, sourceRevision: revision, artifactId: '501', archiveDigest: value.artifacts['501'].digest.slice(7) });
  expect(value.calls).toContain(`https://api.github.com/repos/${repository}/actions/runs/101`);
}
test('PUB-ORIGIN-ACCEPT: origin is authenticated separately from payload flags', acceptsOrigin);

const originFaults = ['repository', 'head-repository', 'branch', 'event-pr', 'status', 'conclusion', 'workflow-path', 'workflow-id', 'source-revision', 'run-id', 'run-attempt', 'artifact-run', 'artifact-repository', 'artifact-head-repository', 'artifact-branch', 'artifact-sha', 'artifact-id', 'artifact-name', 'expired', 'created-future', 'seven-days-over', 'digest', 'downloaded-trusted-flag'] as const;
/** Requires every wrong/untrusted imported origin to reject behaviorally.
 * @param fault One controlled malformed API binding.
 * @returns Completion after fail-closed and untouched original served-byte assertions.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only controlled API responses and temporary origin metadata.
 */
async function rejectsOrigin(fault: typeof originFaults[number]): Promise<void> {
  const value = await fixture(); const current = value.runs['101']; const stored = value.artifacts['501'];
  switch (fault) {
    case 'repository': current.repository.id = 999; break; case 'head-repository': current.head_repository.id = 999; break;
    case 'branch': current.head_branch = 'feature'; break; case 'event-pr': current.event = 'pull_request'; break;
    case 'status': current.status = 'in_progress'; break; case 'conclusion': current.conclusion = 'failure'; break;
    case 'workflow-path': current.path = '.github/workflows/foreign.yml'; break; case 'workflow-id': current.workflow_id = 999; break;
    case 'source-revision': current.head_sha = laterRevision; break; case 'run-id': current.id = 999; break; case 'run-attempt': current.run_attempt = 2; break;
    case 'artifact-run': stored.workflow_run.id = 999; break; case 'artifact-repository': stored.workflow_run.repository_id = 999; break;
    case 'artifact-head-repository': stored.workflow_run.head_repository_id = 999; break; case 'artifact-branch': stored.workflow_run.head_branch = 'feature'; break;
    case 'artifact-sha': stored.workflow_run.head_sha = laterRevision; break; case 'artifact-id': stored.id = 999; break;
    case 'artifact-name': stored.name = 'foreign-artifact'; break; case 'expired': stored.expired = true; break;
    case 'created-future': stored.created_at = iso(now + 1); break; case 'seven-days-over': stored.created_at = iso(now - 7 * 86_400_000 - 1); break;
    case 'digest': stored.digest = 'sha256:malformed'; break; case 'downloaded-trusted-flag': delete value.runs['101']; break;
  }
  let rejected = false; try { await verifyPublicationOrigin({ runId: '101', runAttempt: 1, artifactId: '501', name: 'hansard-candidate', sourceRevision: revision, trusted: true, branch: 'main', success: true }, value.options); } catch { rejected = true; }
  expect({ rejected, served: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, served: value.oldServed });
}
test.each(originFaults)('PUB-ORIGIN-REJECT: %s cannot authenticate imported state/candidate/report', rejectsOrigin);

/** Requires exact promotion using authentic newer evidence origin without rewriting the tested revision.
 * @returns Completion after eligibility, exact artifact digest and no source/build assertions.
 * @throws On genuine temporary setup/read errors.
 * @remarks Logs observed controlled candidate/journal facts; this is not live publication or hardware evidence.
 */
async function promotesExactCandidate(): Promise<void> {
  const value = await fixture(); const before = await measureArtifact(value.artifact); const observed = await observe(promotePublication, promotionOptions(value));
  expect(observed.result).toMatchObject({ outcome: 'ready', candidate: value.candidate, receipt: null });
  expect((await measureArtifact(value.artifact)).artifactDigest).toBe(before.artifactDigest); expect(value.commands).toEqual([]);
  expect(value.calls.some(isOfficialSource)).toBe(false); expect(observed.result?.candidate?.sourceRevision).toBe(revision);
  console.log(JSON.stringify({ evidenceType: 'controlled synthetic filesystem/transport enforcement', operation: 'exact-promotion', observedAtUTC: new Date().toISOString(),
    candidate: observed.result?.candidate, measuredArtifactDigest: before.artifactDigest, snapshotPreparedAt: value.catalogue.preparedAt, sourceAcquiredAt: value.catalogue.sittings[0].record.acquiredAt,
    deviceReportReviewedAt: value.performance.devices[0].reviewedAt, journal: await json(join(value.state, 'publication-runs/300-1.json')), sourceRequested: value.calls.some(isOfficialSource), commands: value.commands,
    publicationPerformed: false, officialChangeAt: null, officialChangeToPublicationLatency: null }));
}
/** Detects actual source access independently of publication API traffic.
 * @param url Recorded request URL.
 * @returns Whether it requests the official source origin.
 */
function isOfficialSource(url: string): boolean { return new URL(url).origin === 'https://hansard.parlimen.gov.my'; }
test('PUB-PROMOTE-EXACT: later documentation-only evidence run promotes exact older candidate without reacquisition/rebuild', promotesExactCandidate);

const promotionFaults = ['sourceRevision', 'applicationFingerprint', 'artifactDigest', 'snapshotId', 'fixtureHashes', 'conditionsDigest', 'priorServedBaselineDigest', 'current-application', 'superseded-baseline',
  'changed-asset', 'provenance-only', 'missing-performance', 'failed-performance', 'missing-device', 'expired-device', 'wrong-device-candidate', 'missing-documentation', 'failed-documentation', 'changed-documentation',
  'missing-automated', 'failed-automated', 'missing-source', 'failed-source', 'expired-report', 'untrusted-evidence-run', 'untrusted-candidate-run', 'metadata-inside-artifact', 'fixture-missing', 'fixture-changed'] as const;
/** Requires changed candidate/report/application/baseline bytes to block promotion and preserve served state.
 * @param fault One independently controlled mismatch or missing required report.
 * @returns Completion after rejection/awaiting evidence and exact preservation assertions.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Alters only isolated fixture bytes or untrusted report/API metadata.
 */
async function blocksPromotion(fault: typeof promotionFaults[number]): Promise<void> {
  const value = await fixture(); const before = await readFile(join(value.state, 'checkpoint.json'));
  if (['sourceRevision', 'applicationFingerprint', 'artifactDigest', 'snapshotId', 'conditionsDigest', 'priorServedBaselineDigest'].includes(fault)) value.performance.candidate[fault] = fault === 'snapshotId' ? 'different-snapshot' : 'f'.repeat(fault === 'sourceRevision' ? 40 : 64);
  else switch (fault) {
    case 'fixtureHashes': value.performance.candidate.fixtureHashes['data/sittings/3.json.gz'] = 'f'.repeat(64); break;
    case 'current-application': await put(value.root, 'src/sample.ts', '/** Changed runtime input.\n * @returns Changed value.\n */\nexport function changed():number{return 2;}'); break;
    case 'superseded-baseline': await put(value.state, 'served-publication.json', JSON.stringify({ artifactDigest: hash('different served site') })); break;
    case 'changed-asset': await put(value.artifact, 'assets/app.js', 'console.log("different bytes")'); break;
    case 'provenance-only': { const changed = structuredClone(value.catalogue); changed.preparedAt = iso(now - 3_000_000); await put(value.artifact, 'data/catalogue.json.gz', gzipSync(Buffer.from(JSON.stringify(changed)))); break; }
    case 'failed-performance': value.performance.profiles[0].lcpMs.fill(2501); break; case 'missing-device': value.performance.devices.pop(); break;
    case 'expired-device': value.performance.devices[0].reviewedAt = iso(now - 7 * 86_400_000 - 1); break; case 'wrong-device-candidate': value.performance.devices[0].candidate.artifactDigest = 'f'.repeat(64); break;
    case 'failed-documentation': value.documentation.accuracy.commands = false; break; case 'changed-documentation': await put(value.root, 'docs/user-guide.md', '# Changed unreviewed guide'); break;
    case 'failed-automated': value.automated.checks.browser = false; break; case 'failed-source': value.source.accounted = 4; break;
    case 'expired-report': value.performance.reviewedAt = iso(now - 7 * 86_400_000 - 1); break;
    case 'untrusted-evidence-run': value.runs['201'].event = 'pull_request'; break; case 'untrusted-candidate-run': value.runs['101'].head_branch = 'feature'; break;
    case 'metadata-inside-artifact': await put(value.artifact, 'candidate.json', JSON.stringify(value.candidate)); break;
    case 'fixture-missing': delete value.candidate.fixtureHashes['data/sittings/3.json.gz']; break; case 'fixture-changed': value.candidate.fixtureHashes['data/sittings/3.json.gz'] = 'f'.repeat(64); break;
  }
  await save(value); if (fault.startsWith('missing-')) await rm(join(value.work, 'reports', fault.slice(8) + '.json'), { force: true });
  const servedBefore = await readFile(join(value.state, 'served-publication.json')); const observed = await observe(promotePublication, promotionOptions(value));
  expect({ blocked: observed.rejected || observed.result?.outcome === 'awaiting-evidence', commands: value.commands,
    served: await readFile(join(value.state, 'served-publication.json')), checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ blocked: true, commands: [], served: servedBefore, checkpoint: before });
}
test.each(promotionFaults)('PUB-PROMOTE-BLOCK: %s cannot publish or change accepted/served state', blocksPromotion);

/** Requires pending physical/report evidence to produce a finished private awaiting state.
 * @returns Completion after durable outcome and no source/build/deployment assertions.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Deletes only synthetic evidence and logs actual controlled wait journal facts, without a publication claim.
 */
async function recordsEvidenceWait(): Promise<void> {
  const value = await fixture(); await rm(join(value.work, 'reports/performance.json'));
  const observed = await observe(promotePublication, promotionOptions(value)); const recorded = await json(join(value.state, 'publication-runs/300-1.json'));
  expect({ outcome: observed.result?.outcome, recorded: recorded?.deploymentOutcome, commands: value.commands, sourceRequested: value.calls.some(isOfficialSource) }).toEqual({ outcome: 'awaiting-evidence', recorded: 'awaiting-evidence', commands: [], sourceRequested: false });
  console.log(JSON.stringify({ evidenceType: 'controlled synthetic filesystem/transport enforcement', operation: 'evidence-wait', observedAtUTC: new Date().toISOString(), candidate: observed.result?.candidate,
    snapshotPreparedAt: value.catalogue.preparedAt, sourceAcquiredAt: value.catalogue.sittings[0].record.acquiredAt, journal: recorded, reason: observed.result?.reason, commands: value.commands,
    sourceRequested: value.calls.some(isOfficialSource), publicationPerformed: false, officialChangeAt: null, officialChangeToPublicationLatency: null }));
}
test('PUB-WAIT: missing evidence records awaiting-evidence and terminates without deployment or an open human wait', recordsEvidenceWait);

/** Requires GitHub-confirmed matching deployment plus actual live snapshot verification outside frozen bytes.
 * @returns Completion after current run-in-progress acceptance and matching immutable receipt/checkpoint assertions.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function finalizesMatchingPublication(): Promise<void> {
  const value = await fixture(); const before = await measureArtifact(value.artifact); const catalogueBefore = await readFile(join(value.artifact, 'data/catalogue.json.gz'));
  const observed = await observe(finalizePublication, value.options); const saved = await json(join(value.state, 'served-publication.json'));
  const expectedReceipt = receipt(value);
  expect.soft(observed.result).toMatchObject({ outcome: 'finalized', receipt: expectedReceipt });
  expect.soft(saved).toMatchObject({ receipt: expectedReceipt, artifactDigest: value.candidate.artifactDigest, catalogueDigest: value.checkpoint.catalogueDigest });
  expect(await readFile(join(value.artifact, 'data/catalogue.json.gz'))).toEqual(catalogueBefore); expect((await measureArtifact(value.artifact)).artifactDigest).toBe(before.artifactDigest);
  const checkpoint = await json(join(value.state, 'checkpoint.json')); expect(checkpoint?.catalogue.publishedAt).toBeNull(); expect(checkpoint?.catalogueDigest).toBe(value.checkpoint.catalogueDigest);
}
test('PUB-FINALIZE-ACCEPT: completed deployment job supplies confirmed time while current workflow remains in progress', finalizesMatchingPublication);

const receiptFaults = ['deployment-id', 'deployment-run', 'deployment-attempt', 'deployment-artifact', 'deployment-sha', 'deployment-environment', 'deployment-base', 'deployment-log', 'status-pending', 'status-failed', 'status-missing-time',
  'status-before-preparation', 'status-future', 'pages-incomplete', 'pages-artifact', 'pages-id', 'live-snapshot', 'live-digest', 'live-http', 'wrong-current-repository', 'wrong-current-branch', 'untrusted-current-workflow', 'untrusted-current-event', 'forged-upload-time'] as const;
/** Requires wrong/incomplete/untrusted confirmation to leave the prior served receipt intact.
 * @param fault One exact deployment/receipt/probe binding mismatch.
 * @returns Completion after actual rejection and old receipt/accepted/frozen-byte preservation.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only controlled proof responses, private current context or temporary live probe transport.
 */
async function rejectsReceipt(fault: typeof receiptFaults[number]): Promise<void> {
  const value = await fixture(); const checkpointBefore = await readFile(join(value.state, 'checkpoint.json')); const digestBefore = (await measureArtifact(value.artifact)).artifactDigest;
  switch (fault) {
    case 'deployment-id': value.deployment.id = 999; break; case 'deployment-run': value.status.log_url = `https://github.com/${repository}/actions/runs/99/job/301`; break;
    case 'deployment-attempt': value.runs['300'].run_attempt = 2; break; case 'deployment-artifact': value.artifacts['900'].workflow_run.id = 99; break;
    case 'deployment-sha': value.deployment.sha = revision; break; case 'deployment-environment': value.deployment.environment = 'untrusted-preview'; break;
    case 'deployment-base': value.status.environment_url = 'https://third-party.example/'; break; case 'deployment-log': value.status.log_url = `https://github.com/${repository}/actions/runs/99`; break;
    case 'status-pending': value.status.state = 'pending'; break; case 'status-failed': value.status.state = 'failure'; break;
    case 'status-missing-time': delete value.status.created_at; break; case 'status-before-preparation': value.status.created_at = iso(now - 3_600_001); break;
    case 'status-future': value.status.created_at = iso(now + 1); break; case 'pages-incomplete': value.pages.status = 'queued'; break;
    case 'pages-artifact': value.artifacts['900'].id = 999; break; case 'pages-id': value.artifacts['900'].workflow_run.head_sha = revision; break;
    case 'wrong-current-repository': value.runs['300'].repository.id = 999; break; case 'wrong-current-branch': value.runs['300'].head_branch = 'feature'; break;
    case 'untrusted-current-workflow': value.runs['300'].path = '.github/workflows/foreign.yml'; break; case 'untrusted-current-event': value.runs['300'].event = 'pull_request'; break;
    case 'forged-upload-time': delete value.status.created_at; value.pages.publishedAt = iso(now - 1000); value.pages.uploadedAt = iso(now - 1000); break;
    case 'live-snapshot': case 'live-digest': case 'live-http': value.options.transport = badProbe; break;
  }
  const observed = await observe(finalizePublication, value.options);
  expect({ rejected: observed.rejected, receipt: await readFile(join(value.state, 'served-publication.json')), checkpoint: await readFile(join(value.state, 'checkpoint.json')), frozen: (await measureArtifact(value.artifact)).artifactDigest }).toEqual({ rejected: true, receipt: value.oldServed, checkpoint: checkpointBefore, frozen: digestBefore });
  /** Supplies an independently wrong live body or failed retrieval, without changing frozen files.
   * @param input Actual requested URL.
   * @param init Native Fetch options.
   * @returns Wrong bounded served response only at the known live resource.
   * @throws On genuine underlying controlled transport errors.
   */
  async function badProbe(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin !== 'https://eaglecheow.github.io') return transport(value, input, init);
    if (fault === 'live-http') return new Response('controlled unavailable', { status: 503 });
    const changed = structuredClone(value.catalogue); if (fault === 'live-snapshot') changed.snapshotId = 'wrong-live-snapshot'; else changed.preparedAt = iso(now - 3_000_000);
    return Response.json(changed);
  }
}
test.each(receiptFaults)('PUB-FINALIZE-REJECT: %s cannot confirm publication', rejectsReceipt);

const unfinishedCases = [['success', 'skipped', 'not-attempted'], ['success', 'failure', 'failed'], ['failure', 'skipped', 'not-attempted'], ['cancelled', 'cancelled', 'not-attempted']] as const;
/** Requires always-run finish metadata even when no candidate/deployment proof exists.
 * @param candidateResult Actual candidate job conclusion.
 * @param deployResult Actual deployment job conclusion.
 * @param expected Expected honest deployment outcome.
 * @returns Completion after durable actual-job results and old receipt preservation.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Removes only controlled candidate metadata to prove skipped finish needs no invented proof.
 */
async function recordsUnfinished(candidateResult: string, deployResult: string, expected: string): Promise<void> {
  const value = await fixture(); value.options.candidateResult = candidateResult; value.options.deployResult = deployResult;
  await rm(join(value.work, 'candidate.json')); const observed = await observe(finalizePublication, value.options); const saved = await json(join(value.state, 'publication-runs/300-1.json'));
  expect({ recorded: saved?.deploymentOutcome, candidateResult: saved?.candidateResult, deployResult: saved?.deployResult,
    receipt: observed.result?.receipt, served: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ recorded: expected, candidateResult, deployResult, receipt: null, served: value.oldServed });
}
test.each(unfinishedCases)('PUB-OUTCOME: started finish records candidate=%s deployment=%s as %s without receipt', recordsUnfinished);

/** Requires newer accepted acquisition state to survive finalization of an older frozen candidate.
 * @returns Completion after old-candidate receipt and unchanged newer-checkpoint assertions.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Writes only a controlled later accepted checkpoint before finalization.
 */
async function preservesNewerAcquiredState(): Promise<void> {
  const value = await fixture(); const newer = structuredClone(value.checkpoint); newer.catalogue.snapshotId = 'newer-acquired-not-served';
  newer.catalogueDigest = hash(JSON.stringify(newer.catalogue)); await put(value.state, 'checkpoint.json', JSON.stringify(newer)); const before = await readFile(join(value.state, 'checkpoint.json'));
  const observed = await observe(finalizePublication, value.options);
  expect({ finalized: observed.result?.outcome, checkpoint: await readFile(join(value.state, 'checkpoint.json')), servedSnapshot: (await json(join(value.state, 'served-publication.json')))?.receipt?.snapshotId }).toEqual({ finalized: 'finalized', checkpoint: before, servedSnapshot: value.candidate.snapshotId });
}
test('PUB-ACQUIRED-VS-SERVED: older manual candidate receipt never relabels a newer acquired checkpoint', preservesNewerAcquiredState);

/** Requires preparation to use real acquisition then freeze a complete checked artifact before evidence collection.
 * @returns Completion after actual source calls, command invocations, frozen metadata and no publication assertions.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Logs native controlled preparation/acquisition journal times, which are separate from physical evidence and publication.
 */
async function preparesCompleteCandidate(): Promise<void> {
  const value = await fixture(); const observed = await observe(preparePublication, value.options);
  const metadata = await json(join(value.work, 'candidate.json')); const recorded = await json(join(value.state, 'publication-runs/300-1.json'));
  expect.soft(observed.result).toMatchObject({ outcome: 'awaiting-evidence', receipt: null });
  expect.soft({ acquired: value.calls.some(isOfficialSource), build: value.commands.includes('build'), checks: value.commands.includes('checks') }).toEqual({ acquired: true, build: true, checks: true });
  expect.soft(metadata).toMatchObject({ sourceRevision: laterRevision, priorServedBaselineDigest: value.candidate.priorServedBaselineDigest });
  expect.soft(recorded).toMatchObject({ acquisitionOutcome: 'success', stagingOutcome: 'success', deploymentOutcome: 'awaiting-evidence' });
  const measured = await measureArtifact(value.artifact); expect.soft(metadata?.artifactDigest).toBe(measured.artifactDigest);
  expect.soft(measured.snapshot?.publishedAt).toBeNull(); expect.soft(await readFile(join(value.state, 'served-publication.json'))).toEqual(value.oldServed);
  console.log(JSON.stringify({ evidenceType: 'controlled synthetic filesystem/transport enforcement', operation: 'new-preparation', observedAtUTC: new Date().toISOString(), candidate: metadata,
    measuredArtifactDigest: measured.artifactDigest, snapshotPreparedAt: measured.snapshot?.preparedAt, snapshotPublishedAt: measured.snapshot?.publishedAt,
    journal: recorded, acquisition: await json(join(value.state, 'receipts/300/refresh.json')), commands: value.commands, publicationPerformed: false,
    officialChangeAt: null, officialChangeToPublicationLatency: null }));
}
test('PUB-PREPARE: acquire/build/check once, freeze complete candidate, then end awaiting fresh physical evidence', preparesCompleteCandidate);

const preparationFaults = ['source-denial', 'source-schema', 'source-four-hour-cap', 'build-failed', 'automated-failed', 'size-failed', 'metadata-path-overlap', 'untrusted-current-run', 'foreign-state', 'expired-state-no-baseline', 'incompatible-state-no-baseline', 'foreign-partial-session'] as const;
/** Requires failed preparation to retain prior served state and record every started run honestly.
 * @param fault One real boundary failure injected into controlled source/commands/state.
 * @returns Completion after failure, prior receipt preservation and durable outcome assertions.
 * @throws On genuine isolated fixture setup/read errors.
 * @remarks Changes only controlled native-boundary effects and temporary metadata.
 */
async function failsPreparation(fault: typeof preparationFaults[number]): Promise<void> {
  const value = await fixture();
  if (fault === 'source-denial' || fault === 'source-schema') value.options.transport = brokenSource;
  if (fault === 'source-four-hour-cap') value.options.sleep = capClock;
  if (fault === 'build-failed' || fault === 'automated-failed') value.options.command = brokenCommand;
  if (fault === 'size-failed') value.options.command = oversizedBuild;
  if (fault === 'metadata-path-overlap') value.options.work = value.artifact;
  if (fault === 'untrusted-current-run') value.runs['300'].head_branch = 'feature';
  if (fault === 'foreign-state') { const changed = structuredClone(value.checkpoint); changed.repository = 'foreign/repository'; await put(value.state, 'checkpoint.json', JSON.stringify(changed)); }
  if (fault === 'expired-state-no-baseline' || fault === 'incompatible-state-no-baseline') { const changed = structuredClone(value.checkpoint); if (fault === 'expired-state-no-baseline') changed.createdAt = iso(now - 7 * 86_400_000 - 1); else changed.codeFingerprint = hash('incompatible current checkpoint'); await put(value.state, 'checkpoint.json', JSON.stringify(changed)); }
  if (fault === 'foreign-partial-session') await put(value.state, 'partial-checkpoint.json', JSON.stringify({ kind: 'partial', schemaVersion: 1, sessionId: 'foreign', repository: 'foreign/repository', branch: 'main', codeFingerprint: value.options.codeFingerprint, validationSuccess: true, complete: false, accepted: [], members: [], pendingIds: [] }));
  const observed = await observe(preparePublication, value.options); const recorded = await json(join(value.state, 'publication-runs/300-1.json'));
  expect({ rejected: observed.rejected, reported: recorded !== null, receipt: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, reported: true, receipt: value.oldServed });
  /** Supplies a source failure only at the official acquisition boundary.
   * @param input Actual native Fetch URL.
   * @param init Actual request options.
   * @returns Controlled access denial or malformed structured source.
   * @throws On genuine forwarding fixture errors.
   */
  async function brokenSource(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin !== 'https://hansard.parlimen.gov.my') return transport(value, input, init);
    return fault === 'source-denial' ? new Response('controlled denial', { status: 403 }) : Response.json({ pageProps: { invalid: true } });
  }
  /** Exceeds only this controlled source run's actual elapsed acquisition clock.
   * @param milliseconds Requested pacing interval.
   * @returns Completion after a bounded synthetic interruption.
   * @remarks Advances the fixture clock by four hours.
   */
  async function capClock(milliseconds: number): Promise<void> { value.elapsed += milliseconds + 14_400_000; }
  /** Exercises actual command rejection instead of returning a fake successful CLI result.
   * @param kind Requested build/check operation.
   * @param root Isolated checkout path.
   * @returns Completion only for a command outside the injected failure.
   * @throws Controlled build/check failure at its real command boundary.
   */
  async function brokenCommand(kind: 'build' | 'checks', root: string): Promise<void> {
    if ((fault === 'build-failed' && kind === 'build') || (fault === 'automated-failed' && kind === 'checks')) throw new Error('Controlled command failure');
    return command(value, kind, root);
  }
  /** Produces a real one-byte-over sparse build file without allocating a giant fixture string.
   * @param kind Actual controlled command requested by preparation.
   * @param root Actual isolated command working directory.
   * @returns Completion after native controlled build/check behavior and size injection.
   * @throws On genuine fixture command or sparse-file write errors.
   * @remarks Changes only the newly built temporary artifact's actual stored byte length.
   */
  async function oversizedBuild(kind: 'build' | 'checks', root: string): Promise<void> { await command(value, kind, root); if (kind === 'build') await truncate(join(root, 'dist/assets/app.js'), 900_000_001); }
}
test.each(preparationFaults)('PUB-PREPARE-FAIL: %s records failure and preserves prior served state', failsPreparation);

/** Constructs a matching current-snapshot receipt solely for controlled boundary tests.
 * @param value Real temporary accepted candidate.
 * @returns Synthetic confirmation fields with preparation/publication/verification separated.
 */
function receipt(value: Fixture): DeploymentReceipt { return { snapshotId: value.candidate.snapshotId, deploymentId: '700', publishedAt: iso(now - 1_800_000), verifiedServedAt: iso(now), workflowUrl: `https://github.com/${repository}/actions/runs/300` }; }
/** Builds current-code acquisition options around real temporary accepted data.
 * @param value Controlled publication fixture.
 * @returns Concrete existing acquisition boundary options with native stored bytes.
 */
function acquisitionOptions(value: Fixture): AcquisitionOptions { return { state: value.state, out: join(value.root, 'public/data'), repository, branch: 'main', codeFingerprint: value.options.codeFingerprint,
  mode: 'refresh', workflowContext: true, runId: '300', sessionId: '300', workflowUrl: `https://github.com/${repository}/actions/runs/300`, now: value.options.now, transport: value.options.transport, sleep: value.options.sleep }; }

/** Requires external receipt finalization without replacing the original catalogue/checksum.
 * @returns Completion after unchanged accepted source bytes and separately stored served confirmation.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function acceptsCheckpointReceipt(): Promise<void> {
  const value = await fixture(); const binding = { receipt: receipt(value), artifactDigest: value.candidate.artifactDigest, catalogueDigest: value.checkpoint.catalogueDigest };
  const result = await finalizeAcquiredCheckpoint(value.checkpoint, binding, acquisitionOptions(value)) as Json | undefined;
  expect(result).toMatchObject({ catalogue: value.catalogue, catalogueDigest: value.checkpoint.catalogueDigest, servedPublication: binding });
  expect(result?.catalogue.publishedAt).toBeNull();
}
test('PUB-CHECKPOINT-ACCEPT: receipt lives outside immutable original catalogue and checksum', acceptsCheckpointReceipt);

const checkpointFaults = ['snapshot', 'catalogue-digest', 'artifact-digest', 'receipt-time', 'verification-time', 'workflow-url', 'local-state', 'schema', 'checksum', 'missing-shard', 'unreferenced-shard'] as const;
/** Requires invalid external receipts or accepted bytes to reject before checkpoint mutation.
 * @param fault One receipt/checksum/origin/reference contradiction.
 * @returns Completion after observable rejection and exact accepted-file preservation.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Alters only the controlled proposed checkpoint/binding or its temporary shard file.
 */
async function rejectsCheckpointReceipt(fault: typeof checkpointFaults[number]): Promise<void> {
  const value = await fixture(); const input = structuredClone(value.checkpoint); const binding: Json = { receipt: receipt(value), artifactDigest: value.candidate.artifactDigest, catalogueDigest: input.catalogueDigest };
  switch (fault) {
    case 'snapshot': binding.receipt.snapshotId = 'wrong'; break; case 'catalogue-digest': binding.catalogueDigest = 'f'.repeat(64); break;
    case 'artifact-digest': binding.artifactDigest = 'malformed'; break; case 'receipt-time': binding.receipt.publishedAt = iso(now - 3_600_001); break;
    case 'verification-time': binding.receipt.verifiedServedAt = iso(now - 2_000_000); break; case 'workflow-url': binding.receipt.workflowUrl = 'https://third-party.example/'; break;
    case 'local-state': input.originKind = 'local-development'; break; case 'schema': input.schemaVersion = 2; break; case 'checksum': input.catalogueDigest = 'f'.repeat(64); break;
    case 'missing-shard': await rm(join(value.state, 'snapshots/controlled/sittings/1.json.gz')); break; case 'unreferenced-shard': input.shardDigests['999'] = 'a'.repeat(64); break;
  }
  const before = await readFile(join(value.state, 'checkpoint.json')); let rejected = false;
  try { await finalizeAcquiredCheckpoint(input, binding, acquisitionOptions(value)); } catch { rejected = true; }
  expect({ rejected, checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ rejected: true, checkpoint: before });
}
test.each(checkpointFaults)('PUB-CHECKPOINT-REJECT: %s cannot relabel acquired data as served', rejectsCheckpointReceipt);

/** Requires authentic historical code to remain recorded while current validators recover compatible served bytes.
 * @returns Completion after historical fingerprint, exact baseline hashes and current-code separation assertions.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function recoversAuthenticHistoricalCode(): Promise<void> {
  const value = await fixture(); const oldFingerprint = hash('Synthetic independently authenticated historical acquisition code');
  const origin = await historicalOrigin(value);
  const proof = { repository, branch: 'main', runId: historicalRun, success: true, codeFingerprint: oldFingerprint, receipt: historicalReceipt(value),
    catalogueDigest: value.checkpoint.catalogueDigest, shardDigests: value.checkpoint.shardDigests, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/' };
  const recovered = await validateHistoricalServedBaseline(proof, origin, acquisitionOptions(value));
  expect(recovered).toMatchObject({ codeFingerprint: oldFingerprint, catalogueDigest: value.checkpoint.catalogueDigest, receipt: proof.receipt });
  expect(recovered?.codeFingerprint).not.toBe(value.options.codeFingerprint);
}
test('PUB-BASELINE-HISTORICAL: independently authenticated old code fingerprint stays honest during compatible current-code recovery', recoversAuthenticHistoricalCode);

const baselineFaults = ['no-authentication', 'self-trusted', 'substituted-fingerprint', 'wrong-repository', 'wrong-branch', 'wrong-run', 'wrong-base', 'wrong-snapshot', 'wrong-catalogue-digest', 'wrong-shard-digest', 'missing-shard-reference', 'unreferenced-shard', 'unsupported-schema', 'unrecoverable-http'] as const;
/** Requires unauthenticated substitution or incompatible served bytes to block historical recovery.
 * @param fault One independently controlled trust/resource contradiction.
 * @returns Completion after observable failed recovery without accepted/served mutation.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only proposed untrusted proof/context or controlled retrieval responses.
 */
async function rejectsHistoricalBaseline(fault: typeof baselineFaults[number]): Promise<void> {
  const value = await fixture(); const oldFingerprint = hash('Synthetic independently authenticated historical acquisition code');
  let origin: unknown = await historicalOrigin(value);
  const proof: Json = { repository, branch: 'main', runId: historicalRun, success: true, codeFingerprint: oldFingerprint, receipt: historicalReceipt(value), catalogueDigest: value.checkpoint.catalogueDigest,
    shardDigests: { ...value.checkpoint.shardDigests }, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/' };
  switch (fault) {
    case 'no-authentication': origin = null; break; case 'self-trusted': origin = { ...proof, trusted: true }; break; case 'substituted-fingerprint': proof.codeFingerprint = value.options.codeFingerprint; break;
    case 'wrong-repository': proof.repository = 'foreign/repository'; break; case 'wrong-branch': proof.branch = 'feature'; break; case 'wrong-run': proof.runId = '99'; break;
    case 'wrong-base': proof.baseUrl = 'https://third-party.example/'; break; case 'wrong-snapshot': proof.receipt.snapshotId = 'wrong'; break;
    case 'wrong-catalogue-digest': proof.catalogueDigest = 'f'.repeat(64); break; case 'wrong-shard-digest': proof.shardDigests['1'] = 'f'.repeat(64); break;
    case 'missing-shard-reference': delete proof.shardDigests['1']; break; case 'unreferenced-shard': proof.shardDigests['999'] = 'f'.repeat(64); break;
    case 'unsupported-schema': case 'unrecoverable-http': value.options.transport = brokenServed; break;
  }
  const before = await readFile(join(value.state, 'checkpoint.json')); let rejected = false;
  try { await validateHistoricalServedBaseline(proof, origin, acquisitionOptions(value)); } catch { rejected = true; }
  expect({ rejected, checkpoint: await readFile(join(value.state, 'checkpoint.json')), served: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, checkpoint: before, served: value.oldServed });
  /** Returns incompatible historical schema or an actual failed served retrieval.
   * @param input Actual fixed served/GitHub URL.
   * @param init Actual Fetch options.
   * @returns Controlled invalid body only for known served resource requests.
   * @throws On genuine forwarded fixture transport errors.
   */
  async function brokenServed(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); if (url.origin !== 'https://eaglecheow.github.io') return transport(value, input, init);
    if (fault === 'unrecoverable-http') return new Response('unrecoverable controlled served resource', { status: 503 });
    return Response.json({ ...value.catalogue, schemaVersion: 2 });
  }
}
test.each(baselineFaults)('PUB-BASELINE-REJECT: %s never relaxes exact checkpoint or authenticated historical trust', rejectsHistoricalBaseline);

/** Supplies historical metadata through the same independently API-authenticated artifact seam.
 * @param value Real temporary fixture with separately controlled GitHub API origin.
 * @returns Verified historical origin, preserving its original fingerprint without caller mutation.
 * @throws On genuine temporary metadata write or implemented authentication errors.
 * @remarks Writes only controlled historical artifact metadata before authentication, never mutates a validated proof.
 */
async function historicalOrigin(value: Fixture): Promise<PublicationOrigin> {
  value.runs[historicalRun] = run(historicalRun, revision);
  value.artifacts[historicalArtifact] = artifact(historicalArtifact, historicalRun, 'hansard-served', revision);
  value.artifacts[historicalArtifact].created_at = iso(now - 900_000);
  const metadata = { repository, branch: 'main', runId: historicalRun, runAttempt: 1, acquisitionRunId: '101', sourceRevision: revision, codeFingerprint: hash('Synthetic independently authenticated historical acquisition code') };
  await put(value.work, 'served-origin.json', JSON.stringify(metadata)); await put(value.work, 'origin.json', JSON.stringify(metadata));
  return verifyPublicationOrigin({ runId: historicalRun, artifactId: historicalArtifact, name: 'hansard-served', sourceRevision: revision }, value.options);
}

/** Separates historical served confirmation from its earlier source acquisition and current workflow.
 * @param value Original run101 acquired snapshot, prepared at03:00UTC.
 * @returns Publication run299 receipt at03:30 verified03:31, before served artifact creation03:45.
 */
function historicalReceipt(value: Fixture): DeploymentReceipt { return { ...receipt(value), deploymentId: '699', verifiedServedAt: iso(now - 1_740_000), workflowUrl: `https://github.com/${repository}/actions/runs/${historicalRun}` }; }

const originReuseFaults = ['json-clone', 'codeFingerprint', 'runId', 'artifactId'] as const;
/** Requires API authorization to resist JSON rehydration and mutable claim substitution.
 * @param fault Attempted clone or scalar mutation of authenticated provenance.
 * @returns Completion after denied reuse without changing accepted source state.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function deniesReusedOrigin(fault: typeof originReuseFaults[number]): Promise<void> {
  const value = await fixture(); const origin = await historicalOrigin(value); let proposed: unknown = origin; let immutable = false;
  if (fault === 'json-clone') proposed = origin ? JSON.parse(JSON.stringify(origin)) : { trusted: true };
  else if (origin) { try { (origin as unknown as Json)[fault] = 'substituted-claim'; } catch { immutable = true; } }
  const proof = { repository, branch: 'main', runId: historicalRun, success: true, codeFingerprint: hash('Synthetic independently authenticated historical acquisition code'), receipt: historicalReceipt(value),
    catalogueDigest: value.checkpoint.catalogueDigest, shardDigests: value.checkpoint.shardDigests, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/' };
  let rejected = false; try { await validateHistoricalServedBaseline(proof, proposed, acquisitionOptions(value)); } catch { rejected = true; }
  expect(immutable || rejected).toBe(true);
}
test.each(originReuseFaults)('PUB-PROOF-REUSE: %s cannot preserve authenticated authorization for new claims', deniesReusedOrigin);

/** Requires accepted-checkpoint reload to expose confirmed receipt separately from unchanged source data.
 * @returns Completion after unchanged original catalogue/checksum and independent confirmed receipt assertions.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function readsConfirmedCheckpoint(): Promise<void> {
  const value = await fixture(); const input = { ...value.checkpoint, servedPublication: { receipt: receipt(value), artifactDigest: value.candidate.artifactDigest, catalogueDigest: value.checkpoint.catalogueDigest } };
  const accepted = await readPublicationCheckpoint(input, acquisitionOptions(value));
  expect(accepted).toMatchObject({ catalogue: value.catalogue, confirmedDeployment: receipt(value) });
  expect(accepted?.catalogue?.publishedAt).toBeNull(); expect(value.checkpoint.catalogueDigest).toBe(hash(JSON.stringify(accepted?.catalogue)));
}
test('PUB-CHECKPOINT-READ: trusted external served receipt survives reload without relabeling original catalogue publication time', readsConfirmedCheckpoint);

const readbackFaults = ['snapshot', 'catalogue-digest', 'artifact-digest', 'publication-time', 'verified-time', 'local-context'] as const;
/** Requires persisted invalid served metadata to reject on reload, not merely during initial finalization.
 * @param fault One external persisted-binding mismatch.
 * @returns Completion after observable rejection with original source checkpoint untouched.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only the proposed readback object/context.
 */
async function rejectsCheckpointReadback(fault: typeof readbackFaults[number]): Promise<void> {
  const value = await fixture(); const input: Json = { ...value.checkpoint, servedPublication: { receipt: receipt(value), artifactDigest: value.candidate.artifactDigest, catalogueDigest: value.checkpoint.catalogueDigest } };
  const options = acquisitionOptions(value);
  if (fault === 'snapshot') input.servedPublication.receipt.snapshotId = 'different';
  if (fault === 'catalogue-digest') input.servedPublication.catalogueDigest = 'f'.repeat(64);
  if (fault === 'artifact-digest') input.servedPublication.artifactDigest = 'malformed';
  if (fault === 'publication-time') input.servedPublication.receipt.publishedAt = iso(now - 3_600_001);
  if (fault === 'verified-time') input.servedPublication.receipt.verifiedServedAt = iso(now - 2_000_000);
  if (fault === 'local-context') { input.originKind = 'local-development'; input.publicationEligible = false; options.workflowContext = false; options.branch = 'main'; }
  let rejected = false; try { await readPublicationCheckpoint(input, options); } catch { rejected = true; }
  expect(rejected).toBe(true);
}
test.each(readbackFaults)('PUB-CHECKPOINT-READ-REJECT: %s cannot survive restoration as served metadata', rejectsCheckpointReadback);

const testOriginFaults = ['missing', 'http', 'wrong-subpath', 'device-url', 'missing-device-url', 'candidate-mismatch', 'unavailable-origin'] as const;
/** Requires physical reports and their serving origin to match independently reviewed HTTPS/subpath context.
 * @param fault One missing/untrusted host or wrong tested candidate.
 * @returns Completion after blocked promotion and no production-Pages-before-first-publication assertion.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only controlled expected host/report/probe boundaries.
 */
async function blocksUntrustedTestOrigin(fault: typeof testOriginFaults[number]): Promise<void> {
  const value = await fixture();
  if (fault === 'missing') delete value.options.testOrigin;
  if (fault === 'http') value.options.testOrigin = testOrigin.replace('https:', 'http:');
  if (fault === 'wrong-subpath') value.options.testOrigin = 'https://controlled-preview.example/';
  if (fault === 'device-url') value.performance.devices[0].url = 'https://third-party.example/vote-better-malaysia/';
  if (fault === 'missing-device-url') delete value.performance.devices[0].url;
  if (fault === 'candidate-mismatch' || fault === 'unavailable-origin') value.options.transport = wrongPreview;
  await save(value); const observed = await observe(promotePublication, promotionOptions(value)); expect(observed.rejected || observed.result?.outcome === 'awaiting-evidence').toBe(true);
  /** Supplies a wrong or unavailable test-origin candidate without changing the measured frozen bytes.
   * @param input Actual native URL.
   * @param init Native request options.
   * @returns Controlled preview failure or forwarded official API response.
   * @throws On genuine forwarding fixture errors.
   */
  async function wrongPreview(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); if (url.origin !== 'https://controlled-preview.example') return transport(value, input, init);
    if (fault === 'unavailable-origin') return new Response('controlled preview unavailable', { status: 503 });
    return Response.json({ ...value.catalogue, snapshotId: 'another-tested-candidate' });
  }
}
test.each(testOriginFaults)('PUB-TEST-ORIGIN: %s cannot establish prepublication physical evidence', blocksUntrustedTestOrigin);

/** Requires first publication readiness without a circular requirement for an already-live production Pages snapshot.
 * @returns Completion after exact prepublication readiness despite production data resource absence.
 * @throws On genuine temporary setup/read errors.
 * @remarks Removes only controlled prior-publication metadata and injects the honest first-publication HTTP absence.
 */
async function allowsFirstPublication(): Promise<void> {
  const value = await fixture(); value.candidate.priorServedBaselineDigest = null; value.options.transport = firstSite;
  delete value.options.servedRunId; delete value.options.servedArtifactId;
  value.performance = performance(value); value.documentation.candidate = structuredClone(value.candidate); value.automated.candidate = value.candidate; value.source.candidate = value.candidate;
  await save(value); await rm(join(value.state, 'served-publication.json'));
  const observed = await observe(promotePublication, promotionOptions(value)); expect(observed.result?.outcome).toBe('ready');
  /** Reports actual production-source absence only at the controlled first-publication boundary.
   * @param input Requested native URL.
   * @param init Native Fetch options.
   * @returns Honest first-site absence or the valid separate test-origin/API response.
   * @throws On genuine forwarded fixture errors.
   */
  async function firstSite(input: string | URL | Request, init?: RequestInit): Promise<Response> { const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); return url.origin === 'https://eaglecheow.github.io' ? new Response('no previously served candidate', { status: 404 }) : transport(value, input, init); }
}
test('PUB-FIRST-PUBLISH: prepublication checks use trusted test origin and do not require nonexistent production live result', allowsFirstPublication);

/** Produces authentic capped progress through the existing real acquisition API for controller restoration assertions.
 * @param value Isolated already accepted fixture.
 * @returns Actual partial session and native stored completed bytes.
 * @throws On genuine acquisition setup errors or failure to produce its expected cap checkpoint.
 * @remarks Performs only controlled transport/native filesystem acquisition in this temporary state.
 */
async function interruptedState(value: Fixture): Promise<Json> {
  const options = acquisitionOptions(value); options.runId = '100'; options.sessionId = 'partial-session-100'; options.workflowUrl = `https://github.com/${repository}/actions/runs/100`; options.sleep = capped;
  let cappedRun = false; try { await acquire(options); } catch (error) { cappedRun = String(error).toLowerCase().includes('four-hour'); }
  const partial = await json(join(value.state, 'partial-checkpoint.json'));
  expect({ cappedRun, accepted: partial?.accepted?.length }).toEqual({ cappedRun: true, accepted: 1 });
  await cp(value.state, join(value.work, 'resume-state'), { recursive: true }); await rm(join(value.state, 'partial-checkpoint.json')); await rm(join(value.state, 'partial'), { recursive: true, force: true });
  const capAt = currentTime(value);
  value.runs['100'] = { ...run('100', laterRevision), created_at: iso(now), run_started_at: iso(now), updated_at: iso(capAt + 2000), conclusion: 'failure' }; value.artifacts['801'] = artifact('801', '100', 'hansard-partial', laterRevision);
  value.artifacts['801'].created_at = iso(capAt + 1000); value.artifacts['801'].expires_at = iso(capAt + 6 * 86_400_000); value.elapsed += 3000;
  value.runs['300'].created_at = iso(currentTime(value)); value.runs['300'].run_started_at = iso(currentTime(value)); value.runs['300'].updated_at = iso(currentTime(value));
  value.options.resumeRunId = '100'; value.options.resumeArtifactId = '801'; value.calls.length = 0;
  return partial!;
  /** Lets one real controlled sitting finish before exceeding the four-hour cap on its next request.
   * @param milliseconds Acquisition-request pacing duration.
   * @returns Completion after controlled elapsed clock advances.
   * @remarks Advances only this fixture clock after its first actual sitting request.
   */
  async function capped(milliseconds: number): Promise<void> { let recordSeen = false; for (const url of value.calls) if (url.includes('/hansard/dewan-rakyat/') && url.includes('?date=')) recordSeen = true; value.elapsed += recordSeen ? 14_400_000 : milliseconds; }
}

/** Requires explicit authenticated partial restoration to retain the original session and skip accepted work.
 * @returns Completion after current-run/original-session separation and exact accepted completion-time assertions.
 * @throws On genuine controlled native acquisition or fixture read errors.
 */
async function resumesExplicitPartial(): Promise<void> {
  const value = await fixture(); const partial = await interruptedState(value); const completed = partial.accepted[0];
  const observed = await observe(preparePublication, value.options);
  const progress = await json(join(value.state, 'receipts', partial.sessionId, 'refresh.json'));
  expect.soft(observed.result?.outcome).toBe('awaiting-evidence'); expect.soft(progress).toMatchObject({ sessionId: partial.sessionId, completedIds: expect.arrayContaining([completed.id]), pendingIds: [], acquisitionOutcome: 'success' });
  const recorded = await json(join(value.state, 'publication-runs/300-1.json')); expect.soft(recorded).toMatchObject({ runId: '300', resumeSessionId: partial.sessionId });
  expect.soft(value.calls.some(completedRequested)).toBe(false);
  /** Identifies an erroneous second request for the already validated completed sitting.
   * @param url Recorded source request URL.
   * @returns Whether it attempts the original completed sitting's source route.
   */
  function completedRequested(url: string): boolean { return url.includes('/hansard/dewan-rakyat/' + completed.date + '.json?'); }
}
test('PUB-RESUME: explicit API-verified capped partial adopts original session while current run remains independently recorded', resumesExplicitPartial);

const partialFaults = ['foreign-run', 'pr-origin', 'wrong-session', 'wrong-code', 'expired', 'baseline-mismatch', 'missing-payload', 'payload-digest'] as const;
/** Requires corrupted/foreign/expired partial progress to block rather than masquerade as complete trusted state.
 * @param fault One actual private progress or API-origin contradiction.
 * @returns Completion after observable controller rejection and original accepted-checkpoint preservation.
 * @throws On genuine controlled acquisition/setup/read errors.
 * @remarks Alters only the selected temporary partial recovery artifact after creating real accepted progress.
 */
async function rejectsPartialRestore(fault: typeof partialFaults[number]): Promise<void> {
  const value = await fixture(); const partial = await interruptedState(value); const root = join(value.work, 'resume-state'); const before = await readFile(join(value.state, 'checkpoint.json'));
  if (fault === 'foreign-run') value.artifacts['801'].workflow_run.id = 99;
  if (fault === 'pr-origin') value.runs['100'].event = 'pull_request';
  if (fault === 'wrong-session') partial.sessionId = 'foreign';
  if (fault === 'wrong-code') partial.codeFingerprint = hash('foreign source inputs');
  if (fault === 'expired') partial.createdAt = iso(currentTime(value) - 7 * 86_400_000 - 1);
  if (fault === 'baseline-mismatch') { const baseline = JSON.parse(await readFile(join(root, 'checkpoint.json'), 'utf8')); baseline.catalogueDigest = 'f'.repeat(64); await put(root, 'checkpoint.json', JSON.stringify(baseline)); }
  if (fault === 'missing-payload') await rm(join(root, 'partial/sittings/' + partial.accepted[0].id + '.json.gz'));
  if (fault === 'payload-digest') partial.shardDigests[partial.accepted[0].id] = 'f'.repeat(64);
  await put(root, 'partial-checkpoint.json', JSON.stringify(partial)); const observed = await observe(preparePublication, value.options);
  expect({ rejected: observed.rejected, checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ rejected: true, checkpoint: before });
}
test.each(partialFaults)('PUB-RESUME-REJECT: %s cannot restore partial progress as a complete/served baseline', rejectsPartialRestore);

const cliFaults = ['unknown', 'prepare-local', 'promote-missing-ids', 'finalize-invalid-job-result'] as const;
/** Requires the real CLI parser to fail closed without a fake successful callback or network access.
 * @param fault Unsupported operation or missing executing/publication context.
 * @returns Completion after observed native child exit rejection.
 * @throws On genuine temporary fixture setup errors.
 */
async function rejectsCli(fault: typeof cliFaults[number]): Promise<void> {
  const value = await fixture(); const script = new URL('../../scripts/publication.ts', import.meta.url).pathname;
  const operation = fault === 'unknown' ? 'unknown' : fault === 'prepare-local' ? 'prepare' : fault === 'promote-missing-ids' ? 'promote' : 'finalize';
  const environment = { ...process.env, GITHUB_ACTIONS: 'false', GITHUB_TOKEN: '', GH_TOKEN: '', GITHUB_REPOSITORY: repository, GITHUB_REF_NAME: 'feature', HANSARD_DEPLOY_RESULT: 'fictional-success' };
  const child = spawnSync(process.execPath, [script, operation], { cwd: value.root, env: environment, encoding: 'utf8', timeout: 5000 });
  expect({ status: child.status, timeout: child.error?.message ?? null }).toEqual({ status: 1, timeout: null });
}
test.each(cliFaults)('PUB-CLI-REJECT: %s cannot silently succeed outside reviewed workflow context', rejectsCli);

const archiveFaults = ['path-traversal', 'absolute-path', 'symlink', 'hardlink', 'untrusted-origin'] as const;
/** Requires archive authentication and safe regular-path restoration before final privileged promotion.
 * @param fault One concrete malicious tar entry or unauthenticated producing artifact.
 * @returns Completion after observed rejection and outside/private baseline preservation.
 * @throws On genuine native temporary tar creation or filesystem errors.
 * @remarks Writes a temporary archive only; the inert/implemented controller owns any extraction attempt.
 */
async function rejectsUnsafeArchive(fault: typeof archiveFaults[number]): Promise<void> {
  const value = await fixture(); const outside = join(value.root, 'outside.txt'); await writeFile(outside, 'Original outside marker');
  const archive = join(value.work, 'artifact.tar');
  if (fault === 'absolute-path') execFileSync('tar', ['-P', '-cf', archive, outside]);
  else if (fault === 'path-traversal') execFileSync('tar', ['-cf', archive, '-C', value.work, '../outside.txt']);
  else if (fault === 'symlink') { execFileSync('ln', ['-s', outside, join(value.work, 'unsafe-link')]); execFileSync('tar', ['-cf', archive, '-C', value.work, 'unsafe-link']); }
  else if (fault === 'hardlink') { execFileSync('ln', [outside, join(value.work, 'unsafe-hardlink')]); execFileSync('tar', ['-cf', archive, '-C', value.root, 'outside.txt', 'publication/unsafe-hardlink']); }
  else { execFileSync('tar', ['-cf', archive, '-C', value.artifact, '.']); value.runs['101'].event = 'pull_request'; }
  await rm(value.artifact, { recursive: true }); const observed = await observe(promotePublication, promotionOptions(value));
  expect({ rejected: observed.rejected, outside: await readFile(outside, 'utf8'), served: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, outside: 'Original outside marker', served: value.oldServed });
}
test.each(archiveFaults)('PUB-ARCHIVE-REJECT: %s cannot be extracted before authenticated safe-path verification', rejectsUnsafeArchive);

/** Requires fresh postapproval revalidation to reject a baseline changed after earlier eligibility.
 * @returns Completion after a second independent promotion check blocks superseded accepted evidence.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only this controlled currently served metadata between two actual controller calls.
 */
async function rejectsAfterApprovalDelay(): Promise<void> {
  const value = await fixture(); const first = await observe(promotePublication, promotionOptions(value));
  expect.soft(first.result?.outcome).toBe('ready'); await put(value.state, 'served-publication.json', JSON.stringify({ artifactDigest: hash('Superseding served site during approval') }));
  const second = await observe(promotePublication, promotionOptions(value)); expect.soft(second.rejected || second.result?.outcome === 'awaiting-evidence').toBe(true);
  expect.soft(value.commands).toEqual([]);
}
test('PUB-APPROVAL-RECHECK: environment approval delay cannot bypass current baseline/application/evidence revalidation', rejectsAfterApprovalDelay);

/** Confirms capped controller-restoration input was genuinely produced by already-green acquisition behavior.
 * @returns Completion after native copied checkpoint and source-hash/progress controls.
 * @throws On genuine controlled fixture/acquisition/read errors.
 */
async function validatesPartialHarness(): Promise<void> {
  const value = await fixture(); const partial = await interruptedState(value); const root = join(value.work, 'resume-state');
  expect(partial.sessionId).toBe('partial-session-100'); const sitting = partial.accepted[0];
  const bytes = await readFile(join(root, 'partial/sittings/' + sitting.id + '.json.gz'));
  expect(hash(bytes)).toBe(partial.shardDigests[sitting.id]); expect(hash(gunzipSync(bytes))).toBe(sitting.record.digest);
  expect(await readFile(join(root, 'checkpoint.json'))).toEqual(await readFile(join(value.state, 'checkpoint.json')));
  expect(Date.parse(partial.createdAt) < Date.parse(value.artifacts['801'].created_at)).toBe(true);
  expect(Date.parse(value.artifacts['801'].created_at) <= Date.parse(value.runs['100'].updated_at)).toBe(true);
  expect(Date.parse(value.runs['100'].updated_at) <= currentTime(value)).toBe(true);
}
test('PUB-HARNESS-PARTIAL: selected partial input is native capped accepted work (positive setup control, not RED)', validatesPartialHarness);

/** Requires safe exact archive restoration after API authentication on a fresh runner.
 * @returns Completion after eligibility and canonical every-file equality for genuinely restored bytes.
 * @throws On native isolated tar/fixture errors.
 * @remarks Creates only a temporary Linux-compatible tar and removes its extracted directory before controller execution.
 */
async function restoresExactArchive(): Promise<void> {
  const value = await fixture(); execFileSync('tar', ['-cf', join(value.work, 'artifact.tar'), '-C', value.artifact, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  await rm(value.artifact, { recursive: true }); const observed = await observe(promotePublication, promotionOptions(value));
  expect.soft(observed.result?.outcome).toBe('ready'); const restored = await regularFile(join(value.artifact, 'data/catalogue.json.gz'));
  expect.soft(restored).toBe(true); if (restored) expect.soft((await measureArtifact(value.artifact)).artifactDigest).toBe(value.candidate.artifactDigest);
  expect.soft(value.commands).toEqual([]);
}
test('PUB-ARCHIVE-RESTORE: fresh authenticated runner restores original tar without rebuilding or changing any deployed file', restoresExactArchive);

/** Supplies a real selected successful-state artifact context for controller import tests.
 * @param value Coherent temporary accepted checkpoint and API response map.
 * @returns Completion after selected origin/immutable-artifact references are present.
 * @throws On genuine temporary metadata write errors.
 * @remarks Adds controlled API metadata and writes only the imported state's origin record.
 */
async function selectedState(value: Fixture): Promise<void> {
  value.options.stateRunId = '101'; value.options.stateArtifactId = '701'; value.artifacts['701'] = artifact('701', '101', 'hansard-state', revision);
  await put(value.state, 'origin.json', JSON.stringify({ repository, branch: 'main', sourceRevision: revision, runId: '101', runAttempt: 1, codeFingerprint: value.options.codeFingerprint }));
}
/** Requires selected complete state to be authenticated before actual incremental acquisition.
 * @returns Completion after authenticated state lookup, real acquire and explicit baseline report assertions.
 * @throws On genuine temporary fixture setup/read errors.
 */
async function importsSelectedCompleteState(): Promise<void> {
  const value = await fixture(); await selectedState(value); const observed = await observe(preparePublication, value.options);
  const progress = await json(join(value.state, 'receipts/300/refresh.json'));
  expect.soft(observed.result?.outcome).toBe('awaiting-evidence'); expect.soft(value.calls).toContain(`https://api.github.com/repos/${repository}/actions/artifacts/701`);
  expect.soft(progress).toMatchObject({ baseline: 'checkpoint', strategy: 'incremental' });
}
test('PUB-STATE-IMPORT: exact newest selected successful artifact is authenticated before acquire uses it', importsSelectedCompleteState);

const stateOriginFaults = ['foreign-artifact', 'failed-run', 'pr-run', 'wrong-branch', 'expired', 'malformed-latest-no-skip'] as const;
/** Requires foreign/malformed selected latest state to reject instead of silently accepting older data.
 * @param fault One API-origin or selected checkpoint contradiction.
 * @returns Completion after observable controller rejection and old served receipt preservation.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Mutates only controlled selected-state metadata.
 */
async function rejectsSelectedState(fault: typeof stateOriginFaults[number]): Promise<void> {
  const value = await fixture(); await selectedState(value);
  if (fault === 'foreign-artifact') value.artifacts['701'].workflow_run.repository_id = 999;
  if (fault === 'failed-run') value.runs['101'].conclusion = 'failure';
  if (fault === 'pr-run') value.runs['101'].event = 'pull_request';
  if (fault === 'wrong-branch') value.runs['101'].head_branch = 'feature';
  if (fault === 'expired') value.artifacts['701'].expired = true;
  if (fault === 'malformed-latest-no-skip') await put(value.state, 'checkpoint.json', '{}');
  const observed = await observe(preparePublication, value.options);
  expect({ rejected: observed.rejected, served: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, served: value.oldServed });
}
test.each(stateOriginFaults)('PUB-STATE-IMPORT-REJECT: %s cannot certify a successful retention baseline', rejectsSelectedState);

/** Requires missing/expired/incompatible complete state to recover through separately authenticated genuinely historical served proof.
 * @param defect Why the selected complete checkpoint cannot be reused.
 * @returns Completion after authenticated served baseline acquisition, retained metadata truth and no invented publication.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only temporary checkpoint usability and controlled historical served metadata.
 */
async function recoversControllerServedState(defect: string): Promise<void> {
  const value = await fixture(); await historicalOrigin(value); value.options.servedRunId = historicalRun; value.options.servedArtifactId = historicalArtifact;
  await put(value.state, 'served-publication.json', JSON.stringify({ repository, branch: 'main', runId: historicalRun, runAttempt: 1, acquisitionRunId: '101', sourceRevision: revision,
    codeFingerprint: hash('Synthetic independently authenticated historical acquisition code'), receipt: historicalReceipt(value), catalogueDigest: value.checkpoint.catalogueDigest,
    shardDigests: value.checkpoint.shardDigests, artifactDigest: value.candidate.artifactDigest, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/' }));
  if (defect === 'missing') await rm(join(value.state, 'checkpoint.json'));
  else { const invalid = structuredClone(value.checkpoint); if (defect === 'expired') invalid.createdAt = iso(now - 7 * 86_400_000 - 1); else invalid.codeFingerprint = hash('Different accepted-code inputs'); await put(value.state, 'checkpoint.json', JSON.stringify(invalid)); }
  const observed = await observe(preparePublication, value.options); const progress = await json(join(value.state, 'receipts/300/refresh.json'));
  expect.soft(observed.result?.outcome).toBe('awaiting-evidence'); expect.soft(progress).toMatchObject({ baseline: 'served', strategy: 'incremental' });
  const stored = await json(join(value.state, 'served-publication.json')); expect.soft(stored?.codeFingerprint).toBe(hash('Synthetic independently authenticated historical acquisition code'));
}
test.each(['missing', 'expired', 'incompatible'])('PUB-STATE-SERVED-RECOVERY: %s checkpoint uses authenticated historical served compatibility', recoversControllerServedState);

/** Requires an externally finalized receipt to enter only the next prepared snapshot's known-history status.
 * @returns Completion after next snapshot's independent null publication time and dated previous deployment.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Adds only a coherent already-confirmed external current-checkpoint binding.
 */
async function carriesReceiptIntoNextCandidate(): Promise<void> {
  const value = await fixture(); const previousReceipt = historicalReceipt(value); const checkpoint = { ...value.checkpoint, servedPublication: { receipt: previousReceipt, artifactDigest: value.candidate.artifactDigest, catalogueDigest: value.checkpoint.catalogueDigest } };
  await put(value.state, 'checkpoint.json', JSON.stringify(checkpoint)); const observed = await observe(preparePublication, value.options);
  expect.soft(observed.result?.outcome).toBe('awaiting-evidence'); const measured = await measureArtifact(value.artifact);
  expect.soft(measured.snapshot?.publishedAt).toBeNull(); expect.soft(measured.snapshot?.status.lastConfirmedDeployment).toEqual(previousReceipt);
  expect.soft(measured.snapshot?.snapshotId).not.toBe(value.candidate.snapshotId);
}
test('PUB-NEXT-CANDIDATE: restored confirmed receipt enters known history without rewriting its original served artifact', carriesReceiptIntoNextCandidate);

/** Requires postapproval checks to remain current even when application inputs or evidence expire while waiting.
 * @param fault Changed application or elapsed evidence window after initial eligibility.
 * @returns Completion after independent second-check rejection without build/source work.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only controlled input bytes/clock between two controller checks.
 */
async function rechecksApprovedEvidence(fault: string): Promise<void> {
  const value = await fixture(); const first = await observe(promotePublication, promotionOptions(value)); expect.soft(first.result?.outcome).toBe('ready');
  if (fault === 'application') await put(value.root, 'src/sample.ts', 'export const changed = 2;'); else value.elapsed += 8 * 86_400_000;
  const second = await observe(promotePublication, promotionOptions(value)); expect.soft(second.rejected || second.result?.outcome === 'awaiting-evidence').toBe(true); expect.soft(value.commands).toEqual([]);
}
test.each(['application', 'evidence-expiry'])('PUB-APPROVAL-CURRENT: %s change while waiting blocks previously eligible deployment', rechecksApprovedEvidence);

/** Checks historical fixture chronology and independent acquisition/publication producer roles.
 * @returns Completion after genuine fixture-only origin/time controls, not new authentication behavior.
 * @throws On genuine temporary fixture setup/metadata write errors.
 */
async function validatesHistoricalHarness(): Promise<void> {
  const value = await fixture(); await historicalOrigin(value); const confirmation = historicalReceipt(value); const stored = value.artifacts[historicalArtifact]; const producer = value.runs[historicalRun];
  expect(value.checkpoint.runId).toBe('101'); expect(String(stored.workflow_run.id)).toBe(historicalRun);
  expect(confirmation.workflowUrl).toBe(producer.html_url);
  expect([Date.parse(value.catalogue.preparedAt), Date.parse(confirmation.publishedAt), Date.parse(confirmation.verifiedServedAt), Date.parse(stored.created_at), Date.parse(producer.updated_at), now]).toEqual([now - 3_600_000, now - 1_800_000, now - 1_740_000, now - 900_000, now - 600_000, now]);
}
test('PUB-HARNESS-HISTORICAL: acquisition101 and publication299 chronology precede uploaded served proof (positive control, not RED)', validatesHistoricalHarness);

/** Requires a successful actual deployment with failed live confirmation to leave durable honest operational evidence.
 * @returns Completion after actual job success, failed confirmation and prior confirmed-receipt preservation.
 * @throws On genuine isolated fixture setup/read errors.
 * @remarks Changes only the controlled postdeployment live HTTP response, never asserts preservation of live site bytes.
 */
async function recordsFailedLiveConfirmation(): Promise<void> {
  const value = await fixture(); value.options.transport = failedLive; const observed = await observe(finalizePublication, value.options);
  const recorded = await json(join(value.state, 'publication-runs/300-1.json'));
  expect.soft(observed.rejected).toBe(true);
  expect.soft(recorded).toMatchObject({ deployResult: 'success', deploymentOutcome: 'success', confirmationOutcome: 'failed', receipt: null });
  expect.soft(await readFile(join(value.state, 'served-publication.json'))).toEqual(value.oldServed);
  /** Fails only the live deployed resource after valid independent GitHub deployment confirmation.
   * @param input Actual native Fetch URL.
   * @param init Native request options.
   * @returns Failed live retrieval or the valid actual-job/API proof fixture.
   * @throws On genuine forwarded fixture errors.
   */
  async function failedLive(input: string | URL | Request, init?: RequestInit): Promise<Response> { const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); return url.origin === 'https://eaglecheow.github.io' ? new Response('Controlled postdeploy probe failure', { status: 503 }) : transport(value, input, init); }
}
test('PUB-POSTDEPLOY-REPORT: successful deployment plus failed live probe records unconfirmed site honestly without a receipt', recordsFailedLiveConfirmation);

/** Requires actual site supersession to block promotion even when its older private confirmation metadata is unchanged.
 * @returns Completion after a reached live known-base mismatch and unchanged prior private receipt.
 * @throws On genuine temporary fixture setup/read errors.
 * @remarks Changes only controlled HTTP live content, not the last-confirmed metadata or candidate bytes.
 */
async function rejectsUnrecordedLiveSupersession(): Promise<void> {
  const value = await fixture(); value.options.transport = supersededSite; const observed = await observe(promotePublication, promotionOptions(value));
  expect.soft(observed.rejected || observed.result?.outcome === 'awaiting-evidence').toBe(true);
  expect.soft(value.calls).toContain('https://eaglecheow.github.io/vote-better-malaysia/data/catalogue.json.gz');
  expect.soft(await readFile(join(value.state, 'served-publication.json'))).toEqual(value.oldServed);
  /** Serves a different current snapshot only at the known production catalogue route.
   * @param input Native requested URL.
   * @param init Native request options.
   * @returns Valid different live catalogue or forwarded controlled API/test-origin response.
   * @throws On genuine forwarded fixture errors.
   */
  async function supersededSite(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin === 'https://eaglecheow.github.io') { value.calls.push(url.href); return Response.json({ ...value.priorCatalogue, snapshotId: 'unconfirmed-new-live-site' }); }
    return transport(value, input, init);
  }
}
test('PUB-CURRENT-SITE: superseded live Pages content blocks promotion while old confirmed private metadata remains unchanged', rejectsUnrecordedLiveSupersession);

/** Checks coherent old-site byte/digest/accounting fields independently of promotion implementation.
 * @returns Completion after prior catalogue and canonical artifact digest controls.
 * @throws On genuine native fixture setup/read errors.
 */
async function validatesPriorSiteHarness(): Promise<void> {
  const value = await fixture(); const recorded = JSON.parse(Buffer.from(value.oldServed).toString('utf8'));
  expect(recorded.receipt.snapshotId).toBe(value.priorCatalogue.snapshotId);
  expect(recorded.catalogueDigest).toBe(hash(gunzipSync(await readFile(join(value.priorArtifact, 'data/catalogue.json.gz')))));
  const measured = await measureArtifact(value.priorArtifact); expect(measured.complete).toBe(true); expect(measured.artifactDigest).toBe(value.candidate.priorServedBaselineDigest);
}
test('PUB-HARNESS-PRIOR: original live site has exact catalogue/artifact hashes and complete controlled source accounting (positive control, not RED)', validatesPriorSiteHarness);

/** Requires documented attempt-scoped provider jobs without inventing embedded attempt or HTML URL fields.
 * @returns Completion after actual finalized receipt and exact attempt-endpoint assertions.
 * @throws On genuine isolated fixture setup/read failures.
 * @remarks Replaces only controlled jobs response/log URL with the documented provider shape.
 */
async function acceptsDocumentedAttemptJobs(): Promise<void> {
  const value = await fixture(); const jobUrl = `https://github.com/${repository}/runs/300/jobs/301`; value.status.log_url = jobUrl; value.options.transport = documentedJobs;
  const observed = await observe(finalizePublication, value.options); expect.soft(observed.result).toMatchObject({ outcome: 'finalized', receipt: receipt(value) });
  expect.soft(value.calls).toContain(`https://api.github.com/repos/${repository}/actions/runs/300/attempts/1/jobs`);
  /** Returns real official-shaped attempt jobs without an undocumented run_attempt property.
   * @param input Actual requested fixed GitHub/resource URL.
   * @param init Native Fetch request settings.
   * @returns Documented controlled job metadata or the native fixture response.
   * @throws On genuine forwarded fixture transport errors.
   * @remarks Records exact provider jobs requests independently of returned controller metadata.
   */
  async function documentedJobs(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin === 'https://api.github.com' && url.pathname.startsWith(`/repos/${repository}/actions/runs/300/`) && url.pathname.endsWith('/jobs')) { value.calls.push(url.href); return Response.json({ jobs: [{ id: 301, run_id: 300, head_sha: laterRevision, name: 'deploy', status: 'completed', conclusion: 'success', html_url: jobUrl,
      steps: [{ name: 'Deploy exact candidate', number: 4, status: 'completed', conclusion: 'success' }] }] }); }
    return transport(value, input, init);
  }
}
test('PUB-DOCUMENTED-JOBS: exact attempt endpoint and actual provider job URL confirm publication without guessed fields', acceptsDocumentedAttemptJobs);

const actionStepFaults = ['missing', 'skipped', 'failed', 'foreign'] as const;
/** Requires the reviewed Pages action to have actually run, even when its enclosing job succeeds.
 * @param fault Missing or unsuccessful/foreign action step with otherwise successful provider/live proofs.
 * @returns Completion after actual confirmation rejection and prior receipt preservation.
 * @throws On genuine isolated fixture setup/read failures.
 * @remarks Changes only the controlled action-step response, retaining the old guard's legacy attempt scalar solely to reach the missing behavior.
 */
async function rejectsUnexecutedDeploymentAction(fault: typeof actionStepFaults[number]): Promise<void> {
  const value = await fixture(); value.options.transport = actionSteps; const observed = await observe(finalizePublication, value.options);
  expect({ rejected: observed.rejected, receipt: await readFile(join(value.state, 'served-publication.json')) }).toEqual({ rejected: true, receipt: value.oldServed });
  const recorded = await json(join(value.state, 'publication-runs/300-1.json'));
  expect({ deployResult: recorded?.deployResult, deploymentOutcome: recorded?.deploymentOutcome }).toEqual({ deployResult: 'success', deploymentOutcome: fault === 'failed' ? 'failed' : 'not-attempted' });
  /** Supplies controlled official-shaped step metadata while all existing successful proofs stay valid.
   * @param input Actual requested fixed API/resource URL.
   * @param init Native Fetch settings.
   * @returns Controlled jobs/steps or the forwarded native fixture response.
   * @throws On genuine underlying fixture transport failure.
   * @remarks Records actual jobs requests; no controller outcome is fabricated.
   */
  async function actionSteps(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin === 'https://api.github.com' && url.pathname.startsWith(`/repos/${repository}/actions/runs/300/`) && url.pathname.endsWith('/jobs')) {
      value.calls.push(url.href); const steps = fault === 'missing' ? [] : [{ name: fault === 'foreign' ? 'Unreviewed deployment action' : 'Deploy exact candidate', number: 4, status: 'completed', conclusion: fault === 'skipped' ? 'skipped' : fault === 'failed' ? 'failure' : 'success' }];
      return Response.json({ jobs: [{ id: 301, run_id: 300, head_sha: laterRevision, run_attempt: 1, name: 'deploy', status: 'completed', conclusion: 'success', html_url: `https://github.com/${repository}/actions/runs/300/job/301`, steps }] });
    }
    return transport(value, input, init);
  }
}
test.each(actionStepFaults)('PUB-EXECUTED-ACTION: %s step cannot confirm a new publication from a merely successful job', rejectsUnexecutedDeploymentAction);

/** Enumerates actual native bundle files without inventing missing outputs.
 * @param root Existing controlled bundle root.
 * @param prefix Relative recursive directory.
 * @returns Sorted actual regular relative file paths.
 * @throws On native read failures or unexpected nonregular entries.
 */
async function bundlePaths(root: string, prefix = ''): Promise<string[]> {
  const paths: string[] = []; for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) paths.push(...await bundlePaths(root, path)); else { expect(entry.isFile()).toBe(true); paths.push(path); }
  } return paths.sort();
}
/** Checks the already-green transport bundle against only its actual accepted source references.
 * @param value Actual temporary successful preparation.
 * @returns Completion after exact files, native source bytes and excluded history/receipts controls.
 * @throws On genuine native missing/malformed bundle outputs.
 */
async function checksBoundedAcceptedBundle(value: Fixture): Promise<void> {
  const root = join(value.work, 'acquired-state'); const checkpoint = (await json(join(root, 'checkpoint.json')))!; const catalogue = validateCatalogue(checkpoint.catalogue);
  const expected = ['checkpoint.json', 'origin.json']; for (const sitting of catalogue.sittings) if (sitting.record.path) {
    const path = checkpoint.shardRoot + '/sittings/' + sitting.id + '.json.gz'; expected.push(path); const bytes = await readFile(join(root, path));
    expect(hash(bytes)).toBe(checkpoint.shardDigests[sitting.id]); validateSittingRecord(JSON.parse(gunzipSync(bytes).toString('utf8')), sitting, catalogue);
  }
  expect(await bundlePaths(root)).toEqual(expected.sort()); expect(await json(join(root, 'origin.json'))).toMatchObject({ runId: checkpoint.runId, codeFingerprint: checkpoint.codeFingerprint });
}
/** Confirms later successful preparations transport only their current accepted snapshot, not accumulated history.
 * @returns Completion after two independently authenticated native preparations and exact bundle/source controls.
 * @throws On genuine fixture/authoritative source errors.
 * @remarks Seeds stale private siblings and advances a completed producer/current run in controlled metadata only; this is a later GREEN control, not new RED.
 */
async function transportsOnlyCurrentAcceptedState(): Promise<void> {
  const value = await fixture(); await put(value.state, 'snapshots/stale-sibling/sittings/999.json.gz', await readFile(join(value.state, 'snapshots/controlled/sittings/1.json.gz')));
  await put(value.state, 'receipts/stale-session/private.bin', 'Synthetic private raw receipt excluded from state transport'); await put(value.state, 'publication-runs/stale.json', '{}');
  const first = await observe(preparePublication, value.options); expect(first.result?.outcome).toBe('awaiting-evidence'); await checksBoundedAcceptedBundle(value);
  const firstCheckpoint = (await json(join(value.state, 'checkpoint.json')))!; value.elapsed += 2000;
  value.runs['300'].status = 'completed'; value.runs['300'].conclusion = 'success'; value.runs['300'].updated_at = iso(currentTime(value));
  value.artifacts['702'] = artifact('702', '300', 'hansard-state', laterRevision); value.artifacts['702'].created_at = iso(currentTime(value) - 1000); value.artifacts['702'].expires_at = iso(currentTime(value) + 6 * 86_400_000);
  value.runs['301'] = { ...run('301', laterRevision, true), created_at: iso(currentTime(value)), run_started_at: iso(currentTime(value)), updated_at: iso(currentTime(value)) };
  value.options.runId = '301'; value.options.stateRunId = '300'; value.options.stateArtifactId = '702';
  const second = await observe(preparePublication, value.options); expect(second.result?.outcome).toBe('awaiting-evidence'); await checksBoundedAcceptedBundle(value);
  const secondCheckpoint = (await json(join(value.state, 'checkpoint.json')))!; expect(secondCheckpoint.shardRoot).not.toBe(firstCheckpoint.shardRoot);
  expect(await regularFile(join(value.state, 'snapshots/stale-sibling/sittings/999.json.gz'))).toBe(true); expect(await regularFile(join(value.state, firstCheckpoint.shardRoot, 'sittings/1.json.gz'))).toBe(true);
}
test('PUB-BOUNDED-STATE-CONTROL: two actual successful preparations emit only current referenced checkpoint payloads (later GREEN control, not RED)', transportsOnlyCurrentAcceptedState);

/** Requires latest independently confirmed publication history to survive a newer acquired checkpoint.
 * @returns Completion after reached public-history assertion and source/private immutable-state controls.
 * @throws On genuine coherent fixture/authoritative source errors.
 * @remarks Adds genuine controlled state/publication producers and a separately frozen served artifact; no publication is performed.
 */
async function carriesSeparateLatestServedHistory(): Promise<void> {
  const value = await fixture(); await historicalOrigin(value); const latestReceipt = historicalReceipt(value);
  const confirmed = join(value.root, 'independently-served-artifact'); await cp(value.artifact, confirmed, { recursive: true }); const frozenBefore = await readFile(join(confirmed, 'data/catalogue.json.gz'));
  const checkpoint = structuredClone(value.checkpoint); checkpoint.runId = '102'; checkpoint.runAttempt = 1; checkpoint.workflowUrl = `https://github.com/${repository}/actions/runs/102`;
  checkpoint.createdAt = iso(now - 2_400_000); checkpoint.catalogue.snapshotId = 'controlled-newer-acquired-before-promotion'; checkpoint.catalogue.preparedAt = checkpoint.createdAt; checkpoint.catalogue.status.completedAt = checkpoint.createdAt;
  checkpoint.catalogue.status.workflowUrl = checkpoint.workflowUrl; checkpoint.catalogueDigest = hash(JSON.stringify(checkpoint.catalogue)); validateCatalogue(checkpoint.catalogue);
  await put(value.state, 'checkpoint.json', JSON.stringify(checkpoint)); await put(value.state, 'origin.json', JSON.stringify({ repository, branch: 'main', runId: '102', runAttempt: 1, sourceRevision: laterRevision, codeFingerprint: value.options.codeFingerprint }));
  value.runs['102'] = run('102', laterRevision); value.artifacts['703'] = artifact('703', '102', 'hansard-state', laterRevision); value.artifacts['703'].created_at = iso(now - 2_100_000);
  value.options.stateRunId = '102'; value.options.stateArtifactId = '703'; value.options.servedRunId = historicalRun; value.options.servedArtifactId = historicalArtifact;
  const served = { repository, branch: 'main', runId: historicalRun, runAttempt: 1, acquisitionRunId: '101', sourceRevision: revision, codeFingerprint: hash('Synthetic independently authenticated historical acquisition code'),
    receipt: latestReceipt, catalogueDigest: value.checkpoint.catalogueDigest, shardDigests: value.checkpoint.shardDigests, artifactDigest: value.candidate.artifactDigest, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/', files: value.sizes.files };
  await put(value.state, 'served-publication.json', JSON.stringify(served)); const servedBefore = await readFile(join(value.state, 'served-publication.json'));
  const observed = await observe(preparePublication, value.options); expect.soft(observed.result?.outcome).toBe('awaiting-evidence'); const measured = await measureArtifact(value.artifact);
  expect.soft(measured.snapshot?.status.lastConfirmedDeployment).toEqual(latestReceipt);
  expect(measured.snapshot?.publishedAt).toBeNull(); expect(measured.snapshot?.snapshotId).not.toBe(latestReceipt.snapshotId);
  const next = (await json(join(value.state, 'checkpoint.json')))!; expect(next.catalogue.publishedAt).toBeNull(); expect(next.servedPublication).toBeUndefined();
  expect(await readFile(join(value.state, 'served-publication.json'))).toEqual(servedBefore); expect(await readFile(join(confirmed, 'data/catalogue.json.gz'))).toEqual(frozenBefore);
}
test('PUB-LATEST-SERVED-HISTORY: newer acquired state carries separately authenticated latest publication into next snapshot history', carriesSeparateLatestServedHistory);

const historyTrustFaults = ['scalar', 'self-trusted', 'real-origin-invented-receipt', 'json-origin'] as const;
/** Requires newly supplied publication history to have a genuine verified binding, not a scalar/flag/origin alone.
 * @param fault Direct unauthenticated acquisition-history input.
 * @returns Completion after observed rejection and old accepted checkpoint preservation.
 * @throws On genuine isolated fixture/API setup errors.
 */
async function rejectsUnauthenticatedHistory(fault: typeof historyTrustFaults[number]): Promise<void> {
  const value = await fixture(); const options = acquisitionOptions(value); const origin = await historicalOrigin(value); const before = await readFile(join(value.state, 'checkpoint.json'));
  const publication = { repository, receipt: historicalReceipt(value), authenticatedOrigin: origin };
  if (fault === 'scalar') options.confirmedPublication = publication.receipt;
  if (fault === 'self-trusted') options.confirmedPublication = { trusted: true, ...publication };
  if (fault === 'real-origin-invented-receipt') options.confirmedPublication = { ...publication, receipt: { ...publication.receipt, snapshotId: 'invented-never-confirmed' } };
  if (fault === 'json-origin') options.confirmedPublication = JSON.parse(JSON.stringify(publication));
  let rejected = false; try { await acquire(options); } catch { rejected = true; }
  expect({ rejected, checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ rejected: true, checkpoint: before });
}
test.each(historyTrustFaults)('PUB-HISTORY-TRUST: %s cannot introduce publication history through a direct acquisition option', rejectsUnauthenticatedHistory);

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

test.each(tddFaults)('PUB-TDD %s',
 /** Rejects stale or unreviewed RED evidence independently of native command success.
  * @param fault Concrete separately reviewed full-report boundary.
  * @returns Completion after a reached actual acceptance rejection assertion.
  */
 async (fault) => { const value = await fixture(); await tddFault(value.root, value.automated, fault); await save(value);
 const observed = await observe(promotePublication, promotionOptions(value)); expect(observed.result?.outcome).not.toBe('ready'); });
