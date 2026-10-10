/** Every reader-generated label or announcement in the online reading increment. */
export interface ReaderMessages {
  readonly title: string;
  readonly description: string;
  readonly language: string;
  readonly search: string;
  readonly member: string;
  readonly sitting: string;
  readonly read: string;
  readonly loadingCatalogue: string;
  readonly loading: string;
  readonly chooseBoth: string;
  readonly resultsReady: string;
  readonly gapsIntro: string;
  readonly noMatchedGap: string;
  readonly verifiedAbsence: string;
  readonly unavailable: string;
  readonly error: string;
  readonly source: string;
  readonly historyUnavailable: string;
  readonly officialPublishedUnavailable: string;
  readonly officialRevisedUnavailable: string;
  readonly snapshotPrepared: string;
  readonly sitePublished: string;
  readonly sourceAcquired: string;
  readonly deviceRefreshed: string;
  readonly unknownTime: string;
  readonly draft: string;
  readonly final: string;
  readonly statusUnavailable: string;
  readonly turns: string;
  readonly gaps: string;
  readonly annotations: string;
  readonly section: string;
  readonly time: string;
  readonly index: string;
  readonly sourceId: string;
  readonly help: string;
  readonly coverage: string;
  readonly parliament: string;
  readonly penggal: string;
  readonly mesyuarat: string;
}

const messages: Record<'ms' | 'en', ReaderMessages> = {
  ms: {
    title: 'Pembaca Hansard',
    description: 'Baca sumbangan yang dipadankan kepada identiti sumber bagi persidangan pilihan. Teks transkrip kekal dalam bahasa asal.',
    language: 'Bahasa antara muka',
    search: 'Cari identiti sumber',
    member: 'Identiti ahli/sumber',
    sitting: 'Persidangan',
    read: 'Baca',
    loadingCatalogue: 'Memuatkan senarai identiti dan persidangan…',
    loading: 'Memuatkan rekod persidangan…',
    chooseBoth: 'Pilih identiti sumber dan persidangan untuk membaca rekod.',
    resultsReady: 'Rekod sedia untuk dibaca.',
    gapsIntro: 'Rekod ini mempunyai petikan pertuturan yang tidak dapat dipadankan kepada identiti sumber. Bacaan yang dipadankan mungkin tidak lengkap.',
    noMatchedGap: 'Tiada sumbangan yang dapat dipadankan kepada identiti pilihan. Petikan tanpa padanan masih ada; ketiadaan sumbangan tidak dapat dipastikan.',
    verifiedAbsence: 'Tiada sumbangan daripada identiti pilihan dalam rekod sumber lengkap ini.',
    unavailable: 'Rekod persidangan ini tidak tersedia.',
    error: 'Data laman tidak dapat dimuatkan atau disahkan.',
    source: 'Rekod rasmi Parlimen',
    historyUnavailable: 'Keahlian Parlimen atau kawasan pilihan raya pada tarikh ini tidak tersedia.',
    officialPublishedUnavailable: 'Tarikh penerbitan rasmi sumber tidak tersedia.',
    officialRevisedUnavailable: 'Tarikh semakan rasmi sumber tidak tersedia.',
    snapshotPrepared: 'Salinan laman disediakan',
    sitePublished: 'Penerbitan laman disahkan',
    sourceAcquired: 'Rekod sumber berjaya diperoleh',
    deviceRefreshed: 'Data laman berjaya disahkan pada peranti',
    unknownTime: 'Tidak tersedia',
    draft: 'Draf',
    final: 'Muktamad',
    statusUnavailable: 'Status draf/muktamad tidak tersedia',
    turns: 'Sumbangan yang dipadankan',
    gaps: 'Petikan tanpa padanan',
    annotations: 'Anotasi sumber',
    section: 'Bahagian sumber',
    time: 'Cap masa sumber',
    index: 'Indeks sumber',
    sourceId: 'ID sumber',
    help: 'Panduan membaca',
    coverage: 'Liputan arkib sumber',
    parliament: 'Parlimen',
    penggal: 'Penggal',
    mesyuarat: 'Mesyuarat',
  },
  en: {
    title: 'Hansard reader',
    description: 'Read contributions attributed to a source identity for the selected sitting. Transcript wording stays in its original language.',
    language: 'Interface language',
    search: 'Search source identities',
    member: 'Member/source identity',
    sitting: 'Sitting',
    read: 'Read',
    loadingCatalogue: 'Loading identities and sittings…',
    loading: 'Loading sitting record…',
    chooseBoth: 'Choose a source identity and sitting to read the record.',
    resultsReady: 'Record ready to read.',
    gapsIntro: 'This record has speaking passages without a resolved source identity. The attributed reading may be incomplete.',
    noMatchedGap: 'No contributions were confidently attributed to the selected identity. Unassigned passages remain; absence cannot be verified.',
    verifiedAbsence: 'No contribution from the selected identity appears in this complete source record.',
    unavailable: 'This sitting record is unavailable.',
    error: 'Site data could not be loaded or validated.',
    source: 'Official Parliament record',
    historyUnavailable: 'Parliamentary membership or constituency on this date is unavailable.',
    officialPublishedUnavailable: 'Official source publication date is unavailable.',
    officialRevisedUnavailable: 'Official source revision date is unavailable.',
    snapshotPrepared: 'Site snapshot prepared',
    sitePublished: 'Site publication confirmed',
    sourceAcquired: 'Source record successfully acquired',
    deviceRefreshed: 'Site data successfully validated on this device',
    unknownTime: 'Unavailable',
    draft: 'Draft',
    final: 'Final',
    statusUnavailable: 'Draft/final status unavailable',
    turns: 'Attributed contributions',
    gaps: 'Unassigned passages',
    annotations: 'Source annotations',
    section: 'Source section',
    time: 'Source timestamp',
    index: 'Source index',
    sourceId: 'Source ID',
    help: 'Reading help',
    coverage: 'Source archive coverage',
    parliament: 'Parliament',
    penggal: 'Session',
    mesyuarat: 'Meeting',
  },
};

