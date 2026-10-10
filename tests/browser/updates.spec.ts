import { createHash } from 'node:crypto';
import { test, expect, repositoryBase, openReader, readPair, expectResult, nativeSnapshot, nativeStatus, offerUpdate,
  armNativeProbe, nativeProbe, reopenOffline } from '../fixtures/pwa.ts';

test('UPDATES-BROWSER001: native waiting-version discovery and Continue preserve two current reading tabs',
  /** Exercises actual distinct worker objects sharing one stable script URL without automatic activation.
   * @param fixtures Two native pages and generated real A/B worker bytes.
   * @returns Resolves after actual waiting/current version and unchanged reader assertions.
   * @remarks Requests a native update and continues reading in both tabs without consent to activation.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const other = await context.newPage(); await other.goto(pwa.url); await readPair(other); await expectResult(other, pwa.data.result);
    await offerUpdate(page, pwa); expect(await nativeStatus(page, pwa)).toEqual({ type: 'SHELL_STATUS', base: repositoryBase, version: pwa.a.manifest.version, ready: true });
    expect(await nativeStatus(page, pwa, 'waiting')).toEqual({ type: 'SHELL_STATUS', base: repositoryBase, version: pwa.b.manifest.version, ready: true });
    expect(await page.evaluate(
      /** Compares actual native objects independently of their shared stable URL.
       * @param scope Actual repository registration scope.
       * @returns The actual objects' identity/URL distinction.
       */
      async function identity(scope: string) { const registration = await navigator.serviceWorker.getRegistration(scope);
        return { distinct: registration!.active !== registration!.waiting, sameURL: registration!.active!.scriptURL === registration!.waiting!.scriptURL }; }, pwa.url)).toEqual({ distinct: true, sameURL: true });
    const before = await nativeSnapshot(page, pwa); await page.locator('#continue-update-button').click();
    await expect(page.locator('#reader-update-offer')).toBeHidden(); await expectResult(page, before.pair!); await expectResult(other, before.pair!);
    expect((await nativeStatus(page, pwa)).version).toBe(pwa.a.manifest.version); expect((await nativeStatus(page, pwa, 'waiting')).version).toBe(pwa.b.manifest.version);
    expect((await nativeSnapshot(page, pwa)).pair).toEqual(before.pair);
  });

test('UPDATES-BROWSER002: native preference commit precedes actual waiting-target Apply and only the consenting tab reloads',
  /** Exercises actual native activation/reload and continued old-client hashed asset retrieval.
   * @param fixtures Actual two-tab browser context and frozen real A/B shell bytes.
   * @returns Resolves after native commit/message ordering, consenting navigation, exact old-cache bytes and preserved device state.
   * @remarks Observes real native calls and reload events; seeds only an unrelated real cache to verify preservation.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await page.locator('#language-select').selectOption('en'); await readPair(page);
    const other = await context.newPage(); await other.goto(pwa.url); await readPair(other); const before = await nativeSnapshot(page, pwa); await expectResult(other, before.pair!);
    await page.evaluate(
      /** Seeds an actual unrelated cache that the repository worker must leave alone.
       * @returns Resolves after actual native cache.put.
       * @remarks Writes only this test's unrelated native cache.
       */
      async function seed(): Promise<void> { await (await caches.open('other-repository-shell')).put('/other/keep.txt', new Response('unrelated retained bytes')); });
    let otherNavigations = 0; other.on('framenavigated',
      /** Records actual other-tab main-frame navigations after its initial load.
       * @param frame Native browser frame.
       * @remarks Counts real main-frame navigation only.
       */
      function navigated(frame): void { if (frame === other.mainFrame()) otherNavigations += 1; });
    await offerUpdate(page, pwa); await armNativeProbe(page, pwa, 'preferences');
    const navigation = page.waitForEvent('framenavigated',
      /** Selects only a genuine consenting-tab main-frame reload.
       * @param frame Actual native frame.
       * @returns Whether it is this tab's main frame.
       */
      function main(frame): boolean { return frame === page.mainFrame(); });
    await page.locator('#apply-update-button').click(); await navigation; await expectResult(page, before.pair!);
    await expect(page.locator('meta[name="hansard-shell-version"]')).toHaveAttribute('content', pwa.b.manifest.version);
    await expect(page.locator('#language-select')).toHaveValue('en'); expect(otherNavigations).toBe(0); await expectResult(other, before.pair!);
    const probe = await nativeProbe(page); const apply = probe.events.find(
      /** Finds the actual forwarded Apply operation.
       * @param event Recorded native event.
       * @returns Whether it is the actual Apply message.
       */
      function applied(event): boolean { return event.type === 'apply'; });
    expect(apply).toMatchObject({ waitingTarget: true, version: pwa.b.manifest.version, committedPreferences: true });
    const after = await nativeSnapshot(page, pwa); expect(after.pair).toMatchObject({ schemaVersion: before.pair!.schemaVersion,
      snapshotId: before.pair!.snapshotId, snapshot: before.pair!.snapshot, provenance: before.pair!.provenance,
      memberId: before.pair!.memberId, sittingId: before.pair!.sittingId, member: before.pair!.member, sitting: before.pair!.sitting,
      recordDigest: before.pair!.recordDigest, turns: before.pair!.turns, gaps: before.pair!.gaps, annotations: before.pair!.annotations, saved: true });
    expect(Date.parse(after.pair!.refreshedAt!)).toBeGreaterThanOrEqual(Date.parse(before.pair!.refreshedAt!)); expect(after.preferences).toEqual(before.preferences);
    expect((await nativeStatus(page, pwa)).version).toBe(pwa.b.manifest.version);
    const oldBytes = await other.evaluate(
      /** Fetches the actual old hashed script after the server removed it from candidate B.
       * @param url Exact old frozen script URL.
       * @returns Native fetched bytes and HTTP status.
       * @remarks Sends a real cache-bypassing fetch that only the actual worker's old shell cache can satisfy.
       */
      async function retained(url: string) { const response = await fetch(url, { cache: 'no-store' }); return { status: response.status, bytes: [...new Uint8Array(await response.arrayBuffer())] }; }, `${pwa.url}${pwa.a.mainAsset}`);
    expect(pwa.b.files.has(pwa.a.mainAsset)).toBe(false); expect(oldBytes.status).toBe(200);
    expect(createHash('sha256').update(Uint8Array.from(oldBytes.bytes)).digest('hex')).toBe(createHash('sha256').update(pwa.a.files.get(pwa.a.mainAsset)!).digest('hex'));
    const state = await nativeSnapshot(other, pwa); const cacheNames: string[] = []; for (const cache of state.caches) cacheNames.push(cache.name);
    expect(cacheNames).toContain(`hansard-shell:${encodeURIComponent(repositoryBase)}:${pwa.a.manifest.version}`); expect(cacheNames).toContain('other-repository-shell');
  });

