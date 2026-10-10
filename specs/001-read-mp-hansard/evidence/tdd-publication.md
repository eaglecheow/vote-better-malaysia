# Publication controller T038 initial behavioral RED

At 2026-10-10 09:49:34.797–09:49:37.136 UTC (17:49 MYT), Node 24.21.0 ran
`npm test -- --run tests/unit/publication.test.ts` using verbose/JSON reporters.
The result was **125 failed behavioral tests and one passing fixture control**.
Every recorded failure message begins `AssertionError`; there were no hook,
import, syntax, dependency, timeout or fixture failures in this run.

The first preliminary harness attempt found an extra raw-inventory closing brace.
It was repaired before this recorded run and does not count as RED. The repaired
positive control passes `measureArtifact`, every stored `validateSittingRecord`,
`evaluateBudgets`, and `checkDocumentation`. Type checking also passed before RED.

The only production-file changes at this point are documented nonfunctional
export scaffolds returning `undefined`: controller origin/prepare/promote/finalize
and acquisition historical-baseline/external-checkpoint seams. They perform no
validation, acquisition, build, publication, receipt write or state mutation.
Their SHA-256 fingerprints were identical immediately before and after RED:

| File | SHA-256 |
| --- | --- |
| `scripts/publication.ts` | `b33d37cfc3ab8765da11d8d363e5a90c0ced37eafb4de931c90627f3ce0f1982` |
| `scripts/acquire.ts` | `235ce0b3d16ed547bab78d91522a2e2e71561ebe379eabbfe12c6a15d6eb5f9f` |
| `tests/unit/publication.test.ts` | `81737a4c9eec34d5b5753fde5968e0bac705402d3c735365ac2f3b1b4cb9ecc8` |

Covered RED families: independently authenticated GitHub run/artifact origin and
invalid provenance; exact candidate/report/application/fixture/condition/baseline
binding; newer documentation-only evidence origins; unchanged-byte promotion;
missing/failed/expired evidence and durable awaiting status; matching GitHub
deployment/time/live snapshot receipt; wrong/incomplete/untrusted confirmations;
always-recorded skipped/failed/cancelled outcomes; older-candidate versus newer
acquisition checkpoint separation; acquisition/build/check/preparation failures;
external receipt with unchanged original catalogue/checksum; authentic historical
fingerprint recovery and untrusted/incompatible baseline rejection.

The rejection-plus-preservation cases fail because the inert boundaries do not
reject. Their byte-preservation equalities already hold for an inert no-op; those
equalities are not independently claimed as failed behaviors. Synthetic reports
and API responses establish test enforcement only, not live GitHub provenance,
hosting, actual hardware, physical-device acceptance or real publication.

[Initial verbose RED log](tdd-publication-red.log). Structured private report:
`/private/tmp/hansard-publication-red-initial.json`; capture metadata:
`/private/tmp/hansard-publication-red-initial-meta.json`.

## Complete authored runtime matrix RED

At 2026-10-10 09:59:27.050 UTC (17:59 MYT), the same documented command ran the
expanded matrix: **179 tests, 177 behavioral failures and two passing fixture
controls**. Every failure message begins `AssertionError`; no syntax, import,
dependency, hook, timeout, TypeError or native fixture failures occurred. The
second passing control produces and checks genuine accepted capped progress via
the already-green acquisition API, including original complete-checkpoint bytes
and stored/decoded completed-shard hashes. That setup control is not new RED.

Before this final run, the partial setup's case-sensitive cap-message check was
repaired; its preliminary guard failure does not count as feature RED. The
native tar cases retain actual absolute/traversal/link entries. The positive
archive uses `COPYFILE_DISABLE=1` to exclude macOS AppleDouble files and represent
the reviewed Linux Pages file set. Oversized build input uses a real sparse-file
length instead of allocating a giant string or injecting a fake size measurement.

