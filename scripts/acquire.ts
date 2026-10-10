import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, realpath, lstat, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { DATA_LIMITS, normalizeSourceRecord, parseSourceInventory, parseSourceMembers, sourceAccounting, validateCatalogue, validateSittingRecord } from '../src/source.ts';
import type { Catalogue, DeploymentReceipt, InventorySitting, Member, RecordDescriptor, Sitting, SittingRecord } from '../src/source.ts';
import { authenticatedConfirmedPublication, authenticatedPublicationOrigin } from './publication.ts';

const origin = 'https://hansard.parlimen.gov.my';
const fourHours = 14_400_000;
const sevenDays = 604_800_000;

/** Byte measurements of all staged public data, including retained shards. */
export interface ResourceSizes {
  catalogue: { compressedBytes: number; decodedBytes: number };
  sittings: Array<{ compressedBytes: number; decodedBytes: number }>;
  totalBytes: number;
}

/** Ordered incremental targets and the oldest successful stable historical bucket. */
export interface RefreshPlan {
  sittingIds: string[];
  historicalBucket: number;
  overdueIds: string[];
}

/**
 * Plans deduplicated refresh priorities without advancing acquisition or sweep timestamps.
 * Buckets use the full SHA-256 of the exact canonical source ID encoded as UTF-8,
 * interpreted as an unsigned integer modulo six. Null bucket checks precede dated checks;
 * equal check times use the bucket index. Priority is new/unavailable, prior failure,
 * latest thirty dated sittings, overdue successful checks, then the selected bucket.
 * @param previous Accepted catalogue, or null when a full bootstrap is required.
 * @param latest Complete freshly validated official inventory.
 * @param now Current UTC milliseconds for strict greater-than-24-hour overdue checks.
 * @param bucketChecks Six nullable UTC timestamps of completed successful bucket sweeps.
 * @returns Ordered source IDs, selected bucket and independently overdue IDs.
 * @throws On malformed planning inputs or unsupported bucket-check timestamps.
 */
export function planRefresh(previous: Catalogue | null, latest: InventorySitting[], now: number, bucketChecks: readonly (string | null)[]): RefreshPlan {
  check(Number.isFinite(now), 'Invalid refresh clock'); const checks = bucketHistory(bucketChecks, now);
  if (previous) validateCatalogue(previous);
  let historicalBucket = 0;
  for (let index = 1; index < 6; index++) if ((checks[index] === null ? -Infinity : Date.parse(checks[index]!)) < (checks[historicalBucket] === null ? -Infinity : Date.parse(checks[historicalBucket]!))) historicalBucket = index;
  const prior = new Map<string, Sitting>(); for (const sitting of previous?.sittings ?? []) prior.set(sitting.id, sitting);
  const all = new Map<string, InventorySitting>(); for (const sitting of prior.values()) all.set(sitting.id, sitting); for (const sitting of latest) all.set(sitting.id, sitting);
  const sittingIds: string[] = []; const seen = new Set<string>();
  /** Appends one deduplicated priority group without mutating source inputs.
   * @param group Ordered source identities for this priority.
   * @remarks Appends only local target IDs and deduplication state.
   */
  function append(group: InventorySitting[]): void { for (const sitting of group) if (!seen.has(sitting.id)) { seen.add(sitting.id); sittingIds.push(sitting.id); } }
  /** Orders historical work by its accepted successful check, then exact source ID.
   * @param left First source identity.
   * @param right Second source identity.
   * @returns Oldest accepted acquisition first, with deterministic lexical ties.
   */
  function oldest(left: InventorySitting, right: InventorySitting): number { const leftTime = prior.get(left.id)?.record.acquiredAt; const rightTime = prior.get(right.id)?.record.acquiredAt;
    return (leftTime == null ? -Infinity : Date.parse(leftTime)) - (rightTime == null ? -Infinity : Date.parse(rightTime)) || exactOrder(left.id, right.id); }
  const fresh: InventorySitting[] = []; const failed: Sitting[] = []; const overdue: Sitting[] = []; const historical: InventorySitting[] = [];
  for (const sitting of all.values()) {
    const old = prior.get(sitting.id);
    if (!old || old.record.availability === 'unavailable') fresh.push(sitting);
    if (old?.record.lastAttemptOutcome === 'failed') failed.push(old);
    if (old?.record.acquiredAt && now - Date.parse(old.record.acquiredAt) > 86_400_000) overdue.push(old);
    if (refreshBucket(sitting.id) === historicalBucket) historical.push(sitting);
  }
  fresh.sort(newestSitting); failed.sort(
    /** Orders prior failed attempts by their known failed-attempt time.
     * @param left First prior failure.
     * @param right Second prior failure.
     * @returns Oldest failed attempt first, with exact ID ties.
     */
    function oldestFailure(left, right): number { return Date.parse(left.record.lastAttemptAt) - Date.parse(right.record.lastAttemptAt) || exactOrder(left.id, right.id); });
  overdue.sort(oldest); historical.sort(oldest); append(fresh); append(failed); append([...latest].sort(newestSitting).slice(0, 30)); append(overdue); append(historical);
  const overdueIds: string[] = []; for (const sitting of overdue) overdueIds.push(sitting.id);
  return { sittingIds, historicalBucket, overdueIds };
}

/** Orders exact strings by code points rather than locale-dependent collation.
 * @param left First source ID or canonical UTC instant.
 * @param right Second source ID or canonical UTC instant.
 * @returns Stable ascending comparison.
 */
function exactOrder(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
/** Orders dated source identities newest-first with exact ID ties.
 * @param left First source identity.
 * @param right Second source identity.
 * @returns Deterministic newest-first comparison.
 */
function newestSitting(left: InventorySitting, right: InventorySitting): number { return exactOrder(right.date, left.date) || exactOrder(left.id, right.id); }
/** Computes the specified full SHA-256 modulo-six historical bucket.
 * @param id Exact canonical source ID already validated by source rules.
 * @returns Stable historical bucket from zero through five.
 */
function refreshBucket(id: string): number { return Number(BigInt('0x' + digest(Buffer.from(id))) % 6n); }
/** Validates a real nonfuture UTC timestamp without calendar normalization.
 * @param value Untrusted private timestamp.
 * @param now Independent current acquisition clock.
 * @returns Validated unchanged UTC string.
 * @throws On malformed, impossible or future private time.
 */
function checkedTime(value: unknown, now: number): string {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), 'Invalid private refresh time');
  const time = Date.parse(value); const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  check(Number.isFinite(time) && new Date(time).toISOString() === canonical && time <= now, 'Impossible or future private refresh time'); return value;
}
/** Validates the exact six nullable successful bucket-completion times.
 * @param input Untrusted bucket history.
 * @param now Independent current acquisition clock.
 * @returns A validated new six-entry history array.
 * @throws On wrong shape, malformed/calendar-invalid/future time.
 */
function bucketHistory(input: unknown, now: number): (string | null)[] {
  check(Array.isArray(input) && input.length === 6, 'Invalid six-bucket history'); const result: (string | null)[] = [];
  for (const value of input) result.push(value === null ? null : checkedTime(value, now)); return result;
}

/** Concrete acquisition boundaries; filesystem hooks are for controlled unit verification. */
export interface AcquisitionOptions {
  state: string;
  out: string;
  mode: 'bootstrap' | 'refresh';
  transport?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  repository: string;
  branch: string;
  codeFingerprint: string;
  sessionId?: string;
  runId?: string;
  workflowUrl?: string | null;
  workflowContext?: boolean;
  servedBaseline?: ServedBaseline;
  /** In-process confirmed-publication binding; downloaded scalar trust claims never authorize history. */
  confirmedPublication?: unknown;
  measureSizes?: (path: string, actual: ResourceSizes) => Promise<unknown>;
  rename?: typeof rename;
}

/** Independently supplied trusted publication evidence, separate from official-source access. */
export interface ServedBaseline {
  repository: string;
  branch: string;
  runId: string;
  success: boolean;
  codeFingerprint: string;
  receipt: DeploymentReceipt;
  catalogueDigest: string;
  shardDigests: Record<string, string>;
  baseUrl: string;
  transport?: typeof fetch;
}

/** Private successful-response evidence; never included in generated public data. */
interface RawReceipt {
  path: string;
  rawDigest: string;
  url: string;
  startedAt: string;
  acquiredAt: string;
  status: number;
}

/** Mutable request coordination shared by every request and retry in one acquisition run. */
interface RequestContext {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  startedAt: number;
  lastStartedAt: number | null;
  consume?: (response: Response, url: string, startedAt: number) => Promise<void>;
}

/** Validated accepted state and its exact stored gzip payloads. */
interface AcceptedState { catalogue: Catalogue; shards: Map<string, Uint8Array>; bucketChecks?: (string | null)[]; confirmedDeployment?: DeploymentReceipt | null }
const historicalBaselines = new WeakMap<ServedBaseline, { codeFingerprint: string; state: AcceptedState }>();

