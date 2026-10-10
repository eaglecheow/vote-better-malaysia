# Native preference-commit probe ordering

On 2026-10-10 root assigned a read-only diagnosis of the two
UPDATES-BROWSER002 failures in [the preceding native run](pwa-native-fixed-browser.log),
then authorized a correction confined to `tests/fixtures/pwa.ts`. Production, native
assertions, task markers and the frozen `dist` output were not changed by this work.
This is a **test observer correction, not feature RED or a production fix**.

## Observed cause

Both retained traces recorded the probe events in this order:

```text
request-success -> apply(committedPreferences:false) -> commit
```

Chromium's `1-trace.trace` recorded the persisted probe result for call `ihsx@594`
at endTime `6162.214`; WebKit recorded call `whoh@594` at `13075.534`.
The actual waiting target and shell version matched. The probe's commit observer did
run, but its flag was set after the Apply observation.

Current `src/storage.ts` registers `transactionCommitted`'s native `complete` listener
immediately after creating the transaction and before enqueuing any writes. `saveState`
awaits that completion; `main.ts` awaits `saveState`; `updates.ts` awaits the caller's
preference persistence before posting Apply. The old probe registered its transaction
listener later, inside the forwarded `IDBObjectStore.put`. A promise continuation can
therefore run after the application's real completion listener and before the later
probe listener. The old boolean did not truthfully indicate whether native completion
had already reached the application.

## Isolated native confirmation

The diagnostic used a static page served from a random `127.0.0.1` port, actual
IndexedDB transactions, and installed Chromium/WebKit engines. It neither mocked
native storage events nor used port 4173 or rebuilt the application.

- [Actual diagnostic result](pwa-native-probe-diagnostic.json), SHA256
  `951d238349ecfe76a7d5004e817c198f8096e79e9f29ed253102bed0bbc33dc7`.
- [Diagnostic script](pwa-native-probe-diagnostic.mjs), SHA256
  `b4a2d91f438a5a55c57aaa08619be099b1a9b0d9f466779646d56b3c9e320b6d`.

For both engines, the late observer measured:

```text
request-success -> application-complete -> application-continuation(observed=false)
-> observer-complete
```

The subsequent genuine read found the committed value. Registering the observer
before the application listener measured `observed=true` in both engines. Adding only
`capture:true` to a late listener worked in WebKit, but still measured false in
Chromium, so that alternative was not used. A deliberate actual abort at request
success produced application rejection, no complete event, and no stored value.

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
/private/tmp/hansard-node24/node_modules/node/bin/node \
  /private/tmp/hansard-idb-listener-diagnostic.mjs
