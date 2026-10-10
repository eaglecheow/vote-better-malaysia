import { test as baseTest, expect, type BrowserContext, type Page } from '@playwright/test';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, readdir, lstat, mkdir, writeFile, mkdtemp, rm, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { buildWorker, type ShellManifest } from '../../scripts/build-worker.ts';
import { buildTranscriptResult, validateCatalogue, validateSittingRecord, type TranscriptResult } from '../../src/source.ts';
import { readerFixture, type ReaderFixture } from './reader.ts';

export const repositoryBase = '/vote-better-malaysia/';
export interface PwaCandidate { manifest: ShellManifest; files: Map<string, Buffer>; mainAsset: string }
export interface NativeSnapshot { name: string; stores: string[]; catalogue: unknown; preferences: unknown; pair: TranscriptResult | null;
  caches: Array<{ name: string; urls: string[] }> }
export interface NativeProbe {
  events: Array<{ type: 'request-success' | 'commit' | 'abort' | 'apply'; store: string; incomingTime: string | null; visibleSavedTime: string | null;
    waitingTarget?: boolean; version?: string; committedPreferences?: boolean }>;
}
export interface PwaFixture {
  url: string; origin: string; a: PwaCandidate; b: PwaCandidate; data: ReaderFixture;
  requests: Array<{ path: string; version: string; status: number }>;
  version: 'a' | 'b'; failAsset: string | null; invalid: 'digest' | 'identity' | 'schema' | null;
}

/** Copies real application inputs or nondata production shell files to an isolated temporary root.
 * @param source Existing real source/output directory.
 * @param destination Temporary destination.
 * @param excludeData Whether generated source data stays outside this controlled shell fixture.
 * @remarks Reads source bytes and writes temporary copies only; never rebuilds or edits dist.
 * @throws Error for symlink/nonregular inputs.
 */
async function copyTree(source: string, destination: string, excludeData = false): Promise<void> {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (excludeData && entry.name === 'data') continue;
    const from = join(source, entry.name); const to = join(destination, entry.name); const stats = await lstat(from);
    if (stats.isSymbolicLink()) throw new Error('T048 fixture refuses source/output symlinks');
    if (stats.isDirectory()) await copyTree(from, to, excludeData);
    else { if (!stats.isFile()) throw new Error('T048 requires regular frozen shell inputs'); await writeFile(to, await readFile(from)); }
  }
}
/** Reads exact generated temporary shell bytes for native HTTP responses.
 * @param directory Temporary generated output.
 * @param prefix Relative traversal path.
 * @param files Destination byte dictionary.
 * @remarks Populates the fixture dictionary from regular generated files.
 */
async function filesAt(directory: string, prefix: string, files: Map<string, Buffer>): Promise<void> {
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await filesAt(directory, path, files); else files.set(path, await readFile(join(directory, path)));
  }
}
/** Generates an actual worker through the production builder in a temporary fixture output.
 * @param projectRoot Frozen copies of real production application/worker/builder inputs.
 * @param outDir Temporary shell output.
 * @returns Generated candidate and exact served file bytes.
 * @remarks Invokes the real builder on temporary roots only.
 * @throws Error when T051/T052 production prerequisites are not yet implemented/built.
 */
async function candidate(projectRoot: string, outDir: string): Promise<PwaCandidate> {
  const manifest = await buildWorker({ projectRoot, outDir, base: repositoryBase });
  if (!manifest || !/^[a-f0-9]{64}$/.test(manifest.version)) throw new Error('T048 requires implemented T051/T052 production worker/build metadata; no native pass is implied');
  const files = new Map<string, Buffer>(); await filesAt(outDir, '', files);
  const index = files.get('index.html')!.toString('utf8'); const match = index.match(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/i);
  if (!match) throw new Error('T048 requires a real production application script');
  const mainAsset = new URL(match[1], `http://fixture.test${repositoryBase}`).pathname.slice(repositoryBase.length);
  if (!files.has(mainAsset) || !files.has('sw.js')) throw new Error('T048 requires generated native worker and application bytes');
  return { manifest, files, mainAsset };
}
/** Selects an appropriate native static content type; no Fetch/storage behavior is mocked.
 * @param path Frozen relative file.
 * @returns Static response MIME type.
 */
