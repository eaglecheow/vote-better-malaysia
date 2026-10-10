import { test, expect, repositoryBase, openReader, readPair, expectResult, nativeSnapshot, nativeStatus } from '../fixtures/pwa.ts';

test('INSTALL-BROWSER001: real base-scoped manifest/start/scope and native decoded icon dimensions stay bounded',
  /** Exercises actual HTTP manifest bytes and native image decoding, independent of prompt availability.
   * @param fixtures Actual reader and real generated shell HTTP origin.
   * @returns Resolves after exact base, real decoded icon dimensions and stored-byte assertions.
   * @remarks Fetches real bytes and creates native decoded images; does not simulate an OS install prompt.
   */
  async ({ page, pwa }) => {
    await page.goto(pwa.url); const metadata = await page.evaluate(
      /** Reads actual manifest/icon resources through native network/image mechanisms.
       * @param base Exact application base URL.
       * @returns Actual manifest and decoded icon dimensions/byte counts.
       * @throws Native fetch or image decoding failures.
       */
      async function inspect(base: string) {
        const response = await fetch(new URL('manifest.webmanifest', base), { cache: 'no-store' }); if (!response.ok) throw new Error('real manifest unavailable');
        const manifest = await response.json(); const icons: Array<{ url: string; width: number; height: number; bytes: number }> = [];
        for (const size of [192, 512]) {
          const url = new URL(`icons/icon-${size}.png`, base).href; const icon = await fetch(url, { cache: 'no-store' }); if (!icon.ok) throw new Error('real icon unavailable');
          const bytes = (await icon.arrayBuffer()).byteLength; const image = new Image(); image.src = url; await image.decode(); icons.push({ url, width: image.naturalWidth, height: image.naturalHeight, bytes });
        }
        return { manifest, icons, secure: isSecureContext };
      }, pwa.url);
    expect(metadata.secure).toBe(true); expect(metadata.manifest.start_url).toBe(repositoryBase); expect(metadata.manifest.scope).toBe(repositoryBase); expect(metadata.manifest.id).toBe(repositoryBase);
    expect(metadata.icons[0]).toMatchObject({ url: `${pwa.url}icons/icon-192.png`, width: 192, height: 192 }); expect(metadata.icons[1]).toMatchObject({ url: `${pwa.url}icons/icon-512.png`, width: 512, height: 512 });
    expect(metadata.icons[0].bytes + metadata.icons[1].bytes).toBeLessThanOrEqual(61440);
    for (const size of [192, 512]) {
      let matched = false; for (const icon of metadata.manifest.icons) if (new URL(icon.src, pwa.url).href === `${pwa.url}icons/icon-${size}.png` && icon.sizes === `${size}x${size}` && icon.type === 'image/png') matched = true;
      expect(matched).toBe(true);
    }
  });

test('INSTALL-BROWSER002: real native registration and complete versioned CacheStorage confirm shell readiness without data caching',
  /** Exercises actual worker activation, source-bound readiness and real cached required resources.
   * @param fixtures Native reader and generated shell manifest.
   * @returns Resolves after native scope/status/cache assertions and ordinary reader operation.
   * @remarks Installs a real worker then reloads for native control, without clients.claim or synthetic success.
   */
  async ({ page, pwa }) => {
    await openReader(page, pwa); await readPair(page); const scope = await page.evaluate(
      /** Reads actual native registration metadata.
       * @param url Actual in-scope app URL.
       * @returns Real native scope/active/controller states.
       */
      async function registration(url: string) { const value = await navigator.serviceWorker.getRegistration(url);
        return { scope: value?.scope, state: value?.active?.state, controlled: navigator.serviceWorker.controller !== null }; }, pwa.url);
    expect(scope).toEqual({ scope: pwa.url, state: 'activated', controlled: true }); expect(await nativeStatus(page, pwa)).toMatchObject({ base: repositoryBase, version: pwa.a.manifest.version, ready: true });
    const snapshot = await nativeSnapshot(page, pwa); const shell = snapshot.caches.find(
      /** Selects only the actual repository/current-version cache.
       * @param cache Actual native cache metadata.
       * @returns Whether its exact namespace matches this generated candidate.
       */
      function current(cache): boolean { return cache.name === `hansard-shell:${encodeURIComponent(repositoryBase)}:${pwa.a.manifest.version}`; });
    expect(shell).toBeDefined(); const required: string[] = []; for (const asset of pwa.a.manifest.assets) required.push(new URL(asset, pwa.origin).href);
    expect(shell!.urls.sort()).toEqual(required.sort()); for (const url of shell!.urls) expect(new URL(url).pathname).not.toContain('/data/');
    await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true'); await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true');
  });

