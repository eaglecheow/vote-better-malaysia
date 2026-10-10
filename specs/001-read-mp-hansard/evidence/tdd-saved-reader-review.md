# Saved-reader/bootstrap review: pre-production assertions

Root authorizes T054 at **19:12 MYT**, after T050–T053 storage/worker/update
readiness, controlled GREEN, type/documentation review and the actual production
worker build. The 48 saved-reader/bootstrap cases and 28 bilingual-message cases
already have recorded observed initial RED; online/recovery controls remain
required regressions. Current reader/messages hashes before integration are
`d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82`
and `0e3c8a2465ffbc03ac9ed0f6637379f87ef5fd802976d218347dd56c064c7f1f`.

Root authorized these test-only gaps on 2026-10-10 before T054 implementation. US3
production still waits for T044. This supplements [the original saved-reader RED](tdd-saved-reader.md)
without relabeling its historical failures. Only
[saved-reader tests](../../../tests/unit/saved-reader.test.ts), the new
[bootstrap test file](../../../tests/unit/bootstrap.test.ts), and this evidence/log set changed.
No main/messages/updates/storage/worker/build/configuration/index/public behavior or
production API was introduced. No task markers, aggregate evidence or commits changed.

## Exact scope and honest controls

- SAVED011's six existing locale/validation variants and SAVED013's two existing locale
  variants now clone the expected saved result **before mounting**. Assertions use this
  independent oracle for source partitions, exact IDs, source URL/outcome, original names,
  snapshot/acquisition metadata and successful times. The supplied saved object is also
  compared against that clone, so application mutation cannot alter the expected result.
- Six SAVEDREV001 cases cover late save **success/failure** after a pair switch, a newer
  same-pair native Retry, or teardown. The pending acknowledgement is supplied through
  the existing storage boundary. The same-pair case drives an actual failed Read and
  successful Retry before releasing the obsolete save. Current content/IDs, committed
  status, offline-ready status and successful times must remain current; teardown must
  remain empty. No storage ordering, cancellation or persistence policy is supplied by
  the fixture. A separate rejection observer prevents an unused fixture promise becoming
  unhandled while missing integration never consumes it; production receives the original
  rejecting promise.
- Three BOOTREV001 cases dynamically import the actual `#app` entry under unsupported,
  rejected or pending native registration conditions. Existing source loaders and device
  opener boundaries return independently controlled valid fixtures; actual update-client
  code remains in use. A valid lowercase SHA-256 meta stamp follows the approved generated
  version contract, without claiming to be a real candidate fingerprint. Native-shaped
  registration records calls and supplies no successful worker/cache/activation result.
  Entry import is raced with actual registration invocation so pending registration can
  expose missing usable controls through assertions rather than an import timeout.
  Module mocks, native-property descriptors, URL/locale/DOM, mark and paint fixtures are
  restored in finally, including when entry evaluation fails.

Already-GREEN **predicates**, not additional RED, are recorded precisely:

- All eight reviewed original cases leave their supplied saved objects unchanged.
  These passes do not prove an implemented reader used saved data correctly.
- All six late-save cases preserve the DOM captured before settlement and the independent
  prior object. Both teardown cases retain an empty root with no resurrected notices.
  All four non-teardown cases show correct current source partitions/IDs/selections and
  current online `refreshedAt` before and after settlement. These controls currently pass
  because the online reader performs no storage save; no stale-save defect was fabricated.
- All three bootstrap cases permit ordinary selected reading with original source text,
  exact member ID and complete-result state. Unsupported registration correctly causes no
  native register call. These passes are bounded coordinator controls, not native PWA proof.

## Harness correction and excluded runs

The initial performance shim replaced the clock with a mark-only object. Dynamic module
loading then raised the plain error **`performance.now is not a function`** in the first
bootstrap case. The initial inspection searched named TypeError/ReferenceError rather
than this plain Error; the preliminary no-error report was corrected to root.

The fixture now retains the existing clock and temporarily supplies only `mark`, restoring
its previous descriptor afterwards. All pre-correction runs are excluded from RED claims:
[initial 18:10:03 log](tdd-saved-reader-review-initial-red.log),
[intermediate 18:11:40 log](tdd-saved-reader-review-intermediate-red.log),
[pre-clock 18:12:08 combined log](tdd-saved-reader-review-pre-clock.log), and
[pre-clock focused log](tdd-saved-reader-review-focused-harness.log).
Their other assertion output is preserved but is not substituted for the final clean run.

## Final valid RED and regressions

Node 24.21.0 / npm 11.17.0 / Vitest 5.0.3; HEAD
`1c4b079935bc5b7604474c1ba55def43ed6f0270` plus authorized working-tree changes.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/saved-reader.test.ts tests/unit/bootstrap.test.ts \
  -t 'SAVED011|SAVED013|SAVEDREV|BOOTREV' \
  > specs/001-read-mp-hansard/evidence/tdd-saved-reader-review-focused-red.log 2>&1
