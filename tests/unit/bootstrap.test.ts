// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import type { ReaderStorage } from '../../src/storage.ts';
import { readerFixture } from '../fixtures/reader.ts';

/** Advances startup/source handlers without supplying reader or worker behavior.
 * @returns Resolves after the next unit task.
 */
async function settle(): Promise<void> { await new Promise<void>(
  /** Schedules one controlled unit task.
   * @param done Task completion callback.
   * @returns Nothing.
   * @remarks Schedules only a zero-delay unit timer.
   */
  function next(done): void { setTimeout(done, 0); },
); }

for (const condition of ['unsupported', 'rejected', 'pending'] as const)
  test(`BOOTREV001 ${condition}: actual app startup keeps ordinary reading usable with unconfirmed offline readiness`,
    /** Imports the actual entry point with controlled existing source/storage/native-registration boundaries.
     * @returns Resolves after source reading and required startup integration assertions.
     * @remarks Temporarily resets module mocks, navigator fields, URL, DOM and unit paint/mark globals; restores them in finally.
     */
    async function isolatedBootstrap() {
      const fixture = readerFixture('gaps'); const previousBody = [...document.body.childNodes]; const previousUrl = location.href;
      const previousLanguage = document.documentElement.lang; const descriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
      const clock = performance; const markDescriptor = Object.getOwnPropertyDescriptor(clock, 'mark');
      let registrationStarted!: () => void; let entry: Promise<typeof import('../../src/main.ts')> | undefined;
      const enteredRegistration = new Promise<void>(
        /** Captures actual native-boundary entry so a pending registration cannot turn module startup into a test timeout.
         * @param done Registration invocation observation.
         * @returns Nothing.
         * @remarks Records only the local observation callback.
         */
        function captureEntry(done): void { registrationStarted = done; },
      );
      let rejectPending!: (reason: unknown) => void;
      const pending = new Promise<ServiceWorkerRegistration>(
        /** Captures the pending native registration's failure boundary without returning fabricated success.
         * @param _done Unused success callback; this registration intentionally remains pending during reading.
         * @param reject Native failure callback used only during cleanup.
         * @returns Nothing.
         * @remarks Records the controlled pending callback.
         */
        function hold(_done, reject): void { rejectPending = reject; },
      );
      void pending.catch(
        /** Prevents an unused fixture promise from becoming a harness rejection.
         * @param _error Controlled registration cleanup failure.
         * @returns Nothing.
         */
        function observeUnused(_error: unknown): void {},
      );
      const registration = vi.fn(
        /** Records actual entry into the native registration boundary and supplies its independent outcome.
         * @param _url Requested worker URL.
         * @param _options Requested native registration options.
         * @returns Rejected or intentionally pending native registration outcome.
         * @remarks Resolves only the invocation observation; never supplies a successful worker or readiness.
         */
        function register(_url: string | URL, _options?: RegistrationOptions): Promise<ServiceWorkerRegistration> {
          registrationStarted(); return condition === 'rejected'
            ? Promise.reject(new DOMException('controlled worker registration denial', 'SecurityError')) : pending;
        },
      );
      const container = Object.assign(new EventTarget(), { register: registration, controller: null });
      const storage: ReaderStorage = {
        readState: vi.fn().mockResolvedValue({ catalogue: null, preferences: null }), saveState: vi.fn().mockResolvedValue(undefined),
        readPair: vi.fn().mockResolvedValue({ status: 'missing' }), close: vi.fn(),
        savePair: vi.fn().mockImplementation(
          /** Returns only the supplied controlled completion acknowledgement, without implementing native persistence.
           * @param _catalogue Accepted catalogue supplied by the reader.
           * @param result Complete validated result supplied by the reader.
           * @param _preferences UI preferences supplied by the reader.
           * @returns A self-contained controlled saved result.
           */
          async function saved(_catalogue, result, _preferences) { return { ...structuredClone(result), saved: true }; },
        ),
      };
      try {
        vi.resetModules();
        vi.doMock('../../src/source.ts',
          /** Preserves authoritative source rules while replacing only existing HTTP loader boundaries.
           * @param original Original source-module loader.
           * @returns Actual source exports plus independently controlled accepted loaders.
           */
          async function sourceModule(original) { const actual = await original<typeof import('../../src/source.ts')>();
            return { ...actual, loadPublishedCatalogue: vi.fn().mockResolvedValue(fixture.catalogue),
              loadPublishedPair: vi.fn().mockResolvedValue({ catalogue: fixture.catalogue, result: fixture.result }) }; },
        );
        vi.doMock('../../src/storage.ts',
          /** Preserves storage exports while replacing only the existing opener boundary.
           * @param original Original storage-module loader.
           * @returns Original exports and the independently controlled device-storage opener.
           */
          async function storageModule(original) { const actual = await original<typeof import('../../src/storage.ts')>();
            return { ...actual, openStorage: vi.fn().mockResolvedValue(storage) }; },
        );
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: condition === 'unsupported' ? undefined : container });
        history.replaceState(null, '', '/vote-better-malaysia/');
        Object.defineProperty(clock, 'mark', { configurable: true, value: vi.fn() });
        vi.stubGlobal('requestAnimationFrame',
          /** Completes only the inert unit paint boundary, without claiming native browser painting.
           * @param callback Unit frame callback supplied by production.
           * @returns Controlled numeric callback ID.
           * @remarks Invokes the unit callback synchronously.
           */
          function frame(callback: FrameRequestCallback): number { callback(0); return 1; },
        );
        const root = document.createElement('main'); root.id = 'app';
        const stamp = document.createElement('meta'); stamp.name = 'hansard-shell-version'; stamp.content = 'a'.repeat(64);
        document.head.append(stamp); document.body.replaceChildren(root);
        try {
          entry = import('../../src/main.ts'); await Promise.race([entry, enteredRegistration]); await settle();
          for (const [id, value] of [['language-select', 'en'], ['member-select', '1839'], ['sitting-select', '29326']] as const) {
            const select = root.querySelector<HTMLSelectElement>(`#${id}`); expect.soft(select).not.toBeNull();
            if (select) { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }
          }
          root.querySelector<HTMLButtonElement>('#read-button')?.click(); await settle();
          const expected: string[] = []; for (const item of fixture.result.turns) expected.push(item.text);
          expect.soft([...root.querySelectorAll('[data-kind="turn"] .source-text')].map(
            /** Reads exact ordinary source text after startup.
             * @param node Actual rendered source text node.
             * @returns Original visible text.
             */
            function originalText(node): string { return node.textContent ?? ''; },
          )).toEqual(expected);
          expect.soft(root.querySelector('#reader-result')?.getAttribute('data-member-id')).toBe('1839');
          expect.soft(root.querySelector('#reader-result')?.getAttribute('data-result-complete')).toBe('true');
          if (condition === 'unsupported') expect(registration).not.toHaveBeenCalled();
          else expect.soft(registration).toHaveBeenCalledWith(new URL('sw.js', document.baseURI).href, { scope: '/vote-better-malaysia/' });
          expect.soft(root.querySelector('#reader-offline-status')?.getAttribute('data-offline-ready')).toBe('false');
          expect.soft(root.querySelector('#reader-offline-status')?.textContent ?? '').toBe('Offline reopening is not confirmed.');
        } finally { stamp.remove(); }
      } finally {
        try { rejectPending(new Error('controlled startup fixture cleanup')); await entry; await settle(); }
        finally {
          vi.doUnmock('../../src/source.ts'); vi.doUnmock('../../src/storage.ts'); vi.resetModules(); vi.unstubAllGlobals();
          if (markDescriptor) Object.defineProperty(clock, 'mark', markDescriptor); else Reflect.deleteProperty(clock, 'mark');
          if (descriptor) Object.defineProperty(navigator, 'serviceWorker', descriptor); else Reflect.deleteProperty(navigator, 'serviceWorker');
          history.replaceState(null, '', previousUrl); document.documentElement.lang = previousLanguage; document.body.replaceChildren(...previousBody);
        }
      }
    });
