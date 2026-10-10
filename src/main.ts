import { loadPublishedCatalogue, loadPublishedPair, publishedSourceStatus, type Catalogue, type SourceItem, type TranscriptResult } from './source.ts';
import { getMessages, getRecoveryMessages, getPwaMessages, type ReaderMessages, type PwaMessages } from './messages.ts';
import { openStorage, type ReaderStorage, type ReaderPreferences } from './storage.ts';
import { connectUpdates, type UpdateClient, type UpdateState } from './updates.ts';
import './styles.css';

/** Explicit native reader dependencies allow unit-observed requests, timing, and paint completion. */
export interface ReaderDependencies {
  loadCatalogue: () => Promise<Catalogue>;
  loadPair: (memberId: string, sittingId: string, signal?: AbortSignal) => Promise<{ catalogue: Catalogue; result: TranscriptResult }>;
  /** Independent UTC clock for source-age presentation; never a successful acquisition time. */
  now?: () => string;
  /** Native committed device state, independent of source retrieval and shell readiness. */
  openStorage?: () => Promise<ReaderStorage>;
  updates?: UpdateClient;
  online?: () => boolean;
  mark?: (name: string) => void;
  requestPaint?: () => Promise<void>;
}

/**
 * Mounts the native reader with independent source retrieval, atomic saves and shell readiness.
 * @param root Application DOM root, which supplies its own document context.
 * @param dependencies Explicit published-data retrieval and timing/paint boundaries.
 * @returns Teardown that cancels pending reading and removes this reader's DOM.
 * @remarks Replaces root children, registers native control listeners, and loads the published catalogue.
 */
