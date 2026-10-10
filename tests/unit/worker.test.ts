import { expect, test, vi } from 'vitest';
import { activateShell, bindWorkerEvents, fetchShell, handleShellMessage, installShell, shellStatus,
  type ShellCache, type ShellHost, type ShellStatus, type WorkerClient, type WorkerEventScope } from '../../worker/service-worker.ts';
import type { ShellManifest } from '../../scripts/build-worker.ts';

const origin = 'https://eaglecheow.github.io'; const base = '/vote-better-malaysia/';
const currentVersion = 'a'.repeat(64); const oldVersion = 'b'.repeat(64);
const manifest: ShellManifest = { base, version: currentVersion, assets: ['', 'index.html', 'help.html', 'manifest.webmanifest',
  'assets/reader-A1B2C3D4.js', 'assets/reader-A1B2C3D4.css', 'icons/icon-192.png', 'icons/icon-512.png', 'sw.js'].map(
  /** Resolves each public contract fixture asset under the actual repository base.
   * @param path Relative fixed shell file.
   * @returns Base-scoped shell URL.
   */
  function url(path: string): string { return `${base}${path}`; }) };
interface ClientFixture extends WorkerClient { messages: unknown[]; controlled: boolean }
interface ClientQuery { includeUncontrolled?: boolean; type?: string }

/** Names versioned fixture caches using the agreed public repository cache convention.
 * @param shell Complete shell identity.
 * @returns Repository-owned versioned cache key.
 */
function cacheKey(shell: ShellManifest): string { return `hansard-shell:${encodeURIComponent(shell.base)}:${shell.version}`; }
/** Resolves native cache/request keys without preserving non-HTTP fragments.
 * @param input Native string/URL/Request input.
 * @returns Canonical absolute cache key with query preserved.
 */
function urlKey(input: RequestInfo | URL): string {
  const value = input instanceof Request ? input.url : String(input); const url = new URL(value, origin); url.hash = ''; return url.href;
}
/** Creates a complete versioned shell response body for controlled storage/fetch.
 * @param path Absolute/base-scoped response URL.
 * @param version Actual indexed fixture shell version.
 * @returns Version-stamped HTML for entry points, original fixture bytes otherwise.
 */
function body(path: string, version: string): string {
  const name = new URL(path, origin).pathname;
  if (name === base || name.endsWith('/index.html')) return `<html><head><meta name="hansard-shell-version" content="${version}"></head><body>reader ${version}</body></html>`;
  return `shell:${name}:${version}`;
}
/** Creates a native response with controlled URL/redirect/type fields.
 * @param url Actual response URL.
 * @param content Response body.
 * @param status Native status.
 * @param redirected Whether native redirection occurred.
 * @param type Native response category.
 * @returns Controlled response for platform-boundary unit tests.
 */
function response(url: string, content: string, status = 200, redirected = false, type = 'basic'): Response {
  const value = new Response(content, { status }); Object.defineProperty(value, 'url', { value: new URL(url, origin).href });
  Object.defineProperty(value, 'redirected', { value: redirected }); Object.defineProperty(value, 'type', { value: type });
  if (type === 'opaque') { Object.defineProperty(value, 'status', { value: 0 }); Object.defineProperty(value, 'ok', { value: false }); }
  return value;
}
/** Clones fixture-native response metadata the way real cache responses retain it.
 * @param value Controlled stored response.
 * @returns Independent readable body and the same native response fields.
 */
