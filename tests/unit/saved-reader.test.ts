// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mountReader, type ReaderDependencies } from '../../src/main.ts';
import { buildTranscriptResult, type TranscriptResult } from '../../src/source.ts';
import type { ReaderPreferences, ReaderStorage, SavedPair } from '../../src/storage.ts';
import type { UpdateClient, UpdateState } from '../../src/updates.ts';
import { readerFixture } from '../fixtures/reader.ts';

const labels = {
  ms: { saved: 'Transkrip disimpan pada peranti.', unsaved: 'Transkrip belum disimpan pada peranti.', ready: 'Pembaca sedia dibuka semula tanpa sambungan.', limit: 'Pembukaan semula tanpa sambungan belum dapat dipastikan.', older: 'Salinan lama yang disimpan masih tersedia tanpa sambungan.', connection: 'Sambungan diperlukan untuk membuka pasangan identiti dan persidangan yang belum disimpan.', firstVisit: 'Sambungan diperlukan untuk memuatkan senarai dan rekod yang belum disimpan.', incompatible: 'Data yang disimpan tidak serasi. Sambungan diperlukan untuk mendapatkan salinan yang sah.', storage: 'Storan peranti tidak tersedia. Bacaan dalam talian masih boleh digunakan.', apply: 'Gunakan kemas kini', continue: 'Teruskan membaca' },
  en: { saved: 'Transcript saved on this device.', unsaved: 'Transcript is not saved on this device.', ready: 'Reader ready to reopen offline.', limit: 'Offline reopening is not confirmed.', older: 'The older saved copy remains available offline.', connection: 'A connection is required to open this unsaved identity and sitting pair.', firstVisit: 'A connection is required to load unsaved lists and records.', incompatible: 'Saved data is incompatible. A connection is required to retrieve a valid copy.', storage: 'Device storage is unavailable. Online reading remains usable.', apply: 'Apply update', continue: 'Continue reading' },
};

/** Prepares a coherent accepted newer pair; a changed-text branch is explicitly synthetic. @param changed Whether the controlled accepted source bytes change. @returns Fresh catalogue/result with a later successful validation time. @throws Propagates shared result validation failure. */
function newer(changed = false) {
  const fixture = readerFixture(); fixture.catalogue.snapshotId = 'controlled-saved-reader-newer';
  fixture.catalogue.preparedAt = '2026-10-10T06:59:00.000Z'; fixture.catalogue.status.completedAt = '2026-10-10T06:58:00.000Z';
  if (changed) {
    for (const item of fixture.record!.items) if (item.memberId === '1839') { item.text += '\n\nControlled changed-source fixture.'; break; }
    const bytes = Buffer.from(JSON.stringify(fixture.record));
    fixture.catalogue.sittings[0].record.digest = createHash('sha256').update(bytes).digest('hex');
    fixture.catalogue.sittings[0].record.decodedBytes = bytes.length; fixture.catalogue.sittings[0].record.compressedBytes = gzipSync(bytes).length;
  }
  fixture.result = buildTranscriptResult(fixture.catalogue, '1839', '29326', fixture.record, '2026-10-10T07:00:00.000Z');
  return fixture;
}

