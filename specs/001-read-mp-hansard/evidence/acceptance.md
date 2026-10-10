# Acceptance traceability — implementation in progress

The user approved an explicitly labeled **public preview** on 2026-10-10.
[Preview repair verification](ci-pages-preview-verification.md) records its
completed local checks and pending hosted rollout. This preview stage does not
complete the original release acceptance mapped below.

This is a working evidence index for the uncommitted `001-read-mp-hansard` checkout,
not a release acceptance or T080 pass. Checked implementation tasks do not establish
physical hardware, human usability, remote CI enforcement or a live deployment.
The [task list](../tasks.md) remains authoritative for unfinished work.

The final local checks on 2026-10-10 pass **2,021/2,021** unrestricted unit cases,
production build/typecheck and **108/108 Chromium/WebKit cases** from the original
frozen directory with `dist/` absent. The independent dependency/source directory
passes the same unit suite and build with a matching application fingerprint.
CI configuration passes **31/31**, its runtime inputs **201/201**, and publication
regressions **207/207**. Complete local size diagnostics account for all **4,090**
source shards and pass every byte limit. [Final verification](final-verification.md)
records actual input/report hashes and the limits of these results. Firefox fails
before assertions on this macOS host; no release gate is substituted by local checks.

| Requirement | Current evidence | Remaining acceptance boundary |
| --- | --- | --- |
| FR-001 | [Complete official-source reconciliation](source.md), static-data and acquisition unit/browser tests. | Confirm the promoted Pages artifact and deployed same-origin requests. |
| FR-002 | Reader/source-schema/message tests; both-locale reading journeys. | Actual target and assistive-technology review. |
| FR-003 | All 4,090 source sittings, Parliaments 1–15, retained/null identity tests; [restaging](source-restaging.md). | Current frozen candidate and launch/deployed reconciliation. |
| FR-004 | Reader race/selection/generation tests, saved-reader restoration and final frozen-site native reading/recovery journeys. | Actual targets. |
| FR-005 | Leaf/attribution tests; independent complete-archive comparisons; native source-text checks. | Candidate-bound manual acceptance sample and actual targets. |
| FR-006 | Provenance/null/error/freshness tests, native failure journeys and separate current-result/prior-saved-copy times. | Confirmed deployment receipt and candidate-bound actual-target journeys. |
| FR-007 | Controlled complete absence/gap/unavailable/error/Retry tests and native saved/unsaved/missing/incompatible offline journeys. | Final actual targets. Real-source absence is unavailable under the approved conditional rule. |
| FR-008 | Labels, both-language announcements, keyboard/focus and authored native 320-pixel reading/failure checks. | Actual screen-reader/human review of every primary journey, including saved/install/update controls. |
| FR-009 | Manifest/icons/base/versioned-worker tests and native install-shell/support-feedback journeys. | Six specified stable physical targets and installation where actually supported. |
| FR-010 | Atomic native IndexedDB saving, commit/abort/rollback tests, CacheStorage/worker readiness and native closed-reader offline journeys. | Final candidate-bound physical targets and ten timed offline attempts per target. |
| FR-011 | Refresh/retention/failure mechanisms, controlled authenticated publication controller/workflow, operational guidance and native saved-copy freshness/failure journeys. | Actual scheduling, evidence-wait/recovery observations and confirmed deployment. |
| FR-012 | Update protocol/worker tests and final frozen-site native waiting/Apply/Continue/preferences/reload/multi-tab preservation journeys. | Physical/deployed deliberate-update acceptance. |
| FR-013 | Controlled repository-subpath production reading/failure checks. | Actual GitHub Pages deployment and deployed install/offline/update repetition. |
| FR-014 | README and developer/bilingual user/help guidance, operational recovery/CI instructions, independent dependency/source command checks and mechanical checker controls. | Candidate-bound accuracy/deployment review and full clean-source acquisition/refresh commands. |
| FR-015 | Both-locale online/saved/failure/update controls and guidance with original source words preserved. | Final actual accessibility and stable-target journeys. |
| DV-001 | [Recorded behavioral RED/GREEN/refactor decisions](tdd.md), including CI/publication review regressions before corrections and the final unrestricted checks. | Trusted candidate-bound human RED review and final release traceability. The approved narrow performance RED exception is documented separately. |
| DV-002 | Native Chromium/WebKit online/recovery and PWA mechanism checks. | Deferred Firefox, physical targets and deployed checks. |
| DV-003 | Approved budgets and conditions; authoritative checker/collector rejection and acceptance fixtures; complete local frozen-output size diagnostics. | Trusted immutable candidate provenance, defined Ubuntu laboratory measurements, actual-target reports and remote merge blocking. |
| DV-004 | Callable coverage and checker controls; verified local setup/read/build commands. | Full candidate-bound accuracy, bilingual guide and deployment-command review. |
| DV-005 | Complete dated source reconciliation, leaf accounting and controlled source/refresh/publication/receipt failures. | Current final candidate and confirmed deployed evidence. |
| SC-001 | No first-time-user study performed. | Ten users; at least nine correct unassisted readings within 60 seconds. |
| SC-002 | Budget enforcement fixtures only. | Thirty actual online attempts per required target with at least five differently sized sittings. |
| SC-003 | Complete independent source comparisons and source samples; controlled absence and native text checks. | Final candidate-bound manual sample and actual-target review. See [absence eligibility](source.md) and [approved policy](source-policy.md). |
| SC-004 | Storage/worker/update/saved-reader units and native closed-reader/refresh/failure/multi-tab journeys pass in their recorded local scope. | Ten closed-reader offline attempts per required physical target, all ≤2 seconds, plus candidate-bound failure/update preservation journeys. |
| SC-005 | Mobile and desktop real-user evidence unavailable. | Report laboratory results separately; no real-user CWV pass is claimed. |
| SC-006 | Native online/failure keyboard and narrow-layout checks. | Actual assistive technology and all implemented primary journeys. |
| SC-007 | Local subpath checks only. | All applicable journeys at the confirmed Pages address. |
| SC-008 | Complete observed source inventory reconciled and locally staged. | Current frozen launch/deployed inventory check. |
| SC-009 | Controlled new/historical/unchanged/missed/failure acquisition and publication/evidence-wait/manual-recovery mechanisms. | Actual schedule/manual recovery and honest live observation/deployment timings. |
| SC-010 | BM/English online/saved/error/update controls and bilingual install/update guide. | Final physical/install/accessibility journeys in both locales. |
| SC-011 | Controlled Chromium/WebKit online/recovery/PWA mechanism checks. | Every named stable physical browser target, supported installation and deployed repetition. |

The user approved only the recorded [catalogue/absence policy](source-policy.md),
[local Firefox phase deferral](browser.md) and
[specific performance RED exception](tdd-performance.md). Those approvals do not
waive missing release evidence or authorize publication. Official source change times,
the internal API support contract and applicability of reuse policy remain disclosed
boundaries. A successfully submitted deployment whose live probe fails must be
reported as unconfirmed; retaining a prior private receipt does not prove the old
site is still being served.

Final T080 must refresh this index with exact candidate, report and confirmed receipt
bindings after required checks run. Unavailable or failed gates remain unchecked.

Missing timing/hardware/field evidence is recorded in [performance evidence](performance.md).
Missing actual assistive-technology/first-time-user evidence is recorded in
[accessibility/usability evidence](accessibility-usability.md). The read-only
[CI inspection](ci.md) found `main` unprotected, and the [Pages inspection](deployment.md)
returned no existing configuration. No local mechanism or administration permission
is substituted for those required remote outcomes.
