import { isCandidate, type DocumentationCandidate } from './check-documentation.ts';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page, type Response } from '@playwright/test';
import { cpus, totalmem } from 'node:os';
import { readFile, writeFile, rename, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, join, dirname } from 'node:path';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { gunzipSync, createGunzip, createBrotliDecompress } from 'node:zlib';
import { measureArtifact, type ArtifactSizes } from './check-performance.ts';
import { buildTranscriptResult, validateCatalogue, validateSittingRecord, DATA_LIMITS, type Catalogue, type TranscriptResult } from '../src/source.ts';

export type ProfileName = 'mobile' | 'desktop';
export type Dataset = 'median' | 'p95' | 'largest';
export type InteractionKind = 'selection' | 'language' | 'read';
export interface Mark { name: string; startTime: number }
export interface Task { start: number; duration: number }
export interface Shift { start: number; value: number; hadRecentInput: boolean }
export interface NetworkRequest { start: number; end: number | null }
export interface ServedResource { url: string; encodedBodyBytes: number; decodedBodyBytes: number; transferBytes: number }
export interface ColdTrace {
  fcpMs: number; dclMs: number; endMs: number; lcp: number[]; shifts: Shift[];
  tasks: Task[]; requests: NetworkRequest[]; marks: Mark[]; observers: string[]; servedResources?: ServedResource[];
}
export interface Fixture {
  dataset: Dataset | 'interaction'; path: string; hash: string; decoded: number;
  memberId: string; sittingId: string; hasGaps: boolean; isLargest: boolean;
}
export interface RunnerObservation {
  platform: string; arch: string; osRelease: string; cpus: string[]; memoryBytes: number;
  env: Record<string, string | undefined>; repository: { full_name: string; private: boolean };
  node: string; tools: { playwright: string; vite: string }; repositoryExpected: string;
}
export interface Runner {
  label: string; os: string; arch: string; vcpus: number; memoryGiB: number; memoryBytes: number;
  cpu: string; image: string; node: string; browser: string; browserProcesses: 1;
  concurrentMeasurements: 1; tools: { playwright: string; vite: string };
}
export interface VerifiedInput {
  candidate: DocumentationCandidate; runner: Runner; fixtures: Fixture[];
  interactionFixtures: Fixture[]; servedBytes: Record<string, number>; reviewedAt: string;
}
export interface TimedResult { marks: Mark[]; complete: boolean; servedResources?: ServedResource[] }
export interface InteractionObservation extends TimedResult { paintMs: number }
export interface Session {
  cold(): Promise<ColdTrace>;
  prepare(fixture: Fixture): Promise<void>;
  repeat(fixture: Fixture): Promise<TimedResult>;
  interact(fixture: Fixture, kind: InteractionKind): Promise<InteractionObservation>;
  process(fixture: Fixture): Promise<TimedResult>;
  close(): Promise<void>;
}
export interface LabBrowser {
  version: string; open(profile: ProfileName): Promise<Session>; close(): Promise<void>;
}
export interface Boundary { verify(): Promise<VerifiedInput>; launch(): Promise<LabBrowser> }
export interface Profile {
  profile: ProfileName; viewport: number[]; downloadKbps: number; uploadKbps: number;
  rttMs: number; cpuSlowdown: number; coldCacheCleared: boolean; repeatPrepopulated: boolean;
  completeValidatedResults: boolean; interactionKinds: InteractionKind[];
  lcpMs: number[]; cls: number[]; tbtMs: number[]; coldCatalogueMs: number[];
  repeatReaderMs: number[]; interactionMs: number[];
  processing: Array<{ dataset: Dataset; fixturePath: string; fixtureHash: string; ms: number[] }>;
  percentiles?: { lcpMs: number; cls: number; tbtMs: number; coldCatalogueMs: number;
    repeatReaderMs: number; interactionMs: number; processing: Record<Dataset, number> };
}
export interface LabResult {
  candidate: DocumentationCandidate; reviewedAt: string; runner: Runner;
  servedBytes: Record<string, number>; profiles: Profile[];
  raw: Array<{ profile: ProfileName; operation: string; run: number; observation: unknown }>;
  scope: 'laboratory-only';
}
export interface RenderedItem { ordinal: string; kind: string; text: string }
export interface RenderedResult { memberId: string | null; sittingId: string | null; complete: string | null;
  outcome: string | null; items: RenderedItem[] }
export interface ExpectedResult { memberId: string; sittingId: string; outcome: string;
  items: Array<{ ordinal: string; kind: string; text: string }> }
export interface NativeOptions { baseUrl: string; expected: Record<string, ExpectedResult>; contentHashes?: Record<string, string[]> }
/** Creates one pinned native Chromium process without assigning any runner/device claim.
 * @param options Fixed served URL and independently derived complete expected results.
 * @returns Native browser implementation for serial lab sessions.
 * @remarks Launches Chromium; the caller must close the returned browser.
 */
export async function createNativeBrowser(options: NativeOptions): Promise<LabBrowser> {
  const browser = await chromium.launch({ headless: true }); return new NativeBrowser(browser, options);
}
/** Verifies every selected source partition as exact original text and ordinal order.
 * @param actual Native DOM extraction.
 * @param expected Complete independently derived source result.
 * @returns True only for the matching complete rendered result.
 * @throws Error for wrong pair/outcome, missing/extra/reordered leaves or changed text.
 */
export function verifyRenderedResult(actual: RenderedResult, expected: ExpectedResult): true {
  requireValue(actual.memberId === expected.memberId && actual.sittingId === expected.sittingId
    && actual.complete === 'true' && actual.outcome === expected.outcome, 'complete matching rendered result required');
  requireValue(actual.items.length === expected.items.length, 'complete source leaf count required');
  for (const kind of ['turn', 'gap', 'annotation']) {
    const supplied: RenderedItem[] = []; const wanted: RenderedItem[] = [];
    for (const item of actual.items) if (item.kind === kind) supplied.push(item);
    for (const item of expected.items) if (item.kind === kind) wanted.push(item);
    requireValue(JSON.stringify(supplied) === JSON.stringify(wanted), 'complete ordered source turns/gaps/annotations and exact text required');
  }
  return true;
}
/** Converts the two fixed decimal network profiles into CDP bytes per second.
 * @param profile Required lab profile.
 * @returns Exact CDP network conditions.
 */
export function cdpConditions(profile: ProfileName): { offline: boolean; latency: number; downloadThroughput: number; uploadThroughput: number } {
  return profile === 'mobile' ? { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 }
    : { offline: false, latency: 40, downloadThroughput: 1250000, uploadThroughput: 250000 };
}

/** Rejects substituted machines before assigning the plan's nominal hosted allocation.
 * @param observation Native host facts.
 * @returns Exact accepted nominal allocation and separately observed native facts.
 * @throws Error for missing/mismatched host, repository, image or tool facts.
 */
