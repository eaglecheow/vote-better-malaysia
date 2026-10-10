# Reader Interaction and PWA Contract

**Scope**: Observable reader behavior. See [spec](../spec.md),
[data model](../data-model.md) and [static data contract](static-data.md).

## Selection and results

The first visit uses Bahasa Melayu. Provide a visible English/Bahasa Melayu switch with
equivalent controls, messages, announcements and user guidance. Preserve valid selections
and original transcript text when switching. Persist language when storage is available.

Offer searchable source identities by name, disambiguated with explicitly supplied
historical context and source ID when needed. Label unavailable MP membership/constituency;
do not classify every source speaker as a verified MP. Offer every inventory sitting by
date and Parliament/Penggal/Mesyuarat, including selectable unavailable records.

Read requires both valid IDs. Snapshot catalogue, selected IDs and request generation at
request start. Ignore/abort older responses after selections change; never render an old
pair under new controls. Loading/retry retain valid selections. Every result repeats its
member/source identity, sitting context and official source link.

| Condition | Required outcome |
|---|---|
| Matched attributed turns, no gaps | Show all matching turns in source order, original text and paragraphs |
| Matched turns plus gaps | Show matching subset and prominent incompleteness notice; offer all unassigned passages in sitting order |
| Zero matches plus unresolved nonannotation items | Incomplete: no confidently attributed turns found; offer unassigned passages; never claim absence |
| Zero matches in complete accepted record with no unresolved speaking items | Verified absence in the supplied record, with source/draft status; no claim about participation beyond it |
| Record unavailable | State unpublished/unavailable only if source supports that distinction; otherwise record unavailable |
| Published-data fetch/validation fails | Retry; preserve valid saved result with saved-data notice if available |
| Offline saved compatible pair | Show complete saved result including gap passages and provenance |
| Offline unsaved pair | Connection required; do not present an empty transcript |
| Incompatible/removed saved content | Explain unavailable content and online retrieval requirement |

Preserve source timestamps/index links/section headings. Source annotations remain
identified separately and do not become attributed MP speech. Gap passages are available
within the reader, including offline after saving, without guessing an identity. Render
strings as text, never markup. Preserve exact words and line breaks; wrap visually at
narrow widths. Use standard disclosure/pagination of rendered items only if complete
content remains accessible; never truncate source data to meet a budget.

## Provenance and freshness

Display official record URL, source identity/context and draft/final status where supplied.
Official publication/revision dates and historical constituency are explicitly unavailable
when absent. Show successful source `acquiredAt`, site snapshot `preparedAt` with its
correct label, and successful device `refreshedAt`; a confirmed deployment `publishedAt`
may be shown only when supplied by a verified receipt.

Online reopening checks the newest published catalogue and matching shard. This is a
check of the static published copy, not a live request to Parliament. If content changed,
validate and atomically replace the saved pair; failure preserves the previous version
and original refresh time. Save all required gap passages with the pair. Announce saved
availability only after catalogue/result transactions complete and the worker confirms
shell-cache readiness. Transcript-save completion alone is not an offline-reopen promise.
Reading remains usable if storage or shell caching fails; explain the offline limit.

Show a source check as overdue when the relevant last successful check is more than
24 hours old. Show a dated source failure only if recorded in the published snapshot;
the current browser's fetch failure is a failure to obtain published site data. Link
pipeline evidence, label best-effort freshness and explain that the old static snapshot
cannot observe failed/unpublished workflow runs. Never infer a specific failure from age.

## Accessibility, installation and offline

Use labeled native controls, visible focus and keyboard-operable selection, language,
reading, gaps, retry and updates. Announce loading/results/errors through suitable live
regions without unexpectedly moving focus. At 320 CSS pixels, controls and transcript
remain readable with no horizontal page scroll. Keyboard and actual screen-reader checks
must cover all primary journeys in both languages.

Use a repository-scoped manifest/start URL/worker and install icons. Support normal
website use and installation on browsers that provide it. Give iPhone/manual installation
guidance without assuming an install-prompt event everywhere. Cache only the required
shell; save complete selection lists and explicitly opened pair results in device data.
Offline first visits cannot obtain unsaved content; eviction/removal is a visible limit.

## Updates and compatibility

An installed update waits and is offered without interrupting reading. Continuing to
read leaves the current result intact. Applying it saves valid selections/language,
activates deliberately and reloads only the consenting tab. Other open reading tabs
must keep working; worker fetch behavior and retained old shell assets support them.
Do not destructively migrate/delete saved content during activation. Remove only this
repository's obsolete caches when they are no longer needed by controlled clients.

Validate schema and pair identity before reusing saved data. Compatible saved results
survive; incompatible results are explicitly unavailable and require online retrieval.
Data refreshes do not force a shell update or alter actively displayed reading content.
All Pages reload/install/offline/update journeys must work under the repository subpath.

## Acceptance evidence

Use the [quickstart](../quickstart.md) for mandatory TDD and browser/source/performance
journeys. Actual stable Android Chrome, iPhone Safari and desktop Chrome/Edge/Firefox/
Safari results must be recorded separately. Playwright engines and mocks supplement
these reports and cannot establish actual-device installation/offline/update behavior.