function clone(value: Response): Response {
  const copy = value.clone(); for (const field of ['url', 'redirected', 'type', 'status', 'ok'] as const) Object.defineProperty(copy, field, { value: value[field] }); return copy;
}
class FakeCache implements ShellCache {
  entries = new Map<string, Response>(); owner: FakeHost; name: string;
  /** Captures controlled storage ownership without installing product behavior.
   * @param owner Platform call recorder.
   * @param name Versioned fixture cache key.
   * @remarks Initializes this fixture cache.
   */
  constructor(owner: FakeHost, name: string) { this.owner = owner; this.name = name; }
  /** Returns a readable controlled cached response.
   * @param request Native cache lookup key.
   * @returns Cloned response or undefined.
   * @throws Error for an injected cache-read failure.
   * @remarks Records controlled native cache operations.
   */
  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    this.owner.calls.push(`match:${this.name}:${urlKey(request)}`);
    if (this.owner.failMatch === this.name) throw new Error('injected cache match failure');
    const found = this.entries.get(urlKey(request)); return found ? clone(found) : undefined;
  }
  /** Stores one readable controlled response.
   * @param request Native cache key.
   * @param value Native response.
   * @throws Error for an injected quota/write failure.
   * @remarks Updates only this fixture cache and records the write.
   */
  async put(request: RequestInfo | URL, value: Response): Promise<void> {
    const url = urlKey(request); this.owner.calls.push(`put:${this.name}:${url}`);
    if (this.owner.failPut === url) throw new Error('injected quota/write failure'); this.entries.set(url, clone(value));
  }
  /** Provides the native addAll boundary without implementing app install policy.
   * @param requests Requested platform resources.
   * @throws Error for a failed fetch/status or injected cache write.
   * @remarks Fetches/stages controlled responses, then updates this temporary cache.
   */
  async addAll(requests: Array<RequestInfo | URL>): Promise<void> {
    const staged: Array<[RequestInfo | URL, Response]> = [];
    for (const request of requests) {
      const result = await this.owner.fetch(request); if (!result.ok) throw new Error('native addAll response failed'); staged.push([request, result]);
    }
    for (const [request, result] of staged) await this.put(request, result);
  }
  /** Lists controlled native cache request keys.
   * @returns Stored requests.
   */
  async keys(): Promise<Request[]> { const result: Request[] = []; for (const key of this.entries.keys()) result.push(new Request(key)); return result; }
}
class FakeCacheStorage {
  entries = new Map<string, FakeCache>(); owner: FakeHost;
  /** Captures controlled storage ownership.
   * @param owner Platform call recorder.
   * @remarks Initializes this fixture storage.
   */
  constructor(owner: FakeHost) { this.owner = owner; }
  /** Opens or creates one controlled cache.
   * @param name Cache key.
   * @returns Controlled cache.
   * @throws Error for an injected cache-open failure.
   * @remarks Records and creates only this fixture cache.
   */
  async open(name: string): Promise<FakeCache> {
    this.owner.calls.push(`open:${name}`); if (this.owner.failOpen === name) throw new Error('injected cache open failure');
    let value = this.entries.get(name); if (!value) { value = new FakeCache(this.owner, name); this.entries.set(name, value); } return value;
  }
  /** Lists controlled origin caches.
   * @returns Cache keys from multiple simulated applications.
   * @throws Error for an injected enumeration failure.
   * @remarks Records the fixture-native enumeration.
   */
  async keys(): Promise<string[]> { this.owner.calls.push('cache-keys'); if (this.owner.failKeys) throw new Error('injected cache enumeration failure'); return [...this.entries.keys()]; }
  /** Deletes one controlled cache.
   * @param name Exact cache key.
   * @returns Whether the cache existed.
   * @throws Error for an injected cleanup failure.
   * @remarks Deletes only the named fixture cache and records its key.
   */
  async delete(name: string): Promise<boolean> {
    this.owner.calls.push(`delete:${name}`); if (this.owner.failDelete) throw new Error('injected cleanup failure'); return this.entries.delete(name);
  }
}
class FakeHost implements ShellHost {
  origin = origin; caches = new FakeCacheStorage(this); clientVersions = new Map<string, string>();
  calls: string[] = []; fetched: Array<{ url: string; method: string; cache: string }> = []; skipCount = 0;
  clientQueries: ClientQuery[] = [];
  live: ClientFixture[] = []; online = true; failFetch = ''; failOpen = ''; failPut = ''; failMatch = ''; failKeys = false; failDelete = false; failClients = false;
  wrongIndexVersion = ''; badResponse = ''; status = 200; current = manifest;
  clients = {
    /** Lists real-client-shaped fixture records, including other repository tabs.
     * @param options Native client enumeration options; uncontrolled windows are excluded by default.
     * @returns Controlled live window clients.
     * @throws Error for an injected native-client enumeration failure.
     * @remarks Records the native boundary call.
     */
    matchAll: async (options: ClientQuery = {}): Promise<WorkerClient[]> => {
      this.calls.push('clients-matchAll'); this.clientQueries.push(structuredClone(options));
      if (this.failClients) throw new Error('injected client enumeration failure');
      const result: WorkerClient[] = [];
      for (const client of this.live) if ((!options.type || options.type === 'all' || options.type === client.type)
        && (options.includeUncontrolled || client.controlled)) result.push(client);
      return result;
    },
    /** Looks up a native message source without accepting a forged URL from its payload.
     * @param id Native source client ID.
     * @returns Matching controlled client or undefined.
     * @remarks Records the native lookup.
     */
    get: async (id: string): Promise<WorkerClient | undefined> => { this.calls.push(`client-get:${id}`); for (const client of this.live) if (client.id === id) return client; return undefined; },
  };
  /** Models raw network responses and failures without adding shell/data policy.
   * @param input Native request/string/URL.
   * @param init Native request options.
   * @returns Controlled network response.
   * @throws Error for disconnection or injected retrieval failure.
   * @remarks Records network requests/cache modes only; does not mutate fixture caches.
   */
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = urlKey(input); const request = input instanceof Request ? input : new Request(url);
    this.fetched.push({ url, method: init?.method ?? request.method, cache: init?.cache ?? request.cache });
    if (!this.online || url === this.failFetch) throw new Error('injected network failure');
    const data = new URL(url).pathname.includes('/data/'); const content = data ? `fresh-network:${url}` : body(url, this.wrongIndexVersion || this.current.version);
    return response(this.badResponse === 'off-base' ? `${origin}/other/asset.js` : url, content, this.status,
      this.badResponse === 'off-base', this.badResponse === 'opaque' ? 'opaque' : 'basic');
  }
  /** Records deliberate native activation requests only.
   * @remarks Increments the controlled skipWaiting count.
   */
  async skipWaiting(): Promise<void> { this.skipCount++; }
  /** Seeds accepted fixture cache bytes independently of production install behavior.
   * @param shell Accepted shell descriptor.
   * @param missing Optional deliberately absent asset.
   * @returns Controlled stored cache.
   * @remarks Creates fixture storage directly without executing the worker under test.
   */
  seed(shell: ShellManifest, missing?: string): FakeCache {
    const cache = new FakeCache(this, cacheKey(shell)); for (const asset of shell.assets) if (asset !== missing) cache.entries.set(urlKey(asset), response(asset, body(asset, shell.version)));
    this.caches.entries.set(cache.name, cache); return cache;
  }
  /** Adds one controlled native client.
   * @param id Native client ID.
   * @param url Current native document URL.
   * @param controlled Whether this window is controlled by the enumerating worker.
   * @returns Controlled client with an observable postMessage channel.
   * @remarks Appends to this fixture's live clients.
   */
  client(id = 'reader', url = `${origin}${base}`, controlled = true): ClientFixture {
    const value: ClientFixture = { id, url, type: 'window', messages: [], controlled,
      /** Records an actual source-directed response.
       * @param message Native posted response.
       * @remarks Appends to this controlled client's messages.
       */
      postMessage(message: unknown): void { this.messages.push(message); } };
    this.live.push(value); return value;
  }
}
/** Constructs a complete compatible older shell fixture with a different hashed asset.
 * @returns Old shell descriptor.
 */
function older(): ShellManifest { return { ...manifest, version: oldVersion, assets: [...manifest.assets, `${base}assets/reader-OLDHASH8.js`] }; }
/** Describes exact readiness without inferring transcript saving.
 * @param shell Requested compatible shell.
 * @param ready Expected confirmed cache state.
 * @returns Public status protocol response.
 */
function status(shell: ShellManifest, ready: boolean) { return { type: 'SHELL_STATUS', base: shell.base, version: shell.version, ready }; }
/** Counts observable cache mutation/lookup operations.
 * @param value Recorded operation.
 * @returns Whether it touches native cache storage.
 */
function isCacheCall(value: string): boolean { return /^(open:|match:|put:|delete:|cache-keys)/.test(value); }

test('W001 installation saves every required shell asset and confirms matching complete readiness',
  /** Verifies installation against independent Cache Storage contents.
   * @returns Resolves after all expected cached bodies and status are checked.
   */
  async function fullInstall() {
    const host = new FakeHost(); expect(await installShell(manifest, host)).toEqual(status(manifest, true));
    const cache = host.caches.entries.get(cacheKey(manifest)); expect(cache).toBeDefined();
    for (const asset of manifest.assets) expect(await cache!.match(asset)).toBeInstanceOf(Response);
    expect(host.fetched).toHaveLength(manifest.assets.length); expect(host.skipCount).toBe(0);
  });
for (const failure of ['fetch', '404', 'open', 'put', 'off-base', 'opaque', 'mixed-index']) test(`W002 failed new install ${failure} preserves older confirmed compatible shell`,
  /** Verifies rejected new caching never destroys accepted old shell readiness.
   * @returns Resolves after expected failure and old-readiness checks.
   */
  async function installationFailure() {
    const host = new FakeHost(); const old = older(); host.seed(old);
    if (failure === 'fetch') host.failFetch = `${origin}${manifest.assets[2]}`;
    if (failure === '404') host.status = 404; if (failure === 'open') host.failOpen = cacheKey(manifest);
    if (failure === 'put') host.failPut = `${origin}${manifest.assets[2]}`;
    if (failure === 'off-base' || failure === 'opaque') host.badResponse = failure;
    if (failure === 'mixed-index') host.wrongIndexVersion = oldVersion;
    await expect(installShell(manifest, host)).rejects.toThrow();
    expect(await shellStatus(old, host)).toEqual(status(old, true)); expect(host.caches.entries.has(cacheKey(old))).toBe(true); expect(host.skipCount).toBe(0);
  });
for (const missing of manifest.assets) test(`W003 readiness rejects absent required ${missing}`,
  /** Verifies keys/cache existence alone cannot establish complete shell availability.
   * @returns Resolves after false readiness is observed.
   */
  async function missingRequiredAsset() { const host = new FakeHost(); host.seed(manifest, missing); expect(await shellStatus(manifest, host)).toEqual(status(manifest, false)); });
