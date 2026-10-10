# TDD execution evidence

## Final local regression and CI completion

The final unrestricted Node 24 run passes **2,021/2,021** cases, zero failed or
pending, including **201/201** CI input cases, **207/207** publication cases and
**31/31** workflow cases. Production build/typecheck and **108/108** actual
Chromium/WebKit frozen-site journeys pass. The independent dependency/source
directory passes the same unrestricted unit suite and build with the identical
application fingerprint. [Final verification](final-verification.md) retains
exact commands, hashes and all unavailable release gates.

[CI input RED/GREEN](tdd-ci-inputs.md) records the reached behavioral assertions
before implementation and the later gap-fixture/attempt chronology, native-checkpoint,
reviewed-TDD and current-base regressions before their corrections.
[Workflow RED/GREEN](tdd-ci-workflow.md) precedes the executable configuration.
The shared publication TDD validator's corrections also have independently reached
RED recorded before production. No speculative refactor followed the final GREEN.

The first unrestricted final run omitted `PLAYWRIGHT_BROWSERS_PATH` and two native
unit boundaries could not find Chromium. Its failed report is preserved; that launch
error is not behavior RED. Restoring the known installed cache makes the unchanged
code pass. The final help edit only shortens bilingual explanatory prose and moves
developer validation details out of the user flow; existing documentation, build,
unit and native checks cover it without claiming new behavior RED.

Earlier sections below preserve the observed intermediate scope. The user's narrow
performance RED exception remains recorded in [performance TDD](tdd-performance.md);
no other missing RED or release gate is inferred to be waived.

## Local saved-reader/native completion

At 19:45 MYT, the rebuilt production reader passed **108/108** actual Chromium/
WebKit journeys, including all 48 native storage/worker/update/offline cases.
[Browser evidence](browser.md) records bytes, scope and the approved Firefox
host deferral; T028 and physical/release acceptance stay open. The real initial
online-error regression had [two unit RED failures before correction](tdd-initial-network.md),
then **260/260** affected reader/message/recovery cases passed. The earlier
implemented-unit sweep passed **1,772/1,772** with only unimplemented CI suites
excluded. Production build/type and global callable documentation passed.

The worker's stream-liveness correction followed its independent valid unit RED
and **314/314** regressions ([worker evidence](tdd-worker-backpressure.md)).
The native transaction observer was repaired at actual transaction creation
([diagnosis](pwa-native-probe.md)); this harness change is not feature RED.
No further refactor was needed. T055 local completion enables T056 guidance;
CI production still waits for that guidance to be applied and checked.

## Implemented-unit regression before the final native PWA gate

On 2026-10-10, Node 24.21.0 ran `npm test -- --run --exclude
'tests/unit/ci-*.test.ts' --reporter=json
--outputFile=specs/001-read-mp-hansard/evidence/us3-unit-final-green.json`
with the installed native engines available. Exit 0: **1,772/1,772 passed**,
zero failed or pending. [Structured result](us3-unit-final-green.json) and
[raw output](us3-unit-final-green.log) retain the actual run. The separately
authored CI suites are deliberately excluded because T073 implementation still
waits for T055/T056; this is not an unrestricted-unit or remote-CI pass.
Native PWA checks initially passed 46/48, with two preference-commit observer
ordering failures under investigation; T055 remains open at this point.

## Saved-reader integration, 2026-10-10 evening

