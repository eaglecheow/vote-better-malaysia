import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { afterEach, expect, test } from 'vitest';
import { acquire, planRefresh, stageSnapshot, type AcquisitionOptions } from '../../scripts/acquire.ts';
import { validateCatalogue, type Catalogue, type InventorySitting, type Sitting, type SittingRecord } from '../../src/source.ts';
import { catalogueFixture } from '../fixtures/catalogue.ts';

const start = Date.parse('2026-10-10T04:00:00.000Z');
const day = 86_400_000;
const origin = 'https://hansard.parlimen.gov.my';
const scratch: string[] = [];

interface Model {
  catalogue: Catalogue;
  latest: InventorySitting[];
  shards: Map<string, Uint8Array>;
}

interface Fixture extends Model {
  state: string;
  out: string;
  elapsed: number;
  bucketChecks: (string | null)[];
  calls: Array<{ id: string; at: number; signal: AbortSignal | null }>;
  failures: Set<string>;
  changed: Set<string>;
  transient: Map<string, number>;
  fault: 'discovery' | 'inventory' | 'record' | null;
  pauseAfterRecord: boolean;
}

/**
 * Removes only temporary refresh fixtures after each test.
 * @returns Completion after isolated fixture cleanup.
 * @throws On unexpected filesystem cleanup errors.
 * @remarks Consumes the scratch-path list and removes its temporary directories.
 */
async function cleanup(): Promise<void> {
  for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true });
}
afterEach(cleanup);

/**
 * Hashes exact synthetic UTF-8 or compressed bytes independently of acquisition code.
 * @param bytes Exact fixture bytes.
 * @returns Lowercase SHA-256 hexadecimal digest.
 */
function hash(bytes: string | Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }

/**
 * Computes the contract's independently specified full-digest historical bucket.
 * @param id Exact canonical source-ID string.
 * @returns Stable unsigned SHA-256 modulo-six bucket number.
 */
function bucket(id: string): number { return Number(BigInt('0x' + hash(id)) % 6n); }

/**
 * Formats one controlled UTC millisecond instant.
 * @param time Synthetic UTC milliseconds.
 * @returns ISO UTC timestamp without any official-publication claim.
 */
function iso(time: number): string { return new Date(time).toISOString(); }

/**
 * Selects the immutable source identity from a synthetic sitting descriptor.
 * @param sitting Controlled coherent sitting.
 * @returns Its normalized immutable identity without catalogue flags or record metadata.
 */
function identity(sitting: InventorySitting): SittingRecord['identity'] {
  const { date, parliament, penggal, mesyuarat, house, filename, isFinal } = sitting;
  return { date, parliament, penggal, mesyuarat, house, filename, isFinal };
}

/**
 * Produces the exact contribution text used by both the prior shard and controlled source.
 * @param id Synthetic source sitting ID.
 * @param changed Whether the controlled response deliberately changes this contribution.
 * @returns Original paragraph-preserving fixture wording.
 */
function speech(id: string, changed = false): string { return `Synthetic contribution for ${id}${changed ? ' changed' : ''}.\n\nOriginal paragraphs.`; }

/**
 * Creates one explicit synthetic source identity; its historical dates are invented tests.
 * @param id Controlled canonical source ID.
 * @param date Controlled sitting date.
 * @returns One normalized inventory entry with the official URL shape.
 */
function sittingIdentity(id: string, date: string): InventorySitting {
  return { id, date, parliament: 13, penggal: 2, mesyuarat: 0, house: 'dewan-rakyat', filename: 'dr_' + date, isFinal: true, sourceUrl: `${origin}/hansard/dewan-rakyat/${date}` };
}

/**
 * Creates an accepted synthetic normalized shard and honest descriptor byte measurements.
 * @param incoming Controlled source identity.
 * @param acquiredAt Prior successful acquisition time.
 * @returns Coherent accepted sitting plus deterministic compressed bytes.
 */
function acceptedSitting(incoming: InventorySitting, acquiredAt: string): { sitting: Sitting; bytes: Uint8Array } {
  const record: SittingRecord = { schemaVersion: 1, sittingId: incoming.id, identity: identity(incoming), sourceUrl: incoming.sourceUrl, items: [{ ordinal: 0, sourceIndex: 7, sectionPath: [], text: speech(incoming.id), rawAuthor: 'Synthetic source speaker', sourceAuthorId: '1839', memberId: '1839', attribution: 'assigned', timestamp: null, gapReason: null }] };
  const decoded = Buffer.from(JSON.stringify(record));
  const bytes = gzipSync(decoded, { level: 9 });
  const sitting: Sitting = { ...incoming, listedInLatestInventory: true, record: { availability: 'available', path: `data/sittings/${incoming.id}.json.gz`, digest: hash(decoded), compressedBytes: bytes.byteLength, decodedBytes: decoded.byteLength, acquiredAt, lastAttemptAt: acquiredAt, lastAttemptOutcome: 'success', sourceBuildId: 'refresh-test', rawSourceDigest: 'd'.repeat(64), sourcePublishedAt: null, sourceRevisedAt: null, accounting: { total: 1, assigned: 1, unassigned: 0, annotations: 0 } } };
  return { sitting, bytes };
}

/**
 * Recomputes coverage after controlled changes without changing any accepted payload.
 * @param catalogue Synthetic catalogue being updated.
 * @returns Nothing.
 * @remarks Updates only fixture coverage and declared acquisition status.
 */
function coverage(catalogue: Catalogue): void {
  const dates: string[] = [];
  let unavailable = 0; let retained = 0; let latest = 0; let failed = false;
  for (const sitting of catalogue.sittings) {
    dates.push(sitting.date);
    if (sitting.listedInLatestInventory) latest++;
    if (sitting.record.availability === 'unavailable') unavailable++;
    if (sitting.record.availability === 'retained') retained++;
    if (sitting.record.lastAttemptOutcome === 'failed') failed = true;
  }
  dates.sort();
  catalogue.coverage = { parliaments: [13], startDate: dates[0], endDate: dates.at(-1)!, latestInventoryCount: latest, retainedSittingCount: retained, unavailableSittingCount: unavailable, attributionGapCount: 0 };
  catalogue.status.acquisitionOutcome = failed ? 'degraded' : 'success';
}

/**
 * Builds a wholly synthetic seventy-sitting catalogue in deliberately old-first inventory order.
 * @param count Number of accepted source identities to create.
 * @returns Coherent catalogue, inventory and actual compressed shards.
 * @remarks Populates only newly created local fixture objects and maps.
 */
function model(count = 70): Model {
  const catalogue = catalogueFixture();
  catalogue.snapshotId = 'synthetic-refresh-baseline';
  catalogue.preparedAt = iso(start - 3_600_000);
  catalogue.provenance.inventoryAcquiredAt = iso(start - 4_000_000);
  catalogue.provenance.membersAcquiredAt = iso(start - 4_000_001);
  catalogue.status.completedAt = iso(start - 3_600_001);
  catalogue.members = [catalogue.members[0]];
  catalogue.sittings = [];
  const latest: InventorySitting[] = [];
  const shards = new Map<string, Uint8Array>();
  for (let index = count; index > 0; index--) {
    const incoming = sittingIdentity(String(1000 + index), iso(start - index * day).slice(0, 10));
    const accepted = acceptedSitting(incoming, iso(start - 6 * 3_600_000 - index * 1000));
    latest.push(incoming); catalogue.sittings.push(accepted.sitting); shards.set(incoming.id, accepted.bytes);
  }
  coverage(catalogue);
  return { catalogue, latest, shards };
}

/**
 * Creates isolated local-development accepted state with explicit synthetic sweep metadata.
 * @returns Temporary refresh fixture, never a workflow/publication attestation.
 * @throws On temporary filesystem setup failure.
 * @remarks Writes only temporary accepted output/state and tracks its cleanup path.
 */
async function fixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'hansard-refresh-'));
  scratch.push(root);
  const value: Fixture = { ...model(), state: join(root, 'state'), out: join(root, 'out'), elapsed: 0, bucketChecks: [iso(start - 6 * 3_600_000), iso(start - 7 * 3_600_000), iso(start - 10 * 3_600_000), iso(start - 8 * 3_600_000), iso(start - 9 * 3_600_000), iso(start - 5 * 3_600_000)], calls: [], failures: new Set(), changed: new Set(), transient: new Map(), fault: null, pauseAfterRecord: false };
  await seed(value);
  return value;
}

/**
 * Produces honest local-development test options for the existing acquisition API.
 * @param value Isolated synthetic fixture.
 * @returns Controlled refresh options using the current boundary, with no CLI extension.
 */
function options(value: Fixture): AcquisitionOptions {
  return { state: value.state, out: value.out, mode: 'refresh', repository: 'eaglecheow/vote-better-malaysia', branch: '001-read-mp-hansard', codeFingerprint: 'a'.repeat(64), sessionId: 'refresh-session', workflowContext: false, transport: source.bind(null, value), now: clock.bind(null, value), sleep: advance.bind(null, value) };
}

/**
 * Stages an accepted fixture and adds new private metadata without production refresh behavior.
 * @param value Synthetic fixture whose accepted descriptors/shards are coherent.
 * @returns Completion after its checksum-valid prior checkpoint exists.
 * @throws On fixture staging or filesystem failure.
 * @remarks Replaces only this temporary fixture's accepted output/checkpoint.
 */
async function seed(value: Fixture): Promise<void> {
  await stageSnapshot(value.catalogue, value.shards, options(value));
  const path = join(value.state, 'checkpoint.json');
  const checkpoint = JSON.parse(await readFile(path, 'utf8'));
  checkpoint.refresh = { bucketChecks: [...value.bucketChecks] };
  await writeFile(path, JSON.stringify(checkpoint));
}

/**
 * Supplies current controlled UTC acquisition time.
 * @param value Synthetic fixture clock.
 * @returns UTC milliseconds with no source-publication inference.
 */