Additional observed RED covers nonserializable immutable proof reuse/JSON cloning,
verified checkpoint receipt readback and invalid persisted bindings, configured
trusted HTTPS/subpath test origin and wrong/missing tested URLs, first publication
without a circular live Pages prerequisite, explicit authentic capped partial
restoration and foreign/corrupt/expired progress rejection, native CLI fail-closed
context/parser behavior, authenticated safe original-tar restoration and unsafe
entry rejection, selected latest-state authentication, missing/expired/incompatible
checkpoint recovery through independently authenticated historical served proof,
next-snapshot receipt carryover, and renewed baseline/application/evidence checks
after deployment approval delays.

Final RED fingerprints were unchanged immediately before and after execution:

| File | SHA-256 |
| --- | --- |
| `scripts/publication.ts` | `406d123405ef41aa2b96e35fcca78d5c4457c43cacf5d5d0c26996ebb7b534c3` |
| `scripts/acquire.ts` | `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac` |
| `tests/unit/publication.test.ts` | `f8be47f9f341bfcb351fe7bdac61d88179854e3b0851c6e043f941ec1d749eaa` |

[Final verbose RED log](tdd-publication-final-red.log). Private structured report:
`/private/tmp/hansard-publication-red-final.json`; stable-fingerprint capture:
`/private/tmp/hansard-publication-red-final-meta.json`. The initial log remains
unchanged. Current typecheck and full callable documentation scan passed before
this run. Existing acquisition regression checks and independent matrix review
are being completed separately; root alone decides the combined T039/T040 gate.
No publication production behavior has been implemented.

At 18:00 MYT, the existing acquisition/bootstrap/refresh/rollback/source-retention
regressions passed **190/190 across four suites**. Current `npm run typecheck`,
the full `checkCodeDocumentation` scan and `git diff --check` passed. These are
regression controls while the 177 publication feature cases remain RED; they do
not claim implemented publication, GitHub configuration or device evidence.

## Reviewed historical-proof fixture correction and durable complete RED

Peer review identified a timeline/origin contradiction in the historical proof
fixture: its served-artifact producer could predate a receipt attributed to a
different later workflow. The affected earlier historical positive/rejection
fixtures are not used to open the gate. They were repaired before implementation:
the original acquired checkpoint remains run101, prepared03:00UTC; independently
authenticated publication/served-artifact producer is completed run299/artifact899;
its receipt confirms03:30, verifies03:31, precedes archive creation03:45 and run
completion03:50. Current executing run300 remains distinct. A new passing fixture
control checks these exact roles/timestamps without claiming new authentication
behavior.

At **2026-10-10 10:04:35.006–10:04:38.186 UTC (18:04 MYT)** the repaired complete
matrix observed **180 tests:177 behavioral AssertionError failures and3 passing
fixture controls**. All177 test failures are missing feature assertions, with no
non-AssertionError failure messages or setup errors. Typecheck and the complete
callable documentation scan passed immediately before this corrected run.
All production scaffolds remain nonfunctional; their hashes did not change.

| File | Stable SHA-256 before/after corrected RED |
| --- | --- |
| `scripts/publication.ts` | `406d123405ef41aa2b96e35fcca78d5c4457c43cacf5d5d0c26996ebb7b534c3` |
| `scripts/acquire.ts` | `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac` |
| `tests/unit/publication.test.ts` | `b206164f71c3525851fdf575ef1291893044d4266a6bdefef378c7934b0115fb` |

The [complete tracked structured report for this earlier run](tdd-publication-red-before-reachability.json) contains every
assertion result, name, status and failure stack, including all177 failure cases.
Its exact bytes match the captured private report, SHA-256
`fba4f045dbcca44b9f24e660aacaa39f1e2956077ceaefbf7d8f52c1b0f722ef`.
This durable JSON is authoritative for complete per-case coverage: verbose console
detail may be truncated/grouped despite its intact final count summary. The
[reviewed console log](tdd-publication-reviewed-red.log) is supplementary. Earlier
logs/reports are preserved as dated history, not substituted for the repaired run.
No T040 production behavior has started; independent review/root authorization
remain the final implementation gate.

## Final pre-origin matrix and staged proof-reuse boundary

