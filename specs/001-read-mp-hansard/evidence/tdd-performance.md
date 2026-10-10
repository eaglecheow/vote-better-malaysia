# Performance enforcement initial RED — 2026-10-10

Base `1c4b079`, sorted path + NUL + bytes + NUL fingerprint: `e6cb41df54cff265ba387b49d4e131cd1abfd098836ec58ee5a4b2742863f358`. Node24.21.0 command `npm test -- --run tests/unit/performance.test.ts`: exit 1, 41/41 assertion failures, no harness/import errors.

Before production checker behavior: positive complete/exact-boundary inputs return undefined instead of acceptance; invalid budgets/candidate/conditions do not throw; artifact measurement supplies no counts/digest. These are controlled checker tests, not measurements of the reader, physical devices or CI runner.

- T063 accepts every exact numeric ceiling and exact unchanged-candidate evidence
- T063 rejects exceeded or incomplete artifact size shellGzip
- T063 rejects exceeded or incomplete artifact size jsGzip
- T063 rejects exceeded or incomplete artifact size iconBytes
- T063 rejects exceeded or incomplete artifact size artifactBytes
- T063 rejects exceeded or incomplete artifact size catalogueGzip
- T063 rejects exceeded or incomplete artifact size catalogueDecoded
- T063 rejects exceeded or incomplete artifact size complete
- T063 rejects sitting gzip one byte over
- T063 rejects sitting decoded one byte over
- T063 rejects laboratory lcpMs ceiling exceedance
- T063 rejects laboratory cls ceiling exceedance
- T063 rejects laboratory tbtMs ceiling exceedance
- T063 rejects laboratory coldCatalogueMs ceiling exceedance
- T063 rejects laboratory repeatReaderMs ceiling exceedance
- T063 rejects laboratory interactionMs ceiling exceedance
- T063 requires twenty raw laboratory runs
- T063 applies nearest-rank p75 to cold LCP
- T063 enforces desktop largest-record p95 processing ceiling
- T063 rejects missing actual target android-chrome
- T063 rejects missing actual target iphone-safari
- T063 rejects missing actual target desktop-chrome
- T063 rejects missing actual target desktop-edge
- T063 rejects missing actual target desktop-firefox
- T063 rejects missing actual target desktop-safari
- T063 cannot average away one failed offline attempt
- T063 requires at least 29 of 30 successful online attempts within five seconds
- T063 rejects candidate mismatch applicationFingerprint including provenance-only artifact changes
- T063 rejects candidate mismatch artifactDigest including provenance-only artifact changes
- T063 rejects candidate mismatch snapshotId including provenance-only artifact changes
- T063 rejects candidate mismatch fixtureHashes including provenance-only artifact changes
- T063 rejects candidate mismatch conditionsDigest including provenance-only artifact changes
- T063 rejects candidate mismatch priorServedBaselineDigest including provenance-only artifact changes
- T063 rejects substituted laboratory runner label
- T063 rejects substituted laboratory runner arch
- T063 rejects substituted laboratory runner vcpus
- T063 rejects substituted laboratory runner memoryGiB
- T063 rejects substitute physical hardware
- T063 rejects evidence older than seven days
- T063 rejects untrusted report origin
- T063 measures every deployed file including retained assets and stored gzip bytes

T063/T064 coverage remains in progress; no T065 production implementation has begun. Missing full-source/browser/laboratory/actual-device evidence cannot pass delivery. Full initial log: `/private/tmp/hansard-performance-red.log`.

## Stable recheck and expanded verified RED (T063/T064)

The amended initial 41-test draft reran at 12:22:57 MYT: 41/41 behavioral failures,
exit 1. Fingerprint: `da461f818a2ca532f403426e002a6c39fc98f252e877743f08fc36f6d752987a`.
Candidate revisions are 40-digit hexadecimal; fixture hashes map filenames to SHA-256;
first publication uses an explicit nullable prior baseline.

