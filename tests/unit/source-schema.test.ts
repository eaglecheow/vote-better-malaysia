import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSourceInventory, parseSourceMembers, sourceId, validateCatalogue } from '../../src/source.ts';
import { catalogueFixture } from '../fixtures/catalogue.ts';

it.each(['completedAt', 'acquiredAt', 'lastAttemptAt'])('SCHEMA-KNOWN-AT-PREPARATION rejects future %s metadata',
  /**
   * Checks prepared snapshots cannot assert acquisition or pipeline events that have not occurred yet.
   * @param field Snapshot-known timestamp field to place after preparation.
   * @returns Nothing; checks required future-event rejection.
   */
  (field) => {
    const fixture = catalogueFixture();
    const future = '2026-10-10T05:00:00.000Z';
    if (field === 'completedAt') fixture.status.completedAt = future;
    else if (field === 'acquiredAt') {
      fixture.sittings[0].record.acquiredAt = future;
      fixture.sittings[0].record.lastAttemptAt = future;
    } else fixture.sittings[0].record.lastAttemptAt = future;
    expect(
      /**
       * Attempts validation with event metadata later than snapshot preparation.
       * @returns The tested catalogue if incorrectly accepted.
       * @throws Propagates the required future-event validation rejection.
       */
      () => validateCatalogue(fixture),
    ).toThrow();
  });

const samples = JSON.parse(readFileSync(new URL('../fixtures/source-samples.json', import.meta.url), 'utf8'));

/**
 * Replaces a nested controlled field without changing the original fixture.
 * @param path Dot-separated fixture field path.
 * @param value Replacement invalid or boundary value.
 * @returns Fresh modified controlled catalogue.
 * @remarks Mutates only the newly created fixture.
 */
function changed(path: string, value: unknown): unknown {
  const fixture = catalogueFixture() as unknown as Record<string, unknown>;
  const parts = path.split('.');
  let current = fixture;
  for (const part of parts.slice(0, -1)) current = current[part] as Record<string, unknown>;
  current[parts.at(-1)!] = value;
  return fixture;
}

/**
 * Wraps selected raw excerpts in the official source page-data shape.
 * @param archive Optional replacement archive for malformed source tests.
 * @returns An official-shaped catalogue response with partial controlled coverage.
 */
function rawInventory(archive: unknown = samples.archive): unknown {
  return { pageProps: { archive } };
}