test('UPDATES-BROWSER003: real preference transaction abort prevents Apply and preserves both active and waiting workers',
  /** Exercises actual native storage failure before activation consent is sent.
   * @param fixtures Actual reader/context and generated waiting worker.
   * @returns Resolves after actual rollback, absent Apply, preserved shell/pair and other-tab assertions.
   * @remarks Aborts a genuine preference write after request success without replacing native worker/storage results.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const other = await context.newPage(); await other.goto(pwa.url); await readPair(other);
    const before = await nativeSnapshot(page, pwa); await expectResult(other, before.pair!);
    await offerUpdate(page, pwa); await armNativeProbe(page, pwa, 'preferences', true); await page.locator('#apply-update-button').click();
    await expect.poll(
      /** Waits for the actual native abort rather than an already nonempty update-offer notice.
       * @returns Whether the real preference transaction has aborted.
       */
      async function aborted(): Promise<boolean> { for (const event of (await nativeProbe(page)).events) if (event.type === 'abort') return true; return false; }).toBe(true);
    await expect(page.locator('#reader-update-status')).not.toHaveText('');
    const probe = await nativeProbe(page); const types: string[] = []; for (const event of probe.events) types.push(event.type);
    expect(types).toEqual(['request-success', 'abort']); expect((await nativeStatus(page, pwa)).version).toBe(pwa.a.manifest.version);
    expect((await nativeStatus(page, pwa, 'waiting')).version).toBe(pwa.b.manifest.version);
    expect((await nativeSnapshot(page, pwa)).preferences).toEqual(before.preferences); expect((await nativeSnapshot(page, pwa)).pair).toEqual(before.pair);
    await expectResult(page, before.pair!); await expectResult(other, before.pair!);
  });

test('UPDATES-BROWSER004: an actual failed new-shell install preserves confirmed old readiness and closed-reader offline content',
  /** Exercises a real required-asset HTTP failure during native worker installation.
   * @param fixtures Actual reader/context and A/B production-shell origin.
   * @returns Resolves after actual redundant state, old native readiness and fresh offline reopening assertions.
   * @remarks Serves a real404 for required help bytes; no CacheStorage rejection or worker success is mocked.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await readPair(page); const before = (await nativeSnapshot(page, pwa)).pair!; pwa.version = 'b'; pwa.failAsset = 'help.html';
    const states = await page.evaluate(
      /** Observes actual failed native installation through lifecycle events.
       * @param scope Actual registration scope.
       * @returns Native installing-worker states through redundant.
       * @remarks Attaches actual lifecycle listeners and requests a native update check.
       * @throws Error if installation never fails or the registration is missing.
       */
      async function failedInstall(scope: string): Promise<string[]> {
        const registration = await navigator.serviceWorker.getRegistration(scope); if (!registration) throw new Error('native registration missing');
        return new Promise<string[]>(
          /** Captures actual lifecycle completion rather than inferring failure from a timeout.
           * @param done Actual redundant result.
           * @param fail Missing native failure/registration error.
           * @remarks Observes native updatefound/statechange events and requests real update.
           */
          function observe(done, fail): void {
            const states: string[] = []; const timeout = setTimeout(
              /** Rejects missing real failure. @remarks Rejects the observer promise. */
              function expired(): void { fail(new Error('actual failed install did not reach redundant')); }, 15000);
            registration!.addEventListener('updatefound',
              /** Observes the actual installing worker.
               * @remarks Attaches a native state listener to the real object.
               */
              function found(): void { const worker = registration!.installing!;
                worker.addEventListener('statechange',
                  /** Captures genuine lifecycle transitions.
                   * @remarks Resolves only the actual redundant state and clears the timeout.
                   */
                  function changed(): void { states.push(worker.state); if (worker.state === 'redundant') { clearTimeout(timeout); done(states); } }); });
            void registration!.update().catch(
              /** Reports a native update transport failure. @param error Actual update error. @remarks Rejects this observation and clears its timer. */
              function rejected(error): void { clearTimeout(timeout); fail(error); });
          });
      }, pwa.url);
    expect(states).toContain('redundant'); const failed: string[] = []; for (const request of pwa.requests) if (request.status === 404) failed.push(request.path); expect(failed).toContain('help.html');
    expect((await nativeStatus(page, pwa)).version).toBe(pwa.a.manifest.version); expect((await nativeStatus(page, pwa)).ready).toBe(true);
    await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true'); await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true');
    const reopened = await reopenOffline(context, page, pwa); await expectResult(reopened, before);
  });