/** Validates historical served compatibility without replacing its genuine code fingerprint.
 * @param proof Original served origin, receipt and exact stored catalogue/shard digests.
 * @param authenticatedOrigin Independently API-validated historical run/artifact context.
 * @param options Current acquisition code, repository and private paths.
 * @returns An immutable, independently authenticated compatible served recovery proof.
 * @throws On unauthenticated/changed origin, receipt, schema, resource or digest mismatch.
 * @remarks Registers only validated in-process historical proofs for current-code recovery.
 */
export async function validateHistoricalServedBaseline(proof: unknown, authenticatedOrigin: unknown, options: AcquisitionOptions): Promise<ServedBaseline> {
  const origin = authenticatedPublicationOrigin(authenticatedOrigin, 'hansard-served'); const metadata = object(proof);
  check(origin.repository === options.repository && metadata.repository === origin.repository && metadata.branch === 'main' && metadata.runId === origin.runId && metadata.success === true && metadata.codeFingerprint === origin.codeFingerprint && origin.codeFingerprint !== null, 'Historical served origin mismatch');
  const receipt = object(metadata.receipt);
  check(receipt.workflowUrl === 'https://github.com/' + options.repository + '/actions/runs/' + origin.runId, 'Historical receipt producer mismatch');
  check(Date.parse(String(receipt.verifiedServedAt)) <= Date.parse(origin.createdAt), 'Served artifact predates its confirmation');
  const validated = { ...metadata, transport: options.transport } as unknown as ServedBaseline;
  const state = await recoverServed({ ...options, codeFingerprint: origin.codeFingerprint, servedBaseline: validated });
  const result = Object.freeze({ ...validated, receipt: Object.freeze({ ...validated.receipt }), shardDigests: Object.freeze({ ...validated.shardDigests }) });
  historicalBaselines.set(result, { codeFingerprint: origin.codeFingerprint, state }); return result;
}

/** Attaches external served binding while preserving the original accepted catalogue/checksum.
 * @param input Original accepted checkpoint whose catalogue bytes remain immutable.
 * @param binding Validated current-snapshot receipt and original artifact/catalogue digests.
 * @param options Current acquisition code, repository and private state path.
 * @returns Validated checkpoint metadata with its separate served binding.
 * @throws On invalid accepted state, receipt or digest binding.
 */
export async function finalizeAcquiredCheckpoint(input: unknown, binding: unknown, options: AcquisitionOptions): Promise<unknown> {
  const accepted = await loadCheckpoint(input, options); const metadata = object(input); const servedPublication = validateServedBinding(binding, accepted.catalogue, metadata.catalogueDigest, options);
  check(metadata.originKind === 'workflow-artifact', 'Local state cannot be finalized as publication');
  return { ...metadata, servedPublication };
}

/** Reloads exact accepted bytes plus independently validated external served metadata.
 * @param input Original accepted checkpoint with unchanged catalogue digest.
 * @param options Current code/repository and private stored-payload path.
 * @returns Original immutable catalogue/shards and separately known confirmed deployment.
 * @throws On accepted-state or external served-binding contradictions.
 */
export async function readPublicationCheckpoint(input: unknown, options: AcquisitionOptions): Promise<AcceptedState> {
  return loadCheckpoint(input, options);
}

/** Checks a served receipt against exact accepted source identity without altering catalogue bytes.
 * @param input External receipt/artifact/catalogue binding.
 * @param catalogue Original accepted catalogue.
 * @param catalogueDigest Original decoded catalogue checksum.
 * @param options Independent current repository/clock.
 * @returns Validated separate binding with explicit original digests.
 * @throws On malformed, wrong-snapshot, premature/future or foreign receipt metadata.
 */
function validateServedBinding(input: unknown, catalogue: Catalogue, catalogueDigest: unknown, options: AcquisitionOptions): { receipt: DeploymentReceipt; artifactDigest: string; catalogueDigest: string } {
  const binding = object(input); const receipt = object(binding.receipt);
  check(binding.catalogueDigest === catalogueDigest && typeof binding.artifactDigest === 'string' && /^[a-f0-9]{64}$/.test(binding.artifactDigest), 'Served checksum binding mismatch');
  check(receipt.snapshotId === catalogue.snapshotId && typeof receipt.workflowUrl === 'string' && new RegExp('^https://github\\.com/' + options.repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/actions/runs/[1-9]\\d*$').test(receipt.workflowUrl), 'Served receipt snapshot or workflow mismatch');
  checkedTime(receipt.publishedAt, (options.now ?? Date.now)()); checkedTime(receipt.verifiedServedAt, (options.now ?? Date.now)());
  validateCatalogue({ ...catalogue, publishedAt: receipt.publishedAt, status: { ...catalogue.status, lastConfirmedDeployment: receipt } });
  return { receipt: receipt as unknown as DeploymentReceipt, artifactDigest: binding.artifactDigest, catalogueDigest: binding.catalogueDigest as string };
}

/** Original run targets and actual accepted/failed progress, without publication claims. */
interface RefreshProgress {
  targetIds: string[]; historicalBucket: number; overdueIds: string[];
  bucketChecks: (string | null)[]; completedIds: string[]; unchangedIds: string[]; changedIds: string[]; failedIds: string[];
}
/** Private started-run outcome, separate from the public catalogue and later deployment receipt. */
interface RefreshReport extends RefreshProgress {
  strategy: 'bootstrap' | 'incremental'; baseline: 'none' | 'checkpoint' | 'served' | 'unrecoverable';
  pendingIds: string[]; bucketCompleted: boolean; acquisitionOutcome: 'success' | 'degraded' | 'failed';
  stagingOutcome: 'success' | 'failed' | 'not-attempted';
}

/** Checkpointed accepted individual records; unstarted records remain only pending IDs. */
interface PartialState {
  kind: 'partial';
  originKind: 'workflow-artifact' | 'local-development';
  schemaVersion: 1;
  sessionId: string;
  repository: string;
  branch: string;
  codeFingerprint: string;
  validationSuccess: boolean;
  complete: false;
  createdAt: string;
  pendingIds: string[];
  accepted: Sitting[];
  shardDigests: Record<string, string>;
  members: Member[];
  refresh?: RefreshProgress;
  failedRecords?: Sitting[];
}

/** Validates original target/progress partitions against reconciled exact source identities.
 * @param partial Validated-envelope private partial state and accepted source descriptors.
 * @param known IDs from complete current/retained source reconciliation.
 * @param now Independent current acquisition clock.
 * @returns A new validated original plan/progress ledger.
 * @throws On unsupported buckets, duplicate/unknown IDs, inconsistent progress or missing failed-attempt evidence.
 */
function partialProgress(partial: PartialState, known: Set<string>, now: number): RefreshProgress {
  const input = object(partial.refresh); const checks = bucketHistory(input.bucketChecks, now);
  check(Number.isInteger(input.historicalBucket) && Number(input.historicalBucket) >= 0 && Number(input.historicalBucket) < 6, 'Invalid partial historical bucket');
  /** Reads one unique exact-ID list without coercion or invented identities.
   * @param field Required private progress field.
   * @returns Unchanged valid source IDs in their recorded order.
   * @throws On unsupported list, ID, duplicate or unknown source identity.
   */
  function ids(field: string): string[] {
    const values = field === 'pendingIds' ? partial.pendingIds : input[field]; check(Array.isArray(values), 'Missing partial ' + field);
    const result: string[] = []; const seen = new Set<string>();
    for (const id of values) { check(typeof id === 'string' && known.has(id) && !seen.has(id), 'Invalid partial ' + field + ' ID'); seen.add(id); result.push(id); } return result;
  }
  const targetIds = ids('targetIds'); const completedIds = ids('completedIds'); const failedIds = ids('failedIds'); const pendingIds = ids('pendingIds');
  const changedIds = ids('changedIds'); const unchangedIds = ids('unchangedIds'); const overdueIds = ids('overdueIds');
  const targets = new Set(targetIds); const partition = [...completedIds, ...failedIds, ...pendingIds];
  check(partition.length === targetIds.length && new Set(partition).size === targetIds.length, 'Inconsistent partial target partition');
  for (const id of partition) check(targets.has(id), 'Unexpected partial target');
  const success = new Set(completedIds); const content = [...changedIds, ...unchangedIds];
  check(content.length === success.size && new Set(content).size === success.size, 'Inconsistent changed/unchanged progress');
  for (const id of content) check(success.has(id), 'Content progress without source completion');
  const acceptedIds = new Set<string>(); for (const sitting of partial.accepted) acceptedIds.add(sitting.id);
  check(acceptedIds.size === partial.accepted.length && acceptedIds.size === success.size, 'Partial accepted/completed mismatch');
  for (const id of success) check(acceptedIds.has(id), 'Completed source without accepted payload');
  const failedRecords = partial.failedRecords ?? []; const failures = new Set<string>();
  for (const sitting of failedRecords) { check(sitting.record.lastAttemptOutcome === 'failed' && !failures.has(sitting.id), 'Invalid partial failed attempt'); failures.add(sitting.id); }
  check(failures.size === failedIds.length, 'Missing partial failed-attempt evidence'); for (const id of failedIds) check(failures.has(id), 'Missing failed source descriptor');
  const hashes = object(partial.shardDigests); check(Object.keys(hashes).length === acceptedIds.size, 'Unreferenced partial shard hash');
  for (const id of acceptedIds) check(typeof hashes[id] === 'string' && /^[a-f0-9]{64}$/.test(hashes[id] as string), 'Missing partial accepted hash');
  for (const id of overdueIds) check(targets.has(id), 'Unexpected partial overdue ID');
  return { targetIds, completedIds, failedIds, changedIds, unchangedIds, overdueIds, historicalBucket: Number(input.historicalBucket), bucketChecks: checks };
}

/** Keeps previously validated unknown-ID passages in their original historical attribution context.
 * @param sitting Accepted descriptor and source identity, with unchanged source times/hash.
 * @param record Record already validated against its original accepted member context.
 * @param known Exact identities now supplied by the reconciled current source.
 * @returns Original sitting or a retained descriptor; no words/IDs/gaps/times are repaired.
 */
function retainAttributionContext(sitting: Sitting, record: SittingRecord, known: Set<string>): Sitting {
  if (sitting.record.availability === 'available') for (const item of record.items)
    if (item.gapReason === 'unknown-id' && item.sourceAuthorId !== null && known.has(item.sourceAuthorId)) return { ...sitting, record: { ...sitting.record, availability: 'retained' } };
  return sitting;
}

/**
 * Requires a boundary invariant without silently coercing untrusted metadata.
 * @param condition Required invariant.
 * @param message Actionable rejection reason.
 * @returns Nothing when valid.
 * @throws When the invariant is false.
 */
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw failure('structural', message);
}

/**
 * Tags errors so retrieval failures cannot absorb denial, schema or run-cap failures.
 * @param kind Failure category.
 * @param message Actionable failure message.
 * @returns A new categorized error.
 * @remarks Adds the category only to the newly created error.
 */
function failure(kind: string, message: string): Error & { kind: string } {
  return Object.assign(new Error(message), { kind });
}

/**
 * Reads a categorized error without assuming every thrown value is an Error.
 * @param error Observed failure.
 * @returns Its recognized category, or undefined.
 */
function category(error: unknown): string | undefined {
  return error !== null && typeof error === 'object' && 'kind' in error ? String(error.kind) : undefined;
}

/**
 * Narrows plain JSON metadata to an object.
 * @param value Untrusted JSON value.
 * @returns The unchanged object.
 * @throws When the value is null, an array or a primitive.
 */
function object(value: unknown): Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected metadata object');
  return value as Record<string, unknown>;
}

