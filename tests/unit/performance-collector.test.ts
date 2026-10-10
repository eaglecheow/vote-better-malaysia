import { expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { cdpConditions, collectLab, coldMetrics, createNativeBrowser, pairedTiming, verifyRunner, verifyRenderedResult, type Boundary, type ColdTrace,
  type Fixture, type InteractionKind, type LabBrowser, type ProfileName, type Runner,
  type RunnerObservation, type Session, type VerifiedInput } from '../../scripts/collect-performance.ts';

const hash = 'a'.repeat(64);
const catalogueMarks = [{ name: 'hansard.catalogue-ready', startTime: 400 }];

/** Creates observed fixture timelines with a complete quiet window; not browser evidence.
 * @returns Independent raw metric fixture.
 */
function trace(): ColdTrace {
  return { fcpMs: 100, dclMs: 150, endMs: 7000, lcp: [200, 350], shifts: [],
    tasks: [{ start: 200, duration: 100 }], requests: [{ start: 0, end: 1000 },
      { start: 0, end: 1000 }, { start: 0, end: 1000 }], marks: structuredClone(catalogueMarks),
    observers: ['largest-contentful-paint', 'layout-shift', 'longtask'] };
}

const instrumentationShell = `<!doctype html><html><head><meta charset="utf-8"><title>Collector smoke fixture</title></head><body>
<h1>Controlled collector instrumentation fixture</h1><p id="notice">Initial visible content</p>
<select id="member-select"><option value="1">One</option><option value="2">Two</option></select>
<select id="sitting-select"><option value="3">Three</option></select>
<select id="language-select"><option value="ms">BM</option><option value="en">English</option></select>
<button id="read-button">Read</button>
<section data-member-id="1" data-sitting-id="3" data-result-complete="true" data-outcome="incomplete">
<div data-source-item-id="1" data-kind="turn"><p class="source-text">First\nparagraph.</p></div>
<div data-source-item-id="2" data-kind="gap"><p class="source-text">Missing attribution</p></div>
<div data-source-item-id="3" data-kind="annotation"><p class="source-text">Original note</p></div>
<div data-source-item-id="4" data-kind="turn"><p class="source-text">Last words</p></div></section>
<script>
/* Explicitly synthetic instrumentation smoke; not application source validation. */
performance.mark('hansard.catalogue-ready'); performance.mark('hansard.reader-ready');
/** Changes visible fixture text and completes a post-paint mark pair.
 * @param event Native controlled event.
 * @remarks Mutates the smoke DOM and records synthetic fixture instrumentation.
 */
function change(event) {
  performance.mark('hansard.interaction-start');
  document.querySelector('#notice').textContent = event.target.id + ':' + event.timeStamp;
  if (event.target.id === 'read-button') {
    performance.mark('hansard.processing-start');
    performance.mark('hansard.processing-end');
  }
  requestAnimationFrame(
    /** Waits until the next frame for the smoke mark. */
    function beforePaint() { requestAnimationFrame(
      /** Records the smoke end after a rendered opportunity. */
      function afterPaint() { performance.mark('hansard.interaction-end'); }
    ); }
  );
}
document.querySelector('#read-button').addEventListener('click', change);
document.querySelector('#language-select').addEventListener('change', change);
document.querySelector('#member-select').addEventListener('change', change);
</script></body></html>`;
/** Serves a controlled instrumentation-only HTML shell.
 * @param request Native HTTP request.
 * @param response Native fixture response.
 * @remarks Writes one local test response; no product source or storage behavior is simulated.
 */
function serveInstrumentation(request: IncomingMessage, response: ServerResponse): void {
  void request; response.setHeader('Content-Type', 'text/html'); response.end(instrumentationShell);
}
test('C050 native Chromium observes metrics, UserTiming and actual trace paint on a controlled shell',
  /** Verifies real native collector plumbing without claiming reader/source/performance acceptance.
   * @returns Resolves after native instrumentation assertions and cleanup.
   * @remarks Opens a local fixture HTTP server and one real Chromium process/context.
   * @throws Error if the native fixture listener is unavailable.
   */
  async function nativeInstrumentationSmoke() {
    const server = createServer(serveInstrumentation);
    await new Promise<void>(
      /** Resolves only once the fixture listener is active.
       * @param resolveReady Promise completion callback.
       * @param rejectReady Promise failure callback.
       * @remarks Registers the controlled server-ready callback.
       */
      function waitForListener(resolveReady, rejectReady) { server.once('error', rejectReady); server.listen(0, '127.0.0.1', resolveReady); }
    );
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture listener unavailable');
    let browser: LabBrowser | undefined;
    try {
      const expected = rendered().expected;
      browser = await createNativeBrowser({ baseUrl: `http://127.0.0.1:${address.port}/`, expected: { 'data/sittings/3.json.gz:1': expected },
        contentHashes: { 'index.html': [createHash('sha256').update(instrumentationShell).digest('hex')] } });
      expect(browser).toBeDefined();
      const session = await browser.open('desktop');
      try {
        const observed = await session.cold(); expect(coldMetrics(observed).lcpMs).toBeGreaterThan(0);
        const processed = await session.process(fixture('largest', '3'));
        expect(processed.complete).toBe(true); expect(pairedTiming(processed.marks, 'hansard.processing-start', 'hansard.processing-end')).toBeGreaterThanOrEqual(0);
        const action = await session.interact(fixture('interaction', '3'), 'language');
        expect(action.paintMs).toBeGreaterThanOrEqual(action.marks[0].startTime);
        await expect(session.prepare(fixture('largest', '3'))).rejects.toThrow(/persist|saved|worker/i);
      } finally { await session.close(); }
    } finally { if (browser) await browser.close(); server.close(); }
  }, 30000);
test('C051 native collection rejects a response different from its frozen candidate body',
  /** Verifies a served candidate cannot change between independent verification and a raw run.
   * @returns Resolves after expected native response rejection and cleanup.
   * @remarks Opens a local fixture listener and native Chromium without any accepted lab claim.
   * @throws Error when the fixture listener is unavailable.
   */
  async function changedNativeResponse() {
    const server = createServer(serveInstrumentation);
    await new Promise<void>(
      /** Opens the controlled listener with handled errors.
       * @param done Listener completion callback.
       * @param fail Listener failure callback.
       * @remarks Registers local server callbacks.
       */
      function listen(done, fail) { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture listener unavailable');
    let browser: LabBrowser | undefined;
    try {
      browser = await createNativeBrowser({ baseUrl: `http://127.0.0.1:${address.port}/`, expected: {}, contentHashes: { 'index.html': ['0'.repeat(64)] } });
      const session = await browser.open('desktop');
      try { await expect(session.cold()).rejects.toThrow(/frozen|served/i); } finally { await session.close(); }
    } finally { if (browser) await browser.close(); server.close(); }
  }, 30000);
/** Creates synthetic native host facts for runner validation tests.
 * @returns Hosted runner observation fixture, not an actual machine report.
 */
function host(): RunnerObservation {
  return { platform: 'linux', arch: 'x64', osRelease: 'ID=ubuntu\nVERSION_ID="24.04"\n',
    cpus: ['CPU fixture', 'CPU fixture', 'CPU fixture', 'CPU fixture'], memoryBytes: 15.5 * 1024 ** 3,
    env: { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Linux',
      RUNNER_ARCH: 'X64', ImageOS: 'ubuntu24', ImageVersion: '20261010.1',
      GITHUB_REPOSITORY: 'eaglecheow/vote-better-malaysia' },
    repository: { full_name: 'eaglecheow/vote-better-malaysia', private: false },
    repositoryExpected: 'eaglecheow/vote-better-malaysia', node: '24.21.0',
    tools: { playwright: '1.64.0', vite: '8.3.4' } };
}
/** Creates exact fixture metadata for an independently selected record role.
 * @param dataset Record role.
 * @param id Exact sitting identifier.
 * @returns Synthetic fixture metadata for orchestration only.
 */
function fixture(dataset: Fixture['dataset'], id: string): Fixture {
  return { dataset, path: `data/sittings/${id}.json.gz`, hash, decoded: Number(id) * 100,
    memberId: '1', sittingId: id, hasGaps: id === '3', isLargest: id === '3' };
}
/** Creates mechanical input facts for controlled orchestration, not full archive verification.
 * @returns Verified-boundary fixture with all required roles.
 */
function input(): VerifiedInput {
  return { candidate: { sourceRevision: '1'.repeat(40), applicationFingerprint: hash,
    artifactDigest: hash, snapshotId: 'test-only', fixtureHashes: { 'data/catalogue.json.gz': hash,
      'data/sittings/1.json.gz': hash, 'data/sittings/2.json.gz': hash, 'data/sittings/3.json.gz': hash },
    conditionsDigest: hash, priorServedBaselineDigest: null },
    runner: { label: 'ubuntu-24.04', os: 'Ubuntu 24.04', arch: 'x64', vcpus: 4,
      memoryGiB: 16, memoryBytes: 15.5 * 1024 ** 3, cpu: 'CPU fixture', image: 'fixture',
      node: '24.21.0', browser: '', browserProcesses: 1, concurrentMeasurements: 1,
      tools: { playwright: '1.64.0', vite: '8.3.4' } },
    fixtures: [fixture('median', '1'), fixture('p95', '2'), fixture('largest', '3')],
    interactionFixtures: [fixture('interaction', '3')],
    servedBytes: { 'index.html': 100, 'data/catalogue.json.gz': 200,
      'data/sittings/1.json.gz': 100, 'data/sittings/2.json.gz': 100, 'data/sittings/3.json.gz': 100 },
    reviewedAt: '2026-10-10T05:00:00.000Z' };
}

class FakeBoundary implements Boundary, LabBrowser {
  version = 'Chromium fixture version'; facts = input(); calls: string[] = [];
  failure = ''; malformed = ''; active = 0; maxActive = 0;
  coldSequence: number[] = []; coldIndex = 0;
  /** Supplies explicitly synthetic verified-boundary facts.
   * @returns Fixture facts.
   * @remarks Records the verification call.
   */
  async verify(): Promise<VerifiedInput> { this.calls.push('verify'); return this.facts; }
  /** Supplies a controlled browser boundary.
   * @returns This fixture browser.
   * @remarks Records a launch without creating a real browser process.
   */
  async launch(): Promise<LabBrowser> { this.calls.push('launch'); return this; }
  /** Creates one controlled context/session.
   * @param profile Required lab profile.
   * @returns Fixture session.
   * @remarks Records active sessions for concurrency assertions.
   */
  async open(profile: ProfileName): Promise<Session> {
    this.calls.push(`open:${profile}`); this.active++; this.maxActive = Math.max(this.maxActive, this.active);
    return new FakeSession(this, profile);
  }
  /** Closes the controlled browser boundary.
   * @remarks Records browser cleanup.
   */
  async close(): Promise<void> { this.calls.push('browser-close'); }
}
class FakeSession implements Session {
  owner: FakeBoundary; profile: ProfileName; prepared = false;
  /** Captures the controlled owner and profile.
   * @param owner Call recorder.
   * @param profile Required profile.
   * @remarks Initializes this fixture session.
   */
  constructor(owner: FakeBoundary, profile: ProfileName) { this.owner = owner; this.profile = profile; }
  /** Records a cache-cleared cold operation with raw synthetic observations.
   * @returns Raw observation fixture.
   * @throws Error for an injected operation failure.
   * @remarks Records the controlled operation.
   */
  async cold(): Promise<ColdTrace> {
    this.owner.calls.push(`cold:${this.profile}`);
    if (this.owner.failure === 'cold') throw new Error('injected cold failure');
    const value = trace(); if (this.owner.coldSequence.length) value.lcp = [this.owner.coldSequence[this.owner.coldIndex++ % 20]];
    if (this.owner.malformed === 'cold') value.lcp = []; return value;
  }
  /** Records prepopulation without synthesizing persistence evidence.
   * @param value Exact fixture metadata.
   * @throws Error for an injected save/readiness failure.
   * @remarks Marks this controlled fixture session prepared.
   */
  async prepare(value: Fixture): Promise<void> {
    this.owner.calls.push(`prepare:${this.profile}:${value.sittingId}`);
    if (this.owner.failure === 'prepare') throw new Error('injected prepare failure'); this.prepared = true;
  }
  /** Records an independently warmed close/reopen.
   * @param value Exact matching saved fixture.
   * @returns Synthetic complete-result observations.
   * @throws Error if orchestration did not prepopulate first.
   * @remarks Records the controlled repeat operation.
   */
  async repeat(value: Fixture) {
    if (!this.prepared) throw new Error('repeat without prepopulation');
    this.owner.calls.push(`repeat:${this.profile}:${value.sittingId}`);
    return { marks: [{ name: 'hansard.reader-ready', startTime: 600 }], complete: this.owner.malformed !== 'repeat' };
  }
  /** Records one scripted action with independently specified paint evidence.
   * @param value Fixture whose complete result preceded the action.
   * @param kind Native action category.
   * @returns Synthetic mark and paint observations.
   * @throws Error for an injected action failure.
   * @remarks Records the controlled interaction operation.
   */
  async interact(value: Fixture, kind: InteractionKind) {
    this.owner.calls.push(`interaction:${this.profile}:${kind}:${value.sittingId}`);
    if (this.owner.failure === 'interaction') throw new Error('injected interaction failure');
    return { marks: [{ name: 'hansard.interaction-start', startTime: 100 },
      { name: 'hansard.interaction-end', startTime: 130 }],
      paintMs: this.owner.malformed === 'paint' ? 150 : 120, complete: true };
  }
  /** Records full-processing observations for an exact dataset role.
   * @param value Frozen role fixture.
   * @returns Synthetic completed processing mark pair.
   * @throws Error for an injected processing failure.
   * @remarks Records the controlled processing operation.
   */
  async process(value: Fixture) {
    this.owner.calls.push(`process:${this.profile}:${value.dataset}`);
    if (this.owner.failure === 'process') throw new Error('injected process failure');
    return { complete: this.owner.malformed !== 'process', marks: [
      { name: 'hansard.processing-start', startTime: 100 },
      { name: 'hansard.processing-end', startTime: 140 }] };
  }
  /** Closes this controlled context.
   * @remarks Updates the owner call recorder and active-session count.
   */
  async close(): Promise<void> { this.owner.calls.push('session-close'); this.owner.active--; }
}

test('C001 accepts observed hosted allocation while recording actual memory separately',
  /** Verifies nominal allocation without relabeling observed bytes. */
  function runnerPositive() {
    const runner = verifyRunner(host()); expect(runner.memoryGiB).toBe(16);
    expect(runner.memoryBytes).toBe(15.5 * 1024 ** 3); expect(runner.vcpus).toBe(4);
    expect(runner.image).toBe('20261010.1'); expect(runner.tools.playwright).toBe('1.64.0');
  });
const invalidHosts: Array<[string, keyof RunnerObservation, unknown]> = [
  ['platform', 'platform', 'darwin'], ['arch', 'arch', 'arm64'], ['os', 'osRelease', 'ID=ubuntu\nVERSION_ID="22.04"'],
  ['CPU allocation', 'cpus', ['CPU', 'CPU']], ['memory low', 'memoryBytes', 8 * 1024 ** 3],
  ['memory high', 'memoryBytes', 32 * 1024 ** 3], ['unknown memory', 'memoryBytes', NaN],
  ['Node', 'node', '26.0.0'], ['private repo', 'repository', { full_name: 'eaglecheow/vote-better-malaysia', private: true }],
  ['wrong repo', 'repositoryExpected', 'somewhere/else'], ['unpinned tools', 'tools', { playwright: '', vite: '' }],
  ['heterogeneous CPU', 'cpus', ['a', 'a', 'b', 'a']],
];
for (const [name, field, value] of invalidHosts) test(`C002 rejects ${name}`,
  /** Verifies an independently malformed native host fact fails closed. */
  function invalidHost() {
    const observed = host(); (observed as unknown as Record<string, unknown>)[field] = value;
    expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => verifyRunner(observed)).toThrow();
  });
for (const field of ['GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'ImageOS', 'ImageVersion', 'GITHUB_REPOSITORY']) {
  test(`C003 rejects missing hosted provenance ${field}`,
    /** Verifies absent runner provenance cannot become accepted lab metadata. */
    function absentHostProvenance() { const observed = host(); delete observed.env[field]; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => verifyRunner(observed)).toThrow(); });
}

test('C010 observed TBT uses CPU quiet start after network/CPU overlap and sums blocking portions',
  /** Verifies metric semantics using a known independent timeline. */
  function metricsPositive() { expect(coldMetrics(trace())).toEqual({ lcpMs: 350, cls: 0, tbtMs: 50, ttiMs: 300, coldCatalogueMs: 400 }); });
test('C011 CLS takes largest session, excludes input shifts and separates one-second gaps',
  /** Verifies windowed CLS rather than lifetime addition. */
  function clsSessions() {
    const value = trace(); value.shifts = [{ start: 500, value: .03, hadRecentInput: false },
      { start: 1400, value: .04, hadRecentInput: false }, { start: 2400, value: .1, hadRecentInput: false },
      { start: 2500, value: .9, hadRecentInput: true }]; expect(coldMetrics(value).cls).toBe(.1);
  });
test('C012 CLS opens a new session at five seconds despite shorter consecutive gaps',
  /** Verifies the maximum session-window lifetime. */
  function clsFiveSeconds() {
    const value = trace(); for (let index = 0; index < 8; index++) value.shifts.push({ start: 500 + index * 900, value: .01, hadRecentInput: false });
    expect(coldMetrics(value).cls).toBeCloseTo(.06);
  });
test('C013 legitimate observed zero TBT requires observers and a real quiet window',
  /** Verifies empty long-task observations may represent measured zero. */
  function measuredZero() { const value = trace(); value.tasks = []; expect(coldMetrics(value).tbtMs).toBe(0); expect(coldMetrics(value).ttiMs).toBe(150); });
test('C014 a task straddling FCP counts only its post-50ms blocking portion',
  /** Verifies clipping to the FCP-through-TTI interval. */
  function clippedBlocking() { const value = trace(); value.tasks = [{ start: 80, duration: 100 }]; expect(coldMetrics(value).tbtMs).toBe(50); });
for (const field of ['fcpMs', 'dclMs', 'endMs'] as const) test(`C015 rejects missing/invalid ${field}`,
  /** Verifies a missing timing is never replaced with zero. */
  function missingLoadMetric() { const value = trace(); value[field] = NaN; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
for (const name of ['largest-contentful-paint', 'layout-shift', 'longtask']) test(`C016 rejects missing observer ${name}`,
  /** Verifies unavailable metric observers fail rather than fabricate zeros. */
  function missingObserver() { const value = trace(); value.observers.splice(value.observers.indexOf(name), 1); expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
test('C017 rejects absent LCP and absent catalogue mark',
  /** Verifies missing native and product readiness observations fail. */
  function missingReady() { const value = trace(); value.lcp = []; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); value.lcp = [350]; value.marks = []; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
test('C018 rejects a trace too short to observe five seconds of quiet',
  /** Verifies trace collection cannot end at controls-ready. */
  function noQuietWindow() { const value = trace(); value.endMs = 4000; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
test('C019 more than two active unfinished requests prevent network quiet',
  /** Verifies pending network activity is not omitted from readiness computation. */
  function unfinishedNetwork() { const value = trace(); for (const request of value.requests) request.end = null; expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
test('C020 late long tasks reset quiet observation',
  /** Verifies a CPU interruption prevents an earlier false quiet interval. */
  function lateTask() { const value = trace(); value.tasks.push({ start: 4000, duration: 100 }); expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => coldMetrics(value)).toThrow(); });
test('C021 paired marks retain exact elapsed time',
  /** Verifies complete chronological User Timing pairs. */
  function pairPositive() { expect(pairedTiming([{ name: 'a', startTime: 10 }, { name: 'b', startTime: 30 }], 'a', 'b')).toBe(20); });
for (const marks of [[], [{ name: 'a', startTime: 10 }], [{ name: 'a', startTime: 30 }, { name: 'b', startTime: 10 }],
  [{ name: 'a', startTime: 10 }, { name: 'a', startTime: 20 }, { name: 'b', startTime: 30 }],
  [{ name: 'a', startTime: NaN }, { name: 'b', startTime: 30 }]]) test('C022 rejects missing/duplicate/reversed/invalid mark pairs',
    /** Verifies incomplete or ambiguous processing cannot yield a duration. */
    function invalidPair() { expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => pairedTiming(marks, 'a', 'b')).toThrow(); });

test('C030 orchestrates twenty independent cold/repeat/actions and each processing role for both profiles',
  /** Verifies serial orchestration and checker-compatible raw output with injected fixtures.
   * @returns Resolves after all controlled assertions.
   */
  async function orchestrationPositive() {
    const boundary = new FakeBoundary(); const report = await collectLab(boundary);
    expect(boundary.calls.slice(0, 2)).toEqual(['verify', 'launch']); expect(boundary.maxActive).toBe(1);
    expect(boundary.calls.filter(isOpen)).toHaveLength(84); expect(boundary.calls.filter(isClose)).toHaveLength(84);
    expect(boundary.calls.at(-1)).toBe('browser-close'); expect(report.scope).toBe('laboratory-only');
    expect(report.runner.browser).toBe(boundary.version); expect(report.profiles).toHaveLength(2);
    for (const profile of report.profiles) {
      for (const field of ['lcpMs', 'cls', 'tbtMs', 'coldCatalogueMs', 'repeatReaderMs', 'interactionMs'] as const) expect(profile[field]).toHaveLength(20);
      expect(profile.interactionKinds).toEqual(['selection', 'language', 'read']);
      expect(profile.interactionMs).toEqual(Array(20).fill(20));
      expect(profile.processing).toHaveLength(3); for (const dataset of profile.processing) expect(dataset.ms).toEqual(Array(20).fill(40));
      expect(boundary.calls.filter(hasCold.bind(null, profile.profile))).toHaveLength(20);
      expect(boundary.calls.filter(hasRepeat.bind(null, profile.profile))).toHaveLength(20);
      expect(profile).toMatchObject(profile.profile === 'mobile' ? { viewport: [390, 844], downloadKbps: 1600, uploadKbps: 750, rttMs: 150, cpuSlowdown: 4 }
        : { viewport: [1440, 900], downloadKbps: 10000, uploadKbps: 2000, rttMs: 40, cpuSlowdown: 1 });
    }
    expect(report.raw).toHaveLength(240); expect(report.candidate).toEqual(boundary.facts.candidate);
    expect(report.servedBytes).toEqual(boundary.facts.servedBytes);
  });
/** Recognizes a recorded open.
 * @param value Recorded operation.
 * @returns Whether a new independent context was created.
 */
function isOpen(value: string): boolean { return value.startsWith('open:'); }
/** Recognizes a recorded context close.
 * @param value Recorded operation.
 * @returns Whether a context was closed.
 */
function isClose(value: string): boolean { return value === 'session-close'; }
/** Matches a recorded cold operation for one profile.
 * @param profile Required profile.
 * @param value Recorded operation.
 * @returns Whether the operation matches.
 */
function hasCold(profile: string, value: string): boolean { return value === `cold:${profile}`; }
/** Matches a recorded repeat operation for one profile.
 * @param profile Required profile.
 * @param value Recorded operation.
 * @returns Whether the operation matches.
 */
function hasRepeat(profile: string, value: string): boolean { return value.startsWith(`repeat:${profile}:`); }
for (const failure of ['cold', 'prepare', 'interaction', 'process']) test(`C031 cleans up and rejects ${failure} failure`,
  /** Verifies failed operations cannot publish partial successful reports.
   * @returns Resolves after expected rejection and cleanup.
   */
  async function operationFailure() {
    const boundary = new FakeBoundary(); boundary.failure = failure;
    await expect(collectLab(boundary)).rejects.toThrow(); expect(boundary.active).toBe(0); expect(boundary.calls.at(-1)).toBe('browser-close');
  });
for (const malformed of ['cold', 'repeat', 'process', 'paint']) test(`C032 rejects incomplete or invalid ${malformed} observations`,
  /** Verifies invalid injected observations fail before a lab report is returned.
   * @returns Resolves after expected rejection.
   */
  async function observationFailure() { const boundary = new FakeBoundary(); boundary.malformed = malformed; await expect(collectLab(boundary)).rejects.toThrow(); });
for (const missing of ['role', 'hash', 'gaps', 'largest', 'served', 'candidate']) test(`C033 validates frozen input ${missing} before browser launch`,
  /** Verifies the orchestration contract rejects incomplete candidate metadata.
   * @returns Resolves after expected rejection.
   */
  async function invalidInputs() {
    const boundary = new FakeBoundary();
    if (missing === 'role') boundary.facts.fixtures.pop();
    if (missing === 'hash') boundary.facts.fixtures[0].hash = 'b'.repeat(64);
    if (missing === 'gaps') boundary.facts.interactionFixtures[0].hasGaps = false;
    if (missing === 'largest') boundary.facts.interactionFixtures[0].isLargest = false;
    if (missing === 'served') delete boundary.facts.servedBytes['data/sittings/1.json.gz'];
    if (missing === 'candidate') boundary.facts.candidate.sourceRevision = '';
    await expect(collectLab(boundary)).rejects.toThrow(); expect(boundary.calls).toEqual(['verify']);
  });
test('C040 CLI without a frozen candidate fails closed',
  /** Verifies no CLI defaults fabricate complete lab evidence.
   * @remarks Spawns the inert/implemented collector subprocess.
   */
  function missingCliInputs() {
    const result = spawnSync(process.execPath, [resolve('scripts/collect-performance.ts')], { encoding: 'utf8' });
    expect(result.status).toBe(1); expect(result.stderr).toMatch(/artifact|candidate|collection/i);
  });
test('C034 records exact nearest-rank p75/p95 summaries alongside independent raw runs',
  /** Verifies descriptive percentile output without substituting aggregate-only evidence.
   * @returns Resolves after controlled summaries and all raw counts are asserted.
   * @remarks Configures only the synthetic boundary's varying cold observations.
   */
  async function percentileSummaries() {
    const boundary = new FakeBoundary(); for (let index = 0; index < 20; index++) boundary.coldSequence.push(400 - index * 10);
    const report = await collectLab(boundary);
    for (const profile of report.profiles) expect(profile.percentiles).toEqual({ lcpMs: 350, cls: 0, tbtMs: 50,
      coldCatalogueMs: 400, repeatReaderMs: 600, interactionMs: 20, processing: { median: 40, p95: 40, largest: 40 } });
    expect(report.raw).toHaveLength(240);
  });
test('C041 CLI refuses substituted local/self-hosted provenance as the specified runner',
  /** Verifies local measurements cannot acquire the GitHub runner label on any test host.
   * @remarks Spawns a subprocess with complete argument names but no real measurement evidence.
   */
  function localRunnerRejected() {
    const result = spawnSync(process.execPath, [resolve('scripts/collect-performance.ts'), '--artifact', '/private/tmp/collector-artifact',
      '--candidate', '/private/tmp/collector-candidate.json', '--fixtures', '/private/tmp/collector-fixtures.json',
      '--url', 'http://127.0.0.1:4173/vote-better-malaysia/', '--output', '/private/tmp/collector-result.json'],
      { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'false', RUNNER_ENVIRONMENT: 'self-hosted' } });
    expect(result.status).toBe(1); expect(result.stderr).toMatch(/runner|Linux|hosted/i);
  });
test('C042 converts decimal Kbps to CDP bytes per second without changing RTT',
  /** Verifies browser network emulation units for both exact profiles. */
  function decimalThroughput() {
    expect(cdpConditions('mobile')).toEqual({ offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    expect(cdpConditions('desktop')).toEqual({ offline: false, latency: 40, downloadThroughput: 1250000, uploadThroughput: 250000 });
  });
/** Creates complete expected/actual DOM partition fixtures without source-coverage claims.
 * @returns Independent source-text and category expectations.
 */
function rendered() {
  const expected = { memberId: '1', sittingId: '3', outcome: 'incomplete', items: [
    { ordinal: '1', kind: 'turn', text: 'First\nparagraph.' }, { ordinal: '2', kind: 'gap', text: 'Missing attribution' },
    { ordinal: '3', kind: 'annotation', text: 'Original note' }, { ordinal: '4', kind: 'turn', text: 'Last words' }] };
  const actual = { ...structuredClone(expected), complete: 'true' }; return { expected, actual };
}
test('C043 validates every exact rendered turn/gap/annotation preserving original text',
  /** Verifies complete source-result DOM validation independently of readiness marks. */
  function completeRendered() { const { expected, actual } = rendered(); expect(verifyRenderedResult(actual, expected)).toBe(true); });
test('C045 permits separate gap/annotation sections while preserving each partition order',
  /** Verifies source partitions need not be interleaved across separate detail sections.
   * @remarks Rearranges only this controlled rendered-fixture array.
   */
  function separatelyRenderedPartitions() {
    const { expected, actual } = rendered(); actual.items = [actual.items[0], actual.items[3], actual.items[1], actual.items[2]];
    expect(verifyRenderedResult(actual, expected)).toBe(true);
  });
for (const missing of ['member', 'sitting', 'complete', 'outcome', 'turn', 'gap', 'annotation', 'text', 'duplicate', 'order']) {
  test(`C044 rejects rendered result ${missing}`,
    /** Verifies no mark/boolean can substitute for complete exact source content.
     * @remarks Changes only this controlled rendered-fixture object.
     */
    function incompleteRendered() {
      const { expected, actual } = rendered();
      if (missing === 'member') actual.memberId = '2'; if (missing === 'sitting') actual.sittingId = '4';
      if (missing === 'complete') actual.complete = 'false'; if (missing === 'outcome') actual.outcome = 'ready';
      if (missing === 'turn') actual.items.shift(); if (missing === 'gap') actual.items.splice(1, 1);
      if (missing === 'annotation') actual.items.splice(2, 1); if (missing === 'text') actual.items[0].text = 'First paragraph.';
      if (missing === 'duplicate') actual.items.push(structuredClone(actual.items[0]));
      if (missing === 'order') [actual.items[0], actual.items[3]] = [actual.items[3], actual.items[0]];
      expect(/** Runs the invalid fixture through its measured trust boundary.
     * @returns Boundary result, if erroneously accepted.
     */ () => verifyRenderedResult(actual, expected)).toThrow();
    });
}
