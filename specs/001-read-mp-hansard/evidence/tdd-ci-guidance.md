# CI usage guidance adoption — 2026-10-10

Root authorized only developer/quickstart guidance adoption after the actual CI
workflow's configuration gate. This note covers documentation and layout review;
it grants no remote enforcement, device acceptance or publication authority.

## Scope and semantics

- Adopted the reviewed temporary `/private/tmp/hansard-ci-guidance.md` into
  `docs/development.md` and `specs/001-read-mp-hansard/quickstart.md`.
  Temporary draft SHA-256:
  `fb04c856d7740a63e20a019db2c17f05411afc425d76f8c37ac575ac2d56aa35`.
- Documented the exact manual `ci.yml --ref main` fields
  `pull_request_number` and `source_run_id`, authentic complete compatible
  reviewed-main source state, merge-only candidate/laboratory artifacts,
  seven-day retention and the fixed reviewed locator's complete field table.
- Kept original tested PR-head SHA, current explicit checkout SHA and workflow
  producer revision distinct. Evidence-only unchanged bytes can be reused only
  with authenticated matching identities/digests/conditions and fresh evidence;
  current edited guide text still needs current-file accuracy review.
- Named all seven required gates, actual Ubuntu laboratory conditions and all
  six named hardware/browser targets. Missing/full-source/report/target and
  identity/expiry/byte mismatch failures remain required failures.
- Kept Pages `evidence` operation separate from acquisition/build/promotion/
  deployment. It can upload reviews of CI bytes but cannot grant the merge-only
  candidate main publication eligibility, including after merge.
- Replaced the quickstart's stale absent-tooling opening with dated Phase 1
  history and current configuration/runtime status. Original acceptance
  scenarios, numeric budgets and delivery requirements remain intact.
- No README, task markers, CI aggregate report, source, workflow or tests edited.
  These prose changes implement no feature behavior and claim no new TDD RED.

## Observed checks

Using Node 24:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/documentation.test.ts --reporter=verbose
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/ci-workflow.test.ts --reporter=verbose
```

The documentation suite passed **48/48**, exit 0, at 19:59:34 MYT. Raw output:
[tdd-ci-guidance-documentation.log](tdd-ci-guidance-documentation.log).
This fixture suite checks the documentation checker; it is not a human
candidate-specific accuracy review.

The actual CI workflow configuration suite passed **31/31**, exit 0, at
19:59:54 MYT. Raw output:
[tdd-ci-guidance-workflow.log](tdd-ci-guidance-workflow.log).
It parses the current workflow, not a substitute configuration. Local
configuration assertions do not prove remote required-status enforcement.

Commands, artifact paths/names, dispatch fields, required-check names and
locator fields were reviewed against the current actual CI workflow and
`CiLocator` interface. Existing Pages operation/dispatch commands were checked
against `pages.yml` and `scripts/publication.ts` CLI. The CLI accepts
`prepare|promote|finalize` only in its actual reviewed-main workflow context;
the Pages evidence-only operation is implemented by the workflow's file upload,
not a fictional publication CLI mode. Local `gh workflow run --help` confirms
`--ref` and `-f` syntax. No dispatch or privileged operation was executed.

After creating this linked note, native local checks passed: **10** documented
shell blocks passed `bash -n`, **30** local Markdown paths and **5** heading
fragments exist, and the seven named checks plus both dispatch fields match
the actual Ruby-parsed CI workflow. Raw output:
[tdd-ci-guidance-checks.log](tdd-ci-guidance-checks.log).
The earlier path check found only this not-yet-created note; after its creation
the full path check passed. That ordering failure is not feature RED.
`git diff --check` passed for the owned files.

The global callable checker returned one finding, exit 1:
`scripts/publication.ts:455: missing @remarks for mutation side effects`.
That shared file is owned by the helper agent, who was notified; it was not
edited here. Raw output:
[tdd-ci-guidance-callables.log](tdd-ci-guidance-callables.log).
No callable was introduced in these two Markdown files; this result cannot
be represented as a global comment pass.

The publication owner then corrected the shared helper's pure local-origin
handling. A fresh independent global callable check returned `[]`, exit 0:
[tdd-ci-guidance-callables-green.log](tdd-ci-guidance-callables-green.log).
The original finding/log above remains historical. Publication SHA-256 at
this successful recheck:
`29e01b27fef2e3c82b991d190a4175fe1ba16625140c97a4b79b820ec5705e6a`.

Initial-adoption reviewed byte fingerprints:

| File | SHA-256 |
|---|---|
| `docs/development.md` | `74b860efac718bfeca716258b14ab08e188f7bcfb83ae59f91c17e2ee6220c6e` |
| `specs/001-read-mp-hansard/quickstart.md` | `f843e81d44ac080893f7efc6ce790e7c2be9487051e1deaf3cfd45844d6e239a` |
| Actual reviewed `.github/workflows/ci.yml` | `1866c0f11ddd290f1c8f40102a4c57bdfd04c697e17c8ecc0f6770ad52dbf871` |
| Publication CLI at this review | `f8192e540c76c081672443ca26429235eacbf5b51ecfc4eff172af9404634892` |

## Settled human TDD report instructions

After root approved the minimal shared contract and the source owner confirmed
its field grammar, the developer guide adds `tddReviewed: true`,
`tddReviewer` and `tddEvidence` instructions for full
`reports/automated.json` only. The hash map must identify every exact current
regular `tdd*.md` narrative directly in this feature evidence directory,
including aggregate `tdd.md`. Existing candidate/reviewedAt binding remains.
Machine candidate receipts do not claim human approval. Main publication links
to the same field table; a trusted-main supplied approval record is not proof
of a person's review or T074 remote/admin enforcement. Shared code enforcement
remained with its owner behind separately observed CI/publication regressions.

The final documentation recheck passed **48/48**, exit 0, at 20:06:25 MYT:
[tdd-ci-guidance-documentation-final.log](tdd-ci-guidance-documentation-final.log).
All **10** documented shell blocks still pass syntax checks; **31** local
Markdown paths and **6** heading fragments exist:
[tdd-ci-guidance-checks-final.log](tdd-ci-guidance-checks-final.log).
Whitespace checks passed. No remote command was executed.

Final developer-guide SHA-256:
`f0aed243b1ad6405adbada1e5251ebb7968fe867fbba379c1d1d0e3fe8403afe`.
Quickstart remained
`f843e81d44ac080893f7efc6ce790e7c2be9487051e1deaf3cfd45844d6e239a`.

## Remaining boundaries

Final helper runtime/regression results and a fresh unrestricted full-unit/build
result remain for root to record after release. Source owner reported an initial
176-case GREEN while final type/docs/self-review was still in progress; the
guides deliberately retain pending final validation rather than promote that
interim report to a complete gate. Remote workflow dispatch/blocking, required
checks/reviews/admin configuration, actual Ubuntu measurement, six physical
stable-browser targets and live Pages publication remain unverified. Existing
local Firefox host deferral remains an exception, not Firefox acceptance.

No code refactor was needed. The smallest change was two guidance updates and
this bounded evidence note; final candidate-bound documentation accuracy review
remains required.
