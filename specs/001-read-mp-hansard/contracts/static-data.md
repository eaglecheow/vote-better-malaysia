# Static Data Contract

**Version**: 1 | **Date**: 2026-10-10 | **Consumers**: publication pipeline, browser reader,
device storage and validation tools. Entities and semantics are defined in
[data-model.md](../data-model.md); source decisions/evidence are in
[research.md](../research.md).

This contract exposes static files under the deployed repository base. It does not
invent a new REST service or promise support for Parliament's internal interface.

## Build-time official source interface

Rediscover the current official deployment ID from public portal HTML before acquisition.
Only the observed anonymous page-data routes are used:

| Purpose | Official path under `https://hansard.parlimen.gov.my` |
|---|---|
| Member/search payload | `/_next/data/{buildId}/en-GB/cari-mp.json` |
| Complete Dewan Rakyat catalogue | `/_next/data/{buildId}/en-GB/katalog/dewan-rakyat.json` |
| One dated record | `/_next/data/{buildId}/en-GB/hansard/dewan-rakyat/{date}.json?date={date}` |

The final route was verified with its query; query necessity is not established.
Acquisition validates JSON/body/identity rather than trusting HTTP 200. Rediscover and
accept a normal deployment-ID change. Failure to discover a valid current ID, incompatible
schema or an exhausted stale-route retry records failure and preserves previous valid data.
No source credential or backend host guessed from configuration is used. The public app
does not request these cross-origin routes. Respect observed access restrictions, source
rate limits and reuse-policy boundaries recorded in research and developer guidance.

## Static HTTP resources

`{base}` is the actual GitHub Pages application base, including any repository subpath.
Construct both paths relative to that base; neither may escape to the origin root.

| Request | Body and use |
|---|---|
| `GET {base}data/catalogue.json.gz` | One native gzip stream containing UTF-8 Catalogue JSON; initial selection and every online pair refresh. |
| `GET {base}data/sittings/{sittingId}.json.gz?v={digest}` | One native gzip stream containing UTF-8 SittingRecord JSON; fetch only the selected sitting, using its catalogue descriptor. |

Only GET/static content is exposed. There are no account, mutation or per-member REST
endpoints. Official links remain navigation links. The stable sitting path changes body
when its record changes; `v` is the lowercase 64-character SHA-256 of the exact decoded
UTF-8 shard bytes, not a timestamp. It is a cache discriminator, not a security token.
Reader-generated paths must match this fixed same-origin pattern and validated ID/digest;
do not execute arbitrary paths supplied by untrusted source text.

Files are stored as gzip assets. After Fetch transport decoding, accept either gzip bytes
(magic bytes `1f 8b`, native `DecompressionStream("gzip")` once) or already decoded UTF-8
JSON (validate directly). Do not inflate already decoded JSON or assume a particular MIME
type/`Content-Encoding`. Apply decoded digest/schema/identity checks to both representations;
no current Pages header behavior has been verified. HTML error pages, invalid gzip/UTF-8, invalid
JSON, redirects outside the expected base, unsupported schema or identity mismatch are
retrieval errors, never empty transcripts. Delivery/decoding must pass actual acceptance
browsers; unit stubs do not establish it.

| Enforced limit | Bytes / accounting |
|---|---:|
| Catalogue gzip file | <= 1,048,576 (1 MiB) |
| Each sitting gzip file | <= 524,288 (512 KiB) |
| Decoded individual data resource | <= 5,242,880 (5 MiB) UTF-8 bytes |
| Entire published artifact | <= 900,000,000 bytes, all output files included |

Enforce the gzip bound while reading a gzip representation and the decoded bound while
inflating or reading already decoded JSON, before unbounded buffering/rendering. Build
checks enforce stored compressed sizes and actual deployment checks record served bytes.
Build and CI validate the full generated archive; a limit
failure blocks release. It must not trigger truncation, silent omission or reduced source
coverage. Local gzip examples are not proof of deployed transfer sizes or total archive fit.

## Body and identity requirements

All resources use `schemaVersion: 1`. IDs are canonical positive decimal strings;
timestamps follow the data model. Required fields and nulls are explicit, not omitted to
mean success. Unknown schemas are rejected until an explicitly compatible reader exists.

- Catalogue has unique member and sitting IDs, source provenance and inventory coverage,
  current/retained flags, snapshot preparation/publication times, pipeline status and one
  record descriptor per sitting. Do not publish irrelevant source demographics.