function mime(path: string): string {
  if (path.endsWith('.js')) return 'text/javascript'; if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.html')) return 'text/html'; if (path.endsWith('.webmanifest')) return 'application/manifest+json';
  if (path.endsWith('.png')) return 'image/png'; if (path.endsWith('.gz')) return 'application/gzip'; return 'application/octet-stream';
}
/** Creates controlled invalid wire data without altering worker/cache/IndexedDB APIs.
 * @param fixture Current coherent controlled source fixture.
 * @param failure Required native source-validation failure.
 * @param catalogue Whether this is the list resource.
 * @returns Invalid schema/identity/digest bytes for the specific HTTP boundary.
 */
function invalidBody(fixture: ReaderFixture, failure: NonNullable<PwaFixture['invalid']>, catalogue: boolean): Buffer {
  if (failure === 'schema' && catalogue) return gzipSync(JSON.stringify({ ...fixture.catalogue, schemaVersion: 99 }));
  if (failure === 'identity' && catalogue && fixture.record) {
    const record = structuredClone(fixture.record); record.sittingId = '999999';
    const bytes = Buffer.from(JSON.stringify(record)); const compressed = gzipSync(bytes); const list = structuredClone(fixture.catalogue);
    list.sittings[0].record.digest = createHash('sha256').update(bytes).digest('hex');
    list.sittings[0].record.decodedBytes = bytes.length; list.sittings[0].record.compressedBytes = compressed.length;
    return gzipSync(JSON.stringify(list));
  }
  if (!catalogue && fixture.record) {
    const record = structuredClone(fixture.record);
    if (failure === 'identity') record.sittingId = '999999';
    else if (failure === 'digest') record.items[0].text += '\nControlled invalid digest body.';
    return gzipSync(JSON.stringify(record));
  }
  return Buffer.from(catalogue ? fixture.catalogueGzip : fixture.recordGzip!);
}
/** Creates an isolated real HTTP origin with real generated A/B workers and controlled source data.
 * @param root Temporary fixture root.
 * @returns Fixture controller and native server cleanup callback.
 * @remarks Copies the explicit frozen site or existing dist, generates temporary workers, and binds a random localhost port without rebuilding.
 * @throws Error for missing production PWA prerequisites or failed native listener/build.
 */
