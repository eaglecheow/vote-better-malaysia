import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  buildTranscriptResult,
  normalizeSourceRecord,
  type Catalogue,
  type Sitting,
  type SittingRecord,
  type SourceItem,
} from '../../src/source.ts';
import { catalogueFixture } from '../fixtures/catalogue.ts';

const samples = JSON.parse(readFileSync(new URL('../fixtures/source-samples.json', import.meta.url), 'utf8')) as {
  records: Record<string, Record<string, unknown>>;
};
const manifest = JSON.parse(readFileSync(new URL('../fixtures/manifest.json', import.meta.url), 'utf8')) as {
  sources: Record<string, { rawSourceDigest: string }>;
};

/**
 * Creates coherent controlled metadata for three source-derived excerpt identities; returns fresh test data.
 * @returns A fresh coherent controlled catalogue.
 */
function makeCatalogue(): Catalogue {
  const catalogue = catalogueFixture();
  catalogue.members = [
    { id: '1839', name: 'LIM GUAN ENG', historicalContext: null, listedInLatestSource: true },
    { id: '2857', name: 'RONALD KIANDEE', historicalContext: null, listedInLatestSource: true },
    { id: '2928', name: 'MAHFUZ BIN HAJI OMAR', historicalContext: null, listedInLatestSource: true },
    { id: '4463', name: 'MOHAMMED TAUFIQ BIN JOHARI', historicalContext: null, listedInLatestSource: true },
    { id: '22462', name: 'TEOH CHZE CHONG', historicalContext: null, listedInLatestSource: false },
    { id: '22547', name: 'MOHD KURNIAWAN NAIM MOKTAR', historicalContext: null, listedInLatestSource: true },
  ];
  const older = catalogue.sittings[0];
  older.record.rawSourceDigest = manifest.sources['record-2014-07-23'].rawSourceDigest;
  const recent: Sitting = {
    ...structuredClone(older), id: '29326', date: '2026-02-10', parliament: 15, penggal: 5,
    mesyuarat: 1, filename: 'dr_2026-02-10', isFinal: false,
    sourceUrl: 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10',
  };
  recent.record.path = 'data/sittings/29326.json.gz';
  recent.record.rawSourceDigest = manifest.sources['record-2026-02-10'].rawSourceDigest;
  recent.record.accounting = { total: 6, assigned: 3, unassigned: 2, annotations: 1 };
  const historical: Sitting = {
    ...structuredClone(older), id: '22942', date: '1959-09-11', parliament: 1, penggal: 1,
    mesyuarat: 1, filename: 'dr_1959-09-11', isFinal: false,
    sourceUrl: 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1959-09-11',
  };
  historical.record.path = 'data/sittings/22942.json.gz';
  historical.record.rawSourceDigest = manifest.sources['record-1959-09-11'].rawSourceDigest;
  historical.record.accounting = { total: 1, assigned: 1, unassigned: 0, annotations: 0 };
  catalogue.sittings = [recent, older, historical];
  catalogue.coverage = {
    parliaments: [1, 13, 15], startDate: '1959-09-11', endDate: '2026-02-10',
    latestInventoryCount: 3, retainedSittingCount: 0, unavailableSittingCount: 0, attributionGapCount: 2,
  };
  return catalogue;
}

/**
 * Returns an independent source-derived record for a supplied date; does not normalize it.
 * @param date Source excerpt date; defaults to the recent fixture.
 * @returns An independent unnormalized source record.
 */
function rawRecord(date = '2026-02-10'): Record<string, unknown> {
  return structuredClone(samples.records[date]);
}

/**
 * Returns a controlled speaking leaf with supplied field overrides; does not infer any identity.
 * @param overrides Source field overrides for the behavior under test.
 * @returns A controlled source leaf with its exact supplied overrides.
 */
function leaf(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    speech: 'Original words.\n\nSecond paragraph.',
    author: 'Tuan Lim Guan Eng [Bagan]',
    author_id: 1839,
    timestamp: 1010,
    is_annotation: false,
    index: 7,
    ...overrides,
  };
}

/**
 * Returns the exact fixture sitting for a date; throws when the controlled fixture is missing.
 * @param catalogue Controlled catalogue containing the expected sitting.
 * @param date Source date to select; defaults to the recent fixture.
 * @returns The matching source-derived controlled sitting.
 * @throws When the controlled fixture does not contain the requested date.
 */
function sitting(catalogue: Catalogue, date = '2026-02-10'): Sitting {
  const found = catalogue.sittings.find(
    /**
 * Finds the known dated identity without deriving it from a display label.
 * @param entry Controlled sitting candidate.
 * @returns Whether this controlled sitting has the requested date.
 */
    (entry) => entry.date === date,
  );
  if (!found) throw new Error(`Missing controlled sitting ${date}`);
  return found;
}

/**
 * Calls normalization with a controlled speeches tree and matching catalogue; returns the tested shard.
 * @param speeches Controlled source tree to pass unchanged to the boundary.
 * @param catalogue Matching controlled identities; defaults to a new fixture.
 * @returns The production normalization result.
 * @throws Propagates production validation errors for invalid source data.
 */
function normalize(speeches: unknown, catalogue = makeCatalogue()): SittingRecord {
  const raw = rawRecord();
  raw.speeches = speeches;
  return normalizeSourceRecord(raw, sitting(catalogue), catalogue);
}

/**
 * Returns a literal normalized-item fixture with supplied overrides; implements no source parsing.
 * @param overrides Normalized fields to override in the literal fixture.
 * @returns A literal independently controlled normalized item.
 */
