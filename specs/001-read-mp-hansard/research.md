# Research: MP Hansard Reader MVP

**Date**: 2026-10-10 | **Branch**: `001-read-mp-hansard`

**Status**: Phase 0 complete. The user approved build-time official JSON acquisition,
best-effort 24-hour refresh, and explicitly labeled attribution gaps on 2026-10-10.
The amended spec records that decision. Full archive and runtime acceptance are still
implementation checks, not research results.

## 1. Official API discovery

**Decision**: Acquire from the official portal's public Next.js page-data interface
before publication, as approved by the user. Its working routes are distinct from a
supported production REST contract.

**Rationale**: These endpoints returned HTTP 200 JSON without credentials on
10 October 2026, around 09:49 MYT:

| Data | Verified endpoint |
|---|---|
| Members/search | [cari-mp.json](https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/cari-mp.json) |
| Dewan Rakyat catalogue | [dewan-rakyat.json](https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/katalog/dewan-rakyat.json) |
| Sample sitting | [2026-02-10.json](https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/hansard/dewan-rakyat/2026-02-10.json?date=2026-02-10) |

`Zlu4qRDxrOCEM-7h59E5o` is an observed deployment build ID. Public portal HTML
exposes it in `__NEXT_DATA__.buildId`; an acquisition process must rediscover it after
deployments and validate schemas. No such process has been implemented.

**Alternatives considered**: Prefer supported official REST access if established.
Official CSV has weaker identity fields. Third-party mirrors, PDF OCR, guessed endpoints,
private reader credentials, and a separately operated proxy are not substituted.

## 2. Government-published backend source

**Decision**: Record actual domain routes from public source without inventing a
production API host or claiming verified deployed access.

