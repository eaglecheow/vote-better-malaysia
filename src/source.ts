/** A reconciled source identity; absence of historical context is explicit. */
export interface Member {
  id: string;
  name: string;
  historicalContext: string | null;
  listedInLatestSource: boolean;
}

/** Immutable sitting identity shared by source records and catalogue entries. */
export interface SittingIdentity {
  date: string;
  parliament: number;
  penggal: number;
  mesyuarat: number;
  house: 'dewan-rakyat';
  filename: string;
  isFinal: boolean | null;
}

/** A dated source inventory entry before acquisition attaches its descriptor. */
export interface InventorySitting extends SittingIdentity {
  id: string;
  sourceUrl: string;
}

/** Exhaustive counts of accepted source leaves, including annotations and gaps. */
export interface SourceAccounting {
  total: number;
  assigned: number;
  unassigned: number;
  annotations: number;
}

/** Accepted shard provenance and the distinct most recent acquisition attempt. */
export interface RecordDescriptor {
  availability: 'available' | 'retained' | 'unavailable';
  path: string | null;
  digest: string | null;
  compressedBytes: number | null;
  decodedBytes: number | null;
  acquiredAt: string | null;
  lastAttemptAt: string;
  lastAttemptOutcome: 'success' | 'failed';
  sourceBuildId: string | null;
  rawSourceDigest: string | null;
  sourcePublishedAt: string | null;
  sourceRevisedAt: string | null;
  accounting: SourceAccounting | null;
}

/** A selectable sitting, including unavailable or retained source coverage. */
export interface Sitting extends InventorySitting {
  listedInLatestInventory: boolean;
  record: RecordDescriptor;
}

/** A publication receipt confirmed separately from snapshot preparation. */
export interface DeploymentReceipt {
  snapshotId: string;
  deploymentId: string;
  publishedAt: string;
  verifiedServedAt: string;
  workflowUrl: string;
}

/** One coherent normalized catalogue with explicit acquisition and coverage metadata. */
export interface Catalogue {
  schemaVersion: 1;
  snapshotId: string;
  preparedAt: string;
  publishedAt: string | null;
  provenance: {
    interface: 'official-next-page-data';
    sourceBuildId: string;
    inventoryAcquiredAt: string;
    membersAcquiredAt: string;
    inventoryRawDigest: string;
    membersRawDigest: string;
  };
  coverage: {
    parliaments: number[];
    startDate: string | null;
    endDate: string | null;
    latestInventoryCount: number;
    retainedSittingCount: number;
    unavailableSittingCount: number;
    attributionGapCount: number;
  };
  status: {
    acquisitionOutcome: 'success' | 'degraded';
    stagingOutcome: 'success' | 'degraded';
    workflowUrl: string | null;
    completedAt: string;
    lastConfirmedDeployment: DeploymentReceipt | null;
  };
  members: Member[];
  sittings: Sitting[];
}

/** An original source leaf with conservative exact-ID attribution. */
export interface SourceItem {
  ordinal: number;
  sourceIndex: number | null;
  sectionPath: string[];
  text: string;
  rawAuthor: string | null;
  sourceAuthorId: string | null;
  memberId: string | null;
  attribution: 'annotation' | 'assigned' | 'unassigned';
  timestamp: number | string | null;
  gapReason: 'missing-id' | 'unknown-id' | 'conflicting-id' | null;
}

/** Stable normalized source content; acquisition and device times live outside it. */
export interface SittingRecord {
  schemaVersion: 1;
  sittingId: string;
  identity: SittingIdentity;
  sourceUrl: string;
  items: SourceItem[];
}

/** A self-contained selected pair retaining gaps and separate annotation content. */
export interface TranscriptResult {
  schemaVersion: 1;
  snapshotId: string;
  snapshot: Pick<Catalogue, 'preparedAt' | 'publishedAt' | 'coverage' | 'status'>;
  memberId: string;
  sittingId: string;
  member: Member;
  sitting: Sitting;
  provenance: Catalogue['provenance'];
  recordDigest: string | null;
  turns: SourceItem[];
  gaps: SourceItem[];
  annotations: SourceItem[];
  refreshedAt: string | null;
  saved: boolean;
  outcome: 'ready' | 'verified-absence' | 'incomplete' | 'unavailable';
}

/** Shared static-resource byte ceilings; complete-site accounting also includes shell assets. */
export const DATA_LIMITS = { catalogueGzip: 1048576, sittingGzip: 524288, decoded: 5242880, stagedData: 900000000 } as const;

/** Dependencies for same-base published catalogue retrieval. */
export interface PublishedOptions { baseUrl: string; fetch?: typeof fetch; signal?: AbortSignal }
/** Exact selected pair and observable successful processing boundary. */
export interface PublishedPairOptions extends PublishedOptions {
  memberId: string; sittingId: string; now?: () => string; mark?: (name: string) => void;
}

/** Status known by this accepted result; no later workflow observation is inferred. */
export interface PublishedSourceStatus { overdue: boolean; knownFailureAt: string | null; workflowUrl: string | null }

/** Derives source age and recorded failure from metadata known to the accepted snapshot.
 * @param result Accepted sitting and snapshot metadata, including for a failed pair retrieval.
 * @param now Independent current UTC clock in whole-second or millisecond ISO spelling.
 * @returns Source acquisition age over 24 hours, known failed-attempt date and snapshot workflow link.
 * @throws When the current clock is absent, malformed, non-UTC or an invalid calendar instant.
 */
export function publishedSourceStatus(result: Pick<TranscriptResult, 'sitting' | 'snapshot'>, now: string): PublishedSourceStatus {
  const current = Date.parse(sourceInstant(now));
  const record = result.sitting.record;
  return {
    overdue: record.acquiredAt !== null && current - Date.parse(record.acquiredAt) > 86400000,
    knownFailureAt: record.lastAttemptOutcome === 'failed' ? record.lastAttemptAt : null,
    workflowUrl: result.snapshot.status.workflowUrl,
  };
}

/** Retrieves and validates the latest published catalogue under the application base.
 * @param options Same-base address, transport and cancellation signal.
 * @returns One coherent validated catalogue, without retrieving any sitting.
 * @throws For invalid base, network, body, byte-limit or schema failures.
 * @remarks Issues one cache-bypassing same-base GET; never requests the official source.
 */
export async function loadPublishedCatalogue(options: PublishedOptions): Promise<Catalogue> {
  const base = publishedBase(options.baseUrl);
  const bytes = await publishedBytes(new URL('data/catalogue.json.gz', base), DATA_LIMITS.catalogueGzip, options);
  return validateCatalogue(await decodedJson(bytes));
}