function clock(value: Fixture): number { return start + value.elapsed; }

/**
 * Advances controlled pacing or deliberately interrupts after one record request.
 * @param value Synthetic fixture clock and request log.
 * @param milliseconds Requested backoff/pacing duration.
 * @returns Completion without a real wait.
 * @remarks Changes only elapsed fixture time.
 */
async function advance(value: Fixture, milliseconds: number): Promise<void> {
  value.elapsed += value.pauseAfterRecord && value.calls.length > 0 ? 14_400_000 : milliseconds;
}

/**
 * Produces a supported raw recursive inventory from explicitly synthetic normalized entries.
 * @param value Controlled complete fixture inventory.
 * @returns Official-shaped hierarchy without claiming real Parliament coverage.
 */
function rawInventory(value: Fixture): unknown {
  const dates: string[] = [];
  const sitting_list: unknown[] = [];
  for (const sitting of value.latest) { dates.push(sitting.date); sitting_list.push({ sitting_id: Number(sitting.id), date: sitting.date, filename: sitting.filename, is_final: sitting.isFinal }); }
  dates.sort();
  const span = { start_date: dates[0], end_date: dates.at(-1)! };
  return { pageProps: { archive: { '13': { ...span, '2': { ...span, '0': { ...span, sitting_list } } } } } };
}

/**
 * Supplies current controlled official source routes and records actual sitting attempt starts.
 * @param value Temporary source/clock/error fixture.
 * @param input Approved source URL.
 * @param init Actual acquisition request options.
 * @returns Supported synthetic response or an explicit controlled failure.
 * @throws On a leaked nonofficial URL or a source request with an absent signal.
 * @remarks Appends sitting attempts and consumes only controlled transient failure counts.
 */
async function source(value: Fixture, input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin !== origin) throw new Error('Leaked nonofficial request');
  if (!init?.signal) throw new Error('Missing request signal');
  if (url.pathname === '/') return new Response(value.fault === 'discovery' ? '<html>missing build metadata</html>' : '<script id="__NEXT_DATA__">{"buildId":"refresh-test"}</script>');
  if (url.pathname.endsWith('/cari-mp.json')) return Response.json({ pageProps: { speakers: [{ new_author_id: 1839, name: 'LIM GUAN ENG' }] } });
  if (url.pathname.endsWith('/katalog/dewan-rakyat.json')) return Response.json(value.fault === 'inventory' ? { pageProps: { archive: [] } } : rawInventory(value));
  const date = url.searchParams.get('date');
  const sitting = value.latest.find(matchesDate) ?? value.catalogue.sittings.find(matchesDate);
  /**
   * Resolves the exact synthetic source date without label or identity guessing.
   * @param candidate Current inventory candidate.
   * @returns Whether it matches the explicitly supplied source date.
   */
  function matchesDate(candidate: InventorySitting): boolean { return candidate.date === date; }
  if (!sitting) return new Response('missing fixture', { status: 404 });
  value.calls.push({ id: sitting.id, at: clock(value), signal: init.signal });
  if (value.failures.has(sitting.id)) return new Response('controlled source unavailable', { status: 503 });
  const remaining = value.transient.get(sitting.id) ?? 0;
  if (remaining > 0) { value.transient.set(sitting.id, remaining - 1); return new Response('controlled throttle', { status: 429, headers: { 'retry-after': '2' } }); }
  if (value.fault === 'record') return Response.json({ pageProps: { invalid: true } });
  return Response.json({ pageProps: { meta: { id: '/hansard/dewan-rakyat/' + sitting.date }, cycle: { house: 0, term: sitting.parliament, session: sitting.penggal, meeting: sitting.mesyuarat }, date: sitting.date, filename: sitting.filename, is_final: sitting.isFinal, speeches: [{ speech: speech(sitting.id, value.changed.has(sitting.id)), author: 'Synthetic source speaker', author_id: 1839, timestamp: null, is_annotation: false, index: 7 }] } });
}

/**
 * Reads optional new receipts without counting a missing report as a fixture exception.
 * @param path Expected private JSON path.
 * @returns Parsed JSON, or null when the required report was not written.
 * @throws On unexpected filesystem or JSON errors.
 */
async function optionalJson(path: string): Promise<unknown> {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

/**
 * Reads the new private acquisition/staging report for this explicit refresh session.
 * @param value Temporary refresh fixture.
 * @returns New report, or null when production has not implemented its receipt behavior.
 * @throws On unexpected fixture filesystem or JSON errors.
 */
async function report(value: Fixture): Promise<unknown> { return optionalJson(join(value.state, 'receipts', 'refresh-session', 'refresh.json')); }

/**
 * Extracts actual sitting requests without counting discovery/inventory calls.
 * @param value Controlled source request log.
 * @returns Sitting source IDs in actual attempt order, including retries.
 */
function requested(value: Fixture): string[] {
  const ids: string[] = [];
  for (const call of value.calls) ids.push(call.id);
  return ids;
}

/**
 * Sorts dated sitting entries newest-first with exact lexical ID ties.
 * @param left First controlled source identity.
 * @param right Second controlled source identity.
 * @returns Deterministic required comparison.
 */
function recent(left: InventorySitting, right: InventorySitting): number { return right.date.localeCompare(left.date) || lexical(left.id, right.id); }

/**
 * Orders exact canonical IDs by UTF-16 code points without locale-dependent collation.
 * @param left First source ID.
 * @param right Second source ID.
 * @returns Stable lexical comparison.
 */
function lexical(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

/**
 * Requires a named synthetic sitting rather than fabricating a missing fixture.
 * @param catalogue Complete synthetic baseline.
 * @param id Exact controlled ID.
 * @returns The existing fixture sitting.
 * @throws On accidental invalid test input.
 */
function selected(catalogue: Catalogue, id: string): Sitting {
  for (const sitting of catalogue.sittings) if (sitting.id === id) return sitting;
  throw new Error('Missing synthetic fixture sitting');
}

/**
 * Independently derives normal-run requests from latest thirty and one historical bucket.
 * @param value Complete synthetic model.
 * @param chosen Explicit stable historical bucket.
 * @returns Expected deduplicated ID order without calling the production planner.
 */
function normalTargets(value: Model, chosen: number): string[] {
  const ids: string[] = [];
  const newest = [...value.latest].sort(recent).slice(0, 30);
  for (const sitting of newest) ids.push(sitting.id);
  const historical: Sitting[] = [];
  for (const sitting of value.catalogue.sittings) if (bucket(sitting.id) === chosen && !ids.includes(sitting.id)) historical.push(sitting);
  historical.sort(oldestCheck);
  for (const sitting of historical) ids.push(sitting.id);
  return ids;
}

/**
 * Orders successful checks oldest-first with deterministic source-ID ties.
 * @param left First accepted controlled sitting.
 * @param right Second accepted controlled sitting.
 * @returns Oldest successful acquisition then exact lexical ID ordering.
 */
function oldestCheck(left: Sitting, right: Sitting): number { return (left.record.acquiredAt ?? '').localeCompare(right.record.acquiredAt ?? '') || lexical(left.id, right.id); }

/**
 * Confirms an incremental run targets the latest thirty and exactly the oldest checked bucket.
 * @returns Nothing after the observable target-order assertions.
 */
function checksNormalPlan(): void {
  const value = model();
  const checks = [iso(start - 1000), iso(start - 2000), iso(start - 6000), iso(start - 3000), iso(start - 4000), iso(start - 5000)];
  expect(planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks)).toEqual({ sittingIds: normalTargets(value, 2), historicalBucket: 2, overdueIds: [] });
}
test('REF-PLAN-001: latest thirty and one oldest-successful historical bucket form a deduplicated normal plan', checksNormalPlan);

/**
 * Requires each known full-SHA-256 modulo-six assignment through an actual historical target.
 * @param id Independently precomputed canonical source ID.
 * @param expectedBucket Required known bucket number.
 * @returns Nothing after its outside-latest-thirty targeting assertions.
 * @remarks Changes only a fresh synthetic model's identity and descriptor references.
 */
function checksKnownBucket(id: string, expectedBucket: number): void {
  const value = model(31);
  const older = acceptedSitting(sittingIdentity(id, '2000-01-01'), iso(start - 5 * 3_600_000));
  value.catalogue.sittings[0] = older.sitting; value.latest[0] = sittingIdentity(id, '2000-01-01');
  coverage(value.catalogue);
  const checks: (string | null)[] = [iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000)];
  checks[expectedBucket] = null;
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks);
  expect({ historicalBucket: plan.historicalBucket, historicalTarget: plan.sittingIds.includes(id), count: plan.sittingIds.length }).toEqual({ historicalBucket: expectedBucket, historicalTarget: true, count: 31 });
}
test.each([['1', 3], ['2', 3], ['3', 2], ['4', 0], ['23', 4], ['1839', 2], ['22462', 3], ['26241', 5], ['29326', 1], ['22942', 1]] as const)('REF-HASH-%s: exact full-digest source-ID hashing selects bucket %i', checksKnownBucket);

/**
 * Checks null-first bucket selection and deterministic ties without mutating caller metadata.
 * @param checks Explicit six-bucket completion history.
 * @param expectedBucket Required oldest successful or never-completed bucket.
 * @returns Nothing after selected-bucket and input-preservation assertions.
 */
