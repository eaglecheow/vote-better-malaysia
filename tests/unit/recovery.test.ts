// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { mountReader, type ReaderDependencies } from '../../src/main.ts';
import { buildTranscriptResult, publishedSourceStatus } from '../../src/source.ts';
import type { Catalogue, TranscriptResult } from '../../src/source.ts';
import { getMessages } from '../../src/messages.ts';
import { publishedFixture } from '../fixtures/static.ts';
import { readerFixture, type ReaderFixture } from '../fixtures/reader.ts';

/** Builds a controlled accepted result with explicitly successful or failed attempt metadata.
 * @param failed Whether the known last source attempt failed after the accepted copy.
 * @returns A self-contained accepted pair; no recovery or freshness rule is implemented.
 * @remarks Changes only the newly created controlled fixture's source/status metadata.
 */
function resultFixture(failed = false) {
  const fixture = publishedFixture();
  fixture.catalogue.status.workflowUrl = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/12345';
  if (failed) {
    fixture.catalogue.sittings[0].record.lastAttemptOutcome = 'failed';
    fixture.catalogue.sittings[0].record.lastAttemptAt = '2026-10-10T03:50:00.000Z';
    fixture.catalogue.sittings[0].record.availability = 'retained';
    fixture.catalogue.status.acquisitionOutcome = 'degraded';
  }
  return buildTranscriptResult(fixture.catalogue, '2928', '26241', fixture.record, '2026-10-10T04:01:00.000Z');
}

test.each([
  ['2026-10-11T03:00:59.999Z', false],
  ['2026-10-11T03:01:00.000Z', false],
  ['2026-10-11T03:01:00.001Z', true],
] as const)('T029 source check overdue at %s is %s, independently of device/snapshot times',
  /** Checks the strict >24-hour source-success boundary.
   * @param now Controlled current clock.
   * @param overdue Expected accepted-source age outcome.
   * @returns Nothing.
   * @remarks Assertion fails when the age boundary is absent or uses another timestamp.
   */
  (now, overdue) => { expect(publishedSourceStatus(resultFixture(), now)?.overdue).toBe(overdue); });

test('T029 failed source attempt preserves accepted successful age and reports only its known date',
  /** Checks the known failed attempt separately from successful acquisition.
   * @returns Nothing.
   * @remarks Assertions reject relabeled success or inferred future failure dates.
   */
  () => {
    const result = resultFixture(true);
    expect(publishedSourceStatus(result, '2026-10-11T03:02:00.000Z')).toEqual({ overdue: true, knownFailureAt: '2026-10-10T03:50:00.000Z', workflowUrl: result.snapshot.status.workflowUrl });
    expect(result.sitting.record.acquiredAt).toBe('2026-10-10T03:01:00.000Z');
    expect(result.refreshedAt).toBe('2026-10-10T04:01:00.000Z');
  });

test('T029 old successful snapshot age does not invent a later pipeline failure',
  /** Checks the static snapshot's knowledge boundary.
   * @returns Nothing.
   * @remarks Assertion rejects unsupported specific failure claims from age alone.
   */
  () => { expect(publishedSourceStatus(resultFixture(), '2026-10-20T04:00:00.000Z')?.knownFailureAt).toBeNull(); });

test('T029 unknown source success cannot be replaced by attempt/preparation/device times',
  /** Checks unavailable accepted-source timestamps remain unknown.
   * @returns Nothing.
   * @remarks Uses a controlled unavailable pair without claiming source absence.
   */
  () => {
    const fixture = publishedFixture();
    fixture.catalogue.sittings[0].record = { availability: 'unavailable', path: null, digest: null, compressedBytes: null, decodedBytes: null, acquiredAt: null, lastAttemptAt: '2026-10-10T03:50:00.000Z', lastAttemptOutcome: 'failed', sourceBuildId: null, rawSourceDigest: null, sourcePublishedAt: null, sourceRevisedAt: null, accounting: null };
    fixture.catalogue.coverage.unavailableSittingCount = 1;
    const result = buildTranscriptResult(fixture.catalogue, '2928', '26241', null);
    expect(publishedSourceStatus(result, '2026-10-20T04:00:00.000Z')).toEqual({ overdue: false, knownFailureAt: '2026-10-10T03:50:00.000Z', workflowUrl: null });
    expect(result.refreshedAt).toBeNull();
  });