export function verifyRunner(observation: RunnerObservation): Runner {
  const { env, repository, cpus, memoryBytes } = observation;
  requireValue(observation.platform === 'linux' && observation.arch === 'x64'
    && /^ID=ubuntu$/m.test(observation.osRelease) && /^VERSION_ID="?24\.04"?$/m.test(observation.osRelease), 'Linux Ubuntu 24.04 x64 runner required');
  requireValue(env.GITHUB_ACTIONS === 'true' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.RUNNER_OS === 'Linux' && env.RUNNER_ARCH === 'X64' && env.ImageOS === 'ubuntu24'
    && nonempty(env.ImageVersion), 'verified GitHub-hosted ubuntu-24.04 image required');
  requireValue(repository.private === false && repository.full_name === observation.repositoryExpected
    && env.GITHUB_REPOSITORY === observation.repositoryExpected, 'public expected GitHub repository runner required');
  requireValue(cpus.length === 4 && nonempty(cpus[0]) && cpus.every(sameCpu.bind(null, cpus[0])), 'four homogeneous observed vCPUs required');
  requireValue(Number.isFinite(memoryBytes) && memoryBytes >= 15 * 1024 ** 3 && memoryBytes <= 17 * 1024 ** 3, 'observed hosted memory must corroborate nominal 16 GiB allocation');
  requireValue(/^24\./.test(observation.node) && nonempty(observation.tools.playwright) && nonempty(observation.tools.vite), 'Node 24 and pinned tool versions required');
  return { label: 'ubuntu-24.04', os: 'Ubuntu 24.04', arch: 'x64', vcpus: 4, memoryGiB: 16,
    memoryBytes, cpu: cpus[0], image: env.ImageVersion!, node: observation.node, browser: '',
    browserProcesses: 1, concurrentMeasurements: 1, tools: { ...observation.tools } };
}
/** Requires one exact chronological product mark pair without synthetic timing fallback.
 * @param marks Observed User Timing entries.
 * @param start Required start mark.
 * @param end Required end mark.
 * @returns Observed elapsed milliseconds.
 * @throws Error for absent/duplicate/invalid/reversed marks.
 */
export function pairedTiming(marks: Mark[], start: string, end: string): number {
  const from = oneMark(marks, start); const to = oneMark(marks, end);
  requireValue(to >= from, 'chronological User Timing pair required'); return to - from;
}
/** Computes observed LCP, windowed CLS and FCP-to-observed-TTI blocking time.
 * @param trace Observed load and native network timeline.
 * @returns Native cold metrics and User Timing catalogue readiness.
 * @throws Error for unavailable observations or no five-second CPU/network quiet window.
 */
export function coldMetrics(trace: ColdTrace): { lcpMs: number; cls: number; tbtMs: number; ttiMs: number; coldCatalogueMs: number } {
  for (const kind of ['largest-contentful-paint', 'layout-shift', 'longtask']) requireValue(trace.observers.includes(kind), `missing ${kind} observer`);
  for (const value of [trace.fcpMs, trace.dclMs, trace.endMs]) requireValue(Number.isFinite(value) && value > 0, 'valid observed FCP/DCL/end required');
  requireValue(trace.endMs >= trace.fcpMs && trace.endMs >= trace.dclMs && trace.lcp.length > 0, 'complete observed load/LCP required');
  let previous = 0; for (const lcp of trace.lcp) { requireValue(Number.isFinite(lcp) && lcp > 0 && lcp >= previous && lcp <= trace.endMs, 'valid ordered native LCP required'); previous = lcp; }
  const tasks: Task[] = [];
  for (const task of trace.tasks) { finite(task.start, 'task start'); finite(task.duration, 'task duration'); requireValue(task.start + task.duration <= trace.endMs, 'task outside observation'); if (task.duration >= 50) tasks.push({ ...task }); }
  tasks.sort(orderTasks);
  const cpuBusy: Interval[] = []; for (const task of tasks) cpuBusy.push({ start: task.start, end: task.start + task.duration });
  const networkEvents: Array<{ time: number; delta: number }> = [];
  for (const request of trace.requests) {
    finite(request.start, 'network start'); requireValue(request.start <= trace.endMs, 'network start outside observation');
    const end = request.end === null ? trace.endMs : request.end; finite(end, 'network end');
    requireValue(end >= request.start && end <= trace.endMs, 'network timeline invalid');
    networkEvents.push({ time: request.start, delta: 1 }, { time: end, delta: -1 });
  }
  networkEvents.sort(orderNetwork); let active = 0; let busyStart = 0; const networkBusy: Interval[] = [];
  for (const event of networkEvents) {
    const wasBusy = active > 2; active += event.delta;
    if (!wasBusy && active > 2) busyStart = event.time;
    if (wasBusy && active <= 2) networkBusy.push({ start: busyStart, end: event.time });
  }
  const cpuQuiet = quietPeriods(cpuBusy, trace.endMs); const networkQuiet = quietPeriods(networkBusy, trace.endMs);
  let ttiMs: number | undefined;
  for (const cpu of cpuQuiet) {
    for (const network of networkQuiet) {
      const overlapStart = Math.max(cpu.start, network.start, trace.fcpMs, trace.dclMs);
      if (Math.min(cpu.end, network.end) - overlapStart >= 5000) { ttiMs = Math.max(cpu.start, trace.fcpMs, trace.dclMs); break; }
    }
    if (ttiMs !== undefined) break;
  }
  requireValue(ttiMs !== undefined, 'no observed five-second CPU/network quiet window');
  let tbtMs = 0; for (const task of tasks) tbtMs += Math.max(0, Math.min(task.start + task.duration, ttiMs) - Math.max(task.start + 50, trace.fcpMs));
  let cls = 0; let sum = 0; let sessionStart = -Infinity; let last = -Infinity;
  const shifts = [...trace.shifts]; shifts.sort(orderShifts);
  for (const shift of shifts) {
    finite(shift.start, 'layout shift start'); finite(shift.value, 'layout shift value'); requireValue(shift.start <= trace.endMs && typeof shift.hadRecentInput === 'boolean', 'layout shift observation invalid');
    if (shift.hadRecentInput) continue;
    if (shift.start - last >= 1000 || shift.start - sessionStart >= 5000) { sessionStart = shift.start; sum = 0; }
    sum += shift.value; last = shift.start; cls = Math.max(cls, sum);
  }
  const coldCatalogueMs = oneMark(trace.marks, 'hansard.catalogue-ready'); requireValue(coldCatalogueMs <= trace.endMs, 'catalogue mark outside trace');
  return { lcpMs: previous, cls, tbtMs, ttiMs, coldCatalogueMs };
}
/** Collects every required raw lab run serially with cleanup and no partial success output.
 * @param boundary Injectable verified-host and native-browser operations.
 * @returns Checker-compatible laboratory subset; devices/field/publication are separate.
 * @remarks Calls injected verification/browser/session operations and closes contexts/browser.
 * @throws Error for invalid frozen input, failed operations or incomplete native observations.
 */
