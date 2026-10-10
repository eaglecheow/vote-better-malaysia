# Recovery TDD in progress

## Early T029 relevant source-status RED

After foundation T016, future-story test writing is allowed concurrently. Production
recovery still waits for US1 T028 and the complete T032 gate.

`npm test -- --run tests/unit/recovery.test.ts` under Node 24.21.0 exited **1**:
**9/9 behavioral assertion failures**, [durable output](tdd-recovery-initial-red.log).
The `publishedSourceStatus` export is inert and returns undefined. Failures cover
strict >24-hour successful-source age, known dated failures and workflow metadata,
unknown accepted success, static-snapshot knowledge limits and invalid current clocks.
Accepted identity/descriptor/partition behavior is supplied by the already-GREEN
source model; successful timestamp preservation assertions are existing-boundary
checks rather than new RED. No production recovery implementation has started.

Base revision `1c4b079`; preimplementation SHA-256:

```text
src/source.ts 59e42f8f7da4c170bc156573f9310b85c0fa1d93a3b48c6a4351f16899748b7d
tests/unit/recovery.test.ts b9cd403f2654c53211e7b71abb152b29287e80295c83e47e2250660fb9a7943a
```

Observable list/retry/error/status UI and browser tests still need their own RED and
validation; this partial evidence does not complete T029 or T032.

## Full T029 unit RED after fixture repair

