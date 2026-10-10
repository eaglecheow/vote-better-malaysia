# Pages deployment evidence

## Authorized public preview, 2026-10-10

The user authorized pushing, checking hosted CI and publishing the explicitly
labeled public preview. [PR #2](https://github.com/eaglecheow/vote-better-malaysia/pull/2)
merged only after the [hosted repair checks](https://github.com/eaglecheow/vote-better-malaysia/actions/runs/38053871243)
passed: TypeScript, **2,038/2,038** unit tests and **162/162** authored
Chromium/Firefox/WebKit browser cases. The merged application revision is
`89533546ea9908591ff5c0011e1437d67f578e23`.

Pages was configured with `build_type=workflow`, enforced HTTPS and the
`github-pages` environment restricted to `main`. The manual
[preview workflow](https://github.com/eaglecheow/vote-better-malaysia/actions/runs/38054189881)
tested that revision, acquired the official source, validated every staged shard,
built the application and passed **2,038/2,038** units and **162/162** native
browser cases before uploading the same `dist/` directory. GitHub deployment
`6982099974` reported `success` at `2026-10-10T14:19:15Z` for
[the live repository-subpath preview](https://eaglecheow.github.io/vote-better-malaysia/).

The source/size gate recorded these actual deployed values:

| Field | Recorded value |
| --- | --- |
| Snapshot | `cc1b416a-e31a-4990-88d3-311e9e85e3bf` |
| Inventory acquired | `2026-10-10T13:04:03.542Z` |
| Snapshot prepared | `2026-10-10T14:13:46.782Z` |
| Source build | `Zlu4qRDxrOCEM-7h59E5o` |
| Inventory raw SHA-256 | `b9e73c964c47f9a70e3eda0ec7463a83301494d8f36424cec55ad40e55c8033b` |
| Available sittings | 4,089, across Parliaments 1–15 |
| Sitting dates | 1959-09-11 through 2026-10-07 |
| Retained / unavailable sittings | 0 / 0 |
| Attribution gaps | 533,327 |
| Shell / JavaScript gzip bytes | 24,225 / 15,170 |
| Combined icon bytes | 3,998 |
| Whole artifact bytes | 357,685,588 |

This is preview deployment evidence, separate from the full-release candidate
promotion/receipt process. The catalogue's `publishedAt` and
`lastConfirmedDeployment` remain null; GitHub's independently confirmed deployment
time is recorded here, rather than inserted into the tested artifact.

### Actual-address browser checks

Fresh native [Chromium](preview-live-chromium.json) and
[WebKit](preview-live-webkit.json) checks both passed against the live HTTPS
repository subpath and the deployed snapshot above. Their recorded start clocks
are `2026-10-10T14:24:57.670Z` and `2026-10-10T14:25:36.679Z`; a completion clock
was not captured. Both verified:

- The expected served snapshot and selected shard's decoded SHA-256.
- Manifest identity/start/scope and the 192/512 PNG dimensions.
- Direct open/reload and native worker control at the exact repository scope.
- Original text/order for member `1216`, sitting `26241` (2014-07-23): five
  attributed turns, 41 unassigned gaps and 16 annotations in both BM and English.
- Persistent bilingual preview labels and committed language preferences.
- Closing the reader, setting native offline mode, then opening a fresh page and
  reloading it from the real worker with unchanged saved source and refresh time.

The [executed smoke script](preview-live-check.mjs) has SHA-256
`9411352b83dda18c53a82a5728f880148e29442e8ccd69dd96ccea992331eac7`.
It was invoked locally with Node 24.21.0, pinned Playwright 1.64.0 and native
browser binaries; its imports retain the actual execution checkout paths.
For each engine, the command was:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
node /private/tmp/hansard-live-preview-check.mjs \
  https://eaglecheow.github.io/vote-better-malaysia/ \
  cc1b416a-e31a-4990-88d3-311e9e85e3bf <output.json> <chromium-or-webkit>
```

The [first scratch check](preview-live-initial-failure.json) timed out awaiting
worker control. Its asynchronous `waitForFunction` predicate advanced before
activation: [native diagnostics](preview-live-worker-diagnostic.json) showed no
active worker/cache immediately after that supposed wait, then an activated
worker with all nine shell entries and a controlled subsequent navigation.
The scratch check was corrected to the existing harness's
`expect.poll(async () => await page.evaluate(...))` pattern, then both complete
live journeys passed. This was a test-harness error, not behavioral regression
RED. No production worker change, retry setting, route mock or weakened assertion
was added. The [diagnostic script](preview-live-worker-diagnostic.mjs) is retained.

These live checks cover one source pair in two desktop engines. They do not
establish full-archive reading accuracy, physical-device installability, human
accessibility/usability review, laboratory/field performance or reuse permission.
Original full-release T076–T078 remain unchecked; public-preview T087 is complete.

### Known source freshness limit

Independent official inventory observations before and after the hosted acquisition
returned 4,090 entries, including sitting `29687`, dated 2026-10-08. Those responses
used the same source build but different inventory bytes (SHA-256
`3758f5a22783914b6a8b7bd58847189ccc10023cee898c698c39fa158dc3813f`).
The hosted snapshot accounts for all 4,089 entries in its recorded inventory; it
currently omits the October 8 sitting. It must not be described as the latest
complete official archive.

Both default and `cache: 'no-store'` local official requests returned identical
CloudFront cache hits with an eight-hour shared-cache lifetime. Different cached
source responses are a plausible cause, not proven without the hosted response
headers. Adding `no-store` alone would not establish a repair. The approved preview
has manual refresh and no freshness promise; fresh inventory reconciliation remains
required for full-release source acceptance.
The [dated inventory investigation](preview-inventory-investigation.json) preserves
the observations and their limits.

### Evidence-only follow-up validation

The follow-up changes only feature evidence and T087's status. JSON assertions
verify both passing reports' engine/snapshot/source digest, preserve the initial
failure and distinguish the 4,089/4,090 inventory observations. The executed smoke
hash matches, both saved scripts pass Node syntax checking, all 39 local Markdown
links in the edited documents resolve and `git diff --check` passes.
The shared application fingerprint remains
`6bf90c39765f13f603b08f17e4b494aeb5f5a453940169fc1a97c45a5b4cab08`.
No application input or deployed byte changed; these records do not require a
second source crawl or replace the deployed/tested revision identified above.

## Read-only repository inspection, 2026-10-10

At approximately 19:26 MYT, the authenticated caller queried:

```sh
gh api repos/eaglecheow/vote-better-malaysia/pages --jq '{html_url,build_type,status}'
```

The API returned HTTP 404, `Not Found`. The repository separately reported
administration permission for the caller; this query returned no existing Pages
configuration, live URL, deployment status or Actions build setting. No setting
was changed and no publication was invoked.

At that inspection, the local `.github/workflows/pages.yml` had controlled
provider/state/candidate/promotion tests, documented recovery and source-policy
approvals. This was configuration/mechanism evidence only: no validated GitHub
deployment receipt, confirmed publication time, served snapshot, live-address
journey or actual default-branch scheduling evidence existed. The subsequent
authorized preview is recorded above. Original full-release T076–T078 remain
unchecked; the local archive and candidate mechanisms do not establish a reuse
licence or full-release publication acceptance.
