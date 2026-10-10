import { afterEach, expect, test, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { acquire, discoverBuildId, requestOfficial, stageSnapshot, validateSizes } from '../../scripts/acquire.ts';
import type { Catalogue } from '../../src/source.ts';
import { catalogueFixture } from '../fixtures/catalogue.ts';

const origin = 'https://hansard.parlimen.gov.my';
const fixture = JSON.parse(await readFile('tests/fixtures/source-samples.json', 'utf8'));
const scratch: string[] = [];

/** Cleans controlled disk state and clocks after each assertion. @returns Resolves after isolated test cleanup. @remarks Removes only controlled temporary paths and resets test clocks/mocks. @throws On unexpected filesystem cleanup errors. */
async function cleanup(): Promise<void> {
  vi.useRealTimers();
  vi.restoreAllMocks();
  elapsed = 0;
  for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true });
}
afterEach(cleanup);

/**
 * Creates isolated acquisition paths, never touching generated production data.
 * @returns Fresh state/output paths; creates a temporary directory.
 */
async function paths(): Promise<{ state: string; out: string }> {
  const root = await mkdtemp(join(tmpdir(), 'hansard-unit-'));
  scratch.push(root);
  return { state: join(root, 'state'), out: join(root, 'out') };
}

/**
 * Returns one controlled sitting inventory preserving its source hierarchy.
 * @returns Official-shape partial fixture for 2014-07-23 only, not archive completeness.
 */
function inventory(): unknown {
  const node = structuredClone(fixture.archive['13']['2']['0']);
  node.sitting_list = node.sitting_list.filter(matchesDate);
  return { pageProps: { archive: { '13': { start_date: fixture.archive['13'].start_date, end_date: fixture.archive['13'].end_date, '2': { start_date: fixture.archive['13']['2'].start_date, end_date: fixture.archive['13']['2'].end_date, '0': node } } } } };
}

/** Selects the source-derived sitting used by acquisition tests. @param value - Controlled source entry. @returns Whether it is the selected fixture date. */
function matchesDate(value: { date: string }): boolean {
  return value.date === '2014-07-23';
}

/**
 * Serves approved anonymous source routes and records every requested URL.
 * @param input - Requested URL.
 * @returns Controlled response; unavailable routes return 404.
 * @throws On a nonofficial request, so boundary leaks are observable.
 */
async function sourceFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'hansard.parlimen.gov.my') throw new Error('Nonofficial request');
  if (url.pathname === '/') return new Response('<script id="__NEXT_DATA__">{"buildId":"test-build"}</script>');
  if (url.pathname.endsWith('/cari-mp.json')) return Response.json({ pageProps: { speakers: fixture.members } });
  if (url.pathname.endsWith('/katalog/dewan-rakyat.json')) return Response.json(inventory());
  if (url.pathname.endsWith('/2014-07-23.json') && url.searchParams.get('date') === '2014-07-23') {
    return Response.json({ pageProps: fixture.records['2014-07-23'] });
  }
  return new Response('missing', { status: 404 });
}

/**
 * Builds controlled local acquisition options with an advancing clock to avoid real delays.
 * @param disk - Isolated output/state directories.
 * @param transport - Source response boundary.
 * @returns Options for bootstrap with test-only time and transport dependencies.
 */
function options(disk: { state: string; out: string }, transport: typeof fetch = sourceFetch): unknown {
  return { ...disk, mode: 'bootstrap', transport, repository: 'eaglecheow/vote-better-malaysia',
    branch: 'main', codeFingerprint: 'a'.repeat(64), workflowContext: false, now, sleep };
}

let elapsed = 0;
/** Supplies the acquisition test clock. @returns A controlled UTC millisecond time; does not imply a source publication time. */
function now(): number { return Date.parse('2026-10-10T04:00:00.000Z') + elapsed; }
/** Advances the acquisition test clock without waiting. @param ms - Requested wait. @returns Resolves after advancing only the controlled clock. @remarks Updates the controlled elapsed clock. */
async function sleep(ms: number): Promise<void> { elapsed += ms; }

/** Hashes exact fixture bytes for content-integrity assertions. @param value - Exact bytes. @returns Their SHA-256 without changing the input. */
function digest(value: Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }

/**
 * Asserts discovery uses the current public deployment ID instead of research metadata.
 * @returns Nothing; throws on assertion failure.
 */
function validDiscovery(): void {
  expect(discoverBuildId('<script id="__NEXT_DATA__" type="application/json">{"buildId":"new-build_2"}</script>')).toBe('new-build_2');
}
test('T013 discovery accepts a validated __NEXT_DATA__ deployment ID', validDiscovery);

/** Checks rejection of malformed source deployment metadata. @param html - Invalid discovery body. @returns Nothing; asserts that it is rejected. */
function invalidDiscovery(html: string): void { expect(discoverBuildId.bind(null, html)).toThrow(); }
test.each([
  '<html>no deployment metadata</html>',
  '<script id="__NEXT_DATA__">{"buildId":"../other-host"}</script>',
  '<script id="__NEXT_DATA__">{"buildId":42}</script>',
  '<script id="__NEXT_DATA__">{"buildId":""}</script>',
  '<script id="__NEXT_DATA__">not-json</script>',
])('T013 discovery rejects unsupported build metadata: %s', invalidDiscovery);

/** Checks official-source URL restrictions before any request. @param url - Disallowed route. @returns Resolves when no nonofficial request is made. */
async function rejectsHost(url: string): Promise<void> {
  const transport = vi.fn(sourceFetch);
  await expect(requestOfficial(url, transport)).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
}
test.each(['https://example.com/', 'http://hansard.parlimen.gov.my/', `${origin}/../private`, `${origin}/_next/data/x/private.json`])(
  'T013 request boundary rejects nonofficial or unapproved URL %s', rejectsHost);

/** Checks request timeout and redirect configuration. @returns Resolves when the approved response is returned with a 15-second abort signal. */
async function approvedRequest(): Promise<void> {
  const transport = vi.fn(approvedResponse);
  const result = await requestOfficial(`${origin}/`, transport);
  expect(result).toBeInstanceOf(Response);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][1]?.redirect).toBe('manual');
  expect(transport.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
}
/** Supplies a successful controlled official response. @param _input - Request target. @param _init - Fetch options. @returns Controlled successful response. */
async function approvedResponse(_input: string | URL | Request, _init?: RequestInit): Promise<Response> { return new Response('okay'); }
test('T013 approved requests use manual redirects and a timeout signal', approvedRequest);

/** Checks that off-host redirects are not followed. @returns Resolves when an off-host redirect is rejected before it is followed. */
async function rejectsRedirect(): Promise<void> {
  const transport = vi.fn(redirectResponse);
  await expect(requestOfficial(`${origin}/`, transport)).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
}
/** Supplies an off-host redirect for boundary testing. @returns A controlled redirect outside the official source host. */
async function redirectResponse(): Promise<Response> { return new Response(null, { status: 302, headers: { location: 'https://example.com/private' } }); }
test('T013 rejects off-host redirects without requesting their target', rejectsRedirect);

/** Checks that source access denial stops acquisition. @returns Resolves when access denial stops retries instead of falling back to another source. */
async function rejectsDenial(): Promise<void> {
  const transport = vi.fn(deniedResponse);
  await expect(requestOfficial(`${origin}/`, transport)).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
}
/** Supplies a source access-denied response. @returns A controlled access-denied response. */
async function deniedResponse(): Promise<Response> { return new Response('denied', { status: 403 }); }
test('T013 access denial stops source requests', rejectsDenial);

