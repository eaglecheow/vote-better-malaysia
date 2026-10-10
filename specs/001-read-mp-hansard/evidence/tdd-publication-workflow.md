# Publication workflow configuration: RED

Root authored executable assertions for T038/T039's workflow configuration boundary
after T034/T037 completed. No production workflow is implemented. The tracked YAML
is a valid, explicitly inert manual-dispatch scaffold whose only step exits 1.
Ruby 2.6.10's installed YAML parser reads it successfully; no jobs or remote actions
are executed by these unit assertions.

The preliminary log [publication-workflow-red.log](publication-workflow-red.log)
contains invalid undefined/string `toContain` matcher combinations. Those are harness
errors and are **excluded from RED**. Root corrected the comparisons to use empty
strings for absent configuration, then reran before changing any production behavior:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/publication-workflow.test.ts
```

At **2026-10-10 17:41:47 MYT**, exit 1: **28 behavioral failures and one already-GREEN
negative control**, [valid raw output](publication-workflow-red-valid.log). All failed
expectations are missing configuration values or empty commands/action sets against
the required configuration, without import, parser, type, fixture or matcher failures.
Soft assertions reach each independently constrained field within grouped cases.

| Identifiers | Required behavior and observed absence |
|---|---|
| PUB-WF001–004 | Exact UTC schedule, prepare/promote dispatch choices, named candidate/evidence run inputs and reviewed-main guard are missing. |
| PUB-WF005–009 | Repository lock/noncancellation, bounded job timeouts, read-only default permissions, scoped deployment writes and separate environment roles are missing. |
| PUB-WF010–014 | Real prepare/promote controller commands, environment-based untrusted input transport, API-derived exact artifact IDs and authenticated digest-checked downloads are missing. |
| PUB-WF015–019 | External candidate metadata, explicit seven-day frozen Pages retention, ready/consent deployment gate, original-tar promotion and pinned actual deployment action are missing. |
| PUB-WF020–025 | Always-run finish/outcome reporting, real job-result inputs, private failure persistence, missing-file upload failures, nonempty immutable action pins and Node 24 setup are missing. |

PUB-WF-CONTROL already passes: the scaffold has no PR/push triggers, active cancellation
or automatic publication. That control is not new RED. All marker updates and aggregate
T038/T039 completion wait for the separate runtime publication tests as well.

Preimplementation SHA-256 bindings:

```text
.github/workflows/pages.yml: 6636db94b27abff81b093ebbb3a58405d96ff020abc9cb6881777a3c3b766d47
tests/unit/publication-workflow.test.ts: 221c8eb3971ec1357b7f81cfad095c15106b4b791793f018ceb705f401a1725f
publication-workflow-red-valid.log: 6c0813b7f67ac4fa32bce29292088728d34080a98f9dc14071d63dd35f5a7a25
```

Exact official action tag commits were read with `git ls-remote` on 2026-10-10. The
pinned [download action definition](https://raw.githubusercontent.com/actions/download-artifact/9000827ccba6bdab643e8b6fd33ac0654aef8333/action.yml)
supports exact artifact IDs, cross-run authentication and digest-mismatch errors.
The pinned [Pages upload definition](https://raw.githubusercontent.com/actions/upload-pages-artifact/7b1f4a764d45c48632c6b24a0339c27f5614fb0b/action.yml)
defaults to one day, so the required workflow explicitly requests seven.
The pinned [Pages deployment definition](https://raw.githubusercontent.com/actions/deploy-pages/d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e/action.yml)
exposes the served URL; confirmed publication time must come from independently
correlated GitHub deployment metadata, not a runner clock.

Typecheck and global mechanical callable documentation passed before the matcher
repair, which changes no signatures. These static checks do not establish action
execution, authentic artifact provenance, remote scheduling/enforcement, physical
reports, live deployment or source publication latency. Runtime trust and receipt
tests remain separate, and T040 implementation has not started.

## Fresh-runner and recovery review: expanded RED

Read-only peer review identified missing finish-step `always()`, fresh-runner checkout/
dependency/restoration, provider read permissions and token transport, plus a weak
deployment condition that could allow an `OR` instead of requiring consent **and**
readiness. Root tightened the main and deployment conditions to their complete
conjunctions, added PUB-WF026–038, and reran before YAML production changes.

At **2026-10-10 17:50:33 MYT**, the same command exits 1 with **43 behavioral
failures and one unchanged passing control** in
[expanded valid output](publication-workflow-expanded-red-valid.log). The earlier
17:50:11 expanded run has the same 43/1 result; the later run adds the full-condition
assertions. Neither contains parser, import, fixture or invalid matcher failures.

The added reachable soft assertions cover explicit partial-run input; independently
discovered main/successful state and served artifacts; exact-ID, authenticated,
digest-checked private downloads; separate accepted/partial seven-day uploads;
repository-configured HTTPS test origin; original candidate metadata/Pages/acquired
state restoration on the fresh finish runner; actual promotion artifact ID;
step-level always-finalization; separate confirmed served-state upload; real API
token transport; Pages/environment read-only proof permissions; checkout and locked
dependencies in both controller jobs; a shell outcome summary even when Node is
unavailable; and latest accepted state restoration separately from older candidate
state. These are workflow configuration checks; runtime authentication and safe
restoration are independently covered by the owner's runtime tests.

```text
tests/unit/publication-workflow.test.ts: b6d542ab3624dec5ea824ee85f5d50e259678ba53fec9f0581c35be859a2eb91
.github/workflows/pages.yml (unchanged inert scaffold): 6636db94b27abff81b093ebbb3a58405d96ff020abc9cb6881777a3c3b766d47
publication-workflow-expanded-red-valid.log: c740d88880dc44bec3dccbff51652c560016b19f138e7521ef65143f334426f5
```

Fresh typecheck exits 0 and mechanical callable coverage returns `[]` after these
test changes. T038/T039 remain pending until the runtime origin/selection/resume/
test-origin/receipt cases and their peer review finish. YAML stays inert.

At **17:52:17 MYT**, PUB-WF039 adds a separately observed failure for promotion
revalidation **inside** the deployment environment job, after approval has arrived,
and requires its ready output before submission. This closes the interval in which
reports can expire or the independently checked baseline can change while approval
is pending. It reuses promotion validation without rebuilding or reacquiring.
[Approval-boundary raw RED](publication-workflow-approval-red.log): exit 1,
**44 behavioral failures and one passing control**, with the inert scaffold unchanged.
Peer review found no remaining material configuration matrix issue in WF001–038;
the added runtime approval/baseline coverage remains the owner's separate boundary.

```text
tests/unit/publication-workflow.test.ts: 8df86289e727acb74da0cbbbb4b2129352cf17f1098791c82f42d9c97d896415
publication-workflow-approval-red.log: 210199108894b18092cd61a05133d6a0096b212a85d80e984446804f43f3d008
```

Final output-wiring review adds PUB-WF040/041: candidate job readiness must come
from the actual `result.json` reader step, and the privileged recheck must have a
real subsequent result-output step before deployment. Without that wiring a safe
condition could silently skip every valid promotion. At **18:03:39 MYT**, the same
command exits 1 with **46 behavioral failures and one passing control** in
[wiring RED output](publication-workflow-wiring-red.log). The unchanged scaffold
has no such result/consumer steps. No parser/matcher/import errors occurred.
Mechanical callable coverage returns `[]`; current typecheck is separately recorded.

```text
tests/unit/publication-workflow.test.ts: a2c8501e200a5c453bb14507b3baa4354e760967cde4657a7877d1a429f248bd
publication-workflow-wiring-red.log: c588ebf6689417ef994ab06132bd5181d85b3f7deab4b634cf7cc3aa61b69511
```

The pinned [checkout definition](https://raw.githubusercontent.com/actions/checkout/d23441a48e516b6c34aea4fa41551a30e30af803/action.yml)
defaults to the triggering event's ref/SHA. Review therefore strengthens WF039
to require a fresh pinned `ref: main` checkout after the environment approval:
otherwise a newer reviewed application commit would be invisible to the recheck.
The new assertions ran before YAML implementation; exact counts and bindings
are in [current-main RED output](publication-workflow-current-main-red.log).

At **18:07:31 MYT**, exit 1: **46 behavioral failures and one passing control**.
The workflow remains the same inert scaffold. SHA-256 bindings:

```text
tests/unit/publication-workflow.test.ts: a1b5d8e0b767c786b8363d20a2349990e878a53191c36a516931a01b180a6d49
publication-workflow-current-main-red.log: 6b47d4918428815a09e5479d3bd3f1535f4385f44499a72cd209c3f0f737116a
```
# Trusted report collection RED — 2026-10-10 18:13 MYT

The operator flow previously had no real producer for `hansard-evidence`. Before
workflow implementation, WF002 and WF010 were updated and WF042/WF043 added to
require a third manual `evidence` operation. It uploads only the four reviewed
files under `evidence/publication-reports/` (`performance.json`,
`documentation.json`, `automated.json`, `source.json`) with seven-day retention.
The downloaded artifact goes directly into the controller's `work/reports/`.
Report collection does not acquire, build, promote or deploy. Uploading a report
does not certify it; later promotion validates each report and its independent
producing-run origin against the frozen candidate.

Node 24.21.0 ran `npx vitest run tests/unit/publication-workflow.test.ts` at
18:13:45 MYT. **48 behavioral failures and one already-passing control** were
observed, exit 1. Missing actual steps/conditions/artifact settings caused
assertion failures; no parser/import/harness failure counted as RED. Raw output:
[publication-workflow-evidence-red.log](publication-workflow-evidence-red.log).

| File | SHA-256 at RED |
| --- | --- |
| tests/unit/publication-workflow.test.ts | 16a69f64747b2c1a63ef80861eeed81de68163fee35053e028fe51fb9d4f481f |
| .github/workflows/pages.yml (unchanged inert scaffold) | 6636db94b27abff81b093ebbb3a58405d96ff020abc9cb6881777a3c3b766d47 |
| Raw RED output | 8f69c758a245f72feede466fe503ab3c8b40ae78f369ab03298f393d13ce70af |

WF044 then added an individual required-file check before upload: the action's
`if-no-files-found: error` alone only rejects an entirely empty path set. At
18:15:04 MYT, the unchanged scaffold produced **49 behavioral failures and one
passing control**, exit 1, with no harness/parser failure. The final test file is
`52dbefd49cf4e27a581ace581696561d7ba409e22b0fcd423540e859e7e26ebd`;
[complete report-package RED output](publication-workflow-evidence-complete-red.log)
is `ac3a9a0e8bc66ef0544f35e47647c4377660f7ae849b973dce240cb5800d358c`.

WF045 records the fresh-runner journal boundary before workflow implementation.
At18:26:24 MYT the unchanged scaffold produced **50 behavioral failures and one
passing control**, exit1. Preparation's actual private run/refresh journals must
be uploaded even when preparation fails and restored independently from accepted
state before finish merges the real job outcomes. The resulting
[journal RED output](publication-workflow-journal-red.log) is
`59e29d80603dc953de9ef3a2f444732d55e688ed96ff4646539820900feeae35`;
the test is `a619a20075cce6936a5cc0678485d32db149d1597df8d66bf15aee87c5dc2852`.
The active workflow still has inert SHA-256
`6636db94b27abff81b093ebbb3a58405d96ff020abc9cb6881777a3c3b766d47`.

# Actual Pages step identity

At 2026-10-10 18:41:00 MYT, PUB-WF048 failed as an actual assertion against the
still-inert active workflow: `undefined` differed from `Deploy exact candidate`.
Command: `npx vitest run tests/unit/publication-workflow.test.ts --testNamePattern=PUB-WF048`.
One failed case, 53 skipped. [Raw RED](publication-action-name-red.log).
This stable action name lets the finalizer distinguish actual successful deployment
from a successful job whose fresh recheck skipped the deployment action. Runtime
step/outcome verification has its separate controller RED before implementation.
The reviewed private workflow draft may now be adopted with this explicit name;
configuration-only passes do not establish a remote action execution.

# Bounded successful-state transport

At 2026-10-10 18:49:03 MYT, PUB-WF049 observed one actual assertion failure
against the adopted workflow's whole `.cache/hansard/snapshots/` upload; 54 cases
were skipped. [Raw RED](publication-bounded-state-red.log).
Command: `npx vitest run tests/unit/publication-workflow.test.ts --testNamePattern=PUB-WF049`.
Every successful acquisition adds a complete private snapshot, so carrying the entire
history into the next successful-state artifact defeats retention. The controller
already creates a bounded `work/acquired-state` containing the exact current
checkpoint, its referenced shard root and separate origin. Production may now
change only the upload source to that existing bundle. Its download root stays
`.cache/hansard`; partial progress and final confirmed publication retain their
separate transport roles. A later two-stage bounded-bundle control is regression
coverage, not initial RED for the already-implemented copying helper.