function item(overrides: Partial<SourceItem> = {}): SourceItem {
  return {
    ordinal: 0,
    sourceIndex: 7,
    sectionPath: [],
    text: 'Original words.\n\nSecond paragraph.',
    rawAuthor: 'Tuan Lim Guan Eng [Bagan]',
    sourceAuthorId: '1839',
    memberId: '1839',
    attribution: 'assigned',
    timestamp: 1010,
    gapReason: null,
    ...overrides,
  };
}

/**
 * Wraps each invalid value as one test parameter, preserving empty arrays; returns parameter rows.
 * @param values Invalid values that each remain one test parameter.
 * @returns Single-argument parameter rows, including empty arrays.
 */
function invalidCases(values: unknown[]): [unknown][] {
  return values.map(
    /**
 * Returns one parameter row so Vitest does not spread an invalid array into callback arguments.
 * @param value One invalid input preserved as a single argument.
 * @returns One argument row containing the original invalid value.
 */
    (value) => [value],
  );
}

/**
 * Builds only controlled normalized shard data from a sitting and items; returns no derived result.
 * @param items Independently controlled normalized source leaves.
 * @param catalogue Controlled catalogue whose descriptor accounting is updated.
 * @param date Source date identifying the controlled shard.
 * @returns A literal controlled shard with matching descriptor accounting.
 * @remarks Updates only the controlled catalogue descriptor counts for these fixture items.
 */
function shard(items: SourceItem[], catalogue = makeCatalogue(), date = '2026-02-10'): SittingRecord {
  const selected = sitting(catalogue, date);
  const counts = { total: items.length, assigned: 0, unassigned: 0, annotations: 0 };
  for (const sourceItem of items) {
    if (sourceItem.attribution === 'assigned') counts.assigned++;
    else if (sourceItem.attribution === 'unassigned') counts.unassigned++;
    else counts.annotations++;
  }
  selected.record.accounting = counts;
  catalogue.coverage.attributionGapCount = 0;
  for (const entry of catalogue.sittings) catalogue.coverage.attributionGapCount += entry.record.accounting?.unassigned ?? 0;
  return {
    schemaVersion: 1,
    sittingId: selected.id,
    identity: {
      date: selected.date,
      parliament: selected.parliament,
      penggal: selected.penggal,
      mesyuarat: selected.mesyuarat,
      house: selected.house,
      filename: selected.filename,
      isFinal: selected.isFinal,
    },
    sourceUrl: selected.sourceUrl,
    items,
  };
}

test('ITM-N001: every nested source leaf is retained exactly once with its original headings and paragraphs',
  /**
 * Verifies six independently enumerated source-derived leaves; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const raw = rawRecord();
    const tree = raw.speeches as Record<string, unknown>[];
    const questions = tree[1]['WAKTU PERTANYAAN-PERTANYAAN MENTERI'] as Record<string, unknown>[];
    const annotations = tree[2]['PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN'] as Record<string, unknown>[];
    const motions = tree[3].USUL as Record<string, unknown>[];
    const title = 'USUL MENJUNJUNG KASIH TITAH SERI PADUKA BAGINDA YANG DI-PERTUAN AGONG';
    const turns = motions[0][title] as Record<string, unknown>[];
    expect(normalizeSourceRecord(raw, sitting(catalogue), catalogue).items).toEqual([
      item({ ordinal: 0, sourceIndex: 0, text: tree[0].speech as string, rawAuthor: null, sourceAuthorId: null, memberId: null, timestamp: 1000, attribution: 'unassigned', gapReason: 'missing-id' }),
      item({ ordinal: 1, sourceIndex: 2, sectionPath: ['WAKTU PERTANYAAN-PERTANYAAN MENTERI'], text: questions[0].speech as string, rawAuthor: null, sourceAuthorId: null, memberId: null, timestamp: 1000, attribution: 'unassigned', gapReason: 'missing-id' }),
      item({ ordinal: 2, sectionPath: ['WAKTU PERTANYAAN-PERTANYAAN MENTERI'], text: questions[1].speech as string }),
      item({ ordinal: 3, sourceIndex: 108, sectionPath: ['PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN'], text: annotations[0].speech as string, rawAuthor: 'ANNOTATION', sourceAuthorId: null, memberId: null, timestamp: 1130, attribution: 'annotation' }),
      item({ ordinal: 4, sourceIndex: 277, sectionPath: ['USUL', title], text: turns[0].speech as string, rawAuthor: turns[0].author as string, sourceAuthorId: '4463', memberId: '4463', timestamp: 1530 }),
      item({ ordinal: 5, sourceIndex: 304, sectionPath: ['USUL', title], text: turns[1].speech as string, rawAuthor: turns[1].author as string, sourceAuthorId: '22547', memberId: '22547', timestamp: 1530 }),
    ]);
  });

test('ITM-N002: exact text and raw author labels survive without trim, HTML interpretation, or bracket parsing',
  /**
 * Compares untrusted strings byte-for-byte with the supplied leaf; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const text = '  <script>untrusted()</script> &amp; \\n literal\n\n  akhir  ';
    const author = '  YB TUAN Lim Guan Eng [Historical words]  ';
    expect(normalize([leaf({ speech: text, author })]).items).toEqual([item({ text, rawAuthor: author })]);
  });

test('ITM-N003: traversal order and sequential ordinals include annotations rather than sorting clock or indices',
  /**
 * Checks independently ordered leaves with nonmonotonic times and indices; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([
      leaf({ index: 100, timestamp: 1530, speech: 'first' }),
      { ' Heading ': [leaf({ index: 2, timestamp: 1000, is_annotation: true, speech: 'middle' })] },
      leaf({ index: 7, timestamp: 1010, speech: 'last' }),
    ]).items).toEqual([
      item({ ordinal: 0, sourceIndex: 100, timestamp: 1530, text: 'first' }),
      item({ ordinal: 1, sourceIndex: 2, timestamp: 1000, text: 'middle', sectionPath: [' Heading '], attribution: 'annotation', memberId: null }),
      item({ ordinal: 2, text: 'last' }),
    ]);
  });

test('ITM-N004: noncontiguous unique source indices are accepted unchanged',
  /**
 * Verifies a known source excerpt need not contain every omitted index; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ index: 2 }), leaf({ index: 304 })]).items).toEqual([
      item({ sourceIndex: 2 }), item({ ordinal: 1, sourceIndex: 304 }),
    ]);
  });

test.each(['missing', 'null'])('ITM-N005: %s source index stays null rather than being invented',
  /**
 * Checks missing/null source indices; parameter selects the absent representation and returns nothing.
 * @param representation Missing or null metadata representation to test.
 * @returns Nothing; checks the named required behavior.
 */
  (representation) => {
    const raw = leaf({ index: null });
    if (representation === 'missing') delete raw.index;
    expect(normalize([raw]).items).toEqual([item({ sourceIndex: null })]);
  });

