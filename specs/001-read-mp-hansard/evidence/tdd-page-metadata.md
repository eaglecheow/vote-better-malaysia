# Optional page metadata repair — 2026-11-18

## Scope, plan and acceptance

Base: `e9b07dbe0211d1bdef09b3470274f1d92d80464c`; initially clean working tree.
Recreate the previously reviewed compatibility fix because the saved patch is absent.
Accept only the four optional source/PDF start/end fields as positive safe integers;
validate ordered ranges when both endpoints exist. Partial and absent bounds remain
supported. Do not assume offsets, equal spans or single-page records. Preserve
normalized schema, text, attribution, order and input; reject other unknown fields.

Use the existing integer validator and normalization boundary as the single authority.
No dependency, UI, storage or worker change is needed. Existing plan performance
budgets and browser/CI gates remain applicable; a shell build alone does not prove
full-archive budgets or field performance. Existing data-model documentation will
record the source contract; no user-facing behavior or setup change is introduced.

Tasks: write 60 regression cases; record actual RED before production edits; apply
minimal validation; run source/full unit, type, build, documentation and browser
checks; record results and blockers without claiming release acceptance.
Current official source cannot be retrieved from this executor (CONNECT 403), so
these four previously observed fields are the bounded scope, not a claim that no
other upstream changes exist. Do not silently allow all unfamiliar fields.

## RED (recorded before production edit)

Command: `npm test -- --run tests/unit/source-items.test.ts -t ITM-PAGE`
Node 24.21.0, unchanged lockfile installed with `npm ci`.
Observed: 56 failed, 4 passed, 151 skipped. Six valid supplied-page cases failed
with `Invalid source data: unsupported source leaf field`; 48 invalid values and
two reversed ranges failed expected specific error assertions. Historical omission
and three unknown-field cases passed. This was a behavioral failure, not a harness
failure.

Original source SHA-256: `8793b0c06adda7c39ee0161ee93d2e3cb6c251d98b1c70986b131ed200078e5e`.
Test SHA-256: `5f2fbc94752fca1898216b2331febd0d3a9842d1cdcf0c4122bd6037e10dc093`.
Raw log: `/workspace/repair-evidence/red.log`.
Log SHA-256: `46f11781b89e65b3e6a5e51c49bd7af815e1b60b587a7d55a727f0f0e2a808d2`.

## GREEN and verification

With the same test file and Node 24.21.0:

- `npm test -- --run tests/unit/source-items.test.ts tests/unit/source-schema.test.ts tests/unit/source-retention.test.ts`: 367 passed, including all 60 new cases.
- `npm run typecheck`: passed.
- `npm run build`: passed. JS 39.59 kB / 13.27 kB gzip; this shell build does not establish complete-archive budgets.
- `checkCodeDocumentation(process.cwd())` from `scripts/check-documentation.ts`: `[]` (no callable-documentation findings).
- `git diff --check`: passed.
- Production file SHA-256: `496848bbb8dd828e87c27e90acb3c883a27c60ef8ce6163d3533f791ff18c9c2` (matches the earlier prepared implementation).
- No refactor needed; the existing source integer validator remains authoritative.

## Required checks still blocked

`npm test -- --run`: 2,000 passed and two failed native Chromium tests (C050,
C051). Three workflow suites could not load: `ci-workflow`, `preview-workflow`,
`publication-workflow`, each with `spawnSync ruby ENOENT`. Overall 31 test files
passed and four failed. This is not a complete unit pass.

`npm run test:browser -- --max-failures=3`: three Chromium launch failures,
one interrupted test and 158 not run. The configured pinned executable
`chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`
is absent. No browser behavior has been verified. The bounded stop avoids
repeating the same missing-executable error across all journeys.

The managed package helper and sudo are unavailable in this executor. Previous
browser installation was denied by the network policy; this attempt did not retry
that denied download or alter access settings. Neither substitute browsers nor
alternate YAML parsers were used to claim required checks passed.

Logs are retained under `/workspace/repair-evidence/`: `npm-ci.log`, `red.log`,
`green.log`, `typecheck.log`, `build.log`, `unit.log`, and `browser.log`.
The retained 687-leaf official response from October is absent; no new equivalence
claim is made for that record. Current live schema, full acquisition, complete
archive budgets, hosted CI and publication remain unverified. Main's latest
inspected scheduled failure did not run this repair.

Because required checks remain blocked, this is a locally verified compatibility
repair for review, not completed release acceptance. Per AGENTS.md, the successful
`after_implement` commit hook is not run. Changes remain uncommitted; no push,
merge, workflow dispatch or deployment occurred.

Pinned Playwright executable-path inspection also confirms Chromium, Firefox and
WebKit are all absent in the current cache; only Chromium launch was attempted.

## Prerequisite follow-up — 2026-11-18

Ruby 3.3.6 was built from `cache.ruby-lang.org` into
`/workspace/repair-tools/ruby`. Its missing Psych YAML extension was then built
against libyaml 0.2.5 from the official `yaml/libyaml` GitHub release, installed
under `/workspace/repair-tools/libyaml`. No system permissions or repository
security settings were changed. The repository's Ruby YAML/JSON probe passed:
`ruby -ryaml -rjson -e 'puts JSON.generate(YAML.safe_load("scope: setup\n", aliases: false))'`.

With `/workspace/repair-tools/ruby/bin` and
`/workspace/repair-tools/node-v24.21.0-linux-x64/bin` prepended to PATH,
`npm test -- --run` now has **2,096 passed and two failed (2,098 total)**.
All three formerly unloadable Ruby workflow suites now execute. The only failures
are C050 and C051, still unable to launch pinned Chromium. Log:
`/workspace/repair-evidence/unit-with-ruby.log`. This supersedes the earlier Ruby
blocker, but does not constitute a full-suite pass.

`npx playwright install --dry-run chromium firefox webkit` confirms the pinned
artifacts use `cdn.playwright.dev` and the documented fallback
`playwright.download.prss.microsoft.com`. Current enforced environment policy
allows neither host. Browser download was not retried through alternate routes;
there is no callable environment-change request tool in this session. An environment
owner must approve the required official download access (and any verified redirect
hosts), then install the pinned engines and OS dependencies through supported setup.
The browser suite was not repeated because its missing executable is unchanged.

The uncommitted repair was backed up outside the checkout under
`/workspace/repair-backups/`, including all five files, a complete applicable patch,
base revision, per-file SHA-256 manifest and validation logs. A temporary clean
archive of the base was used to apply the backup patch and verify every restored
file hash. These are workspace backups, not remote publication or a guarantee of
retention beyond the lifetime of this managed workspace. No commit hook, push,
merge, workflow dispatch or deployment was performed.

## CI-only draft PR exception — 2026-11-18

The user explicitly approved a one-time exception to commit and push this repair
on a separate branch and open a draft PR solely for hosted CI while the local
pinned-browser checks remain blocked. This supersedes the earlier uncommitted
status for this attempt only; it does not establish passing validation or waive
any merge/release gate. No merge, deployment, promotion, CI configuration or
security-setting change is authorized. The ordinary PR checks must test the exact
published head: Hansard type and unit; Hansard preview build and browser.