test('W004 readiness is exact to base/version and rejects mixed index stamp',
  /** Verifies another version or repository cache cannot become current readiness.
   * @returns Resolves after incompatible cache checks.
   */
  async function incompatibleCache() {
    const host = new FakeHost(); host.seed(older()); expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
    const cache = host.seed(manifest); cache.entries.set(urlKey(base), response(base, body(base, oldVersion)));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
  });
for (const failure of ['open', 'match']) test(`W005 cache ${failure} failure produces unconfirmed status without invalidating older cache`,
  /** Verifies unknown new readiness cannot silently become true or erase a prior compatible shell.
   * @returns Resolves after current-false/old-true checks.
   */
  async function readinessFailure() {
    const host = new FakeHost(); const old = older(); host.seed(manifest); host.seed(old);
    if (failure === 'open') host.failOpen = cacheKey(manifest); if (failure === 'match') host.failMatch = cacheKey(manifest);
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
    expect(await shellStatus(old, host)).toEqual(status(old, true));
  });
test('W006 readiness rejects cached unsuccessful/opaque shell responses',
  /** Verifies cached error objects cannot count as required usable assets.
   * @returns Resolves after controlled invalid cached response checks.
   */
  async function cachedFailures() {
    const host = new FakeHost(); const cache = host.seed(manifest); cache.entries.set(urlKey(manifest.assets[3]), response(manifest.assets[3], 'error', 503));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false)); cache.entries.set(urlKey(manifest.assets[3]), response(manifest.assets[3], 'opaque', 200, false, 'opaque'));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
  });
for (const invalid of ['base', 'version', 'duplicate', 'data', 'foreign', 'escape']) test(`W007 invalid shell manifest ${invalid} cannot install/cache data or another base`,
  /** Verifies malformed generated inputs fail before cache/network writes.
   * @returns Resolves after rejected installation.
   */
  async function invalidManifest() {
    const shell = structuredClone(manifest); const host = new FakeHost();
    if (invalid === 'base') shell.base = '/app/../other/'; if (invalid === 'version') shell.version = 'unknown';
    if (invalid === 'duplicate') shell.assets.push(shell.assets[0]); if (invalid === 'data') shell.assets.push(`${base}data/catalogue.json.gz`);
    if (invalid === 'foreign') shell.assets.push('/other/index.html'); if (invalid === 'escape') shell.assets.push(`${base}../other/asset.js`);
    await expect(installShell(shell, host)).rejects.toThrow(); expect(host.fetched).toHaveLength(0);
  });

for (const path of ['data/catalogue.json.gz', `data/sittings/1.json.gz?v=${'c'.repeat(64)}`]) test(`W010 data ${path} is fresh network-only despite a seeded stale shell entry`,
  /** Verifies cached fetched shards/catalogues cannot imply saved-pair/offline availability.
   * @returns Resolves after raw network response/cache bypass assertions.
   */
  async function dataNetworkOnly() {
    const host = new FakeHost(); const cache = host.seed(manifest); const url = `${origin}${base}${path}`; cache.entries.set(url, response(url, 'stale cached data fixture')); host.calls = [];
    const result = await fetchShell(new Request(url), manifest, host); expect(result).toBeInstanceOf(Response); expect(await result.text()).toBe(`fresh-network:${url}`);
    expect(host.fetched).toEqual([{ url, method: 'GET', cache: 'no-store' }]); expect(host.calls.filter(isCacheCall)).toHaveLength(0);
    expect(await cache.entries.get(url)!.clone().text()).toBe('stale cached data fixture');
  });
test('W011 disconnected data never falls back to any stale cached shard or shell HTML',
  /** Verifies unsaved data failures remain connection failures.
   * @returns Resolves after rejected network-only retrieval.
   */
  async function offlineData() {
    const host = new FakeHost(); const url = `${origin}${base}data/sittings/1.json.gz?v=${'c'.repeat(64)}`;
    const cache = host.seed(manifest); cache.entries.set(url, response(url, 'cached raw data is not an explicitly saved pair')); host.online = false;
    await expect(fetchShell(new Request(url), manifest, host)).rejects.toThrow(); expect(host.calls.filter(isCacheCall)).toHaveLength(0);
  });
test('W012 network data errors remain raw failures rather than empty transcript success',
  /** Verifies the worker does not reinterpret data HTTP errors or fetch source content offline.
   * @returns Resolves after native response status/body checks.
   */
  async function dataHttpFailure() {
    const host = new FakeHost(); host.status = 503; const result = await fetchShell(new Request(`${origin}${base}data/catalogue.json.gz`), manifest, host);
    expect(result).toBeInstanceOf(Response); expect(result.status).toBe(503); expect(host.calls.filter(isCacheCall)).toHaveLength(0);
  });
for (const path of ['', 'index.html', 'help.html', 'assets/reader-A1B2C3D4.js', 'assets/reader-A1B2C3D4.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']) test(`W013 installed shell ${path || 'start URL'} reopens offline from its repository cache`,
  /** Verifies the readable shell resource response exists without a network connection.
   * @returns Resolves after exact cached body checks.
   */
  async function offlineShell() {
    const host = new FakeHost(); host.seed(manifest); host.online = false; const url = `${origin}${base}${path}`;
    const result = await fetchShell(new Request(url), manifest, host); expect(result).toBeInstanceOf(Response); expect(await result.text()).toBe(body(url, currentVersion)); expect(host.fetched).toHaveLength(0);
  });
test('W014 another reading client retains its exact older hashed asset after application',
  /** Verifies a newly active worker can serve an old client's installed JS without substitution.
   * @returns Resolves after old/current asset responses are compared.
   */
  async function retainedOldAsset() {
    const host = new FakeHost(); const old = older(); host.seed(manifest); host.seed(old); host.online = false;
    host.client('old-reader'); host.clientVersions.set('old-reader', oldVersion);
    const url = `${origin}${base}assets/reader-OLDHASH8.js`;
    const result = await fetchShell(new Request(url), manifest, host); expect(result).toBeInstanceOf(Response); expect(await result.text()).toBe(body(url, oldVersion)); expect(host.fetched).toHaveLength(0);
  });
for (const [url, method] of [[`${origin}/other/index.html`, 'GET'], ['https://outside.test/app.js', 'GET'], [`${origin}${base}assets/reader-A1B2C3D4.js`, 'POST'], [`${origin}${base}unknown.png`, 'GET']] as const) test(`W015 nonowned/unknown/nonGET ${method} ${url} stays network-only`,
  /** Verifies unrelated requests cannot use or poison this app's shell cache.
   * @returns Resolves after bypass behavior checks.
   */
  async function unrelatedNetwork() {
    const host = new FakeHost(); host.seed(manifest); host.calls = []; const result = await fetchShell(new Request(url, { method }), manifest, host);
    expect(result).toBeInstanceOf(Response); expect(host.fetched).toHaveLength(1); expect(host.fetched[0].url).toBe(url); expect(host.fetched[0].method).toBe(method);
    if (url.endsWith('/unknown.png')) for (const call of host.calls) expect(call.startsWith('put:') || call.startsWith('delete:')).toBe(false);
    else expect(host.calls.filter(isCacheCall)).toHaveLength(0);
  });