- An available/retained descriptor has fixed relative path
  `data/sittings/{sittingId}.json.gz`, digest, byte lengths, accepted acquisition time and
  source receipt metadata. Raw-source and normalized-content digests have distinct fields.
  A new unavailable record has null path/digest/lengths/acquisition time and its known
  attempt outcome; it remains selectable as an unavailable sitting.
- Shard has its sitting ID, date, Parliament/Penggal/Mesyuarat, house, filename, source
  status and official link matching the catalogue. Every item has ordinal, nullable
  source index, section path, exact text/author/ID, attribution, nullable assigned member
  ID, timestamp and gap reason, as defined in the data model.
- Validate all leaves and source accounting before publication. Every assigned ID resolves
  to exactly one reconciled catalogue member; unknown or conflicting IDs remain unassigned.
  Duplicate provided source indices or unsupported leaf structure invalidate replacement
  data. Preserve annotations and all gap passages in source order.
- Preserve original strings and paragraphs. Render untrusted text using text content,
  never executable HTML. Source markdown markers are source text, not permission to
  interpret embedded HTML. Do not parse speaker-label brackets into historical context.

Source-only metadata remains unavailable when missing. `isFinal` is a draft/final flag,
not proof of identity completeness. `publishedAt` must be supported by a deployment
receipt for the matching snapshot; neither `preparedAt`, HTTP response `Date`, first
observation nor source acquisition can populate it. Official publication/revision dates
are separately nullable. A successful static refresh must not imply a live source request.

## Coherent online retrieval and failure preservation

1. Fetch the catalogue with browser cache bypass/revalidation for an online read, validate
   it and retain a dated previous catalogue only when the new retrieval fails.
2. Fetch the selected descriptor's sitting shard using `?v={digest}`. Bound/decode the
   response, verify its decoded-byte SHA-256 and its schema/identity against that catalogue.
3. On a digest mismatch, refresh the catalogue and retry the corresponding shard once.
   Revalidate the selected pair after the catalogue refresh. A repeated mismatch produces
   an error or compatible saved-pair fallback; do not combine records from two snapshots
   or display mismatched identities. Other failures expose retry without automatic loops.
4. Derive the selected member subset by exact assigned ID and original ordinal. Include
   the source gap notice and access to all unassigned passages. Only a fully validated
   record with zero unresolved nonannotation items and zero assigned matches can produce
   `verified-absence`; otherwise an empty subset is `incomplete` or unavailable/error.
   Real-source acceptance includes a verified-absence sample only when the complete dated
   archive supplies such an eligible record. If none exists, record the complete archive
   eligibility search, inventory/record counts, method and result, and disclose that a
   real-source absence sample is unavailable. Controlled complete-record absence tests
   remain required; this changes sample availability, never result classification.
5. Record a successful device `refreshedAt` only after matching-pair validation, including
   unchanged content. It describes the current online result; persist that time only with
   a committed replacement pair. Save the opened
   pair, member/sitting identity, ordered turns, all gap passages, annotations and provenance
   transactionally. Announce transcript-save status after completion; promise offline
   reopening only with committed catalogue/result and confirmed shell-cache readiness.
   Failed pair saving leaves current online reading available as not saved and preserves
   the previous saved copy and its time. Failed shell caching does not undo a committed
   transcript save; distinguish transcript-saved from offline-reopen readiness.

Selection changes invalidate older pending results, including results from retry. An old
compatible saved pair is self-contained with its accepted catalogue identities and digest;
it is not relabeled using a different current catalogue. Keep its prior successful times
when online/source retrieval fails, and disclose its saved/stale state.

The acquisition pipeline stages and validates replacements before publication, retains
valid shards on individual failure and retains the whole valid inventory if its replacement
is invalid. Snapshot descriptors can expose known failures with retained data. A failed
deployment cannot update the old site's status; workflow receipts report that failure,
while the reader may infer only overdue age from metadata it actually has. Raw response
evidence and operational checkpoints stay in workflow artifacts, not public site/Git history.

## Offline and application-version boundary

The service worker caches the application shell; validated IndexedDB opened-pair records
govern offline transcript availability. A previously fetched sitting or saved catalogue
must not imply another pair is saved. Unsaved pairs require a connection. Evicted,
uncommitted, incompatible or malformed device data is explicitly unavailable offline.

Save/restore valid selections and locale separately from source content. Apply a waiting
application version only after the user's action. Compatible stored results remain usable;
unsupported schema/identity requires online retrieval and a visible explanation. Activation
must not destructively migrate content or interrupt another tab's reading. Full behavior
requires the actual-browser validation in [quickstart.md](../quickstart.md).