/**
 * Hashes exact source, normalized or stored bytes without changing them.
 * @param bytes Exact UTF-8 or binary bytes.
 * @returns Lowercase SHA-256 digest.
 */
function digest(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }

/**
 * Serializes normalized application metadata with stable object insertion order.
 * @param value Validated data.
 * @returns Exact UTF-8 JSON bytes.
 */
function jsonBytes(value: unknown): Buffer { return Buffer.from(JSON.stringify(value)); }

/**
 * Converts an application clock observation to an ISO UTC instant.
 * @param time UTC epoch milliseconds.
 * @returns Its ISO UTC representation.
 * @throws When the clock is nonfinite or invalid.
 */
function instant(time: number): string {
  check(Number.isFinite(time), 'Invalid acquisition clock');
  return new Date(time).toISOString();
}

/**
 * Waits using the platform timer when a controlled test clock is not supplied.
 * @param ms Required wait duration.
 * @returns Completion after the wait.
 */
function delay(ms: number): Promise<void> {
  return new Promise(schedule);
  /**
   * Schedules the concrete platform wait.
   * @param complete Promise completion callback.
   * @returns Nothing.
   */
  function schedule(complete: () => void): void { setTimeout(complete, ms); }
}

/**
 * Parses current deployment metadata from the official public HTML.
 * @param html Official portal HTML, treated solely as inert text.
 * @returns A route-safe observed deployment build ID.
 * @throws When metadata is absent, malformed or unsafe.
 */
export function discoverBuildId(html: string): string {
  const match = /<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  check(match, 'Official deployment metadata is absent');
  let parsed: unknown;
  try { parsed = JSON.parse(match[1]); } catch { throw failure('structural', 'Malformed deployment metadata JSON'); }
  const build = object(parsed).buildId;
  check(typeof build === 'string' && /^[A-Za-z0-9_-]+$/.test(build), 'Unsafe deployment build ID');
  return build;
}

/**
 * Permits only the approved anonymous official-source routes.
 * @param input Requested absolute URL.
 * @returns Canonical approved URL.
 * @throws When origin, credentials, path or sitting-date query is unsupported.
 */
function officialUrl(input: string): string {
  const url = new URL(input);
  check(url.origin === origin && !url.username && !url.password && !url.hash, 'Nonofficial source URL');
  if (url.pathname === '/' && !url.search) return url.href;
  const prefix = '/_next/data/[A-Za-z0-9_-]+/en-GB/';
  if (new RegExp('^' + prefix + '(?:cari-mp|katalog/dewan-rakyat)\\.json$').test(url.pathname) && !url.search) return url.href;
  const sitting = new RegExp('^' + prefix + 'hansard/dewan-rakyat/(\\d{4}-\\d{2}-\\d{2})\\.json$').exec(url.pathname);
  check(sitting && url.searchParams.size === 1 && url.searchParams.get('date') === sitting[1], 'Unapproved official source route');
  return url.href;
}

/**
 * Executes one paced, abortable source attempt, including optional private body capture.
 * @param url Approved official URL.
 * @param transport Fetch boundary.
 * @param context Shared request clock, deadline and evidence capture.
 * @returns The response after a completed attempt.
 * @throws On timeout, source denial, run cap, transport or evidence failure.
 * @remarks Updates only shared pacing state and any configured private evidence.
 */
async function attempt(url: string, transport: typeof fetch, context: RequestContext): Promise<Response> {
  const deadline = context.startedAt + fourHours;
  const wait = context.lastStartedAt === null ? 0 : Math.max(0, context.lastStartedAt + 1000 - context.now());
  if (wait > 0) await context.sleep(Math.min(wait, Math.max(0, deadline - context.now())));
  if (context.now() >= deadline) throw failure('cap', 'Four-hour acquisition limit reached');
  const startedAt = context.now();
  context.lastStartedAt = startedAt;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>(scheduleTimeout);
  /**
   * Aborts this exact attempt when its fifteen-second or remaining job budget expires.
   * @param _complete Unused completion callback.
   * @param reject Timeout failure callback.
   * @returns Nothing.
   * @remarks Schedules the local timer; its expiry aborts only this request.
   */
  function scheduleTimeout(_complete: (value: never) => void, reject: (reason: unknown) => void): void {
    timer = setTimeout(expired, Math.min(15000, deadline - startedAt));
    /**
     * Reports timeout without disguising deadline exhaustion as an individual source failure.
     * @returns Nothing.
     * @remarks Aborts this attempt's controller.
     */
    function expired(): void {
      controller.abort();
      reject(failure(context.now() >= deadline ? 'cap' : 'request', 'Official request timed out'));
    }
  }
  /**
   * Obtains the response and records its body while the request timeout remains active.
   * @returns The completed official response.
   * @throws On Fetch or configured evidence-capture failure.
   */
  async function fetchAndCapture(): Promise<Response> {
    const response = await transport(url, { redirect: 'manual', signal: controller.signal });
    if (response.status === 401 || response.status === 403) throw failure('denied', 'Official source denied access');
    if (context.consume) await context.consume(response, url, startedAt);
    return response;
  }
  try { return await Promise.race([fetchAndCapture(), timeout]); }
  catch (error) { controller.abort(); throw error; }
  finally { clearTimeout(timer!); }
}

/**
 * Fetches an approved official URL with serial pacing, safe redirects and bounded retries.
 * @param url Approved official URL.
 * @param transport Fetch implementation; no source credentials are added.
 * @param input Optional shared acquisition pacing/deadline context.
 * @returns A successful official response.
 * @throws On denial, unsupported redirects, timeout exhaustion or final HTTP failure.
 * @remarks Updates shared request pacing; starts at most one request per second.
 */
