import { expect, test, type Page, type Route } from '@playwright/test';
import { gunzipSync } from 'node:zlib';
import { readerFixture, type ReaderFixture } from '../fixtures/reader.ts';

/**
 * Serves exact controlled gzip bytes at actual production data URLs, without transport decoding headers.
 * @param page Native browser page running the production reader under its repository base.
 * @param mode Source-derived or explicitly synthetic fixture branch.
 * @param representation Native gzip bytes or already decoded JSON response.
 * @returns Coherent fixture whose independent original strings can be compared to native rendered text.
 * @remarks Intercepts only this page's data requests; no live/full-archive/real-source absence claim is made.
 */
async function prepare(page: Page, mode: Parameters<typeof readerFixture>[0] = 'gaps', representation: 'gzip' | 'decoded' = 'gzip'): Promise<ReaderFixture> {
  const fixture = readerFixture(mode);
  await page.route('**/vote-better-malaysia/data/**',
    /** Supplies native gzip fixture bytes. @param route Browser data route. @returns Resolves after fulfilling the controlled response. @remarks Writes only the intercepted response. */
    async (route: Route) => {
      const path = new URL(route.request().url()).pathname;
      const bytes = path.endsWith('/catalogue.json.gz') ? fixture.catalogueGzip : fixture.recordGzip;
      expect(bytes).not.toBeNull();
      await route.fulfill({ status: 200, contentType: representation === 'gzip' ? 'application/gzip' : 'application/json', body: representation === 'gzip' ? Buffer.from(bytes!) : gunzipSync(bytes!) });
    },
  );
  await page.goto('./'); await expect(page.locator('#member-select option[value="1839"]')).toBeAttached();
  return fixture;
}

/**
 * Uses native select and button controls to request one exact source pair.
 * @param page Browser reader.
 * @param memberId Exact source ID to select.
 * @returns Resolves once the complete accepted result for this pair is rendered.
 * @remarks Changes browser selections and clicks the real Read control.
 */
async function read(page: Page, memberId = '1839'): Promise<void> {
  await page.locator('#member-select').selectOption(memberId);
  await page.locator('#sitting-select').selectOption('29326');
  await page.locator('#read-button').click();
  await expect(page.locator('[data-result-complete="true"]')).toHaveAttribute('data-member-id', memberId);
}

for (const representation of ['gzip', 'decoded'] as const) test(`${representation}: complete source words, paragraph breaks, gaps, annotations, and provenance remain accessible`,
  /** Checks production rendering through actual native gzip decoding. @param context Native page fixture. @returns Resolves after exact DOM/source assertions. */
  async ({ page }) => {
    const fixture = await prepare(page, 'gaps', representation); await read(page);
    const turns: string[] = []; const gaps: string[] = []; const annotations: string[] = [];
    for (const item of fixture.result.turns) turns.push(item.text);
    for (const item of fixture.result.gaps) gaps.push(item.text);
    for (const item of fixture.result.annotations) annotations.push(item.text);
    expect(await page.locator('[data-kind="turn"] .source-text').allTextContents()).toEqual(turns);
    expect(await page.locator('[data-kind="gap"] .source-text').allTextContents()).toEqual(gaps);
    expect(await page.locator('[data-kind="annotation"] .source-text').allTextContents()).toEqual(annotations);
    await expect(page.locator('[data-source-index="2"] .source-text')).toHaveText(fixture.result.gaps[1].text);
    await page.locator('details[data-category="gaps"] summary').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('details[data-category="gaps"]')).toHaveAttribute('open', '');
    await page.locator('details[data-category="annotations"] summary').click();
    await expect(page.locator('details[data-category="annotations"]')).toHaveAttribute('open', '');
    await expect(page.locator('[data-field="prepared-at"]')).toContainText(fixture.result.snapshot.preparedAt);
    await expect(page.locator('a[data-role="source"]')).toHaveAttribute('href', fixture.result.sitting.sourceUrl);
    expect(await page.locator('[data-kind="turn"] .source-text').evaluate(
      /** Reads actual paragraph-preserving CSS. @param element Native source text element. @returns Its browser-computed whitespace rule. */
      (element) => getComputedStyle(element).whiteSpace,
    )).toBe('pre-wrap');
  });

