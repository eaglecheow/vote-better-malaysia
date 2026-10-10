import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { getMessages, type ReaderMessages } from '../../src/messages.ts';

type Language = 'ms' | 'en';
type LabelCase = readonly [keyof ReaderMessages, string, string];

const labels: LabelCase[] = [
  ['title', 'Pembaca Hansard', 'Hansard reader'],
  ['description', 'Baca sumbangan yang dipadankan kepada identiti sumber bagi persidangan pilihan. Teks transkrip kekal dalam bahasa asal.', 'Read contributions attributed to a source identity for the selected sitting. Transcript wording stays in its original language.'],
  ['language', 'Bahasa antara muka', 'Interface language'],
  ['search', 'Cari identiti sumber', 'Search source identities'],
  ['member', 'Identiti ahli/sumber', 'Member/source identity'],
  ['sitting', 'Persidangan', 'Sitting'],
  ['read', 'Baca', 'Read'],
  ['loadingCatalogue', 'Memuatkan senarai identiti dan persidangan…', 'Loading identities and sittings…'],
  ['loading', 'Memuatkan rekod persidangan…', 'Loading sitting record…'],
  ['chooseBoth', 'Pilih identiti sumber dan persidangan untuk membaca rekod.', 'Choose a source identity and sitting to read the record.'],
  ['resultsReady', 'Rekod sedia untuk dibaca.', 'Record ready to read.'],
  ['gapsIntro', 'Rekod ini mempunyai petikan pertuturan yang tidak dapat dipadankan kepada identiti sumber. Bacaan yang dipadankan mungkin tidak lengkap.', 'This record has speaking passages without a resolved source identity. The attributed reading may be incomplete.'],
  ['noMatchedGap', 'Tiada sumbangan yang dapat dipadankan kepada identiti pilihan. Petikan tanpa padanan masih ada; ketiadaan sumbangan tidak dapat dipastikan.', 'No contributions were confidently attributed to the selected identity. Unassigned passages remain; absence cannot be verified.'],
  ['verifiedAbsence', 'Tiada sumbangan daripada identiti pilihan dalam rekod sumber lengkap ini.', 'No contribution from the selected identity appears in this complete source record.'],
  ['unavailable', 'Rekod persidangan ini tidak tersedia.', 'This sitting record is unavailable.'],
  ['error', 'Data laman tidak dapat dimuatkan atau disahkan.', 'Site data could not be loaded or validated.'],
  ['source', 'Rekod rasmi Parlimen', 'Official Parliament record'],
  ['historyUnavailable', 'Keahlian Parlimen atau kawasan pilihan raya pada tarikh ini tidak tersedia.', 'Parliamentary membership or constituency on this date is unavailable.'],
  ['officialPublishedUnavailable', 'Tarikh penerbitan rasmi sumber tidak tersedia.', 'Official source publication date is unavailable.'],
  ['officialRevisedUnavailable', 'Tarikh semakan rasmi sumber tidak tersedia.', 'Official source revision date is unavailable.'],
  ['snapshotPrepared', 'Salinan laman disediakan', 'Site snapshot prepared'],
  ['sitePublished', 'Penerbitan laman disahkan', 'Site publication confirmed'],
  ['sourceAcquired', 'Rekod sumber berjaya diperoleh', 'Source record successfully acquired'],
  ['deviceRefreshed', 'Data laman berjaya disahkan pada peranti', 'Site data successfully validated on this device'],
  ['unknownTime', 'Tidak tersedia', 'Unavailable'],
  ['draft', 'Draf', 'Draft'],
  ['final', 'Muktamad', 'Final'],
  ['statusUnavailable', 'Status draf/muktamad tidak tersedia', 'Draft/final status unavailable'],
  ['turns', 'Sumbangan yang dipadankan', 'Attributed contributions'],
  ['gaps', 'Petikan tanpa padanan', 'Unassigned passages'],
  ['annotations', 'Anotasi sumber', 'Source annotations'],
  ['section', 'Bahagian sumber', 'Source section'],
  ['time', 'Cap masa sumber', 'Source timestamp'],
  ['index', 'Indeks sumber', 'Source index'],
  ['sourceId', 'ID sumber', 'Source ID'],
  ['help', 'Panduan membaca', 'Reading help'],
  ['coverage', 'Liputan arkib sumber', 'Source archive coverage'],
  ['parliament', 'Parlimen', 'Parliament'],
  ['penggal', 'Penggal', 'Session'],
  ['mesyuarat', 'Mesyuarat', 'Meeting'],
];

/**
 * Asserts the exact agreed Malay label and its nonblank content.
 * @param key Reader message key being checked.
 * @param malay Required Malay label or announcement.
 * @param english Parallel English text, checked by the English case.
 * @returns Nothing after the label assertions.
 */
function checksMalay(key: keyof ReaderMessages, malay: string, english: string): void {
  void english;
  const actual = getMessages('ms')[key];
  expect(actual).toBe(malay);
  expect(actual.trim().length).toBeGreaterThan(0);
}

/**
 * Asserts the exact agreed English label and its nonblank content.
 * @param key Reader message key being checked.
 * @param malay Parallel Malay text, checked by the Malay case.
 * @param english Required English label or announcement.
 * @returns Nothing after the label assertions.
 */
function checksEnglish(key: keyof ReaderMessages, malay: string, english: string): void {
  void malay;
  const actual = getMessages('en')[key];
  expect(actual).toBe(english);
  expect(actual.trim().length).toBeGreaterThan(0);
}

/**
 * Requires exactly the full reader key set in either locale.
 * @param language Interface language being checked.
 * @returns Nothing after asserting both locale maps expose the same complete key set.
 */
function checksKeys(language: Language): void {
  const expected = [];
  for (const entry of labels) expected.push(entry[0]);
  expect(Object.keys(getMessages(language)).sort()).toEqual(expected.sort());
}

/**
 * Checks that localization promises original wording and does not alter sampled source bytes.
 * @returns Nothing after asserting both locale descriptions and unchanged source bytes.
 * @remarks Reads the archived fixture only; it never writes or passes transcripts for translation.
 */
function checksSourceBoundary(): void {
  const path = new URL('../fixtures/source-samples.json', import.meta.url);
  const before = readFileSync(path);
  const malay = getMessages('ms');
  const english = getMessages('en');
  expect({ malay: malay.description, english: english.description }).toEqual({ malay: labels[1][1], english: labels[1][2] });
  expect(readFileSync(path)).toEqual(before);
}

test.each(labels)('MSG-MS-%s: supplies the agreed nonblank Malay label', checksMalay);
test.each(labels)('MSG-EN-%s: supplies the agreed nonblank English label', checksEnglish);
test.each(['ms', 'en'] as const)('MSG-KEYS-%s: locale keys are complete and equivalent', checksKeys);
test('MSG-SOURCE: both descriptions explain original wording and localization leaves archived bytes unchanged', checksSourceBoundary);
