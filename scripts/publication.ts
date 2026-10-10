import { cp, lstat, mkdir, readFile, readdir, rm, writeFile, appendFile } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { checkDocumentation, isCandidate, isCurrentReview, sameCandidate, type DocumentationCandidate } from './check-documentation.ts';
import { evaluateBudgets, measureArtifact, type ArtifactSizes } from './check-performance.ts';
import { acquire, finalizeAcquiredCheckpoint, readPublicationCheckpoint, validateHistoricalServedBaseline, type AcquisitionOptions, type ServedBaseline } from './acquire.ts';
import { DATA_LIMITS, validateCatalogue, validateSittingRecord, type Catalogue, type DeploymentReceipt, type SittingRecord } from '../src/source.ts';
import { applicationFingerprint } from './application-fingerprint.ts';
export { applicationFingerprint } from './application-fingerprint.ts';

/** Concrete publication context; transports/commands exist only for controlled boundary tests. */
export interface PublicationOptions {
  root: string; state: string; work: string;
  repository: string; branch: string; runId: string; runAttempt: number;
  sourceRevision: string; codeFingerprint: string;
  candidateRunId?: string; candidateArtifactId?: string;
  pagesCandidateArtifactId?: string;
  evidenceRunId?: string; evidenceArtifactId?: string;
  stateRunId?: string; stateArtifactId?: string;
  resumeRunId?: string; resumeArtifactId?: string;
  servedRunId?: string; servedArtifactId?: string;
  pagesArtifactId?: string;
  testOrigin?: string;
  candidateResult?: string; deployResult?: string;
  transport?: typeof fetch; now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  command?: (kind: 'build' | 'checks', root: string) => Promise<void>;
}

/** Publication facts remain separate from the immutable catalogue and acquisition success. */
export interface PublicationResult {
  outcome: 'prepared' | 'ready' | 'awaiting-evidence' | 'finalized' | 'failed';
  candidate: DocumentationCandidate | null;
  receipt: DeploymentReceipt | null;
  reason: string | null;
}

/** Authenticated producing-run/artifact binding, distinct from downloaded payload claims. */
export interface PublicationOrigin {
  repository: string; runId: string; runAttempt: number; sourceRevision: string;
  artifactId: string; archiveDigest: string; createdAt: string; expiresAt: string;
  codeFingerprint: string | null;
}

const authenticOrigins = new WeakMap<PublicationOrigin, Readonly<PublicationOrigin> & { name: string }>();
const confirmedPublications = new WeakMap<object, { origin: PublicationOrigin; receipt: Readonly<DeploymentReceipt> }>();
const sevenDays = 604_800_000;

/** Rejects a failed provenance condition without accepting payload trust flags.
 * @param condition Independently checked condition.
 * @param reason Concrete failed provenance boundary.
 * @returns Control only when the provenance condition holds.
 * @throws When the condition does not hold.
 */
function requireOrigin(condition: unknown, reason: string): asserts condition { if (!condition) throw new Error(reason); }
/** Reads an ordinary JSON object for exact provenance comparisons.
 * @param value Untrusted decoded API or downloaded metadata.
 * @returns Object with unknown properties, without coercion.
 * @throws On nonobject, null or array input.
 */
function object(value: unknown): Record<string, unknown> { requireOrigin(value !== null && typeof value === 'object' && !Array.isArray(value), 'Invalid publication provenance object'); return value as Record<string, unknown>; }
/** Checks canonical positive identifiers without losing integer precision.
 * @param value API integer or explicit requested string identifier.
 * @returns Exact canonical identifier.
 * @throws On zero, negative, unsafe or noncanonical identifiers.
 */
function id(value: unknown): string {
  if (typeof value === 'number') { requireOrigin(Number.isSafeInteger(value) && value > 0, 'Invalid publication identifier'); return String(value); }
  requireOrigin(typeof value === 'string' && /^[1-9]\d*$/.test(value), 'Invalid publication identifier'); return value;
}
/** Validates a real nonfuture UTC timestamp without calendar normalization.
 * @param value API timestamp.
 * @param now Independent executing clock in milliseconds.
 * @returns Its exact milliseconds.
 * @throws On missing, malformed, impossible or future time.
 */
function instant(value: unknown, now: number): number {
  requireOrigin(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), 'Invalid publication origin time');
  const parsed = Date.parse(value); const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  requireOrigin(Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical && parsed <= now, 'Impossible or future publication origin time'); return parsed;
}
/** Requests only the fixed GitHub REST origin using the actual executing token.
 * @param path Repository-scoped API path constructed from validated identities.
 * @param options Independent executing context and controlled test transport.
 * @returns Decoded authoritative API object.
 * @throws On HTTP, redirect, timeout or malformed JSON failures.
 */
async function github(path: string, options: PublicationOptions): Promise<Record<string, unknown>> {
  return object(await githubValue(path, options));
}
/** Reads actual fixed-origin provider JSON, including native REST list responses.
 * @param path Validated repository-scoped REST path.
 * @param options Executing token/context and controlled transport.
 * @returns Actual decoded provider JSON without inferring missing fields.
 * @throws On HTTP, redirect, timeout or malformed JSON errors.
 */