test('ITM-N006: a duplicate provided index rejects the replacement even across headings',
  /**
 * Expects malformed duplicate source indices to throw; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(
      /**
 * Runs the invalid normalization without hiding its thrown validation error.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ index: 7 }), { 'Other section': [leaf({ index: 7 })] }]),
    ).toThrow();
  });

test.each([-1, 1.5, '7', true, {}, Number.MAX_SAFE_INTEGER + 1])('ITM-N007: invalid source index %j rejects the replacement',
  /**
 * Checks each invalid source-index value; returns nothing and expects a validation error.
 * @param index Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (index) => {
    expect(
      /**
 * Normalizes the malformed provided source index to exercise validation.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ index })]),
    ).toThrow();
  });

test('ITM-N008: sibling heading arrays and directly nested arrays preserve every leaf and heading',
  /**
 * Verifies supported recursive arrays and ordered heading keys; returns nothing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([{ FIRST: [[leaf({ index: 1 })]], SECOND: [leaf({ index: 9 })] }]).items).toEqual([
      item({ sourceIndex: 1, sectionPath: ['FIRST'] }),
      item({ ordinal: 1, sourceIndex: 9, sectionPath: ['SECOND'] }),
    ]);
  });

test.each([{}, null, 'stray text', 1, { UNKNOWN: {} }, { UNKNOWN: 'lost passage' }, { ...leaf(), HIDDEN: [leaf({ index: 8 })] }])('ITM-N009: unfamiliar or mixed leaf structure %j rejects instead of dropping source content',
  /**
 * Expects each unsupported structure to invalidate the record; returns nothing.
 * @param node Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (node) => {
    expect(
      /**
 * Exercises unsupported source-tree shape without filtering it away.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([node]),
    ).toThrow();
  });

test.each(invalidCases([null, 42, {}, []]))('ITM-N010: nonstring speech %j rejects the replacement',
  /**
 * Expects each malformed speech value to throw; returns nothing.
 * @param speech Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (speech) => {
    expect(
      /**
 * Exercises malformed decoded speech data at the shared normalization boundary.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ speech })]),
    ).toThrow();
  });

test.each(invalidCases([42, {}, []]))('ITM-N011: nonstring author label %j rejects the replacement',
  /**
 * Expects malformed supplied author labels to throw; returns nothing.
 * @param author Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (author) => {
    expect(
      /**
 * Exercises the supplied label type without inferring a replacement.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ author })]),
    ).toThrow();
  });

test.each(['missing', 'null'])('ITM-N012: %s author metadata stays null while exact ID attribution works',
  /**
 * Checks absent labels preserve null without losing valid structured ID attribution.
 * @param representation Missing or null metadata representation to test.
 * @returns Nothing; checks the named required behavior.
 */
  (representation) => {
    const raw = leaf({ author: null });
    if (representation === 'missing') delete raw.author;
    expect(normalize([raw]).items).toEqual([item({ rawAuthor: null })]);
  });

test.each(['missing', null, false])('ITM-M001: annotation marker %j remains a speaking item',
  /**
 * Verifies absent/null/false marker values do not infer an annotation from text or label.
 * @param marker Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (marker) => {
    const raw = leaf({ author: 'ANNOTATION', author_id: null, speech: '[A named member is absent]', is_annotation: marker });
    if (marker === 'missing') delete raw.is_annotation;
    expect(normalize([raw]).items).toEqual([item({ rawAuthor: 'ANNOTATION', sourceAuthorId: null, memberId: null, text: '[A named member is absent]', attribution: 'unassigned', gapReason: 'missing-id' })]);
  });

test('ITM-M002: only explicit true creates an annotation, even when it carries a known member ID',
  /**
 * Checks explicitly annotated source words stay separate from assigned MP speech.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ is_annotation: true })]).items).toEqual([
      item({ memberId: null, attribution: 'annotation' }),
    ]);
  });

test.each(invalidCases(['true', 'false', 0, 1, {}, []]))('ITM-M003: unsupported annotation marker %j rejects the record',
  /**
 * Checks each unsupported marker value; returns nothing and expects validation failure.
 * @param is_annotation Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (is_annotation) => {
    expect(
      /**
 * Supplies an unsupported annotation marker without truthiness conversion.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ is_annotation })]),
    ).toThrow();
  });

test('ITM-A001: exact reconciled source ID assigns speech despite title and formatting differences',
  /**
 * Verifies display-label differences never override an authoritative matching ID.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ author: 'YB TUAN LIM GUAN ENG [Bagan]' })]).items).toEqual([
      item({ rawAuthor: 'YB TUAN LIM GUAN ENG [Bagan]' }),
    ]);
  });

test('ITM-A002: an unknown source ID survives as an unassigned gap',
  /**
 * Verifies a similar known display label cannot reconcile an unknown ID.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ author_id: 999999 })]).items).toEqual([
      item({ sourceAuthorId: '999999', memberId: null, attribution: 'unassigned', gapReason: 'unknown-id' }),
    ]);
  });

test.each(['missing', 'null'])('ITM-A003: %s author ID stays missing despite quoted names and a preceding speaker',
  /**
 * Checks absent IDs remain explicit gaps and do not inherit speaker identity.
 * @param representation Missing or null metadata representation to test.
 * @returns Nothing; checks the named required behavior.
 */
  (representation) => {
    const raw = leaf({ author_id: null, speech: 'Lim Guan Eng [Bagan] says: quoted words.' });
    if (representation === 'missing') delete raw.author_id;
    expect(normalize([leaf({ index: 1 }), raw]).items).toEqual([
      item({ sourceIndex: 1 }),
      item({ ordinal: 1, text: 'Lim Guan Eng [Bagan] says: quoted words.', sourceAuthorId: null, memberId: null, attribution: 'unassigned', gapReason: 'missing-id' }),
    ]);
  });