/** Checks full staging, gzip, leaf accounting and source-request pacing. @returns Resolves when bootstrap stages a coherent hashed/gzipped partial test snapshot. @remarks Resets only the controlled test clock. */
async function stagesSnapshot(): Promise<void> {
  elapsed = 0;
  const disk = await paths();
  const transport = vi.fn(sourceFetch);
  const run = await acquire(options(disk, transport)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { schemaVersion: 1, publishedAt: null, sittings: [
    { date: '2014-07-23', mesyuarat: 0, record: { availability: 'available', lastAttemptOutcome: 'success' } },
  ] } });
  const catalogue = JSON.parse(gunzipSync(await readFile(join(disk.out, 'catalogue.json.gz'))).toString());
  expect(catalogue).toEqual(run.catalogue);
  const sitting = run.catalogue.sittings[0];
  const stored = await readFile(join(disk.out, 'sittings', `${sitting.id}.json.gz`));
  const decoded = gunzipSync(stored);
  expect(digest(decoded)).toBe(sitting.record.digest);
  expect(sitting.record.rawSourceDigest).not.toBe(sitting.record.digest);
  expect(JSON.parse(decoded.toString()).items).toHaveLength(2);
  expect(transport.mock.calls.map(requestUrl)).toContain(`${origin}/_next/data/test-build/en-GB/hansard/dewan-rakyat/2014-07-23.json?date=2014-07-23`);
  expect(elapsed).toBeGreaterThanOrEqual(3000);
}
/** Extracts a recorded request URL without altering it. @param call - Recorded Fetch arguments. @returns The requested URL string. */
function requestUrl(call: [string | URL | Request, RequestInit?]): string { return String(call[0]); }
test('T013 bootstrap stages all supplied leaves with distinct hashes, gzip, dates and serial pacing', stagesSnapshot);

/** Checks rejection of malformed source inventory. @returns Resolves when schema failure rejects replacement without publishing an empty inventory. */
async function rejectsSchema(): Promise<void> {
  const disk = await paths();
  await expect(acquire(options(disk, invalidInventoryFetch))).rejects.toThrow();
}
/** Supplies a malformed inventory while preserving other controlled routes. @param input - Request target. @returns A malformed catalogue response, other routes stay controlled. */
async function invalidInventoryFetch(input: string | URL | Request): Promise<Response> {
  if (String(input).includes('/katalog/')) return Response.json({ pageProps: { archive: [] } });
  return sourceFetch(input);
}
test('T013 malformed source inventory blocks static replacement', rejectsSchema);

/** Checks isolation between public output and private state paths. @returns Resolves when overlapping state/output paths are rejected before requests or writes. */
async function rejectsPaths(): Promise<void> {
  const disk = await paths();
  const transport = vi.fn(sourceFetch);
  await expect(acquire(options({ state: disk.state, out: join(disk.state, 'public') }, transport))).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
}
test('T013 output cannot replace or overlap private input state', rejectsPaths);

const limits = [
  { field: 'catalogue-gzip', limit: 1_048_576 },
  { field: 'sitting-gzip', limit: 524_288 },
  { field: 'catalogue-decoded', limit: 5_242_880 },
  { field: 'sitting-decoded', limit: 5_242_880 },
  { field: 'total', limit: 900_000_000 },
];

/**
 * Builds isolated resource sizes at a single budget boundary; includes retained files.
 * @param field - Budget under test.
 * @param bytes - Requested size.
 * @returns Controlled size metadata; does not allocate an oversized artifact.
 */
function sizes(field: string, bytes: number): unknown {
  return {
    catalogue: { compressedBytes: field === 'catalogue-gzip' ? bytes : 100, decodedBytes: field === 'catalogue-decoded' ? bytes : 200 },
    sittings: [{ compressedBytes: field === 'sitting-gzip' ? bytes : 100, decodedBytes: field === 'sitting-decoded' ? bytes : 200 }],
    totalBytes: field === 'total' ? bytes : 300,
  };
}
/** Checks exact acquisition byte-limit acceptance. @param boundary - One enforced budget. @returns Nothing; asserts exact-limit acceptance. */
function acceptsLimit(boundary: { field: string; limit: number }): void {
  expect(validateSizes(sizes(boundary.field, boundary.limit))).toBe(true);
}
/** Checks acquisition byte-limit rejection. @param boundary - One enforced budget. @returns Nothing; asserts one-byte-over rejection. */
function rejectsLimit(boundary: { field: string; limit: number }): void {
  expect(validateSizes.bind(null, sizes(boundary.field, boundary.limit + 1))).toThrow();
}
test.each(limits)('T013 accepts exact $field byte ceiling', acceptsLimit);
test.each(limits)('T013 rejects one byte over $field ceiling', rejectsLimit);

/**
 * Creates a controlled previously accepted static snapshot and trusted checkpoint.
 * @param disk - Temporary directories.
 * @param isFinal - Controlled previous draft/final state, independent of the current source fixture.
 * @returns Original catalogue/shard/output bytes for replacement-preservation assertions.
 * @remarks Writes only isolated synthetic baseline/catalogue/shard/checkpoint files.
 */
async function baseline(disk: { state: string; out: string }, isFinal = true): Promise<{ catalogue: Catalogue; bytes: Buffer; shard: Buffer }> {
  const catalogue = catalogueFixture();
  const sitting = catalogue.sittings[0];
  sitting.isFinal = isFinal;
  const record = { schemaVersion: 1, sittingId: sitting.id, identity: {
    date: sitting.date, parliament: sitting.parliament, penggal: sitting.penggal,
    mesyuarat: sitting.mesyuarat, house: sitting.house, filename: sitting.filename, isFinal: sitting.isFinal,
  }, sourceUrl: sitting.sourceUrl, items: [
    { ordinal: 0, sourceIndex: 0, sectionPath: [], text: 'Controlled previous historical speech; not a source-derived absence case.', rawAuthor: null, sourceAuthorId: '22462', memberId: '22462', attribution: 'assigned', timestamp: null, gapReason: null },
    { ordinal: 1, sourceIndex: 1, sectionPath: [], text: 'Controlled previous exact-ID speech.', rawAuthor: null, sourceAuthorId: '1839', memberId: '1839', attribution: 'assigned', timestamp: null, gapReason: null },
  ] };
  const decoded = Buffer.from(JSON.stringify(record));
  const shard = gzipSync(decoded, { level: 9 });
  sitting.record.digest = digest(decoded);
  sitting.record.decodedBytes = decoded.byteLength;
  sitting.record.compressedBytes = shard.byteLength;
  sitting.record.accounting = { total: 2, assigned: 2, unassigned: 0, annotations: 0 };
  const bytes = gzipSync(JSON.stringify(catalogue), { level: 9 });
  await mkdir(join(disk.out, 'sittings'), { recursive: true });
  await mkdir(join(disk.state, 'sittings'), { recursive: true });
  await writeFile(join(disk.out, 'catalogue.json.gz'), bytes);
  await writeFile(join(disk.out, 'sittings', `${sitting.id}.json.gz`), shard);
  await writeFile(join(disk.state, 'sittings', `${sitting.id}.json.gz`), shard);
  await writeFile(join(disk.state, 'checkpoint.json'), JSON.stringify({
    originKind: 'workflow-artifact', schemaVersion: 1, repository: 'eaglecheow/vote-better-malaysia', branch: 'main',
    codeFingerprint: 'a'.repeat(64), createdAt: '2026-10-10T04:00:00.000Z',
    runId: '123', workflowUrl: 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123',
    success: true, catalogue, catalogueDigest: digest(Buffer.from(JSON.stringify(catalogue))),
    shardDigests: { [sitting.id]: digest(shard) }, servedReceipt: null,
  }));
  return { catalogue, bytes, shard };
}