test('W016 missing/evicted cache leaves online shell reading usable',
  /** Verifies cache read failure uses the network without claiming saved readiness.
   * @returns Resolves after successful online response and readiness-false checks.
   */
  async function cacheFailureOnline() {
    const host = new FakeHost(); host.failOpen = cacheKey(manifest); const url = `${origin}${base}assets/reader-A1B2C3D4.js`;
    const result = await fetchShell(new Request(url), manifest, host); expect(result).toBeInstanceOf(Response); expect(await result.text()).toBe(body(url, currentVersion));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
  });

for (const clientState of ['none', 'current', 'foreign', 'closed-old']) test(`W020 safe activation cleans only obsolete owned caches with ${clientState} clients`,
  /** Verifies cache ownership, complete-current readiness and safe obsolete cleanup.
   * @returns Resolves after exact protected cache keys are checked.
   */
  async function safeCleanup() {
    const host = new FakeHost(); host.seed(manifest); const old = older(); host.seed(old);
    const other = { ...old, base: '/other/', version: 'd'.repeat(64) }; host.seed(other); host.caches.entries.set('unrelated-cache', new FakeCache(host, 'unrelated-cache'));
    const malformed = `hansard-shell:${encodeURIComponent(base)}:not-a-version`; host.caches.entries.set(malformed, new FakeCache(host, malformed));
    if (clientState === 'current') { host.client(); host.clientVersions.set('reader', currentVersion); }
    if (clientState === 'foreign') host.client('foreign', `${origin}/other/`);
    if (clientState === 'closed-old') host.clientVersions.set('closed-reader', oldVersion);
    expect(await activateShell(manifest, host)).toEqual(status(manifest, true));
    expect(host.caches.entries.has(cacheKey(old))).toBe(false); expect(host.caches.entries.has(cacheKey(manifest))).toBe(true);
    expect(host.caches.entries.has(cacheKey(other))).toBe(true); expect(host.caches.entries.has('unrelated-cache')).toBe(true); expect(host.caches.entries.has(malformed)).toBe(true); expect(host.skipCount).toBe(0);
  });
for (const state of ['unknown', 'older', 'mixed', 'client-enumeration-failure', 'cache-enumeration-failure']) test(`W021 activation conservatively retains old shell with ${state} live clients`,
  /** Verifies unknown/older clients cannot lose installed assets on another tab's Apply.
   * @returns Resolves after preserved caches/current readiness checks.
   */
  async function unsafeCleanupPreserved() {
    const host = new FakeHost(); host.seed(manifest); host.seed(older()); host.client('reader');
    if (state === 'older') host.clientVersions.set('reader', oldVersion);
    if (state === 'mixed') { host.clientVersions.set('reader', currentVersion); host.client('another-reader'); }
    if (state === 'client-enumeration-failure') host.failClients = true;
    if (state === 'cache-enumeration-failure') { host.clientVersions.set('reader', currentVersion); host.failKeys = true; }
    expect(await activateShell(manifest, host)).toEqual(status(manifest, true)); expect(host.caches.entries.has(cacheKey(older()))).toBe(true);
    for (const call of host.calls) expect(call.startsWith('delete:')).toBe(false); expect(host.skipCount).toBe(0);
  });
test('W022 incomplete current cache cannot erase previous compatible caches during activation',
  /** Verifies cleanup requires confirmed complete current readiness.
   * @returns Resolves after current-false/old-true checks.
   */
  async function incompleteActivation() {
    const host = new FakeHost(); host.seed(manifest, manifest.assets[2]); host.seed(older());
    expect(await activateShell(manifest, host)).toEqual(status(manifest, false)); expect(await shellStatus(older(), host)).toEqual(status(older(), true));
  });