test.each(invalidCases([0, -1, 1.5, true, {}, [], Number.MAX_SAFE_INTEGER + 1, '01', '1839', 'name']))('ITM-A004: malformed source author ID %j rejects rather than guessing',
  /**
 * Checks invalid structured IDs throw before any attribution result is accepted.
 * @param author_id Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (author_id) => {
    expect(
      /**
 * Exercises an invalid author ID through the normalization boundary.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ author_id })]),
    ).toThrow();
  });

test('ITM-A005: contradictory structured new_author_id is a conflict, never a label comparison',
  /**
 * Checks a controlled, unobserved optional second source ID; does not claim it appeared in fixtures.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ new_author_id: 4463 })]).items).toEqual([
      item({ memberId: null, attribution: 'unassigned', gapReason: 'conflicting-id' }),
    ]);
  });

test('ITM-A006: a matching optional structured identity preserves assignment',
  /**
 * Checks controlled second-ID compatibility without source-label parsing.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ new_author_id: 1839 })]).items).toEqual([item()]);
  });

test('ITM-A007: optional second identity does not repair a missing authoritative author_id',
  /**
 * Verifies controlled secondary identity cannot silently supply a missing source author ID.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ author_id: null, new_author_id: 1839 })]).items).toEqual([
      item({ sourceAuthorId: null, memberId: null, attribution: 'unassigned', gapReason: 'missing-id' }),
    ]);
  });

test.each([true, {}, -1, '01', '1839'])('ITM-A008: malformed optional structured identity %j rejects the replacement',
  /**
 * Checks invalid controlled second-ID data throws instead of being ignored.
 * @param new_author_id Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (new_author_id) => {
    expect(
      /**
 * Exercises malformed optional second identity at the normalization boundary.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ new_author_id })]),
    ).toThrow();
  });

test('ITM-A009: embedded names and quotation text do not transfer a valid turn to another member',
  /**
 * Verifies source IDs win over names appearing in author labels or transcript words.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    expect(normalize([leaf({ author_id: 4463, speech: 'Lim Guan Eng said "Ya".', author: 'Lim Guan Eng [quoted label]' })]).items).toEqual([
      item({ sourceAuthorId: '4463', memberId: '4463', text: 'Lim Guan Eng said "Ya".', rawAuthor: 'Lim Guan Eng [quoted label]' }),
    ]);
  });

test.each([1000, '', 'unknown source time', null])('ITM-T001: original source speech timestamp %j is opaque and preserved',
  /**
 * Checks source time values do not become application or official revision timestamps.
 * @param timestamp Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (timestamp) => {
    expect(normalize([leaf({ timestamp })]).items).toEqual([item({ timestamp })]);
  });

test('ITM-T002: missing speech timestamp stays null',
  /**
 * Verifies absent original time is not populated using acquisition or preparation time.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const raw = leaf();
    delete raw.timestamp;
    expect(normalize([raw]).items).toEqual([item({ timestamp: null })]);
  });

test.each(invalidCases([true, {}, [], Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]))('ITM-T003: unsupported source speech timestamp %j rejects the replacement',
  /**
 * Checks invalid timestamp types fail without stringifying or inventing time.
 * @param timestamp Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (timestamp) => {
    expect(
      /**
 * Exercises unsupported original speech time types.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize([leaf({ timestamp })]),
    ).toThrow();
  });

test('ITM-N013: historical source text, null context, and empty speech time remain unchanged',
  /**
 * Verifies the historical excerpt retains original multiline text and its empty timestamp.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const raw = rawRecord('1959-09-11');
    const source = ((raw.speeches as Record<string, unknown>[])[0]['ELECTION OF SPEAKER'] as Record<string, unknown>[])[0];
    expect(normalizeSourceRecord(raw, sitting(catalogue, '1959-09-11'), catalogue).items).toEqual([
      item({ sourceIndex: 0, sectionPath: ['ELECTION OF SPEAKER'], text: source.speech as string, rawAuthor: source.author as string, sourceAuthorId: '22462', memberId: '22462', timestamp: '' }),
    ]);
  });

test('ITM-N014: normalization emits the exact validated sitting identity and official record link',
  /**
 * Compares all stable shard identity fields with the matching catalogue sitting.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(normalizeSourceRecord(rawRecord(), sitting(catalogue), catalogue)).toMatchObject({
      schemaVersion: 1,
      sittingId: '29326',
      identity: { date: '2026-02-10', parliament: 15, penggal: 5, mesyuarat: 1, house: 'dewan-rakyat', filename: 'dr_2026-02-10', isFinal: false },
      sourceUrl: 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10',
    });
  });

test.each([
  ['date', '2026-02-11'], ['filename', 'dr_2026-02-11'], ['is_final', true],
])('ITM-I001: mismatched raw %s identity rejects the replacement',
  /**
 * Checks a supplied record identity mismatch; parameters identify its field/value.
 * @param field Identity field whose mismatch is under test.
 * @param value One invalid input preserved as a single argument.
 * @returns Nothing; checks the named required behavior.
 */
  (field, value) => {
    const catalogue = makeCatalogue();
    const raw = rawRecord();
    raw[field] = value;
    expect(
      /**
 * Attempts acceptance of a source record with a conflicting stable identity.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalizeSourceRecord(raw, sitting(catalogue), catalogue),
    ).toThrow();
  });

test.each([['term', 14], ['session', 4], ['meeting', 0], ['house', 1]])('ITM-I002: mismatched raw cycle %s rejects the replacement',
  /**
 * Checks each hierarchy/house field against the catalogue's dated identity.
 * @param field Identity field whose mismatch is under test.
 * @param value One invalid input preserved as a single argument.
 * @returns Nothing; checks the named required behavior.
 */
  (field, value) => {
    const catalogue = makeCatalogue();
    const raw = rawRecord();
    (raw.cycle as Record<string, unknown>)[field] = value;
    expect(
      /**
 * Attempts acceptance of a source record with a conflicting source cycle.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalizeSourceRecord(raw, sitting(catalogue), catalogue),
    ).toThrow();
  });

test('ITM-I003: a wrong source meta record path rejects the replacement',
  /**
 * Verifies the official source route cannot name a different sitting date.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const raw = rawRecord();
    raw.meta = { id: '/hansard/dewan-rakyat/2026-02-11' };
    expect(
      /**
 * Exercises a mismatched source route identity.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalizeSourceRecord(raw, sitting(catalogue), catalogue),
    ).toThrow();
  });

test.each([null, {}, 'empty', undefined])('ITM-N015: malformed speeches container %j never establishes an empty valid record',
  /**
 * Checks invalid/missing source trees throw rather than producing verified absence.
 * @param speeches Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (speeches) => {
    expect(
      /**
 * Normalizes an unsupported root speeches container.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalize(speeches),
    ).toThrow();
  });

test('ITM-N016: a fully validated source response may contain an explicitly empty speeches array',
  /**
 * Verifies supported empty data still carries validated stable source identity.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(normalize([], catalogue)).toEqual(shard([], catalogue));
  });

test('ITM-N017: official page-data envelope preserves the same source-derived record',
  /**
 * Verifies normalization reads the observed pageProps envelope without altering source content.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(normalizeSourceRecord({ pageProps: rawRecord(), __N_SSP: true }, sitting(catalogue), catalogue)).toMatchObject({
      schemaVersion: 1, sittingId: '29326', items: expect.arrayContaining([expect.objectContaining({ sourceIndex: 2, gapReason: 'missing-id' })]),
    });
  });

test('ITM-I004: a supplied sitting absent from the exact catalogue cannot establish shard identity',
  /**
 * Verifies callers cannot bypass catalogue identity using a duplicate display identity and a new ID.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const unknown = { ...sitting(catalogue), id: '999999' };
    expect(
      /**
 * Attempts normalization for an unreconciled selected sitting identity.
 * @returns The tested normalization result if incorrectly accepted.
 * @throws Propagates the required source validation rejection.
 */
      () => normalizeSourceRecord(rawRecord(), unknown, catalogue),
    ).toThrow();
  });

test('ITM-R001: ready means matching assigned turns and no speaking gaps, while annotations remain separate',
  /**
 * Checks ready semantics and complete independently controlled source partitions.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const turns = [item()];
    const annotation = item({ ordinal: 1, sourceIndex: 8, memberId: null, attribution: 'annotation', text: '[Procedure]' });
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([...turns, annotation], catalogue), '2026-10-10T06:00:00.000Z')).toMatchObject({
      outcome: 'ready', turns, gaps: [], annotations: [annotation], refreshedAt: '2026-10-10T06:00:00.000Z', saved: false,
    });
  });

test('ITM-R002: validated zero matching turns without gaps yields verified absence with draft status preserved',
  /**
 * Verifies absence refers to this validated draft record, not the member's wider participation.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const other = item({ sourceAuthorId: '4463', memberId: '4463' });
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([other], catalogue))).toMatchObject({
      outcome: 'verified-absence', turns: [], gaps: [], annotations: [], sitting: { isFinal: false },
    });
  });

test('ITM-R003: a complete validated empty source array yields verified absence',
  /**
 * Verifies absence is allowed only after a structurally valid empty record is supplied.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([], catalogue))).toMatchObject({ outcome: 'verified-absence' });
  });

test.each([true, false])('ITM-R004: speaking gaps force incomplete whether selected turns exist (%s)',
  /**
 * Checks both populated and empty selected subsets remain incomplete with a speaking gap.
 * @param hasTurn Whether the selected member has an assigned turn.
 * @returns Nothing; checks the named required behavior.
 */
  (hasTurn) => {
    const catalogue = makeCatalogue();
    const gap = item({ ordinal: hasTurn ? 1 : 0, sourceIndex: 9, memberId: null, sourceAuthorId: null, attribution: 'unassigned', gapReason: 'missing-id', text: 'Unassigned passage' });
    const turns = hasTurn ? [item()] : [];
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([...turns, gap], catalogue))).toMatchObject({ outcome: 'incomplete', turns, gaps: [gap] });
  });