export async function githubValue(path: string, options: Pick<PublicationOptions, 'repository' | 'transport'>): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN; if (token) headers.Authorization = 'Bearer ' + token;
  const response = await (options.transport ?? fetch)('https://api.github.com/repos/' + options.repository + path, { headers, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  requireOrigin(response.ok, 'GitHub publication origin request failed: ' + response.status); return response.json();
}
/** Authenticates imported provenance against the executing repository's reviewed workflow.
 * @param input Untrusted requested run/artifact identity.
 * @param supplied Independent executing context and controlled HTTP boundary.
 * @returns A fresh API-bound origin with independently registered original scalar claims.
 * @throws On foreign, incomplete, failed, expired, mismatched or malformed provenance.
 * @remarks Registers genuine object identity separately from its mutable returned claims; controller and core acceptance remain gated.
 */
export async function verifyPublicationOrigin(input: unknown, supplied: unknown): Promise<PublicationOrigin> {
  const request = object(input); const context = object(supplied); const options = supplied as PublicationOptions;
  requireOrigin(typeof context.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(context.repository) && context.branch === 'main', 'Unreviewed publication repository or branch');
  requireOrigin(typeof context.work === 'string' && context.work.length > 0 && typeof context.sourceRevision === 'string' && /^[a-f0-9]{40}$/.test(context.sourceRevision), 'Invalid executing publication context');
  requireOrigin(Number.isSafeInteger(context.runAttempt) && Number(context.runAttempt) > 0, 'Invalid executing run attempt');
  const runId = id(request.runId); const artifactId = id(request.artifactId); const currentId = id(context.runId);
  requireOrigin(typeof request.name === 'string' && ['hansard-candidate', 'hansard-pages-candidate', 'hansard-evidence', 'hansard-state', 'hansard-served', 'hansard-partial', 'github-pages'].includes(request.name), 'Invalid requested publication artifact');
  requireOrigin(typeof request.sourceRevision === 'string' && /^[a-f0-9]{40}$/.test(request.sourceRevision), 'Invalid requested producing revision');
  const at = (options.now ?? Date.now)(); requireOrigin(Number.isFinite(at), 'Invalid publication clock');
  const current = await github('/actions/runs/' + currentId, options); const workflow = await github('/actions/workflows/pages.yml', options);
  const currentRepository = object(current.repository); const currentHead = object(current.head_repository); const repositoryId = id(currentRepository.id);
  requireOrigin(id(current.id) === currentId && current.run_attempt === context.runAttempt && current.head_sha === context.sourceRevision && current.head_branch === 'main', 'Executing workflow identity mismatch');
  requireOrigin(currentRepository.full_name === context.repository && currentHead.full_name === context.repository && id(currentHead.id) === repositoryId, 'Executing workflow repository mismatch');
  requireOrigin(workflow.path === '.github/workflows/pages.yml' && workflow.state === 'active' && id(current.workflow_id) === id(workflow.id) && current.path === workflow.path, 'Executing workflow is not reviewed Pages workflow');
  requireOrigin((current.event === 'schedule' || current.event === 'workflow_dispatch') && Array.isArray(current.pull_requests) && current.pull_requests.length === 0, 'Executing workflow is not reviewed default-branch work');
  const run = await github('/actions/runs/' + runId, options); const archive = await github('/actions/artifacts/' + artifactId, options);
  const producingRepository = object(run.repository); const producingHead = object(run.head_repository); const archiveRun = object(archive.workflow_run);
  requireOrigin(id(run.id) === runId && run.run_attempt === (request.runAttempt ?? 1) && run.head_sha === request.sourceRevision && run.head_branch === 'main', 'Imported workflow identity mismatch');
  requireOrigin(id(producingRepository.id) === repositoryId && id(producingHead.id) === repositoryId && producingRepository.full_name === context.repository && producingHead.full_name === context.repository, 'Imported workflow repository mismatch');
  requireOrigin(run.path === workflow.path && id(run.workflow_id) === id(workflow.id) && (run.event === 'schedule' || run.event === 'workflow_dispatch') && Array.isArray(run.pull_requests) && run.pull_requests.length === 0, 'Imported workflow is not reviewed default-branch Pages work');
  const currentPages = request.name === 'github-pages' && runId === currentId;
  const cappedPartial = request.name === 'hansard-partial' && run.status === 'completed' && run.conclusion === 'failure';
  requireOrigin(currentPages ? run.status === 'in_progress' || run.status === 'completed' && run.conclusion === 'success' : run.status === 'completed' && (run.conclusion === 'success' || cappedPartial), 'Imported workflow did not complete successfully');
  requireOrigin(id(archive.id) === artifactId && archive.name === request.name && archive.expired === false, 'Imported artifact identity or expiry mismatch');
  requireOrigin(id(archiveRun.id) === runId && id(archiveRun.repository_id) === repositoryId && id(archiveRun.head_repository_id) === repositoryId && archiveRun.head_branch === 'main' && archiveRun.head_sha === request.sourceRevision, 'Artifact is not bound to the authenticated workflow');
  const created = instant(archive.created_at, at); const expires = instant(archive.expires_at, Infinity); const started = instant(run.created_at, at); const completed = instant(run.updated_at, at);
  requireOrigin(started <= created && (currentPages || created <= completed) && at - created <= sevenDays && expires > at && expires - created <= sevenDays, 'Imported artifact lifetime or producer chronology mismatch');
  requireOrigin(typeof archive.digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(archive.digest), 'Invalid immutable artifact digest');
  let codeFingerprint: string | null = null;
  if (!['hansard-evidence', 'github-pages', 'hansard-partial'].includes(request.name)) {
    const metadata = object(request.name === 'hansard-served' ? await json(join(options.work, 'served-origin.json')) ?? await json(join(options.work, 'origin.json')) : await json(join(options.work, 'origin.json')));
    requireOrigin(metadata.repository === context.repository && metadata.branch === 'main' && metadata.runId === runId && metadata.runAttempt === run.run_attempt && metadata.sourceRevision === request.sourceRevision, 'Downloaded origin is not bound to its authenticated producer');
    requireOrigin(typeof metadata.codeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(metadata.codeFingerprint), 'Invalid authenticated acquisition fingerprint'); codeFingerprint = metadata.codeFingerprint;
  }
  const origin: PublicationOrigin = { repository: context.repository, runId, runAttempt: run.run_attempt as number, sourceRevision: request.sourceRevision, artifactId, archiveDigest: archive.digest.slice(7), createdAt: archive.created_at as string, expiresAt: archive.expires_at as string, codeFingerprint };
  authenticOrigins.set(origin, Object.freeze({ ...origin, name: request.name })); return origin;
}

/** Reads only the unchanged scalar claims of a genuinely authenticated in-process origin.
 * @param value Returned origin object, never a JSON-rehydrated trust flag.
 * @param name Required independently authenticated artifact role.
 * @returns Original registered claims after exact object-identity and scalar comparison.
 * @throws On cloned, mutated, unauthenticated or wrong-role objects.
 */
export function authenticatedPublicationOrigin(value: unknown, name: string): Readonly<PublicationOrigin> {
  const claims = object(value); const bound = authenticOrigins.get(value as PublicationOrigin);
  requireOrigin(bound && bound.name === name, 'Missing authentic publication origin');
  for (const key of ['repository', 'runId', 'runAttempt', 'sourceRevision', 'artifactId', 'archiveDigest', 'createdAt', 'expiresAt', 'codeFingerprint'] as const) requireOrigin(claims[key] === bound[key], 'Authenticated origin claims were changed');
  return bound;
}

/** Reads publication history only from the exact independently verified prior-artifact binding.
 * @param value Opaque in-process binding returned by the existing prior authority.
 * @param repository Independent current repository.
 * @returns Its immutable original receipt after unchanged origin/receipt validation.
 * @throws On scalar, cloned, self-trusted, altered or foreign publication inputs.
 */
export function authenticatedConfirmedPublication(value: unknown, repository: string): Readonly<DeploymentReceipt> {
  const proof = object(value); const bound = confirmedPublications.get(proof); requireOrigin(bound && proof.authenticatedOrigin === bound.origin, 'Missing authentic confirmed-publication binding');
  const origin = authenticatedPublicationOrigin(bound.origin, 'hansard-served'); requireOrigin(origin.repository === repository && proof.repository === repository && proof.runId === origin.runId && proof.codeFingerprint === origin.codeFingerprint, 'Confirmed-publication origin claims changed');
  const receipt = object(proof.receipt); for (const key of ['snapshotId', 'deploymentId', 'publishedAt', 'verifiedServedAt', 'workflowUrl'] as const) requireOrigin(receipt[key] === bound.receipt[key], 'Confirmed-publication receipt claims changed'); return bound.receipt;
}

/** Hashes exact application or decoded catalogue bytes; artifact manifests use measureArtifact.
 * @param bytes Unchanged UTF-8 or binary content.
 * @returns Its lowercase SHA-256 digest.
 */
function hash(bytes: string | Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Reads optional private JSON without mistaking malformed bytes for absence.
 * @param path Fixed private metadata path.
 * @returns Parsed JSON, or null only for a missing file.
 * @throws On malformed JSON or native errors other than absence.
 */
async function json(path: string): Promise<unknown | null> { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; } }
/** Writes only explicitly chosen private metadata, never frozen deployed files.
 * @param path Fixed private output path.
 * @param value Actual observed metadata.
 * @returns Completion after its native write.
 * @throws On native write failure.
 * @remarks Creates private parents and writes exact JSON bytes.
 */
async function put(path: string, value: unknown): Promise<void> { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value)); }
/** Derives the single known repository Pages base.
 * @param options Validated repository context.
 * @returns The fixed HTTPS repository-subpath address.
 */
function pagesBase(options: PublicationOptions): string { const [owner, repository] = options.repository.split('/'); return 'https://' + owner + '.github.io/' + repository + '/'; }
/** Formats the actual independent operation clock.
 * @param options Executing context.
 * @returns A current UTC ISO instant.
 */
function now(options: PublicationOptions): string { return new Date((options.now ?? Date.now)()).toISOString(); }
/** Narrows fixed private paths and executing scalar context before any publication work.
 * @param supplied Untrusted options object.
 * @returns The validated concrete boundary context.
 * @throws On invalid branch, identifiers, code fingerprint or path overlap.
 */
async function context(supplied: unknown): Promise<PublicationOptions> {
  const value = object(supplied); const options = { ...value } as unknown as PublicationOptions;
  requireOrigin(typeof options.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository) && options.branch === 'main', 'Publication requires reviewed main context');
  id(options.runId); requireOrigin(Number.isSafeInteger(options.runAttempt) && options.runAttempt > 0 && /^[a-f0-9]{40}$/.test(options.sourceRevision) && /^[a-f0-9]{64}$/.test(options.codeFingerprint), 'Invalid publication run/revision/fingerprint');
  for (const path of [options.root, options.state, options.work]) requireOrigin(typeof path === 'string' && path.length > 0, 'Missing publication paths');
  options.root = resolve(options.root); options.state = resolve(options.state); options.work = resolve(options.work);
  requireOrigin(options.state !== options.work && relative(options.state, options.work).startsWith('../') && relative(options.work, options.state).startsWith('../'), 'Private publication paths overlap');
  for (const path of [options.state, options.work]) {
    try { requireOrigin(!(await lstat(path)).isSymbolicLink(), 'Symbolic private publication root'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    for (const publicPath of [join(options.root, 'public'), join(options.root, 'dist')]) requireOrigin(path !== publicPath && !path.startsWith(publicPath + '/') && !publicPath.startsWith(path + '/'), 'Private publication metadata overlaps deployed output');
  }
  requireOrigin(await json(join(options.work, 'data/catalogue.json.gz')) === null, 'Metadata path contains deployed source data');
  return options;
}
/** Independently verifies the currently executing reviewed main workflow, including unfinished runs.
 * @param options Actual executing repository/run/revision/attempt.
 * @returns Exact provider workflow-run metadata.
 * @throws On foreign or unreviewed current context.
 */
async function currentRun(options: PublicationOptions): Promise<Record<string, unknown>> {
  const run = await github('/actions/runs/' + options.runId, options); const workflow = await github('/actions/workflows/pages.yml', options); const repository = object(run.repository); const head = object(run.head_repository);
  requireOrigin(id(run.id) === options.runId && run.run_attempt === options.runAttempt && run.head_sha === options.sourceRevision && run.head_branch === 'main', 'Current publication run identity mismatch');
  requireOrigin(repository.full_name === options.repository && head.full_name === options.repository && id(repository.id) === id(head.id), 'Current publication repository mismatch');
  requireOrigin(run.path === '.github/workflows/pages.yml' && workflow.path === run.path && workflow.state === 'active' && id(run.workflow_id) === id(workflow.id), 'Current publication workflow mismatch');
  requireOrigin((run.event === 'schedule' || run.event === 'workflow_dispatch') && Array.isArray(run.pull_requests) && run.pull_requests.length === 0, 'Current publication event is unreviewed');
  requireOrigin(run.status === 'in_progress' || run.status === 'completed' && run.conclusion === 'success', 'Current publication workflow is not executing/successful'); return run;
}
/** Constructs concrete acquisition options without changing source provenance.
 * @param options Actual publication context.
 * @param state Independent accepted-state directory when reading original candidate bytes.
 * @returns Existing acquisition boundary settings.
 */
function acquisition(options: PublicationOptions, state = options.state): AcquisitionOptions { return { state, out: join(options.root, 'public/data'), mode: 'refresh', repository: options.repository, branch: options.branch, codeFingerprint: options.codeFingerprint,
  workflowContext: true, runId: options.runId, sessionId: options.runId, workflowUrl: 'https://github.com/' + options.repository + '/actions/runs/' + options.runId, transport: options.transport, now: options.now, sleep: options.sleep }; }
/** Records actual started-run outcomes outside frozen bytes and returns safe workflow outputs.
 * @param options Executing fixed private context.
 * @param result Actual candidate/confirmation outcome.
 * @param fields Observed acquisition/staging/deployment facts, never generated device evidence.
 * @returns The unchanged outcome object.
 * @throws On private report/output write failure.
 * @remarks Merges existing preparation facts and writes private journal/result files.
 */
async function outcome(options: PublicationOptions, result: PublicationResult, fields: Record<string, unknown>): Promise<PublicationResult> {
  const path = join(options.state, 'publication-runs', options.runId + '-' + options.runAttempt + '.json'); const previous = await json(path);
  await put(path, { acquisitionOutcome: 'not-attempted', stagingOutcome: 'not-attempted', deploymentOutcome: 'not-attempted', ...(previous === null ? {} : object(previous)), repository: options.repository, runId: options.runId, runAttempt: options.runAttempt, recordedAt: now(options), ...fields, receipt: result.receipt, reason: result.reason });
  await put(join(options.work, 'result.json'), { ...result, ready: result.outcome === 'ready', snapshotId: result.candidate?.snapshotId ?? null, artifactDigest: result.candidate?.artifactDigest ?? null }); return result;
}
/** Decodes an actual gzip or already transport-decoded catalogue within source limits.
 * @param bytes Exact received/stored bytes.
 * @returns Validated catalogue and unchanged decoded checksum.
 * @throws On malformed, oversized or invalid source catalogue.
 */
function catalogue(bytes: Uint8Array): { value: Catalogue; digest: string } { const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes, { maxOutputLength: DATA_LIMITS.decoded }) : bytes;
  requireOrigin(decoded.byteLength <= DATA_LIMITS.decoded, 'Catalogue decoded bytes exceed bound'); return { value: validateCatalogue(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))), digest: hash(decoded) }; }
