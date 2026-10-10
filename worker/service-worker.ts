import type { ShellManifest } from '../scripts/build-worker.ts';

export interface ShellStatus { type: 'SHELL_STATUS'; base: string; version: string; ready: boolean }
export interface WorkerClient { id: string; url: string; type: string; postMessage(message: unknown): void }
export interface ShellCache {
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
  addAll(requests: Array<RequestInfo | URL>): Promise<void>;
  keys(): Promise<Request[]>;
}
export interface ShellHost {
  origin: string;
  caches: { open(name: string): Promise<ShellCache>; keys(): Promise<string[]>; delete(name: string): Promise<boolean> };
  fetch: typeof fetch;
  clients: { matchAll(options?: { includeUncontrolled: boolean; type: 'window' }): Promise<WorkerClient[]>; get(id: string): Promise<WorkerClient | undefined> };
  clientVersions: Map<string, string>;
  skipWaiting(): Promise<void>;
}
export interface WorkerEventScope {
  addEventListener(type: string, listener: (event: any) => void): void;
}
export interface ApplyAccepted { type: 'APPLY_ACCEPTED'; base: string; version: string }
export interface ClientAccepted { type: 'CLIENT_VERSION'; base: string; version: string; accepted: true }

/** Validates generated shell identity and its complete repository-only asset declarations.
 * @param manifest Exact generated shell metadata.
 * @returns Nothing after validation.
 * @throws On malformed identity, omitted required assets or escaped/data URLs.
 */
