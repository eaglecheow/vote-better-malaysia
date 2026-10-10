# CI acquisition test context regression — 2026-10-10

Tested revision: merged feature revision `0ad1c20` on
`codex/fix-ci-pages`, before changing the acquisition test helper.
Runtime: Node 24.21.0 from `/private/tmp/hansard-node24/node_modules/node/bin`.
All source responses and filesystem state in these tests are controlled fixtures;
these results do not prove live acquisition or publication readiness.

## RED — recorded before the fix

Existing regression identifier:
`T013 local feature-branch private partial work resumes only in the same development session`.
The expected behavior is that an explicitly simulated local feature-branch run can
resume accepted private work in its same controlled session, even when the test
runner is hosted in GitHub Actions.

Command (exit 1):

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
GITHUB_ACTIONS=true node node_modules/vitest/vitest.mjs run \
  tests/unit/acquisition-bootstrap.test.ts -t 'local feature-branch private partial'
```

Observed behavioral failure: `Private partial execution context mismatch` from
`scripts/acquire.ts:985`, at the same-session resume call in
`checkpointsRunCap`. The test helper did not supply `workflowContext`, so the
acquisition code correctly interpreted `GITHUB_ACTIONS=true` as workflow
execution and rejected a feature-branch partial checkpoint. One test failed;
98 tests were skipped by the requested filter.
Exact output: [ci-acquisition-context-red.log](ci-acquisition-context-red.log).

## GREEN

Declare `workflowContext: false` in the bootstrap tests' controlled options, as
the acquisition refresh and regression test helpers already do. This isolates the
simulated execution context without clearing the runner's environment or changing
production origin validation. Explicit `workflowContext: true` rejection cases
remain present, and the trusted workflow-artifact baseline fixtures retain their
origin metadata and validation.

The working-tree change is limited to the bootstrap test helper's execution
context and its documentation. No production acquisition code changed.

Both commands exited 0 with all 187 tests passing across three files:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
GITHUB_ACTIONS=true node node_modules/vitest/vitest.mjs run \
  tests/unit/acquisition-bootstrap.test.ts \
  tests/unit/acquisition-refresh.test.ts \
  tests/unit/acquisition-regressions.test.ts

PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
env -u GITHUB_ACTIONS node node_modules/vitest/vitest.mjs run \
  tests/unit/acquisition-bootstrap.test.ts \
  tests/unit/acquisition-refresh.test.ts \
  tests/unit/acquisition-regressions.test.ts
```

Exact outputs: [CI context](ci-acquisition-context-green-ci.log) and
[ordinary local environment](ci-acquisition-context-green-local.log).
These passes include local same-session resume, local bootstrap/refresh,
cross-workflow promotion rejection, untrusted partial checkpoint rejection,
workflow-artifact baseline validation, and acquisition refresh/regression cases.

## REFACTOR and validation boundary

No refactor was needed: the existing explicit execution-context option isolates
the test fixtures, and the refresh/regression helpers use the same pattern.
The acquisition CLI continues deriving its production workflow context from
GitHub Actions, and all existing production checkpoint trust checks remain intact.
No live source requests, browser/device acceptance, hosted CI run, deployment,
or publication was performed by these focused unit-suite commands.