```

**18:13:43 MYT**, exit 1, **17 failed/31 skipped out of 48**, 1.01 s, two files.
[Final focused log](tdd-saved-reader-review-focused-red.log).

| Cases | Count | Directly observed semantic failures |
| --- | ---: | --- |
| SAVED011 hash/identity/schema in both locales | 6 reviewed existing RED | Missing prior source content/IDs, names/URL/outcome, original metadata and successful times compared with the independent clone; no-save/immutability predicates pass |
| SAVED013 in both locales | 2 reviewed existing RED | Missing own saved names/snapshot/acquisition/source/outcome/time presentation compared with the independent clone; immutability predicate passes |
| SAVEDREV001 pair-switch and same-pair Retry, success/failure | 4 new RED | Required save call absent; current committed-save/offline-ready notices and committed successful time absent before/after late settlement; current online text/IDs/time and DOM-preservation predicates pass |
| SAVEDREV001 teardown, success/failure | 2 new RED | Required save call absent; empty disposed DOM and prior-object preservation are already-GREEN controls |
| BOOTREV001 unsupported/rejected/pending | 3 new RED | Unconfirmed offline attribute/notice absent in all three; required native scoped registration call absent in rejected/pending cases; ordinary reading controls pass |

Thus the review changes exercise **eight existing cases plus nine new cases**. The table
does not claim that every predicate in a failing case independently failed, or that
passing non-destructive controls establish implemented storage/update coordination.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/saved-reader.test.ts tests/unit/bootstrap.test.ts \
  tests/unit/reader.test.ts tests/unit/recovery.test.ts tests/unit/messages.test.ts \
  tests/unit/recovery-messages.test.ts tests/unit/dom-harness.test.ts \
  tests/unit/documentation.test.ts tests/unit/harness.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-saved-reader-review-red.log 2>&1
```

**18:13:43 MYT**, exit 1, **48 required RED /214 passed out of 262**, nine files, 1.40 s.
Saved-reader **45/45 RED**, bootstrap **3/3 RED**; all seven previously passed suites
remain GREEN. [Combined final log](tdd-saved-reader-review-red.log).
Neither final log contains a plain Error, TypeError, ReferenceError, SyntaxError,
unhandled/import/file/matcher error. Counts are cases, not printed soft-assertion failures.

## Final fingerprints and checks

| File | SHA-256 |
| --- | --- |
| `tests/unit/saved-reader.test.ts` | `1f107c13fd686f6ac2a96509357db4da440e338a9a3ba82be00f1a0d72dc58df` |
| `tests/unit/bootstrap.test.ts` | `897ca8bdee8a1ce92388290b5407cfa365742720dbca08d8c67e17c780606a19` |
| Focused final log | `4ce2f575f33e8ed38bfda55d89b6ce130889ce3899ba939415f37262026a3e1d` |
| Combined final log | `4be55f55de067f5b78f7dd7ba3b15fd745af94feb45dd14d16711ad22c30c489` |
| Unchanged `src/main.ts` | `d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82` |
| Unchanged `src/messages.ts` | `20d79f5ca7df20d9f57872297ae8b034a307d9e2ba1ed7ae6e348d35faf79730` |
| Unchanged `src/updates.ts` | `fd20c577239e028a834f01e09d993c3c3995133e7642d658cec71ece6020d9aa` |
| Unchanged `worker/service-worker.ts` | `f4e25f0690859c67a2c94fa7fe0a601d69177fd1c0eeb2899bb79664b52bd5a1` |
| Unchanged `scripts/build-worker.ts` | `1ad036446efe924744febfdcb0594150b269a2646e1e7a08dddab9a9b376790b` |
| Unchanged `vite.config.ts` | `31c26b653f20988b46cd6dcb45a225a801bfdb901aa8ceb9b0e61d590416f78e` |
| Unchanged `package.json` | `941d2c48c4387d3d14d3ede458fbcc2c01c2873c2f1b520ecf62f7e2d94d7ad6` |
| Unchanged `index.html` | `657886b7b64284bff8df9ccbdc46524918165ddc1688e1c33c398165952856b2` |

`npm run typecheck` passed after the final fixture correction:
[typecheck log](tdd-saved-reader-review-typecheck.log). The global mechanical
`checkCodeDocumentation(process.cwd())` scan also passed with `[]`:
[documentation log](tdd-saved-reader-review-documentation.log). Every introduced/changed
callable has conventional purpose/parameter/return/effect documentation where applicable.

No production GREEN/refactor claim is made. Existing helpers were changed only to expose
the required controlled rejection boundary and independent expected values; no broader
test refactor was needed. Production remains gated by T044. Actual native IndexedDB/
Cache Storage/service-worker/device acceptance remains separate from these unit fixtures.
