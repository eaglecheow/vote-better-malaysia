import { expect, test, vi } from 'vitest';
import { connectUpdates, type UpdateClient } from '../../src/updates.ts';

const baseUrl = 'https://example.test/vote-better-malaysia/';
const base = '/vote-better-malaysia/'; const current = 'a'.repeat(64); const next = 'b'.repeat(64);

/** Native event target fixture tracks cleanup without implementing update policy. */
class Target extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  /** Records native event registration. @param type Event type. @param listener Actual callback. @param options Platform event options. @returns Nothing. @remarks Registers a controlled listener and records it for cleanup assertions. */
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, listener, options); if (!listener) return;
    if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(listener);
  }
  /** Records native listener removal. @param type Event type. @param listener Actual callback. @param options Platform event options. @returns Nothing. @remarks Removes the controlled listener and updates only fixture bookkeeping. */
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, listener, options); if (listener) this.listeners.get(type)?.delete(listener);
  }
  /** Counts retained native callback registrations. @returns Total retained fixture listeners. */
  count(): number { let count = 0; for (const listeners of this.listeners.values()) count += listeners.size; return count; }
}

/** Service-worker-shaped recorder supplies explicit canned protocol replies, never cache or activation policy. */
class Worker extends Target {
  scriptURL = `${baseUrl}sw.js`; state: ServiceWorkerState = 'installed'; posts: unknown[] = [];
  status: unknown; accepted: unknown; replySource: Worker | null = null; container: Container;
  /** Captures one controlled worker identity and its canned responses. @param container Native-shaped owner. @param version Embedded fixture shell stamp. @returns Nothing. @remarks Initializes only this isolated recorder. */
  constructor(container: Container, version: string) {
    super(); this.container = container; this.status = { type: 'SHELL_STATUS', base, version, ready: true };
    this.accepted = { type: 'APPLY_ACCEPTED', base, version };
  }
  /** Records an actual target post and asynchronously sends a controlled response. @param data Client message payload. @returns Nothing. @remarks Records fixture calls and dispatches canned native-message events; never changes worker state automatically. */
  postMessage(data: unknown): void {
    this.posts.push(data); const type = (data as { type?: string })?.type;
    const reply = type === 'SHELL_STATUS' ? this.status : type === 'APPLY_UPDATE' ? this.accepted : null;
    if (reply) queueMicrotask(
      /** Emits the explicitly controlled native reply. @returns Nothing. @remarks Dispatches one fixture container message with its actual source identity. */
      () => { this.container.message(this.replySource ?? this, reply); },
    );
  }
  /** Dispatches one independently controlled platform state transition. @param state Actual worker lifecycle state. @returns Nothing. @remarks Updates this fixture state and emits its native-shaped event. */
  transition(state: ServiceWorkerState): void { this.state = state; this.dispatchEvent(new Event('statechange')); }
}

/** Registration fixture exposes actual distinct current/installing/waiting object identities. */
class Registration extends Target {
  scope = baseUrl; active: Worker | null = null; waiting: Worker | null = null; installing: Worker | null = null;
}

/** Container fixture observes register/messages/controller events without activating or reloading any tab. */
class Container extends Target {
  registration = new Registration(); controller: Worker | null = null;
  register = vi.fn().mockResolvedValue(this.registration); reload = vi.fn();
  /** Dispatches a controlled native message with independent source identity. @param source Actual emitting worker fixture. @param data Untrusted response payload. @returns Nothing. @remarks Dispatches one native-shaped message in this isolated context. */
  message(source: Worker, data: unknown): void {
    const event = new MessageEvent('message', { data }); Object.defineProperty(event, 'source', { value: source }); this.dispatchEvent(event);
  }
}

/** Advances native-shaped fixture replies without implementing client behavior. @returns Promise after the next task. */
async function settle(): Promise<void> { await new Promise<void>(
  /** Schedules one fixture task. @param resolve Task completion callback. @returns Nothing. @remarks Schedules a zero-delay unit timer. */
  (resolve) => { setTimeout(resolve, 0); },
); }

