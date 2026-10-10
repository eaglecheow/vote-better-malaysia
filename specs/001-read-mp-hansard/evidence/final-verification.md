# Final local implementation verification — 2026-10-10

This records the uncommitted working-tree implementation, **64/80 tasks checked**, with the remaining required release work open. It is neither T080 completion nor a trusted publication/merge-evidence report. [Structured index](final-verification.json) retains actual report hashes and unchecked task IDs. [Acceptance traceability](acceptance.md) records every FR/DV/SC boundary.

## Actual inputs and frozen output

- Committed base: `1c4b079935bc5b7604474c1ba55def43ed6f0270`; source remains **uncommitted**. This base is not relabeled as the implemented revision.
- Application fingerprint: `fbe830313009c0b417a1169c592957dd5e8f550c4e48319cbbcfb4e8ceac6c3d`.
- Canonical deployed-file digest: `faf20d1973136a334eb51cf549c4490796ff8ed7f1d0733dded49324a2b08b0f`.
- Original frozen directory: `/Users/eaglecheow/dev/vote-better-malaysia/.cache/hansard/local-final-site-20261010-help`.
- Snapshot: `46deaa63-9074-408c-a1df-7fd687af312c`, prepared `2026-10-10T06:24:11.774Z`; publication time null.
- All **4099 files**, including **4090 shards**, are accounted for. Private state, candidate metadata and reports remain outside deployed files.

The output was renamed from `dist/` before native checks. `dist/` remained absent. After native tests and visual inspection, the exact sorted path/length/SHA256 manifest still matched all 4,099 measured files, and the application fingerprint remained unchanged. This freeze is a local diagnostic; genuine reviewed-main producer/archive provenance and the served baseline remain unavailable. No release candidate or human approval report was fabricated.

## Executed checks

