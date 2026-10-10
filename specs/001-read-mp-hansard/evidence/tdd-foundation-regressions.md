# Foundation retention and commit regressions

## Pre-fix behavioral RED — 2026-10-10T06:10:40Z

Read-only review identified two implemented-path correctness defects, independent of
the pending US2 freshness/Retry and US3 saved-reader work. Focused tests were written
before any production fix. Node 24.21.0 command:

```sh
npm test -- --run tests/unit/source-retention.test.ts tests/unit/acquisition-regressions.test.ts
```

Observed exit 1: **four behavioral assertion failures, one passing control**, across
two collected files. [Durable RED output](tdd-foundation-regressions-red.log) contains
the compact expected/observed assertions. No syntax, import, fixture, filesystem setup,
null dereference or unhandled-rejection failures occurred. Initial output was subsequently
made compact by comparing exact bytes/content through boolean equality fields; the final
run reproduced the same four behaviors without printing long transcript/checkpoint diffs.

### Accepted unresolved attribution after identity reconciliation

The controlled fixture first validates an accepted shard containing an `unknown-id` gap
for exact ID `999999`. Its old catalogue and accepted content/hash/accounting are valid.
A later controlled source identity list supplies that ID; another newly accepted sitting
contains a correctly assigned contribution for it. The original sitting's failed attempt
retains its prior shard, successful acquisition time, digest, exact words and unresolved
attribution. This change is synthetic, not an observed live-source identity update.

- `RETENTION-IDENTITY`: expected unchanged retained content accepted under the new valid
  catalogue; observed rejection `Invalid source data: unreconciled source ID`.
- `RETENTION-RESULT`: expected zero matched turns, `incomplete`, and all original gaps
  in exact order; observed the same rejection before a conservative result can be built.
- `RETENTION-CONTROL`: an available current record incorrectly declaring a now-known ID
  unknown is still rejected. This existing strict rule **passed already** and is not
  claimed as RED. A fix must retain that current-record validation while preserving
  accepted historical ambiguity without guessing assignment from newly available data.

The fixture's newly acquired record is independently validated before the assertions.
Successful acquisition time and digest preservation assertions remain for GREEN; because
the new acceptance assertion currently fails first, these later checks are not represented
as independently observed RED failures.

### Post-checkpoint cleanup and atomic filesystem coherence

Both commit regressions run the actual `stageSnapshot` over fresh native temporary
directories. The `node:fs/promises` partial mock forwards every filesystem export and
every other removal unchanged. Only `rm` at the exact test-created
`partial-checkpoint.json` path throws controlled `EACCES`; the observed targeted call
count is one. All catalogue/shard validation, gzip, file writes, renames, reads and
rollback operations are real. No source HTTP or repository cache/output is involved.

- `COMMIT-RETAINED`: the first staging operation creates a complete accepted old public
  catalogue/shard and checkpoint. The candidate reaches checkpoint replacement, then
  cleanup fails. Expected rejection with all old bytes preserved; observed old public
  catalogue/shard preserved but **checkpoint bytes changed to the new successful state**.
  The public-byte equality assertions already pass and are not independently claimed
  as new RED; the checkpoint preservation equality fails.
- `COMMIT-FIRST`: without a prior output or checkpoint, cleanup fails after replacement.
  Expected both resources absent on rejection, or a complete coherently reported commit;
  observed a split pair: public output removed and new checkpoint retained. Both coherent
  pair and truthful result assertions fail. A completed pair can be accepted only when
  returned as success or explicitly reported with matching committed snapshot metadata;
  an unqualified error after a new commit is not treated as correct recovery.

The tests assert observable byte preservation/coherence, without prescribing private
backup names. Temporary directories and mock fault state are cleaned after each case.

## Checks and production freeze

`npm run typecheck`: exit 0. Scoped callable documentation inspection for the two new
test files: zero findings. Existing independent foundation command:

```sh
npm test -- --run tests/unit/source-schema.test.ts tests/unit/source-items.test.ts \
  tests/unit/acquisition-bootstrap.test.ts tests/unit/static-data.test.ts \
  tests/unit/reader.test.ts tests/unit/messages.test.ts tests/unit/harness.test.ts
```

Observed **561/561 passed across seven files**, exit 0 at 14:10:40 MYT. This includes all
99 earlier acquisition cases. Pending feature suites are not represented as GREEN.

Exact final test and pre-fix production fingerprints:

```text
src/source.ts
59e42f8f7da4c170bc156573f9310b85c0fa1d93a3b48c6a4351f16899748b7d
scripts/acquire.ts
abed2917b0a8a273118f7b305ae4b3fa47fde793f285f7b589554dfb826b7c5d
tests/unit/source-retention.test.ts
00a2f0d9ab1322791c96d289af8e95973dfe9bb55d38445ce8390568b98bbeb1
tests/unit/acquisition-regressions.test.ts
28d077f85395083963012141885b2fb7a19dde9237993c70ed51d7336249323f
```

Production fingerprints remained unchanged before/after both RED runs and checks.
No source/acquisition runtime edits, task marking, central TDD edits or commits were made.
The root owns subsequent foundation fixes and required GREEN evidence. This report does
not complete full-source, budget, publication, physical-device or actual-absence gates.

## Root repair GREEN

After the four recorded behavioral failures, the root kept current available-record
validation strict while permitting unchanged retained unknown-ID gaps to remain gaps.
The root also backs up the previous checkpoint before replacement and rolls it back
with public output on a partial-cleanup failure, including removing both resources
on a rejected first commit. At 14:13:09 MYT, the complete thirteen-suite implemented
regression selection passed **875/875**, including all five cases in this report.
Typecheck passed. [Durable exact command/output](foundation-repair-green.log).
No additional refactor was needed. Actual bootstrap inputs remain the separately
archived original versions; the run cannot be claimed as using these repaired inputs.
