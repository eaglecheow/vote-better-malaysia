# Additional T034 pre-implementation refresh checks

On 2026-10-10, root authorized focused additions to the existing 52-case refresh
suite before production implementation. The original assertions are unchanged;
their prior behavioral RED is recorded in [tdd-refresh.md](tdd-refresh.md).
The completed T027 re-staging and approved local Firefox phase exception permit
T034 implementation only after these additional missing behaviors have RED evidence.

Command under Node 24.21.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/acquisition-refresh.test.ts -t REF-EXTRA
```

Final pre-production run started **2026-10-10 17:12:54 MYT (09:12:54 UTC)**,
exit **1**, duration **4.02 s**: **21 behavioral failures, 5 passing controls,
52 original cases skipped**. Durable output: [tdd-refresh-additional-red.log](tdd-refresh-additional-red.log).

Tested working-tree bytes:

```text
scripts/acquire.ts: 3b98a97d721f00e63eff0126d790bffe01c269118351e04d15b1fb076be98910
tests/unit/acquisition-refresh.test.ts: 690e0b98f93e9e3754c63732ea45b3f85ebbc35989c37e7741374dd502799905
```

- Seven `REF-EXTRA-HISTORY-*` cases require rejection of five/seven/non-array,
  numeric/malformed/calendar-invalid/future bucket checks before source access or
  accepted-state replacement. The current acquisition ignores the new private
  history: observed `rejected === false`, rather than a validation rejection.
- Eleven `REF-EXTRA-PARTIAL-*` cases require rejection of invalid bucket/index,
  duplicate/unknown/inconsistent target/completed/pending/changed/failed ledgers,
  unreferenced hashes and expired/future partial state. Valid actual interrupted
  source bytes were prepared first. Current acquisition ignores these new ledger
  defects and resumes/stages: observed `rejected === false`.
- `REF-EXTRA-NEW-FAILURE` already gets an unavailable new record from real controlled
  HTTP503; its required failed/completed/pending acquisition/staging report is absent.
- `REF-EXTRA-OUTSIDE-BUCKET` already retains the failed recent record's old payload;
  required independent successful selected-bucket accounting/checkpoint progress is absent.
- `REF-EXTRA-DENIAL` already stops on actual controlled HTTP403 and preserves
  accepted bytes; the required fatal acquisition/not-attempted-staging report is absent.

Five controls pass and **are not RED**: two `REF-EXTRA-LEGACY-*` cases accept valid
or absent optional pre-refresh history, `REF-EXTRA-PARTIAL-CONTROL` preserves an
actual accepted partial timestamp, and both `REF-EXTRA-FLAG-*` cases preserve coherent
catalogue/shard status and failed prior data. The latter permit either retaining the
old accepted flag until a successful targeted recheck or accepting coherent new bytes;
they do not add a metadata-revision priority or weaken the fixed refresh priority contract.

An earlier preliminary run was interrupted (exit130) while expensive rejected-state
buffer diffs were being rendered; it supplies no valid RED evidence. Its startup-only
output remains [tdd-refresh-additional-interrupted.log](tdd-refresh-additional-interrupted.log).
The new tests were repaired to assert behavioral rejection first. A missing test-helper
`@throws` comment was corrected before the final run. Typecheck passed; no fixture,
import, syntax or harness error is counted as a behavioral failure. Production
`acquire.ts` remained frozen throughout this RED preparation.

GREEN, full relevant regressions/type/documentation checks and refactor/no-refactor
assessment remain to be recorded after the smallest production implementation.
These controlled transports/filesystem/clock cases do not prove a scheduled workflow,
live revised-source publication, browser/device acceptance or actual official latency.

## Required private-report write and atomic commit boundary

Before production, `REF-EXTRA-REPORT-WRITE` added an actual temporary filesystem refusal
(a directory at `receipts/refresh-session/refresh.json`). The required new outcome write
must participate in the accepted output/checkpoint commit boundary: inability to record
the outcome must reject and preserve the old public/private accepted bytes. Current
acquisition never writes that report, so observed `rejected === false`; no filesystem
exception or malformed source fixture counted as RED. Dedicated command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/acquisition-refresh.test.ts -t REF-EXTRA-REPORT-WRITE
```