export async function collectLab(boundary: Boundary): Promise<LabResult> {
  const input = await boundary.verify(); verifyInput(input);
  const browser = await boundary.launch(); requireValue(nonempty(browser.version), 'actual browser version required');
  const result: LabResult = { candidate: input.candidate, reviewedAt: input.reviewedAt,
    runner: { ...input.runner, browser: browser.version }, servedBytes: { ...input.servedBytes }, profiles: [], raw: [], scope: 'laboratory-only' };
  try {
    for (const name of ['mobile', 'desktop'] as const) {
      const mobile = name === 'mobile'; const profile: Profile = { profile: name, viewport: mobile ? [390, 844] : [1440, 900],
        downloadKbps: mobile ? 1600 : 10000, uploadKbps: mobile ? 750 : 2000, rttMs: mobile ? 150 : 40,
        cpuSlowdown: mobile ? 4 : 1, coldCacheCleared: true, repeatPrepopulated: true, completeValidatedResults: true,
        interactionKinds: ['selection', 'language', 'read'], lcpMs: [], cls: [], tbtMs: [], coldCatalogueMs: [], repeatReaderMs: [], interactionMs: [], processing: [] };
      for (let run = 0; run < 20; run++) {
        const session = await browser.open(name);
        try { const observation = await session.cold(); const metrics = coldMetrics(observation);
          profile.lcpMs.push(metrics.lcpMs); profile.cls.push(metrics.cls); profile.tbtMs.push(metrics.tbtMs); profile.coldCatalogueMs.push(metrics.coldCatalogueMs);
          result.raw.push({ profile: name, operation: 'cold', run, observation });
        } finally { await session.close(); }
      }
      const largest = input.fixtures[2];
      for (let run = 0; run < 20; run++) {
        const session = await browser.open(name);
        try { await session.prepare(largest); const observation = await session.repeat(largest);
          requireValue(observation.complete, 'complete persisted matching repeat result required');
          profile.repeatReaderMs.push(oneMark(observation.marks, 'hansard.reader-ready'));
          result.raw.push({ profile: name, operation: 'repeat', run, observation });
        } finally { await session.close(); }
      }
      const interactions = await browser.open(name);
      try {
        for (let run = 0; run < 20; run++) {
          const fixture = input.interactionFixtures[run % input.interactionFixtures.length];
          const kind = profile.interactionKinds[run % 3]; const observation = await interactions.interact(fixture, kind);
          requireValue(observation.complete, 'complete long/gap fixture before interaction required');
          pairedTiming(observation.marks, 'hansard.interaction-start', 'hansard.interaction-end');
          const start = oneMark(observation.marks, 'hansard.interaction-start'); const end = oneMark(observation.marks, 'hansard.interaction-end');
          requireValue(Number.isFinite(observation.paintMs) && observation.paintMs >= start && observation.paintMs <= end, 'actual trace paint between interaction marks required');
          profile.interactionMs.push(observation.paintMs - start); result.raw.push({ profile: name, operation: `interaction:${kind}`, run, observation });
        }
      } finally { await interactions.close(); }
      const processing = await browser.open(name);
      try {
        for (const fixture of input.fixtures) {
          const dataset = { dataset: fixture.dataset as Dataset, fixturePath: fixture.path, fixtureHash: fixture.hash, ms: [] as number[] };
          for (let run = 0; run < 20; run++) {
            const observation = await processing.process(fixture); requireValue(observation.complete, 'complete validated processing result required');
            dataset.ms.push(pairedTiming(observation.marks, 'hansard.processing-start', 'hansard.processing-end'));
            result.raw.push({ profile: name, operation: `processing:${fixture.dataset}`, run, observation });
          }
          profile.processing.push(dataset);
        }
      } finally { await processing.close(); }
      const processingSummary = {} as Record<Dataset, number>;
      for (const dataset of profile.processing) processingSummary[dataset.dataset] = nearestRank(dataset.ms, .95);
      profile.percentiles = { lcpMs: nearestRank(profile.lcpMs, .75), cls: nearestRank(profile.cls, .75), tbtMs: nearestRank(profile.tbtMs, .75),
        coldCatalogueMs: nearestRank(profile.coldCatalogueMs, .95), repeatReaderMs: nearestRank(profile.repeatReaderMs, .95),
        interactionMs: nearestRank(profile.interactionMs, .95), processing: processingSummary };
      result.profiles.push(profile);
    }
    return result;
  } finally { await browser.close(); }
}

interface Interval { start: number; end: number }
/** Computes the plan's descriptive nearest-rank summary without dropping raw observations.
 * @param values Exactly twenty raw observations.
 * @param rank Required p75 or p95 fraction.
 * @returns Exact nearest-rank observation.
 * @throws Error for missing/invalid raw runs.
 */
function nearestRank(values: number[], rank: .75 | .95): number {
  requireValue(values.length === 20, 'exactly twenty raw observations required');
  for (const value of values) finite(value, 'raw percentile observation');
  const sorted = [...values]; sorted.sort(orderNumbers); return sorted[Math.ceil(20 * rank) - 1];
}
/** Orders raw measurements numerically without mutating source arrays.
 * @param left First measurement.
 * @param right Second measurement.
 * @returns Numeric ordering.
 */
function orderNumbers(left: number, right: number): number { return left - right; }
/** Rejects an unsatisfied measured prerequisite.
 * @param condition Required assertion.
 * @param message Failure context.
 * @returns Narrows the accepted assertion.
 * @throws Error for an unsatisfied prerequisite.
 */
function requireValue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
/** Recognizes recorded nonempty metadata.
 * @param value Native metadata.
 * @returns Whether meaningful metadata is present.
 */
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
/** Checks homogeneous CPU names.
 * @param expected Native first CPU model.
 * @param actual Current CPU model.
 * @returns Whether the CPU model matches.
 */
function sameCpu(expected: string, actual: string): boolean { return expected === actual; }
/** Requires finite nonnegative raw measurements.
 * @param value Measured number.
 * @param label Measurement context.
 * @throws Error for invalid measurements.
 */
function finite(value: number, label: string): void { requireValue(Number.isFinite(value) && value >= 0, `${label}: finite nonnegative observation required`); }
/** Requires a single named observed mark.
 * @param marks Native User Timing entries.
 * @param name Required name.
 * @returns Observed navigation-relative milliseconds.
 * @throws Error for absent/duplicate/invalid observations.
 */
function oneMark(marks: Mark[], name: string): number {
  const found: Mark[] = []; for (const mark of marks) if (mark.name === name) found.push(mark);
  requireValue(found.length === 1, `one exact ${name} mark required`); finite(found[0].startTime, name); return found[0].startTime;
}
/** Orders CPU intervals chronologically.
 * @param a First interval.
 * @param b Second interval.
 * @returns Start ordering.
 */
function orderTasks(a: Task, b: Task): number { return a.start - b.start; }
/** Orders layout observations chronologically.
 * @param a First shift.
 * @param b Second shift.
 * @returns Start ordering.
 */
function orderShifts(a: Shift, b: Shift): number { return a.start - b.start; }
/** Orders simultaneous network completions before new starts.
 * @param a First event.
 * @param b Second event.
 * @returns Time/delta ordering.
 */
function orderNetwork(a: { time: number; delta: number }, b: { time: number; delta: number }): number { return a.time - b.time || a.delta - b.delta; }
/** Finds quiet periods from sorted or overlapping observed busy intervals.
 * @param busy Observed busy intervals.
 * @param end Observed trace end.
 * @returns Complement intervals through the actual observation end.
 */
function quietPeriods(busy: Interval[], end: number): Interval[] {
  const result: Interval[] = []; let cursor = 0;
  for (const interval of busy) { if (interval.start > cursor) result.push({ start: cursor, end: interval.start }); cursor = Math.max(cursor, interval.end); }
  if (cursor < end) result.push({ start: cursor, end }); return result;
}
/** Verifies the frozen mechanical contract before any browser launch.
 * @param input Independently verified host/artifact boundary output.
 * @throws Error for incomplete candidate roles/hashes/interaction/served-byte evidence.
 */
