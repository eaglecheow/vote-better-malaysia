# Developer setup

Run commands from the repository root. This guide records the setup status on
2026-10-10; the [task list](../specs/001-read-mp-hansard/tasks.md) tracks implementation
and the [quickstart](../specs/001-read-mp-hansard/quickstart.md) preserves dated planning requirements and current CI usage. Online/recovery and saved-reader/offline/update mechanisms are
implemented, with full local source verification and controlled unit/native-engine
evidence. On 2026-10-10, the final frozen-site Chromium/WebKit mechanism run passed
**108/108**, and all unit suites passed **2,021/2,021** in both the original checkout
and an independent dependency/source directory. [Final verification](../specs/001-read-mp-hansard/evidence/final-verification.md)
binds these results to the actual working-tree inputs. These are engine/unit results,
not verification on each named stable browser or physical device. Actual stable-device/browser, Firefox on this host, human usability, full
performance and publication acceptance remain separate gates. This dated guide must
be read with the linked evidence, rather than as a blanket acceptance claim.

## Prerequisites and installation

- Git, Node.js 24 LTS and npm. Use the version in [`.nvmrc`](../.nvmrc); a Node version
  manager is optional. Dependency versions are pinned in
  [`package.json`](../package.json) and [`package-lock.json`](../package-lock.json).
- Ruby with its standard YAML and JSON libraries: the workflow-configuration unit
  tests invoke Ruby directly, so Node/npm installation alone is insufficient. This
  host passed the parser probe with Ruby 2.6.10p210; no Ruby major is pinned.
