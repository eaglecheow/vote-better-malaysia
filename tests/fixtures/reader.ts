import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { buildTranscriptResult, normalizeSourceRecord, parseSourceMembers, sourceAccounting, type Catalogue, type SittingRecord, type TranscriptResult } from '../../src/source.ts';
import { catalogueFixture } from './catalogue.ts';

/** Controlled reader fixture; source excerpts do not establish full-sitting or real-source absence. */
export interface ReaderFixture { catalogue: Catalogue; record: SittingRecord | null; result: TranscriptResult; catalogueGzip: Uint8Array; recordGzip: Uint8Array | null }

/**
 * Prepares exact source-derived text around controlled reader metadata and optional synthetic cases.
 * @param mode Default gaps preserves all six supplied recent leaves; other modes are explicit synthetic test branches.
 * @returns Fresh coherent catalogue, matching record/result, and native gzip fixture bytes.
 * @throws Propagates fixture parsing or shared normalization/validation failure.
 */
export function readerFixture(mode: 'gaps' | 'ready' | 'absence' | 'unavailable' | 'untrusted' = 'gaps'): ReaderFixture {
  const samples = JSON.parse(readFileSync(resolve('tests/fixtures/source-samples.json'), 'utf8'));
  const catalogue = catalogueFixture();
  catalogue.snapshotId = `controlled-reader-${mode}`;
  catalogue.members = parseSourceMembers({ pageProps: { speakers: samples.members } });
  catalogue.members.push({ id: '1', name: 'LIM GUAN ENG', historicalContext: 'Explicit historical source context', listedInLatestSource: false });
  const unavailable = structuredClone(catalogue.sittings[0]);
  unavailable.record = { ...unavailable.record, availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, sourceBuildId: null, rawSourceDigest: null, accounting: null, lastAttemptOutcome: 'failed' };
  const sitting = catalogue.sittings[0];
  sitting.id = '29326'; sitting.date = '2026-02-10'; sitting.parliament = 15; sitting.penggal = 5; sitting.mesyuarat = 1;
  sitting.filename = 'dr_2026-02-10'; sitting.sourceUrl = 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10'; sitting.isFinal = false;
  sitting.record.path = 'data/sittings/29326.json.gz';
  sitting.record.accounting = { total: 6, assigned: 3, unassigned: 2, annotations: 1 };
  catalogue.sittings.push(unavailable);
  catalogue.coverage = { parliaments: [13, 15], startDate: '2014-07-23', endDate: '2026-02-10', latestInventoryCount: 2, retainedSittingCount: 0, unavailableSittingCount: 1, attributionGapCount: 2 };
  const raw = structuredClone(samples.records['2026-02-10']);
  if (mode === 'ready' || mode === 'absence') raw.speeches = [raw.speeches[1]['WAKTU PERTANYAAN-PERTANYAAN MENTERI'][1], raw.speeches[2]['PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN'][0]];
  if (mode === 'untrusted') raw.speeches = [{ speech: '<img src=x onerror="window.__injected=true">\n\n**Original text** &amp;', author: '<script>untrusted author</script>', author_id: 1839, index: 7, timestamp: '', is_annotation: false }];
  let record: SittingRecord | null = normalizeSourceRecord(raw, sitting, catalogue);
  sitting.record.accounting = sourceAccounting(record.items);
  catalogue.coverage.attributionGapCount = sitting.record.accounting.unassigned;
  const recordBytes = new TextEncoder().encode(JSON.stringify(record));
  let recordGzip: Uint8Array | null = Uint8Array.from(gzipSync(recordBytes));
  sitting.record.digest = createHash('sha256').update(recordBytes).digest('hex');
  sitting.record.decodedBytes = recordBytes.length; sitting.record.compressedBytes = recordGzip.length;
  if (mode === 'unavailable') {
    sitting.record = { ...unavailable.record }; catalogue.coverage.unavailableSittingCount = 2; catalogue.coverage.attributionGapCount = 0;
    record = null; recordGzip = null;
  }
  const result = buildTranscriptResult(catalogue, mode === 'absence' ? '22462' : '1839', sitting.id, record, mode === 'unavailable' ? null : '2026-10-10T06:00:00.000Z');
  return { catalogue, record, result, catalogueGzip: Uint8Array.from(gzipSync(new TextEncoder().encode(JSON.stringify(catalogue)))), recordGzip };
}