export async function requestOfficial(url: string, transport: typeof fetch, input?: unknown): Promise<Response> {
  const context = input ? input as RequestContext : { now: Date.now, sleep: delay, startedAt: Date.now(), lastStartedAt: null };
  let target = officialUrl(url);
  for (let retry = 0; retry < 3; retry++) {
    let response: Response | undefined;
    try {
      const visited = new Set<string>();
      while (true) {
        check(!visited.has(target), 'Official redirect loop');
        visited.add(target);
        response = await attempt(target, transport, context);
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        check(location, 'Redirect without a location');
        target = officialUrl(new URL(location, target).href);
      }
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw failure('http', 'Official HTTP ' + response.status);
    } catch (error) {
      if (['denied', 'cap', 'structural', 'http'].includes(category(error) ?? '')) throw error;
      if (retry === 2) throw failure('request', error instanceof Error ? error.message : 'Official transport failed');
    }
    if (retry === 2) throw failure('http', 'Official HTTP ' + response?.status);
    const header = response?.headers.get('retry-after');
    const retryAfter = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - context.now() : 0;
    const backoff = Math.max(1000 * 2 ** retry, Number.isFinite(retryAfter) ? retryAfter : 0);
    const remaining = context.startedAt + fourHours - context.now();
    if (remaining <= 0) throw failure('cap', 'Four-hour acquisition limit reached');
    await context.sleep(Math.min(backoff, remaining));
  }
  throw failure('request', 'Official request exhausted');
}

/**
 * Applies every acquisition size budget to complete staged measurements.
 * @param input Catalogue, all shard and total stored-byte measurements.
 * @returns True only when all required finite integer measurements fit.
 * @throws On missing, malformed or exceeded measurements.
 */
export function validateSizes(input: unknown): true {
  const sizes = object(input);
  const catalogue = object(sizes.catalogue);
  check(Array.isArray(sizes.sittings), 'Missing complete sitting size measurements');
  for (const resource of [catalogue, ...sizes.sittings]) {
    const bytes = object(resource);
    for (const field of ['compressedBytes', 'decodedBytes']) check(typeof bytes[field] === 'number' && Number.isSafeInteger(bytes[field]) && Number(bytes[field]) > 0, 'Invalid resource byte measurement');
    check(Number(bytes.decodedBytes) <= DATA_LIMITS.decoded, 'Decoded resource exceeds acquisition budget');
    check(Number(bytes.compressedBytes) <= (resource === catalogue ? DATA_LIMITS.catalogueGzip : DATA_LIMITS.sittingGzip), 'Compressed resource exceeds acquisition budget');
  }
  check(typeof sizes.totalBytes === 'number' && Number.isSafeInteger(sizes.totalBytes) && sizes.totalBytes > 0 && sizes.totalBytes <= DATA_LIMITS.stagedData, 'Total staged data exceeds acquisition budget');
  return true;
}

/**
 * Reads a body within a fixed bound before creating an unbounded aggregate buffer.
 * @param response Source or trusted served response.
 * @param limit Maximum observed bytes for this representation.
 * @returns Exact received bytes.
 * @throws On body errors or exceeded limits.
 */
async function boundedBody(response: Response, limit: number): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      check(size <= limit, 'Source response exceeds decoded bound');
      chunks.push(item.value);
    }
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}

/**
 * Decodes supported gzip or transport-decoded UTF-8 JSON while enforcing decoded bounds.
 * @param bytes Stored gzip bytes or already decoded bytes.
 * @returns Exact decoded bytes and parsed JSON.
 * @throws On malformed gzip, UTF-8, JSON or exceeded decoded size.
 */
function decode(bytes: Uint8Array): { bytes: Buffer; value: unknown } {
  try {
    const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes, { maxOutputLength: DATA_LIMITS.decoded }) : Buffer.from(bytes);
    check(decoded.byteLength <= DATA_LIMITS.decoded, 'Decoded resource exceeds bound');
    return { bytes: decoded, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded)) };
  } catch (error) {
    if (category(error)) throw error;
    throw failure('structural', 'Invalid gzip, UTF-8 or JSON resource');
  }
}

/**
 * Reads optional generated state without interpreting malformed JSON as missing state.
 * @param path Private state filename.
 * @returns Parsed JSON, or null only when absent.
 * @throws On malformed JSON or unexpected filesystem errors.
 */
async function readJson(path: string): Promise<unknown | null> {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

/**
 * Resolves nonexistent paths through their nearest existing ancestor to detect physical overlap.
 * @param path Chosen output/state path.
 * @returns Canonical physical destination.
 * @throws On unexpected filesystem errors.
 */
async function canonicalPath(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    check(dirname(path) !== path, 'Invalid filesystem root');
    return join(await canonicalPath(dirname(path)), relative(dirname(path), path));
  }
}

/**
 * Rejects root symlinks and overlapping physical public/private destinations before writes.
 * @param options Caller-chosen state/output paths.
 * @returns Their resolved absolute paths.
 * @throws When paths alias, overlap or identify unsupported symbolic roots.
 */