/** Creates separately controlled storage/load/worker outcomes without implementing coordination or DOM policy. @param language Valid saved UI locale. @param changed Whether new accepted source bytes differ. @returns Inert-reader input boundaries and exact old/new expected payloads. @remarks Replaces the isolated test body; mocked methods only return specified boundary outcomes and record calls. */
function scenario(language: 'ms' | 'en', changed = false) {
  const old = readerFixture(); const fresh = newer(changed); const saved = { ...old.result, saved: true };
  const preferences: ReaderPreferences = { language, memberId: '1839', sittingId: '29326' };
  const root = document.createElement('main'); document.body.replaceChildren(root);
  const online = { value: true }; const state: { value: UpdateState } = { value: { shellReady: true, waitingVersion: null, applying: false, failed: false } };
  const observers = new Set<(state: UpdateState) => void>(); const marks: string[] = [];
  const storage = {
    readState: vi.fn<ReaderStorage['readState']>().mockResolvedValue({ catalogue: old.catalogue, preferences }),
    saveState: vi.fn<ReaderStorage['saveState']>().mockResolvedValue(undefined),
    readPair: vi.fn<ReaderStorage['readPair']>().mockResolvedValue({ status: 'saved', result: saved }),
    savePair: vi.fn<ReaderStorage['savePair']>().mockResolvedValue({ ...fresh.result, saved: true }),
    close: vi.fn<ReaderStorage['close']>(),
  } satisfies ReaderStorage;
  const updates = {
    getState: vi.fn<UpdateClient['getState']>().mockImplementation(
      /** Returns an explicit controlled worker-state observation. @returns Current fixture state; no readiness is inferred from mocks. */
      () => state.value,
    ),
    subscribe: vi.fn<UpdateClient['subscribe']>().mockImplementation(
      /** Records a reader state observer. @param observer Actual reader callback. @returns Independent fixture unsubscribe. @remarks Records/removes only controlled observer callbacks, never worker/cache policy. */
      (observer) => { observers.add(observer); return (
        /** Removes one controlled observer. @returns Nothing. @remarks Removes only the captured fixture observer. */
        () => { observers.delete(observer); }
      ); },
    ),
    apply: vi.fn<UpdateClient['apply']>().mockResolvedValue(undefined), continue: vi.fn<UpdateClient['continue']>(), close: vi.fn<UpdateClient['close']>(),
  } satisfies UpdateClient;
  const loadCatalogue = vi.fn<ReaderDependencies['loadCatalogue']>().mockResolvedValue(fresh.catalogue);
  const loadPair = vi.fn<ReaderDependencies['loadPair']>().mockResolvedValue({ catalogue: fresh.catalogue, result: fresh.result });
  const openStorage = vi.fn().mockResolvedValue(storage);
  const dependencies: ReaderDependencies = { loadCatalogue, loadPair, openStorage, updates,
    /** Returns controlled native connection knowledge. @returns Whether the isolated browser fixture is online. */
    online: () => online.value,
    /** Supplies independent clock input. @returns Current controlled UTC time, never an acquisition receipt. */
    now: () => '2026-10-10T07:01:00.000Z',
    /** Records actual reader timing marks. @param name Stable mark identifier. @returns Nothing. @remarks Appends to this fixture's mark observations. */
    mark: (name) => { marks.push(name); },
    /** Completes the injected unit paint boundary. @returns A resolved promise; no physical paint proof. */
    requestPaint: async () => {},
  };
  return { root, old, fresh, saved, preferences, storage, updates, state, observers, marks, online, dependencies, loadCatalogue, loadPair, openStorage };
}

/** Advances asynchronous native DOM handler work without adding app behavior. @returns Promise after the next task. */
async function settle(): Promise<void> { await new Promise<void>(
  /** Schedules one unit task. @param resolve Task completion callback. @returns Nothing. @remarks Schedules a zero-delay fixture timer. */
  (resolve) => { setTimeout(resolve, 0); },
); }

/** Starts the actual reader using controlled boundary outputs. @param context Isolated scenario inputs. @returns Native teardown after initial tasks complete. @remarks Mounts production DOM without implementing saving/updates in the test. */
async function start(context: ReturnType<typeof scenario>): Promise<() => void> { const cleanup = mountReader(context.root, context.dependencies); await settle(); return cleanup; }

/** Reads optional native DOM text without invalid null/string matchers masking missing behavior. @param root Actual reader root. @param selector Semantic selector. @returns Exact text or empty string when behavior is missing. */
function text(root: HTMLElement, selector: string): string { return root.querySelector(selector)?.textContent ?? ''; }

/** Reads exact source strings in each rendered partition. @param root Native reader root. @param kind Turn, gap or annotation. @returns Exact original text sequence. */
function texts(root: HTMLElement, kind: string): string[] { const values: string[] = []; for (const item of root.querySelectorAll(`[data-kind="${kind}"] .source-text`)) values.push(item.textContent ?? ''); return values; }

