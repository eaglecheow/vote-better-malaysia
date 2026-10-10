# CI input/laboratory TDD preparation

Current local status: production `prepareCiInputs`, `verifyCiInputs` and `reconcileLabReport` are implemented; the final **201 CI + 207 publication cases pass**. The later sections retain observed RED before each correction and final exact hashes. [Final verification](final-verification.md) records the unrestricted **2,021/2,021** pass and T073's bounded configuration completion. No hosted enforcement, laboratory/device, human-review or publication acceptance is claimed.

At the initial preparation below these exports still returned `undefined`; that dated inert scaffold is preserved as the actual pre-production RED context. Root owns `ci-workflow.test.ts`, `ci.yml`, aggregate evidence and task markers.

## Assumption and concrete boundary

Root accepted the notes-consistent reviewed-main/manual CI producer. A producer's genuine GitHub workflow SHA is distinct from the explicitly checked-out PR revision and remains separately recorded. Original tested PR head/base/repositories, run/attempt/archive identities and digests stay immutable in the reviewed locator. A later documentation/evidence-only PR head can reuse those inputs only with the same actual application fingerprint and frozen bytes plus a review matching current documentation. Provider PR commit history must contain the original tested head; current PR head/repositories/base and actual run attempt are independently checked. CI scope is merge-only and cannot authorize publication or acquired/served state.

Fixed files used by the controlled tests:

- Reviewed locator: `specs/001-read-mp-hansard/evidence/ci-inputs.json`.
- `work/candidate/site/` is the frozen public file set; external `candidate.json`, `fixtures.json`, `origin.json`, `automated.json`, `source.json` belong in `work/candidate/`.
- `work/lab/lab.json` and `origin.json` preserve original collector output and its candidate archive binding.
- Main evidence is `work/reports/{performance,documentation,automated,source}.json`.
- Manual preparation restores only independently selected compatible main Pages `hansard-state` files from `work/source-state/{checkpoint.json,origin.json,snapshots/**}`; incomplete/incompatible source fails. No PR progress is relabeled as trusted state, and no unit test requests live source data.