/**
 * Supplies interface labels without receiving or translating source transcript strings.
 * @param language Explicit interface locale; the reader chooses Malay on its first visit.
 * @returns The complete messages for that interface locale.
 */
export function getMessages(language: 'ms' | 'en'): ReaderMessages {
  return messages[language];
}

/** Additional recovery controls and snapshot-scoped source-status announcements. */
export interface RecoveryMessages {
  readonly retry: string;
  readonly retryCatalogue: string;
  readonly overdue: string;
  readonly knownSourceFailure: string;
  readonly pipelineEvidence: string;
  readonly staticKnowledgeLimit: string;
}

const recoveryMessages: Record<'ms' | 'en', RecoveryMessages> = {
  ms: {
    retry: 'Cuba lagi',
    retryCatalogue: 'Muatkan semula senarai',
    overdue: 'Lebih 24 jam sejak rekod sumber berjaya diperoleh.',
    knownSourceFailure: 'Percubaan memperoleh rekod sumber gagal pada masa yang direkodkan.',
    pipelineEvidence: 'Bukti proses data',
    staticKnowledgeLimit: 'Salinan laman ini hanya menunjukkan status yang diketahui ketika disediakan. Ia tidak dapat mengesan proses atau perubahan sumber yang tidak terkandung dalam salinan ini.',
  },
  en: {
    retry: 'Retry',
    retryCatalogue: 'Reload lists',
    overdue: 'More than 24 hours since the source record was successfully acquired.',
    knownSourceFailure: 'A source record acquisition attempt failed at the recorded time.',
    pipelineEvidence: 'Data pipeline evidence',
    staticKnowledgeLimit: 'This site snapshot shows only status known when it was prepared. It cannot observe later runs or source changes that are not included in this snapshot.',
  },
};

/**
 * Supplies recovery labels limited to recorded source attempts and snapshot knowledge.
 * @param language Explicit Malay or English interface locale.
 * @returns The six equivalent recovery controls and announcements for that locale.
 */
export function getRecoveryMessages(language: 'ms' | 'en'): RecoveryMessages {
  return recoveryMessages[language];
}

/** Equivalent saved-pair, offline-readiness and deliberate-update labels. */
export interface PwaMessages {
  saved: string;
  unsaved: string;
  ready: string;
  limit: string;
  older: string;
  connection: string;
  firstVisit: string;
  incompatible: string;
  storage: string;
  apply: string;
  continue: string;
  updateFailed: string;
  savedRefreshedAt: string;
  priorSavedRefreshedAt: string;
}

/** Supplies equivalent saved-pair, shell readiness and deliberate-update labels.
 * @param language Explicit Malay or English UI locale.
 * @returns The corresponding locale's labels without altering original source words.
 */
export function getPwaMessages(language: 'ms' | 'en'): PwaMessages {
  return pwaMessages[language];
}

const pwaMessages: Record<'ms' | 'en', PwaMessages> = {
  ms: {
    saved: 'Transkrip disimpan pada peranti.',
    unsaved: 'Transkrip belum disimpan pada peranti.',
    ready: 'Pembaca sedia dibuka semula tanpa sambungan.',
    limit: 'Pembukaan semula tanpa sambungan belum dapat dipastikan.',
    older: 'Salinan lama yang disimpan masih tersedia tanpa sambungan.',
    connection: 'Sambungan diperlukan untuk membuka pasangan identiti dan persidangan yang belum disimpan.',
    firstVisit: 'Sambungan diperlukan untuk memuatkan senarai dan rekod yang belum disimpan.',
    incompatible: 'Data yang disimpan tidak serasi. Sambungan diperlukan untuk mendapatkan salinan yang sah.',
    storage: 'Storan peranti tidak tersedia. Bacaan dalam talian masih boleh digunakan.',
    apply: 'Gunakan kemas kini',
    continue: 'Teruskan membaca',
    updateFailed: 'Kemas kini tidak dapat digunakan. Anda boleh terus membaca.',
    savedRefreshedAt: 'Data salinan yang disimpan berjaya disahkan pada peranti',
    priorSavedRefreshedAt: 'Data salinan lama yang disimpan berjaya disahkan pada peranti',
  },
  en: {
    saved: 'Transcript saved on this device.',
    unsaved: 'Transcript is not saved on this device.',
    ready: 'Reader ready to reopen offline.',
    limit: 'Offline reopening is not confirmed.',
    older: 'The older saved copy remains available offline.',
    connection: 'A connection is required to open this unsaved identity and sitting pair.',
    firstVisit: 'A connection is required to load unsaved lists and records.',
    incompatible: 'Saved data is incompatible. A connection is required to retrieve a valid copy.',
    storage: 'Device storage is unavailable. Online reading remains usable.',
    apply: 'Apply update',
    continue: 'Continue reading',
    updateFailed: 'The update could not be applied. You can continue reading.',
    savedRefreshedAt: 'Saved copy successfully validated on this device',
    priorSavedRefreshedAt: 'Older saved copy successfully validated on this device',
  },
};