async function createPwa(root: string): Promise<{ fixture: PwaFixture; close: () => Promise<void> }> {
  const project = join(root, 'project'); await mkdir(project, { recursive: true });
  for (const directory of ['src', 'worker']) await copyTree(resolve(directory), join(project, directory));
  for (const path of ['scripts/build-worker.ts', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json']) {
    await mkdir(dirname(join(project, path)), { recursive: true }); await writeFile(join(project, path), await readFile(resolve(path)));
  }
  const aDir = join(root, 'a'); const bDir = join(root, 'b'); await copyTree(resolve(process.env.HANSARD_FROZEN_SITE ?? 'dist'), aDir, true);
  const a = await candidate(project, aDir); await copyTree(aDir, bDir, true);
  const modified = Buffer.concat([a.files.get(a.mainAsset)!, Buffer.from('\n/* Controlled T048 newer shell bytes. */\n')]);
  const newPath = `assets/reader-${createHash('sha256').update(modified).digest('hex').slice(0, 12)}.js`;
  await writeFile(join(bDir, newPath), modified); await unlink(join(bDir, a.mainAsset));
  const index = a.files.get('index.html')!.toString('utf8').replaceAll(a.mainAsset, newPath).replace('</head>', '<!-- Controlled T048 shell B. --></head>');
  await writeFile(join(bDir, 'index.html'), index); const b = await candidate(project, bDir);
  if (a.manifest.version === b.manifest.version) throw new Error('T048 requires two actually distinct generated shell versions');
  const fixture: PwaFixture = { url: '', origin: '', a, b, data: readerFixture('gaps'), requests: [], version: 'a', failAsset: null, invalid: null };
  const server = createServer(
    /** Serves immutable real shell bytes and controlled gzip data through native HTTP.
     * @param request Native request, including real worker update fetches.
     * @param response Native response.
     * @remarks Records served paths and writes native responses; never fakes storage/worker success.
     */
    function serve(request: IncomingMessage, response: ServerResponse): void {
      const url = new URL(request.url ?? '/', 'http://fixture.test'); let path = decodeURIComponent(url.pathname);
      response.setHeader('Cache-Control', 'no-store');
      if (path === '/native-inspection.html') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Native storage inspection only</title>'); return; }
      if (!path.startsWith(repositoryBase)) { response.writeHead(404); response.end(); return; }
      path = path.slice(repositoryBase.length) || 'index.html'; let bytes: Buffer | undefined;
      if (path.startsWith('data/')) {
        const catalogue = path === 'data/catalogue.json.gz';
        if (catalogue || path === 'data/sittings/29326.json.gz') bytes = fixture.invalid ? invalidBody(fixture.data, fixture.invalid, catalogue)
          : Buffer.from(catalogue ? fixture.data.catalogueGzip : fixture.data.recordGzip!);
      } else bytes = (fixture.version === 'a' ? a : b).files.get(path);
      const status = bytes && path !== fixture.failAsset ? 200 : 404; fixture.requests.push({ path, version: fixture.version, status });
      response.statusCode = status; if (status === 200) { response.setHeader('Content-Type', mime(path)); response.setHeader('Content-Length', bytes!.length); response.end(bytes); } else response.end();
    });
  await new Promise<void>(
    /** Opens the isolated native server with explicit error handling.
     * @param done Successful native listener callback.
     * @param fail Native listener error callback.
     * @remarks Binds a random localhost port, never port4173.
     */
    function listen(done, fail): void { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('T048 native fixture listener unavailable');
  fixture.origin = `http://127.0.0.1:${address.port}`; fixture.url = `${fixture.origin}${repositoryBase}`;
  return { fixture,
    /** Closes only this native random-port fixture server.
     * @returns Resolves once the server closes.
     * @remarks Releases the native fixture listener and its keepalive connections.
     */
    async close(): Promise<void> { server.closeAllConnections(); await new Promise<void>(
      /** Observes native server closure.
       * @param done Server-close completion.
       * @param fail Native close error.
       * @remarks Closes the fixture listener.
       */
      function finish(done, fail): void { server.close(
        /** Observes native listener closure without substituting its error callback for a promise resolver.
         * @param error Native close failure when present.
         * @remarks Resolves/rejects fixture cleanup after actual server closure.
         */
        function closed(error?: Error): void { if (error) fail(error); else done(); }); }); },
  };
}

export const test = baseTest.extend<{ pwa: PwaFixture }>({
  /** Supplies actual native mechanisms on an isolated controlled production-shell origin.
   * @param fixtures Native Playwright fixture dependencies; this isolated HTTP fixture needs none.
   * @param use Browser test consumer.
   * @param testInfo Native Playwright test metadata.
   * @returns Resolves after test and native fixture cleanup.
   * @remarks Creates/removes temporary shell/source copies and an isolated native HTTP listener.
   */
  pwa: async ({}, use, testInfo): Promise<void> => {
    const root = await mkdtemp(join(tmpdir(), 'hansard-native-pwa-')); let close: (() => Promise<void>) | undefined;
    try {
      const prepared = await createPwa(root); close = prepared.close;
      await testInfo.attach('native-pwa-fixture', { contentType: 'application/json', body: Buffer.from(JSON.stringify({
        scope: 'controlled production shell/native engine; not full live archive or actual branded-device acceptance',
        a: prepared.fixture.a.manifest, b: prepared.fixture.b.manifest, sourceSnapshot: prepared.fixture.data.catalogue.snapshotId,
        sourceCatalogueHash: createHash('sha256').update(prepared.fixture.data.catalogueGzip).digest('hex'),
        sourceRecordHash: createHash('sha256').update(prepared.fixture.data.recordGzip!).digest('hex'),
      })) });
      await use(prepared.fixture);
    } finally { if (close) await close(); await rm(root, { recursive: true, force: true }); }
  },
});
export { expect };

/** Opens the actual app and obtains native controller control after a genuine initial install.
 * @param page Native test page.
 * @param fixture Actual HTTP fixture origin.
 * @returns Resolves after actual registration, reload and usable source controls.
 * @remarks Navigates/reloads the real app; no worker readiness is fabricated.
 */
export async function openReader(page: Page, fixture: PwaFixture): Promise<void> {
  await page.goto(fixture.url); await expect(page.locator('#member-select option[value="1839"]')).toBeAttached();
  await expect.poll(
    /** Awaits each actual native activation query before deciding whether to poll again.
     * @returns Whether this repository worker is genuinely activated.
     */
    async function activation(): Promise<boolean> { return page.evaluate(
      /** Checks actual native activation rather than a fake success flag.
       * @param scope Real repository scope URL.
       * @returns Whether its worker is natively activated.
       */
      async function active(scope: string): Promise<boolean> { return (await navigator.serviceWorker.getRegistration(scope))?.active?.state === 'activated'; }, fixture.url); }).toBe(true);
  await page.reload(); await expect(page.locator('#member-select option[value="1839"]')).toBeAttached();
  await page.waitForFunction(
    /** Requires actual controlling worker presence. @returns Whether this page has a native controller. */
    function controlled(): boolean { return navigator.serviceWorker.controller !== null; });
  await expect.poll(
    /** Waits for the actual initial native catalogue transaction rather than controls-only rendering.
     * @returns Whether this real database contains the accepted catalogue.
     * @remarks Reads actual native IndexedDB without synthesizing persistence.
     */
    async function catalogueCommitted(): Promise<boolean> { return (await nativeSnapshot(page, fixture)).catalogue !== null; }).toBe(true);
}
/** Reads an exact pair through real source controls and waits for real saved status.
 * @param page Native reader.
 * @param memberId Exact selected source ID.
 * @param saved Whether a committed successful save is required for this step.
 * @returns Resolves after complete native rendering and optional saved acknowledgement.
 * @remarks Changes actual selections and clicks Read; storage implementation remains native.
 */
export async function readPair(page: Page, memberId = '1839', saved = true): Promise<void> {
  await page.locator('#member-select').selectOption(memberId); await page.locator('#sitting-select').selectOption('29326'); await page.locator('#read-button').click();
  await expect(page.locator('#reader-result[data-result-complete="true"]')).toHaveAttribute('data-member-id', memberId);
  if (saved) {
    await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true');
    await page.waitForFunction(
      /** Waits for this freshly validated result's own saved acknowledgement rather than an older copy's status.
       * @returns Whether actual visible current and committed saved UTC instants match.
       */
      function acknowledged(): boolean {
        const current = document.querySelector('[data-field="refreshed-at"]')?.textContent?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0];
        const savedTime = document.querySelector('[data-field="saved-refreshed-at"]')?.textContent?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0];
        return Boolean(current && current === savedTime && document.querySelector('#reader-save-status')?.getAttribute('data-saved') === 'true');
      });
  }
}
/** Independently checks every original source partition and supplied provenance in native DOM.
 * @param page Native rendered reader.
 * @param expected Accepted complete controlled source result.
 * @returns Resolves after exact words/order/metadata checks.
 */
export async function expectResult(page: Page, expected: TranscriptResult): Promise<void> {
  await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true');
  await expect(page.locator('#reader-result')).toHaveAttribute('data-member-id', expected.memberId); await expect(page.locator('#reader-result')).toHaveAttribute('data-sitting-id', expected.sittingId);
  await expect(page.locator('#reader-result')).toHaveAttribute('data-outcome', expected.outcome);
  for (const [kind, items] of [['turn', expected.turns], ['gap', expected.gaps], ['annotation', expected.annotations]] as const) {
    const texts: string[] = []; for (const item of items) texts.push(item.text);
    expect(await page.locator(`[data-kind="${kind}"] .source-text`).allTextContents()).toEqual(texts);
    for (let position = 0; position < items.length; position += 1) {
      const wrapper = page.locator(`[data-kind="${kind}"][data-source-item-id]`).nth(position); const item = items[position];
      await expect(wrapper).toHaveAttribute('data-source-item-id', String(item.ordinal));
      if (item.sourceIndex !== null) await expect(wrapper).toHaveAttribute('data-source-index', String(item.sourceIndex));
      else await expect(wrapper).not.toHaveAttribute('data-source-index');
    }
  }
  await expect(page.locator('a[data-role="source"]')).toHaveAttribute('href', expected.sitting.sourceUrl);
  await expect(page.locator('[data-field="prepared-at"]')).toContainText(expected.snapshot.preparedAt);
  for (const [field, value] of [['acquired-at', expected.sitting.record.acquiredAt], ['published-at', expected.snapshot.publishedAt],
    ['source-published', expected.sitting.record.sourcePublishedAt], ['source-revised', expected.sitting.record.sourceRevisedAt]] as const) {
    if (value !== null) await expect(page.locator(`[data-field="${field}"]`)).toContainText(value);
    else { await expect(page.locator(`[data-field="${field}"]`)).not.toHaveText(''); await expect(page.locator(`[data-field="${field}"]`)).not.toContainText(/\d{4}-\d{2}-\d{2}T/); }
  }
}
/** Derives a coherent explicitly synthetic revised wire fixture through shared source validators.
 * @param before Controlled source-excerpt fixture.
 * @returns Full coherent changed catalogue/shard/result and native gzip bytes.
 */
export function changedData(before: ReaderFixture): ReaderFixture {
  const fixture = structuredClone(before); const record = fixture.record!;
  for (const item of record.items) if (item.memberId === '1839') { item.text += '\n\nControlled native-browser revised fixture.'; break; }
  fixture.catalogue.snapshotId = 'controlled-pwa-source-revision'; fixture.catalogue.preparedAt = new Date().toISOString();
  const bytes = Buffer.from(JSON.stringify(record)); const gzip = gzipSync(bytes); const descriptor = fixture.catalogue.sittings[0].record;
  descriptor.digest = createHash('sha256').update(bytes).digest('hex'); descriptor.decodedBytes = bytes.length; descriptor.compressedBytes = gzip.length;
  validateCatalogue(fixture.catalogue); validateSittingRecord(record, fixture.catalogue.sittings[0], fixture.catalogue);
  fixture.result = buildTranscriptResult(fixture.catalogue, '1839', '29326', record); fixture.recordGzip = Uint8Array.from(gzip);
  fixture.catalogueGzip = Uint8Array.from(gzipSync(JSON.stringify(fixture.catalogue))); return fixture;
}

/** Observes actual native three-store device state and cache URLs without app storage helpers.
 * @param page Same-origin native page.
 * @param fixture Exact current repository origin.
 * @param memberId Exact pair to inspect.
 * @returns Raw native transaction-completed snapshot.
 * @remarks Opens/closes actual IndexedDB read transactions and reads actual Cache Storage.
 */
export async function nativeSnapshot(page: Page, fixture: PwaFixture, memberId = '1839'): Promise<NativeSnapshot> {
  return page.evaluate(
    /** Reads actual native device stores without substituting mocked values.
     * @param args Native database namespace and exact pair IDs.
     * @returns Actual persisted state after readonly transaction completion.
     * @remarks Opens/closes a real database connection and inspects real caches.
     */
    async function inspect(args: { name: string; memberId: string }): Promise<NativeSnapshot> {
      const snapshot: NativeSnapshot = { name: args.name, stores: [], catalogue: null, preferences: null, pair: null, caches: [] };
      for (const name of await caches.keys()) { const cache = await caches.open(name); const urls: string[] = []; for (const request of await cache.keys()) urls.push(request.url); snapshot.caches.push({ name, urls }); }
      let exists = false; for (const database of await indexedDB.databases()) if (database.name === args.name) exists = true;
      if (!exists) return snapshot;
      await new Promise<void>(
        /** Captures native open and readonly completion events.
         * @param done Actual transaction completion.
         * @param fail Native read/open failure.
         * @remarks Registers native request/transaction listeners and closes the connection.
         */
        function read(done, fail): void {
          const open = indexedDB.open(args.name); open.onerror =
            /** Reports native database open failure. @remarks Rejects this inspection promise. */
            function failed(): void { fail(open.error); };
          open.onsuccess =
            /** Reads all independent native stores. @remarks Starts native readonly requests. */
            function opened(): void {
              const db = open.result; snapshot.stores = [...db.objectStoreNames]; const tx = db.transaction(['catalogue', 'preferences', 'pairs'], 'readonly');
              const catalogue = tx.objectStore('catalogue').get('current'); const preferences = tx.objectStore('preferences').get('current'); const pair = tx.objectStore('pairs').get([args.memberId, '29326']);
              tx.oncomplete =
                /** Captures values only after actual readonly completion. @remarks Closes this connection and resolves native values. */
                function completed(): void { snapshot.catalogue = catalogue.result ?? null; snapshot.preferences = preferences.result ?? null; snapshot.pair = pair.result ?? null; db.close(); done(); };
              tx.onabort =
                /** Reports a native transaction abort. @remarks Closes and rejects inspection. */
                function aborted(): void { db.close(); fail(tx.error ?? new Error('native inspection aborted')); };
            };
        });
      return snapshot;
    }, { name: `hansard:${fixture.url}`, memberId });
}
/** Replaces/clears actual native pair records to exercise eviction and compatibility boundaries.
 * @param page Same-origin native page.
 * @param fixture Exact repository namespace.
 * @param value Replacement untrusted device value; null means clear opened pairs only.
 * @returns Resolves after actual readwrite commit.
 * @remarks Writes real native IndexedDB fixture data and closes its connection.
 */
export async function replaceNativePair(page: Page, fixture: PwaFixture, value: unknown): Promise<void> {
  await page.evaluate(
    /** Performs a deliberate real device-data mutation, not mocked storage success.
     * @param args Namespace and test-only untrusted replacement.
     * @returns Resolves after actual write transaction completion.
     * @remarks Writes/clears the actual native pair store.
     */
    async function replace(args: { name: string; value: unknown }): Promise<void> {
      await new Promise<void>(
        /** Captures native open/write completion.
         * @param done Native commit completion.
         * @param fail Native error/abort.
         * @remarks Registers native request/transaction listeners.
         */
        function write(done, fail): void {
          const open = indexedDB.open(args.name); open.onerror =
            /** Reports native open failure. @remarks Rejects the write promise. */
            function failed(): void { fail(open.error); };
          open.onsuccess =
            /** Writes one native test value. @remarks Starts real readwrite work. */
            function opened(): void {
              const db = open.result; const tx = db.transaction('pairs', 'readwrite'); const store = tx.objectStore('pairs');
              if (args.value === null) store.clear(); else store.put(args.value, ['1839', '29326']);
              tx.oncomplete =
                /** Confirms actual native commit. @remarks Closes and resolves the write. */
                function completed(): void { db.close(); done(); };
              tx.onabort =
                /** Reports actual rollback. @remarks Closes and rejects the write. */
                function aborted(): void { db.close(); fail(tx.error ?? new Error('native fixture write aborted')); };
            };
        });
    }, { name: `hansard:${fixture.url}`, value });
}
/** Queries the actual target worker using native source identity, without requesting activation.
 * @param page Actual in-scope reader client.
 * @param fixture Real generated worker fixture.
 * @param target Actual native active or waiting worker object.
 * @returns Native source-bound status response.
 * @remarks Posts only the public nonactivating discovery query and observes its actual source.
 */
export async function nativeStatus(page: Page, fixture: PwaFixture, target: 'active' | 'waiting' = 'active'): Promise<{ base: string; version: string; ready: boolean }> {
  return page.evaluate(
    /** Binds discovery response to the actual native target object rather than its stable URL.
     * @param args Repository scope and target role.
     * @returns Exact native source-bound discovery result.
     * @remarks Registers/removes a native message listener and posts public discovery.
     * @throws Error for missing target or timed-out native response.
     */
    async function discover(args: { scope: string; base: string; target: 'active' | 'waiting' }) {
      const registration = await navigator.serviceWorker.getRegistration(args.scope); const worker = registration?.[args.target];
      if (!worker) throw new Error('actual native worker target missing');
      return new Promise<{ base: string; version: string; ready: boolean }>(
        /** Captures source-bound native reply.
         * @param done Native valid reply.
         * @param fail Native timeout failure.
         * @remarks Registers native message/timeout handlers.
         */
        function wait(done, fail): void {
          const timeout = setTimeout(
            /** Ends missing native discovery. @remarks Removes the listener and rejects. */
            function expired(): void { navigator.serviceWorker.removeEventListener('message', received); fail(new Error('native source-bound worker discovery timeout')); }, 10000);
          /** Accepts only this exact native target's own status.
           * @param event Actual service-worker message event.
           * @remarks Resolves only matching native source/base/version data and removes listeners.
           */
          function received(event: MessageEvent): void {
            const value = event.data; if (event.source !== worker || value?.type !== 'SHELL_STATUS' || value.base !== args.base || !/^[a-f0-9]{64}$/.test(value.version) || typeof value.ready !== 'boolean') return;
            clearTimeout(timeout); navigator.serviceWorker.removeEventListener('message', received); done(value);
          }
          navigator.serviceWorker.addEventListener('message', received); worker.postMessage({ type: 'SHELL_STATUS', base: args.base });
        });
    }, { scope: fixture.url, base: repositoryBase, target });
}
/** Switches real served worker bytes and asks the browser's actual registration to update.
 * @param page Actual controlled reader.
 * @param fixture Real A/B server.
 * @returns Resolves after actual native waiting state.
 * @remarks Changes test HTTP bytes and calls real registration.update; no SW request routing.
 */
export async function offerUpdate(page: Page, fixture: PwaFixture): Promise<void> {
  fixture.version = 'b'; await page.evaluate(
    /** Requests a native update from the actual registration.
     * @param scope Native repository scope.
     * @returns Resolves after the native update check.
     * @remarks Calls actual ServiceWorkerRegistration.update.
     * @throws Error for missing native registration.
     */
    async function update(scope: string): Promise<void> { const registration = await navigator.serviceWorker.getRegistration(scope); if (!registration) throw new Error('native registration missing'); await registration.update(); }, fixture.url);
  await expect.poll(
    /** Awaits each native waiting-state query before checking the update offer.
     * @returns Whether the actual registration has an installed waiting worker.
     */
    async function waitingState(): Promise<boolean> { return page.evaluate(
      /** Observes actual installed-waiting state.
       * @param scope Native repository scope.
       * @returns Whether a real native worker is waiting.
       */
      async function waiting(scope: string): Promise<boolean> { return (await navigator.serviceWorker.getRegistration(scope))?.waiting?.state === 'installed'; }, fixture.url); }).toBe(true);
  await expect(page.locator('#reader-update-offer')).toHaveAttribute('data-update-version', fixture.b.manifest.version);
}
/** Closes an actual reader before disabling browser networking and opening a new reader page.
 * @param context Native browser context with real saved data/caches.
 * @param previous Actual reader to close.
 * @param fixture Exact native fixture origin.
 * @returns New offline reader page.
 * @remarks Closes the page, sets native offline mode and navigates a fresh page without route fulfillment.
 */
export async function reopenOffline(context: BrowserContext, previous: Page, fixture: PwaFixture): Promise<Page> {
  await previous.close(); await context.setOffline(true); const reopened = await context.newPage(); await reopened.goto(fixture.url); return reopened;
}

/** Arms a forwarding observer or one deliberate native transaction abort, without synthesizing successful storage events.
 * @param page Actual native reader.
 * @param fixture Exact repository database identity.
 * @param store Actual pairs/preferences store under observation.
 * @param abort Whether the first real request-success event aborts its still-active native transaction.
 * @returns Resolves after the test-only native forwarding instrumentation is installed.
 * @remarks Temporarily forwards native prototype calls; actual IndexedDB commits/rollbacks and worker messages remain native.
 */
export async function armNativeProbe(page: Page, fixture: PwaFixture, store: 'pairs' | 'preferences', abort = false): Promise<void> {
  await page.evaluate(
    /** Records actual transaction events and actual waiting-target messages in this reader only.
     * @param args Exact native database/store and rollback request.
     * @returns Resolves after actual registration lookup and forwarding observer installation.
     * @remarks Installs forwarding native observers in this test page; reload removes them, sessionStorage retains the measured event log.
     */
    async function arm(args: { name: string; store: string; abort: boolean }): Promise<void> {
      const probe: NativeProbe = { events: [] }; let armed = true; let preferencesCommitted = false;
      let observedTransaction: IDBTransaction | null = null; let putObserved = false; let incomingTime: string | null = null;
      const actualRegistration = await navigator.serviceWorker.getRegistration();
      /** Persists observed native events for this same tab's post-Apply reload.
       * @remarks Writes only the test's sessionStorage observation log.
       */
      function persist(): void { sessionStorage.setItem('native-pwa-events', JSON.stringify(probe)); }
      persist(); const originalTransaction = IDBDatabase.prototype.transaction;
      const originalPut = IDBObjectStore.prototype.put; const originalPost = ServiceWorker.prototype.postMessage;
      /** Captures user-visible acknowledgement at an actual native event boundary.
       * @param type Actual event type.
       * @remarks Appends measured native/DOM state and persists the test observation.
       */
      function record(type: 'request-success' | 'commit' | 'abort'): void {
        probe.events.push({ type, store: args.store, incomingTime, visibleSavedTime: document.querySelector('[data-field="saved-refreshed-at"]')?.textContent ?? null }); persist();
      }
      IDBDatabase.prototype.transaction =
        /** Observes the actual write transaction before application completion listeners can be added.
         * @param this Actual native IndexedDB database receiver.
         * @param storeNames Actual native transaction stores.
         * @param mode Optional native transaction mode.
         * @param options Optional native durability options.
         * @returns The unchanged actual native transaction.
         * @remarks Forwards transaction creation and observes only the first matching native readwrite transaction.
         */
        function observedTransactionCreation(this: IDBDatabase, storeNames: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions): IDBTransaction {
          const transaction = Reflect.apply(originalTransaction, this, options === undefined ? mode === undefined ? [storeNames] : [storeNames, mode] : [storeNames, mode, options]) as IDBTransaction;
          if (armed && this.name === args.name && transaction.mode === 'readwrite' && transaction.objectStoreNames.contains(args.store)) {
            armed = false; observedTransaction = transaction;
            transaction.addEventListener('complete',
              /** Observes actual commit before application promise continuations, never request success as a substitute.
               * @remarks Records genuine commit and permits measured preference-before-Apply ordering.
               */
              function committed(): void { if (args.store === 'preferences') preferencesCommitted = true; record('commit'); });
            transaction.addEventListener('abort',
              /** Observes native rollback.
               * @remarks Records the actual abort event.
               */
              function aborted(): void { record('abort'); });
          }
          return transaction;
        };
      IDBObjectStore.prototype.put =
        /** Forwards a real native put and observes its real request/transaction events.
         * @param this Actual native IndexedDB object-store receiver.
         * @param value Actual application value.
         * @param key Optional actual native key.
         * @returns Actual browser request without replacement or fabricated success.
         * @remarks Adds observers and optionally calls actual transaction.abort before commit.
         */
        function observedPut(this: IDBObjectStore, value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
          const request = Reflect.apply(originalPut, this, key === undefined ? [value] : [value, key]) as IDBRequest<IDBValidKey>;
          if (!putObserved && this.name === args.store && this.transaction === observedTransaction) {
            putObserved = true; const tx = this.transaction;
            incomingTime = (value as { refreshedAt?: string } | null)?.refreshedAt ?? null;
            request.addEventListener('success',
              /** Observes real native success while its transaction is still active.
               * @remarks Records request success and optionally requests a genuine native rollback.
               */
              function succeeded(): void { record('request-success'); if (args.abort) tx.abort(); });
          }
          return request;
        };
      ServiceWorker.prototype.postMessage =
        /** Forwards actual native worker messages while observing explicit Apply's target.
         * @param this Actual native service-worker target object.
         * @param message Actual application message.
         * @param transferOrOptions Native transfer/options argument.
         * @remarks Sends the real message unchanged and records actual source object versus registration.waiting identity.
         */
        function observedPost(this: ServiceWorker, message: unknown, transferOrOptions?: Transferable[] | StructuredSerializeOptions): void {
          if ((message as { type?: string } | null)?.type === 'APPLY_UPDATE') {
            const version = (message as { version?: string }).version;
            probe.events.push({ type: 'apply', store: 'preferences', incomingTime: null, visibleSavedTime: null,
              waitingTarget: actualRegistration?.waiting === this, version, committedPreferences: preferencesCommitted }); persist();
          }
          Reflect.apply(originalPost, this, transferOrOptions === undefined ? [message] : [message, transferOrOptions]);
        };
    }, { name: `hansard:${fixture.url}`, store, abort });
}
/** Reads measured native event observations from this same tab after an optional real reload.
 * @param page Actual reader tab under observation.
 * @returns Actual observed events, without invented defaults.
 * @throws Error if the native observer was not armed.
 */
export async function nativeProbe(page: Page): Promise<NativeProbe> {
  return page.evaluate(
    /** Reads only the test's recorded native-event log.
     * @returns Actual previously persisted observations.
     * @throws Error for an unarmed/missing probe.
     */
    function read(): NativeProbe { const text = sessionStorage.getItem('native-pwa-events'); if (!text) throw new Error('native probe not armed'); return JSON.parse(text); });
}
