import { buildTranscriptResult } from '../../src/source.ts';
import { test, expect, openReader, readPair, expectResult, nativeSnapshot, replaceNativePair, reopenOffline } from '../fixtures/pwa.ts';

for (const language of ['ms', 'en'] as const) test(`OFFLINE001 ${language}: a closed reader reopens exact committed words, gaps, annotations and provenance offline`,
  /** Exercises real device persistence and a fresh offline navigation in each locale.
   * @param fixtures Native page/context and isolated real-worker origin.
   * @returns Resolves after exact source and actual native store/cache assertions.
   * @remarks Changes native browser networking after closing the successful reader; no route fulfillment is used.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await page.locator('#language-select').selectOption(language); await readPair(page);
    await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true');
    const before = await nativeSnapshot(page, pwa); expect(before.stores.sort()).toEqual(['catalogue', 'pairs', 'preferences']);
    expect(before.pair?.saved).toBe(true); expect(before.preferences).toEqual({ language, memberId: '1839', sittingId: '29326' });
    expect(before.caches.length).toBeGreaterThan(0);
    for (const cache of before.caches) for (const url of cache.urls) expect(new URL(url).pathname).not.toContain('/data/');
    const reopened = await reopenOffline(context, page, pwa);
    await expect(reopened.locator('html')).toHaveAttribute('lang', language); await expect(reopened.locator('#member-select')).toHaveValue('1839');
    await expect(reopened.locator('#sitting-select')).toHaveValue('29326'); await expectResult(reopened, before.pair!);
    await expect(reopened.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true');
    await expect(reopened.locator('#reader-save-status')).toHaveText(language === 'en' ? 'Transcript saved on this device.' : 'Transkrip disimpan pada peranti.');
    await expect(reopened.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true');
    await expect(reopened.locator('[data-field="saved-refreshed-at"]')).toContainText(before.pair!.refreshedAt!);
    const after = await nativeSnapshot(reopened, pwa); expect(after.pair).toEqual(before.pair);
  });

test('OFFLINE002: fetching one sitting never saves an unopened different-member pair',
  /** Exercises exact pair keys through actual same-sitting selection and offline native retrieval.
   * @param fixtures Native page/context and coherent controlled source.
   * @returns Resolves after actual missing-pair and no-participation-inference assertions.
   * @remarks Disables native networking after closing the saved reader.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); expect((await nativeSnapshot(page, pwa, '4463')).pair).toBeNull();
    const reopened = await reopenOffline(context, page, pwa); await expectResult(reopened, pwa.data.result);
    await reopened.locator('#member-select').selectOption('4463'); await reopened.locator('#read-button').click();
    await expect(reopened.locator('#reader-result[data-result-complete="true"]')).toHaveCount(0);
    await expect(reopened.locator('#reader-status')).toContainText(/sambungan|connection/i);
    await expect(reopened.locator('#reader-save-status')).toHaveAttribute('data-saved', 'false');
    await expect(reopened.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'false');
    expect((await nativeSnapshot(reopened, pwa, '4463')).pair).toBeNull();
  });

test('OFFLINE003: a cached shell and catalogue without an opened transcript require a connection',
  /** Exercises shell-only readiness without inferring that catalogue loading saved all records.
   * @param fixtures Native page/context and real shell.
   * @returns Resolves after native empty-pair and visible connection-required assertions.
   * @remarks Closes the online controls-only reader before real offline reopening.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); const before = await nativeSnapshot(page, pwa); expect(before.catalogue).not.toBeNull(); expect(before.pair).toBeNull();
    const reopened = await reopenOffline(context, page, pwa); await expect(reopened.locator('#member-select option[value="1839"]')).toBeAttached();
    await reopened.locator('#member-select').selectOption('1839'); await reopened.locator('#sitting-select').selectOption('29326'); await reopened.locator('#read-button').click();
    await expect(reopened.locator('#reader-result[data-result-complete="true"]')).toHaveCount(0);
    await expect(reopened.locator('#reader-status')).toContainText(/sambungan|connection/i);
    await expect(reopened.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'false');
  });

test('OFFLINE004: real pair-store eviction loses that transcript without claiming verified absence',
  /** Exercises real native device eviction after a prior committed save.
   * @param fixtures Native page/context and real storage namespace.
   * @returns Resolves after missing-pair and preserved catalogue assertions.
   * @remarks Clears the actual pair store, then closes/reopens with native networking disabled.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); await replaceNativePair(page, pwa, null);
    const reopened = await reopenOffline(context, page, pwa); await expect(reopened.locator('#reader-status')).toContainText(/sambungan|connection/i);
    await expect(reopened.locator('#reader-result[data-result-complete="true"]')).toHaveCount(0);
    const stored = await nativeSnapshot(reopened, pwa); expect(stored.catalogue).not.toBeNull(); expect(stored.pair).toBeNull();
  });

for (const field of ['schemaVersion', 'memberId', 'recordDigest'] as const) test(`OFFLINE005 ${field}: incompatible real saved data stays unavailable without destructive repair`,
  /** Exercises compatibility rejection against an actual committed malformed device value.
   * @param fixtures Native page/context and accepted source fixture.
   * @returns Resolves after incompatible status, no source result and unchanged malformed storage assertions.
   * @remarks Deliberately writes one untrusted value to actual native IndexedDB before offline reopening.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const stored = (await nativeSnapshot(page, pwa)).pair!;
    const invalid = { ...stored, [field]: field === 'schemaVersion' ? 99 : field === 'memberId' ? '4463' : 'invalid-digest' };
    await replaceNativePair(page, pwa, invalid); const reopened = await reopenOffline(context, page, pwa);
    await expect(reopened.locator('#reader-status')).toContainText(/serasi|compatible/i);
    await expect(reopened.locator('#reader-result[data-result-complete="true"]')).toHaveCount(0);
    expect((await nativeSnapshot(reopened, pwa)).pair).toEqual(invalid);
  });

test('OFFLINE006: an explicitly opened zero-turn incomplete pair retains gaps rather than claiming absence',
  /** Exercises a separately opened native pair with complete retained attribution gaps.
   * @param fixtures Native page/context and same-sitting controlled source.
   * @returns Resolves after exact complete pair/gap/annotation checks.
   * @remarks Saves the second member through real controls before closing and reopening offline.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page, '22462');
    const expected = buildTranscriptResult(pwa.data.catalogue, '22462', '29326', pwa.data.record); expect(expected.turns).toHaveLength(0); expect(expected.outcome).toBe('incomplete');
    const reopened = await reopenOffline(context, page, pwa); await expectResult(reopened, expected);
    await expect(reopened.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true');
    expect((await nativeSnapshot(reopened, pwa, '22462')).pair?.outcome).toBe('incomplete');
  });