/** Opens inert production with exact native-shaped platform dependencies. @param waiting Whether a separate new installed worker exists. @returns Controlled identities and the client under test. */
async function setup(waiting = true): Promise<{ container: Container; active: Worker; waiting: Worker | null; client: UpdateClient }> {
  const container = new Container(); const active = new Worker(container, current); active.state = 'activated';
  container.controller = active; container.registration.active = active;
  const worker = waiting ? new Worker(container, next) : null; container.registration.waiting = worker;
  const client = await connectUpdates({ baseUrl, version: current, serviceWorker: container as unknown as ServiceWorkerContainer, reload: container.reload });
  await settle(); return { container, active, waiting: worker, client };
}

/** Captures a delayed preference commit independently of update implementation. @returns A promise and explicit completion callback. */
function commitBoundary(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void; const promise = new Promise<void>(
    /** Captures transaction acknowledgement. @param callback Completion callback. @returns Nothing. @remarks Sets only this fixture's local callback. */
    (callback) => { resolve = callback; },
  ); return { promise, resolve };
}

test('UPDATE001: native registration is scoped to this repository and reports the current client version',
  /** Checks concrete registration and client-stamp messages. @returns Resolves after assertions. */
  async () => {
    const { container, active } = await setup(); expect.soft(container.register).toHaveBeenCalledWith(`${baseUrl}sw.js`, { scope: base });
    expect(active.posts).toContainEqual({ type: 'CLIENT_VERSION', base, version: current });
  });

test('UPDATE002: complete current-shell readiness is separate from the discovered waiting version',
  /** Checks source-bound compatible shell readiness and waiting discovery. @returns Resolves after assertions. */
  async () => {
    const { client, active, waiting } = await setup();
    expect.soft(active.posts).toContainEqual({ type: 'SHELL_STATUS', base, version: current });
    expect.soft(waiting!.posts).toContainEqual({ type: 'SHELL_STATUS', base });
    expect(client.getState()).toEqual({ shellReady: true, waitingVersion: next, applying: false, failed: false });
  });

test('UPDATE003: unsupported workers return explicit unavailable readiness without breaking ordinary reading',
  /** Checks first-visit unsupported-platform status. @returns Resolves after assertions. */
  async () => {
    const client = await connectUpdates({ baseUrl, version: current, serviceWorker: null });
    expect(client.getState()).toEqual({ shellReady: false, waitingVersion: null, applying: false, failed: false });
  });

test('UPDATE004: registration failure becomes unavailable readiness rather than fabricated shell success',
  /** Checks actual native registration failure status. @returns Resolves after assertions. */
  async () => {
    const container = new Container(); container.register.mockRejectedValue(new Error('controlled registration failure'));
    const client = await connectUpdates({ baseUrl, version: current, serviceWorker: container as unknown as ServiceWorkerContainer });
    expect(client.getState()).toEqual({ shellReady: false, waitingVersion: null, applying: false, failed: true });
  });

test('UPDATE005: Continue dismisses only the offer and never activates, persists or reloads a tab',
  /** Checks explicit nonconsent remains separate from activation. @returns Resolves after assertions. */
  async () => {
    const { client, container, waiting } = await setup(); client.continue();
    expect.soft(client.getState()).toEqual({ shellReady: true, waitingVersion: null, applying: false, failed: false });
    expect(waiting!.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next }); expect(container.reload).not.toHaveBeenCalled();
  });

test('UPDATE006: Apply commits preferences before messaging the actual still-waiting version',
  /** Checks native target/version and transaction-before-activation ordering. @returns Resolves after assertions. */
  async () => {
    const { client, waiting, active } = await setup(); const commit = commitBoundary(); const persist = vi.fn().mockReturnValue(commit.promise);
    const applied = client.apply(persist); await settle(); expect.soft(persist).toHaveBeenCalledOnce();
    expect.soft(client.getState()).toEqual({ shellReady: true, waitingVersion: next, applying: true, failed: false });
    expect(waiting!.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next });
    commit.resolve(); await applied; await settle();
    expect.soft(waiting!.posts).toContainEqual({ type: 'APPLY_UPDATE', base, version: next });
    expect(active.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next });
  });

