# Repeatable lab collector TDD

This is tooling for T072, not completed T072 measurements. The checker remains a
separate enforcement boundary. This collector must not create actual-device, field,
CI-publication or full-live-source acceptance evidence from controlled tests.

## Contract and pre-implementation RED

Root approved a native Playwright Chromium/CDP collector on 2026-10-10. It consumes a
frozen source-verified artifact, independent candidate and exact fixture selections,
and runs serially under both fixed plan profiles. Product instrumentation uses
`hansard.catalogue-ready`, `hansard.reader-ready`, `hansard.interaction-start/end`,
and `hansard.processing-start/end`; no product benchmark API is added. Source
processing begins after bounded body retrieval and ends after the complete accepted
result clone. Native controls are `#member-select`, `#sitting-select`, `#read-button`,
`#language-select`. DOM completeness checks exact source ordinal/category/text.

Before implementing any collector behavior:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/performance-collector.test.ts
```

- Node 24.21.0, Vitest 5.0.3. Final scaffold run started **13:03:49 MYT on
  2026-10-10**, exit 1, **70 tests failed / 70 total**, 348 ms. Log:
  `/private/tmp/hansard-collector-red.log`.
- All exports were inert (`undefined`); there were no import/collection failures.
  CLI inertly exited 0, contrary to the required missing-evidence/local-runner exit 1.
- Scaffold SHA-256 `9146967c1966a14b4f80030fd21461f61caa19c215f0cd5debedd28790c98dfe`.
- Test SHA-256 `7eb58496acbfc437613019c564eb0f2f16ea5144178d163ea01dcc1a62ac2382`.
- C001–003 cover independent native host facts/public repository, nominal 16 GiB
  allocation and separately recorded actual memory, exact platform/image/CPU/Node/tools.
- C010–020 cover observed LCP, windowed CLS, supported observers, legitimate measured
  zero TBT, FCP clipping, five-second CPU/network quiet, pending requests and late tasks.
- C021–022 cover exact chronological, unambiguous complete User Timing pairs.
- C030 covers twenty independent cold contexts, twenty separately prepared repeat
  contexts, twenty native-action slots and twenty processing slots per each of three
  roles/profile, one browser process, no concurrency, raw runs and decimal profiles.
- C031–033 cover operation cleanup, incomplete observations, paint corroboration,
  frozen roles/hashes/served bytes and long/gap interaction coverage before launch.
- C040–044 cover missing-input CLI, local Mac rejection, decimal CDP conversions and
  exact complete rendered turns/gaps/annotations/ordering/text beyond boolean marks.

Fake sessions prove orchestration and independent metric algorithms only. They are
explicitly synthetic and cannot prove native collection, full archive fidelity,
saved-reader availability or any performance budget. The repeat gate will reject
US1 controls-only readiness until US3 provides actual persisted saved content.

## Metric method references

The collector uses raw observed browser timelines, not Lighthouse scores/simulation.
[Chrome TBT documentation](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time)
defines blocking time after 50 ms between FCP and TTI.
[Lighthouse observed interactive source](https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/interactive.js)
uses overlapping five-second CPU/network quiet windows, at most two inflight requests,
and readiness at max(CPU quiet start, FCP, DOMContentLoaded). Here unfinished requests
are retained conservatively rather than ignored.
[CLS definition](https://web.dev/articles/cls) uses the largest session window with
less than one second between shifts and less than five seconds total. Had-recent-input
shifts are excluded. These references were checked on 2026-10-10.

Native interaction duration must be corroborated by an actual trace `Paint` between
start/end marks; the duration is start-to-first paint, not field INP. A two-rAF product
completion boundary alone does not establish a painted frame.

## Native plumbing RED before native implementation

After the pure/orchestration behaviors reached 68/70 GREEN, C050 added a local HTTP
instrumentation-only shell and an inert `createNativeBrowser` export. The first local
listener attempt encountered sandbox `listen EPERM`; that harness error/timeout is
**excluded** from RED evidence. The listener now handles errors promptly. Running the
authorized local test outside that sandbox repaired the harness:

- **13:07:08 MYT**, Node 24, exit 1, **3 failed / 68 passed / 71 total**, no unhandled
  errors. C050 failed `expect(browser).toBeDefined()` because the native factory was
  still inert, before any native implementation. C040/041 still failed inert CLI exit 0.
- Log `/private/tmp/hansard-collector-native-red.log`.
- At this boundary script SHA-256
  `d0a78c00672545152ed5b4d8fde9b514afc5f8322f257dd14f91f97a94b5f5a0`, test SHA-256
  `ddb84d6205b9378625992ee4f3b5c25b9238ea2e986f577472c6e2efbdc7850d`.
- C050 asserts genuine Chromium native metric/UserTiming/trace plumbing on synthetic
  markup and rejects absent worker/persistence. It cannot establish complete source
  decompression semantics, saved behavior or any accepted runner/device performance.

Root confirmed separate gaps/annotations detail sections. C045 therefore tests
complete exact leaves with order preserved **within each partition**, without
requiring cross-section interleaving. Before relaxing that check, the dedicated
C045 run failed (1 failed / 71 skipped) at **13:07:41 MYT**, log
`/private/tmp/hansard-collector-partition-red.log`; this was an observed positive
RED, not a retroactively invented fixture. Existing C044 rejects reversed turns.

## Served-response revision guard RED

C051 supplies a deliberately different frozen response hash to a real native cold
run. Before the mid-run response guard existed, the native run resolved successfully
and `rejects.toThrow` failed. **13:13:10 MYT**, exit 1, **1 failed / 72 skipped**, no
harness failures, log `/private/tmp/hansard-collector-served-red.log`. Script SHA-256
`41f94f22e4b17c6a09858658701c649830a30bbec51cf608c8240fc5b2e40ca3`, test SHA-256
`cc21e3355e1de99a76870e80c6493ce2e6273c5ad6b1892eccb84928e0ae8e7a`.

C034 additionally required descriptive nearest-rank summaries beside raw runs. With
twenty independent descending LCP observations (400 down to 210 ms), the output had
no percentile object and failed before summary production was introduced. Dedicated
run: **13:17:13 MYT**, 1 failed / 73 skipped, log
`/private/tmp/hansard-collector-percentile-red.log`. Expected p75 LCP is 350 ms; raw
run counts remain mandatory. These are synthetic algorithm fixtures, not lab results.

## GREEN, regression and refactor assessment

Final owned suite: **74/74 GREEN**. Final selected regression command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
npm test -- --run tests/unit/performance-collector.test.ts tests/unit/performance.test.ts \
tests/unit/documentation.test.ts tests/unit/harness.test.ts tests/unit/source-schema.test.ts \
tests/unit/source-items.test.ts tests/unit/acquisition-bootstrap.test.ts
```

