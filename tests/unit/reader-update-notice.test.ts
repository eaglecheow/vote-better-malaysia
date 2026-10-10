// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { mountReader } from '../../src/main.ts';
import { getPwaMessages } from '../../src/messages.ts';
import type { UpdateClient } from '../../src/updates.ts';
import { readerFixture } from '../fixtures/reader.ts';

const failures = {
  ms: 'Kemas kini tidak dapat digunakan. Anda boleh terus membaca.',
  en: 'The update could not be applied. You can continue reading.',
};

for (const language of ['ms', 'en'] as const) {
  test(`UPDATE-NOTICE001 ${language}: failed native updates retain a visible localized status`,
    /** Checks the reader's actual failure notice without substituting update DOM behavior.
     * @returns Completion after locale and native status assertions.
     * @remarks Mounts/cleans an isolated reader with an explicitly failed update boundary.
     */
    async function notice(): Promise<void> {
      const fixture = readerFixture(); const root = document.createElement('main'); document.body.replaceChildren(root);
      const updates: UpdateClient = {
        /** Supplies independently observed failure. @returns Explicit native-boundary state. */
        getState: () => ({ shellReady: true, waitingVersion: 'b'.repeat(64), applying: false, failed: true }),
        /** Supplies an inert subscription. @returns Fixture cleanup. */
        subscribe: () => (
          /** Releases no native resources in this inert boundary. @returns Nothing. */
          () => {}),
        /** Supplies an unused inert apply operation. @returns Completion without worker behavior. */
        apply: async () => {},
        /** Supplies an unused continuation boundary. @returns Nothing. */
        continue: () => {},
        /** Supplies an unused close boundary. @returns Nothing. */
        close: () => {},
      };
      const cleanup = mountReader(root, {
        /** Supplies accepted lists. @returns Controlled catalogue. */
        loadCatalogue: async () => fixture.catalogue,
        /** Supplies unused accepted data. @returns Controlled pair. */
        loadPair: async () => ({ catalogue: fixture.catalogue, result: fixture.result }),
        /** Records no timing in this notice test. @returns Nothing. */
        mark: () => {},
        /** Supplies no physical paint claim. @returns Completion. */
        requestPaint: async () => {}, updates,
      });
      try {
        await Promise.resolve(); const select = root.querySelector<HTMLSelectElement>('#language-select')!;
        select.value = language; select.dispatchEvent(new Event('change'));
        expect.soft(root.querySelector('#reader-update-status')?.textContent ?? '').toBe(failures[language]);
        expect.soft(root.querySelector('#reader-update-status')?.getAttribute('role')).toBe('status');
        expect.soft(root.querySelector('#reader-update-status')?.getAttribute('aria-live')).toBe('polite');
        expect.soft(root.querySelector<HTMLButtonElement>('#continue-update-button')?.disabled).toBe(false);
      } finally { cleanup(); }
    });
  test(`UPDATE-NOTICE002 ${language}: authoritative bilingual messages explain update failure`,
    /** Checks the new localized failure copy independently of reader markup.
     * @returns Nothing after an assertion against the authoritative message module.
     */
    function copy(): void { expect((getPwaMessages(language) as unknown as Record<string, string>).updateFailed).toBe(failures[language]); });
}
