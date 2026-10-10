import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { catalogueFixture } from '../fixtures/catalogue.ts';
import type { SittingRecord } from '../../src/source.ts';
import { evaluateBudgets, measureArtifact } from '../../scripts/check-performance.ts';

const directories: string[] = [];

/** Removes measured temporary artifacts after each test; rejects on filesystem failure. */
async function cleanup(): Promise<void> {
  for (const root of directories.splice(0)) await rm(root, { recursive: true, force: true });
}
afterEach(cleanup);

/**
 * Supplies controlled bounded reports for every required physical target.
 * @returns Synthetic enforcement input, never actual performance/device evidence.
 */
function report(): Record<string, any> {
  const candidate = { sourceRevision: '1'.repeat(40), applicationFingerprint: 'a'.repeat(64),
    artifactDigest: 'b'.repeat(64), snapshotId: 'controlled-snapshot', fixtureHashes: {
      'data/catalogue.json.gz': 'c'.repeat(64), 'data/sittings/1.json.gz': 'c'.repeat(64),
      'data/sittings/4.json.gz': 'c'.repeat(64),
    },
    conditionsDigest: 'd'.repeat(64), priorServedBaselineDigest: null };
  const profiles = ['mobile', 'desktop'].map(profileReport);
  const devices = [
    ['android-chrome', 'Google Pixel 6a'], ['iphone-safari', 'Apple iPhone 13'],
    ['desktop-chrome', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'],
    ['desktop-edge', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'],
    ['desktop-firefox', 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop'],
    ['desktop-safari', 'MacBook Air M1, 8 GiB RAM, supported stable macOS'],
  ].map(deviceReport);
  for (const device of devices) device.candidate = structuredClone(candidate);
  return {
    expectedCandidate: candidate, candidate: structuredClone(candidate),
    now: '2026-10-10T04:00:00.000Z', reviewedAt: '2026-10-10T03:00:00.000Z',
    origin: { repository: 'eaglecheow/vote-better-malaysia', branch: 'main', trusted: true },
    expectedRepository: 'eaglecheow/vote-better-malaysia',
    sizes: { shellGzip: 153600, jsGzip: 102400, iconBytes: 61440, artifactBytes: 900000000,
      catalogueGzip: 204800, catalogueDecoded: 5242880,
      sittings: Array.from({ length: 5 }, sizeReport), complete: true, layoutComplete: true, sourceVerified: true },
    sourceCoverage: { expected: 5, accounted: 5, availableRecords: 5, snapshotId: candidate.snapshotId },
    servedBytes: { 'index.html': 100, 'data/catalogue.json.gz': 204800,
      'data/sittings/1.json.gz': 524288, 'data/sittings/4.json.gz': 524288 },
    runner: { label: 'ubuntu-24.04', arch: 'x64', vcpus: 4, memoryGiB: 16,
      cpu: 'controlled CPU', image: 'controlled image', os: 'Ubuntu 24.04', node: '24.21.0', browser: 'pinned Chromium',
      browserProcesses: 1, concurrentMeasurements: 1, tools: { playwright: 'synthetic pinned version', vite: 'synthetic pinned version' } },
    profiles, devices, field: { mobile: 'unavailable', desktop: 'unavailable' },
  };
}

/**
 * Creates independent controlled per-resource exact boundary measurements.
 * @param _value Unused array slot.
 * @param index Positive sitting-path index offset.
 * @returns Synthetic sitting sizes; no physical resource is asserted.
 */
function sizeReport(_value: unknown, index: number): Record<string, any> {
  return { path: `data/sittings/${index + 1}.json.gz`, gzip: 524288, decoded: index === 0 ? 5242880 : (index + 1) * 100 };
}

/**
 * Builds one controlled laboratory profile with twenty runs per operation/dataset.
 * @param profile - Mobile or desktop laboratory proxy.
 * @returns Synthetic timing/condition metadata for enforcement assertions.
 */
function profileReport(profile: string): Record<string, any> {
  const mobile = profile === 'mobile';
  return { profile, viewport: mobile ? [390, 844] : [1440, 900],
    downloadKbps: mobile ? 1600 : 10000, uploadKbps: mobile ? 750 : 2000,
    rttMs: mobile ? 150 : 40, cpuSlowdown: mobile ? 4 : 1,
    coldCacheCleared: true, repeatPrepopulated: true, completeValidatedResults: true,
    interactionKinds: ['selection', 'language', 'read'],
    lcpMs: Array(20).fill(2500), cls: Array(20).fill(0.1), tbtMs: Array(20).fill(200),
    coldCatalogueMs: Array(20).fill(5000), repeatReaderMs: Array(20).fill(1000),
    interactionMs: Array(20).fill(200),
    processing: ['median', 'p95', 'largest'].map(processingReport.bind(null, mobile)),
  };
}

/**
 * Creates a controlled timing distribution for a named verified dataset.
 * @param mobile - Whether the mobile proxy's 500-ms limit applies.
 * @param dataset - Median, p95 or largest fixture name.
 * @returns Twenty synthetic complete-result processing measurements with fixture hash.
 */
function processingReport(mobile: boolean, dataset: string): Record<string, any> {
  const index = dataset === 'median' ? 4 : 1;
  return { dataset, fixturePath: `data/sittings/${index}.json.gz`, fixtureHash: 'c'.repeat(64), ms: Array(20).fill(mobile ? 500 : 200) };
}

/**
 * Creates synthetic target enforcement data with all ten offline and thirty online attempts.
 * @param pair - Required browser target and physical baseline label.
 * @returns Controlled target report; it is not proof of real hardware behavior.
 */
function deviceReport(pair: string[]): Record<string, any> {
  const mobile = pair[0] === 'android-chrome' || pair[0] === 'iphone-safari';
  return { target: pair[0], hardware: pair[1], os: 'controlled supported stable OS',
    browserVersion: 'controlled stable version', stableAtAcceptance: true, localeChecks: ['ms', 'en'],
    downloadKbps: mobile ? 1600 : 10000, uploadKbps: mobile ? 750 : 2000, rttMs: mobile ? 150 : 40,
    viewport: mobile ? 'native' : [1440, 900], cpuSlowdown: 1, power: mobile ? 'native' : 'AC',
    batterySaver: false, unrelatedApplicationsClosed: true, offlineClosed: true, offlineNetworkDisabled: true,
    savedComplete: true, onlineComplete: true, offlineScenarios: ['largest', 'gaps'],
    online: Array.from({ length: 30 }, onlineAttempt), offlineMs: Array(10).fill(2000),
    reviewedAt: '2026-10-10T03:00:00.000Z', candidate: null };
}

/** Supplies one synthetic online timing attempt. @param _value - Unused array slot. @param index - Attempt index. @returns One synthetic online attempt across five sittings. */
function onlineAttempt(_value: unknown, index: number): Record<string, any> {
  return { sittingId: String(index % 5 + 1), decodedBytes: index % 5 === 0 ? 5242880 : (index % 5 + 1) * 100, ms: 5000, success: true };
}

/** Checks acceptance of complete bounded enforcement evidence. @returns Nothing; asserts bounded sizes and exact-candidate evidence are accepted. */
function passesAll(): void { expect(evaluateBudgets(report())).toBe(true); }
test('T063 accepts bounded numeric measurements and exact unchanged-candidate evidence', passesAll);

const sizeCases = [
  ['shellGzip', 153601], ['jsGzip', 102401], ['iconBytes', 61441], ['artifactBytes', 900000001],
  ['catalogueGzip', 1048577], ['catalogueDecoded', 5242881], ['complete', false],
] as const;

/** Checks rejection of exceeded sizes or incomplete coverage. @param key - Measured byte/coverage field. @param value - Invalid size. @returns Nothing; asserts fail-closed behavior. */
function rejectsSize(key: string, value: unknown): void {
  const input = report(); input.sizes[key] = value;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each(sizeCases)('T063 rejects exceeded or incomplete artifact size %s', rejectsSize);

/** Checks rejection of an oversized sitting resource. @param field - Shard byte field. @param value - One-byte-over value. @returns Nothing; asserts per-resource rejection. */
function rejectsShard(field: string, value: number): void {
  const input = report(); input.sizes.sittings[0][field] = value;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([['gzip', 524289], ['decoded', 5242881]] as const)('T063 rejects sitting %s one byte over', rejectsShard);

/** Checks rejection of a laboratory timing-budget exceedance. @param field - Operation timing field. @param value - Exceeded ceiling. @returns Nothing; asserts independent-profile rejection. */
function rejectsTiming(field: string, value: number): void {
  const input = report(); input.profiles[0][field] = Array(20).fill(value);
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([['lcpMs', 2501], ['cls', 0.1001], ['tbtMs', 201], ['coldCatalogueMs', 5001],
  ['repeatReaderMs', 1001], ['interactionMs', 201]] as const)('T063 rejects laboratory %s ceiling exceedance', rejectsTiming);

/** Checks the required raw laboratory run count. @returns Nothing; rejects a percentile report with nineteen instead of twenty raw runs. */
function rejectsRunCount(): void {
  const input = report(); input.profiles[0].lcpMs.pop();
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 requires twenty raw laboratory runs', rejectsRunCount);

/** Checks nearest-rank percentile aggregation. @returns Nothing; verifies nearest-rank p75 rather than a mean or maximum. */
function nearestRank(): void {
  const input = report(); input.profiles[0].lcpMs = [...Array(15).fill(2500), ...Array(5).fill(9000)];
  expect(evaluateBudgets(input)).toBe(true);
  input.profiles[0].lcpMs[14] = 2501;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 applies nearest-rank p75 to cold LCP', nearestRank);

/** Checks complete-result processing budgets. @returns Nothing; rejects missing/over-budget median, p95 or largest full-result processing data. */
function rejectsProcessing(): void {
  const input = report(); input.profiles[1].processing[2].ms[18] = 201;
  input.profiles[1].processing[2].ms[19] = 201;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 enforces desktop largest-record p95 processing ceiling', rejectsProcessing);

/** Checks independent evidence for every actual browser target. @param target - Required actual browser target. @returns Nothing; rejects a missing independent target report. */
function rejectsMissingTarget(target: string): void {
  const input = report(); input.devices = input.devices.filter(keepsTarget.bind(null, target));
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
/** Filters a controlled target report for a missing-evidence test. @param target - Target to remove. @param value - Device report. @returns Whether it remains in the controlled report. */
function keepsTarget(target: string, value: Record<string, any>): boolean { return value.target !== target; }
test.each(['android-chrome', 'iphone-safari', 'desktop-chrome', 'desktop-edge', 'desktop-firefox', 'desktop-safari'])(
  'T063 rejects missing actual target %s', rejectsMissingTarget);

/** Checks that no failed offline attempt is averaged away. @returns Nothing; requires all ten actual offline attempts at or below two seconds. */
function rejectsOffline(): void {
  const input = report(); input.devices[0].offlineMs[9] = 2001;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 cannot average away one failed offline attempt', rejectsOffline);

/** Checks the independent thirty-attempt online acceptance rule. @returns Nothing; verifies online failures remain in the thirty-attempt denominator. */
function onlineRule(): void {
  const input = report(); input.devices[0].online[0].success = false;
  expect(evaluateBudgets(input)).toBe(true);
  input.devices[0].online[1].ms = 5001;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 requires at least 29 of 30 successful online attempts within five seconds', onlineRule);

/** Checks exact candidate-byte and condition matching. @param field - Candidate identity key. @returns Nothing; rejects same-revision evidence for changed candidate bytes or conditions. */
function rejectsCandidate(field: string): void {
  const input = report(); input.candidate[field] = field === 'fixtureHashes' ? { wrong: 'e'.repeat(64) } : 'e'.repeat(64);
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each(['applicationFingerprint', 'artifactDigest', 'snapshotId', 'fixtureHashes', 'conditionsDigest', 'priorServedBaselineDigest'])(
  'T063 rejects candidate mismatch %s including provenance-only artifact changes', rejectsCandidate);

/** Checks the required laboratory runner allocation. @param field - Laboratory runner key. @param value - Wrong allocation. @returns Nothing; rejects a substitute runner. */
function rejectsRunner(field: string, value: unknown): void {
  const input = report(); input.runner[field] = value;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([['label', 'macos-latest'], ['arch', 'arm64'], ['vcpus', 2], ['memoryGiB', 8]] as const)(
  'T063 rejects substituted laboratory runner %s', rejectsRunner);

/** Checks the required physical acceptance baseline. @returns Nothing; rejects faster/substituted physical hardware rather than borrowing its pass. */
function rejectsHardware(): void {
  const input = report(); input.devices[0].hardware = 'Faster Android emulator';
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 rejects substitute physical hardware', rejectsHardware);

/** Checks expiry of candidate-bound evidence. @returns Nothing; rejects expired trusted evidence even with an unchanged source revision. */
function rejectsExpiry(): void {
  const input = report(); input.reviewedAt = '2026-10-01T03:00:00.000Z';
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 rejects evidence older than seven days', rejectsExpiry);

/** Checks default-branch evidence provenance. @returns Nothing; rejects PR-produced evidence as a publication trust source. */
function rejectsOrigin(): void {
  const input = report(); input.origin.branch = 'pull-request';
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 rejects untrusted report origin', rejectsOrigin);

/**
 * Creates a tiny complete controlled deployed file set and measures all bytes.
 * @returns Resolves on byte/hash/gzip checks; creates and later removes temporary files.
 */
async function measuresAllFiles(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'hansard-performance-')); directories.push(root);
  await mkdir(join(root, 'data', 'sittings'), { recursive: true });
  await mkdir(join(root, 'icons'), { recursive: true });
  const files: Record<string, Buffer> = {
    'index.html': Buffer.from('<html></html>'), 'app.js': Buffer.from('export {};'),
    'app.css': Buffer.from('body{}'), 'manifest.webmanifest': Buffer.from('{}'), 'sw.js': Buffer.from('/*worker*/'),
    'icons/icon-192.png': Buffer.from('controlled-icon'), 'icons/icon-512.png': Buffer.from('controlled-large-icon'),
    'data/catalogue.json.gz': gzipSync(Buffer.from('{}'), { level: 9 }),
    'data/sittings/1.json.gz': gzipSync(Buffer.from('{}'), { level: 9 }),
    'retained.bin': Buffer.from('retained output must count'),
  };
  for (const [name, bytes] of Object.entries(files)) await writeFile(join(root, name), bytes);
  const result = await measureArtifact(root) as Record<string, any>;
  expect(result).toMatchObject({ artifactBytes: Object.values(files).reduce(addBytes, 0),
    jsGzip: gzipSync(files['app.js'], { level: 9 }).byteLength + gzipSync(files['sw.js'], { level: 9 }).byteLength,
    catalogueGzip: files['data/catalogue.json.gz'].byteLength, catalogueDecoded: 2,
    sittings: [{ gzip: files['data/sittings/1.json.gz'].byteLength, decoded: 2 }],
    artifactDigest: expect.stringMatching(/^[a-f0-9]{64}$/), layoutComplete: true, sourceVerified: false });
  await writeFile(join(root, 'retained.bin'), Buffer.from('one changed byte'));
  const changed = await measureArtifact(root) as Record<string, any>;
  expect(changed.artifactDigest).not.toBe(result.artifactDigest);
  expect(await readFile(join(root, 'app.js'))).toEqual(files['app.js']);
}
/** Counts every stored artifact byte. @param sum - Current measured bytes. @param bytes - Next file. @returns The cumulative stored byte count. */
function addBytes(sum: number, bytes: Buffer): number { return sum + bytes.byteLength; }
test('T063 measures every deployed file including retained assets and stored gzip bytes', measuresAllFiles);

/**
 * Changes one evidence field so each fail-closed requirement has an isolated assertion.
 * @param path Dot-separated report field; numeric components address array entries.
 * @param value Missing, malformed or substituted value.
 * @returns Nothing; asserts the otherwise complete controlled report is rejected.
 * @remarks Mutates only the controlled report passed to the checker.
 */
function rejectsEvidence(path: string, value: unknown): void {
  const input = report();
  const parts = path.split('.');
  let owner = input;
  for (const part of parts.slice(0, -1)) owner = owner[part];
  owner[parts.at(-1)!] = value;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}

test.each([
  ['expectedCandidate', undefined], ['candidate.sourceRevision', '2'.repeat(40)], ['candidate.sourceRevision', 'main'],
  ['candidate.priorServedBaselineDigest', undefined], ['sizes', undefined], ['sizes.shellGzip', -1], ['sizes.jsGzip', NaN],
  ['sizes.iconBytes', Infinity], ['sizes.artifactBytes', '900000000'], ['sizes.sittings', []],
  ['sizes.layoutComplete', false], ['sizes.sourceVerified', false], ['sourceCoverage', undefined],
  ['sourceCoverage.expected', 6], ['sourceCoverage.availableRecords', 4], ['sourceCoverage.snapshotId', 'wrong'], ['sizes.sittings.1.path', 'data/sittings/1.json.gz'],
  ['servedBytes', undefined], ['servedBytes', { 'data/catalogue.json.gz': 204800 }],
  ['runner.cpu', ''], ['runner.image', ''], ['runner.node', '26.0.0'], ['runner.browser', ''],
  ['runner.os', 'Windows'], ['runner.browserProcesses', 2], ['runner.concurrentMeasurements', 2], ['runner.tools', undefined],
  ['profiles', []], ['profiles.1.profile', 'mobile'], ['profiles.0.viewport', [1440, 900]], ['profiles.1.viewport', [390, 844]],
  ['profiles.0.downloadKbps', 1638.4], ['profiles.0.uploadKbps', 768], ['profiles.0.rttMs', 151], ['profiles.0.cpuSlowdown', 1],
  ['profiles.1.downloadKbps', 10240], ['profiles.1.uploadKbps', 2048], ['profiles.1.rttMs', 41], ['profiles.1.cpuSlowdown', 4],
  ['profiles.0.coldCacheCleared', false], ['profiles.1.repeatPrepopulated', false], ['profiles.0.completeValidatedResults', false],
  ['profiles.0.interactionKinds', ['selection']], ['profiles.0.lcpMs', undefined], ['profiles.0.lcpMs', Array(20).fill(NaN)],
  ['profiles.0.cls', Array(20).fill(-1)], ['profiles.1.processing', []], ['profiles.0.processing.1.dataset', 'median'],
  ['profiles.0.processing.0.fixtureHash', 'e'.repeat(64)], ['profiles.0.processing.1.fixturePath', 'data/sittings/unknown.json.gz'],
  ['profiles.0.processing.0.fixturePath', 'data/sittings/1.json.gz'],
  ['profiles.0.processing.2.ms', Array(19).fill(500)],
  ['devices.0.offlineMs', Array(9).fill(2000)], ['devices.0.offlineMs', Array(11).fill(2000)],
  ['devices.1.offlineMs', Array(10).fill(-1)], ['devices.2.online', []],
  ['devices.0.downloadKbps', 1638.4], ['devices.1.uploadKbps', 768], ['devices.2.downloadKbps', 10240],
  ['devices.0.rttMs', 151], ['devices.2.cpuSlowdown', 4], ['devices.0.viewport', [390, 844]],
  ['devices.2.viewport', [390, 844]], ['devices.2.power', 'battery'], ['devices.0.batterySaver', true],
  ['devices.0.unrelatedApplicationsClosed', false], ['devices.0.offlineClosed', false], ['devices.0.offlineNetworkDisabled', false],
  ['devices.0.savedComplete', false], ['devices.0.onlineComplete', false], ['devices.0.offlineScenarios', ['largest']],
  ['devices.0.stableAtAcceptance', false], ['devices.0.browserVersion', ''], ['devices.0.os', ''], ['devices.0.localeChecks', ['en']],
  ['devices.0.candidate.artifactDigest', 'e'.repeat(64)], ['devices.0.candidate.snapshotId', 'wrong'],
  ['devices.0.reviewedAt', '2026-10-01T04:00:00.000Z'], ['devices.0.reviewedAt', '2026-10-11T04:00:00.000Z'],
  ['reviewedAt', '2026-10-03T03:59:59.999Z'], ['reviewedAt', '2026-10-10T04:00:00.001Z'], ['reviewedAt', 'not UTC'],
  ['origin.trusted', false], ['origin.repository', 'another/repository'], ['field.mobile', undefined], ['field.desktop', 'passed'],
] as const)('T063 rejects missing or mismatched evidence %s (%j)', rejectsEvidence);

/**
 * Checks processing independently for every named dataset in both lab profiles.
 * @param profile Laboratory profile index.
 * @param dataset Dataset index within median/p95/largest.
 * @returns Nothing; asserts p95 processing cannot borrow another dataset/profile's pass.
 * @remarks Changes only temporary controlled timing arrays.
 */
function rejectsEveryProcessing(profile: number, dataset: number): void {
  const input = report();
  input.profiles[profile].processing[dataset].ms[18] = profile === 0 ? 501 : 201;
  input.profiles[profile].processing[dataset].ms[19] = profile === 0 ? 501 : 201;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]])('T063 rejects profile %i dataset %i p95 processing exceedance', rejectsEveryProcessing);

/**
 * Checks each cold metric/operation independently on the desktop lab profile too.
 * @param field Laboratory metric/operation field.
 * @param value One-unit or representable increment over its ceiling.
 * @returns Nothing; asserts independent desktop rejection.
 * @remarks Changes one controlled desktop run array.
 */
function rejectsDesktopTiming(field: string, value: number): void {
  const input = report(); input.profiles[1][field] = Array(20).fill(value);
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([['lcpMs', 2501], ['cls', 0.1001], ['tbtMs', 201], ['coldCatalogueMs', 5001], ['repeatReaderMs', 1001], ['interactionMs', 201]] as const)(
  'T063 rejects desktop %s ceiling exceedance', rejectsDesktopTiming);

/**
 * Checks exact p95 rank instead of averages/maxima for interactive operations.
 * @returns Nothing; accepts one upper-tail outlier and rejects a p95-rank exceedance.
 * @remarks Changes controlled interaction measurements only.
 */
function nearestRankP95(): void {
  const input = report(); input.profiles[0].interactionMs[19] = 9000;
  expect(evaluateBudgets(input)).toBe(true);
  input.profiles[0].interactionMs[18] = 201;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 uses nearest-rank p95 rather than averaging or requiring every lab run', nearestRankP95);

/**
 * Checks online failures remain counted when no successful timing was obtainable.
 * @returns Nothing; accepts exactly one failure and rejects a second failure per target.
 * @remarks Changes controlled online attempts, preserving thirty entries.
 */
function unsuccessfulOnline(): void {
  const input = report(); input.devices[1].online[0] = { sittingId: '1', decodedBytes: 5242880, ms: null, success: false };
  expect(evaluateBudgets(input)).toBe(true);
  input.devices[1].online[1].success = false;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 preserves untimed retrieval failures in each target denominator', unsuccessfulOnline);

/**
 * Checks all five online sittings have independently represented text sizes.
 * @param sameSize Whether only size variety, rather than sitting identity, is removed.
 * @returns Nothing; rejects insufficient sitting or size coverage.
 * @remarks Changes controlled attempts only.
 */
function rejectsSittingVariety(sameSize: boolean): void {
  const input = report();
  if (sameSize) {
    for (const sitting of input.sizes.sittings) sitting.decoded = 100;
    input.expectedCandidate.fixtureHashes = { 'data/catalogue.json.gz': 'c'.repeat(64), 'data/sittings/3.json.gz': 'c'.repeat(64), 'data/sittings/5.json.gz': 'c'.repeat(64) };
    input.candidate = structuredClone(input.expectedCandidate);
    for (const profile of input.profiles) for (const measurement of profile.processing) measurement.fixturePath = measurement.dataset === 'median' ? 'data/sittings/3.json.gz' : 'data/sittings/5.json.gz';
    for (const device of input.devices) { device.candidate = structuredClone(input.expectedCandidate); for (const attempt of device.online) attempt.decodedBytes = 100; }
    input.servedBytes['data/sittings/3.json.gz'] = 524288; input.servedBytes['data/sittings/5.json.gz'] = 524288;
  }
  for (const attempt of input.devices[0].online) {
    if (sameSize) attempt.decodedBytes = 100;
    else { attempt.sittingId = '1'; attempt.decodedBytes = 5242880; }
  }
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test.each([false, true])('T063 requires five differently sized sittings (sameSize=%s)', rejectsSittingVariety);

/**
 * Accepts the exact seven-day evidence boundary and independent field-data disclosures.
 * @returns Nothing; accepts valid retention while keeping field targets unverified.
 * @remarks Changes controlled evidence dates and disclosure labels only.
 */
function exactRetention(): void {
  const input = report(); input.reviewedAt = '2026-10-03T04:00:00.000Z';
  input.field.mobile = 'insufficient';
  expect(evaluateBudgets(input)).toBe(true);
}
test('T063 accepts exactly seven-day unchanged evidence and separate unavailable/insufficient field data', exactRetention);

/**
 * Rejects an invalid calendar date even when Date.parse normalizes it into the age window.
 * @returns Nothing; asserts the review timestamp is a real UTC instant.
 * @remarks Changes only controlled report clocks.
 */
function rejectsNormalizedCalendar(): void {
  const input = report(); input.now = '2026-05-01T04:00:00.000Z'; input.reviewedAt = '2026-04-31T03:00:00.000Z';
  for (const device of input.devices) device.reviewedAt = input.now;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('T063 rejects impossible calendar dates normalized by Date.parse', rejectsNormalizedCalendar);

/**
 * Creates a layout-only artifact with tiny JSON that cannot prove source validation.
 * @returns Temporary artifact path.
 * @remarks Creates temporary shell/icons/data files and registers later removal.
 * @throws Filesystem errors if a temporary artifact cannot be created.
 */
async function artifactFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'hansard-performance-')); directories.push(root);
  await mkdir(join(root, 'data', 'sittings'), { recursive: true });
  await mkdir(join(root, 'icons'), { recursive: true });
  const files = { 'index.html': '<html></html>', 'app.js': 'export {};', 'app.css': 'body{}',
    'manifest.webmanifest': '{}', 'sw.js': '/*worker*/', 'icons/icon-192.png': 'controlled-icon', 'icons/icon-512.png': 'controlled-large-icon' };
  for (const [name, text] of Object.entries(files)) await writeFile(join(root, name), text);
  await writeFile(join(root, 'data/catalogue.json.gz'), gzipSync('{}', { level: 9 }));
  await writeFile(join(root, 'data/sittings/1.json.gz'), gzipSync('{}', { level: 9 }));
  return root;
}

/**
 * Requires every shell/icon/data asset rather than silently passing an omitted file.
 * @param path Required frozen-artifact path to remove.
 * @returns Resolves after the incomplete-layout rejection assertion.
 * @remarks Creates/removes temporary fixture files only.
 */
async function rejectsMissingAsset(path: string): Promise<void> {
  const root = await artifactFixture(); await rm(join(root, path), { force: true });
  await expect(measureArtifact(root)).rejects.toThrow();
}
test.each(['index.html', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'data/catalogue.json.gz', 'data/sittings/1.json.gz'])(
  'T063 rejects omitted required artifact asset %s', rejectsMissingAsset);

/**
 * Rejects unsupported gzip/UTF-8/JSON or byte bounds before accepting measurements.
 * @param kind Invalid representation or limit to exercise.
 * @returns Resolves after the independently invalid resource is rejected.
 * @remarks Creates and mutates temporary generated data files.
 */
async function rejectsDataRepresentation(kind: string): Promise<void> {
  const root = await artifactFixture();
  let path = 'data/catalogue.json.gz';
  let bytes: Buffer = Buffer.from('not gzip');
  if (kind === 'utf8') bytes = gzipSync(Buffer.from([0xc3, 0x28]));
  if (kind === 'json') bytes = gzipSync('not JSON');
  if (kind === 'catalogue-gzip') bytes = Buffer.alloc(1048577);
  if (kind === 'sitting-gzip') { path = 'data/sittings/1.json.gz'; bytes = Buffer.alloc(524289); }
  if (kind === 'decoded') bytes = gzipSync('"' + 'a'.repeat(5242879) + '"');
  await writeFile(join(root, path), bytes);
  await expect(measureArtifact(root)).rejects.toThrow();
}
test.each(['gzip', 'utf8', 'json', 'catalogue-gzip', 'sitting-gzip', 'decoded'])(
  'T063 rejects resource representation/bounds %s', rejectsDataRepresentation);

/**
 * Accepts bounded stored-gzip and decoded-byte measurements without asserting valid source data.
 * @param kind Independent bounded stored-gzip or decoded resource.
 * @returns Resolves after bounded measurements are accepted as layout-only.
 * @remarks Creates large but bounded temporary resource files for measurement.
 */
async function measuresExactResourceLimits(kind: string): Promise<void> {
  const root = await artifactFixture();
  const small = gzipSync('{}', { level: 9 });
  if (kind === 'catalogue-gzip') await writeFile(join(root, 'data/catalogue.json.gz'), Buffer.concat([small, Buffer.alloc(204800 - small.length)]));
  if (kind === 'sitting-gzip') await writeFile(join(root, 'data/sittings/1.json.gz'), Buffer.concat([small, Buffer.alloc(524288 - small.length)]));
  if (kind === 'decoded') await writeFile(join(root, 'data/catalogue.json.gz'), gzipSync('"' + 'a'.repeat(5242878) + '"', { level: 9 }));
  const measured = await measureArtifact(root);
  const expected = kind === 'catalogue-gzip' ? { catalogueGzip: 204800 } : kind === 'sitting-gzip' ? { sittings: [{ gzip: 524288 }] } : { catalogueDecoded: 5242880 };
  expect(measured).toMatchObject({ ...expected, sourceVerified: false });
}
test.each(['catalogue-gzip', 'sitting-gzip', 'decoded'])('T063 measures bounded %s resource without calling layout source-verified', measuresExactResourceLimits);

/**
 * Prevents private metadata/receipt inclusion or symlink escape in a frozen artifact.
 * @param kind Unsafe path form to exercise.
 * @returns Resolves after measurement rejects the unsafe artifact.
 * @remarks Creates temporary private-path/symlink fixtures; no project paths are changed.
 */
async function rejectsUnsafeArtifact(kind: string): Promise<void> {
  const root = await artifactFixture();
  if (kind === 'symlink') {
    const outside = await mkdtemp(join(tmpdir(), 'hansard-outside-')); directories.push(outside);
    await writeFile(join(outside, 'secret.txt'), 'outside');
    await symlink(outside, join(root, 'escape'));
  } else {
    const path = kind === 'private-state' ? '.cache/receipt.json' : kind === 'report' ? 'evidence/performance.json' : 'candidate.json';
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), '{}');
  }
  await expect(measureArtifact(root)).rejects.toThrow();
}
test.each(['symlink', 'private-state', 'report', 'candidate'])(
  'T063 rejects escaped/private artifact paths %s rather than omitting them from its hash', rejectsUnsafeArtifact);

/**
 * Creates a coherent five-sitting controlled snapshot and independently derived report.
 * @returns Artifact directory and synthetic report with exact stored-byte fingerprints.
 * @remarks Writes temporary normalized fixtures; none establish official archive completeness.
 */
async function verifiedFixture(): Promise<{ root: string; input: Record<string, any> }> {
  const root = await artifactFixture();
  await rm(join(root, 'data/sittings/1.json.gz'));
  const catalogue = catalogueFixture();
  const first = structuredClone(catalogue.sittings[0]);
  catalogue.sittings = [];
  catalogue.coverage.latestInventoryCount = 5;
  catalogue.coverage.endDate = '2014-07-27';
  const sizes: Array<Record<string, any>> = [];
  for (let index = 0; index < 5; index += 1) {
    const sitting = structuredClone(first);
    sitting.id = String(26241 + index); sitting.date = `2014-07-${23 + index}`;
    sitting.filename = `dr_${sitting.date}`;
    sitting.sourceUrl = `https://hansard.parlimen.gov.my/hansard/dewan-rakyat/${sitting.date}`;
    sitting.record.path = `data/sittings/${sitting.id}.json.gz`;
    const record: SittingRecord = { schemaVersion: 1, sittingId: sitting.id, sourceUrl: sitting.sourceUrl,
      identity: { date: sitting.date, parliament: sitting.parliament, penggal: sitting.penggal, mesyuarat: sitting.mesyuarat,
        house: sitting.house, filename: sitting.filename, isFinal: sitting.isFinal },
      items: [0, 1].map(controlledItem.bind(null, index)),
    };
    const decoded = Buffer.from(JSON.stringify(record));
    const gzip = gzipSync(decoded, { level: 9 });
    sitting.record.digest = createHash('sha256').update(decoded).digest('hex');
    sitting.record.compressedBytes = gzip.length; sitting.record.decodedBytes = decoded.length;
    catalogue.sittings.push(sitting);
    await writeFile(join(root, sitting.record.path), gzip);
    sizes.push({ path: sitting.record.path, gzip: gzip.length, decoded: decoded.length });
  }
  const catalogueBytes = Buffer.from(JSON.stringify(catalogue));
  const catalogueGzip = gzipSync(catalogueBytes, { level: 9 });
  await writeFile(join(root, 'data/catalogue.json.gz'), catalogueGzip);
  const paths = ['app.css', 'app.js', 'data/catalogue.json.gz', 'data/sittings/26241.json.gz', 'data/sittings/26242.json.gz',
    'data/sittings/26243.json.gz', 'data/sittings/26244.json.gz', 'data/sittings/26245.json.gz',
    'icons/icon-192.png', 'icons/icon-512.png', 'index.html', 'manifest.webmanifest', 'sw.js'];
  const entries: Array<[string, number, string]> = [];
  const hashes: Record<string, string> = {};
  const input = report();
  let shellGzip = 0; let jsGzip = 0; let iconBytes = 0; let artifactBytes = 0;
  input.servedBytes = {};
  for (const path of paths) {
    const bytes = await readFile(join(root, path));
    const hash = createHash('sha256').update(bytes).digest('hex');
    entries.push([path, bytes.length, hash]); hashes[path] = hash; artifactBytes += bytes.length;
    input.servedBytes[path] = bytes.length;
    if (path.startsWith('icons/')) iconBytes += bytes.length;
    else if (!path.startsWith('data/')) { shellGzip += gzipSync(bytes, { level: 9 }).length; }
    if (path.endsWith('.js')) jsGzip += gzipSync(bytes, { level: 9 }).length;
  }
  const artifactDigest = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
  input.expectedCandidate.artifactDigest = artifactDigest;
  input.expectedCandidate.fixtureHashes = { 'data/catalogue.json.gz': hashes['data/catalogue.json.gz'],
    'data/sittings/26243.json.gz': hashes['data/sittings/26243.json.gz'], 'data/sittings/26245.json.gz': hashes['data/sittings/26245.json.gz'] };
  input.candidate = structuredClone(input.expectedCandidate);
  input.sizes = { shellGzip, jsGzip, iconBytes, artifactBytes, catalogueGzip: catalogueGzip.length,
    catalogueDecoded: catalogueBytes.length, sittings: sizes, complete: true, layoutComplete: true, sourceVerified: true };
  for (const profile of input.profiles) {
    for (const measurement of profile.processing) {
      measurement.fixturePath = measurement.dataset === 'median' ? 'data/sittings/26243.json.gz' : 'data/sittings/26245.json.gz';
      measurement.fixtureHash = hashes[measurement.fixturePath];
    }
  }
  input.now = new Date().toISOString(); input.reviewedAt = input.now;
  for (const device of input.devices) {
    device.candidate = structuredClone(input.expectedCandidate); device.reviewedAt = input.now;
    for (let index = 0; index < device.online.length; index += 1) {
      device.online[index].sittingId = String(26241 + index % 5);
      device.online[index].decodedBytes = sizes[index % 5].decoded;
    }
  }
  return { root, input };
}

/**
 * Supplies a schema-valid controlled assigned item for source-validator integration.
 * @param index Length variation for a controlled sitting.
 * @param ordinal Exact normalized source order within this controlled record.
 * @returns Synthetic original-text item attributed to a fixture's known source ID.
 */
function controlledItem(index: number, ordinal: number) {
  return { ordinal, sourceIndex: ordinal, sectionPath: [], text: 'controlled '.repeat(index + 1), rawAuthor: 'LIM GUAN ENG',
    sourceAuthorId: '1839', memberId: '1839', attribution: 'assigned' as const, timestamp: null, gapReason: null };
}

/**
 * Requires shared source validation plus exact descriptor sizes/digests and all shards.
 * @returns Resolves after a coherent controlled snapshot is independently verified.
 * @remarks Creates temporary source/schema fixtures only.
 */
async function verifiesSources(): Promise<void> {
  const item = await verifiedFixture();
  const measured = await measureArtifact(item.root) as Record<string, any>;
  expect(measured).toMatchObject({ sourceVerified: true, layoutComplete: true, artifactDigest: item.input.candidate.artifactDigest });
  await writeFile(join(item.root, 'data/sittings/26241.json.gz'), gzipSync('{}'));
  const changed = await measureArtifact(item.root) as Record<string, any>;
  expect(changed.sourceVerified).toBe(false);
}
test('T063 verifies complete schema/reference/digest coverage separately from layout', verifiesSources);

/**
 * Rejects an independently broken normalized snapshot while preserving layout measurement.
 * @param kind Source replacement/reference failure to isolate.
 * @returns Resolves after sourceVerified is false for the broken controlled snapshot.
 * @remarks Replaces temporary source files after constructing a coherent fixture.
 */
async function rejectsSourceSnapshot(kind: string): Promise<void> {
  const item = await verifiedFixture();
  if (kind === 'digest') await writeFile(join(item.root, 'data/sittings/26241.json.gz'), gzipSync('{}'));
  if (kind === 'catalogue-schema') await writeFile(join(item.root, 'data/catalogue.json.gz'), gzipSync('{}'));
  if (kind === 'missing-shard') await rm(join(item.root, 'data/sittings/26241.json.gz'));
  if (kind === 'extra-shard') await writeFile(join(item.root, 'data/sittings/999.json.gz'), gzipSync('{}'));
  expect(await measureArtifact(item.root)).toMatchObject({ sourceVerified: false });
}
test.each(['digest', 'catalogue-schema', 'missing-shard', 'extra-shard'])(
  'T063 incomplete source snapshot cannot borrow a layout pass (%s)', rejectsSourceSnapshot);

/**
 * Exercises controlled positive/negative CLI exits without actual-device assertions.
 * @param kind Successful, changed-artifact or false-counter fixture invocation.
 * @returns Resolves after the checker exits correctly for the independent case.
 * @remarks Writes temporary evidence outside the artifact and starts local Node processes.
 */
async function checksCli(kind: string): Promise<void> {
  const item = await verifiedFixture();
  const evidence = await mkdtemp(join(tmpdir(), 'hansard-performance-report-')); directories.push(evidence);
  const candidatePath = join(evidence, 'candidate.json'); const reportPath = join(evidence, 'report.json');
  if (kind === 'false-sizes') item.input.sizes.shellGzip = 1;
  if (kind === 'budget') item.input.profiles[0].lcpMs = Array(20).fill(2501);
  if (kind === 'runner') item.input.runner.vcpus = 2;
  if (kind === 'hardware') item.input.devices[0].hardware = 'substituted hardware';
  if (kind.startsWith('missing-')) item.input.devices = item.input.devices.filter(keepsTarget.bind(null, kind.slice('missing-'.length)));
  await writeFile(candidatePath, JSON.stringify(item.input.expectedCandidate)); await writeFile(reportPath, JSON.stringify(item.input));
  const args = [resolve('scripts/check-performance.ts'), '--artifact', item.root, '--candidate', candidatePath, '--report', reportPath];
  if (kind === 'changed') await writeFile(join(item.root, 'app.js'), 'changed after the supplied report');
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  expect(result.status).toBe(kind === 'pass' ? 0 : 1);
  if (kind === 'changed') expect(result.stderr).toContain('artifact digest');
  if (kind === 'false-sizes') expect(result.stderr).toContain('measured sizes');
  if (kind === 'budget') expect(result.stderr).toContain('percentile exceeded');
  if (kind === 'runner') expect(result.stderr).toContain('runner allocation');
  if (kind === 'hardware') expect(result.stderr).toContain('hardware mismatch');
  if (kind.startsWith('missing-')) expect(result.stderr).toContain('six actual-target');
}
test.each(['pass', 'changed', 'false-sizes', 'budget', 'runner', 'hardware', 'missing-android-chrome', 'missing-iphone-safari',
  'missing-desktop-chrome', 'missing-desktop-edge', 'missing-desktop-firefox', 'missing-desktop-safari'])(
  'T063 CLI compares measured bytes/counters with the frozen candidate (%s)', checksCli);

/**
 * Rejects absent frozen metadata for a required ranked processing dataset.
 * @param path Median or shared p95/largest path whose evidence is omitted consistently.
 * @returns Nothing; asserts missing hashes/served measurements cannot compare as undefined.
 */
function rejectsMissingRankedFixture(path: string): void {
  const input = report();
  delete input.expectedCandidate.fixtureHashes[path]; delete input.candidate.fixtureHashes[path];
  for (const device of input.devices) delete device.candidate.fixtureHashes[path];
  for (const profile of input.profiles) for (const processing of profile.processing) if (processing.fixturePath === path) delete processing.fixtureHash;
  delete input.servedBytes[path];
  expect(
    /** Exercises the missing frozen-dataset trust boundary. @returns True only if missing evidence is incorrectly accepted. @throws Required rejection of absent ranked fixture metadata. */
    () => evaluateBudgets(input),
  ).toThrow();
}
test.each(['data/sittings/4.json.gz', 'data/sittings/1.json.gz'])(
  'T063 regression rejects omitted frozen hash and served bytes for ranked dataset %s', rejectsMissingRankedFixture);

/**
 * Accepts the approved catalogue allowance above the former 200-KiB ceiling.
 * @param bytes Stored catalogue size within the approved 1-MiB allowance.
 * @returns Nothing; asserts the policy accepts otherwise complete synthetic evidence.
 */
function acceptsCataloguePolicy(bytes: number): void {
  const input = report(); input.sizes.catalogueGzip = bytes;
  expect(evaluateBudgets.bind(null, input)).not.toThrow();
}
test.each([204801, 1048576])('Catalogue policy accepts stored gzip size %i through 1 MiB', acceptsCataloguePolicy);

/**
 * Measures a real on-disk gzip resource at the approved stored catalogue ceiling.
 * @returns Resolves after exact stored and decoded sizes are accepted as layout-only.
 * @remarks Writes and measures a temporary valid gzip with legal zero padding.
 */
async function measuresCataloguePolicyCap(): Promise<void> {
  const root = await artifactFixture(); const gzip = gzipSync('{}', { level: 9 });
  await writeFile(join(root, 'data/catalogue.json.gz'), Buffer.concat([gzip, Buffer.alloc(1048576 - gzip.length)]));
  await expect(measureArtifact(root)).resolves.toMatchObject({ catalogueGzip: 1048576, catalogueDecoded: 2, sourceVerified: false });
}
test('Catalogue policy measures the full 1-MiB stored gzip allowance', measuresCataloguePolicyCap);

/**
 * Retains rejection at one byte above the newly approved catalogue cap.
 * @returns Nothing; asserts the cap remains a bound on complete synthetic evidence.
 */
function rejectsCataloguePolicyOverCap(): void {
  const input = report(); input.sizes.catalogueGzip = 1048577;
  expect(evaluateBudgets.bind(null, input)).toThrow();
}
test('Catalogue policy rejects reported stored gzip one byte above 1 MiB', rejectsCataloguePolicyOverCap);

/**
 * Rejects a valid real gzip resource at one byte above the approved stored cap.
 * @returns Resolves after the physical resource fails the measurement bound.
 * @remarks Writes and measures a temporary valid gzip with legal zero padding.
 */
async function rejectsMeasuredCataloguePolicyOverCap(): Promise<void> {
  const root = await artifactFixture(); const gzip = gzipSync('{}', { level: 9 });
  await writeFile(join(root, 'data/catalogue.json.gz'), Buffer.concat([gzip, Buffer.alloc(1048577 - gzip.length)]));
  await expect(measureArtifact(root)).rejects.toThrow(/compressed bytes/);
}
test('Catalogue policy rejects measured stored gzip one byte above 1 MiB', rejectsMeasuredCataloguePolicyOverCap);