function checksBucketOrder(checks: readonly (string | null)[], expectedBucket: number): void {
  const value = model(); const before = JSON.stringify({ catalogue: value.catalogue, latest: value.latest, checks });
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks);
  expect(plan.historicalBucket).toBe(expectedBucket);
  expect(JSON.stringify({ catalogue: value.catalogue, latest: value.latest, checks })).toBe(before);
}
test.each([
  { name: 'all-null', checks: [null, null, null, null, null, null], expected: 0 },
  { name: 'null-first', checks: [iso(start - 1000), null, null, iso(start - 2000), iso(start - 3000), null], expected: 1 },
  { name: 'equal-checks', checks: [iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000)], expected: 0 },
  { name: 'oldest-five', checks: [iso(start - 1000), iso(start - 2000), iso(start - 3000), iso(start - 1000), iso(start - 2000), iso(start - 7000)], expected: 5 },
])('REF-BUCKET-$name: null/tied/oldest checks select $expected without advancing caller state',
  /**
   * Adapts one explicit bucket-history case without spreading nullable arrays in the harness.
   * @param value Controlled history and its expected bucket.
   * @returns Nothing after the independent bucket-order assertions.
   */
  (value: { name: string; checks: (string | null)[]; expected: number }): void => checksBucketOrder(value.checks, value.expected),
);

/**
 * Rejects malformed new planner inputs rather than accepting coerced clocks/history.
 * @param value Invalid clock or six-check history.
 * @returns Nothing after the behavioral rejection assertion.
 */
function rejectsPlanInput(value: { name: string; now?: number; checks?: unknown }): void {
  const base = model();
  expect(planRefresh.bind(null, validateCatalogue(base.catalogue), base.latest, value.now ?? start, (value.checks ?? [null, null, null, null, null, null]) as (string | null)[])).toThrow();
}
test.each([{ name: 'NaN-clock', now: NaN }, { name: 'infinite-clock', now: Infinity }, { name: 'empty-history', checks: [] }, { name: 'five-checks', checks: [null, null, null, null, null] }, { name: 'seven-checks', checks: [null, null, null, null, null, null, null] }, { name: 'malformed-date', checks: ['not-a-time', null, null, null, null, null] }, { name: 'numeric-date', checks: [start, null, null, null, null, null] }, { name: 'future-check', checks: [iso(start + 1), null, null, null, null, null] }])('REF-INVALID-$name: unsupported planner input is rejected', rejectsPlanInput);

/**
 * Requires new/unavailable/failure priorities ahead of latest, overdue and historical work.
 * @returns Nothing after ordered deduplication and overdue assertions.
 * @remarks Changes only a fresh synthetic model's controlled statuses and timestamps.
 */
function checksPriority(): void {
  const value = model();
  const newRecord = sittingIdentity('9999', '2026-10-10'); value.latest.push(newRecord);
  const unavailable = selected(value.catalogue, '1065');
  unavailable.record = { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: iso(start - 1000), lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
  const failed = selected(value.catalogue, '1064'); failed.record.lastAttemptOutcome = 'failed'; failed.record.lastAttemptAt = iso(start - 2000);
  const overdue = selected(value.catalogue, '1063'); overdue.record.acquiredAt = iso(start - day - 1);
  value.catalogue.preparedAt = iso(start); coverage(value.catalogue);
  const checks = [null, iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000)];
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks);
  const newest: string[] = []; for (const sitting of [...value.latest].sort(recent).slice(0, 30)) newest.push(sitting.id);
  const expected = ['9999', '1065', '1064'];
  for (const id of newest) if (!expected.includes(id)) expected.push(id);
  if (!expected.includes('1063')) expected.push('1063');
  const history: Sitting[] = []; for (const sitting of value.catalogue.sittings) if (bucket(sitting.id) === 0 && !expected.includes(sitting.id)) history.push(sitting);
  history.sort(oldestCheck); for (const sitting of history) expected.push(sitting.id);
  expect(plan).toEqual({ sittingIds: expected, historicalBucket: 0, overdueIds: ['1063'] });
}
test('REF-PRIORITY: new/unavailable then prior-failed then latest30 then overdue then bucket, each ID once', checksPriority);

/**
 * Checks strictly-greater-than-twenty-four-hour overdue targeting outside the selected bucket.
 * @param age Controlled successful-check age in milliseconds.
 * @param overdue Whether the contract marks that exact age overdue.
 * @returns Nothing after strict threshold and target-list assertions.
 * @remarks Changes only a fresh synthetic model's acquisition timestamp.
 */
function checksOverdue(age: number, overdue: boolean): void {
  const value = model(); const target = selected(value.catalogue, '1070');
  target.record.acquiredAt = iso(start - age);
  const chosen = (bucket(target.id) + 1) % 6;
  const checks: (string | null)[] = [iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000)]; checks[chosen] = null;
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks);
  expect({ bucket: plan.historicalBucket, overdueIds: plan.overdueIds, targeted: plan.sittingIds.includes(target.id) }).toEqual({ bucket: chosen, overdueIds: overdue ? [target.id] : [], targeted: overdue });
}
test.each([[day - 1, false], [day, false], [day + 1, true]] as const)('REF-OVERDUE: age %i has overdue status %s and catch-up targeting', checksOverdue);

/**
 * Requires oldest successful historical checks ahead of newer checks and exact-ID ties.
 * @returns Nothing after bucket-internal ordering assertions.
 * @remarks Changes only fresh synthetic acquisition times.
 */
function checksHistoricalOrder(): void {
  const value = model(); const ids: string[] = [];
  for (const sitting of value.catalogue.sittings) if (Number(sitting.id) > 1030 && bucket(sitting.id) === 2) ids.push(sitting.id);
  ids.sort(lexical);
  for (const id of ids) { const record = selected(value.catalogue, id).record; record.acquiredAt = iso(start - 2 * 3_600_000); record.lastAttemptAt = record.acquiredAt; }
  const oldest = ids.at(-1)!; const oldRecord = selected(value.catalogue, oldest).record;
  oldRecord.acquiredAt = iso(start - 20 * 3_600_000); oldRecord.lastAttemptAt = oldRecord.acquiredAt;
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, [iso(start - 1000), iso(start - 1000), null, iso(start - 1000), iso(start - 1000), iso(start - 1000)]);
  const actual: string[] = []; for (const id of plan.sittingIds) if (ids.includes(id)) actual.push(id);
  const expected = [oldest]; for (const id of ids) if (id !== oldest) expected.push(id);
  expect(actual).toEqual(expected);
}
test('REF-ORDER: historical bucket checks use oldest successful acquiredAt before exact-ID ties', checksHistoricalOrder);

/**
 * Requires six normal plans to target every historical record with distinct oldest buckets.
 * @returns Nothing after six-run bucket and coverage assertions.
 * @remarks Simulates only explicitly completed successful work on caller-owned fixture state.
 */
function checksSixPlans(): void {
  const value = model(); const checks: (string | null)[] = [null, null, null, null, null, null];
  const seen = new Set<string>(); const buckets: number[] = [];
  for (let run = 0; run < 6; run++) {
    const time = start + run * 3_600_000;
    const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, time, checks);
    buckets.push(plan.historicalBucket);
    for (const id of plan.sittingIds) { seen.add(id); const record = selected(value.catalogue, id).record; record.acquiredAt = iso(time); record.lastAttemptAt = record.acquiredAt; }
    if (plan.historicalBucket >= 0) checks[plan.historicalBucket] = iso(time);
    value.catalogue.preparedAt = iso(time);
  }
  expect({ buckets, historicalCoverage: [...seen].sort() }).toEqual({ buckets: [0, 1, 2, 3, 4, 5], historicalCoverage: value.latest.map(inventoryId).sort() });
}

/**
 * Selects one exact controlled inventory ID.
 * @param sitting Complete controlled source inventory entry.
 * @returns Canonical source identity, unchanged.
 */
function inventoryId(sitting: InventorySitting): string { return sitting.id; }
test('REF-SIX-PLAN: six successful completed normal sweeps target every historical record', checksSixPlans);

/**
 * Requires safe full targeting when no prior accepted catalogue exists.
 * @returns Nothing after bootstrap target-set and explicit selected-bucket assertions.
 */
function checksBootstrapPlan(): void {
  const value = model(); const plan = planRefresh(null, value.latest, start, [null, null, null, null, null, null]);
  expect({ bucket: plan.historicalBucket, ids: [...plan.sittingIds].sort(), overdueIds: plan.overdueIds }).toEqual({ bucket: 0, ids: value.latest.map(inventoryId).sort(), overdueIds: [] });
}
test('REF-BOOTSTRAP: absent accepted state plans every freshly inventoried ID without fake overdue times', checksBootstrapPlan);

/**
 * Requires preserved prior inventory omissions to remain eligible for historical sweeps.
 * @returns Nothing after historical retained-ID and target-set assertions.
 * @remarks Marks only one synthetic sitting as omitted/retained and recomputes its coverage.
 */
function checksRetainedPlan(): void {
  const value = model(); const omitted = selected(value.catalogue, '1070');
  value.latest = value.latest.filter(isLatest);
  /**
   * Omits one accepted source identity from the controlled latest inventory only.
   * @param sitting Current synthetic source inventory entry.
   * @returns Whether it remains listed in the latest fixture.
   */
  function isLatest(sitting: InventorySitting): boolean { return sitting.id !== omitted.id; }
  omitted.listedInLatestInventory = false; omitted.record.availability = 'retained'; coverage(value.catalogue);
  const chosen = bucket(omitted.id);
  const checks: (string | null)[] = [iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000)]; checks[chosen] = null;
  const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, checks);
  expect(plan).toEqual({ sittingIds: normalTargets(value, chosen), historicalBucket: chosen, overdueIds: [] });
  expect(plan.sittingIds).toContain(omitted.id);
}
test('REF-RETAINED-PLAN: prior omitted accepted IDs remain in the complete historical sweep scope', checksRetainedPlan);

/**
 * Requires actual incremental requests and preservation of unselected accepted payload/times.
 * @returns Completion after network order, checkpoint sweep and private receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 */
