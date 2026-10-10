# Quickstart validation: MP Hansard Reader MVP

**Date**: 2026-10-10 | **Branch**: `001-read-mp-hansard`

This is a Phase 1 validation guide. The repository currently has no application,
`package.json`, lockfile, acquisition script, or CI workflow. Commands below are the
**proposed implementation command contract**, not commands verified or run during
planning. Implementation must provide and verify them before claiming delivery.

Use [plan.md](plan.md) for architecture/budgets, [data-model.md](data-model.md) for
entities and timestamps, and the [static-data](contracts/static-data.md),
[reader](contracts/reader.md), and [acquisition](contracts/acquisition.md) contracts
for exact interface and result rules. Do not create application behavior by following
this guide before its corresponding RED gate passes.

## Prerequisites and setup

- Node.js 24 LTS and npm; compatible TypeScript/Vite/Vitest/Playwright versions and a
  committed lockfile supplied by implementation. Run commands from the checkout root.
- Network access to the approved official portal for acquisition. No private source
  credential, live Parliament browser fetch, application backend, or proxy is required.
- A configured Pages repository base `/vote-better-malaysia/`, gzip static-data output,
  and the manifest/service-worker scope defined in the contracts. An Actions deployment
  uses repository workflow permissions; these are not credentials in public files.
- Source-verified, hashed fixtures and actual acceptance devices. The sampled 4,090
  sittings are dated research evidence; reconcile the inventory again for launch.

After implementation supplies the tooling:

```sh
npm ci
npm run typecheck
npm test -- --run
npm run dev -- --host 127.0.0.1
```

Expected: dependency installation is reproducible, checks pass, and the development
URL opens the reader with Bahasa Melayu controls by default. Development-server
success does not establish production service-worker or Pages behavior.

Acquire data using the contract below, then run the production checks:

```sh
npm run data:acquire -- --mode bootstrap --state .cache/hansard --out public/data
npm run build
npm run test:browser
npm run test:performance
```

`--state` is the checkpoint directory; `--out` is the staged static-data output copied
into the build. Both paths resolve from the checkout root. `bootstrap` reconciles the
full source inventory; `refresh` restores validated state and performs the scheduled
refresh work. Missing state requires bootstrap rather than an invented empty archive:

```sh
npm run data:acquire -- --mode refresh --state .cache/hansard --out public/data
```

The browser command must serve the production build under the repository subpath and
record its URL; the performance command must use the conditions below. There is no
proposed CLI flag for injecting fixture source responses: acquisition tests control
that boundary through their test harness. No command here pushes or publishes a site.
CI browser/mechanism checks use controlled, source-verified fixtures; full-snapshot
release checks use the reconciled acquired output. Keep generated `public/data/`,
`.cache/` and `dist/` outside source commits through the planned ignore rules.

## RED → GREEN → REFACTOR evidence

For each behavior, first write and run meaningful unit assertions, including invalid
inputs where relevant. Confirm an assertion fails because the behavior is missing or
wrong before adding production behavior. This also applies to normalization, exact-ID
attribution, gzip/hash validation, acquisition/checkpoints, base-path URL generation,
storage replacement and worker lifecycle. Harness/import/syntax/fixture/dependency
errors and already-passing assertions do not count as RED. Bug fixes start with a
failing regression assertion.

Record evidence when tests run in `evidence/tdd.md`: requirement/test identifiers,
command, revision or working-tree fingerprint, expected failure, observed initial
behavioral assertion failure, subsequent GREEN/regression results, and necessary
refactoring or an explicit no-refactor decision. Test setup must not introduce the
covered feature before RED. Link durable source, browser, usability, performance and
documentation reports from `evidence/`; do not substitute retrospective tests for TDD.

## Source acquisition and publication checks

1. Bootstrap and reconcile every dated Dewan Rakyat entry across all represented
   Parliaments. Each sitting is selectable and accounted for as validated content or
   explicitly unavailable; missing records do not imply no participation. Verify
   historical source identities without inventing constituency/term context. Include
   source Mesyuarat 0 (for example 2014-07-23 or 2025-05-05); preserve 0 rather than
   rejecting it, treating it as missing or inventing a different meeting.
2. Count/traverse every supplied item, preserve text/paragraphs and section/source
   order, and keep annotations distinct. Compare at least ten member/sitting pairs
   across five sittings against official JSON and Hansard: multiple turns,
   interruptions, draft where available, and the missing-ID question at `index:2` on
   2026-02-10. It must remain accessible as unassigned content, excluded from Lim Guan
   Eng's confirmed subset, with a visible gap notice. Do not infer identity from its
   embedded name or infer another speaker's words from a quotation.
3. Include a genuinely verified no-contributions case: a fully validated sitting
   without unresolved nonannotation items and with no assigned turn for that member.
   Find and document that case; none was established by planning. An empty subset
   from an incomplete sitting must produce the incomplete-match state instead.