- **13:20:12 MYT**, 2026-10-10, exit 0, **710/710 passed across seven files**, 7.23 s.
  Log `/private/tmp/hansard-collector-regressions.log`. Node 24.21.0, pinned Playwright
  1.64.0 Chromium installed in the stated cache; no Firefox or physical-device claim.
- `npm run typecheck`: exit 0 after that run. Mechanical `checkCodeDocumentation`
  scan returned no findings for either owned TypeScript file.
- Native C050 confirms real Chromium observer/User Timing/CDP Paint plumbing on a
  synthetic shell, and confirms missing persistent worker/result prerequisites fail.
  Its final fixture also supplies and verifies the correct actual frozen HTML hash.
  Native C051 confirms wrong actual response bytes fail before a report can pass.
- No-argument CLI exits 1 with required-evidence guidance. Complete argument names on
  this Mac exit 1 with Linux hosted-runner guidance before launching Chromium or
  writing a report. C041 was made host-independent by explicitly selecting false
  Actions/self-hosted provenance in its subprocess; its original Mac RED remains
  recorded above. No Linux collection was performed here.
- Final script SHA-256
  `2d9dad029d1d00bb27d28dca38c7f991979916ded4a8565cad0dc0d5c77afb53`.
  Final test SHA-256
  `d739804a23ae04e0f9be40c62c13e4e3825645e0c713b78a41061b56cc736327`.