test('ITM-R005: all gap kinds and annotations survive in source order with their original details',
  /**
 * Verifies result gap/annotation partitioning retains all passages rather than only selected speech.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const missing = item({ ordinal: 0, sourceIndex: 2, memberId: null, sourceAuthorId: null, attribution: 'unassigned', gapReason: 'missing-id' });
    const unknown = item({ ordinal: 1, sourceIndex: 99, memberId: null, sourceAuthorId: '999999', attribution: 'unassigned', gapReason: 'unknown-id', text: 'Unknown text' });
    const annotation = item({ ordinal: 2, sourceIndex: 101, memberId: null, attribution: 'annotation', text: 'Annotation text' });
    const conflict = item({ ordinal: 3, sourceIndex: 303, memberId: null, attribution: 'unassigned', gapReason: 'conflicting-id', text: 'Conflict text' });
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([missing, unknown, annotation, conflict], catalogue))).toMatchObject({
      outcome: 'incomplete', turns: [], gaps: [missing, unknown, conflict], annotations: [annotation],
    });
  });

test('ITM-R006: known missing-ID index 2 remains an accessible gap despite the visible member name',
  /**
 * Verifies the source-derived missing-ID question is retained and does not become assigned by prose.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const record = normalizeSourceRecord(rawRecord(), sitting(catalogue), catalogue);
    const result = buildTranscriptResult(catalogue, '1839', '29326', record);
    const questions = (rawRecord().speeches as Record<string, unknown>[])[1]['WAKTU PERTANYAAN-PERTANYAAN MENTERI'] as Record<string, unknown>[];
    expect(result).toMatchObject({ outcome: 'incomplete', gaps: expect.arrayContaining([expect.objectContaining({ sourceIndex: 2, text: questions[0].speech, sourceAuthorId: null, memberId: null, gapReason: 'missing-id' })]) });
  });

test('ITM-R007: unavailable sitting keeps known identities and source details without inventing accepted times',
  /**
 * Verifies no accepted record yields unavailable and preserves nullable successful metadata.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const selected = sitting(catalogue);
    selected.record = { ...selected.record, availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, sourceBuildId: null, rawSourceDigest: null, accounting: null, lastAttemptOutcome: 'failed' };
    catalogue.coverage.unavailableSittingCount = 1;
    catalogue.coverage.attributionGapCount = 0;
    expect(buildTranscriptResult(catalogue, '1839', selected.id, null)).toMatchObject({
      memberId: '1839', sittingId: selected.id, outcome: 'unavailable', recordDigest: null, refreshedAt: null,
      turns: [], gaps: [], annotations: [], sitting: { sourceUrl: selected.sourceUrl, record: { acquiredAt: null, lastAttemptAt: selected.record.lastAttemptAt } },
    });
  });

test('ITM-R008: result preserves exact selected identity copies, digest, schema, and source provenance',
  /**
 * Verifies a result is self-contained with source/descriptor provenance and historical nulls.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const selected = sitting(catalogue);
    expect(selected.record.rawSourceDigest).toBe(manifest.sources['record-2026-02-10'].rawSourceDigest);
    expect(buildTranscriptResult(catalogue, '1839', selected.id, shard([item()], catalogue))).toMatchObject({
      schemaVersion: 1, snapshotId: catalogue.snapshotId, memberId: '1839', sittingId: selected.id,
      member: catalogue.members[0], sitting: selected, provenance: catalogue.provenance,
      recordDigest: selected.record.digest, refreshedAt: null, saved: false,
    });
  });

test('ITM-R009: historical result preserves supplied identity and null context without label-derived constituency',
  /**
 * Verifies source bracket labels do not populate unavailable historical member context.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const selected = sitting(catalogue, '1959-09-11');
    const turn = item({ sourceAuthorId: '22462', memberId: '22462', rawAuthor: "Dato' Teoh Chze Chong (Segamat Selatan)", timestamp: '' });
    expect(buildTranscriptResult(catalogue, '22462', selected.id, shard([turn], catalogue, selected.date))).toMatchObject({
      outcome: 'ready', member: { id: '22462', name: 'TEOH CHZE CHONG', historicalContext: null }, turns: [turn], sitting: { parliament: 1, date: selected.date },
    });
  });

test.each([
  ['schemaVersion', 2], ['sittingId', '26241'], ['sourceUrl', 'https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2014-07-23'],
])('ITM-R010: mismatched shard %s never yields participation conclusions',
  /**
 * Checks published shard schema/ID/link conflicts reject the result; parameters identify the conflict.
 * @param field Identity field whose mismatch is under test.
 * @param value One invalid input preserved as a single argument.
 * @returns Nothing; checks the named required behavior.
 */
  (field, value) => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue) as unknown as Record<string, unknown>;
    record[field] = value;
    expect(
      /**
 * Attempts result derivation from a shard that does not match the selected catalogue.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', record as unknown as SittingRecord),
    ).toThrow();
  });

test.each([
  ['date', '2026-02-11'], ['parliament', 14], ['penggal', 4], ['mesyuarat', 0],
  ['house', 'dewan-negara'], ['filename', 'dr_2026-02-11'], ['isFinal', true],
])('ITM-R011: mismatched shard identity %s rejects instead of matching display names',
  /**
 * Checks every repeated shard identity field against the exact selected catalogue sitting.
 * @param field Identity field whose mismatch is under test.
 * @param value One invalid input preserved as a single argument.
 * @returns Nothing; checks the named required behavior.
 */
  (field, value) => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue);
    (record.identity as unknown as Record<string, unknown>)[field] = value;
    expect(
      /**
 * Exercises one conflicting stable shard identity field.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', record),
    ).toThrow();
  });

test.each([['unknown member', '999999', '29326'], ['unknown sitting', '1839', '999999']])('ITM-R012: %s rejects even when source display names are familiar',
  /**
 * Checks selected IDs must be represented in this exact catalogue before a result is built.
 * @param _description Human-readable invalid selection case label.
 * @param memberId Controlled parameter for the named assertion.
 * @param sittingId Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (_description, memberId, sittingId) => {
    const catalogue = makeCatalogue();
    expect(
      /**
 * Attempts result derivation using a nonexistent selected identity.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, memberId, sittingId, shard([item()], catalogue)),
    ).toThrow();
  });

test.each([
  item({ memberId: '4463' }), item({ memberId: '999999', sourceAuthorId: '999999' }),
  item({ ordinal: 1 }), item({ attribution: 'annotation' }),
  item({ attribution: 'unassigned', memberId: null }), item({ text: 7 as unknown as string }),
  item({ sourceIndex: '7' as unknown as number }), item({ sourceIndex: -1 }),
  item({ sectionPath: [7] as unknown as string[] }), item({ rawAuthor: 7 as unknown as string }),
  item({ sourceAuthorId: '01' }), item({ timestamp: {} as unknown as string }),
  item({ timestamp: Number.NaN }), item({ timestamp: Number.POSITIVE_INFINITY }),
  item({ attribution: 'unknown' as SourceItem['attribution'] }), item({ memberId: null }),
  item({ gapReason: 'missing-id' }),
  item({ attribution: 'annotation', memberId: null, gapReason: 'missing-id' }),
  item({ attribution: 'unassigned', memberId: null, sourceAuthorId: null, gapReason: 'unknown-id' }),
  item({ attribution: 'unassigned', memberId: null, sourceAuthorId: '1839', gapReason: 'unknown-id' }),
  item({ attribution: 'unassigned', memberId: null, sourceAuthorId: null, gapReason: 'conflicting-id' }),
])('ITM-R013: malformed normalized item %j rejects before filtering',
  /**
 * Checks inconsistent attribution, ordering, and text cannot turn a malformed shard into absence.
 * @param malformed Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (malformed) => {
    const catalogue = makeCatalogue();
    expect(
      /**
 * Exercises the invalid item through the result validation boundary.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', shard([malformed], catalogue)),
    ).toThrow();
  });

test.each(invalidCases([null, {}, 'empty', undefined]))('ITM-R020: malformed shard items %j rejects rather than becoming an empty subset',
  /**
   * Checks the complete published item container must be present and supported.
   * @param items Controlled unsupported published items container.
   * @returns Nothing; checks required malformed-shard rejection.
   */
  (items) => {
    const catalogue = makeCatalogue();
    const record = shard([], catalogue);
    record.items = items as SourceItem[];
    expect(
      /**
       * Attempts derivation from an unsupported published items container.
       * @returns The tested result if incorrectly accepted.
       * @throws Propagates the required shard validation rejection.
       */
      () => buildTranscriptResult(catalogue, '1839', '29326', record),
    ).toThrow();
  });