/** Checks preservation of an accepted shard after source failure. @returns Resolves when an inaccessible known record keeps accepted bytes, identities and successful times. */
async function preservesFailedRecord(): Promise<void> {
  const disk = await paths();
  const previous = await baseline(disk);
  const run = await acquire(options(disk, unavailableRecordFetch)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ record: {
    availability: 'retained', digest: previous.catalogue.sittings[0].record.digest,
    acquiredAt: previous.catalogue.sittings[0].record.acquiredAt, lastAttemptOutcome: 'failed',
  } }] } });
  expect(await readFile(join(disk.out, 'sittings', '26241.json.gz'))).toEqual(previous.shard);
  expect(run.catalogue.members).toContainEqual(previous.catalogue.members[1]);
}
/** Supplies inaccessible sitting content while preserving inventory. @param input - Requested URL. @returns Missing record response, or the normal controlled source response. */
async function unavailableRecordFetch(input: string | URL | Request): Promise<Response> {
  if (String(input).includes('/hansard/dewan-rakyat/')) return new Response('missing', { status: 404 });
  if (String(input).endsWith('/cari-mp.json')) return Response.json({ pageProps: { speakers: fixture.members.filter(omitsHistoricalSpeaker) } });
  return sourceFetch(input);
}
/** Omits a historical source identity only for controlled retention tests. @param member - Raw speaker. @returns Whether it remains in this controlled latest source inventory. */
function omitsHistoricalSpeaker(member: { new_author_id: number }): boolean { return member.new_author_id !== 22462; }
test('T013 failed refresh retains accepted payload, digest, identity and acquisition time', preservesFailedRecord);

/** Checks explicit unavailable metadata for a new inaccessible sitting. @returns Resolves when a new inaccessible sitting stays listed with explicitly null accepted metadata. */
async function unavailableNewRecord(): Promise<void> {
  const disk = await paths();
  const run = await acquire(options(disk, unavailableRecordFetch)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ record: {
    availability: 'unavailable', path: null, digest: null, compressedBytes: null,
    decodedBytes: null, acquiredAt: null, rawSourceDigest: null, lastAttemptOutcome: 'failed',
  } }] } });
}
test('T013 new inaccessible sitting remains selectable as unavailable without invented accepted times', unavailableNewRecord);

/** Checks that a lost trusted baseline blocks replacement. @returns Resolves when missing trusted baseline blocks overwriting an existing publication. */
async function blocksLostBaseline(): Promise<void> {
  const disk = await paths();
  const previous = await baseline(disk);
  await rm(join(disk.state, 'checkpoint.json'));
  await expect(acquire(options(disk))).rejects.toThrow();
  expect(await readFile(join(disk.out, 'catalogue.json.gz'))).toEqual(previous.bytes);
}
test('T013 loss of a published retention baseline blocks replacement and preserves output', blocksLostBaseline);

/** Checks checkpoint provenance, expiry, schema and checksum rejection. @param change - Invalid trust metadata. @returns Resolves when it blocks replacement and preserves accepted bytes. */
async function rejectsCheckpoint(change: Record<string, unknown>): Promise<void> {
  const disk = await paths();
  const previous = await baseline(disk);
  const checkpoint = JSON.parse(await readFile(join(disk.state, 'checkpoint.json'), 'utf8'));
  Object.assign(checkpoint, change);
  await writeFile(join(disk.state, 'checkpoint.json'), JSON.stringify(checkpoint));
  await expect(acquire(options(disk))).rejects.toThrow();
  expect(await readFile(join(disk.out, 'catalogue.json.gz'))).toEqual(previous.bytes);
}
test.each([
  { repository: 'different/repository' }, { branch: 'pull-request' }, { success: false },
  { codeFingerprint: 'b'.repeat(64) }, { createdAt: '2026-10-01T04:00:00.000Z' },
  { catalogueDigest: 'f'.repeat(64) }, { shardDigests: { '26241': 'f'.repeat(64) } },
  { schemaVersion: 9 },
])('T013 rejects untrusted, expired or corrupt checkpoint %j', rejectsCheckpoint);

/** Checks safe bootstrap when refresh has no prior publication. @returns Resolves when refresh without accepted state safely runs bootstrap. */
async function refreshFallback(): Promise<void> {
  const disk = await paths();
  const input = options(disk) as Record<string, unknown>;
  input.mode = 'refresh';
  const run = await acquire(input) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ record: { availability: 'available' } }] } });
}
test('T013 refresh without prior publication or checkpoint performs safe bootstrap', refreshFallback);

/** Checks normalized content and gzip determinism. @returns Resolves when gzip/shard content is independent of preparation clock changes. @remarks Advances only the controlled test clock. */
async function deterministicContent(): Promise<void> {
  const first = await paths();
  const second = await paths();
  const a = await acquire(options(first)) as { catalogue: Catalogue };
  elapsed += 10000;
  const b = await acquire(options(second)) as { catalogue: Catalogue };
  expect(a).toMatchObject({ catalogue: { sittings: [{ record: { digest: expect.any(String) } }] } });
  expect(a.catalogue.sittings[0].record.digest).toEqual(b.catalogue.sittings[0].record.digest);
  expect(await readFile(join(first.out, 'sittings', '26241.json.gz'))).toEqual(await readFile(join(second.out, 'sittings', '26241.json.gz')));
}
test('T013 decoded content hashes and fixed gzip are deterministic across preparation times', deterministicContent);

/** Builds one shared request pacing/deadline context. @returns A controlled four-hour context with a fresh first-request marker. */
function requestContext(): unknown { return { now, sleep, startedAt: now(), lastStartedAt: null }; }

/** Checks retry and server backoff without waiting in real time. @param retryAfter - Controlled 429 header. @returns Resolves after exactly one retry with the required wait. */
async function honorsRetryAfter(retryAfter: string): Promise<void> {
  const responses = [new Response('limited', { status: 429, headers: { 'retry-after': retryAfter } }), new Response('accepted')];
  const transport = vi.fn(next);
  /** Supplies the next controlled rate-limit response. @returns The next response; assertions prevent excess requests. @remarks Consumes only the local response queue. */
  async function next(): Promise<Response> { return responses.shift()!; }
  const result = await requestOfficial(`${origin}/`, transport, requestContext());
  expect(result).toBeInstanceOf(Response);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(elapsed).toBeGreaterThanOrEqual(retryAfter === '2' ? 2000 : retryAfter.startsWith('Sat') ? 5000 : 1000);
}
test.each(['2', 'Sat, 10 Oct 2026 04:00:05 GMT', 'invalid'])('T013 honors numeric/date Retry-After or bounded fallback %s', honorsRetryAfter);

