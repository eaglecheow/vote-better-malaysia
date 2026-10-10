// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { mountReader, type ReaderDependencies } from '../../src/main.ts';
import { buildTranscriptResult } from '../../src/source.ts';
import { getMessages } from '../../src/messages.ts';
import { readerFixture, type ReaderFixture } from '../fixtures/reader.ts';

/**
 * Returns an independently controlled pending request and its explicit completion boundary.
 * @returns A promise and resolver, with no reader or request-generation behavior.
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(
    /** Captures the controlled resolver. @param callback Promise resolver. @returns Nothing. @remarks Sets only the local resolver binding. */
    (callback) => { resolve = callback; },
  );
  return { promise, resolve };
}

/**
 * Advances event-handler promises without relying on production readiness or assertions.
 * @returns A promise resolved on the next timer task.
 */
async function settle(): Promise<void> {
  await new Promise<void>(
    /** Schedules the next task. @param resolve Promise completion callback. @returns Nothing. @remarks Schedules one zero-delay test timer. */
    (resolve) => { setTimeout(resolve, 0); },
  );
}

/**
 * Supplies empty controls as inert test scaffolding, allowing events before reader implementation exists.
 * @param mode Explicit source excerpt or synthetic reader fixture branch.
 * @param overrides Controlled request/timing dependencies; never render feature behavior.
 * @returns Test root, coherent source fixture, timing names, and production teardown boundary.
 * @remarks Replaces only this test's document body and sets its initial language deliberately to English.
 */
async function setup(mode: Parameters<typeof readerFixture>[0] = 'gaps', overrides: Partial<ReaderDependencies> = {}) {
  const fixture = readerFixture(mode);
  const root = document.createElement('main');
  document.body.replaceChildren(root);
  document.documentElement.lang = 'en';
  root.innerHTML = '<label for="member-search"></label><input id="member-search"><label for="member-select"></label><select id="member-select"><option value=""></option></select><label for="sitting-select"></label><select id="sitting-select"><option value=""></option></select><label for="language-select"></label><select id="language-select"><option value="ms"></option><option value="en"></option></select><button id="read-button"></button><p id="reader-status"></p><section id="reader-result"></section><a id="reader-help"></a>';
  for (const member of fixture.catalogue.members) {
    const option = document.createElement('option'); option.value = member.id;
    root.querySelector('#member-select')!.append(option);
  }
  for (const sitting of fixture.catalogue.sittings) {
    const option = document.createElement('option'); option.value = sitting.id;
    root.querySelector('#sitting-select')!.append(option);
  }
  const marks: string[] = [];
  const dependencies: ReaderDependencies = {
    /** Returns fixture catalogue only. @returns Accepted controlled catalogue. */
    loadCatalogue: async () => fixture.catalogue,
    /** Returns the explicit fixture pair. @param _memberId Requested member. @param _sittingId Requested sitting. @returns Accepted controlled pair. */
    loadPair: async (_memberId, _sittingId) => ({ catalogue: fixture.catalogue, result: fixture.result }),
    /** Records a timing name. @param name UserTiming identifier. @returns Nothing. @remarks Appends to this test's local mark list. */
    mark: (name) => { marks.push(name); },
    /** Provides an immediate controlled paint boundary. @returns A resolved promise; this is not actual paint evidence. */
    requestPaint: async () => {},
    ...overrides,
  };
  const cleanup = mountReader(root, dependencies);
  await settle();
  return { root, fixture, marks, cleanup };
}

/**
 * Finds a known native control without a null dereference masking behavioral RED.
 * @param root Isolated reader root.
 * @param id Stable control or result ID.
 * @returns The requested test control.
 */
function control<T extends HTMLElement>(root: HTMLElement, id: string): T {
  const element = root.querySelector(`#${id}`);
  expect(element).not.toBeNull();
  return element as T;
}

