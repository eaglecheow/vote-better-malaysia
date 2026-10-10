# Documentation checker TDD — 2026-10-10

Scope: T067–T070, temporary checker fixtures only. This is not full-application
documentation acceptance or an actual candidate accuracy review. Synthetic attestations
exist only to exercise the fail-closed review boundary.

## Verified RED before implementation (T067/T068)

Base revision: `1c4b079935bc5b7604474c1ba55def43ed6f0270` with concurrent implementation
work in progress. Documentation test/scaffold fingerprint:
`5d631ebdd141d4b9fde25ba3944d26580a00fe93e36718337e870957d3b0ac1c`.
Fingerprint method: sorted named `scripts/check-documentation.ts` and
`tests/unit/documentation.test.ts`, each filename + NUL + bytes + NUL, SHA-256.
The scaffold returned no findings and performed no validation.

Command executed with Node 24.21.0/npm 11.17.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/documentation.test.ts
```

Observed at 12:14:31 MYT: exit 1; **40 failed, 2 passed (42)**. The expected behavioral
failure was `expected 0 to be greater than 0` for each of the 39 `DOC-invalid` cases,
because invalid documentation/evidence was accepted. `DOC-cli` observed `expected +0
to be 1` because missing CLI evidence exited successfully. No import, syntax, dependency
or fixture error counted as RED. `DOC-typecheck` passed, proving the meaningful
undocumented-function fixture still typechecked; `DOC-complete` passed against the
inert scaffold and is not itself RED evidence.

Verified `DOC-invalid: rejects <case>` identifiers:

- Comments: `undocumented`, `purpose`, `parameters`, `returns`, `callback`, `method`,
  `errors`, `sideEffects`.
- Scope: `scope-tests/helper.test.ts`, `scope-worker/service-worker.ts`,
  `scope-scripts/tool.ts`, `scope-vite.config.ts`.
- Deliverables: `developer-link`, `user-link`, `missing-developer`, `missing-user`,
  `empty-developer`, `empty-user`, `language`, `empty-language`, `feature`.
- Review: `accuracy`, `reviewer`, `stale-file`, `unreviewed-file`, `expired`, `future`,
  `timestamp`, `missing-report`, `malformed-report`, `report-shape`, `candidate-shape`.
- Candidate mismatch: `candidate-sourceRevision`, `candidate-applicationFingerprint`,
  `candidate-artifactDigest`, `candidate-snapshotId`, `candidate-fixtureHashes`,
  `candidate-conditionsDigest`, `candidate-priorServedBaselineDigest`.

The initial smaller run at 12:14:00 MYT also observed 31 behavioral failures and 2
passes; the expanded 42-test run above gates every production validation introduced
by this checker. Production implementation began only after this record was saved.

## Regression RED: direct effects versus local construction

After the first GREEN (42/42 at 12:16:56 MYT), preliminary review found that expression
arrows skipped their root mutation and captured identifier assignments lacked an effect
requirement. Local fixture mutations were incorrectly classified as external effects.
Before correcting this, added `DOC-invalid: rejects arrow-sideEffects`,
`DOC-invalid: rejects closure-sideEffects` and `DOC-local: local construction is not
an external side effect`.

The same test command at 12:19:11 MYT observed **3 failed, 42 passed (45)**:
the two missing-effect cases observed `expected 0 to be greater than 0`; the local
construction case observed `src/sample.ts:41: missing @remarks for mutation side
effects` where an empty finding list was expected. The test/checker fingerprint was
`cd80609a500db452daf66c39530c4604ab50b6d2be376e306580a8b46940ac39` using the method above.
These are behavioral regression failures, recorded before changing mutation handling.

## First-publication baseline RED

The approved shared candidate contract permits `priorServedBaselineDigest: null` on
first publication and requires explicit presence thereafter. Added
`DOC-first-publication: explicit null baseline is valid` and a supplementary
`DOC-invalid: rejects missing-baseline`. Before changing the candidate validator,
the same command at 12:20:01 MYT exited 1: **4 failed, 43 passed (47)**, comprising
the three already-recorded mutation regressions plus the new null-baseline failure.
The new failure observed `accuracy review: exact candidate/revision does not match`
instead of the expected empty finding list. Missing baseline remained rejected.
Test/checker fingerprint:
`fa999f9528672980889b0f382c0c2d46d973a6e88288833d356cb71678a45e0c`.

## GREEN, regression and refactor (T069/T070)

The TypeScript AST checker now covers declarations/methods/accessors/arrows/callbacks,
explicit contract tags, nonlocal/parameter/captured mutation markers and required
README/developer/bilingual-guide files. Exact code/docs digests, reviewed feature
coverage, explicit accuracy approvals and all candidate identifiers are required;
missing/malformed/mismatched/future/expired reports fail. Explicit null is valid only
as the initial served-baseline identifier; omission remains invalid. Unknown indirect
effects, complex aliasing, prose correctness and reviewer authenticity require human
review; mechanical coverage does not establish semantic accuracy.

Observed with the same Node/npm environment:

- 12:20:57 MYT: `npm test -- --run tests/unit/documentation.test.ts tests/unit/harness.test.ts`
  exited 0; **48 passed (47 documentation + 1 harness)**.
- `npm run typecheck` exited 0 at that GREEN state.
- Refactor: moved imports to the top of the checker; no behavior changed.
- 12:21:11 MYT: the same documentation/harness command exited 0, **48 passed** after
  refactoring. No further refactoring was needed.
- Final checker/test fingerprint:
  `92a3bdcb9aa0042055753054cea6201b21ef55d6053a6c63770da46341efb75e`.
- Missing-candidate/report CLI invocation is exercised by `DOC-cli` and exits 1;
  an absent full-app review cannot be presented as a passing gate.

The preliminary whole-code scan covered `src/`, `worker/` when present, `scripts/`,
root TypeScript configurations and `tests/`. My checker/test files had no findings;
five remaining explicit throw/effect markers were reported to their source/acquisition
owners for comment corrections. Concurrent source/acquisition/performance RED suites
were not reported as a green full regression suite. The actual user guide, complete
candidate, human accuracy approval and delivery command review remain later gates.
Root maintains `documentation.md`, package command wiring and final whole-checkout
comment review; this fixture result does not replace T075.

## Calendar-date regression RED — 12:46:48 MYT

Before the fix, `npm test -- --run tests/unit/performance.test.ts tests/unit/documentation.test.ts`
under the recorded Node24 PATH exited 1: **2 failed, 230 passed (232)**.
`T063 rejects impossible calendar dates normalized by Date.parse` observed a missing
throw; `DOC-invalid: rejects calendar` observed `expected 0 to be greater than 0`.
Both supplied an impossible `2026-04-31` review date and an otherwise valid May 1
clock/report. Date.parse normalized April 31 into May 1 and incorrectly accepted it.
Combined sorted checker/test four-file fingerprint before correction:
`93dc749eda9585a60ba672fc9e08109c4e4fc7e0e33b94c1cb0098246c80bd1f`. The shared calendar/applicability correction starts only
after this record; no collector or performance threshold behavior changes.

## Shared-rule/calendar GREEN follow-up

The candidate shape and exact-matching helpers were exported for the existing performance
checker, avoiding a second candidate rule. Shared `isCurrentReview` now verifies a real
UTC calendar instant and the inclusive seven-day window. The April-31 regression had
valid observed RED above before correction. At 12:48:15 MYT the five selected suites
passed 537/537, including 48/48 documentation tests; typechecking and whitespace passed.
Checker/test code has no mechanical documentation findings. Documentation checker/test
fingerprint: `22e27e0f78ee03ccab7f10324713d31360ad698b5fc75d125691591b3eb48ad0`.
This refactor/correction changes no source/reader behavior and establishes no full-app
human accuracy approval. Root controls package/docs/task wiring and final delivery review.