function verifyInput(input: VerifiedInput): void {
  requireValue(isCandidate(input.candidate) && input.fixtures.length === 3, 'frozen candidate and three dataset roles required');
  for (let index = 0; index < 3; index++) {
    const fixture = input.fixtures[index]; requireValue(fixture.dataset === ['median', 'p95', 'largest'][index], 'ordered median/p95/largest roles required');
    requireValue(fixture.hash === input.candidate.fixtureHashes[fixture.path] && fixture.path === `data/sittings/${fixture.sittingId}.json.gz`
      && /^[1-9]\d*$/.test(fixture.memberId), 'exact frozen fixture path/hash/identity required');
  }
  let gaps = false; let largest = false;
  for (const fixture of input.interactionFixtures) {
    requireValue(fixture.hash === input.candidate.fixtureHashes[fixture.path], 'frozen interaction fixture hash required');
    gaps ||= fixture.hasGaps; largest ||= fixture.isLargest;
  }
  requireValue(gaps && largest, 'long/largest and attribution-gap interaction fixtures required');
  requireValue('index.html' in input.servedBytes && 'data/catalogue.json.gz' in input.candidate.fixtureHashes, 'actual served shell/catalogue required');
  for (const path of Object.keys(input.candidate.fixtureHashes)) { requireValue(path in input.servedBytes, 'actual served fixture bytes required'); finite(input.servedBytes[path], 'served bytes'); }
}

interface ObservationState { observers: string[]; lcp: number[]; shifts: Shift[]; tasks: Task[]; savedReady: boolean }
declare global { interface Window { __hansardLabObservation: ObservationState } }
interface TraceEvent { name: string; ts: number; pid: number; tid: number }
interface NativeRequest { start: number; end: number | null }

/** Installs collector-owned browser observers before production scripts execute.
 * @remarks Adds only measurement state/observers to the page; no product fixture API.
 */
function installObservers(): void {
  const state: ObservationState = { observers: [], lcp: [], shifts: [], tasks: [], savedReady: false };
  window.__hansardLabObservation = state;
  for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask', 'mark']) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    state.observers.push(type);
    new PerformanceObserver(
      /** Retains native observed entries for this navigation.
       * @param list Native performance entry batch.
       * @remarks Updates the collector-owned observation arrays.
       */
      function observeEntries(list: PerformanceObserverEntryList): void {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') state.lcp.push(entry.startTime);
          if (entry.entryType === 'longtask') state.tasks.push({ start: entry.startTime, duration: entry.duration });
          if (entry.entryType === 'layout-shift') {
            const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            state.shifts.push({ start: shift.startTime, value: shift.value, hadRecentInput: shift.hadRecentInput });
          }
          if (entry.entryType === 'mark' && entry.name === 'hansard.reader-ready') {
            const section = document.querySelector('[data-result-complete="true"][data-member-id][data-sitting-id]');
            state.savedReady = section !== null;
          }
        }
      }
    ).observe({ type, buffered: true });
  }
}
/** Extracts current native load observations without substituting missing values.
 * @returns Raw page-relative load data and native origin for CDP alignment.
 */
function readLoadObservation(): Omit<ColdTrace, 'requests'> & { origin: number; savedReady: boolean } {
  const state = window.__hansardLabObservation;
  const fcp = performance.getEntriesByName('first-contentful-paint', 'paint')[0];
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const marks: Mark[] = []; for (const entry of performance.getEntriesByType('mark')) marks.push({ name: entry.name, startTime: entry.startTime });
  const servedResources: ServedResource[] = [];
  for (const entry of [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]) {
    const resource = entry as PerformanceResourceTiming;
    servedResources.push({ url: entry.name, encodedBodyBytes: resource.encodedBodySize, decodedBodyBytes: resource.decodedBodySize, transferBytes: resource.transferSize });
  }
  return { ...state, fcpMs: fcp?.startTime ?? NaN, dclMs: navigation?.domContentLoadedEventEnd ?? NaN,
    endMs: performance.now(), origin: performance.timeOrigin, marks, servedResources };
}
/** Extracts all native source partitions without interpreting text as markup.
 * @returns Pair/outcome and exact source-text DOM content.
 */
function readRendered(): RenderedResult {
  const section = document.querySelector('[data-result-complete="true"][data-member-id][data-sitting-id]');
  const items: RenderedItem[] = [];
  if (section) for (const node of section.querySelectorAll('[data-source-item-id]')) {
    items.push({ ordinal: node.getAttribute('data-source-item-id') ?? '', kind: node.getAttribute('data-kind') ?? '',
      text: node.querySelector('.source-text')?.textContent ?? '' });
  }
  return { memberId: section?.getAttribute('data-member-id') ?? null, sittingId: section?.getAttribute('data-sitting-id') ?? null,
    complete: section?.getAttribute('data-result-complete') ?? null, outcome: section?.getAttribute('data-outcome') ?? null, items };
}
/** Clears only the required instrumentation marks before a new observed operation.
 * @param names Required mark names.
 * @remarks Removes existing matching User Timing entries, without modifying app behavior.
 */
function clearMarks(names: string[]): void { for (const name of names) performance.clearMarks(name); }
/** Lets preparation-only control handlers finish their frame callbacks before measured Read.
 * @returns Resolves after two native animation frames.
 * @remarks Registers native frame callbacks without changing product behavior.
 */
function waitForTwoFrames(): Promise<void> {
  return new Promise<void>(
    /** Schedules the preparation frame wait.
     * @param done Promise completion callback.
     * @remarks Registers two browser frame callbacks.
     */
    function wait(done): void { requestAnimationFrame(
      /** Waits for the following native frame.
       * @remarks Registers the final native frame callback.
       */
      function firstFrame(): void { requestAnimationFrame(
        /** Completes the preparation frame wait.
         * @remarks Completes the captured promise.
         */
        function secondFrame(): void { done(); }); }); });
}
/** Checks product readiness by an actual named mark.
 * @param name Required product mark.
 * @returns Whether exactly one named mark exists.
 */
function hasMark(name: string): boolean { return performance.getEntriesByName(name, 'mark').length === 1; }
/** Checks a rendered result belongs to the requested exact pair.
 * @param ids Selected exact member/sitting identifiers.
 * @returns Whether a complete matching section is present.
 */
function hasResult(ids: { memberId: string; sittingId: string }): boolean {
  const section = document.querySelector('[data-result-complete="true"][data-member-id][data-sitting-id]');
  return section?.getAttribute('data-member-id') === ids.memberId && section.getAttribute('data-sitting-id') === ids.sittingId;
}
/** Extracts native option IDs without changing selected state.
 * @returns Available exact member IDs.
 */
function memberOptions(): string[] {
  const values: string[] = []; for (const option of document.querySelectorAll<HTMLSelectElement>('#member-select option')) if (option.value) values.push(option.value); return values;
}
/** Reads the native language selection.
 * @returns Current locale ID.
 */
function currentLocale(): string { return (document.querySelector('#language-select') as HTMLSelectElement | null)?.value ?? ''; }
/** Checks real worker control and nonempty persisted browser stores before reopening.
 * @returns Whether native worker/cache/IndexedDB evidence is present.
 */
async function hasPersistence(): Promise<boolean> {
  return Boolean(navigator.serviceWorker?.controller) && (await caches.keys()).length > 0 && (await indexedDB.databases()).length > 0;
}