test('ITM-R021: all selected turns remain separate and ordered among other speakers and annotations',
  /**
   * Checks the member subset preserves every original turn rather than sorting or concatenating.
   * @returns Nothing; checks exact ordered selected source turns.
   */
  () => {
    const catalogue = makeCatalogue();
    const first = item({ sourceIndex: 100, text: 'First original turn', timestamp: 1530 });
    const other = item({ ordinal: 1, sourceIndex: 2, sourceAuthorId: '4463', memberId: '4463' });
    const annotation = item({ ordinal: 2, sourceIndex: 3, memberId: null, attribution: 'annotation' });
    const last = item({ ordinal: 3, sourceIndex: 4, text: 'Last original turn', timestamp: 1000 });
    expect(buildTranscriptResult(catalogue, '1839', '29326', shard([first, other, annotation, last], catalogue))).toMatchObject({
      outcome: 'ready', turns: [first, last], gaps: [], annotations: [annotation],
    });
  });

test('ITM-R022: unavailable content never receives a successful pair refresh timestamp',
  /**
   * Checks catalogue validation alone cannot invent an accepted record's successful device time.
   * @returns Nothing; checks unavailable semantic timestamps remain null.
   */
  () => {
    const catalogue = makeCatalogue();
    const selected = sitting(catalogue);
    selected.record = { ...selected.record, availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, sourceBuildId: null, rawSourceDigest: null, accounting: null, lastAttemptOutcome: 'failed' };
    catalogue.coverage.unavailableSittingCount = 1;
    catalogue.coverage.attributionGapCount = 0;
    expect(buildTranscriptResult(catalogue, '1839', selected.id, null, '2026-10-10T06:00:00.000Z')).toMatchObject({
      outcome: 'unavailable', refreshedAt: null, sitting: { record: { acquiredAt: null } },
    });
  });