**Rationale**: The [GovTech frontend](https://github.com/govtechmy/hansards-front)
identifies `hansard.parlimen.gov.my` and server-side API configuration. Public repositories
include the [previous backend](https://github.com/govtechmy/hansards-back) and
[Hansard Mod API](https://github.com/govtechmy/hansard-mod-api). The frontend sends a
bearer header when fetching source records server-side.

Mod API revision `add7e63812560f8b1a65a1170e097144e3b74501` exposes:

| Read route | Relevant query/meaning |
|---|---|
| `/api/catalogue` | `house=dewan-rakyat`, optional `term`; dated sitting catalogue |
| `/api/sitting` | `house=dewan-rakyat&date=YYYY-MM-DD`; metadata/speeches |
| `/api/author` | Author identities |
| `/api/author-history` | Historical constituency/party/post records and dates |
| `/api/sitting/list` | Term/session date ranges, not full dated-sitting inventory |

See the [catalogue schema](https://github.com/govtechmy/hansard-mod-api/blob/add7e63812560f8b1a65a1170e097144e3b74501/src/schema/catalogue/response.schema.ts),
[sitting schema](https://github.com/govtechmy/hansard-mod-api/blob/add7e63812560f8b1a65a1170e097144e3b74501/src/schema/sitting/response.schema.ts),
and [historical member schema](https://github.com/govtechmy/hansard-mod-api/blob/add7e63812560f8b1a65a1170e097144e3b74501/src/schema/author-history/response.schema.ts).

Public deployment configuration provides placeholders/secret references, not a production
base URL. Swagger `/docs` and `/docs/json` examples use localhost. No private token was
obtained or used. README describes bearer authentication, but inspected
[server code](https://github.com/govtechmy/hansard-mod-api/blob/add7e63812560f8b1a65a1170e097144e3b74501/src/server.ts)
comments out auth registration; production
[CORS code](https://github.com/govtechmy/hansard-mod-api/blob/add7e63812560f8b1a65a1170e097144e3b74501/src/plugins/security.ts)
uses configured origins. Actual backend authentication/browser access remains unverified.

**Alternatives considered**: Self-hosting the backend requires a server/database,
contrary to the current deployment constraint. Public code does not grant production
service access. The observed `/api/autocomplete?q=Anwar` returns keyword suggestions,
not the member/sitting/transcript data needed by this reader.

## 3. Inventory and attribution evidence

**Decision**: Preserve every supplied item and filter only exact, reconciled source
IDs. Label missing/conflicting identities as gaps, accessible in sitting order. Keep
historical context unavailable when the source does not supply it.

**Rationale**: Recursively collecting `pageProps.archive` entries under `sitting_list`
yields 4,090 entries with unique `sitting_id` and `filename`, Parliaments 1–15, dates
1959-09-11–2026-10-08. Intermediate dictionaries also contain date-range strings.
This enumerates the catalogue; all listed transcripts have not been fetched/verified.
Seven hierarchy nodes contain source Mesyuarat 0, covering 16 sittings (including
2014-07-23, ID 26241, and 2025-05-05, ID 28921). Preserve that supplied value; positive-only
meeting validation would incorrectly discard valid inventory entries. Observed member
and sitting IDs themselves are positive integers.

`pageProps.speakers` has 2,017 entries with `new_author_id`, `name`, `birth_year`,
`ethnicity`, `sex`, without historical constituency/term membership. This is not a
verified count of Dewan Rakyat MPs. Do not publish irrelevant demographic fields.

The [10 February 2026 official record](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10)
has `cycle` (term 15/session 5/meeting 1), `date`, `filename`, `is_final:false`, and
nested `speeches`. Each flattened item has `speech`, `author`, `author_id`, `timestamp`,
`is_annotation`, `index`. There are 487 items; 74 lack IDs and 14 lack author labels.
Counts include procedural/nonmember material and do not alone prove missing MP speech.
However, item `index:2` visibly names Lim Guan Eng/Bagan in its question text while both
author fields are null. ID-only filtering would omit it. Conservative attribution and
completeness rules need verification; an empty ID-filter result is not verified absence.

The portal offers [CSV](https://downloads-hansard.parlimen.gov.my/dewanrakyat/dr_2026-02-10.csv)
and PDF. CSV has `level_1`, `level_2`, `level_3`, `timestamp`, `author`, `speech`, without
member IDs. Its 486 rows versus 487 JSON items require explanation, not an automatic
omission claim. URL construction is in the public
[download code](https://hansard.parlimen.gov.my/_next/static/chunks/8415-bc8e62fbf1145f12.js).

The sample contains 66 nonannotation items without IDs and eight annotations. All 413
nonnull IDs map to the speaker catalogue. Traversal indices are unique and contiguous
0–486 in this sample; do not assume that invariant for all future records. Retain nested
section headings in traversal order. Of the 487 text items, 177 contain actual paragraph
breaks; none contains literal backslash-n. Preserve decoded JSON strings exactly and
render as text. Do not trim, broadly unescape, sort by timestamp, or parse bracketed
labels into inferred constituencies. Annotation items remain separately identified.

An empty member subset can establish absence only if the supplied sitting is fully
validated and has no unresolved nonannotation items. Otherwise show an incomplete-match
state with access to unassigned passages. This describes the supplied official record,
not proof that the member never participated.

**Alternatives considered**: Current-member-only coverage misses history; silent ID-only
filtering hides the concrete missing-ID question; fuzzy matching risks assigning another
person's speech. The approved design keeps exact-ID filtering with visible gaps.

### Probe accounting

Responses were independently parsed and hashed locally. Gzip below uses Python
`gzip.compress(..., mtime=0)`: sample accounting, not measured network transfer.

| Payload | Bytes | Gzip bytes | SHA-256 |
|---|---:|---:|---|
| Member JSON | 242774 | 38610 | `16591062f73226e56bddad100e4fc834d3a79ca2cbe34192ed6ad65d675dfcea` |
| Catalogue JSON | 374375 | 39446 | `3758f5a22783914b6a8b7bd58847189ccc10023cee898c698c39fa158dc3813f` |
| Sample record JSON | 370245 | 102902 | `2f0b3f1e0b3f6889bde11633fa334423e1230964457eebdf046721e79e85c2bf` |

Temporary raw files are in `/private/tmp/hansard-*`. This report preserves facts/hashes
without republishing transcript text. Probes are research, not feature TDD/browser results.

## 4. Static hosting, freshness, and permitted access

**Decision**: Build-time acquisition produces same-origin static data. Use one normalized
gzip JSON shard per sitting and a gzip catalogue, with SHA-256 validation. The reader
fetches only the selected sitting and saves the opened pair plus gap passages. No live
Parliament browser fetch, application backend, private client token, or proxy is needed.

**Rationale**: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
hosts static files. JSON member/catalogue requests with `Origin: https://eaglecheow.github.io`
returned no `Access-Control-Allow-Origin`; sampled CSV also lacked it. Browser-only
fetching is unsuitable on that header evidence. Curl probes are not actual browser
acceptance tests or evidence about an unknown production REST host.

Sample JSON supplies sitting dates/status, not official publication/revision times.
HTTP `Date` is response time. CSV `Last-Modified` was 2026-04-16T22:15:11Z; its relationship
to official publication/revision is unverified. First-observed change times and response
hashes must not be presented as official change timestamps. The inspected backend sitting
schema/model also lacks these dates.

[Scheduled GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
can be delayed/dropped, and inactive public-repository schedules can be disabled.
Schedule at `17 */4 * * *` UTC, with manual recovery. Rediscover the deployment ID and
fetch member/catalogue data each run. Fetch new/missing records, previous failures, and
the latest 30 sittings; then recheck one of six stable ID buckets, prioritizing overdue
checks after missed runs. A complete historical sweep is targeted within 24 hours, using
content hashes because official change times are unavailable. Record actual observation,
acquisition, preparation, deployment receipt and device-refresh times separately.

Use serial requests at no more than one start per second, 15-second request timeouts,
and at most two retries with backoff; honor `Retry-After`/429 and stop on access denial.
Cap each acquisition job at four hours, checkpoint unfinished work, and expose overdue
records instead of asserting daily completion. Restore only validated successful
default-branch workflow state, with seven-day artifact retention; an expired/missing
checkpoint requires full bootstrap. Raw evidence receipts stay in workflow artifacts,
not the public site or Git history. Artifact costs/retention require operational review.

Retain previous valid records on individual failures and list new inaccessible sittings
as unavailable. Reject malformed catalogue/schema changes without replacing the last
valid inventory. A successful deployment may publish known, dated source failures along
with retained data. A failed deployment cannot inform the old static site of its new
failure: workflow logs report it; the client shows an overdue check from age, not an
invented failure. `preparedAt` is not `publishedAt`; confirmed publication belongs in a
post-deployment receipt, nullable in reader metadata when unavailable.

[Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
cap the published site at 1 GB. Set a stricter 900,000,000-byte whole-artifact budget,
200 KiB catalogue gzip, 512 KiB per sitting gzip and 5 MiB decoded per sitting. Measure
the entire bootstrap; do not truncate or narrow coverage to fit. Exceeding a limit
blocks release pending a revised design. The sample multiplied by 4,090 is about
1.51 GB raw versus 421 MB gzip; this is an illustration, not a measured archive estimate.
Native [DecompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)
avoids an inflation dependency. Fetch may perform HTTP content decoding before application
processing: accept gzip bytes with one native inflation or already decoded JSON with
direct validation, checking the same decoded digest and bounds. Test actual delivery on
every acceptance browser; no deployed Pages headers were verified by this research.

Parliament's [Open Data page](https://parlimen.gov.my/p/dataset.html) links
[Government Open Data Terms 1.0](https://www.parlimen.gov.my/images/webuser/photos/dataset/TermaPenggunaan.pdf).
They permit reuse with attribution/terms linkage, but the inspected page does not identify
Hansard API/CSV as covered data. Frontend
[MIT licensing](https://github.com/govtechmy/hansards-front/blob/2fc1c562a07d96b906eea28b1bbd4586194946e2/LICENSE)
covers software/documentation, not an explicit transcript licence. The portal's copyright
footer establishes neither a reuse grant nor a specific prohibition. Automated acquisition
and republication permission remains unverified; no source operators were contacted.

**Alternatives considered**: Direct source fetching lacks the observed CORS support;
per-member files multiply files and duplicate gap content; raw whole-archive JSON risks
exceeding hosting limits. A guaranteed SLA cannot be promised on this scheduler/source.
General terms or software licensing do not establish transcript-specific permission.

## 5. Minimal PWA and validation tools

**Decision**: Vite + vanilla TypeScript, native storage, Vitest/Playwright, Node 24 LTS.
Pin compatible tool versions and a lockfile during implementation; there is no installed
application toolchain in the repository yet.

**Rationale**: No application stack exists to preserve. One reader does not need a UI
framework/router. See [Vite Pages deployment](https://vite.dev/guide/static-deploy.html),
[Node releases](https://nodejs.org/en/about/previous-releases), and
[Vitest requirements](https://vitest.dev/guide/). Keep assets, manifest and worker scope
under the repository base; verify production Pages entry points.

Use [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) for the shell,
IndexedDB for validated data/provenance in a transaction. Announce saving only after
[completion](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event).
Online refresh failures retain prior validated data; write failures or
[eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
must not prevent online reading or become no-contributions outcomes.

Keep new workers waiting for user application; persist selections before activation and
reload only the consenting tab. Other tabs can be affected: retain required old hashed
assets, backward-compatible fetch behavior, and avoid destructive activation-time storage
migrations. Namespace app caches/stores and validate saved identities/schema. See the
[worker lifecycle](https://web.dev/articles/service-worker-lifecycle) and
[skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting).

**Alternatives considered**: No demonstrated need for a runtime framework, generic data
repository, PWA plugin, or elaborate localization library. Manual worker code still needs
actual-browser installation/offline/update tests.

**Decision**: Retain mandatory TDD, actual-browser acceptance, and numeric budgets in
[plan.md](plan.md), without claiming runtime validation.

**Rationale**: [Playwright browsers](https://playwright.dev/docs/browsers) distinguish
patched engines/emulation from stable actual targets. Real Android/iPhone and desktop
acceptance records remain required; [Safari WebDriver](https://developer.apple.com/documentation/webkit/testing-with-webdriver-in-safari)
can supplement desktop checks. Keep [lab/field Web Vitals](https://web.dev/articles/vitals)
separate; planned shell budgets do not replace full source-size measurement or field data.

**Alternatives considered**: Mocks, emulated iPhones, Lighthouse scores alone, and tests
written after production behavior do not meet the constitution.

## 6. Analysis remediation: measurements and publication evidence

**Decision**: Use standard GitHub-hosted `ubuntu-24.04` x64 laboratory runs and the
Pixel 6a, iPhone 13, Windows i5-8250U/8 GiB and MacBook Air M1/8 GiB actual acceptance
baselines specified in [plan.md](plan.md#performance-budgets).

**Rationale**: On 2026-10-10, `gh repo view eaglecheow/vote-better-malaysia --json
visibility,defaultBranchRef` confirmed a public repository with default branch `main`.
[GitHub's runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
documents four vCPUs/16 GB RAM for the selected public-repository Linux runner class.
Record actual CPU/image/tool variants; this fixes the class without claiming identical
physical hosts. The named physical baselines are design choices, not devices verified
available or tested by this operation.

**Decision**: Bind reports to every deployed byte of a frozen candidate, application
inputs, snapshot, fixtures and measurement conditions. Reuse only exact matching evidence;
data-only changes require fresh actual-target reports as well as fresh automated checks.
Missing evidence holds publication and is reported for maintainer recovery. Promote the
tested artifact without reacquisition/rebuilding; reject expired or superseded candidates.

**Rationale**: This preserves the constitution's actual-device and production-budget gates
without presenting reports for an older snapshot as proof of a new one. Testing uses a
trusted HTTPS origin before promotion; actual Pages checks follow deployment, avoiding a
circular first-publication prerequisite. The manual evidence step may delay best-effort
refresh and must remain visible. No acceptance reports or workflow were created here.

**Alternatives considered**: A generic unspecified runner leaves measurements dependent
on hardware chosen later. Reusing reports only by source revision ignores changed data;
skipping physical-device gates weakens the agreed validation contract. A broader evidence
reuse scheme is unnecessary for this remediation.

## Research disposition and verification boundary

All planning decisions are resolved. User approval accepts the internal interface,
best-effort refresh and source attribution/identity gaps; it does not establish an
external data licence or invent metadata. No source-specific restriction was established
by this research. Document the reuse-policy limit and comply with restrictions actually
discovered before publication; no source operators were contacted.

Phase 1 uses these decisions in [data-model.md](data-model.md), [contracts](contracts/),
and [quickstart.md](quickstart.md). Full archive acquisition, all-target gzip/PWA checks,
measured budgets, live refresh latency, actual deployment and real-user metrics remain
delivery gates. They are not unresolved product choices or completed implementation
evidence. No application, workflow, deployment or runtime tests were created by planning.