export function mountReader(root: HTMLElement, dependencies: ReaderDependencies): () => void {
  const doc = root.ownerDocument;
  root.innerHTML = '<header><h1 id="reader-title"></h1><p id="reader-description"></p><p id="reader-coverage"></p><a id="reader-help"></a></header><form id="reader-form"><div><label for="language-select"></label><select id="language-select"><option value="ms">Bahasa Melayu</option><option value="en">English</option></select></div><div><label for="member-search"></label><input id="member-search" type="search" autocomplete="off"></div><div><label for="member-select"></label><select id="member-select"></select></div><div><label for="sitting-select"></label><select id="sitting-select"></select></div><button id="read-button" type="submit"></button></form><p id="reader-status" role="status" aria-live="polite" aria-atomic="true"></p><p id="reader-save-status" role="status" aria-live="polite"></p><p id="reader-offline-status" role="status" aria-live="polite"></p><p id="reader-update-status" role="status" aria-live="polite"></p><div id="reader-update-offer" hidden><button id="apply-update-button" type="button"></button><button id="continue-update-button" type="button"></button></div><button id="retry-catalogue-button" type="button" hidden></button><button id="retry-button" type="button" hidden></button><section id="reader-result" aria-live="off"></section>';
  /** Finds a control from the static mount markup. @param id Known element ID. @returns Its native DOM element. */
  function control<T extends HTMLElement>(id: string): T { return root.querySelector(`#${id}`)! as T; }
  const form = control<HTMLFormElement>('reader-form');
  const memberSelect = control<HTMLSelectElement>('member-select');
  const sittingSelect = control<HTMLSelectElement>('sitting-select');
  const languageSelect = control<HTMLSelectElement>('language-select');
  const search = control<HTMLInputElement>('member-search');
  const readButton = control<HTMLButtonElement>('read-button');
  const retryButton = control<HTMLButtonElement>('retry-button');
  const retryCatalogueButton = control<HTMLButtonElement>('retry-catalogue-button');
  const status = control('reader-status');
  const resultRoot = control('reader-result');
  const saveStatus = control('reader-save-status'); const offlineStatus = control('reader-offline-status');
  const updateStatus = control('reader-update-status');
  const offer = control('reader-update-offer');
  const applyButton = control<HTMLButtonElement>('apply-update-button'); const continueButton = control<HTMLButtonElement>('continue-update-button');
  let language: 'ms' | 'en' = 'ms';
  let catalogue: Catalogue | null = null;
  let memberId = ''; let sittingId = ''; let generation = 0; let disposed = false;
  let pending: AbortController | null = null;
  let result: TranscriptResult | null = null;
  let statusKey: keyof ReaderMessages | keyof PwaMessages = 'loadingCatalogue';
  let pairError = false; let pairRetryShown = false; let listRetryShown = false; let listGeneration = 0;
  let storage: ReaderStorage | null = null; let storageUnavailable = false; let hasSavedCatalogue = false;
  let priorSaved: TranscriptResult | null = null;
  let updateState: UpdateState = dependencies.updates?.getState() ?? { shellReady: false, waitingVersion: null, applying: false, failed: false };

  /** Reads one authoritative localized announcement across source and device states.
   * @param key Current reader or PWA announcement key.
   * @returns Its equivalent current-locale text.
   */
  function message(key: keyof ReaderMessages | keyof PwaMessages): string { return { ...getMessages(language), ...getPwaMessages(language) }[key]; }
  /** Captures valid current selections without deriving identities from labels.
   * @returns Current interface locale and accepted catalogue IDs or null.
   */
  function preferences(): ReaderPreferences {
    return { language, memberId: catalogue?.members.some(selectedMember) ? memberId : null, sittingId: catalogue?.sittings.some(selectedSitting) ? sittingId : null };
  }
  /** Commits lists and current preferences before an explicit update action.
   * @returns Completion only after the storage transaction commits.
   * @throws If storage is unavailable or the native commit fails.
   * @remarks Persists device state without changing any source time or transcript flag.
   */
  async function persistPreferences(): Promise<void> {
    if (!storage) throw new Error('Device storage is unavailable');
    await storage.saveState(catalogue, preferences()); hasSavedCatalogue = catalogue !== null;
  }
  /** Reports failure of device state access without altering valid online content.
   * @param _error Native storage failure.
   * @returns Nothing.
   * @remarks Changes only the local device-status notice while mounted.
   */
  function storageFailed(_error: unknown): void { if (!disposed) { storageUnavailable = true; renderPwa(); } }
  /** Renders independent committed-transcript, compatible-shell and waiting-update states.
   * @returns Nothing.
   * @remarks Updates stable status/control nodes without replacing focused controls.
   */
  function renderPwa(): void {
    const labels = getPwaMessages(language); const saved = result?.saved === true;
    const ready = saved && !storageUnavailable && hasSavedCatalogue && updateState.shellReady;
    const olderReady = priorSaved !== null && !storageUnavailable && hasSavedCatalogue && updateState.shellReady;
    saveStatus.textContent = storageUnavailable ? labels.storage : saved ? labels.saved : labels.unsaved;
    saveStatus.dataset.saved = String(saved);
    offlineStatus.textContent = ready ? labels.ready : olderReady ? labels.older : labels.limit;
    offlineStatus.dataset.offlineReady = String(ready);
    updateStatus.textContent = updateState.failed ? labels.updateFailed : '';
    offer.hidden = updateState.waitingVersion === null; offer.dataset.updateVersion = updateState.waitingVersion ?? '';
    applyButton.textContent = labels.apply; continueButton.textContent = labels.continue;
    applyButton.disabled = updateState.applying; continueButton.disabled = updateState.applying;
  }
  /** Observes actual update status independently of transcript transaction outcomes.
   * @param value Current native update-client state.
   * @returns Nothing.
   * @remarks Refreshes readiness/offer notices only while this reader remains mounted.
   */
  function updateChanged(value: UpdateState): void { if (!disposed) { updateState = value; renderPwa(); } }
  const unsubscribeUpdates = dependencies.updates?.subscribe(updateChanged);
  /** Applies only through the client after current preferences are committed.
   * @returns Completion after exact native acknowledgement or an honestly reported failure.
   * @remarks Does not reload or modify source data itself; the consenting client owns reload.
   */
  async function applyUpdate(): Promise<void> {
    try { await dependencies.updates?.apply(persistPreferences); }
    catch { if (!disposed) { updateState = dependencies.updates?.getState() ?? updateState; renderPwa(); } }
  }
  /** Continues reading without activation or an extra preference transaction.
   * @returns Nothing.
   * @remarks Dismisses only this client's waiting offer and retains the result and control nodes.
   */
  function continueUpdate(): void { dependencies.updates?.continue(); }

  /**
   * Emits native UserTiming without collecting telemetry.
   * @param name Stable timing endpoint.
   * @returns Nothing.
   * @remarks Calls the injected timing boundary or browser performance.mark.
   */
  function mark(name: string): void { if (dependencies.mark) dependencies.mark(name); else performance.mark(name); }

  /**
   * Ends an interaction after a browser paint opportunity, with controlled unit injection.
   * @returns Resolves after the real browser's next two animation frames or injected boundary.
   * @remarks Schedules browser animation frames and emits an interaction completion mark.
   */
  async function finishInteraction(): Promise<void> {
    if (dependencies.requestPaint) await dependencies.requestPaint();
    else await new Promise<void>(
      /** Schedules the first pre-paint callback. @param resolve Promise completion. @returns Nothing. @remarks Schedules browser frames; these are paint opportunities, not physical-device evidence. */
      (resolve) => requestAnimationFrame(
        /** Schedules completion in the frame after the initial rendering opportunity. @returns Nothing. @remarks Schedules one additional browser animation frame. */
        () => { requestAnimationFrame(
          /** Completes after the previous frame's rendering opportunity. @returns Nothing. @remarks Resolves the captured interaction promise. */
          () => { resolve(); },
        ); },
      ),
    );
    if (!disposed) mark('hansard.interaction-end');
  }

  /** Creates a local text-only element. @param tag HTML element name. @param text Exact label or source string. @returns The unattached native element. */
  function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
    const node = doc.createElement(tag); node.textContent = text; return node;
  }

  /** Formats supplied sitting context without deriving membership. @param sitting Supplied dated source sitting. @returns Localized hierarchy labels with unchanged identity values. */
  function sittingLabel(sitting: Catalogue['sittings'][number]): string {
    const labels = getMessages(language);
    return `${sitting.date} · ${labels.parliament} ${sitting.parliament} · ${labels.penggal} ${sitting.penggal} · ${labels.mesyuarat} ${sitting.mesyuarat}`;
  }

  /**
   * Rebuilds option contents while preserving native control nodes and valid selections.
   * @returns Nothing.
   * @remarks Replaces only option children and catalogue coverage text; names/IDs are unchanged.
   */
  function renderChoices(): void {
    const labels = getMessages(language);
    memberSelect.replaceChildren(element('option', labels.member)); memberSelect.options[0].value = '';
    sittingSelect.replaceChildren(element('option', labels.sitting)); sittingSelect.options[0].value = '';
    if (catalogue) {
      const query = search.value.toLowerCase();
      for (const member of catalogue.members) {
        if (!member.name.toLowerCase().includes(query) && member.id !== memberId) continue;
        const option = element('option', `${member.name} · ${labels.sourceId} ${member.id} · ${member.historicalContext ?? labels.historyUnavailable}`);
        option.value = member.id; memberSelect.append(option);
      }
      for (const sitting of catalogue.sittings) {
        const option = element('option', sittingLabel(sitting)); option.value = sitting.id; sittingSelect.append(option);
      }
      control('reader-coverage').textContent = `${labels.coverage}: ${catalogue.coverage.startDate ?? labels.unknownTime} — ${catalogue.coverage.endDate ?? labels.unknownTime} · ${labels.sitting}: ${catalogue.sittings.length}`;
    }
    memberSelect.value = memberId; sittingSelect.value = sittingId;
    memberSelect.disabled = !catalogue; sittingSelect.disabled = !catalogue; readButton.disabled = !catalogue;
  }

  /**
   * Appends one complete original source item as text, retaining every meaningful location.
   * @param target Category container for this item.
   * @param item Validated authoritative source item.
   * @param kind Display category; does not reclassify source attribution.
   * @returns Nothing.
   * @remarks Appends native DOM text/metadata nodes only to the supplied category container.
   */
  function appendItem(target: HTMLElement, item: SourceItem, kind: 'turn' | 'gap' | 'annotation'): void {
    const labels = getMessages(language);
    const article = element('article'); article.dataset.kind = kind; article.dataset.sourceItemId = String(item.ordinal);
    if (item.sourceIndex !== null) article.dataset.sourceIndex = String(item.sourceIndex);
    if (item.sectionPath.length > 0) article.append(element('h4', item.sectionPath.join(' › ')));
    article.append(element('p', item.rawAuthor ?? labels.unknownTime));
    article.append(element('p', `${labels.sourceId}: ${item.sourceAuthorId ?? labels.unknownTime} · ${labels.index}: ${item.sourceIndex ?? labels.unknownTime} · ${labels.time}: ${item.timestamp ?? labels.unknownTime}`));
    const text = element('p', item.text); text.className = 'source-text'; article.append(text); target.append(article);
  }

  /**
   * Renders the complete validated result with nullable provenance and reachable source gaps.
   * @returns Nothing.
   * @remarks Replaces the result region only; controls and keyboard focus remain intact.
   */
  function renderResult(): void {
    renderPwa();
    resultRoot.replaceChildren();
    for (const name of ['data-member-id', 'data-sitting-id', 'data-result-complete', 'data-outcome']) resultRoot.removeAttribute(name);
    const member = result?.member ?? (pairError ? catalogue?.members.find(selectedMember) : undefined);
    const sitting = result?.sitting ?? (pairError ? catalogue?.sittings.find(selectedSitting) : undefined);
    if (!member || !sitting) return;
    const snapshot = result?.snapshot ?? catalogue!;
    const labels = getMessages(language);
    resultRoot.dataset.memberId = member.id; resultRoot.dataset.sittingId = sitting.id;
    if (result) resultRoot.dataset.outcome = result.outcome;
    resultRoot.append(element('h2', `${member.name} · ${labels.sourceId} ${member.id}`), element('p', sittingLabel(sitting)));
    resultRoot.append(element('p', sitting.isFinal === null ? labels.statusUnavailable : sitting.isFinal ? labels.final : labels.draft));
    const source = element('a', labels.source); source.href = sitting.sourceUrl; source.dataset.role = 'source'; resultRoot.append(source);
    /** Appends a labeled nullable provenance value. @param field Semantic field ID. @param label Localized label. @param value Supplied value or unavailable null. @returns Nothing. @remarks Appends to the captured result region. */
    function detail(field: string, label: string, value: string | null): void {
      const node = element('p', `${label}: ${value ?? labels.unknownTime}`); node.dataset.field = field; resultRoot.append(node);
    }
    detail('acquired-at', labels.sourceAcquired, sitting.record.acquiredAt);
    detail('prepared-at', labels.snapshotPrepared, snapshot.preparedAt);
    detail('published-at', labels.sitePublished, snapshot.publishedAt);
    detail('refreshed-at', labels.deviceRefreshed, result?.refreshedAt ?? null);
    const pwa = getPwaMessages(language);
    if (result?.saved) detail('saved-refreshed-at', pwa.savedRefreshedAt, result.refreshedAt);
    else if (priorSaved) detail('prior-saved-refreshed-at', pwa.priorSavedRefreshedAt, priorSaved.refreshedAt);
    const historical = element('p', member.historicalContext ?? labels.historyUnavailable); historical.dataset.field = 'historical-context';
    const published = element('p', sitting.record.sourcePublishedAt ?? labels.officialPublishedUnavailable); published.dataset.field = 'source-published';
    const revised = element('p', sitting.record.sourceRevisedAt ?? labels.officialRevisedUnavailable); revised.dataset.field = 'source-revised';
    resultRoot.append(historical, published, revised);
    const recovery = getRecoveryMessages(language);
    const sourceStatus = publishedSourceStatus({ sitting, snapshot }, dependencies.now?.() ?? new Date().toISOString());
    /** Appends snapshot-scoped status text without changing classification. @param role Semantic notice role. @param text Localized truthful notice. @returns Nothing. @remarks Appends a text node to the captured result region. */
    function notice(role: string, text: string): void { const node = element('p', text); node.dataset.role = role; resultRoot.append(node); }
    if (sourceStatus.overdue) notice('source-overdue', recovery.overdue);
    if (sourceStatus.knownFailureAt) notice('known-source-failure', `${recovery.knownSourceFailure} ${sourceStatus.knownFailureAt}`);
    if (sourceStatus.workflowUrl) { const evidence = element('a', recovery.pipelineEvidence); evidence.dataset.role = 'pipeline-evidence'; evidence.href = sourceStatus.workflowUrl; resultRoot.append(evidence); }
    notice('static-knowledge-limit', recovery.staticKnowledgeLimit);
    if (!result) return;
    if (result.outcome === 'incomplete') {
      const notice = element('p', labels.gapsIntro); notice.className = 'notice'; resultRoot.append(notice);
      if (result.turns.length === 0) resultRoot.append(element('p', labels.noMatchedGap));
    } else if (result.outcome === 'verified-absence') resultRoot.append(element('p', labels.verifiedAbsence));
    else if (result.outcome === 'unavailable') resultRoot.append(element('p', labels.unavailable));
    resultRoot.append(element('h3', labels.turns));
    for (const item of result.turns) appendItem(resultRoot, item, 'turn');
    for (const category of ['gaps', 'annotations'] as const) {
      const disclosure = element('details'); disclosure.dataset.category = category;
      disclosure.append(element('summary', labels[category]));
      for (const item of result[category]) appendItem(disclosure, item, category === 'gaps' ? 'gap' : 'annotation');
      resultRoot.append(disclosure);
    }
    resultRoot.dataset.resultComplete = 'true';
  }

  /** Matches the selected exact source identity in an accepted catalogue. @param member Supplied catalogue identity. @returns Whether its ID is selected. */
  function selectedMember(member: Catalogue['members'][number]): boolean { return member.id === memberId; }
  /** Matches the selected exact sitting in an accepted catalogue. @param sitting Supplied catalogue sitting. @returns Whether its ID is selected. */
  function selectedSitting(sitting: Catalogue['sittings'][number]): boolean { return sitting.id === sittingId; }

  /**
   * Updates equivalent labels while retaining source identities, words and control focus.
   * @returns Nothing.
   * @remarks Changes document language, labels, option contents and current result presentation.
   */
  function renderLabels(): void {
    const labels = getMessages(language); doc.documentElement.lang = language;
    control('reader-title').textContent = labels.title; control('reader-description').textContent = labels.description;
    for (const [id, key] of [['language-select', 'language'], ['member-search', 'search'], ['member-select', 'member'], ['sitting-select', 'sitting']] as const) root.querySelector(`label[for="${id}"]`)!.textContent = labels[key];
    readButton.textContent = labels.read; languageSelect.value = language; status.textContent = message(statusKey);
    const recovery = getRecoveryMessages(language); retryButton.textContent = recovery.retry; retryCatalogueButton.textContent = recovery.retryCatalogue;
    const help = control<HTMLAnchorElement>('reader-help'); help.textContent = labels.help; help.href = `./help.html#${language}`;
    renderChoices(); renderResult();
  }

  /**
   * Displays one localized reader-state announcement without focusing it.
   * @param key Authoritative label key for the observed state.
   * @returns Nothing.
   * @remarks Updates the live-region message and local announcement state.
   */
  function announce(key: keyof ReaderMessages | keyof PwaMessages): void {
    statusKey = key; status.textContent = message(key);
    retryButton.hidden = !pairRetryShown; retryCatalogueButton.hidden = !listRetryShown;
  }

  /**
   * Invalidates old reads immediately after either source selection changes.
   * @returns Nothing.
   * @remarks Advances request generation, aborts the old request and clears previous-pair DOM.
   */
  function selectionChanged(): void {
    mark('hansard.interaction-start'); memberId = memberSelect.value; sittingId = sittingSelect.value;
    generation++; pending?.abort(); result = null; priorSaved = null; pairError = false; pairRetryShown = false; renderResult(); announce('chooseBoth');
    if (storage) void persistPreferences().catch(storageFailed); void finishInteraction();
  }

  /**
   * Changes only interface language, preserving valid source selections and pending requests.
   * @returns Nothing.
   * @remarks Updates labels and schedules an interaction completion after paint.
   */
  function languageChanged(): void { mark('hansard.interaction-start'); language = languageSelect.value === 'en' ? 'en' : 'ms'; renderLabels(); if (storage) void persistPreferences().catch(storageFailed); void finishInteraction(); }

  /** Filters choices by source name without resolving identity from text. @returns Nothing. @remarks Updates only native option contents. */
  function searchChanged(): void { mark('hansard.interaction-start'); renderChoices(); void finishInteraction(); }

  /**
   * Requests one valid snapshotted pair and rejects obsolete completions including same-pair retries.
   * @param event Native submit event.
   * @returns Resolves after the request completes or is ignored as obsolete.
   * @remarks Prevents navigation, aborts the previous request and updates loading/result announcements. Successful Retry returns focus to Read only when the disappearing Retry held focus.
   */
  async function readPair(event: Event): Promise<void> {
    event.preventDefault(); mark('hansard.interaction-start');
    let memberExists = false; let sittingExists = false;
    for (const member of catalogue?.members ?? []) if (member.id === memberId) memberExists = true;
    for (const sitting of catalogue?.sittings ?? []) if (sitting.id === sittingId) sittingExists = true;
    if (!memberExists || !sittingExists) { announce('chooseBoth'); void finishInteraction(); return; }
    const selectedMember = memberId; const selectedSitting = sittingId; const request = ++generation;
    let fallback = result?.saved && result.memberId === selectedMember && result.sittingId === selectedSitting ? result : null;
    pending?.abort(); pending = new AbortController(); result = fallback; priorSaved = fallback; pairError = false; renderResult(); announce('loading'); void finishInteraction();
    let incompatible = false;
    if (storage) {
      try {
        const saved = await storage.readPair(selectedMember, selectedSitting); if (disposed || request !== generation) return;
        fallback = saved.status === 'saved' && saved.result.memberId === selectedMember && saved.result.sittingId === selectedSitting ? saved.result : null;
        incompatible = saved.status === 'incompatible'; priorSaved = fallback; result = fallback; renderResult();
      } catch (error) { if (disposed || request !== generation) return; storageFailed(error); }
    }
    if (fallback) mark('hansard.reader-ready');
    if (dependencies.online?.() === false) {
      result = fallback; pairRetryShown = !fallback; renderResult();
      announce(fallback ? 'resultsReady' : incompatible ? 'incompatible' : 'connection');
      return;
    }
    try {
      const accepted = await dependencies.loadPair(selectedMember, selectedSitting, pending.signal);
      if (disposed || request !== generation) return;
      if (accepted.result.memberId !== selectedMember || accepted.result.sittingId !== selectedSitting) { failPair(); return; }
      catalogue = accepted.catalogue; result = accepted.result; pairRetryShown = false;
      if (doc.activeElement === retryButton) readButton.focus();
      renderChoices(); renderResult(); announce(result.outcome === 'unavailable' ? 'unavailable' : 'resultsReady');
      if (storage) {
        const opened = result;
        try {
          const saved = await storage.savePair(accepted.catalogue, opened, preferences());
          if (disposed || request !== generation) return;
          result = saved; priorSaved = null; hasSavedCatalogue = true; storageUnavailable = false; renderResult();
        } catch { if (!disposed && request === generation) renderResult(); }
      }
      if (!disposed && request === generation) mark('hansard.reader-ready');
    } catch {
      if (!disposed && request === generation) {
        result = fallback; pairError = !fallback; pairRetryShown = true; renderResult(); announce(fallback ? 'error' : incompatible ? 'incompatible' : 'error');
        if (fallback) mark('hansard.reader-ready');
      }
    }
  }

  /** Presents a current site-data failure with known source context and a native retry. @returns Nothing. @remarks Sets only reader error state, renders accepted catalogue metadata and updates the live region. */
  function failPair(): void { result = null; pairError = true; pairRetryShown = true; renderResult(); announce('error'); }

  /**
   * Loads the full validated catalogue before announcing usable choices.
   * @returns Resolves after initial loading succeeds or the explicit list error is displayed.
   * @remarks Updates choices/announcements and emits readiness only after the controls are populated.
   * Completed list Retry returns focus to search only when the disappearing Retry held focus.
   */
  async function initialize(): Promise<void> {
    const request = ++listGeneration; announce('loadingCatalogue');
    if (dependencies.openStorage && !storage) {
      try {
        const opened = await dependencies.openStorage(); if (disposed) { opened.close(); return; } storage = opened;
        const saved = await storage.readState(); if (disposed || request !== listGeneration) return;
        catalogue = saved.catalogue; hasSavedCatalogue = saved.catalogue !== null;
        if (saved.preferences) { language = saved.preferences.language; memberId = saved.preferences.memberId ?? ''; sittingId = saved.preferences.sittingId ?? ''; }
        renderLabels();
        if (catalogue) mark('hansard.catalogue-ready');
        if (catalogue?.members.some(selectedMember) && catalogue.sittings.some(selectedSitting)) {
          const restoredMember = memberId; const restoredSitting = sittingId; const restoredGeneration = generation;
          const pair = await storage.readPair(restoredMember, restoredSitting);
          if (disposed || request !== listGeneration) return;
          if (restoredGeneration === generation && pair.status === 'saved' && pair.result.memberId === restoredMember && pair.result.sittingId === restoredSitting) {
            result = pair.result; renderResult(); mark('hansard.reader-ready');
          }
        }
      } catch (error) { storageFailed(error); }
    }
    try {
      const accepted = await dependencies.loadCatalogue(); if (disposed || request !== listGeneration) return;
      catalogue = accepted; listRetryShown = false;
      if (doc.activeElement === retryCatalogueButton) search.focus();
      renderChoices(); announce('chooseBoth'); mark('hansard.catalogue-ready');
      if (storage) { try { await persistPreferences(); } catch (error) { storageFailed(error); } }
    } catch {
      if (disposed || request !== listGeneration) return;
      listRetryShown = true;
      if (!catalogue) { announce(dependencies.online?.() === false ? 'firstVisit' : 'error'); return; }
      renderChoices(); announce('chooseBoth'); mark('hansard.catalogue-ready');
    }
    if (disposed || request !== listGeneration) return;
    if (catalogue?.members.some(selectedMember) && catalogue.sittings.some(selectedSitting)) await readPair(new Event('submit'));
    else mark('hansard.reader-ready');
  }

  renderLabels();
  form.addEventListener('submit', readPair); memberSelect.addEventListener('change', selectionChanged); sittingSelect.addEventListener('change', selectionChanged);
  retryButton.addEventListener('click', readPair); retryCatalogueButton.addEventListener('click', initialize);
  applyButton.addEventListener('click', applyUpdate); continueButton.addEventListener('click', continueUpdate);
  languageSelect.addEventListener('change', languageChanged); search.addEventListener('input', searchChanged); void initialize();
  /**
   * Disposes this concrete reader without modifying shared saved data or workers.
   * @returns Nothing.
   * @remarks Cancels pending reads, unregisters control listeners and removes this root's children.
   */
  function cleanup(): void {
    disposed = true; generation++; pending?.abort(); form.removeEventListener('submit', readPair);
    retryButton.removeEventListener('click', readPair); retryCatalogueButton.removeEventListener('click', initialize);
    applyButton.removeEventListener('click', applyUpdate); continueButton.removeEventListener('click', continueUpdate);
    memberSelect.removeEventListener('change', selectionChanged); sittingSelect.removeEventListener('change', selectionChanged);
    languageSelect.removeEventListener('change', languageChanged); search.removeEventListener('input', searchChanged);
    unsubscribeUpdates?.(); dependencies.updates?.close(); storage?.close(); root.replaceChildren();
  }
  return cleanup;
}