/** Gets one bounded body from the already validated known HTTPS base.
 * @param url Exact trusted base/resource URL.
 * @param options Controlled/native Fetch boundary.
 * @param maximum Maximum received decoded/stored bytes for this resource.
 * @returns Exact actual response body.
 * @throws On redirects, HTTP errors, URL mismatch or exceeded response bounds.
 */
async function body(url: string, options: PublicationOptions, maximum: number): Promise<Uint8Array> {
  const response = await (options.transport ?? fetch)(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000) }); requireOrigin(response.ok && (!response.url || response.url === url), 'Trusted resource unavailable or redirected');
  const reader = response.body?.getReader(); requireOrigin(reader, 'Missing trusted resource body'); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const item = await reader.read(); if (item.done) break; length += item.value.length; requireOrigin(length <= maximum, 'Trusted resource body exceeds bound'); chunks.push(item.value); } } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}
/** Verifies current catalogue identity and bounded shell bytes without refetching all source shards.
 * @param base Independently known/configured HTTPS repository-subpath base.
 * @param snapshot Expected exact frozen snapshot.
 * @param digest Expected decoded catalogue digest.
 * @param files Canonical independently measured previous/candidate file manifest.
 * @param options Actual Fetch boundary.
 * @returns Completion after catalogue and shell byte verification.
 * @throws On any known identity or bounded application-byte mismatch.
 */
async function probe(base: string, snapshot: string, digest: string, files: unknown, options: PublicationOptions): Promise<void> {
  const observed = catalogue(await body(base + 'data/catalogue.json.gz', options, DATA_LIMITS.decoded)); requireOrigin(observed.value.snapshotId === snapshot && observed.digest === digest, 'Known served catalogue changed');
  requireOrigin(Array.isArray(files), 'Missing canonical shell file manifest');
  for (const entry of files) { requireOrigin(Array.isArray(entry) && entry.length === 3 && typeof entry[0] === 'string' && !entry[0].startsWith('/') && !entry[0].split('/').includes('..') && /^[a-f0-9]{64}$/.test(entry[2]), 'Unsafe canonical served file reference');
    const [path, size, digest] = entry; if (path.startsWith('data/')) continue; requireOrigin(Number.isSafeInteger(size) && size > 0 && size <= DATA_LIMITS.stagedData, 'Invalid shell size');
    const bytes = await body(base + path, options, size); requireOrigin(bytes.length === size && hash(bytes) === digest, 'Known served application bytes changed'); }
}
/** Authenticates independently selected imported artifact metadata at its fixed downloaded root.
 * @param options Actual executing context.
 * @param runId Independently selected producing run ID.
 * @param artifactId Exact selected provider artifact ID.
 * @param name Required provider artifact role.
 * @param metadataRoot Fixed downloaded metadata directory.
 * @param revision Optional separately known candidate tested revision.
 * @returns A genuinely API-authenticated origin.
 * @throws On absent IDs or unauthenticated role/origin.
 */
async function imported(options: PublicationOptions, runId: string | undefined, artifactId: string | undefined, name: string, metadataRoot: string, revision?: string): Promise<PublicationOrigin> {
  requireOrigin(runId && artifactId, 'Required imported artifact identity missing'); const run = await github('/actions/runs/' + id(runId), options);
  return verifyPublicationOrigin({ runId, artifactId, name, sourceRevision: revision ?? run.head_sha, runAttempt: run.run_attempt }, { ...options, work: metadataRoot });
}
/** Reads independently authenticated previous publication metadata without overwriting newer acquired state.
 * @param options Executing context with separate served-state transport root.
 * @returns Last confirmed served binding, or null only when genuinely unrecorded.
 * @throws On malformed or unauthenticated selected served metadata.
 */
async function prior(options: PublicationOptions): Promise<Record<string, unknown> | null> {
  const root = join(options.work, 'served-state'); const downloaded = await json(join(root, 'served-publication.json')); const input = downloaded ?? await json(join(options.state, 'served-publication.json'));
  if (input === null) { requireOrigin(!options.servedArtifactId && !options.servedRunId, 'Selected served artifact is missing'); return null; }
  const value = object(input); requireOrigin(value.repository === options.repository && value.branch === 'main' && value.baseUrl === pagesBase(options) && typeof value.artifactDigest === 'string' && /^[a-f0-9]{64}$/.test(value.artifactDigest) && typeof value.catalogueDigest === 'string' && /^[a-f0-9]{64}$/.test(value.catalogueDigest), 'Invalid confirmed served binding');
  const origin = await imported(options, options.servedRunId, options.servedArtifactId, 'hansard-served', downloaded === null ? options.work : root, value.sourceRevision as string);
  const claims = authenticatedPublicationOrigin(origin, 'hansard-served'); const receipt = object(value.receipt);
  requireOrigin(value.runId === claims.runId && value.codeFingerprint === claims.codeFingerprint && receipt.workflowUrl === 'https://github.com/' + options.repository + '/actions/runs/' + claims.runId, 'Confirmed served producer mismatch');
  requireOrigin(typeof receipt.snapshotId === 'string' && receipt.snapshotId.trim() && typeof receipt.deploymentId === 'string' && receipt.deploymentId.trim(), 'Confirmed served receipt identity is missing');
  const published = instant(receipt.publishedAt, Date.parse(now(options))); const verified = instant(receipt.verifiedServedAt, Date.parse(now(options))); requireOrigin(published <= verified && verified <= Date.parse(claims.createdAt), 'Confirmed served timeline mismatch');
  const result = { ...value, authenticatedOrigin: origin }; confirmedPublications.set(result, { origin, receipt: Object.freeze({ ...receipt }) as Readonly<DeploymentReceipt> }); return result;
}

/** Restores only provider-authenticated regular archive paths and preserves the original tar bytes.
 * @param options Executing private paths after candidate/Pages artifact authentication.
 * @returns Completion after actual safe restoration, or no-op when regular extracted files exist.
 * @throws On unsafe tar entries, missing archive or native extraction failure.
 * @remarks Creates only work/artifact after authentic archive path/type inspection.
 */
