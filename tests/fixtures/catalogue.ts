import type { Catalogue } from '../../src/source.ts';

/**
 * Creates fresh controlled metadata around a source-derived Mesyuarat 0 identity.
 * @returns A synthetic internally coherent catalogue; counts and digests are test values.
 */
export function catalogueFixture(): Catalogue {
  return {
    schemaVersion: 1,
    snapshotId: 'controlled-snapshot',
    preparedAt: '2026-10-10T04:00:00.000Z',
    publishedAt: null,
    provenance: {
      interface: 'official-next-page-data',
      sourceBuildId: 'source-build',
      inventoryAcquiredAt: '2026-10-10T03:00:00.000Z',
      membersAcquiredAt: '2026-10-10T03:00:01.000Z',
      inventoryRawDigest: 'a'.repeat(64),
      membersRawDigest: 'b'.repeat(64),
    },
    coverage: {
      parliaments: [13],
      startDate: '2014-07-23',
      endDate: '2014-07-23',
      latestInventoryCount: 1,
      retainedSittingCount: 0,
      unavailableSittingCount: 0,
      attributionGapCount: 0,
    },
    status: {
      acquisitionOutcome: 'success',
      stagingOutcome: 'success',
      workflowUrl: null,
      completedAt: '2026-10-10T03:59:00.000Z',
      lastConfirmedDeployment: null,
    },
    members: [
      { id: '1839', name: 'LIM GUAN ENG', historicalContext: null, listedInLatestSource: true },
      { id: '22462', name: 'TEOH CHZE CHONG', historicalContext: null, listedInLatestSource: false },
    ],
    sittings: [{
      id: '26241',
      date: '2014-07-23',
      parliament: 13,
      penggal: 2,
      mesyuarat: 0,
      house: 'dewan-rakyat',
      filename: 'dr_2014-07-23',
      sourceUrl: 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2014-07-23',
      isFinal: true,
      listedInLatestInventory: true,
      record: {
        availability: 'available',
        path: 'data/sittings/26241.json.gz',
        digest: 'c'.repeat(64),
        compressedBytes: 120,
        decodedBytes: 250,
        acquiredAt: '2026-10-10T03:01:00.000Z',
        lastAttemptAt: '2026-10-10T03:01:00.000Z',
        lastAttemptOutcome: 'success',
        sourceBuildId: 'source-build',
        rawSourceDigest: 'd'.repeat(64),
        sourcePublishedAt: null,
        sourceRevisedAt: null,
        accounting: { total: 2, assigned: 2, unassigned: 0, annotations: 0 },
      },
    }],
  };
}
