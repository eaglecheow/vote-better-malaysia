import { expect, test, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openStorage, storageDatabaseName, transactionCommitted, validateSavedResult, type ReaderPreferences, type ReaderStorage } from '../../src/storage.ts';
import { readerFixture } from '../fixtures/reader.ts';
import { buildTranscriptResult, validateCatalogue, validateTranscriptResult, type TranscriptResult } from '../../src/source.ts';

const baseUrl = 'https://example.test/vote-better-malaysia/';
const preferences: ReaderPreferences = { language: 'en', memberId: '1839', sittingId: '29326' };

/**
 * Opens an independently controlled fake IndexedDB database using the agreed three-store layout.
 * @param factory Isolated in-memory native API implementation.
 * @param name Application database namespace.
 * @param version Requested schema for compatibility tests.
 * @returns A test fixture connection; no application storage method is implemented here.
 * @remarks Creates only controlled in-memory stores when the test fixture needs an upgrade.
 */
function fixtureDatabase(factory: IDBFactory, name: string, version = 1): Promise<IDBDatabase> {
  return new Promise(
    /** Observes the test database open. @param resolve Successful connection callback. @param reject Failed fixture callback. @returns Nothing. @remarks Registers fixture request listeners. */
    (resolve, reject) => {
      const request = factory.open(name, version);
      request.onupgradeneeded =
        /** Creates controlled fixture stores. @returns Nothing. @remarks Writes only this isolated fake database schema. */
        () => { for (const store of ['catalogue', 'preferences', 'pairs']) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store); };
      request.onsuccess =
        /** Completes fixture setup. @returns Nothing. @remarks Resolves the captured fixture promise. */
        () => { resolve(request.result); };
      request.onerror =
        /** Reports a fixture setup failure. @returns Nothing. @remarks Rejects the captured fixture promise. */
        () => { reject(request.error); };
    },
  );
}

/**
 * Seeds a malformed or previous saved copy through native test-database operations.
 * @param factory Isolated fake IndexedDB factory.
 * @param store One agreed object store.
 * @param value Controlled stored payload.
 * @param key Native singleton or compound pair key.
 * @param version Independently controlled database schema version.
 * @returns A promise after the independent fixture transaction completes.
 * @remarks Writes only an isolated in-memory fixture and closes its connection.
 */
async function seed(factory: IDBFactory, store: 'catalogue' | 'preferences' | 'pairs', value: unknown, key: IDBValidKey = 'current', version = 1): Promise<void> {
  const db = await fixtureDatabase(factory, `hansard:${baseUrl}`, version);
  await new Promise<void>(
    /** Commits controlled fixture data without invoking application storage behavior. @param resolve Completion callback. @param reject Failure callback. @returns Nothing. @remarks Writes one fake IDB transaction and registers fixture event listeners. */
    (resolve, reject) => {
      const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value, key);
      tx.oncomplete =
        /** Signals fixture completion. @returns Nothing. @remarks Resolves the captured fixture promise. */
        () => { resolve(); };
      tx.onabort =
        /** Signals fixture rollback. @returns Nothing. @remarks Rejects the captured fixture promise. */
        () => { reject(tx.error); };
    },
  ); db.close();
}

/**
 * Reads raw controlled fixture bytes without applying application compatibility rules.
 * @param factory Isolated fake IndexedDB factory.
 * @param store Store whose raw value must survive an incompatible read.
 * @param key Native singleton or exact-pair key.
 * @param version Independently controlled database schema version.
 * @returns The unchanged fixture value from the independent native read.
 * @remarks Opens and closes an isolated fixture connection and observes its request.
 */
async function rawValue(factory: IDBFactory, store: 'catalogue' | 'preferences' | 'pairs', key: IDBValidKey = 'current', version = 1): Promise<unknown> {
  const db = await fixtureDatabase(factory, `hansard:${baseUrl}`, version);
  const value = await new Promise<unknown>(
    /** Reads one fixture value. @param resolve Raw value callback. @param reject Fixture read error callback. @returns Nothing. @remarks Registers request listeners on the controlled database. */
    (resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key);
      request.onsuccess =
        /** Delivers unchanged fixture data. @returns Nothing. @remarks Resolves the captured raw read promise. */
        () => { resolve(request.result); };
      request.onerror =
        /** Reports fixture read failure. @returns Nothing. @remarks Rejects the captured raw read promise. */
        () => { reject(request.error); };
    },
  ); db.close(); return value;
}

/**
 * Returns a controlled stored pair with an explicit malformed field override.
 * @param path Dot-separated existing field path.
 * @param value Invalid field value.
 * @returns A malformed isolated stored-result fixture; performs no compatibility validation.
 */
function malformed(path: string, value: unknown): TranscriptResult {
  const result = structuredClone(readerFixture().result); result.saved = true;
  const parts = path.split('.'); let target = result as unknown as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
  target[parts[parts.length - 1]] = value; return result;
}

/**
 * Creates one inert production boundary with an isolated fake IndexedDB context.
 * @param url Repository base for namespace tests.
 * @returns Native-shaped fake factory and production storage object.
 */