test('UPDATE007: failed preference commit rejects Apply and preserves the current compatible shell',
  /** Checks failed saving blocks activation while older confirmed readiness survives. @returns Resolves after assertions. */
  async () => {
    const { client, waiting, container } = await setup(); const persist = vi.fn().mockRejectedValue(new Error('controlled commit abort'));
    await expect.soft(client.apply(persist)).rejects.toThrow('controlled commit abort');
    expect.soft(client.getState()).toEqual({ shellReady: true, waitingVersion: next, applying: false, failed: true });
    expect(waiting!.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next }); expect(container.reload).not.toHaveBeenCalled();
  });

test('UPDATE008: a replaced waiting object during preference commit cannot receive stale Apply consent',
  /** Checks object identity even when stable worker URLs are identical. @returns Resolves after assertions. */
  async () => {
    const { client, container, waiting } = await setup(); const commit = commitBoundary();
    const applied = client.apply(vi.fn().mockReturnValue(commit.promise)); const replacement = new Worker(container, 'c'.repeat(64));
    container.registration.waiting = replacement; commit.resolve(); await expect.soft(applied).rejects.toBeInstanceOf(Error);
    expect(waiting!.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next });
    expect(replacement.posts).not.toContainEqual({ type: 'APPLY_UPDATE', base, version: next });
  });

test('UPDATE009: accepted target activation reloads only its consenting instance without clients.claim',
  /** Checks actual worker activated event rather than requiring automatic controller claiming. @returns Resolves after assertions. */
  async () => {
    const one = await setup(); const otherReload = vi.fn();
    const other = await connectUpdates({ baseUrl, version: current, serviceWorker: one.container as unknown as ServiceWorkerContainer, reload: otherReload });
    await one.client.apply(vi.fn().mockResolvedValue(undefined)); one.waiting!.transition('activated'); await settle();
    expect.soft(one.container.reload).toHaveBeenCalledOnce(); expect(otherReload).not.toHaveBeenCalled(); other.close();
  });

test('UPDATE010: nonconsenting activation/controller events never reload another reading instance',
  /** Checks an unrelated tab's activation cannot manufacture this tab's consent. @returns Resolves after assertions. */
  async () => {
    const { client, waiting, container } = await setup(); waiting!.transition('activated'); container.controller = waiting;
    container.dispatchEvent(new Event('controllerchange')); await settle();
    expect.soft(container.reload).not.toHaveBeenCalled(); expect(client.getState()).toEqual({ shellReady: true, waitingVersion: null, applying: false, failed: false });
  });

test('UPDATE011: a failed new-shell confirmation never revokes older confirmed compatible readiness',
  /** Checks accepted old readiness survives unready waiting-shell status. @returns Resolves after assertions. */
  async () => {
    const { client, container, waiting } = await setup(); container.message(waiting!, { type: 'SHELL_STATUS', base, version: next, ready: false }); await settle();
    expect(client.getState()).toEqual({ shellReady: true, waitingVersion: null, applying: false, failed: true });
  });

test.each([
  { type: 'SHELL_STATUS', base: '/other/', version: next, ready: true },
  { type: 'SHELL_STATUS', base, version: 'not-sha', ready: true },
  { type: 'SHELL_STATUS', base, version: next.toUpperCase(), ready: true },
  { type: 'SHELL_STATUS', base, version: next, ready: 'yes' },
])('UPDATE012: invalid waiting reply %j cannot advertise a usable waiting version',
  /** Checks untrusted source protocol payload validation. @param invalid Controlled malformed worker reply. @returns Resolves after assertions. */
  async (invalid) => {
    const { client, container } = await setup(false); const worker = new Worker(container, next); worker.status = invalid;
    container.registration.waiting = worker; container.registration.installing = worker; container.registration.dispatchEvent(new Event('updatefound'));
    worker.transition('installed'); await settle();
    expect(client.getState()).toEqual({ shellReady: true, waitingVersion: null, applying: false, failed: true });
  });

test('UPDATE019: a same-URL impostor Apply acknowledgement cannot authorize target activation reload',
  /** Checks activation consent is bound to native response source, even with equal script URLs and payloads. @returns Resolves after assertions. */
  async () => {
    const { client, waiting, container } = await setup(); waiting!.replySource = new Worker(container, next);
    const applied = client.apply(vi.fn().mockResolvedValue(undefined)); await settle();
    expect.soft(client.getState()?.applying).toBe(true); waiting!.transition('activated'); await settle();
    expect(container.reload).not.toHaveBeenCalled(); client.close(); await Promise.allSettled([applied]);
  });

