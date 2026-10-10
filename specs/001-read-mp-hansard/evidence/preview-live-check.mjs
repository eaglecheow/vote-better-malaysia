import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { chromium, firefox, webkit, expect } from '/Users/eaglecheow/dev/vote-better-malaysia/node_modules/@playwright/test/index.mjs';
import { DATA_LIMITS, validateCatalogue, validateSittingRecord, buildTranscriptResult } from '/Users/eaglecheow/dev/vote-better-malaysia/src/source.ts';

const [address, snapshotId, output = '/private/tmp/hansard-live-preview-check.json', engine = 'chromium'] = process.argv.slice(2);
assert(address && snapshotId, 'Usage: node script.mjs <live-base-url/> <expected-snapshot-id> [output.json] [chromium|firefox|webkit]');
const base = new URL(address);
assert.equal(base.protocol, 'https:');
assert.equal(base.pathname, '/vote-better-malaysia/');
assert(!base.search && !base.hash && !base.username && !base.password);
const browserType = { chromium, firefox, webkit }[engine];
assert(browserType, 'Known browser engine required');
const report = { scope: 'One live source pair in an isolated native engine; not full-archive, device or performance acceptance',
  address: base.href, expectedSnapshotId: snapshotId, engine, checkedAt: new Date().toISOString(), checks: [], passed: false };
let browser;

/** Fetches real deployed bytes, requiring an exact successful address without redirects. */
async function bytes(path) {
  const expected = new URL(path, base).href;
  const response = await fetch(expected, { cache: 'no-store', redirect: 'error' });
  assert(response.ok, `${expected}: HTTP ${response.status}`);
  assert.equal(response.url, expected);
  return Buffer.from(await response.arrayBuffer());
}

/** Decodes bounded actual JSON bytes, including transparently decoded gzip transport. */
function decoded(raw) {
  const value = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw, { maxOutputLength: DATA_LIMITS.decoded }) : raw;
  assert(value.length <= DATA_LIMITS.decoded);
  return value;
}

/** Compares every displayed source partition and original metadata to the validated served record. */
async function reading(page, expected, language) {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator('#reader-result')).toHaveAttribute('data-result-complete', 'true');
  await expect(page.locator('#reader-result')).toHaveAttribute('data-member-id', expected.memberId);
  await expect(page.locator('#reader-result')).toHaveAttribute('data-sitting-id', expected.sittingId);
  await expect(page.locator('#reader-result')).toHaveAttribute('data-outcome', expected.outcome);
  for (const [kind, items] of [['turn', expected.turns], ['gap', expected.gaps], ['annotation', expected.annotations]]) {
    const actual = await page.locator(`[data-kind="${kind}"]`).evaluateAll(nodes => nodes.map(node => ({
      ordinal: node.getAttribute('data-source-item-id'), index: node.getAttribute('data-source-index'),
      text: node.querySelector('.source-text')?.textContent,
    })));
    assert.deepEqual(actual, items.map(item => ({ ordinal: String(item.ordinal), index: item.sourceIndex === null ? null : String(item.sourceIndex), text: item.text })), `${language}: original ${kind} text/order`);
  }
  await expect(page.locator('a[data-role="source"]')).toHaveAttribute('href', expected.sitting.sourceUrl);
  await expect(page.locator('[data-field="prepared-at"]')).toContainText(expected.snapshot.preparedAt);
  await expect(page.locator('[data-field="acquired-at"]')).toContainText(expected.sitting.record.acquiredAt);
  await expect(page.locator('#public-preview [lang="ms"]')).toContainText('Pratonton awam');
  await expect(page.locator('#public-preview [lang="en"]')).toContainText('Public preview');
}