Peer review repaired assertion reachability and the prior-site fixture before any
implementation. The prior site now has native regular files, a measured canonical
digest, coherent catalogue/shard hashes and a completed historical publication
origin. Promotion actually probes that known base, including a changed live body
with unchanged local receipt. Finalization success checks independently expected
persisted receipt fields; archive restoration checks actual native file existence;
next preparation checks receipt carryover and the measured new snapshot. A new
postdeployment failure case requires a durable outcome retaining the successful
deployment job and failed confirmation, without claiming old bytes remain served.
The original acquisition checkpoint and later served producer remain distinct;
partial-artifact chronology and current-run timestamps have passing controls.

At **2026-10-10 10:17:22.364–10:17:26.946 UTC (18:17 MYT)** the final pre-origin
matrix observed **183 tests:179 behavioral AssertionError failures and4 passing
fixture controls**. There were no non-AssertionError failures or harness errors.
Current typecheck and the complete callable documentation scan passed before
this run. Every scaffold remained nonfunctional and unchanged during execution.

| File | Stable SHA-256 before/after final pre-origin RED |
| --- | --- |
| `scripts/publication.ts` | `406d123405ef41aa2b96e35fcca78d5c4457c43cacf5d5d0c26996ebb7b534c3` |
| `scripts/acquire.ts` | `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac` |
| `tests/unit/publication.test.ts` | `a19d4d0f2c0c219ce32647810abefabdc19d98f91f98b350fa5944829cac87d4` |

The [complete current structured report](tdd-publication-red.json) preserves all183
assertion results and failure stacks, SHA-256
`1fe2c4c30d85991b6af1d340f56cd44e3bf4acb366ece67cc242bb673b874fa7`.
The [pre-origin console log](tdd-publication-before-origin-red.log) is supplementary;
its detailed frames may be grouped/truncated, so complete per-case evidence uses
the structured JSON. The preceding180-case JSON and dated logs remain unchanged.

The four proof-reuse cases currently reach missing/untrusted authorization RED.
Because the origin verifier is inert, actual verified-object mutation and JSON
cloning do **not yet execute**. Those branches are not claimed as observed RED.
Root's restricted next gate permits only the already-observed API origin verifier
and its internal authentic-origin bookkeeping. It must return genuine mutable
origins, after which the proof-reuse and historical cases will run again while
core historical/checkpoint acceptance and all publication controllers remain
inert. Their reached RED will be recorded before the full implementation gate.

## Restricted authenticated-origin GREEN and reached proof-reuse RED

Root independently repeated all24 API-origin assertions as valid RED, then
explicitly authorized only `verifyPublicationOrigin` and necessary API/authentic
object bookkeeping. At18:21MYT, **24/24 origin tests passed**. The verifier reads
the actual executing repository/run and reviewed workflow, producing run and
immutable artifact metadata through the fixed GitHub REST origin; checks exact
identities, reviewed branch/event/workflow, successful completion, repository
binding, chronology, seven-day lifetime and digest; and binds the downloaded
origin metadata to that producer. It registers a fresh object's immutable scalar
snapshot internally while deliberately returning the real object mutable for
the staged mutation tests. Downloaded `trusted` booleans grant no authority.

At **2026-10-10 10:21:46.530–10:21:51.169 UTC (18:21 MYT)**, the entire unchanged
matrix ran again: **183 tests,28 passing (24 origin behaviors +4 fixture controls)
and155 behavioral AssertionError failures**. There were no harness or nonassertion
failures. All four `PUB-PROOF-REUSE` cases now obtain genuine API-validated mutable
origins: JSON cloning executes on that real object, and each fingerprint/run/
artifact mutation executes without a freeze exception. Core historical acceptance
remains inert, so each reached case fails its rejection assertion with
`expected false to be true`. The historical acceptance/rejection family also
remains behavioral RED after real producing-origin authentication.

| File | Stable SHA-256 before/after authenticated-origin stage |
| --- | --- |
| `scripts/publication.ts` | `71a848f34327f48ceb1024e4ba46ebe253bfcd2715bb3f084aa1955160315633` |
| `scripts/acquire.ts` | `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac` |
| `tests/unit/publication.test.ts` | `a19d4d0f2c0c219ce32647810abefabdc19d98f91f98b350fa5944829cac87d4` |

