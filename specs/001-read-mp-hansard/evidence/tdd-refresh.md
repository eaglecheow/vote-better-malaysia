# T030 refresh tests and inert planning scaffold

## Scope and API agreement

T030 is test writing only. T034 remains blocked on the complete T032 RED gate and the US1 T028 prerequisite. No incremental planner, historical-sweep state, refresh report or prioritized acquisition behavior has been implemented. The only production-file change is the inert typed `planRefresh(previous, latest, now, bucketChecks)` export, returning empty targets and bucket `-1`; existing bootstrap/full-refresh acquisition behavior is unchanged.

The agreed `RefreshPlan` has `sittingIds`, `historicalBucket` and `overdueIds`. Hash the exact canonical source-ID UTF-8 bytes with SHA-256, interpret the entire digest as an unsigned integer and take modulo six. Choose the oldest successful bucket completion timestamp; null comes first, and equal timestamps use the lowest bucket index. Priority is deduplicated new/unavailable records, prior failures, latest thirty dated sittings, checks strictly more than twenty-four hours old, then the selected historical bucket. Within that bucket, older successful `acquiredAt` comes first, with exact code-point lexical source-ID ties. The explicit test ordering for new/unavailable is descending date; prior failures use oldest `lastAttemptAt`; recent dates use descending date. The planner does not advance any caller metadata.

New private checkpoint metadata is `refresh.bucketChecks`, containing six nullable successful bucket-completion timestamps. New private `receipts/<sessionId>/refresh.json` assertions describe strategy (`incremental`/`bootstrap`), baseline (`checkpoint`/`served`/`none`/`unrecoverable`), selected bucket, target/completed/changed/unchanged/failed/pending/overdue IDs, `bucketCompleted` and separate acquisition/staging outcomes. Completed IDs mean validated accepted source responses, rather than merely started requests. Only a fully successful selected historical bucket advances its sweep timestamp. Partial plan metadata preserves selected targets/completed work without pretending a sweep completed. These fields remain test contracts pending T034 implementation; no CLI flag was added.

## Final observed RED

- UTC time: 2026-10-10T05:12:23Z; Node 24.21.0; base commit `1c4b079935bc5b7604474c1ba55def43ed6f0270`.
- Command: `npm test -- --run tests/unit/acquisition-refresh.test.ts tests/unit/acquisition-bootstrap.test.ts`.
- Exit 1: **all fifty-two new refresh cases fail behaviorally**, while **all ninety-nine existing acquisition cases pass**. Durable output: [tdd-refresh-red.log](tdd-refresh-red.log).
- Thirty-one new pure-planner cases observe empty targets/bucket `-1`, missing priorities/coverage or missing rejection for unsupported clocks/history. Twenty-one actual controlled filesystem/transport/clock cases observe full native-inventory reacquisition, wrong request priority, skipped retained historical work, ignored interrupted target scope or absent refresh/sweep accounting.
- No fixture, syntax, import, unexpected filesystem or harness exception counted as RED. Positive planner catalogues pass the authoritative `validateCatalogue` before reaching the inert planner. A preliminary duplicate synthetic ID was corrected, all six known hash buckets are now represented, and future successful-check simulations also update the separate attempt timestamp coherently. Those preliminary runs are not the final recorded RED.
- The first shell preflight reused zsh's read-only `status` variable after testing; that shell failure was repaired and did not count as a valid RED command. The final command uses the dedicated `refresh_red_exit` variable.

### Working-tree fingerprints at the final RED

```text
scripts/acquire.ts: abed2917b0a8a273118f7b305ae4b3fa47fde793f285f7b589554dfb826b7c5d
tests/unit/acquisition-refresh.test.ts: cf9caf316cee6f52005884dc06d51ea0b214ee4460b9933a3a123319e49d5144
tests/fixtures/catalogue.ts: e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a
```

## Behavior identifiers and observed failures

