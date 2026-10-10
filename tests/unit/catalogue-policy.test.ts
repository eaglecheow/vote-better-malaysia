import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { loadPublishedCatalogue } from '../../src/source.ts';
import { stageSnapshot, validateSizes } from '../../scripts/acquire.ts';
import { publishedFixture } from '../fixtures/static.ts';

/** Requires the measured complete-source catalogue to satisfy the approved byte budget.
 * @returns Nothing after the exact observed sizes are accepted.
 * @remarks Uses recorded measurements, not a claim of a successful live staging operation.
 */
function acceptsMeasuredArchive(): void {
  expect(validateSizes({ catalogue: { compressedBytes: 519418, decodedBytes: 3431888 },
    sittings: [{ compressedBytes: 295108, decodedBytes: 1745574 }], totalBytes: 357744140 })).toBe(true);
}
test('POLICY-SIZES: measured complete archive fits the approved 1 MiB catalogue budget', acceptsMeasuredArchive);

/** Builds a valid controlled catalogue whose actual gzip exceeds the retired ceiling.
 * @returns Coherent fixture and its larger actual encoded catalogue.
 * @remarks Enlarges only explicit synthetic historical metadata; source words and attribution stay unchanged.
 */
function largerCatalogue() {
  const fixture = publishedFixture();
  fixture.catalogue.members[0].historicalContext = randomBytes(600000).toString('base64');
  const stored = gzipSync(Buffer.from(JSON.stringify(fixture.catalogue)), { level: 9 });
  expect(stored.length).toBeGreaterThan(204800);
  expect(stored.length).toBeLessThanOrEqual(1048576);
  return { ...fixture, stored };
}

/** Requires browser retrieval to preserve a valid catalogue between the old and approved caps.
 * @returns Completion after the actual streaming gzip is decoded and validated.
 * @throws Propagates unexpected retrieval or fixture failures.
 */
async function retrievesLargerCatalogue(): Promise<void> {
  const fixture = largerCatalogue();
  /** Supplies the complete controlled gzip response. @returns Successful native streaming response. */
  async function fetchCatalogue(): Promise<Response> { return new Response(new Uint8Array(fixture.stored).buffer); }
  expect(await loadPublishedCatalogue({ baseUrl: 'https://example.test/vote-better-malaysia/', fetch: fetchCatalogue })).toEqual(fixture.catalogue);
}
test('POLICY-RETRIEVE: valid complete catalogue above 200 KiB remains intact through native gzip retrieval', retrievesLargerCatalogue);

/** Requires actual local staging to commit every byte of a larger valid catalogue and its shard.
 * @returns Completion after checking actual output and successful private checkpoint.
 * @throws Propagates unexpected native I/O or staging validation failures.
 * @remarks Writes only an isolated temporary development snapshot and removes it afterwards.
 */
async function stagesLargerCatalogue(): Promise<void> {
  const fixture = largerCatalogue(); const root = await mkdtemp(join(tmpdir(), 'hansard-policy-'));
  try {
    const result = await stageSnapshot(fixture.catalogue, new Map([['26241', fixture.recordGzip]]), {
      state: join(root, 'state'), out: join(root, 'public'), mode: 'bootstrap',
      repository: 'eaglecheow/vote-better-malaysia', branch: 'controlled-policy',
      codeFingerprint: 'a'.repeat(64), workflowContext: false,
    });
    expect(result.sizes.catalogue.compressedBytes).toBe(fixture.stored.length);
    expect(JSON.parse(gunzipSync(await readFile(join(root, 'public/catalogue.json.gz'))).toString('utf8'))).toEqual(fixture.catalogue);
    expect(await readFile(join(root, 'public/sittings/26241.json.gz'))).toEqual(Buffer.from(fixture.recordGzip));
    expect(JSON.parse(await readFile(join(root, 'state/checkpoint.json'), 'utf8'))).toMatchObject({ success: true, publicationEligible: false, catalogue: fixture.catalogue });
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('POLICY-STAGE: native staging commits complete larger catalogue, shard and local checkpoint together', stagesLargerCatalogue);