/** Checks capped retry/backoff for transient source errors. @returns Resolves when three failed HTTP attempts terminate instead of looping. */
async function capsRetries(): Promise<void> {
  const transport = vi.fn(unavailableService);
  await expect(requestOfficial(`${origin}/`, transport, requestContext())).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(3);
  expect(elapsed).toBeGreaterThanOrEqual(3000);
}
/** Supplies a transient source error. @returns A controlled 503 response. */
async function unavailableService(): Promise<Response> { return new Response('unavailable', { status: 503 }); }
test('T013 retries at most twice with backoff', capsRetries);

/** Checks successful transient recovery. @returns Resolves when one error and one successful response produce a usable result. */
async function retriesTransient(): Promise<void> {
  let count = 0;
  /** Supplies one transient failure before success. @returns The controlled response. @remarks Advances the local request count. */
  async function transient(): Promise<Response> { count++; return count === 1 ? new Response('busy', { status: 503 }) : new Response('okay'); }
  expect(await requestOfficial(`${origin}/`, transient, requestContext())).toBeInstanceOf(Response);
  expect(count).toBe(2);
  expect(elapsed).toBeGreaterThanOrEqual(1000);
}
test('T013 transient source recovery remains paced', retriesTransient);

/** Checks same-host redirect handling. @returns Resolves when approved official redirects remain manual and paced. */
async function followsOfficialRedirect(): Promise<void> {
  let count = 0;
  /** Supplies an approved same-host redirect followed by success. @param _input - Requested URL. @param init - Request options. @returns Controlled redirect or success. @remarks Advances only local count. */
  async function officialRedirect(_input: string | URL | Request, init?: RequestInit): Promise<Response> {
    expect(init?.redirect).toBe('manual');
    count++;
    return count === 1 ? new Response(null, { status: 302, headers: { location: '/_next/data/test-build/en-GB/cari-mp.json' } }) : new Response('okay');
  }
  expect(await requestOfficial(`${origin}/`, officialRedirect, requestContext())).toBeInstanceOf(Response);
  expect(count).toBe(2);
  expect(elapsed).toBeGreaterThanOrEqual(1000);
}
test('T013 follows only approved official-host redirects', followsOfficialRedirect);

/** Checks every request has a real fifteen-second timeout with at most two retries. @returns Resolves after three controlled aborts, with no timer leak. */
async function timesOutRequests(): Promise<void> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T04:00:00.000Z'));
  const waits: number[] = [];
  const transport = vi.fn(hangsUntilAbort);
  /** Keeps a controlled transport pending until its timeout signal aborts. @param _input - Request URL. @param init - Fetch options. @returns Rejection when the request aborts. @remarks Records actual fake-timer elapsed request time. */
  function hangsUntilAbort(_input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const started = Date.now();
    return new Promise(registerAbort);
    /** Registers the abort observer. @param _resolve - Unused success callback. @param reject - Promise rejection callback. @returns Nothing. */
    function registerAbort(_resolve: (value: Response) => void, reject: (reason: unknown) => void): void {
      init?.signal?.addEventListener('abort', aborted, { once: true });
      /** Records one observed abort. @returns Nothing. @remarks Appends to the controlled duration list. */
      function aborted(): void { waits.push(Date.now() - started); reject(new Error('aborted')); }
    }
  }
  const promise = requestOfficial(`${origin}/`, transport, { now: Date.now, sleep: timerSleep, startedAt: Date.now(), lastStartedAt: null });
  const outcome = promise.then(requestResolved, requestRejected);
  /** Captures an unexpected resolution without an unhandled assertion rejection. @param value - Resolved request value. @returns A controlled outcome indicating no rejection. */
  function requestResolved(value: unknown): unknown { return { rejected: false, value }; }
  /** Captures a boundary rejection before advancing fake timers. @param error - Observed request failure. @returns A controlled rejection outcome. */
  function requestRejected(error: unknown): unknown { return { rejected: true, error }; }
  await vi.advanceTimersByTimeAsync(48000);
  expect(await outcome).toMatchObject({ rejected: true });
  expect(transport).toHaveBeenCalledTimes(3);
  expect(waits).toEqual([15000, 15000, 15000]);
  expect(vi.getTimerCount()).toBe(0);
}
/** Sleeps using the controlled fake-timer clock. @param ms - Timer duration. @returns Completion after the fake timer advances. */
function timerSleep(ms: number): Promise<void> {
  return new Promise(schedule);
  /** Schedules the controlled wait. @param resolve - Completion callback. @returns Nothing. */
  function schedule(resolve: () => void): void { setTimeout(resolve, ms); }
}
test('T013 aborts each hung request after fifteen seconds and releases its timer', timesOutRequests);

/** Checks invalid measurement metadata cannot bypass acquisition limits. @param input - Malformed size report. @returns Nothing; asserts rejection. */
function invalidSizes(input: unknown): void { expect(validateSizes.bind(null, input)).toThrow(); }
test.each([
  {}, { catalogue: null, sittings: [], totalBytes: 10 },
  { catalogue: { compressedBytes: NaN, decodedBytes: 100 }, sittings: [], totalBytes: 10 },
  { catalogue: { compressedBytes: 100, decodedBytes: -1 }, sittings: [], totalBytes: 10 },
  { catalogue: { compressedBytes: 100, decodedBytes: 100 }, sittings: null, totalBytes: 10 },
  { catalogue: { compressedBytes: 100, decodedBytes: 100 }, sittings: [], totalBytes: Infinity },
])('T013 size validation rejects missing/nonfinite/negative metadata %j', invalidSizes);

