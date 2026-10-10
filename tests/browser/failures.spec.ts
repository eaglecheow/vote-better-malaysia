import { expect, test, type Page, type Route } from '@playwright/test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { getMessages } from '../../src/messages.ts';
import { readerFixture, type ReaderFixture } from '../fixtures/reader.ts';

type Language = 'ms' | 'en';
type Fault = 'none' | 'catalogue-http' | 'catalogue-schema' | 'shard-http' | 'shard-body' | 'shard-digest' | 'shard-schema';
interface Routes { fault: Fault; catalogueRequests: number; shardRequests: number; delayShard: (() => Promise<void>) | null; delayedFinished: (() => void) | null }
const recovery = {
  ms: { retry: 'Cuba lagi', lists: 'Muatkan semula senarai', overdue: 'Lebih 24 jam sejak rekod sumber berjaya diperoleh.', failure: 'Percubaan memperoleh rekod sumber gagal pada masa yang direkodkan.', evidence: 'Bukti proses data', knowledge: 'Salinan laman ini hanya menunjukkan status yang diketahui ketika disediakan. Ia tidak dapat mengesan proses atau perubahan sumber yang tidak terkandung dalam salinan ini.' },
  en: { retry: 'Retry', lists: 'Reload lists', overdue: 'More than 24 hours since the source record was successfully acquired.', failure: 'A source record acquisition attempt failed at the recorded time.', evidence: 'Data pipeline evidence', knowledge: 'This site snapshot shows only status known when it was prepared. It cannot observe later runs or source changes that are not included in this snapshot.' },
} as const;

// Native worker/offline journeys are in offline.spec.ts, storage.spec.ts, updates.spec.ts and install.spec.ts.
test.use({ serviceWorkers: 'block' });

/** Encodes exact controlled JSON as native gzip fixture bytes. @param value Controlled catalogue or record value. @returns Gzip bytes with no transport decoding header. */
function compressed(value: unknown): Buffer { return gzipSync(Buffer.from(JSON.stringify(value))); }

/**
 * Installs controllable failures over actual published-data URLs and opens the production reader.
 * @param page Native browser page.
 * @param fixture Coherent controlled fixture; an absence branch is synthetic, never a live-source claim.
 * @param fault Initial HTTP/content failure branch.
 * @returns Mutable test-only routing state and observed native request counts.
 * @remarks Registers page routes and navigates the page; only controlled response bytes and counters change.
 */
async function prepare(page: Page, fixture: ReaderFixture, fault: Fault = 'none'): Promise<Routes> {
  const routes: Routes = { fault, catalogueRequests: 0, shardRequests: 0, delayShard: null, delayedFinished: null };
  await page.route('**/vote-better-malaysia/data/**',
    /** Supplies controlled responses through real native Fetch. @param route Intercepted page request. @returns Completion after fulfillment or a legitimate obsolete-request cancellation. @throws Unrelated route/fulfillment errors. @remarks Updates this test's counters and consumes an optional one-shot delay. */
    async (route: Route) => {
      const catalogue = new URL(route.request().url()).pathname.endsWith('/catalogue.json.gz');
      if (catalogue) routes.catalogueRequests++; else routes.shardRequests++;
      const current = routes.fault; const delay = catalogue ? null : routes.delayShard;
      if (delay) { routes.delayShard = null; await delay(); }
      let body = catalogue ? compressed(fixture.catalogue) : Buffer.from(fixture.recordGzip!);
      let status = 200;
      if (catalogue && current === 'catalogue-http' || !catalogue && current === 'shard-http') { status = 503; body = Buffer.from('Controlled published-copy failure'); }
      if (catalogue && current === 'catalogue-schema') body = compressed({ ...fixture.catalogue, schemaVersion: 2 });
      if (!catalogue && current === 'shard-body') body = Buffer.from('<html>Controlled invalid published data</html>');
      if (!catalogue && current === 'shard-digest') body = gzipSync(Buffer.from(JSON.stringify(fixture.record) + '\n'));
      if (current === 'shard-schema') {
        const invalid = { ...fixture.record, sittingId: '26241' }; const bytes = Buffer.from(JSON.stringify(invalid));
        if (catalogue) {
          const changed = structuredClone(fixture.catalogue); changed.sittings[0].record.digest = createHash('sha256').update(bytes).digest('hex');
          changed.sittings[0].record.compressedBytes = gzipSync(bytes).length; changed.sittings[0].record.decodedBytes = bytes.length; body = compressed(changed);
        } else body = gzipSync(bytes);
      }
      try { await route.fulfill({ status, contentType: 'application/gzip', body }); }
      catch (error) { if (!delay || !/abort|cancel/i.test(route.request().failure()?.errorText ?? '')) throw error; }
      finally { if (delay) routes.delayedFinished?.(); }
    });
  await page.goto('./');
  if (fault !== 'catalogue-http' && fault !== 'catalogue-schema') await expect(page.locator('#member-select option[value="1839"]')).toBeAttached();
  return routes;
}

