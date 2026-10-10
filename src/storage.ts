import { validateCatalogue, validateTranscriptResult, type Catalogue, type TranscriptResult } from './source.ts';

/** Persisted UI preferences use exact IDs or explicitly absent selections. */
export interface ReaderPreferences { language: 'ms' | 'en'; memberId: string | null; sittingId: string | null }
/** Missing device state never represents an empty source inventory. */
export interface StorageState { catalogue: Catalogue | null; preferences: ReaderPreferences | null }
/** Saved-pair compatibility remains separate from source participation semantics. */
export type SavedPair = { status: 'saved'; result: TranscriptResult } | { status: 'missing' } | { status: 'incompatible' };
/** Concrete transaction-based device storage, without shell-cache or offline-reopen promises. */
export interface ReaderStorage {
  readState(): Promise<StorageState>;
  saveState(catalogue: Catalogue | null, preferences: ReaderPreferences): Promise<void>;
  readPair(memberId: string, sittingId: string): Promise<SavedPair>;
  savePair(catalogue: Catalogue, result: TranscriptResult, preferences: ReaderPreferences): Promise<TranscriptResult>;
  close(): void;
}
/** Repository identity and native IndexedDB injection for controlled unit tests. */
export interface StorageOptions { baseUrl: string; indexedDB?: IDBFactory }

/** Scopes device records to the complete origin and repository base.
 * @param baseUrl Absolute application repository base.
 * @returns The canonical application database name.
 * @throws For a non-HTTP application base, credentials, query, fragment or missing trailing slash.
 */
export function storageDatabaseName(baseUrl: string): string {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('Invalid storage application base');
  return 'hansard:' + base.href;
}

/** Requires an accepted complete pair that was committed as a saved result.
 * @param value Untrusted self-contained stored pair.
 * @returns The unchanged source-validated saved result.
 * @throws When source compatibility fails or a complete save is absent.
 */
export function validateSavedResult(value: unknown): TranscriptResult {
  const result = validateTranscriptResult(value);
  if (!result.saved || result.outcome === 'unavailable') throw new Error('No compatible complete saved result');
  return result;
}

/** Observes native transaction completion rather than any individual request success.
 * @param transaction Native IndexedDB transaction to observe before enqueuing work.
 * @returns Completion only after a native commit event.
 * @throws The native transaction error, or AbortError for an explicit rollback.
 * @remarks Attaches terminal event listeners and removes them after commit or abort.
 */
export function transactionCommitted(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>(
    /** Registers terminal native transaction observers.
     * @param resolve Commit acknowledgement callback.
     * @param reject Native rollback rejection callback.
     * @returns Nothing after attaching listeners.
     * @remarks Observes the captured transaction and settles only the captured promise.
     */
    (resolve, reject) => {
      /** Removes the two terminal observers. @returns Nothing. @remarks Removes listeners from the captured native transaction. */
      function cleanup(): void { transaction.removeEventListener('complete', complete); transaction.removeEventListener('abort', abort); }
      /** Acknowledges committed work. @returns Nothing. @remarks Removes listeners and resolves the captured completion promise. */
      function complete(): void { cleanup(); resolve(); }
      /** Rejects after native rollback. @returns Nothing. @remarks Removes listeners and rejects the captured completion promise. */
      function abort(): void { cleanup(); reject(transaction.error ?? new DOMException('IndexedDB transaction aborted', 'AbortError')); }
      transaction.addEventListener('complete', complete);
      transaction.addEventListener('abort', abort);
    },
  );
}

/** Checks locale and exact source selections against their accepted catalogue.
 * @param value Untrusted UI preferences.
 * @param catalogue Accepted catalogue, or null before a source list is available.
 * @returns The unchanged compatible preferences.
 * @throws When language or selected IDs are invalid or unavailable in the accepted list.
 */
function validatePreferences(value: unknown, catalogue: Catalogue | null): ReaderPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid reader preferences');
  const preferences = value as ReaderPreferences;
  if (preferences.language !== 'ms' && preferences.language !== 'en') throw new Error('Invalid reader language');
  for (const field of ['memberId', 'sittingId'] as const) {
    const selected = preferences[field];
    if (selected === null) continue;
    if (typeof selected !== 'string' || !/^[1-9]\d*$/.test(selected) || catalogue === null) throw new Error('Invalid reader selection');
    let found = false;
    for (const entry of field === 'memberId' ? catalogue.members : catalogue.sittings) if (entry.id === selected) found = true;
    if (!found) throw new Error('Unknown reader selection');
  }
  return preferences;
}

/** Opens the application v1 database without migrating or deleting incompatible stored data.
 * @param options Explicit application namespace and optional native storage boundary.
 * @returns Validated read methods and transaction-acknowledged state/pair writes.
 * @throws On denied/unsupported storage, incompatible database version or native open failure.
 * @remarks Creates only this application's three stores and keeps its native connection until close/versionchange.
 */