/** Checks each rejected size replacement preserves actual output and accepted checkpoint/payload bytes. @param boundary - One exact acquisition budget. @returns Resolves after the combined reject-and-preserve contract is observed. */
async function preservesOverLimit(boundary: { field: string; limit: number }): Promise<void> {
  const disk = await paths();
  const previous = await baseline(disk);
  const checkpoint = await readFile(join(disk.state, 'checkpoint.json'));
  const input = options(disk) as Record<string, unknown>;
  input.measureSizes = measuredOverLimit;
  /** Supplies a controlled one-byte-over filesystem measurement. @param _path - Real staged output path. @param _actual - Actual small controlled resource sizes. @returns Synthetic boundary metadata; not archive measurement evidence. */
  async function measuredOverLimit(_path: string, _actual: unknown): Promise<unknown> { return sizes(boundary.field, boundary.limit + 1); }
  let rejected = false;
  try { await stageSnapshot(previous.catalogue, new Map([['26241', previous.shard]]), input); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')), checkpoint: await readFile(join(disk.state, 'checkpoint.json')), servedPayload: await readFile(join(disk.state, 'sittings', '26241.json.gz')) }).toEqual({ rejected: true, output: previous.bytes, checkpoint, servedPayload: previous.shard });
}
test.each(limits)('T013 one-byte-over $field rejects replacement and preserves actual accepted output/state/served payload', preservesOverLimit);

/** Checks transactional rollback after an actual filesystem replacement attempt fails. @param phase - Failed rename destination. @returns Resolves when rejection and old bytes survive the attempted commit. */
async function rollsBackOutput(phase: string): Promise<void> {
  const disk = await paths();
  const previous = await baseline(disk);
  const checkpoint = await readFile(join(disk.state, 'checkpoint.json'));
  const input = options(disk) as Record<string, unknown>;
  let attempted = false;
  input.rename = failsCommit;
  /** Fails one real commit boundary while allowing the rollback. @param from - Rename source. @param to - Rename destination. @returns Completion for permitted renames. @throws At the controlled publication/checkpoint destination. @remarks Mutates only the test flag and real isolated disk paths. */
  async function failsCommit(from: string, to: string): Promise<void> {
    if (!attempted && to === (phase === 'output' ? disk.out : join(disk.state, 'checkpoint.json'))) { attempted = true; throw new Error('controlled commit failure'); }
    await rename(from, to);
  }
  let rejected = false;
  try { await stageSnapshot(previous.catalogue, new Map([['26241', previous.shard]]), input); } catch { rejected = true; }
  expect({ attempted, rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')), checkpoint: await readFile(join(disk.state, 'checkpoint.json')), payload: await readFile(join(disk.state, 'sittings', '26241.json.gz')) }).toEqual({ attempted: true, rejected: true, output: previous.bytes, checkpoint, payload: previous.shard });
}
test.each(['output', 'checkpoint'])('T013 actual %s commit failure rolls back old output and accepted state', rollsBackOutput);

/** Checks malformed transcript content cannot be downgraded to a new empty/unavailable record. @returns Resolves when structural rejection preserves accepted state and output. */
async function preservesStructuralFailure(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const checkpoint = await readFile(join(disk.state, 'checkpoint.json'));
  /** Supplies malformed source content. @param input - Requested official URL. @returns Controlled source body. */
  async function malformedRecord(input: string | URL | Request): Promise<Response> {
    return String(input).includes('/hansard/dewan-rakyat/') ? Response.json({ pageProps: { speeches: [] } }) : sourceFetch(input);
  }
  let rejected = false;
  try { await acquire(options(disk, malformedRecord)); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')), checkpoint: await readFile(join(disk.state, 'checkpoint.json')) }).toEqual({ rejected: true, output: previous.bytes, checkpoint });
}
test('T013 malformed sitting is fatal and preserves accepted state/output', preservesStructuralFailure);

/** Checks every source response has private raw bytes/receipts while public output contains only normalized data. @returns Resolves after raw receipt digests and paths have been checked. */
async function keepsRawEvidencePrivate(): Promise<void> {
  const disk = await paths();
  const run = await acquire(options(disk)) as { receipts: Array<{ path: string; rawDigest: string }> };
  expect(run).toMatchObject({ receipts: expect.any(Array) });
  expect(run.receipts.length).toBeGreaterThanOrEqual(4);
  for (const receipt of run.receipts) {
    expect(receipt.path.startsWith(disk.state)).toBe(true);
    expect(digest(await readFile(receipt.path))).toBe(receipt.rawDigest);
  }
  expect((await readdir(disk.out)).sort()).toEqual(['catalogue.json.gz', 'sittings']);
}
test('T013 raw-response bytes and audit receipts remain private', keepsRawEvidencePrivate);

/** Checks deployment changes are rediscovered only once before an old route is retried. @returns Resolves when observed new build routes are used with the approved date query. */
async function rediscoverStaleBuild(): Promise<void> {
  const disk = await paths(); let discoveries = 0; const urls: string[] = [];
  /** Supplies one deployment change. @param input - Requested official URL. @returns Controlled old/new build response. @remarks Records requests and discovery count only. */
  async function changedBuild(input: string | URL | Request): Promise<Response> {
    const url = String(input); urls.push(url);
    if (url === `${origin}/`) { discoveries++; return new Response(`<script id="__NEXT_DATA__">{"buildId":"${discoveries === 1 ? 'old-build' : 'new-build'}"}</script>`); }
    if (url.includes('/old-build/')) return new Response('stale build', { status: 404 });
    return sourceFetch(input);
  }
  const run = await acquire(options(disk, changedBuild)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { provenance: { sourceBuildId: 'new-build' } } });
  expect(discoveries).toBe(2);
  expect(urls).toContain(`${origin}/_next/data/new-build/en-GB/hansard/dewan-rakyat/2014-07-23.json?date=2014-07-23`);
}
test('T013 stale deployment routes rediscover once and retry against the new build', rediscoverStaleBuild);

/** Checks a second stale deployment failure does not repeatedly rediscover. @returns Resolves after bounded failure with no output replacement. */
async function capsRediscovery(): Promise<void> {
  const disk = await paths(); let discoveries = 0;
  /** Keeps every discovered deployment route stale. @param input - Requested official URL. @returns Controlled stale response. @remarks Advances only the local discovery count. */
  async function alwaysStale(input: string | URL | Request): Promise<Response> {
    if (String(input) === `${origin}/`) { discoveries++; return new Response(`<script id="__NEXT_DATA__">{"buildId":"build-${discoveries}"}</script>`); }
    return new Response('stale', { status: 404 });
  }
  await expect(acquire(options(disk, alwaysStale))).rejects.toThrow();
  expect(discoveries).toBe(2);
}
test('T013 exhausted stale-build recovery terminates after one rediscovery', capsRediscovery);

/** Supplies all selected official-shape inventory excerpts and their three available records. @param input - Official request URL. @returns Source-derived partial-archive response or controlled missing record. */
async function fullExcerptFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(String(input));
  if (url.pathname.includes('/katalog/')) return Response.json({ pageProps: { archive: fixture.archive } });
  const match = /\/hansard\/dewan-rakyat\/(\d{4}-\d{2}-\d{2})\.json$/.exec(url.pathname);
  if (match && fixture.records[match[1]]) return Response.json({ pageProps: fixture.records[match[1]] });
  return sourceFetch(input);
}

/** Checks complete excerpt accounting and published identity projection. @returns Resolves when all eighteen source entries receive an outcome and only referenced identities are published. */
async function accountsFullInventory(): Promise<void> {
  const disk = await paths();
  const run = await acquire(options(disk, fullExcerptFetch)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { coverage: { latestInventoryCount: 18, retainedSittingCount: 0, unavailableSittingCount: 15, parliaments: [1, 13, 14, 15] }, status: { acquisitionOutcome: 'degraded' } } });
  expect(run.catalogue.sittings).toHaveLength(18);
  const ids = new Set(run.catalogue.members.map(memberId));
  expect(ids).toEqual(new Set(['1839', '22462', '2857', '2928', '4463', '22547']));
  for (const member of run.catalogue.members) expect(Object.keys(member).sort()).toEqual(['historicalContext', 'id', 'listedInLatestSource', 'name']);
}
/** Extracts one exact canonical member ID. @param member - Validated member. @returns Its unchanged ID. */
function memberId(member: { id: string }): string { return member.id; }
test('T013 every source inventory entry has an outcome and only record-referenced identities are published', accountsFullInventory);

/** Produces the selected current sitting only, preserving original ancestor metadata. @returns A source-shaped partial catalogue whose older accepted sitting is now omitted. */
function currentOnlyInventory(): unknown {
  const archive = { '15': structuredClone(fixture.archive['15']) };
  delete archive['15']['2']; delete archive['15']['4'];
  return { pageProps: { archive } };
}
/** Supplies a current sitting whose inventory omits the old accepted sitting. @param input - Official URL. @returns Controlled current source response. */
async function omitsPriorSittingFetch(input: string | URL | Request): Promise<Response> {
  if (String(input).includes('/katalog/')) return Response.json(currentOnlyInventory());
  return fullExcerptFetch(input);
}
/** Checks latest-inventory omission does not erase accepted source coverage. @returns Resolves when omitted sitting bytes/identity remain visibly retained. */
async function preservesOmittedInventory(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const run = await acquire(options(disk, omitsPriorSittingFetch)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { coverage: { latestInventoryCount: 1, retainedSittingCount: 1 }, sittings: expect.arrayContaining([{ ...previous.catalogue.sittings[0], listedInLatestInventory: false, record: { ...previous.catalogue.sittings[0].record, availability: 'retained' } }]) } });
  expect(await readFile(join(disk.out, 'sittings', '26241.json.gz'))).toEqual(previous.shard);
}
test('T013 latest inventory omission retains previous sitting identity/payload and explicit coverage', preservesOmittedInventory);