/** Changes only interface locale through its native control. @param page Native reader page. @param language Requested interface language. @returns Completion after the document locale changes. @remarks Changes the native language selection. */
async function locale(page: Page, language: Language): Promise<void> {
  await page.locator('#language-select').selectOption(language); await expect(page.locator('html')).toHaveAttribute('lang', language);
}

/** Chooses an exact controlled source pair and invokes Read. @param page Native reader page. @param member Exact source identity. @returns Completion after the native submission. @remarks Changes selections and clicks the actual Read control. */
async function read(page: Page, member = '1839'): Promise<void> {
  await page.locator('#member-select').selectOption(member); await page.locator('#sitting-select').selectOption('29326'); await page.locator('#read-button').click();
}

/** Requires preserved pair/source details and unavailable official times. @param page Native reader page. @param fixture Supplied source metadata. @param language Interface locale. @param member Exact selected identity. @returns Completion after pair/provenance assertions. */
async function context(page: Page, fixture: ReaderFixture, language: Language, member = '1839'): Promise<void> {
  const labels = getMessages(language);
  await expect(page.locator('#member-select')).toHaveValue(member); await expect(page.locator('#sitting-select')).toHaveValue('29326');
  await expect(page.locator('#reader-result')).toHaveAttribute('data-member-id', member); await expect(page.locator('#reader-result')).toHaveAttribute('data-sitting-id', '29326');
  await expect(page.locator('a[data-role="source"]')).toHaveAttribute('href', fixture.catalogue.sittings[0].sourceUrl);
  await expect(page.locator('#reader-result')).toContainText(labels.draft);
  await expect(page.locator('[data-field="historical-context"]')).toHaveText(labels.historyUnavailable);
  await expect(page.locator('[data-field="source-published"]')).toHaveText(labels.officialPublishedUnavailable);
  await expect(page.locator('[data-field="source-revised"]')).toHaveText(labels.officialRevisedUnavailable);
  await expect(page.locator('[data-field="published-at"]')).toContainText(labels.unknownTime);
}