After T050–T053 readiness and recorded saved/bootstrap/message RED, the first
integration passed 240 targeted cases at 19:13:15 MYT. Review then reproduced
three concrete gaps before their fixes: missing update-failure notices
([four RED cases](tdd-update-notice.md)), saved content hidden while network
checks were pending, and incorrect storage access/recovery notices
([ten focused cases and their initial RED](tdd-saved-reader-pending.md)).
All **256/256** reader, recovery, bootstrap and bilingual-message regressions
passed at 19:24:07 MYT; TypeScript passed separately.
[Final integration output](saved-reader-final-green.log), SHA-256
`bf538ddc2e937ea28e8607c180469bd9953335c93ba194fd5efc991c8164ba2d`;
main `bb12a3a1f30a46fbc1a6625f0b11b6f7a49bbc52d8d571b4cdcf4066839e34cb`,
messages `6bebdaaf00687c84c484652dddaf50e33826bd5f717c2d88367af586de8bacdd`.
The storage source validator remains authoritative; no speculative refactor was
needed. A successful commit restores saved status, denied access revokes the
offline promise while preserving readable in-memory content, and prior successful
times remain unchanged during pending/failed checks. T054 is complete; native
worker/storage/update verification remains T055. CI input/workflow assertions are
still intentionally RED and their production gate remains pending.

Storage has 105 GREEN cases ([evidence](tdd-storage-review.md)); worker/build
has 207 ([evidence](tdd-worker-build.md)); update protocol/storage/worker
regressions have 264 ([evidence](tdd-updates-review.md)). The full implemented
unit run hit nine sandbox-only localhost failures; the affected collector and
representation suites subsequently passed **81/81** with native permissions
([output](pwa-native-unit-regressions.log)). This is bounded local evidence,
not physical-device or release acceptance.

## Publication and recovery validation, 2026-10-10 evening

At 18:46 MYT, root independently ran the ten implemented publication/acquisition/
configuration/fingerprint/documentation suites: **541/541 GREEN**, exit 0.
[Structured results](us2-publication-root-green.json), SHA-256
`c446359757a898cd2f7e1f168c09d4331a988170aa0a9a13816941cc244fd52d`, and
[raw output](us2-publication-root-green.log), SHA-256
`18e430dd019bd4851e68d838a09d32fda3bd777b46ab0d1f6066de998619b319`,
record the exact paths and case results. These comprise 190 acquisition/retention,
188 publication runtime, 54 workflow, 57 fingerprint, three browser configuration,
48 documentation and one harness cases. Typecheck, global mechanical callable
documentation (`[]`) and `git diff --check` passed separately at 18:47 MYT.

Subsequent review reproduced the actual workflow's unbounded historical-state
upload as WF049 RED before changing it to the existing bounded acquired-state
bundle. All **55/55** workflow cases passed at 18:49 MYT. A later two-success
bounded-bundle control passed at 18:51 MYT, without new production behavior or a
new initial-RED claim. Root rechecked all configuration/fingerprint/browser-mode/
documentation/harness suites at 18:53 MYT: **164/164 GREEN**,
[raw output](us2-configuration-final-green.log).

[Publication runtime evidence](tdd-publication.md) records the full controller
RED, provider response/actual-action corrections and journal assertions.
[Workflow evidence](tdd-publication-workflow.md) records parsed workflow behavioral
RED before adoption and the bounded upload correction.
[Fingerprint evidence](tdd-application-fingerprint.md) records direct native-file
RED before the single helper used by publication and the upcoming worker builder.
[Frozen browser configuration evidence](tdd-browser-configuration.md) records RED
before the no-rebuild preview mode. No speculative refactor was needed.

The fresh production build and all **60/60 Chromium/WebKit** reading/failure
journeys passed; [browser evidence](browser.md) binds the commands, source hashes
and logs. [Documentation review](documentation.md) covers the adopted bilingual
guides, operational commands and local links. [Refresh evidence](source-refresh.md)
binds controlled candidate identities, exact promotion, evidence waits, source
times and failure retention. Firefox remains unverified under the user's specific
local dependency exception; T028 remains unchecked. This does not establish a
remote Actions run, active schedule, physical-device pass or live publication.

The final acquired-versus-served history regression and four direct untrusted-input
assertions observed valid RED before an opaque, independently authenticated binding
was implemented. The next snapshot preserves the newer confirmed receipt as known
history while its own publication time remains null. Original checkpoint origins
and served public bytes remain unchanged; a valid acquired checkpoint does not
fetch the served archive again to copy history.