/**
 * Sends a real native change event for a controlled selection or language value.
 * @param root Reader root.
 * @param id Native select control ID.
 * @param value Exact selected source ID or language code.
 * @returns Nothing.
 * @remarks Changes only the selected control value and dispatches its event.
 */
function choose(root: HTMLElement, id: string, value: string): void {
  const select = control<HTMLSelectElement>(root, id);
  select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Selects a known pair and requests the actual reader action.
 * @param root Reader root.
 * @param memberId Exact selected source identity; defaults to the recent known source speaker.
 * @returns A promise after event-handler tasks can complete.
 */
async function read(root: HTMLElement, memberId = '1839'): Promise<void> {
  choose(root, 'member-select', memberId); choose(root, 'sitting-select', '29326');
  control<HTMLButtonElement>(root, 'read-button').click(); await settle();
}

/**
 * Returns exact rendered source strings for one semantic category in DOM order.
 * @param root Reader root.
 * @param kind Selected turn, gap or source annotation category.
 * @returns Original displayed text values, with no inference or normalization.
 */
function texts(root: HTMLElement, kind: 'turn' | 'gap' | 'annotation'): string[] {
  const values: string[] = [];
  for (const element of root.querySelectorAll(`[data-kind="${kind}"] .source-text`)) values.push(element.textContent ?? '');
  return values;
}

test('READER001: first visit defaults to BM with labeled native controls and equivalent language choices',
  /** Checks initial controls and default language. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    expect(document.documentElement.lang).toBe('ms');
    expect(control(root, 'read-button').textContent).toBe('Baca');
    for (const id of ['member-search', 'member-select', 'sitting-select', 'language-select']) expect(root.querySelector(`label[for="${id}"]`)?.textContent).not.toBe('');
    expect(control<HTMLSelectElement>(root, 'language-select').options[1].textContent).toBe('English');
  });

test('READER002: similar source names stay distinct with exact IDs and supplied historical context',
  /** Checks display disambiguation without merging names or inferring history. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    const select = control<HTMLSelectElement>(root, 'member-select');
    expect(select.querySelector('option[value="1839"]')?.textContent).toContain('1839');
    expect(select.querySelector('option[value="1"]')?.textContent).toContain('Explicit historical source context');
    expect(select.querySelector('option[value="1"]')?.textContent).toContain('1');
  });

test('READER003: name search filters source choices without changing their IDs or names',
  /** Checks native searchable selection against distinct source IDs. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    const search = control<HTMLInputElement>(root, 'member-search'); search.value = 'lIm'; search.dispatchEvent(new Event('input', { bubbles: true }));
    const values: string[] = [];
    for (const option of control<HTMLSelectElement>(root, 'member-select').options) if (option.value) values.push(option.value);
    expect(values).toEqual(['1839', '1']);
  });

test('READER004: all dated sitting choices remain selectable including unavailable records and Mesyuarat 0',
  /** Checks full supplied catalogue choices and source hierarchy labels. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    const select = control<HTMLSelectElement>(root, 'sitting-select');
    expect(select.querySelector('option[value="29326"]')?.textContent).toContain('2026-02-10');
    expect(select.querySelector('option[value="26241"]')?.textContent).toContain('Mesyuarat 0');
    expect(select.querySelector('option[value="26241"]')?.hasAttribute('disabled')).toBe(false);
  });

test.each(['both', 'member', 'sitting'])('READER005: missing %s selection is identified without a pair request',
  /** Checks required valid selection feedback. @param missing Missing controlled selection category. @returns Resolves after assertions. */
  async (missing) => {
    const loadPair = vi.fn<ReaderDependencies['loadPair']>();
    const { root } = await setup('gaps', { loadPair });
    if (missing === 'member') choose(root, 'sitting-select', '29326');
    if (missing === 'sitting') choose(root, 'member-select', '1839');
    control<HTMLButtonElement>(root, 'read-button').click(); await settle();
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').chooseBoth);
    expect(loadPair).not.toHaveBeenCalled();
  });

test('READER006: valid Read shows loading and calls only the exact selected pair',
  /** Checks loading/valid pair behavior with a pending request. @returns Resolves after assertions. */
  async () => {
    const pending = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>();
    const loadPair = vi.fn<ReaderDependencies['loadPair']>(
      /** Returns the controlled pending pair. @returns Pending pair promise. */
      () => pending.promise,
    );
    const { root } = await setup('gaps', { loadPair }); await read(root);
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').loading);
    expect(loadPair).toHaveBeenCalledWith('1839', '29326', expect.any(AbortSignal));
  });

test('READER007: attributed turns preserve every exact word, paragraph, heading, source index and time',
  /** Checks complete ordered selected source content and provenance location. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup(); await read(root);
    const expected: string[] = []; for (const item of fixture.result.turns) expected.push(item.text);
    expect(texts(root, 'turn')).toEqual(expected);
    expect(root.querySelector('[data-kind="turn"]')?.textContent).toContain('WAKTU PERTANYAAN-PERTANYAAN MENTERI');
    expect(root.querySelector('[data-kind="turn"]')?.getAttribute('data-source-index')).toBe('7');
    expect(root.querySelector('[data-kind="turn"]')?.textContent).toContain('1010');
  });

test('READER008: known missing-ID question is an accessible original-text gap and never assigned by its visible name',
  /** Checks the source-derived missing-ID index 2 remains reachable in the reader. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup(); await read(root);
    const expected = fixture.result.gaps[1];
    expect(root.querySelector('[data-kind="gap"][data-source-index="2"] .source-text')?.textContent).toBe(expected.text);
    expect(root.querySelector('details[data-category="gaps"] summary')?.textContent).toBe(getMessages('ms').gaps);
    expect(control(root, 'reader-result').getAttribute('data-outcome')).toBe('incomplete');
  });

test('READER009: every gap and annotation retains its original words and source order separately',
  /** Checks complete separate rendering rather than omitting unfamiliar or procedural content. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup(); await read(root);
    const gaps: string[] = []; const annotations: string[] = [];
    for (const item of fixture.result.gaps) gaps.push(item.text);
    for (const item of fixture.result.annotations) annotations.push(item.text);
    expect(texts(root, 'gap')).toEqual(gaps); expect(texts(root, 'annotation')).toEqual(annotations);
    expect(root.querySelector('details[data-category="annotations"] summary')?.textContent).toBe(getMessages('ms').annotations);
  });

test.each([['ready', 'ready', '1839'], ['absence', 'verified-absence', '22462'], ['unavailable', 'unavailable', '1839']] as const)('READER010: controlled %s stays a distinct semantic result',
  /** Checks controlled outcomes without claiming real-source absence. @param mode Controlled fixture branch. @param outcome Required semantic result. @param memberId Exact selected identity. @returns Resolves after assertions. */
  async (mode, outcome, memberId) => {
    const { root } = await setup(mode); await read(root, memberId);
    expect(control(root, 'reader-result').getAttribute('data-outcome')).toBe(outcome);
    expect(control(root, 'reader-result').getAttribute('data-result-complete')).toBe('true');
  });

test('READER011: empty attributed subset with source gaps stays incomplete and retains all gap passages',
  /** Checks an empty selected subset cannot establish absence when source attribution is unresolved. @returns Resolves after assertions. */
  async () => {
    const fixture = readerFixture();
    const result = buildTranscriptResult(fixture.catalogue, '22462', '29326', fixture.record, '2026-10-10T06:00:00.000Z');
    const { root } = await setup('gaps', {
      /** Returns an incomplete empty subset. @returns Controlled exact pair and catalogue. */
      loadPair: async () => ({ catalogue: fixture.catalogue, result }),
    }); await read(root, '22462');
    expect(control(root, 'reader-result').getAttribute('data-outcome')).toBe('incomplete');
    expect(texts(root, 'gap')).toHaveLength(2); expect(control(root, 'reader-result').textContent).toContain(getMessages('ms').noMatchedGap);
  });

test('READER012: pair/source identity, draft status and official link are visible with exact context',
  /** Checks selected identities and official source context are never inferred from labels. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup(); await read(root);
    const result = control(root, 'reader-result');
    expect(result.getAttribute('data-member-id')).toBe('1839'); expect(result.getAttribute('data-sitting-id')).toBe('29326');
    expect(result.textContent).toContain('LIM GUAN ENG'); expect(result.textContent).toContain('Parlimen 15'); expect(result.textContent).toContain(getMessages('ms').draft);
    expect(result.querySelector('a[data-role="source"]')?.getAttribute('href')).toBe('https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10');
  });

test('READER013: successful source, snapshot and device times keep distinct truthful labels',
  /** Checks dated source/result provenance and unavailable confirmed publication. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup(); await read(root);
    expect(root.querySelector('[data-field="acquired-at"]')?.textContent).toContain(fixture.result.sitting.record.acquiredAt!);
    expect(root.querySelector('[data-field="prepared-at"]')?.textContent).toContain(fixture.result.snapshot.preparedAt);
    expect(root.querySelector('[data-field="refreshed-at"]')?.textContent).toContain(fixture.result.refreshedAt!);
    expect(root.querySelector('[data-field="published-at"]')?.textContent).toContain(getMessages('ms').unknownTime);
  });

test('READER014: unavailable historical membership and official dates are explicit rather than label-derived',
  /** Checks three missing source metadata notices independently. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup(); await read(root);
    expect(root.querySelector('[data-field="historical-context"]')?.textContent).toBe(getMessages('ms').historyUnavailable);
    expect(root.querySelector('[data-field="source-published"]')?.textContent).toBe(getMessages('ms').officialPublishedUnavailable);
    expect(root.querySelector('[data-field="source-revised"]')?.textContent).toBe(getMessages('ms').officialRevisedUnavailable);
  });

test('READER015: untrusted transcript and author strings are text nodes with exact bytes rather than executable markup',
  /** Checks controlled hostile source words are safely and faithfully rendered. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup('untrusted'); await read(root);
    expect(texts(root, 'turn')).toEqual([fixture.result.turns[0].text]);
    expect(root.querySelector('[data-kind="turn"] .source-text')?.innerHTML).toContain('&lt;img');
    expect(root.querySelector('#reader-result img, #reader-result script')).toBeNull();
  });

test('READER016: language switching preserves selected source IDs, every transcript byte, and focus',
  /** Checks equivalent English labels with unchanged source content and identity selections. @returns Resolves after assertions. */
  async () => {
    const { root, fixture } = await setup(); await read(root);
    const language = control<HTMLSelectElement>(root, 'language-select'); language.focus(); choose(root, 'language-select', 'en'); await settle();
    expect(control(root, 'read-button').textContent).toBe('Read'); expect(document.documentElement.lang).toBe('en');
    expect(control<HTMLSelectElement>(root, 'member-select').value).toBe('1839'); expect(control<HTMLSelectElement>(root, 'sitting-select').value).toBe('29326');
    expect(texts(root, 'turn')).toEqual([fixture.result.turns[0].text]); expect(document.activeElement).toBe(language);
  });

test('READER017: loading and results announce through a polite live region without moving Read focus',
  /** Checks visible native control focus and live-region semantics. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    choose(root, 'member-select', '1839'); choose(root, 'sitting-select', '29326');
    const button = control<HTMLButtonElement>(root, 'read-button'); button.focus(); button.click(); await settle();
    expect(control(root, 'reader-status').getAttribute('role')).toBe('status'); expect(control(root, 'reader-status').getAttribute('aria-live')).toBe('polite');
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').resultsReady); expect(document.activeElement).toBe(button);
  });

test.each(['member-select', 'sitting-select'])('READER018: changing %s clears the old result before another request',
  /** Checks current controls never silently retain the previous pair's content. @param id Changed selection control. @returns Resolves after assertions. */
  async (id) => {
    const { root } = await setup(); await read(root);
    choose(root, id, id === 'member-select' ? '4463' : '26241'); await settle();
    expect(control(root, 'reader-result').getAttribute('data-member-id')).toBeNull();
    expect(control(root, 'reader-result').textContent).toBe('');
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').chooseBoth);
  });

test('READER019: a late old response cannot replace the newer selected pair',
  /** Checks out-of-order completion with independent controlled request promises. @returns Resolves after assertions. */
  async () => {
    const old = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>();
    const current = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>();
    const fixture = readerFixture();
    const currentResult = buildTranscriptResult(fixture.catalogue, '4463', '29326', fixture.record, '2026-10-10T06:00:00.000Z');
    const { root } = await setup('gaps', {
      /** Chooses an isolated request by exact member ID. @param memberId Requested identity. @returns Its controlled pending pair. */
      loadPair: (memberId) => memberId === '1839' ? old.promise : current.promise,
    });
    await read(root); await read(root, '4463');
    current.resolve({ catalogue: fixture.catalogue, result: currentResult }); await settle();
    old.resolve({ catalogue: fixture.catalogue, result: fixture.result }); await settle();
    expect(control(root, 'reader-result').getAttribute('data-member-id')).toBe('4463'); expect(texts(root, 'turn')).toEqual(['Ya.']);
  });

test('READER020: switching language during a pending request retains IDs and renders its result in the chosen UI language',
  /** Checks UI locale never invalidates or relabels source pair identity. @returns Resolves after assertions. */
  async () => {
    const pending = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>(); const fixture = readerFixture();
    const { root } = await setup('gaps', {
      /** Returns one controlled pending pair. @returns Pending result promise. */
      loadPair: () => pending.promise,
    });
    await read(root); choose(root, 'language-select', 'en'); pending.resolve({ catalogue: fixture.catalogue, result: fixture.result }); await settle();
    expect(control(root, 'reader-status').textContent).toBe(getMessages('en').resultsReady); expect(texts(root, 'turn')).toEqual([fixture.result.turns[0].text]);
  });

test('READER021: readiness marks follow populated controls and interaction ends after the supplied paint boundary',
  /** Checks actual reader timing endpoints without claiming the controlled paint callback is a browser paint. @returns Resolves after assertions. */
  async () => {
    const paint = deferred<void>();
    const { root, marks } = await setup('gaps', {
      /** Supplies a controlled pending paint completion. @returns Its completion promise. */
      requestPaint: () => paint.promise,
    });
    expect(marks).toContain('hansard.catalogue-ready'); expect(marks).toContain('hansard.reader-ready');
    choose(root, 'language-select', 'en'); expect(marks).toContain('hansard.interaction-start'); expect(marks).not.toContain('hansard.interaction-end');
    paint.resolve(); await settle(); expect(marks).toContain('hansard.interaction-end');
  });

test('READER022: bilingual help links to reachable user guidance under the repository base',
  /** Checks discoverable user instructions without claiming navigation or content verification from jsdom. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    expect(control<HTMLAnchorElement>(root, 'reader-help').getAttribute('href')).toBe('./help.html#ms');
    choose(root, 'language-select', 'en'); await settle(); expect(control<HTMLAnchorElement>(root, 'reader-help').getAttribute('href')).toBe('./help.html#en');
  });

test('READER023: retrieval errors preserve controls and never produce an empty participation result',
  /** Checks baseline failure feedback stays separate from semantic transcript outcomes. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup('gaps', {
      /** Rejects a controlled published-data read. @returns A rejected promise. @throws The explicit fixture retrieval error. */
      loadPair: async () => { throw new Error('controlled retrieval failure'); },
    }); await read(root);
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').error);
    expect(control(root, 'reader-result').hasAttribute('data-result-complete')).toBe(false);
    expect(control<HTMLSelectElement>(root, 'member-select').value).toBe('1839');
  });