/** Retrieves one exact pair, retrying only a digest mismatch against a refreshed catalogue.
 * @param options Exact IDs, base/transport/signal, successful clock and processing marks.
 * @returns Matching catalogue and complete selected result with independent current refresh time.
 * @throws For invalid selections/retrieval/content, or a repeated digest mismatch.
 * @remarks Performs two GETs normally and at most four on mismatch; marks CPU processing
 * after network buffering and before decode, validation, hashing and result construction.
 */
export async function loadPublishedPair(options: PublishedPairOptions): Promise<{ catalogue: Catalogue; result: TranscriptResult }> {
  const base = publishedBase(options.baseUrl);
  sourceId(options.memberId); sourceId(options.sittingId);
  for (let attempt = 0; attempt < 2; attempt++) {
    const catalogue = await loadPublishedCatalogue(options);
    let sitting: Sitting | undefined; let member: Member | undefined;
    for (const entry of catalogue.sittings) if (entry.id === options.sittingId) sitting = entry;
    for (const entry of catalogue.members) if (entry.id === options.memberId) member = entry;
    requireValue(member && sitting, 'selected published pair');
    if (sitting.record.availability === 'unavailable') {
      return { catalogue, result: buildTranscriptResult(catalogue, options.memberId, options.sittingId, null) };
    }
    const url = new URL(`data/sittings/${sitting.id}.json.gz`, base);
    url.searchParams.set('v', sitting.record.digest!);
    const bytes = await publishedBytes(url, DATA_LIMITS.sittingGzip, options);
    options.mark?.('hansard.processing-start');
    const decoded = await decodedBytes(bytes);
    const record = parsePublishedJson(decoded);
    const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(decoded).buffer);
    let digest = '';
    for (const byte of new Uint8Array(hash)) digest += byte.toString(16).padStart(2, '0');
    if (digest !== sitting.record.digest) {
      if (attempt === 0) continue;
      throw new Error('Published sitting digest mismatch after one catalogue retry');
    }
    const accepted = validateSittingRecord(record, sitting, catalogue);
    const result = buildTranscriptResult(catalogue, options.memberId, options.sittingId, accepted, options.now ? options.now() : new Date().toISOString());
    options.mark?.('hansard.processing-end');
    return { catalogue, result };
  }
  throw new Error('Published pair unavailable');
}

/** Requires an unambiguous HTTP application base without credentials or URL suffixes.
 * @param address Configured application base.
 * @returns Validated directory URL.
 * @throws For unsupported authority, scheme, query, fragment or a nondirectory base.
 */
function publishedBase(address: string): URL {
  const base = new URL(address);
  requireValue((base.protocol === 'https:' || base.protocol === 'http:') && !base.username && !base.password && !base.search && !base.hash && base.pathname.endsWith('/'), 'published application base');
  return base;
}

/** Reads bounded raw Fetch bytes and rejects any redirect or changed resource authority.
 * @param url Fixed resource address constructed from the validated application base.
 * @param gzipLimit Maximum stored gzip representation bytes for this resource.
 * @param options Transport and cancellation dependencies.
 * @returns Raw gzip or already transport-decoded bytes, within the relevant limit.
 * @throws For HTTP/redirect/body/stream or limit errors.
 * @remarks Issues a manual-redirect cache-bypassing GET and cancels invalid/oversized bodies.
 */
async function publishedBytes(url: URL, gzipLimit: number, options: PublishedOptions): Promise<Uint8Array> {
  const response = await (options.fetch ?? globalThis.fetch)(url.href, { method: 'GET', cache: 'no-store', redirect: 'manual', signal: options.signal });
  if (!response.ok || response.redirected || (response.url && response.url !== url.href)) {
    if (response.body) await response.body.cancel();
    throw new Error('Published response status or base redirect is invalid');
  }
  requireValue(response.body, 'published response body');
  return boundedStream(response.body, DATA_LIMITS.decoded, gzipLimit);
}

/** Buffers only bytes within the selected representation limit, including split magic prefixes.
 * @param stream Input wire or decompressed stream.
 * @param maximum Decoded byte ceiling.
 * @param gzipMaximum Optional lower raw-gzip ceiling, selected from the first two bytes.
 * @returns A bounded exact-byte buffer.
 * @throws For stream failures or an exceeded byte ceiling.
 * @remarks Reads the stream serially; cancels its producer on failure and releases its lock.
 */
async function boundedStream(stream: ReadableStream<Uint8Array>, maximum: number, gzipMaximum?: number): Promise<Uint8Array> {
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; const prefix: number[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      for (let index = 0; prefix.length < 2 && index < next.value.length; index++) prefix.push(next.value[index]);
      length += next.value.length;
      const limit = gzipMaximum !== undefined && prefix[0] === 31 && prefix[1] === 139 ? gzipMaximum : maximum;
      if (length > limit) throw new Error(`Published resource byte limit exceeded (${limit} bytes)`);
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } catch (error) {
    try { await reader.cancel(error); } catch { /* Preserve the original stream/limit failure. */ }
    throw error;
  } finally { reader.releaseLock(); }
}

/** Inflates a native gzip representation exactly once, leaving transport-decoded JSON untouched.
 * @param bytes Bounded raw Fetch bytes.
 * @returns Exact decoded UTF-8 bytes within the decoded resource ceiling.
 * @throws For invalid gzip or an inflated byte-limit failure.
 * @remarks Uses the native decompression stream and cancels over-limit output.
 */
async function decodedBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (bytes[0] !== 31 || bytes[1] !== 139) return bytes;
  const stream = new Blob([new Uint8Array(bytes).buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return boundedStream(stream, DATA_LIMITS.decoded);
}

/** Parses fatal UTF-8 and JSON without accepting HTML or replacing invalid characters.
 * @param bytes Bounded decoded bytes.
 * @returns Untrusted parsed JSON for authoritative schema validation.
 * @throws For malformed UTF-8 or JSON.
 */
function parsePublishedJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** Decodes one bounded catalogue representation before parsing its JSON.
 * @param bytes Bounded gzip or transport-decoded bytes.
 * @returns Untrusted parsed catalogue JSON.
 * @throws For malformed gzip, UTF-8, JSON or a decoded byte-limit failure.
 */
async function decodedJson(bytes: Uint8Array): Promise<unknown> {
  return parsePublishedJson(await decodedBytes(bytes));
}

/**
 * Rejects unsupported trust-boundary values with a specific field label.
 * @param condition Required validation condition.
 * @param label Field or rule used in the error message.
 * @returns Nothing when the condition is satisfied.
 * @throws When the condition is false.
 */
function requireValue(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`Invalid source data: ${label}`);
}

/**
 * Requires a non-null object without coercing arrays or primitives.
 * @param value Untrusted object value.
 * @param label Field label for rejection.
 * @returns The unchanged object with unknown property values.
 * @throws When the value is not an object.
 */
function sourceObject(value: unknown, label: string): Record<string, unknown> {
  requireValue(typeof value === 'object' && value !== null && !Array.isArray(value), label);
  return value as Record<string, unknown>;
}