At **19:00 MYT**, root ran all ten publication/acquisition/configuration/fingerprint/
documentation suites again: **548/548 GREEN**, exit 0 (194 runtime, 190 acquisition,
55 workflow, 57 fingerprint, three browser-mode and 49 documentation/harness cases).
[Final structured report](us2-phase-final-green.json), SHA-256
`1b618db3fb5a9cb868db63b227119577d52bf2794f023a37586f9a96d4429983`;
[exact command/output](us2-phase-final-green.log), SHA-256
`1f3ab1b830059e266d5a33b4cc0c61707a07b3d20064025103cf779bb7251f11`.
Publication/acquisition/workflow SHA-256 values were respectively
`c0dcfafcea744ecfe33a2678873781864abf229762d685dced33e8887aa3175b`,
`b971caaa483ba91dddbb3d8ba615733716f6c5b0b093ad77bdb5920b089d2e75`,
`3d3cf931ae719877b047e029cd9f8e287561928b755c63589b0f722d5ccbbc4e`.
Ruby safe YAML parsing and all 19 actual workflow shell bodies passed `bash -n`.
Typecheck, mechanical callable documentation (`[]`) and diff whitespace checks passed.

Root closes T040–T044's local mechanism/reader/documentation gate, subject to the
previously approved host-only Firefox deferral, and authorizes T050/T051/T052.
T053 still waits for storage/worker protocol readiness; T054 waits for all those
production prerequisites. Their previously recorded T049 and focused review RED
remain the production prerequisites. [New CI configuration RED](tdd-ci-workflow.md)
is preparation only and intentionally remains failing until its later phase.

Operation began clean at `1c4b079` on 2026-10-10. Phase 1 harness checks are
[setup evidence](documentation.md); they are not feature RED.

Each linked report records its tests, exact command, tested working-tree fingerprint,
observed behavioral RED before production implementation, GREEN/regression/type
results and refactor assessment. Reports are added only as those checks run.

The implementation is in progress. Missing reports and unchecked tasks do not pass
the feature's completion gate. Firefox currently fails before test assertions on
this host; Chromium/WebKit harness passes do not establish stable-device acceptance.

- [Bootstrap acquisition RED and regressions](tdd-acquisition.md): initial and expanded
  behavioral failures, followed by the controlled acquisition implementation checks.
- [Catalogue schema RED/GREEN](tdd-schema.md): recorded by the schema implementation
  group before its production validator work.
- [Documentation enforcement RED/GREEN](tdd-documentation.md): recorded by the
  independent checker group; full application documentation acceptance remains pending.
- [Source items RED/GREEN](tdd-items.md): recorded before normalization and result work.
- [Performance enforcement RED/GREEN](tdd-performance.md): controlled checker
  assertions and the narrowly recorded user-approved mobile-processing RED exception;
  actual measured budgets remain separate delivery work.
- [Published static retrieval RED](tdd-static.md): bounded transport and coherent pair
  assertions; subsequent reader/native-engine acceptance remains separate.
- [Bilingual messages RED/GREEN](tdd-messages.md): forty labels in each locale.
- [Reader RED](tdd-reader.md): observable DOM behavior before implementation.
- [Native laboratory collector RED/GREEN](tdd-performance-collector.md): tooling and
  native plumbing, without an actual production/lab/device performance pass.
- [Recovery RED](tdd-recovery.md), [recovery-message RED](tdd-recovery-messages.md),
  [incremental refresh RED](tdd-refresh.md), [storage RED](tdd-storage.md) and
  [worker/build RED](tdd-worker.md): observed future-story assertions against inert
  scaffolds; no later-story production or phase acceptance is claimed.

Root validation at 12:54 MYT on 2026-10-10: `npm test -- --run` passed all seven
current suites, 637 assertions; `npm run typecheck` and `npm run build` passed.
Mechanical callable-documentation review returned no findings. This is the current
foundation/checker checkout, not a reader, live archive, device or release pass.