for (const cleanupFails of [false, true]) test(`W023 cleanup failure=${cleanupFails} never migrates IndexedDB`,
  /** Verifies successful or failed cache cleanup cannot destructively migrate saved results.
   * @returns Resolves after cache failure and no-IDB-side-effect checks.
   * @remarks Temporarily installs guarded global IndexedDB methods solely for this test.
   */
  async function cleanupFailure() {
    const deleted = vi.fn(); const opened = vi.fn(); vi.stubGlobal('indexedDB', { deleteDatabase: deleted, open: opened });
    try {
      const host = new FakeHost(); host.seed(manifest); host.seed(older()); host.failDelete = cleanupFails;
      expect(await activateShell(manifest, host)).toEqual(status(manifest, true)); expect(host.caches.entries.has(cacheKey(older()))).toBe(cleanupFails);
      if (cleanupFails) expect(await shellStatus(older(), host)).toEqual(status(older(), true));
      expect(deleted).not.toHaveBeenCalled(); expect(opened).not.toHaveBeenCalled(); expect(host.skipCount).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });

test('W030 only explicit matching Apply from an actual own client requests native skipWaiting',
  /** Verifies explicit action and exact base/version acknowledgement, without invented scriptURL phase detection.
   * @returns Resolves after deliberate activation acknowledgement.
   */
  async function explicitApply() {
    const host = new FakeHost(); host.seed(manifest); host.client();
    expect(await handleShellMessage({ type: 'APPLY_UPDATE', base, version: currentVersion }, 'reader', manifest, host))
      .toEqual({ type: 'APPLY_ACCEPTED', base, version: currentVersion }); expect(host.skipCount).toBe(1);
  });
for (const data of [null, 'APPLY_UPDATE', {}, { type: 'CONTINUE', base, version: currentVersion },
  { type: 'APPLY_UPDATE', base: '/other/', version: currentVersion }, { type: 'APPLY_UPDATE', base, version: oldVersion },
  { type: 'APPLY_UPDATE', base }, { type: 'SKIP_WAITING' }]) test(`W031 invalid/Continue message ${JSON.stringify(data)} cannot request activation`,
  /** Verifies malformed/off-base/wrong-version/nonconsent messages are ignored without side effects.
   * @returns Resolves after ignored-message and zero-skip assertions.
   */
  async function invalidApply() {
    const host = new FakeHost(); host.seed(manifest); host.client(); expect(await handleShellMessage(data, 'reader', manifest, host)).toBeNull(); expect(host.skipCount).toBe(0);
  });
for (const clientUrl of [`${origin}/other/`, 'https://foreign.test/vote-better-malaysia/', `${origin}/vote-better-malaysia-lookalike/`]) test(`W032 native message source ${clientUrl} cannot apply this repository worker`,
  /** Verifies message payload URL/identity cannot replace actual native source ownership.
   * @returns Resolves after off-base source rejection.
   */
  async function untrustedSource() {
    const host = new FakeHost(); host.client('reader', clientUrl); expect(await handleShellMessage({ type: 'APPLY_UPDATE', base, version: currentVersion }, 'reader', manifest, host)).toBeNull(); expect(host.skipCount).toBe(0);
  });
test('W033 nonexistent native message source cannot activate or confirm readiness',
  /** Verifies a supplied identifier alone is not accepted native-client proof.
   * @returns Resolves after missing-source rejection.
   */
  async function absentClient() {
    const host = new FakeHost(); expect(await handleShellMessage({ type: 'APPLY_UPDATE', base, version: currentVersion }, 'missing', manifest, host)).toBeNull(); expect(host.skipCount).toBe(0);
  });
test('W034 status query confirms only the exact matching current complete shell',
  /** Verifies the public readiness protocol checks native required assets.
   * @returns Resolves after ready/current-version assertions.
   */
  async function statusMessage() {
    const host = new FakeHost(); host.seed(manifest); host.client();
    expect(await handleShellMessage({ type: 'SHELL_STATUS', base, version: currentVersion }, 'reader', manifest, host)).toEqual(status(manifest, true));
  });
test('W035 client-version handshake uses actual native source and controls conservative cleanup',
  /** Verifies the originating app stamp is remembered without activating/reloading other clients.
   * @returns Resolves after exact client-version acknowledgement and map assertions.
   */
  async function clientVersionHandshake() {
    const host = new FakeHost(); host.client('older-tab'); host.client('another-tab');
    expect(await handleShellMessage({ type: 'CLIENT_VERSION', base, version: oldVersion }, 'older-tab', manifest, host))
      .toEqual({ type: 'CLIENT_VERSION', base, version: oldVersion, accepted: true });
    await handleShellMessage({ type: 'CLIENT_VERSION', base, version: oldVersion, clientId: 'another-tab' }, 'older-tab', manifest, host);
    expect(host.clientVersions.get('older-tab')).toBe(oldVersion); expect(host.clientVersions.has('another-tab')).toBe(false); expect(host.skipCount).toBe(0);
  });
for (const version of ['', 'bad', 'A'.repeat(64)]) test(`W036 invalid client stamp ${version} cannot authorize cleanup`,
  /** Verifies only exact compatible shell identifiers enter native-client tracking.
   * @returns Resolves after invalid handshake rejection.
   */
  async function badClientVersion() {
    const host = new FakeHost(); host.client(); expect(await handleShellMessage({ type: 'CLIENT_VERSION', base, version }, 'reader', manifest, host)).toBeNull(); expect(host.clientVersions.size).toBe(0);
  });
for (const ready of [true, false]) test(`W050 no-version status discovery identifies this actual worker without activating (ready=${ready})`,
  /** Verifies the old app can discover a waiting worker's own version without trusting its stable URL.
   * @returns Resolves after own-version/readiness and zero-activation assertions.
   */
  async function discoverVersion() {
    const host = new FakeHost(); host.client(); host.clientVersions.set('reader', oldVersion);
    host.seed(manifest, ready ? undefined : manifest.assets[2]);
    expect(await handleShellMessage({ type: 'SHELL_STATUS', base }, 'reader', manifest, host)).toEqual(status(manifest, ready));
    expect(host.skipCount).toBe(0); expect(host.clientVersions.get('reader')).toBe(oldVersion);
  });
for (const problem of ['base', 'foreign-source', 'missing-source', 'exact-version-mismatch']) test(`W051 status discovery/query rejects ${problem}`, 
  /** Verifies nonactivating discovery retains native source/base and exact-query boundaries.
   * @returns Resolves after ignored invalid query and zero-activation assertions.
   */
  async function rejectedDiscovery() {
    const host = new FakeHost(); host.seed(manifest);
    if (problem !== 'missing-source') host.client('reader', problem === 'foreign-source' ? `${origin}/other/` : `${origin}${base}`);
    const query: { type: string; base: string; version?: string } = { type: 'SHELL_STATUS', base: problem === 'base' ? '/other/' : base };
    if (problem === 'exact-version-mismatch') query.version = oldVersion;
    expect(await handleShellMessage(query, 'reader', manifest, host)).toBeNull(); expect(host.skipCount).toBe(0);
  });

class EventScope implements WorkerEventScope {
  handlers = new Map<string, (event: any) => void>();
  /** Records real-event-shaped lifecycle registration.
   * @param type Native event name.
   * @param listener Native listener.
   * @remarks Stores the controlled event listener without firing it automatically.
   */
  addEventListener(type: string, listener: (event: any) => void): void { this.handlers.set(type, listener); }
}
class Lifetime {
  promises: Promise<unknown>[] = []; response: Promise<Response> | undefined; request: Request; source: ClientFixture; data: unknown;
  /** Captures controlled native event fields.
   * @param request Native request.
   * @param source Actual known source client fixture.
   * @param data Untrusted message content.
   * @remarks Initializes this fixture event.
   */
  constructor(request: Request, source: ClientFixture, data: unknown = null) { this.request = request; this.source = source; this.data = data; }
  /** Captures native extended event lifetime promises.
   * @param promise Native lifecycle work.
   * @remarks Retains the lifetime promise for controlled settlement assertions.
   */
  waitUntil(promise: Promise<unknown>): void { this.promises.push(promise); }
  /** Captures the actual native response promise.
   * @param response Native response or response promise.
   * @remarks Retains the response for controlled fetch event assertions.
   */
  respondWith(response: Response | Promise<Response>): void { this.response = Promise.resolve(response); }
}
/** Dispatches a controlled native event only after verifying the required listener exists.
 * @param scope Controlled native worker target.
 * @param type Actual lifecycle event name.
 * @param event Controlled native event fields/lifetime.
 * @remarks Calls the registered listener; assertions expose missing native registration as behavior RED.
 */
function dispatch(scope: EventScope, type: string, event: Lifetime): void { const listener = scope.handlers.get(type); expect(listener).toBeTypeOf('function'); listener?.(event); }

test('W040 binds native install/activate/fetch/message lifecycles without automatic activation',
  /** Verifies actual required listener registration before browser-native proof in T048.
   * @returns Nothing.
   */
  function nativeBinding() {
    const host = new FakeHost(); const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    expect([...scope.handlers.keys()].sort()).toEqual(['activate', 'fetch', 'install', 'message']); expect(host.skipCount).toBe(0);
  });
test('W041 native install extends lifetime through complete cache population and remains waiting',
  /** Verifies native waitUntil is connected to the required install result.
   * @returns Resolves after controlled lifecycle settlement.
   */
  async function nativeInstall() {
    const host = new FakeHost(); const scope = new EventScope(); const event = new Lifetime(new Request(`${origin}${base}`), host.client());
    bindWorkerEvents(scope, manifest, host); dispatch(scope, 'install', event); expect(event.promises).toHaveLength(1); await Promise.all(event.promises);
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, true)); expect(host.skipCount).toBe(0);
  });
test('W042 native install rejects its lifetime on cache saving failure without destroying old readiness',
  /** Verifies required caching failure reaches the platform install lifecycle.
   * @returns Resolves after rejected lifetime and accepted-old cache checks.
   */
  async function nativeInstallFailure() {
    const host = new FakeHost(); host.seed(older()); host.failPut = `${origin}${manifest.assets[2]}`;
    const scope = new EventScope(); const event = new Lifetime(new Request(`${origin}${base}`), host.client());
    bindWorkerEvents(scope, manifest, host); dispatch(scope, 'install', event); expect(event.promises).toHaveLength(1);
    await expect(Promise.all(event.promises)).rejects.toThrow(); expect(await shellStatus(older(), host)).toEqual(status(older(), true)); expect(host.skipCount).toBe(0);
  });