/**
 * Requires an array without interpreting missing data as empty content.
 * @param value Untrusted collection.
 * @param label Field label for rejection.
 * @returns The unchanged array.
 * @throws When the value is not an array.
 */
function sourceArray(value: unknown, label: string): unknown[] {
  requireValue(Array.isArray(value), label);
  return value;
}

/**
 * Checks a nonblank source string without trimming or changing its original bytes.
 * @param value Untrusted string.
 * @param label Field label for rejection.
 * @returns The original string.
 * @throws When the value is not a nonblank string.
 */
function sourceString(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.trim().length > 0, label);
  return value;
}

/**
 * Requires a safe integer at or above the supplied minimum.
 * @param value Untrusted integer.
 * @param label Field label for rejection.
 * @param minimum Inclusive lower bound.
 * @returns The exact unchanged integer.
 * @throws When the value is rounded, fractional or below the minimum.
 */
function sourceInteger(value: unknown, label: string, minimum = 0): number {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum, label);
  return value;
}

/**
 * Validates a canonical positive decimal ID without losing source integer precision.
 * @param value Positive safe source integer or normalized decimal string.
 * @returns The exact canonical decimal identity.
 * @throws When coercion, rounding or noncanonical spelling would be required.
 */
export function sourceId(value: unknown): string {
  if (typeof value === 'number') return String(sourceInteger(value, 'source ID', 1));
  requireValue(typeof value === 'string' && /^[1-9]\d*$/.test(value), 'source ID');
  return value;
}

/**
 * Requires an actual calendar date in the source's YYYY-MM-DD representation.
 * @param value Untrusted sitting or coverage date.
 * @returns The unchanged date string.
 * @throws When the spelling or calendar date is invalid.
 */
function sourceDate(value: unknown): string {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'date');
  const date = new Date(`${value}T00:00:00.000Z`);
  requireValue(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, 'calendar date');
  return value;
}

/**
 * Checks an ISO UTC instant while preserving whole-second or millisecond spelling.
 * @param value Untrusted application or explicitly sourced official timestamp.
 * @returns The unchanged UTC timestamp.
 * @throws When the value is absent, non-UTC or an invalid calendar instant.
 */
function sourceInstant(value: unknown): string {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value), 'UTC instant');
  const date = new Date(value);
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  requireValue(Number.isFinite(date.getTime()) && date.toISOString() === canonical, 'calendar instant');
  return value;
}

/**
 * Requires a lowercase SHA-256 digest, distinct in meaning from its field's other hashes.
 * @param value Untrusted digest string.
 * @returns The unchanged digest.
 * @throws When the digest has an unsupported spelling or length.
 */
function sourceDigest(value: unknown): string {
  requireValue(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'SHA-256');
  return value;
}

/**
 * Validates an observed deployment ID before its use as an official route component.
 * @param value Untrusted deployment build ID.
 * @returns The unchanged route-safe build ID.
 * @throws When the value could escape or change the expected route.
 */
function sourceBuildId(value: unknown): string {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value), 'build ID');
  return value;
}

/**
 * Requires a public GitHub Actions run link without credentials, query or fragment.
 * @param value Untrusted workflow URL.
 * @returns The unchanged URL.
 * @throws When it does not identify a GitHub Actions run.
 */
function workflowUrl(value: unknown): string {
  const url = sourceString(value, 'workflow URL');
  requireValue(/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/actions\/runs\/[1-9]\d*$/.test(url), 'workflow URL');
  return url;
}

/**
 * Validates a normalized identity and prevents irrelevant source demographic publication.
 * @param value Untrusted normalized member.
 * @returns The unchanged validated identity.
 * @throws When constrained fields are absent, malformed or include unpublished properties.
 */
function validateMember(value: unknown): Member {
  const member = sourceObject(value, 'member');
  requireValue(typeof member.id === 'string', 'member ID');
  sourceId(member.id);
  sourceString(member.name, 'member name');
  if (member.historicalContext !== null) sourceString(member.historicalContext, 'historical context');
  requireValue(typeof member.listedInLatestSource === 'boolean', 'latest member flag');
  for (const key of Object.keys(member)) requireValue(['id', 'name', 'historicalContext', 'listedInLatestSource'].includes(key), 'unpublished member property');
  return member as unknown as Member;
}

/**
 * Validates immutable sitting metadata shared with normalized shards.
 * @param value Untrusted sitting identity.
 * @returns The unchanged validated identity.
 * @throws When date, hierarchy, filename, house or source status is invalid.
 */
export function validateSittingIdentity(value: unknown): SittingIdentity {
  const sitting = sourceObject(value, 'sitting identity');
  const date = sourceDate(sitting.date);
  sourceInteger(sitting.parliament, 'Parliament', 1);
  sourceInteger(sitting.penggal, 'Penggal', 1);
  sourceInteger(sitting.mesyuarat, 'Mesyuarat');
  requireValue(sitting.house === 'dewan-rakyat', 'house');
  requireValue(sitting.filename === `dr_${date}`, 'sitting filename');
  requireValue(sitting.isFinal === null || typeof sitting.isFinal === 'boolean', 'source final status');
  return sitting as unknown as SittingIdentity;
}

/**
 * Checks exhaustive accepted-leaf accounting without claiming attribution completeness.
 * @param value Untrusted source accounting.
 * @returns The unchanged validated accounting.
 * @throws When any count is invalid or leaves are not accounted exactly once.
 */
function validateAccounting(value: unknown): SourceAccounting {
  const accounting = sourceObject(value, 'source accounting');
  const total = sourceInteger(accounting.total, 'total leaves');
  const assigned = sourceInteger(accounting.assigned, 'assigned leaves');
  const unassigned = sourceInteger(accounting.unassigned, 'unassigned leaves');
  const annotations = sourceInteger(accounting.annotations, 'annotation leaves');
  requireValue(total === assigned + unassigned + annotations, 'exhaustive leaf accounting');
  return accounting as unknown as SourceAccounting;
}

/**
 * Validates accepted or unavailable shard metadata and independent attempt timestamps.
 * @param value Untrusted descriptor.
 * @param sittingId Exact owning sitting ID used in the fixed relative shard path.
 * @returns The unchanged validated descriptor.
 * @throws When availability, provenance, sizes, accounting or timestamps are inconsistent.
 */
