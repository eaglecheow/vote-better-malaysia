// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { mountReader, type ReaderDependencies } from '../../src/main.ts';
import { getMessages, getPwaMessages } from '../../src/messages.ts';
import type { ReaderStorage } from '../../src/storage.ts';
import { readerFixture } from '../fixtures/reader.ts';

/** Advances actual reader startup/retry handlers without supplying UI behavior.
 * @returns Completion after one controlled unit task.
 */
async function settle(): Promise<void> {
  await new Promise<void>(
    /** Schedules one independent unit task.
     * @param done Task completion callback.
     * @returns Nothing.
     * @remarks Schedules only the unit timer.
     */
    function next(done): void { setTimeout(done, 0); },
  );
}

/** Supplies valid absent device data and separate rejected/accepted catalogue outcomes.
 * @param language Valid device language with absent source selections.
 * @param connected Explicit native connectivity observation.
 * @returns Real DOM mount inputs and the independently accepted source fixture.
 * @remarks Replaces only this isolated test document body.
 */
function scenario(language: 'ms' | 'en', connected: boolean) {
  const fixture = readerFixture();
  const storage = {
    readState: vi.fn<ReaderStorage['readState']>().mockResolvedValue({ catalogue: null, preferences: { language, memberId: null, sittingId: null } }),
    readPair: vi.fn<ReaderStorage['readPair']>().mockResolvedValue({ status: 'missing' }),
    saveState: vi.fn<ReaderStorage['saveState']>().mockResolvedValue(undefined),
    savePair: vi.fn<ReaderStorage['savePair']>().mockResolvedValue({ ...fixture.result, saved: true }),
    close: vi.fn<ReaderStorage['close']>(),
  } satisfies ReaderStorage;
  const loadCatalogue = vi.fn<ReaderDependencies['loadCatalogue']>().mockRejectedValueOnce(new Error('Controlled initial published catalogue HTTP failure')).mockResolvedValue(fixture.catalogue);
  const loadPair = vi.fn<ReaderDependencies['loadPair']>().mockResolvedValue({ catalogue: fixture.catalogue, result: fixture.result });
  const root = document.createElement('main'); document.body.replaceChildren(root);
  const dependencies: ReaderDependencies = { loadCatalogue, loadPair, openStorage: vi.fn().mockResolvedValue(storage),
    /** Reports only the independently controlled native connectivity state. @returns The specified connection observation. */
    online: function online(): boolean { return connected; },
    /** Supplies an independent source-age clock. @returns Controlled current UTC instant. */
    now: function now(): string { return '2026-10-10T08:00:00.000Z'; },
    mark: vi.fn(),
    /** Completes only the controlled unit paint boundary. @returns Immediate unit completion without a native-paint claim. */
    requestPaint: async function paint(): Promise<void> {},
  };
  return { root, dependencies, fixture, storage, loadCatalogue, loadPair };
}

/** Checks native list/retry state after a failed initial HTTP boundary.
 * @param root Actual mounted reader DOM root.
 * @returns Nothing after visible retry, disabled controls and live-region assertions.
 */
function failedListControls(root: HTMLElement): void {
  expect.soft(root.querySelector<HTMLButtonElement>('#retry-catalogue-button')?.hidden).toBe(false);
  expect.soft(root.querySelector<HTMLSelectElement>('#member-select')?.disabled).toBe(true);
  expect.soft(root.querySelector<HTMLSelectElement>('#sitting-select')?.disabled).toBe(true);
  expect.soft(root.querySelector<HTMLButtonElement>('#read-button')?.disabled).toBe(true);
  expect.soft(root.querySelector('#reader-status')?.getAttribute('role')).toBe('status');
  expect(root.querySelector('#reader-status')?.getAttribute('aria-live')).toBe('polite');
}

for (const language of ['ms', 'en'] as const) {
  test(`INITIAL-NETWORK ${language}: online initial catalogue failure announces retrieval error and native Retry restores choices/focus`,
    /** Drives real startup, an actual focused Retry click and a separately valid catalogue response.
     * @returns Completion after reached failure and successful recovery assertions.
     * @remarks Mounts/tears down this reader and clicks only its native retry control.
     */
    async function onlineFailure(): Promise<void> {
      const context = scenario(language, true); const cleanup = mountReader(context.root, context.dependencies);
      try {
        await settle();
        expect.soft(context.root.querySelector('#reader-status')?.textContent ?? '').toBe(getMessages(language).error);
        failedListControls(context.root);
        expect.soft(context.loadCatalogue).toHaveBeenCalledOnce(); expect.soft(context.loadPair).not.toHaveBeenCalled();
        const retry = context.root.querySelector<HTMLButtonElement>('#retry-catalogue-button');
        retry?.focus(); retry?.click(); await settle();
        expect.soft(context.loadCatalogue).toHaveBeenCalledTimes(2);
        expect.soft(retry?.hidden).toBe(true);
        expect.soft(document.activeElement).toBe(context.root.querySelector('#member-search'));
        expect.soft(context.root.querySelector<HTMLSelectElement>('#member-select')?.disabled).toBe(false);
        expect.soft(context.root.querySelector<HTMLSelectElement>('#sitting-select')?.disabled).toBe(false);
        expect.soft(context.root.querySelector<HTMLButtonElement>('#read-button')?.disabled).toBe(false);
        expect.soft(context.root.querySelectorAll('#member-select option').length).toBe(context.fixture.catalogue.members.length + 1);
        expect.soft(context.root.querySelectorAll('#sitting-select option').length).toBe(context.fixture.catalogue.sittings.length + 1);
        expect(context.root.querySelector('#reader-status')?.textContent ?? '').toBe(getMessages(language).chooseBoth);
      } finally { cleanup(); }
    });

  test(`INITIAL-OFFLINE-CONTROL ${language}: a first offline visit retains its existing connection-required message`,
    /** Records the already implemented first-offline behavior as a GREEN control.
     * @returns Completion after absent-source and native retry/disabled-control assertions.
     * @remarks Mounts and tears down only this controlled first-visit reader.
     */
    async function offlineControl(): Promise<void> {
      const context = scenario(language, false); const cleanup = mountReader(context.root, context.dependencies);
      try {
        await settle();
        expect.soft(context.root.querySelector('#reader-status')?.textContent ?? '').toBe(getPwaMessages(language).firstVisit);
        failedListControls(context.root);
        expect.soft(context.root.querySelector('#reader-result')?.children.length).toBe(0);
        expect(context.loadPair).not.toHaveBeenCalled();
      } finally { cleanup(); }
    });
}