async function checksActualIncremental(): Promise<void> {
  const value = await fixture(); const expected = normalTargets(value, 2);
  const untouched = value.latest.find(notTargeted)!;
  /**
   * Selects an accepted sitting outside this normal refresh target set.
   * @param sitting Current synthetic inventory entry.
   * @returns Whether no acquisition is expected in this run.
   */
  function notTargeted(sitting: InventorySitting): boolean { return !expected.includes(sitting.id); }
  const old = selected(value.catalogue, untouched.id); const bytes = await readFile(join(value.out, 'sittings', untouched.id + '.json.gz'));
  const run = await acquire(options(value));
  expect(requested(value)).toEqual(expected);
  expect(selected(run.catalogue, untouched.id).record).toEqual(old.record);
  expect(await readFile(join(value.out, 'sittings', untouched.id + '.json.gz'))).toEqual(bytes);
  expect(await report(value)).toMatchObject({ strategy: 'incremental', baseline: 'checkpoint', historicalBucket: 2, targetIds: expected, completedIds: expected, unchangedIds: expected, changedIds: [], failedIds: [], pendingIds: [], overdueIds: [], bucketCompleted: true, acquisitionOutcome: 'success', stagingOutcome: 'success' });
  const checkpoint = await optionalJson(join(value.state, 'checkpoint.json'));
  expect(checkpoint).toMatchObject({ refresh: { bucketChecks: [value.bucketChecks[0], value.bucketChecks[1], expect.any(String), value.bucketChecks[3], value.bucketChecks[4], value.bucketChecks[5]] } });
}
test('REF-RUN-001: actual refresh fetches only prioritized targets and preserves unselected accepted metadata/bytes', checksActualIncremental);

/**
 * Requires actual historical rechecks of accepted prior omissions while preserving inventory truth.
 * @returns Completion after source recheck, retained identity and omission-flag assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Removes only one entry from the controlled latest source inventory and selects its bucket.
 */
async function checksRetainedRun(): Promise<void> {
  const value = await fixture(); const omitted = selected(value.catalogue, '1070');
  value.latest = value.latest.filter(isLatest);
  /**
   * Keeps every latest synthetic inventory entry except the deliberate accepted omission.
   * @param sitting Current controlled source entry.
   * @returns Whether it stays in the fresh source inventory.
   */
  function isLatest(sitting: InventorySitting): boolean { return sitting.id !== omitted.id; }
  const chosen = bucket(omitted.id); value.bucketChecks.fill(iso(start - 1000)); value.bucketChecks[chosen] = null;
  await seed(value);
  const run = await acquire(options(value));
  expect({ rechecked: requested(value).includes(omitted.id), listed: selected(run.catalogue, omitted.id).listedInLatestInventory, acceptedId: selected(run.catalogue, omitted.id).id }).toEqual({ rechecked: true, listed: false, acceptedId: omitted.id });
  expect(run.catalogue.coverage).toMatchObject({ latestInventoryCount: 69 });
  expect(await report(value)).toMatchObject({ completedIds: expect.arrayContaining([omitted.id]), historicalBucket: chosen });
}
test('REF-RETAINED-RUN: omitted prior identity is historically rechecked without inventing a current inventory listing', checksRetainedRun);

/**
 * Requires actual source request order for new, unavailable and failed records ahead of latest30.
 * @returns Completion after prioritized network assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Changes only synthetic accepted statuses/latest source entries before the run.
 */