async function restoreArchive(options: PublicationOptions): Promise<void> {
  const artifact = join(options.work, 'artifact'); try { requireOrigin((await lstat(artifact)).isDirectory(), 'Invalid extracted artifact'); return; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const archive = join(options.work, 'artifact.tar'); const paths = execFileSync('tar', ['-tf', archive], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).trimEnd().split('\n');
  for (const name of paths) { const path = name.replace(/^\.\//, '').replace(/\/$/, ''); requireOrigin(path === '.' || path === '' || /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith('/') && !path.split('/').includes('..'), 'Unsafe Pages archive path'); }
  const details = execFileSync('tar', ['-tvf', archive], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trimEnd().split('\n');
  for (const line of details) requireOrigin((line.startsWith('-') || line.startsWith('d')) && !line.includes(' link to ') && !line.includes(' -> '), 'Pages archive contains a link or nonregular entry');
  await mkdir(artifact, { recursive: true }); await execFileSync('tar', ['-xf', archive, '-C', artifact], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
}
/** Independently verifies frozen candidate bytes and current application inputs after API authentication.
 * @param options Actual candidate and reviewed-checkout context.
 * @returns Shape-checked candidate, actual measured complete artifact and original decoded catalogue.
 * @throws On stale app, metadata/fixture corruption, untrusted producer or incomplete source bytes.
 */
async function frozen(options: PublicationOptions): Promise<{ candidate: DocumentationCandidate; sizes: ArtifactSizes; catalogue: Catalogue; catalogueDigest: string }> {
  const value = await json(join(options.work, 'candidate.json')); requireOrigin(isCandidate(value), 'Missing/invalid frozen candidate'); const candidate = value;
  await imported(options, options.candidateRunId, options.candidateArtifactId, 'hansard-candidate', options.work, candidate.sourceRevision);
  await imported(options, options.candidateRunId, options.pagesCandidateArtifactId, 'hansard-pages-candidate', options.work, candidate.sourceRevision);
  await restoreArchive(options); const sizes = await measureArtifact(join(options.work, 'artifact')); requireOrigin(sizes.complete && sizes.artifactDigest === candidate.artifactDigest && sizes.snapshot?.snapshotId === candidate.snapshotId, 'Frozen artifact/source digest or snapshot mismatch');
  requireOrigin(await applicationFingerprint(options.root) === candidate.applicationFingerprint, 'Current application inputs changed');
  const original = catalogue(await readFile(join(options.work, 'artifact/data/catalogue.json.gz')));
  await validateFixtureManifest(await json(join(options.work, 'fixtures.json')), candidate, sizes, original.value, join(options.work, 'artifact'));
  return { candidate, sizes, catalogue: original.value, catalogueDigest: original.digest };
}
/** Orders actual source fixtures by decoded size and exact path for rank ties.
 * @param left First measured record.
 * @param right Second measured record.
 * @returns Ascending decoded size and deterministic code-point path order.
 */
function fixtureOrder(left: ArtifactSizes['sittings'][number], right: ArtifactSizes['sittings'][number]): number { return left.decoded - right.decoded || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0); }
/** Selects actual measured catalogue/median/p95/largest stored hashes for frozen evidence.
 * @param sizes Canonical measureArtifact output for every file.
 * @returns Complete ranked fixture digest map, without hashing an alternative artifact manifest.
 * @throws On absent ranked/source fixture bytes.
 */
export function rankedFixtures(sizes: ArtifactSizes): Record<string, string> {
  const selected = rankedPaths(sizes); const paths = ['data/catalogue.json.gz', selected.median, selected.p95, selected.largest]; const result: Record<string, string> = {};
  for (const path of paths) { let digest: string | null = null; for (const [file, , hash] of sizes.files) if (file === path) digest = hash; requireOrigin(digest, 'Required ranked fixture is missing'); result[path] = digest; } return result;
}
/** Selects median/p95/largest paths using the publication fixture ranking authority.
 * @param sizes Canonical measured source resources.
 * @returns Exact nearest-rank paths with deterministic size/path ordering.
 * @throws On an empty acquired source inventory.
 */
export function rankedPaths(sizes: ArtifactSizes): { median: string; p95: string; largest: string } {
  const records = [...sizes.sittings].sort(fixtureOrder); requireOrigin(records.length > 0, 'No acquired ranked fixtures');
  return { median: records[Math.ceil(records.length * .5) - 1].path, p95: records[Math.ceil(records.length * .95) - 1].path, largest: records.at(-1)!.path };
}

/** Reads one already checksum-validated shard for source-backed member/gap selection.
 * @param artifact Complete measured frozen site.
 * @param path Exact measured sitting path.
 * @param catalogue Coherent accepted source catalogue.
 * @returns Exact normalized source record.
 * @throws On a mismatched sitting or invalid shard.
 */
async function fixtureRecord(artifact: string, path: string, catalogue: Catalogue): Promise<SittingRecord> { let sitting: Catalogue['sittings'][number] | null = null; for (const input of catalogue.sittings) if (input.record.path === path) sitting = input; requireOrigin(sitting, 'Fixture is not an acquired sitting'); const value = JSON.parse(gunzipSync(await readFile(join(artifact, path)), { maxOutputLength: DATA_LIMITS.decoded }).toString('utf8')); return validateSittingRecord(value, sitting, catalogue); }
/** Selects a real assigned member without guessing from visible author labels.
 * @param value Exact normalized sitting record.
 * @returns Actual assigned member ID.
 * @throws If no matched member is available for the native reader fixture.
 */
function fixtureMember(value: SittingRecord): string { for (const item of value.items) if (item.attribution === 'assigned' && item.memberId !== null) return item.memberId; throw new Error('Fixture has no actual assigned member'); }
/** Produces collector-compatible roles from exact accepted assigned records.
 * @param artifact Complete native frozen site.
 * @param sizes Canonical measured all-file sizes.
 * @param catalogue Exact accepted catalogue.
 * @returns Real ranked reader pairs and gap/largest interactions.
 * @throws On absent real assigned or gap fixtures.
 */
export async function createFixtureManifest(artifact: string, sizes: ArtifactSizes, catalogue: Catalogue): Promise<Record<string, any>> { const ranks = rankedPaths(sizes); const datasets: Record<string, any> = {}; for (const role of ['median', 'p95', 'largest'] as const) datasets[role] = { path: ranks[role], memberId: fixtureMember(await fixtureRecord(artifact, ranks[role], catalogue)) }; const interactions: Record<string, any>[] = [datasets.largest]; let hasGap = false; for (const input of (await fixtureRecord(artifact, ranks.largest, catalogue)).items) if (input.attribution === 'unassigned') hasGap = true; if (!hasGap) { for (const sitting of catalogue.sittings) { if (sitting.record.path === null) continue; const value = await fixtureRecord(artifact, sitting.record.path, catalogue); let gap = false; for (const item of value.items) if (item.attribution === 'unassigned') gap = true; if (gap) { interactions.push({ path: sitting.record.path, memberId: fixtureMember(value) }); hasGap = true; break; } } } requireOrigin(hasGap, 'No actual source gap fixture is available'); return { datasets, interactions }; }
/** Freezes exact ranked and selected interaction hashes without changing artifact bytes.
 * @param sizes Canonical measured all-file sizes.
 * @param manifest Source-backed collector selections.
 * @returns Complete ranked/interaction digest map.
 * @throws On a selected path absent from the measured artifact.
 */
export function selectedFixtureHashes(sizes: ArtifactSizes, manifest: Record<string, any>): Record<string, string> { const required = rankedFixtures(sizes); for (const input of manifest.interactions) { let digest: string | null = null; for (const [path, , hash] of sizes.files) if (path === input.path) digest = hash; requireOrigin(digest, 'Selected interaction fixture is missing'); required[input.path] = digest; } return required; }
/** Checks one exact source-backed reader pair.
 * @param chosen Selected path/member metadata.
 * @param candidate Complete fixture digest map.
 * @param catalogue Validated source catalogue.
 * @param artifact Frozen source path.
 * @returns Original normalized record.
 * @throws On an unmeasured file/member identity.
 */
async function selectedFixture(chosen: Record<string, any>, candidate: DocumentationCandidate, catalogue: Catalogue, artifact: string): Promise<SittingRecord> { requireOrigin(typeof chosen.path === 'string' && Object.hasOwn(candidate.fixtureHashes, chosen.path) && typeof chosen.memberId === 'string', 'Measured fixture identity required'); const value = await fixtureRecord(artifact, chosen.path, catalogue); let assigned = false; for (const item of value.items) if (item.attribution === 'assigned' && item.memberId === chosen.memberId) assigned = true; requireOrigin(assigned, 'Fixture member absent'); return value; }
/** Validates collector roles, actual selected members and required largest/gap interactions.
 * @param manifest Downloaded collector-compatible fixture metadata.
 * @param candidate Exact measured candidate.
 * @param sizes Canonical full artifact measurements.
 * @param catalogue Actual accepted source catalogue.
 * @param artifact Fixed frozen site path.
 * @returns Validated collector manifest.
 * @throws On incorrect roles, absent members, unknown hashes or omitted interaction fixtures.
 */
export async function validateFixtureManifest(manifest: unknown, candidate: DocumentationCandidate, sizes: ArtifactSizes, catalogue: Catalogue, artifact: string): Promise<Record<string, any>> {
  const value = object(manifest); const datasets = object(value.datasets); const ranks = rankedPaths(sizes);
  for (const role of ['median', 'p95', 'largest'] as const) { const chosen = object(datasets[role]); requireOrigin(chosen.path === ranks[role], 'Ranked fixture role mismatch'); await selectedFixture(chosen, candidate, catalogue, artifact); }
  requireOrigin(Array.isArray(value.interactions) && value.interactions.length > 0, 'Gap/largest interaction fixtures missing'); let gap = false; let largest = false;
  for (const input of value.interactions) { const chosen = object(input); const record = await selectedFixture(chosen, candidate, catalogue, artifact); if (chosen.path === ranks.largest) largest = true; for (const item of record.items) if (item.attribution === 'unassigned') gap = true; }
  requireOrigin(gap && largest, 'Real gap and largest interactions required'); requireOrigin(isDeepStrictEqual(candidate.fixtureHashes, selectedFixtureHashes(sizes, value)), 'Measured ranked/interaction fixture digest map mismatch'); return value;
}
/** Identifies the reviewed fixed runtime, laboratory conditions and source budgets.
 * @returns SHA-256 of the existing canonical publication conditions.
 */
export function conditionsDigest(): string { return hash(JSON.stringify({ node: '24', laboratory: { runner: 'ubuntu-24.04', vcpus: 4, memoryGiB: 16, mobile: [390, 844, 1600, 750, 150, 4], desktop: [1440, 900, 10000, 2000, 40, 1], samples: 20 }, decoded: DATA_LIMITS.decoded, catalogueGzip: DATA_LIMITS.catalogueGzip, sittingGzip: DATA_LIMITS.sittingGzip, wholeArtifact: DATA_LIMITS.stagedData })); }
/** Validates the independently configured secure physical-report origin.
 * @param value Configured test-only HTTPS URL.
 * @param repository Actual owner/repository.
 * @returns Exact canonical configured origin.
 * @throws On missing, insecure, foreign-subpath or production-site origins.
 */
export function validateTestOrigin(value: unknown, repository: string): string {
  requireOrigin(typeof value === 'string', 'Independently configured trusted HTTPS test origin is missing'); const base = new URL(value); const parts = repository.split('/');
  requireOrigin(base.protocol === 'https:' && base.pathname === '/' + parts[1] + '/' && !base.username && !base.password && !base.search && !base.hash && base.href === value && base.href !== 'https://' + parts[0] + '.github.io/' + parts[1] + '/', 'Invalid independent test-only HTTPS repository-subpath origin'); return value;
}
/** Matches the existing acquisition compatibility hash without granting source trust.
 * @param root Actual checked-out source/tooling directory.
 * @returns SHA-256 of source schema, acquisition code and lock bytes in their existing order.
 * @throws On missing native compatibility inputs.
 */
export async function acquisitionFingerprint(root: string): Promise<string> { return hash(Buffer.concat([await readFile(join(root, 'src/source.ts')), await readFile(join(root, 'scripts/acquire.ts')), await readFile(join(root, 'package-lock.json'))])); }
/** Validates a separately approved exact current set of TDD narratives.
 * @param input Full automated report independently authenticated by its caller.
 * @param root Actual reviewed checkout containing current tracked narratives.
 * @returns True only for named human approval and exact current ordinary-file hashes.
 * @throws On missing/false review, omitted/extra/malformed entries or changed/symbolic narratives.
 */
export async function validateReviewedTdd(input: unknown, root: string): Promise<true> {
  const report = object(input); requireOrigin(report.tddReviewed === true && typeof report.tddReviewer === 'string' && report.tddReviewer.trim().length > 0, 'Named reviewed RED/GREEN/refactor evidence required');
  const declared = object(report.tddEvidence); const directory = 'specs/001-read-mp-hansard/evidence'; const location = join(root, directory); requireOrigin((await lstat(location)).isDirectory(), 'Ordinary TDD evidence directory required'); const expected: Record<string, string> = {};
  for (const entry of await readdir(location, { withFileTypes: true })) if (/^tdd.*\.md$/.test(entry.name)) { requireOrigin(entry.isFile() && (await lstat(join(location, entry.name))).isFile(), 'Ordinary current TDD narrative required'); expected[directory + '/' + entry.name] = hash(await readFile(join(location, entry.name))); }
  requireOrigin(Object.hasOwn(expected, directory + '/tdd.md') && Object.keys(declared).length === Object.keys(expected).length, 'Exact complete current TDD narrative manifest required');
  for (const [path, digest] of Object.entries(expected)) requireOrigin(Object.hasOwn(declared, path) && typeof declared[path] === 'string' && /^[a-f0-9]{64}$/.test(declared[path] as string) && declared[path] === digest, 'Current reviewed TDD narrative hash mismatch'); return true;
}
/** Runs real native reviewed commands; controlled tests may replace only this boundary.
 * @param kind Build or mandatory automated validation.
 * @param root Actual reviewed checkout.
 * @returns Completion only after all requested commands pass.
 * @throws On any native build/type/unit/browser command failure.
 */
async function commands(kind: 'build' | 'checks', root: string): Promise<void> {
  if (kind === 'build') execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  else { execFileSync('npm', ['run', 'typecheck'], { cwd: root, stdio: 'inherit' }); execFileSync('npm', ['test', '--', '--run'], { cwd: root, stdio: 'inherit' }); execFileSync('npm', ['run', 'test:browser'], { cwd: root, stdio: 'inherit', env: { ...process.env, HANSARD_FROZEN_SITE: join(root, 'dist') } }); }
}
/** Authenticates explicit capped partial progress and its original accepted baseline before copying it.
 * @param options Current execution and independently selected partial producer/artifact.
 * @returns Original validated session ID, or null when no resume was selected.
 * @throws On wrong session, cap origin, baseline checksum, code, lifetime or accepted payload.
 * @remarks Copies only validated original private partial files into current accepted state.
 */
async function resume(options: PublicationOptions): Promise<string | null> {
  if (!options.resumeRunId && !options.resumeArtifactId) { requireOrigin(await json(join(options.state, 'partial-checkpoint.json')) === null, 'Foreign/unselected partial checkpoint'); return null; }
  const root = join(options.work, 'resume-state'); const partial = object(await json(join(root, 'partial-checkpoint.json')));
  const origin = await imported(options, options.resumeRunId, options.resumeArtifactId, 'hansard-partial', root); const claims = authenticatedPublicationOrigin(origin, 'hansard-partial');
  requireOrigin(partial.kind === 'partial' && partial.originKind === 'workflow-artifact' && partial.schemaVersion === 1 && partial.complete === false && partial.validationSuccess === true && partial.repository === options.repository && partial.branch === 'main' && partial.codeFingerprint === options.codeFingerprint, 'Untrusted partial checkpoint');
  requireOrigin(typeof partial.sessionId === 'string' && /^[A-Za-z0-9_-]+$/.test(partial.sessionId), 'Invalid original partial session'); const sessionId = partial.sessionId;
  const failed = object(await json(join(root, 'receipts', sessionId, 'failure.json'))); const refresh = object(await json(join(root, 'receipts', sessionId, 'refresh.json')));
  requireOrigin(failed.category === 'cap' && refresh.sessionId === sessionId && refresh.repository === options.repository && refresh.codeFingerprint === options.codeFingerprint, 'Partial producer did not record this capped session');
  requireOrigin(instant(partial.createdAt, Date.parse(now(options))) <= Date.parse(claims.createdAt) && Date.parse(now(options)) - Date.parse(String(partial.createdAt)) <= sevenDays, 'Expired or premature partial artifact');
  const original = await json(join(root, 'checkpoint.json')); const current = await json(join(options.state, 'checkpoint.json')); requireOrigin(original && current && JSON.stringify(original) === JSON.stringify(current), 'Partial original baseline changed');
  await readPublicationCheckpoint(original, acquisition(options, root)); requireOrigin(Array.isArray(partial.accepted) && Array.isArray(partial.pendingIds) && Array.isArray(partial.members), 'Invalid partial references');
  const hashes = object(partial.shardDigests); for (const input of partial.accepted) { const sitting = object(input); const record = object(sitting.record); const bytes = await readFile(join(root, 'partial/sittings', id(sitting.id) + '.json.gz'));
    requireOrigin(hash(bytes) === hashes[String(sitting.id)] && hash(gunzipSync(bytes, { maxOutputLength: DATA_LIMITS.decoded })) === record.digest, 'Partial accepted payload checksum mismatch'); }
  requireOrigin(Object.keys(hashes).length === partial.accepted.length, 'Unreconciled partial payloads');
  await cp(join(root, 'partial'), join(options.state, 'partial'), { recursive: true }); await put(join(options.state, 'partial-checkpoint.json'), partial); return sessionId;
}
/** Validates existing selected accepted state or constructs an authenticated historical recovery proof.
 * @param options Current execution and fixed selected state/served transport.
 * @param previous Last independently authenticated publication, when known.
 * @returns Existing acquisition settings with a historical baseline only when needed.
 * @throws On corrupt/foreign selected state or unusable recovery baseline.
 */
async function baseline(options: PublicationOptions, previous: Record<string, unknown> | null): Promise<AcquisitionOptions> {
  const settings = acquisition(options); if (previous) settings.confirmedPublication = previous; const checkpoint = await json(join(options.state, 'checkpoint.json'));
  if (options.stateRunId || options.stateArtifactId) { const origin = await imported(options, options.stateRunId, options.stateArtifactId, 'hansard-state', options.state); const claims = authenticatedPublicationOrigin(origin, 'hansard-state'); const metadata = object(checkpoint); requireOrigin(metadata.runId === claims.runId && metadata.codeFingerprint === claims.codeFingerprint, 'Selected state producer mismatch'); }
  if (checkpoint !== null) {
    const metadata = object(checkpoint); requireOrigin(metadata.repository === options.repository && metadata.branch === 'main' && metadata.originKind === 'workflow-artifact' && metadata.success === true && metadata.schemaVersion === 1, 'Malformed/foreign latest accepted state');
    let valid = false; try { await readPublicationCheckpoint(checkpoint, settings); valid = true; } catch (error) {
      const age = Date.parse(now(options)) - Date.parse(String(metadata.createdAt)); requireOrigin(metadata.codeFingerprint !== options.codeFingerprint || Number.isFinite(age) && age > sevenDays, error instanceof Error ? error.message : 'Invalid latest accepted state'); }
    if (valid) { if (!options.stateRunId && !options.stateArtifactId) { const origin = await imported(options, options.candidateRunId, options.candidateArtifactId, 'hansard-candidate', options.work); requireOrigin(metadata.runId === origin.runId && metadata.codeFingerprint === origin.codeFingerprint, 'Unselected accepted state has no authenticated origin'); } return settings; }
  }
  if (previous) { const proof = { ...previous, success: true }; settings.servedBaseline = await validateHistoricalServedBaseline(proof, previous.authenticatedOrigin, settings); }
  else requireOrigin(checkpoint === null, 'Known publication retention baseline is unrecoverable'); return settings;
}

/** Evaluates exact imported current evidence using existing authoritative documentation/performance gates.
 * @param options Independently authenticated report/test-origin context.
 * @param accepted Actual measured frozen candidate/source snapshot.
 * @returns A concrete missing/failed-evidence reason, or null only when all checks pass.
 * @throws On malformed trust/test-origin context or a mismatched actual preview.
 */
async function evidence(options: PublicationOptions, accepted: Awaited<ReturnType<typeof frozen>>): Promise<string | null> {
  const reports: Record<string, Record<string, unknown>> = {};
  for (const name of ['performance', 'documentation', 'automated', 'source']) { const input = await json(join(options.work, 'reports', name + '.json')); if (input === null) return 'Required ' + name + ' evidence is missing'; const report = object(input);
    if (!isCandidate(report.candidate) || !sameCandidate(report.candidate, accepted.candidate) || !isCurrentReview(report.reviewedAt, now(options))) return name + ' evidence does not match the exact current candidate'; reports[name] = report; }
  await validateReviewedTdd(reports.automated, options.root);
  const automated = object(reports.automated.checks); for (const key of ['type', 'unit', 'build', 'browser', 'source']) if (automated[key] !== true) return 'Required automated ' + key + ' check failed';
  const source = reports.source; let available = 0; let retained = 0; let unavailable = 0; for (const sitting of accepted.catalogue.sittings) { if (sitting.record.availability === 'unavailable') unavailable++; else available++; if (sitting.record.availability === 'retained') retained++; }
  if (source.reviewed !== true || source.expected !== accepted.catalogue.sittings.length || source.accounted !== source.expected || source.available !== available || source.retained !== retained || source.unavailable !== unavailable) return 'Full source evidence/accounting is missing or failed';
  if (checkDocumentation({ root: options.root, candidate: accepted.candidate, reportPath: join(options.work, 'reports/documentation.json'), now: now(options) }).length) return 'Required exact documentation accuracy/coverage evidence failed';
  const testOrigin = validateTestOrigin(options.testOrigin, options.repository);
  const performance = reports.performance; const suppliedSizes = object(performance.sizes); requireOrigin(suppliedSizes.artifactDigest === accepted.sizes.artifactDigest && JSON.stringify(suppliedSizes.files) === JSON.stringify(accepted.sizes.files), 'Observed performance file set differs from actual frozen artifact');
  const coverage = object(performance.sourceCoverage); requireOrigin(coverage.expected === accepted.catalogue.sittings.length && coverage.accounted === coverage.expected && coverage.availableRecords === available && coverage.snapshotId === accepted.candidate.snapshotId, 'Observed performance source coverage differs');
  requireOrigin(Array.isArray(performance.devices), 'Physical target evidence is missing'); for (const input of performance.devices) requireOrigin(object(input).url === testOrigin, 'Physical target URL is not the configured trusted candidate origin');
  try { evaluateBudgets({ ...performance, expectedCandidate: accepted.candidate, expectedRepository: options.repository, now: now(options), origin: { trusted: true, repository: options.repository, branch: 'main' }, sizes: accepted.sizes }); } catch (error) { return error instanceof Error ? error.message : 'Required performance evidence failed'; }
  await probe(testOrigin, accepted.candidate.snapshotId, accepted.catalogueDigest, accepted.sizes.files, options); return null;
}
/** Correlates the real completed deployment job/status and performs the fixed-base live proof.
 * @param options Actual promotion execution context.
 * @param run Independently authenticated current run.
 * @param accepted Original complete frozen candidate.
 * @param fields Mutable actual-run journal facts, updated only from observed provider action state.
 * @returns GitHub-confirmed deployment time plus actual subsequent live-verification time.
 * @throws On absent/ambiguous deployment correlation, missing confirmed time or failed live proof.
 * @remarks Records observed action success/failure/skip separately from the enclosing deployment job result.
 */
async function deploymentReceipt(options: PublicationOptions, run: Record<string, unknown>, accepted: Awaited<ReturnType<typeof frozen>>, fields: Record<string, unknown>): Promise<DeploymentReceipt> {
  const jobs = await github('/actions/runs/' + options.runId + '/attempts/' + options.runAttempt + '/jobs', options); requireOrigin(Array.isArray(jobs.jobs), 'Provider deployment jobs are unavailable'); let deploying: Record<string, unknown> | null = null;
  for (const input of jobs.jobs) { const job = object(input); if (job.name === 'deploy' && job.status === 'completed' && job.conclusion === 'success') { requireOrigin(id(job.run_id) === options.runId && job.head_sha === options.sourceRevision && deploying === null, 'Deployment job producing run/revision is ambiguous'); deploying = job; } }
  requireOrigin(deploying && typeof deploying.html_url === 'string', 'No unique completed current deployment job');
  const jobUrl = new URL(deploying.html_url); requireOrigin(jobUrl.origin === 'https://github.com' && (jobUrl.pathname === '/' + options.repository + '/actions/runs/' + options.runId + '/job/' + id(deploying.id) || jobUrl.pathname === '/' + options.repository + '/runs/' + options.runId + '/jobs/' + id(deploying.id)) && !jobUrl.search && !jobUrl.hash, 'Invalid provider deployment job URL');
  if (!Array.isArray(deploying.steps)) { fields.deploymentOutcome = 'not-attempted'; requireOrigin(false, 'Executed deployment action proof is missing'); } let executed = 0; let action: Record<string, unknown> | null = null;
  for (const input of deploying.steps) { const step = object(input); if (step.name === 'Deploy exact candidate') { executed++; action = step; } }
  fields.deploymentOutcome = executed === 0 ? 'not-attempted' : executed !== 1 ? 'unconfirmed' : action?.conclusion === 'skipped' ? 'not-attempted' : action?.conclusion === 'failure' || action?.conclusion === 'cancelled' ? 'failed' : action?.status === 'completed' && action?.conclusion === 'success' ? 'success' : 'unconfirmed';
  if (fields.deploymentOutcome === 'not-attempted') fields.confirmationOutcome = 'not-attempted';
  requireOrigin(executed === 1 && fields.deploymentOutcome === 'success', 'No unique successfully executed reviewed Pages deployment action');
  const deployments = await githubValue('/deployments?per_page=100&sha=' + options.sourceRevision + '&environment=github-pages', options); requireOrigin(Array.isArray(deployments), 'Provider environment deployments unavailable'); let confirmed: { id: string; at: string } | null = null;
  for (const input of deployments) { const deployment = object(input); if (deployment.sha !== run.head_sha || deployment.environment !== 'github-pages' || deployment.ref !== 'main') continue;
    const deploymentId = id(deployment.id); const expected = 'https://api.github.com/repos/' + options.repository + '/deployments/' + deploymentId; requireOrigin(deployment.statuses_url === expected + '/statuses', 'Provider deployment identity mismatch');
    const statuses = await githubValue('/deployments/' + deploymentId + '/statuses', options); requireOrigin(Array.isArray(statuses), 'Provider deployment statuses unavailable');
    for (const item of statuses) { const status = object(item); if (status.log_url !== deploying.html_url) continue;
      requireOrigin(status.state === 'success' && status.environment === 'github-pages' && status.environment_url === pagesBase(options) && status.deployment_url === expected, 'Deployment environment confirmation mismatch');
      const published = instant(status.created_at, Date.parse(now(options))); requireOrigin(published >= Date.parse(accepted.catalogue.preparedAt), 'Deployment confirmation predates preparation'); requireOrigin(confirmed === null, 'Ambiguous confirmed deployment'); confirmed = { id: deploymentId, at: status.created_at as string }; }
  }
  requireOrigin(confirmed, 'Provider lacks uniquely correlated successful environment deployment'); const pages = await github('/pages/deployments/' + options.sourceRevision, options); requireOrigin(pages.status === 'succeed', 'Pages deployment is not confirmed successful');
  await probe(pagesBase(options), accepted.candidate.snapshotId, accepted.catalogueDigest, accepted.sizes.files, options);
  return { snapshotId: accepted.candidate.snapshotId, deploymentId: confirmed.id, publishedAt: confirmed.at, verifiedServedAt: now(options), workflowUrl: 'https://github.com/' + options.repository + '/actions/runs/' + options.runId };
}
/** Resolves original candidate acquisition bytes independently of a potentially newer accepted checkpoint.
 * @param options Fixed original-acquired-state and current accepted-state paths.
 * @param accepted Independently authenticated measured frozen candidate.
 * @returns Coherent original source checkpoint/root and its genuine acquisition fingerprint.
 * @throws On contradictory source checkpoint, bytes or producer.
 * @remarks Constructs a private source-only checkpoint from authenticated frozen bytes when no original state transport exists.
 */
async function candidateCheckpoint(options: PublicationOptions, accepted: Awaited<ReturnType<typeof frozen>>): Promise<{ checkpoint: unknown; root: string; codeFingerprint: string }> {
  const origin = object(await json(join(options.work, 'origin.json'))); requireOrigin(typeof origin.codeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(origin.codeFingerprint), 'Original candidate acquisition fingerprint missing');
  const root = join(options.work, 'acquired-state'); const imported = await json(join(root, 'checkpoint.json'));
  if (imported !== null) { const metadata = object(imported); requireOrigin(metadata.catalogueDigest === accepted.catalogueDigest && metadata.codeFingerprint === origin.codeFingerprint && metadata.runId === origin.runId, 'Original candidate checkpoint producer/digest mismatch'); await readPublicationCheckpoint(imported, { ...acquisition(options, root), codeFingerprint: origin.codeFingerprint }); return { checkpoint: imported, root, codeFingerprint: origin.codeFingerprint }; }
  const shardDigests: Record<string, string> = {}; const shardRoot = 'snapshots/frozen-candidate';
  for (const sitting of accepted.catalogue.sittings) if (sitting.record.path) { const bytes = await readFile(join(options.work, 'artifact', sitting.record.path)); shardDigests[sitting.id] = hash(bytes); await mkdir(join(root, shardRoot, 'sittings'), { recursive: true }); await writeFile(join(root, shardRoot, 'sittings', sitting.id + '.json.gz'), bytes); }
  const checkpoint = { schemaVersion: 1, originKind: 'workflow-artifact', publicationEligible: true, success: true, repository: options.repository, branch: 'main', runId: origin.runId, runAttempt: origin.runAttempt,
    codeFingerprint: origin.codeFingerprint, createdAt: accepted.catalogue.preparedAt, workflowUrl: 'https://github.com/' + options.repository + '/actions/runs/' + origin.runId, catalogue: accepted.catalogue, catalogueDigest: accepted.catalogueDigest, shardDigests, shardRoot, servedReceipt: accepted.catalogue.status.lastConfirmedDeployment };
  await put(join(root, 'checkpoint.json'), checkpoint); await readPublicationCheckpoint(checkpoint, { ...acquisition(options, root), codeFingerprint: origin.codeFingerprint }); return { checkpoint, root, codeFingerprint: origin.codeFingerprint };
}
/** Copies only the exact accepted checkpoint and its referenced shard root for seven-day private transport.
 * @param state Validated original accepted-state directory.
 * @param target Separate candidate/served bundle directory.
 * @returns Completion after copying original checkpoint/payload bytes, excluding raw receipts and run journals.
 * @throws On missing checkpoint or native copy failure.
 * @remarks Replaces only the fixed private bundle target, never the accepted source directory.
 */
async function copyAccepted(state: string, target: string): Promise<void> {
  const checkpoint = object(await json(join(state, 'checkpoint.json'))); const shardRoot = checkpoint.shardRoot === undefined ? '' : String(checkpoint.shardRoot);
  requireOrigin(shardRoot === '' || /^snapshots\/[A-Za-z0-9_-]+$/.test(shardRoot), 'Unsafe accepted bundle shard root');
  await rm(target, { recursive: true, force: true }); await mkdir(target, { recursive: true }); await cp(join(state, 'checkpoint.json'), join(target, 'checkpoint.json'));
  await mkdir(join(target, shardRoot), { recursive: true }); await cp(join(state, shardRoot, 'sittings'), join(target, shardRoot, 'sittings'), { recursive: true });
}
/** Records failure honestly while avoiding output writes into rejected deployed metadata paths.
 * @param supplied Original attempted executing context.
 * @param options Fully validated context, or null before path validation.
 * @param error Actual observed failure.
 * @param fields Actual stage/job facts already observed.
 * @returns A durable failed outcome with no publication receipt.
 * @throws On invalid executing identifiers or unavailable safe private outcome storage.
 */
async function failureOutcome(supplied: unknown, options: PublicationOptions | null, error: unknown, fields: Record<string, unknown>): Promise<PublicationResult> {
  const raw = object(supplied); const chosen = options ?? { ...raw, work: join(String(raw.state), 'publication-failures', id(raw.runId) + '-' + String(raw.runAttempt)) } as unknown as PublicationOptions;
  const result: PublicationResult = { outcome: 'failed', candidate: null, receipt: null, reason: error instanceof Error ? error.message : String(error) }; return outcome(chosen, result, fields);
}

/** Acquires, builds and validates a new frozen candidate, then terminates awaiting exact evidence.
 * @param supplied Actual workflow context, fixed private paths and controlled boundaries.
 * @returns Actual frozen candidate or a durable failed preparation outcome.
 * @throws On unavailable required private outcome storage.
 * @remarks Performs real acquisition/build/checks and writes only generated data and separate private candidate/state metadata.
 */
export async function preparePublication(supplied: unknown): Promise<PublicationResult> {
  let options: PublicationOptions | null = null; const fields: Record<string, unknown> = { acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted', deploymentOutcome: 'not-attempted' };
  try {
    options = await context(supplied); await currentRun(options); const previous = await prior(options); const settings = await baseline(options, previous); const sessionId = await resume(options);
    if (sessionId) { settings.sessionId = sessionId; fields.resumeSessionId = sessionId; }
    const acquired = await acquire(settings); fields.acquisitionOutcome = acquired.catalogue.status.acquisitionOutcome; fields.stagingOutcome = 'failed';
    const command = options.command ?? commands; await command('build', options.root); await command('checks', options.root);
    const built = join(options.root, 'dist'); const sizes = await measureArtifact(built); requireOrigin(sizes.complete && sizes.snapshot?.snapshotId === acquired.catalogue.snapshotId, 'Built artifact is not complete accepted source');
    const manifest = await createFixtureManifest(built, sizes, acquired.catalogue);
    const candidate: DocumentationCandidate = { sourceRevision: options.sourceRevision, applicationFingerprint: await applicationFingerprint(options.root), artifactDigest: sizes.artifactDigest, snapshotId: acquired.catalogue.snapshotId,
      fixtureHashes: selectedFixtureHashes(sizes, manifest), conditionsDigest: conditionsDigest(),
      priorServedBaselineDigest: previous?.artifactDigest as string ?? null };
    await rm(join(options.work, 'artifact'), { recursive: true, force: true }); await cp(built, join(options.work, 'artifact'), { recursive: true });
    requireOrigin((await measureArtifact(join(options.work, 'artifact'))).artifactDigest === candidate.artifactDigest, 'Frozen copied artifact differs');
    await put(join(options.work, 'candidate.json'), candidate); await put(join(options.work, 'fixtures.json'), manifest);
    await put(join(options.work, 'origin.json'), { repository: options.repository, branch: 'main', runId: options.runId, runAttempt: options.runAttempt, sourceRevision: options.sourceRevision, codeFingerprint: options.codeFingerprint });
    await put(join(options.work, 'reports/automated.json'), { candidate, reviewedAt: now(options), checks: { type: true, unit: true, build: true, browser: true, source: sizes.sourceVerified } });
    await copyAccepted(options.state, join(options.work, 'acquired-state'));
    await put(join(options.state, 'origin.json'), { repository: options.repository, branch: 'main', runId: options.runId, runAttempt: options.runAttempt, sourceRevision: options.sourceRevision, codeFingerprint: options.codeFingerprint });
    await cp(join(options.state, 'origin.json'), join(options.work, 'acquired-state/origin.json'));
    fields.stagingOutcome = 'success'; fields.deploymentOutcome = 'awaiting-evidence'; return await outcome(options, { outcome: 'awaiting-evidence', candidate, receipt: null, reason: 'Fresh exact candidate requires reviewed performance, physical-device, source and documentation evidence' }, fields);
  } catch (error) { return failureOutcome(supplied, options, error, fields); }
}

/** Validates exact imported candidate/evidence bytes for no-rebuild deployment eligibility.
 * @param supplied Candidate/evidence artifact IDs and executing context.
 * @returns Ready only after every current gate; otherwise a durable awaiting/failed outcome.
 * @throws On required private outcome-storage failure.
 * @remarks Restores authenticated original tar when needed and writes only private outcome metadata; it never acquires or builds.
 */
export async function promotePublication(supplied: unknown): Promise<PublicationResult> {
  let options: PublicationOptions | null = null;
  try {
    options = await context(supplied); await currentRun(options); const accepted = await frozen(options); const previous = await prior(options);
    requireOrigin((previous?.artifactDigest ?? null) === accepted.candidate.priorServedBaselineDigest, 'Frozen candidate prior served baseline was superseded');
    if (previous) await probe(pagesBase(options), String(object(previous.receipt).snapshotId), String(previous.catalogueDigest), previous.files, options);
    await imported(options, options.evidenceRunId, options.evidenceArtifactId, 'hansard-evidence', join(options.work, 'reports'));
    const ready = await evidence(options, accepted); if (ready !== null) return outcome(options, { outcome: 'awaiting-evidence', candidate: accepted.candidate, receipt: null, reason: ready }, { deploymentOutcome: 'awaiting-evidence' });
    return outcome(options, { outcome: 'ready', candidate: accepted.candidate, receipt: null, reason: null }, { deploymentOutcome: 'ready' });
  } catch (error) { return failureOutcome(supplied, options, error, { deploymentOutcome: 'failed' }); }
}

/** Records actual job outcomes and confirms successful Pages delivery separately from frozen bytes.
 * @param supplied Actual candidate/deployment job results and executing context.
 * @returns Validated confirmed receipt only after matching provider deployment and live catalogue proof.
 * @throws On required private outcome-storage failure.
 * @remarks Saves external confirmed metadata and current-run outcomes; frozen catalogue/artifact bytes and newer checkpoints stay unchanged.
 */
export async function finalizePublication(supplied: unknown): Promise<PublicationResult> {
  let options: PublicationOptions | null = null; const fields: Record<string, unknown> = {};
  try {
    options = await context(supplied); fields.candidateResult = options.candidateResult; fields.deployResult = options.deployResult;
    for (const value of [options.candidateResult, options.deployResult]) requireOrigin(['success', 'failure', 'cancelled', 'skipped'].includes(String(value)), 'Invalid actual publication job result');
    if (options.deployResult !== 'success') { fields.deploymentOutcome = options.deployResult === 'failure' ? 'failed' : 'not-attempted'; return outcome(options, { outcome: 'failed', candidate: null, receipt: null, reason: 'Deployment ' + fields.deploymentOutcome }, fields); }
    fields.deploymentOutcome = 'unconfirmed'; fields.confirmationOutcome = 'failed'; const run = await currentRun(options); const accepted = await frozen(options);
    await imported(options, options.runId, options.pagesArtifactId, 'github-pages', options.work, options.sourceRevision);
    const receipt = await deploymentReceipt(options, run, accepted, fields);
    const original = await candidateCheckpoint(options, accepted); const binding = { receipt, artifactDigest: accepted.candidate.artifactDigest, catalogueDigest: accepted.catalogueDigest };
    const finalized = await finalizeAcquiredCheckpoint(original.checkpoint, binding, { ...acquisition(options, original.root), codeFingerprint: original.codeFingerprint });
    const proof = { repository: options.repository, branch: 'main', runId: options.runId, runAttempt: options.runAttempt, acquisitionRunId: object(original.checkpoint).runId, sourceRevision: options.sourceRevision, codeFingerprint: original.codeFingerprint,
      receipt, artifactDigest: accepted.candidate.artifactDigest, catalogueDigest: accepted.catalogueDigest, shardDigests: object(original.checkpoint).shardDigests, baseUrl: pagesBase(options), files: accepted.sizes.files };
    const current = await json(join(options.state, 'checkpoint.json')); if (current && object(object(current).catalogue).snapshotId === accepted.candidate.snapshotId) await put(join(options.state, 'checkpoint.json'), finalized);
    await put(join(options.state, 'served-publication.json'), proof);
    const confirmed = join(options.work, 'confirmed-served'); await copyAccepted(original.root, confirmed);
    await put(join(confirmed, 'checkpoint.json'), finalized); await put(join(confirmed, 'served-publication.json'), proof);
    const origin = { repository: options.repository, branch: 'main', runId: options.runId, runAttempt: options.runAttempt, acquisitionRunId: proof.acquisitionRunId, sourceRevision: options.sourceRevision, codeFingerprint: original.codeFingerprint };
    await put(join(confirmed, 'origin.json'), origin); await put(join(options.work, 'served-origin.json'), origin);
    fields.confirmationOutcome = 'success'; return outcome(options, { outcome: 'finalized', candidate: accepted.candidate, receipt, reason: null }, fields);
  } catch (error) { return failureOutcome(supplied, options, error, fields); }
}

/** Runs only the reviewed-workflow CLI with fixed private layout and validated environment IDs.
 * @returns Completion after actual controller outcome and safe workflow outputs.
 * @throws On unsupported operation, nonworkflow context or invalid required identities.
 * @remarks Executes real boundaries, records private outcomes/summary and sets process exitCode on failure.
 */
async function cli(): Promise<void> {
  const operation = process.argv[2]; requireOrigin(process.argv.length === 3 && ['prepare', 'promote', 'finalize'].includes(operation), 'Use node scripts/publication.ts prepare|promote|finalize');
  requireOrigin(process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REF_NAME === 'main' && process.env.GITHUB_REPOSITORY && process.env.GITHUB_SHA && process.env.GITHUB_RUN_ID, 'Publication CLI requires actual reviewed main GitHub workflow context');
  const root = process.cwd(); const work = resolve(process.env.HANSARD_WORK ?? join(process.env.RUNNER_TEMP ?? '', 'hansard-publication')); const state = resolve(process.env.HANSARD_STATE ?? '.cache/hansard');
  requireOrigin(state === join(root, '.cache/hansard') && process.env.RUNNER_TEMP && work === join(resolve(process.env.RUNNER_TEMP), 'hansard-publication'), 'Publication CLI private paths must match reviewed workflow layout');
  const codeFingerprint = hash(Buffer.concat([await readFile(join(root, 'src/source.ts')), await readFile(join(root, 'scripts/acquire.ts')), await readFile(join(root, 'package-lock.json'))]));
  const options: PublicationOptions = { root, work, state, repository: process.env.GITHUB_REPOSITORY, branch: 'main', sourceRevision: process.env.GITHUB_SHA, runId: id(process.env.GITHUB_RUN_ID), runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), codeFingerprint,
    testOrigin: process.env.HANSARD_TEST_ORIGIN, candidateResult: process.env.HANSARD_CANDIDATE_RESULT, deployResult: process.env.HANSARD_DEPLOY_RESULT };
  const names = { candidateRunId: 'HANSARD_CANDIDATE_RUN_ID', candidateArtifactId: 'HANSARD_CANDIDATE_ARTIFACT_ID', pagesCandidateArtifactId: 'HANSARD_PAGES_CANDIDATE_ARTIFACT_ID', evidenceRunId: 'HANSARD_EVIDENCE_RUN_ID', evidenceArtifactId: 'HANSARD_EVIDENCE_ARTIFACT_ID', stateRunId: 'HANSARD_STATE_RUN_ID', stateArtifactId: 'HANSARD_STATE_ARTIFACT_ID', resumeRunId: 'HANSARD_RESUME_RUN_ID', resumeArtifactId: 'HANSARD_RESUME_ARTIFACT_ID', servedRunId: 'HANSARD_SERVED_RUN_ID', servedArtifactId: 'HANSARD_SERVED_ARTIFACT_ID', pagesArtifactId: 'HANSARD_PAGES_ARTIFACT_ID' } as const;
  for (const [key, variable] of Object.entries(names)) if (process.env[variable]) options[key as keyof typeof names] = id(process.env[variable]);
  if (operation === 'promote') requireOrigin(options.candidateRunId && options.candidateArtifactId && options.pagesCandidateArtifactId && options.evidenceRunId && options.evidenceArtifactId, 'Promotion exact candidate/evidence artifact identities missing');
  if (operation === 'finalize') for (const value of [options.candidateResult, options.deployResult]) requireOrigin(['success', 'failure', 'cancelled', 'skipped'].includes(String(value)), 'Finalization actual job results missing/invalid');
  const result = operation === 'prepare' ? await preparePublication(options) : operation === 'promote' ? await promotePublication(options) : await finalizePublication(options);
  const output = { ready: String(result.outcome === 'ready'), outcome: result.outcome, snapshotId: result.candidate?.snapshotId ?? '', artifactDigest: result.candidate?.artifactDigest ?? '' };
  if (process.env.GITHUB_OUTPUT) for (const [key, value] of Object.entries(output)) await appendFile(process.env.GITHUB_OUTPUT, key + '=' + value + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, 'Hansard publication outcome: **' + result.outcome + '**\n\n' + (result.reason ?? 'Exact candidate/provider/live checks passed.') + '\n');
  console.log(JSON.stringify(result)); if (result.outcome === 'failed' && !(operation === 'finalize' && options.deployResult !== 'success')) process.exitCode = 1;
}

/** Reports actual CLI rejection without a successful no-op exit.
 * @param error Actual controller/context failure.
 * @remarks Writes a bounded error message and sets nonzero process exitCode.
 */
function cliFailure(error: unknown): void { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await cli().catch(cliFailure);