test('ITM-R014: duplicate shard indices are rejected instead of silently omitting a turn',
  /**
 * Checks already-normalized duplicate indices still invalidate a published shard.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(
      /**
 * Attempts derivation from two different ordinals sharing a provided source index.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', shard([item(), item({ ordinal: 1 })], catalogue)),
    ).toThrow();
  });

test('ITM-R015: an accepted descriptor requires its matching shard and never substitutes unavailable',
  /**
 * Verifies missing available data is a retrieval error rather than a semantic unavailable result.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    expect(
      /**
 * Exercises missing content for an available published descriptor.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', null),
    ).toThrow();
  });

test('ITM-R016: an unavailable descriptor cannot accept an unrelated supplied shard',
  /**
 * Checks absent published content is not replaced using a caller's arbitrary shard.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const selected = sitting(catalogue);
    const record = shard([item()], catalogue);
    selected.record = { ...selected.record, availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, sourceBuildId: null, rawSourceDigest: null, accounting: null, lastAttemptOutcome: 'failed' };
    catalogue.coverage.unavailableSittingCount = 1;
    catalogue.coverage.attributionGapCount = 0;
    expect(
      /**
 * Supplies shard data for an explicitly unavailable descriptor.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', selected.id, record),
    ).toThrow();
  });

test('ITM-R017: returned identities and item collections do not alias mutable catalogue or shard input',
  /**
 * Checks self-contained result copies survive later input mutation; mutates only controlled fixtures.
 * @returns Nothing; checks the named required behavior.
 */
  () => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue);
    const result = buildTranscriptResult(catalogue, '1839', '29326', record);
    catalogue.members[0].name = 'changed fixture';
    record.items[0].text = 'changed fixture';
    expect(result).toMatchObject({ member: { name: 'LIM GUAN ENG' }, turns: [item()] });
  });