4. Exercise deployment-ID rediscovery and schema changes, a new sitting and a changed
   historical record through controlled source fixtures. Separately report real-source
   observations. Verify exact-ID/conflict validation, raw/normalized hashes,
   deterministic gzip decoding and preservation of previous valid content on failure.
   Exercise both post-Fetch gzip and transport-decoded JSON representations; validate
   identical decoded hashes, sizes and identities without double inflation.
5. Exercise unavailable/new records, malformed catalogues, 429/`Retry-After`, access
   denial, timeouts, retries, missed schedules, overdue work and expired checkpoints.
   Follow acquisition limits; do not obtain a passing check by increasing source load
   or retrying access denial. Source/schema failures must not publish empty error
   output over valid records. Interrupted work resumes from a validated checkpoint.
   With missing/expired state, restore and validate the prior served retention baseline
   before replacement; failure to recover it must block publication, not erase prior
   inventory entries or replace accepted records with unavailable content.
6. Measure the full staged artifact and every shard against all size budgets before
   deployment. A failure blocks release without truncation or narrower coverage.
   The pipeline validates a complete staged snapshot before publishing it; failed
   validation/deployment leaves the prior published site available.

Verify the default-branch schedule `17 */4 * * *` UTC and manual dispatch: inventory
and members each run, latest 30/new/missing/failed sittings, six historical buckets,
and overdue catch-up. Check the four-hour job cap and seven-day checkpoint retention.
Target a complete historical recheck within 24 hours; log actual delays and coverage.
The scheduler/source provide best effort, not a guaranteed interval.

For actual publication, configure repository Settings → Pages → Source: GitHub Actions,
then run the implemented deployment workflow only after its required checks pass.
Record the workflow run, Pages URL and deployed revision; open and refresh that URL,
not just the local server. Implementation must document and verify its exact workflow
invocation in developer guidance; no deployment workflow exists at planning time.

Record observation and `acquiredAt` separately from `preparedAt`, post-deployment
receipt `publishedAt`, and device `refreshedAt`. Verify the receipt and fetch the
deployed snapshot ID before recording successful publication. Missing official change
timestamps remain missing; observation-based latency is not official publication
latency. A failed deployment is visible in workflow logs, while the old static site
can show overdue data from age and only failures recorded in its published snapshot.
It cannot claim to know a later failed run. An online device refresh reads the latest
published static copy and does not establish a new Parliament-source retrieval.
The workflow records started-run outcomes in Actions run summaries/logs and available
receipt artifacts; repository maintainers review failures/overdue work and perform manual
recovery. Developer guidance documents baseline restoration and these report locations;
bilingual user guidance links the workflow run listing and explains unpublished events.

Document the internal interface/deployment-ID dependence and unverified Hansard reuse
policy. No transcript-specific permission or prohibition was established by research;
do not claim a verified licence. Respect restrictions actually discovered before
publication, without reinstating the user's superseded source-choice blocker.

## Reader, offline and update acceptance

Run production-build checks, then repeat the journeys at the actual Pages address:

| Journey | Required observable outcome |
|---|---|
| Choose member/sitting | Both valid selections required; missing selection identified; dated Parliament/Penggal/Mesyuarat context shown. |
| Read/change selections | Matching ordered original text and provenance; loading feedback; late previous results never replace the current pair. |
| Result states/retry | Confirmed absence, unavailable record, attribution gap, retrieval failure and unsaved offline pair are distinct; retry preserves selections. |
| Gaps/source details | Unassigned passages remain reachable in source order with annotations identified; original source/status, unavailable metadata and relevant timestamps are honest. |
| Locale/accessibility | First visit uses BM; switch BM/English preserves selections and transcript bytes; labels, focus and loading/result/error announcements work with keyboard and assistive technology. |
| Offline reopen | Verify catalogue/result commits and shell-cache readiness before offline-ready messaging; failed shell installation must not promise reopening. Close, disconnect and reopen. Saved lists, selected result, gap passages and provenance are readable and marked saved. Unsaved pairs require a connection. |
| Saved refresh/failure | Reconnect and reopen with changed and unchanged data; successful validation advances the online result's refresh time. A committed save advances the saved copy/time; failed retrieval/hash checks preserve previous times. Failed saving keeps the old offline copy/time while newly validated online data remains readable as not saved. |
| Saved transcript versus offline-ready | A committed pair remains transcript-saved if shell caching fails; offline-ready requires catalogue/result commits and confirmed compatible shell readiness. An unsuccessful new-shell attempt preserves a previously confirmed compatible saved reader and transcripts. |
| Storage loss/write failure | Clear storage or exercise actual storage failure; online reading still works, missing content is not promised offline, and no false absence is shown. |
| Worker/install/update | Verify initial installation/activation and waiting version B while reading version A. Continue keeps reading; Apply preserves selections and compatible data. No forced reload of another reading tab; incompatible data is explicitly unavailable. |
| Repository subpath | Direct open, refresh, native gzip fetch, manifest/icons/scope, installed launch, offline reopen and updates all work at `/vote-better-malaysia/`. |