test('W043 native fetch responds with fresh data and never reads a shell cache for it',
  /** Verifies respondWith observes the raw network-only resource result.
   * @returns Resolves after controlled native fetch settlement.
   */
  async function nativeDataFetch() {
    const host = new FakeHost(); const scope = new EventScope(); const url = `${origin}${base}data/catalogue.json.gz`;
    const event = new Lifetime(new Request(url), host.client()); bindWorkerEvents(scope, manifest, host); dispatch(scope, 'fetch', event);
    expect(event.response).toBeDefined(); const result = await event.response!; expect(await result.text()).toBe(`fresh-network:${url}`); expect(host.calls.filter(isCacheCall)).toHaveLength(0);
  });
test('W044 native status messages extend lifetime and reply only to the verified source tab',
  /** Verifies public readiness messages reach their actual caller without broadcasting/reloading.
   * @returns Resolves after controlled native message settlement.
   */
  async function nativeStatusMessage() {
    const host = new FakeHost(); host.seed(manifest); const source = host.client(); const other = host.client('other-reader'); const scope = new EventScope();
    const event = new Lifetime(new Request(`${origin}${base}`), source, { type: 'SHELL_STATUS', base, version: currentVersion });
    bindWorkerEvents(scope, manifest, host); dispatch(scope, 'message', event); expect(event.promises).toHaveLength(1); await Promise.all(event.promises);
    expect(source.messages).toEqual([status(manifest, true)]); expect(other.messages).toHaveLength(0); expect(host.skipCount).toBe(0);
  });
test('W045 native activation waits for safe cleanup and never claims/reloads/migrates clients',
  /** Verifies native activation lifetime only cleans obsolete owned caches after complete current confirmation.
   * @returns Resolves after controlled activation settlement.
   */
  async function nativeActivation() {
    const host = new FakeHost(); host.seed(manifest); host.seed(older()); const source = host.client(); host.clientVersions.set('reader', currentVersion);
    const scope = new EventScope(); const event = new Lifetime(new Request(`${origin}${base}`), source); bindWorkerEvents(scope, manifest, host); dispatch(scope, 'activate', event);
    expect(event.promises).toHaveLength(1); await Promise.all(event.promises); expect(host.caches.entries.has(cacheKey(older()))).toBe(false);
    expect(source.messages).toHaveLength(0); expect(host.skipCount).toBe(0);
  });

/** Creates fresh worker memory while preserving independently seeded native-boundary caches and windows.
 * @param previous Platform fixture before simulated worker termination.
 * @returns A new host with the same stored bytes/windows and no remembered client versions.
 * @remarks Copies controlled persistent cache entries and retains fixture client objects; runs no install policy.
 */
function restarted(previous: FakeHost): FakeHost {
  const host = new FakeHost(); host.live = previous.live;
  for (const [name, stored] of previous.caches.entries) {
    const cache = new FakeCache(host, name);
    for (const [url, value] of stored.entries) cache.entries.set(url, clone(value));
    host.caches.entries.set(name, cache);
  }
  return host;
}

test('WREV001 install cache population and requests are reachable independently of its returned status',
  /** Checks actual stored resources and network requests without an earlier readiness assertion guard.
   * @returns Resolves after every required resource's independent observable checks.
   */
  async function observableInstall() {
    const host = new FakeHost(); await installShell(manifest, host);
    const cache = host.caches.entries.get(cacheKey(manifest)); expect.soft(cache).toBeDefined();
    for (const asset of manifest.assets) expect.soft(cache?.entries.get(urlKey(asset))).toBeInstanceOf(Response);
    const urls: string[] = []; for (const request of host.fetched) urls.push(request.url);
    expect.soft(urls.sort()).toEqual(manifest.assets.map(
      /** Resolves independently specified required network URLs.
       * @param asset Base-scoped required resource.
       * @returns Absolute request URL.
       */
      function absolute(asset): string { return `${origin}${asset}`; }).sort());
    expect(host.skipCount).toBe(0);
  });
test('WREV002 safe cleanup deletes the obsolete cache without an earlier status assertion guard',
  /** Checks the required positive cache deletion independently of the returned acknowledgement.
   * @returns Resolves after exact cache ownership and positive deletion checks.
   */
  async function observableCleanup() {
    const host = new FakeHost(); host.seed(manifest); host.seed(older());
    const foreign = { ...older(), base: '/other/' }; host.seed(foreign);
    await activateShell(manifest, host);
    expect.soft(host.caches.entries.has(cacheKey(older()))).toBe(false);
    expect.soft(host.calls).toContain(`delete:${cacheKey(older())}`);
    expect(host.caches.entries.has(cacheKey(manifest))).toBe(true); expect(host.caches.entries.has(cacheKey(foreign))).toBe(true);
  });
test('WREV003 exact Apply invokes native skipWaiting without an acknowledgement assertion guard',
  /** Checks the deliberate positive platform effect rather than only its response shape.
   * @returns Resolves after the actual activation-request count check.
   */
  async function observableApply() {
    const host = new FakeHost(); host.client(); host.seed(manifest);
    await handleShellMessage({ type: 'APPLY_UPDATE', base, version: currentVersion }, 'reader', manifest, host);
    expect(host.skipCount).toBe(1);
  });
test('WREV004 client handshake changes only the actual source map entry without an acknowledgement guard',
  /** Checks exact source tracking and ignores a different client ID claimed by the payload.
   * @returns Resolves after positive map mutation and protected-other-client checks.
   */
  async function observableHandshake() {
    const host = new FakeHost(); host.client('old-reader'); host.client('other-reader');
    await handleShellMessage({ type: 'CLIENT_VERSION', base, version: oldVersion, clientId: 'other-reader' }, 'old-reader', manifest, host);
    expect.soft(host.clientVersions.get('old-reader')).toBe(oldVersion); expect(host.clientVersions.has('other-reader')).toBe(false);
  });
test('WREV005 an independently seeded mixed current entry stamp cannot confirm readiness',
  /** Reaches the mixed-version rejection without the previous missing-cache precondition assertion.
   * @returns Resolves after independently mismatched cached-entry checks.
   */
  async function mixedStamp() {
    const host = new FakeHost(); const cache = host.seed(manifest);
    cache.entries.set(urlKey(base), response(base, body(base, oldVersion)));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
  });
test('WREV006 an independently seeded opaque required response cannot confirm readiness',
  /** Reaches opaque-response rejection without first rejecting a different HTTP error.
   * @returns Resolves after independently opaque cached-response checks.
   */
  async function opaqueCache() {
    const host = new FakeHost(); const cache = host.seed(manifest);
    cache.entries.set(urlKey(manifest.assets[3]), response(manifest.assets[3], 'opaque', 200, false, 'opaque'));
    expect(await shellStatus(manifest, host)).toEqual(status(manifest, false));
  });
