# CI repair and public preview stage — 2026-10-10

The user selected an explicitly labeled public preview with a smaller acceptance
checklist. Ordinary preview PRs require type/unit and production browser checks;
`release-acceptance` PRs additionally require the existing immutable full-release
candidate/report gates. This does not complete the original release requirements.

Before workflow edits, root added CI-WF019–022 and amended CI-WF001, then ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/ci-workflow.test.ts > specs/001-read-mp-hansard/evidence/ci-preview-workflow-red.log 2>&1
```

At merged base `0ad1c20450718e308d6dc81f3a6b5ef24e4230a9`, with only repair tests
and independent acquisition-test changes applied, **5 failed / 30 passed**.
Failures demonstrate absent Chromium installation in the unit job, absent explicit
release-label selection and label events, absent independent preview browser job,
and raw jq missing-file feedback instead of an actionable release-evidence rejection.
[RED output](ci-preview-workflow-red.log) was saved before workflow production edits.
The missing-locator shell test supplies a controlled repository environment and
uses an empty temporary checkout, so it reaches the actual missing-file behavior.
An earlier missing environment variable was repaired in the test harness and is
not counted as behavioral RED.

## GREEN and review

The actual workflow passes **35/35** configuration/executable-shell cases after
installing native Chromium before units, adding an independent production/browser
job to ordinary PRs, selecting full-release roles with the explicit release label,
and adding label-change events and actionable missing-locator rejection.
See [GREEN output](ci-preview-workflow-green.log). Final combined CI/preview/docs
checks pass **89/89** in [focused verification](ci-pages-preview-final-focused.log).
The callable documentation scan passes after replacing unnecessary inline callback
functions with the surrounding loop style; no production refactor was required.

Independent connected-code review found no remaining actionable workflow/code
defect. Its stale Help workflow links were corrected in both locales. Full release
gates retain provenance, full-report and exact-byte checks; selecting the approved
preview stage does not fabricate or complete their evidence.
See [final preview repair verification](ci-pages-preview-verification.md) for
actual full units/build/native/source checks and the remaining hosted boundary.
