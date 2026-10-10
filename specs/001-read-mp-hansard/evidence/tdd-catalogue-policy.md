# Approved catalogue budget RED evidence

On 2026-10-10 the user answered **“Approve 1 MiB and conditional absence”** to
raising the catalogue gzip cap to 1,048,576 bytes and making the real absence
sample conditional on an eligible complete source record. The classifier, controlled
absence tests and all other limits remain required; [policy decision](source-policy.md).

Before changing production, at **17:00:31 MYT**, Node 24.21.0 ran:

```sh
npm test -- --run tests/unit/catalogue-policy.test.ts tests/unit/acquisition-bootstrap.test.ts
```

[Original RED output](catalogue-policy-red.log): exit 1, **four failed / 98 passed**.
The new exact-ceiling acceptance and POLICY-SIZES both rejected the newly allowed
catalogue with `Compressed resource exceeds acquisition budget`. POLICY-RETRIEVE
rejected a valid complete native gzip catalogue between the old and new caps with
`Published resource byte limit exceeded (204800 bytes)`. POLICY-STAGE rejected that
valid complete candidate rather than committing the actual catalogue/shard/private
checkpoint. These are observed missing acceptance behavior, with no import, fixture
or harness failures. The one-byte-over rejection and other limits already passed;
they are controls, not new RED evidence.

Pre-production inputs:

| Path | SHA-256 |
|---|---|
| `src/source.ts` | `8732d0bdd0964c538bfa2c3fb7fbad26ca90b833336849e48ff428fe93f84043` |
| `scripts/acquire.ts` | `3b98a97d721f00e63eff0126d790bffe01c269118351e04d15b1fb076be98910` |
| `tests/unit/catalogue-policy.test.ts` | `2d17089b631ceedeca0c2b8973015c376da08e83dc6d5e4d22e7579cbb3f1e21` |
| `tests/unit/acquisition-bootstrap.test.ts` | `50a2f944bd337e98c2d7bf094ede068e1c10f5b74059e27f2f2e6cbf9309ccd8` |

Typecheck exited 0 before production. The synthetic larger catalogue extends only
explicit fixture historical metadata using bounded random bytes; it changes no
source passage or attribution rule. The measured-size test records actual prior
measurements without claiming that the earlier failed bootstrap passed.

Performance-accounting RED is recorded [separately](tdd-catalogue-performance-policy.md).
At **17:02:38 MYT**, the same Node runtime ran those two suites plus
`tests/unit/static-data.test.ts` and `tests/unit/performance.test.ts`:
**334/334 passed**, four suites, exit 0; [GREEN output](catalogue-policy-green.log).
Production changed only the authoritative catalogue limit in `DATA_LIMITS`.
Post-change `src/source.ts` SHA-256 is
`ab5b02ac7dc3a3d484572ba1dba6a1a2818ae29d105130f83b2cb7246b8c6896`;
acquisition and performance code consume that same limit without duplicated policy.
One-byte-over rejection, sitting/decoded/whole-data ceilings and strict attribution
remain covered. No refactor was needed. Complete-source re-staging is separate and
will be recorded only after it actually finishes.

At **17:03:27 MYT**, the explicit fifteen implemented suite paths ran with
`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers`: **890/890 passed**, exit 0;
[full implemented regression output](catalogue-policy-regressions.log). This includes
actual local HTTP representation and Chromium collector-plumbing checks. Typecheck
exited 0, `checkCodeDocumentation(process.cwd())` returned `[]`, and `git diff --check`
exited 0. Future recovery/refresh/storage/worker/update tests remain RED pending their
implementation; the unrestricted unit command is not claimed GREEN.