The [complete after-origin structured report](tdd-publication-after-origin-red.json),
SHA-256 `a22059fba4ad36431d3b5d15e450b9126de125d7ccf2bb39cab110cc4e7e203e`,
preserves every reached result and stack. The [dated console log](tdd-publication-after-origin-red.log)
is supplementary. Earlier pre-origin evidence stays unchanged. Preparation,
promotion, finalization, historical-baseline/core checkpoint acceptance and active
workflow YAML remain inert pending root's combined full implementation gate.

## Controller implementation and provider-shape regressions

Root granted the full T040 implementation gate after independently inspecting the
after-origin report and reached proof-reuse failures. The first complete runtime
matrix passed183/183 at18:36MYT; existing acquisition/bootstrap/refresh/rollback
regressions also passed,373/373 across five suites at18:37MYT. These are controlled
filesystem/transport checks, not actual GitHub publication or device acceptance.

For bounded current-site/application checks, the existing positive transport was
repaired to return its actual native shell files. No synthetic fallback bytes were
added. At10:28:43.671–10:28:45.185UTC, the48 existing promotion/test-origin/archive/
approval assertions still failed behaviorally while controllers were inert;
[structured file-probe RED](tdd-publication-file-probe-red.json), SHA-256
`cf9cbb370c1149bfb745b8492c4c54ae855ef8e3ffb957cb7f30fe677f0f1069`.
Stable publication/acquisition/test hashes were respectively
`60bdb579073d3257de1f6e6e90feec4a5ec04ca78f33fa7a80ae82251030d3c2`,
`da1a1988c227d982f420ea3881d804a1cf3fa40452a90ed46a1ad924374ad106`,
`1f3e6aafb5f22bfe2588edab69b26b654a22c77a47f665d14a6c0e388b5d29f0`.
Normal live checks use decoded catalogue identity/digest plus bounded shell files,
without fetching every sitting. Historical recovery alone retrieves the source
baseline once and reuses its privately registered validated state.