Expanded stable RED executed at 2026-10-10T12:31:06.303000+08:00 with Node 24.21.0/npm 11.17.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/performance.test.ts --reporter=json --outputFile=/private/tmp/hansard-performance-expanded-red.json
```

Observed exit 1, **172 assertion failures / 172 tests**, no harness/import/type errors.
Six supplemental processing-matrix cases were later found to have invalid p95 fixtures;
they are excluded from valid RED as detailed below. The earlier
164-test draft had one direct undefined-property access; it was repaired into an
explicit behavioral assertion and does not count as RED. This stable run includes
all individual stored/decoded boundaries, missing assets/metadata/raw runs/profiles/
datasets/targets, exact decimal network units, physical/runner conditions, independent
percentile and target denominator rules, expiry/origin/candidate matching, canonical
whole-file accounting, representation safety, private metadata and symlink rejection,
shared schema/reference/digest source verification and measured-counter CLI binding.
Layout-only empty JSON fixtures explicitly expect `sourceVerified: false`; neither
synthetic review metadata nor these checks establish a current official full archive,
actual-device behavior, laboratory performance, CI runner availability or field CWV.

Test/scaffold fingerprint before production:
`3efd5c737034aecee56f29340325b803d4a903254587fa15b6db0749de28eb5e`.
Method: sorted checker/test filenames + NUL + bytes + NUL, SHA-256.
Scaffolds remained inert: evaluation returned undefined, measurement resolved undefined,
and CLI refused all invocations. Expected/observed failures were missing acceptance,
missing rejection, undefined measurement assertion failures or missing required CLI
acceptance/diagnostics; none were retrospective RED evidence.

### Expanded behavioral identifiers

- T063 accepts every exact numeric ceiling and exact unchanged-candidate evidence
- T063 rejects exceeded or incomplete artifact size shellGzip
- T063 rejects exceeded or incomplete artifact size jsGzip
- T063 rejects exceeded or incomplete artifact size iconBytes
- T063 rejects exceeded or incomplete artifact size artifactBytes
- T063 rejects exceeded or incomplete artifact size catalogueGzip
- T063 rejects exceeded or incomplete artifact size catalogueDecoded
- T063 rejects exceeded or incomplete artifact size complete
- T063 rejects sitting gzip one byte over
- T063 rejects sitting decoded one byte over
- T063 rejects laboratory lcpMs ceiling exceedance
- T063 rejects laboratory cls ceiling exceedance
- T063 rejects laboratory tbtMs ceiling exceedance
- T063 rejects laboratory coldCatalogueMs ceiling exceedance
- T063 rejects laboratory repeatReaderMs ceiling exceedance
- T063 rejects laboratory interactionMs ceiling exceedance
- T063 requires twenty raw laboratory runs
- T063 applies nearest-rank p75 to cold LCP
- T063 enforces desktop largest-record p95 processing ceiling
- T063 rejects missing actual target android-chrome
- T063 rejects missing actual target iphone-safari
- T063 rejects missing actual target desktop-chrome
- T063 rejects missing actual target desktop-edge
- T063 rejects missing actual target desktop-firefox
- T063 rejects missing actual target desktop-safari
- T063 cannot average away one failed offline attempt
- T063 requires at least 29 of 30 successful online attempts within five seconds
- T063 rejects candidate mismatch applicationFingerprint including provenance-only artifact changes
- T063 rejects candidate mismatch artifactDigest including provenance-only artifact changes
- T063 rejects candidate mismatch snapshotId including provenance-only artifact changes
- T063 rejects candidate mismatch fixtureHashes including provenance-only artifact changes
- T063 rejects candidate mismatch conditionsDigest including provenance-only artifact changes
- T063 rejects candidate mismatch priorServedBaselineDigest including provenance-only artifact changes
- T063 rejects substituted laboratory runner label
- T063 rejects substituted laboratory runner arch
- T063 rejects substituted laboratory runner vcpus
- T063 rejects substituted laboratory runner memoryGiB
- T063 rejects substitute physical hardware
- T063 rejects evidence older than seven days
- T063 rejects untrusted report origin
- T063 measures every deployed file including retained assets and stored gzip bytes
- T063 rejects missing or mismatched evidence expectedCandidate (undefined)
- T063 rejects missing or mismatched evidence candidate.sourceRevision ("2222222222222222222222222222222222222222")
- T063 rejects missing or mismatched evidence candidate.sourceRevision ("main")
- T063 rejects missing or mismatched evidence candidate.priorServedBaselineDigest (undefined)
- T063 rejects missing or mismatched evidence sizes (undefined)
- T063 rejects missing or mismatched evidence sizes.shellGzip (-1)
- T063 rejects missing or mismatched evidence sizes.jsGzip (null)
- T063 rejects missing or mismatched evidence sizes.iconBytes (null)
- T063 rejects missing or mismatched evidence sizes.artifactBytes ("900000000")
- T063 rejects missing or mismatched evidence sizes.sittings ([])
- T063 rejects missing or mismatched evidence sizes.layoutComplete (false)
- T063 rejects missing or mismatched evidence sizes.sourceVerified (false)
- T063 rejects missing or mismatched evidence sourceCoverage (undefined)
- T063 rejects missing or mismatched evidence sourceCoverage.expected (6)
- T063 rejects missing or mismatched evidence sourceCoverage.snapshotId ("wrong")
- T063 rejects missing or mismatched evidence sizes.sittings.1.path ("data/sittings/1.json.gz")
- T063 rejects missing or mismatched evidence servedBytes (undefined)
- T063 rejects missing or mismatched evidence servedBytes ({"data/catalogue.json.gz":204800})
- T063 rejects missing or mismatched evidence runner.cpu ("")
- T063 rejects missing or mismatched evidence runner.image ("")
- T063 rejects missing or mismatched evidence runner.node ("26.0.0")
- T063 rejects missing or mismatched evidence runner.browser ("")
- T063 rejects missing or mismatched evidence runner.os ("Windows")
- T063 rejects missing or mismatched evidence runner.browserProcesses (2)
- T063 rejects missing or mismatched evidence runner.concurrentMeasurements (2)
- T063 rejects missing or mismatched evidence runner.tools (undefined)
- T063 rejects missing or mismatched evidence profiles ([])
- T063 rejects missing or mismatched evidence profiles.1.profile ("mobile")
- T063 rejects missing or mismatched evidence profiles.0.viewport ([1440,900])
- T063 rejects missing or mismatched evidence profiles.1.viewport ([390,844])
- T063 rejects missing or mismatched evidence profiles.0.downloadKbps (1638.4)
- T063 rejects missing or mismatched evidence profiles.0.uploadKbps (768)
- T063 rejects missing or mismatched evidence profiles.0.rttMs (151)
- T063 rejects missing or mismatched evidence profiles.0.cpuSlowdown (1)
- T063 rejects missing or mismatched evidence profiles.1.downloadKbps (10240)
- T063 rejects missing or mismatched evidence profiles.1.uploadKbps (2048)
- T063 rejects missing or mismatched evidence profiles.1.rttMs (41)
- T063 rejects missing or mismatched evidence profiles.1.cpuSlowdown (4)
- T063 rejects missing or mismatched evidence profiles.0.coldCacheCleared (false)
- T063 rejects missing or mismatched evidence profiles.1.repeatPrepopulated (false)
- T063 rejects missing or mismatched evidence profiles.0.completeValidatedResults (false)
- T063 rejects missing or mismatched evidence profiles.0.interactionKinds (["selection"])
- T063 rejects missing or mismatched evidence profiles.0.lcpMs (undefined)
- T063 rejects missing or mismatched evidence profiles.0.lcpMs ([null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])
- T063 rejects missing or mismatched evidence profiles.0.cls ([-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
- T063 rejects missing or mismatched evidence profiles.1.processing ([])
- T063 rejects missing or mismatched evidence profiles.0.processing.1.dataset ("median")
- T063 rejects missing or mismatched evidence profiles.0.processing.0.fixtureHash ("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
- T063 rejects missing or mismatched evidence profiles.0.processing.1.fixturePath ("data/sittings/unknown.json.gz")
- T063 rejects missing or mismatched evidence profiles.0.processing.2.ms ([500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500])
- T063 rejects missing or mismatched evidence devices.0.offlineMs ([2000,2000,2000,2000,2000,2000,2000,2000,2000])
- T063 rejects missing or mismatched evidence devices.0.offlineMs ([2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000])
- T063 rejects missing or mismatched evidence devices.1.offlineMs ([-1,-1,-1,-1,-1,-1,-1,-1,-1,-1])
- T063 rejects missing or mismatched evidence devices.2.online ([])
- T063 rejects missing or mismatched evidence devices.0.downloadKbps (1638.4)
- T063 rejects missing or mismatched evidence devices.1.uploadKbps (768)
- T063 rejects missing or mismatched evidence devices.2.downloadKbps (10240)
- T063 rejects missing or mismatched evidence devices.0.rttMs (151)
- T063 rejects missing or mismatched evidence devices.2.cpuSlowdown (4)
- T063 rejects missing or mismatched evidence devices.0.viewport ([390,844])
- T063 rejects missing or mismatched evidence devices.2.viewport ([390,844])
- T063 rejects missing or mismatched evidence devices.2.power ("battery")
- T063 rejects missing or mismatched evidence devices.0.batterySaver (true)
- T063 rejects missing or mismatched evidence devices.0.unrelatedApplicationsClosed (false)
- T063 rejects missing or mismatched evidence devices.0.offlineClosed (false)
- T063 rejects missing or mismatched evidence devices.0.offlineNetworkDisabled (false)
- T063 rejects missing or mismatched evidence devices.0.savedComplete (false)
- T063 rejects missing or mismatched evidence devices.0.onlineComplete (false)
- T063 rejects missing or mismatched evidence devices.0.offlineScenarios (["largest"])
- T063 rejects missing or mismatched evidence devices.0.stableAtAcceptance (false)
- T063 rejects missing or mismatched evidence devices.0.browserVersion ("")
- T063 rejects missing or mismatched evidence devices.0.os ("")
- T063 rejects missing or mismatched evidence devices.0.localeChecks (["en"])
- T063 rejects missing or mismatched evidence devices.0.candidate.artifactDigest ("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
- T063 rejects missing or mismatched evidence devices.0.candidate.snapshotId ("wrong")
- T063 rejects missing or mismatched evidence devices.0.reviewedAt ("2026-10-01T04:00:00.000Z")
- T063 rejects missing or mismatched evidence devices.0.reviewedAt ("2026-10-11T04:00:00.000Z")
- T063 rejects missing or mismatched evidence reviewedAt ("2026-10-03T03:59:59.999Z")
- T063 rejects missing or mismatched evidence reviewedAt ("2026-10-10T04:00:00.001Z")
- T063 rejects missing or mismatched evidence reviewedAt ("not UTC")
- T063 rejects missing or mismatched evidence origin.trusted (false)
- T063 rejects missing or mismatched evidence origin.repository ("another/repository")
- T063 rejects missing or mismatched evidence field.mobile (undefined)
- T063 rejects missing or mismatched evidence field.desktop ("passed")
- T063 rejects profile 0 dataset 0 p95 processing exceedance
- T063 rejects profile 0 dataset 1 p95 processing exceedance
- T063 rejects profile 0 dataset 2 p95 processing exceedance
- T063 rejects profile 1 dataset 0 p95 processing exceedance
- T063 rejects profile 1 dataset 1 p95 processing exceedance
- T063 rejects profile 1 dataset 2 p95 processing exceedance
- T063 rejects desktop lcpMs ceiling exceedance
- T063 rejects desktop cls ceiling exceedance
- T063 rejects desktop tbtMs ceiling exceedance
- T063 rejects desktop coldCatalogueMs ceiling exceedance
- T063 rejects desktop repeatReaderMs ceiling exceedance
- T063 rejects desktop interactionMs ceiling exceedance
- T063 uses nearest-rank p95 rather than averaging or requiring every lab run
- T063 preserves untimed retrieval failures in each target denominator
- T063 requires five differently sized sittings (sameSize=false)
- T063 requires five differently sized sittings (sameSize=true)
- T063 accepts exactly seven-day unchanged evidence and separate unavailable/insufficient field data
- T063 rejects omitted required artifact asset index.html
- T063 rejects omitted required artifact asset app.js
- T063 rejects omitted required artifact asset app.css
- T063 rejects omitted required artifact asset sw.js
- T063 rejects omitted required artifact asset manifest.webmanifest
- T063 rejects omitted required artifact asset icons/icon-192.png
- T063 rejects omitted required artifact asset icons/icon-512.png
- T063 rejects omitted required artifact asset data/catalogue.json.gz
- T063 rejects omitted required artifact asset data/sittings/1.json.gz
- T063 rejects resource representation/bounds gzip
- T063 rejects resource representation/bounds utf8
- T063 rejects resource representation/bounds json
- T063 rejects resource representation/bounds catalogue-gzip
- T063 rejects resource representation/bounds sitting-gzip
- T063 rejects resource representation/bounds decoded
- T063 measures exact catalogue-gzip ceiling without calling layout source-verified
- T063 measures exact sitting-gzip ceiling without calling layout source-verified
- T063 measures exact decoded ceiling without calling layout source-verified
- T063 rejects escaped/private artifact paths symlink rather than omitting them from its hash
- T063 rejects escaped/private artifact paths private-state rather than omitting them from its hash
- T063 rejects escaped/private artifact paths report rather than omitting them from its hash
- T063 rejects escaped/private artifact paths candidate rather than omitting them from its hash
- T063 verifies complete schema/reference/digest coverage separately from layout
- T063 incomplete source snapshot cannot borrow a layout pass (digest)
- T063 incomplete source snapshot cannot borrow a layout pass (catalogue-schema)
- T063 incomplete source snapshot cannot borrow a layout pass (missing-shard)
- T063 incomplete source snapshot cannot borrow a layout pass (extra-shard)
- T063 CLI compares measured bytes/counters with the frozen candidate (pass)
- T063 CLI compares measured bytes/counters with the frozen candidate (changed)
- T063 CLI compares measured bytes/counters with the frozen candidate (false-sizes)

### Final pre-implementation RED refinement

The final refined report fixtures distinguish total catalogue sittings from available
record-file counts (unavailable descriptors still count as catalogue coverage), bind
processing roles to decoded-size median/nearest-rank-p95/largest paths, and keep
online decoded-size metadata coherent. Added missing available-record-count and
wrong-but-hashed dataset-role cases. Node24 command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/performance.test.ts --reporter=json --outputFile=/private/tmp/hansard-performance-final-red.json
```

