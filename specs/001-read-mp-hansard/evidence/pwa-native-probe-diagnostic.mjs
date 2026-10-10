import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { chromium, webkit } from '/Users/eaglecheow/dev/vote-better-malaysia/node_modules/playwright/index.mjs';
/** Serves an isolated page. @param request Native request. @param response Native response. @remarks Writes static HTML. */
function serve(request, response) { response.writeHead(200, { 'content-type': 'text/html' }); response.end('<!doctype html><title>native IDB listener diagnostic</title>'); }
const server = createServer(serve);
await new Promise(/** Listens on a random local port. @param resolve Listen completion. @param reject Listen failure. @remarks Attaches native server listeners. */ function listening(resolve, reject) { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const results = [];
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const measured = await page.evaluate(
        /** Measures real native commit/abort dispatch and promise checkpoints. @returns Actual event order and stored values. @remarks Opens and closes an isolated database; never fabricates successful native events. */
        async function measure() {
          const events = [];
          const db = await new Promise(/** Opens the temporary database. @param resolve Native opened database. @param reject Native failure. @remarks Registers native request callbacks. */ function opening(resolve, reject) {
            const request = indexedDB.open('native-listener-order-diagnostic', 1);
            request.onupgradeneeded = /** Creates a real temporary store. @remarks Writes actual schema. */ function upgrade() { request.result.createObjectStore('preferences'); };
            request.onsuccess = /** Returns the opened database. @remarks Resolves the opening promise. */ function opened() { resolve(request.result); };
            request.onerror = /** Propagates opening failure. @remarks Rejects the opening promise. */ function failed() { reject(request.error); };
          });
          /** Writes or aborts through real IndexedDB. @param mode Late, captured, early observer or native abort. @returns Actual observer state and stored value. @remarks Starts real native transactions and observes their events. */
          async function scenario(mode) {
            const tx = db.transaction('preferences', 'readwrite'); let observed = false; let observedAtContinuation = null;
            /** Observes genuine commit. @remarks Records only actual complete dispatch. */
            function observe() { observed = true; events.push(`${mode}:observer-complete`); }
            if (mode === 'early') tx.addEventListener('complete', observe);
            const committed = new Promise(/** Registers the production-order completion boundary before put. @param resolve Actual commit acknowledgement. @param reject Actual rollback rejection. @remarks Adds genuine terminal native event listeners. */ function committing(resolve, reject) {
              tx.addEventListener('complete', /** Resolves actual commit. @remarks Records the native event and resolves. */ function complete() { events.push(`${mode}:application-complete`); resolve(); });
              tx.addEventListener('abort', /** Rejects actual rollback. @remarks Records the native event and rejects. */ function abort() { events.push(`${mode}:application-abort`); reject(tx.error ?? new DOMException('aborted', 'AbortError')); });
            });
            const request = tx.objectStore('preferences').put({ value: mode }, mode);
            request.addEventListener('success', /** Observes success without inferring commit. @remarks Records real success and optionally calls actual rollback. */ function success() { events.push(`${mode}:request-success`); if (mode === 'abort') tx.abort(); });
            if (mode !== 'early') tx.addEventListener('complete', observe, { capture: mode === 'capture' || mode === 'abort' });
            try { await committed; observedAtContinuation = observed; events.push(`${mode}:application-continuation:observed=${observed}`); } catch { events.push(`${mode}:continuation-rejected`); }
            const reading = db.transaction('preferences'); const read = reading.objectStore('preferences').get(mode);
            await new Promise(/** Waits for a subsequent real read. @param resolve Native read completion. @param reject Native read abort. @remarks Attaches terminal native listeners. */ function wait(resolve, reject) {
              reading.addEventListener('complete', /** Resolves the genuine read. @remarks Settles read completion. */ function complete() { resolve(); });
              reading.addEventListener('abort', /** Rejects genuine rollback. @remarks Settles read failure. */ function abort() { reject(reading.error); });
            });
            return { mode, observedAtContinuation, finalObserved: observed, value: read.result ?? null };
          }
          try { return { events, scenarios: [await scenario('late'), await scenario('capture'), await scenario('early'), await scenario('abort')] }; } finally { db.close(); }
        });
      results.push({ engine: name, ...measured });
    } finally { await browser.close(); }
  }
} finally { await new Promise(/** Closes the isolated server. @param resolve Close completion. @param reject Close error. @remarks Releases the temporary port. */ function close(resolve, reject) { server.close(/** Handles native close. @param error Optional close error. @remarks Settles the close promise. */ function closed(error) { if (error) reject(error); else resolve(); }); }); }
const output = JSON.stringify(results, null, 2); await writeFile('/private/tmp/hansard-idb-listener-diagnostic.json', `${output}\n`); console.log(output);