- Refactor assessment: kept direct serial loops and explicit native context cleanup;
  no unrelated abstractions or dependencies were added. Fixed callable comments,
  handled fixture listener errors and settled preparation-only frame callbacks. The
  two-rAF wait occurs outside measured action/processing intervals. Full previously
  passed regressions and type checks remained GREEN after those changes. This is
  selected regression evidence; other agents' unfinished story suites are separate.

## Native command, output and remaining acceptance boundaries

On the specified public GitHub-hosted runner, after the real candidate/readiness
prerequisites exist:

```sh
node scripts/collect-performance.ts --artifact <frozen-directory> \
  --candidate <external-candidate.json> --fixtures <external-fixtures.json> \
  --url <served-production-base-ending-in-slash/> --output <external-lab.json>
```

Candidate, fixture and report paths must have existing real parents outside the
deployed artifact. The collector accepts no synthetic default. `RUNNER_ENVIRONMENT`
must be populated from the trusted Actions runner environment context, alongside
native Actions/OS/arch/image/public-repository event facts. It records nominal 16 GiB
only after observed 15–17 GiB actual memory corroborates the approved standard hosted
allocation; actual `memoryBytes`, CPU model, image and exact tools/browser are separate.
The source artifact validator rejects root/file symlinks/private metadata and validates
all supplied catalogue/shard accounting; it does not establish current official-source
acquisition completeness. T027/T071 must independently provide that actual evidence.

External fixture manifest shape:

```json
{
  "datasets": {
    "median": { "path": "data/sittings/<id>.json.gz", "memberId": "<id>" },
    "p95": { "path": "data/sittings/<id>.json.gz", "memberId": "<id>" },
    "largest": { "path": "data/sittings/<id>.json.gz", "memberId": "<id>" }
  },
  "interactions": [{ "path": "data/sittings/<id>.json.gz", "memberId": "<id>" }]
}
```

IDs must be actual validated source selections. Roles are recomputed from every
measured decoded sitting with stable path tie-breaking, and every selected hash must
already belong to the frozen candidate. Actual full expected source partitions are
derived through shared catalogue/shard/result validators. Interactions require the
largest record and a genuine attribution-gap record (one record may satisfy both).
No fabricated empty/small fixture can stand in for those roles.

Before Chromium launches, every deployed file's actual served response is streamed,
bounded and hashed against the canonical frozen artifact; identity/gzip/Brotli
transport representations are accepted only when their content matches. Every native
browser response is also bound to the same stored or valid transport-decoded data
hash, including cached/worker responses, so an intervening served change fails.
`servedBytes` records actual raw body bytes from the independent identity-preferred
HTTP verification. Raw native observations separately include per-navigation/resource
`encodedBodyBytes`, `decodedBodyBytes` and `transferBytes`, preserving cache/transport
differences rather than equating headers or deterministic accounting with delivered
body bytes.

Each profile has twenty separate cold cache/worker/storage-reset contexts, twenty
separately prepared repeat contexts, twenty selection/language/Read-to-actual-Paint
actions and twenty complete-source processing samples for each role. All 240 raw
operations and descriptive nearest-rank p75/p95 summaries are retained. Source marks
time complete decompression/validation/hash/identity/filter/result construction after
body retrieval; the accuracy of product mark placement still requires source review.
The collector checks full exact DOM text/ordinals/categories, not a benchmark hook.

Repeat preparation reads a full fixture in a fresh context, requires native worker,
Cache Storage and IndexedDB evidence, closes the reader, disables networking and
checks complete saved text after reopening. The timed online reopen retains those
stores and requires reader-ready to observe the complete saved result. A controls-only
US1 readiness mark fails. Actual US3 integration/committed saved-source readiness is
still required before these real runs can succeed; the controlled shell does not
simulate it. Reader markup/mark changes should be rechecked against this collector.

Output is explicitly `laboratory-only`: candidate, actual runner/tools, both raw lab
profiles, summaries and served-byte evidence. It does **not** generate actual six-target
physical reports, field disclosures, trusted-main publication origin or participant
results. Merge separately reviewed matching evidence for the existing full performance
checker; missing physical/source/CI/field evidence remains a failure there. This Mac
cannot establish the required Ubuntu measurements. **T072 remains unchecked.**
