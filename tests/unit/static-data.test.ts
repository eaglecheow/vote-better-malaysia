import { createHash, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { DATA_LIMITS, loadPublishedCatalogue, loadPublishedPair, type PublishedPairOptions } from '../../src/source.ts';
import { publishedFixture } from '../fixtures/static.ts';

const baseUrl = 'https://example.test/vote-better-malaysia/';
const refreshed = '2026-10-10T05:00:00.000Z';
type Call = { url: string; init: RequestInit | undefined };

/** Makes independent Fetch bodies without depending on MIME or transport encoding headers.
 * @param bytes Controlled response bytes.
 * @param url Optional reported final URL.
 * @returns A successful real streaming Response.
 */
function response(bytes: Uint8Array, url = ''): Response {
  const result = new Response(new Uint8Array(bytes).buffer, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  Object.defineProperty(result, 'url', { value: url });
  return result;
}

/** Supplies responses in order and records all network options/URLs.
 * @param replies Controlled responses or failures.
 * @param calls Mutable request ledger.
 * @returns Injected asynchronous transport.
 * @remarks Consumes replies and appends calls; rejects controlled network failures or unexpected requests.
 */
function transport(replies: (Response | Error)[], calls: Call[] = []): typeof fetch {
  /** Records one real retrieval boundary and consumes its controlled response.
   * @param input Requested URL.
   * @param init Request options.
   * @returns The next response.
   * @throws The controlled failure or an unexpected-call error.
   * @remarks Mutates the supplied reply/request ledgers.
   */
  async function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    calls.push({ url: String(input), init });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    if (!reply) throw new Error('Unexpected request');
    return reply;
  }
  return request;
}

/** Supplies exact selection and deterministic clock around injected responses.
 * @param replies Controlled replies.
 * @param calls Request ledger.
 * @returns Selected-pair options.
 */
function options(replies: (Response | Error)[], calls: Call[] = []): PublishedPairOptions {
  return { baseUrl, memberId: '2928', sittingId: '26241', fetch: transport(replies, calls), now: clock };
}
/** Returns the controlled successful device validation instant.
 * @returns A valid UTC test instant.
 */
function clock(): string { return refreshed; }

test.each(['gzip', 'decoded'] as const)('T017 validates %s catalogue and selected shard with identical exact content',
  /** Exercises both actual Fetch representations independently.
   * @param representation Controlled wire representation.
   * @returns Completion of result assertions.
   * @remarks Calls the production retrieval boundary; assertions throw on incorrect behavior.
   */
  async (representation) => {
    const fixture = publishedFixture();
    const calls: Call[] = [];
    const result = await loadPublishedPair(options([
      response(representation === 'gzip' ? fixture.catalogueGzip : fixture.catalogueBytes),
      response(representation === 'gzip' ? fixture.recordGzip : fixture.recordBytes),
    ], calls));
    expect.soft(result).toEqual(expect.objectContaining({ catalogue: fixture.catalogue }));
    expect.soft(result?.result.turns).toEqual([fixture.record.items[0]]);
    expect.soft(result?.result.recordDigest).toBe(fixture.catalogue.sittings[0].record.digest);
    expect.soft(result?.result.refreshedAt).toBe(refreshed);
    expect.soft(result?.result.saved).toBe(false);
    expect.soft(calls.map(requestUrl)).toEqual([
      baseUrl + 'data/catalogue.json.gz',
      baseUrl + 'data/sittings/26241.json.gz?v=' + fixture.catalogue.sittings[0].record.digest,
    ]);
    for (const call of calls) expect(call.init).toEqual(expect.objectContaining({ cache: 'no-store', redirect: 'manual' }));
  });
/** Extracts only a captured requested address.
 * @param call Captured request.
 * @returns Its exact URL.
 */
function requestUrl(call: Call): string { return call.url; }

test('T017 requests only fixed base resources with bypass, manual redirects and the supplied signal',
  /** Asserts observable request options independently of result creation.
   * @returns Completion of scoped network ledger assertions.
   * @remarks Retrieves a controlled pair and compares every expected request option.
   */
  async () => {
    const fixture = publishedFixture(); const calls: Call[] = []; const abort = new AbortController();
    await loadPublishedPair({ ...options([response(fixture.catalogueBytes), response(fixture.recordBytes)], calls), signal: abort.signal });
    expect(calls).toEqual([
      { url: baseUrl + 'data/catalogue.json.gz', init: expect.objectContaining({ method: 'GET', cache: 'no-store', redirect: 'manual', signal: abort.signal }) },
      { url: baseUrl + 'data/sittings/26241.json.gz?v=' + fixture.catalogue.sittings[0].record.digest, init: expect.objectContaining({ method: 'GET', cache: 'no-store', redirect: 'manual', signal: abort.signal }) },
    ]);
  });

test('T017 standalone catalogue validates without fetching any sitting',
  /** Checks the list-only request boundary.
   * @returns Completion of list assertions.
   * @remarks Assertions reject missing or extra requests.
   */
  async () => {
    const fixture = publishedFixture(); const calls: Call[] = [];
    expect(await loadPublishedCatalogue({ baseUrl, fetch: transport([response(fixture.catalogueGzip)], calls) })).toEqual(fixture.catalogue);
    expect(calls).toHaveLength(1);
  });

test('T017 advances current refresh on unchanged content only after validation',
  /** Checks separate identical-content successes and processing ordering.
   * @returns Completion of timestamp/mark assertions.
   * @remarks Records source processing marks; assertions throw on an early or missing success.
   */
  async () => {
    const fixture = publishedFixture(); const marks: string[] = [];
    /** Records a production processing mark in call order.
     * @param name Mark identifier.
     * @returns Nothing.
     * @remarks Appends to the test ledger.
     */
    function mark(name: string): void { marks.push(name); }
    const first = await loadPublishedPair({ ...options([response(fixture.catalogueBytes), response(fixture.recordBytes)]), mark });
    expect.soft(first?.result.refreshedAt).toBe(refreshed);
    expect.soft(marks).toEqual(['hansard.processing-start', 'hansard.processing-end']);
    const second = await loadPublishedPair({ ...options([response(fixture.catalogueBytes), response(fixture.recordBytes)]), now: laterClock });
    expect.soft(second?.result.refreshedAt).toBe('2026-10-10T05:01:00.000Z');
    if (first && second) expect(second.result.recordDigest).toBe(first.result.recordDigest);
  });
/** Returns a later controlled successful static revalidation instant.
 * @returns A valid later UTC instant.
 */
function laterClock(): string { return '2026-10-10T05:01:00.000Z'; }

test.each(['member', 'sitting', 'noncanonical'] as const)('T017 rejects invalid selected %s before fetching a shard',
  /** Revalidates exact selection against the accepted catalogue.
   * @param field Controlled selection error.
   * @returns Completion of rejection assertions.
   * @remarks Calls retrieval; invalid selections must not become absence.
   */
  async (field) => {
    const fixture = publishedFixture(); const calls: Call[] = [];
    const supplied = options([response(fixture.catalogueBytes)], calls);
    if (field === 'sitting') supplied.sittingId = '99999';
    else supplied.memberId = field === 'member' ? '99999' : '02928';
    await expect(loadPublishedPair(supplied)).rejects.toThrow();
    expect(calls.every(isCatalogue)).toBe(true);
  });
/** Checks that a captured request is the single expected catalogue address.
 * @param call Captured request.
 * @returns Whether no shard was requested.
 */
function isCatalogue(call: Call): boolean { return call.url === baseUrl + 'data/catalogue.json.gz'; }

test.each(['network', 'http', 'html', 'gzip', 'utf8', 'json', 'schema', 'off-base', 'off-origin', 'redirect', 'path'] as const)(
  'T017 rejects catalogue %s without an empty transcript or automatic loop',
  /** Exercises each failed published catalogue trust boundary.
   * @param failure Controlled malformed response category.
   * @returns Completion of fail-closed assertions.
   * @remarks Assertions throw when retrieval succeeds or retries unrelated failures.
   */
  async (failure) => {
    const fixture = publishedFixture(); const calls: Call[] = [];
    let reply: Response | Error = response(fixture.catalogueBytes);
    if (failure === 'network') reply = new Error('offline');
    if (failure === 'http') reply = new Response('missing', { status: 404 });
    if (failure === 'html') reply = response(new TextEncoder().encode('<html>error</html>'));
    if (failure === 'gzip') reply = response(new Uint8Array([31, 139, 1, 2]));
    if (failure === 'utf8') reply = response(new Uint8Array([123, 255, 125]));
    if (failure === 'json') reply = response(new TextEncoder().encode('{'));
    if (failure === 'schema') reply = response(new TextEncoder().encode(JSON.stringify({ ...fixture.catalogue, schemaVersion: 2 })));
    if (failure === 'off-base') reply = response(fixture.catalogueBytes, 'https://example.test/data/catalogue.json.gz');
    if (failure === 'off-origin') reply = response(fixture.catalogueBytes, 'https://foreign.test/vote-better-malaysia/data/catalogue.json.gz');
    if (failure === 'redirect') reply = new Response(null, { status: 302, headers: { Location: '/elsewhere/' } });
    if (failure === 'path') {
      fixture.catalogue.sittings[0].record.path = '../escape.json.gz';
      reply = response(new TextEncoder().encode(JSON.stringify(fixture.catalogue)));
    }
    await expect(loadPublishedPair(options([reply], calls))).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

test.each(['hash', 'schema', 'identity', 'accounting', 'utf8', 'html'] as const)('T017 rejects sitting %s without stamping successful refresh',
  /** Exercises independently valid catalogue versus invalid replacement shards.
   * @param failure Controlled sitting trust-boundary error.
   * @returns Completion of failed pair assertions.
   * @remarks Network calls are recorded; failures cannot produce empty speech.
   */
  async (failure) => {
    const fixture = publishedFixture(); const calls: Call[] = [];
    let bytes = fixture.recordBytes;
    if (failure === 'hash') bytes = new TextEncoder().encode(JSON.stringify({ ...fixture.record, sourceUrl: fixture.record.sourceUrl + '?changed' }));
    if (failure === 'schema') bytes = new TextEncoder().encode(JSON.stringify({ ...fixture.record, schemaVersion: 2 }));
    if (failure === 'identity') bytes = new TextEncoder().encode(JSON.stringify({ ...fixture.record, sittingId: '99999' }));
    if (failure === 'accounting') bytes = new TextEncoder().encode(JSON.stringify({ ...fixture.record, items: [] }));
    if (failure === 'utf8') bytes = new Uint8Array([123, 255, 125]);
    if (failure === 'html') bytes = new TextEncoder().encode('<html>no record</html>');
    if (failure !== 'hash') {
      fixture.catalogue.sittings[0].record.digest = createHash('sha256').update(bytes).digest('hex');
      fixture.catalogue.sittings[0].record.decodedBytes = bytes.length;
    }
    const catalogueBytes = new TextEncoder().encode(JSON.stringify(fixture.catalogue));
    const replies = failure === 'hash'
      ? [response(catalogueBytes), response(bytes), response(catalogueBytes), response(bytes)]
      : [response(catalogueBytes), response(bytes)];
    await expect(loadPublishedPair(options(replies, calls))).rejects.toThrow();
    expect(calls).toHaveLength(failure === 'hash' ? 4 : 2);
  });

test('T017 retries only a digest mismatch against one newest coherent catalogue',
  /** Checks a changed digest without mixing accepted snapshots.
   * @returns Completion of coherent retry assertions.
   * @remarks Uses four controlled requests and verifies the second shard discriminator.
   */
  async () => {
    const old = publishedFixture(); const latest = publishedFixture(); const calls: Call[] = [];
    old.catalogue.sittings[0].record.digest = 'e'.repeat(64);
    latest.catalogue.snapshotId = 'newest-snapshot';
    const result = await loadPublishedPair(options([
      response(new TextEncoder().encode(JSON.stringify(old.catalogue))), response(latest.recordGzip),
      response(new TextEncoder().encode(JSON.stringify(latest.catalogue))), response(latest.recordGzip),
    ], calls));
    expect(result?.result.snapshotId).toBe('newest-snapshot');
    expect(calls).toHaveLength(4);
    expect(calls[3].url).toContain('?v=' + latest.catalogue.sittings[0].record.digest);
  });

test.each(['member', 'sitting'] as const)('T017 revalidates %s after mismatch instead of reusing an obsolete pair',
  /** Checks a removed selection in a new accepted catalogue.
   * @param field Selection removed by the controlled snapshot change.
   * @returns Completion of coherent-retry rejection assertions.
   * @remarks Requires no second shard retrieval after the pair disappears.
   */
  async (field) => {
    const old = publishedFixture(); const latest = publishedFixture(); const calls: Call[] = [];
    old.catalogue.sittings[0].record.digest = 'e'.repeat(64);
    if (field === 'member') latest.catalogue.members = latest.catalogue.members.filter(keepOtherMember);
    else { latest.catalogue.sittings = []; latest.catalogue.coverage = { parliaments: [], startDate: null, endDate: null, latestInventoryCount: 0, retainedSittingCount: 0, unavailableSittingCount: 0, attributionGapCount: 0 }; }
    await expect(loadPublishedPair(options([
      response(new TextEncoder().encode(JSON.stringify(old.catalogue))), response(old.recordGzip),
      response(new TextEncoder().encode(JSON.stringify(latest.catalogue))),
    ], calls))).rejects.toThrow();
    expect(calls).toHaveLength(3);
  });
/** Keeps controlled identities other than the selected one during a coherent retry.
 * @param member Controlled source identity.
 * @returns Whether its ID differs from the removed selection.
 */
function keepOtherMember(member: { id: string }): boolean { return member.id !== '2928'; }

test('T017 accepts the exact decoded ceiling while rejecting one additional byte',
  /** Exercises the inclusive boundary with valid controlled JSON.
   * @returns Completion of exact-boundary assertions.
   * @remarks Allocates a bounded 5-MiB catalogue fixture with a synthetic padding field.
   */
  async () => {
    const fixture = publishedFixture();
    const initial = JSON.stringify({ ...fixture.catalogue, padding: '' });
    const bytes = new TextEncoder().encode(JSON.stringify({ ...fixture.catalogue, padding: 'a'.repeat(DATA_LIMITS.decoded - new TextEncoder().encode(initial).length) }));
    expect(bytes.length).toBe(DATA_LIMITS.decoded);
    const catalogue = await loadPublishedCatalogue({ baseUrl, fetch: transport([response(bytes)]) });
    expect(catalogue?.snapshotId).toBe(fixture.catalogue.snapshotId);
    const oneMore = new Uint8Array(bytes.length + 1); oneMore.set(bytes); oneMore[bytes.length] = 32;
    await expect(loadPublishedCatalogue({ baseUrl, fetch: transport([response(oneMore)]) })).rejects.toThrow(/limit|bound|bytes/i);
  });

test('T017 cancels an oversized response before pulling an unlimited tail',
  /** Checks streaming cancellation rather than only a final buffered length.
   * @returns Completion of cancellation assertions.
   * @remarks Supplies an oversized decoded first chunk and records cancellation/pulls.
   */
  async () => {
    let cancelled = false; let pulls = 0;
    /** Supplies one oversized first chunk without creating an unlimited allocation.
     * @param stream Body controller.
     * @returns Nothing.
     * @remarks Increments the pull ledger and enqueues controlled bytes.
     */
    function pull(stream: ReadableStreamDefaultController<Uint8Array>): void {
      pulls++; stream.enqueue(new Uint8Array(DATA_LIMITS.decoded + 1).fill(32));
    }
    /** Records that the bounded reader cancels its producer.
     * @returns Nothing.
     * @remarks Mutates the cancellation ledger only.
     */
    function cancel(): void { cancelled = true; }
    const body = new ReadableStream({ pull, cancel }, { highWaterMark: 0 });
    try { await loadPublishedCatalogue({ baseUrl, fetch: transport([new Response(body)]) }); } catch { /* The separate byte-limit cases assert rejection. */ }
    expect(cancelled).toBe(true); expect(pulls).toBe(1);
  });

test('T017 unavailable descriptor remains selectable without a successful time or shard request',
  /** Distinguishes the known unavailable record from retrieval failure/absence.
   * @returns Completion of unavailable-result assertions.
   * @remarks Calls the selected-pair boundary once for its catalogue.
   */
  async () => {
    const fixture = publishedFixture(); const calls: Call[] = [];
    fixture.catalogue.sittings[0].record = { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: '2026-10-10T03:01:00.000Z', lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
    fixture.catalogue.coverage.unavailableSittingCount = 1;
    const result = await loadPublishedPair(options([response(new TextEncoder().encode(JSON.stringify(fixture.catalogue)))], calls));
    expect(result?.result.outcome).toBe('unavailable');
    expect(result?.result.refreshedAt).toBeNull();
    expect(calls).toHaveLength(1);
  });

test.each(['catalogue-gzip', 'sitting-gzip', 'catalogue-decoded', 'sitting-decoded', 'inflated'] as const)('T017 bounds %s before unbounded buffering',
  /** Tests each independent representation/resource ceiling using actual streaming bodies.
   * @param bound Controlled over-limit resource category.
   * @returns Completion of bounded failure assertions.
   * @remarks Allocates at most a small multiple of the explicit test byte ceilings.
   */
  async (bound) => {
    const fixture = publishedFixture();
    const limit = bound === 'catalogue-gzip' ? DATA_LIMITS.catalogueGzip : bound === 'sitting-gzip' ? DATA_LIMITS.sittingGzip : DATA_LIMITS.decoded;
    const bytes = bound.endsWith('-gzip') ? gzipSync(randomBytes(limit + 1)) : bound === 'inflated' ? gzipSync(new Uint8Array(limit + 1).fill(32)) : new Uint8Array(limit + 1).fill(32);
    const replies = bound.startsWith('catalogue') ? [response(bytes)] : [response(fixture.catalogueBytes), response(bytes)];
    await expect(loadPublishedPair(options(replies))).rejects.toThrow(/limit|bound|bytes/i);
  });

test('T017 forwards abort signal and detects gzip magic split across first chunks',
  /** Uses a split native gzip stream rather than a synthetic decompression stub.
   * @returns Completion of split-prefix/abort forwarding assertions.
   * @remarks Reads a controlled real stream and records both request signals.
   */
  async () => {
    const fixture = publishedFixture(); const controller = new AbortController(); const calls: Call[] = [];
    /** Supplies the gzip prefix in separate chunks.
     * @param stream Response stream controller.
     * @returns Nothing.
     * @remarks Enqueues bounded fixture chunks then closes the response.
     */
    function start(stream: ReadableStreamDefaultController<Uint8Array>): void {
      stream.enqueue(fixture.catalogueGzip.slice(0, 1)); stream.enqueue(fixture.catalogueGzip.slice(1)); stream.close();
    }
    const result = await loadPublishedPair({ ...options([new Response(new ReadableStream({ start })), response(fixture.recordGzip)], calls), signal: controller.signal });
    expect(result?.result.outcome).toBe('ready');
    for (const call of calls) expect(call.init?.signal).toBe(controller.signal);
  });

test.each(['query', 'fragment', 'credentials', 'scheme'] as const)('T017 rejects ambiguous base %s before issuing requests',
  /** Rejects supplied base values that can change static resource authority.
   * @param invalid Controlled invalid base category.
   * @returns Completion of rejection assertions.
   * @remarks Requires no outgoing request for a malformed base.
   */
  async (invalid) => {
    const calls: Call[] = [];
    const base = invalid === 'query' ? baseUrl + '?escape=1' : invalid === 'fragment' ? baseUrl + '#else' : invalid === 'credentials' ? 'https://name:secret@example.test/vote-better-malaysia/' : 'file:///vote-better-malaysia/';
    await expect(loadPublishedCatalogue({ baseUrl: base, fetch: transport([], calls) })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
