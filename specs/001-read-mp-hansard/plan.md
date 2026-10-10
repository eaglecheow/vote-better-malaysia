# Implementation Plan: MP Hansard Reader MVP

**Branch**: `001-read-mp-hansard` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-read-mp-hansard/spec.md`

**Status**: Phase 0 research and Phase 1 design complete. Ready for task generation.
This operation designs the feature; runtime acceptance and deployment remain delivery work.

## Summary

Build a bilingual, accessible static PWA to select a Dewan Rakyat member and dated
sitting, read every reliably source-attributed contribution, inspect unassigned passages
as attribution gaps, and reopen successfully saved results offline.

Acquire the official portal's public JSON before publication. Publish a compressed
catalogue and one compressed file per sitting on GitHub Pages. Fetch the chosen sitting
from the reader's own site, validate it, and filter exact source identities. Scheduled
acquisition targets best-effort refresh within 24 hours, including historical changes.
User approval accepts the internal interface and visible gaps; it does not establish a
data licence, missing identities or official change timestamps.

## Technical Context

**Language/Version**: TypeScript; Node.js 24 LTS for build/acquisition tooling. Pin
compatible compiler, Vite, Vitest and Playwright versions with a lockfile during
implementation. The repository currently has no application package or installed stack.

**Primary Dependencies**: Vite, Vitest and Playwright for build/testing. Native HTML/CSS
and platform APIs; no framework, router, application server, localization library or
PWA plugin.

**Storage**: Cache API for versioned shell assets; IndexedDB for validated catalogue,
selections, language and explicitly opened pair results with provenance and gap passages.
Namespace caches/database by repository base. Native `DecompressionStream('gzip')`
decodes catalogue/sitting files. Ignore generated `public/data/`, `dist/` and acquisition
state in Git.

**Testing**: Mandatory unit RED → GREEN → REFACTOR for every behavior; production-build
browser integration; actual target-device/browser acceptance; source comparison,
accessibility/usability, documentation and repeatable size/performance checks.

**Target Platform**: GitHub Pages under `/vote-better-malaysia/`; stable Android Chrome,
iPhone Safari and desktop Chrome, Edge, Firefox and Safari at acceptance time.

**Project Type**: One static PWA, Node publication tooling and GitHub Actions. No deployed
application backend, proxy, private public-file credential or browser request to Parliament.
Build credentials are limited to repository workflow state/deployment.

**Performance Goals**: Numeric budgets below. Field mobile and desktop p75 LCP ≤2.5 s,
INP ≤200 ms and CLS ≤0.1 remain separately unverified until sufficient real-user evidence
exists; laboratory passes do not establish these results.

**Constraints**: Preserve text/order/paragraphs; distinguish absence, gaps, unavailability
and failures; Bahasa Melayu default with English switch; accessible at 320 CSS pixels;
offline only for saved opened pairs; deliberate compatible updates.

**Scale/Scope**: Catalogue observed 2026-10-10: 4,090 unique sittings across Parliaments
1–15, 1959-09-11–2026-10-08. The 2,017 source speaker identities are not a verified MP
membership count. Full archive size/acquisition are release measurements; hard budgets
prevent extrapolating success from one sample.

## Constitution Check

### Before Phase 0 research

The operation began with a clean tree at `35e21a22edf1d288f9f144ddd0ce663aa54c538a`.
Constitution 1.2.0 was read. Research identified source access, identity, freshness and
hosting questions before production behavior. The user explicitly resolved the source
choice, best-effort target and gap behavior, authorizing the spec amendment and
continuation of this operation's uncommitted plan/research. No unrelated work is included.

| Gate | Pre-research assessment |
|---|---|
| I: scope/assumptions | PASS for research: disclose source questions; resolve material choices before implementation. |
| II: SOLID/DRY/simplicity | PASS: one static reader and focused shared rules with concrete boundaries. |
| III: surgical changes | PASS: only this feature's specification/design artifacts. |
| IV: TDD/browser evidence | PASS for planning: require meaningful RED before every behavior and actual PWA browser evidence. |
| V: accuracy/accessibility | PASS for research: no completeness, identity, timing or permission inference. |
| VI: performance | PASS for planning approach: finalize numeric budgets/CI gates before implementation. |
| VII: documentation | PASS for planning approach: specify developer/user locations and function comments. |
| Lifecycle | PASS: valid hook configuration; disabled `before_plan` skipped; successful `after_plan` commit required. |

SOLID: DOM rendering, source rules, persistence and worker lifecycle have separate
responsibilities (SRP). Fetch/storage use narrow testable boundaries (DIP/ISP), without
a generic repository/plugin framework. No class hierarchy requires an LSP inheritance
design; test substitutes still preserve boundary contracts. No concrete extension requires
an OCP abstraction. One authoritative `src/source.ts` owns schema, ordering, attribution,
result and freshness rules for acquisition/browser use; `src/messages.ts` owns bilingual
messages. Keep build-only request/state handling outside the browser bundle.

### After Phase 1 design

| Gate | Design assessment and delivery obligation |
|---|---|
| I–III | PASS: approved choices recorded; one project/native APIs; only feature documents changed. |
| IV | PASS for design: ordered TDD/evidence contract and actual storage/offline/update checks. Runtime checks have not run. |
| V | PASS for design: exact-ID attribution, all-item accounting, accessible gaps, nullable context/official dates and truthful saved/stale status. Reuse-policy limits disclosed. |
| VI | PASS for design: numeric shell/data/operation budgets, defined conditions and required CI checks. Archive fit and field compliance are unverified delivery gates. |
| VII | PASS for design: developer/user paths, verified-command requirement and JSDoc/TSDoc coverage. Quickstart marks future commands. |
| Static-host/source design | PASS: anonymous endpoints verified, approved build acquisition, bounded gzip layout and failure-preservation contracts. Full bootstrap/actual deployment required before release. |
| Lifecycle | Mandatory `speckit-git-commit after_plan` follows successful artifact validation; no push. |

No constitution exception is requested. Planning readiness does not assert a tested app.

## Acquisition and Publication

The [acquisition contract](contracts/acquisition.md) defines discovery, scheduling,
checkpoints and validation. Schedule reviewed default-branch code at `17 */4 * * *` UTC,
with manual recovery. Check member/catalogue data, new/failed sittings, latest 30 sittings
and one of six stable ID buckets each run. Catch up overdue records after missed runs;
use content hashes for historical changes. Rediscover the source deployment ID each run.

Restore only validated state from successful trusted default-branch workflow artifacts
(seven-day retention); absent state triggers bootstrap. Rate-limit serial requests and
checkpoint unfinished work. Keep catalogue sittings selectable; new inaccessible records
are explicitly unavailable. Retain prior valid records and omitted prior inventory entries
with their status. Schema/inventory rejection cannot overwrite valid data.

Publish one validated artifact. Stable file paths use digest query versions; the
[static contract](contracts/static-data.md) prevents mixed catalogue/content through
hash/identity checks, one latest-catalogue retry and safe fallback. Failed builds or
deployments preserve the previous site. Successfully published snapshots can expose dated
source failures. An old static site cannot know about an unpublished failure: it shows
checks overdue by age and links workflow evidence, never infers failure from age.

`acquiredAt`, snapshot `preparedAt`, verified deployment `publishedAt` and device
`refreshedAt` have distinct meanings. Actual publication time belongs in a post-deployment
receipt, not a prediction in a prebuilt manifest. Official change times remain unavailable
unless supplied. Document reuse-policy limits and obey source-specific restrictions
actually discovered before publication; no third-party reconstruction is substituted.

## Reader and PWA

The [data model](data-model.md) and [reader contract](contracts/reader.md) define identities,
selections, results, gaps, localization, accessibility and updates. Render source strings
as text, preserving paragraphs/traversal order. Names, brackets, titles and quotations
cannot override IDs. Zero matches with unresolved speaking items are incomplete; verified
absence requires a complete accepted sitting and zero unresolved nonannotation items.

Fetch static data through network requests bypassing worker data caching; explicitly save
validated catalogue and opened pair results in IndexedDB transactions. On online reopen,
show saved data with its label, check the latest snapshot, and replace only after validation.
Reject selection races and identity/schema mismatches. Confirm transcript saving on
transaction completion; promise offline reopening only after committed catalogue/result
and shell-cache readiness. Online reading survives write/cache failures. Unsaved pairs require a connection
offline even if another pair from that sitting was fetched.

Keep new workers waiting for deliberate application. Persist selections before reloading
only the consenting tab. Retain installed older shell assets while older clients need
them; keep fetch behavior compatible and avoid destructive activation-time migrations.
Version saved schemas; incompatible content becomes unavailable. Test other reading tabs
because `skipWaiting` affects clients beyond the consenting tab.

## Validation and CI Gates

Every behavior, including foundational normalization, failure retention, hash checking,
selection races, localization, transactions and worker updates, starts with meaningful
unit assertions. Record behavioral RED before production code, then GREEN and refactor
or explicit no-refactor evidence. Harness/import/syntax/dependency failures and tests
already passing do not count as RED.

Planned evidence: `specs/001-read-mp-hansard/evidence/tdd.md`, plus source, browser,
performance, accessibility/usability and documentation reports. Record IDs, commands,
revision/working-tree hash, expected/observed failures, passes and gaps when checks run.
No runtime evidence exists yet. [quickstart.md](quickstart.md) defines journeys and future
commands; implementation must verify those commands before documenting them as working.

CI requires type/unit checks, reviewed RED evidence, production build, asset/full-artifact
sizes, actual-engine browser offline/update checks, performance budgets and documentation
coverage. Missing/exceeded required checks block merge; configure branch protection.
CI also requires revision-matched reports containing ten offline measurements per actual
acceptance target, all ≤2 s. Source accuracy and remaining device acceptance require review
before release. No workflow or branch protection was created by this operation.

Browser checks cover installation/activation, cache replacement, closed-reader offline
reopen, unsaved pairs, storage loss/write failure, failed refresh, waiting/applied updates,
incompatible data, concurrent reading tabs and the deployed subpath. Playwright WebKit
is not Safari; emulation is not an iPhone; patched Firefox is not stable Firefox acceptance.
Record device, OS/browser version, date and journeys on every FR-009 target, including
native gzip delivery/decoding and installation where supported.

Manually compare ten pairs across five sittings, including the 2026-02-10 missing-ID
question and an actually verified no-contribution case. Verify all source leaves, exact
words/order, gaps and provenance. Fixtures cannot invent real absence. Run ten-user
usability, keyboard/screen-reader and 320-pixel checks. Exercise controlled new/historical
revision acquisition and live observations where available; distinguish mechanism tests
from measured official-source publication latency.

## Performance Budgets

Design limits, not results. KiB = 1,024 bytes. Use deterministic gzip level 9/fixed timestamp
for accounting; report actual served bytes separately. Record revision, fixture hashes,
runner CPU/OS, browser/tool versions, conditions, raw timings and nearest-rank percentiles.
Include all application assets, including any fonts/images later introduced.

| Measure | Budget | Dataset, method and pass rule |
|---|---|---|
| HTML + JS + CSS + manifest + worker | ≤150 KiB gzip total; JS subset ≤100 KiB | Sum all required shell assets every production build; no remote dependencies |
| Install icons | ≤60 KiB combined stored/delivered bytes | All icons every build, separately counted |
| Whole deployed artifact | ≤900,000,000 stored bytes | Sum every file, including all data/retained public assets, every full snapshot |
| Complete catalogue | ≤200 KiB gzip; decoded ≤5 MiB | Every snapshot: all members/sittings/status/provenance/references |
| Each sitting | ≤512 KiB gzip; decoded ≤5 MiB | Every sitting; no truncation/coverage reduction |
| Cold shell | p75 LCP ≤2.5 s, CLS ≤0.1, TBT ≤200 ms | 20 fresh runs per lab profile; browser trace/Web Vitals collection |
| Cold catalogue ready | p95 ≤5 s | 20 fresh runs per profile; User Timing after complete validated catalogue is usable |
| Repeat reader ready | p95 ≤1 s | 20 prepopulated runs per profile; User Timing after saved reader/selections usable |
| Decompress + validate + filter | p95 ≤500 ms mobile; ≤200 ms desktop | 20 runs per profile on each median, p95 and largest sitting; time complete result/gap construction |
| Online Read → matching subset/gaps or verified absence | ≤5 s in ≥29/30 attempts per device group | ≥5 sittings of different lengths; time complete text/provenance; failures remain in denominator |
| Offline reopen → complete saved result | ≤2 s in all ten attempts per actual target | Saved pairs including largest/gaps; close reader, disable network, reopen and verify complete text/provenance |
| Selection/language/read → next paint | p95 ≤200 ms | 20 scripted interactions per profile, including long/gap results; not field INP |

Mobile lab profile: Chromium 390×844, 1.6 Mbps down/750 Kbps up, 150 ms RTT, 4× CPU
slowdown on a recorded fixed runner class. Desktop: 1440×900, 10 Mbps down/2 Mbps up,
40 ms RTT, 1× CPU on the same runner. Apply these networks to actual mobile/desktop
online acceptance; record their physical hardware separately.

Cold runs clear HTTP cache, workers, Cache Storage and IndexedDB. Repeat runs retain them
after a successful visit. Offline runs retain saved content only. Bootstrap measures every
source sitting and the full catalogue. Timing fixtures use verified median, nearest-rank
p95 and largest decoded records, plus interrupted, empty, draft and incomplete cases.
Exceeding archive/file/timing limits blocks release pending explicit design adjustment,
never dropping data. First offline visits/unsaved pairs have no reading-time budget because
no readable result is promised; feedback/interaction remains covered.

Acquisition is capped at four hours per run on a recorded Actions runner, with one request
start per second maximum. Receipts record attempts/completion/overdue coverage, not a
source latency guarantee. CI validates timeout/rate configuration with controlled clocks
and enforces full-output sizes. Field mobile/desktop results remain separate; unavailable
or insufficient real-user data must be disclosed, without adding a telemetry dependency.

## Project Structure

### Feature documentation

```text
specs/001-read-mp-hansard/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── acquisition.md
│   ├── static-data.md
│   └── reader.md
└── quickstart.md
```

`tasks.md` belongs to later task generation. Evidence is created only when checks run.

### Intended source layout (implementation creates these files)

```text
src/
├── main.ts                 # Accessible DOM flow and selection/request coordination
├── source.ts               # Shared validation/order/attribution/freshness rules
├── storage.ts              # IndexedDB transactions and compatibility
├── messages.ts             # Bahasa Melayu/English messages
├── updates.ts              # Waiting worker and deliberate application
└── styles.css
public/
├── manifest.webmanifest
├── icons/
└── data/                   # Generated catalogue.json.gz and sittings/{id}.json.gz
scripts/
├── acquire.ts              # Official discovery, requests, state and receipts
├── build-worker.ts         # Versioned shell list and worker output
└── check-performance.ts    # Size accounting and repeatable timings
worker/                    # Worker source; generated into static build
tests/unit/
tests/browser/
tests/fixtures/
docs/development.md
docs/user-guide.md
.github/workflows/         # Required checks and reviewed Pages acquisition/deployment
```

**Structure decision**: One static output/shared rules; no backend directory. README
links directly to developer and bilingual user documentation. Verify documented setup
commands against implemented tooling. Every introduced/changed function/method, including
worker/scripts/tests, requires JSDoc/TSDoc for purpose, parameters, returns and relevant
errors/side effects.

## Complexity Tracking

No constitution violations or extra architecture are required. Per-sitting compression
addresses concrete hosting/transfer limits; shared rules maintain build/browser consistency.
Full bootstrap measurements and runtime evidence remain delivery work.