Time: **2026-10-10T05:45:08Z**, Node 24.21.0, base commit `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

`npm test -- --run tests/unit/recovery.test.ts tests/unit/recovery-messages.test.ts`
exited **1**, with **44/44 behavioral assertion failures**: the original nine pure status
cases, twenty-one new native-DOM recovery cases, and fourteen independently owned new
recovery-message cases. [Full durable output](tdd-recovery-full-red.log). No TypeError,
import, filesystem, syntax or harness failure counts in this final run.

The original nine assertions remain unchanged. Their helper gained its required mutation
documentation; the file gained the jsdom environment header/imports and new DOM tests.
The root-owned static fixture's Vite/jsdom asset rewrite turned its module-relative URL
into an HTTP URL, making nine preliminary fixture reads fail. Root changed the fixture
read to a Node-resolved filesystem path without changing source bytes or normalization.
That invalid preflight did not count as RED; the final command above reran every case.

### New DOM behavior identifiers

- `REC-LIST-ms/en`: missing native list retry; expected two list requests/full enabled
  choices, observed one failed request/disabled controls and no retry label.
- `REC-PAIR-ms/en`: missing selected-pair retry; expected the same exact pair requested
  twice and its incomplete result, observed one failed request and no retry control.
- `REC-LOADING-ms/en`: missing focusable native retry button/type/tab index and no actual
  pending retry/loading announcement; the existing polite live region remains an inherited
  baseline check. This is native-DOM semantics, not a real screen-reader/keyboard journey.
- `REC-RACE-SAME-ms/en`: expected initial failure, pending Retry and newer Read (three
  requests), observed only two because the Retry action is absent; latest result/text
  assertions are preserved for GREEN and reject an obsolete retry when it exists.
- `REC-RACE-CHANGE-ms/en`: expected request IDs `1839,1839,2928`, observed `1839,2928`.
  Existing Read generation protection is already GREEN; new Retry routing and its shared
  generation behavior remain the required new acceptance path.
- `REC-AGE-ms/en`: absent overdue notice despite successful source age over 24 hours;
  attempt, preparation and device times are independently newer than that boundary.
- `REC-KNOWN-ms/en`: absent shipped failure-date text, matching known workflow evidence
  URL, bilingual evidence label and static-knowledge notice.
- `REC-KNOWLEDGE-ms/en`: absent required overdue/static-knowledge notices for an old
  successful copy. No dated failure is inferred; that negative equality already holds
  and is not claimed as independently failing RED.
- `REC-UNKNOWN-ms/en`: absent known failed-attempt/static-knowledge notices for unavailable
  content. Null source/device success, no overdue inference and unavailable classification
  are existing model/UI checks, not invented new RED.
- `REC-ERROR-CONTEXT-ms/en`: selected controls survive the existing published-copy error,
  but known pair identifiers/source link/draft context are missing. The intended error
  context supplies no successful device-validation time or empty-participation result.
- `REC-LANGUAGE`: absent translated recovery notices after switching to English. Existing
  original transcript/selection preservation remains GREEN and is asserted through the
  new recovery presentation path without claiming that it independently failed.

Default BM, the four result outcomes, generic list/pair errors, source rendering and Read
generation protection were already implemented. Tests do not rewrite those labels or
present their passing assertions as new RED. Delayed requests are controlled promises;
missing new nodes use optional queries so absence produces observable assertion failures
instead of null dereferences. Fixture excerpts remain partial official samples within
controlled complete-record metadata; they do not prove actual-source absence.

### Scaffold and working-tree state

No source-status, Retry, age, failure-display or recovery-label production behavior was
implemented. `publishedSourceStatus` remains the root's unchanged inert export. Only the
coordinated `ReaderDependencies.now?:()=>string` type field was added to `src/main.ts`;
runtime code does not consume it. `getRecoveryMessages` returns an empty typed scaffold,
independent of the original forty `getMessages` keys.

```text
src/source.ts: 59e42f8f7da4c170bc156573f9310b85c0fa1d93a3b48c6a4351f16899748b7d
src/main.ts: 8a3a2b4d3b5903a78d1fa53ae130065a5f83f4c88141b6279c9e7c13a0f99fd8
src/messages.ts: a5a4f18bba88b4688229af4b0643ae778f251ace045d211ea83bb2c0fe48883d
tests/unit/recovery.test.ts: 426cdc73b248b612ef5d0ad755f729e0d7f72a5ec9b7a15588b4d305d81dd03e
tests/unit/recovery-messages.test.ts: 3045a98c1439fd69f36fe48f86bfa5e87625b88fd633e972f82077eca8978b4a
tests/fixtures/static.ts: f4c90d0133ee14ceb9b9116896c54934708c081d961752dc4510cae36e995fa4
```

`npm run typecheck`: exit 0. Existing reader/message regression command
`npm test -- --run tests/unit/messages.test.ts tests/unit/reader.test.ts`: **116/116 passed**
(83 original messages and 33 reader cases). Restricted callable documentation inspection:
zero findings. The relevant unit RED is ready for T032 aggregation; recovery production
still waits for the full T032 gate and US1 T028. T031 authored browser journeys and later
actual browser execution cannot be inferred from this DOM/unit run.

### T031 browser journey preparation

`tests/browser/failures.spec.ts` now defines 22 native-browser journeys, eleven in
each interface language. `npx playwright test --list tests/browser/failures.spec.ts`
collected **66 project cases** across Chromium, Firefox and WebKit, exit 0.
`npm run typecheck` also exited 0; callable documentation inspection found no
missing tags in this new file. Collection did not start the build or preview server.

The journeys request actual same-base static data through native Fetch with controlled
gzip response bytes. They cover controlled complete absence versus incomplete empty
subsets with keyboard-accessible exact gaps, unavailable records and null successful
times, failed initial catalogue recovery, catalogue schema failure, shard HTTP failure,
invalid body, digest mismatch, shard identity validation failure, preserved known
source/pair/draft details, native keyboard Retry, late Retry races for the same pair and
changed selection, bilingual live-region messages, acquired-source age versus newer
device time, dated known failure and workflow evidence, old-snapshot knowledge limits,
and real 320-CSS-pixel page overflow checks. Service workers are blocked only for these
online-failure tests; native offline/saving/update journeys belong to T048.

These are **authored and collected, not executed acceptance evidence**. Existing
classification/read behavior is not claimed as new RED. The controlled absence branch
does not establish an actual-source no-contributions case. Production Retry/freshness
integration and the later native browser run remain gated separately by T032 and the
full source/US1 acceptance requirements; no source-size or absence gate is waived.

## T033 authoritative source-status GREEN

Root authorized production after T027 complete local restaging and the recorded T032 gate. At **2026-10-10 17:10:25 MYT**, Node 24.21.0:

```sh
npx vitest run tests/unit/recovery.test.ts --testNamePattern='^T029 ' --reporter=verbose
```

The unchanged **9/9 pure status assertions passed**; the 21 reader integration cases were deliberately skipped pending root-owned T036. [Status GREEN output](tdd-recovery-source-green.txt). The originally observed nine behavioral failures above precede this implementation; historical RED fingerprints and logs remain unchanged.

`publishedSourceStatus` now accepts `Pick<TranscriptResult, 'sitting' | 'snapshot'>`. This accepts known validated catalogue metadata during failed pair retrieval without constructing transcript content, an outcome or a device-success time. It derives overdue only from the accepted descriptor's nonnull `acquiredAt` with elapsed age strictly greater than 86,400,000 milliseconds. A recorded failed attempt contributes its own `lastAttemptAt`; success, snapshot preparation/publication and device refresh times do not replace that source-success age. The workflow URL comes only from the accepted snapshot. Old age does not imply an unrecorded failure or knowledge of later runs. The helper changes no inputs, successful times, partition/classifier behavior or byte limits.

The independent current clock reuses the existing `sourceInstant` authority. Its callable documentation accurately states rejection of absent/malformed/non-UTC timestamps and impossible calendar instants; whole-second and millisecond UTC spellings remain supported. Accepted sitting/snapshot metadata is a validated caller precondition rather than a second schema implementation.

At **17:10:44 MYT**, the affected source-schema, source-items, static-data, original reader/messages, new recovery messages, native-DOM harness, baseline harness and documentation suites passed **525/525 across nine files**. [Regression GREEN output](tdd-recovery-foundation-green.txt). `npm run typecheck` exited 0; direct `checkCodeDocumentation(process.cwd())` returned `[]`. These are callable checks, not final candidate-accuracy approval. No recovery DOM/browser GREEN is claimed by this source/message-only increment.

```text
src/source.ts: 1276c0f9612ebad901be17d800d34777bc274630b16638843f3629881cdd9089
src/messages.ts: 20d79f5ca7df20d9f57872297ae8b034a307d9e2ba1ed7ae6e348d35faf79730
tests/unit/recovery.test.ts: 426cdc73b248b612ef5d0ad755f729e0d7f72a5ec9b7a15588b4d305d81dd03e
tests/unit/recovery-messages.test.ts: 3045a98c1439fd69f36fe48f86bfa5e87625b88fd633e972f82077eca8978b4a
```

Refactoring assessment: none needed. The existing strict timestamp helper and typed metadata supplied the only required authority; implementation adds one short pure status body and the six-label map. Only these production areas and their evidence were edited by this agent. Root owns task marks, aggregate evidence, reader integration and commits. This source fingerprint is later than the complete local restaging checkpoint; it does not relabel that checkpoint as publication or a deployment receipt.

## T036 reader recovery GREEN

The root integrated the previously observed 21 reader recovery behaviors after
T033/T035 GREEN. Native list/pair Retry controls retain exact selections, announce
actual loading and ignore obsolete generations. Failed site retrieval renders known
catalogue identity/draft/source/nullable provenance without constructing transcript
content, claiming absence or creating a successful device time. Status notices call
the source authority and use the six bilingual labels, preserving original source text.

At **17:13:09 MYT**, the four reader/recovery/message suites passed **160/160**;
[initial integration output](recovery-reader-green.log). Typecheck exited 0 and
mechanical callable coverage returned `[]`. The production browser build then passed
**60/60 Chromium/WebKit reading and recovery journeys**;
[native output](recovery-browser-run.log). These controlled absence cases do not
invent a real-source absence sample or establish Firefox/physical-device acceptance.

Focused review found a completed Retry remaining visible. Two new regressions observed
RED before correction; [review evidence](tdd-recovery-review.md). At **17:15:51 MYT**,
all **162/162** reader/recovery/message cases passed after clearing the flag only on
validated success and transferring focus only from the disappearing Retry to Read.
[Post-review output](recovery-reader-review-green.log). Pending Retry and other focused
controls remain covered. Current `src/main.ts` SHA-256 is
`deeb77bf78fbade3435c69dd8e30ad6ee6f450f88e536003b478a243496fed2a`.
No further refactor was needed. Native post-correction and full refresh regressions
remain separate T037 work; no publication/PWA/release result is claimed.
