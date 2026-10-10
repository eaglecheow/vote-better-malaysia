# T046 worker/build unit RED

This is **test writing and inert scaffolding only** after foundation T016. No service
worker, precache, manifest, icon, version-stamp or build behavior is implemented by
this work. T051/T052 production remains blocked until US2 T044 and US3 T049. Root
owns task markers, package/Vite wiring and commits. No task completion is claimed here.

## Approved API/protocol before test writing

Root accepted this contract on 2026-10-10 before the owned files were written:

- `buildWorker({projectRoot,outDir,base})` returns
  `ShellManifest {base,version,assets}` and generates a classic single-file `sw.js`.
  The SHA-256 version includes application/worker/builder/config/tool source inputs
  and all nondata shell bytes. It excludes generated `sw.js` and its own generated
  `<meta name="hansard-shell-version" content="…">` stamp so repeat generation
  is deterministic. The full artifact checker still hashes every final deployed byte.
- List the repository start URL, index/help HTML, every required JS/CSS/manifest/icon/
  worker and other introduced nondata asset. Validate manifest identity/start/scope/
  icon URLs, actual required 192×192 and 512×512 PNG dimensions and all icon stored
  bytes ≤61,440. Do not cache/catalogue/shard source data or omit shell assets.
- Worker entry points are `installShell`, `shellStatus`, `activateShell`,
  `fetchShell`, `handleShellMessage`, and `bindWorkerEvents`, with explicit native
  cache/fetch/clients/skipWaiting dependencies. All are currently inert.
- Cache convention: `hansard-shell:${encodeURIComponent(base)}:${version}`.
  Complete readiness is exact to base/version/all usable required responses and the
  cached entry HTML's version stamp. A mixed HTML stamp cannot become confirmed ready.
- `SHELL_STATUS` queries return `{type,base,version,ready}`. `CLIENT_VERSION` records
  the actual native source client's generated app version, not an ID claimed in its
  payload. `APPLY_UPDATE` requires explicit matching base/version and a verified own
  native client, returning `APPLY_ACCEPTED`. Invalid/Continue messages return null.
- **Client code must target the actual `registration.waiting` worker.** Root explicitly
  rejected pretending that identical stable `sw.js` URLs identify a worker's own phase.
  A wrongly targeted active worker's native skipWaiting has no new activation effect;
  T047/T048 must prove correct waiting-target selection. Installation/activation never
  call skipWaiting automatically. This worker suite does not invent an active-phase
  rejection requirement.
- Cleanup is conservative: remove obsolete well-shaped caches of this exact repository
  only after current complete readiness and all live own clients confirming the current
  version. Unknown/older clients and enumeration failures preserve old caches. Ignore
  closed-client map entries and other applications' clients/caches. No IndexedDB
  migration/deletion, automatic client claiming, broadcasting or tab reload.

