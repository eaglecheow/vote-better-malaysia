import { test, expect, openReader, readPair, expectResult, nativeSnapshot, changedData, armNativeProbe, nativeProbe, reopenOffline } from '../fixtures/pwa.ts';

test('STORAGE-BROWSER001: native request success precedes commit and cannot acknowledge the new saved time',
  /** Observes real IndexedDB request/commit events and complete self-contained pair state.
   * @param fixtures Native reader and actual device namespace.
   * @returns Resolves after native ordering, timestamp and exact source assertions.
   * @remarks Adds forwarding native event observers without replacing request/transaction success.
   */
  async ({ page, pwa }) => {
    await openReader(page, pwa); await armNativeProbe(page, pwa, 'pairs'); await readPair(page);
    const state = await nativeSnapshot(page, pwa); const probe = await nativeProbe(page);
    expect(probe.events.map(
      /** Selects observed event names for an independent ordering assertion.
       * @param event Actual native observation.
       * @returns Its event type.
       */
      function type(event) { return event.type; })).toEqual(['request-success', 'commit']);
    expect(probe.events[0].incomingTime).toBe(state.pair!.refreshedAt);
    expect(probe.events[0].visibleSavedTime ?? '').not.toContain(state.pair!.refreshedAt!);
    expect(state.pair!.saved).toBe(true); expect(state.catalogue).toEqual(pwa.data.catalogue);
    expect(state.preferences).toEqual({ language: 'ms', memberId: '1839', sittingId: '29326' }); await expectResult(page, state.pair!);
    await expect(page.locator('[data-field="refreshed-at"]')).toContainText(state.pair!.refreshedAt!);
    await expect(page.locator('[data-field="saved-refreshed-at"]')).toContainText(state.pair!.refreshedAt!);
  });

test('STORAGE-BROWSER002: native abort after real put success rolls back all stores and preserves the older offline copy',
  /** Exercises an actual still-active native transaction.abort, not a fabricated write rejection.
   * @param fixtures Native reader/context and coherent changed source bytes.
   * @returns Resolves after native abort/rollback, separate current/prior times and closed offline content checks.
   * @remarks Aborts one actual pair-saving transaction after request success, then removes page instrumentation by closing it.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const before = await nativeSnapshot(page, pwa);
    pwa.data = changedData(pwa.data); await armNativeProbe(page, pwa, 'pairs', true); await readPair(page, '1839', false);
    await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'false'); await expectResult(page, pwa.data.result);
    const after = await nativeSnapshot(page, pwa); expect(after.pair).toEqual(before.pair); expect(after.catalogue).toEqual(before.catalogue); expect(after.preferences).toEqual(before.preferences);
    const probe = await nativeProbe(page); expect(probe.events[0].type).toBe('request-success'); expect(probe.events[1].type).toBe('abort');
    expect(probe.events[0].incomingTime).not.toBe(before.pair!.refreshedAt);
    await expect(page.locator('[data-field="refreshed-at"]')).toContainText(probe.events[0].incomingTime!);
    await expect(page.locator('[data-field="prior-saved-refreshed-at"]')).toContainText(before.pair!.refreshedAt!);
    await expect(page.locator('#reader-offline-status')).not.toHaveText('');
    const reopened = await reopenOffline(context, page, pwa); await expectResult(reopened, before.pair!);
    await expect(reopened.locator('[data-field="saved-refreshed-at"]')).toContainText(before.pair!.refreshedAt!);
  });

test('STORAGE-BROWSER003: unchanged source bytes still get a new successful validation and committed saved time',
  /** Exercises repeated native network retrieval and a real later successful device commit.
   * @param fixtures Native reader and unchanged controlled data resources.
   * @returns Resolves after actual network counts, unchanged words/digest and advanced timestamps.
   */
  async ({ page, pwa }) => {
    await openReader(page, pwa); await readPair(page); const before = (await nativeSnapshot(page, pwa)).pair!; const requests = pwa.requests.length;
    await page.waitForFunction(
      /** Requires a genuinely later clock without fabricating performance/device time.
       * @param previous Prior committed UTC instant.
       * @returns Whether native Date.now is later.
       */
      function later(previous: string): boolean { return Date.now() > Date.parse(previous); }, before.refreshedAt!);
    await readPair(page); const after = (await nativeSnapshot(page, pwa)).pair!;
    expect(after.recordDigest).toBe(before.recordDigest); expect(after.turns).toEqual(before.turns); expect(Date.parse(after.refreshedAt!)).toBeGreaterThan(Date.parse(before.refreshedAt!));
    const fetched = pwa.requests.slice(requests); const paths: string[] = []; for (const request of fetched) paths.push(request.path);
    expect(paths).toContain('data/catalogue.json.gz'); expect(paths).toContain('data/sittings/29326.json.gz');
    await expect(page.locator('[data-field="refreshed-at"]')).toContainText(after.refreshedAt!); await expect(page.locator('[data-field="saved-refreshed-at"]')).toContainText(after.refreshedAt!);
  });

test('STORAGE-BROWSER004: a changed coherent record replaces all native saved source partitions after validation',
  /** Exercises changed source digest/snapshot with a real native save.
   * @param fixtures Native reader and HTTP-controlled source.
   * @returns Resolves after complete changed source, native metadata and reload continuity assertions.
   * @remarks Changes only controlled HTTP data bytes; storage remains actual IndexedDB.
   */
  async ({ page, pwa }) => {
    await openReader(page, pwa); await readPair(page); const before = (await nativeSnapshot(page, pwa)).pair!;
    pwa.data = changedData(pwa.data); await readPair(page); const after = (await nativeSnapshot(page, pwa)).pair!;
    expect(after.recordDigest).not.toBe(before.recordDigest); expect(after.snapshotId).toBe(pwa.data.catalogue.snapshotId); expect(after.turns).toEqual(pwa.data.result.turns);
    expect(after.gaps).toEqual(pwa.data.result.gaps); expect(after.annotations).toEqual(pwa.data.result.annotations); await expectResult(page, after);
    await page.reload(); await expectResult(page, after); expect((await nativeSnapshot(page, pwa)).pair?.recordDigest).toBe(after.recordDigest);
  });

for (const failure of ['digest', 'identity', 'schema'] as const) test(`STORAGE-BROWSER005 ${failure}: invalid online replacement cannot overwrite a previously committed pair or its time`,
  /** Exercises the actual native decompression/validation boundary against controlled invalid HTTP bytes.
   * @param fixtures Native reader and prior coherent committed source.
   * @returns Resolves after exact preserved native state, visible failure and offline old-copy assertions.
   * @remarks Serves invalid real wire bytes; identity failure has a matching decoded digest so it reaches identity validation.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const before = await nativeSnapshot(page, pwa); pwa.invalid = failure;
    await page.locator('#read-button').click(); await expect(page.locator('#retry-button')).toBeVisible();
    const after = await nativeSnapshot(page, pwa); expect(after.pair).toEqual(before.pair); expect(after.catalogue).toEqual(before.catalogue);
    await expect(page.locator('#reader-status')).not.toHaveText('');
    const reopened = await reopenOffline(context, page, pwa); await expectResult(reopened, before.pair!);
    await expect(reopened.locator('[data-field="saved-refreshed-at"]')).toContainText(before.pair!.refreshedAt!);
  });