export async function openStorage(options: StorageOptions): Promise<ReaderStorage> {
  const name = storageDatabaseName(options.baseUrl);
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) throw new Error('IndexedDB is unavailable');
  const database = await new Promise<IDBDatabase>(
    /** Opens the native schema and observes its result.
     * @param resolve Successful native connection callback.
     * @param reject Native opening failure callback.
     * @returns Nothing after registering request listeners.
     * @remarks Opens only the captured application database and creates its initial stores.
     */
    (resolve, reject) => {
      const request = factory.open(name, 1);
      request.onupgradeneeded =
        /** Creates the initial application stores. @returns Nothing. @remarks Creates stores only within this native version upgrade. */
        () => { for (const store of ['catalogue', 'preferences', 'pairs']) request.result.createObjectStore(store); };
      request.onerror =
        /** Propagates native denial/version/open errors. @returns Nothing. @remarks Rejects the captured opening promise. */
        () => { reject(request.error); };
      request.onsuccess =
        /** Returns the opened application connection. @returns Nothing. @remarks Resolves the captured opening promise. */
        () => { resolve(request.result); };
    },
  );
  database.onversionchange =
    /** Releases an obsolete connection for a later compatible reader. @returns Nothing. @remarks Closes the captured native connection without deleting its records. */
    () => { database.close(); };

  /** Commits selected catalogue/preferences and optionally one complete opened pair atomically.
   * @param catalogue Accepted replacement list, or null to retain the existing list.
   * @param preferences Validated UI choices.
   * @param result Optional copied complete pair with its saved flag set.
   * @returns Completion after the whole native write transaction commits.
   * @throws Native enqueue/commit errors; preserves the exact synchronous enqueue error after rollback.
   * @remarks Writes only this application's selected stores and aborts all queued writes on enqueue failure.
   */
  async function writeState(catalogue: Catalogue | null, preferences: ReaderPreferences, result?: TranscriptResult): Promise<void> {
    const stores = result ? ['catalogue', 'preferences', 'pairs'] : catalogue ? ['catalogue', 'preferences'] : ['preferences'];
    const transaction = database.transaction(stores, 'readwrite');
    const committed = transactionCommitted(transaction);
    try {
      if (catalogue !== null) transaction.objectStore('catalogue').put(catalogue, 'current');
      transaction.objectStore('preferences').put(preferences, 'current');
      if (result) transaction.objectStore('pairs').put(result, [result.memberId, result.sittingId]);
    } catch (error) {
      try { transaction.abort(); } catch { /* A native transaction may already have rolled back. Preserve the original enqueue failure. */ }
      try { await committed; } catch { /* Rollback is complete; the original synchronous error remains authoritative. */ }
      throw error;
    }
    await committed;
  }

  return {
    /** Reads native state to completion before exposing compatible source data.
     * @returns A validated list/preferences pair, with incompatible values represented as null.
     * @throws Native transaction/read failures.
     * @remarks Opens a read transaction without deleting or replacing unknown stored records.
     */
    async readState() {
      const transaction = database.transaction(['catalogue', 'preferences']);
      const committed = transactionCommitted(transaction);
      const catalogueRequest = transaction.objectStore('catalogue').get('current');
      const preferencesRequest = transaction.objectStore('preferences').get('current');
      await committed;
      let catalogue: Catalogue | null = null;
      let preferences: ReaderPreferences | null = null;
      try { catalogue = validateCatalogue(catalogueRequest.result); } catch { /* Missing or incompatible source lists remain unavailable. */ }
      try { preferences = validatePreferences(preferencesRequest.result, catalogue); } catch { /* Unknown preferences remain stored for a compatible reader. */ }
      return { catalogue, preferences };
    },
    /** Persists language/selections together with an accepted catalogue when supplied.
     * @param catalogue Accepted list or null to preserve an already stored list.
     * @param preferences Explicit compatible UI choices.
     * @returns Completion only after the state transaction commits.
     * @throws Source/preference validation or native storage failures.
     * @remarks Atomically writes preferences and the supplied catalogue, without saving any pair.
     */
    async saveState(catalogue, preferences) {
      if (catalogue !== null) validateCatalogue(catalogue);
      validatePreferences(preferences, catalogue);
      await writeState(catalogue, preferences);
    },
    /** Reads only the exact opened-pair key and validates its own original metadata.
     * @param memberId Exact selected member identity.
     * @param sittingId Exact selected sitting identity.
     * @returns Saved content, genuine missing state or explicit incompatibility.
     * @throws Native transaction/read failures.
     * @remarks Opens a read transaction without altering incompatible or unrelated pair records.
     */
    async readPair(memberId, sittingId) {
      const transaction = database.transaction('pairs');
      const committed = transactionCommitted(transaction);
      const request = transaction.objectStore('pairs').get([memberId, sittingId]);
      await committed;
      if (request.result === undefined) return { status: 'missing' };
      try {
        const result = validateSavedResult(request.result);
        if (result.memberId !== memberId || result.sittingId !== sittingId) return { status: 'incompatible' };
        return { status: 'saved', result };
      } catch { return { status: 'incompatible' }; }
    },
    /** Atomically saves one complete opened pair, its exact catalogue and selected preferences.
     * @param catalogue Matching accepted list from the successful pair load.
     * @param result Complete online source result with its original accepted metadata.
     * @param preferences UI choices selecting exactly this pair.
     * @returns A copied saved result only after all three stores commit.
     * @throws Validation, quota, enqueue or native commit failures.
     * @remarks Writes three stores in one transaction; never changes the online result or a prior saved copy on failure.
     */
    async savePair(catalogue, result, preferences) {
      const accepted = validateTranscriptResult(result, catalogue);
      validatePreferences(preferences, catalogue);
      if (accepted.outcome === 'unavailable' || preferences.memberId !== accepted.memberId || preferences.sittingId !== accepted.sittingId) throw new Error('No matching complete opened pair');
      const saved = structuredClone(accepted); saved.saved = true;
      await writeState(catalogue, preferences, saved);
      return saved;
    },
    /** Releases the native connection. @returns Nothing. @remarks Closes this application's database connection without deleting stored records. */
    close() { database.close(); },
  };
}
