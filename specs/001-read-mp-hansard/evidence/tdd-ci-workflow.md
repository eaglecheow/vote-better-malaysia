# CI configuration preparation: RED before production

Current local status: the executable workflow subsequently passes **31/31**
configuration cases, with all **39/39** shell bodies syntactically valid; the CI
runtime and unrestricted checks are complete in their local scopes. See
[final verification](final-verification.md). Earlier preparation statements below
retain their original chronology; no hosted enforcement or release pass is claimed.

At 2026-10-10 **18:58 MYT**, root ran under Node 24.21.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/ci-workflow.test.ts --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/ci-workflow-red.json
```

Observed exit 1: **25/25 cases failed**, with **67 reached behavioral assertion
failures**, each beginning `AssertionError`. The actual `.github/workflows/ci.yml`
does not yet exist; absence is parsed as an empty configuration so missing required
behavior reaches assertions rather than a file/import/harness exception.
[Structured RED](ci-workflow-red.json), SHA-256
`da0db04b8dfe9974d628c96e0b63ed9cfd68223a689289bea914ad7155b52a55`;
[raw output](ci-workflow-red.log), SHA-256
`b0066e4eaa49bf480fe8bc4fb016fa36cf842475bb3550d0d9111db88be9a731`.
Test fingerprint: `838421df246b46dc1e8dbb54c488ef34b250d7f3f8a177c39c45cd348694c5ef`.

The first provisional run stopped at each first assertion. The recorded final
run uses soft assertions to reach every missing trigger, stable required status,
always-run dependent failure gate, locked type/unit command, native engine install,
frozen browser mode, immutable-input verification command, complete performance
checker, current-checkout documentation command, manual preparation boundary and
runner-class assertion. Already passing no-write/no-privileged-trigger/no-rebuild
controls are not RED. No action reference exists yet; absence of action steps
fails, but no particular action SHA validation or remote branch protection is
claimed from an empty action list.

This is T073 test preparation only. CI production still waits for T055/T056 and
its own authenticated-input/laboratory reconciliation RED. Parsed local workflow
assertions cannot prove a real CI run, allocated hardware, measured performance,
physical targets, required reviews or branch protection. T073/T074 remain unchecked.

## Final preparation context and archive handoff RED

At 2026-10-10 **19:39:25 MYT**, still before any executable `ci.yml`, the
root added five configuration regressions for actual PR-head checkout separate
from the merge SHA, provider-resolved manual PR head/base with a main producer,
repository-wide uncancelled laboratory allocation, complete seven-day original
candidate/lab uploads, and real candidate-upload outputs in the lab origin.
These are workflow data-flow assertions; runtime provenance and measured-report
semantics remain covered independently by the CI input tests.

The same Node 24 command targeting `tests/unit/ci-workflow.test.ts`, now writing
`ci-workflow-final-red.json`, exited 1: **30/30 failed**, with **95 reached
`AssertionError` messages and zero non-assertion failures**.
[Final structured RED](ci-workflow-final-red.json), SHA-256
`2295bd1f85dbca62f09bbc23a5ede2aab4da4c2193066ce3231f0b5255e751eb`;
[raw output](ci-workflow-final-red.log), SHA-256
`201f5df64b4e24497b09f4285d9e94e32e90b7f1d238fa0dc10874e58cd8547c`.
Test SHA-256: `f69bdeab68adb8f5688dd3059808f2758a1be591e97b136509420824b8f89b61`.
Only missing positive configuration requirements count as RED; controls that
already exclude privileged execution or check absent invalid values do not.

The pinned [download action's own schema](https://raw.githubusercontent.com/actions/download-artifact/9000827ccba6bdab643e8b6fd33ac0654aef8333/action.yml)
provides exact artifact IDs and `digest-mismatch: error`. The pinned
[upload action's own schema](https://raw.githubusercontent.com/actions/upload-artifact/cf430e030ddbb5b0abf93d22962f4752f3646cd9/action.yml)
provides actual immutable artifact ID/digest outputs and explicit complete-file/
retention policy. These schemas were reopened during this preparation. Runtime
verification must still bind downloaded native files to independently fetched
provider metadata and the original tested candidate. T055/T056 remains the
production phase gate; no CI enforcement or remote run is claimed here.

## Measured-site prerequisite and final preimplementation RED

Peer review of the private draft found that a candidate upload does not create
the HTTP origin needed by the collector. Before executable configuration, root
added CI-WF018 requiring a real Vite preview of the exact frozen directory and a
localhost repository-subpath collection URL. The preview runs the locked Vite
entry directly so its captured PID is the actual owned server. The separate
HTTPS setting remains the physical-report origin, not a substitute for serving
the laboratory bytes. The unchanged collector verifies native served files.

At **19:51:00 MYT**, the final complete preimplementation command exited 1:
**31/31 failed, 100 reached AssertionError messages, zero harness failures**.
[Complete RED](ci-workflow-complete-red.json), SHA-256
`7aa4a46572a44006daa09e85891c14e71272e063abdfae97e08d9896e0dcd86d`;
[raw output](ci-workflow-complete-red.log), SHA-256
`e750d39f1fbc67d7c87a910285ba718786303b12536de799b974cc3d814ec614`;
test SHA-256 `af5f16d13e9118ddb503ea3b1cf6b5c3504e0cb18ac90180039e917d87103569`.
The peer's separate frozen-fixture selection repair is test instrumentation,
recorded in [native probe evidence](pwa-native-probe.md); it is not feature RED.

## First executable workflow GREEN

After T055's recorded local native gate and T056's actual guidance checks, root
implemented the workflow. **31/31 configuration cases pass**, exit 0.
[Structured GREEN](ci-workflow-first-green.json), SHA-256
`46e88f6fc71130b672848ba0dfa0419b0929f54dab04f0d4fee0355669f83efa`;
[raw output](ci-workflow-first-green.log), SHA-256
`680612a5d48968d9b8c84bd0a37a208a8722431e8689678afa5fb65076a9f570`.
Workflow SHA-256:
`1866c0f11ddd290f1c8f40102a4c57bdfd04c697e17c8ecc0f6770ad52dbf871`.

Seven stable required-role names accompany immutable-input authentication.
Dependent roles execute and reject missing/failed input authentication rather
than silently succeeding through a skipped upstream job. Full performance
roles reuse the single strict checker; none offers a partial-pass mode.
Manual main preparation explicitly resolves the tested PR head and source
archive, keeps the actual workflow SHA separate, starts an owned frozen-byte
preview for laboratory collection and binds real upload outputs to lab origin.
The workflow has only read permissions and emits merge-only CI artifacts.

This first mechanical GREEN is not runtime-controller completion or hosted-run
proof. CI input implementation, independent shell/configuration review and the
final complete regression remain pending. No unnecessary refactor was added;
the explicit required roles retain ordinary Actions setup/transfer steps.