Verify no horizontal page scrolling at 320 CSS pixels and representative desktop
widths, including long transcript text and bilingual error states. Run assistive
technology checks on suitable actual platforms; automated accessibility checks alone
are insufficient. For SC-001, at least nine of ten first-time users must begin reading
the requested correct pair within 60 seconds without assistance or an account.

Record date, device, OS/browser versions, source snapshot and build revision for each
stable target: Android Chrome; iPhone Safari; desktop Chrome, Edge, Firefox and Safari.
Test installation where supported and ordinary website use everywhere. Playwright
WebKit is not stable Safari, iPhone emulation is not an actual iPhone, and patched
Firefox is not branded stable Firefox acceptance. Use separate actual-device/browser
checks, including native installation and closed-app reopening. One target cannot
stand in for another; missing required acceptance evidence blocks completion.

## Performance and CI verification

Use fixed, hashed fixtures: the complete reconciled catalogue and source-verified
median/p95/largest records, plus draft/revised, interrupted, empty and incomplete
cases. Record gzip settings, actual served bytes, CPU/OS, browser/tool versions,
runner class, revision, fixture hashes, raw runs and pass/fail aggregation. Use fixed
gzip settings for build accounting; catalogue/shard budgets count actual stored gzip
files. Decode and validate complete text/provenance before marking a result ready.

- Mobile lab proxy: Chromium 390×844, 1.6 Mbps down/750 Kbps up, 150 ms RTT, 4× CPU.
- Desktop lab proxy: 1440×900, 10 Mbps down/2 Mbps up, 40 ms RTT, 1× CPU on the same
  recorded fixed runner class. Record actual acceptance hardware separately.
- Use 20 runs per profile with nearest-rank percentiles for laboratory budgets.
  Cold runs clear HTTP cache, workers, Cache Storage and IndexedDB; repeat runs retain
  them after a successful visit. Offline runs prepopulate, close, disable networking
  and reopen. Use User Timing for readiness and processing measurements.

| Budget | Pass rule |
|---|---|
| HTML/JS/CSS/manifest/worker | ≤150 KiB gzip combined, including ≤100 KiB JS; every build. |
| Icons | ≤60 KiB combined delivered bytes; every build. |
| Full deployed artifact | ≤900,000,000 bytes, counting every deployed file. |
| Catalogue / each sitting | ≤200 KiB gzip catalogue; ≤512 KiB gzip per sitting; ≤5 MiB decoded for either resource. |
| Cold shell | Lab p75 LCP ≤2.5 s, CLS ≤0.1, TBT ≤200 ms. |
| Cold full catalogue / repeat reader | p95 ready ≤5 s / ≤1 s. |
| Decompression/validation/filtering | p95 ≤500 ms mobile proxy; ≤200 ms desktop proxy. |
| Selection/language/read interaction | Lab p95 next paint ≤200 ms; not field INP. |
| Online selected reading | ≥29 of 30 attempts per device group ≤5 s across ≥5 sittings; retrieval failures separately reported and never successes. |
| Actual offline reopen | All ten attempts on each acceptance browser ≤2 s, with saved-data state; every unsaved pair requires a connection. |

CI must require type/unit/browser/production-build checks, reviewed RED evidence,
all numeric budgets and applicable recorded actual-browser budget evidence before
merge. Demonstrate that an exceeded limit or missing report fails the required gate;
a workflow file alone does not prove enforcement. Source and actual Pages acceptance
remain required delivery evidence. Check all limits in [plan.md](plan.md).

Report real-user mobile and desktop p75 LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 separately.
Before sufficient field data exists, state these targets are unverified for each group.
Lighthouse/TBT, scripted interaction timings and laboratory passes cannot establish
field compliance. Offline first visits and unsaved pairs have no reading-time budget
because no readable saved record exists; their response interactions remain covered.

## Documentation and delivery gate

Review README links to planned `docs/development.md` and bilingual
`docs/user-guide.md`. Verify prerequisites, configuration and every installation,
run/test/build/acquisition/deployment command against the implemented checkout.
Review user guidance for selections, coverage/identity gaps, source/status, saved-data
limits and freshness, installation, errors/retry and deliberate updates. Check every
introduced/changed function or method, including scripts, worker and test helpers,
for accurate JSDoc/TSDoc purpose, parameters, returns and relevant side effects/errors.

Link the acceptance trace, TDD evidence, browser/source/performance reports, publication
receipt, CI enforcement evidence and documentation review. Missing required evidence
or failed checks prevent implementation completion; unavailable field data is disclosed
without being presented as a laboratory failure or a performance pass.