async function setup(url = baseUrl): Promise<{ factory: IDBFactory; storage: ReaderStorage }> {
  const factory = new IDBFactory(); const storage = await openStorage({ baseUrl: url, indexedDB: factory }); return { factory, storage };
}

test('STORAGE001: database names are scoped to the complete origin and repository base',
  /** Checks repository-safe database namespace identity. @returns Nothing. */
  () => {
    expect.soft(storageDatabaseName(baseUrl)).toBe(`hansard:${baseUrl}`);
    expect.soft(storageDatabaseName('https://example.test/other/')).toBe('hansard:https://example.test/other/');
    expect.soft(storageDatabaseName('https://other.test/vote-better-malaysia/')).toBe('hansard:https://other.test/vote-better-malaysia/');
  });

test('STORAGE002: opening an application initializes exactly its own native database',
  /** Checks native storage initialization without claiming physical-browser IDB behavior. @returns Resolves after assertions. */
  async () => {
    const { factory } = await setup(); expect(await factory.databases()).toEqual([{ name: `hansard:${baseUrl}`, version: 1 }]);
  });

test('STORAGE003: missing state is explicitly null and an unopened pair is missing',
  /** Checks absent local data remains separate from an empty source inventory/participation result. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); expect.soft(await storage.readState()).toEqual({ catalogue: null, preferences: null });
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'missing' });
  });

test('STORAGE004: catalogue and valid language/source selections persist together',
  /** Checks state persistence across concrete close/reopen operations. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await storage.saveState(fixture.catalogue, preferences); storage.close();
    const reopened = await openStorage({ baseUrl, indexedDB: factory }); expect(await reopened.readState()).toEqual({ catalogue: fixture.catalogue, preferences }); reopened.close();
  });

test('STORAGE005: complete source turns, gaps, annotations and accepted snapshot metadata commit as one opened pair',
  /** Checks exact self-contained pair persistence and immutable online input. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture();
    const saved = await storage.savePair(fixture.catalogue, fixture.result, preferences);
    expect.soft(saved).toEqual({ ...fixture.result, saved: true }); expect(fixture.result.saved).toBe(false);
    expect.soft(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: { ...fixture.result, saved: true } });
    expect(await storage.readState()).toEqual({ catalogue: fixture.catalogue, preferences });
  });

test('STORAGE006: saving one member never saves a different member from the same fetched sitting',
  /** Checks opened-pair keys rather than sitting-wide availability. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture(); await storage.savePair(fixture.catalogue, fixture.result, preferences);
    expect(await storage.readPair('4463', '29326')).toEqual({ status: 'missing' });
  });

test('STORAGE007: saving only catalogue/preferences never marks a transcript pair as saved',
  /** Checks independent list persistence cannot imply transcript readiness. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); await storage.saveState(readerFixture().catalogue, preferences);
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'missing' });
  });

test('STORAGE008: successful replacement advances saved refresh time only to the accepted result time',
  /** Checks committed replacement preserves exact successful device timestamp semantics. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture(); await storage.savePair(fixture.catalogue, fixture.result, preferences);
    const updated = { ...fixture.result, refreshedAt: '2026-10-10T07:00:00.000Z' }; await storage.savePair(fixture.catalogue, updated, preferences);
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: { ...updated, saved: true } });
  });

test('STORAGE009: local results retain original identities and snapshot metadata when newer catalogue state changes',
  /** Checks older compatible copies are never relabeled from current inventory. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture(); await storage.savePair(fixture.catalogue, fixture.result, preferences);
    const newer = structuredClone(fixture.catalogue); newer.snapshotId = 'newer-snapshot'; newer.preparedAt = '2026-10-10T07:00:00.000Z';
    newer.members[0].name = 'Updated source name'; newer.sittings[0].record.digest = 'f'.repeat(64);
    await storage.saveState(newer, { ...preferences, language: 'ms' });
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: { ...fixture.result, saved: true } });
  });

test('STORAGE010: repository namespaces isolate saved pairs and language preferences',
  /** Checks two applications sharing an origin do not share device records. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await storage.savePair(fixture.catalogue, fixture.result, preferences);
    const other = await openStorage({ baseUrl: 'https://example.test/other/', indexedDB: factory });
    expect.soft(await other.readState()).toEqual({ catalogue: null, preferences: null }); expect(await other.readPair('1839', '29326')).toEqual({ status: 'missing' });
  });

test('STORAGE011: transaction request success is not commit completion',
  /** Checks the actual API event ordering through the fake native transaction boundary. @returns Resolves after assertions. */
  async () => {
    const factory = new IDBFactory(); const db = await fixtureDatabase(factory, 'controlled-completion'); const tx = db.transaction('pairs', 'readwrite');
    let settled = false;
    const finished = transactionCommitted(tx).then(
      /** Observes application completion. @returns Nothing. @remarks Updates this test's settled flag. */
      () => { settled = true; },
    );
    const request = tx.objectStore('pairs').put({ controlled: true }, ['1839', '29326']);
    const prematurelyCompleted = await new Promise<boolean>(
      /** Observes request success before commit. @param resolve Fixture observer callback. @returns Nothing. @remarks Registers one request-success listener. */
      (resolve) => { request.onsuccess =
        /** Captures completion state at request success. @returns Nothing. @remarks Resolves the captured observation promise. */
        () => { resolve(settled); }; },
    );
    expect(prematurelyCompleted).toBe(false); await finished; expect(settled).toBe(true); db.close();
  });