class NativeBrowser implements LabBrowser {
  browser: Browser; options: NativeOptions; version: string;
  /** Captures one native process and fixed candidate expectations.
   * @param browser Native Chromium process.
   * @param options Candidate served URL and complete expected source results.
   * @remarks Initializes this collector handle.
   */
  constructor(browser: Browser, options: NativeOptions) { this.browser = browser; this.options = options; this.version = browser.version(); }
  /** Creates a fresh isolated context using the exact viewport and fixed CDP profile.
   * @param profile Fixed lab profile.
   * @returns Native session with newly initialized page.
   * @remarks Creates a browser context and installs measurement-only observers.
   * @throws Error if native context/page initialization fails; closes the context first.
   */
  async open(profile: ProfileName): Promise<Session> {
    const context = await this.browser.newContext({ viewport: profile === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, serviceWorkers: 'allow' });
    try {
      await context.addInitScript(installObservers); const session = new NativeSession(context, this.options, profile); await session.newPage(); return session;
    } catch (error) { await context.close(); throw error; }
  }
  /** Closes the sole native process after serial collection.
   * @remarks Closes Chromium.
   */
  async close(): Promise<void> { await this.browser.close(); }
}
class NativeSession implements Session {
  context: BrowserContext; options: NativeOptions; profile: ProfileName; page!: Page; cdp!: CDPSession;
  requests = new Map<string, NativeRequest>(); offset = 0; offline = false;
  responseChecks: Promise<void>[] = []; responseErrors: string[] = [];
  /** Captures the fresh context and immutable source expectations.
   * @param context Native isolated context.
   * @param options Fixed served URL and expected complete source results.
   * @param profile Fixed lab profile.
   * @remarks Initializes this collector session.
   */
  constructor(context: BrowserContext, options: NativeOptions, profile: ProfileName) { this.context = context; this.options = options; this.profile = profile; }
  /** Reopens a page while preserving the current context's saved stores.
   * @remarks Creates a page/CDP session, observes native requests and applies exact network/CPU.
   */
  async newPage(): Promise<void> {
    this.requests.clear(); this.responseChecks = []; this.responseErrors = [];
    this.page = await this.context.newPage(); this.page.setDefaultTimeout(30000);
    this.page.on('response',
      /** Retains actual response verification without unhandled asynchronous rejections.
       * @param response Native browser response.
       * @remarks Tracks response hashes and any current-run mismatch.
       */
      (response: Response): void => {
        if (!this.options.contentHashes) return;
        const check = this.checkResponse(response).catch(
          /** Records a failed response guard for fail-closed operation completion.
           * @param error Response verification failure.
           * @remarks Appends the failure context to this current run.
           */
          (error: unknown): void => { this.responseErrors.push(error instanceof Error ? error.message : String(error)); });
        this.responseChecks.push(check);
      });
    this.cdp = await this.context.newCDPSession(this.page); await this.cdp.send('Network.enable');
    this.cdp.on('Network.requestWillBeSent',
      /** Records raw monotonic/epoch request start for alignment with performance.timeOrigin.
       * @param event Native CDP request event.
       * @remarks Updates this session's request timeline and monotonic epoch offset.
       */
      (event: { requestId: string; timestamp: number; wallTime: number }): void => {
        this.offset = event.wallTime * 1000 - event.timestamp * 1000;
        this.requests.set(event.requestId, { start: event.wallTime * 1000, end: null });
      });
    this.cdp.on('Network.loadingFinished', this.finishRequest.bind(this)); this.cdp.on('Network.loadingFailed', this.finishRequest.bind(this));
    await this.cdp.send('Network.emulateNetworkConditions', { ...cdpConditions(this.profile), offline: this.offline });
    await this.cdp.send('Emulation.setCPUThrottlingRate', { rate: this.profile === 'mobile' ? 4 : 1 });
  }
  /** Binds every actual native response to the same frozen file, including transport-decoded data.
   * @param response Native browser response.
   * @remarks Reads actual browser-delivered bytes, including cached/worker responses.
   * @throws Error for off-base/unfrozen/error/changed responses.
   */
  async checkResponse(response: Response): Promise<void> {
    const base = new URL(this.options.baseUrl); const url = new URL(response.url());
    requireValue(url.origin === base.origin && url.pathname.startsWith(base.pathname), 'native served response escaped frozen base');
    const path = url.pathname.slice(base.pathname.length) || 'index.html';
    const hashes = this.options.contentHashes![path]; requireValue(hashes && response.status() === 200, `unfrozen/error served response: ${path}`);
    const body = await response.body(); const hash = createHash('sha256').update(body).digest('hex');
    requireValue(hashes.includes(hash), `native served bytes differ from frozen candidate: ${path}`);
  }
  /** Waits for all native response hashes already observed for the operation.
   * @remarks Awaits current response checks without hiding their recorded failures.
   * @throws Error when any actual served response differs from the frozen candidate.
   */
  async verifiedResponses(): Promise<void> {
    await Promise.all(this.responseChecks); requireValue(this.responseErrors.length === 0, this.responseErrors[0] ?? 'native frozen served response verification failed');
  }
  /** Records native request completion/failure without dropping unfinished observations.
   * @param event Native CDP terminal request event.
   * @remarks Updates an observed request's monotonic end.
   */
  finishRequest(event: { requestId: string; timestamp: number }): void {
    const record = this.requests.get(event.requestId); if (record) record.end = event.timestamp * 1000 + this.offset;
  }
  /** Navigates only to the independently verified candidate's base URL.
   * @remarks Loads the page and waits for actual catalogue-ready instrumentation.
   */
  async navigate(): Promise<void> { await this.page.goto(this.options.baseUrl, { waitUntil: 'domcontentloaded' }); await this.page.waitForFunction(hasMark, 'hansard.catalogue-ready'); }
  /** Collects a fully reset cold native timeline through observed quiet.
   * @returns Raw observer/User Timing/native-network timeline.
   * @remarks Clears HTTP/worker/Cache Storage/IndexedDB before navigation and polls observations.
   * @throws Error for missing required metrics or no complete quiet observation within 30 seconds.
   */
  async cold(): Promise<ColdTrace> {
    await this.cdp.send('Network.clearBrowserCache');
    await this.cdp.send('Storage.clearDataForOrigin', { origin: new URL(this.options.baseUrl).origin, storageTypes: 'all' });
    await this.navigate(); const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const load = await this.page.evaluate(readLoadObservation); const requests: NetworkRequest[] = [];
      for (const record of this.requests.values()) requests.push({ start: Math.max(0, record.start - load.origin), end: record.end === null ? null : Math.min(load.endMs, Math.max(0, record.end - load.origin)) });
      const observation: ColdTrace = { ...load, requests };
      let metricsReady = false; try { coldMetrics(observation); metricsReady = true; } catch { /* Continue until actual quiet observation; never substitute metrics. */ }
      if (metricsReady) { await this.verifiedResponses(); return observation; }
      requireValue(this.responseErrors.length === 0, this.responseErrors[0]); await this.page.waitForTimeout(250);
    }
    throw new Error('incomplete native load metrics or missing five-second quiet window');
  }
  /** Selects and reads a real frozen pair, checking every rendered accepted source leaf.
   * @param fixture Exact immutable pair fixture.
   * @returns Complete verified DOM result.
   * @remarks Uses native selects/Read and waits for full result rendering.
   * @throws Error for absent fixture expectations or incomplete/changed source rendering.
   */
  async readFixture(fixture: Fixture): Promise<true> {
    if (this.page.url() === 'about:blank') await this.navigate();
    const expected = this.options.expected[`${fixture.path}:${fixture.memberId}`]; requireValue(expected, 'independent complete source fixture required');
    await this.page.locator('#member-select').selectOption(fixture.memberId); await this.page.locator('#sitting-select').selectOption(fixture.sittingId);
    await this.page.evaluate(waitForTwoFrames);
    await this.page.evaluate(clearMarks, ['hansard.processing-start', 'hansard.processing-end', 'hansard.interaction-start', 'hansard.interaction-end']);
    await this.page.locator('#read-button').click(); await this.page.waitForFunction(hasMark, 'hansard.processing-end');
    await this.page.waitForFunction(hasResult, { memberId: fixture.memberId, sittingId: fixture.sittingId });
    await this.page.waitForFunction(hasMark, 'hansard.interaction-end');
    await this.verifiedResponses();
    return verifyRenderedResult(await this.page.evaluate(readRendered), expected);
  }
  /** Prepopulates actual saved content and proves closed-reader offline reopening.
   * @param fixture Required complete saved pair.
   * @remarks Reads real source, checks native stores/worker, closes and reopens offline, then restores online state.
   * @throws Error if app persistence/worker/saved-result readiness is absent or incomplete.
   */
  async prepare(fixture: Fixture): Promise<void> {
    await this.readFixture(fixture);
    requireValue(await this.page.evaluate(hasPersistence), 'committed saved result, worker control and persistent stores required');
    await this.page.close(); this.offline = true; await this.context.setOffline(true); await this.newPage();
    try {
      await this.page.goto(this.options.baseUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForFunction(hasResult, { memberId: fixture.memberId, sittingId: fixture.sittingId });
      verifyRenderedResult(await this.page.evaluate(readRendered), this.options.expected[`${fixture.path}:${fixture.memberId}`]);
      await this.verifiedResponses();
    } finally { await this.page.close(); this.offline = false; await this.context.setOffline(false); await this.newPage(); }
  }
  /** Measures a separate online reopen with the prepared context's caches/stores retained.
   * @param fixture Saved exact pair.
   * @returns Complete saved-result readiness mark and observed rendered source.
   * @remarks Navigates and validates existing saved content without clicking Read.
   * @throws Error for controls-only readiness or incomplete saved content.
   */
  async repeat(fixture: Fixture): Promise<TimedResult> {
    await this.page.goto(this.options.baseUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForFunction(hasMark, 'hansard.reader-ready');
    await this.page.waitForFunction(hasResult, { memberId: fixture.memberId, sittingId: fixture.sittingId });
    const complete = verifyRenderedResult(await this.page.evaluate(readRendered), this.options.expected[`${fixture.path}:${fixture.memberId}`]);
    const observation = await this.page.evaluate(readLoadObservation);
    requireValue(observation.savedReady, 'reader-ready mark must observe the complete saved result, not controls alone');
    await this.verifiedResponses();
    return { marks: observation.marks, complete, servedResources: observation.servedResources };
  }
  /** Collects the real selected-source processing pair after complete Read rendering.
   * @param fixture Frozen median/p95/largest pair.
   * @returns Actual complete processing marks.
   * @remarks Retrieves and processes the real fixture through native controls.
   */
  async process(fixture: Fixture): Promise<TimedResult> {
    const complete = await this.readFixture(fixture); const observed = await this.page.evaluate(readLoadObservation); return { marks: observed.marks, complete, servedResources: observed.servedResources };
  }
  /** Measures one real action against a complete long/gap result and a native trace paint.
   * @param fixture Frozen source pair used as the interaction context.
   * @param kind Selection/language/Read action.
   * @returns Actual mark pair with corroborated first main-thread Paint.
   * @remarks Uses native controls and CDP tracing; stops tracing even when actions fail.
   * @throws Error for missing alternate choices/marks/actual painted frame.
   */
  async interact(fixture: Fixture, kind: InteractionKind): Promise<InteractionObservation> {
    const complete = await this.readFixture(fixture);
    await this.page.waitForFunction(hasMark, 'hansard.interaction-end');
    await this.page.evaluate(clearMarks, ['hansard.interaction-start', 'hansard.interaction-end']);
    const events: TraceEvent[] = [];
    /** Records native trace batches for the current action.
     * @param batch Native trace event batch.
     * @remarks Appends events to this operation's local trace collection.
     */
    function collectTrace(batch: { value: Array<Record<string, string>> }): void { events.push(...batch.value as unknown as TraceEvent[]); }
    this.cdp.on('Tracing.dataCollected', collectTrace);
    await this.cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing', transferMode: 'ReportEvents' });
    try {
      if (kind === 'read') await this.page.locator('#read-button').click();
      else if (kind === 'language') { const locale = await this.page.evaluate(currentLocale); requireValue(locale === 'ms' || locale === 'en', 'actual bilingual locale control required'); await this.page.locator('#language-select').selectOption(locale === 'ms' ? 'en' : 'ms'); }
      else { const choices = await this.page.evaluate(memberOptions); let alternate: string | undefined; for (const id of choices) if (id !== fixture.memberId) { alternate = id; break; } requireValue(alternate, 'alternate exact member selection required'); await this.page.locator('#member-select').selectOption(alternate); }
      await this.page.waitForFunction(hasMark, 'hansard.interaction-end');
    } finally {
      const finished = new Promise<void>(
        /** Resolves only after native trace delivery completes.
         * @param done Promise completion callback.
         * @remarks Registers the CDP terminal trace listener.
         */
        (done): void => { this.cdp.once('Tracing.tracingComplete',
          /** Completes the observed terminal trace event.
           * @remarks Completes the captured trace promise.
           */
          function traceEnded(): void { done(); }); });
      await this.cdp.send('Tracing.end'); await finished; this.cdp.off('Tracing.dataCollected', collectTrace);
    }
    const observed = await this.page.evaluate(readLoadObservation);
    const startMs = oneMark(observed.marks, 'hansard.interaction-start'); const endMs = oneMark(observed.marks, 'hansard.interaction-end');
    let start: TraceEvent | undefined; let end: TraceEvent | undefined;
    for (const event of events) { if (event.name === 'hansard.interaction-start') start = event; if (event.name === 'hansard.interaction-end') end = event; }
    requireValue(start && end && end.ts >= start.ts, 'actual trace User Timing pair required');
    let paint: TraceEvent | undefined;
    for (const event of events) if (event.name === 'Paint' && event.pid === start.pid && event.tid === start.tid && event.ts >= start.ts && event.ts <= end.ts
      && (!paint || event.ts < paint.ts)) paint = event;
    requireValue(paint, 'actual main-thread Paint between interaction marks required');
    const paintMs = startMs + (paint.ts - start.ts) / 1000;
    requireValue(paintMs <= endMs + .1, 'trace/User Timing clock alignment mismatch');
    await this.verifiedResponses(); return { marks: observed.marks, complete, paintMs: Math.min(paintMs, endMs), servedResources: observed.servedResources };
  }
  /** Closes all pages and storage isolation for this session.
   * @remarks Closes this native context.
   */
  async close(): Promise<void> { await this.context.close(); }
}

interface CliOptions { artifact: string; candidate: string; fixtures: string; url: string; output: string }
interface Selection { path: string; memberId: string }
interface FixtureManifest { datasets: Record<Dataset, Selection>; interactions: Selection[] }

/** Reads the actual installed and lockfile-pinned versions before assigning tool metadata.
 * @returns Exact independently verified installed versions.
 * @remarks Reads package/lock and installed dependency metadata.
 * @throws Error for unpinned or mismatched installed versions.
 */
async function toolVersions(): Promise<{ playwright: string; vite: string }> {
  const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(resolve('package-lock.json'), 'utf8')); const versions: Record<string, string> = {};
  for (const name of ['@playwright/test', 'vite']) {
    const installed = JSON.parse(await readFile(resolve('node_modules', name, 'package.json'), 'utf8')).version;
    requireValue(/^\d+\.\d+\.\d+$/.test(pkg.devDependencies[name]) && installed === pkg.devDependencies[name]
      && installed === lock.packages[`node_modules/${name}`]?.version, 'installed tools must match exact package/lock pins'); versions[name] = installed;
  }
  return { playwright: versions['@playwright/test'], vite: versions.vite };
}
/** Verifies native hosted machine facts before reading candidate data or launching Chromium.
 * @returns Native accepted hosted-runner record.
 * @remarks Reads actual OS/event/tool files and process/native host facts.
 * @throws Error for substituted or unverified runner/public repository facts.
 */
