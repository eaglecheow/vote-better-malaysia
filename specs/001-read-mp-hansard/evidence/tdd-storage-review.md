# Storage review: focused additional RED

Root authorized test-only review while publication tests were being prepared. US3 production still waits for T044 and the applicable RED gates. The original 93 assertion bodies remain unchanged; their earlier observed RED stays in [tdd-storage.md](tdd-storage.md). This review adds only material transaction-effect and shared-source validation boundaries that were not reached or not asserted there.

## Why these additions are needed

- Original STORAGE011/012 reach the standalone request-versus-commit and abort helper assertions. STORAGE038 reaches public acknowledgement assertions, but its inert method makes no native puts. None asserts that catalogue/preferences/pair actually share one three-store transaction.
- Original STORAGE015 swallows the public save rejection and then asserts reads. With the inert API, its native abort wrapper never runs; those read failures do not independently establish public rejection after a successful pair request and a later abort.
- Original STORAGE013 fails every put immediately and checks the error name. It does not reach rollback after two queued native writes or assert preservation of the exact original exception object.
- Original STORAGE017 already reaches 38 malformed-body rejection cases; these are not duplicated. The new shared source authority needs direct acceptance of a self-contained selected subset without the old full catalogue/other members' turns, online unsaved input with an optional matching catalogue, and optional metadata bindings beyond the snapshot-ID/member/sitting/digest conflicts already covered by STORAGE031.

The only source change is a documented inert `validateTranscriptResult(value, catalogue?)` export returning undefined. It performs no validation, classifier, storage or mutation behavior. `src/storage.ts` remains byte-for-byte inert. The real source normalizer/builder supplies accepted positive inputs.

## Observed RED

At **2026-10-10 17:59:27 MYT**, Node 24.21.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/storage.test.ts -t STORAGE-REVIEW --reporter=verbose
```

Observed **12/12 new cases failed behaviorally**, with the original 93 skipped by selection. [Complete raw RED output](tdd-storage-review-red.txt). Soft assertions reach every new transaction-effect expectation and both source-input preservation controls; no import, fixture, TypeError, timeout or native setup failure counts as RED.

| Identifier | Actually observed missing behavior |
| --- | --- |
| STORAGE-REVIEW-SCOPE | Observed zero puts/zero transaction identities/zero scopes; expected three distinct store writes sharing one transaction scoped to catalogue, pairs and preferences. |
| STORAGE-REVIEW-REQUEST-ABORT | Actual pair-request success and native abort were both unobserved (`false`), and public rejection was absent (`null`); each expected effect failed. |
| STORAGE-REVIEW-SYNC-ERROR | Observed zero attempted/queued writes rather than three/two, and no error rather than the exact original third-write quota exception. |
| STORAGE-REVIEW-SOURCE-SUBSET | Shared authority returned undefined rather than the self-contained saved result. Its actual selected turn is ordinal 4, with gaps 0/1 and annotation 3; other members' ordinals 2/5 remain absent. The accepted descriptor still accounts for all six leaves. |
| STORAGE-REVIEW-SOURCE-ONLINE | Shared authority returned undefined rather than the matching online `saved:false` result. |
| STORAGE-REVIEW-SOURCE-BIND-preparedAt/provenance/status/coverage | Each independently valid replacement catalogue passes `validateCatalogue`, but the inert shared authority fails to reject its conflict with the result's own accepted metadata. |
| STORAGE-REVIEW-SOURCE-LOCATION-index/ordinal/order | The inert authority fails to reject a cross-category duplicate provided source index, an ordinal equal to the full-record total, or reversed gap traversal order. These fields were absent from the original saved-result malformed matrix. |

Independent raw database reads show the seeded old catalogue, preferences, and pair remain unchanged in the no-op scaffold. Those preservation equalities are **already-GREEN controls, not additional failed behavior**. The tests wrap and forward actual `fake-indexeddb` requests; they neither fabricate native request success/abort callbacks nor invoke a replacement application handler. Once production exists, the failure wrappers must genuinely trigger before those assertions can pass. The two new transaction failures use a coherent changed snapshot/result, so accidental partial commits change observable saved state.

The source subset is built from the existing recorded official excerpt and accepted controlled metadata. Optional-catalogue coverage variation adds one explicitly synthetic unavailable sitting. No new real-source absence or full-sitting acquisition claim is made. A saved selected subset cannot recompute the original full-record digest; validation must preserve declared digest/descriptor binding without manufacturing missing assigned turns or a complete old catalogue.

## Fingerprints and supporting checks

```text
src/source.ts (only new inert export): 29be26a412e5e88cd429608b6009251b05acd1f3c55ba30a1f55ee8979b0e7aa
src/storage.ts (unchanged inert): 234dcdcd3b8b46e58d86702bd6789a5d3862866c7565b0219c82670ff08b82ec
tests/unit/storage.test.ts: 88717acb03054f61cc2f9aee02a60e4a0df814937d37cdecf8ef596d569e1e52
```

`npm run typecheck` exit 0; direct `checkCodeDocumentation(process.cwd())` returns `[]`, exit 0; scoped whitespace inspection exit 0. These validate callable comments/types, not final candidate documentation accuracy. No production validation/storage logic, task markers, aggregate evidence or commits were changed. These fake-IDB/unit proofs do not establish actual browser transactions, shell readiness or offline reopening; native T048/T055 remain required.


## T050 reviewed-boundary GREEN

Root authorized production at 19:00 MYT after T044. All 105 storage cases passed at 19:04:34; the nine-suite source/storage regression passed 674/674 at 19:04:58, exit 0. [Full production, command, fingerprint and refactor evidence](tdd-storage.md#t050-production-and-green); [complete GREEN log](tdd-storage-green.txt), SHA-256 `07da9ec049bafe7060cc8c71ea0272361ed46488cf11c431ba43562e00e3577d`.

The 12 additional reviewed behaviors now pass through genuine fake-IDB operations: three puts share one three-store transaction; actual pair request success precedes a native abort/public rejection with all seeded records preserved; two native writes enqueue before the third throws the exact original quota exception and all state rolls back. The shared source authority accepts the real selected-subset ordinal holes without changing input, accepts matching online-unsaved input, rejects all four optional catalogue metadata disagreements, and rejects duplicate source indices, impossible ordinals and reversed partition order. These are unit proofs; no physical-browser or offline-reopening claim is added. Types and final callable documentation checks pass. The existing RED evidence above remains historical and unchanged.