test('STORAGE012: transaction abort rejects instead of acknowledging a saved transcript',
  /** Checks required rollback rejection without claiming native-browser behavior. @returns Resolves after assertions. */
  async () => {
    const factory = new IDBFactory(); const db = await fixtureDatabase(factory, 'controlled-abort'); const tx = db.transaction('pairs', 'readwrite');
    tx.objectStore('pairs').put({ controlled: true }, ['1839', '29326']); const completion = transactionCommitted(tx); tx.abort();
    await expect(completion).rejects.toBeInstanceOf(Error); db.close();
  });

test('STORAGE013: quota/write failure propagates and never changes the current online result to saved',
  /** Checks device failure remains compatible with separately readable online content. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture();
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Rejects a controlled quota write. @param _value Ignored fixture payload. @param _key Ignored native key. @returns No request. @throws Controlled native quota error. */
      (_value, _key) => { throw new DOMException('controlled quota', 'QuotaExceededError'); },
    );
    try { await expect.soft(storage.savePair(fixture.catalogue, fixture.result, preferences)).rejects.toMatchObject({ name: 'QuotaExceededError' }); }
    finally { put.mockRestore(); }
    expect(fixture.result.saved).toBe(false);
  });

test('STORAGE014: failed replacement preserves the previous saved content and successful refresh time',
  /** Checks a seeded accepted copy survives a failed write. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); const previous = { ...fixture.result, saved: true };
    await seed(factory, 'pairs', previous, ['1839', '29326']);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Rejects only controlled replacement writes. @param _value Ignored payload. @param _key Ignored native key. @returns No request. @throws Controlled replacement quota error. */
      (_value, _key) => { throw new DOMException('controlled quota', 'QuotaExceededError'); },
    );
    try { await storage.savePair(fixture.catalogue, { ...fixture.result, refreshedAt: '2026-10-10T07:00:00.000Z' }, preferences).catch(
      /** Allows checking retained data after the expected failure. @returns Nothing; no error is presented as RED evidence by itself. */
      () => {},
    ); } finally { put.mockRestore(); }
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: previous });
  });

test('STORAGE015: native transaction abort preserves previous catalogue, preferences and pair together',
  /** Checks atomic three-store rollback using an aborting transaction event boundary. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); const previous = { ...fixture.result, saved: true };
    await seed(factory, 'catalogue', fixture.catalogue); await seed(factory, 'preferences', preferences); await seed(factory, 'pairs', previous, ['1839', '29326']);
    const original = IDBObjectStore.prototype.put;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Aborts after a controlled pair request is queued. @param this Controlled native object store. @param value Stored payload. @param key Native key. @returns Queued native request. @remarks Aborts the controlled pair transaction; other fixture reads remain usable. */
      function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        const request = Reflect.apply(original, this, [value, key]) as IDBRequest<IDBValidKey>;
        if (this.name === 'pairs') this.transaction.abort(); return request;
      },
    );
    try { await storage.savePair(fixture.catalogue, { ...fixture.result, refreshedAt: '2026-10-10T07:00:00.000Z' }, { ...preferences, language: 'ms' }).catch(
      /** Continues to inspect transaction rollback. @returns Nothing. */
      () => {},
    ); } finally { put.mockRestore(); }
    expect.soft(await storage.readState()).toEqual({ catalogue: fixture.catalogue, preferences });
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: previous });
  });

test('STORAGE016: eviction or deletion makes the exact pair missing without inventing recovery or absence',
  /** Checks removed device data stays distinguishable from participation results. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await seed(factory, 'pairs', { ...fixture.result, saved: true }, ['1839', '29326']);
    const db = await fixtureDatabase(factory, `hansard:${baseUrl}`); const tx = db.transaction('pairs', 'readwrite'); tx.objectStore('pairs').delete(['1839', '29326']);
    await new Promise<void>(
      /** Observes independent fixture deletion. @param resolve Completion callback. @returns Nothing. @remarks Registers the fixture transaction completion callback. */
      (resolve) => { tx.oncomplete =
        /** Completes fixture deletion. @returns Nothing. @remarks Resolves the captured deletion promise. */
        () => { resolve(); }; },
    ); db.close(); expect(await storage.readPair('1839', '29326')).toEqual({ status: 'missing' });
  });