```

The first launch omitted the configured browser path and failed to locate an
executable. It was rerun with the existing installed engines; that setup failure is
not behavioral RED or native acceptance.

## Authorized observer correction and verification

The probe now forwards `IDBDatabase.prototype.transaction`, records the first exact
database/store readwrite transaction, attaches genuine terminal event observers, and
returns the unchanged native transaction. The existing `put` observer is bound to that
exact native identity; real request-success and optional actual abort behavior remain
separate from commit. Apply messages still target and forward the actual worker object
unchanged. No request success is treated as a commit, and no successful event is
synthesized.

During the first patch, typecheck caught a boolean/function-name shadowing error in
the test observer. [Initial typecheck](pwa-native-probe-initial-typecheck.log) and
[initial focused output](pwa-native-probe-initial-focused.log) are retained. The error
was repaired before final verification; the initial two passes do not establish
request/abort instrumentation coverage and are not feature RED.

```sh
HANSARD_FROZEN_SITE=dist \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm run test:browser -- tests/browser/updates.spec.ts \
  --grep 'UPDATES-BROWSER00[23]' --project=chromium --project=webkit --workers=1 \
  > specs/001-read-mp-hansard/evidence/pwa-native-probe-focused.log 2>&1
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/documentation.test.ts tests/unit/harness.test.ts
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node --input-type=module -e 'import { checkCodeDocumentation } from "./scripts/check-documentation.ts"; const findings = checkCodeDocumentation("."); console.log(JSON.stringify(findings)); process.exitCode = findings.length ? 1 : 0;'
```

Final verification completed by **19:38:11 MYT**:

- [Native focused run](pwa-native-probe-focused.log): exit **0**, **4/4**, **6.9 s**.
  UPDATES-BROWSER002 proves the actual preference commit precedes actual waiting-target
  Apply; UPDATES-BROWSER003 proves a genuine abort prevents Apply and preserves both
  workers. Both cases passed in Chromium and WebKit. Log SHA256
  `5af37b3bbace2367dfcaf3d90890bfe38c34af26d2f35d8719120839b13d8f54`.
- [Typecheck](pwa-native-probe-typecheck.log): exit **0**.
- [Documentation/harness unit tests](pwa-native-probe-documentation-tests.log):
  **49/49**, two files, **1.00 s**, start **19:37:56 MYT**.
- [Global callable documentation scan](pwa-native-probe-documentation.log): **[]**.

Fixture SHA256 at the probe verification above:
`348a3b80f2e0ebdfd113f9e36d555887a0afce386fdcd233d34e6bb9abbe27e9`.
The following hashes were unchanged before and after the focused native run:

| File | SHA256 |
| --- | --- |
| `worker/service-worker.ts` | `da792f9655d3c7b232f4e4152c3b3f0121e8b8e67694814332f7a23cf73cd9d3` |
| `scripts/build-worker.ts` | `2731de82fb64ed4dc9fb90e3670f1b35750379cdfb0238e682c5ef6f92bb763f` |
| `src/storage.ts` | `e273f52d3406449c3cba18707e6c3e4d3acb6e1a1c37ea7ae8b696938dcc1ccc` |
| `src/updates.ts` | `993bdabd3bd014cd6917052c8d5ed9dd429965b967fa41d0f44cc53fb68a5e62` |
| `dist/index.html` | `a82d8d3ab22bc72182082a6112837933b9f520d068af868651544abecc02630d` |
| `dist/sw.js` | `b96bdafcc8e91b57190ccf9609bb858ec18abb15cab7adc8d348c487a2437a25` |

Refactor assessment: no further refactor is needed. Observing native transaction
creation is the smallest portable way to place this test listener before application
listeners while preserving genuine request, abort, commit and worker behavior.
The fixture and preview port are released to root for the broader online/PWA run.
This focused local result does not claim final Firefox, physical-device, performance,
publication or complete PWA acceptance.

## Frozen-site fixture selection during T073 review

At **19:50:41 MYT** on 2026-10-10, read-only review of the temporary CI draft found
that Playwright's preview used `HANSARD_FROZEN_SITE`, but this PWA fixture still copied
`dist`. A fresh CI checkout running the frozen-artifact gate has no local `dist`, and
an existing unrelated `dist` would select the wrong shell bytes. Root authorized only
the harness source-selection correction and this note; CI configuration and production
files remain root-owned.

`createPwa` now copies `resolve(process.env.HANSARD_FROZEN_SITE ?? 'dist')` into the
same isolated A/B fixture roots. The explicit frozen directory is authoritative when
supplied; the existing local default is preserved. Temporary worker generation,
native HTTP/IndexedDB/CacheStorage/service-worker mechanisms and browser assertions
remain unchanged. This is a harness repair, with no fabricated feature RED.

New fixture SHA256:
`69ae042a145b71b40cd97b63d3eb8de7b385bdede600dbdb0fbadbf5155e11ae`.
[Typecheck](pwa-frozen-source-typecheck.log) exited **0**; its SHA256 is
`fd8bb326033f2422cfbc6c69b48c9ac55b991152b2268bd45ac42a457e7fea5b`.
[Global callable scan](pwa-frozen-source-documentation.log) returned **[]**; its SHA256
is `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`.
The scoped diff check passed. No build or browser run was performed for this correction
by this agent. Root owns the forthcoming native test from an alternate frozen location
with the local `dist` absent; that result is not claimed here. The fixture is released.