At 2026-10-10T12:34:34.865000+08:00, exit 1: **174/174 observed assertion failures**, zero passes.
Of these, six supplemental matrix fixtures are excluded from valid RED below.
Final checker/test pre-production fingerprint: `1d9b09d96d0ce127970ef2f8698587fdc658506ba327cf08f41150c1f8580ab2`.
No production performance checker behavior existed. This final run supersedes the
172-case fixture shape while retaining its recorded RED behaviors. Additional exact
identifiers: `T063 rejects missing or mismatched evidence sourceCoverage.availableRecords (4)`
and `T063 rejects missing or mismatched evidence profiles.0.processing.0.fixturePath ("data/sittings/1.json.gz")`.

## Calendar-date regression RED — 12:46:48 MYT

Before the fix, `npm test -- --run tests/unit/performance.test.ts tests/unit/documentation.test.ts`
under the recorded Node24 PATH exited 1: **2 failed, 230 passed (232)**.
`T063 rejects impossible calendar dates normalized by Date.parse` observed a missing
throw; `DOC-invalid: rejects calendar` observed `expected 0 to be greater than 0`.
Both supplied an impossible `2026-04-31` review date and an otherwise valid May 1
clock/report. Date.parse normalized April 31 into May 1 and incorrectly accepted it.
Combined sorted checker/test four-file fingerprint before correction:
`93dc749eda9585a60ba672fc9e08109c4e4fc7e0e33b94c1cb0098246c80bd1f`. The shared calendar/applicability correction starts only
after this record; no collector or performance threshold behavior changes.

