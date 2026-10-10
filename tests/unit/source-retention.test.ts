import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { buildTranscriptResult, sourceAccounting, validateCatalogue, validateSittingRecord, type Catalogue, type Sitting, type SittingRecord, type TranscriptResult } from '../../src/source.ts';
import { readerFixture } from '../fixtures/reader.ts';

interface RetentionFixture { oldCatalogue: Catalogue; current: Catalogue; retained: SittingRecord; fresh: SittingRecord }

/**
 * Updates controlled accepted descriptor bytes and complete accounting for one exact shard.
 * @param sitting Owning controlled descriptor.
 * @param record Complete corresponding controlled normalized shard.
 * @returns Nothing after setting exact byte/hash/count fields.
 * @remarks Mutates only this test's descriptor; no source response or production state is changed.
 */
function descriptor(sitting: Sitting, record: SittingRecord): void {
  const decoded = Buffer.from(JSON.stringify(record));
  sitting.record.digest = createHash('sha256').update(decoded).digest('hex');
  sitting.record.decodedBytes = decoded.length; sitting.record.compressedBytes = gzipSync(decoded, { level: 9 }).length;
  sitting.record.accounting = sourceAccounting(record.items);
}

/**
 * Prepares accepted historical ambiguity followed by a newly supplied identity used in another record.
 * @returns Old accepted context, current context, unchanged retained shard and newly acquired shard.
 * @throws Propagates genuine controlled fixture or independent catalogue/shard validation errors.
 * @remarks Changes only freshly allocated synthetic metadata; this case is not an observed live-source change.
 */
function fixture(): RetentionFixture {
  const value = readerFixture(); const retained = value.record!;
  retained.items[0].sourceAuthorId = '999999'; retained.items[0].gapReason = 'unknown-id';
  descriptor(value.catalogue.sittings[0], retained);
  const oldCatalogue = validateCatalogue(value.catalogue);
  validateSittingRecord(retained, oldCatalogue.sittings[0], oldCatalogue);
  const current = structuredClone(oldCatalogue);
  current.members.push({ id: '999999', name: 'Controlled newly supplied exact source identity', historicalContext: null, listedInLatestSource: true });
  current.sittings[0].record.availability = 'retained'; current.sittings[0].record.lastAttemptOutcome = 'failed'; current.sittings[0].record.lastAttemptAt = '2026-10-10T03:50:00.000Z';
  const sitting = current.sittings[1];
  const fresh: SittingRecord = { schemaVersion: 1, sittingId: sitting.id, identity: { date: sitting.date, parliament: sitting.parliament, penggal: sitting.penggal, mesyuarat: sitting.mesyuarat, house: sitting.house, filename: sitting.filename, isFinal: sitting.isFinal }, sourceUrl: sitting.sourceUrl, items: [
    { ordinal: 0, sourceIndex: 0, sectionPath: ['Controlled newly acquired contribution'], text: 'Controlled exact-ID speech in a different record.', rawAuthor: null, sourceAuthorId: '999999', memberId: '999999', attribution: 'assigned', timestamp: null, gapReason: null },
  ] };
  sitting.record = { availability: 'available', path: `data/sittings/${sitting.id}.json.gz`, digest: 'a'.repeat(64), compressedBytes: 1, decodedBytes: 1, acquiredAt: '2026-10-10T03:15:00.000Z', lastAttemptAt: '2026-10-10T03:15:00.000Z', lastAttemptOutcome: 'success', sourceBuildId: 'controlled-new-build', rawSourceDigest: 'f'.repeat(64), sourcePublishedAt: null, sourceRevisedAt: null, accounting: sourceAccounting(fresh.items) };
  descriptor(sitting, fresh); current.coverage.unavailableSittingCount = 0; current.status.acquisitionOutcome = 'degraded';
  validateCatalogue(current); validateSittingRecord(fresh, sitting, current);
  return { oldCatalogue, current, retained, fresh };
}

/**
 * Requires an unchanged accepted historical gap to survive current exact-ID reconciliation.
 * @returns Nothing after accepted-record and immutable payload assertions.
 */
function preservesRetainedUnknown(): void {
  const value = fixture(); const before = structuredClone(value.retained); let accepted: SittingRecord | null = null; let error: string | null = null;
  try { accepted = validateSittingRecord(value.retained, value.current.sittings[0], value.current); }
  catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
  expect({ accepted: accepted !== null, exactAcceptedContent: JSON.stringify(accepted) === JSON.stringify(value.retained), error }).toEqual({ accepted: true, exactAcceptedContent: true, error: null });
  expect(value.retained).toEqual(before);
  expect(value.current.sittings[0].record.digest).toBe(value.oldCatalogue.sittings[0].record.digest);
  expect(value.current.sittings[0].record.acquiredAt).toBe(value.oldCatalogue.sittings[0].record.acquiredAt);
}
test('RETENTION-IDENTITY: newly supplied identity does not invalidate an unchanged accepted unknown-ID gap after source failure', preservesRetainedUnknown);

/**
 * Requires old unresolved text to remain a gap even when the same ID now has a separate accepted contribution.
 * @returns Nothing after conservative outcome, original words/order and no reassignment assertions.
 */
function retainsAmbiguousResult(): void {
  const value = fixture(); let result: TranscriptResult | null = null; let error: string | null = null;
  try { result = buildTranscriptResult(value.current, '999999', value.current.sittings[0].id, value.retained, null); }
  catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
  const gaps = [value.retained.items[0], value.retained.items[1]];
  expect({ error, outcome: result?.outcome ?? null, turns: result?.turns ?? null, exactOrderedGaps: JSON.stringify(result?.gaps) === JSON.stringify(gaps) }).toEqual({ error: null, outcome: 'incomplete', turns: [], exactOrderedGaps: true });
  expect(result?.sitting.record.acquiredAt).toBe(value.oldCatalogue.sittings[0].record.acquiredAt);
  expect(buildTranscriptResult(value.current, '999999', value.current.sittings[1].id, value.fresh, null).outcome).toBe('ready');
}
test('RETENTION-RESULT: late reconciliation never guesses assignment of the unchanged retained passage or claims verified absence', retainsAmbiguousResult);

/**
 * Keeps the existing strict current-record rule when a known source ID is incorrectly marked unknown.
 * @returns Nothing after the already-GREEN invalid-fresh-shard rejection control.
 * @remarks Changes only the fixture's availability/attempt status to represent fresh accepted data.
 */
function rejectsFreshKnownUnknown(): void {
  const value = fixture(); value.current.sittings[0].record.availability = 'available'; value.current.sittings[0].record.lastAttemptOutcome = 'success';
  expect(validateSittingRecord.bind(null, value.retained, value.current.sittings[0], value.current)).toThrow('unreconciled source ID');
}
test('RETENTION-CONTROL: a current available record cannot call an already reconciled source ID unknown', rejectsFreshKnownUnknown);