const app = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('#app');
if (app) void startReader(app);

/** Starts the actual website with independent native storage and nonblocking worker registration.
 * @param root Actual application DOM root.
 * @returns Completion after mounting, without waiting for a pending native registration.
 * @remarks Mounts the reader and connects base-scoped native persistence/update boundaries.
 */
async function startReader(root: HTMLElement): Promise<void> {
  const baseUrl = new URL('./', root.ownerDocument.baseURI).href;
  const version = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="hansard-shell-version"]')?.content;
  const updates = version && /^[a-f0-9]{64}$/.test(version) ? await connectUpdates({ baseUrl, version, serviceWorker: root.ownerDocument.defaultView?.navigator.serviceWorker ?? null }) : undefined;
  mountReader(root, {
    /** Fetches the published catalogue at this application base. @returns Validated catalogue. @throws Propagates static retrieval/validation errors. */
    loadCatalogue: () => loadPublishedCatalogue({ baseUrl }),
    /** Fetches one coherent selected pair. @param memberId Selected source ID. @param sittingId Selected sitting ID. @param signal Pending request cancellation. @returns Validated published pair. @throws Propagates static retrieval/validation errors. */
    loadPair: (memberId, sittingId, signal) => loadPublishedPair({ baseUrl, memberId, sittingId, signal }),
    /** Opens only this origin/base's native saved-reader namespace. @returns Committed device storage. @throws Native availability/open failures without blocking later source reading. */
    openStorage: () => openStorage({ baseUrl }),
    /** Reports native connectivity as a limit, never as source participation. @returns Whether the browser currently reports a network connection. */
    online: () => root.ownerDocument.defaultView?.navigator.onLine !== false,
    updates,
  });
}