## Final pre-production RED

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts tests/unit/build-worker.test.ts
```

- **2026-10-10 13:42:41 MYT**, Node 24.21.0 / Vitest 5.0.3, exit 1.
  **139/139 failed**: 81 worker and 58 build cases; 578 ms; two files collected.
- Log `/private/tmp/hansard-worker-red.log`. No import, syntax, unhandled error, fixture
  assertion, nonexistent-file or native-browser launch failures were counted. The
  build fixture contains real CRC/deflate PNG bodies, including exactly 61,440 and
  61,441 combined bytes; those fixture-length assertions pass before their behavior RED.
- Tested HEAD `1c4b079935bc5b7604474c1ba55def43ed6f0270` plus the current authorized
  uncommitted implementation work. This is working-tree evidence, not a new commit.
- `scripts/build-worker.ts` SHA-256
  `1ad036446efe924744febfdcb0594150b269a2646e1e7a08dddab9a9b376790b`.
- `worker/service-worker.ts` SHA-256
  `f4e25f0690859c67a2c94fa7fe0a601d69177fd1c0eeb2899bb79664b52bd5a1`.
- `tests/unit/worker.test.ts` SHA-256
  `d8913daa8665fcedf0f8a571bfbb49546d9ce26d6f670d48dc586acd52079979`.
- `tests/unit/build-worker.test.ts` SHA-256
  `df21fbca59e01fb6cc856dcba133b91ff4f14e13f8f9fbe1b144d3d1adbd2721`.

Observed failures include `expected undefined to be defined` for missing build output,
`promise resolved undefined instead of rejecting` for invalid inputs/cache failures/
the independent one-byte-over icon case, `undefined` versus exact status/action results,
`undefined` instead of the expected actual Response, and missing native lifecycle
listener assertions. Missing listener assertions expose required worker event binding;
the fixture does not throw a fake dispatch/import error.

An earlier build-only scaffold run at 13:30:25 had 57/57 RED. Final fixture review kept
JSON/JS/CSS mutations valid, represented opaque responses with native status 0/ok false,
removed a requirement to enumerate caches merely to check direct readiness, and allowed
an unsuccessful old-cache lookup for unknown same-base assets. Cleanup enumeration
failure still preserves caches. These repairs precede all production work. The numeric
one-byte-over rejection was split into B019 so it has its own directly observed RED,
rather than being hidden behind missing successful-generation setup. W014 similarly
tests the old hashed response directly before any activation precondition.
Final review also covers closed old-client map entries and guards against IndexedDB
migration after both successful and failed obsolete-cache cleanup.

## Behavior mapping

| Tests | Required observable behavior |
| --- | --- |
| B001–002 | Complete base-scoped list, same start/index reader, generated version stamp, classic parsed/bundled worker with no runtime import/require, repeat-identical output without self-hash circularity |
| B003–006 | Source/worker/builder/config/tool and every nondata shell byte change version; new fonts/images/HTML are included; data/evidence changes do not recache the archive |
| B010–013 | Reject escaped bases, missing required shell resources, off-base manifest identity/start/scope/icons and mismatched icon declarations |
| B014–015/B019 | Actual PNG signatures/dimensions/truncation, exact 61,440 acceptance and independent 61,441 rejection preserving prior output |
| B016–018 | Private output/symlink escapes and invalid replacement metadata fail without replacing accepted worker/index |
| W001–007 | Install all required assets, full confirmed base/version/index readiness; partial/error/opaque/mixed/failing cache cannot report success; failed new saving preserves old compatible shell; invalid asset lists cannot cache data/other bases |
| W010–012 | Catalogue/shards use network with no-store despite seeded stale data; offline/HTTP failure never becomes cached/empty transcript success |
| W013–016 | Offline start/index/help/JS/CSS/manifest/icons return exact installed bytes; old hashed JS remains usable; unrelated/nonGET requests bypass own cache; cache failure preserves online reading |
| W020–023 | Delete only safe obsolete own caches after complete current readiness/live-client confirmations; preserve unknown/older/mixed/error clients, foreign caches and incomplete-current old state; no destructive IndexedDB operations |
| W030–036 | Only explicit matching own-client Apply requests native activation; invalid/Continue/foreign/missing sources cannot activate; readiness and native-client version acknowledgements remain exact |
| W040–045 | Native install/activate/fetch/message listener contracts, waitUntil rejection/completion, respondWith network data, source-only status reply and no automatic claim/reload/activation |

All conditional cases are unit fixtures. Real Cache Storage install atomicity, service
worker waiting/activation/control, native IndexedDB preservation, manifest installation,
offline browser opening and two real reading tabs still require T048/T055. Controlled
platform fakes cannot establish those results. The build fixture's data strings are
deliberately excluded layout placeholders, **not source-verified archive records**.

## Validation and next gate

- `npm run typecheck`: exit 0 after final RED.
- Mechanical `checkCodeDocumentation` scan: no findings for the four owned TypeScript
  files. Every executable helper/callback has a purpose/parameter/return/effect/error
  comment as applicable. Type-only imports create no native runtime dependency.
- Previously passed regression command:

  ```sh
  PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
  PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
  npm test -- --run tests/unit/performance-collector.test.ts tests/unit/performance.test.ts \
  tests/unit/documentation.test.ts tests/unit/harness.test.ts tests/unit/source-schema.test.ts \
  tests/unit/source-items.test.ts tests/unit/acquisition-bootstrap.test.ts
  ```

  **13:41:21 MYT**, exit 0, **710/710 passed across seven files**, 7.26 s, log
  `/private/tmp/hansard-worker-prior-regressions.log`. The existing collector's local
  native Chromium smoke remains tooling evidence only; it is not a service-worker/
  installed-app browser check. Typecheck was run again afterwards and passed.
- No GREEN/refactor claim for this component: the exported methods intentionally remain
  inert, and the two suites intentionally fail. No package/Vite/manifest/icons/main/
  source/checker edits, generated worker, task markers or commits were made here.
- Root must record/review T049 and US2 T044 before assigning production T051/T052.
  Required future completion is relevant GREEN, regression/type checks, refactor or
  no-refactor assessment, real-engine T048/T055 and appropriate user/developer guidance.

## Nonactivating waiting-version discovery: additional pre-production RED

Root approved the T047 discovery requirement on 2026-10-10: an old client sends
`{type:'SHELL_STATUS',base}` to the **actual** `registration.waiting` worker and that
worker replies with its own `{type:'SHELL_STATUS',base,version,ready}`. Client code binds
the response to the actual target/source identity. The stable `sw.js` URL is never the
application version. Exact-version queries still confirm compatible current readiness.
No existing missing-version status rejection test conflicted; missing **Apply** version
remains invalid. No worker behavior was implemented for this protocol refinement.

W050 covers both complete and incomplete cache discovery without activation or changing
the old source client's app stamp. W051 rejects wrong base, foreign/missing native source
and wrong explicit version. Before production, all six new assertions failed against
the unchanged inert worker: dedicated combined run **13:47:14 MYT**, exit 1,
**145/145 RED** (87 worker +58 build), log
`/private/tmp/hansard-worker-discovery-red.log`. Test SHA-256
`19a0608cbdd7d1da975b97ac20ad0eed6389c96b118075fead570c6948182bb3`
supersedes the older worker-test fingerprint; both inert
production scaffold hashes remain unchanged. No browser failure is unit RED evidence.