US1 T025 validation at 13:12:07 MYT: all implemented reader/messages/retrieval and
prior foundation/checker regressions passed **794/794**, ten suites. Commands used
the explicit ten unit paths; independently authored future-story `recovery.test.ts`
and `acquisition-refresh.test.ts` remain intentionally RED pending their later gates.
The collector is independent tooling and records its own checks. Do not describe
the unrestricted full test command as green while these planned RED suites remain.
`npm run typecheck` and `npm run build` passed after the reader RAF callback typing
repair. Reader/source/message callable documentation and semantic comments were
reviewed; no refactor was needed. Reader and static reports contain production hashes.

Bilingual guide/help drafts are present in `docs/user-guide.md` and `public/help.html`,
linked by README and the actual reader. Native help navigation passed in Chromium
and WebKit; unit results alone do not prove full archive or release readiness.

Root regression recheck started at **13:48:35 MYT** on 2026-10-10 after the
jsdom-compatible static-fixture path repair and future dependency type scaffolds:
**868/868 passed across eleven implemented suites**, including all 74 collector
checks and its real Chromium plumbing case. Node 24.21.0 and
`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers` were used.
[Durable exact test paths/output](implemented-regressions-1348.log). Typecheck also
exited 0. This explicit selection excludes intentionally RED future recovery,
refresh, storage, worker/build and update/saved-reader suites. The unrestricted
full unit command remains unverified as GREEN and is expected to fail until those
behaviors are implemented. No browser, source-bootstrap, lab-budget or device gate
was waived or satisfied by this regression check.

T032 preparation gate rechecked by the root at **13:51 MYT** under Node 24.21.0:
`npm test -- --run tests/unit/recovery.test.ts tests/unit/recovery-messages.test.ts tests/unit/acquisition-refresh.test.ts --reporter=json --outputFile=/private/tmp/hansard-root-us2-red.json`.
Observed exit 1, **96/96 behavioral assertion failures**, zero passed/pending cases:
30 recovery, 14 new locale labels and 52 incremental-refresh cases. Every failure
message begins `AssertionError`; there were no suite-level import or harness failures.
[Durable root case report](us2-root-red.json), [command output](us2-root-red.log) and
the linked per-behavior reports preserve
the requirements, prior initial RED and working-tree fingerprints. T029/T030/T032
are completed preparation; T033–T036 production still waits for full-source acceptance
and the specifically deferred local T028 gate. This does not mark US2 implemented.

T031's 22 authored recovery browser journeys were collected by the root with
`npx playwright test tests/browser/failures.spec.ts --list`: exit 0, **66 cases**
across the three retained engine projects. [Collection output](failures-browser-collection.log).
Author typecheck and callable-documentation checks passed. This completes test
preparation only; no execution or passing recovery-browser behavior is claimed.

T049's final preparation gate was independently rechecked by the root at
**14:01 MYT** after focused saved-reader harness corrections:
`npm test -- --run tests/unit/storage.test.ts tests/unit/worker.test.ts tests/unit/build-worker.test.ts tests/unit/updates.test.ts tests/unit/saved-reader.test.ts --reporter=json --outputFile=/private/tmp/hansard-root-us3-red-final.json`.
Observed exit 1, **301/301 behavioral assertion failures**: 93 storage, 87 worker,
58 builder, 24 update-client and 39 saved-reader cases. No passed/pending cases or
import/type/harness exceptions occurred. Valid rejection-matcher failures report
`promise resolved ... instead of rejecting`; they are assertions about missing
rejection behavior, not runtime harness errors.
[Final per-case failures and post-run digests](us3-root-red-final.json),
[command output](us3-root-red-final.log), [update evidence](tdd-updates.md) and
[saved-reader evidence](tdd-saved-reader.md) preserve the repaired multi-assertion
checks and any guards that remain unreached. The earlier root run is provisional
and does not supersede this corrected evidence. T045/T046/T047/T049 are completed
preparation; T048 authored native journeys remain separate. No US3 production or
native storage/worker acceptance is claimed, and T050–T054 still wait for T044.