export function validateShellManifest(manifest: ShellManifest): void {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)+$/.test(manifest.base) || !/^[a-f0-9]{64}$/.test(manifest.version)
    || !Array.isArray(manifest.assets) || new Set(manifest.assets).size !== manifest.assets.length) throw new Error('Invalid shell manifest');
  for (const asset of manifest.assets) if (typeof asset !== 'string' || !asset.startsWith(manifest.base)
    || /[?\\#%]/.test(asset) || new URL(asset, 'https://shell.invalid').pathname !== asset
    || asset.startsWith(manifest.base + 'data/')) throw new Error('Invalid shell asset');
  for (const path of ['', 'index.html', 'help.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'sw.js'])
    if (!manifest.assets.includes(manifest.base + path)) throw new Error('Missing required shell asset: ' + path);
  let javascript = false; let css = false;
  for (const asset of manifest.assets) { if (asset.startsWith(manifest.base + 'assets/') && asset.endsWith('.js')) javascript = true;
    if (asset.startsWith(manifest.base + 'assets/') && asset.endsWith('.css')) css = true; }
  if (!javascript || !css) throw new Error('Required application JS/CSS missing');
}
/** Identifies this repository's versioned cache without including foreign/malformed caches.
 * @param manifest Exact repository shell identity.
 * @returns Versioned cache key.
 */
function cacheKey(manifest: ShellManifest): string { return `hansard-shell:${encodeURIComponent(manifest.base)}:${manifest.version}`; }
/** Constructs exact public readiness without inferring saved transcript availability.
 * @param manifest Requested shell.
 * @param ready Whether every required cached response was validated.
 * @returns Source-bound public protocol payload.
 */
function status(manifest: ShellManifest, ready: boolean): ShellStatus { return { type: 'SHELL_STATUS', base: manifest.base, version: manifest.version, ready }; }
/** Checks usable exact-resource responses and both entry points' generated version stamp.
 * @param response Native network/cache response, if present.
 * @param asset Base-scoped required resource.
 * @param manifest Exact shell identity.
 * @param host Native origin dependencies.
 * @returns Whether the response can confirm this required resource.
 * @throws On unreadable response bodies.
 */
async function usable(response: Response | undefined, asset: string, manifest: ShellManifest, host: ShellHost): Promise<boolean> {
  if (!response?.ok || response.type === 'opaque' || response.redirected || response.url !== new URL(asset, host.origin).href) return false;
  if (asset === manifest.base || asset === manifest.base + 'index.html') {
    const html = await response.clone().text(); const stamps = [...html.matchAll(/<meta\s+name=["']hansard-shell-version["']\s+content=["']([a-f0-9]{64})["']\s*\/?\s*>/g)];
    return stamps.length === 1 && stamps[0][1] === manifest.version;
  }
  return true;
}
/** Installs only fully fetched and validated shell responses, without requesting activation.
 * @param manifest Required versioned repository shell.
 * @param host Native cache/fetch/client dependencies.
 * @returns Confirmed exact readiness after all required cache writes.
 * @throws On invalid metadata, retrieval/response failure or cache failure.
 * @remarks Fetches and populates this version's shell cache; never modifies older versions.
 */
export async function installShell(manifest: ShellManifest, host: ShellHost): Promise<ShellStatus> {
  validateShellManifest(manifest); const staged: Array<[string, Response]> = [];
  for (const asset of manifest.assets) {
    const url = new URL(asset, host.origin).href; const response = await host.fetch(url, { cache: 'no-store', redirect: 'error' });
    if (!await usable(response, asset, manifest, host)) throw new Error('Required shell retrieval failed: ' + asset);
    // Release the upstream connection while keeping the original Response available for Cache.put.
    await response.clone().arrayBuffer();
    staged.push([url, response]);
  }
  const cache = await host.caches.open(cacheKey(manifest));
  for (const [url, response] of staged) await cache.put(url, response);
  const confirmed = await shellStatus(manifest, host); if (!confirmed.ready) throw new Error('Shell cache is incomplete'); return confirmed;
}
/** Confirms all required resources and both exact entry stamps from native cache contents.
 * @param manifest Exact compatible shell requested by the reader.
 * @param host Native cache/fetch/client dependencies.
 * @returns False readiness on absent/incompatible resources or storage failures.
 * @remarks Reads this version's shell cache; never deletes accepted older caches.
 */
export async function shellStatus(manifest: ShellManifest, host: ShellHost): Promise<ShellStatus> {
  try {
    validateShellManifest(manifest); const cache = await host.caches.open(cacheKey(manifest));
    for (const asset of manifest.assets) if (!await usable(await cache.match(new URL(asset, host.origin)), asset, manifest, host)) return status(manifest, false);
    return status(manifest, true);
  } catch { return status(manifest, false); }
}
/** Checks native window ownership against the exact origin and repository base.
 * @param client Actual native client record.
 * @param manifest Exact repository identity.
 * @param host Native origin dependencies.
 * @returns Whether this is a live own window client.
 */
function ownClient(client: WorkerClient, manifest: ShellManifest, host: ShellHost): boolean {
  try { const url = new URL(client.url); return client.type === 'window' && url.origin === host.origin && url.pathname.startsWith(manifest.base); }
  catch { return false; }
}
/** Cleans only obsolete own caches when every live own window confirms this complete shell.
 * @param manifest New complete versioned shell.
 * @param host Native cache/fetch/client dependencies.
 * @returns Current confirmed readiness, preserving caches on unknown/error conditions.
 * @remarks Enumerates uncontrolled windows too; may delete obsolete own caches. Never claims clients, activates or migrates IndexedDB.
 */
export async function activateShell(manifest: ShellManifest, host: ShellHost): Promise<ShellStatus> {
  const current = await shellStatus(manifest, host); if (!current.ready) return current;
  try {
    for (const client of await host.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      if (ownClient(client, manifest, host) && host.clientVersions.get(client.id) !== manifest.version) return current;
    const prefix = `hansard-shell:${encodeURIComponent(manifest.base)}:`;
    for (const name of await host.caches.keys()) if (name.startsWith(prefix) && /^[a-f0-9]{64}$/.test(name.slice(prefix.length))
      && name !== cacheKey(manifest)) await host.caches.delete(name);
  } catch { /* Unknown cleanup state preserves accepted caches and current readiness. */ }
  return current;
}
/** Serves exact installed shell bytes while keeping every data request network-only.
 * @param request Actual intercepted native request.
 * @param manifest Current versioned shell.
 * @param host Native cache/fetch/client dependencies.
 * @returns Exact cached shell response or the unmodified native network response.
 * @throws Native network failures when no usable exact shell response exists.
 * @remarks Reads shell caches only; never saves fetched data or arbitrary network resources.
 */
export async function fetchShell(request: Request, manifest: ShellManifest, host: ShellHost): Promise<Response> {
  const url = new URL(request.url); const own = url.origin === host.origin && url.pathname.startsWith(manifest.base);
  if (own && url.pathname.startsWith(manifest.base + 'data/')) return host.fetch(request, { cache: 'no-store' });
  if (!own || request.method !== 'GET') return host.fetch(request);
  try {
    if (manifest.assets.includes(url.pathname) && !url.search) {
      const found = await (await host.caches.open(cacheKey(manifest))).match(request);
      if (await usable(found, url.pathname, manifest, host)) return found!;
    } else {
      const prefix = `hansard-shell:${encodeURIComponent(manifest.base)}:`;
      for (const name of await host.caches.keys()) if (name.startsWith(prefix) && /^[a-f0-9]{64}$/.test(name.slice(prefix.length))) {
        const found = await (await host.caches.open(name)).match(request);
        if (found?.ok && !found.redirected && found.type !== 'opaque' && found.url === url.href) return found;
      }
    }
  } catch { /* Cache failure must leave ordinary online reading available. */ }
  return host.fetch(request);
}
/** Accepts exact status/discovery, source-client stamps and deliberate Apply messages.
 * @param data Parsed untrusted message.
 * @param clientId Native source client's identifier.
 * @param manifest Exact installed worker's versioned shell.
 * @param host Native cache/fetch/client dependencies.
 * @returns Source-bound acknowledgement/status, or null for invalid messages/sources.
 * @throws Native client lookup or explicit activation failures.
 * @remarks Updates only the actual source client's version; skipWaiting occurs only on matching explicit Apply.
 */
export async function handleShellMessage(data: unknown, clientId: string, manifest: ShellManifest,
  host: ShellHost): Promise<ShellStatus | ApplyAccepted | ClientAccepted | null> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const message = data as Record<string, unknown>; if (message.base !== manifest.base) return null;
  const client = await host.clients.get(clientId); if (!client || !ownClient(client, manifest, host)) return null;
  if (message.type === 'SHELL_STATUS') {
    if (Object.hasOwn(message, 'version') && message.version !== manifest.version) return null;
    return shellStatus(manifest, host);
  }
  if (typeof message.version !== 'string' || !/^[a-f0-9]{64}$/.test(message.version)) return null;
  if (message.type === 'CLIENT_VERSION') { host.clientVersions.set(client.id, message.version);
    return { type: 'CLIENT_VERSION', base: manifest.base, version: message.version, accepted: true }; }
  if (message.type === 'APPLY_UPDATE' && message.version === manifest.version) {
    await host.skipWaiting(); return { type: 'APPLY_ACCEPTED', base: manifest.base, version: manifest.version };
  }
  return null;
}
/** Binds native lifecycle promises and source-directed messages without activation side effects.
 * @param scope Actual service-worker event target.
 * @param manifest Generated complete repository shell.
 * @param host Native cache/fetch/client dependencies.
 * @returns Nothing after registering handlers.
 * @remarks Registers install/activate/fetch/message listeners; work begins only on actual native events.
 */
export function bindWorkerEvents(scope: WorkerEventScope, manifest: ShellManifest, host: ShellHost): void {
  scope.addEventListener('install',
    /** Extends native installation through validated complete caching.
     * @param event Native extendable install event.
     * @returns Nothing after attaching install work.
     * @remarks Supplies a rejecting lifetime promise on failed installation.
     */
    function install(event): void { event.waitUntil(installShell(manifest, host)); });
  scope.addEventListener('activate',
    /** Extends native activation only through conservative shell cleanup.
     * @param event Native extendable activate event.
     * @returns Nothing after attaching activation work.
     * @remarks Never claims/reloads windows or migrates saved data.
     */
    function activate(event): void { event.waitUntil(activateShell(manifest, host)); });
  scope.addEventListener('fetch',
    /** Connects the actual network/cache response promise to the native fetch event.
     * @param event Native intercepted fetch event.
     * @returns Nothing after supplying the native response.
     * @remarks Reads shell caches or fetches the actual request through the shared policy.
     */
    function intercepted(event): void { event.respondWith(fetchShell(event.request, manifest, host)); });
  scope.addEventListener('message',
    /** Attaches source-authenticated message handling and replies only to that native client.
     * @param event Native extendable message event.
     * @returns Nothing after ignoring invalid sources or attaching message work.
     * @remarks Extends lifetime and posts only to the independently resolved source client.
     */
    function messaged(event): void {
      const source = event.source; if (!source || typeof source.id !== 'string' || source.type !== 'window' || typeof source.postMessage !== 'function') return;
      event.waitUntil(reply());
      /** Processes one native-source message without broadcasting to other windows.
       * @returns Completion after handling and the optional source reply.
       * @throws Native lookup/activation errors.
       * @remarks May update source tracking/request activation and post an acknowledgement.
       */
      async function reply(): Promise<void> {
        const result = await handleShellMessage(event.data, source.id, manifest, host);
        if (result) (await host.clients.get(source.id))?.postMessage(result);
      }
    });
}

declare const __HANSARD_SHELL__: ShellManifest;
if (typeof __HANSARD_SHELL__ !== 'undefined' && typeof self !== 'undefined') {
  const scope = self as unknown as WorkerEventScope & { location: { origin: string }; caches: ShellHost['caches'];
    clients: ShellHost['clients']; fetch: typeof fetch; skipWaiting(): Promise<void> };
  bindWorkerEvents(scope, __HANSARD_SHELL__, { origin: scope.location.origin, caches: scope.caches, clients: scope.clients,
    fetch: scope.fetch.bind(scope), skipWaiting: scope.skipWaiting.bind(scope), clientVersions: new Map() });
}
