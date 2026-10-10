// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { mountReader, type ReaderDependencies } from '../../src/main.ts';
import { getPwaMessages } from '../../src/messages.ts';
import { buildTranscriptResult, type Catalogue, type TranscriptResult } from '../../src/source.ts';
import type { ReaderPreferences, ReaderStorage } from '../../src/storage.ts';
import type { UpdateClient } from '../../src/updates.ts';
import { readerFixture } from '../fixtures/reader.ts';

/** Supplies an independent pending transport outcome without implementing reader coordination.
 * @returns A promise and its explicit controlled success/failure boundaries.
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>(
    /** Captures only the controlled transport settlement callbacks.
     * @param done Successful boundary result callback.
     * @param failed Failed boundary result callback.
     * @returns Nothing.
     * @remarks Assigns the two local fixture callbacks.
     */
    function capture(done, failed): void { resolve = done; reject = failed; },
  );
  return { promise, resolve, reject };
}

/** Advances asynchronous native-shaped reader handlers without supplying UI policy.
 * @returns Completion after one unit task.
 */
async function settle(): Promise<void> {
  await new Promise<void>(
    /** Schedules one controlled unit task.
     * @param done Task completion callback.
     * @returns Nothing.
     * @remarks Schedules only a zero-delay unit timer.
     */
    function next(done): void { setTimeout(done, 0); },
  );
}

/** Creates accepted old/new source results and separate controlled HTTP/storage boundaries.
 * @param language Saved UI locale restored by the real reader.
 * @returns A fresh DOM root, exact source-derived saved result and deferred latest retrievals.
 * @remarks Replaces only this isolated test document body.
 */
function scenario(language: 'ms' | 'en') {
  const old = readerFixture();
  const saved: TranscriptResult = { ...structuredClone(old.result), saved: true };
  const fresh = readerFixture();
  fresh.catalogue.snapshotId = 'controlled-pending-newer-snapshot';
  fresh.catalogue.preparedAt = '2026-10-10T07:00:00.000Z';
  fresh.catalogue.status.completedAt = '2026-10-10T06:59:00.000Z';
  fresh.result = buildTranscriptResult(fresh.catalogue, saved.memberId, saved.sittingId, fresh.record, '2026-10-10T07:10:00.000Z');
  const preferences: ReaderPreferences = { language, memberId: saved.memberId, sittingId: saved.sittingId };
  const catalogueGate = deferred<Catalogue>();
  const pairGate = deferred<{ catalogue: Catalogue; result: TranscriptResult }>();
  const storage = {
    readState: vi.fn<ReaderStorage['readState']>().mockResolvedValue({ catalogue: old.catalogue, preferences }),
    readPair: vi.fn<ReaderStorage['readPair']>().mockResolvedValue({ status: 'saved', result: saved }),
    saveState: vi.fn<ReaderStorage['saveState']>().mockResolvedValue(undefined),
    savePair: vi.fn<ReaderStorage['savePair']>().mockResolvedValue({ ...fresh.result, saved: true }),
    close: vi.fn<ReaderStorage['close']>(),
  } satisfies ReaderStorage;
  const updates = {
    getState: vi.fn<UpdateClient['getState']>().mockReturnValue({ shellReady: true, waitingVersion: null, applying: false, failed: false }),
    subscribe: vi.fn<UpdateClient['subscribe']>().mockReturnValue(
      /** Supplies only the controlled subscription teardown boundary. @returns Nothing. */
      function unsubscribe(): void {},
    ),
    apply: vi.fn<UpdateClient['apply']>().mockResolvedValue(undefined),
    continue: vi.fn<UpdateClient['continue']>(), close: vi.fn<UpdateClient['close']>(),
  } satisfies UpdateClient;
  const loadCatalogue = vi.fn<ReaderDependencies['loadCatalogue']>().mockReturnValue(catalogueGate.promise);
  const loadPair = vi.fn<ReaderDependencies['loadPair']>().mockReturnValue(pairGate.promise);
  const marks = vi.fn();
  const root = document.createElement('main'); document.body.replaceChildren(root);
  const dependencies: ReaderDependencies = { loadCatalogue, loadPair,
    openStorage: vi.fn().mockResolvedValue(storage), updates,
    /** Reports the explicitly controlled connected state, without implementing retry/fallback decisions. @returns True for an online check. */
    online: function online(): boolean { return true; },
    /** Supplies an independent clock for source-age notices. @returns Exact controlled current UTC instant. */
    now: function now(): string { return '2026-10-10T08:00:00.000Z'; },
    mark: marks,
    /** Completes the unit paint boundary only. @returns Immediate unit completion, with no native painting claim. */
    requestPaint: async function paint(): Promise<void> {},
  };
  return { root, dependencies, saved, fresh, storage, preferences, loadCatalogue, loadPair, catalogueGate, pairGate, marks };
}