- For Spec Kit work, follow the [README installation instructions](../README.md#installation).
- Browser tests need the Playwright Chromium, Firefox and WebKit binaries. Install
  them after dependencies:

```sh
node --version
npm --version
ruby --version
ruby -ryaml -rjson -e 'puts JSON.generate(YAML.safe_load("scope: setup\n", aliases: false))'
npm ci
npx playwright install chromium firefox webkit
```

jsdom is a pinned development-only dependency for unit assertions about DOM text,
controls, focus and announcements. Its harness passes; it supplies no layout or
actual-browser evidence. `fake-indexeddb` is also a pinned development-only dependency
for unit transaction/rollback assertions; native IndexedDB persistence is checked
separately in actual browser engines. Layout and physical-target behavior remain
independent checks.

This setup run installed all three engines with
`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers` rather than the default
browser cache. Set that same variable for tests using those installed binaries;
the default-cache installation command above was not tested here.

Setup checks used Node.js 24.21.0 and npm 11.17.0. Select Node.js 24 before installation
and check `node --version` and `npm --version`.
If using nvm, `nvm install` and `nvm use` select `.nvmrc`. Do not substitute a different
Node major and present the result as Node 24 verification.

## Configuration and commands

The Vite base is `/vote-better-malaysia/`. Open that subpath on the development or
production-preview server; a root-origin check cannot establish repository-subpath
behavior. No private source credential or `.env` configuration is required for local reading
or official-source acquisition. Acquisition uses the approved official public source
at build time; the deployed reader retrieves data only from its own static site.

| Command | Purpose | Current status |
|---|---|---|
| `npm ci` | Install the committed lockfile | Passed with Node 24.21.0/npm 11.17.0. |
| `npm run dev -- --host 127.0.0.1` | Serve the development reader | Independent source-directory server on owned port 5177 returned the repository-subpath reader shell; the server was closed after the check. Production journeys are checked separately. |
| `npm run typecheck` | Check TypeScript without emitting files | Passed. |
| `npm test -- --run` | Run all unit tests | Final unrestricted suite passed 2,021/2,021 with Node 24 and the installed browser-cache variable, including CI input/provenance, publication and workflow checks. The independent source directory passed the same suite. See final verification for exact commands and hashes. |
| `npm run build` | Build the static reader into `dist/` | Final build/typecheck passed after the help correction, with all 4,090 source shards, manifest/icons and generated versioned worker. The output was frozen outside `dist/` for checks. A local build is not physical-device or Pages-address acceptance. |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Serve `dist/` after a build | Started by the browser harness; production-shell checks passed in Chromium/WebKit. |
| `npm run test:browser` | Build and test the production reader at the repository subpath | All authored online/recovery and saved-reader/install/update mechanisms passed 108/108 Chromium/WebKit cases on 2026-10-10. Firefox exits before assertions on this Mac; the approved local deferral does not establish Firefox acceptance. The unrestricted command is not a full-browser GREEN claim. |
| `npm run test:browser -- tests/browser/harness.spec.ts tests/browser/reading.spec.ts tests/browser/failures.spec.ts --project=chromium --project=webkit` | Rebuild and test implemented online/recovery paths | 60/60 controlled Chromium/WebKit cases passed after the focus fixes. See browser evidence for exact revision and command. |
| `npm run test:performance -- --artifact <directory> --candidate <candidate.json> --report <report.json>` | Measure every deployed file and enforce candidate-bound size/timing/device reports | Checker positive/negative fixtures pass. Complete local frozen-output size diagnostics cover all 4,090 shards and pass every byte limit; trusted candidate provenance, laboratory timings and actual-device reports remain pending. Missing inputs fail closed. |
| `npm run performance:collect -- --artifact <directory> --candidate <candidate.json> --fixtures <fixtures.json> --url <https-base> --output <lab.json>` | Collect the defined native Chromium laboratory profile runs | Collector unit/native plumbing checks pass; actual complete reader measurements require the defined Ubuntu runner, frozen candidate and saved-reader readiness. Missing inputs and this Mac's runner fail closed. See collector evidence for exact CLI metadata. |
| `npm run check:docs -- --candidate <candidate.json> --report <review.json>` | Check callable documentation, bilingual deliverables and exact candidate-bound accuracy review | Documentation fixtures pass 48/48 and the global callable scan finds none missing. Current guidance was locally reviewed; trusted candidate-bound accuracy approval and actual deployment-command verification remain pending. Missing reports fail the gate. |
| `npm run data:acquire -- --mode bootstrap --state .cache/hansard --out public/data` | Reconcile and stage the full official-source inventory | Full recorded run captured all 4,090 records, then safely failed the original cap. After approval of 1 MiB and new RED/GREEN tests, receipt-based local revalidation/staging passed: catalogue 519,418 gzip bytes; complete data 357,744,140 stored bytes. Original source times are preserved; no publication. See source evidence. |
| `npm run data:acquire -- --mode refresh --state .cache/hansard --out public/data` | Refresh validated state with retention and resumable bounded work | Incremental priority/checkpoint/partial-report and rollback regressions pass. Controlled tests do not prove an active schedule or source-publication latency. |

The full local source check and accepted re-staging are linked in
[source evidence](../specs/001-read-mp-hansard/evidence/source.md). Controlled acquisition
and checker fixtures do not establish an active workflow, publication or physical-device
performance. A smoke harness proves tooling only.

An earlier foundation regression command was verified with a successful type check;
see the dated evidence for counts and tested fingerprints:

```sh
npm test -- --run tests/unit/source-schema.test.ts tests/unit/source-items.test.ts tests/unit/documentation.test.ts tests/unit/harness.test.ts
npm run typecheck
```

Recorded initial assertion failures and subsequent passes are linked from
[TDD evidence](../specs/001-read-mp-hansard/evidence/tdd.md). These unit results do
not by themselves establish complete source acquisition or browser/device acceptance.

Playwright automation does not establish actual Android Chrome, iPhone Safari or
stable desktop browser acceptance. Firefox reported `Could not find profile folder`
before executing its test, including a retry with `TMPDIR=/private/tmp`; the full
browser command remains a failed check. The verified Chromium setup command was:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npm run test:browser -- --project=chromium
```

Frozen browser checks may set `HANSARD_FROZEN_SITE` to the original production
directory; the preview uses that quoted path without building or changing its bytes.
Ordinary local browser checks still build before preview.

The future performance command needs the complete snapshot, fixed fixtures, exact
runner/hardware and candidate-bound reports defined in
[the plan](../specs/001-read-mp-hansard/plan.md#performance-budgets).

The `--state` and `--out` acquisition paths resolve from the checkout root. `.cache/`
holds private checkpoints/raw receipts; `public/data/` is generated static output.
Both, `node_modules/`, `dist/`, coverage and browser reports are ignored by Git.
Source fixtures and reviewed feature evidence remain trackable. Acquisition command
semantics, source limits and prior-output preservation are defined by the
[acquisition contract](../specs/001-read-mp-hansard/contracts/acquisition.md).

## Saved-reader mechanics and local checks

The default website connects origin/repository-scoped IndexedDB and a repository-scoped
worker. It saves only explicitly opened complete pairs (selected turns plus all gap and
annotation passages), alongside catalogue/preferences, in atomic transactions. A request's
success is not a commit acknowledgement. Data requests bypass worker caching; the worker
caches only required compatible shell resources.

On online reopening or Retry, a compatible committed pair stays visible with its own
snapshot/source metadata and old successful device time while new site data is checked.
Validation advances the online check time; only a successful save advances the offline
copy's time. Failed validation keeps the old result; a failed save leaves the new online
result explicitly unsaved and identifies the older saved copy separately when available.
Transcript-save and complete offline-reader readiness notices remain independent.
Missing, evicted, incompatible or inaccessible storage cannot establish offline access.

An offered application update waits for Apply. The client commits current language and
valid selections before requesting its actual waiting worker, and only that consenting
tab reloads after matching activation evidence. Continue retains the current reading;
other tabs retain their original application stamp. Activation never deletes saved data
or silently upgrades its schema. Reuse validates each saved pair's own accepted metadata.

The authored native PWA journeys live in `tests/browser/install.spec.ts`,
`tests/browser/offline.spec.ts`, `tests/browser/storage.spec.ts` and
`tests/browser/updates.spec.ts`. Run their actual names after a production build through
the same Playwright command; the test harness builds by default. Use a fresh isolated
origin/context for native worker/cache/storage checks. Exact executed commands, counts
and byte fingerprints belong in [browser evidence](../specs/001-read-mp-hansard/evidence/browser.md)
and [TDD evidence](../specs/001-read-mp-hansard/evidence/tdd.md), rather than this setup
recipe. The native Chromium/WebKit run passed 108/108 on 2026-10-10. The local
Firefox prelaunch failure and actual stable-device/human/publication checks remain
outstanding. No command here installs the website on a
physical device or verifies a live GitHub Pages deployment.

## Merge checks and immutable CI inputs

On 2026-10-10 the actual workflow passed **31/31** configuration cases, with
**201/201** CI input/runtime and **207/207** publication regressions. The final
unrestricted suite passed **2,021/2,021**, and build/typecheck passed. Static review
also checked all **39/39** workflow shell bodies. These controlled/native local
results do not establish a hosted dispatch, remote enforcement or device acceptance.
See [CI guidance evidence](../specs/001-read-mp-hansard/evidence/tdd-ci-guidance.md)
for the command/layout review and current limitations.

The reviewed [CI workflow](../.github/workflows/ci.yml) runs type/unit and frozen
production browser checks on every PR. The unit job installs Chromium for its native
boundary tests. On 2026-10-10 the user approved a public preview stage: PRs carrying
the explicit `release-acceptance` label additionally authenticate immutable full-release
inputs. Adding or removing that label retriggers CI. Preview checks do not claim
physical-device or full-release acceptance.

A manual dispatch on `main` prepares a merge-only candidate for one open PR.
Release PR runs authenticate that candidate, its laboratory archive and separately reviewed full
reports before running the seven named merge checks. Preparation success does not
establish physical-device acceptance or satisfy the PR's required checks.
The current verifier requires a PR head in this same repository and requires the
current main base to be an ancestor of that head. Fork-origin PRs or unsynchronized
heads fail authentication; synchronize the repository-owned branch before preparation.
[GitHub describes which workflow events can satisfy required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks#checks-from-some-workflow-jobs-are-not-evaluated).

Once the reviewed workflow/helper is available on `main`, set `PR_NUMBER` to the
actual open PR number and `SOURCE_RUN_ID` to a successful reviewed-main
`pages.yml` run retaining an unexpired, complete, compatible `hansard-state`
archive. Run this from the intended repository checkout with an authenticated
GitHub CLI:

```sh
gh workflow run ci.yml --ref main \
  -f pull_request_number="$PR_NUMBER" \
  -f source_run_id="$SOURCE_RUN_ID"
```

| Dispatch input | Required value |
|---|---|
| `pull_request_number` | Positive integer identifying an open PR against this repository's `main`. The workflow resolves its current head repository/SHA and base SHA through GitHub. |
| `source_run_id` | Positive integer identifying the independently authenticated successful reviewed-main Pages source producer. Its exact `hansard-state` artifact ID, attempt and archive digest are resolved and checked. |

A private local checkpoint, partial source archive or CI-produced state cannot
replace this source input. Missing, expired, malformed, incomplete or incompatible
state fails preparation; repair or prepare genuine main source state rather than
omitting records. Preparation validates the complete catalogue and every retained
shard, builds once, runs type/unit and native Chromium/Firefox/WebKit mechanisms,
then freezes the exact production directory. It retains:

| Artifact | Contents and applicability |
|---|---|
| `hansard-ci-candidate` | Complete `site/` plus external `candidate.json`, `fixtures.json`, original source/automated receipts and `origin.json`. Seven-day retention; merge evidence only. |
| `hansard-ci-lab` | Authentic `lab.json` raw measurements plus `origin.json` binding the actual immutable candidate upload ID/digest and producer context. Seven-day retention. |
| `hansard-evidence` | The four reviewed full reports uploaded by the separate reviewed-main Pages `evidence` operation. Seven-day retention. |

The laboratory runs on the plan's public-repository `ubuntu-24.04` x64 allocation:
four vCPUs and nominal 16 GiB memory, independently verified by the collector.
Actual CPU/image/OS/Node/browser/tool versions and served bytes remain recorded.
Measurements use one browser process with serial profiles and a noncanceling
repository laboratory concurrency group. The original frozen `site/` is served
at the repository subpath without rebuilding. A Mac or substituted runner cannot
provide this laboratory acceptance.

Test the same frozen candidate at the administrator-reviewed HTTPS test origin
configured through `HANSARD_TEST_ORIGIN`. The downloaded payload cannot select
another origin. Produce all six actual-target reports on the named hardware:

| Actual hardware | Independent stable browser targets |
|---|---|
| Google Pixel 6a | Android Chrome |
| Apple iPhone 13 | iPhone Safari |
| Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop | Desktop Chrome, Edge and Firefox |
| MacBook Air M1, 8 GiB RAM, supported stable macOS | Desktop Safari |

Each target needs its own 30 online attempts across at least five differently
sized sittings, with at least 29 complete results within five seconds, and all ten
closed-reader offline attempts within two seconds, including largest/gap-bearing
saved results. Keep failed attempts in the denominator. Record exact stable
versions and the plan's network/operating conditions; emulation or a faster device
cannot substitute. Assemble the full performance report from the authenticated
laboratory output, independently measured frozen sizes and those actual reports.
Preserve the original raw laboratory observations; do not fill missing targets
with controlled tests. Mobile and desktop field-data limits remain separate.

Have the full performance, documentation, automated/RED and source reviews
reviewed into `main` at these fixed paths:

```text
specs/001-read-mp-hansard/evidence/publication-reports/performance.json
specs/001-read-mp-hansard/evidence/publication-reports/documentation.json
specs/001-read-mp-hansard/evidence/publication-reports/automated.json
specs/001-read-mp-hansard/evidence/publication-reports/source.json
```

The shared full-report contract for CI and main publication requires explicit
TDD review fields in `automated.json`, alongside its existing exact
`candidate` and fresh `reviewedAt`:

| Field | Required reviewed value |
|---|---|
| `tddReviewed` | `true`, supplied only after reviewing behavioral RED, subsequent GREEN and refactor/no-refactor evidence. |
| `tddReviewer` | Nonblank named reviewer. |
| `tddEvidence` | Exact path-to-lowercase-SHA-256 map for every current regular `tdd*.md` narrative directly in `specs/001-read-mp-hansard/evidence/`, including `tdd.md`. Use checkout-relative paths as keys and 64-character digests of exact current bytes. |

The narratives retain their raw-report hashes. Missing, extra, omitted or stale
map entries cannot approve later edits; renew the review after narrative changes.
The candidate's machine `automated.json` retains native command receipts and
does not claim human TDD approval. A reviewed-main report with matching fields
records supplied approval; it does not prove a person performed the review or
establish T074 administrator settings and remote merge blocking.

Upload them through the existing evidence operation:

```sh
gh workflow run pages.yml --ref main -f operation=evidence
```

This operation uploads reviewed files without acquisition, build, promotion or
deployment. It may review a merge-only CI candidate while retaining that
candidate's original tested SHA and the later main evidence-producer SHA. It
grants no publication eligibility to the candidate.

Review a locator into the PR at the fixed path
`specs/001-read-mp-hansard/evidence/ci-inputs.json`. Populate it from the actual
completed producing runs and immutable archive metadata; no sample identifiers
or invented digests are supplied here:

| Locator field | Exact meaning |
|---|---|
| `schemaVersion` | `1`. |
| `repository` | Expected base repository `OWNER/REPO`. |
| `testedRevision` | Original 40-character PR-head SHA tested by the frozen candidate. Preserve it after a later evidence-only commit. |
| `pullRequest.number` | Original PR number. |
| `pullRequest.headRepository` / `baseRepository` | Original exact head/base repository names. |
| `pullRequest.baseRevision` | Original 40-character base SHA bound to that PR context. |
| `candidate` | Selection of the exact `hansard-ci-candidate` archive. |
| `laboratory` | Selection of the exact `hansard-ci-lab` archive. |
| `evidence` | Selection of the exact main Pages `hansard-evidence` archive. |
| Each selection's `runId` / `artifactId` | Positive decimal strings for the actual immutable producing run/archive. |
| Each selection's `runAttempt` | Actual positive integer producing attempt. |
| Each selection's `archiveDigest` | Actual lowercase 64-character SHA-256 archive digest, without the API's `sha256:` prefix. |

Run IDs alone do not establish trust. The helper rechecks GitHub repository,
workflow, PR, producer, attempt, completion, artifact role/digest and expiry,
then remeasures every frozen file and compares exact candidate/application/
snapshot/fixture/conditions/prior-baseline bindings. The workflow downloads exact
artifact IDs and rejects digest mismatches. Metadata and reports stay outside
`site/`; CI does not emit trusted accepted/served publication state.

Keep three revisions distinct: the original tested PR head
(`candidate.sourceRevision`/`testedRevision`), the actual checked-out head
(`checkedOutRevision`), and the workflow's producing revision. A PR event's
`GITHUB_SHA` identifies its merge commit even when checkout explicitly selects
the head; it must not relabel the bytes actually tested.
[GitHub's event reference explains the distinction](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

A locator/report-only commit may reuse the candidate only when application
inputs and every deployed byte are unchanged, the original tested head remains
in the PR history, the current main base is included in the checked-out head,
the bindings still match and evidence is unexpired. Changed
README/developer/user-guide text needs a renewed current-file documentation
review. Public help, worker, manifest/icons, source, workflow/checker/tool/lock
changes require a new candidate and matching reports. A new SHA alone neither
invalidates unchanged reviewed evidence nor proves changed bytes acceptable.

The workflow invokes `node scripts/ci-inputs.ts prepare` in the actual manual
producer context and `node scripts/ci-inputs.ts verify` in the actual PR
context. These are workflow-owned entry points, not local trust overrides.
Missing locator/full source/report/target, failed producer, wrong identity,
changed bytes or expired evidence rejects the checks. Every PR update retriggers
checks, including documentation-only updates.

| Named required check | Responsibility |
|---|---|
| `Hansard type and unit` | Locked install, TypeScript and all unit suites. |
| `Hansard production and browser` | Authenticated original build/check receipts and native Chromium/Firefox/WebKit journeys on the frozen directory without rebuilding. |
| `Hansard RED and source review` | Authentic complete-source accounting and reviewed RED/GREEN/refactor/source evidence. |
| `Hansard size budgets` | Remeasure every deployed file and enforce the complete performance report. |
| `Hansard laboratory budgets` | Reconcile authentic raw laboratory measurements with the full report and enforce it. |
| `Hansard actual targets` | Require all six matching actual-target reports and enforce the full report. |
| `Hansard documentation` | Check callable comments, bilingual deliverables and current-file candidate-bound accuracy review. |

The three budget jobs intentionally invoke the strict full-report checker:
missing physical evidence fails them rather than yielding a partial acceptance.
Dependent required jobs run after upstream failure and explicitly reject failed
inputs, since a skipped job can otherwise appear successful.
[GitHub documents these required-check cases](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks#handling-skipped-but-required-checks).

For full release acceptance, repository administrators must require these seven checks, the required evidence
reviews and an up-to-date branch, then demonstrate remote failed/missing/budget/
wrong-artifact cases block merge. Manual preparation is not that demonstration.
Local YAML/helper positives and negatives prove controlled mechanisms only.
Actual Ubuntu measurements, six stable-target reports, administrator settings,
remote enforcement and live publication remain pending until dated evidence
records them. Main publication independently rejects CI candidates, including
after merge; it requires its own trusted main preparation/promotion path.

## Public preview deployment

The user approved an explicitly labeled public preview on 2026-10-10. Its
[workflow](../.github/workflows/pages-preview.yml) is manual and restricted to `main`.
It uses Node 24 and the lockfile, installs all three browser engines, runs all
unit/type checks, acquires the complete official source, builds, validates source
accounting and the existing shell/JS/icon/catalogue/shard/whole-artifact byte limits,
and runs the authored browser journeys on the exact built directory. Only successful
checks permit uploading `dist/` and deploying it. Private acquisition state stays
outside that directory; a failed build/acquisition/check leaves the prior site served.

Pages is configured to use **GitHub Actions**. The
[2026-10-10 preview deployment](../specs/001-read-mp-hansard/evidence/deployment.md)
passed hosted checks and live Chromium/WebKit reading/offline checks. Its captured
inventory contains 4,089 sittings through October 7 and lacks the independently
observed October 8 sitting; it is not freshest full-release source acceptance.
To manually refresh the preview from the reviewed `main` revision, invoke:

```sh
gh workflow run pages-preview.yml --ref main
```

Inspect the completed run at [Actions](https://github.com/eaglecheow/vote-better-malaysia/actions/workflows/pages-preview.yml)
and its `github-pages` deployment URL. Verify direct open/reload, both-locale source
reading, manifest/icons and the worker scope at
`https://eaglecheow.github.io/vote-better-malaysia/` before reporting the preview live.
Repeat the manual workflow to refresh the preview data. Each run bootstraps a fresh
complete source snapshot and can take hours; it does not deploy on merge or promise
the full release's 24-hour freshness target. Existing acquisition errors stop the
run instead of replacing missing records with a smaller archive.

For the preview stage, require **Hansard type and unit** and **Hansard preview build
and browser** on ordinary PRs. Apply `release-acceptance` when evaluating the original
full-release checklist and populate its genuine immutable reports as described above.
Missing release evidence remains a failure; do not populate `ci-inputs.json` with
placeholder IDs or invent physical-device/laboratory/human review results.

The notice labels the site in BM and English. Physical stable-device, laboratory,
field performance and human accessibility/usability acceptance remain unverified.
The source's internal API and reuse-policy applicability remain disclosed limits;
preview approval establishes no external licence. Preview deployment is separate
from the original candidate promotion/confirmed-receipt process and cannot serve
as proof of full-release acceptance. Hosted workflow and live-address results must
be recorded after they actually run.

## Evidence and delivery

Create reports under `specs/001-read-mp-hansard/evidence/` only when checks actually
run. Record the exact command, tested revision or working-tree fingerprint, conditions,
observed result and remaining limitations. Record behavioral RED before production
implementation, then GREEN/regression results and necessary refactoring or an explicit
no-refactor decision in `tdd.md`. Import, syntax, fixture and harness failures are not RED.
Every introduced or changed function/method, including tests and callbacks, needs
accurate JSDoc/TSDoc describing purpose, parameters, returns and relevant effects/errors.

Setup records belong in `documentation.md`; source checks in `source.md`; browser,
performance, CI and deployment checks have their own reports named in the task list.
The [`constitution`](../.specify/memory/constitution.md) governs the required gates.
The bilingual [user guide](user-guide.md) and deployed-relative reading help explain
selection/reading, saved-pair readiness, installation/update choices and source/publication limits.

Local checks do not publish. Pages must use Actions and the reviewed publication
workflow must pass its gates before delivery. Actual Pages-address, physical-device,
human usability and remote required-check evidence remain unverified. Laboratory
checks cannot establish separate mobile and desktop real-user Core Web Vitals targets.

## Preparation, report collection and deliberate publication

The reviewed workflow contract configures `17 */4 * * *` UTC: preparation every four
hours at minute 17, plus manual dispatch. Configuration does not activate a schedule
until the reviewed workflow is present on the default branch. No active schedule or
GitHub deployment is claimed by this local work. The best-effort 24-hour source target
can be delayed by source throttling, missed/incomplete runs or the wait for fresh
physical-device evidence. See [workflow history](https://github.com/eaglecheow/vote-better-malaysia/actions/workflows/pages.yml),
[acquisition/publication rules](../specs/001-read-mp-hansard/contracts/acquisition.md)
and [operational evidence](../specs/001-read-mp-hansard/evidence/source-refresh.md).

A preparation run acquires/reconciles data, builds/checks once and freezes its candidate.
Keep the candidate metadata, fixture manifest, reports and receipts outside the deployed
artifact. Record the candidate and Pages-candidate run/artifact IDs, exact artifact digest,
application fingerprint, source revision, snapshot, fixture hashes, condition digest and
prior served-baseline digest. Missing acceptance evidence ends as `awaiting-evidence`,
releases the workflow lock and preserves the served site; it is not a deployment success.

The approved catalogue limit is **1 MiB gzip (1,048,576 bytes)**. Each sitting remains
≤512 KiB gzip, either decoded resource ≤5 MiB and the complete deployed artifact
≤900,000,000 stored bytes including all shell/data/retained files. Do not drop records or
source passages to fit a limit. The recorded complete archive search found no eligible
zero-gap record for real verified absence. That sample is conditional on eligible complete
source; retain the dated search/result when none exists. Controlled absence tests and the
conservative classification still apply. See [source policy](../specs/001-read-mp-hansard/evidence/source-policy.md).

Collect measurements and reviews against the **same frozen candidate** at its trusted
HTTPS repository subpath. Actual Android/iPhone/stable desktop hardware acceptance is
still missing; Playwright, fixture reports and lab results cannot fill those reports.
Even unchanged transcript wording with new acquisition/provenance bytes changes the
artifact and needs fresh candidate-matched evidence. Reports produced by a later reviewed
main revision must retain the older candidate's tested revision and identifiers.

Have all four measured/reviewed report files reviewed into `main` at these fixed paths:

```text
specs/001-read-mp-hansard/evidence/publication-reports/performance.json
specs/001-read-mp-hansard/evidence/publication-reports/documentation.json
specs/001-read-mp-hansard/evidence/publication-reports/automated.json
specs/001-read-mp-hansard/evidence/publication-reports/source.json
```

They are maintainer inputs, not public assets: keep them outside `public/` and `dist/`.
All four must exist. The manual `evidence` operation uploads them as the trusted
`hansard-evidence` artifact. It performs no acquisition, build or deployment.
Main-publication `automated.json` uses the same
[explicit TDD review fields](#merge-checks-and-immutable-ci-inputs) as CI evidence.
Uploading files is not acceptance: later promotion authenticates the producing run/artifact through
GitHub, verifies candidate equality, report success/required targets and seven-day freshness,
and rejects changed application inputs or a superseded served baseline.

Once the reviewed workflow is available on `main`, the proposed manual commands are:

```sh
gh workflow run pages.yml --ref main -f operation=prepare
gh workflow run pages.yml --ref main -f operation=evidence
gh workflow run pages.yml --ref main -f operation=promote -f candidate_run_id="$CANDIDATE_RUN_ID" -f evidence_run_id="$EVIDENCE_RUN_ID"
gh workflow run pages.yml --ref main -f operation=prepare -f resume_run_id="$PARTIAL_RUN_ID"
```

These dispatches have not been executed here. The flags were checked with local
`gh workflow run --help`; operation names must match the reviewed workflow. Set `CANDIDATE_RUN_ID` and
`EVIDENCE_RUN_ID` to the actual trusted completed producing runs, or `PARTIAL_RUN_ID`
to the actual interrupted preparation to resume. The workflow resolves exact named
artifact IDs and the controller independently authenticates them; run IDs alone do
not establish trust. Keep the resolved candidate/Pages-candidate/evidence artifact IDs
with the measured candidate and reports.
Promotion rechecks them immediately before deployment and uses the stored tested bytes:
no acquisition or rebuild. Expired or changed candidates need fresh preparation/evidence.
Keep reports/candidates for seven days; never treat PR-produced state as trusted main state.

Every started operation records its actual acquisition/staging/deployment outcome in
Actions summaries/logs and available private `publication-runs/<run-id>-<attempt>.json`
records. Acquisition `refresh.json` describes attempted/completed/changed/unchanged/
failed/pending/overdue work and bucket completion. Inspect those results and validated
checkpoint/receipt state before recovery; preserve accepted shards and prior output on
failure. Missing/expired state requires validated prior-served recovery or bootstrap;
an unverifiable prior served baseline blocks publication. Never erase accepted state
just to bypass a failed gate. Local-development checkpoints are not publication inputs.

Preparation time, accepted source acquisition time and GitHub-confirmed publication/live
verification times have different meanings. A successful deployment followed by failed
live verification leaves the **current site unconfirmed**. A retained older confirmed
receipt is historical evidence, not proof that the live site still serves that artifact.
Do not change the frozen bytes to add a predicted publication time. A static snapshot
shows only status known when prepared; it cannot reveal later failed/missing runs or
later evidence waits. Inspect the actual workflow run history for those outcomes.

The source interface may change. Follow observed access restrictions; the applicability
of Hansard reuse policy remains unverified, and source-policy approval does not establish
a reuse licence. No remote credentials or proxy are added to the public reader.
