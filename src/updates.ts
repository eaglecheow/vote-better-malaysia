/** Confirmed compatible shell state and a separately discovered waiting version. */
export interface UpdateState { shellReady: boolean; waitingVersion: string | null; applying: boolean; failed: boolean }

/** Concrete native-worker client boundary required by deliberate updates and saved-reader notices. */
export interface UpdateClient {
  getState(): UpdateState;
  subscribe(listener: (state: UpdateState) => void): () => void;
  apply(persistPreferences: () => Promise<void>): Promise<void>;
  continue(): void;
  close(): void;
}

/** Current build identity, actual browser worker container, and consenting-tab reload boundary. */
export interface UpdateOptions {
  baseUrl: string;
  version: string;
  serviceWorker?: ServiceWorkerContainer | null;
  reload?: () => void;
}

/** Connects native shell status and deliberate updates without waiting for registration.
 * @param options Repository URL, current application stamp and native platform boundaries.
 * @returns A client immediately; pending or failed registration cannot block reading.
 * @throws On invalid repository URL/current stamp before any native effect.
 * @remarks Registers a worker and listeners; only acknowledged consenting activation reloads this tab.
 */
export async function connectUpdates(options: UpdateOptions): Promise<UpdateClient> {
  const url = new URL(options.baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password || !url.pathname.endsWith('/') || !/^[a-f0-9]{64}$/.test(options.version)) throw new Error('Invalid reader shell identity');
  const base = url.pathname;
  const container = options.serviceWorker === undefined ? (typeof navigator === 'undefined' ? null : navigator.serviceWorker) : options.serviceWorker;
  let registration: ServiceWorkerRegistration | null = null; let closed = false;
  let state: UpdateState = { shellReady: false, waitingVersion: null, applying: false, failed: false };
  let waiting: ServiceWorker | null = null; let dismissed: ServiceWorker | null = null;
  let consent: ServiceWorker | null = null; let reloaded = false;
  let acknowledgement: { target: ServiceWorker; version: string; resolve: () => void; reject: (error: Error) => void } | null = null;
  const observers = new Set<(state: UpdateState) => void>();
  const watched = new Set<ServiceWorker>();
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];

  /** Sends a copied state to current observers.
   * @param changes Actual native observation or explicit action outcome.
   * @returns Nothing.
   * @remarks Updates local state and invokes subscribed callbacks unless closed.
   */
  function publish(changes: Partial<UpdateState>): void {
    if (closed) return; state = { ...state, ...changes };
    for (const observer of observers) observer({ ...state });
  }
  /** Tracks one native listener for concrete teardown.
   * @param target Native worker, registration or container.
   * @param type Native event type.
   * @param listener Local callback.
   * @returns Nothing.
   * @remarks Registers and records only this client's native callback.
   */
  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener); listeners.push({ target, type, listener });
  }
  /** Reports this still-open document's stamp to its actual current native worker.
   * @returns Nothing.
   * @remarks Requests exact compatible cache readiness without claiming or reloading.
   */
  function currentStatus(): void {
    if (closed) return; const worker = container?.controller ?? registration?.active;
    if (!worker) return;
    worker.postMessage({ type: 'CLIENT_VERSION', base, version: options.version });
    worker.postMessage({ type: 'SHELL_STATUS', base, version: options.version });
  }
  /** Reloads only after this client's exact acknowledged target is activated.
   * @returns Nothing.
   * @remarks Reloads once through the consenting-tab boundary, never other clients.
   */
  function activated(): void {
    if (closed || reloaded || consent?.state !== 'activated') return;
    reloaded = true; publish({ applying: false, waitingVersion: null });
    if (options.reload) options.reload(); else location.reload();
  }
  /** Observes actual worker lifecycle and requests waiting-shell discovery.
   * @param input Concrete native installing/waiting worker, when present.
   * @returns Nothing.
   * @remarks Tracks its state listener and posts only to actual installed waiting objects.
   */
  function watch(input: ServiceWorker | null): void {
    if (!input || watched.has(input)) return; const worker = input; watched.add(worker); listen(worker, 'statechange', changed); changed();
    /** Reacts to this actual worker's lifecycle transition.
     * @returns Nothing.
     * @remarks Requests native readiness or consenting reload; failed installs do not revoke older readiness.
     */
    function changed(): void {
      if (closed) return;
      if (worker.state === 'installed' && registration?.waiting === worker && dismissed !== worker) {
        waiting = worker; worker.postMessage({ type: 'SHELL_STATUS', base });
      } else if (worker.state === 'activated') {
        if (waiting === worker) publish({ waitingVersion: null }); currentStatus(); activated();
      } else if (worker.state === 'redundant') publish({ waitingVersion: waiting === worker ? null : state.waitingVersion, failed: true });
    }
  }
  /** Validates a native reply against actual source objects and this repository.
   * @param event Actual container message event.
   * @returns Nothing.
   * @remarks Confirms readiness or exact Apply acknowledgement; ignores same-URL impostors.
   */
  function message(event: Event): void {
    if (closed) return; const native = event as MessageEvent; const data = native.data;
    if (acknowledgement && native.source === acknowledgement.target && data?.type === 'APPLY_ACCEPTED') {
      const pending = acknowledgement; acknowledgement = null;
      if (data?.type === 'APPLY_ACCEPTED' && data.base === base && data.version === pending.version) {
        consent = pending.target; pending.resolve(); activated();
      } else { publish({ applying: false, failed: true }); pending.reject(new Error('Invalid waiting-worker acknowledgement')); }
      return;
    }
    const active = container?.controller ?? registration?.active;
    const fromWaiting = native.source === waiting && waiting !== null && registration?.waiting === waiting && waiting.state === 'installed';
    if (native.source !== active && !fromWaiting) return;
    if (data?.type !== 'SHELL_STATUS') return;
    if (data.base !== base || typeof data.version !== 'string' || !/^[a-f0-9]{64}$/.test(data.version) || typeof data.ready !== 'boolean') {
      publish({ failed: true, ...(fromWaiting ? { waitingVersion: null } : {}) }); return;
    }
    if (fromWaiting) publish({ waitingVersion: data.ready && dismissed !== waiting ? data.version : null, failed: !data.ready });
    else if (data.version === options.version) publish({ shellReady: data.ready, failed: !data.ready });
  }
  const client: UpdateClient = {
    /** Reads copied readiness without inferring saved transcript availability. @returns Current independently observed shell/update state. */
    getState() { return { ...state }; },
    /** Adds one state observer.
     * @param observer Callback for actual state changes.
     * @returns Concrete unsubscribe callback.
     * @remarks Adds only this reader's local observer.
     */
    subscribe(observer) {
      observers.add(observer);
      /** Removes this local state observer. @returns Nothing. @remarks Removes only the captured callback. */
      return function unsubscribe(): void { observers.delete(observer); };
    },
    /** Commits preferences before consenting to the exact still-waiting worker.
     * @param persistPreferences Caller transaction-completion boundary.
     * @returns Completion after the exact target acknowledges Apply.
     * @throws On absent/replaced target, duplicate/closed action, failed commit or invalid acknowledgement.
     * @remarks Persists first, then messages only that target; activation reloads only this tab.
     */
    async apply(persistPreferences) {
      const target = waiting; const version = state.waitingVersion;
      if (closed || state.applying || !target || !version || registration?.waiting !== target || target.state !== 'installed') throw new Error('No applicable waiting reader');
      publish({ applying: true, failed: false });
      try {
        await persistPreferences();
        if (closed || registration?.waiting !== target || waiting !== target || state.waitingVersion !== version || target.state !== 'installed') throw new Error('Waiting reader changed before Apply');
        await new Promise<void>(
          /** Captures acknowledgement before posting so immediate native replies cannot be lost.
           * @param resolve Exact accepted response callback.
           * @param reject Invalid/closed response callback.
           * @returns Nothing.
           * @remarks Records this pending action and posts to its actual native target.
           */
          function request(resolve, reject): void { acknowledgement = { target, version, resolve, reject }; target.postMessage({ type: 'APPLY_UPDATE', base, version }); },
        );
      } catch (error) { acknowledgement = null; publish({ applying: false, failed: true }); throw error; }
    },
    /** Dismisses this offer without saving, activating or reloading. @returns Nothing. @remarks Changes only this client's offer state. */
    continue() { dismissed = waiting; publish({ waitingVersion: null }); },
    /** Removes native/local observers and rejects any pending action without unregistering shared workers.
     * @returns Nothing.
     * @remarks Cleans up only this client; native caches, saved data and other tabs remain intact.
     */
    close() {
      closed = true; for (const binding of listeners) binding.target.removeEventListener(binding.type, binding.listener);
      listeners.length = 0; observers.clear(); acknowledgement?.reject(new Error('Reader update connection closed')); acknowledgement = null;
    },
  };
  if (container) {
    listen(container, 'message', message); listen(container, 'controllerchange', currentStatus);
    void container.register(new URL('sw.js', url).href, { scope: base }).then(registered, rejected);
  }
  /** Observes registration without keeping ordinary reader startup pending.
   * @param value Actual native registration.
   * @returns Nothing.
   * @remarks Adds lifecycle listeners, requests compatible status and watches actual update workers.
   */
  function registered(value: ServiceWorkerRegistration): void {
    if (closed) return; registration = value; listen(value, 'updatefound', found); currentStatus(); watch(value.installing); watch(value.waiting);
    /** Watches the actual installing object after updatefound. @returns Nothing. @remarks Adds its concrete lifecycle listener. */
    function found(): void { watch(value.installing); watch(value.waiting); }
  }
  /** Records actual registration failure without fabricating readiness.
   * @param _error Native registration rejection.
   * @returns Nothing.
   * @remarks Preserves previously confirmed compatible readiness while notifying failure.
   */
  function rejected(_error: unknown): void { publish({ failed: true }); }
  return client;
}