async function nativeRunner(): Promise<Runner> {
  requireValue(process.platform === 'linux' && process.arch === 'x64', 'collection requires the Linux x64 GitHub-hosted runner, not this local host');
  requireValue(process.env.GITHUB_EVENT_PATH && process.env.GITHUB_REPOSITORY, 'public hosted runner event provenance required');
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const models: string[] = []; for (const cpu of cpus()) models.push(cpu.model);
  return verifyRunner({ platform: process.platform, arch: process.arch, osRelease: await readFile('/etc/os-release', 'utf8'), cpus: models,
    memoryBytes: totalmem(), env: process.env, repository: event.repository, repositoryExpected: 'eaglecheow/vote-better-malaysia',
    node: process.versions.node, tools: await toolVersions() });
}
/** Ensures an evidence path's real parent stays outside the immutable deployed set.
 * @param artifact Real artifact root.
 * @param evidence Candidate/fixture/output path.
 * @remarks Resolves existing parent symlinks without changing files.
 * @throws Error if evidence is placed within the deployed artifact.
 */
async function outsideArtifact(artifact: string, evidence: string): Promise<void> {
  const parent = await realpath(dirname(resolve(evidence))); const location = join(parent, resolve(evidence).split('/').at(-1)!);
  const path = relative(artifact, location); requireValue(path === '..' || path.startsWith('../'), 'candidate/fixture/report metadata must stay outside frozen artifact');
}
/** Opens one raw HTTP representation without automatic transport decompression or redirect following.
 * @param url Exact same-base artifact asset URL.
 * @returns Native response stream.
 * @remarks Makes one bounded-time HTTP(S) GET with identity preference.
 */