test.each([
  ['schemaVersion', 2], ['memberId', '4463'], ['member.id', '4463'], ['member.name', 42], ['member.historicalContext', undefined],
  ['snapshotId', ''],
  ['sittingId', '26241'], ['sitting.id', '26241'], ['sitting.date', '2026-02-11'], ['sitting.house', 'dewan-negara'], ['sitting.filename', 'dr_wrong'],
  ['recordDigest', 'd'.repeat(64)], ['sitting.record.digest', 'f'.repeat(64)], ['recordDigest', 'bad-digest'],
  ['snapshot.preparedAt', 'yesterday'], ['snapshot.publishedAt', 'guessed'], ['snapshot.status.acquisitionOutcome', 'unknown'],
  ['snapshot.coverage.startDate', 'bad-date'], ['snapshot.coverage.latestInventoryCount', -1], ['provenance.membersRawDigest', 'bad-digest'],
  ['refreshedAt', '2026-10-10'], ['saved', 'yes'], ['outcome', 'verified-absence'],
  ['turns.0.memberId', '4463'], ['turns.0.sourceAuthorId', '999'], ['turns.0.text', 42], ['turns.0.sectionPath', [42]],
  ['turns.0.timestamp', {}], ['turns.0.ordinal', -1], ['gaps.0.gapReason', null], ['gaps.0.memberId', '1839'],
  ['turns.0.attribution', 'unassigned'], ['turns.0.gapReason', 'unknown-id'], ['gaps.0.ordinal', 2],
  ['annotations.0.attribution', 'assigned'], ['annotations.0.memberId', '1839'], ['gaps', []], ['annotations', []],
] as Array<[string, unknown]>)('STORAGE017: malformed saved field %s rejects compatible-content validation',
  /** Checks every controlled saved trust-boundary mismatch. @param path Malformed field path. @param value Invalid stored value. @returns Nothing. */
  (path, value) => {
    expect(
      /** Exercises inert stored-result validation. @returns The result if incorrectly accepted. @throws Required compatibility rejection after implementation. */
      () => validateSavedResult(malformed(path, value)),
    ).toThrow();
  });

test('STORAGE018: a compatible saved pair preserves exact historical nulls, original strings and source metadata',
  /** Checks positive self-contained compatibility without a current catalogue relabel. @returns Nothing. */
  () => {
    const result = { ...readerFixture().result, saved: true }; expect(validateSavedResult(result)).toEqual(result);
  });

test.each([['schemaVersion', 2], ['recordDigest', 'bad-digest'], ['member.id', '4463'], ['turns.0.text', 42]] as Array<[string, unknown]>)('STORAGE019: incompatible stored %s returns unavailable compatibility state without deleting it',
  /** Checks malformed cache reads are not absence or guessed recovery. @param path Invalid saved field. @param value Invalid field value. @returns Resolves after assertions. */
  async (path, value) => {
    const { factory, storage } = await setup(); const invalid = malformed(path, value); await seed(factory, 'pairs', invalid, ['1839', '29326']);
    expect.soft(await storage.readPair('1839', '29326')).toEqual({ status: 'incompatible' });
    expect(await rawValue(factory, 'pairs', ['1839', '29326'])).toEqual(invalid);
  });

test('STORAGE020: a stored result under another pair key is incompatible rather than relabeled',
  /** Checks key/result identity binding separately from a valid result body. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); await seed(factory, 'pairs', { ...readerFixture().result, saved: true }, ['4463', '29326']);
    expect(await storage.readPair('4463', '29326')).toEqual({ status: 'incompatible' });
  });

test.each([
  { language: 'de', memberId: '1839', sittingId: '29326' },
  { language: 'ms', memberId: '999', sittingId: '29326' },
  { language: 'en', memberId: '1839', sittingId: '999' },
  { language: 'en', memberId: 1839, sittingId: '29326' },
])('STORAGE021: invalid preferences %j reject before replacing accepted state',
  /** Checks every required locale/selection constraint. @param invalid Invalid controlled preferences. @returns Resolves after assertions. */
  async (invalid) => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await seed(factory, 'catalogue', fixture.catalogue); await seed(factory, 'preferences', preferences);
    await expect.soft(storage.saveState(fixture.catalogue, invalid as ReaderPreferences)).rejects.toBeInstanceOf(Error);
    expect.soft(await storage.readState()).toEqual({ catalogue: fixture.catalogue, preferences });
  });