test('READER024: cleanup prevents a late request from rendering into a disposed reader',
  /** Checks concrete mount lifecycle teardown without introducing storage/update behavior. @returns Resolves after assertions. */
  async () => {
    const pending = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>(); const fixture = readerFixture();
    const { root, cleanup } = await setup('gaps', {
      /** Supplies the controlled late pair. @returns Its pending promise. */
      loadPair: () => pending.promise,
    }); await read(root); cleanup(); pending.resolve({ catalogue: fixture.catalogue, result: fixture.result }); await settle();
    expect(root.childNodes).toHaveLength(0);
  });

test('READER025: repeated Read for the same pair ignores the previous request completion',
  /** Checks same-pair retry generations as well as selection-change generations. @returns Resolves after assertions. */
  async () => {
    const old = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>();
    const current = deferred<{ catalogue: ReaderFixture['catalogue']; result: ReaderFixture['result'] }>();
    const fixture = readerFixture();
    const updated = buildTranscriptResult(fixture.catalogue, '1839', '29326', fixture.record, '2026-10-10T07:00:00.000Z');
    let requests = 0;
    const { root } = await setup('gaps', {
      /** Supplies two same-pair request generations. @returns The corresponding controlled promise. @remarks Increments this test's request counter. */
      loadPair: () => (++requests === 1 ? old.promise : current.promise),
    });
    await read(root); control<HTMLButtonElement>(root, 'read-button').click(); await settle();
    current.resolve({ catalogue: fixture.catalogue, result: updated }); await settle();
    old.resolve({ catalogue: fixture.catalogue, result: fixture.result }); await settle();
    expect(root.querySelector('[data-field="refreshed-at"]')?.textContent).toContain('2026-10-10T07:00:00.000Z');
  });

