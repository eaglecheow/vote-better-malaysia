# Application fingerprint membership: RED → GREEN

On 2026-10-10, root authorized isolated test-only review of the real exported
`applicationFingerprint(root)` in [publication.ts](../../../scripts/publication.ts).
Production initially remained gated on a later explicit GO, recorded below. This report does not claim
the future shared fingerprint implementation, worker/build integration or CI enforcement
is complete.

During RED, only [the new unit suite](../../../tests/unit/application-fingerprint.test.ts)
and this evidence/log set were authored by this agent. The shared helper was implemented
after GO; publication's import replacement was made by its source/publication owner.
No task markers, aggregate evidence, package/configuration, assets or builder code were changed.

## Contract and fixture reachability

The input contract includes all application/worker/tooling/workflow files, Node and
test/build configuration, lockfile, source `index.html`, and non-data public shell inputs.
It excludes public data, generated public worker/output, tests, README/developer/user
documentation and operational evidence. Root clarified that **every source root
`index.html` byte remains an input**; generated index stamp exclusion belongs only to
output and the existing build B002 contract. The fingerprint suite does not strip a
source-template stamp.

Each case creates its own temporary checkout, invokes the actual production function,
mutates one file, invokes the function again and compares the returned digests. Required
input mutations first observe a valid lowercase 64-character digest and then reach the
digest-difference assertion. Text changes append valid whitespace; binary inputs are
controlled opaque bytes exercising fingerprint membership, not PNG acceptance. Fixtures
are never treated as source-validated data or executable production builds.

The canonical oracle independently lists all 27 intended fixture paths and computes
sorted `[path, byteLength, SHA256(bytes)]` triples with the standard crypto library.
Additional-file cases cover newly introduced nested source/worker/tool files, a workflow
and a public font. Exclusion cases test both adding and changing the ignored file.
Temporary trees are removed in `finally` blocks. No production behavior is supplied by
the fixture/harness.

## Observed RED and already-passing controls