function validateDescriptor(value: unknown, sittingId: string): RecordDescriptor {
  const descriptor = sourceObject(value, 'record descriptor');
  requireValue(typeof descriptor.availability === 'string' && ['available', 'retained', 'unavailable'].includes(descriptor.availability), 'availability');
  const attemptedAt = sourceInstant(descriptor.lastAttemptAt);
  requireValue(descriptor.lastAttemptOutcome === 'success' || descriptor.lastAttemptOutcome === 'failed', 'attempt outcome');
  for (const field of ['sourcePublishedAt', 'sourceRevisedAt']) if (descriptor[field] !== null) sourceInstant(descriptor[field]);
  if (descriptor.availability === 'unavailable') {
    for (const field of ['path', 'digest', 'compressedBytes', 'decodedBytes', 'acquiredAt', 'sourceBuildId', 'rawSourceDigest', 'accounting']) requireValue(descriptor[field] === null, `unavailable ${field}`);
    requireValue(descriptor.lastAttemptOutcome === 'failed', 'unavailable attempt outcome');
  } else {
    requireValue(descriptor.path === `data/sittings/${sittingId}.json.gz`, 'fixed shard path');
    sourceDigest(descriptor.digest);
    const compressed = sourceInteger(descriptor.compressedBytes, 'compressed bytes', 1);
    const decoded = sourceInteger(descriptor.decodedBytes, 'decoded bytes', 1);
    requireValue(compressed <= DATA_LIMITS.sittingGzip && decoded <= DATA_LIMITS.decoded, 'record byte bounds');
    const acquiredAt = sourceInstant(descriptor.acquiredAt);
    requireValue(Date.parse(acquiredAt) <= Date.parse(attemptedAt), 'attempt precedes accepted acquisition');
    sourceBuildId(descriptor.sourceBuildId);
    sourceDigest(descriptor.rawSourceDigest);
    validateAccounting(descriptor.accounting);
  }
  return descriptor as unknown as RecordDescriptor;
}

/**
 * Checks a confirmed publication receipt independently from source acquisition metadata.
 * @param value Untrusted confirmed receipt.
 * @returns The unchanged validated receipt.
 * @throws When required receipt identifiers, timestamps or workflow links are invalid.
 */
function validateReceipt(value: unknown): DeploymentReceipt {
  const receipt = sourceObject(value, 'deployment receipt');
  sourceString(receipt.snapshotId, 'receipt snapshot');
  sourceString(receipt.deploymentId, 'deployment ID');
  const publishedAt = sourceInstant(receipt.publishedAt);
  const verifiedAt = sourceInstant(receipt.verifiedServedAt);
  requireValue(Date.parse(verifiedAt) >= Date.parse(publishedAt), 'served verification before publication');
  workflowUrl(receipt.workflowUrl);
  return receipt as unknown as DeploymentReceipt;
}

/** Validates source inventory provenance shared by catalogues and self-contained results.
 * @param value Untrusted inventory acquisition metadata.
 * @param preparedAt Validated snapshot preparation time.
 * @returns The unchanged accepted provenance.
 * @throws When source identity, hashes or acquisition times are invalid.
 */
function validateProvenance(value: unknown, preparedAt: string): Catalogue['provenance'] {
  const provenance = sourceObject(value, 'provenance');
  requireValue(provenance.interface === 'official-next-page-data', 'official source interface');
  sourceBuildId(provenance.sourceBuildId);
  for (const key of ['inventoryAcquiredAt', 'membersAcquiredAt']) requireValue(Date.parse(sourceInstant(provenance[key])) <= Date.parse(preparedAt), 'preparation before inventory acquisition');
  sourceDigest(provenance.inventoryRawDigest);
  sourceDigest(provenance.membersRawDigest);
  return provenance as unknown as Catalogue['provenance'];
}

/** Validates snapshot metadata without inventing its omitted member or sitting inventory.
 * @param value Catalogue or self-contained snapshot metadata.
 * @param snapshotId Exact owning snapshot identity.
 * @returns The unchanged preparation, publication, coverage and status fields.
 * @throws When dates, coverage fields, workflow status or publication proof are invalid.
 */
function validateSnapshotMetadata(value: unknown, snapshotId: string): TranscriptResult['snapshot'] {
  const snapshot = sourceObject(value, 'snapshot metadata');
  const preparedAt = sourceInstant(snapshot.preparedAt);
  const coverage = sourceObject(snapshot.coverage, 'coverage');
  const parliaments = new Set<number>();
  for (const value of sourceArray(coverage.parliaments, 'represented Parliaments')) {
    const parliament = sourceInteger(value, 'represented Parliament', 1);
    requireValue(!parliaments.has(parliament), 'duplicate represented Parliament');
    parliaments.add(parliament);
  }
  if (coverage.startDate !== null) sourceDate(coverage.startDate);
  if (coverage.endDate !== null) sourceDate(coverage.endDate);
  requireValue((coverage.startDate === null) === (coverage.endDate === null) && (coverage.startDate === null || String(coverage.startDate) <= String(coverage.endDate)), 'coverage dates');
  for (const key of ['latestInventoryCount', 'retainedSittingCount', 'unavailableSittingCount', 'attributionGapCount']) sourceInteger(coverage[key], key);
  requireValue(Number(coverage.unavailableSittingCount) <= Number(coverage.latestInventoryCount) + Number(coverage.retainedSittingCount), 'unavailable coverage count');
  const status = sourceObject(snapshot.status, 'pipeline status');
  for (const key of ['acquisitionOutcome', 'stagingOutcome']) requireValue(status[key] === 'success' || status[key] === 'degraded', 'pipeline outcome');
  requireValue(Date.parse(sourceInstant(status.completedAt)) <= Date.parse(preparedAt), 'preparation before pipeline completion');
  if (status.workflowUrl !== null) workflowUrl(status.workflowUrl);
  const receipt = status.lastConfirmedDeployment === null ? null : validateReceipt(status.lastConfirmedDeployment);
  if (snapshot.publishedAt !== null) {
    const publishedAt = sourceInstant(snapshot.publishedAt);
    requireValue(receipt?.snapshotId === snapshotId && receipt.publishedAt === publishedAt && Date.parse(publishedAt) >= Date.parse(preparedAt), 'matching confirmed publication');
  }
  return snapshot as unknown as TranscriptResult['snapshot'];
}

/** Validates one sitting and its descriptor independently of inventory-wide coverage.
 * @param value Untrusted selected or catalogue sitting.
 * @param preparedAt Accepted snapshot preparation instant.
 * @returns The unchanged sitting with accepted official identity and descriptor.
 * @throws When identity, provenance or source-attempt chronology is invalid.
 */
function validateSitting(value: unknown, preparedAt: string): Sitting {
  const sitting = sourceObject(value, 'sitting');
  requireValue(typeof sitting.id === 'string', 'sitting ID');
  const id = sourceId(sitting.id);
  const identity = validateSittingIdentity(sitting);
  requireValue(sitting.sourceUrl === `https://hansard.parlimen.gov.my/hansard/dewan-rakyat/${identity.date}`, 'official source URL');
  requireValue(typeof sitting.listedInLatestInventory === 'boolean', 'latest inventory flag');
  const descriptor = validateDescriptor(sitting.record, id);
  requireValue(Date.parse(descriptor.lastAttemptAt) <= Date.parse(preparedAt), 'preparation before source attempt');
  if (descriptor.acquiredAt !== null) requireValue(Date.parse(descriptor.acquiredAt) <= Date.parse(preparedAt), 'preparation before accepted acquisition');
  return sitting as unknown as Sitting;
}