test('UPDATE013: a same-URL foreign worker cannot supply readiness for the actual waiting object',
  /** Checks native MessageEvent.source identity rather than scriptURL inference. @returns Resolves after assertions. */
  async () => {
    const { client, container } = await setup(false); const worker = new Worker(container, next); const impostor = new Worker(container, next); worker.replySource = impostor;
    container.registration.waiting = worker; container.registration.installing = worker; container.registration.dispatchEvent(new Event('updatefound')); worker.transition('installed'); await settle();
    expect(client.getState()).toEqual({ shellReady: true, waitingVersion: null, applying: false, failed: false });
  });

test('UPDATE014: new actual updatefound/install state notifies subscribed observers with the discovered version',
  /** Checks later native worker discovery rather than only initial registration. @returns Resolves after assertions. */
  async () => {
    const { client, container } = await setup(false); const listener = vi.fn(); const unsubscribe = client.subscribe(listener); const worker = new Worker(container, next);
    container.registration.installing = worker; container.registration.dispatchEvent(new Event('updatefound')); container.registration.waiting = worker; worker.transition('installed'); await settle();
    expect.soft(listener).toHaveBeenCalledWith({ shellReady: true, waitingVersion: next, applying: false, failed: false });
    unsubscribe(); listener.mockClear(); client.continue(); expect(listener).not.toHaveBeenCalled();
  });

test('UPDATE015: close removes native listeners and no longer reacts to future worker messages',
  /** Checks concrete native cleanup without unregistering or deleting shared workers. @returns Resolves after assertions. */
  async () => {
    const { client, container, waiting } = await setup(); expect.soft(container.count() + container.registration.count() + waiting!.count()).toBeGreaterThan(0);
    client.close(); expect(container.count() + container.registration.count() + waiting!.count()).toBe(0);
  });

test('UPDATE016: Apply without a validated actual waiting worker rejects without persisting or reload',
  /** Checks missing update never activates the current worker. @returns Resolves after assertions. */
  async () => {
    const { client, container } = await setup(false); const persist = vi.fn().mockResolvedValue(undefined);
    await expect.soft(client.apply(persist)).rejects.toBeInstanceOf(Error); expect(persist).not.toHaveBeenCalled(); expect(container.reload).not.toHaveBeenCalled();
  });

test('UPDATE017: duplicate Apply cannot queue duplicate commits or activation messages',
  /** Checks repeated consent is scoped to one pending actual target. @returns Resolves after assertions. */
  async () => {
    const { client, waiting } = await setup(); const commit = commitBoundary(); const persist = vi.fn().mockReturnValue(commit.promise);
    const first = client.apply(persist); const second = client.apply(persist); commit.resolve(); await Promise.allSettled([first, second]); await settle();
    expect.soft(persist).toHaveBeenCalledOnce(); const applies = waiting!.posts.filter(
      /** Selects recorded activation requests. @param message Actual fixture post. @returns Whether it explicitly requests Apply. */
      (message) => (message as { type?: string })?.type === 'APPLY_UPDATE',
    ); expect(applies).toHaveLength(1);
  });

test.each([
  { type: 'APPLY_ACCEPTED', base: '/other/', version: next },
  { type: 'APPLY_ACCEPTED', base, version: current },
])('UPDATE018: invalid Apply acknowledgement %j cannot authorize consenting reload',
  /** Checks accepted activation evidence belongs to the exact target/base/version/action. @param invalid Controlled mismatched acknowledgement. @returns Resolves after assertions. */
  async (invalid) => {
    const { client, waiting, container } = await setup(); waiting!.accepted = invalid;
    await expect.soft(client.apply(vi.fn().mockResolvedValue(undefined))).rejects.toBeInstanceOf(Error);
    waiting!.transition('activated'); await settle(); expect(container.reload).not.toHaveBeenCalled();
  });

