import { chromium } from '/Users/eaglecheow/dev/vote-better-malaysia/node_modules/@playwright/test/index.mjs';
import { writeFile } from 'node:fs/promises';
const base = 'https://eaglecheow.github.io/vote-better-malaysia/';
const browser = await chromium.launch();
const context = await browser.newContext({ offline: false, serviceWorkers: 'allow' });
const report = { base, events: [], checkpoints: [] };
const page = await context.newPage();
page.on('console', message => report.events.push({ type: 'console', level: message.type(), text: message.text() }));
page.on('pageerror', error => report.events.push({ type: 'pageerror', message: error.message }));
page.on('requestfailed', request => report.events.push({ type: 'requestfailed', url: request.url(), error: request.failure() }));
page.on('response', async response => { if (response.url() === base || response.url().endsWith('/sw.js')) report.events.push({ type: 'response', url: response.url(), status: response.status(), fromServiceWorker: response.fromServiceWorker(), headers: await response.allHeaders() }); });
await page.addInitScript(() => {
  window.workerEvents = [];
  navigator.serviceWorker.addEventListener('controllerchange', () => window.workerEvents.push({ event: 'controllerchange', scriptURL: navigator.serviceWorker.controller?.scriptURL, state: navigator.serviceWorker.controller?.state }));
});
async function state(label) {
  const value = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const worker = value => value && { scriptURL: value.scriptURL, state: value.state };
    const cacheList = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name); const cached = [];
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cached.push({ request: request.url, response: response?.url, status: response?.status, type: response?.type, redirected: response?.redirected });
      }
      cacheList.push({ name, cached });
    }
    return { href: location.href, baseURI: document.baseURI, secure: isSecureContext, online: navigator.onLine,
      controller: worker(navigator.serviceWorker.controller), registrations: registrations.map(registration => ({ scope: registration.scope, active: worker(registration.active), waiting: worker(registration.waiting), installing: worker(registration.installing) })),
      workerEvents: window.workerEvents, cacheList, version: document.querySelector('meta[name="hansard-shell-version"]')?.content,
      offlineStatus: document.querySelector('#reader-offline-status')?.outerHTML };
  });
  report.checkpoints.push({ label, ...value });
}
try {
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', { timeout: 90000 });
  await state('initial active');
  await page.reload({ waitUntil: 'load', timeout: 90000 });
  await state('after native reload');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 5000 }).catch(error => report.events.push({ type: 'controller-wait-error', message: error.message }));
  await state('after controller wait');
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await state('after direct second navigation');
  const another = await context.newPage();
  await another.goto(base, { waitUntil: 'load', timeout: 90000 });
  report.newPage = await another.evaluate(async () => ({ href: location.href, controlled: navigator.serviceWorker.controller?.scriptURL, scope: (await navigator.serviceWorker.getRegistration())?.scope }));
} catch (error) { report.error = error.stack; }
finally {
  await browser.close();
  await writeFile('/private/tmp/hansard-live-worker-diagnostic.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