/** Checks all original source strings and ordered IDs without reducing complete content to a status flag. @param context Reader scenario. @param result Exact expected complete pair. @returns Nothing. */
function complete(context: ReturnType<typeof scenario>, result: TranscriptResult): void {
  for (const [kind, items] of [['turn', result.turns], ['gap', result.gaps], ['annotation', result.annotations]] as const) {
    const expected: string[] = []; for (const item of items) expected.push(item.text);
    expect.soft(texts(context.root, kind)).toEqual(expected);
  }
  expect.soft(context.root.querySelector('#reader-result')?.getAttribute('data-member-id')).toBe(result.memberId);
  expect.soft(context.root.querySelector('#reader-result')?.getAttribute('data-sitting-id')).toBe(result.sittingId);
}

/** Sends a real select change after asserting the required control exists. @param root Native reader root. @param id Exact selector ID. @param value UI locale or exact source ID. @returns Nothing. @remarks Changes and dispatches the actual DOM control. */
function choose(root: HTMLElement, id: string, value: string): void { const select = root.querySelector<HTMLSelectElement>(`#${id}`); expect(select).not.toBeNull(); select!.value = value; select!.dispatchEvent(new Event('change', { bubbles: true })); }

/** Clicks a concrete native control with assertion-first missing-behavior detection. @param root Native reader root. @param id Exact semantic button ID. @returns Nothing. @remarks Dispatches the actual button action only when present. */
function click(root: HTMLElement, id: string): void { const button = root.querySelector<HTMLButtonElement>(`#${id}`); expect(button).not.toBeNull(); button!.click(); }

/** Captures an independent storage acknowledgement that can commit, fail or remain pending. @returns A controlled pending promise and settlement callbacks. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>(
    /** Captures fixture settlement callbacks. @param callback Independent success resolver. @param failure Independent rejection callback. @returns Nothing. @remarks Sets only local settlement bindings. */
    (callback, failure) => { resolve = callback; reject = failure; },
  ); return { promise, resolve, reject };
}