test('WREV007 native-boundary client enumeration hides uncontrolled windows unless explicitly requested',
  /** Verifies the fixture models native defaults; this already-passing fixture control is not feature RED.
   * @returns Resolves after default/explicit enumeration comparisons.
   */
  async function enumerationControl() {
    const host = new FakeHost(); const controlled = host.client('controlled'); const uncontrolled = host.client('uncontrolled', `${origin}${base}`, false);
    expect(await host.clients.matchAll()).toEqual([controlled]);
    expect(await host.clients.matchAll({ includeUncontrolled: true, type: 'window' })).toEqual([controlled, uncontrolled]);
  });
for (const stamp of ['unknown', 'older']) test(`WREV008 cleanup explicitly includes an uncontrolled own ${stamp} window`,
  /** Checks the native enumeration request directly and preserves an uncontrolled reader's installed cache.
   * @returns Resolves after explicit-query and conservative-cache checks.
   */
  async function uncontrolledReader() {
    const host = new FakeHost(); host.seed(manifest); host.seed(older()); host.client('uncontrolled', `${origin}${base}`, false);
    if (stamp === 'older') host.clientVersions.set('uncontrolled', oldVersion);
    await activateShell(manifest, host);
    expect.soft(host.clientQueries).toContainEqual({ includeUncontrolled: true, type: 'window' });
    expect(host.caches.entries.has(cacheKey(older()))).toBe(true);
  });
test('WREV009 restarted worker discovers readiness from persistent bytes without another install or activation',
  /** Checks discovery after fresh worker memory replaces the old client's remembered version state.
   * @returns Resolves after source-directed native-event reply and persistent-cache checks.
   */
  async function restartedDiscovery() {
    const previous = new FakeHost(); previous.seed(manifest); previous.seed(older()); const source = previous.client(); previous.clientVersions.set('reader', oldVersion);
    const host = restarted(previous); expect(host.clientVersions.size).toBe(0);
    const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const event = new Lifetime(new Request(`${origin}${base}`), source, { type: 'SHELL_STATUS', base });
    scope.handlers.get('message')?.(event); await Promise.all(event.promises);
    expect.soft(source.messages).toEqual([status(manifest, true)]); expect(host.fetched).toHaveLength(0);
    expect(host.caches.entries.has(cacheKey(older()))).toBe(true); expect(host.clientVersions.size).toBe(0);
  });
test('WREV010 restarted worker serves the exact old hashed asset with empty version tracking',
  /** Checks persistent exact URL bytes remain usable independently of the vanished in-memory client map.
   * @returns Resolves after native-response and byte-preservation checks.
   */
  async function restartedAsset() {
    const previous = new FakeHost(); previous.seed(manifest); previous.seed(older()); previous.client(); previous.clientVersions.set('reader', oldVersion);
    const host = restarted(previous); host.online = false; const url = `${origin}${base}assets/reader-OLDHASH8.js`;
    const result = await fetchShell(new Request(url), manifest, host);
    expect.soft(result).toBeInstanceOf(Response); expect.soft(result instanceof Response ? await result.text() : null).toBe(body(url, oldVersion));
    expect(host.clientVersions.size).toBe(0); expect(host.fetched).toHaveLength(0);
  });
test('WREV011 restart with unknown client memory conservatively preserves accepted old cache',
  /** Records an already-passing non-destructive control without relabeling it as RED.
   * @returns Resolves after unchanged persistent-cache and no-skip assertions.
   */
  async function restartedRetentionControl() {
    const previous = new FakeHost(); previous.seed(manifest); previous.seed(older()); previous.client(); previous.clientVersions.set('reader', currentVersion);
    const host = restarted(previous); await activateShell(manifest, host);
    expect(host.clientVersions.size).toBe(0); expect(host.caches.entries.has(cacheKey(older()))).toBe(true); expect(host.skipCount).toBe(0);
  });
for (const version of ['', null, 'bad', 'A'.repeat(64), 7, false]) test(`WREV012 explicit invalid status version ${JSON.stringify(version)} is never omitted-version discovery`,
  /** Checks presence versus valid value at the public nonactivating query boundary.
   * @returns Resolves after rejection and unchanged known source stamp checks.
   */
  async function invalidStatusVersion() {
    const host = new FakeHost(); host.client(); host.seed(manifest); host.clientVersions.set('reader', oldVersion);
    expect.soft(await handleShellMessage({ type: 'SHELL_STATUS', base, version }, 'reader', manifest, host)).toBeNull();
    expect(host.clientVersions.get('reader')).toBe(oldVersion); expect(host.skipCount).toBe(0);
  });
for (const source of ['missing', 'foreign', 'lookalike']) test(`WREV013 client-version query rejects ${source} native source`,
  /** Checks actual native source ownership before accepting a client stamp.
   * @returns Resolves after ignored handshake and untouched client map checks.
   */
  async function invalidHandshakeSource() {
    const host = new FakeHost();
    if (source !== 'missing') host.client('reader', source === 'foreign' ? 'https://outside.test/vote-better-malaysia/' : `${origin}/vote-better-malaysia-lookalike/`);
    expect.soft(await handleShellMessage({ type: 'CLIENT_VERSION', base, version: currentVersion }, 'reader', manifest, host)).toBeNull();
    expect(host.clientVersions.size).toBe(0); expect(host.skipCount).toBe(0);
  });
test('WREV014 native source reply is reachable independently of listener and lifetime assertion guards',
  /** Checks the required positive source reply directly; another reader must receive no broadcast.
   * @returns Resolves after controlled native lifetime settlement and reply checks.
   */
  async function observableNativeReply() {
    const host = new FakeHost(); host.seed(manifest); const source = host.client(); const other = host.client('other-reader'); const scope = new EventScope();
    bindWorkerEvents(scope, manifest, host);
    const event = new Lifetime(new Request(`${origin}${base}`), source, { type: 'SHELL_STATUS', base, version: currentVersion });
    scope.handlers.get('message')?.(event); await Promise.all(event.promises);
    expect.soft(event.promises).toHaveLength(1); expect.soft(source.messages).toEqual([status(manifest, true)]); expect(other.messages).toHaveLength(0);
  });
test('WREV015 native install lifetime independently reaches rejection on an injected cache-put failure',
  /** Checks lifecycle rejection without the earlier required-listener assertion preventing settlement checks.
   * @returns Resolves after the independent rejected-lifetime assertion and protected cache checks.
   */
  async function observableInstallRejection() {
    const host = new FakeHost(); host.seed(older()); host.failPut = `${origin}${manifest.assets[2]}`;
    const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const event = new Lifetime(new Request(`${origin}${base}`), host.client()); scope.handlers.get('install')?.(event);
    expect.soft(event.promises).toHaveLength(1); await expect.soft(Promise.all(event.promises)).rejects.toThrow();
    expect(host.caches.entries.has(cacheKey(older()))).toBe(true); expect(host.skipCount).toBe(0);
  });