test.each(['invalid', '2026-02-30T00:00:00.000Z', '2026-10-10T04:00:00+00:00'])(
  'T029 rejects invalid independent current clock %s',
  /** Rejects invalid clock values before deriving status.
   * @param now Unsupported UTC clock fixture.
   * @returns Nothing.
   * @remarks Assertion rejects malformed date/format acceptance.
   */
  (now) => { expect(publishedSourceStatus.bind(null, resultFixture(), now)).toThrow(); });

type Language = 'ms' | 'en';
type Pair = { catalogue: Catalogue; result: TranscriptResult };
const teardowns: Array<() => void> = [];
const recoveryLabels = {
  ms: { retry: 'Cuba lagi', retryCatalogue: 'Muatkan semula senarai', overdue: 'Lebih 24 jam sejak rekod sumber berjaya diperoleh.', knownSourceFailure: 'Percubaan memperoleh rekod sumber gagal pada masa yang direkodkan.', pipelineEvidence: 'Bukti proses data', staticKnowledgeLimit: 'Salinan laman ini hanya menunjukkan status yang diketahui ketika disediakan. Ia tidak dapat mengesan proses atau perubahan sumber yang tidak terkandung dalam salinan ini.' },
  en: { retry: 'Retry', retryCatalogue: 'Reload lists', overdue: 'More than 24 hours since the source record was successfully acquired.', knownSourceFailure: 'A source record acquisition attempt failed at the recorded time.', pipelineEvidence: 'Data pipeline evidence', staticKnowledgeLimit: 'This site snapshot shows only status known when it was prepared. It cannot observe later runs or source changes that are not included in this snapshot.' },
};

/**
 * Disposes only mounted recovery readers and removes their test DOM after every assertion.
 * @returns Nothing after cleanup.
 * @remarks Consumes local teardown callbacks and clears only this test document body.
 */
function cleanup(): void { for (const teardown of teardowns.splice(0)) teardown(); document.body.replaceChildren(); }
afterEach(cleanup);

/**
 * Advances reader event-handler promises without relying on feature readiness.
 * @returns Completion on the next task after native events.
 */
async function settle(): Promise<void> {
  await new Promise<void>(
    /** Schedules a test task. @param complete Promise completion callback. @returns Nothing. @remarks Schedules one controlled zero-delay timer. */
    (complete) => { setTimeout(complete, 0); },
  );
}

/**
 * Creates one independently controlled response promise for retry ordering assertions.
 * @returns Pending promise and its explicit test-only resolver.
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(
    /** Captures only the test resolver. @param complete Promise resolver. @returns Nothing. @remarks Sets the local deferred-response binding. */
    (complete) => { resolve = complete; },
  );
  return { promise, resolve };
}

/**
 * Mounts existing production controls with source-verified excerpts and explicit clock/transport inputs.
 * @param fixture Controlled fixture; its excerpts never establish real complete-record absence.
 * @param language Explicit interface locale to use after first-visit initialization.
 * @param overrides Optional controlled list/pair/clock boundaries.
 * @returns The actual mounted reader root after initialization tasks complete.
 * @remarks Replaces only test DOM and registers teardown; does not implement any recovery behavior.
 */