/** Reads optional generated evidence without letting an expected missing output become a harness exception. @param path - Expected output path. @returns Parsed generated JSON, or null when behavior has not generated it. @throws On unexpected filesystem errors. */
async function optionalJson(path: string): Promise<unknown> {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
/** Supplies a two-sitting source catalogue without the unavailable archive excerpts. @param input - Official URL. @returns Controlled responses for two complete selected records. */
async function twoSittingFetch(input: string | URL | Request): Promise<Response> {
  if (String(input).includes('/katalog/')) {
    const archive = structuredClone(fixture.archive);
    delete archive['1']; delete archive['14']; delete archive['13']['3']; delete archive['15']['2']; delete archive['15']['4'];
    return Response.json({ pageProps: { archive } });
  }
  return fullExcerptFetch(input);
}
/** Checks four-hour interruption preserves public state while checkpointing only accepted private work. @param branch - Actual controlled execution branch. @returns Resolves after an interrupted run and same-session resume avoid refetching accepted records. */
async function checkpointsRunCap(branch = 'main'): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const checkpoint = await readFile(join(disk.state, 'checkpoint.json'));
  const input = options(disk, twoSittingFetch) as Record<string, unknown>;
  input.branch = branch;
  input.sessionId = 'controlled-session';
  input.sleep = capAfterFirstRecord;
  let waits = 0;
  /** Advances to the deadline before the second record starts. @param ms - Requested pacing interval. @returns Controlled clock completion. @remarks Mutates only controlled counters/time. */
  async function capAfterFirstRecord(ms: number): Promise<void> { waits++; elapsed += waits >= 4 ? 14400000 : ms; }
  let rejected = false;
  try { await acquire(input); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')), acceptedCheckpoint: await readFile(join(disk.state, 'checkpoint.json')), partial: await optionalJson(join(disk.state, 'partial-checkpoint.json')) }).toMatchObject({ rejected: true, output: previous.bytes, acceptedCheckpoint: checkpoint, partial: { kind: 'partial', sessionId: 'controlled-session', pendingIds: ['29326'], complete: false } });
  const transport = vi.fn(twoSittingFetch);
  input.transport = transport; input.sleep = sleep;
  const resumed = await acquire(input) as { catalogue: Catalogue };
  expect(resumed).toMatchObject({ catalogue: { coverage: { latestInventoryCount: 2, unavailableSittingCount: 0 } } });
  expect(transport.mock.calls.map(requestUrl)).not.toContain(`${origin}/_next/data/test-build/en-GB/hansard/dewan-rakyat/2014-07-23.json?date=2014-07-23`);
}
/** Checks the controlled main session without interpreting the test harness context as a branch. @returns Completion of the explicit main-session assertions. */
async function checkpointsMainRunCap(): Promise<void> { await checkpointsRunCap('main'); }
test('T013 four-hour cap checkpoints accepted private work, leaves pending unattempted, and resumes same session', checkpointsMainRunCap);

/** Creates an independently supplied controlled trusted deployment proof and served bytes. @param disk - Isolated source/public directories. @returns Valid publication proof and a dedicated trusted served-resource transport. @remarks Updates only isolated fixture publication metadata and files. */
async function servedProof(disk: { state: string; out: string }): Promise<Record<string, unknown>> {
  const previous = await baseline(disk);
  const catalogue = previous.catalogue;
  catalogue.preparedAt = '2026-10-10T03:59:00.000Z';
  catalogue.status.completedAt = '2026-10-10T03:58:00.000Z';
  catalogue.publishedAt = '2026-10-10T03:59:30.000Z';
  const receipt = { snapshotId: catalogue.snapshotId, deploymentId: 'controlled-deployment', publishedAt: catalogue.publishedAt, verifiedServedAt: '2026-10-10T03:59:31.000Z', workflowUrl: 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123' };
  catalogue.status.lastConfirmedDeployment = receipt;
  const decoded = Buffer.from(JSON.stringify(catalogue));
  const encoded = gzipSync(decoded, { level: 9 });
  await writeFile(join(disk.out, 'catalogue.json.gz'), encoded);
  /** Supplies only known repository-subpath served data. @param input - Requested served data URL. @returns The controlled matching served catalogue or shard. @throws If the URL escapes the expected Pages base. */
  async function servedFetch(input: string | URL | Request): Promise<Response> {
    const url = new URL(String(input));
    if (url.origin !== 'https://eaglecheow.github.io' || !url.pathname.startsWith('/vote-better-malaysia/data/')) throw new Error('served origin escaped');
    if (url.pathname.endsWith('/catalogue.json.gz')) return new Response(Uint8Array.from(encoded));
    if (url.pathname.endsWith('/26241.json.gz')) return new Response(Uint8Array.from(previous.shard));
    return new Response('missing', { status: 404 });
  }
  return { repository: 'eaglecheow/vote-better-malaysia', branch: 'main', runId: '123', success: true, codeFingerprint: 'a'.repeat(64), receipt, catalogueDigest: digest(decoded), shardDigests: { '26241': digest(previous.shard) }, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/', transport: servedFetch };
}
/** Checks missing or expired accepted artifacts recover only through matching independently trusted served evidence. @param mode - Missing versus expired checkpoint. @returns Resolves after successful trusted recovery and retained-data preservation. */
async function recoversServedBaseline(mode: string): Promise<void> {
  const disk = await paths(); const proof = await servedProof(disk);
  const expected = JSON.parse(gunzipSync(await readFile(join(disk.out, 'catalogue.json.gz'))).toString()) as Catalogue;
  if (mode === 'missing') await rm(join(disk.state, 'checkpoint.json'));
  else {
    const state = JSON.parse(await readFile(join(disk.state, 'checkpoint.json'), 'utf8'));
    state.createdAt = '2026-10-01T04:00:00.000Z';
    await writeFile(join(disk.state, 'checkpoint.json'), JSON.stringify(state));
  }
  const input = options(disk, unavailableRecordFetch) as Record<string, unknown>;
  input.servedBaseline = proof;
  const run = await acquire(input) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ record: { availability: 'retained', lastAttemptOutcome: 'failed' } }] } });
  expect(run.catalogue.sittings[0].record.digest).toBe(expected.sittings[0].record.digest);
  expect(run.catalogue.sittings[0].record.acquiredAt).toBe(expected.sittings[0].record.acquiredAt);
  expect(digest(await readFile(join(disk.out, 'sittings', '26241.json.gz')))).toBe((proof.shardDigests as Record<string, string>)['26241']);
}
test.each(['missing', 'expired'])('T013 %s checkpoint recovers from validated trusted served baseline', recoversServedBaseline);