for (const language of ['ms', 'en'] as const) {
  test(`SAVED001 ${language}: offline reopening restores valid catalogue, exact saved pair, locale and selections`,
    /** Checks complete cached reading independently from source absence and network availability. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s);
      complete(s, s.saved); expect.soft(document.documentElement.lang).toBe(language);
      expect.soft(s.root.querySelector<HTMLSelectElement>('#member-select')?.value).toBe('1839'); expect.soft(s.root.querySelector<HTMLSelectElement>('#sitting-select')?.value).toBe('29326');
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].saved); expect.soft(text(s.root, '#reader-offline-status')).toBe(labels[language].ready);
      expect.soft(s.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('true'); expect.soft(s.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('true');
      expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(s.saved.refreshedAt); expect(s.loadPair).not.toHaveBeenCalled();
    });

  test(`SAVED002 ${language}: another member from a fetched sitting remains offline-unsaved and requires a connection`,
    /** Checks exact opened-pair availability, never sitting-wide saved status. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.storage.readState.mockResolvedValue({ catalogue: s.old.catalogue, preferences: { ...s.preferences, memberId: '4463' } });
      s.storage.readPair.mockResolvedValue({ status: 'missing' }); s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s);
      expect.soft(text(s.root, '#reader-status')).toBe(labels[language].connection); expect.soft(s.storage.readPair).toHaveBeenCalledWith('4463', '29326');
      expect.soft(s.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('false');
      expect(texts(s.root, 'turn')).toEqual([]); expect(s.loadPair).not.toHaveBeenCalled();
    });

  test(`SAVED003 ${language}: incompatible saved content is unavailable and requires valid online retrieval`,
    /** Checks compatibility failure cannot become participation absence or guessed repair. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.storage.readPair.mockResolvedValue({ status: 'incompatible' }); s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s);
      expect.soft(text(s.root, '#reader-status')).toBe(labels[language].incompatible); expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].unsaved);
      expect(texts(s.root, 'turn')).toEqual([]); expect(s.storage.savePair).not.toHaveBeenCalled();
    });

  test(`SAVED004 ${language}: a committed transcript and compatible shell produce distinct saved/offline notices`,
    /** Checks current successful validation and transaction commit both retain exact source content. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); await start(s); complete(s, s.fresh.result);
      expect.soft(s.loadPair).toHaveBeenCalledWith('1839', '29326', expect.any(AbortSignal));
      expect.soft(s.storage.savePair).toHaveBeenCalledWith(s.fresh.catalogue, s.fresh.result, s.preferences);
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].saved); expect.soft(text(s.root, '#reader-offline-status')).toBe(labels[language].ready);
      expect.soft(s.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('true'); expect.soft(s.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('true');
      expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain('2026-10-10T07:00:00.000Z'); expect(text(s.root, '[data-field="saved-refreshed-at"]')).toContain('2026-10-10T07:00:00.000Z');
    });

  test(`SAVED005 ${language}: unchanged bytes still advance current validation time and committed saved time`,
    /** Checks unchanged digest is not treated as a skipped successful check. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); expect(s.old.result.recordDigest).toBe(s.fresh.result.recordDigest); await start(s);
      expect.soft(s.storage.savePair).toHaveBeenCalledWith(s.fresh.catalogue, s.fresh.result, s.preferences);
      expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(s.fresh.result.refreshedAt); expect(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(s.fresh.result.refreshedAt);
    });

  test(`SAVED006 ${language}: changed validated content commits every new turn and every source gap/annotation`,
    /** Checks changed accepted source bytes preserve complete pair partitions. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language, true); expect(s.old.result.recordDigest).not.toBe(s.fresh.result.recordDigest); await start(s); complete(s, s.fresh.result);
      expect(s.storage.savePair).toHaveBeenCalledWith(s.fresh.catalogue, s.fresh.result, s.preferences);
    });

  test(`SAVED007 ${language}: failed saving keeps new online content unsaved and identifies the older offline copy separately`,
    /** Checks current versus previous successful timestamps and complete online content survive device write failure. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language, true); s.storage.savePair.mockRejectedValue(new DOMException('controlled quota', 'QuotaExceededError')); await start(s); complete(s, s.fresh.result);
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].unsaved); expect.soft(text(s.root, '#reader-offline-status')).toBe(labels[language].older);
      expect.soft(s.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('false');
      expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(s.fresh.result.refreshedAt); expect.soft(text(s.root, '[data-field="prior-saved-refreshed-at"]')).toContain(s.saved.refreshedAt);
      expect(s.fresh.result.saved).toBe(false);
    });

  test(`SAVED008 ${language}: pair saving remains pending until transaction acknowledgement and does not advance saved time early`,
    /** Checks request/commit status separation at the reader boundary. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); const commit = deferred<TranscriptResult>(); s.storage.savePair.mockReturnValue(commit.promise); await start(s);
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].unsaved); expect.soft(text(s.root, '[data-field="prior-saved-refreshed-at"]')).toContain(s.saved.refreshedAt);
      expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).not.toContain(s.fresh.result.refreshedAt);
      commit.resolve({ ...s.fresh.result, saved: true }); await settle();
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].saved); expect(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(s.fresh.result.refreshedAt);
    });

  test(`SAVED009 ${language}: committed pair with unconfirmed shell stays transcript-saved without an offline-reopening promise`,
    /** Checks cache failure cannot be misreported as failed transcript saving. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.state.value.shellReady = false; s.state.value.failed = true; await start(s);
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].saved); expect.soft(text(s.root, '#reader-offline-status')).toBe(labels[language].limit);
      expect(s.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('false');
    });

  test(`SAVED010 ${language}: new-shell failure preserves an already confirmed compatible saved reader`,
    /** Checks an unsuccessful update attempt cannot revoke old shell/pair readiness. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s);
      s.state.value = { shellReady: true, waitingVersion: null, applying: false, failed: true }; for (const observer of s.observers) observer(s.state.value); await settle();
      complete(s, s.saved); expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].saved); expect(text(s.root, '#reader-offline-status')).toBe(labels[language].ready);
    });

  for (const failure of ['hash', 'identity', 'schema']) test(`SAVED011 ${language}: failed ${failure} validation keeps the prior accepted result/time and never saves failed data`,
    /** Checks unsuccessful published-data validation advances neither current nor stored successful time. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); const expected = structuredClone(s.saved);
      s.loadPair.mockRejectedValue(new Error(`controlled ${failure} validation`)); await start(s); complete(s, expected);
      expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(expected.refreshedAt); expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(expected.refreshedAt);
      expect.soft(text(s.root, '#reader-result h2')).toContain(expected.member.name);
      expect.soft(s.root.querySelector('a[data-role="source"]')?.getAttribute('href')).toBe(expected.sitting.sourceUrl);
      expect.soft(text(s.root, '[data-field="prepared-at"]')).toContain(expected.snapshot.preparedAt);
      expect.soft(text(s.root, '[data-field="acquired-at"]')).toContain(expected.sitting.record.acquiredAt);
      expect.soft(s.root.querySelector('#reader-result')?.getAttribute('data-outcome')).toBe(expected.outcome);
      expect.soft(s.saved).toEqual(expected);
      expect(s.storage.savePair).not.toHaveBeenCalled();
    });

  test(`SAVED012 ${language}: device storage opening failure preserves ordinary online reading with an honest limit`,
    /** Checks storage failure is independent from valid published source content. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.openStorage.mockRejectedValue(new DOMException('controlled denial', 'SecurityError')); await start(s);
      choose(s.root, 'language-select', language); choose(s.root, 'member-select', '1839'); choose(s.root, 'sitting-select', '29326'); click(s.root, 'read-button'); await settle(); complete(s, s.fresh.result);
      expect.soft(text(s.root, '#reader-save-status')).toBe(labels[language].storage); expect(text(s.root, '#reader-offline-status')).toBe(labels[language].limit);
    });

  test(`SAVED013 ${language}: saved result metadata is not relabeled from a newer cached catalogue`,
    /** Checks historical nulls, original labels, provenance and accepted snapshot retain their own identity. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); const expected = structuredClone(s.saved); const latest = structuredClone(s.fresh.catalogue); latest.members[0].name = 'Controlled newer source label';
      s.storage.readState.mockResolvedValue({ catalogue: latest, preferences: s.preferences }); s.online.value = false; s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s);
      expect.soft(text(s.root, '#reader-result h2')).toContain(expected.member.name); expect.soft(text(s.root, '[data-field="prepared-at"]')).toContain(expected.snapshot.preparedAt);
      expect.soft(text(s.root, '[data-field="acquired-at"]')).toContain(expected.sitting.record.acquiredAt); complete(s, expected);
      expect.soft(s.root.querySelector('a[data-role="source"]')?.getAttribute('href')).toBe(expected.sitting.sourceUrl);
      expect.soft(s.root.querySelector('#reader-result')?.getAttribute('data-outcome')).toBe(expected.outcome);
      expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(expected.refreshedAt);
      expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(expected.refreshedAt);
      expect.soft(s.saved).toEqual(expected);
    });

  test(`SAVED014 ${language}: language and valid changed selections are persisted before deliberate Apply`,
    /** Checks real native Apply controls use the current locale and exact IDs in the supplied commit callback. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.state.value.waitingVersion = 'b'.repeat(64); await start(s);
      expect.soft(text(s.root, '#apply-update-button')).toBe(labels[language].apply); expect.soft(text(s.root, '#continue-update-button')).toBe(labels[language].continue);
      choose(s.root, 'member-select', '4463'); choose(s.root, 'sitting-select', '29326'); choose(s.root, 'language-select', language);
      const button = s.root.querySelector<HTMLButtonElement>('#apply-update-button'); expect.soft(button).not.toBeNull(); button?.click(); await settle();
      expect.soft(s.updates.apply).toHaveBeenCalledOnce(); const persist = s.updates.apply.mock.calls[0]?.[0]; expect.soft(persist).toBeTypeOf('function');
      if (typeof persist === 'function') await persist();
      expect(s.storage.saveState).toHaveBeenCalledWith(s.fresh.catalogue, { language, memberId: '4463', sittingId: '29326' });
    });

  test(`SAVED015 ${language}: Continue preserves exact reading, preferences and native control focus`,
    /** Checks a waiting update does not interrupt the complete accepted reading. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.state.value.waitingVersion = 'b'.repeat(64); await start(s);
      s.storage.saveState.mockClear();
      const button = s.root.querySelector<HTMLButtonElement>('#continue-update-button'); expect.soft(button).not.toBeNull(); button?.focus(); button?.click(); await settle();
      complete(s, s.fresh.result); expect.soft(s.updates.continue).toHaveBeenCalledOnce(); expect(s.updates.apply).not.toHaveBeenCalled();
      if (button) expect.soft(document.activeElement).toBe(button); expect(s.storage.saveState).not.toHaveBeenCalled();
    });

  test(`SAVED016 ${language}: complete saved-reader readiness mark waits until the matching saved pair is usable`,
    /** Checks control-only readiness cannot stand in for closed-reader saved-result usability. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.loadCatalogue.mockRejectedValue(new Error('controlled offline'));
      const loaded = deferred<SavedPair>(); s.storage.readPair.mockReturnValue(loaded.promise); await start(s);
      expect.soft(s.marks).not.toContain('hansard.reader-ready'); loaded.resolve({ status: 'saved', result: s.saved }); await settle();
      expect(s.marks).toContain('hansard.reader-ready');
    });

  test(`SAVED018 ${language}: first offline visit without committed lists cannot invent a readable source archive`,
    /** Checks no stored inventory remains a connection requirement, independent from participation absence. @returns Resolves after assertions. */
    async () => {
      const s = scenario(language); s.online.value = false; s.storage.readState.mockResolvedValue({ catalogue: null, preferences: null });
      s.loadCatalogue.mockRejectedValue(new Error('controlled offline')); await start(s); choose(s.root, 'language-select', language); await settle();
      expect.soft(text(s.root, '#reader-status')).toBe(labels[language].firstVisit); expect(texts(s.root, 'turn')).toEqual([]);
      expect(s.loadPair).not.toHaveBeenCalled(); expect(s.storage.savePair).not.toHaveBeenCalled();
    });
}