T048 preparation was independently collected at **14:07 MYT** with
`npx playwright test tests/browser/offline.spec.ts tests/browser/storage.spec.ts tests/browser/updates.spec.ts tests/browser/install.spec.ts --list`:
exit 0, **72 engine cases** across 24 authored journeys. [Collection output](pwa-browser-collection.log).
The shared fixture serves actual temporary generated A/B shells on a native local
HTTP server and probes actual browser IndexedDB, CacheStorage and worker state;
it supplies no fake success mechanism. Typecheck passed, and author global callable
review returned no findings. T048 is complete as test authoring only; none of these
native PWA journeys has executed against implemented production behavior.

Focused review regressions were added before repairs in
[foundation retention/commit evidence](tdd-foundation-regressions.md) and
[ranked-fixture evidence](tdd-performance-regressions.md): four foundation failures
and two missing-hash failures. The root then preserved earlier unknown-ID gaps only
for retained payloads, backed up/restored checkpoints with public output when staging
cleanup fails, and required each ranked performance fixture to have its own frozen hash.
At **14:13:09 MYT**, **875/875 implemented assertions passed across thirteen suites**,
including all new regressions and the native collector plumbing. [Exact paths/output](foundation-repair-green.log).
Typecheck passed. Existing strict fresh-record attribution remained tested; no further
refactor was needed. The running full bootstrap uses its separately archived original
source/acquisition/lock inputs; this GREEN result must not relabel that run as using
the repaired versions. Full-source and later-story gates remain separate.

The remaining collector delivery defect had four observed native HTTP regression
failures before repair, with three already-GREEN delivery/integrity controls;
[representation evidence](tdd-served-representation.md). The root now derives intrinsic
decoded bytes/hash from each frozen data asset before preflight and accepts only its
exact stored or decoded representation, retaining transport/decoded bounds and actual
wire-body counts. At **14:18:15 MYT**, **882/882 implemented assertions passed across
fourteen suites**, including all seven native representation cases and prior source,
reader, checker and native collector regressions. [Exact command/output](reviewed-implemented-green.log).
This does not measure actual reader lab budgets or any physical target. Future-story
tests remain intentionally RED and the unrestricted unit command is not GREEN.

The original bounded full bootstrap completed with exit 1 at approximately
14:25 MYT: its complete catalogue measured **519,418 gzip bytes** against the
**204,800** ceiling. [Actual failure output](live-bootstrap-run.log),
[captured actual staging sizes](live-bootstrap-sizes.json) and
[post-failure preservation](live-bootstrap-preservation.json) are durable evidence.
It acquired all 4,090 source records with 4,093 complete private response receipts;
full independent comparison reported 1,695,818 leaves and zero mismatches. Every
record has unresolved nonannotation passages, so a real verified-absence pair is
unavailable throughout this captured archive. T027 remains unchecked. The root
requested an explicit cap/source-sample requirement revision; permission remains
pending and neither requirement has been changed. No commit or publication occurred.

The user later answered **“Approve 1 MiB and conditional absence”** on 2026-10-10.
[Policy decision](source-policy.md), [acquisition/retrieval RED and GREEN](tdd-catalogue-policy.md)
and [performance RED](tdd-catalogue-performance-policy.md) preserve the narrow revision.
Seven new acceptance assertions failed before the authoritative catalogue ceiling was
changed; one-byte-over and unchanged limits were already-GREEN controls. At 17:02:38 MYT,
all **334/334** affected acquisition, retrieval and performance checks passed across
four suites. The source classifier is unchanged. Complete validated re-staging of
the frozen source capture remains separate; no release or publication gate is waived.

The ignore rules now retain feature evidence logs under `specs/**/evidence/` so these
actual outputs are eligible for the eventual successful-operation local commit.

Post-policy regression started **17:03:27 MYT**: **890/890 passed in fifteen implemented
suites**, [exact command/output](catalogue-policy-regressions.log), including actual
native HTTP and Chromium collector plumbing. Typecheck, mechanical callable coverage
and whitespace checks passed. The full unrestricted unit command still includes
unimplemented future-story RED; no source staging, physical target, lab budget, remote
CI or release result is established by this regression pass.