/** Checks provenance/receipt/digest/base/code mismatches cannot make served data a trusted retention baseline. @param change - Invalid independently supplied proof. @returns Resolves after rejection with published bytes unchanged. */
async function rejectsServedProof(change: Record<string, unknown>): Promise<void> {
  const disk = await paths(); const proof = await servedProof(disk);
  const bytes = await readFile(join(disk.out, 'catalogue.json.gz'));
  await rm(join(disk.state, 'checkpoint.json'));
  Object.assign(proof, change);
  const input = options(disk) as Record<string, unknown>; input.servedBaseline = proof;
  let rejected = false;
  try { await acquire(input); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')) }).toEqual({ rejected: true, output: bytes });
}
test.each([
  { repository: 'another/repository' }, { branch: 'pull-request' }, { success: false },
  { codeFingerprint: 'b'.repeat(64) }, { baseUrl: 'https://example.com/' },
  { receipt: { snapshotId: 'wrong', publishedAt: '2026-10-10T03:59:30.000Z' } },
  { catalogueDigest: 'f'.repeat(64) }, { shardDigests: { '26241': 'f'.repeat(64) } },
])('T013 untrusted/mismatched served recovery proof %j preserves the old publication', rejectsServedProof);

/** Checks a failed draft-to-final source revision retains the accepted draft identity and payload together. @returns Resolves after retained metadata remains coherent with the old shard. */
async function preservesDraftStatusOnFailure(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk, false);
  const run = await acquire(options(disk, unavailableRecordFetch)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ isFinal: false, record: { availability: 'retained', digest: previous.catalogue.sittings[0].record.digest } }] } });
  expect(JSON.parse(gunzipSync(await readFile(join(disk.out, 'sittings', '26241.json.gz'))).toString())).toMatchObject({ identity: { isFinal: false } });
}
test('T013 failed source finalization retains old draft status and accepted shard coherently', preservesDraftStatusOnFailure);

/** Checks successful source finalization updates status and payload atomically. @returns Resolves after both current identity and normalized shard become final. */
async function updatesDraftStatusOnSuccess(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk, false);
  const run = await acquire(options(disk)) as { catalogue: Catalogue };
  expect(run).toMatchObject({ catalogue: { sittings: [{ isFinal: true, record: { availability: 'available' } }] } });
  expect(run.catalogue.sittings[0].record.digest).not.toBe(previous.catalogue.sittings[0].record.digest);
  expect(JSON.parse(gunzipSync(await readFile(join(disk.out, 'sittings', '26241.json.gz'))).toString())).toMatchObject({ identity: { isFinal: true } });
}
test('T013 successful source finalization advances status and payload together', updatesDraftStatusOnSuccess);

/** Checks a stable sitting ID cannot silently change Parliament while retaining old content. @returns Resolves after identity conflict rejects replacement with accepted bytes preserved. */
async function rejectsChangedHierarchy(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  /** Supplies a contradictory catalogue identity for the same exact sitting ID. @param input - Official URL. @returns Controlled source response. */
  async function changedHierarchy(input: string | URL | Request): Promise<Response> {
    if (!String(input).includes('/katalog/')) return unavailableRecordFetch(input);
    const raw = inventory() as { pageProps: { archive: Record<string, unknown> } };
    raw.pageProps.archive['14'] = raw.pageProps.archive['13']; delete raw.pageProps.archive['13'];
    return Response.json(raw);
  }
  let rejected = false;
  try { await acquire(options(disk, changedHierarchy)); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')) }).toEqual({ rejected: true, output: previous.bytes });
}
test('T013 conflicting date/hierarchy identity cannot relabel accepted source payloads', rejectsChangedHierarchy);

/** Checks source denial aborts the full run instead of degrading one record and continuing. @returns Resolves after no later sitting is requested and old output survives. */
async function denialStopsWholeRun(): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const urls: string[] = [];
  /** Denies the first record only. @param input - Requested URL. @returns Access denial or controlled source response. @remarks Records URLs in the local test array. */
  async function deniedRecord(input: string | URL | Request): Promise<Response> {
    const url = String(input); urls.push(url);
    return url.includes('/hansard/dewan-rakyat/2014-07-23.json') ? new Response('denied', { status: 403 }) : twoSittingFetch(input);
  }
  let rejected = false;
  try { await acquire(options(disk, deniedRecord)); } catch { rejected = true; }
  expect({ rejected, firstRecordRequested: urls.includes(`${origin}/_next/data/test-build/en-GB/hansard/dewan-rakyat/2014-07-23.json?date=2014-07-23`), laterRecordRequested: urls.includes(`${origin}/_next/data/test-build/en-GB/hansard/dewan-rakyat/2026-02-10.json?date=2026-02-10`), output: await readFile(join(disk.out, 'catalogue.json.gz')) }).toEqual({ rejected: true, firstRecordRequested: true, laterRecordRequested: false, output: previous.bytes });
}
test('T013 source access denial stops the whole job and preserves the last output', denialStopsWholeRun);

/** Checks symlinks cannot turn distinct chosen paths into writes over private state. @returns Resolves when an output symlink is rejected before any official request. */
async function rejectsSymlinkAlias(): Promise<void> {
  const disk = await paths(); await mkdir(disk.state); await symlink(disk.state, disk.out);
  const transport = vi.fn(sourceFetch);
  await expect(acquire(options(disk, transport))).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
  expect(await readdir(disk.state)).toEqual([]);
}
test('T013 symlinked output cannot alias private input state', rejectsSymlinkAlias);

/** Checks a symlinked parent cannot bypass canonical output/state isolation. @returns Resolves when physical path overlap is rejected before any source request. */
async function rejectsParentAlias(): Promise<void> {
  const disk = await paths(); await mkdir(disk.state);
  const link = `${disk.out}-link`; await symlink(disk.state, link);
  const transport = vi.fn(sourceFetch);
  await expect(acquire(options({ state: disk.state, out: join(link, 'public') }, transport))).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
}
test('T013 physical parent symlink overlap cannot bypass state/output isolation', rejectsParentAlias);