test('INSTALL-BROWSER003: an actual first-shell install failure leaves online reading/saving available with no offline-ready promise',
  /** Exercises real required-shell HTTP failure while native IndexedDB remains usable.
   * @param fixtures Actual native reader and controlled shell HTTP server.
   * @returns Resolves after separate native saved/unready state and exact online content assertions.
   * @remarks Fails the actual required help asset; never fabricates storage or cache success.
   */
  async ({ page, pwa }) => {
    pwa.failAsset = 'help.html'; await page.goto(pwa.url); await expect(page.locator('#member-select option[value="1839"]')).toBeAttached(); await readPair(page);
    await expectResult(page, pwa.data.result); expect((await nativeSnapshot(page, pwa)).pair?.saved).toBe(true);
    await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true'); await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'false');
    await expect(page.locator('#reader-offline-status')).not.toHaveText('');
    await expect.poll(
      /** Requires a real failed required-resource response before evaluating worker absence.
       * @returns Whether the actual HTTP server recorded the failed help request.
       */
      function failed(): boolean { for (const request of pwa.requests) if (request.path === 'help.html' && request.status === 404) return true; return false; }).toBe(true);
    await expect.poll(
      /** Awaits native failure cleanup rather than treating its Promise as a fulfilled predicate.
       * @returns Whether the failed registration has no remaining lifecycle object.
       */
      async function failedState(): Promise<boolean> { return page.evaluate(
        /** Waits for the real failed installation to leave no installing or waiting worker.
         * @param scope Actual registration scope.
         * @returns Whether the native failed registration has no remaining worker lifecycle object.
         */
        async function failedRegistration(scope: string): Promise<boolean> { const registration = await navigator.serviceWorker.getRegistration(scope);
          return !registration?.installing && !registration?.waiting && !registration?.active; }, pwa.url); }).toBe(true);
    expect(await page.evaluate(
      /** Reads the actual native activation boundary after failed installation.
       * @param scope Actual repository scope.
       * @returns Whether an actual active worker exists.
       */
      async function active(scope: string): Promise<boolean> { return Boolean((await navigator.serviceWorker.getRegistration(scope))?.active); }, pwa.url)).toBe(false);
  });

test('INSTALL-BROWSER004: the manifest reader entry remains a usable website with preserved saved content without a prompt event',
  /** Exercises the actual installed-entry URL as an ordinary website; OS home-screen installation remains separate device evidence.
   * @param fixtures Actual native page/context and base-scoped manifest.
   * @returns Resolves after native start-URL navigation and exact saved reader continuity.
   * @remarks Opens the real manifest start URL; does not dispatch beforeinstallprompt or claim actual branded-device installation.
   */
  async ({ page, context, pwa }) => {
    await openReader(page, pwa); await page.locator('#language-select').selectOption('en'); await readPair(page); const stored = (await nativeSnapshot(page, pwa)).pair!;
    const entry = await context.newPage(); await entry.goto(new URL(repositoryBase, pwa.origin).href); await expect(entry.locator('html')).toHaveAttribute('lang', 'en'); await expectResult(entry, stored);
    await expect(entry.locator('#member-select')).toHaveValue('1839'); await expect(entry.locator('#sitting-select')).toHaveValue('29326');
  });