Exit 1, one behavioral failure and 78 skipped. Durable output:
[tdd-refresh-report-write-red.log](tdd-refresh-report-write-red.log). Acquisition
remains SHA `3b98a97d721f00e63eff0126d790bffe01c269118351e04d15b1fb076be98910`;
new test file SHA `39ddb6dc150ab98d0c2d4cf3e793bb212637825da13339b7c2da25471c7098dc`.
The existing 52 assertion bodies remain unchanged; the only shared import addition
is native `mkdir` for this isolated new filesystem case.

## Failed progress before interruption

Two further pre-production cases require real failed attempts to retain their own
old accepted content/actual failed-attempt time across a capped partial resume, and
reject a ledger claiming a failed ID without corresponding attempt evidence. Command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/acquisition-refresh.test.ts \
  -t 'REF-EXTRA-(PARTIAL-missing-failed-record|FAILED-RESUME)'
```

Exit 1, two behavioral failures: current metadata is ignored (rejection false), and
the actual cap checkpoint lacks required failed/completed progress. Native controlled
HTTP503 retries and the actual cap occur normally before the latter assertion.
Durable output: [tdd-refresh-failed-resume-red.log](tdd-refresh-failed-resume-red.log).
Acquisition remains SHA `3b98a97d721f00e63eff0126d790bffe01c269118351e04d15b1fb076be98910`;
test SHA `5d895c8dd6cf2f63d88b61ade4251add12121f622a98a9975e5dec2250a25637`.
No production refresh behavior was written before these failures were recorded.

## Peer-review refresh-context regressions

After the initial implementation reached 180/180 acquisition GREEN, independent peer
reviews identified five required context variants. Before fixing them, command
`npm test -- --run tests/unit/acquisition-refresh.test.ts -t REF-CONTEXT` exits 1;
all five cases fail behaviorally, with 81 existing cases skipped. Durable output:
[tdd-refresh-context-red.log](tdd-refresh-context-red.log).

- `REF-CONTEXT-PARTIAL-OMISSION`: an actual newly accepted partial ID disappears from
  fresh inventory before resume. Current reconciliation rejects it as unknown, losing
  the ability to stage its retained coherent bytes/identity/times.
- `REF-CONTEXT-LATE-IDENTITY`: an untouched valid historical unknown-ID gap remains
  original source text while the exact identity becomes current and is assigned in
  another successfully rechecked sitting. Current available-record validation rejects
  that older attribution context; no source reassignment or failed attempt is allowed.
- Both `REF-CONTEXT-PRECISION-*`: source timestamps legitimately use whole seconds
  and milliseconds. Current lexical ordering returns the later millisecond instant
  ahead of the earlier whole-second instant, for historical and prior-failed checks.
- `REF-CONTEXT-RESUME-NEW`: a new identity genuinely appears in the next fresh inventory
  on resume. Current original-plan-only targeting does not request it and can label
  it unavailable without a real source attempt.

Tested acquisition SHA `9e595455a899f9971cccb19491f52625cb1f2787d1a7df185cc28c751d8c5bb1`;
test SHA `376af1f536de5d6e682017e9036f561443e8ca3fd67d103a371682f127a52a88`.
These variants fail after valid fixture setup against the current production behavior;
they are regression RED, not a claim that the original180 passing assertions failed.

## Final GREEN and assessment

The five peer-review regressions were observed at **17:27:27 MYT**, exit1, before
their fixes. Final controlled acquisition coverage is **86 refresh + 99 bootstrap = 185**
passing cases. The final 18-file relevant regression run started **17:32:07 MYT**,
exit 0, **1024/1024 passed**, duration 8.84 s, with the exact command/fingerprints in
[source-refresh.md](source-refresh.md) and durable output
[tdd-refresh-regressions.log](tdd-refresh-regressions.log).

Full typecheck and the global callable documentation scan pass (zero findings);
diff checks pass. No broader refactor was necessary. Private staging now includes
the required report/history write in its existing rollback boundary; completed partial
records are applied before pending work, making the old resumed-work loop branch
redundant. Surgical cleanup preserved its identity checks and was regression-tested
before and after. This GREEN covers the original 52 RED, 24 additional missing behaviors,
five already-passing controls and five peer-review regression cases; controls are not
retroactively counted as RED. No native browser/device or actual schedule/publication
claim follows from these controlled acquisition checks.
