# Setup verification — 2026-10-10

## Final local guidance and reproducibility checks

The final rebuilt help and original frozen-site run are complete: **108/108**
Chromium/WebKit cases pass with `dist/` absent. The final unrestricted unit suite
passes **2,021/2,021** in the original and independent dependency/source directories;
build/typecheck pass, documentation fixtures pass **48/48**, and the global callable
scan returns **[]**. [Final verification](final-verification.md) and
[independent setup evidence](clean-environment.md) bind exact inputs and commands.
Native inspection confirms the final help page fits 320 CSS pixels with a short
bilingual preview notice. Operational test details remain in developer guidance.

The README now describes the implemented static reader and links unfinished
acceptance work. The previous MIT/`LICENSE` assertion was removed because this
checkout has no such file; no license or source-reuse approval is invented.
Full trusted-candidate documentation accuracy, clean live acquisition/refresh,
actual-device installation and remote deployment commands remain unverified.
T075 stays unchecked. The following dated sections preserve earlier results.

## Current PWA guidance adoption

After T055's local 108/108 native gate, T056 updated both user-guide languages,
discoverable static help and developer command/setup guidance. It distinguishes
opened committed pairs from the whole archive, pending/failed latest checks,
current versus prior saved time, unavailable/evicted/incompatible storage,
transcript saving versus complete shell/catalogue/pair readiness, Retry and
deliberate Apply/Continue. Official browser installation sources were checked;
installed-app context must establish its own saved/ready status.
[Detailed review and hashes](tdd-pwa-guidance.md) records **48/48** documentation
tests, typecheck, zero callable findings and 22 resolving local Markdown links.
The root reviewed these semantics against the current reader; physical-device,
Firefox, assistive-technology, human, candidate-bound accuracy and publication
acceptance stay pending. The subsequent final rebuilt help and alternative
frozen-artifact browser results are recorded above.
The dated setup history below retains its original limited scope.

Operation started clean at `1c4b079` on `001-read-mp-hansard`.
Node `24.21.0` was installed in `/private/tmp/hansard-node24`, selected with
`PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH`; npm was `11.17.0`.
Setup code/configuration/fixture fingerprint: SHA-256
`d62c269a619c5740b7b93bee74f86cd58918ad476c7ea6dcedc3446f2a1171a1`.
This hashes sorted named setup files, each filename + NUL + bytes + NUL, including
package/lockfile, .nvmrc, TypeScript/Vite/Vitest/Playwright configs, index/main,
harness tests and both fixture JSON files. Documentation/task edits are excluded.

| Task/check | Observed result |
|---|---|
| T001 `npm ci --no-audit --no-fund --cache /private/tmp/hansard-npm-cache` | Pass; lockfile install under Node 24. |
| T001 `npm run typecheck` | Pass. |
| T001 `npm run build` | Pass; blank `dist/index.html` and one JS asset under the repository base. |
| T002 `npm test -- --run` | Pass; one harness assertion. No feature RED evidence. |
| Browser install | `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npx playwright install chromium firefox webkit` succeeded. |
| T002 production smoke | `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npm run test:browser -- --project=chromium --project=webkit`: 2 passed at `http://127.0.0.1:4173/vote-better-malaysia/`. |
| Full browser harness | `npm run test:browser` with the same browser path: Chromium/WebKit passed; Firefox exited before assertions with `Could not find profile folder`. Retrying Firefox with `TMPDIR=/private/tmp` and a fixed temporary profile failed identically. This launch failure is not feature RED. |
| T003 ignores | `git check-ignore` excludes dependencies, generated data/build/state/raw receipts and browser/coverage output; source, fixture, docs and feature evidence remain trackable. |
| T004 development URL | `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` plus `curl --fail --silent http://127.0.0.1:5173/vote-better-malaysia/` returned the blank BM shell with base-scoped module URLs. Server binding requires sandbox escalation here. |

Firefox's local launch failure matches the
[upstream macOS app-data issue](https://github.com/microsoft/playwright/issues/42768).
The passing production smoke checks establish Phase 1 tooling, not reader or PWA
behavior. Firefox and all physical/browser/publication/performance acceptance remain
unverified. No OS security settings were changed.

Source fixtures were freshly sampled from the official source on 2026-10-10.
`tests/fixtures/manifest.json` records acquisition times, raw-response/excerpt hashes,
source URLs and partial-fixture/synthetic scope. The sampled fixture-file SHA-256 was
recomputed and matched. Raw responses remain private temporary evidence. No sampled
record establishes real verified absence; no full archive was acquired.

README developer links resolve; the pre-existing `LICENSE` link has no target and
was left unchanged. Acquisition/performance commands are explicitly pending: their
entry points cannot claim success before the corresponding scripts are implemented.
No source behavior, deployment, feature TDD, or field-performance pass is asserted.

## Later tooling and foundation checks

The Phase 1 rows above preserve their original scope. Subsequent feature RED/GREEN
is linked from [tdd.md](tdd.md). The parent independently ran the schema/items/docs/
harness group followed by type checking: 349 assertions passed. The saved-result
snapshot-metadata correction later raised the independently verified group to 352.
These checks do not mean the in-progress acquisition/performance suites are green.

For the required DOM unit checks, pinned development-only `jsdom@30.1.2` was added
under Node 24.21.0. The Vitest config shares the Vite base and TypeScript includes
Vite's client environment types. `npm test -- --run tests/unit/dom-harness.test.ts
tests/unit/harness.test.ts` passed two harness assertions; `npm run typecheck`
passed. The DOM harness contains no reader behavior and is not feature RED or layout
evidence. The host is macOS 27.2 (build 26B5091g), consistent with the recorded
Firefox pre-test launch limitation.

`npm run check:docs` without candidate/review reports was run and exited 1 with
`Required candidate and accuracy review report are missing`; this is the expected
fail-closed result, not a full-app documentation pass.
# Recovery and publication guidance review

On 2026-10-10 at 18:42–18:44 MYT the root adopted and read the developer and
bilingual user/help guides against the implemented online/recovery reader and
reviewed local Pages workflow. Both languages distinguish gap-bearing empty subsets,
verified complete absence, unavailable records and failed retrieval; explain Retry,
the successful source/device times, null official/publication dates and snapshot
knowledge limits; and disclose incomplete offline/device/publication acceptance.

Developer instructions use actual `prepare`, `evidence` and `promote` operations,
`candidate_run_id`, `evidence_run_id`, optional `resume_run_id`, and the complete
four `specs/001-read-mp-hansard/evidence/publication-reports/` paths. They explain
resolved immutable artifact IDs, seven-day retention, exact-candidate and prior
baseline matching, evidence delay, validated recovery, private journals and a
successful deployment whose live confirmation fails. Dispatch syntax was reviewed;
no GitHub workflow was invoked. Configuration is not an active schedule or proof
of best-effort source latency. The 1 MiB/conditional-absence approvals remain explicit.

All 24 local Markdown targets in the adopted guides resolve, and both help language
anchors resolve. The broader README scan also found its pre-existing missing
`LICENSE` target; that separate T075 review item remains open. Typecheck passed and
the callable-documentation scan returned no findings. The production rebuild and
60 native Chromium/WebKit journeys are linked in [browser evidence](browser.md).
This is a local developer semantic review, not the candidate-bound human accuracy
report required before promotion, actual hardware or usability acceptance.