async function safePaths(options: AcquisitionOptions): Promise<{ state: string; out: string }> {
  check(typeof options.state === 'string' && options.state.length > 0 && typeof options.out === 'string' && options.out.length > 0, 'Missing state/output paths');
  const state = resolve(options.state);
  const out = resolve(options.out);
  for (const path of [state, out]) {
    try { check(!(await lstat(path)).isSymbolicLink(), 'Symbolic state/output root'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const physicalState = await canonicalPath(state);
  const physicalOut = await canonicalPath(out);
  const between = relative(physicalState, physicalOut);
  const reverse = relative(physicalOut, physicalState);
  check(between && reverse && (between.startsWith('..' + '/') || isAbsolute(between)) && (reverse.startsWith('..' + '/') || isAbsolute(reverse)), 'Output/state paths overlap');
  return { state, out };
}

/**
 * Checks independent expected origin/code and successful default-branch artifact metadata.
 * @param input Untrusted artifact or served proof metadata.
 * @param options Expected repository/code supplied by the executing caller.
 * @returns The validated metadata object.
 * @throws On wrong source, branch, run, code, success marker or time.
 */
function trustedOrigin(input: unknown, options: AcquisitionOptions): Record<string, unknown> {
  const metadata = object(input);
  check(metadata.repository === options.repository && metadata.branch === 'main' && metadata.success === true && metadata.codeFingerprint === options.codeFingerprint, 'Untrusted artifact origin or incompatible code');
  check(typeof metadata.runId === 'string' && /^[1-9]\d*$/.test(metadata.runId), 'Missing default-branch artifact run ID');
  if (metadata.workflowUrl !== undefined) check(metadata.workflowUrl === 'https://github.com/' + options.repository + '/actions/runs/' + metadata.runId, 'Artifact workflow origin mismatch');
  return metadata;
}

/**
 * Validates a complete accepted checkpoint and every referenced stored payload.
 * @param input Untrusted checkpoint.
 * @param options Independent expected origin and private state path.
 * @returns Validated accepted catalogue and gzip shards.
 * @throws On expiry, origin, schema, reference, digest or identity mismatch.
 */
async function loadCheckpoint(input: unknown, options: AcquisitionOptions): Promise<AcceptedState> {
  const metadata = object(input);
  const local = metadata.originKind === 'local-development';
  if (local) {
    check(!(options.workflowContext ?? process.env.GITHUB_ACTIONS === 'true') && metadata.repository === options.repository && metadata.branch === options.branch && metadata.codeFingerprint === options.codeFingerprint && metadata.success === true && metadata.publicationEligible === false, 'Local development checkpoint context mismatch');
    check(metadata.workflowUrl === undefined || metadata.workflowUrl === null, 'Local checkpoint cannot assert workflow provenance');
  } else {
    check(metadata.originKind === 'workflow-artifact', 'Unsupported checkpoint origin kind');
    trustedOrigin(metadata, options);
  }
  check(metadata.schemaVersion === 1, 'Checkpoint schema mismatch');
  const age = (options.now ?? Date.now)() - Date.parse(String(metadata.createdAt));
  check(Number.isFinite(age) && age >= 0 && age <= sevenDays, 'Checkpoint missing, expired or future-dated');
  const bucketChecks = metadata.refresh === undefined ? [null, null, null, null, null, null] : bucketHistory(object(metadata.refresh).bucketChecks, (options.now ?? Date.now)());
  const catalogue = validateCatalogue(metadata.catalogue);
  if (local) check(catalogue.publishedAt === null && catalogue.status.workflowUrl === null && catalogue.status.lastConfirmedDeployment === null && (metadata.servedReceipt === null || metadata.servedReceipt === undefined), 'Local cache cannot replace a trusted publication baseline');
  check(digest(jsonBytes(catalogue)) === metadata.catalogueDigest, 'Checkpoint catalogue checksum mismatch');
  const hashes = object(metadata.shardDigests);
  const root = metadata.shardRoot === undefined ? '' : String(metadata.shardRoot);
  check(root === '' || /^snapshots\/[A-Za-z0-9_-]+$/.test(root), 'Unsafe checkpoint shard root');
  const shards = new Map<string, Uint8Array>();
  for (const sitting of catalogue.sittings) {
    if (sitting.record.availability === 'unavailable') continue;
    const bytes = await readFile(join(options.state, root, 'sittings', sitting.id + '.json.gz'));
    check(digest(bytes) === hashes[sitting.id] && bytes.byteLength === sitting.record.compressedBytes, 'Stored shard checksum or length mismatch');
    const decoded = decode(bytes);
    check(digest(decoded.bytes) === sitting.record.digest && decoded.bytes.byteLength === sitting.record.decodedBytes, 'Accepted decoded shard checksum mismatch');
    validateSittingRecord(decoded.value, sitting, catalogue);
    shards.set(sitting.id, bytes);
  }
  check(Object.keys(hashes).length === shards.size, 'Unreconciled checkpoint shard references');
  let confirmedDeployment = catalogue.status.lastConfirmedDeployment;
  if (metadata.servedPublication !== undefined) { check(!local, 'Local state cannot assert served binding'); confirmedDeployment = validateServedBinding(metadata.servedPublication, catalogue, metadata.catalogueDigest, options).receipt; }
  return { catalogue, shards, bucketChecks, confirmedDeployment };
}

/**
 * Recovers an accepted retention baseline from a matching independently trusted served snapshot.
 * @param options Expected repository/code and supplied trusted publication proof.
 * @returns Validated previously served data.
 * @throws On origin, receipt, schema, digest, identity or resource mismatch.
 */
async function recoverServed(options: AcquisitionOptions): Promise<AcceptedState> {
  const proof = options.servedBaseline!;
  const historical = historicalBaselines.get(proof);
  trustedOrigin(proof, historical ? { ...options, codeFingerprint: historical.codeFingerprint } : options);
  if (historical) return historical.state;
  const [owner, repository] = options.repository.split('/');
  const base = 'https://' + owner + '.github.io/' + repository + '/';
  check(proof.baseUrl === base, 'Untrusted served resource base');
  const transport = proof.transport ?? fetch;
  /**
   * Retrieves only fixed repository-subpath baseline resources with bounded body decoding.
   * @param path Fixed validated data path under the known base.
   * @returns Exact decoded and deterministic stored gzip bytes plus parsed content.
   * @throws On redirects, HTTP errors, malformed payloads or byte limits.
   */
  async function resource(path: string): Promise<{ bytes: Buffer; value: unknown; stored: Buffer }> {
    check(/^data\/(?:catalogue|sittings\/[1-9]\d*)\.json\.gz$/.test(path), 'Unsafe served resource path');
    const response = await transport(base + path, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
    check(response.ok, 'Served retention resource unavailable');
    if (response.url) check(response.url === base + path, 'Served resource URL mismatch');
    const observed = await boundedBody(response, DATA_LIMITS.decoded);
    const decoded = decode(observed);
    const stored = observed[0] === 0x1f && observed[1] === 0x8b ? observed : gzipSync(decoded.bytes, { level: 9 });
    return { ...decoded, stored };
  }
  const result = await resource('data/catalogue.json.gz');
  const catalogue = validateCatalogue(result.value);
  check(result.stored.byteLength <= DATA_LIMITS.catalogueGzip && digest(result.bytes) === proof.catalogueDigest, 'Served catalogue digest or size mismatch');
  check(proof.receipt?.snapshotId === catalogue.snapshotId, 'Served snapshot does not match trusted publication');
  validateCatalogue({ ...catalogue, publishedAt: proof.receipt.publishedAt, status: { ...catalogue.status, lastConfirmedDeployment: proof.receipt } });
  if (catalogue.publishedAt !== null) check(catalogue.publishedAt === proof.receipt.publishedAt, 'Served publication time mismatch');
  const shards = new Map<string, Uint8Array>();
  for (const sitting of catalogue.sittings) {
    if (sitting.record.availability === 'unavailable') continue;
    const payload = await resource(sitting.record.path!);
    check(digest(payload.bytes) === sitting.record.digest && digest(payload.stored) === proof.shardDigests[sitting.id] && payload.stored.byteLength === sitting.record.compressedBytes && payload.bytes.byteLength === sitting.record.decodedBytes, 'Served shard digest/length mismatch');
    validateSittingRecord(payload.value, sitting, catalogue);
    shards.set(sitting.id, payload.stored);
  }
  check(Object.keys(proof.shardDigests).length === shards.size, 'Served shard reference mismatch');
  return { catalogue: { ...catalogue, status: { ...catalogue.status, lastConfirmedDeployment: proof.receipt } }, shards };
}

/**
 * Adds trusted historical identities only when needed by accepted retained data.
 * @param current Fresh validated source identities.
 * @param previous Previously validated identities.
 * @returns A new exact-ID reconciliation with current-source flags preserved honestly.
 */
function reconcileMembers(current: Member[], previous: Member[]): Member[] {
  const members = new Map<string, Member>();
  for (const member of current) members.set(member.id, member);
  for (const member of previous) if (!members.has(member.id)) members.set(member.id, { ...member, listedInLatestSource: false });
  return [...members.values()];
}

/**
 * Prepares a coherent catalogue from accepted records and independently acquired inventories.
 * @param sittings Current and explicitly retained inventory entries.
 * @param members Reconciled exact source identities.
 * @param provenance Successful raw member/catalogue provenance.
 * @param receipt Last independently confirmed served receipt, when known.
 * @param options Current clock and workflow context.
 * @returns A new validated snapshot with no invented current publication time.
 */
function makeCatalogue(sittings: Sitting[], members: Member[], provenance: Catalogue['provenance'], receipt: DeploymentReceipt | null, options: AcquisitionOptions): Catalogue {
  const parliaments = new Set<number>();
  const dates: string[] = [];
  let latest = 0; let retained = 0; let unavailable = 0; let gaps = 0;
  let degraded = false;
  for (const sitting of sittings) {
    parliaments.add(sitting.parliament); dates.push(sitting.date);
    if (sitting.listedInLatestInventory) latest++; else retained++;
    if (sitting.record.availability === 'unavailable') unavailable++;
    if (sitting.record.availability !== 'available' || sitting.record.lastAttemptOutcome === 'failed') degraded = true;
    gaps += sitting.record.accounting?.unassigned ?? 0;
  }
  dates.sort();
  const time = instant((options.now ?? Date.now)());
  const catalogue: Catalogue = {
    schemaVersion: 1, snapshotId: randomUUID(), preparedAt: time, publishedAt: null, provenance,
    coverage: { parliaments: [...parliaments].sort(numericOrder), startDate: dates[0] ?? null, endDate: dates.at(-1) ?? null, latestInventoryCount: latest, retainedSittingCount: retained, unavailableSittingCount: unavailable, attributionGapCount: gaps },
    status: { acquisitionOutcome: degraded ? 'degraded' : 'success', stagingOutcome: 'success', workflowUrl: options.workflowUrl ?? null, completedAt: time, lastConfirmedDeployment: receipt },
    members, sittings,
  };
  return validateCatalogue(catalogue);
}

/**
 * Orders known numeric Parliament identifiers for canonical coverage metadata.
 * @param left First Parliament.
 * @param right Second Parliament.
 * @returns Their ascending numeric ordering.
 */
function numericOrder(left: number, right: number): number { return left - right; }

/**
 * Creates explicit metadata for an actually failed new record acquisition.
 * @param attemptedAt Known acquisition-attempt time.
 * @returns No accepted-payload claims and a separate failed-attempt marker.
 */
function unavailable(attemptedAt: string): RecordDescriptor {
  return { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: attemptedAt, lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
}

/**
 * Sums every file in a fully staged data directory, including copied retained payloads.
 * @param path Staged directory.
 * @returns Actual complete stored-byte count.
 * @throws On unreadable files/directories or unsupported symbolic entries.
 */
async function directoryBytes(path: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    check(!entry.isSymbolicLink(), 'Symbolic entry in staged output');
    total += entry.isDirectory() ? await directoryBytes(child) : (await stat(child)).size;
  }
  return total;
}

/**
 * Stages and validates all public data before replacing output and accepted checkpoint.
 * @param input Proposed coherent catalogue.
 * @param shards Every referenced accepted gzip shard, including retained data.
 * @param supplied Chosen directories, origin and concrete filesystem measurement boundary.
 * @returns The validated staged catalogue and actual measured sizes after commit.
 * @throws On schema, reference, digest, size or filesystem commit failure.
 * @remarks Writes only chosen output/state directories; rollback restores prior output/checkpoint.
 */
export async function stageSnapshot(input: unknown, shards: Map<string, Uint8Array>, supplied: unknown): Promise<{ catalogue: Catalogue; sizes: ResourceSizes }> {
  return stageData(input, shards, supplied);
}

/** Commits validated data and optional private sweep/outcome state in the same rollback boundary.
 * @param input Proposed coherent public catalogue.
 * @param shards Every accepted referenced gzip shard.
 * @param supplied Existing state/output/filesystem boundaries.
 * @param bucketChecks Optional validated successful sweep history.
 * @param recordCommitted Optional required private run-outcome write after replacements but before acknowledgement.
 * @returns Validated catalogue and actual sizes only after every required commit step.
 * @throws On validation, replacement or required private outcome-write failure.
 * @remarks Writes chosen temporary/public/private files; rollback restores old output and checkpoint on any commit failure.
 */
async function stageData(input: unknown, shards: Map<string, Uint8Array>, supplied: unknown, bucketChecks?: (string | null)[], recordCommitted?: () => Promise<void>): Promise<{ catalogue: Catalogue; sizes: ResourceSizes }> {
  const options = { ...object(supplied) } as unknown as AcquisitionOptions;
  const paths = await safePaths(options);
  const catalogue = validateCatalogue(input);
  const token = randomUUID();
  const work = join(paths.state, 'work', token);
  const candidate = join(work, 'public');
  const backup = join(work, 'previous-output');
  const checkpointPath = join(paths.state, 'checkpoint.json');
  const checkpointBackup = join(work, 'previous-checkpoint.json');
  const version = 'snapshots/' + token;
  const versionPath = join(paths.state, version);
  const sizes: ResourceSizes = { catalogue: { compressedBytes: 0, decodedBytes: 0 }, sittings: [], totalBytes: 0 };
  let movedOld = false; let movedNew = false; let committed = false;
  let movedOldCheckpoint = false; let movedNewCheckpoint = false;
  const move = options.rename ?? rename;
  await mkdir(join(candidate, 'sittings'), { recursive: true });
  try {
    const expected = new Set<string>();
    for (const sitting of catalogue.sittings) {
      if (sitting.record.availability === 'unavailable') continue;
      expected.add(sitting.id);
      const stored = shards.get(sitting.id);
      check(stored, 'Missing accepted staged shard');
      const decoded = decode(stored);
      check(stored.byteLength === sitting.record.compressedBytes && decoded.bytes.byteLength === sitting.record.decodedBytes && digest(decoded.bytes) === sitting.record.digest, 'Staged shard size/digest mismatch');
      validateSittingRecord(decoded.value, sitting, catalogue);
      await writeFile(join(candidate, 'sittings', sitting.id + '.json.gz'), stored);
      sizes.sittings.push({ compressedBytes: stored.byteLength, decodedBytes: decoded.bytes.byteLength });
    }
    check(expected.size === shards.size, 'Unreferenced staged payload');
    const decodedCatalogue = jsonBytes(catalogue);
    const encodedCatalogue = gzipSync(decodedCatalogue, { level: 9 });
    check(decode(encodedCatalogue).bytes.equals(decodedCatalogue), 'Catalogue gzip round-trip mismatch');
    await writeFile(join(candidate, 'catalogue.json.gz'), encodedCatalogue);
    sizes.catalogue = { compressedBytes: encodedCatalogue.byteLength, decodedBytes: decodedCatalogue.byteLength };
    sizes.totalBytes = await directoryBytes(candidate);
    validateSizes(options.measureSizes ? await options.measureSizes(candidate, sizes) : sizes);
    await mkdir(join(versionPath, 'sittings'), { recursive: true });
    const shardDigests: Record<string, string> = {};
    for (const [id, bytes] of shards) { await writeFile(join(versionPath, 'sittings', id + '.json.gz'), bytes); shardDigests[id] = digest(bytes); }
    const workflow = options.workflowContext ?? process.env.GITHUB_ACTIONS === 'true';
    const checkpoint = { originKind: workflow ? 'workflow-artifact' : 'local-development', publicationEligible: workflow && options.branch === 'main', schemaVersion: 1, repository: options.repository, branch: options.branch, codeFingerprint: options.codeFingerprint, runId: options.runId ?? 'local', workflowUrl: options.workflowUrl ?? undefined, createdAt: instant((options.now ?? Date.now)()), success: true, catalogue, catalogueDigest: digest(decodedCatalogue), shardDigests, shardRoot: version, servedReceipt: catalogue.status.lastConfirmedDeployment, ...(bucketChecks ? { refresh: { bucketChecks } } : {}) };
    const pendingCheckpoint = join(work, 'checkpoint.json');
    await writeFile(pendingCheckpoint, jsonBytes(checkpoint));
    await mkdir(dirname(paths.out), { recursive: true });
    try { await move(paths.out, backup); movedOld = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await move(candidate, paths.out); movedNew = true;
    try { await move(checkpointPath, checkpointBackup); movedOldCheckpoint = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await move(pendingCheckpoint, checkpointPath); movedNewCheckpoint = true;
    if (recordCommitted) await recordCommitted();
    await rm(join(paths.state, 'partial-checkpoint.json'), { force: true });
    committed = true;
    return { catalogue, sizes };
  } catch (error) {
    if (movedNewCheckpoint) await rm(checkpointPath, { force: true });
    if (movedOldCheckpoint) await move(checkpointBackup, checkpointPath);
    if (movedNew) await rm(paths.out, { recursive: true, force: true });
    if (movedOld) await move(backup, paths.out);
    throw error;
  } finally {
    await rm(work, { recursive: true, force: true });
    if (!committed) await rm(versionPath, { recursive: true, force: true });
  }
}

/**
 * Acquires official inventories/records and commits a complete validated static snapshot.
 * @param supplied Explicit state/output/origin and optional controlled transport/clock boundaries.
 * @returns Committed catalogue, actual sizes and private source response receipt locations.
 * @throws On discovery/schema/trust/path/size failures, denial or incomplete four-hour acquisition.
 * @remarks Retains accepted payloads on individual retrieval failures; fatal errors preserve output/state.
 */
export async function acquire(supplied: unknown): Promise<{ catalogue: Catalogue; sizes: ResourceSizes; receipts: RawReceipt[] }> {
  const options = { ...object(supplied) } as unknown as AcquisitionOptions;
  check(options && (options.mode === 'bootstrap' || options.mode === 'refresh'), 'Unsupported acquisition mode');
  check(typeof options.repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.repository), 'Invalid repository context');
  check(typeof options.codeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(options.codeFingerprint), 'Invalid acquisition code fingerprint');
  Object.assign(options, await safePaths(options));
  const now = options.now ?? Date.now;
  const sessionId = options.sessionId ?? randomUUID();
  check(/^[A-Za-z0-9_-]+$/.test(sessionId), 'Unsafe acquisition session ID');
  await mkdir(options.state, { recursive: true });
  const receiptPath = join(options.state, 'receipts', sessionId); await mkdir(receiptPath, { recursive: true });
  const runStartedAt = instant(now());
  const runReport: RefreshReport = { strategy: 'bootstrap', baseline: 'none', historicalBucket: -1,
    bucketChecks: [null, null, null, null, null, null], targetIds: [], completedIds: [], unchangedIds: [], changedIds: [], failedIds: [], pendingIds: [], overdueIds: [],
    bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' };
  /** Records actual acquisition/staging facts without asserting deployment or workflow success.
   * @returns Completion after the required private outcome write.
   * @throws On an actual private report filesystem failure.
   * @remarks Writes only this chosen private run report; no public source bytes or served receipt is changed.
   */
  async function writeRefreshReport(): Promise<void> { await writeFile(join(receiptPath, 'refresh.json'), jsonBytes({ repository: options.repository, branch: options.branch,
    codeFingerprint: options.codeFingerprint, sessionId, startedAt: runStartedAt, recordedAt: instant(now()), ...runReport })); }
  try {
  let previous: AcceptedState | null = null;
  const checkpoint = await readJson(join(options.state, 'checkpoint.json'));
  const hasOutput = await lstat(options.out).then(isDirectory, missingDirectory);
  /**
   * Checks a chosen existing output directory.
   * @param value Filesystem directory metadata.
   * @returns Whether it is a directory.
   */
  function isDirectory(value: Awaited<ReturnType<typeof lstat>>): boolean { return value.isDirectory(); }
  /**
   * Accepts only a genuinely missing chosen directory.
   * @param error Filesystem lookup failure.
   * @returns False for absence.
   * @throws On unexpected lookup errors.
   */
  function missingDirectory(error: unknown): false { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  try {
    if (checkpoint) { previous = await loadCheckpoint(checkpoint, options); runReport.baseline = 'checkpoint'; }
    else if (options.servedBaseline) { previous = await recoverServed(options); runReport.baseline = 'served'; }
    else if (hasOutput && (await readdir(options.out)).length > 0) throw failure('structural', 'Missing trusted publication retention baseline');
  } catch (error) {
    runReport.baseline = 'unrecoverable'; if (!options.servedBaseline) throw error;
    previous = await recoverServed(options);
    runReport.baseline = 'served';
  }
  let knownDeployment = previous?.confirmedDeployment ?? previous?.catalogue.status.lastConfirmedDeployment ?? null;
  if (options.confirmedPublication !== undefined) {
    const receipt = authenticatedConfirmedPublication(options.confirmedPublication, options.repository);
    checkedTime(receipt.publishedAt, now()); checkedTime(receipt.verifiedServedAt, now());
    if (!knownDeployment || Date.parse(receipt.publishedAt) > Date.parse(knownDeployment.publishedAt)
      || Date.parse(receipt.publishedAt) === Date.parse(knownDeployment.publishedAt) && Date.parse(receipt.verifiedServedAt) > Date.parse(knownDeployment.verifiedServedAt)) knownDeployment = { ...receipt };
  }
  const partialInput = await readJson(join(options.state, 'partial-checkpoint.json'));
  let partial: PartialState | null = null;
  if (partialInput) {
    const metadata = object(partialInput);
    const workflow = options.workflowContext ?? process.env.GITHUB_ACTIONS === 'true';
    check(metadata.originKind === (workflow ? 'workflow-artifact' : 'local-development') && (!workflow || metadata.branch === 'main'), 'Private partial execution context mismatch');
    check(metadata.kind === 'partial' && metadata.schemaVersion === 1 && metadata.sessionId === sessionId && metadata.repository === options.repository && metadata.branch === options.branch && metadata.codeFingerprint === options.codeFingerprint && metadata.validationSuccess === true && metadata.complete === false, 'Untrusted or foreign private partial state');
    check(Array.isArray(metadata.accepted) && Array.isArray(metadata.members) && Array.isArray(metadata.pendingIds), 'Invalid private partial references');
    const createdAt = checkedTime(metadata.createdAt, now()); check(now() - Date.parse(createdAt) <= sevenDays, 'Expired private partial state');
    check(metadata.failedRecords === undefined || Array.isArray(metadata.failedRecords), 'Invalid private failed-attempt records');
    partial = metadata as unknown as PartialState;
  }
  const receipts: RawReceipt[] = [];
  const bodies = new WeakMap<Response, Buffer>();
  const context: RequestContext = { now, sleep: options.sleep ?? delay, startedAt: now(), lastStartedAt: null, consume };
  /**
   * Persists each received official response while its request deadline remains active.
   * @param response Official response.
   * @param url Approved request URL.
   * @param startedAt Actual request-start clock.
   * @returns Completion after private raw bytes/metadata are stored.
   * @throws On oversized body or private evidence write failure.
   * @remarks Adds only private receipt files/body mappings; never writes public output.
   */
  async function consume(response: Response, url: string, startedAt: number): Promise<void> {
    const bytes = await boundedBody(response, DATA_LIMITS.decoded);
    const path = join(receiptPath, randomUUID() + '.bin');
    const receipt = { path, rawDigest: digest(bytes), url, startedAt: instant(startedAt), acquiredAt: instant(now()), status: response.status };
    try { await writeFile(path, bytes); await writeFile(path + '.json', jsonBytes(receipt)); }
    catch { throw failure('structural', 'Could not persist private raw evidence'); }
    receipts.push(receipt); bodies.set(response, bytes);
  }
  const transport = options.transport ?? fetch;
  let build = '';
  let rediscovered = false;
  /**
   * Observes current public portal deployment metadata.
   * @returns Newly validated build ID.
   * @throws On discovery or retrieval failure.
   */
  async function discovery(): Promise<string> {
    const response = await requestOfficial(origin + '/', transport, context);
    return discoverBuildId(new TextDecoder('utf-8', { fatal: true }).decode(bodies.get(response)!));
  }
  build = await discovery();
  /**
   * Retrieves an approved page-data resource with one stale-build rediscovery.
   * @param route Fixed approved page-data suffix.
   * @returns Parsed source JSON and its raw receipt provenance.
   * @throws On exhausted retrieval, unsupported source JSON or schema.
   * @remarks May update the observed deployment build ID once.
   */
  async function page(route: string): Promise<{ value: unknown; receipt: RawReceipt; buildId: string }> {
    let response: Response;
    try { response = await requestOfficial(origin + '/_next/data/' + build + '/en-GB/' + route, transport, context); }
    catch (error) {
      if (category(error) !== 'http' || !String((error as Error).message).includes('404') || rediscovered) throw error;
      rediscovered = true;
      const old = build; build = await discovery();
      if (old === build) throw error;
      response = await requestOfficial(origin + '/_next/data/' + build + '/en-GB/' + route, transport, context);
    }
    const bytes = bodies.get(response)!;
    const decoded = decode(bytes);
    const receipt = receipts.at(-1)!;
    return { value: decoded.value, receipt, buildId: build };
  }
  const sourceMembers = await page('cari-mp.json');
  const memberList = parseSourceMembers(sourceMembers.value);
  const sourceInventory = await page('katalog/dewan-rakyat.json');
  const inventory = parseSourceInventory(sourceInventory.value);
  const provenance: Catalogue['provenance'] = { interface: 'official-next-page-data', sourceBuildId: sourceInventory.buildId, inventoryAcquiredAt: sourceInventory.receipt.acquiredAt, membersAcquiredAt: sourceMembers.receipt.acquiredAt, inventoryRawDigest: sourceInventory.receipt.rawDigest, membersRawDigest: sourceMembers.receipt.rawDigest };
  const members = reconcileMembers(memberList, [...previous?.catalogue.members ?? [], ...partial?.members ?? []]);
  const knownMembers = new Set<string>(); for (const member of members) knownMembers.add(member.id);
  const shards = new Map(previous?.shards ?? []);
  const prior = new Map<string, Sitting>();
  for (const sitting of previous?.catalogue.sittings ?? []) prior.set(sitting.id, sitting.record.availability === 'unavailable' ? sitting
    : retainAttributionContext(sitting, decode(shards.get(sitting.id)!).value as SittingRecord, knownMembers));
  const accepted = new Map<string, Sitting>();
  const failedRecords = new Map<string, Sitting>();
  if (partial) {
    makeCatalogue([...partial.accepted, ...partial.failedRecords ?? []], members, provenance, knownDeployment, options);
    const hashes = object(partial.shardDigests);
    const originalContext = makeCatalogue(partial.accepted, partial.members, provenance, knownDeployment, options);
    for (const sitting of partial.accepted) {
      const bytes = await readFile(join(options.state, 'partial', 'sittings', sitting.id + '.json.gz'));
      check(digest(bytes) === hashes[sitting.id], 'Private partial checksum mismatch');
      const decoded = decode(bytes);
      const record = validateSittingRecord(decoded.value, sitting, originalContext);
      check(digest(decoded.bytes) === sitting.record.digest, 'Private partial decoded digest mismatch');
      const retained = retainAttributionContext(sitting, record, knownMembers);
      shards.set(sitting.id, bytes); accepted.set(sitting.id, retained); if (!prior.has(sitting.id)) prior.set(sitting.id, retained);
    }
    for (const sitting of partial.failedRecords ?? []) failedRecords.set(sitting.id, sitting);
  }
  const sittings: Sitting[] = [];
  for (const incoming of inventory) {
    const old = prior.get(incoming.id);
    if (old) for (const key of ['date', 'parliament', 'penggal', 'mesyuarat', 'house', 'filename'] as const) check(incoming[key] === old[key], 'Conflicting stable source sitting identity');
    sittings.push({ ...(old ?? incoming), listedInLatestInventory: true, record: old?.record ?? unavailable(instant(now())) });
  }
  const latestIds = new Set<string>();
  for (const sitting of sittings) latestIds.add(sitting.id);
  for (const old of prior.values()) if (!latestIds.has(old.id)) sittings.push({ ...old, listedInLatestInventory: false, record: { ...old.record, availability: old.record.availability === 'unavailable' ? 'unavailable' : 'retained' } });
  const sittingIndexes = new Map<string, number>(); for (let index = 0; index < sittings.length; index++) sittingIndexes.set(sittings[index].id, index);
  const freshIdentities = new Map<string, InventorySitting>(); for (const sitting of inventory) freshIdentities.set(sitting.id, sitting);
  const history = previous?.bucketChecks ?? [null, null, null, null, null, null];
  runReport.strategy = options.mode === 'refresh' && (runReport.baseline === 'checkpoint' || runReport.baseline === 'served' && historicalBaselines.has(options.servedBaseline!)) ? 'incremental' : 'bootstrap';
  const planned = planRefresh(runReport.strategy === 'incremental' ? previous!.catalogue : null, inventory, now(), history);
  let targetIds = planned.sittingIds;
  if (options.mode === 'bootstrap') { targetIds = []; for (const sitting of inventory) targetIds.push(sitting.id); }
  Object.assign(runReport, { targetIds, historicalBucket: planned.historicalBucket, overdueIds: planned.overdueIds, bucketChecks: [...history] });
  if (partial?.refresh) Object.assign(runReport, partialProgress(partial, new Set(sittingIndexes.keys()), now()));
  else if (partial) for (const [id, sitting] of accepted) { check(runReport.targetIds.includes(id), 'Partial source outside current bootstrap'); runReport.completedIds.push(id);
    if (prior.get(id)?.record.digest === sitting.record.digest) runReport.unchangedIds.push(id); else runReport.changedIds.push(id); }
  const done = new Set([...runReport.completedIds, ...runReport.failedIds]);
  if (partial) {
    const additional = inventory.filter(
      /** Admits only genuinely new source identities observed in this resume's fresh inventory.
       * @param sitting Freshly validated source identity.
       * @returns Whether it was absent from accepted state and the original target scope.
       */
      function newlyObserved(sitting): boolean { return !prior.has(sitting.id) && !runReport.targetIds.includes(sitting.id); }).sort(newestSitting);
    const newIds: string[] = []; for (const sitting of additional) newIds.push(sitting.id); runReport.targetIds = [...newIds, ...runReport.targetIds];
  }
  runReport.pendingIds = []; for (const id of runReport.targetIds) if (!done.has(id)) runReport.pendingIds.push(id);
  for (const [id, sitting] of failedRecords) { const index = sittingIndexes.get(id); check(index !== undefined, 'Unknown failed partial source'); sittings[index] = { ...sitting, listedInLatestInventory: latestIds.has(id) }; }
  for (const [id, sitting] of accepted) {
    const index = sittingIndexes.get(id); check(index !== undefined, 'Unknown accepted partial source'); const current = freshIdentities.get(id);
    if (current) for (const key of ['date', 'parliament', 'penggal', 'mesyuarat', 'house', 'filename', 'isFinal'] as const) check(current[key] === sitting[key], 'Private resumed sitting identity changed');
    sittings[index] = { ...sitting, listedInLatestInventory: latestIds.has(id), record: latestIds.has(id) ? sitting.record : { ...sitting.record, availability: 'retained' } };
  }
  const workIds = [...runReport.pendingIds];
  let cursor = 0;
  try {
    for (; cursor < workIds.length; cursor++) {
      const id = workIds[cursor]; const index = sittingIndexes.get(id); check(index !== undefined, 'Unknown planned source ID');
      const sitting = sittings[index];
      const attemptedAt = instant(now());
      try {
        const incoming = freshIdentities.get(id) ?? sitting;
        const source = await page('hansard/dewan-rakyat/' + sitting.date + '.json?date=' + sitting.date);
        const selected = { ...sitting, ...incoming }; const contextSittings = [...sittings]; contextSittings[index] = selected;
        const contextCatalogue = makeCatalogue(contextSittings, members, provenance, knownDeployment, options);
        const record = normalizeSourceRecord(source.value, selected, contextCatalogue);
        const bytes = jsonBytes(record);
        const encoded = gzipSync(bytes, { level: 9 });
        const time = source.receipt.acquiredAt;
        const descriptor: RecordDescriptor = { availability: 'available', path: 'data/sittings/' + sitting.id + '.json.gz', digest: digest(bytes), compressedBytes: encoded.byteLength, decodedBytes: bytes.byteLength, acquiredAt: time, lastAttemptAt: time, lastAttemptOutcome: 'success', sourceBuildId: source.buildId, rawSourceDigest: source.receipt.rawDigest, sourcePublishedAt: null, sourceRevisedAt: null, accounting: sourceAccounting(record.items) };
        sittings[index] = { ...incoming, listedInLatestInventory: latestIds.has(id), record: descriptor };
        shards.set(sitting.id, encoded); accepted.set(sitting.id, sittings[index]);
        runReport.completedIds.push(id); if (prior.get(id)?.record.digest === descriptor.digest) runReport.unchangedIds.push(id); else runReport.changedIds.push(id);
      } catch (error) {
        if (!['request', 'http'].includes(category(error) ?? '')) throw error;
        const old = prior.get(sitting.id);
        sittings[index] = old && old.record.availability !== 'unavailable' ? { ...old, listedInLatestInventory: latestIds.has(id), record: { ...old.record, availability: 'retained', lastAttemptAt: attemptedAt, lastAttemptOutcome: 'failed' } } : { ...sitting, record: unavailable(attemptedAt) };
        failedRecords.set(id, sittings[index]); runReport.failedIds.push(id);
      }
      runReport.pendingIds = runReport.pendingIds.slice(1);
    }
  } catch (error) {
    if (category(error) === 'cap') {
      await mkdir(join(options.state, 'partial', 'sittings'), { recursive: true });
      const hashes: Record<string, string> = {};
      for (const [id] of accepted) { const bytes = shards.get(id)!; await writeFile(join(options.state, 'partial', 'sittings', id + '.json.gz'), bytes); hashes[id] = digest(bytes); }
      const pendingIds: string[] = [];
      for (const id of runReport.pendingIds) pendingIds.push(id);
      const progress: PartialState = { kind: 'partial', originKind: (options.workflowContext ?? process.env.GITHUB_ACTIONS === 'true') ? 'workflow-artifact' : 'local-development', schemaVersion: 1, sessionId, repository: options.repository, branch: options.branch, codeFingerprint: options.codeFingerprint, validationSuccess: true, complete: false, createdAt: instant(now()), pendingIds, accepted: [...accepted.values()], shardDigests: hashes, members,
        refresh: { targetIds: runReport.targetIds, historicalBucket: runReport.historicalBucket, bucketChecks: runReport.bucketChecks, completedIds: runReport.completedIds, unchangedIds: runReport.unchangedIds, changedIds: runReport.changedIds, failedIds: runReport.failedIds, overdueIds: runReport.overdueIds }, failedRecords: [...failedRecords.values()] };
      await writeFile(join(options.state, 'partial-checkpoint.json'), jsonBytes(progress));
    }
    await writeFile(join(receiptPath, 'failure.json'), jsonBytes({ outcome: 'failed', category: category(error) ?? 'structural', message: error instanceof Error ? error.message : String(error), at: instant(now()), pendingFrom: cursor }));
    throw error;
  }
  const referenced = new Set<string>();
  const preliminary = makeCatalogue(sittings, members, provenance, knownDeployment, options);
  for (const sitting of sittings) {
    if (sitting.record.availability === 'unavailable') continue;
    const record = validateSittingRecord(decode(shards.get(sitting.id)!).value, sitting, preliminary);
    for (const item of record.items) if (item.memberId !== null) referenced.add(item.memberId);
  }
  const publishedMembers: Member[] = [];
  for (const member of members) if (referenced.has(member.id)) publishedMembers.push(member);
  const catalogue = makeCatalogue(sittings, publishedMembers, provenance, knownDeployment, options);
  runReport.acquisitionOutcome = runReport.failedIds.length ? 'degraded' : 'success';
  const completed = new Set(runReport.completedIds); let bucketCompleted = true;
  for (const sitting of sittings) if (refreshBucket(sitting.id) === runReport.historicalBucket && !completed.has(sitting.id)) bucketCompleted = false;
  const nextChecks = [...runReport.bucketChecks]; if (bucketCompleted) nextChecks[runReport.historicalBucket] = instant(now());
  runReport.stagingOutcome = 'failed';
  const staged = await stageData(catalogue, shards, options, nextChecks,
    /** Writes successful private progress only inside the actual output/checkpoint commit boundary.
     * @returns Completion after its required private report write.
     * @throws On private outcome-write failure, triggering native staging rollback.
     * @remarks Records this run's actually committed sweep/outcome; no deployment is asserted.
     */
    async function recorded(): Promise<void> { runReport.stagingOutcome = 'success'; runReport.bucketCompleted = bucketCompleted; await writeRefreshReport(); });
  return { ...staged, receipts };
  } catch (error) {
    runReport.bucketCompleted = false;
    if (runReport.stagingOutcome !== 'not-attempted') runReport.stagingOutcome = 'failed'; else runReport.acquisitionOutcome = 'failed';
    await writeRefreshReport(); throw error;
  }
}

/**
 * Runs the documented CLI with real source acquisition and explicit provenance boundaries.
 * @returns Completion only after validated static staging.
 * @throws On unsupported arguments or any acquisition failure.
 * @remarks Writes chosen generated data/private state; performs no Git push or site publication.
 */
async function cli(): Promise<void> {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    check(['--mode', '--state', '--out'].includes(key) && process.argv[index + 1], 'Expected --mode, --state and --out arguments');
    values.set(key, process.argv[index + 1]);
  }
  const codeFingerprint = digest(Buffer.concat([await readFile(new URL('../src/source.ts', import.meta.url)), await readFile(new URL('./acquire.ts', import.meta.url)), await readFile(new URL('../package-lock.json', import.meta.url))]));
  const repository = process.env.GITHUB_REPOSITORY ?? 'eaglecheow/vote-better-malaysia';
  const runId = process.env.GITHUB_RUN_ID;
  const run = await acquire({
    mode: values.get('--mode') ?? 'bootstrap', state: values.get('--state') ?? '.cache/hansard', out: values.get('--out') ?? 'public/data',
    repository, branch: process.env.GITHUB_REF_NAME ?? (execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() || 'detached-' + execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()), codeFingerprint,
    workflowContext: process.env.GITHUB_ACTIONS === 'true',
    sessionId: process.env.HANSARD_SESSION_ID ?? runId, runId, workflowUrl: runId ? 'https://github.com/' + repository + '/actions/runs/' + runId : null,
  });
  console.log(JSON.stringify({ snapshotId: run.catalogue.snapshotId, coverage: run.catalogue.coverage, outcome: run.catalogue.status.acquisitionOutcome, sizes: run.sizes, receiptCount: run.receipts.length, publication: 'not performed' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await cli();