/** Requires the original committed pair to remain readable during a latest published-data check.
 * @param context Independently controlled accepted source/storage boundary values.
 * @param language Expected restored interface locale.
 * @returns Nothing after exact original content, identity, provenance and save-status assertions.
 */
function savedStillReadable(context: ReturnType<typeof scenario>, language: 'ms' | 'en'): void {
  const { root, saved, fresh } = context;
  const region = root.querySelector<HTMLElement>('#reader-result');
  expect.soft(document.documentElement.lang).toBe(language);
  expect.soft(region?.dataset.memberId ?? '').toBe(saved.memberId);
  expect.soft(region?.dataset.sittingId ?? '').toBe(saved.sittingId);
  expect.soft(region?.dataset.resultComplete ?? '').toBe('true');
  for (const [category, kind] of [['turns', 'turn'], ['gaps', 'gap'], ['annotations', 'annotation']] as const) {
    const actual: string[] = [];
    for (const node of root.querySelectorAll(`[data-kind="${kind}"] .source-text`)) actual.push(node.textContent ?? '');
    const expected: string[] = [];
    for (const item of saved[category]) expected.push(item.text);
    expect.soft(actual).toEqual(expected);
  }
  expect.soft(root.querySelector('[data-field="prepared-at"]')?.textContent ?? '').toContain(saved.snapshot.preparedAt);
  expect.soft(root.querySelector('[data-field="refreshed-at"]')?.textContent ?? '').toContain(saved.refreshedAt);
  expect.soft(root.querySelector('[data-field="saved-refreshed-at"]')?.textContent ?? '').toContain(saved.refreshedAt);
  expect.soft(root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('true');
  expect.soft(root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('true');
  expect.soft(region?.textContent ?? '').not.toContain(fresh.result.refreshedAt);
  expect.soft(context.marks).toHaveBeenCalledWith('hansard.reader-ready');
  expect(context.storage.savePair).not.toHaveBeenCalled();
}

for (const language of ['ms', 'en'] as const) {
  test(`SAVED-PENDING-CATALOGUE ${language}: committed content is readable while initial latest catalogue retrieval remains pending`,
    /** Drives the real startup while only the published catalogue boundary remains unresolved.
     * @returns Completion after original saved-content and actual request assertions.
     * @remarks Mounts/tears down only this isolated reader and settles its controlled transport afterward.
     */
    async function pendingCatalogue(): Promise<void> {
      const context = scenario(language);
      const cleanup = mountReader(context.root, context.dependencies);
      try {
        await settle();
        expect.soft(context.loadCatalogue).toHaveBeenCalledOnce();
        expect.soft(context.storage.readPair).toHaveBeenCalledWith(context.saved.memberId, context.saved.sittingId);
        expect.soft(context.marks).toHaveBeenCalledWith('hansard.catalogue-ready');
        savedStillReadable(context, language);
        expect(context.loadPair).not.toHaveBeenCalled();
      } finally { cleanup(); context.catalogueGate.resolve(context.fresh.catalogue); await settle(); }
    });

  test(`SAVED-PENDING-PAIR ${language}: committed content is readable while the newest matching pair retrieval remains pending`,
    /** Completes only the accepted latest catalogue, leaving actual pair HTTP validation pending.
     * @returns Completion after original saved-content and newest-pair request assertions.
     * @remarks Mounts/tears down this reader and settles the controlled pair after teardown.
     */
    async function pendingPair(): Promise<void> {
      const context = scenario(language); context.catalogueGate.resolve(context.fresh.catalogue);
      const cleanup = mountReader(context.root, context.dependencies);
      try {
        await settle();
        expect.soft(context.loadPair).toHaveBeenCalledWith(context.saved.memberId, context.saved.sittingId, expect.any(AbortSignal));
        savedStillReadable(context, language);
      } finally { cleanup(); context.pairGate.resolve({ catalogue: context.fresh.catalogue, result: context.fresh.result }); await settle(); }
    });

  test(`SAVED-PENDING-RETRY ${language}: explicit Retry retains the same committed source content during its pending latest check`,
    /** Drives a real failure then native Retry without invoking a replacement application handler.
     * @returns Completion after exact saved-content preservation and actual second request assertions.
     * @remarks Mounts/tears down this reader, clicks its native retry and settles controlled transport afterward.
     */
    async function pendingRetry(): Promise<void> {
      const context = scenario(language); context.catalogueGate.resolve(context.fresh.catalogue);
      context.loadPair.mockRejectedValueOnce(new Error('controlled first published-pair retrieval failure'));
      const cleanup = mountReader(context.root, context.dependencies);
      try {
        await settle(); savedStillReadable(context, language); context.marks.mockClear();
        const retry = context.root.querySelector<HTMLButtonElement>('#retry-button');
        expect.soft(retry?.hidden).toBe(false); retry?.focus(); retry?.click(); await settle();
        expect.soft(context.loadPair).toHaveBeenCalledTimes(2);
        expect.soft(context.loadPair).toHaveBeenLastCalledWith(context.saved.memberId, context.saved.sittingId, expect.any(AbortSignal));
        savedStillReadable(context, language);
      } finally { cleanup(); context.pairGate.resolve({ catalogue: context.fresh.catalogue, result: context.fresh.result }); await settle(); }
    });
}

for (const language of ['ms', 'en'] as const) test(`SAVED-TRANSIENT-STATE ${language}: a successful pair commit acknowledges saving after an earlier state-write failure`,
  /** Drives a failed native-state boundary then a separately acknowledged complete pair save.
   * @returns Completion after the actual reader save path, committed metadata and visible status assertions.
   * @remarks Mounts/tears down this reader and explicitly settles only the controlled source/storage boundaries.
   */
  async function recoveredStateWrite(): Promise<void> {
    const context = scenario(language); const commit = deferred<TranscriptResult>();
    context.storage.saveState.mockRejectedValueOnce(new DOMException('controlled transient state quota', 'QuotaExceededError'));
    context.storage.savePair.mockReturnValue(commit.promise);
    context.catalogueGate.resolve(context.fresh.catalogue);
    context.pairGate.resolve({ catalogue: context.fresh.catalogue, result: context.fresh.result });
    const cleanup = mountReader(context.root, context.dependencies);
    try {
      await settle();
      expect.soft(context.storage.saveState).toHaveBeenCalled();
      expect.soft(context.storage.savePair).toHaveBeenCalledWith(context.fresh.catalogue, context.fresh.result, context.preferences);
      expect.soft(context.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('false');
      commit.resolve({ ...structuredClone(context.fresh.result), saved: true }); await settle();
      const expected = language === 'ms' ? 'Transkrip disimpan pada peranti.' : 'Transcript saved on this device.';
      expect.soft(context.root.querySelector('#reader-save-status')?.textContent ?? '').toBe(expected);
      expect.soft(context.root.querySelector('#reader-save-status')?.getAttribute('data-saved')).toBe('true');
      expect.soft(context.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('true');
      expect(context.root.querySelector('[data-field="saved-refreshed-at"]')?.textContent ?? '').toContain(context.fresh.result.refreshedAt);
    } finally { cleanup(); }
  });

for (const language of ['ms', 'en'] as const) test(`SAVED-ACCESS-LIMIT ${language}: denied saved storage retains readable memory without promising offline reopening`,
  /** Reproduces a real reader access failure after independently accepted saved content was restored.
   * @returns Completion after source preservation and revoked reopening-readiness assertions.
   * @remarks Supplies a failed native storage boundary, leaving online transport independently pending.
   */
  async function accessLimit(): Promise<void> {
    const context = scenario(language); context.catalogueGate.resolve(context.fresh.catalogue);
    context.storage.readPair.mockResolvedValueOnce({ status: 'saved', result: context.saved })
      .mockRejectedValue(new DOMException('controlled saved-store access denial', 'SecurityError'));
    const cleanup = mountReader(context.root, context.dependencies);
    try {
      await settle();
      const expected = context.saved.turns.map(
        /** Reads the independently supplied original turn. @param item Accepted saved source item. @returns Its unchanged words. */
        function words(item): string { return item.text; });
      const actual: string[] = [];
      for (const node of context.root.querySelectorAll('[data-kind="turn"] .source-text')) actual.push(node.textContent ?? '');
      expect.soft(actual).toEqual(expected);
      expect.soft(context.root.querySelector('[data-field="saved-refreshed-at"]')?.textContent ?? '').toContain(context.saved.refreshedAt);
      expect.soft(context.root.querySelector('#reader-save-status')?.textContent).toBe(getPwaMessages(language).storage);
      expect.soft(context.root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('false');
      expect.soft(context.root.querySelector('#reader-offline-status')?.textContent).toBe(getPwaMessages(language).limit);
      expect(context.storage.savePair).not.toHaveBeenCalled();
    } finally { cleanup(); context.pairGate.resolve({ catalogue: context.fresh.catalogue, result: context.fresh.result }); await settle(); }
  });