/**
 * Validates one coherent catalogue before a reader or acquisition accepts a replacement.
 * @param value Untrusted normalized catalogue.
 * @returns The unchanged catalogue; validation never mutates the accepted or replacement input.
 * @throws When schema, references, counts, descriptors or publication evidence differ, or known events occur after preparation.
 */
export function validateCatalogue(value: unknown): Catalogue {
  const catalogue = sourceObject(value, 'catalogue');
  requireValue(catalogue.schemaVersion === 1, 'catalogue schema');
  const snapshotId = sourceString(catalogue.snapshotId, 'snapshot ID');
  const snapshot = validateSnapshotMetadata(catalogue, snapshotId);
  const preparedAt = snapshot.preparedAt;
  validateProvenance(catalogue.provenance, preparedAt);
  const memberIds = new Set<string>();
  for (const candidate of sourceArray(catalogue.members, 'members')) {
    const member = validateMember(candidate);
    requireValue(!memberIds.has(member.id), 'duplicate member ID');
    memberIds.add(member.id);
  }
  const sittingIds = new Set<string>();
  const filenames = new Set<string>();
  const parliaments = new Set<number>();
  let startDate: string | null = null;
  let endDate: string | null = null;
  let latestCount = 0;
  let retainedCount = 0;
  let unavailableCount = 0;
  let gapCount = 0;
  for (const candidate of sourceArray(catalogue.sittings, 'sittings')) {
    const sitting = validateSitting(candidate, preparedAt);
    const id = sitting.id;
    const identity = sitting;
    requireValue(!sittingIds.has(id) && !filenames.has(identity.filename), 'duplicate sitting identity');
    sittingIds.add(id);
    filenames.add(identity.filename);
    const descriptor = sitting.record;
    parliaments.add(identity.parliament);
    if (startDate === null || identity.date < startDate) startDate = identity.date;
    if (endDate === null || identity.date > endDate) endDate = identity.date;
    if (sitting.listedInLatestInventory) latestCount++; else retainedCount++;
    if (descriptor.availability === 'unavailable') unavailableCount++;
    gapCount += descriptor.accounting?.unassigned ?? 0;
  }
  const coverage = sourceObject(catalogue.coverage, 'coverage');
  const suppliedParliaments = sourceArray(coverage.parliaments, 'represented Parliaments');
  const distinctParliaments = new Set<number>();
  for (const parliament of suppliedParliaments) {
    const number = sourceInteger(parliament, 'represented Parliament', 1);
    requireValue(parliaments.has(number) && !distinctParliaments.has(number), 'represented Parliaments mismatch');
    distinctParliaments.add(number);
  }
  requireValue(distinctParliaments.size === parliaments.size && coverage.startDate === startDate && coverage.endDate === endDate, 'coverage bounds');
  requireValue(coverage.latestInventoryCount === latestCount && coverage.retainedSittingCount === retainedCount && coverage.unavailableSittingCount === unavailableCount && coverage.attributionGapCount === gapCount, 'coverage counts');
  return catalogue as unknown as Catalogue;
}

/**
 * Projects validated official identities without publishing source demographic fields.
 * @param value Untrusted official member page-data response.
 * @returns Unique exact source identities in supplied order; absent history stays null.
 * @throws When the response, integer IDs, names or unique identity inventory are invalid.
 */
export function parseSourceMembers(value: unknown): Member[] {
  const pageProps = sourceObject(sourceObject(value, 'member response').pageProps, 'member pageProps');
  const speakers = sourceArray(pageProps.speakers, 'speakers');
  requireValue(speakers.length > 0, 'empty source member inventory');
  const members: Member[] = [];
  const ids = new Set<string>();
  for (const candidate of speakers) {
    const raw = sourceObject(candidate, 'source speaker');
    const id = sourceId(sourceInteger(raw.new_author_id, 'new_author_id', 1));
    requireValue(!ids.has(id), 'duplicate source member ID');
    const member = validateMember({ id, name: raw.name, historicalContext: raw.historicalContext === undefined ? null : raw.historicalContext, listedInLatestSource: true });
    members.push(member);
    ids.add(id);
  }
  return members;
}

/**
 * Recursively validates the dated official hierarchy without dropping unknown structures.
 * @param value Untrusted official catalogue page-data response.
 * @returns Every unique dated source sitting in source traversal order, including meeting zero.
 * @throws When any hierarchy, date, source integer ID, filename or status is unsupported.
 */
export function parseSourceInventory(value: unknown): InventorySitting[] {
  const pageProps = sourceObject(sourceObject(value, 'inventory response').pageProps, 'inventory pageProps');
  const archive = sourceObject(pageProps.archive, 'archive');
  const sittings: InventorySitting[] = [];
  const ids = new Set<string>();
  const filenames = new Set<string>();
  /**
   * Visits each source hierarchy node and records every sitting exactly once.
   * @param value Untrusted hierarchy node.
   * @param hierarchy Validated Parliament/Penggal/Mesyuarat ancestor values.
   * @returns Nothing; appends validated entries to the local inventory.
   * @throws When an unexpected node or duplicate dated identity is encountered.
   * @remarks Mutates only the local result array and identity sets.
   */
  function visit(value: unknown, hierarchy: number[]): void {
    const node = sourceObject(value, 'archive hierarchy');
    if (hierarchy.length > 0) {
      const start = sourceDate(node.start_date);
      const end = sourceDate(node.end_date);
      requireValue(start <= end, 'hierarchy date range');
    }
    if (hierarchy.length === 3) {
      for (const key of Object.keys(node)) requireValue(['start_date', 'end_date', 'sitting_list'].includes(key), 'unsupported meeting field');
      for (const candidate of sourceArray(node.sitting_list, 'sitting list')) {
        const raw = sourceObject(candidate, 'source sitting');
        const id = sourceId(sourceInteger(raw.sitting_id, 'sitting_id', 1));
        const sitting: InventorySitting = {
          id, date: sourceDate(raw.date), parliament: hierarchy[0], penggal: hierarchy[1], mesyuarat: hierarchy[2], house: 'dewan-rakyat',
          filename: sourceString(raw.filename, 'source filename'), isFinal: raw.is_final === undefined ? null : raw.is_final as boolean | null,
          sourceUrl: `https://hansard.parlimen.gov.my/hansard/dewan-rakyat/${sourceDate(raw.date)}`,
        };
        validateSittingIdentity(sitting);
        requireValue(!ids.has(id) && !filenames.has(sitting.filename), 'duplicate source sitting identity');
        ids.add(id);
        filenames.add(sitting.filename);
        sittings.push(sitting);
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'start_date' || key === 'end_date') {
        requireValue(hierarchy.length > 0, 'unsupported root date metadata');
        continue;
      }
      requireValue(/^(0|[1-9]\d*)$/.test(key), 'numeric hierarchy key');
      const number = sourceInteger(Number(key), 'hierarchy integer', hierarchy.length === 2 ? 0 : 1);
      visit(child, [...hierarchy, number]);
    }
  }
  visit(archive, []);
  requireValue(sittings.length > 0, 'empty source sitting inventory');
  return sittings;
}