/** Checks a same-session partial checkpoint never overrides its origin/schema/code validation. @param change - Invalid private partial metadata. @returns Resolves after tampered private work is rejected with old public data preserved. */
async function rejectsPartialOrigin(change: Record<string, unknown>): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const input = options(disk, twoSittingFetch) as Record<string, unknown>;
  input.sessionId = 'controlled-session'; let waits = 0;
  /** Stops the first source run before its second sitting. @param ms - Pacing wait. @returns Controlled time advancement. @remarks Updates only controlled clock counters. */
  async function cap(ms: number): Promise<void> { waits++; elapsed += waits >= 4 ? 14400000 : ms; }
  input.sleep = cap;
  try { await acquire(input); } catch { /* Expected interrupted acquisition. */ }
  const partial = await optionalJson(join(disk.state, 'partial-checkpoint.json')) as Record<string, unknown> | null;
  if (partial) { Object.assign(partial, change); await writeFile(join(disk.state, 'partial-checkpoint.json'), JSON.stringify(partial)); }
  input.sleep = sleep;
  if (change.intoWorkflow) input.workflowContext = true;
  let rejected = false;
  try { await acquire(input); } catch { rejected = true; }
  expect({ generatedPartial: partial !== null, rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')) }).toEqual({ generatedPartial: true, rejected: true, output: previous.bytes });
}
test.each([{ sessionId: 'other-session' }, { repository: 'other/repository' }, { branch: 'pull-request' }, { codeFingerprint: 'b'.repeat(64) }, { schemaVersion: 9 }, { validationSuccess: false }, { originKind: 'local-development', intoWorkflow: true }])('T013 tampered/foreign private partial checkpoint %j cannot be restored as trusted work', rejectsPartialOrigin);

/** Checks successful HTTP status cannot hide invalid source bytes or non-JSON content. @param body - Unsupported raw source body. @returns Resolves after structural rejection preserves accepted public/state bytes. */
async function rejectsMalformedBody(body: string | Uint8Array): Promise<void> {
  const disk = await paths(); const previous = await baseline(disk);
  const checkpoint = await readFile(join(disk.state, 'checkpoint.json'));
  /** Supplies a successful but unsupported source record body. @param input - Official URL. @returns Controlled malformed response or normal source data. */
  async function unsupported(input: string | URL | Request): Promise<Response> {
    return String(input).includes('/hansard/dewan-rakyat/') ? new Response(body as BodyInit, { headers: { 'content-type': 'application/json' } }) : sourceFetch(input);
  }
  let rejected = false;
  try { await acquire(options(disk, unsupported)); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')), checkpoint: await readFile(join(disk.state, 'checkpoint.json')) }).toEqual({ rejected: true, output: previous.bytes, checkpoint });
}
test.each(['<html>not a JSON record</html>', 'not-json', Uint8Array.from([0xff, 0xfe])])('T013 HTTP success with unsupported source bytes %s cannot replace accepted data', rejectsMalformedBody);

/** Checks ordinary local bootstrap/refresh remains useful without claiming a trusted main workflow. @returns Resolves after local cache restoration and honest provenance are observed. */
async function restoresDevelopmentCheckpoint(): Promise<void> {
  const disk = await paths();
  const input = options(disk) as Record<string, unknown>; input.branch = '001-read-mp-hansard'; input.workflowContext = false;
  await acquire(input);
  const checkpoint = JSON.parse(await readFile(join(disk.state, 'checkpoint.json'), 'utf8'));
  input.mode = 'refresh'; let refreshed = false; let result: unknown;
  try { result = await acquire(input); refreshed = true; } catch { /* Missing local restore is the behavior under test. */ }
  expect({ originKind: checkpoint.originKind, branch: checkpoint.branch, publicationEligible: checkpoint.publicationEligible, refreshed, result }).toMatchObject({ originKind: 'local-development', branch: '001-read-mp-hansard', publicationEligible: false, refreshed: true, result: { catalogue: { publishedAt: null, status: { workflowUrl: null, lastConfirmedDeployment: null } } } });
}
test('T013 local development bootstrap then refresh works with honest branch and nonpublication provenance', restoresDevelopmentCheckpoint);

/** Checks local checkpoint context cannot become trusted workflow or published baseline metadata. @param mode - Incompatible local restoration context. @returns Resolves after rejection and accepted output preservation. @remarks Mutates only the isolated checkpoint fixture and controlled clock. */
async function rejectsLocalCheckpointPromotion(mode: string): Promise<void> {
  const disk = await paths(); const input = options(disk) as Record<string, unknown>;
  await acquire(input);
  const checkpoint = JSON.parse(await readFile(join(disk.state, 'checkpoint.json'), 'utf8'));
  checkpoint.originKind = 'local-development'; checkpoint.publicationEligible = false;
  checkpoint.runId = '123';
  if (mode === 'published-baseline') {
    elapsed += 10000;
    checkpoint.catalogue.publishedAt = '2026-10-10T04:00:04.000Z';
    checkpoint.catalogue.status.lastConfirmedDeployment = { snapshotId: checkpoint.catalogue.snapshotId, deploymentId: 'controlled-deployment', publishedAt: checkpoint.catalogue.publishedAt, verifiedServedAt: '2026-10-10T04:00:05.000Z', workflowUrl: 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123' };
    checkpoint.catalogueDigest = digest(Buffer.from(JSON.stringify(checkpoint.catalogue)));
  }
  await writeFile(join(disk.state, 'checkpoint.json'), JSON.stringify(checkpoint));
  const before = await readFile(join(disk.out, 'catalogue.json.gz'));
  if (mode === 'workflow') input.workflowContext = true;
  if (mode === 'other-branch') input.branch = 'another-local-branch';
  let rejected = false;
  try { await acquire(input); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(disk.out, 'catalogue.json.gz')) }).toEqual({ rejected: true, output: before });
}
test.each(['workflow', 'other-branch', 'published-baseline'])('T013 local development checkpoint cannot cross the %s trust boundary', rejectsLocalCheckpointPromotion);

/** Checks the same source-run interruption/resume contract on the actual local feature branch. @returns Resolves after honest private local work resumes without publication claims. */
async function checkpointsLocalRunCap(): Promise<void> { await checkpointsRunCap('001-read-mp-hansard'); }
test('T013 local feature-branch private partial work resumes only in the same development session', checkpointsLocalRunCap);

/** Checks validation failure cancels an in-flight body rather than leaving the request alive after its timer is cleared. @returns Resolves after the structural rejection aborts the exact request signal. */
async function abortsRejectedBody(): Promise<void> {
  let signal: AbortSignal | undefined;
  /** Captures the actual request signal while returning a controlled response. @param _input - Request URL. @param init - Request options. @returns Controlled response. @remarks Stores only the local signal reference. */
  async function transport(_input: string | URL | Request, init?: RequestInit): Promise<Response> { signal = init?.signal ?? undefined; return new Response('body'); }
  /** Represents a body/schema boundary rejection. @param _response - Controlled response. @param _url - Approved URL. @param _startedAt - Request time. @returns Never resolves successfully. @throws The controlled structural body failure. */
  async function consume(_response: Response, _url: string, _startedAt: number): Promise<void> { throw Object.assign(new Error('oversized body'), { kind: 'structural' }); }
  let rejected = false;
  try { await requestOfficial(`${origin}/`, transport, { now, sleep, startedAt: now(), lastStartedAt: null, consume }); } catch { rejected = true; }
  expect({ rejected, aborted: signal?.aborted }).toEqual({ rejected: true, aborted: true });
}
test('T013 structural body rejection aborts the request before clearing its timeout', abortsRejectedBody);

/** Checks denied response headers stop source work before a failing body could trigger retries. @returns Resolves after one source request and no denial-body access. */
async function denialPrecedesBody(): Promise<void> {
  const transport = vi.fn(deniedResponse);
  const consume = vi.fn(failedDeniedBody);
  /** Represents an inaccessible denial body. @param _response - Denied response. @param _url - Approved URL. @param _startedAt - Request start. @returns Never resolves. @throws A controlled transport body failure. */
  async function failedDeniedBody(_response: Response, _url: string, _startedAt: number): Promise<void> { throw Object.assign(new Error('body disconnected'), { kind: 'request' }); }
  let rejected = false;
  try { await requestOfficial(`${origin}/`, transport, { now, sleep, startedAt: now(), lastStartedAt: null, consume }); } catch { rejected = true; }
  expect({ rejected, requests: transport.mock.calls.length, bodyReads: consume.mock.calls.length }).toEqual({ rejected: true, requests: 1, bodyReads: 0 });
}
test('T013 access-denied headers stop immediately even when the denial body is inaccessible', denialPrecedesBody);