for (const source of [null, {}, { id: 'missing-client' }]) test(`WREV016 native non-client source ${JSON.stringify(source)} cannot use a payload's real client ID`,
  /** Records no-action controls for untrusted native event shapes without inventing successful binding RED.
   * @returns Resolves after no reply, tracking or activation is observed.
   */
  async function invalidNativeSourceControl() {
    const host = new FakeHost(); const reader = host.client(); const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const event = { source, data: { type: 'APPLY_UPDATE', base, version: currentVersion, clientId: 'reader' }, promises: [] as Promise<unknown>[],
      /** Records event work without creating a fake native source.
       * @param promise Native message work supplied by the handler.
       * @remarks Retains only this controlled event's lifetime promise.
       */
      waitUntil(promise: Promise<unknown>): void { this.promises.push(promise); } };
    scope.handlers.get('message')?.(event); await Promise.all(event.promises);
    expect(reader.messages).toHaveLength(0); expect(host.clientVersions.size).toBe(0); expect(host.skipCount).toBe(0);
  });
test('WREV017 native fetch response and data body are reachable without a required-listener guard',
  /** Checks respondWith and its real Response-shaped result without dereferencing missing inert output.
   * @returns Resolves after independently reachable response/body and cache-bypass checks.
   */
  async function observableNativeFetch() {
    const host = new FakeHost(); const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const url = `${origin}${base}data/catalogue.json.gz`; const event = new Lifetime(new Request(url), host.client());
    scope.handlers.get('fetch')?.(event); const result = await event.response;
    expect.soft(event.response).toBeDefined(); expect.soft(result).toBeInstanceOf(Response);
    expect.soft(result instanceof Response ? await result.text() : null).toBe(`fresh-network:${url}`);
    expect(host.calls.filter(isCacheCall)).toHaveLength(0);
  });
test('WREV018 native successful install lifetime populates caches without earlier listener/status guards',
  /** Checks event lifetime and resulting stored bytes independently of an install acknowledgement.
   * @returns Resolves after controlled native event work settles and positive caching checks run.
   */
  async function observableNativeInstall() {
    const host = new FakeHost(); const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const event = new Lifetime(new Request(`${origin}${base}`), host.client()); scope.handlers.get('install')?.(event);
    await Promise.all(event.promises); expect.soft(event.promises).toHaveLength(1);
    const cache = host.caches.entries.get(cacheKey(manifest));
    for (const asset of manifest.assets) expect.soft(cache?.entries.get(urlKey(asset))).toBeInstanceOf(Response);
    expect(host.skipCount).toBe(0);
  });
test('WREV019 native safe activation lifetime deletes only obsolete own cache without earlier guards',
  /** Checks the actual positive lifecycle cleanup effect after native-boundary event settlement.
   * @returns Resolves after independent lifetime and obsolete-cache deletion assertions.
   */
  async function observableNativeActivation() {
    const host = new FakeHost(); host.seed(manifest); host.seed(older()); const source = host.client(); host.clientVersions.set('reader', currentVersion);
    const scope = new EventScope(); bindWorkerEvents(scope, manifest, host);
    const event = new Lifetime(new Request(`${origin}${base}`), source); scope.handlers.get('activate')?.(event);
    await Promise.all(event.promises); expect.soft(event.promises).toHaveLength(1);
    expect.soft(host.caches.entries.has(cacheKey(older()))).toBe(false);
    expect(host.caches.entries.has(cacheKey(manifest))).toBe(true); expect(source.messages).toHaveLength(0); expect(host.skipCount).toBe(0);
  });
for (const missing of manifest.assets) test(`WREV020 an omitted mandatory shell declaration ${missing} cannot produce a partial installed shell`,
  /** Checks malformed generated manifest rejection rather than trusting its incomplete required-resource claim.
   * @returns Resolves after direct rejection and no-fetch/no-cache controls.
   */
  async function omittedMandatoryDeclaration() {
    const shell = structuredClone(manifest); const position = shell.assets.indexOf(missing); shell.assets.splice(position, 1);
    const host = new FakeHost(); await expect.soft(installShell(shell, host)).rejects.toThrow();
    expect(host.fetched).toHaveLength(0); expect(host.caches.entries.size).toBe(0);
  });

test('WSTREAM001 installation finishes when finite upstream connections require each response body to drain',
  /** Exercises native streamed Responses and an upstream pool that waits for unread bodies.
   * @returns Completion after the liveness assertion and exact cached-body controls.
   * @remarks Temporarily replaces only this host's fetch boundary; releases blocked fixture work after the assertion.
   */
  async function responseBackpressure() {
    const host = new FakeHost(); const pending = new Set<string>(); const waiters: Array<() => void> = [];
    let unblock = false; let finished = false; let queued!: () => void;
    const backpressure = new Promise<void>(
      /** Exposes actual connection-pool saturation without an arbitrary test timeout.
       * @param resolve Saturation observation callback.
       * @returns Nothing after capturing the controlled observation callback.
       * @remarks Updates this local native-boundary fixture observer.
       */
      function observed(resolve): void { queued = resolve; });
    host.fetch =
      /** Returns native streaming bodies; additional connections wait until earlier bodies drain.
       * @param input Actual native request URL.
       * @param init Actual fetch options.
       * @returns Original URL-bearing streamed Response.
       * @remarks Records only this fixture's requests and upstream connection occupancy.
       */
      async function streamed(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        if (!unblock && pending.size >= 2) {
          queued(); await new Promise<void>(
            /** Waits for one upstream connection to be released by actual stream consumption.
             * @param resolve Connection availability callback.
             * @returns Nothing after recording the callback.
             * @remarks Appends this local controlled connection waiter.
             */
            function available(resolve): void { waiters.push(resolve); });
        }
        const url = urlKey(input); host.fetched.push({ url, method: 'GET', cache: init?.cache ?? 'default' });
        const bytes = new TextEncoder().encode(body(url, currentVersion)); let offset = 0; pending.add(url);
        const stream = new ReadableStream<Uint8Array>({
          /** Supplies bounded native chunks and releases the connection only after the body drains.
           * @param controller Actual native stream controller.
           * @returns Nothing after supplying a chunk or closing the completed stream.
           * @remarks Advances local fixture bytes and releases one upstream waiter on completion.
           */
          pull(controller): void {
            const next = Math.min(offset + 8, bytes.length); controller.enqueue(bytes.subarray(offset, next)); offset = next;
            if (offset === bytes.length) { controller.close(); pending.delete(url); waiters.shift()?.(); }
          },
        });
        const value = new Response(stream); Object.defineProperty(value, 'url', { value: url });
        Object.defineProperty(value, 'type', { value: 'basic' }); return value;
      };
    const installation = installShell(manifest, host).then(
      /** Records successful production installation rather than fabricated platform readiness.
       * @param result Actual production installation status.
       * @returns The unchanged production result.
       * @remarks Marks local settlement for the observable liveness assertion.
       */
      function settled(result): ShellStatus { finished = true; return result; });
    try { await Promise.race([installation, backpressure]); expect.soft(finished).toBe(true); }
    finally {
      // Release only the controlled pool after observing behavior, so RED has no hanging fixture work.
      unblock = true; for (const resolve of waiters.splice(0)) resolve(); await installation;
    }
    const cache = host.caches.entries.get(cacheKey(manifest))!;
    for (const asset of manifest.assets) { const value = await cache.match(asset);
      expect(value?.url).toBe(urlKey(asset)); expect(value && await value.text()).toBe(body(asset, currentVersion)); }
    expect(host.skipCount).toBe(0);
  });
