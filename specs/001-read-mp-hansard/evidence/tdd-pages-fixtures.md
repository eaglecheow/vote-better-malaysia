# Main Pages candidate collector fixtures

## RED, 2026-10-10

Base revision: `0ad1c20450718e308d6dc81f3a6b5ef24e4230a9`. Working tree
contained the new publication regression and coherent controlled-source harness
updates; production publication/CI fixture behavior was unchanged. The acquisition
unit fix was being performed independently in the same checkout.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
npm test -- --run tests/unit/publication.test.ts -t PUB-COLLECTOR-FIXTURES
```

`PUB-COLLECTOR-FIXTURES` performed real controlled acquisition/build/freeze and
reached `awaiting-evidence`. It then failed three behavioral assertions: main
`fixtures.json` was a hash map rather than the collector's source-backed
`datasets`/`interactions` manifest; the actual gap outside ranked records had no
candidate hash; and the frozen hash set omitted that selected gap. The manifest
expected real assigned member `1839` for measured median/p95/largest datasets
and largest/gap interactions. See [raw RED output](pages-fixtures-red.log).

The controlled fixture now preserves all original source leaves during the
acquisition boundary and contains one actual gap. These harness repairs are
setup, not RED. No import, parser, dependency or missing-file failure supplied
the regression evidence. This is controlled filesystem/source/controller
coverage, not a hosted lab, physical-device report or publication.

Production work begins only after this RED record.

## GREEN and regression

The existing CI source-backed fixture generation/validation now lives in the
shared publication authority. Both producers write the collector's
`datasets`/`interactions` manifest and bind every ranked/interaction path to its
exact measured stored bytes. Main promotion validates real assigned members,
rank roles, gap/largest coverage and the exact required hash set. No artifact
bytes or source/snapshot metadata are changed by expanding external fixture
hashes; existing artifact measurements remain authoritative.

The focused command with `-t PUB-COLLECTOR` passes **7/7** cases. The main
regression now continues through independently authenticated controlled
preparation-to-promotion reuse and reaches `ready` without rebuilding. Six
invalid-manifest cases reject wrong rank, absent member, missing largest,
missing gap, omitted gap hash and an unrelated extra hash. See
[focused GREEN](pages-fixtures-green.log).

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
npm test -- --run tests/unit/publication.test.ts tests/unit/ci-inputs.test.ts
```

The affected main publication and CI input suites pass **415/415**. See
[regression output](pages-fixtures-regressions.log). `git diff --check` and
`PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck`
pass after the parallel preview test's import setup was repaired.
The exact tested file SHA-256 values are:

| File | SHA-256 |
|---|---|
| `scripts/publication.ts` | `043ba4240ed90213a53dceafc7115adac8ea2d2d5c100512765b04c5fb9ddd84` |
| `scripts/ci-inputs.ts` | `4c1c200f3efcf249d51aa120bf67e937c2ac147f27b9d335cdb2d7651e358674` |
| `tests/unit/publication.test.ts` | `24baba0570e9b897703c87b26dc53dc641b15ed5fde26cf36dfccac98b06b79f` |
| `pages-fixtures-red.log` | `bd2be28855fed5a09ea0bc71f49861c36f6072e6e71141c83749f6b79183b203` |
| `pages-fixtures-green.log` | `b14318cdb3e880d7aa574c78efec1ada8a5f8bfb0207ad83401a9c3d5d499d9e` |
| `pages-fixtures-regressions.log` | `185c97dc4be767d87d2cae982fd07022449c6d8bdc39ffd02795aebd5350d5c1` |

Refactor decision: reuse the existing publication module that already owns
rank selection and is imported by CI. No new dependency, helper module or
configuration was necessary. This retains one source-backed fixture contract
without creating an import cycle.

These checks exercise controlled source/provider/filesystem boundaries. No
hosted Ubuntu collection, physical-device reports, full release acceptance or
Pages deployment was performed by this fixture repair. Fresh candidate-matched
evidence remains required by the original full-release promotion path.