for (const version of ['', 'invalid', current.toUpperCase()]) test('UPDATE020: invalid current application stamp ' + JSON.stringify(version) + ' cannot register a worker',
  /** Checks the caller stamp before native effects.
   * @returns Completion after rejection and no-registration assertions.
   */
  async () => {
    const container = new Container();
    await expect.soft(connectUpdates({ baseUrl, version, serviceWorker: container as unknown as ServiceWorkerContainer })).rejects.toBeInstanceOf(Error);
    expect(container.register).not.toHaveBeenCalled();
  });

for (const invalidBase of ['ftp://example.test/vote-better-malaysia/', baseUrl + '?foreign=1', baseUrl + '#foreign', 'https://user:password@example.test/vote-better-malaysia/']) test('UPDATE021: malformed repository base cannot register ' + invalidBase,
  /** Checks unsafe URL components before native worker registration.
   * @returns Completion after rejection and no-registration assertions.
   */
  async () => {
    const container = new Container();
    await expect.soft(connectUpdates({ baseUrl: invalidBase, version: current, serviceWorker: container as unknown as ServiceWorkerContainer })).rejects.toBeInstanceOf(Error);
    expect(container.register).not.toHaveBeenCalled();
  });

test('UPDATE022: a changed controller learns this nonconsenting tab\'s unchanged application version',
  /** Checks actual controller messaging preserves the still-open old client's cache identity.
   * @returns Completion after native target, exact stamp and no-reload assertions.
   */
  async () => {
    const { container, waiting } = await setup();
    container.controller = waiting; waiting!.posts.length = 0;
    container.dispatchEvent(new Event('controllerchange')); await settle();
    expect.soft(waiting!.posts).toContainEqual({ type: 'CLIENT_VERSION', base, version: current });
    expect.soft(waiting!.posts).toContainEqual({ type: 'SHELL_STATUS', base, version: current });
    expect(container.reload).not.toHaveBeenCalled();
  });

test('UPDATE023: actual compatible-cache loss revokes readiness while preserving ordinary reading',
  /** Checks a fresh negative status from the actual current compatible worker.
   * @returns Completion after readiness is revoked without activation/reload effects.
   */
  async () => {
    const { container, active, client } = await setup();
    expect(client.getState().shellReady).toBe(true);
    container.message(active, { type: 'SHELL_STATUS', base, version: current, ready: false }); await settle();
    expect.soft(client.getState()).toEqual({ shellReady: false, waitingVersion: next, applying: false, failed: true });
    expect(container.reload).not.toHaveBeenCalled();
  });

for (const type of ['CLIENT_VERSION', 'SHELL_STATUS']) test(`UPDATE024 ${type}: ordinary replies before a delayed actual Apply acknowledgement cannot reject consent`,
  /** Checks queued native protocol replies after the exact target becomes active.
   * @returns Completion after pending state, exact acknowledgement and one consenting reload.
   */
  async () => {
    const s = await setup(); const target = s.waiting!; target.accepted = null;
    const observed = { outcome: 'pending' };
    const applied = s.client.apply(vi.fn().mockResolvedValue(undefined)).then(
      /** Observes accepted completion without inventing a worker acknowledgement. @returns Nothing. @remarks Records the actual promise outcome. */
      function completed(): void { observed.outcome = 'success'; },
      /** Observes rejected completion without masking assertion failures. @param _error Actual client rejection. @returns Nothing. @remarks Records the actual promise outcome. */
      function failed(_error: unknown): void { observed.outcome = 'failure'; },
    );
    await settle(); target.status = null; s.container.registration.waiting = null;
    s.container.registration.active = target; s.container.controller = target;
    target.transition('activated'); s.container.dispatchEvent(new Event('controllerchange'));
    s.container.message(target, type === 'CLIENT_VERSION'
      ? { type, base, version: current, accepted: true } : { type, base, version: next, ready: true });
    await settle(); expect.soft(observed.outcome).toBe('pending'); expect.soft(s.container.reload).not.toHaveBeenCalled();
    s.container.message(target, { type: 'APPLY_ACCEPTED', base, version: next }); await settle();
    expect.soft(observed.outcome).toBe('success'); expect.soft(s.container.reload).toHaveBeenCalledOnce();
    s.client.close(); await applied;
  });