At **17:08:44 MYT**, [complete source re-staging](source-restaging.md) returned success
after validating every original raw receipt and current normalized descriptor. All
4,090 public/private shard hashes matched after commit. Root independently checked
the exact catalogue SHA, 4,090 public files, 357,744,140-byte data sum and local-only
checkpoint. Catalogue gzip 519,418 bytes and decoded 3,431,888 bytes satisfy the
approved limits. The original snapshot and source times are unchanged; the new private
checkpoint creation time is actual re-staging time. T027 is complete under the revised
policy, including the documented complete no-eligible-absence search. No publication
occurred. T028 remains unchecked under the narrow local Firefox phase deferral; T033–T036
may now proceed after their already observed T032 RED. Later application changes must
not relabel this checkpoint's actual runtime fingerprint or earlier source capture.

T033/T035 source-status/message production followed their recorded RED and the completed
source gate. Nine pure source-status cases and 525 affected source/message regressions
passed; [status/message evidence](tdd-recovery.md). T036's 21 reader recovery cases then
passed with the existing reader/message checks, 160/160. Native reading/recovery passed
60/60 Chromium/WebKit journeys. Focused review added two valid RED regressions before
the completed-Retry correction; its four-suite GREEN passed 162/162. Reports retain
the exact intermediate hashes and scoped commands. T033/T035/T036 are complete;
incremental refresh, post-correction native validation and T037's combined gate remain
in progress. Physical/Firefox/release gates are unchanged.