## Processing fixture correction and one-time user exception

The six supplemental `T063 rejects profile <0|1> dataset <0|1|2> p95 processing
exceedance` cases originally changed only one of twenty runs. With nearest-rank p95,
that one outlier should pass, so their initial failures were incorrect expectations
and **do not count as valid RED**. First implemented-checker run at 12:40:24 MYT:
168 passed, these six failed. Corrected the fixtures to two high runs; no percentile
implementation change was made. These corrected cases are explicitly late GREEN
coverage, not pre-implementation RED.

Valid pre-implementation evidence mapping:

| Gate | Initial valid test identifiers / observation |
|---|---|
| Every size boundary | Original exact-ceiling acceptance; separate one-byte-over shell/JS/icons/whole-artifact/catalogue/shard/decoded rejection cases. |
| Mobile and desktop cold LCP/CLS/TBT | Original mobile ceiling cases and expanded desktop cases, all twenty runs over the relevant ceiling. |
| Cold/repeat/interaction p95 | Original mobile and expanded desktop twenty-high-run operation cases; `T063 uses nearest-rank p95 rather than averaging or requiring every lab run` initially failed its valid upper-tail acceptance assertion. |
| Nearest-rank p75 | `T063 applies nearest-rank p75 to cold LCP` initially failed its valid five-upper-tail-run acceptance assertion. Subsequent rank-crossing rejection is GREEN coverage. |
| Twenty raw runs | `T063 requires twenty raw laboratory runs` and expanded `profiles.0.processing.2.ms` nineteen-run rejection. Every operation uses the same authoritative percentile helper. |
| Desktop processing >200 ms | Original `T063 enforces desktop largest-record p95 processing ceiling` changed both last two runs and observed missing rejection before production. |
| Mobile processing >500 ms | Exact-500 acceptance and nineteen-run completeness had valid RED, but a valid pre-implementation >500 rejection case was missing. This specific gap is the exception below. |
| Each required target/online/offline rule | Separate missing-target cases, failed-offline attempt, thirty-attempt denominator, untimed failure and sitting-size diversity cases had valid observed failures. |
| Conditions/candidate/origin/retention | Expanded separate runner/physical/network/version/missing metadata and exact-candidate/fixture/snapshot/expiry/origin cases had valid observed failures. |
| Artifact/source/CLI binding | Layout/source distinction, source descriptor/reference/digest failures, every-file canonical accounting, gzip/UTF-8/JSON/bounds, omitted assets, private paths/symlinks and independent measured-counter/candidate CLI cases had valid failures. |