async function rawResponse(url: URL): Promise<IncomingMessage> {
  return new Promise<IncomingMessage>(
    /** Captures a raw same-origin response stream.
     * @param done Response promise completion.
     * @param fail Response promise failure.
     * @remarks Opens an HTTP request and registers timeout/error handling.
     */
    function requestBody(done, fail): void {
      const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
      const request = send(url, { headers: { 'Accept-Encoding': 'identity' } }, done);
      request.on('error', fail); request.setTimeout(30000,
        /** Aborts an unresponsive artifact verification request.
         * @remarks Destroys this native request with a timeout failure.
         */
        function timedOut(): void { request.destroy(new Error('served artifact request timeout')); }); request.end();
    });
}
/** Verifies the actual served representation against one frozen file and counts wire body bytes.
 * @param url Exact pinned file URL.
 * @param path Frozen relative artifact path.
 * @param bytes Independently measured stored length.
 * @param expectedHash Independently measured stored SHA-256.
 * @param decodedResource Intrinsic data length/hash independently derived from the frozen gzip resource.
 * @returns Observed served response body bytes, separately from deterministic shell gzip.
 * @remarks Reads a native response stream and bounded transport decompression.
 * @throws Error for redirects, unsupported encoding, excess bytes or different artifact content.
 */
export async function verifyServedFile(url: URL, path: string, bytes: number, expectedHash: string, decodedResource?: { bytes: number; hash: string }): Promise<number> {
  const intrinsic = path.startsWith('data/') && path.endsWith('.json.gz') ? decodedResource : undefined;
  const response = await rawResponse(url); requireValue(response.statusCode === 200, `served frozen file must return 200 without redirects: ${path}`);
  const encoding = response.headers['content-encoding'] ?? 'identity'; requireValue(['identity', 'gzip', 'br'].includes(encoding), 'unsupported served transport encoding');
  const rawHash = createHash('sha256'); const decodedHash = createHash('sha256'); let rawBytes = 0; let decodedBytes = 0;
  response.on('data',
    /** Counts and hashes actual served body bytes before transport decode.
     * @param chunk Raw native response chunk.
     * @remarks Updates counters/hash and aborts a representation beyond the frozen-size bound.
     */
    function countRaw(chunk: Buffer): void {
      rawBytes += chunk.length; rawHash.update(chunk);
      if (rawBytes > Math.max(bytes, intrinsic?.bytes ?? 0) + 65536) response.destroy(new Error('served frozen wire-byte bound exceeded'));
    });
  const stream = encoding === 'identity' ? response : response.compose(encoding === 'gzip' ? createGunzip() : createBrotliDecompress());
  const maximum = path.startsWith('data/') ? DATA_LIMITS.decoded : bytes;
  for await (const chunk of stream) {
    decodedBytes += chunk.length; requireValue(decodedBytes <= maximum, 'served decoded representation exceeds frozen bound'); decodedHash.update(chunk);
  }
  const stored = rawHash.digest('hex'); const decoded = decodedHash.digest('hex');
  requireValue((rawBytes === bytes && stored === expectedHash) || (decodedBytes === bytes && decoded === expectedHash)
    || (intrinsic !== undefined && decodedBytes === intrinsic.bytes && decoded === intrinsic.hash), `served bytes differ from frozen artifact: ${path}`);
  return rawBytes;
}
/** Orders full-record decoded sizes with the checker's stable path tie-break.
 * @param left First independently measured record.
 * @param right Second independently measured record.
 * @returns Decoded byte/path ordering.
 */
function rankRecord(left: { path: string; decoded: number }, right: { path: string; decoded: number }): number {
  return left.decoded - right.decoded || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
/** Builds source-text expectations from validated accepted result partitions.
 * @param result Independently derived exact pair result.
 * @returns Every original selected turn/gap/annotation with per-partition order preserved.
 */
function expectedResult(result: TranscriptResult): ExpectedResult {
  const items: RenderedItem[] = [];
  for (const [kind, leaves] of [['turn', result.turns], ['gap', result.gaps], ['annotation', result.annotations]] as const)
    for (const item of leaves) items.push({ ordinal: String(item.ordinal), kind, text: item.text });
  return { memberId: result.memberId, sittingId: result.sittingId, outcome: result.outcome, items };
}
/** Validates an external exact fixture selection against source catalogue, role and immutable bytes.
 * @param selection External fixture path/member selection.
 * @param dataset Required role or interaction context.
 * @param artifact Immutable artifact directory.
 * @param measured Independently measured complete artifact.
 * @param catalogue Independently validated complete catalogue.
 * @param candidate External frozen candidate.
 * @param largest Independently ranked largest record path.
 * @returns Actual derived fixture facts and complete expected source DOM.
 * @remarks Reads and validates one bounded frozen source record.
 * @throws Error for a substituted/unavailable/empty fixture or wrong selected identity/hash.
 */
async function selectedFixture(selection: Selection, dataset: Fixture['dataset'], artifact: string, measured: ArtifactSizes,
  catalogue: Catalogue, candidate: DocumentationCandidate, largest: string): Promise<{ fixture: Fixture; expected: ExpectedResult }> {
  requireValue(selection && typeof selection.path === 'string' && /^data\/sittings\/[1-9]\d*\.json\.gz$/.test(selection.path)
    && /^[1-9]\d*$/.test(selection.memberId), 'explicit exact fixture path/member required');
  let recordSize: ArtifactSizes['sittings'][number] | undefined;
  for (const entry of measured.sittings) if (entry.path === selection.path) recordSize = entry;
  requireValue(recordSize, 'fixture must belong to complete measured source snapshot');
  const sittingId = selection.path.split('/').at(-1)!.split('.')[0]; let sitting: Catalogue['sittings'][number] | undefined;
  for (const entry of catalogue.sittings) if (entry.id === sittingId) sitting = entry;
  requireValue(sitting && sitting.record.path === selection.path, 'matching source fixture identity required');
  const bytes = await readFile(join(artifact, selection.path)); const hash = createHash('sha256').update(bytes).digest('hex');
  requireValue(candidate.fixtureHashes[selection.path] === hash, 'candidate must freeze every selected fixture hash');
  const decoded = gunzipSync(bytes, { maxOutputLength: DATA_LIMITS.decoded });
  const record = validateSittingRecord(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded)), sitting, catalogue);
  const result = buildTranscriptResult(catalogue, selection.memberId, sittingId, record);
  requireValue(result.turns.length + result.gaps.length + result.annotations.length > 0, 'nonempty complete full-record fixture required');
  return { fixture: { dataset, path: selection.path, hash, decoded: recordSize.decoded, memberId: selection.memberId,
    sittingId, hasGaps: result.gaps.length > 0, isLargest: selection.path === largest }, expected: expectedResult(result) };
}
/** Constructs verified actual host/artifact/served/source prerequisites for native collection.
 * @param options Required external frozen paths and production URL.
 * @returns Injectable boundary with immutable source expectations and no fake device reports.
 * @remarks Reads source/metadata, verifies every served file, then permits one native browser launch.
 * @throws Error for missing/substituted artifacts, fixtures, served bytes or hosted runner conditions.
 */