test('STORAGE022: language and absent selections can persist before any catalogue exists',
  /** Checks update/first-visit preferences without manufacturing a source inventory. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const initial: ReaderPreferences = { language: 'en', memberId: null, sittingId: null };
    await storage.saveState(null, initial); expect(await storage.readState()).toEqual({ catalogue: null, preferences: initial });
  });

test('STORAGE023: null-catalogue preferences never erase an already accepted catalogue',
  /** Checks absent new list data preserves previous validated device state. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await seed(factory, 'catalogue', fixture.catalogue);
    const initial: ReaderPreferences = { language: 'ms', memberId: null, sittingId: null }; await storage.saveState(null, initial);
    expect(await storage.readState()).toEqual({ catalogue: fixture.catalogue, preferences: initial });
  });

test('STORAGE024: selected IDs cannot be persisted without their validated catalogue',
  /** Checks null source inventory cannot establish valid selection identity. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); await expect(storage.saveState(null, preferences)).rejects.toBeInstanceOf(Error);
  });

test('STORAGE025: invalid replacement catalogue cannot overwrite previously accepted state',
  /** Checks stored-list validation preserves the previous catalogue. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); await seed(factory, 'catalogue', fixture.catalogue); await seed(factory, 'preferences', preferences);
    const invalid = structuredClone(fixture.catalogue); invalid.schemaVersion = 2 as 1;
    await expect.soft(storage.saveState(invalid, preferences)).rejects.toBeInstanceOf(Error);
    expect(await storage.readState()).toEqual({ catalogue: fixture.catalogue, preferences });
  });

test('STORAGE026: an unavailable source result cannot be acknowledged as a saved transcript',
  /** Checks no accepted payload remains distinct from a complete saved empty subset. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture('unavailable'); await expect(storage.savePair(fixture.catalogue, fixture.result, preferences)).rejects.toBeInstanceOf(Error);
  });

test('STORAGE027: opening denied device storage rejects without changing online source content',
  /** Checks the permission/open failure boundary remains independent from online reading. @returns Resolves after assertions. */
  async () => {
    const factory = new IDBFactory(); const open = vi.spyOn(factory, 'open').mockImplementation(
      /** Rejects native storage access. @param _name Ignored database name. @param _version Ignored schema version. @returns No request. @throws Controlled storage access error. */
      (_name, _version) => { throw new DOMException('controlled denial', 'SecurityError'); },
    );
    try { await expect(openStorage({ baseUrl, indexedDB: factory })).rejects.toMatchObject({ name: 'SecurityError' }); }
    finally { open.mockRestore(); }
  });

test('STORAGE028: opening an incompatible future database version preserves its raw data',
  /** Checks reader compatibility never triggers destructive database replacement. @returns Resolves after assertions. */
  async () => {
    const factory = new IDBFactory(); const future = { futureSchema: 2, originalValue: 'retained for a compatible future reader' };
    await seed(factory, 'pairs', future, ['1839', '29326'], 2);
    await expect.soft(openStorage({ baseUrl, indexedDB: factory })).rejects.toBeInstanceOf(Error);
    expect(await factory.databases()).toEqual([{ name: `hansard:${baseUrl}`, version: 2 }]);
    expect(await rawValue(factory, 'pairs', ['1839', '29326'], 2)).toEqual(future);
  });

test.each(['ready', 'absence'] as const)('STORAGE029: a validated %s semantic outcome saves without changing its meaning',
  /** Checks ready and verified absence remain accepted complete saved results. @param mode Controlled complete semantic fixture. @returns Resolves after assertions. */
  async (mode) => {
    const { storage } = await setup(); const fixture = readerFixture(mode);
    const selected: ReaderPreferences = { ...preferences, memberId: fixture.result.memberId };
    await storage.savePair(fixture.catalogue, fixture.result, selected);
    expect(await storage.readPair(fixture.result.memberId, fixture.result.sittingId)).toEqual({ status: 'saved', result: { ...fixture.result, saved: true } });
  });

test.each([['schemaVersion', 2], ['member.id', '4463'], ['recordDigest', 'bad-digest'], ['gaps', []]] as Array<[string, unknown]>)('STORAGE030: invalid opened %s rejects before replacing a saved copy',
  /** Checks write validation cannot bypass saved-read compatibility rules. @param path Invalid opened field. @param value Invalid value. @returns Resolves after assertions. */
  async (path, value) => {
    const { factory, storage } = await setup(); const fixture = readerFixture(); const previous = { ...fixture.result, saved: true };
    await seed(factory, 'pairs', previous, ['1839', '29326']);
    const invalid = malformed(path, value); invalid.saved = false;
    await expect.soft(storage.savePair(fixture.catalogue, invalid, preferences)).rejects.toBeInstanceOf(Error);
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'saved', result: previous });
  });

test.each(['snapshot', 'member', 'sitting', 'digest'] as const)('STORAGE031: mismatched %s catalogue cannot be atomically saved with an older result',
  /** Checks the committed catalogue and opened pair share accepted source identity. @param field Controlled catalogue/result disagreement. @returns Resolves after assertions. */
  async (field) => {
    const { storage } = await setup(); const fixture = readerFixture(); const catalogue = structuredClone(fixture.catalogue);
    if (field === 'snapshot') catalogue.snapshotId = 'different-accepted-snapshot';
    if (field === 'member') catalogue.members[0].name = 'Different accepted source identity';
    if (field === 'sitting') catalogue.sittings[0].isFinal = true;
    if (field === 'digest') catalogue.sittings[0].record.digest = 'f'.repeat(64);
    await expect(storage.savePair(catalogue, fixture.result, preferences)).rejects.toBeInstanceOf(Error);
  });

