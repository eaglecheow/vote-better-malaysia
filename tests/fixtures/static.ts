import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { normalizeSourceRecord, parseSourceMembers, type Catalogue, type SittingRecord } from '../../src/source.ts';
import { catalogueFixture } from './catalogue.ts';

/** Creates coherent controlled transport metadata around the two saved official 2014 leaves.
 * @returns Fresh catalogue, exact normalized record bytes, and gzip representations.
 * @throws Propagates fixture read or previously verified normalization failures.
 */
export function publishedFixture(): { catalogue: Catalogue; record: SittingRecord; catalogueBytes: Uint8Array; catalogueGzip: Uint8Array; recordBytes: Uint8Array; recordGzip: Uint8Array } {
  const sample = JSON.parse(readFileSync(resolve('tests/fixtures/source-samples.json'), 'utf8'));
  const catalogue = catalogueFixture();
  catalogue.members = parseSourceMembers({ pageProps: { speakers: sample.members } });
  const sitting = catalogue.sittings[0];
  const record = normalizeSourceRecord(sample.records['2014-07-23'], sitting, catalogue);
  const recordBytes = new TextEncoder().encode(JSON.stringify(record));
  const recordGzip = gzipSync(recordBytes);
  sitting.record.digest = createHash('sha256').update(recordBytes).digest('hex');
  sitting.record.decodedBytes = recordBytes.length;
  sitting.record.compressedBytes = recordGzip.length;
  const catalogueBytes = new TextEncoder().encode(JSON.stringify(catalogue));
  return { catalogue, record, catalogueBytes, catalogueGzip: gzipSync(catalogueBytes), recordBytes, recordGzip };
}