/**
 * Projects only the stable identity repeated in a shard, preserving every supplied value.
 * @param sitting Validated catalogue sitting.
 * @returns A new identity object without mutable descriptor or inventory metadata.
 */
function sittingIdentity(sitting: Sitting): SittingIdentity {
  return {
    date: sitting.date, parliament: sitting.parliament, penggal: sitting.penggal,
    mesyuarat: sitting.mesyuarat, house: sitting.house, filename: sitting.filename, isFinal: sitting.isFinal,
  };
}

/**
 * Resolves a supplied sitting solely by this catalogue's exact identity.
 * @param catalogue Validated catalogue.
 * @param candidate Supplied sitting whose stable identity must match its catalogue entry.
 * @returns The unchanged reconciled catalogue sitting.
 * @throws When the selected ID, stable identity or official link differs.
 */
function reconciledSitting(catalogue: Catalogue, candidate: Sitting): Sitting {
  const supplied = sourceObject(candidate, 'selected sitting');
  requireValue(typeof supplied.id === 'string', 'selected sitting ID');
  const id = sourceId(supplied.id);
  let selected: Sitting | undefined;
  for (const entry of catalogue.sittings) if (entry.id === id) selected = entry;
  requireValue(selected, 'unreconciled selected sitting');
  validateSittingIdentity(supplied);
  for (const key of ['date', 'parliament', 'penggal', 'mesyuarat', 'house', 'filename', 'isFinal'] as const) {
    requireValue(supplied[key] === selected[key], `selected sitting ${key}`);
  }
  requireValue(supplied.sourceUrl === selected.sourceUrl, 'selected sitting source link');
  return selected;
}

/** Validates original leaf fields and conservative structured attribution in either a full record or selected subset.
 * @param value Untrusted normalized source leaf.
 * @param memberIds Complete accepted identities, or null when the old full inventory is absent.
 * @param retained Whether accepted earlier unknown-ID gaps must retain their original attribution.
 * @returns The unchanged validated source leaf.
 * @throws When source fields or structured attribution are inconsistent.
 */
function validateSourceItem(value: unknown, memberIds: ReadonlySet<string> | null, retained: boolean): SourceItem {
  const item = sourceObject(value, 'source item');
  sourceInteger(item.ordinal, 'source ordinal');
  if (item.sourceIndex !== null) sourceInteger(item.sourceIndex, 'source index');
  for (const heading of sourceArray(item.sectionPath, 'source headings')) requireValue(typeof heading === 'string', 'source heading string');
  requireValue(typeof item.text === 'string', 'source speech string');
  requireValue(item.rawAuthor === null || typeof item.rawAuthor === 'string', 'source author label');
  for (const key of ['sourceAuthorId', 'memberId']) {
    if (item[key] !== null) {
      requireValue(typeof item[key] === 'string', `normalized ${key}`);
      sourceId(item[key]);
    }
  }
  requireValue(item.timestamp === null || typeof item.timestamp === 'string' || (typeof item.timestamp === 'number' && Number.isFinite(item.timestamp)), 'opaque source timestamp');
  if (item.attribution === 'annotation') {
    requireValue(item.memberId === null && item.gapReason === null, 'separate annotation attribution');
  } else if (item.attribution === 'assigned') {
    requireValue(item.memberId === item.sourceAuthorId && typeof item.memberId === 'string' && (memberIds === null || memberIds.has(item.memberId)) && item.gapReason === null, 'exact assigned member');
  } else {
    requireValue(item.attribution === 'unassigned' && item.memberId === null, 'unassigned attribution');
    if (item.gapReason === 'missing-id') requireValue(item.sourceAuthorId === null, 'missing source ID');
    else if (item.gapReason === 'unknown-id') requireValue(typeof item.sourceAuthorId === 'string' && (retained || memberIds === null || !memberIds.has(item.sourceAuthorId)), 'unreconciled source ID');
    else requireValue(item.gapReason === 'conflicting-id' && item.sourceAuthorId !== null, 'structured source identity conflict');
  }
  return item as unknown as SourceItem;
}

/**
 * Validates every normalized leaf and conservative attribution without dropping content.
 * @param value Untrusted normalized item array.
 * @param catalogue Validated catalogue supplying authoritative member IDs.
 * @param retained Preserve earlier unknown-ID gaps in an unchanged retained payload.
 * @returns The unchanged complete validated array in traversal order.
 * @throws When fields, ordinals, source indices or structured attribution are inconsistent.
 */
function validateItems(value: unknown, catalogue: Catalogue, retained = false): SourceItem[] {
  const items = sourceArray(value, 'source items');
  const memberIds = new Set<string>();
  for (const member of catalogue.members) memberIds.add(member.id);
  const sourceIndices = new Set<number>();
  for (let ordinal = 0; ordinal < items.length; ordinal++) {
    const item = validateSourceItem(items[ordinal], memberIds, retained);
    requireValue(item.ordinal === ordinal, 'sequential source ordinal');
    if (item.sourceIndex !== null) {
      requireValue(!sourceIndices.has(item.sourceIndex), 'duplicate source index');
      sourceIndices.add(item.sourceIndex);
    }
  }
  return items as SourceItem[];
}

/**
 * Counts the three exhaustive partitions of already validated normalized source leaves.
 * @param items Complete validated leaf array in source traversal order.
 * @returns Total, assigned, unassigned and annotation counts for an accepted descriptor.
 */
export function sourceAccounting(items: SourceItem[]): SourceAccounting {
  const accounting = { total: items.length, assigned: 0, unassigned: 0, annotations: 0 };
  for (const item of items) {
    if (item.attribution === 'annotation') accounting.annotations++;
    else if (item.attribution === 'unassigned') accounting.unassigned++;
    else accounting.assigned++;
  }
  return accounting;
}

/**
 * Validates published shard identity and complete leaf accounting against one exact catalogue.
 * @param value Untrusted normalized shard.
 * @param sitting Selected catalogue sitting whose descriptor accepted this shard.
 * @param catalogue Reconciled catalogue supplying schema, identity and attribution references.
 * @returns The unchanged validated shard; byte/digest verification remains the retrieval boundary's task.
 * @throws When schema, identity, leaf fields or accepted descriptor accounting differs.
 */