test('STORAGE032: storing an online-unsaved result cannot make the exact pair locally saved',
  /** Checks persisted flag compatibility cannot manufacture a committed save claim. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); await seed(factory, 'pairs', readerFixture().result, ['1839', '29326']);
    expect(await storage.readPair('1839', '29326')).toEqual({ status: 'incompatible' });
  });

test('STORAGE033: pair save preferences cannot silently select another member',
  /** Checks pair save state retains the explicitly opened source pair. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture();
    await expect(storage.savePair(fixture.catalogue, fixture.result, { ...preferences, memberId: '4463' })).rejects.toBeInstanceOf(Error);
  });

test.each([[null, '29326'], ['1839', null], [null, null]] as Array<[string | null, string | null]>)('STORAGE034: valid absent selection %j/%j persists beside its accepted catalogue',
  /** Checks language preferences do not require fabricating a complete selected pair. @param memberId Explicitly selected or absent member. @param sittingId Explicitly selected or absent sitting. @returns Resolves after assertions. */
  async (memberId, sittingId) => {
    const { storage } = await setup(); const catalogue = readerFixture().catalogue;
    const selected: ReaderPreferences = { language: 'ms', memberId, sittingId };
    await storage.saveState(catalogue, selected);
    expect(await storage.readState()).toEqual({ catalogue, preferences: selected });
  });

test('STORAGE035: an incompatible stored catalogue exposes neither a validated list nor dependent selected IDs',
  /** Checks read validation preserves unknown raw data while refusing source-derived selections. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const invalid = readerFixture().catalogue; invalid.schemaVersion = 2 as 1;
    await seed(factory, 'catalogue', invalid); await seed(factory, 'preferences', preferences);
    expect.soft(await storage.readState()).toEqual({ catalogue: null, preferences: null });
    expect(await rawValue(factory, 'catalogue')).toEqual(invalid); expect(await rawValue(factory, 'preferences')).toEqual(preferences);
  });

test.each([
  { language: 'de', memberId: '1839', sittingId: '29326' },
  { language: 'ms', memberId: '999', sittingId: '29326' },
  { language: 'en', memberId: '1839', sittingId: '999' },
  { language: 'en', memberId: 1839, sittingId: '29326' },
])('STORAGE036: invalid stored preferences %j are not exposed as valid selections',
  /** Checks existing untrusted preferences use the same locale/selection requirements as writes. @param invalid Controlled invalid stored preferences. @returns Resolves after assertions. */
  async (invalid) => {
    const { factory, storage } = await setup(); const catalogue = readerFixture().catalogue;
    await seed(factory, 'catalogue', catalogue); await seed(factory, 'preferences', invalid);
    expect.soft(await storage.readState()).toEqual({ catalogue, preferences: null });
    expect(await rawValue(factory, 'preferences')).toEqual(invalid);
  });

test('STORAGE037: valid stored language and null selections survive absent catalogue data',
  /** Checks an unavailable list never prevents compatible locale restoration. @returns Resolves after assertions. */
  async () => {
    const { factory, storage } = await setup(); const initial: ReaderPreferences = { language: 'en', memberId: null, sittingId: null };
    await seed(factory, 'preferences', initial);
    expect(await storage.readState()).toEqual({ catalogue: null, preferences: initial });
  });

test('STORAGE038: savePair acknowledges saved content only after its native three-store transaction completes',
  /** Checks the public save method observes commit rather than only exposing an unused completion helper. @returns Resolves after assertions. */
  async () => {
    const { storage } = await setup(); const fixture = readerFixture(); const original = IDBObjectStore.prototype.put;
    let completed = false; let acknowledged = false; let acknowledgedAtRequest: boolean | null = null;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Observes actual pair writes without replacing native transaction behavior. @param this Controlled native object store. @param value Stored payload. @param key Native key. @returns The original native request. @remarks Registers request/commit observers and changes only local assertion flags. */
      function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        const request = Reflect.apply(original, this, [value, key]) as IDBRequest<IDBValidKey>;
        if (this.name === 'pairs') {
          request.addEventListener('success',
            /** Records acknowledgement at request success. @returns Nothing. @remarks Updates the captured local observation flag. */
            () => { acknowledgedAtRequest = acknowledged; },
          );
          this.transaction.addEventListener('complete',
            /** Records actual transaction completion. @returns Nothing. @remarks Updates the captured local commit flag. */
            () => { completed = true; },
          );
        }
        return request;
      },
    );
    try {
      const result = await storage.savePair(fixture.catalogue, fixture.result, preferences);
      acknowledged = true;
      expect.soft(acknowledgedAtRequest).toBe(false); expect.soft(completed).toBe(true);
      expect(result).toEqual({ ...fixture.result, saved: true });
    } finally { put.mockRestore(); }
  });