test('native keyboard and language controls preserve source IDs, exact words, focus, and bilingual announcements',
  /** Checks real control events and focus rather than mocked DOM output. @param context Native page fixture. @returns Resolves after bilingual keyboard assertions. */
  async ({ page, browserName }) => {
    const fixture = await prepare(page);
    await page.locator('#member-select').focus(); await page.keyboard.press('l');
    await expect(page.locator('#member-select')).toHaveValue('1839');
    await page.keyboard.press('Tab'); await expect(page.locator('#sitting-select')).toBeFocused(); await page.keyboard.press('2');
    await expect(page.locator('#sitting-select')).toHaveValue('29326');
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab'); await expect(page.locator('#read-button')).toBeFocused(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-result-complete="true"]')).toHaveAttribute('data-member-id', '1839');
    await page.locator('#language-select').focus(); await page.keyboard.press('e');
    await expect(page.locator('#language-select')).toBeFocused(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#read-button')).toHaveText('Read'); await expect(page.locator('#reader-status')).toHaveText('Record ready to read.');
    await expect(page.locator('#reader-status')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#member-select')).toHaveValue('1839'); await expect(page.locator('#sitting-select')).toHaveValue('29326');
    expect(await page.locator('[data-kind="turn"] .source-text').allTextContents()).toEqual([fixture.result.turns[0].text]);
    await page.locator('#language-select').selectOption('ms'); await expect(page.locator('#read-button')).toHaveText('Baca');
    await page.locator('#read-button').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-result-complete="true"]')).toHaveAttribute('data-member-id', '1839');
  });

test('untrusted source strings are literal text without image/script elements or handler execution',
  /** Checks a synthetic hostile-string branch in native browser DOM. @param context Native page fixture. @returns Resolves after safety/fidelity assertions. */
  async ({ page }) => {
    const fixture = await prepare(page, 'untrusted'); await read(page);
    expect(await page.locator('[data-kind="turn"] .source-text').textContent()).toBe(fixture.result.turns[0].text);
    await expect(page.locator('#reader-result img, #reader-result script')).toHaveCount(0);
    expect(await page.evaluate(
      /** Checks that a synthetic handler never ran. @returns The controlled marker if unsafe HTML executed. */
      () => (window as Window & { __injected?: boolean }).__injected,
    )).toBeUndefined();
  });

test('a delayed old sitting response cannot overwrite the newer chosen source identity',
  /** Checks actual request cancellation/generation protection through native controls. @param context Native page fixture. @returns Resolves after the late-response guard assertion. */
  async ({ page }) => {
    const fixture = await prepare(page);
    let release!: () => void; let requested!: () => void; let completed!: () => void; let requests = 0;
    const pending = new Promise<void>(
      /** Captures late-body release. @param resolve Controlled promise resolver. @returns Nothing. @remarks Updates only the local release binding. */
      (resolve) => { release = resolve; },
    );
    const started = new Promise<void>(
      /** Captures first-request notification. @param resolve Controlled promise resolver. @returns Nothing. @remarks Updates only the local requested binding. */
      (resolve) => { requested = resolve; },
    );
    const finished = new Promise<void>(
      /** Captures completion of the obsolete route attempt. @param resolve Completion resolver. @returns Nothing. @remarks Updates only the controlled completion binding. */
      (resolve) => { completed = resolve; },
    );
    await page.route('**/vote-better-malaysia/data/sittings/**',
      /** Delays only the first real shard request. @param route Intercepted native request. @returns Resolves after fulfillment or legitimate obsolete cancellation. @throws A route failure unrelated to cancellation of the obsolete request. @remarks Increments this test's request count and fulfills controlled responses. */
      async (route: Route) => {
        const ordinal = ++requests;
        if (ordinal === 1) { requested(); await pending; }
        try { await route.fulfill({ status: 200, contentType: 'application/gzip', body: Buffer.from(fixture.recordGzip!) }); }
        catch (error) { if (ordinal !== 1 || !/abort|cancel/i.test(route.request().failure()?.errorText ?? '')) throw error; }
        finally { if (ordinal === 1) completed(); }
      },
    );
    await page.locator('#member-select').selectOption('1839'); await page.locator('#sitting-select').selectOption('29326'); await page.locator('#read-button').click();
    await started;
    await expect(page.locator('#reader-status')).toHaveText('Memuatkan rekod persidangan…');
    await page.locator('#member-select').selectOption('4463'); await page.locator('#read-button').click();
    await expect(page.locator('[data-result-complete="true"]')).toHaveAttribute('data-member-id', '4463');
    release(); await finished;
    await expect(page.locator('[data-kind="turn"] .source-text')).toHaveText('Ya.');
  });

test('320 CSS pixels: both UI languages preserve full source text with no horizontal page scroll',
  /** Checks actual layout under a narrow native browser viewport. @param context Native page fixture. @returns Resolves after both-language layout assertions. */
  async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 }); const fixture = await prepare(page); await read(page);
    for (const language of ['ms', 'en']) {
      await page.locator('#language-select').selectOption(language);
      for (const category of ['gaps', 'annotations']) {
        const details = page.locator(`details[data-category="${category}"]`);
        if (await details.getAttribute('open') === null) await details.locator('summary').click();
      }
      expect(await page.evaluate(
        /** Reads actual browser page width. @returns Whether the document fits the viewport horizontally. */
        () => document.documentElement.scrollWidth <= window.innerWidth,
      )).toBe(true);
      expect(await page.locator('[data-kind="turn"] .source-text').textContent()).toBe(fixture.result.turns[0].text);
    }
  });

test('reading help is reachable at the production repository base in both languages',
  /** Checks deployed-relative help navigation without claiming source/device acceptance. @param context Native page fixture. @returns Resolves after both help destinations load. */
  async ({ page }) => {
    await prepare(page); await page.locator('#reader-help').click(); await expect(page).toHaveURL(/\/vote-better-malaysia\/help\.html#ms$/);
    await expect(page.locator('#ms')).toBeVisible();
    await prepare(page); await page.locator('#language-select').selectOption('en'); await page.locator('#reader-help').click();
    await expect(page).toHaveURL(/\/vote-better-malaysia\/help\.html#en$/); await expect(page.locator('#en')).toBeVisible();
  });