async function nativeBoundary(options: CliOptions): Promise<Boundary> {
  const runner = await nativeRunner(); const artifact = await realpath(resolve(options.artifact));
  for (const path of [options.candidate, options.fixtures, options.output]) await outsideArtifact(artifact, path);
  const candidate: unknown = JSON.parse(await readFile(options.candidate, 'utf8')); requireValue(isCandidate(candidate), 'valid exact frozen candidate required');
  const manifest: FixtureManifest = JSON.parse(await readFile(options.fixtures, 'utf8'));
  const measured = await measureArtifact(resolve(options.artifact));
  requireValue(measured.complete && measured.sourceVerified && measured.artifactDigest === candidate.artifactDigest
    && measured.snapshot?.snapshotId === candidate.snapshotId, 'complete source-verified immutable artifact/candidate required');
  const hashes = new Map<string, string>(); for (const [path, , hash] of measured.files) hashes.set(path, hash);
  for (const [path, hash] of Object.entries(candidate.fixtureHashes)) requireValue(hashes.get(path) === hash, 'candidate fixture hash differs from artifact');
  requireValue(candidate.fixtureHashes['data/catalogue.json.gz'], 'candidate must freeze complete catalogue');
  const catalogue = validateCatalogue(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
    gunzipSync(await readFile(join(artifact, 'data/catalogue.json.gz')), { maxOutputLength: DATA_LIMITS.decoded }))));
  const ranked = [...measured.sittings]; ranked.sort(rankRecord);
  const roles: Record<Dataset, string> = { median: ranked[Math.ceil(ranked.length * .5) - 1].path,
    p95: ranked[Math.ceil(ranked.length * .95) - 1].path, largest: ranked.at(-1)!.path };
  const fixtures: Fixture[] = []; const interactionFixtures: Fixture[] = []; const expected: Record<string, ExpectedResult> = {};
  for (const dataset of ['median', 'p95', 'largest'] as const) {
    requireValue(manifest.datasets?.[dataset]?.path === roles[dataset], 'fixture roles must match full-snapshot nearest-rank decoded records');
    const selected = await selectedFixture(manifest.datasets[dataset], dataset, artifact, measured, catalogue, candidate, roles.largest);
    fixtures.push(selected.fixture); expected[`${selected.fixture.path}:${selected.fixture.memberId}`] = selected.expected;
  }
  requireValue(Array.isArray(manifest.interactions) && manifest.interactions.length > 0, 'explicit frozen long/gap interaction fixtures required');
  for (const selection of manifest.interactions) {
    const selected = await selectedFixture(selection, 'interaction', artifact, measured, catalogue, candidate, roles.largest);
    interactionFixtures.push(selected.fixture); expected[`${selected.fixture.path}:${selected.fixture.memberId}`] = selected.expected;
  }
  const base = new URL(options.url); requireValue(['http:', 'https:'].includes(base.protocol) && base.pathname.endsWith('/') && !base.search && !base.hash
    && !base.username && !base.password, 'explicit clean production base URL required');
  const servedBytes: Record<string, number> = {}; const contentHashes: Record<string, string[]> = {};
  for (const [path, bytes, hash] of measured.files) {
    contentHashes[path] = [hash]; let decodedResource: { bytes: number; hash: string } | undefined;
    if (path.startsWith('data/') && path.endsWith('.json.gz')) {
      const decoded = gunzipSync(await readFile(join(artifact, path)), { maxOutputLength: DATA_LIMITS.decoded });
      decodedResource = { bytes: decoded.length, hash: createHash('sha256').update(decoded).digest('hex') };
      contentHashes[path].push(decodedResource.hash);
    }
    servedBytes[path] = await verifyServedFile(new URL(path === 'index.html' ? './' : path, base), path, bytes, hash, decodedResource);
  }
  const input: VerifiedInput = { candidate, runner, fixtures, interactionFixtures, servedBytes, reviewedAt: new Date().toISOString() }; verifyInput(input);
  return {
    /** Supplies independently verified native prerequisite facts.
     * @returns The fixed complete candidate/host/source facts.
     */
    async verify(): Promise<VerifiedInput> { return input; },
    /** Launches the only native browser after all prerequisites pass.
     * @returns Native Chromium handle.
     * @remarks Launches one pinned browser process.
     */
    async launch(): Promise<LabBrowser> { return createNativeBrowser({ baseUrl: base.href, expected, contentHashes }); },
  };
}
/** Runs fail-closed native lab collection and writes evidence only after every run completes.
 * @param args Required artifact/candidate/fixture/url/output arguments.
 * @remarks Reads/verifies files and actual runner; writes one atomic external lab-only report or sets exit 1.
 */
async function runCli(args: string[]): Promise<void> {
  try {
    const values: Record<string, string> = {};
    for (let index = 0; index < args.length; index += 2) {
      requireValue(['--artifact', '--candidate', '--fixtures', '--url', '--output'].includes(args[index]) && args[index + 1]
        && !values[args[index]], 'Use --artifact <frozen-dir> --candidate <candidate.json> --fixtures <fixtures.json> --url <production-base/> --output <external-lab.json>');
      values[args[index]] = args[index + 1];
    }
    requireValue(Object.keys(values).length === 5, 'collection requires frozen artifact, candidate, fixtures, production URL and external output');
    const options: CliOptions = { artifact: values['--artifact'], candidate: values['--candidate'], fixtures: values['--fixtures'], url: values['--url'], output: resolve(values['--output']) };
    const boundary = await nativeBoundary(options); const report = await collectLab(boundary);
    const temporary = `${options.output}.partial-${process.pid}`;
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); await rename(temporary, options.output);
    console.log('Complete native lab raw runs collected. Actual six-target, field, source acquisition and trusted CI evidence remain separate; run the full performance checker with matching reports.');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
if (import.meta.main) await runCli(process.argv.slice(2));