test('STORAGE-REVIEW-SCOPE: catalogue, preferences and pair writes share one actual three-store transaction',
  /** Checks the real public write scope rather than assuming that request completion implies atomicity.
   * @returns Completion after observed native write/transaction assertions.
   * @remarks Wraps only actual fake-IDB puts and restores the prototype after observation.
   */
  async function checksWriteScope(): Promise<void> {
    const { storage } = await setup(); const fixture = readerFixture(); const original = IDBObjectStore.prototype.put;
    const stores: string[] = []; const transactions = new Set<IDBTransaction>(); const scopes: string[][] = [];
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Forwards each actual write while recording its native transaction identity/scope.
       * @param this Actual controlled object store.
       * @param value Proposed stored payload.
       * @param key Exact singleton or selected-pair key.
       * @returns The unchanged native request.
       * @remarks Appends local observations and forwards the native database write.
       */
      function (this: IDBObjectStore, value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
        stores.push(this.name); transactions.add(this.transaction); scopes.push(Array.from(this.transaction.objectStoreNames));
        return Reflect.apply(original, this, [value, key]) as IDBRequest<IDBValidKey>;
      },
    );
    try {
      await storage.savePair(fixture.catalogue, fixture.result, preferences);
      expect.soft(stores.sort()).toEqual(['catalogue', 'pairs', 'preferences']);
      expect.soft(transactions.size).toBe(1);
      expect.soft(scopes).toEqual(Array(3).fill(['catalogue', 'pairs', 'preferences']));
    } finally { put.mockRestore(); storage.close(); }
  });

test('STORAGE-REVIEW-REQUEST-ABORT: public save rejects an actual abort after pair request success and rolls back every store',
  /** Reaches public request-success/abort effects absent from the original inert save path.
   * @returns Completion after actual native event, rejection and independent raw rollback assertions.
   * @remarks Seeds isolated accepted state, wraps native puts and aborts only the replacement transaction.
   */
  async function checksPublicRequestAbort(): Promise<void> {
    const { factory, storage } = await setup(); const fixture = readerFixture(); const previous = { ...fixture.result, saved: true };
    await seed(factory, 'catalogue', fixture.catalogue); await seed(factory, 'preferences', preferences); await seed(factory, 'pairs', previous, ['1839', '29326']);
    const replacement = replacementPair(); const original = IDBObjectStore.prototype.put;
    let requestSucceeded = false; let aborted = false; let error: unknown = null;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Forwards native writes and aborts only after the pair request genuinely succeeds.
       * @param this Actual controlled object store.
       * @param value Proposed stored payload.
       * @param key Native singleton or compound key.
       * @returns The original native request.
       * @remarks Registers native event observations and aborts the actual replacement transaction.
       */
      function (this: IDBObjectStore, value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
        const request = Reflect.apply(original, this, [value, key]) as IDBRequest<IDBValidKey>;
        if (this.name === 'pairs') request.addEventListener('success',
          /** Aborts after observed pair request success. @returns Nothing. @remarks Updates local evidence and aborts the captured native transaction. */
          () => {
            requestSucceeded = true;
            this.transaction.addEventListener('abort',
              /** Records native rollback. @returns Nothing. @remarks Updates only the local abort observation. */
              () => { aborted = true; },
            );
            this.transaction.abort();
          },
        );
        return request;
      },
    );
    try { await storage.savePair(replacement.catalogue, replacement.result, { ...preferences, language: 'ms' }); } catch (caught) { error = caught; }
    finally { put.mockRestore(); }
    expect.soft(requestSucceeded).toBe(true); expect.soft(aborted).toBe(true); expect.soft(error).toBeInstanceOf(Error);
    expect.soft(await rawValue(factory, 'catalogue')).toEqual(fixture.catalogue);
    expect.soft(await rawValue(factory, 'preferences')).toEqual(preferences);
    expect(await rawValue(factory, 'pairs', ['1839', '29326'])).toEqual(previous); storage.close();
  });

test('STORAGE-REVIEW-SYNC-ERROR: a third-put failure preserves the exact original error and rolls back two already queued writes',
  /** Exercises synchronous failure after real queued writes instead of failing before the transaction begins.
   * @returns Completion after original-error identity, real prefix writes and raw rollback assertions.
   * @remarks Seeds controlled state and injects one original quota error after two forwarded native requests.
   */
  async function checksOriginalEnqueueError(): Promise<void> {
    const { factory, storage } = await setup(); const fixture = readerFixture(); const previous = { ...fixture.result, saved: true };
    await seed(factory, 'catalogue', fixture.catalogue); await seed(factory, 'preferences', preferences); await seed(factory, 'pairs', previous, ['1839', '29326']);
    const replacement = replacementPair(); const original = IDBObjectStore.prototype.put;
    const quota = new DOMException('Controlled original third-write quota error', 'QuotaExceededError');
    let attempted = 0; let queued = 0; let error: unknown = null;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
      /** Queues two actual native requests before throwing the exact controlled original failure.
       * @param this Actual controlled object store.
       * @param value Proposed stored payload.
       * @param key Native singleton or selected-pair key.
       * @returns An unchanged request for the first two writes.
       * @throws The exact original quota exception on the third enqueue.
       * @remarks Forwards native writes and changes only local enqueue counters.
       */
      function (this: IDBObjectStore, value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
        attempted++; if (attempted === 3) throw quota;
        const request = Reflect.apply(original, this, [value, key]) as IDBRequest<IDBValidKey>; queued++; return request;
      },
    );
    try { await storage.savePair(replacement.catalogue, replacement.result, { ...preferences, language: 'ms' }); } catch (caught) { error = caught; }
    finally { put.mockRestore(); }
    expect.soft(attempted).toBe(3); expect.soft(queued).toBe(2); expect.soft(error).toBe(quota);
    expect.soft(await rawValue(factory, 'catalogue')).toEqual(fixture.catalogue);
    expect.soft(await rawValue(factory, 'preferences')).toEqual(preferences);
    expect(await rawValue(factory, 'pairs', ['1839', '29326'])).toEqual(previous); storage.close();
  });

