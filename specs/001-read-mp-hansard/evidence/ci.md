# CI and repository enforcement evidence

## Public preview repair, 2026-10-10

The merged feature's [first hosted CI run](https://github.com/eaglecheow/vote-better-malaysia/actions/runs/38052361819)
failed on missing native Chromium, an implicit local acquisition context and absent
immutable full-release inputs. The user approved a public preview stage. The repair
installs Chromium before native units, makes controlled local context explicit,
runs independent production/browser checks on ordinary PRs and selects the strict
immutable release gates with `release-acceptance`. Genuine missing release inputs
continue to fail with actionable guidance. [Local verification](ci-pages-preview-verification.md)
records passing tests and its hosted boundary. Earlier counts and inspection below
retain their original scope; no repaired hosted run, protection change or merge
enforcement pass has been fabricated.

## Completed local configuration, 2026-10-10

T073 is complete in its controlled configuration scope. The implemented
[workflow](../../../.github/workflows/ci.yml) passes **31/31** configuration cases,
[CI inputs](tdd-ci-inputs.md) pass **201/201**, and the affected
[publication regressions](tdd-ci-inputs.md) pass **207/207**. The final
unrestricted suite passes **2,021/2,021**, production build/typecheck pass, and
the original frozen site passes **108/108** Chromium/WebKit cases. An independent
dependency/source directory reproduces all unit tests and build; see
[final verification](final-verification.md) for exact report/input bindings.
[Static review](ci-workflow-review.md) also records **39/39** valid shell bodies.

Controlled cases reject missing required reports, stale/foreign attempt archives,
changed artifact/application/fixture/conditions, substituted laboratory hardware,
omitted physical targets, unreviewed or changed TDD narratives, foreign PR heads
and a head that does not contain the current main base. Original producer and tested
revisions remain distinct. Preparation and PR artifacts are merge-only; they cannot
become trusted main source/publication state. These tests authenticate the supplied
review record; they do not prove an actual human review was performed.

T074 remains unchecked. No workflow was pushed or dispatched, no genuine remote
failed/missing-check blocking run was demonstrated, and no protection or review
settings were changed. Firefox on this macOS host, the defined Ubuntu laboratory,
all six actual physical targets and trusted candidate-bound reports remain required.

## Read-only repository inspection, 2026-10-10

At approximately 19:26 MYT, the authenticated GitHub CLI queried
`eaglecheow/vote-better-malaysia`; no remote state was changed.

```sh
gh api repos/eaglecheow/vote-better-malaysia --jq '{default_branch,permissions,pushed_at}'
gh api repos/eaglecheow/vote-better-malaysia/branches/main/protection
```

The repository returned default branch `main`, all five reported caller
permissions (`admin`, `maintain`, `pull`, `push`, `triage`) true, and last push
`2026-10-10T01:21:58Z`. The protection endpoint returned HTTP 404,
`Branch not protected`. Required-status and review enforcement has therefore
not been established. Available administration permission is not evidence that
the required rules or real CI runs exist.

The earlier workflow/input RED preparation subsequently reached the local
configuration GREEN recorded above. Local configuration and controlled reports
cannot supply repository enforcement or real hosted measurements.
