# Ranked performance-fixture hash regression RED

Recorded 2026-10-10 during the focused checker review, before any production fix.
Root authorized only two regression assertions at the end of
`tests/unit/performance.test.ts` and this evidence report. Production checker changes
remain root-owned. The controlled report is synthetic enforcement data; it establishes
no source acquisition, real performance, browser execution or physical-device result.

## Defect and isolated cases

`evaluateBudgets` derives median/p95/largest record paths, but compares
`processing.fixtureHash === candidate.fixtureHashes[processing.fixturePath]` without
requiring that ranked path exist in the candidate's own frozen hash map. When both
values are omitted, undefined equals undefined. The served-byte loop checks only
remaining candidate hash keys, so omission can also hide the required served measurement.

The existing private `report()` fixture has median `data/sittings/4.json.gz` and a shared
p95/largest path `data/sittings/1.json.gz`. Each new case removes its path from the
expected candidate, report candidate and all six device candidate copies, removes all
matching processing fixture hashes in both profiles, and removes that served-byte entry.
This keeps `sameCandidate` agreement intact so an unrelated mismatch cannot mask the
actual missing-evidence defect. The required behavior is rejection for either omitted
ranked path. The intact report remains an existing GREEN control.

## Tested working tree

Base HEAD: `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

| File | SHA-256 before production fix |
|---|---|
| `tests/unit/performance.test.ts` | `5f17e69e4034c2fe3524289fd8f7e068aa0957b81600bc7c73e49effaa6f387d` |
| `scripts/check-performance.ts` | `f4611bedcf7a29cdafb30e01991d0b945f7e47470e858af94da554ab55300931` |

## Observed execution

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/performance.test.ts
```

Vitest5.0.3 run started `14:10:34`: **2 failed, 184 passed, 186 total**, exit1,
duration2.75seconds. Both new cases reached the required assertion and failed because
the current checker returned true instead of throwing. No import, dependency, fixture,
syntax, TypeError, ReferenceError or unhandled-error failure occurred. Captured temporary
log SHA-256: `1e6a7d9ed1c23fe183240a23c0a5c670194d801c85ba09ea8d4d94137aee068a`.

```text
FAIL T063 regression rejects omitted frozen hash and served bytes for ranked dataset data/sittings/4.json.gz
FAIL T063 regression rejects omitted frozen hash and served bytes for ranked dataset data/sittings/1.json.gz
AssertionError: expected [Function] to throw an error
at rejectsMissingRankedFixture tests/unit/performance.test.ts:679
```

`npm run typecheck` passed, exit0. The owned test file's callable-documentation scan
returned `[]`; owned whitespace checks passed. No production code, source data,
acquisition state, task marker or commit was changed by this regression authoring.

## GREEN handoff

Root's proposed smallest fix is to require every derived role path be an own key of
`candidate.fixtureHashes` before accepting processing evidence. `isCandidate` already
requires every own hash value to be canonical lowercase SHA-256; the existing served
loop then requires actual served-byte entries for every required frozen role. No
additional helper library or refactor is needed.

The pre-fix handoff required the root to implement that check after verified RED, run the
186-case suite plus relevant checker/collector/documentation regressions and typecheck,
and record the actual passing result and necessary/no-refactor decision here or in
linked aggregate evidence. This report does not claim measured production budget passes.

The root subsequently added the own-key check after role derivation. At 14:13:09 MYT,
all **186 performance cases** passed within the **875/875** thirteen-suite implemented
regression selection, including collector/documentation checks. Typecheck passed;
no additional refactor was needed. [Durable aggregate command/output](foundation-repair-green.log).
These are enforcement checks, not measured production performance.