/** Runs schema gates against source-derived excerpts and clearly controlled metadata. */
describe('source schema and exact identity', /**
 * Registers source-schema cases without implementing reader behavior.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
  /** Confirms canonical source IDs preserve safe integer and decimal-string identities. */
  it.each([1, 1839, Number.MAX_SAFE_INTEGER, '1', '1839', '9007199254740993'])('SCHEMA-ID accepts lossless positive ID %s', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param value Controlled case value supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(value) => {
    expect(sourceId(value)).toBe(String(value));
  });

  /** Rejects coercion, ambiguous spelling and already-rounded numeric source identities. */
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '', '0', '01', '+1', '1.0', '1e3', ' 1', '1 ', null, undefined, true, {}])('SCHEMA-ID rejects ambiguous ID %s', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param value Controlled case value supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(value) => {
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => sourceId(value)).toThrow();
  });

  /** Verifies all constrained values and explicit unavailable metadata survive acceptance. */
  it('SCHEMA-CATALOGUE accepts a coherent source-derived Mesyuarat 0 identity with null historical/official metadata', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Ensures equal names never merge separately reconciled IDs and strings remain unchanged. */
  it('SCHEMA-MEMBER preserves similar names, exact strings and supplied historical context', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.members[0].name = '  Tuan Lim Guan Eng [Bagan]  ';
    fixture.members[0].historicalContext = 'Source-supplied historical detail';
    fixture.members.push({ id: '2', name: '  Tuan Lim Guan Eng [Bagan]  ', historicalContext: null, listedInLatestSource: false });
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Prevents unknown fields or invalid values from entering constrained published entities. */
  it.each([
    ['schemaVersion', 2], ['snapshotId', ''], ['snapshotId', null],
    ['preparedAt', '2026-10-10'], ['preparedAt', '2026-02-30T04:00:00.000Z'], ['preparedAt', '2026-10-10T04:00:00+00:00'],
    ['publishedAt', 'not-a-time'], ['publishedAt', undefined],
    ['provenance.interface', 'third-party'], ['provenance.sourceBuildId', '../build'],
    ['provenance.inventoryAcquiredAt', '2026-10-10T05:00:00.000Z'],
    ['provenance.membersAcquiredAt', '2026-10-10T05:00:00.000Z'],
    ['provenance.inventoryRawDigest', 'a'.repeat(63)], ['provenance.membersRawDigest', 'B'.repeat(64)],
    ['coverage.parliaments', [13, 13]], ['coverage.parliaments', [14]],
    ['coverage.startDate', '2014-07-22'], ['coverage.endDate', '2014-07-24'],
    ['coverage.latestInventoryCount', 0], ['coverage.retainedSittingCount', 1],
    ['coverage.unavailableSittingCount', 1], ['coverage.attributionGapCount', 1],
    ['status.acquisitionOutcome', 'unknown'], ['status.stagingOutcome', 'failed'],
    ['status.workflowUrl', 'javascript:alert(1)'], ['status.completedAt', 'yesterday'],
    ['status.lastConfirmedDeployment', {}],
    ['members.0.id', '01'], ['members.0.name', null], ['members.0.name', '   '],
    ['members.0.historicalContext', undefined], ['members.0.historicalContext', {}],
    ['members.0.listedInLatestSource', 1], ['members.0.birth_year', 1960],
    ['sittings.0.id', '0'], ['sittings.0.date', '2014-02-30'],
    ['sittings.0.parliament', 0], ['sittings.0.parliament', 1.5],
    ['sittings.0.penggal', 0], ['sittings.0.mesyuarat', -1],
    ['sittings.0.house', 'dewan-negara'], ['sittings.0.filename', 'dr_2014-07-24'],
    ['sittings.0.sourceUrl', 'https://evil.example/hansard/dewan-rakyat/2014-07-23'],
    ['sittings.0.sourceUrl', 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2014-07-24'],
    ['sittings.0.isFinal', 'final'], ['sittings.0.listedInLatestInventory', undefined],
    ['sittings.0.record.availability', 'partial'], ['sittings.0.record.availability', ['available']], ['sittings.0.record.path', 'data/sittings/2.json.gz'],
    ['sittings.0.record.path', '../data/sittings/26241.json.gz'], ['sittings.0.record.digest', 'bad'],
    ['sittings.0.record.compressedBytes', 524289], ['sittings.0.record.compressedBytes', 0],
    ['sittings.0.record.decodedBytes', 5242881], ['sittings.0.record.decodedBytes', -1],
    ['sittings.0.record.acquiredAt', undefined], ['sittings.0.record.lastAttemptAt', '2026-10-10T03:00:00.000Z'],
    ['sittings.0.record.lastAttemptOutcome', 'unknown'], ['sittings.0.record.sourceBuildId', null],
    ['sittings.0.record.rawSourceDigest', undefined], ['sittings.0.record.sourcePublishedAt', 'unknown'],
    ['sittings.0.record.sourceRevisedAt', undefined], ['sittings.0.record.accounting', null],
    ['sittings.0.record.accounting.total', 3], ['sittings.0.record.accounting.assigned', 1.5],
    ['sittings.0.record.accounting.unassigned', -1], ['sittings.0.record.accounting.annotations', -1],
  ])('SCHEMA-REJECT rejects constrained field %s = %j', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param path Controlled case path supplied by the test table.
 * @param value Controlled case value supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(path, value) => {
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(changed(path as string, value))).toThrow();
  });

  /** Covers missing explicit metadata without treating omitted nulls as a valid success. */
  it.each(['provenance', 'coverage', 'status', 'members', 'sittings'])('SCHEMA-REQUIRED rejects absent %s', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param field Controlled case field supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(field) => {
    const fixture = catalogueFixture() as unknown as Record<string, unknown>;
    delete fixture[field];
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Rejects duplicate IDs even when the duplicated records happen to be identical. */
  it.each(['members', 'sittings'] as const)('SCHEMA-UNIQUE rejects duplicate %s identities', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param field Controlled case field supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(field) => {
    const fixture = catalogueFixture();
    fixture[field].push(structuredClone(fixture[field][0]) as never);
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Conflicting identities cannot change an already accepted input through validation. */
  it('SCHEMA-CONFLICT rejects a conflicting member replacement without mutating the old catalogue', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const accepted = catalogueFixture();
    const before = structuredClone(accepted);
    const replacement = structuredClone(accepted);
    replacement.members.push({ ...replacement.members[0], name: 'Another person' });
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(replacement)).toThrow();
    expect(accepted).toEqual(before);
  });

  /** A retained record keeps accepted hashes/times and reports failed acquisition separately. */
  it('SCHEMA-RETAINED preserves an omitted sitting, old identity and accepted descriptor on a dated failure', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.sittings[0].listedInLatestInventory = false;
    fixture.sittings[0].record.availability = 'retained';
    fixture.sittings[0].record.lastAttemptOutcome = 'failed';
    fixture.sittings[0].record.lastAttemptAt = '2026-10-10T03:30:00.000Z';
    fixture.status.acquisitionOutcome = 'degraded';
    fixture.coverage.latestInventoryCount = 0;
    fixture.coverage.retainedSittingCount = 1;
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** A newly inaccessible sitting remains selectable with every accepted-payload field null. */
  it('SCHEMA-UNAVAILABLE accepts explicit unavailable metadata without invented successful times', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.sittings[0].isFinal = null;
    fixture.sittings[0].record = { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: '2026-10-10T03:01:00.000Z', lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
    fixture.coverage.unavailableSittingCount = 1;
    fixture.status.acquisitionOutcome = 'degraded';
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Prevents unavailable descriptors from carrying accepted data or successful attempt labels. */
  it.each(['path', 'digest', 'compressedBytes', 'decodedBytes', 'acquiredAt', 'sourceBuildId', 'rawSourceDigest', 'accounting'])('SCHEMA-UNAVAILABLE rejects payload field %s on unavailable records', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param field Controlled case field supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(field) => {
    const fixture = catalogueFixture();
    const descriptor = fixture.sittings[0].record as unknown as Record<string, unknown>;
    const original = descriptor[field];
    fixture.sittings[0].record.availability = 'unavailable';
    fixture.sittings[0].record.lastAttemptOutcome = 'failed';
    for (const key of ['path', 'digest', 'compressedBytes', 'decodedBytes', 'acquiredAt', 'sourceBuildId', 'rawSourceDigest', 'accounting']) descriptor[key] = null;
    descriptor[field] = original;
    fixture.coverage.unavailableSittingCount = 1;
    fixture.status.acquisitionOutcome = 'degraded';
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Confirms numeric size boundaries are inclusive and accounting includes annotation/gap leaves. */
  it('SCHEMA-SIZES accepts descriptor limits and exhaustive source accounting', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.sittings[0].record.compressedBytes = 524288;
    fixture.sittings[0].record.decodedBytes = 5242880;
    fixture.sittings[0].record.accounting = { total: 3, assigned: 1, unassigned: 1, annotations: 1 };
    fixture.coverage.attributionGapCount = 1;
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Only a matching confirmed receipt can support the published time for this snapshot. */
  it('SCHEMA-PUBLICATION accepts matching confirmed deployment times distinct from preparation', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.publishedAt = '2026-10-10T04:10:00.000Z';
    fixture.status.workflowUrl = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123';
    fixture.status.lastConfirmedDeployment = { snapshotId: fixture.snapshotId, deploymentId: 'deployment-1', publishedAt: fixture.publishedAt, verifiedServedAt: '2026-10-10T04:11:00.000Z', workflowUrl: fixture.status.workflowUrl };
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Preparation, HTTP time or a receipt for another snapshot cannot populate publication. */
  it.each(['missing', 'wrong-snapshot', 'wrong-time', 'unverified-served', 'before-preparation'])('SCHEMA-PUBLICATION rejects %s publication evidence', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param mode Controlled case mode supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(mode) => {
    const fixture = catalogueFixture();
    fixture.publishedAt = '2026-10-10T04:10:00.000Z';
    if (mode !== 'missing') fixture.status.lastConfirmedDeployment = { snapshotId: mode === 'wrong-snapshot' ? 'another-snapshot' : fixture.snapshotId, deploymentId: 'deployment-1', publishedAt: mode === 'wrong-time' ? '2026-10-10T04:09:00.000Z' : fixture.publishedAt, verifiedServedAt: mode === 'unverified-served' ? '2026-10-10T04:09:00.000Z' : '2026-10-10T04:11:00.000Z', workflowUrl: 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123' };
    if (mode === 'before-preparation') fixture.preparedAt = '2026-10-10T04:20:00.000Z';
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Official dates remain optional source metadata and do not replace acquisition timestamps. */
  it('SCHEMA-TIMES preserves independently supplied official dates and current attempt metadata', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    fixture.sittings[0].record.sourcePublishedAt = '2014-07-24T04:00:00Z';
    fixture.sittings[0].record.sourceRevisedAt = '2014-07-25T04:00:00.000Z';
    expect(validateCatalogue(fixture)).toEqual(fixture);
  });

  /** Rejects each malformed confirmed-receipt field independently of the surrounding snapshot. */
  it.each([
    ['snapshotId', ''], ['deploymentId', ''], ['publishedAt', 'unknown'],
    ['verifiedServedAt', undefined], ['workflowUrl', 'https://evil.example/actions/runs/123'],
  ])('SCHEMA-RECEIPT rejects malformed %s = %j', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param field Controlled case field supplied by the test table.
 * @param value Controlled case value supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(field, value) => {
    const fixture = catalogueFixture();
    const receipt: Record<string, unknown> = { snapshotId: 'prior-snapshot', deploymentId: 'deployment-1', publishedAt: '2026-10-09T04:10:00.000Z', verifiedServedAt: '2026-10-09T04:11:00.000Z', workflowUrl: 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/123' };
    receipt[field] = value;
    fixture.status.lastConfirmedDeployment = receipt as unknown as NonNullable<typeof fixture.status.lastConfirmedDeployment>;
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Full source member entries are projected to source IDs/names without demographic publication. */
  it('SCHEMA-RAW-MEMBERS preserves sampled exact identities and leaves context null', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const expected = samples.members.map(/** Projects source excerpts to the constrained published identity shape. @param member Raw fixture speaker. @returns Expected source identity. */ (member: { new_author_id: number; name: string }) => ({ id: String(member.new_author_id), name: member.name, historicalContext: null, listedInLatestSource: true }));
    expect(parseSourceMembers({ pageProps: { speakers: samples.members } })).toEqual(expected);
  });

  /** Source-supplied historical context remains supplied data, with names and IDs independent. */
  it('SCHEMA-RAW-MEMBERS preserves explicitly supplied context and similar names without merging', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    expect(parseSourceMembers({ pageProps: { speakers: [{ new_author_id: 1, name: 'Same name', historicalContext: 'Explicit source detail' }, { new_author_id: 2, name: 'Same name' }] } })).toEqual([
      { id: '1', name: 'Same name', historicalContext: 'Explicit source detail', listedInLatestSource: true },
      { id: '2', name: 'Same name', historicalContext: null, listedInLatestSource: true },
    ]);
  });

  /** Raw integer identity and schema errors reject rather than becoming an empty valid member list. */
  it.each([
    {}, { pageProps: {} }, { pageProps: { speakers: [] } },
    { pageProps: { speakers: [{ new_author_id: '1839', name: 'LIM GUAN ENG' }] } },
    { pageProps: { speakers: [{ new_author_id: 0, name: 'LIM GUAN ENG' }] } },
    { pageProps: { speakers: [{ new_author_id: Number.MAX_SAFE_INTEGER + 1, name: 'Name' }] } },
    { pageProps: { speakers: [{ new_author_id: 1, name: null }] } },
    { pageProps: { speakers: [{ new_author_id: 1, name: 'Name', historicalContext: {} }] } },
    { pageProps: { speakers: [{ new_author_id: 1, name: 'Name' }, { new_author_id: 1, name: 'Other' }] } },
  ])('SCHEMA-RAW-MEMBERS rejects malformed replacement %j', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param payload Controlled case payload supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(payload) => {
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceMembers(payload)).toThrow();
  });

  /** Reconciles every selected sitting, including all 16 source Mesyuarat 0 entries. */
  it('SCHEMA-RAW-INVENTORY recursively preserves complete selected inventory and exact source hierarchy', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const actual = parseSourceInventory(rawInventory());
    expect(actual).toHaveLength(18);
    expect(actual).toContainEqual({ id: '26241', date: '2014-07-23', parliament: 13, penggal: 2, mesyuarat: 0, house: 'dewan-rakyat', filename: 'dr_2014-07-23', sourceUrl: 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2014-07-23', isFinal: true });
    expect(actual.filter(/** Selects explicitly supplied zero-meeting sittings. @param sitting Parsed sitting. @returns Whether its source meeting is zero. */ (sitting) => sitting.mesyuarat === 0)).toHaveLength(16);
  });

  /** An invalid raw shape or unknown hierarchy field cannot be silently dropped. */
  it.each([{}, { unexpected: [] }, { '0': {} }, { '13': { start_date: 'bad-date', end_date: '2014-07-23', '2': {} } }])('SCHEMA-RAW-INVENTORY rejects malformed hierarchy %j', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param archive Controlled case archive supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(archive) => {
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceInventory(rawInventory(archive))).toThrow();
  });

  /** Ensures malformed sitting fields and conflicting IDs reject the whole source replacement. */
  it.each([
    ['sitting_id', '26241'], ['sitting_id', 0], ['date', '2014-02-30'],
    ['filename', '../dr_2014-07-23'], ['is_final', 'true'],
  ])('SCHEMA-RAW-INVENTORY rejects source sitting %s = %j', /**
 * Checks the named source-schema case against isolated controlled input.
 * @param field Controlled case field supplied by the test table.
 * @param value Controlled case value supplied by the test table.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
(field, value) => {
    const archive = structuredClone(samples.archive);
    archive['13']['2']['0'].sitting_list[0][field] = value;
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceInventory(rawInventory(archive))).toThrow();
  });

  /** Duplicate source entries cannot disappear through deduplication or rename merging. */
  it('SCHEMA-RAW-INVENTORY rejects duplicate sitting identity across catalogue hierarchy', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const archive = structuredClone(samples.archive);
    archive['13']['2']['0'].sitting_list.push(structuredClone(archive['13']['2']['0'].sitting_list[0]));
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceInventory(rawInventory(archive))).toThrow();
  });

  /** A second sitting ID cannot claim the same dated source filename. */
  it('SCHEMA-RAW-INVENTORY rejects conflicting IDs for one dated record', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const archive = structuredClone(samples.archive);
    archive['13']['2']['0'].sitting_list.push({ ...archive['13']['2']['0'].sitting_list[0], sitting_id: 26242 });
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceInventory(rawInventory(archive))).toThrow();
  });

  /** Published source identities remain unique by dated record as well as sitting ID. */
  it('SCHEMA-CONFLICT rejects separate sitting IDs claiming the same source record', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const fixture = catalogueFixture();
    const extra = structuredClone(fixture.sittings[0]);
    extra.id = '2';
    extra.record.path = 'data/sittings/2.json.gz';
    fixture.sittings.push(extra);
    fixture.coverage.latestInventoryCount = 2;
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => validateCatalogue(fixture)).toThrow();
  });

  /** Genuinely omitted source draft/final metadata stays null rather than being guessed. */
  it('SCHEMA-RAW-INVENTORY keeps absent source status null', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const archive = structuredClone(samples.archive);
    delete archive['13']['2']['0'].sitting_list[0].is_final;
    const result = parseSourceInventory(rawInventory(archive));
    expect(result.find(/** Finds the known zero-meeting source identity. @param sitting Candidate sitting. @returns Whether its ID matches. */ (sitting) => sitting.id === '26241')?.isFinal).toBeNull();
  });

  /** Unknown root fields cannot hide unvalidated sitting-like content as date metadata. */
  it('SCHEMA-RAW-INVENTORY rejects unsupported root date metadata rather than silently discarding it', /**
 * Checks the named source-schema case against isolated controlled input.
 * @returns Nothing; performs or registers assertions.
 * @remarks Uses isolated fixtures; any fixture mutations affect only this test.
 */
() => {
    const archive = structuredClone(samples.archive);
    archive.start_date = [{ sitting_id: 999, date: '2014-07-23' }];
    expect(/**
 * Calls the source boundary so its rejection can be asserted.
 * @returns The boundary result; validation exceptions propagate to the assertion.
 * @throws When the source boundary rejects the controlled invalid value.
 */
() => parseSourceInventory(rawInventory(archive))).toThrow();
  });
});