test('ITM-R019: shard partitions must match the accepted descriptor source accounting',
  /**
 * Verifies a shard missing accepted leaves cannot produce verified absence or a ready result.
 * @returns Nothing; checks the named required behavior.
 * @remarks Mutates the controlled catalogue descriptor accounting to model a missing accepted leaf.
 */
  () => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue);
    sitting(catalogue).record.accounting = { total: 2, assigned: 2, unassigned: 0, annotations: 0 };
    expect(
      /**
 * Attempts result derivation when accepted source accounting reports a missing leaf.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', record),
    ).toThrow();
  });

test('ITM-SNAPSHOT001: result keeps its accepted snapshot dates, coverage, and workflow metadata',
  /**
   * Checks source provenance is self-contained even when no publication time is known.
   * @returns Nothing; checks exact accepted snapshot metadata and distinct successful times.
   */
  () => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue);
    expect(buildTranscriptResult(catalogue, '1839', '29326', record, '2026-10-10T06:00:00.000Z')).toMatchObject({
      snapshot: {
        preparedAt: catalogue.preparedAt, publishedAt: null, coverage: catalogue.coverage, status: catalogue.status,
      },
      refreshedAt: '2026-10-10T06:00:00.000Z',
      sitting: { record: { acquiredAt: '2026-10-10T03:01:00.000Z', sourcePublishedAt: null, sourceRevisedAt: null } },
    });
  });

test('ITM-SNAPSHOT002: confirmed publication stays separate from snapshot preparation and device validation',
  /**
   * Checks a matching deployment receipt provides only the accepted publication time.
   * @returns Nothing; checks every known timestamp retains its own meaning.
   */
  () => {
    const catalogue = makeCatalogue();
    catalogue.publishedAt = '2026-10-10T04:10:00.000Z';
    catalogue.status.lastConfirmedDeployment = {
      snapshotId: catalogue.snapshotId, deploymentId: 'confirmed-controlled-deployment',
      publishedAt: catalogue.publishedAt, verifiedServedAt: '2026-10-10T04:11:00.000Z',
      workflowUrl: 'https://github.com/example/vote-better-malaysia/actions/runs/1',
    };
    const record = shard([item()], catalogue);
    expect(buildTranscriptResult(catalogue, '1839', '29326', record, '2026-10-10T06:00:00.000Z')).toMatchObject({
      snapshot: {
        preparedAt: '2026-10-10T04:00:00.000Z', publishedAt: '2026-10-10T04:10:00.000Z',
        status: { lastConfirmedDeployment: catalogue.status.lastConfirmedDeployment },
      },
      refreshedAt: '2026-10-10T06:00:00.000Z',
    });
  });

test('ITM-SNAPSHOT003: an older result retains its own metadata when a valid newer catalogue changes',
  /**
   * Checks an older self-contained result is never relabeled using replacement snapshot metadata.
   * @returns Nothing; checks old and new accepted metadata remain independent copies.
   * @remarks Mutates controlled catalogue entries to represent a valid newer snapshot only.
   */
  () => {
    const catalogue = makeCatalogue();
    const record = shard([item()], catalogue);
    const oldMetadata = {
      preparedAt: catalogue.preparedAt, publishedAt: catalogue.publishedAt,
      coverage: structuredClone(catalogue.coverage), status: structuredClone(catalogue.status),
    };
    const older = buildTranscriptResult(catalogue, '1839', '29326', record, '2026-10-10T06:00:00.000Z');
    catalogue.snapshotId = 'newer-controlled-snapshot';
    catalogue.preparedAt = '2026-10-10T04:45:00.000Z';
    catalogue.status.completedAt = '2026-10-10T04:44:00.000Z';
    catalogue.status.acquisitionOutcome = 'degraded';
    catalogue.status.workflowUrl = 'https://github.com/example/vote-better-malaysia/actions/runs/2';
    catalogue.sittings[1].listedInLatestInventory = false;
    catalogue.coverage.latestInventoryCount--;
    catalogue.coverage.retainedSittingCount++;
    const newer = buildTranscriptResult(catalogue, '1839', '29326', record, '2026-10-10T07:00:00.000Z');
    expect(older).toMatchObject({ snapshotId: 'controlled-snapshot', snapshot: oldMetadata, refreshedAt: '2026-10-10T06:00:00.000Z' });
    expect(newer).toMatchObject({
      snapshotId: 'newer-controlled-snapshot', snapshot: { preparedAt: catalogue.preparedAt, coverage: catalogue.coverage, status: catalogue.status },
      refreshedAt: '2026-10-10T07:00:00.000Z',
    });
  });

test.each(['not-a-time', '2026-10-10', '2026-10-10T06:00:00+08:00'])('ITM-R018: malformed device refresh instant %s rejects',
  /**
 * Checks device refresh metadata obeys UTC application timestamps rather than opaque speech time.
 * @param refreshedAt Controlled parameter for the named assertion.
 * @returns Nothing; checks the named required behavior.
 */
  (refreshedAt) => {
    const catalogue = makeCatalogue();
    expect(
      /**
 * Supplies an invalid successful device validation time.
 * @returns The tested result if incorrectly accepted.
 * @throws Propagates the required result validation rejection.
 */
      () => buildTranscriptResult(catalogue, '1839', '29326', shard([item()], catalogue), refreshedAt),
    ).toThrow();
  });
