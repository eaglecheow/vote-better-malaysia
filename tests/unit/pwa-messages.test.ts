import { expect, test } from 'vitest';
import { getPwaMessages, type PwaMessages } from '../../src/messages.ts';

const labels: Record<'ms' | 'en', PwaMessages> = {
  "ms": {
    "saved": "Transkrip disimpan pada peranti.",
    "unsaved": "Transkrip belum disimpan pada peranti.",
    "ready": "Pembaca sedia dibuka semula tanpa sambungan.",
    "limit": "Pembukaan semula tanpa sambungan belum dapat dipastikan.",
    "older": "Salinan lama yang disimpan masih tersedia tanpa sambungan.",
    "connection": "Sambungan diperlukan untuk membuka pasangan identiti dan persidangan yang belum disimpan.",
    "firstVisit": "Sambungan diperlukan untuk memuatkan senarai dan rekod yang belum disimpan.",
    "incompatible": "Data yang disimpan tidak serasi. Sambungan diperlukan untuk mendapatkan salinan yang sah.",
    "storage": "Storan peranti tidak tersedia. Bacaan dalam talian masih boleh digunakan.",
    "apply": "Gunakan kemas kini",
    "continue": "Teruskan membaca",
    "updateFailed": "Kemas kini tidak dapat digunakan. Anda boleh terus membaca.",
    "savedRefreshedAt": "Data salinan yang disimpan berjaya disahkan pada peranti",
    "priorSavedRefreshedAt": "Data salinan lama yang disimpan berjaya disahkan pada peranti"
  },
  "en": {
    "saved": "Transcript saved on this device.",
    "unsaved": "Transcript is not saved on this device.",
    "ready": "Reader ready to reopen offline.",
    "limit": "Offline reopening is not confirmed.",
    "older": "The older saved copy remains available offline.",
    "connection": "A connection is required to open this unsaved identity and sitting pair.",
    "firstVisit": "A connection is required to load unsaved lists and records.",
    "incompatible": "Saved data is incompatible. A connection is required to retrieve a valid copy.",
    "storage": "Device storage is unavailable. Online reading remains usable.",
    "apply": "Apply update",
    "continue": "Continue reading",
    "updateFailed": "The update could not be applied. You can continue reading.",
    "savedRefreshedAt": "Saved copy successfully validated on this device",
    "priorSavedRefreshedAt": "Older saved copy successfully validated on this device"
  }
};

for (const language of ['ms', 'en'] as const) for (const key of Object.keys(labels[language]) as Array<keyof PwaMessages>)
  test(`PWA-MSG001 ${language}/${key}: saved, offline and update guidance retains its exact distinct meaning`,
    /** Checks the authoritative localized string for one observable saved-reader control or notice.
     * @returns Nothing after the locale/key assertion.
     */
    () => { expect(getPwaMessages(language)?.[key]).toBe(labels[language][key]); });

for (const language of ['ms', 'en'] as const) test(`PWA-MSG002 ${language}: both locales cover the complete same label set`,
  /** Checks complete coverage without a missing-object harness exception.
   * @returns Nothing after complete key-set comparison.
   */
  () => { expect(Object.keys(getPwaMessages(language) ?? {}).sort()).toEqual(Object.keys(labels[language]).sort()); });