On **2026-10-10**, the human user directly selected **"Allow this specific exception"**
in the root chat's approval question. The root agent relayed this approval; this agent
recorded the relay at **12:48:18 MYT** (clock returned 04:48:18 UTC). This is the agent's
recording time; the exact human click time was not captured. The authorization is a
**one-time exception only for the missing pre-implementation mobile processing >500-ms
rejection test**. It permits the corrected late GREEN coverage; it does not manufacture
RED evidence, amend the constitution permanently, waive any other gate, authorize
publication or waive the future browser timing collector/actual measurements.

## GREEN, exit checks, review and remaining scope (T065/T066)

Node 24.21.0/npm 11.17.0 selected with the recorded PATH:

```sh
npm test -- --run tests/unit/performance.test.ts tests/unit/documentation.test.ts tests/unit/harness.test.ts tests/unit/source-schema.test.ts tests/unit/source-items.test.ts
npm run typecheck
npm run test:performance
```

- 12:41:26 MYT: selected five suites passed 526/526 after the p95 fixture correction.
- 12:44:37 MYT: selected suites passed 535/535 after supplementary CLI exit coverage.
- 12:48:15 MYT: selected suites passed **537/537**, including **184 performance**,
  **48 documentation**, harness and already-GREEN source/schema tests, after the
  calendar regression correction. Typechecking passed. These are selected regression
  suites; concurrent acquisition suites were not asserted to be green here.
