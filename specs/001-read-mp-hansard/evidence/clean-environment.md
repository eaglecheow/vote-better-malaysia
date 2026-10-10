# Independent developer environment checks — T075 partial

On 2026-10-10 an independent dependency installation and source check ran in
`/private/tmp/hansard-clean-MPMMKr`. This is a new directory containing copied current
working-tree inputs, **not a clean Git commit or clone**. The repository's uncommitted
work was preserved. [Initial structured report](clean-environment.json), SHA256
`0d99c833665f98858fd9b865365a93ef3f66fd475ae70681e1c7efd3413872be`, retains exact
commands, observed results and every linked raw-log hash.

## Installation and tools

Only `package.json`, `package-lock.json` and `.nvmrc` were initially copied. No original
`node_modules` was copied. Actual probes recorded Node **24.21.0** at
`/private/tmp/hansard-node24/node_modules/node/bin/node`, npm **11.17.0**, Ruby **2.6.10**
and a successful Ruby `YAML.safe_load`/JSON parser probe. This host is macOS arm64;
these observations do not establish an Ubuntu runner result.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm ci --offline --cache /private/tmp/hansard-npm-cache
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm ci --prefer-offline --cache /private/tmp/hansard-npm-cache \
  --registry https://registry.npmjs.org
```

The [offline attempt](clean-environment-offline-install.log) exited **1** because the
cache lacked the pinned `fake-indexeddb@6.2.5` tarball. The authorized public-registry
retry [exited 0](clean-environment-install.log), adding **78** packages and auditing
**79** in **714 ms**. Its optional `fsevents` install-script approval warning is retained
verbatim; no npm approval or configuration was changed. [Dependency listing](clean-environment-dependencies.log)
confirmed all seven exact direct pins. [Tool probes](clean-environment-tools.log) record
the actual executable/platform/parser output. The three dependency inputs remained
byte-identical before and after installation.

## Frozen source copy and initial checks

After root released the final helpers, `git ls-files --cached --others --exclude-standard
-z` selected current regular project inputs. [The copy manifest](clean-environment-copy.json)
records **455 files**, **14,643,046 bytes**, each path/size/SHA256 and copied-input digest
`1fa4e17ed48d996b8fd1d165dcb50f8cd972240252939e56396cae874adcf7b4`.
Explicit exclusions were `.git`, `node_modules`, `public/data`, `dist`, `.cache` and
`privatecache`. Only the independently installed dependencies were used.

[Repository-before, copied and repository-after fingerprints](clean-environment-fingerprints.json)
matched, as did the copied inputs after checks:

- Application: `4727ea13b65363e2621813c998e00a25c052cdd2bed0f2543267ffe6b110e06e`.
- Acquisition: `aefa091d7ae3e19bc72bf628be2ede7b48330616b90bd5df222a3314ef1f81d4`.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run build
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
node --input-type=module -e 'import { checkCodeDocumentation } from "./scripts/check-documentation.ts"; const findings = checkCodeDocumentation("."); console.log(JSON.stringify(findings)); process.exitCode = findings.length ? 1 : 0;'
```

- [Typecheck](clean-environment-typecheck.log): exit **0**.
- [All unit suites](clean-environment-unit.log): exit **0**, **2,021/2,021**, **34 files**,
  start **20:11:47 MYT**, **11.95 s**. Two native Chromium unit boundary cases used the
  installed browser cache; the browser journey suite was not invoked.
- [Build](clean-environment-build.log): exit **0**, including its typecheck and actual
  generated reader shell/worker. No complete public source snapshot was copied.
- [Global callable scan](clean-environment-callable.log): exit **0**, **[]**. This is
  mechanical coverage, not a human documentation-accuracy approval.

[Five CLI smokes](clean-environment-cli.json) each exited **1** with its actual required
input message: `npm run test:performance`, `npm run check:docs`, `npm run
performance:collect`, `node scripts/ci-inputs.ts verify`, and `npm run data:acquire --
--mode`. The last command tests a missing mode value; the acquisition CLI's default
bootstrap was deliberately not invoked. No live acquisition, authentic GitHub execution
or fabricated candidate/reviewer was used. The initial smoke runner expected the wrong
documentation error wording; [its initial record](clean-environment-cli-initial.json)
is preserved, and only that harness expectation was corrected. This is not feature RED.

`npm run dev -- --host 127.0.0.1 --port 5177 --strictPort` ran in its own process group
after a native free-port probe. [The native dev result](clean-environment-dev.json)
records HTTP **200**, the repository-base source-script URL and application root in the
served HTML, then termination of the owned process group and a successful free-port
probe afterward. [Raw dev output](clean-environment-dev.log) is retained. No browser was
opened, no existing listener was reused and port 4173 was not used. This checks HTML
serving only, not complete source reading or offline readiness.

## Final user-help refresh

Root then changed only `public/help.html` and `docs/user-guide.md` to remove operational
plumbing from user-facing guidance. Those exact files were recopied, while the initial
evidence above remained unchanged. [Final-help report](clean-environment-final-help.json),
SHA256 `4379090c1745f19cacc5cb59c4c6db25529c0ea54c9d8b0a414a60489c4e44cf`, binds the
two changed hashes, unchanged released code and every final log hash.

[Root/copy/after-check fingerprints](clean-environment-final-help-fingerprints.json)
match application fingerprint
`fbe830313009c0b417a1169c592957dd5e8f550c4e48319cbbcfb4e8ceac6c3d`;
acquisition fingerprint remains unchanged. Released CI/publication source hashes remain
`91e4c76a2cde3dad07944dba8b7627b22403227624772e7a3635949c1f84adac` and
`54639557994a8b8e8099b4e7ac6300da7ecaba7fa75afac624476d309ebd1ae4` respectively.

- [Final full units](clean-environment-final-help-unit.log): **2,021/2,021**, **34 files**,
  start **20:16:48 MYT**, **11.08 s**, exit **0**.
- [Documentation unit subset](clean-environment-final-help-documentation.log):
  **48/48**, start **20:16:45 MYT**, **956 ms**, exit **0**; these cases also belong to the
  full unit count above.
- [Final build](clean-environment-final-help-build.log): exit **0**, including typecheck.
- [Final global callable scan](clean-environment-final-help-callable.log): **[]**, exit **0**.

No further refactor was needed. This supports only the independently reproducible local
developer-environment portion of T075. Human command/documentation accuracy, complete
frozen-source budgets, actual devices, Ubuntu lab measurements, hosted CI enforcement,
deployed journeys and deployment-command verification remain separate open gates.