Fresh [GitHub workflow-jobs documentation](https://docs.github.com/en/rest/actions/workflow-jobs#list-jobs-for-a-workflow-run-attempt)
shows a documented attempt-specific endpoint and a response without an embedded
`run_attempt`; its HTML URL example also differs from the previously hardcoded
fixture URL. A focused documented-response test observed valid AssertionError RED
at10:40:50UTC before changing that provider boundary;
[documented jobs RED](tdd-publication-documented-jobs-red.json), SHA-256
`3c441b702128c771d6cf6f162f928ca35b7677b7d542c4ae1366a1604c4382a0`.

Root separately identified that a successful enclosing deployment job can contain
a skipped Pages action. Four real step-response variants (missing/skipped/failed/
foreign) reached the old successful finalizer and failed their rejection assertions.
Together with the documented jobs response, **5/5 valid AssertionError RED** were
captured at10:41:47.952–10:41:48.532UTC, without harness errors, before either fix.
The legacy synthetic attempt scalar is retained only in those negative variants
to reach the pre-fix action boundary; it is not claimed as a documented field.
[Complete executed-action RED](tdd-publication-executed-action-red.json), SHA-256
`ab290f1b3620c582ccff7e0f1e362608b2a7545cee050688a9e0ae9d4d1615e2`.
Stable publication/acquisition/test hashes were respectively
`d9e32eb0d53508dcc834b9993b6ff6408d12924e90e31b6122f477c4282463cf`,
`29b386b3c71b264acbfc85a551823a530b42e5fea9beeb8db9f6a94a1fe36ffc`,
`0734c865d29b8b3e9a53e68bfad458c23b3e7c846a17cd58d6aaf161ab9000c1`.

The [deployment-status API](https://docs.github.com/en/rest/deployments/statuses)
documents confirmation timestamps, deployment URLs and optional log URLs. The
[Pages status API](https://docs.github.com/en/rest/pages/pages#get-the-status-of-a-github-pages-deployment)
supports commit-SHA lookup and supplies status rather than publication time. The
[pinned deployment action source](https://github.com/actions/deploy-pages/blob/d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e/src/internal/api-client.js)
binds artifact ID/build version when creating Pages deployment. Actual environment
log-to-job correlation and remote permissions remain a delivery gate: when the
provider does not expose unique correlation, the finalizer records unconfirmed
failure rather than inventing a publication timestamp or artifact field.

After those provider fixes,188/188 runtime tests passed at18:42MYT with type/docs
checks clear. Independent review then found that the durable journal still set
deployment success from the enclosing job before examining its action step. The
four step tests gained reached native-journal assertions. At
**10:45:08.641–10:45:09.174UTC**, all4 failed with AssertionError on the actual
persisted `deploymentOutcome`; existing receipt rejection/preservation assertions
already passed and are not counted as new RED.
[Complete action-outcome RED](tdd-publication-action-outcomes-red.json), SHA-256
`6dc921405a1102cee3d0ad74edc735359c53f895176b3b60c42c81771123b08c`.
Stable publication/acquisition/test hashes were respectively
`8f0789b402d0489c24e1bc3acc8403fddc192be191f21a4c3106aa98383aabb0`,
`29b386b3c71b264acbfc85a551823a530b42e5fea9beeb8db9f6a94a1fe36ffc`,
`09d99eece4692931f400c681c7134c2283e383103189c5e687d449b2a064086a`.
Missing/foreign/skipped reviewed action must record `not-attempted`; an explicitly
failed action records `failed`, retaining the actual successful enclosing job
result separately. The existing successful-action/failed-live-probe case retains
deployment `success` and confirmation `failed`.

## Separate latest publication history regression

The later [bounded-state native control](publication-bounded-state-control.json)
passed after two genuine controlled successful preparations. Each bundle contains
only its actual checkpoint/origin and referenced current snapshot; stale/older
private snapshots, raw receipts and journals remain outside the bundle. This was
added after the existing copier was GREEN and is explicitly not new RED evidence.

Independent read-only review found one remaining acquired/served separation case:
a valid newer source checkpoint can predate promotion of a different older frozen
candidate. The next preparation authenticated that newly confirmed publication
but omitted it from public known history. At10:54:24.848–10:54:25.324UTC, the new
case reached successful `awaiting-evidence` preparation and failed its actual
measured snapshot assertion: `lastConfirmedDeployment` was null rather than the
independently authenticated run299 receipt. Original private publication/frozen
catalogue preservation controls passed. [Initial carryover RED](tdd-publication-latest-history-red.json),
SHA-256 `30ed32c7811757a522190db7cb7b759cb4612be092ddb992be9d3ed2bac9562c`.
Stable publication/acquisition/test hashes were respectively
`3fc2a1fecb28f9238e11e613f98f0a6b0762ccc382d5c0c9d8d326dccdb20629`,
`29b386b3c71b264acbfc85a551823a530b42e5fea9beeb8db9f6a94a1fe36ffc`,
`bd637eaf45c1e0ee178face004dae213e59ee76d6b4625930cd52e23006366c2`.

Root accepted the focused regression and required an opaque binding from the
existing authenticated `prior` authority, preserving its fast path. Before that
implementation, a type-only optional input was added and four direct invalid
inputs were exercised: standalone receipt, self-trusted payload, genuine API
origin paired with invented receipt, and JSON-cloned origin/payload. The current
acquirer ignored that new field and incorrectly completed/replaced its checkpoint.
At **10:57:11.150–10:57:12.014UTC**, those four rejection/preservation assertions
and the public carryover assertion observed **5/5 valid AssertionError RED**, with
no harness errors. [Complete history-trust RED](tdd-publication-history-trust-red.json),
SHA-256 `190f2ce9bb35c79d1efbd0718ed02f616282df673d065f66078b16bfddb85420`.
Stable publication/acquisition/test hashes were respectively
`3fc2a1fecb28f9238e11e613f98f0a6b0762ccc382d5c0c9d8d326dccdb20629`,
`c549b354577b02adba0c852ca52dcf7ec8f08cdd8ee3a66750678f671e371830`,
`c46ad50ea7239fae0f58f0eb07edf2209b436a8c4f9511950f52ac6d131a926f`.
No receipt getter/option behavior or transport layer was implemented before this
record. The proposed binding must retain exact object identity/provider role and
unchanged receipt claims, use actual parsed publication instants, and affect only
the next new snapshot's history, without relabeling original accepted/served bytes.

Root inspected all5 reached failures and granted the narrow carryover GO. The fix
reuses the existing independently authenticated `prior` authority: its exact
in-process binding/unchanged provider origin and receipt are registered privately.
Acquisition accepts only that opaque binding, compares parsed publication instants
(verified instant breaks ties), and supplies the newer receipt only to new
`makeCatalogue` calls. It preserves original checkpoint origins/catalogues and
served frozen bytes, without fetching served shards on a valid-checkpoint path.

At **2026-10-10 11:02:06.064–11:02:14.049UTC (19:02 MYT)**, the focused complete
regressions passed **384/384 across five suites:194 publication cases and190
existing acquisition/bootstrap/refresh/rollback/source-retention cases**.
[Complete GREEN report](tdd-publication-green.json), SHA-256
`c2eaeb5328622f46a5439aa5b63ed0eccfbe3ab061f506a24475efc82adb4d67`;
[raw console log](tdd-publication-green.log). Typechecking and the full callable
documentation scan also passed. The root independently completed its broader
548-case implementation/configuration checks before closing T040–T044; that
broader result belongs to the aggregate evidence, not this focused report.

| File | Stable before/after final focused GREEN SHA-256 |
| --- | --- |
| `scripts/publication.ts` | `c0dcfafcea744ecfe33a2678873781864abf229762d685dced33e8887aa3175b` |
| `scripts/acquire.ts` | `b971caaa483ba91dddbb3d8ba615733716f6c5b0b093ad77bdb5920b089d2e75` |
| `scripts/application-fingerprint.ts` | `4c9aea57e57528fe9345ae1a0ac15f0c785b72ef69efadfad842b6ae42445273` |
| `tests/unit/publication.test.ts` | `c46ad50ea7239fae0f58f0eb07edf2209b436a8c4f9511950f52ac6d131a926f` |

The [controlled candidate console evidence](publication-controlled-candidates.log)
records complete returned candidate identifiers and native private journals for
exact promotion, evidence waiting and new preparation; its [structured results](publication-controlled-candidates.json)
passed3/3. Exact/wait artifact digest was
`513fec8c4d50ee74d0500a069c686474580d942a38f283172def694cb4e4f30d`,
application fingerprint `cd555c9886d35a09428455b0e3b25d7fc9e9cf257464d2bffa504a0015e431cf`,
snapshot `controlled-frozen-candidate`. The captured new-preparation artifact was
`96889645874d3aa7ed45b68c3a4001f1a14b530ffa37924ea92ebbf16f5bd19c`,
snapshot `afb12005-064c-45ea-84c5-af598a1d1cc7`. Its controlled source pacing ran
04:00:00→04:00:07; preparation ended awaiting fresh evidence with null publication
time. The wait path performed no source fetch or build. These dated pre-carryover
capture values remain unchanged; later runs legitimately mint new snapshot UUIDs
and digests, recorded in their own logs. All are explicitly synthetic controlled
enforcement evidence, not physical measurements, a live workflow or publication.
Official change time and change-to-publication latency remain unavailable.

The usable CLI is `node scripts/publication.ts prepare|promote|finalize`, restricted
to actual reviewed main workflow context, `HANSARD_STATE=.cache/hansard` and
`HANSARD_WORK=$RUNNER_TEMP/hansard-publication`. Result/journal metadata stays
outside the frozen artifact; original tar and candidate acquisition state remain
separate from latest accepted/served state. Native checks use the once-built
`HANSARD_FROZEN_SITE=dist`; report reuse uses the shared application fingerprint
authority. Finalization needs exact successful named action, correlated standard
environment status timestamp and subsequent fixed-base live proof. A skipped
finish returns CLI0 after recording actual outcomes so an awaiting-evidence
preparation run can complete and be imported; no receipt is invented. Real remote
permissions/correlation, trusted HTTPS test hosting and actual-target reports
remain delivery gates. No actual publication, push or hardware pass is claimed.