async function setup(fixture: ReaderFixture, language: Language, overrides: Partial<ReaderDependencies> = {}): Promise<HTMLElement> {
  const root = document.createElement('main'); document.body.replaceChildren(root);
  const dependencies: ReaderDependencies = {
    /** Returns only the controlled list. @returns Valid fixture catalogue. */
    loadCatalogue: async () => fixture.catalogue,
    /** Builds the exact requested controlled pair. @param memberId Requested source identity. @param sittingId Requested sitting. @returns Valid fixture pair with original source content. */
    loadPair: async (memberId, sittingId) => pairFor(fixture, memberId, sittingId),
    /** Supplies independent age time, not a successful source event. @returns Strict UTC fixture clock. */
    now: () => '2026-10-11T03:02:00.000Z',
    /** Suppresses telemetry timing in this unit. @param name Timing endpoint, unused. @returns Nothing. */
    mark: (name) => { void name; },
    /** Supplies a unit paint opportunity without real-rendering claims. @returns Immediate completion. */
    requestPaint: async () => {},
    ...overrides,
  };
  teardowns.push(mountReader(root, dependencies)); await settle();
  choose(root, 'language-select', language); await settle();
  return root;
}

/**
 * Resolves one controlled fixture pair with authoritative identity/classification rules.
 * @param fixture Source-excerpt/control metadata fixture.
 * @param memberId Exact selected source member ID.
 * @param sittingId Exact selected source sitting ID.
 * @returns The coherent controlled catalogue/result without translating source words.
 * @throws On invalid fixture identities or unsupported result metadata.
 */
function pairFor(fixture: ReaderFixture, memberId = '1839', sittingId = '29326'): Pair {
  return { catalogue: fixture.catalogue, result: buildTranscriptResult(fixture.catalogue, memberId, sittingId, sittingId === fixture.result.sittingId ? fixture.record : null, fixture.record === null ? null : '2026-10-10T06:00:00.000Z') };
}

/**
 * Finds a known existing core control with a behavioral assertion before any DOM dereference.
 * @param root Mounted recovery test root.
 * @param id Stable existing reader control ID.
 * @returns The nonnull core control.
 */
function control<T extends HTMLElement>(root: HTMLElement, id: string): T {
  const found = root.querySelector(`#${id}`); expect(found).not.toBeNull(); return found as T;
}

/**
 * Sends actual native selection/language events for exact controlled values.
 * @param root Actual mounted reader.
 * @param id Existing native control ID.
 * @param value Exact source ID or locale.
 * @returns Nothing after event dispatch.
 * @remarks Changes only the control value and dispatches its native change event.
 */