The post-correction production rebuild passed **60/60** native reading/recovery
journeys in Chromium/WebKit, with completion observed by 09:25:04 UTC. Exact
command, output hash, tested reader/source/message hashes and boundaries are in
[browser evidence](browser.md#recovery-rebuild-after-completed-retry-correction).
Incremental-refresh review and the combined T037 unit/type gate remain in progress.

T034's completed [controlled refresh evidence](source-refresh.md) records the original
52 RED cases, additional private-history/progress/outcome RED, and five independent
peer-review context failures before correction. Acquisition now passes **185/185**.
The complete implemented scope passed **1024/1024 across 18 files** at 17:32:07 MYT;
[exact command and raw output](tdd-refresh-regressions.log). Root independently inspected
that output and matching acquisition/test/reader/source hashes, then verified current
typecheck, callable coverage (`[]`) and whitespace checks, all exit 0.

The latest [native recovery rebuild](browser.md#recovery-rebuild-after-completed-retry-correction)
passes **60/60** Chromium/WebKit journeys, including both successful Retry focus
destinations after their observed bilingual regression RED. T034 and T037 are complete.
No broader refactor was needed. The approved host-only Firefox deferral remains in
effect; future-story RED, actual scheduling, physical targets, full production budgets,
remote CI, publication and human acceptance are still separate unverified gates.
T038–T041 may now start. T044/T049 still gate US3 production work.

Publication preparation has [runtime RED evidence](tdd-publication.md) and
[workflow configuration RED evidence](tdd-publication-workflow.md). Root's final
workflow matrix at 18:15:04 MYT is 49 behavioral failures plus one existing control;
the workflow remains inert. The four required release reports have a concrete
reviewed-main collection path rather than an assumed artifact producer.

Origin verification is staged separately to make subsequent authorization-reuse
assertions meaningful. At 18:18:50 MYT, root ran Node 24.21.0:
`npx vitest run tests/unit/publication.test.ts --testNamePattern='^PUB-ORIGIN' --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/publication-origin-scoped-red.json`.
All **24 origin cases failed at behavioral assertions**, zero passed and159
unselected. Root inspected every failed case's messages: all were AssertionError,
with no fixture/import/harness errors. [Exact structured report](publication-origin-scoped-red.json)
has SHA-256 `82ceaf401d7ece2689256ac031075a59d5b7460ded2a59d5c63871ab47449c36`;
[command log](publication-origin-scoped-red.log) preserves the invocation result.

At this scoped RED, publication scaffold SHA-256 was
`406d123405ef41aa2b96e35fcca78d5c4457c43cacf5d5d0c26996ebb7b534c3`,
acquisition was `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac`,
and runtime tests were `a19d4d0f2c0c219ce32647810abefabdc19d98f91f98b350fa5944829cac87d4`.
Only this verified origin behavior may now become GREEN. Historical/core
acceptance, preparation, promotion, finalization and the active workflow remain
blocked until the remaining failures, including actual authenticated-object clone
and mutation rejection, are recorded. T038/T039 remain unchecked during this
staging. This preserves per-behavior RED; it is not a test-policy waiver or release
acceptance claim.

The restricted origin stage then passed 24/24. At 18:21:46–51 MYT the unchanged
183-case runtime matrix produced **155 behavioral AssertionError failures and28
passes** (24 implemented origin cases and four independent fixture controls).
Root independently inspected the complete
[after-origin report](tdd-publication-after-origin-red.json), SHA-256
`a22059fba4ad36431d3b5d15e450b9126de125d7ccf2bb39cab110cc4e7e203e`:
there are no harness failures, and all four actual authenticated-object clone or
scalar mutation cases now execute and fail before historical acceptance exists.
The API verifier is `71a848f34327f48ceb1024e4ba46ebe253bfcd2715bb3f084aa1955160315633`;
acquisition remains `786d2a3862936405ce660d1d672fde72e25c65c46892751a94d9bb8a772acaac`;
runtime tests remain `a19d4d0f2c0c219ce32647810abefabdc19d98f91f98b350fa5944829cac87d4`.

Peer review confirmed the corrected original acquired/publication-run chronology,
coherent prior live-site catalogue and canonical digest, reached archive/carryover
effects, durable deployment-success/confirmation-failure reporting, and actual
live supersession despite unchanged prior private metadata. Root also verified
typecheck and mechanical callable documentation (`[]`), both exit0. Together
with the 49 workflow RED cases, this completes T038/T039. T040 may now implement
the covered publication mechanisms; T066/T070 checker GREEN already exists.
T041 must prove GREEN/regressions and T044 still blocks US3 production. This gate
does not certify actual report collection, hardware, scheduling or deployment.

Additional scoped US3 preparation is linked in
[storage review RED](tdd-storage-review.md), [worker/build review RED](tdd-worker-review.md),
[update review RED](tdd-updates-review.md), [saved-reader/bootstrap review RED](tdd-saved-reader-review.md)
and [bilingual saved-reader labels RED](tdd-pwa-messages.md). These reports separate
reached assertion failures from preexisting passing controls and excluded harness
attempts. They do not implement US3 or open its T044/T049 production gate.
# Current publication input and workflow follow-ups

On 2026-10-10 at 18:42 MYT, the root independently reran the real application
fingerprint suite before its shared-input fix: **25 behavioral assertion failures
and 32 existing GREEN controls out of 57**, exit 1. Nineteen cases report
`AssertionError`; six native input-rejection cases report the valid assertion
`promise resolved ... instead of rejecting`. No harness exception is counted.
[Case report](application-fingerprint-root-red.json),
[raw output](application-fingerprint-root-red.log) and
[input contract/native boundary review](tdd-application-fingerprint.md).
The shared fingerprint correction may now proceed; publication and the future
worker builder must consume the same authority. Source-template index bytes remain
inputs; generated output/stamps, source data and operational evidence remain excluded.

The actual adopted Pages workflow passed **54/54** configuration cases at
18:41:15 MYT, following [its staged RED](tdd-publication-workflow.md) and
[browser prerequisite RED](tdd-browser-configuration.md).
[Raw workflow GREEN](publication-workflow-green.log), SHA-256
`e047d0b1a7e659c990118d79ee947d51cd491168ad9e0b6e89fd75be6ee30e43`.
The YAML hash is `475fc3a65df1ca6040ec176efbf9654b1528dea8d7796a6fc39fa4027f5a7df4`.
No schedule, remote required check or deployment ran. Controller provider-shape and
executed-action follow-ups remain separately gated on meaningful RED.