- `REF-PLAN-001`: expected latest thirty plus oldest historical bucket, observed no targets.
- `REF-HASH-1/2/3/4/23/1839/22462/26241/29326/22942`: independently known full-digest modulo-six assignments outside the latest thirty; observed bucket `-1` and no historical target.
- `REF-BUCKET-all-null/null-first/equal-checks/oldest-five`: expected null-first/index-tied/oldest completion selection; observed bucket `-1`.
- `REF-INVALID-NaN-clock/infinite-clock/empty-history/five-checks/seven-checks/malformed-date/numeric-date/future-check`: expected rejection; inert planner does not throw.
- `REF-PRIORITY`: expected new/unavailable, prior failed, latest thirty, overdue and bucket order exactly once; observed empty plan.
- `REF-OVERDUE` at 86,399,999/86,400,000/86,400,001 ms: strict boundary plus selected bucket targeting; observed missing bucket and missing overdue catch-up.
- `REF-ORDER`: expected older successful historical checks and exact-ID ties; observed no ordered targets.
- `REF-SIX-PLAN`: expected six different buckets and full historical coverage; observed six `-1` buckets and no targets.
- `REF-BOOTSTRAP`: expected every fresh inventory ID with no fabricated successful-check age; observed no targets.
- `REF-RETAINED-PLAN`: expected a prior inventory omission within its historical bucket; observed no targets. The accepted catalogue's omission/retention coverage passes authoritative validation.
- `REF-RUN-001`: expected thirty recent plus selected historical IDs; observed all seventy in native old-first inventory order.
- `REF-RETAINED-RUN`: expected an accepted prior omission's historical endpoint to be rechecked without restoring its latest-inventory flag; observed no endpoint recheck.
- `REF-RUN-PRIORITY`: expected first IDs `9999`, `1065`, `1064`; observed `1070`, `1069`, `1068`.
- `REF-CONTENT-false/true`: changed/unchanged accepted hashes and successful-check advances already pass the existing acquisition boundary; the new required changed/unchanged completion report is absent.
- `REF-FAILED`: bounded retries, unchanged retained payload/digest/acquisition time and new failed-attempt time already pass; new failed-target/incomplete-sweep report is absent.
- `REF-THROTTLE`: actual Retry-After pacing and eventual accepted response pass; new one-completed-target accounting is absent.
- `REF-SIX-RUN`: six actual four-hour controlled runs reacquire all seventy records each and expose no selected buckets; expected six incremental historical sweeps.
- `REF-CATCHUP`: existing full refresh happens to acquire the overdue record; explicit overdue plan/accounting is absent.
- `REF-INTERRUPT`: accepted output/checkpoint preservation already passes the existing four-hour cap; expected prioritized accepted ID `9999` and private sweep metadata are missing.
- `REF-RESUME`: a real accepted private interruption, supplied with explicitly synthetic target metadata, is restored safely; observed sixty-nine native remaining records instead of thirty-seven selected pending IDs.
- `REF-FATAL-discovery/inventory/record/output`: actual fatal boundaries preserve prior output/checkpoint bytes; new separate acquisition/staging run outcome report is absent.
- `REF-NO-STATE`: safe full bootstrap already succeeds; explicit bootstrap/no-baseline target report is absent.
- `REF-LOST-false/true`: missing/expired baseline correctly blocks replacement without source requests; new unrecoverable-baseline run report is absent.
- `REF-RETENTION`: validated state exactly seven days old remains usable; required incremental/trusted-checkpoint receipt is absent.
- `REF-SERVED-false/true`: independently supplied controlled trusted served receipt/checksums recover missing/expired state and retain a failed record's exact bytes/digest/acquisition time; required bootstrap/served-baseline recovery report is absent.

Each test's initial assertion failure is linked in the durable log. Existing byte preservation, successful time/hash handling, rate/retry/request timeout, trusted origin/checksum/schema recovery and cap invariants are not falsely presented as new RED: their ninety-nine foundational tests remain GREEN. Some combined assertions stop before later assertions; that does not establish a separate failure for the checks already supported by the foundational implementation.

## Verification and remaining gate

The fixture archive is wholly synthetic: seventy small normalized assigned contributions, invented sitting IDs/dates/hierarchy, one source-derived member identity, actual deterministic gzip/checksum bytes and real temporary local-development state/output. A synthetic reviewed-main served proof is separately controlled; no real GitHub workflow/publication provenance is asserted. Tests measure controlled pacing and synthetic schedule intervals, not live source latency or archive fit. The output-size fault changes a controlled measurement boundary to 900,000,001 bytes without allocating that amount.

Own scoped strict TypeScript check passes with ES2023/DOM, Bundler module resolution and Node/Vite types. Final full `npm run typecheck` after the fifty-two-case RED passes, exit 0. Earlier concurrent reader animation-frame and collector CDP typing failures were reported to their owners and repaired independently; neither error counted as RED. `checkCodeDocumentation` restricted to acquisition and the new refresh tests reports zero findings. Existing acquisition plus messages regression run passed **182/182**. `git diff --check` passed.

No T030 task marking, package/developer-document changes, main TDD changes, refresh production behavior, live bootstrap or commit was performed. The foundation regression pass establishes only that the inert export leaves existing behavior intact. T034 GREEN, full shared regressions/typecheck and actual scheduler/publication evidence remain pending.

## T034 implementation and final GREEN — 2026-10-10

The original test-writing/RED evidence above remains historical. Root authorized
T034 after completed T027 re-staging under [source-policy.md](source-policy.md) and
the separately approved local Firefox phase exception; T028 remains unchecked.
Additional required validation/reporting cases and peer-review regressions had actual
behavioral RED before their implementation/fixes, recorded in
[tdd-refresh-additional.md](tdd-refresh-additional.md).

The final refresh suite passes **86/86**, including the unchanged 52 original assertion
bodies. Together with 99 existing bootstrap cases, controlled acquisition GREEN is
**185/185**. The final relevant 18-file regression command passes **1024/1024**, exit 0,
at **17:32:07 MYT**, duration 8.84 s; exact command, final source/test fingerprints,
private outcome/state contracts, tested behavior and limits are in
[source-refresh.md](source-refresh.md). Durable output is
[tdd-refresh-regressions.log](tdd-refresh-regressions.log).

Typecheck passes, the global callable documentation scan has zero findings, and diff
checks pass. No broader refactor was necessary; only the concrete private atomic-commit
boundary and redundant completed-resume cleanup were required and regression-tested.
This is controlled refresh GREEN, not an actual scheduled workflow or deployed-source
latency/publication result. No task markers, main aggregate evidence, source/main/message
code, package/configuration or commits were edited by this implementation owner.