The documented REST [run](https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run), [artifact](https://docs.github.com/en/rest/actions/artifacts#get-an-artifact) and [PR](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request) metadata endpoints were reread on 2026-10-10. Fixtures retain official-shaped native fields, rather than inventing a provider checked-out-head field. Future implementation can share the fixed-origin GitHub HTTP primitive, while keeping CI role validation separate from main-only publication validation.

## Verified initial RED

Run started `2026-10-10T11:20:01.503000+00:00` on Node 24.21.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/ci-inputs.test.ts --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-ci-inputs-red.json > specs/001-read-mp-hansard/evidence/tdd-ci-inputs-red.log 2>&1
```

Exit **1**; **159 cases = 157 behavioral failures + 2 existing-boundary GREEN controls**. All **175** recorded failure messages are `AssertionError`; zero import/syntax/dependency/fixture/TypeError failures. The exact initial result is archived under the initial filename below; its original executed command/output filename was `tdd-ci-inputs-red.json`. The complete [initial structured report](tdd-ci-inputs-initial-red.json) retains every identifier, assertion, location and duration. [Initial raw command log](tdd-ci-inputs-initial-red.log) uses Vitest's JSON reporter, so assertion detail lives in the structured report. Report SHA-256 `9aff980597eff5d28b0f9f5cb0e403d77e5c731902097896818c23ec4601e2cb`.

Stable input hashes observed before and after this run:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `605b5c5e769136a86cd5c698db09b5f48fa8905999cce1ef33c95942cde83ef8` |
| `tests/unit/ci-inputs.test.ts` | `da9e2e70bc7b46aa0a0250ef908091937e3df1634dc0cc27f93beb0d2cc877f0` |

Observable missing behavior: positive results return no merge-only candidate or truthful producer/tested context; reject cases accept invalid or missing provider/data/report inputs; no command/source restoration occurs in preparation; native CLI exits zero without required inputs. Soft positive assertions reach the actual result/metadata/command checks independently. Preserved byte equalities already hold for the inert no-op and are GREEN controls, never separate RED claims.

Coverage groups recorded in the report:

| Prefix | Cases |
| --- | --- |
| `CI-HARNESS` | 1 |
| `CI-ACCEPT` | 1 |
| `CI-ORIGIN` | 40 |
| `CI-CLAIM` | 42 |
| `CI-MISSING` | 11 |
| `CI-CURRENT` | 4 |
| `CI-LOCATOR` | 1 |
| `CI-LAB-ACCEPT` | 1 |
| `CI-LAB` | 28 |
| `CI-UNAUTHENTICATED` | 3 |
| `CI-PREPARE` | 1 |
| `CI-PREPARE-ORIGIN` | 6 |
| `CI-PREPARE-MISSING` | 3 |
| `CI-PREPARE-SOURCE` | 4 |
| `CI-PREPARE-COMMAND` | 2 |
| `CI-PREPARE-MISSING-SELECTION` | 1 |
| `CI-PUBLICATION-CONTROL` | 1 |
| `CI-CLI` | 3 |
| `CI-TARGET` | 6 |

Provider cases cover candidate/lab/evidence/source/current-run repositories, branches, workflows/IDs, producer success, attempts, archive roles/bindings/digests/expiry/chronology and current/original PR context. Candidate/review cases cover exact revision/snapshot/application/artifact/ranked-fixture/conditions/prior-baseline binding, native three-engine receipts, complete source accounting and required current reviews. All six actual-target omissions are tested separately. Actual file removals and changed current application/docs/deployed bytes use isolated native temporary files.

Lab cases reconcile original candidate/review/runner/served bytes, each profile/sample/processing/percentile and original raw operation/run/profile/observation/order, reject omitted observations/profiles/devices and enforce complete existing budgets/field disclosure. Controlled lab fixtures run the actual `collectLab` function against a documented synthetic observation boundary: 240 raw records, no native-browser or device measurement claim.

The positive `CI-HARNESS` control independently passes `measureArtifact`, `evaluateBudgets` and current-file `checkDocumentation` around five actual compressed normalized synthetic sitting files. `CI-PUBLICATION-CONTROL` specifically observes the existing `Invalid requested publication artifact` rejection for `hansard-ci-candidate`; it is not new RED. An early draft's literal `index.html` map-key setter was repaired after one harness TypeError; that run is excluded from this record. All final failures above are valid assertions.

## Checks and next gate

`npm run typecheck` passes; the actual AST documentation checker reports zero `ci-inputs` callable findings; `git diff --check` passes. These support test/scaffold preparation, not CI enforcement or physical performance acceptance. No GREEN implementation/no-refactor claim yet. Root's T055/T056 gate and an explicit production GO are still required. Remote failed required-check enforcement, branch protection and actual full hardware/laboratory acceptance remain delivery evidence.

## Final scoped RED and concrete CLI design

Self-review repaired the positive external fixture manifest to the installed collector CLI grammar: `{datasets:{median,p95,largest:{path,memberId}},interactions:[{path,memberId}]}`. `candidate.fixtureHashes` remains its separate immutable byte-digest map. Three new behavioral assertions reject wrong ranked roles, a nonexistent selected member and missing gap interactions. No collector/native-host bypass or production behavior was added.

Root approved the separate actual executing `producingRevision` field bound to `GITHUB_SHA`, and reuse of the existing `HANSARD_TEST_ORIGIN` secure test-only repository-subpath setting. One producer-SHA mismatch and six secure-origin/device-URL failures were added before production. Only type/interface fields changed in the inert seam; every exported implementation still returns `undefined`.

Final full run, same command, began `2026-10-10T11:23:19.468000+00:00`: **169 = 167 behavioral AssertionError RED + 2 GREEN controls**, with **185** reached assertion messages and no other failure types. [Pre-review complete JSON](tdd-ci-inputs-pre-review-red.json), [pre-review JSON-reporter log](tdd-ci-inputs-pre-review-red.log); report SHA `e6b51d9a913977e22d1dfaec2479bc60215c0036a5ea816ca0fe849d4717ca7b`. Stable hashes before/after:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `b03895d9215f6bc4e16e91d9e10e93833e0cd51a0f8c2ca7fa3ee2b0f5235871` |
| `tests/unit/ci-inputs.test.ts` | `464f90bfba2541b66c45593a6fb7004d7859bd798b815f066d7c450a8fee636c` |

- `CI-HARNESS`: 1 cases.
- `CI-ACCEPT`: 1 cases.
- `CI-ORIGIN`: 41 cases.
- `CI-CLAIM`: 45 cases.
- `CI-MISSING`: 11 cases.
- `CI-CURRENT`: 4 cases.
- `CI-LOCATOR`: 1 cases.
- `CI-LAB-ACCEPT`: 1 cases.
- `CI-LAB`: 28 cases.
- `CI-UNAUTHENTICATED`: 3 cases.
- `CI-PREPARE`: 1 cases.
- `CI-PREPARE-ORIGIN`: 6 cases.
- `CI-PREPARE-MISSING`: 3 cases.
- `CI-PREPARE-SOURCE`: 4 cases.
- `CI-PREPARE-COMMAND`: 2 cases.
- `CI-PREPARE-MISSING-SELECTION`: 1 cases.
- `CI-PUBLICATION-CONTROL`: 1 cases.
- `CI-CLI`: 3 cases.
- `CI-TARGET`: 6 cases.
- `CI-TEST-ORIGIN`: 6 cases.

The agreed minimal workflow/controller split uses pinned exact-artifact-ID downloads with `digest-mismatch:error` in workflow configuration; the CI verifier independently authenticates provider metadata and fixed native inputs, without a second archive extractor. `node scripts/ci-inputs.ts prepare` and `verify` consume `GH_TOKEN`, actual `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, `GITHUB_SHA`, `HANSARD_CI_WORK`, `HANSARD_PR_NUMBER`, `HANSARD_PR_BASE_REVISION`, optional fixed-default `HANSARD_CI_LOCATOR`, and existing `HANSARD_TEST_ORIGIN`. Actual checkout SHA is derived from `git rev-parse HEAD` and authenticated against PR context; it is separate from the producing SHA. Preparation additionally consumes provider-selected `HANSARD_SOURCE_RUN_ID`, `HANSARD_SOURCE_RUN_ATTEMPT`, `HANSARD_SOURCE_ARTIFACT_ID`, `HANSARD_SOURCE_ARCHIVE_DIGEST` and its exact downloaded complete-source bundle. These selection outputs grant no authority by themselves.

Actual future outputs are external `work/result.json`, `work/candidate/site`, `work/candidate/candidate.json` and collector-compatible `work/candidate/fixtures.json`, plus external origin/source/automated metadata. Frozen browser/lab/checker paths use those same bytes. Verification neither builds nor changes candidate sourceRevision/metadata. Preparation preserves original source capture times and references, performs one build and actual checks, then freezes only complete source-verified output. Missing/unrecoverable compatible source fails closed. The native CLI and outputs remain unimplemented at this RED stage; the design is not an execution claim.

Implementation will reuse `applicationFingerprint`, `measureArtifact`, source checkpoint/schema validators, `sameCandidate`/`isCurrentReview`, `evaluateBudgets` and `checkDocumentation`. Only the existing fixed-origin GitHub HTTP primitive needs a narrow shared export; CI execution/candidate/lab/main-evidence role rules stay separate from publication proof registration. Exact original lab runner/profile/served-byte/raw values are compared before the unchanged strict full performance gate. No synthetic device assembly, trusted-flag mode, revision rewriting, source subset or publication eligibility is introduced. T055/T056 and root's explicit production GO remain outstanding.

## Peer-corrected final RED: PR context, strict matching budgets and lab handoff

The previous positive PR-run fixture incorrectly used its merge SHA as native `run.head_sha`. Before production, peer review identified that mismatch. [Official event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request) distinguishes `GITHUB_SHA` (test merge SHA) from the explicit PR head checkout. [Official PR documentation](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request) states an open mergeable PR's `merge_commit_sha` identifies that test merge commit. The independently fetched [public run 36514614210](https://api.github.com/repos/actions/checkout/actions/runs/36514614210) has `event=pull_request`, `run.head_sha=384ec1874287eccce8e9af4362bf8096f614c5f8` and the same `pull_requests[0].head.sha`; compact dated [native evidence](tdd-ci-pr-context.json) retains its raw hash/source/private path. The sample is a dated observation, not an assertion about another run's current state.

The repaired positive fixture keeps native `run.head_sha=checkedOutRevision=PR.head.sha=2…`, actual executing `GITHUB_SHA/producingRevision=PR.merge_commit_sha=4…`, and the manual candidate/lab producer SHA `3…` distinct from original tested head `1…`. Existing PR-head mismatch rejection stays; a separate merge-SHA mismatch assertion now fails behaviorally. Actual workflow context never requires `GITHUB_SHA == run.head_sha` for PR events and no imaginary native provider field is added. Manual reviewed-main producer `head_sha` semantics remain unchanged.

The old over-budget case changed only the full report and therefore exercised copy mismatch. It remains honestly labeled unmatched copying. New `CI-LAB-MATCHING-BUDGET` runs the actual `collectLab` function on controlled original cold traces with LCP=3000 ms, obtains 240 raw records plus genuine calculated profiles/percentiles, and copies those runner/profile/raw/served-byte values unchanged into the full report. Native fixture assertions confirm exact copying and the existing `evaluateBudgets` authority independently rejects the 2500 ms ceiling. Only then does the new reconciliation rejection assertion execute and fail (`expected null to be an instance of Error`). This proves the strict budget boundary requires implementation rather than merely a compare-only rejection. Controlled traces remain enforcement-only; no actual-device/lab-host claim is made.

The concrete workflow handoff stores original lab metadata outside site bytes. Preparation cannot invent an upload ID: first freeze/upload `work/candidate/`; the pinned upload's real artifact ID/digest are then passed as environment values to a reviewed JSON-writing shell step after native collection writes `work/lab/lab.json`. That step reads the exact candidate/origin and lab candidate, stores actual collecting run/attempt/producer SHA plus original checked-out PR context, and `candidateArtifact` containing that real candidate run/attempt/archive ID/digest. Upload `lab.json` and `origin.json` together from their common parent. Later CI verification independently checks this binding against locator/provider metadata. Four focused RED assertions now reject substituted lab producer SHA, original tested checkout, selected candidate ID or selected candidate archive digest. No extra controller command or publication authority is needed. The successful prepare assertion also reaches genuinely missing `work/result.json` metadata instead of assuming shell output exists.

Corrected full run began `2026-10-10T11:38:49.632000+00:00`: **175 cases = 173 behavioral RED + 2 existing GREEN controls**, **192 AssertionError messages**, zero harness errors. [Authoritative corrected complete report](tdd-ci-inputs-red.json), [raw command log](tdd-ci-inputs-red.log); SHA `a9b302e2385365661831a28185694e1ddcc601bdc93d31b40b169addd19fb702`. Stable before/after module `b03895d9215f6bc4e16e91d9e10e93833e0cd51a0f8c2ca7fa3ee2b0f5235871` and test `0b66877c18536fe4cd9ad1b78f2ba16c03c5b81ea69f65b0eef47c3c28583b35`. Typecheck, own-callable documentation and whitespace checks pass after the correction. All CI implementations remain inert. T055/T056 and root GO still govern production.

## Production gate and narrow shared-authority extraction

Root explicitly authorized CI production after the completed T055/T056 gates and peer-corrected RED. Before implementation, the existing `publication.ts` fixed-origin JSON primitive was exposed with only `repository`/`transport` parameters, and the existing ranked-path/hash and fixed-condition expressions were extracted without changing their values. The existing independent secure test-origin validation and acquisition compatibility-byte order also have small reusable exports. CI never calls the main-only publication verifier with invented context or registers a publication proof. [Before-refactor control](tdd-ci-publication-before-refactor.json) and [after-refactor control](tdd-ci-publication-after-refactor.json) each pass **194/194** original publication cases.

Positive CI fixture metadata now uses the actual shared conditions digest and independently cloned original PR context objects; those changes prevent shared fixture aliases from masking locator/producer disagreement. A focused coherent conditions-drift case changes every candidate/report copy consistently and still requires rejection against the actual current contract. The final inert run is **176 = 174 valid assertion RED +2 existing controls**; [complete final RED](tdd-ci-inputs-final-red.json), [command log](tdd-ci-inputs-final-red.log), report SHA `beec957d7f719440e927a5e8d7151292b3d6ca17a760a852db6ed0b05d6a7d79`. CI production was implemented only after this observed RED.

First implementation run passed **176/176**; typecheck passes, complete callable check is `[]`, and unchanged core publication/acquisition/retention suites pass **384/384** ([core report](tdd-ci-core-regressions.json)). These are controlled enforcement checks, not a hosted GitHub run or physical performance result.

## Focused self-review RED before follow-up fixes

Two concrete operational boundaries were reproduced before changing their production logic. Actual preparation selects a separate real gap sitting outside median/p95/largest and writes its stored hash; reuse then incorrectly rejected that legitimate extra path against the ranked-only map. `CI-GAP-ROUNDTRIP` reaches the real prepared output and actual reuse rejection. Separately, three independently authenticated candidate/lab/evidence archives created during attempt1 were incorrectly accepted as attempt2 archives when the requested attempt began after their creation. The provider attempt endpoint supplies native `run_started_at`; no invented artifact-attempt field is used. [Official attempt API](https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run-attempt) documents that attempt resource and field.

The focused run is **4/4 AssertionError RED**, zero harness errors; [complete report](tdd-ci-roundtrip-attempt-red.json), [command log](tdd-ci-roundtrip-attempt-red.log), SHA `cdc3b3126ea2e0601c966f33e37c08e59250ba12036805cf73df03c01245eaec`. Gap failure is the actual `CI ranked fixture digest map mismatch`; each chronology rejection failed because actual verification returned success. Typecheck and callable checks pass. Root was sent the exact minimal union-of-used-fixtures and native attempt-start validation changes before follow-up production.

Root inspected the four actual assertions and authorized only their stated minimal fixes. Before fixing, the source-artifact role was independently added to the same authentic old-attempt regression and also fails behaviorally; **5/5 valid AssertionError RED** in [final scoped report](tdd-ci-roundtrip-attempt-final-red.json), [log](tdd-ci-roundtrip-attempt-final-red.log). Exact command: `npm test -- --run tests/unit/ci-inputs.test.ts -t 'CI-GAP-ROUNDTRIP|CI-ATTEMPT' --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-ci-roundtrip-attempt-final-red.json`. Pre-fix hashes:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `cd136c44c47e22899ff08497eb2ed91ef5e0b9af3dd9619e956bb589b8b352ed` |
| `scripts/publication.ts` | `29e01b27fef2e3c82b991d190a4175fe1ba16625140c97a4b79b820ec5705e6a` |
| `tests/unit/ci-inputs.test.ts` | `fa67f5dc84fc22dcfa87a46d31c11e8883035fa1978c5bfd3378b3aa16b77d72` |
| `specs/001-read-mp-hansard/evidence/tdd-ci-roundtrip-attempt-final-red.json` | `7ff8d5a154278cab60601e997a041197f8cf7a5264714c07d5297f1f79870b95` |

Reached failure cases:

- `CI-GAP-ROUNDTRIP: prepared gap outside median/p95/largest remains an authenticated reusable frozen fixture`: AssertionError: expected Error: CI ranked fixture digest map misma… to be null
- `CI-ATTEMPT candidate: old archive cannot authorize a later successful attempt`: AssertionError: expected null to be an instance of Error
- `CI-ATTEMPT laboratory: old archive cannot authorize a later successful attempt`: AssertionError: expected null to be an instance of Error
- `CI-ATTEMPT evidence: old archive cannot authorize a later successful attempt`: AssertionError: expected null to be an instance of Error
- `CI-ATTEMPT source: old archive cannot authorize a later successful attempt`: AssertionError: expected null to be an instance of Error

Production is still unchanged at this record: no publication-origin attempt behavior was changed. The role-independent CI branch will enforce `run.created_at <= run_started_at <= archive.created_at <= run.updated_at <= now`; existing original artifact expiry constraints remain.

Peer read-only review identified a real native shape mismatch: `stageData` writes checkpoint `runId` but no `runAttempt`, and publication copies those immutable bytes. The original positive CI fixture supplied an unsupported checkpoint field. `CI-NATIVE-CHECKPOINT` removes only that invented field while preserving API/origin attempt authentication; real preparation rejects before commands. The focused [RED report](tdd-ci-native-checkpoint-red.json)/[log](tdd-ci-native-checkpoint-red.log) contains one valid assertion-failing case (three reached acceptance assertions), no harness error. Production checkpoint-attempt acceptance remains unchanged at this record. Pre-fix hashes:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `c9b34bc21f5f4f26bad449ad7a719f55c5880832f213ddfc278d752df10c7203` |
| `tests/unit/ci-inputs.test.ts` | `25ef1968a4bbddc649b925d14ace8373897572e84191846a5e0c949de361e44e` |
| `specs/001-read-mp-hansard/evidence/tdd-ci-native-checkpoint-red.json` | `34e07a1e933b62d5eed2e69060764b4f578ee8755f386174a95dc45035eb168d` |

## Required reviewed TDD and current-base gates

Root approved the narrow full-report contract: `reports/automated.json` alone requires `tddReviewed:true`, a nonblank `tddReviewer`, and `tddEvidence` containing exact checkout-relative lowercase SHA-256 values for every current regular `tdd*.md` narrative in the fixed feature evidence directory, including `tdd.md`. Native preparation receipts do not invent human review. Thirteen independently reached RED cases in **each** of CI and publication reject missing/false approval, missing/blank reviewer, missing/array manifest, omitted narrative, malformed hash, unsafe extra entry, newly added narrative, current narrative drift, symbolic narrative and missing aggregate. Existing provider-authenticated report candidate/review time bindings remain authoritative.

Six additional CI cases reproduce a coherent advanced-main base while the PR head/app/frozen candidate stays unchanged. Actual options base and GITHUB_SHA/merge context, PR API base/merge fields and current-run association are advanced together; a native-shaped compare resource says behind/diverged or identifies a different merge base. Both native preparation and frozen verification currently accept them, so each rejection assertion fails. [Official compare API](https://docs.github.com/en/rest/commits/commits#compare-two-commits) provides status/base_commit/merge_base_commit/behind_by; no inferred provider field is introduced.

Observed command: `npm test -- --run tests/unit/ci-inputs.test.ts tests/unit/publication.test.ts -t 'CI-TDD|PUB-TDD|CI-BASE' --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-ci-reviewed-base-red.json`. [Complete RED report](tdd-ci-reviewed-base-red.json)/[log](tdd-ci-reviewed-base-red.log): **32 valid AssertionError RED**, no passed cases or harness errors. Production reviewed-TDD/base checks remain absent at this record. Pre-fix hashes:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `44de4a7f5cf231a29e5a912eab2752933f80e2a1ffb2b92543aee1d3960b6a99` |
| `scripts/publication.ts` | `29e01b27fef2e3c82b991d190a4175fe1ba16625140c97a4b79b820ec5705e6a` |
| `tests/unit/ci-inputs.test.ts` | `03f28f85107eac6ab5f4025cb326e9c2e104416d12f6d617163ed7a9157059f7` |
| `tests/unit/publication.test.ts` | `4ea4c63e4d69b5f3b3e7770c557a060ea7abd6fe69969909208fc100cdf0cdec` |
| `specs/001-read-mp-hansard/evidence/tdd-ci-reviewed-base-red.json` | `7c325841a7817705af91769d2e98bef4fb2524467f84059656ea63ef4d5f976e` |

## Final implementation GREEN and actual boundaries

After each observed focused RED and root authorization, CI now authenticates provider repository/workflow/run/attempt/artifact/digest/expiry identities independently of downloaded claims. Native PR `head_sha`, explicit checked-out head, current main base and actual `GITHUB_SHA` test merge remain separate facts. The current base must be an actual ancestor according to the authenticated native compare response. Original candidate/lab producing revisions and checked-out PR context are preserved across reviewed documentation/evidence-only reuse; imported origin/PR metadata never becomes publication state. Archive creation must fall within its actual authenticated attempt start/completion window. The exact canonical `measureArtifact` digest and schema/source validators remain the only deployed-file/accounting authority.

Preparation imports only a complete compatible independently authenticated main Pages source archive, preserves original source times/identities, builds once and performs actual native type/unit/three-engine browser checks using `HANSARD_FROZEN_SITE=dist`. It then freezes exact output and writes machine receipts plus separate merge-only origin metadata. It does not manufacture physical-device reports or named human TDD review. Verification uses exact immutable candidate/lab/evidence selections, current application inputs, ranked plus real gap-interaction hashes, complete source/automated/documentation evidence and exact original collector runner/profile/served-byte/raw observations before the unchanged strict full budget/target checker. Genuine acquisition checkpoints omit `runAttempt`; authentication binds the independently retained origin attempt, rather than changing original checkpoint bytes.

The reviewed-TDD follow-up is intentionally shared between CI and publication full evidence only: a named human approval and exact current `tdd*.md` SHA-256 manifest are required after candidate/current-time/provider report authentication. Native preparation receipts remain machine-only. No public reader/storage/source behavior, acquisition pacing, new workflow role or arbitrary trusted flag was introduced. The minimal refactor extracts the existing ranked/current-condition/provider/test-origin/compatibility rules; no further refactor is needed.

Actual commands:

- `npm test -- --run tests/unit/ci-inputs.test.ts tests/unit/publication.test.ts --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-ci-reviewed-base-green.json`: **408/408 = CI201 +publication207** ([complete GREEN](tdd-ci-reviewed-base-green.json), [log](tdd-ci-reviewed-base-green.log)).
- `npm test -- --run tests/unit/acquisition-bootstrap.test.ts tests/unit/acquisition-refresh.test.ts tests/unit/acquisition-regressions.test.ts tests/unit/source-retention.test.ts --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-ci-acquisition-final-green.json`: **190/190** unchanged acquisition/retention regressions ([complete GREEN](tdd-ci-acquisition-final-green.json), [log](tdd-ci-acquisition-final-green.log)).
- `npm run typecheck`: exit0. The actual TypeScript AST callable checker returns `[]`; `git diff --check` passes.

The concrete commands are `node scripts/ci-inputs.ts prepare` and `verify`, with the previously agreed fixed paths/environment. Workflow pinned exact-ID downloads own transport and enforce native archive digest comparison; the controller independently verifies provider metadata and ordinary native files. External `result.json` identifies the original producing and tested candidate revisions, actual current checkout, merge-only scope, immutable artifact/report paths and `publicationEligible:false`. Native `prepare`/`verify`/foreign CLI invocations without actual credentials/inputs each exit nonzero. Controlled fixtures use real temporary compressed files and the actual collector/checkers, but their command/HTTP/observation boundaries are explicitly synthetic. These passes do **not** prove a hosted GitHub Actions run, remote required-check protection, physical hardware/field compliance, live source reacquisition or publication. Those delivery gates remain independently pending.

Final implementation/test/result fingerprints:

| File | SHA-256 |
| --- | --- |
| `scripts/ci-inputs.ts` | `91e4c76a2cde3dad07944dba8b7627b22403227624772e7a3635949c1f84adac` |
| `scripts/publication.ts` | `54639557994a8b8e8099b4e7ac6300da7ecaba7fa75afac624476d309ebd1ae4` |
| `tests/unit/ci-inputs.test.ts` | `03f28f85107eac6ab5f4025cb326e9c2e104416d12f6d617163ed7a9157059f7` |
| `tests/unit/publication.test.ts` | `4ea4c63e4d69b5f3b3e7770c557a060ea7abd6fe69969909208fc100cdf0cdec` |
| `specs/001-read-mp-hansard/evidence/tdd-ci-reviewed-base-green.json` | `51ca7bd24f5d376c29394d0bca1a9ae2648e383090512be99cc191024aef8343` |
| `specs/001-read-mp-hansard/evidence/tdd-ci-acquisition-final-green.json` | `d1f53487ee1fd06992030624765797852c2dd5e508b895d2742a573fdf53b811` |