- CLI fixtures observed exit 0 for an exact coherent frozen five-sitting synthetic
  artifact/report; exit 1 for changed bytes, false supplied size counters, exceeded
  LCP budget, substituted runner/hardware and each of six missing actual-target reports.
- Bare `npm run test:performance` observed exit 1 with
  `artifact, candidate and complete measured report evidence are required`.
- Whitespace checks passed; checker/test functions have no mechanical documentation
  findings. One acquisition-test effect comment was reported to its owner separately.
- Necessary refactor: candidate validation/matching and UTC review-calendar/retention
  rules are shared with the documentation checker. The calendar fix had two actual
  regression RED assertions recorded above before correction. Documentation regressions
  pass after exports/reuse. No further refactoring was needed.
- Final performance checker/test fingerprint:
  `9b26bd9949c3ff560e9ae7f0d45e9a55ed5bf4715d6e0c94625fc2e0aaaf632b`.

Measurement counts every regular deployed relative file, including retained assets,
with a canonical compact JSON array of sorted `[path, byteLength, storedSha256]` tuples;
SHA-256 of those exact UTF-8 JSON bytes is the artifact digest. Candidate metadata,
fixture definitions, review reports and receipts must be outside the artifact; private
paths and symlinks reject rather than silently disappear from accounting. Shell gzip
uses level 9/zero timestamp, all JS includes the worker, icons use stored bytes, and
resource compressed/decoded limits reuse `DATA_LIMITS`. Complete catalogue and shard
schema/accounting/digest/reference verification reuse `src/source.ts`; the result exposes
`snapshot` provenance separately from `layoutComplete`/`sourceVerified`.

**Current scope is enforcement and artifact measurement.** The command requires
`--artifact <frozen-directory> --candidate <candidate.json> --report <report.json>` and
checks independent measured counters/bytes against supplied evidence. The pure gate
checks twenty raw-run nearest-rank lab distributions and every independent six-target
report/condition. It does **not** collect twenty browser runs, launch/throttle CDP lab
profiles, reset cold/repeat caches, orchestrate closed-reader offline trials, or gather
User Timing. Those collector behaviors require their own meaningful RED before production
and remain mandatory before T072. No real laboratory/physical-device/field measurement,
full current official archive, authenticated GitHub provenance, remote CI merge enforcement
or deployment pass is claimed by these synthetic checker fixtures.
