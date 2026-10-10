import { expect, test } from 'vitest';
import { getRecoveryMessages, type RecoveryMessages } from '../../src/messages.ts';

const labels: Array<readonly [keyof RecoveryMessages, string, string]> = [
  ['retry', 'Cuba lagi', 'Retry'],
  ['retryCatalogue', 'Muatkan semula senarai', 'Reload lists'],
  ['overdue', 'Lebih 24 jam sejak rekod sumber berjaya diperoleh.', 'More than 24 hours since the source record was successfully acquired.'],
  ['knownSourceFailure', 'Percubaan memperoleh rekod sumber gagal pada masa yang direkodkan.', 'A source record acquisition attempt failed at the recorded time.'],
  ['pipelineEvidence', 'Bukti proses data', 'Data pipeline evidence'],
  ['staticKnowledgeLimit', 'Salinan laman ini hanya menunjukkan status yang diketahui ketika disediakan. Ia tidak dapat mengesan proses atau perubahan sumber yang tidak terkandung dalam salinan ini.', 'This site snapshot shows only status known when it was prepared. It cannot observe later runs or source changes that are not included in this snapshot.'],
];

/**
 * Asserts one exact nonblank Malay recovery control/announcement before implementation.
 * @param key Required recovery message key.
 * @param malay Agreed Malay wording with truthful source/snapshot scope.
 * @param english Equivalent English wording checked in the parallel locale case.
 * @returns Nothing after message assertions.
 */
function checksMalay(key: keyof RecoveryMessages, malay: string, english: string): void {
  void english; const actual = getRecoveryMessages('ms')[key];
  expect(actual).toBe(malay); expect(actual.trim().length).toBeGreaterThan(0);
}

/**
 * Asserts one exact nonblank English recovery control/announcement before implementation.
 * @param key Required recovery message key.
 * @param malay Equivalent Malay wording checked in the parallel locale case.
 * @param english Agreed English wording with truthful source/snapshot scope.
 * @returns Nothing after message assertions.
 */
function checksEnglish(key: keyof RecoveryMessages, malay: string, english: string): void {
  void malay; const actual = getRecoveryMessages('en')[key];
  expect(actual).toBe(english); expect(actual.trim().length).toBeGreaterThan(0);
}

/**
 * Requires each locale's new recovery keys to be complete and equivalent.
 * @param language Explicit interface language under test.
 * @returns Nothing after exact key-set assertions.
 */
function checksKeys(language: 'ms' | 'en'): void {
  const expected: string[] = []; for (const row of labels) expected.push(row[0]);
  expect(Object.keys(getRecoveryMessages(language)).sort()).toEqual(expected.sort());
}

test.each(labels)('REC-MSG-MS-%s: complete nonblank Malay recovery wording', checksMalay);
test.each(labels)('REC-MSG-EN-%s: complete nonblank English recovery wording', checksEnglish);
test.each(['ms', 'en'] as const)('REC-MSG-KEYS-%s: new recovery key sets are complete and equivalent', checksKeys);