for (const language of ['ms', 'en'] as const) {
  test(`${language}: controlled complete absence, incomplete empty subset and inaccessible record are distinct`,
    /** Exercises conservative classification through actual browser retrieval/rendering. @param browser Native page fixture. @returns Completion after three distinct outcomes and exact gap words. */
    async ({ page }) => {
      const labels = getMessages(language);
      const absence = readerFixture('absence'); await prepare(page, absence); await locale(page, language); await read(page, '22462');
      await expect(page.locator('#reader-result')).toHaveAttribute('data-outcome', 'verified-absence'); await context(page, absence, language, '22462');
      await expect(page.locator('#reader-result')).toContainText(labels.verifiedAbsence); await expect(page.locator('[data-kind="turn"], [data-kind="gap"]')).toHaveCount(0);
      const incomplete = readerFixture('gaps'); await prepare(page, incomplete); await locale(page, language); await read(page, '22462');
      await expect(page.locator('#reader-result')).toHaveAttribute('data-outcome', 'incomplete'); await context(page, incomplete, language, '22462');
      await expect(page.locator('#reader-result')).toContainText(labels.noMatchedGap); await expect(page.locator('#reader-result')).not.toContainText(labels.verifiedAbsence);
      await expect(page.locator('[data-kind="turn"]')).toHaveCount(0); await page.locator('details[data-category="gaps"] summary').focus(); await page.keyboard.press('Enter');
      await expect(page.locator('details[data-category="gaps"]')).toHaveAttribute('open', '');
      expect(await page.locator('[data-kind="gap"] .source-text').allTextContents()).toEqual([incomplete.result.gaps[0].text, incomplete.result.gaps[1].text]);
      const unavailable = readerFixture('unavailable'); const routes = await prepare(page, unavailable); await locale(page, language); await read(page);
      await expect(page.locator('#reader-result')).toHaveAttribute('data-outcome', 'unavailable'); await context(page, unavailable, language);
      await expect(page.locator('#reader-status')).toHaveText(labels.unavailable); await expect(page.locator('#reader-result')).not.toContainText(labels.verifiedAbsence);
      await expect(page.locator('[data-field="acquired-at"], [data-field="refreshed-at"]')).toHaveCount(2);
      await expect(page.locator('[data-field="acquired-at"]')).toContainText(labels.unknownTime); await expect(page.locator('[data-field="refreshed-at"]')).toContainText(labels.unknownTime);
      expect(routes.shardRequests).toBe(0);
    });

  test(`${language}: failed initial lists expose an announced keyboard Retry and recover the full choices`,
    /** Checks native list-recovery interaction without interpreting empty controls as source absence. @param browser Native page fixture. @returns Completion after a repaired catalogue load. @remarks Changes only routing failure state and browser controls. */
    async ({ page }) => {
      const routes = await prepare(page, readerFixture(), 'catalogue-http'); await locale(page, language);
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).error); await expect(page.locator('#reader-status')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('#member-select')).toBeDisabled(); await expect(page.locator('#read-button')).toBeDisabled();
      await expect(page.locator('#retry-catalogue-button')).toHaveText(recovery[language].lists); routes.fault = 'none';
      await page.locator('#retry-catalogue-button').focus(); await page.keyboard.press('Enter');
      await expect(page.locator('#member-select option[value="1839"]')).toBeAttached(); await expect(page.locator('#sitting-select option[value="26241"]')).toBeAttached();
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).chooseBoth); expect(routes.catalogueRequests).toBe(2);
      await expect(page.locator('#retry-catalogue-button')).toBeHidden(); await expect(page.locator('#member-search')).toBeFocused();
    });

  for (const fault of ['catalogue-schema', 'shard-http', 'shard-body', 'shard-digest', 'shard-schema'] as const) test(`${language}: ${fault} retains known context and retries the selected pair without inventing absence`,
    /** Exercises actual Fetch/decoding/digest/schema failures and a native recovery action. @param browser Native page fixture. @returns Completion after honest failed times and successful retry. @remarks Changes only the controlled fault and native controls. */
    async ({ page }) => {
      const fixture = readerFixture(); const routes = await prepare(page, fixture); await locale(page, language); routes.fault = fault; await read(page);
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).error); await context(page, fixture, language);
      await expect(page.locator('[data-field="refreshed-at"]')).toContainText(getMessages(language).unknownTime);
      await expect(page.locator('#reader-result')).not.toContainText(getMessages(language).verifiedAbsence); await expect(page.locator('[data-kind="turn"]')).toHaveCount(0);
      await expect(page.locator('[data-role="known-source-failure"]')).toHaveCount(0);
      await expect(page.locator('#retry-button')).toHaveText(recovery[language].retry); routes.fault = 'none';
      await page.locator('#retry-button').focus(); await page.keyboard.press('Enter');
      await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true'); await context(page, fixture, language);
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).resultsReady);
      await expect(page.locator('#retry-button')).toBeHidden(); await expect(page.locator('#read-button')).toBeFocused();
      expect(await page.locator('[data-kind="turn"] .source-text').allTextContents()).toEqual([fixture.result.turns[0].text]);
      await expect(page.locator('[data-field="refreshed-at"]')).not.toContainText(getMessages(language).unknownTime);
    });

  for (const changeSelection of [false, true]) test(`${language}: a delayed failed Retry cannot replace a newer ${changeSelection ? 'selection' : 'same-pair Read'}`,
    /** Exercises native Retry through the same request-generation protection as Read. @param browser Native page fixture. @returns Completion after the obsolete error cannot replace a newer valid result. @remarks Delays and releases one controlled route while changing native controls. */
    async ({ page }) => {
      const fixture = readerFixture(); const routes = await prepare(page, fixture); await locale(page, language); routes.fault = 'shard-http'; await read(page);
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).error);
      let release!: () => void; let began!: () => void; let ended!: () => void;
      const pending = new Promise<void>(/** Captures delayed response release. @param resolve Test promise resolver. @returns Nothing. @remarks Updates the test release binding. */ (resolve) => { release = resolve; });
      const started = new Promise<void>(/** Captures request start. @param resolve Test promise resolver. @returns Nothing. @remarks Updates the start binding. */ (resolve) => { began = resolve; });
      const finished = new Promise<void>(/** Captures obsolete response completion. @param resolve Test promise resolver. @returns Nothing. @remarks Updates the completion binding. */ (resolve) => { ended = resolve; });
      routes.delayedFinished = ended;
      routes.delayShard = /** Delays one actual shard request. @returns Completion after explicit test release. @remarks Resolves the start notification before the controlled delay. */ async () => { began(); await pending; };
      await page.locator('#retry-button').click(); await started; await expect(page.locator('#reader-status')).toHaveText(getMessages(language).loading);
      routes.fault = 'none'; if (changeSelection) await page.locator('#member-select').selectOption('4463'); await page.locator('#read-button').click();
      await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true'); const member = changeSelection ? '4463' : '1839';
      await expect(page.locator('#reader-result')).toHaveAttribute('data-member-id', member); release(); await finished;
      await expect(page.locator('#reader-status')).toHaveText(getMessages(language).resultsReady); await expect(page.locator('#member-select')).toHaveValue(member);
      await expect(page.locator('#reader-result')).toHaveAttribute('data-member-id', member); await expect(page.locator('[data-kind="turn"] .source-text')).toHaveText(changeSelection ? 'Ya.' : fixture.result.turns[0].text);
      expect(routes.shardRequests).toBe(3);
    });

  test(`${language}: source age, dated known failure and snapshot knowledge remain distinct at 320 CSS pixels`,
    /** Checks bilingual source-status provenance and actual narrow-browser layout. @param browser Native page fixture. @returns Completion after age, failure, workflow and knowledge assertions. @remarks Fixes the browser clock and changes only controlled known metadata. */
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 844 }); await page.clock.setFixedTime('2026-10-11T03:02:00.000Z');
      const fixture = readerFixture(); fixture.catalogue.sittings[0].record.availability = 'retained'; fixture.catalogue.sittings[0].record.lastAttemptOutcome = 'failed';
      fixture.catalogue.sittings[0].record.lastAttemptAt = '2026-10-10T03:50:00.000Z'; fixture.catalogue.status.acquisitionOutcome = 'degraded';
      const workflow = 'https://github.com/eaglecheow/vote-better-malaysia/actions/runs/12345'; fixture.catalogue.status.workflowUrl = workflow;
      await prepare(page, fixture); await locale(page, language); await read(page);
      await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true'); await context(page, fixture, language);
      await expect(page.locator('[data-role="source-overdue"]')).toHaveText(recovery[language].overdue);
      await expect(page.locator('[data-role="known-source-failure"]')).toHaveText(`${recovery[language].failure} 2026-10-10T03:50:00.000Z`);
      await expect(page.locator('a[data-role="pipeline-evidence"]')).toHaveAttribute('href', workflow); await expect(page.locator('a[data-role="pipeline-evidence"]')).toHaveText(recovery[language].evidence);
      await expect(page.locator('[data-role="static-knowledge-limit"]')).toHaveText(recovery[language].knowledge);
      await expect(page.locator('[data-field="acquired-at"]')).toContainText('2026-10-10T03:01:00.000Z');
      await expect(page.locator('[data-field="refreshed-at"]')).toContainText('2026-10-11T03:02:00.000Z');
      expect(await page.evaluate(/** Reads actual viewport overflow. @returns Whether the page fits horizontally. */ () => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.locator('[data-kind="turn"] .source-text').textContent()).toBe(fixture.result.turns[0].text);
    });

  test(`${language}: an old successful snapshot can disclose age but cannot invent a later workflow failure`,
    /** Checks the static knowledge boundary independently of dated-failure fixtures. @param browser Native page fixture. @returns Completion after old-copy notices and absent invented failure/link. @remarks Fixes only this page's observation clock. */
    async ({ page }) => {
      await page.clock.setFixedTime('2026-10-20T04:00:00.000Z'); await prepare(page, readerFixture()); await locale(page, language); await read(page);
      await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true');
      await expect(page.locator('[data-role="source-overdue"]')).toHaveText(recovery[language].overdue); await expect(page.locator('[data-role="static-knowledge-limit"]')).toHaveText(recovery[language].knowledge);
      await expect(page.locator('[data-role="known-source-failure"], [data-role="pipeline-evidence"]')).toHaveCount(0);
      await expect(page.locator('[data-field="source-published"]')).toHaveText(getMessages(language).officialPublishedUnavailable);
      await expect(page.locator('[data-field="published-at"]')).toContainText(getMessages(language).unknownTime);
    });
}