export function validateSittingRecord(value: unknown, sitting: Sitting, catalogue: Catalogue): SittingRecord {
  const selected = reconciledSitting(validateCatalogue(catalogue), sitting);
  requireValue(selected.record.availability !== 'unavailable', 'shard for unavailable record');
  const record = sourceObject(value, 'sitting shard');
  requireValue(record.schemaVersion === catalogue.schemaVersion && record.sittingId === selected.id, 'shard schema and sitting ID');
  const identity = validateSittingIdentity(record.identity);
  for (const key of ['date', 'parliament', 'penggal', 'mesyuarat', 'house', 'filename', 'isFinal'] as const) {
    requireValue(identity[key] === selected[key], `shard identity ${key}`);
  }
  requireValue(record.sourceUrl === selected.sourceUrl, 'shard official link');
  const items = validateItems(record.items, catalogue, selected.record.availability === 'retained');
  const counts = sourceAccounting(items);
  const accepted = selected.record.accounting;
  requireValue(accepted, 'accepted source accounting');
  for (const key of ['total', 'assigned', 'unassigned', 'annotations'] as const) requireValue(counts[key] === accepted[key], `accepted ${key} leaves`);
  return record as unknown as SittingRecord;
}

/**
 * Recursively normalizes every official source leaf with original words and exact-ID attribution.
 * @param raw Untrusted official sitting pageProps or its page-data envelope.
 * @param sitting Reconciled selected sitting; its old descriptor may precede a changed source record.
 * @param catalogue Reconciled member and sitting catalogue.
 * @returns Stable normalized content with every source leaf exactly once, including gaps and annotations.
 * @throws When source identity, structure, marker, fields or provided indices are unsupported.
 */
export function normalizeSourceRecord(raw: unknown, sitting: Sitting, catalogue: Catalogue): SittingRecord {
  const selected = reconciledSitting(validateCatalogue(catalogue), sitting);
  const response = sourceObject(raw, 'record response');
  const record = 'pageProps' in response ? sourceObject(response.pageProps, 'record pageProps') : response;
  const cycle = sourceObject(record.cycle, 'record cycle');
  requireValue(cycle.house === 0, 'source Dewan Rakyat house');
  const identity: SittingIdentity = {
    date: sourceDate(record.date), parliament: sourceInteger(cycle.term, 'source Parliament', 1),
    penggal: sourceInteger(cycle.session, 'source Penggal', 1), mesyuarat: sourceInteger(cycle.meeting, 'source Mesyuarat'),
    house: 'dewan-rakyat', filename: sourceString(record.filename, 'source filename'),
    isFinal: record.is_final === undefined ? null : record.is_final as boolean | null,
  };
  validateSittingIdentity(identity);
  for (const key of ['date', 'parliament', 'penggal', 'mesyuarat', 'house', 'filename', 'isFinal'] as const) {
    requireValue(identity[key] === selected[key], `source identity ${key}`);
  }
  requireValue(sourceObject(record.meta, 'source record metadata').id === `/hansard/dewan-rakyat/${selected.date}`, 'source record route');
  const memberIds = new Set<string>();
  for (const member of catalogue.members) memberIds.add(member.id);
  const items: SourceItem[] = [];
  /**
   * Visits arrays/headings in supplied order and appends every source speech leaf.
   * @param value Untrusted source tree node.
   * @param sectionPath Exact ancestor headings in source traversal order.
   * @returns Nothing; appends original decoded leaf data to the local normalized result.
   * @throws When any unfamiliar node, marker, field or structured ID is unsupported.
   * @remarks Appends only to the captured local items array; input nodes remain unchanged.
   */
  function visit(value: unknown, sectionPath: string[]): void {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, sectionPath);
      return;
    }
    const node = sourceObject(value, 'source speech node');
    if ('speech' in node) {
      for (const key of Object.keys(node)) requireValue(['speech', 'author', 'author_id', 'timestamp', 'is_annotation', 'index', 'new_author_id'].includes(key), 'unsupported source leaf field');
      requireValue(typeof node.speech === 'string', 'source speech string');
      const rawAuthor = node.author === undefined || node.author === null ? null : node.author;
      requireValue(rawAuthor === null || typeof rawAuthor === 'string', 'source author label');
      const sourceAuthorId = node.author_id === undefined || node.author_id === null ? null : sourceId(sourceInteger(node.author_id, 'source author ID', 1));
      const structuredId = node.new_author_id === undefined || node.new_author_id === null ? null : sourceId(sourceInteger(node.new_author_id, 'source structured author ID', 1));
      const marker = node.is_annotation;
      requireValue(marker === undefined || marker === null || typeof marker === 'boolean', 'annotation marker');
      let attribution: SourceItem['attribution'] = 'unassigned';
      let memberId: string | null = null;
      let gapReason: SourceItem['gapReason'] = null;
      if (marker === true) attribution = 'annotation';
      else if (sourceAuthorId === null) gapReason = 'missing-id';
      else if (structuredId !== null && structuredId !== sourceAuthorId) gapReason = 'conflicting-id';
      else if (!memberIds.has(sourceAuthorId)) gapReason = 'unknown-id';
      else { attribution = 'assigned'; memberId = sourceAuthorId; }
      items.push({
        ordinal: items.length, sourceIndex: node.index === undefined || node.index === null ? null : sourceInteger(node.index, 'source index'),
        sectionPath: [...sectionPath], text: node.speech, rawAuthor, sourceAuthorId, memberId, attribution,
        timestamp: node.timestamp === undefined ? null : node.timestamp as SourceItem['timestamp'], gapReason,
      });
      return;
    }
    const headings = Object.entries(node);
    requireValue(headings.length > 0, 'empty unfamiliar source node');
    for (const [heading, children] of headings) visit(sourceArray(children, 'source heading children'), [...sectionPath, heading]);
  }
  visit(sourceArray(record.speeches, 'source speeches'), []);
  validateItems(items, catalogue);
  return { schemaVersion: 1, sittingId: selected.id, identity: sittingIdentity(selected), sourceUrl: selected.sourceUrl, items };
}

/**
 * Derives an exact selected pair while keeping all speaking gaps and annotations visible.
 * @param catalogue Validated catalogue for this published snapshot.
 * @param memberId Selected exact member ID.
 * @param sittingId Selected exact sitting ID.
 * @param record Accepted matching shard, or null only when the published record is unavailable.
 * @param refreshedAt Successful device pair-validation UTC instant, when present.
 * @returns A self-contained copy of accepted snapshot metadata, identities, source provenance, ordered partitions and semantic outcome.
 * @throws When selection, schema, identity, fields or accepted accounting does not validate.
 */