Runtime: Node **24.21.0**, npm **11.17.0**, Vitest **5.0.3**. Tested HEAD
`1c4b079935bc5b7604474c1ba55def43ed6f0270` plus authorized working-tree changes.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/application-fingerprint.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-application-fingerprint-red.log 2>&1
```

At **18:38:17 MYT**, exit **1**, **19 failed /28 passed out of 47**, one file,
550 ms. [Raw behavioral log](tdd-application-fingerprint-red.log).

| Cases | Required observation | Actual result |
|---|---|---|
| AFP001, six `scripts/*` inputs | Changed tool bytes invalidate the digest | **6 RED**: acquire, performance checker, builder, documentation checker, collector and publication inputs all returned the original digest. |
| AFP001, Pages/CI workflows | Changed workflow bytes invalidate the digest | **2 RED**: unchanged original digest. |
| AFP001, `.nvmrc`, Playwright and Vitest configs | Changed runtime/test configuration invalidates the digest | **3 RED**: unchanged original digest. |
| AFP001, public help/manifest/two icons | Changed public shell bytes invalidate the digest | **4 RED**: unchanged original digest. |
| AFP001, six source files, worker, source index, package/lock, Vite/TypeScript config | Existing required inputs remain covered | **12 GREEN controls**, including current `src/storage.ts` and `src/updates.ts`; no missing behavior claimed. |
| AFP002, full canonical membership | Exactly the intended sorted triples produce the digest | **1 RED**: actual `2faad5320c0f229c3750696a30c16aab497689d1dda287455c76b275b7a71515`, expected `be476dcdd08373acf587c61c2fa873312f7ed5ba81e64641026e436a686cdd7b`. |
| AFP003, added nested tool/workflow/public font | New required inputs invalidate the digest | **3 RED**: unchanged original digest. |
| AFP003, added nested source/worker helper | Existing recursive coverage continues | **2 GREEN controls**. |
| AFP004, twelve output/data/evidence/docs exclusions | Addition and subsequent changes preserve the digest | **12 GREEN controls**, including `public/sw.js`, generated stamped `dist/index.html`, data and CI locator evidence. |
| AFP005–006, repeat/creation-order/path rename | Repeat and creation order are stable; renaming an input invalidates | **2 GREEN controls**. |

Every failure in the raw log is an `AssertionError` at the reachable comparison. There
were no import, syntax, dependency, TypeError, missing-file or invalid-matcher failures.
No harness run is being relabeled RED. Passing exclusions/determinism/source coverage
are controls and cannot be presented as initial missing behavior.

## Native input-rejection follow-up

Before implementation, root required direct RED for any newly introduced rejection of
symbolic/nonregular tool, workflow or public entries. AFP007–008 add real native symlinks
and FIFOs in each of `scripts/`, `.github/workflows/` and `public/`, plus corresponding
`src/` and `worker/` controls for the existing rejections. Targets remain inside isolated
temporary trees. `mkfifo` succeeded; no native fixture error or blocked file read occurred.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/application-fingerprint.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-application-fingerprint-boundary-red.log 2>&1
```

At **18:40:30 MYT**, exit **1**, **25 failed /32 passed out of 57**, 569 ms.
[Complete boundary RED log](tdd-application-fingerprint-boundary-red.log). The original
19 failures/28 controls remain unchanged, with **six new RED** and **four new GREEN
controls**. New tool/workflow/public promises resolved to the original digest instead
of rejecting; existing source/worker symbolic/nonregular entries were correctly rejected.
All failures remain assertion failures. The printed `Error { message: "rejected promise" }`
is the matcher's expected side of a diff, not a thrown fixture/runtime error.

## Type, documentation and bounded regressions

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node --input-type=module -e 'import { checkCodeDocumentation } from "./scripts/check-documentation.ts"; const findings = checkCodeDocumentation("."); console.log(JSON.stringify(findings)); process.exitCode = findings.length ? 1 : 0;'
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/documentation.test.ts tests/unit/harness.test.ts
```

Final post-boundary [typecheck](tdd-application-fingerprint-typecheck.log) exited **0**;
[global callable documentation scan](tdd-application-fingerprint-documentation.log)
returned **[]**, exit **0**. The [documentation/harness regressions](tdd-application-fingerprint-regression.log)
passed **49/49**, two files, at **18:38:47 MYT**, 967 ms, before the boundary-only
extension. No full-suite GREEN is claimed
while other US3 behavior remains deliberately RED. `git diff --check` printed no findings;
the raw evidence logs are not ignored.

## Fingerprints and implementation boundary

Captured immediately after the RED run:

- Initial 47-case unit file SHA256: `c67b43130e06ebdbd19c869f7992b8bca2c9126c4237026169abccb54758ecde`.
- Final 57-case unit file SHA256: `dffc13749ab3bd41c7f32a31fe352341a402d58caeae3d68810da3afa9b34379`.
- Behavioral log SHA256: `973685f1b7c34ec77393d9c75526c8023a2d40453005458b2a7326480e77a6ca`.
- Boundary log SHA256: `d2cfac0b43ec76dfd7cf583bc3fcdfbd7eaac67e65aa8d1d39dfeb5e314262a3`.
- Publication file SHA256: `d9e32eb0d53508dcc834b9993b6ff6408d12924e90e31b6122f477c4282463cf`.
- Current fingerprint helper block SHA256: `196539bd4628b9019661ea47c02fa2bec0bb183025883c012ec65093b213b031`.

The last hash covers the exact UTF-8 bytes from the `applicationPaths` documentation
through `applicationFingerprint`, ending before the next catalogue decoder comment.
This records the narrow tested implementation even if the publication owner subsequently
changes unrelated controller code.

## GO, shared implementation and GREEN

Root independently reran the 57 cases at **18:42:36 MYT**, confirming **25 valid RED
and 32 existing controls**, before authorizing production. The [independent case report](application-fingerprint-root-red.json)
has SHA256 `4e6c3b864c9fbe2e17c0622a247631dbf9a96c811db23c01bd26339c790211ca`;
its [raw log](application-fingerprint-root-red.log) has SHA256
`741e6c70109af1a8ef788a8bf8bcb680a55329a79a36180210cab7aa7385534b`.
That GO covered the shared authority and publication integration only; builder integration
remains subject to the US3 T044 gate.

[application-fingerprint.ts](../../../scripts/application-fingerprint.ts) now enumerates
source, worker, scripts, workflows and public inputs recursively, with the eight required
root input names. It excludes `public/data` and generated `public/sw.js` before traversal;
output/evidence/test/documentation paths are outside the included scopes. Native `lstat`
rejects symbolic/nonregular included entries before reading bytes. Exact canonical sorted
triples and SHA-256 remain unchanged. Missing optional scopes stay compatible with sparse
controlled publication fixtures.

The publication owner replaced the old duplicate helpers with an import/re-export of
the shared function. This agent did not edit that shared publication file or its fixtures.
The test suite still imports through the real publication export, so GREEN exercises the
actual integration rather than a test-only alias.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/application-fingerprint.test.ts \
  tests/unit/documentation.test.ts tests/unit/harness.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-application-fingerprint-green.log 2>&1
```

At **18:44:25 MYT**, exit **0**, **106/106 GREEN**, three files, 2.07 s: all 57
fingerprint cases plus 49 documentation/harness regressions. [Complete GREEN log](tdd-application-fingerprint-green.log).
Final post-integration [typecheck](tdd-application-fingerprint-green-typecheck.log)
exited **0** and [global callable scan](tdd-application-fingerprint-green-documentation.log)
returned **[]**, exit **0**. Evidence links resolve and `git diff --check` is clean.

- Shared helper SHA256: `4c9aea57e57528fe9345ae1a0ac15f0c785b72ef69efadfad842b6ae42445273`.
- Integrated publication SHA256: `8f0789b402d0489c24e1bc3acc8403fddc192be191f21a4c3106aa98383aabb0`.
- Unchanged 57-case test SHA256: `dffc13749ab3bd41c7f32a31fe352341a402d58caeae3d68810da3afa9b34379`.
- GREEN log SHA256: `be10d1891fa31f5de99589e3c29a57dd8659abd6b2ae0394c45f15d8b1324a86`.

Refactor assessment: **no further refactor needed**. A single small standard-library
helper supplies the already-required publication/builder common rule, removes the old
duplicate implementation and leaves unrelated controller/build behavior untouched. No
source-template normalization, new dependency or policy waiver was introduced. This
bounded GREEN does not prove full-suite success, trusted archive provenance, actual
browser/device acceptance, remote CI enforcement or completed builder integration.