/**
 * Creates a coherent changed snapshot/result for transaction rollback tests.
 * @returns Fresh accepted catalogue and matching complete result with a later device check.
 * @throws On controlled source metadata or record validation failure.
 */
function replacementPair() {
  const fixture = readerFixture(); const catalogue = structuredClone(fixture.catalogue);
  catalogue.snapshotId = 'controlled-replacement-snapshot'; catalogue.preparedAt = '2026-10-10T07:00:00.000Z';
  catalogue.status.completedAt = '2026-10-10T06:59:00.000Z';
  return { catalogue, result: buildTranscriptResult(catalogue, '1839', '29326', fixture.record, '2026-10-10T07:01:00.000Z') };
}

test('STORAGE-REVIEW-SOURCE-SUBSET: source authority accepts a self-contained saved result with real omitted-member ordinal holes',
  /** Requires selected-subset validation without fabricating the missing full sitting or old catalogue.
   * @returns Nothing after preserved self-contained metadata and unchanged-body assertions.
   */
  function checksSourceSubset(): void {
    const fixture = readerFixture();
    const result = { ...buildTranscriptResult(fixture.catalogue, '4463', '29326', fixture.record, fixture.result.refreshedAt), saved: true };
    expect(result.turns.map(
      /** Reads the source ordinal without renumbering a selected subset. @param item Original selected item. @returns Its source traversal ordinal. */
      (item) => item.ordinal,
    )).toEqual([4]);
    const before = structuredClone(result);
    expect.soft(validateTranscriptResult(result)).toBe(result);
    expect(result).toEqual(before);
  });

test('STORAGE-REVIEW-SOURCE-ONLINE: source authority accepts a matching unsaved online result without changing its saving state',
  /** Requires the optional catalogue binding to support online input before a storage commit.
   * @returns Nothing after authoritative result identity and input-preservation assertions.
   */
  function checksSourceOnline(): void {
    const fixture = readerFixture(); const before = structuredClone(fixture.result);
    expect.soft(validateTranscriptResult(fixture.result, fixture.catalogue)).toBe(fixture.result);
    expect(fixture.result).toEqual(before);
  });

/**
 * Rejects write-time metadata conflicts that are not selected identity or digest changes.
 * @param field Independently valid current catalogue metadata that differs from the opened snapshot.
 * @returns Nothing after the shared authority's binding rejection.
 */
function rejectsSourceMetadataBinding(field: 'preparedAt' | 'provenance' | 'status' | 'coverage'): void {
  const fixture = readerFixture(); const catalogue = structuredClone(fixture.catalogue);
  if (field === 'preparedAt') catalogue.preparedAt = '2026-10-10T07:00:00.000Z';
  if (field === 'provenance') catalogue.provenance.inventoryRawDigest = 'f'.repeat(64);
  if (field === 'status') catalogue.status.workflowUrl = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/10';
  if (field === 'coverage') {
    const unavailable = structuredClone(catalogue.sittings[1]);
    unavailable.id = '99999'; unavailable.date = '1959-09-11'; unavailable.parliament = 1; unavailable.penggal = 1;
    unavailable.filename = 'dr_1959-09-11'; unavailable.sourceUrl = 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1959-09-11';
    catalogue.sittings.push(unavailable); catalogue.coverage.parliaments.push(1); catalogue.coverage.startDate = unavailable.date;
    catalogue.coverage.latestInventoryCount++; catalogue.coverage.unavailableSittingCount++;
  }
  expect(validateCatalogue(catalogue)).toBe(catalogue);
  expect(validateTranscriptResult.bind(null, fixture.result, catalogue)).toThrow();
}
test.each(['preparedAt', 'provenance', 'status', 'coverage'] as const)('STORAGE-REVIEW-SOURCE-BIND-%s: optional catalogue cannot relabel opened snapshot metadata', rejectsSourceMetadataBinding);

/**
 * Rejects malformed subset location fields absent from the original saved-result matrix.
 * @param defect Visible duplicate source index, impossible ordinal or reversed partition order.
 * @returns Nothing after shared source-result validation rejects the malformed subset.
 */
function rejectsSourceSubsetLocations(defect: 'index' | 'ordinal' | 'order'): void {
  const result = malformed('saved', true);
  if (defect === 'index') result.annotations[0].sourceIndex = result.turns[0].sourceIndex;
  if (defect === 'ordinal') result.annotations[0].ordinal = result.sitting.record.accounting!.total;
  if (defect === 'order') result.gaps.reverse();
  expect(validateTranscriptResult.bind(null, result)).toThrow();
}
test.each(['index', 'ordinal', 'order'] as const)('STORAGE-REVIEW-SOURCE-LOCATION-%s: included subset locations stay unique, bounded and ordered', rejectsSourceSubsetLocations);
