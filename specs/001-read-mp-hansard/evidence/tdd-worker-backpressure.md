# Native installation backpressure and harness correction

On 2026-10-10 root assigned read-only investigation of the first allowed native PWA
run. Production worker/build/main files remained unchanged during diagnosis. Root later
authorized correction of three test-harness waits and a worker fix **only after durable
meaningful unit RED**, recorded below. Broad browser/build runs remain root-owned.

## Two separately observed problems

The Chromium trace for INSTALL-BROWSER002 showed the async activation wait returning,
followed by reload within approximately 10 ms of installation starting. It subsequently
timed out waiting for a controller. Installed Playwright 1.64.0's polling implementation
in `coreBundle.js` treats the immediate predicate return as truthy before its returned
Promise resolves. The native diagnostic explicitly observed `ASYNC_WAIT_VALUE false`
while registration was still `installing`, with no active worker. These prior harness
timeouts are **not production behavioral RED**.

The same isolated Chromium diagnostic also found genuine install backpressure: after
awaiting real registration state for five seconds, the unchanged worker still remained
installing. Its HTTP requests stopped after `help.html`; icons had not reached the native
server, matching the pending icon request in the original trace. The diagnostic used
unchanged real built shell bytes, controlled source data and a native random-port HTTP
server, with no worker/storage API mocks and no port 4173 use.

A second diagnostic changed **only temporary served worker bytes** to await each fetched
Response's `clone().arrayBuffer()`, then returned the original Response. All shell requests
including icons/manifest/worker completed, the worker activated, and a genuine fresh
navigation obtained a native controller. The initial premature async wait still returned
false, independently demonstrating the harness defect. Native Chromium version:
**156.0.8078.4**. These are controlled native diagnostics, not full application/device,
performance or publication acceptance.

- [Unchanged-worker native observation](worker-native-backpressure-original.log), SHA256
  `9a64370ee3e8eb2c19633dc1615149d10ead21e26dedf0c95a602e7d5df0c186`.
- [Temporary clone-drained native observation](worker-native-backpressure-clone.log), SHA256
  `5aaa847417aa24d023ccdd94b94e1b6b244e45d7e37ec126dbf8aeabebe66514`.
- Diagnostic script/temporary logs: `/private/tmp/hansard-pwa-investigation/`.

The first sandbox attempt failed `listen EPERM` and was rerun with allowed localhost
permission. That permission failure is not a behavioral failure or acceptance result.
During diagnosis the production worker SHA remained
`dc620a583f1c3be2957a30e67299272fec11ad8e84101b3d338bfb929dbce0b7`, builder SHA
`2731de82fb64ed4dc9fb90e3670f1b35750379cdfb0238e682c5ef6f92bb763f`.

## Harness changes

Root authorized replacing the three async `waitForFunction` uses with `expect.poll`
that awaits `page.evaluate` of their unchanged native predicates: openReader activation,
offerUpdate waiting state, and failed-install registration cleanup. Synchronous predicates
remain unchanged. No `claim`, activation bypass or fabricated readiness was added.
These fixes correct test waiting and are recorded separately from the production RED.

## Observed unit RED before production

WSTREAM001 uses actual native ReadableStream/Response objects at the existing injected
fetch boundary. Two upstream connections can remain occupied by unread bodies; the next
fetch waits for a stream to drain. The test races **actual installation settlement**
against an observable queued-connection signal, rather than timing out a test or throwing
a fabricated fixture error. It asserts installation finishes without exhausting the pool.
After that assertion, fixture-only unblocking permits cleanup and independently checks
every cached URL/body and no activation; those preservation assertions already pass and
are controls, not missing behavior.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-worker-backpressure-red.log 2>&1
```

At **19:27:32 MYT**, exit **1**, **one failed /125 passed out of 126**, 199 ms.
[Raw RED log](tdd-worker-backpressure-red.log), SHA256
`7b17dc36ebe6b4e6c3998748eab9eb28dd2999ddacc355957dc15bbac4068542`.
WSTREAM001 reached `AssertionError: expected false to be true`: the actual install had
not settled when its next connection queued. All 125 previous worker cases passed.
There were no import/syntax/fixture/TypeError/invalid-matcher/unhandled failures.

The earlier focused run at 19:26:25 observed the same runtime assertion and is retained
as [initial focused output](tdd-worker-backpressure-initial.log). Before the final full
RED run, a missing **type-only** ShellStatus import was added; it had no runtime effect.
Final pre-fix [typecheck](tdd-worker-backpressure-red-typecheck.log) exited **0** and
[global callable scan](tdd-worker-backpressure-red-documentation.log) returned **[]**.

Final pre-fix unit SHA256:
`48a0ca1348cf3b9873db44b7c22865a4cd13b315fb39d19459e891af119f8b34`.
The production worker still had the unchanged SHA above when this durable RED was written.

## Authorized fix and GREEN

After the durable RED above, root's conditional authorization permitted the smallest
clone-drain change. Installation now awaits `response.clone().arrayBuffer()` before
issuing the next asset fetch, then retains the **original** Response in the staged list.
Its URL/status/headers/body/cache semantics remain unchanged. Complete fetched-response
validation still precedes cache writes, and body errors reject installation without
deleting previously accepted shells. Data fetch policy, activation/Apply, source/storage
behavior and builder output logic were not changed.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts tests/unit/build-worker.test.ts \
  tests/unit/application-fingerprint.test.ts tests/unit/documentation.test.ts \
  tests/unit/harness.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-worker-backpressure-green.log 2>&1
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node --input-type=module -e 'import { checkCodeDocumentation } from "./scripts/check-documentation.ts"; const findings = checkCodeDocumentation("."); console.log(JSON.stringify(findings)); process.exitCode = findings.length ? 1 : 0;'
```

At **19:29:09 MYT**, exit **0**, **314/314 GREEN**, five files, 1.92 s:
worker **126**, builder **82**, application fingerprint **57**, documentation/harness
**49**. [Combined GREEN log](tdd-worker-backpressure-green.log), SHA256
`c6174c82f8503127f4d6cd2e2f19ece6f4e7e06cae1f0696128d77675a4ae650`.
Post-fix [typecheck](tdd-worker-backpressure-green-typecheck.log) exited **0** and
[global callable scan](tdd-worker-backpressure-green-documentation.log) returned **[]**.

- Worker SHA256: `da792f9655d3c7b232f4e4152c3b3f0121e8b8e67694814332f7a23cf73cd9d3`.
- Unit SHA256 unchanged from final RED: `48a0ca1348cf3b9873db44b7c22865a4cd13b315fb39d19459e891af119f8b34`.
- Corrected native fixture SHA256: `63ba6b7335f90aaaf4f32dd0c469b02938c9759071ded563b0d461b6bba76473`.
- Corrected installation suite SHA256: `55bfda0a5d05ca9e2f2b244f7558465206660fecd1c71c24e5273f211996c440`.

Refactor assessment: **no further refactor needed**. One consumed clone resolves the
observed native install pipeline pressure without reconstructing responses, changing
cache acceptance rules, adding dependencies or weakening any requirement. Three test
waits now await the native state they were already meant to check. No broad production
browser/build run was performed after the fix by this agent; root owns that next gate.
The diagnostic comparison and unit GREEN are not a full PWA, physical-device, performance,
publication or field result, and the historical native timeouts remain excluded as RED.