All commands below used Node **24.21.0**, npm **11.17.0**, pinned dependencies and installed browser binaries. The build includes its TypeScript check.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
npm test -- --run --reporter=json \
  --outputFile=specs/001-read-mp-hansard/evidence/final-unit-green.json
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run build
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
HANSARD_FROZEN_SITE=/Users/eaglecheow/dev/vote-better-malaysia/.cache/hansard/local-final-site-20261010-help \
npm run test:browser -- --project=chromium --project=webkit
```

| Check | Actual result | Scope |
| --- | --- | --- |
| All units | **2021/2021**, zero failed/pending, exit 0 | All implemented suites, including native Chromium boundary cases and controlled provider/report cases. |
| Production build/type | Exit **0** | Complete local source output, final bilingual help, generated worker/version, repository base. |
| Frozen browser run | **108/108**, exit **0**, **20.5 s** | Chromium 156.0.8078.4 and WebKit 27.2 on macOS 27.2; authored real storage/worker and controlled-data journeys. |
| Complete size validation | All **8** byte-limit groups pass; source/layout/complete true | 357,817,266 stored bytes; 23,938 shell gzip bytes; every source shard descriptor/digest/accounting checked. No timings or transport observation. |
| CI input/publication | **201/201 + 207/207** | Authenticated controlled GitHub contexts, attempt/base/fixture/current-review and strict report failure paths. |
| Workflow configuration | **31/31**, plus **39/39** shell syntax bodies | Static/configuration checks; no hosted Actions execution or branch protection proof. |
| Independent environment | **2,021/2,021**, build/type exit 0, docs **48/48**, callable **[]** | Fresh dependency installation and copied current source in an owned directory, not a committed clone; final application fingerprint matches. Complete public source data was not copied there. |

The initial root unit command omitted the installed browser-cache variable. Two native unit boundaries failed to launch Chromium; [that report](final-unit-browser-path-failed.json) is preserved with SHA256 `6fc9747f3438189dbec71ada4ca477a0142ec5c6f3450f5b754575ac911e7cf9`. The unchanged code passes with the correct variable. This harness/environment failure is not behavioral RED and needs no new production correction.

A real complete-source record also matched DOM words/order (**2 turns, 66 gaps, 8 annotations**) in BM/English at 320 pixels and desktop width. That check uses the preserved pre-help directory, whose reader/data code is unchanged. The final help's separate native rendering fits 320 pixels, and root inspected the readable viewport image. See [browser evidence](browser.md); neither observation establishes actual Safari, assistive technology, first-time-user results or timing acceptance.

## Completion boundary

T073 is checked for its local configuration contract. T028 remains unchecked under the approved narrow Firefox host deferral. T057–T062 and T071–T072/T074–T080 remain unchecked: they require the genuine candidate, defined runner and physical targets, remote enforcement, candidate-bound human reviews, actual Pages/operational results and final release acceptance. T075 has partial independent setup evidence, not a full passing review. Mobile and desktop field Web Vitals are independently unavailable.

The only approved exceptions are the recorded [catalogue/conditional-absence policy](source-policy.md), [Firefox local phase deferral](browser.md) and [specific performance RED gap](tdd-performance.md). They do not waive release gates or authorize publication. Peer final read-only review found no remaining actionable local CI defect; it performed no remote mutation and supplies no human acceptance approval.

No changes are staged, committed, pushed or deployed. [Project guidance](../../../AGENTS.md) requires: “Run post-operation commit hooks only after the operation completes successfully and its required validation passes.” The mandatory `after_implement` hook therefore remains pending with the incomplete operation; a partial pass is not committed as successful implementation.

## Exact retained report hashes

| Report | SHA256 |
| --- | --- |
| [final-unit-green.json](final-unit-green.json) | `c581b4f6e125450fb9de3143ea2bec4a1345e0718135d74ec28a8e9297485345` |
| [final-unit-green.log](final-unit-green.log) | `87b8a4ed11c6e53907fe079dadbbab9328c57c95398f5fab407a443738e21dab` |
| [final-build.log](final-build.log) | `9bd2aa539f7adfaa1956d59e3ff730a69af8b6c5d6d14041b81c8df10db33327` |
| [final-frozen-browser.log](final-frozen-browser.log) | `d9b2650c54cc211ac95f0e733d6280d4222ed4a568fb80656c854ec953eafd1f` |
| [final-local-build-binding.json](final-local-build-binding.json) | `8e126bbe14d88c16ae849a1439c889444d9febcff2ce274aa2e10d436059b961` |
| [performance-local-sizes.json](performance-local-sizes.json) | `c540f4a93e45fd1177c9f7a67a4fad5847f58a578e56263707a320245f79a0d2` |
| [final-frozen-integrity.json](final-frozen-integrity.json) | `2eb31ba6376bd23064e07ef3c61032700676be36dadd1f0e7a5ec955920c0211` |
| [final-full-source-browser.json](final-full-source-browser.json) | `9a36ed17f7a8959b361a2b954fbe697d5ab74d2028211a85d03f2a7c8a509238` |
| [final-help-browser.json](final-help-browser.json) | `f236d616254daac68f56fd5aae0a32ea8d5e3598502709837f4b5d1f891df858` |
| [clean-environment.json](clean-environment.json) | `0d99c833665f98858fd9b865365a93ef3f66fd475ae70681e1c7efd3413872be` |
| [clean-environment-final-help.json](clean-environment-final-help.json) | `4379090c1745f19cacc5cb59c4c6db25529c0ea54c9d8b0a414a60489c4e44cf` |
| [clean-environment.md](clean-environment.md) | `ec329b6f68903b32dba5e7b0b48870b7fde52493cec1284ef6455aabc536e1f3` |
| [tdd-ci-reviewed-base-green.json](tdd-ci-reviewed-base-green.json) | `51ca7bd24f5d376c29394d0bca1a9ae2648e383090512be99cc191024aef8343` |
| [tdd-ci-acquisition-final-green.json](tdd-ci-acquisition-final-green.json) | `d1f53487ee1fd06992030624765797852c2dd5e508b895d2742a573fdf53b811` |
| [ci-workflow-first-green.json](ci-workflow-first-green.json) | `46e88f6fc71130b672848ba0dfa0419b0929f54dab04f0d4fee0355669f83efa` |
| [ci-shell-syntax.json](ci-shell-syntax.json) | `f7291729485bce30c0ec8a64da28132d492e712612067b14e4738f649200b40d` |
| [ci-workflow-review.md](ci-workflow-review.md) | `f01b9dd87d9c79121631c43fd3eb0cb0aa1debcb88a902d22895a1330e28d0c7` |
| [final-documentation-green.log](final-documentation-green.log) | `69b3fbf064290f8e22052374253ffe5bfbe5a18d58b743e8e367ee9c6b7b0515` |
| [final-callable-green.json](final-callable-green.json) | `a7444d90f0135722ddbc2ca3d0cd52f940c9c44c7da2ed4652916b5086e5e599` |

Earlier pre-help build/unit/browser/size records remain separate historical evidence. The final prose correction adds no product behavior; existing documentation and final build/unit/native checks pass. [TDD index](tdd.md) preserves valid pre-production RED, GREEN and no-refactor decisions.

[Final guidance/status review](final-documentation-review.json) confirms 215 local
links/fragments across the original 12-document scope and 136 targeted follow-up
links in the current indices/TDD/quickstart/tasks (overlapping scopes). No active
broken link or contradictory current claim remains. The quickstart's stale pending
runtime sentence was corrected; dated historical evidence keeps its original scope.
