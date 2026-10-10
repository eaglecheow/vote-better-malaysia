# Preview browser failure investigation — 2026-10-10

This is an investigation record, **not a completed TDD repair**. No production,
fixture, test or browser-configuration change was made during this investigation.
The original failure remains recorded and its cause is unconfirmed.

## Tested state and initial failure

Branch: `codex/fix-ci-pages`, base revision
`0ad1c20450718e308d6dc81f3a6b5ef24e4230a9`, with the CI/public-preview repairs still
uncommitted. Runtime: Node 24.21.0, pinned Playwright 1.64.0 and matching installed
Chromium/WebKit engines on this macOS host. Native loopback server and browser
execution required execution outside the filesystem sandbox.

The root's initial frozen Chromium/WebKit suite passed 102/108 and failed six
WebKit cases at the fresh offline navigation in `reopenOffline`:
`OFFLINE002`, `OFFLINE004`, `OFFLINE005 schemaVersion`, `OFFLINE006`,
`STORAGE-BROWSER005 identity` and `UPDATES-BROWSER004`. The error was
`FetchEvent.respondWith received an error: TypeError: Load failed`.
See [the original failed run](ci-pages-preview-browser-red.log).

The initial failure and all four comparison runs used the unchanged frozen
`dist/` directory. Its observed entry hashes after the final comparison were:

- `index.html`: `79010e3746dce7857bd66f73c7bb0d9042e6891cb532908a62b78a3c549a510e`
- `sw.js`: `3249ea719b55d7e13f20705771cbdd5198714e07d21f29455087a4a63e501ff2`

The fixture copies the frozen shell into isolated random-port origins, generates
real versioned A/B workers with the production builder and supplies controlled
source data. These browser checks establish that bounded native-engine behavior,
not full-archive reading, branded Safari device acceptance or live Pages behavior.

## Unchanged comparisons

Each command used:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
HANSARD_FROZEN_SITE="$PWD/dist" npm run test:browser -- <arguments>
```

The targeted expression was
`OFFLINE002|OFFLINE004|OFFLINE005 schemaVersion|OFFLINE006|STORAGE-BROWSER005 identity|UPDATES-BROWSER004`.

| Arguments | Observed result | Log |
| --- | --- | --- |
| `--project=webkit --workers=1 --grep '<targeted expression>' --output=/private/tmp/hansard-preview-recovery-red` | 6/6 passed, 5.0 seconds | [Serial cases](preview-browser-recovery-single-worker.log) |
| `--project=webkit --workers=6 --repeat-each=3 --grep '<targeted expression>' --output=/private/tmp/hansard-preview-recovery-red` | 18/18 passed, 8.6 seconds | [Independent repeated parallel cases](preview-browser-recovery-targeted-parallel.log) |
| `--project=webkit --workers=6 --output=/private/tmp/hansard-preview-recovery-red` | 54/54 passed, 15.9 seconds | [Complete WebKit suite](preview-browser-recovery-webkit-parallel.log) |
| `--project=chromium --project=webkit --workers=6 --output=/private/tmp/hansard-preview-recovery-red` | 108/108 passed, 21.9 seconds | [Original combined suite](preview-browser-recovery-combined.log) |

No retry flags were enabled. Repeated cases were independent scheduled executions;
they were not automatic retries of failed assertions. Offline cases still close
the original reader, call native `context.setOffline(true)`, open a fresh page and
require original saved words, source gaps, storage compatibility and recovery
behavior. No response, cache result or offline-success assertion was substituted.

## Review and decision

The failed trace showed the complete versioned shell cache before reader closure.
Static review traced installation, activation, cache lookup, native source-bound
readiness and worker restart. Installation completes and validates cache writes
before activation; the fixture serves the exact base URL directly; controller
setup waits for activation and reload. A restarted worker's empty client-version
map affects conservative cleanup, not cached navigation. No concrete product
defect was found.

The primary [Playwright issue](https://github.com/microsoft/playwright/issues/42775)
documents a related WebKit offline-emulation failure. It is now closed by
[the merged fix](https://github.com/microsoft/playwright/pull/42894/files), and the
installed Playwright code contains that fix. The issue does **not** establish the
cause of this run's transient failure. Initial-state reset, ordering changes or
serialization would be speculative without a failing causal comparison, so none
was added. There was no GREEN-after-fix or refactor claim because no repair was
made.

The original six failures did not reproduce in the four comparisons above. Retain
them as a transient native/emulation limitation with cause unconfirmed. A final
build with different entry/worker bytes requires its own bounded browser result.
Hosted Linux Firefox/WebKit/Chromium, physical devices, lab/field measurements and
live Pages-address acceptance remain separate checks.
