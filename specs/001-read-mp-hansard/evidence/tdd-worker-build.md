# Worker/build implementation evidence

Root authorized US3 production on 2026-10-10 after the T044 gate, at 19:00 MYT.
The [original unit RED](tdd-worker.md) and [reviewed additional RED](tdd-worker-review.md)
cover 201 behavioral failures plus five already-passing controls out of 206.
Those historical logs remain unchanged.

Before adding the actual Vite hook, BHOOK001 exercised the exported production config
against an isolated resolved root/output and observed missing worker bytes and missing
index stamp. At **19:06:13 MYT**, exit 1, **one failed /81 skipped out of 82**, two
reachable soft assertion failures, 298 ms. [Hook RED log](tdd-worker-vite-hook-red.log),
SHA256 `4f3a2c4fd5146af887da0627887f00629ed294dc27a5697339bb0d664bdb2b75`.
These were AssertionErrors, not import, fixture, TypeError or matcher failures. The
temporary fixture did not invoke repository builds, native installation or port 4173.

## Implementation and observed GREEN

Implemented native worker install/readiness/activation/fetch/message handling, classic
worker generation, Vite final-build wiring, repository-scoped manifest discovery and the
192/512 PNG icons. Main, updates, source/storage behavior, package scripts, task markers
and aggregate evidence were not edited by this agent.

The worker stages and validates required network responses before caching, confirms every
asset plus both entry-version stamps, bypasses all data caching with `no-store`, and
retains exact old cached asset URLs across worker-memory restart. Cleanup includes
uncontrolled windows and deletes only valid obsolete own cache names when current
readiness and all own live client stamps are confirmed; errors/unknown clients preserve
accepted old caches. Native activation never claims, reloads, migrates IndexedDB or
calls `skipWaiting`. Only an explicit source/base/version-matched Apply calls it.
SHELL_STATUS supports exact-version readiness or omitted-version discovery, and native
message replies are source-directed. CLIENT_VERSION uses the native source ID.

The builder uses the authoritative shared application fingerprint and the worker's
shared shell-manifest validator. It hashes sorted actual nondata output bytes while
excluding its own generated stamp/worker, validates regular output and install metadata,
and checks real PNG headers/dimensions/terminal structure and the inclusive 61,440-byte
combined icon cap. Validation and in-memory classic bundling occur before replacing
generated files. Nested Vite uses `configFile:false`, `write:false`, `emptyOutDir:false`
and one IIFE entry; installed Vite's output preparation is guarded by `build.write`, so
the nested build neither recursively runs the outer hook nor copies/empties output.
The final hook uses Vite's resolved root/base/output. Source `index.html` is never stamped.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts tests/unit/build-worker.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-worker-build-first.log 2>&1
```

At **19:08:39 MYT**, exit **0**, **207/207 GREEN**, two files, 1.24 s:
worker **125/125**, build **82/82**, including the added hook regression.
[Complete worker/build log](tdd-worker-build-first.log).
The earlier worker-only **125/125 GREEN** is retained in
[its first implementation log](tdd-worker-first-green.log).

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/application-fingerprint.test.ts \
  tests/unit/documentation.test.ts tests/unit/harness.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-worker-build-regressions.log 2>&1
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node --input-type=module -e 'import { checkCodeDocumentation } from "./scripts/check-documentation.ts"; const findings = checkCodeDocumentation("."); console.log(JSON.stringify(findings)); process.exitCode = findings.length ? 1 : 0;'
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run build
```

Fingerprint/documentation/harness regressions passed **106/106**, three files,
**19:09:02 MYT**, 1.32 s. [Regression log](tdd-worker-build-regressions.log).
[Typecheck](tdd-worker-build-typecheck.log) exited **0**;
[global callable scan](tdd-worker-build-documentation.log) returned **[]**, exit **0**.
The [actual production build](tdd-worker-production-build.log) exited **0**, frontend
build 2.87 s, with real manifest/icons, generated `dist/sw.js` and version-stamped index.
[Generated classic syntax check](tdd-worker-classic-syntax.log) passed, worker 5,024 bytes.
No server or port 4173 was used by these checks.

The standard-library-generated book icons were inspected through image decoding:
192 PNG **686 bytes**, 512 PNG **3,312 bytes**, **3,998 bytes combined**. This confirms
local usable icon bytes and the bounded build contract, not physical home-screen
installation or branded Safari/device acceptance.

## Fingerprints and refactor assessment

| Input/output | SHA256 |
|---|---|
| `worker/service-worker.ts` | `dc620a583f1c3be2957a30e67299272fec11ad8e84101b3d338bfb929dbce0b7` |
| `scripts/build-worker.ts` | `2731de82fb64ed4dc9fb90e3670f1b35750379cdfb0238e682c5ef6f92bb763f` |
| Shared application fingerprint helper | `4c9aea57e57528fe9345ae1a0ac15f0c785b72ef69efadfad842b6ae42445273` |
| `vite.config.ts` | `14c5ba3268c6fbc25cb15126c043a8e840cfe9f08ba52ba2e75fc71ef15dead6` |
| Source `index.html` | `ac2cdf066c76db93339d2dc203ea6630e4844b358ee341f3bce03de1244580b2` |
| Public manifest | `aa1c491f0206caeb6db189021958234a08c583cbc182ce6d71ad42b9a0c9914c` |
| 192 PNG | `9fa081e9c1e21ccd68d2162e6ebe0e90237b3cc5e9925c85f3a12f293a48b401` |
| 512 PNG | `8c5eec6e1962ac29a6954d7f8235d794ba523a901e9304948d7b029be761f9a9` |
| Updated build unit tests | `ec6eebb1a9864934dc8c6426635bfc0513a079567a649e206598791d463382b9` |
| 207-case GREEN log | `1944fd378eb3da02b2ead5b4e07871f784d4a9f3827fdf6310bdc676fff588d7` |
| 106-case regression log | `f081c9eb46d154a8f5685f155cb7a038efbb61b2c2b0e9707e4395a61170bbfa` |
| Actual production-build log | `3e25704878fdcd49b06826dea8d672136f9f058b7625bc99a5778dd378630b83` |

Refactor assessment: **no further refactor needed**. The existing injectable native
boundaries remain direct; manifest policy and application fingerprinting have shared
authorities; no new dependencies or framework were added. A small final Vite hook and
in-memory classic bundle avoid circular generated inputs and destructive nested builds.

Actual-engine saved-reader/update journeys, physical installation/acceptance, complete
frozen size/timing/device reports and publication remain later root-owned gates. These
unit/build checks do not establish them or a full-suite GREEN while main/storage/update
production is in progress. The approved early local Firefox deferral remains bounded;
no final Firefox or actual-device requirement is waived by this report.