export function buildTranscriptResult(catalogue: Catalogue, memberId: string, sittingId: string, record: SittingRecord | null, refreshedAt: string | null = null): TranscriptResult {
  validateCatalogue(catalogue);
  sourceId(memberId);
  sourceId(sittingId);
  let member: Member | undefined;
  let sitting: Sitting | undefined;
  for (const entry of catalogue.members) if (entry.id === memberId) member = entry;
  for (const entry of catalogue.sittings) if (entry.id === sittingId) sitting = entry;
  requireValue(member && sitting, 'selected catalogue pair');
  if (refreshedAt !== null) sourceInstant(refreshedAt);
  const turns: SourceItem[] = [];
  const gaps: SourceItem[] = [];
  const annotations: SourceItem[] = [];
  let outcome: TranscriptResult['outcome'] = 'unavailable';
  if (sitting.record.availability === 'unavailable') {
    requireValue(record === null, 'unavailable published record');
    refreshedAt = null;
  } else {
    const accepted = validateSittingRecord(record, sitting, catalogue);
    for (const item of accepted.items) {
      if (item.attribution === 'annotation') annotations.push(item);
      else if (item.attribution === 'unassigned') gaps.push(item);
      else if (item.memberId === memberId) turns.push(item);
    }
    outcome = transcriptOutcome(turns.length, gaps.length);
  }
  return structuredClone({
    schemaVersion: 1, snapshotId: catalogue.snapshotId, memberId, sittingId, member, sitting,
    snapshot: { preparedAt: catalogue.preparedAt, publishedAt: catalogue.publishedAt, coverage: catalogue.coverage, status: catalogue.status },
    provenance: catalogue.provenance, recordDigest: sitting.record.digest, turns, gaps, annotations,
    refreshedAt, saved: false, outcome,
  });
}

/** Classifies an accepted selected subset without converting attribution gaps into absence.
 * @param turnCount Number of selected assigned leaves.
 * @param gapCount Number of all sitting attribution gaps.
 * @returns The participation outcome for an accepted record.
 */
function transcriptOutcome(turnCount: number, gapCount: number): TranscriptResult['outcome'] {
  return gapCount > 0 ? 'incomplete' : turnCount > 0 ? 'ready' : 'verified-absence';
}

/** Compares accepted JSON metadata without depending on object-property insertion order.
 * @param left Opened metadata or original source value.
 * @param right Corresponding accepted catalogue value.
 * @returns Whether every own JSON field and ordered array entry agrees.
 */
function sameSourceValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null || Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key) || !sameSourceValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key])) return false;
  }
  return true;
}

/** Validates a self-contained selected result using its own accepted snapshot and source partitions.
 * @param value Untrusted online or stored result retaining its original metadata.
 * @param catalogue Optional accepted catalogue for exact write-time metadata binding.
 * @returns The unchanged validated result, without relabeling it from a newer catalogue.
 * @throws When metadata, selected identity, digest binding, source fields, partition completeness or semantic outcome is invalid.
 * @remarks Omitted other-member turns are not reconstructed; a subset cannot rehash its original full shard.
 */
export function validateTranscriptResult(value: unknown, catalogue?: Catalogue): TranscriptResult {
  const result = sourceObject(value, 'transcript result');
  requireValue(result.schemaVersion === 1, 'result schema');
  const snapshotId = sourceString(result.snapshotId, 'snapshot ID');
  const snapshot = validateSnapshotMetadata(result.snapshot, snapshotId);
  const provenance = validateProvenance(result.provenance, snapshot.preparedAt);
  requireValue(typeof result.memberId === 'string' && typeof result.sittingId === 'string', 'result pair IDs');
  const memberId = sourceId(result.memberId);
  const sittingId = sourceId(result.sittingId);
  const member = validateMember(result.member);
  const sitting = validateSitting(result.sitting, snapshot.preparedAt);
  requireValue(member.id === memberId && sitting.id === sittingId, 'self-contained selected identities');
  requireValue(snapshot.coverage.parliaments.includes(sitting.parliament) && snapshot.coverage.startDate !== null && snapshot.coverage.endDate !== null && snapshot.coverage.startDate <= sitting.date && snapshot.coverage.endDate >= sitting.date, 'selected sitting coverage');
  requireValue((sitting.listedInLatestInventory ? snapshot.coverage.latestInventoryCount : snapshot.coverage.retainedSittingCount) > 0, 'selected inventory coverage');
  requireValue(result.recordDigest === sitting.record.digest, 'accepted result digest');
  requireValue(typeof result.saved === 'boolean', 'saved result flag');
  if (result.refreshedAt !== null) sourceInstant(result.refreshedAt);
  const turns = sourceArray(result.turns, 'selected turns');
  const gaps = sourceArray(result.gaps, 'sitting attribution gaps');
  const annotations = sourceArray(result.annotations, 'sitting annotations');
  let memberIds: Set<string> | null = null;
  if (catalogue !== undefined) {
    const accepted = validateCatalogue(catalogue);
    let selectedMember: Member | undefined;
    let selectedSitting: Sitting | undefined;
    memberIds = new Set<string>();
    for (const entry of accepted.members) { memberIds.add(entry.id); if (entry.id === memberId) selectedMember = entry; }
    for (const entry of accepted.sittings) if (entry.id === sittingId) selectedSitting = entry;
    requireValue(accepted.snapshotId === snapshotId && sameSourceValue(member, selectedMember) && sameSourceValue(sitting, selectedSitting), 'matching result catalogue identities');
    requireValue(sameSourceValue(provenance, accepted.provenance) && sameSourceValue(snapshot, { preparedAt: accepted.preparedAt, publishedAt: accepted.publishedAt, coverage: accepted.coverage, status: accepted.status }), 'matching result snapshot metadata');
  }
  if (sitting.record.availability === 'unavailable') {
    requireValue(turns.length === 0 && gaps.length === 0 && annotations.length === 0 && result.outcome === 'unavailable' && result.refreshedAt === null, 'unavailable result content');
  } else {
    sourceDigest(result.recordDigest);
    const accounting = sitting.record.accounting!;
    requireValue(gaps.length === accounting.unassigned && annotations.length === accounting.annotations && turns.length <= accounting.assigned && snapshot.coverage.attributionGapCount >= gaps.length, 'complete selected source partitions');
    const ordinals = new Set<number>();
    const indices = new Set<number>();
    for (const [partition, attribution] of [[turns, 'assigned'], [gaps, 'unassigned'], [annotations, 'annotation']] as const) {
      let previous = -1;
      for (const candidate of partition) {
        const item = validateSourceItem(candidate, memberIds, memberIds === null || sitting.record.availability === 'retained');
        requireValue(item.attribution === attribution && (attribution !== 'assigned' || item.memberId === memberId), 'selected source partition');
        requireValue(item.ordinal > previous && item.ordinal < accounting.total && !ordinals.has(item.ordinal), 'unique ordered subset ordinal');
        previous = item.ordinal; ordinals.add(item.ordinal);
        if (item.sourceIndex !== null) { requireValue(!indices.has(item.sourceIndex), 'duplicate subset source index'); indices.add(item.sourceIndex); }
      }
    }
    requireValue(result.outcome === transcriptOutcome(turns.length, gaps.length), 'selected source outcome');
  }
  return result as unknown as TranscriptResult;
}
