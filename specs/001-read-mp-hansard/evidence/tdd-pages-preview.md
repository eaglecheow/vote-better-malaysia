# Public Pages preview regression evidence — 2026-10-10

User scope: prepare a clearly labeled public preview with a smaller acceptance
checklist. Full release acceptance and its reviewed reports remain a separate
workflow. These changes prepare publication; no hosted deployment has run.

Working-tree base: merged feature revision `0ad1c20`, with the CI fixes in progress
on `codex/fix-ci-pages`. Runtime: Node 24.21.0.

## RED — recorded before workflow/banner implementation

Regression identifiers: `PREVIEW-WF001` through `PREVIEW-WF005`, and
`PREVIEW-UI001` in `tests/unit/preview-workflow.test.ts`.
The required behavior is an explicit manual main-branch deployment, a successful
full-source build and checks before Pages publication, read-only preparation,
minimum privileged deployment permissions, and a persistent bilingual preview
notice outside the application's render root.

Command (exit 1; six behavioral assertion failures):

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
node node_modules/vitest/vitest.mjs run tests/unit/preview-workflow.test.ts
```

Observed failures include an empty workflow trigger set instead of
`workflow_dispatch`, absent deployment authority and prerequisite commands,
absent full-source size checks/shared concurrency, and a missing
`#public-preview` notice. An absent new workflow is represented by an empty
mapping, so there were no missing-file or parser exceptions.
Exact output: [pages-preview-red.log](pages-preview-red.log).

## GREEN scope

Implement only the manual preview workflow and static bilingual notice, using
the existing pinned Actions, official acquisition CLI, locked Node/browser
dependencies and artifact validator. Direct size-only assertions use the existing
release byte ceilings; no release candidate, laboratory report, physical-device
evidence or reuse approval is fabricated.

The focused preview suite passes all six tests after implementation, including
the explicit paragraph-language correction below. The same command used for
RED exited 0. Exact output: [pages-preview-green.log](pages-preview-green.log).
`PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck`
also exited 0; tests use the existing Vitest jsdom environment and DOMParser,
with no new dependency or typings package.

## Additional language regression RED

After the first workflow/banner checks passed, native inspection confirmed that
changing the reader language updates the document language. The Malay preview
paragraph therefore also needs an explicit language, like the English paragraph.
Before applying that correction, `PREVIEW-UI001` added the required `lang="ms"`
assertion and failed with empty text instead of `Pratonton awam` (exit 1;
one failure, five filtered tests skipped).

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node node_modules/vitest/vitest.mjs run tests/unit/preview-workflow.test.ts -t PREVIEW-UI001
```

Exact output: [pages-preview-language-red.log](pages-preview-language-red.log).

## Completed-source build and full-source size validation

The final isolated build command exited 0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm run build -- --outDir /private/tmp/hansard-preview-final.mGGMJJ
```

Exact output: [pages-preview-build-final.log](pages-preview-build-final.log).
The build includes the final `lang="ms"` paragraph and the current help page.
It does not replace the root agent's `dist` or frozen-browser artifact.

The actual workflow's `sizes` shell body was parsed from YAML and executed with
only its artifact path changed from `dist` to the isolated final build:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
HANSARD_PREVIEW_CHECK=/private/tmp/hansard-preview-final.mGGMJJ \
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
const artifact = process.env.HANSARD_PREVIEW_CHECK;
const workflow = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), aliases: false))', '.github/workflows/pages-preview.yml'], { encoding: 'utf8' }));
const source = workflow.jobs.build.steps.find(step => step.id === 'sizes').run.replace("measureArtifact('dist')", `measureArtifact(${JSON.stringify(artifact)})`);
const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', source], { encoding: 'utf8', env: process.env });
assert.equal(result.status, 0, result.stderr);
console.log('Completed-source preview build with historical4090-record snapshot: PASS');
console.log(result.stdout);
NODE
```

This command exited 0. The shared `measureArtifact` checked every supplied
catalogue/shard schema, reference, digest and compressed/decoded byte ceiling,
required layout asset and the full stored-byte total. The inline preview checks
also passed complete source/layout and record accounting, and the existing
shell/JavaScript/icon ceilings.
Exact output: [pages-preview-sizes-final.log](pages-preview-sizes-final.log).

| Final measured bytes | Observed | Ceiling |
| --- | ---: | ---: |
| Complete shell gzip | 24,225 | 153,600 |
| All JavaScript gzip, including worker | 15,170 | 102,400 |
| Icons stored bytes | 3,998 | 61,440 |
| Complete site stored bytes | 357,817,929 | 900,000,000 |

All 4,090 available records were measured, with zero unavailable/retained records
in this historical snapshot. The source snapshot remains
`46deaa63-9074-408c-a1df-7fd687af312c`, prepared at
`2026-10-10T06:24:11.774Z`. It is the previously acquired/restaged source documented
in [source-restaging.md](source-restaging.md); these checks made zero new official
source requests and did not relabel its timestamps or provenance.

The independent canonical manifest contains 4,099 sorted path/length/SHA-256
triples in `/private/tmp/hansard-preview-final-manifest.json`, outside the site.
Its SHA-256 is `cd9fb3c66e873f66c483c04a9f48da2bc745648db6b17d218604d5242370f60f`.
The measured artifact manifest digest is
`6b328acd878302945a5a5c7516a61f8d0c42661ccfe769dfac7109c1af0c0b5c`;
the current application-input fingerprint is
`6bf90c39765f13f603b08f17e4b494aeb5f5a453940169fc1a97c45a5b4cab08`.
This manifest supports an exact-byte comparison of independently built output;
it is not a release candidate or reviewed release report.

## Supplemental rejection and native preview checks

After implementation, the same actual workflow size body was exercised against
controlled mutations of the first isolated complete-site build: a 160,000-byte
random shell asset, a 110,000-byte random additional JavaScript asset, a 61,441-byte
additional icon asset, and removal of one actual referenced sitting shard. Each
case exited nonzero at its required budget/completeness assertion. The controlled
files were removed and the exact moved shard restored; the restored build passed.
These are supplemental failure-path checks, separate from the initial RED gate.
Exact output: [pages-preview-sizes.log](pages-preview-sizes.log).

The final isolated site was served on loopback port 4183 using Vite preview.
A native Chromium check switched both reader locales at 320 CSS pixels and verified
the visible bilingual notice, explicit Malay/English paragraph languages,
placement outside `#app`, and no horizontal document overflow. It exited 0;
the screenshot `/private/tmp/hansard-preview-banner-320-final.png` was inspected.
Exact output: [pages-preview-smoke-final.log](pages-preview-smoke-final.log).
The local servers were stopped after these checks.

## REFACTOR and validation boundary

No refactor was needed: the standard two-job Pages flow, shared existing source
validator, byte budgets and notice styling satisfy the authorized preview scope.
No release reports, physical-device execution, comprehensive accessibility audit,
performance timing evidence, source reuse permission, real-user metrics, hosted
workflow success, Pages settings change or publication is claimed by this report.
The new workflow will perform fresh complete official acquisition and all locked
native browser suites before an explicitly dispatched main-branch deployment.