try {
  const catalogueRaw = await bytes('data/catalogue.json.gz');
  const catalogue = validateCatalogue(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded(catalogueRaw))));
  assert.equal(catalogue.snapshotId, snapshotId, 'Live snapshot must match the successful preparation run');
  const sitting = catalogue.sittings.find(item => item.date === '2014-07-23');
  assert(sitting?.record.path, 'Known historical sitting must have a served record');
  const shardRaw = await bytes(sitting.record.path);
  const shard = decoded(shardRaw);
  assert.equal(shard.length, sitting.record.decodedBytes);
  assert.equal(createHash('sha256').update(shard).digest('hex'), sitting.record.digest);
  if (shardRaw[0] === 0x1f && shardRaw[1] === 0x8b) assert.equal(shardRaw.length, sitting.record.compressedBytes);
  const record = validateSittingRecord(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(shard)), sitting, catalogue);
  const memberId = '1216';
  assert(record.items.some(item => item.attribution === 'assigned' && item.memberId === memberId), 'Known exact source member must be present');
  const expected = buildTranscriptResult(catalogue, memberId, sitting.id, record);
  assert(expected.turns.length && expected.gaps.length, 'Smoke pair must exercise original words and attribution gaps');
  Object.assign(report, { snapshotId: catalogue.snapshotId, preparedAt: catalogue.preparedAt, memberId, sittingId: sitting.id,
    sittingDate: sitting.date, recordDigest: sitting.record.digest, turns: expected.turns.length, gaps: expected.gaps.length, annotations: expected.annotations.length });
  report.checks.push('served snapshot and selected original source identity/digest');

  const manifest = JSON.parse((await bytes('manifest.webmanifest')).toString('utf8'));
  for (const field of ['id', 'start_url', 'scope']) assert.equal(manifest[field], base.pathname);
  for (const size of [192, 512]) {
    assert(manifest.icons.some(icon => icon.src === `${base.pathname}icons/icon-${size}.png` && icon.sizes === `${size}x${size}` && icon.type === 'image/png'));
    const png = await bytes(`icons/icon-${size}.png`);
    assert(png.length >= 45 && png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
  report.checks.push('repository manifest identity and both PNG icon dimensions');

  browser = await browserType.launch();
  const context = await browser.newContext({ offline: false, serviceWorkers: 'allow' });
  let page = await context.newPage();
  const opened = await page.goto(base.href, { waitUntil: 'load', timeout: 90000 });
  assert.equal(opened.status(), 200);
  await expect(page.locator(`#member-select option[value="${memberId}"]`)).toBeAttached({ timeout: 90000 });
  await expect.poll(async () => page.evaluate(async scope =>
    (await navigator.serviceWorker.getRegistration(scope))?.active?.state === 'activated', base.href), { timeout: 90000 }).toBe(true);
  await page.reload({ waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const worker = await page.evaluate(async scope => {
    const registration = await navigator.serviceWorker.getRegistration(scope);
    return { scope: registration?.scope, scriptURL: navigator.serviceWorker.controller?.scriptURL };
  }, base.href);
  assert.equal(worker.scope, base.href); assert.equal(worker.scriptURL, new URL('sw.js', base).href);
  report.checks.push('direct open/reload and exact native repository worker scope');

  await page.locator('#member-select').selectOption(memberId);
  await page.locator('#sitting-select').selectOption(sitting.id);
  await page.locator('#read-button').click();
  await reading(page, expected, 'ms');
  await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true', { timeout: 90000 });
  await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true', { timeout: 90000 });
  await page.locator('#language-select').selectOption('en');
  await reading(page, expected, 'en');
  await expect(page.locator('#reader-save-status')).toHaveText('Transcript saved on this device.');
  await expect.poll(async () => page.evaluate(name => new Promise((done, fail) => {
    const opened = indexedDB.open(name); opened.onerror = () => fail(opened.error);
    opened.onsuccess = () => {
      const db = opened.result; const transaction = db.transaction('preferences', 'readonly');
      const selected = transaction.objectStore('preferences').get('current');
      transaction.oncomplete = () => { db.close(); done(selected.result?.language); };
      transaction.onabort = () => { db.close(); fail(transaction.error); };
    };
  }), `hansard:${base.href}`)).toBe('en');
  const savedTime = await page.locator('[data-field="saved-refreshed-at"]').textContent();
  report.checks.push('both locales preserve exact source text/order and bilingual preview labels');

  await page.close(); await context.setOffline(true); page = await context.newPage();
  const offline = await page.goto(base.href, { waitUntil: 'load', timeout: 90000 });
  assert.equal(offline.status(), 200); assert(offline.fromServiceWorker());
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  await reading(page, expected, 'en');
  await expect(page.locator('#reader-save-status')).toHaveAttribute('data-saved', 'true');
  await expect(page.locator('#reader-offline-status')).toHaveAttribute('data-offline-ready', 'true');
  assert.equal(await page.locator('[data-field="saved-refreshed-at"]').textContent(), savedTime);
  const offlineReload = await page.reload({ waitUntil: 'load', timeout: 90000 });
  assert.equal(offlineReload.status(), 200); assert(offlineReload.fromServiceWorker());
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  await reading(page, expected, 'en');
  report.checks.push('closed-reader native offline reopen/reload with unchanged committed source and saved time');
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