function choose(root: HTMLElement, id: string, value: string): void {
  const target = control<HTMLSelectElement>(root, id); target.value = value; target.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Requests the existing native Read action for a valid controlled pair.
 * @param root Mounted production reader.
 * @param memberId Exact controlled identity to select.
 * @param sittingId Exact controlled sitting to select.
 * @returns Completion after request handlers can settle.
 * @remarks Dispatches only actual control changes and a native button click.
 */
async function read(root: HTMLElement, memberId = '1839', sittingId = '29326'): Promise<void> {
  choose(root, 'member-select', memberId); choose(root, 'sitting-select', sittingId); control<HTMLButtonElement>(root, 'read-button').click(); await settle();
}

/**
 * Activates a required new retry control if present, exposing missing behavior through later assertions.
 * @param root Actual mounted reader.
 * @param catalogue Whether this is the full-list retry instead of selected-pair retry.
 * @returns Completion after native retry handlers can settle.
 * @remarks Performs a real click only on a supplied button; never fabricates retry behavior.
 */
async function retry(root: HTMLElement, catalogue = false): Promise<void> {
  root.querySelector<HTMLButtonElement>(catalogue ? '#retry-catalogue-button' : '#retry-button')?.click(); await settle();
}

/**
 * Reads one new semantic notice without turning its absence into a harness exception.
 * @param root Mounted reader.
 * @param role Required recovery notice role.
 * @returns Exact rendered notice text, or null when it is missing.
 */
function notice(root: HTMLElement, role: string): string | null { return root.querySelector(`[data-role="${role}"]`)?.textContent ?? null; }

/**
 * Reads original rendered contributions in DOM order for generation/text-preservation checks.
 * @param root Actual mounted reader.
 * @returns Exact original text strings, without translation or concatenation.
 */
function turns(root: HTMLElement): string[] {
  const values: string[] = []; for (const node of root.querySelectorAll('[data-kind="turn"] .source-text')) values.push(node.textContent ?? ''); return values;
}

/**
 * Requires failed initial-list retrieval to have a native bilingual retry that restores full choices.
 * @param language Interface language for this journey.
 * @returns Completion after actual list request/count/control/announcement assertions.
 * @remarks Increments only the controlled catalogue request counter.
 */
async function checksListRetry(language: Language): Promise<void> {
  const fixture = readerFixture(); let calls = 0;
  /** Returns a first failed list response followed by valid source choices. @returns Controlled list promise. @throws The initial explicit list failure. @remarks Advances only local request count. */
  async function loadCatalogue(): Promise<Catalogue> { calls++; if (calls === 1) throw new Error('Controlled site list failure'); return fixture.catalogue; }
  const root = await setup(fixture, language, { loadCatalogue });
  expect(control(root, 'reader-status').textContent).toBe(getMessages(language).error);
  const label = root.querySelector('#retry-catalogue-button')?.textContent ?? null;
  await retry(root, true);
  expect({ label, calls, enabled: !control<HTMLSelectElement>(root, 'member-select').disabled, optionCount: control<HTMLSelectElement>(root, 'sitting-select').options.length, status: control(root, 'reader-status').textContent }).toEqual({ label: recoveryLabels[language].retryCatalogue, calls: 2, enabled: true, optionCount: fixture.catalogue.sittings.length + 1, status: getMessages(language).chooseBoth });
}
test.each(['ms', 'en'] as const)('REC-LIST-%s: failed initial list can be retried through labeled native controls', checksListRetry);

/**
 * Requires failed pair retrieval to retry the same exact IDs while keeping focus and choices.
 * @param language Interface language for the retry journey.
 * @returns Completion after real retry transport/result and focus assertions.
 * @remarks Tracks only local requested IDs and controlled first-failure state.
 */
async function checksPairRetry(language: Language): Promise<void> {
  const fixture = readerFixture(); const calls: string[] = [];
  /** Returns failure once before the exact controlled pair. @param memberId Requested identity. @param sittingId Requested sitting. @returns Valid second response. @throws The first controlled published-copy retrieval error. @remarks Appends only the local source-ID request log. */
  async function loadPair(memberId: string, sittingId: string): Promise<Pair> { calls.push(memberId + '/' + sittingId); if (calls.length === 1) throw new Error('Controlled pair failure'); return pairFor(fixture, memberId, sittingId); }
  const root = await setup(fixture, language, { loadPair }); await read(root);
  const button = root.querySelector<HTMLButtonElement>('#retry-button'); const focused = control<HTMLSelectElement>(root, 'member-select'); focused.focus();
  await retry(root);
  expect({ label: button?.textContent ?? null, calls, member: control<HTMLSelectElement>(root, 'member-select').value, sitting: control<HTMLSelectElement>(root, 'sitting-select').value, outcome: root.querySelector('#reader-result')?.getAttribute('data-outcome'), status: control(root, 'reader-status').textContent }).toEqual({ label: recoveryLabels[language].retry, calls: ['1839/29326', '1839/29326'], member: '1839', sitting: '29326', outcome: 'incomplete', status: getMessages(language).resultsReady });
  expect(document.activeElement).toBe(focused);
}
test.each(['ms', 'en'] as const)('REC-PAIR-%s: retry keeps exact selections/focus and yields the matching complete supplied pair', checksPairRetry);

/**
 * Requires a pending retry to use a labeled focusable native button and announce loading politely.
 * @param language Interface language for the keyboard/loading journey.
 * @returns Completion after native control semantics, exact request count and live-region assertions.
 * @remarks Advances only controlled request count; a pending response remains explicitly unresolved.
 */
async function checksRetryLoading(language: Language): Promise<void> {
  const fixture = readerFixture(); const pending = deferred<Pair>(); let calls = 0;
  /** Returns initial failure and then the controlled pending response. @returns Explicit response promise. @throws The initial controlled pair error. @remarks Increments only the local request count. */
  async function loadPair(): Promise<Pair> { calls++; if (calls === 1) throw new Error('Controlled retry error'); return pending.promise; }
  const root = await setup(fixture, language, { loadPair }); await read(root);
  const button = root.querySelector<HTMLButtonElement>('#retry-button'); button?.focus(); await retry(root);
  expect({ nativeButton: button instanceof HTMLButtonElement, type: button?.type ?? null, tabIndex: button?.tabIndex ?? null, label: button?.textContent ?? null, calls, status: control(root, 'reader-status').textContent, live: control(root, 'reader-status').getAttribute('aria-live') }).toEqual({ nativeButton: true, type: 'button', tabIndex: 0, label: recoveryLabels[language].retry, calls: 2, status: getMessages(language).loading, live: 'polite' });
}
test.each(['ms', 'en'] as const)('REC-LOADING-%s: native retry is keyboard-focusable and announces its actual pending request', checksRetryLoading);

/**
 * Requires an older same-pair retry response not to overwrite a newer native Read result.
 * @param language Interface language for the request-race journey.
 * @returns Completion after observable request count, latest text and identity assertions.
 * @remarks Resolves only controlled old/latest request promises in deliberately reversed order.
 */
async function checksSamePairRace(language: Language): Promise<void> {
  const fixture = readerFixture(); const newer = readerFixture('ready'); const old = deferred<Pair>(); const latest = deferred<Pair>(); let calls = 0;
  /** Supplies initial failure, pending retry and newer same-pair Read. @returns The corresponding explicit controlled pair promise. @throws The initial controlled failure. @remarks Increments only the request counter. */
  async function loadPair(): Promise<Pair> { calls++; if (calls === 1) throw new Error('Controlled initial read failure'); return calls === 2 ? old.promise : latest.promise; }
  const root = await setup(fixture, language, { loadPair }); await read(root); await retry(root);
  control<HTMLButtonElement>(root, 'read-button').click(); latest.resolve(pairFor(newer)); await settle(); old.resolve(pairFor(fixture)); await settle();
  const expected: string[] = []; for (const item of pairFor(newer).result.turns) expected.push(item.text);
  expect({ calls, texts: turns(root), outcome: root.querySelector('#reader-result')?.getAttribute('data-outcome'), member: control<HTMLSelectElement>(root, 'member-select').value }).toEqual({ calls: 3, texts: expected, outcome: 'ready', member: '1839' });
}
test.each(['ms', 'en'] as const)('REC-RACE-SAME-%s: late same-pair Retry cannot replace a newer successful Read', checksSamePairRace);

/**
 * Requires a late Retry for old choices to remain obsolete after the identity selection changes.
 * @param language Interface language for the request-race journey.
 * @returns Completion after latest pair/context/text and actual requested-ID assertions.
 * @remarks Resolves only the deliberately delayed old retry response.
 */
async function checksChangedSelectionRace(language: Language): Promise<void> {
  const fixture = readerFixture(); const old = deferred<Pair>(); const calls: string[] = []; let failed = false;
  /** Supplies an initial old-pair failure/pending retry and a valid newly selected identity. @param memberId Requested source identity. @param sittingId Requested source sitting. @returns Its explicit controlled response. @throws The first old-pair read failure. @remarks Appends local request IDs and advances the local failure flag. */
  async function loadPair(memberId: string, sittingId: string): Promise<Pair> { calls.push(memberId); if (memberId === '1839') { if (!failed) { failed = true; throw new Error('Controlled first failure'); } return old.promise; } return pairFor(fixture, memberId, sittingId); }
  const root = await setup(fixture, language, { loadPair }); await read(root); await retry(root); await read(root, '2928');
  old.resolve(pairFor(fixture)); await settle();
  const expected: string[] = []; for (const item of pairFor(fixture, '2928').result.turns) expected.push(item.text);
  expect({ calls, texts: turns(root), shownMember: root.querySelector('#reader-result')?.getAttribute('data-member-id'), selectedMember: control<HTMLSelectElement>(root, 'member-select').value }).toEqual({ calls: ['1839', '1839', '2928'], texts: expected, shownMember: '2928', selectedMember: '2928' });
}
test.each(['ms', 'en'] as const)('REC-RACE-CHANGE-%s: an old retry completion cannot follow new identity controls', checksChangedSelectionRace);

/**
 * Requires age from successful source acquisition rather than a newer attempt/preparation/device time.
 * @param language Interface language for the source-freshness journey.
 * @returns Completion after exact successful-source age and separate provenance assertions.
 * @remarks Alters only controlled dated failure/status fixture metadata before normalization.
 */
async function checksSourceAge(language: Language): Promise<void> {
  const fixture = readerFixture(); const sitting = fixture.catalogue.sittings[0];
  sitting.record.lastAttemptOutcome = 'failed'; sitting.record.lastAttemptAt = '2026-10-10T03:50:00.000Z'; sitting.record.availability = 'retained'; fixture.catalogue.status.acquisitionOutcome = 'degraded';
  const root = await setup(fixture, language, { now: sourceAgeClock }); await read(root);
  expect(notice(root, 'source-overdue')).toBe(recoveryLabels[language].overdue);
  expect(root.querySelector('[data-field="acquired-at"]')?.textContent).toContain('2026-10-10T03:01:00.000Z');
  expect(root.querySelector('[data-field="refreshed-at"]')?.textContent).toContain('2026-10-10T06:00:00.000Z');
}

/** Supplies a clock just more than 24 hours after source success, while every later event is younger. @returns Strict independent UTC test time. */
function sourceAgeClock(): string { return '2026-10-11T03:02:00.000Z'; }
test.each(['ms', 'en'] as const)('REC-AGE-%s: overdue uses accepted source success despite a newer failure/snapshot/device check', checksSourceAge);

/**
 * Requires a dated shipped source failure and its snapshot-bound evidence URL.
 * @param language Interface language for the known-failure journey.
 * @returns Completion after failure-date, exact workflow-link and static-scope assertions.
 * @remarks Changes only controlled source failure and known workflow fixture metadata.
 */
async function checksKnownFailure(language: Language): Promise<void> {
  const fixture = readerFixture(); const record = fixture.catalogue.sittings[0].record;
  record.lastAttemptOutcome = 'failed'; record.lastAttemptAt = '2026-10-10T03:50:00.000Z'; record.availability = 'retained'; fixture.catalogue.status.acquisitionOutcome = 'degraded';
  const workflow = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/12345'; fixture.catalogue.status.workflowUrl = workflow;
  const root = await setup(fixture, language); await read(root);
  expect({ failure: notice(root, 'known-source-failure'), evidence: root.querySelector<HTMLAnchorElement>('[data-role="pipeline-evidence"]')?.href ?? null, evidenceLabel: notice(root, 'pipeline-evidence'), knowledge: notice(root, 'static-knowledge-limit') }).toEqual({ failure: `${recoveryLabels[language].knownSourceFailure} 2026-10-10T03:50:00.000Z`, evidence: workflow, evidenceLabel: recoveryLabels[language].pipelineEvidence, knowledge: recoveryLabels[language].staticKnowledgeLimit });
}
test.each(['ms', 'en'] as const)('REC-KNOWN-%s: only the published snapshot supplies a dated failure and workflow evidence link', checksKnownFailure);

/**
 * Requires an old successful snapshot to explain its knowledge limit without inventing a later failure.
 * @param language Interface language for the old-snapshot journey.
 * @returns Completion after required age/scope notices and no unsupported failure assertion.
 */
async function checksOldKnowledge(language: Language): Promise<void> {
  const fixture = readerFixture(); const root = await setup(fixture, language, { now: farFutureClock }); await read(root);
  expect({ overdue: notice(root, 'source-overdue'), failure: notice(root, 'known-source-failure'), knowledge: notice(root, 'static-knowledge-limit') }).toEqual({ overdue: recoveryLabels[language].overdue, failure: null, knowledge: recoveryLabels[language].staticKnowledgeLimit });
  expect(root.textContent).not.toContain('2026-10-20T04:00:00.000Z');
}

/** Supplies an old-copy observation time without supplying later pipeline information. @returns Strict independent UTC clock. */
function farFutureClock(): string { return '2026-10-20T04:00:00.000Z'; }
test.each(['ms', 'en'] as const)('REC-KNOWLEDGE-%s: age cannot become a specific future workflow failure', checksOldKnowledge);

/**
 * Requires unknown successful source/device times to stay unavailable despite a known failed attempt.
 * @param language Interface language for the unavailable-record journey.
 * @returns Completion after null-time/dated-failure/scope assertions.
 */
async function checksUnknownSuccess(language: Language): Promise<void> {
  const fixture = readerFixture('unavailable'); const root = await setup(fixture, language, { now: farFutureClock }); await read(root);
  expect({ overdue: notice(root, 'source-overdue'), failure: notice(root, 'known-source-failure'), knowledge: notice(root, 'static-knowledge-limit') }).toEqual({ overdue: null, failure: `${recoveryLabels[language].knownSourceFailure} 2026-10-10T03:01:00.000Z`, knowledge: recoveryLabels[language].staticKnowledgeLimit });
  expect(root.querySelector('[data-field="acquired-at"]')?.textContent).toContain(getMessages(language).unknownTime);
  expect(root.querySelector('[data-field="refreshed-at"]')?.textContent).toContain(getMessages(language).unknownTime);
  expect(root.querySelector('#reader-result')?.getAttribute('data-outcome')).toBe('unavailable');
}
test.each(['ms', 'en'] as const)('REC-UNKNOWN-%s: failed-attempt age cannot create source success or a device check', checksUnknownSuccess);

/**
 * Requires site retrieval failures to retain selected source/draft context without inventing pipeline failure.
 * @param language Interface language for the failed-published-copy journey.
 * @returns Completion after known context/official link and honest time/status assertions.
 */
async function checksErrorContext(language: Language): Promise<void> {
  const fixture = readerFixture();
  /** Rejects only a controlled published-copy read. @returns A rejected promise. @throws Explicit controlled site-data retrieval error. */
  async function loadPair(): Promise<Pair> { throw new Error('Controlled static HTTP failure at 2026-10-20'); }
  const root = await setup(fixture, language, { loadPair }); await read(root);
  expect({ source: root.querySelector<HTMLAnchorElement>('[data-role="source"]')?.href ?? null, memberId: root.querySelector('#reader-result')?.getAttribute('data-member-id'), sittingId: root.querySelector('#reader-result')?.getAttribute('data-sitting-id'), knownFailure: notice(root, 'known-source-failure') }).toEqual({ source: fixture.catalogue.sittings[0].sourceUrl, memberId: '1839', sittingId: '29326', knownFailure: null });
  expect(root.querySelector('#reader-result')?.textContent).toContain(getMessages(language).draft);
  expect(root.querySelector('[data-field="refreshed-at"]')?.textContent).toContain(getMessages(language).unknownTime);
  expect(control(root, 'reader-status').textContent).toBe(getMessages(language).error);
  expect(turns(root)).toEqual([]);
}
test.each(['ms', 'en'] as const)('REC-ERROR-CONTEXT-%s: site-data failure preserves known pair/draft/source without claiming absence or pipeline failure', checksErrorContext);

/**
 * Requires equivalent generated recovery copy on language changes while all original source text remains exact.
 * @returns Completion after translated static notices and unchanged source text/selection assertions.
 */
async function checksRecoveryLanguageSwitch(): Promise<void> {
  const fixture = readerFixture(); const root = await setup(fixture, 'ms'); await read(root); const original = turns(root);
  choose(root, 'language-select', 'en'); await settle();
  expect({ knowledge: notice(root, 'static-knowledge-limit'), overdue: notice(root, 'source-overdue'), text: turns(root), member: control<HTMLSelectElement>(root, 'member-select').value, sitting: control<HTMLSelectElement>(root, 'sitting-select').value }).toEqual({ knowledge: recoveryLabels.en.staticKnowledgeLimit, overdue: recoveryLabels.en.overdue, text: original, member: '1839', sitting: '29326' });
}
test('REC-LANGUAGE: recovery notices switch to English while original source bytes and valid choices remain', checksRecoveryLanguageSwitch);

/**
 * Requires successful recovery to dismiss its error-only control without losing keyboard focus.
 * @param language Interface language for the focused native Retry journey.
 * @returns Completion after validated success, retry visibility and stable Read-focus assertions.
 * @remarks Advances only a controlled request counter and focuses/clicks actual mounted controls.
 */
async function checksSuccessfulRetryDismissal(language: Language): Promise<void> {
  const fixture = readerFixture(); let calls = 0;
  /** Returns one failed request followed by the exact accepted pair. @param memberId Requested source identity. @param sittingId Requested sitting. @returns The valid second controlled response. @throws The initial explicit published-copy failure. @remarks Advances only the local request counter. */
  async function loadPair(memberId: string, sittingId: string): Promise<Pair> {
    calls++; if (calls === 1) throw new Error('Controlled retry dismissal failure'); return pairFor(fixture, memberId, sittingId);
  }
  const root = await setup(fixture, language, { loadPair }); await read(root);
  const button = control<HTMLButtonElement>(root, 'retry-button');
  expect(button.hidden).toBe(false); button.focus(); expect(document.activeElement).toBe(button);
  await retry(root);
  expect(calls).toBe(2);
  expect(control(root, 'reader-status').textContent).toBe(getMessages(language).resultsReady);
  expect(control(root, 'reader-result').getAttribute('data-result-complete')).toBe('true');
  expect.soft(button.hidden).toBe(true);
  expect.soft(document.activeElement?.id).toBe('read-button');
}
test.each(['ms', 'en'] as const)('REC-REVIEW-RETRY-%s: successful focused Retry hides its error control and focuses stable Read', checksSuccessfulRetryDismissal);

/**
 * Requires completed keyboard list recovery to return focus to the first usable selection control.
 * @param language Interface language for the focused list-recovery journey.
 * @returns Completion after actual requests, valid choices and stable search-focus assertions.
 * @remarks Advances only the controlled catalogue request counter and focuses/clicks actual controls.
 */
async function checksSuccessfulListRetryFocus(language: Language): Promise<void> {
  const fixture = readerFixture(); let calls = 0;
  /** Returns one failed list request followed by the complete accepted catalogue. @returns The controlled list response. @throws The first explicit list failure. @remarks Advances only this fixture request count. */
  async function loadCatalogue(): Promise<Catalogue> { calls++; if (calls === 1) throw new Error('Controlled focused list recovery failure'); return fixture.catalogue; }
  const root = await setup(fixture, language, { loadCatalogue });
  const button = control<HTMLButtonElement>(root, 'retry-catalogue-button');
  expect(button.hidden).toBe(false); button.focus(); expect(document.activeElement).toBe(button);
  await retry(root, true);
  expect(calls).toBe(2); expect(control(root, 'reader-status').textContent).toBe(getMessages(language).chooseBoth);
  expect(control<HTMLSelectElement>(root, 'member-select').disabled).toBe(false);
  expect(button.hidden).toBe(true);
  expect(document.activeElement?.id).toBe('member-search');
}
test.each(['ms', 'en'] as const)('REC-REVIEW-LIST-FOCUS-%s: completed focused list recovery focuses stable member search', checksSuccessfulListRetryFocus);