test('READER026: catalogue retrieval failure is an announced error rather than an empty-archive conclusion',
  /** Checks the initial data-list failure boundary without saved/offline/recovery feature claims. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup('gaps', {
      /** Rejects initial static catalogue retrieval. @returns A rejected promise. @throws The explicit controlled catalogue error. */
      loadCatalogue: async () => { throw new Error('controlled catalogue failure'); },
    });
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').error);
    expect(control<HTMLSelectElement>(root, 'member-select').options).toHaveLength(1);
  });

test('READER027: a provider result for another valid source pair cannot appear beneath current selections',
  /** Checks the UI pair boundary independently from the retrieval implementation. @returns Resolves after assertions. */
  async () => {
    const fixture = readerFixture();
    const other = buildTranscriptResult(fixture.catalogue, '4463', '29326', fixture.record, '2026-10-10T06:00:00.000Z');
    const { root } = await setup('gaps', {
      /** Returns a valid source result for the wrong requested identity. @returns Controlled wrong-pair response. */
      loadPair: async () => ({ catalogue: fixture.catalogue, result: other }),
    }); await read(root);
    expect(control(root, 'reader-status').textContent).toBe(getMessages('ms').error);
    expect(control(root, 'reader-result').hasAttribute('data-result-complete')).toBe(false);
  });

test('READER028: catalogue coverage never labels inventory acquisition as successful transcript acquisition',
  /** Checks the record acquisition label is used only with the selected accepted record's time. @returns Resolves after assertions. */
  async () => {
    const { root } = await setup();
    expect(control(root, 'reader-coverage').textContent).not.toContain(getMessages('ms').sourceAcquired);
    await read(root); expect(root.querySelector('[data-field="acquired-at"]')?.textContent).toContain(getMessages('ms').sourceAcquired);
  });