async function checksActualPriority(): Promise<void> {
  const value = await fixture(); value.latest.push(sittingIdentity('9999', '2026-10-10'));
  const unavailable = selected(value.catalogue, '1065');
  unavailable.record = { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: iso(start - 1000), lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
  value.shards.delete('1065');
  const failed = selected(value.catalogue, '1064'); failed.record.lastAttemptAt = iso(start - 2000); failed.record.lastAttemptOutcome = 'failed';
  value.catalogue.preparedAt = iso(start); coverage(value.catalogue); await seed(value);
  await acquire(options(value));
  expect(requested(value).slice(0, 3)).toEqual(['9999', '1065', '1064']);
  expect(await report(value)).toMatchObject({ targetIds: expect.arrayContaining(['9999', '1065', '1064']), changedIds: expect.arrayContaining(['9999', '1065']), failedIds: [], acquisitionOutcome: 'success' });
}
test('REF-RUN-PRIORITY: new/unavailable/previous-failure are acquired before recent and historical work', checksActualPriority);

/**
 * Requires changed/unchanged decoded hashes, successful check advances and private run accounting.
 * @param changed Whether one actually requested synthetic record changes its transcript.
 * @returns Completion after accepted time/hash and new receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Changes only the controlled response text set.
 */
async function checksChangedOutcome(changed: boolean): Promise<void> {
  const value = await fixture(); const id = '1001'; const old = selected(value.catalogue, id);
  if (changed) value.changed.add(id);
  const run = await acquire(options(value)); const record = selected(run.catalogue, id).record;
  expect(record.acquiredAt! > old.record.acquiredAt!).toBe(true);
  expect(record.lastAttemptOutcome).toBe('success');
  expect(record.digest === old.record.digest).toBe(!changed);
  expect(await report(value)).toMatchObject(changed ? { changedIds: [id], unchangedIds: expect.not.arrayContaining([id]), completedIds: expect.arrayContaining([id]), failedIds: [] } : { changedIds: [], unchangedIds: expect.arrayContaining([id]), completedIds: expect.arrayContaining([id]), failedIds: [] });
}
test.each([false, true])('REF-CONTENT-%s: content hashes distinguish unchanged/changed while successful acquiredAt advances', checksChangedOutcome);

/**
 * Requires a failed selected-bucket record to keep accepted bytes/time and sweep completion old.
 * @returns Completion after bounded retry, failure retention and new accounting assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Sets one controlled record failure without modifying its accepted baseline.
 */
async function checksFailedBucket(): Promise<void> {
  const value = await fixture(); let id = '';
  for (const sitting of value.latest) if (bucket(sitting.id) === 2 && Number(sitting.id) > 1030) { id = sitting.id; break; }
  value.failures.add(id); const old = selected(value.catalogue, id); const bytes = await readFile(join(value.out, 'sittings', id + '.json.gz'));
  const run = await acquire(options(value)); const accepted = selected(run.catalogue, id).record;
  expect(accepted).toMatchObject({ availability: 'retained', digest: old.record.digest, acquiredAt: old.record.acquiredAt, lastAttemptOutcome: 'failed' });
  expect(accepted.lastAttemptAt > old.record.lastAttemptAt).toBe(true);
  expect(await readFile(join(value.out, 'sittings', id + '.json.gz'))).toEqual(bytes);
  const attempts: number[] = []; for (const call of value.calls) if (call.id === id) attempts.push(call.at);
  expect(attempts).toHaveLength(3); expect(attempts[1] - attempts[0]).toBeGreaterThanOrEqual(1000); expect(attempts[2] - attempts[1]).toBeGreaterThanOrEqual(2000);
  expect(await report(value)).toMatchObject({ failedIds: [id], completedIds: expect.not.arrayContaining([id]), bucketCompleted: false, acquisitionOutcome: 'degraded', stagingOutcome: 'success' });
  expect(await optionalJson(join(value.state, 'checkpoint.json'))).toMatchObject({ refresh: { bucketChecks: value.bucketChecks } });
}
test('REF-FAILED: failed target preserves successful check/content and cannot advance an incomplete bucket', checksFailedBucket);

/**
 * Requires a recovered transient throttle to advance only after its completed accepted response.
 * @returns Completion after rate/retry/accounting assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Sets only controlled per-ID transient failure counts.
 */
async function checksThrottle(): Promise<void> {
  const value = await fixture(); value.transient.set('1001', 1);
  const run = await acquire(options(value)); const attempts: number[] = [];
  for (const call of value.calls) if (call.id === '1001') attempts.push(call.at);
  expect(attempts).toHaveLength(2); expect(attempts[1] - attempts[0]).toBeGreaterThanOrEqual(2000);
  expect(selected(run.catalogue, '1001').record.lastAttemptOutcome).toBe('success');
  expect(await report(value)).toMatchObject({ completedIds: expect.arrayContaining(['1001']), failedIds: [], bucketCompleted: true });
}
test('REF-THROTTLE: paced Retry-After recovery counts one accepted completed target', checksThrottle);

/**
 * Requires six actual successful runs to rotate distinct buckets while avoiding full rebootstrap.
 * @returns Completion after real controlled source requests and six-bucket coverage assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Advances the controlled clock by the schedule interval and clears only run logs.
 */
async function checksSixRuns(): Promise<void> {
  const value = await fixture(); value.bucketChecks = [null, null, null, null, null, null]; await seed(value);
  const seen = new Set<string>(); const chosen: number[] = []; const requestCounts: number[] = [];
  for (let index = 0; index < 6; index++) {
    value.calls.length = 0;
    const run = await acquire(options(value)); const recorded = await report(value) as { historicalBucket?: number } | null;
    chosen.push(recorded?.historicalBucket ?? -1);
    for (const id of requested(value)) seen.add(id);
    requestCounts.push(requested(value).length);
    value.catalogue = run.catalogue;
    value.elapsed += 4 * 3_600_000;
  }
  expect({ chosen, ids: [...seen].sort(), everyRunIncremental: requestCounts.every(belowInventoryCount) }).toEqual({ chosen: [0, 1, 2, 3, 4, 5], ids: value.latest.map(inventoryId).sort(), everyRunIncremental: true });
  /**
   * Checks each observed run avoided full inventory reacquisition.
   * @param count Actual controlled source request count.
   * @returns Whether the normal run requests less than the full inventory.
   */
  function belowInventoryCount(count: number): boolean { return count < value.latest.length; }
}
test('REF-SIX-RUN: six normal four-hour refreshes sweep the full historical inventory without refetching all', checksSixRuns);

/**
 * Requires overdue catch-up regardless of stable bucket after a missed schedule interval.
 * @returns Completion after actual request and overdue-report assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Makes only one prior accepted check deliberately overdue.
 */
async function checksCatchup(): Promise<void> {
  const value = await fixture(); const id = '1070';
  selected(value.catalogue, id).record.acquiredAt = iso(start - day - 1);
  const chosen = (bucket(id) + 1) % 6; value.bucketChecks.fill(iso(start - 1000)); value.bucketChecks[chosen] = null;
  await seed(value); const run = await acquire(options(value));
  expect(await report(value)).toMatchObject({ historicalBucket: chosen, overdueIds: [id], completedIds: expect.arrayContaining([id]) });
  expect(requested(value)).toContain(id);
  expect(selected(run.catalogue, id).record.acquiredAt! > iso(start - day - 1)).toBe(true);
}
test('REF-CATCHUP: overdue accepted work is checked outside the oldest selected historical bucket', checksCatchup);

/**
 * Requires an interrupted prioritized plan to checkpoint only accepted targets without advancing sweeps.
 * @returns Completion after preservation, pending-target and safe same-session resume assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Injects only a controlled four-hour deadline and later resets that controlled interruption.
 */
async function checksInterruptedPlan(): Promise<void> {
  const value = await fixture(); value.latest.push(sittingIdentity('9999', '2026-10-10')); value.pauseAfterRecord = true;
  const oldOutput = await readFile(join(value.out, 'catalogue.json.gz')); const oldCheckpoint = await readFile(join(value.state, 'checkpoint.json'));
  let rejected = false; try { await acquire(options(value)); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(value.out, 'catalogue.json.gz')), checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ rejected: true, output: oldOutput, checkpoint: oldCheckpoint });
  expect(await optionalJson(join(value.state, 'partial-checkpoint.json'))).toMatchObject({ complete: false, accepted: [{ id: '9999' }], refresh: { historicalBucket: 2, bucketChecks: value.bucketChecks, completedIds: ['9999'] } });
  expect(await report(value)).toMatchObject({ completedIds: ['9999'], pendingIds: expect.not.arrayContaining(['9999']), bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' });
  value.pauseAfterRecord = false; value.calls.length = 0;
  const resumed = await acquire(options(value));
  expect(requested(value)).not.toContain('9999');
  expect(selected(resumed.catalogue, '9999').record.availability).toBe('available');
  expect(await report(value)).toMatchObject({ completedIds: expect.arrayContaining(['9999']), pendingIds: [], bucketCompleted: true });
}
test('REF-INTERRUPT: four-hour cap leaves accepted output/sweeps old and resumes only pending prioritized work', checksInterruptedPlan);

/**
 * Requires a validated private partial plan to resume its unfinished targets without full inventory work.
 * @returns Completion after independently seeded plan metadata and actual resume request assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Adds explicitly synthetic plan metadata to real accepted interrupted fixture bytes.
 */
async function checksPendingResume(): Promise<void> {
  const value = await fixture(); value.latest.sort(recent); value.pauseAfterRecord = true;
  let interrupted = false; try { await acquire(options(value)); } catch { interrupted = true; }
  expect(interrupted).toBe(true);
  const path = join(value.state, 'partial-checkpoint.json');
  const partial = JSON.parse(await readFile(path, 'utf8'));
  expect(partial.accepted[0].id).toBe('1001');
  const targets = normalTargets(value, 2); const pending: string[] = [];
  for (const id of targets) if (id !== '1001') pending.push(id);
  partial.pendingIds = pending;
  partial.refresh = { historicalBucket: 2, bucketChecks: value.bucketChecks, targetIds: targets, completedIds: ['1001'], unchangedIds: ['1001'], changedIds: [], failedIds: [], overdueIds: [] };
  await writeFile(path, JSON.stringify(partial));
  value.pauseAfterRecord = false; value.calls.length = 0;
  const run = await acquire(options(value));
  expect(requested(value)).toEqual(pending);
  expect(selected(run.catalogue, '1001').record.acquiredAt).toBe(partial.accepted[0].record.acquiredAt);
  expect(await report(value)).toMatchObject({ targetIds: targets, completedIds: targets, pendingIds: [], bucketCompleted: true });
}
test('REF-RESUME: same-session validated partial resumes only selected pending IDs and preserves accepted completion times', checksPendingResume);

/**
 * Requires fatal discovery/source/staging failures to preserve prior accepted data and report outcomes.
 * @param fault Controlled fatal boundary.
 * @returns Completion after failure/preservation and acquisition-versus-staging receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Changes only controlled fault/measurement dependencies.
 */
async function checksFatalReport(fault: 'discovery' | 'inventory' | 'record' | 'output'): Promise<void> {
  const value = await fixture(); const before = await readFile(join(value.out, 'catalogue.json.gz')); const checkpoint = await readFile(join(value.state, 'checkpoint.json'));
  if (fault !== 'output') value.fault = fault;
  const input = options(value);
  if (fault === 'output') input.measureSizes = overBudget;
  let rejected = false; try { await acquire(input); } catch { rejected = true; }
  expect({ rejected, output: await readFile(join(value.out, 'catalogue.json.gz')), checkpoint: await readFile(join(value.state, 'checkpoint.json')) }).toEqual({ rejected: true, output: before, checkpoint });
  expect(await report(value)).toMatchObject({ bucketCompleted: false, acquisitionOutcome: fault === 'output' ? 'success' : 'failed', stagingOutcome: fault === 'output' ? 'failed' : 'not-attempted' });
}

/**
 * Supplies an explicitly synthetic over-budget measurement without allocating 900MB.
 * @param path Chosen real staged directory, unused by this controlled measurement.
 * @param actual Actual valid small fixture measurements.
 * @returns A controlled total-byte rejection input preserving all other real measurements.
 */
async function overBudget(path: string, actual: unknown): Promise<unknown> { void path; return { ...(actual as Record<string, unknown>), totalBytes: 900_000_001 }; }
test.each(['discovery', 'inventory', 'record', 'output'] as const)('REF-FATAL-%s: failure preserves baseline/sweeps with separate acquisition and staging receipts', checksFatalReport);

/**
 * Requires absent-state refresh bootstrap to report its explicit recovery strategy.
 * @returns Completion after full-target acquisition and private bootstrap receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Removes only temporary fixture state/output before the controlled first run.
 */
async function checksNoStateBootstrap(): Promise<void> {
  const value = await fixture(); await rm(value.state, { recursive: true }); await rm(value.out, { recursive: true });
  const run = await acquire(options(value));
  expect(run.catalogue.coverage.latestInventoryCount).toBe(value.latest.length);
  expect([...new Set(requested(value))].sort()).toEqual(value.latest.map(inventoryId).sort());
  expect(await report(value)).toMatchObject({ strategy: 'bootstrap', baseline: 'none', targetIds: expect.arrayContaining(value.latest.map(inventoryId)), completedIds: expect.arrayContaining(value.latest.map(inventoryId)), pendingIds: [], acquisitionOutcome: 'success' });
}
test('REF-NO-STATE: no prior publication/checkpoint safely bootstraps with an explicit full-target report', checksNoStateBootstrap);

/**
 * Requires lost/expired accepted state to block published replacement and report the trust failure.
 * @param expired Whether the checkpoint is present but beyond seven-day retention.
 * @returns Completion after trust rejection, old-byte preservation and run receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Removes or expires only the controlled checkpoint fixture.
 */
async function checksLostStateReport(expired: boolean): Promise<void> {
  const value = await fixture(); const before = await readFile(join(value.out, 'catalogue.json.gz'));
  if (expired) {
    const path = join(value.state, 'checkpoint.json'); const input = JSON.parse(await readFile(path, 'utf8'));
    input.createdAt = iso(start - 7 * day - 1); await writeFile(path, JSON.stringify(input));
  } else await rm(join(value.state, 'checkpoint.json'));
  let rejected = false; try { await acquire(options(value)); } catch { rejected = true; }
  expect({ rejected, calls: requested(value), output: await readFile(join(value.out, 'catalogue.json.gz')) }).toEqual({ rejected: true, calls: [], output: before });
  expect(await report(value)).toMatchObject({ baseline: 'unrecoverable', completedIds: [], bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' });
}
test.each([false, true])('REF-LOST-%s: missing/expired retention baseline blocks replacement and records trust failure', checksLostStateReport);

/**
 * Requires exactly-seven-day validated local state to remain reusable with truthful incremental reporting.
 * @returns Completion after boundary-valid trust and incremental report assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Sets only the controlled checkpoint creation time to the accepted retention boundary.
 */
async function checksSevenDayBoundary(): Promise<void> {
  const value = await fixture(); const path = join(value.state, 'checkpoint.json'); const checkpoint = JSON.parse(await readFile(path, 'utf8'));
  checkpoint.createdAt = iso(start - 7 * day); await writeFile(path, JSON.stringify(checkpoint));
  const run = await acquire(options(value));
  expect(run.catalogue.coverage.latestInventoryCount).toBe(value.latest.length);
  expect(await report(value)).toMatchObject({ strategy: 'incremental', baseline: 'checkpoint', historicalBucket: 2, acquisitionOutcome: 'success' });
}
test('REF-RETENTION: exactly seven-day validated state is usable while later expiry cannot masquerade as new unavailable data', checksSevenDayBoundary);

/**
 * Creates independently supplied synthetic reviewed-main publication evidence and served gzip bytes.
 * @param value Source/local disk fixture supplying exact accepted payloads.
 * @returns Existing API options with an explicit trusted served-baseline proof.
 * @throws On unexpected temporary output read errors.
 */
async function servedOptions(value: Fixture): Promise<AcquisitionOptions> {
  const input = options(value);
  input.branch = 'main'; input.workflowContext = true; input.runId = '123';
  input.workflowUrl = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123';
  const bytes = await readFile(join(value.out, 'catalogue.json.gz'));
  const digests: Record<string, string> = {}; for (const [id, shard] of value.shards) digests[id] = hash(shard);
  input.servedBaseline = { repository: input.repository, branch: 'main', success: true, codeFingerprint: input.codeFingerprint, runId: '123', receipt: { snapshotId: value.catalogue.snapshotId, deploymentId: 'synthetic-reviewed-deployment', publishedAt: iso(start - 3_000_000), verifiedServedAt: iso(start - 2_000_000), workflowUrl: input.workflowUrl }, catalogueDigest: hash(gunzipSync(bytes)), shardDigests: digests, baseUrl: 'https://eaglecheow.github.io/vote-better-malaysia/', transport: served };
  /**
   * Serves only the fixture's independently trusted Pages base, separate from Parliament acquisition.
   * @param requestedUrl Expected Pages catalogue or exact sitting shard URL.
   * @returns Exact controlled gzip bytes.
   * @throws On an unapproved served URL or absent fixture shard.
   */
  async function served(requestedUrl: string | URL | Request): Promise<Response> {
    const url = String(requestedUrl); const base = 'https://eaglecheow.github.io/vote-better-malaysia/data/';
    if (url === base + 'catalogue.json.gz') return new Response(Uint8Array.from(bytes));
    if (!url.startsWith(base + 'sittings/')) throw new Error('Unapproved served fixture URL');
    const id = url.slice((base + 'sittings/').length).replace(/\.json\.gz$/, '');
    const shard = value.shards.get(id); if (!shard) throw new Error('Missing served fixture shard');
    return new Response(Uint8Array.from(shard));
  }
  return input;
}

/**
 * Requires missing/expired state recovery to report bootstrap and retain exact served data on failure.
 * @param expired Whether the controlled prior artifact expires instead of going missing.
 * @returns Completion after served-baseline recovery, exact retention and new receipt assertions.
 * @throws On unexpected temporary setup/read errors.
 * @remarks Mutates only synthetic trusted artifact metadata and one controlled source failure.
 */
async function checksServedRecovery(expired: boolean): Promise<void> {
  const value = await fixture(); const input = await servedOptions(value); const id = '1070'; value.failures.add(id);
  const prior = selected(value.catalogue, id); const bytes = await readFile(join(value.out, 'sittings', id + '.json.gz'));
  const path = join(value.state, 'checkpoint.json');
  if (expired) {
    const checkpoint = JSON.parse(await readFile(path, 'utf8'));
    Object.assign(checkpoint, { originKind: 'workflow-artifact', publicationEligible: true, branch: 'main', runId: '123', workflowUrl: input.workflowUrl, createdAt: iso(start - 7 * day - 1) });
    await writeFile(path, JSON.stringify(checkpoint));
  } else await rm(path);
  const run = await acquire(input);
  expect(selected(run.catalogue, id).record).toMatchObject({ availability: 'retained', digest: prior.record.digest, acquiredAt: prior.record.acquiredAt, lastAttemptOutcome: 'failed' });
  expect(await readFile(join(value.out, 'sittings', id + '.json.gz'))).toEqual(bytes);
  expect(run.catalogue.coverage).toMatchObject({ unavailableSittingCount: 0, latestInventoryCount: value.latest.length });
  expect(await report(value)).toMatchObject({ strategy: 'bootstrap', baseline: 'served', failedIds: [id], targetIds: expect.arrayContaining(value.latest.map(inventoryId)), acquisitionOutcome: 'degraded', stagingOutcome: 'success' });
}
test.each([false, true])('REF-SERVED-%s: missing/expired state recovers only trusted served baseline and reports bootstrap retention', checksServedRecovery);

/** Reads the actual temporary accepted catalogue/checkpoint bytes for preservation assertions.
 * @param value Isolated accepted fixture.
 * @returns Exact previously accepted public/private bytes.
 */
async function acceptedBytes(value: Fixture): Promise<{ output: Buffer; checkpoint: Buffer }> {
  return { output: await readFile(join(value.out, 'catalogue.json.gz')), checkpoint: await readFile(join(value.state, 'checkpoint.json')) };
}

/** Checks malformed new bucket history is rejected before source access or accepted-output replacement.
 * @param history Explicit untrusted private six-bucket metadata.
 * @returns Completion after rejection, old-byte preservation and truthful failure-receipt assertions.
 * @remarks Writes only deliberately malformed temporary private metadata.
 */
async function rejectsCheckpointHistory(history: unknown): Promise<void> {
  const value = await fixture(); const path = join(value.state, 'checkpoint.json'); const checkpoint = JSON.parse(await readFile(path, 'utf8'));
  checkpoint.refresh = { bucketChecks: history }; await writeFile(path, JSON.stringify(checkpoint)); const before = await acceptedBytes(value);
  let rejected = false; try { await acquire(options(value)); } catch { rejected = true; }
  expect(rejected).toBe(true); expect(requested(value)).toEqual([]); expect(await acceptedBytes(value)).toEqual(before);
  expect(await report(value)).toMatchObject({ completedIds: [], bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' });
}
test.each([
  { name: 'five-checks', history: [null, null, null, null, null] },
  { name: 'seven-checks', history: [null, null, null, null, null, null, null] },
  { name: 'not-array', history: 'bucket-history' },
  { name: 'numeric-check', history: [start, null, null, null, null, null] },
  { name: 'malformed-check', history: ['not-a-time', null, null, null, null, null] },
  { name: 'calendar-invalid', history: ['2026-02-30T04:00:00.000Z', null, null, null, null, null] },
  { name: 'future-check', history: [iso(start + 1), null, null, null, null, null] },
])('REF-EXTRA-HISTORY-$name: malformed accepted sweep history cannot advance or replace prior state',
  /** Adapts one explicit untrusted history without changing production validation.
   * @param value Invalid private-history case.
   * @returns Completion after rejection/preservation assertions.
   */
  async function invalidHistory(value): Promise<void> { await rejectsCheckpointHistory(value.history); });

test.each([false, true])('REF-EXTRA-LEGACY-%s: valid or absent legacy bucket metadata is reusable, not an invented completed sweep',
  /** Positive control for valid metadata and compatible pre-refresh checkpoints.
   * @param legacy Whether the optional new private history is absent.
   * @returns Completion after successful coherent staging and source/identity checks.
   * @remarks Removes only optional private metadata from one temporary fixture.
   */
  async function acceptsHistory(legacy): Promise<void> {
    const value = await fixture(); if (legacy) { const path = join(value.state, 'checkpoint.json'); const checkpoint = JSON.parse(await readFile(path, 'utf8')); delete checkpoint.refresh; await writeFile(path, JSON.stringify(checkpoint)); }
    const run = await acquire(options(value)); expect(validateCatalogue(run.catalogue)).toBe(run.catalogue);
    expect(run.catalogue.coverage.latestInventoryCount).toBe(value.latest.length); expect(run.catalogue.coverage.unavailableSittingCount).toBe(0);
  });

/** Creates a valid real interrupted fixture and adds the agreed private original-plan ledger.
 * @returns Fixture and accepted private state with one genuinely completed source response.
 * @remarks Uses real temporary acquisition/cap behavior, then writes explicitly controlled new ledger metadata.
 * @throws For an invalid fixture interruption or missing expected accepted response.
 */
async function interruptedLedger(): Promise<{ value: Fixture; partial: Record<string, any>; path: string }> {
  const value = await fixture(); value.latest.sort(recent); value.pauseAfterRecord = true;
  await expect(acquire(options(value))).rejects.toMatchObject({ kind: 'cap' });
  const path = join(value.state, 'partial-checkpoint.json'); const partial = JSON.parse(await readFile(path, 'utf8'));
  expect(partial.accepted[0].id).toBe('1001'); const targetIds = normalTargets(value, 2); const pendingIds: string[] = [];
  for (const id of targetIds) if (id !== '1001') pendingIds.push(id);
  partial.pendingIds = pendingIds; partial.refresh = { historicalBucket: 2, bucketChecks: [...value.bucketChecks], targetIds,
    completedIds: ['1001'], unchangedIds: ['1001'], changedIds: [], failedIds: [], overdueIds: [] };
  await writeFile(path, JSON.stringify(partial)); value.pauseAfterRecord = false; value.calls.length = 0;
  return { value, partial, path };
}

/** Checks inconsistent private plan fields cannot change the original sweep or accepted completion times.
 * @param defect Required new ledger-invalid case.
 * @returns Completion after rejection, no source work and exact accepted-state preservation.
 * @throws Error for an unsupported test defect name.
 * @remarks Mutates only the explicitly controlled temporary partial ledger.
 */
async function rejectsPartialLedger(defect: string): Promise<void> {
  const { value, partial, path } = await interruptedLedger(); const ledger = partial.refresh;
  if (defect === 'bucket-index') ledger.historicalBucket = 6;
  else if (defect === 'bucket-history') ledger.bucketChecks = [null];
  else if (defect === 'duplicate-target') ledger.targetIds.push('1001');
  else if (defect === 'unknown-pending') partial.pendingIds.push('999999');
  else if (defect === 'completed-not-accepted') ledger.completedIds.push('1002');
  else if (defect === 'pending-completed-overlap') partial.pendingIds.push('1001');
  else if (defect === 'changed-unchanged-overlap') ledger.changedIds.push('1001');
  else if (defect === 'failed-completed-overlap') ledger.failedIds.push('1001');
  else if (defect === 'missing-failed-record') { ledger.failedIds.push('1002'); partial.pendingIds = partial.pendingIds.filter(
    /** Removes the claimed failed ID so only its missing attempt evidence is defective.
     * @param id Original pending source ID.
     * @returns Whether it remains pending.
     */
    function pending(id: string): boolean { return id !== '1002'; }); }
  else if (defect === 'unreferenced-hash') partial.shardDigests['999999'] = 'f'.repeat(64);
  else if (defect === 'expired') partial.createdAt = iso(clock(value) - 7 * day - 1);
  else if (defect === 'future-created') partial.createdAt = iso(clock(value) + 1);
  else throw new Error('Unsupported controlled partial defect');
  await writeFile(path, JSON.stringify(partial)); const before = await acceptedBytes(value);
  let rejected = false; try { await acquire(options(value)); } catch { rejected = true; }
  expect(rejected).toBe(true); expect(requested(value)).toEqual([]); expect(await acceptedBytes(value)).toEqual(before);
  expect(await report(value)).toMatchObject({ bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' });
}
test.each(['bucket-index', 'bucket-history', 'duplicate-target', 'unknown-pending', 'completed-not-accepted', 'pending-completed-overlap',
  'changed-unchanged-overlap', 'failed-completed-overlap', 'missing-failed-record', 'unreferenced-hash', 'expired', 'future-created'])('REF-EXTRA-PARTIAL-%s: untrusted partial plan cannot resume or advance sweep history', rejectsPartialLedger);

test('REF-EXTRA-PARTIAL-CONTROL: a valid original partial ledger keeps its already accepted source timestamp',
  /** Positive control that valid interrupted source bytes and new metadata are not rejected merely for being partial.
   * @returns Completion after successful coherent resume and preserved accepted timestamp.
   */
  async function acceptsPartial(): Promise<void> {
    const { value, partial } = await interruptedLedger(); const run = await acquire(options(value));
    expect(selected(run.catalogue, '1001').record.acquiredAt).toBe(partial.accepted[0].record.acquiredAt);
    expect(selected(run.catalogue, '1001').record.digest).toBe(partial.accepted[0].record.digest);
    expect(validateCatalogue(run.catalogue)).toBe(run.catalogue);
  });

test.each([false, true])('REF-EXTRA-FLAG-%s: a historical source flag revision stays coherent with its accepted shard and preserves failed prior data',
  /** Control accepts either coherent old retained data or a successful coherent revalidation, without adding a refresh priority.
   * @param fail Whether the actually selected historical endpoint fails.
   * @returns Completion after catalogue/shard flag and complete old-data preservation checks.
   * @remarks Changes only one controlled source inventory flag and optional source failure.
   */
  async function coherentFlag(fail): Promise<void> {
    const value = await fixture(); const id = '1070'; const old = selected(value.catalogue, id); const oldBytes = await readFile(join(value.out, 'sittings', id + '.json.gz'));
    for (const incoming of value.latest) if (incoming.id === id) incoming.isFinal = false;
    const chosen = (bucket(id) + 1) % 6; value.bucketChecks.fill(iso(start - 1000)); value.bucketChecks[chosen] = null; await seed(value);
    if (fail) value.failures.add(id); const run = await acquire(options(value)); const accepted = selected(run.catalogue, id);
    const bytes = await readFile(join(value.out, 'sittings', id + '.json.gz')); const record = JSON.parse(gunzipSync(bytes).toString('utf8'));
    expect(record.identity.isFinal).toBe(accepted.isFinal); expect(hash(gunzipSync(bytes))).toBe(accepted.record.digest);
    if (requested(value).includes(id) && !fail) expect(accepted.isFinal).toBe(false);
    else { expect(accepted.isFinal).toBe(old.isFinal); expect(bytes).toEqual(oldBytes); expect(accepted.record.acquiredAt).toBe(old.record.acquiredAt); expect(accepted.record.digest).toBe(old.record.digest); }
  });

test('REF-EXTRA-NEW-FAILURE: a new inaccessible record stays unavailable with failed rather than pending/success accounting',
  /** Exercises a real controlled new-record source failure alongside successful other targets.
   * @returns Completion after unavailable descriptor, full inventory and explicit run outcome assertions.
   * @remarks Adds one synthetic source identity and controlled HTTP503 endpoint.
   */
  async function failedNewRecord(): Promise<void> {
    const value = await fixture(); value.latest.push(sittingIdentity('9999', '2026-10-10')); value.failures.add('9999');
    const run = await acquire(options(value)); expect(selected(run.catalogue, '9999').record).toMatchObject({ availability: 'unavailable', acquiredAt: null, digest: null, path: null, lastAttemptOutcome: 'failed' });
    expect(run.catalogue.coverage).toMatchObject({ latestInventoryCount: 71, unavailableSittingCount: 1 });
    expect(await report(value)).toMatchObject({ failedIds: ['9999'], completedIds: expect.not.arrayContaining(['9999']), pendingIds: [], acquisitionOutcome: 'degraded', stagingOutcome: 'success' });
  });

test('REF-EXTRA-OUTSIDE-BUCKET: a failed recent target cannot erase a separately successful historical sweep',
  /** Exercises failure accounting scoped to the selected historical bucket's actual records.
   * @returns Completion after complete selected-bucket progress and unrelated failure retention assertions.
   * @remarks Fails one controlled latest-thirty endpoint outside the selected stable bucket.
   */
  async function failedOutsideBucket(): Promise<void> {
    const value = await fixture(); let id = ''; for (const incoming of value.latest) if (Number(incoming.id) <= 1030 && bucket(incoming.id) !== 2) { id = incoming.id; break; }
    expect(id).not.toBe(''); value.failures.add(id); const old = selected(value.catalogue, id); const run = await acquire(options(value));
    expect(selected(run.catalogue, id).record).toMatchObject({ availability: 'retained', acquiredAt: old.record.acquiredAt, digest: old.record.digest, lastAttemptOutcome: 'failed' });
    expect(await report(value)).toMatchObject({ historicalBucket: 2, bucketCompleted: true, failedIds: [id], pendingIds: [], acquisitionOutcome: 'degraded', stagingOutcome: 'success' });
    const checkpoint = await optionalJson(join(value.state, 'checkpoint.json')) as { refresh?: { bucketChecks: (string | null)[] } } | null;
    expect(checkpoint?.refresh?.bucketChecks[2]).toBeTypeOf('string'); expect(Date.parse(checkpoint!.refresh!.bucketChecks[2]!)).toBeGreaterThan(Date.parse(value.bucketChecks[2]!));
  });

test('REF-EXTRA-DENIAL: native source access denial preserves accepted data and records stopped acquisition without staging',
  /** Exercises the existing actual request denial boundary with the new private outcome requirement.
   * @returns Completion after fatal denial, old-byte preservation and honest run-receipt assertions.
   * @remarks Wraps only controlled source responses to emit real HTTP403 without replacing production error handling.
   */
  async function deniedSource(): Promise<void> {
    const value = await fixture(); const before = await acceptedBytes(value); const input = options(value);
    input.transport =
      /** Returns an actual controlled HTTP403 for every sitting endpoint, leaving discovery/member/inventory normal.
       * @param requestedUrl Approved source URL.
       * @param init Actual signal/request options.
       * @returns Native Response carrying the denied source status.
       * @remarks Uses the existing fixture's actual attempt logging without fabricated successful source acceptance.
       */
      async function denied(requestedUrl, init): Promise<Response> { const response = await source(value, requestedUrl, init);
        return String(requestedUrl).includes('/hansard/dewan-rakyat/') ? new Response('controlled source denial', { status: 403 }) : response; };
    await expect(acquire(input)).rejects.toMatchObject({ kind: 'denied' }); expect(await acceptedBytes(value)).toEqual(before);
    expect(requested(value)).toHaveLength(1);
    expect(await report(value)).toMatchObject({ completedIds: [], bucketCompleted: false, acquisitionOutcome: 'failed', stagingOutcome: 'not-attempted' });
  });

test('REF-EXTRA-REPORT-WRITE: an actual private outcome-write failure cannot commit new output or successful sweep state',
  /** Exercises an actual filesystem refusal at the required private report destination.
   * @returns Completion after rejected staging and exact accepted-byte preservation.
   * @remarks Creates a directory at this temporary run's required report filename, without mocking filesystem success.
   */
  async function failedReportWrite(): Promise<void> {
    const value = await fixture(); const before = await acceptedBytes(value);
    await mkdir(join(value.state, 'receipts', 'refresh-session', 'refresh.json'), { recursive: true });
    let rejected = false; try { await acquire(options(value)); } catch { rejected = true; }
    expect(rejected).toBe(true); expect(await acceptedBytes(value)).toEqual(before);
  });

test('REF-EXTRA-FAILED-RESUME: a failed target before the cap retains its real attempt time/content without false completion on resume',
  /** Exercises actual failed-then-successful source attempts before a real controlled run deadline.
   * @returns Completion after persisted failure, pending-only resume and honest failed/source times.
   * @remarks Uses controlled pacing to reach the cap only after three failed attempts and one accepted record.
   */
  async function failedBeforeCap(): Promise<void> {
    const value = await fixture(); value.latest.sort(recent); value.failures.add('1001'); const old = selected(value.catalogue, '1001'); const input = options(value);
    input.sleep =
      /** Advances the actual controlled clock, then reaches the cap after the failed and accepted target attempts.
       * @param milliseconds Requested pacing/backoff.
       * @returns Immediate controlled-clock completion.
       * @remarks Advances only fixture elapsed time; no production source outcome is fabricated.
       */
      async function capped(milliseconds): Promise<void> { value.elapsed += value.calls.length >= 4 ? 14_400_000 : milliseconds; };
    await expect(acquire(input)).rejects.toMatchObject({ kind: 'cap' }); const interruptedAt = iso(clock(value));
    expect(await optionalJson(join(value.state, 'partial-checkpoint.json'))).toMatchObject({ refresh: { completedIds: ['1002'], failedIds: ['1001'] } });
    value.calls.length = 0; const run = await acquire(options(value)); const retained = selected(run.catalogue, '1001').record;
    expect(requested(value)).not.toContain('1001'); expect(requested(value)).not.toContain('1002');
    expect(retained).toMatchObject({ availability: 'retained', digest: old.record.digest, acquiredAt: old.record.acquiredAt, lastAttemptOutcome: 'failed' });
    expect(retained.lastAttemptAt > old.record.lastAttemptAt && retained.lastAttemptAt < interruptedAt).toBe(true);
    expect(await report(value)).toMatchObject({ failedIds: ['1001'], completedIds: expect.not.arrayContaining(['1001']), pendingIds: [], acquisitionOutcome: 'degraded', stagingOutcome: 'success' });
  });

/**
 * Preserves a newly completed private partial sitting that disappears from fresh inventory.
 * @returns Completion after coherent retained bytes, identity and source-time assertions.
 * @throws On genuine fixture setup or private evidence read errors.
 * @remarks Mutates only this isolated synthetic inventory/clock and temporary accepted state.
 */
async function checksOmittedPartialCompletion(): Promise<void> {
  const value = await fixture(); const id = '9999';
  value.latest.push(sittingIdentity(id, '2026-10-10')); value.pauseAfterRecord = true;
  let interrupted = false;
  try { await acquire(options(value)); } catch { interrupted = true; }
  expect(interrupted).toBe(true);
  const partial = await optionalJson(join(value.state, 'partial-checkpoint.json')) as { accepted: Sitting[] } | null;
  const completed = partial?.accepted.find(matchesId);
  expect(completed?.id).toBe(id);
  const completedBytes = await readFile(join(value.state, 'partial', 'sittings', id + '.json.gz'));
  value.latest = value.latest.filter(remainsListed); value.pauseAfterRecord = false; value.calls.length = 0;
  let run: Awaited<ReturnType<typeof acquire>> | null = null; let error: string | null = null;
  try { run = await acquire(options(value)); }
  catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
  const retained = run?.catalogue.sittings.find(matchesId);
  expect.soft({ succeeded: run !== null, error }).toEqual({ succeeded: true, error: null });
  expect.soft(retained).toMatchObject({ id, listedInLatestInventory: false, record: { availability: 'retained',
    acquiredAt: completed?.record.acquiredAt, lastAttemptAt: completed?.record.lastAttemptAt,
    lastAttemptOutcome: 'success', digest: completed?.record.digest } });
  expect.soft(requested(value)).not.toContain(id);
  let publishedBytes: Uint8Array | null = null;
  if (retained) publishedBytes = await readFile(join(value.out, 'sittings', id + '.json.gz'));
  expect.soft(publishedBytes).toEqual(completedBytes);

  /** Selects the exact independently completed synthetic source sitting.
   * @param sitting Candidate accepted or resumed sitting.
   * @returns Whether its exact source ID matches this completion.
   */
  function matchesId(sitting: Sitting): boolean { return sitting.id === id; }
  /** Removes only the newly completed source entry from the latest controlled inventory.
   * @param sitting Current controlled inventory entry.
   * @returns Whether it remains listed by this later controlled source observation.
   */
  function remainsListed(sitting: InventorySitting): boolean { return sitting.id !== id; }
}
test('REF-CONTEXT-PARTIAL-OMISSION: newly completed partial-only sitting remains coherent when omitted before resume', checksOmittedPartialCompletion);

/**
 * Preserves an untouched accepted gap when a current exact identity is used by another fresh record.
 * @returns Completion after successful reconciliation, original gap/bytes/times and no guessed attribution.
 * @throws On genuine isolated fixture setup or accepted-output read errors.
 * @remarks Changes only controlled source responses and temporary synthetic accepted state.
 */
async function checksUntouchedLateKnownGap(): Promise<void> {
  const value = await fixture(); const targets = normalTargets(value, 2);
  const untouched = value.latest.find(notTargeted)!; const old = selected(value.catalogue, untouched.id);
  const knownId = '999999'; const fresh = selected(value.catalogue, '1001');
  const record = JSON.parse(gunzipSync(value.shards.get(old.id)!).toString('utf8')) as SittingRecord;
  record.items.push({ ordinal: 1, sourceIndex: 8, sectionPath: ['Synthetic historical unresolved contribution'],
    text: 'Synthetic original unresolved words.\n\nKeep these paragraphs.', rawAuthor: 'Unresolved historical label',
    sourceAuthorId: knownId, memberId: null, attribution: 'unassigned', timestamp: null, gapReason: 'unknown-id' });
  const decoded = Buffer.from(JSON.stringify(record)); const bytes = gzipSync(decoded, { level: 9 });
  old.record.digest = hash(decoded); old.record.decodedBytes = decoded.length; old.record.compressedBytes = bytes.length;
  old.record.accounting = { total: 2, assigned: 1, unassigned: 1, annotations: 0 };
  value.shards.set(old.id, bytes); coverage(value.catalogue); value.catalogue.coverage.attributionGapCount = 1;
  await seed(value); const acceptedDescriptor = structuredClone(old.record);
  const controlled = options(value); controlled.transport = lateIdentitySource;
  let run: Awaited<ReturnType<typeof acquire>> | null = null; let error: string | null = null;
  try { run = await acquire(controlled); }
  catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
  const retained = run?.catalogue.sittings.find(matchesUntouched);
  expect.soft({ succeeded: run !== null, error }).toEqual({ succeeded: true, error: null });
  expect.soft(requested(value)).toEqual(targets);
  expect.soft(retained?.record).toMatchObject({ digest: acceptedDescriptor.digest, acquiredAt: acceptedDescriptor.acquiredAt,
    lastAttemptAt: acceptedDescriptor.lastAttemptAt, lastAttemptOutcome: 'success', accounting: acceptedDescriptor.accounting });
  expect.soft(run?.catalogue.members).toEqual(expect.arrayContaining([expect.objectContaining({ id: knownId })]));
  const publishedBytes = await readFile(join(value.out, 'sittings', old.id + '.json.gz'));
  expect.soft(publishedBytes).toEqual(bytes);
  const published = JSON.parse(gunzipSync(publishedBytes).toString('utf8')) as SittingRecord;
  expect.soft(published.items).toEqual(record.items);
  expect.soft(published.items[1]).toMatchObject({ memberId: null, attribution: 'unassigned', gapReason: 'unknown-id', sourceAuthorId: knownId });

  /** Selects a sitting deliberately outside this incremental acquisition plan.
   * @param sitting Current controlled inventory entry.
   * @returns Whether its accepted shard should remain untouched during this run.
   */
  function notTargeted(sitting: InventorySitting): boolean { return !targets.includes(sitting.id); }
  /** Selects the unchanged historical sitting from the resulting coherent catalogue.
   * @param sitting Candidate normalized sitting.
   * @returns Whether its exact source ID is the untouched historical ID.
   */
  function matchesUntouched(sitting: Sitting): boolean { return sitting.id === old.id; }
  /** Supplies a newly recognized exact source identity, assigned only in a different rechecked sitting.
   * @param input Approved controlled official source request.
   * @param init Actual acquisition request options forwarded to the existing fixture transport.
   * @returns Supported raw synthetic response without translating or repairing the old gap.
   * @throws On genuine existing fixture transport/body errors.
   * @remarks The forwarded fixture transport records attempts and controlled clock/failure effects.
   */
  async function lateIdentitySource(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const response = await source(value, input, init);
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname.endsWith('/cari-mp.json')) return Response.json({ pageProps: { speakers: [
      { new_author_id: 1839, name: 'LIM GUAN ENG' },
      { new_author_id: Number(knownId), name: 'Synthetic newly supplied exact source identity' },
    ] } });
    if (url.searchParams.get('date') !== fresh.date || !response.ok) return response;
    const raw = await response.json(); raw.pageProps.speeches[0].author_id = Number(knownId);
    raw.pageProps.speeches[0].author = 'Synthetic newly supplied exact source identity';
    return Response.json(raw);
  }
}
test('REF-CONTEXT-LATE-IDENTITY: untouched accepted unknown-ID gap survives a new exact identity used in another rechecked sitting', checksUntouchedLateKnownGap);

test.each([false, true])('REF-CONTEXT-PRECISION-%s: whole-second and millisecond UTC spellings sort by actual successful or failed time',
  /** Exercises independent actual UTC ordering without modifying stored source timestamps.
   * @param failed Whether the same required ordering concerns known failed attempts.
   * @returns Completion after actual oldest-first source ID assertions.
   * @remarks Updates only coherent isolated fixture descriptors/times and current inventory scope.
   */
  function mixedPrecision(failed): void {
    const value = model(); const older = acceptedSitting(sittingIdentity('26241', '2000-01-01'), '2026-10-10T03:01:00Z');
    value.catalogue.sittings[0] = older.sitting; const newer = selected(value.catalogue, '1003');
    newer.record.acquiredAt = '2026-10-10T03:01:00.999Z'; newer.record.lastAttemptAt = newer.record.acquiredAt;
    if (failed) { older.sitting.record.lastAttemptOutcome = 'failed'; newer.record.lastAttemptOutcome = 'failed'; }
    value.catalogue.preparedAt = iso(start); coverage(value.catalogue); value.latest = [sittingIdentity('1001', selected(value.catalogue, '1001').date)];
    const plan = planRefresh(validateCatalogue(value.catalogue), value.latest, start, [iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), iso(start - 1000), null]);
    const actual: string[] = []; for (const id of plan.sittingIds) if (id === '26241' || id === '1003') actual.push(id);
    expect(actual).toEqual(['26241', '1003']);
  });

test('REF-CONTEXT-RESUME-NEW: a genuinely new latest inventory identity is attempted before older pending work on resume',
  /** Exercises fresh inventory reconciliation during an actual capped same-session resume.
   * @returns Completion after actual new-target acquisition, accepted metadata and truthful report assertions.
   * @remarks Adds one coherent controlled source inventory identity after the earlier partial was captured.
   */
  async function newOnResume(): Promise<void> {
    const { value } = await interruptedLedger(); value.latest.push(sittingIdentity('9999', '2026-10-10'));
    const run = await acquire(options(value)); expect(requested(value)[0]).toBe('9999');
    expect(selected(run.catalogue, '9999').record).toMatchObject({ availability: 'available', lastAttemptOutcome: 'success' });
    expect(await report(value)).toMatchObject({ targetIds: expect.arrayContaining(['9999']), completedIds: expect.arrayContaining(['9999']), failedIds: [], pendingIds: [] });
  });