test('SAVED017: applying an update in one reader does not alter another mounted tab reading its complete pair',
  /** Checks client-scoped consent at the DOM integration boundary without claiming real tab/service-worker proof. @returns Resolves after assertions. */
  async () => {
    const one = scenario('ms'); const other = scenario('en'); document.body.replaceChildren(one.root, other.root);
    one.state.value.waitingVersion = 'b'.repeat(64); await start(one); await start(other);
    const button = one.root.querySelector<HTMLButtonElement>('#apply-update-button'); expect.soft(button).not.toBeNull(); button?.click(); await settle();
    expect.soft(one.updates.apply).toHaveBeenCalledOnce(); expect(other.updates.apply).not.toHaveBeenCalled(); complete(other, other.fresh.result);
  });

for (const transition of ['pair-switch', 'same-pair-retry', 'teardown'] as const) for (const outcome of ['success', 'failure'] as const)
  test(`SAVEDREV001 ${transition}/${outcome}: obsolete save settlement cannot replace the current reader`,
    /** Checks delayed transaction acknowledgement against independently captured current-result and teardown expectations.
     * @returns Resolves after controlled late save success/failure and semantic preservation checks.
     */
    async function lateSaveCompletion() {
      const s = scenario('en'); const initial = structuredClone(s.fresh.result); const prior = structuredClone(s.saved);
      const commit = deferred<TranscriptResult>();
      // The original promise still rejects for production; this separate observer prevents
      // an unhandled fixture rejection while the missing save integration never consumes it.
      void commit.promise.catch(
        /** Observes a controlled fixture rejection without supplying successful storage behavior.
         * @param _error Controlled late write failure.
         * @returns Nothing.
         */
        function observeFixtureFailure(_error: unknown): void {},
      );
      s.storage.savePair.mockReturnValueOnce(commit.promise).mockImplementation(
        /** Supplies an independently controlled committed acknowledgement for the newer valid result.
         * @param _catalogue Matching accepted catalogue supplied by the caller.
         * @param result Complete newly opened result supplied by the caller.
         * @param _preferences Requested UI preferences.
         * @returns A controlled completed save, without performing persistence or coordination.
         */
        async function acknowledgeNewer(_catalogue, result, _preferences): Promise<TranscriptResult> { return { ...result, saved: true }; },
      );
      const latest = newer(true); latest.catalogue.snapshotId = 'controlled-late-save-newer';
      latest.catalogue.preparedAt = '2026-10-10T07:01:00.000Z'; latest.catalogue.status.completedAt = '2026-10-10T07:00:00.000Z';
      const selectedMember = transition === 'pair-switch' ? '4463' : '1839';
      latest.result = buildTranscriptResult(latest.catalogue, selectedMember, '29326', latest.record, '2026-10-10T07:02:00.000Z');
      const expected = structuredClone(latest.result); let newerRequest = false;
      s.loadPair.mockImplementation(
        /** Returns explicitly selected old/new boundary outcomes without applying reader generation policy.
         * @param _memberId Requested exact identity.
         * @param _sittingId Requested exact sitting.
         * @returns Independently controlled accepted source payload.
         */
        async function sourcePayload(_memberId, _sittingId) { return newerRequest ? { catalogue: latest.catalogue, result: latest.result }
          : { catalogue: s.fresh.catalogue, result: s.fresh.result }; },
      );
      const cleanup = await start(s);
      // Drive the existing Read control if automatic saved-preference reopening is still missing.
      // Automatic restoration has its own original cases; these cases target save settlement.
      if (s.loadPair.mock.calls.length === 0) {
        choose(s.root, 'language-select', 'en'); choose(s.root, 'member-select', '1839'); choose(s.root, 'sitting-select', '29326');
        s.root.querySelector<HTMLButtonElement>('#read-button')?.click(); await settle();
      }
      expect.soft(s.storage.savePair).toHaveBeenCalledWith(s.fresh.catalogue, initial, s.preferences);
      if (transition === 'teardown') cleanup();
      else {
        newerRequest = true;
        if (transition === 'pair-switch') choose(s.root, 'member-select', selectedMember);
        else {
          s.loadPair.mockRejectedValueOnce(new Error('controlled newer same-pair retrieval failure'));
          s.root.querySelector<HTMLButtonElement>('#read-button')?.click(); await settle();
        }
        const action = s.root.querySelector<HTMLButtonElement>(transition === 'pair-switch' ? '#read-button' : '#retry-button');
        expect.soft(action).not.toBeNull(); action?.click(); await settle();
        complete(s, expected);
        expect.soft(text(s.root, '#reader-save-status')).toBe(labels.en.saved);
        expect.soft(text(s.root, '#reader-offline-status')).toBe(labels.en.ready);
        expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(expected.refreshedAt);
        expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(expected.refreshedAt);
      }
      const beforeSettlement = s.root.innerHTML;
      if (outcome === 'success') commit.resolve({ ...initial, saved: true });
      else commit.reject(new DOMException('controlled obsolete save abort', 'AbortError'));
      await settle();
      expect.soft(s.root.innerHTML).toBe(beforeSettlement); expect.soft(s.saved).toEqual(prior);
      if (transition === 'teardown') {
        expect.soft(s.root.childNodes.length).toBe(0);
        expect.soft(s.root.querySelector('#reader-save-status')).toBeNull(); expect.soft(s.root.querySelector('#reader-offline-status')).toBeNull();
      } else {
        complete(s, expected);
        expect.soft(s.root.querySelector<HTMLSelectElement>('#member-select')?.value).toBe(selectedMember);
        expect.soft(s.root.querySelector<HTMLSelectElement>('#sitting-select')?.value).toBe(expected.sittingId);
        expect.soft(text(s.root, '#reader-save-status')).toBe(labels.en.saved); expect.soft(text(s.root, '#reader-offline-status')).toBe(labels.en.ready);
        expect.soft(s.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('true');
        expect.soft(s.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('true');
        expect.soft(text(s.root, '[data-field="refreshed-at"]')).toContain(expected.refreshedAt);
        expect.soft(text(s.root, '[data-field="saved-refreshed-at"]')).toContain(expected.refreshedAt);
        cleanup();
      }
    });
