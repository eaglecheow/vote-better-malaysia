# Data Model: MP Hansard Reader MVP

**Date**: 2026-10-10 | **Schema**: 1 | **Basis**: [spec.md](spec.md),
[research.md](research.md), and [static data contract](contracts/static-data.md).

This is a design, not evidence of implemented normalization or full archive validation.
The shared source rules used by acquisition, the reader, and tests have one implementation.

## Identities and time

IDs are positive decimal strings derived losslessly from source integer IDs. Names,
titles, constituencies, and text never substitute for an ID. Catalogue names are supplied
source names, not proof of current office or historical electoral tenure. The observed
2,017 source speakers are not a verified count of Dewan Rakyat MPs. Association with a
Dewan Rakyat sitting establishes source appearance, not an entire parliamentary tenure.

All application timestamps are ISO 8601 UTC instants; sitting dates remain `YYYY-MM-DD`.
Missing source metadata is null, visibly unavailable rather than inferred.

| Time | Meaning |
|---|---|
| `acquiredAt` | Successful acquisition of the accepted source record; retained copies retain this time. |
| `lastAttemptAt`, `lastAttemptOutcome` | Most recent known acquisition attempt and its outcome; failure does not update `acquiredAt`. |
| `preparedAt` | Static snapshot preparation, not publication or official revision. |
| `publishedAt` | Site publication confirmed by a matching deployment receipt; null when unavailable. |
| `refreshedAt` | Successful validation of published data on this device, not a live Parliament fetch. |
| `sourcePublishedAt`, `sourceRevisedAt` | Official dates only where explicitly supplied; currently unavailable in the sampled JSON. |

## Published entities

### Catalogue and Member

`Catalogue` contains `schemaVersion`, `snapshotId`, `preparedAt`, nullable `publishedAt`,
`provenance`, `coverage`, `status`, `members`, and `sittings`. `snapshotId` identifies one
prepared snapshot. Provenance records the official interface, observed build ID,
inventory/member acquisition times and raw-response digests. Coverage records represented
Parliaments, date bounds, latest inventory count, retained-entry count and explicit gaps.
Status records the workflow URL, acquisition/staging outcome (`success` or `degraded`)
and completion time known at preparation, plus the last confirmed deployed run when a
receipt exists. It cannot assert that the current prebuilt snapshot has deployed or that
shipped metadata is the latest global workflow status. Age-derived overdue status is
separate from a recorded failure.

| Member field | Rule |
|---|---|
| `id` | Exact source `new_author_id`, unique within the reconciled catalogue. |
| `name` | Source-supplied name, preserved; no guessed expansion or merging of similar names. |
| `historicalContext` | Nullable source-supplied historical context. Absence remains null; no current-membership fallback. |
| `listedInLatestSource` | Distinguishes current source inventory entries from retained validated identities. |

The published identity catalogue uses reconciled IDs actually referenced in acquired
Dewan Rakyat records, with source names and historical identities preserved. It is not
an unqualified republication of every source speaker as an MP list. Acquisition retains
prior validated identities needed by retained records. A newly
encountered transcript ID not reconciled to that catalogue remains unassigned; it does
not create a guessed member. Conflicting catalogue entries for one ID invalidate the new
catalogue, which cannot replace the previous valid inventory.

### Sitting and RecordDescriptor

| Sitting field | Rule |
|---|---|
| `id` | Exact source `sitting_id`, unique. |
| `date`, `parliament`, `penggal`, `mesyuarat` | Dated source hierarchy; positive Parliament/Penggal, nonnegative source Mesyuarat including 0. Preserve 0 as supplied, not missing or a guessed meeting. |
| `house`, `filename`, `sourceUrl` | `dewan-rakyat`, matching official filename/date and official record link. |
| `isFinal` | Source boolean, or null when genuinely absent; not a completeness claim. |
| `listedInLatestInventory` | False for retained entries absent from the latest validated inventory; show that coverage context. |
| `record` | One RecordDescriptor, including unavailable records so source failures do not remove sittings. |

`RecordDescriptor` contains `availability` (`available`, `retained`, `unavailable`),
nullable `path`, `digest`, `compressedBytes`, `decodedBytes`, and `acquiredAt`, plus
`lastAttemptAt`, `lastAttemptOutcome`, accepted `sourceBuildId`, `rawSourceDigest`,
nullable official dates, and source-validation accounting. `digest` is SHA-256 of the
exact decoded shard UTF-8 bytes. A record without a previously accepted payload has null
path/digest/sizes/acquisition time; a failed refresh of a valid record retains those
values and reports its failed attempt separately.

### SittingRecord and SourceItem

`SittingRecord` contains `schemaVersion`, `sittingId`, `identity`, `sourceUrl`, and ordered
`items`. `identity` repeats the sitting's date, hierarchy, house, filename and source
status to allow identity validation. It contains only stable normalized source content;
attempt/preparation/device timestamps live outside the shard so a successful unchanged
recheck need not change its digest.

| SourceItem field | Rule |
|---|---|
| `ordinal` | Zero-based traversal position across every supplied leaf, including annotations. |
| `sourceIndex` | Original source index, nullable if absent; never invented. |
| `sectionPath` | Nested source headings in their original traversal order. |
| `text` | Exact decoded source `speech` string, including paragraph breaks. |
| `rawAuthor` | Exact nullable source label; brackets are not parsed into constituencies. |
| `sourceAuthorId` | Exact nullable source ID, including an unreconciled ID. |
| `memberId` | Reconciled ID for an assigned item; null for annotations/unassigned items. |
| `attribution` | `annotation`, `assigned`, or `unassigned`. |
| `timestamp` | Nullable original source speech time value; not an official change timestamp. |
| `gapReason` | Null unless unassigned: `missing-id`, `unknown-id`, or `conflicting-id`. |

Annotations remain distinct source content. Every other item is assigned only by an exact
reconciled ID. A source label differing by titles or formatting is not by itself an ID
conflict. An explicit contradictory structured identity is a conflict; missing identity
is not repaired by text parsing, fuzzy matching or the preceding speaker.

## Validation and relationships

- One catalogue has many unique members and sittings; one sitting has at most one accepted
  shard. An assigned item belongs to exactly one catalogue member and one sitting.
- Validate source/member/sitting IDs, house, hierarchy, date and filename together before
  accepting a shard. Catalogue/shard schema and identity must agree. Never resolve a
  changed identity using a different catalogue merely because the display name matches.
- Recursively account for every source leaf exactly once. Preserve heading paths and
  traversal order; do not sort by clock time, trim strings, broadly unescape text,
  translate it, concatenate turns or discard unfamiliar leaf shapes.
- Every ordinal is unique and sequential. Provided source indices must be valid and
  unique; do not require contiguity because only the sampled record established that.
  Malformed structure or duplicate provided indices rejects the replacement record.
- Every assigned `memberId` must match its `sourceAuthorId` and a catalogue identity.
  Unknown/conflicting IDs are preserved as unassigned items, not silently omitted.
- Validate text as untrusted strings, decoded digests and all byte limits in the contract.
  A valid HTTP response alone does not establish a complete parsed sitting.

## TranscriptResult and device storage

A result carries the selected `memberId`/`sittingId`, copies of the validated member and
sitting identity, source/provenance metadata, accepted record digest, schema version,
ordered assigned turns, **all unassigned passages with their order/source details**, and
separately identified annotations. Historical context remains nullable. The result also
carries `refreshedAt`, whether it is a saved copy, and its semantic outcome:

| Outcome | Required condition |
|---|---|
| `ready` | At least one matching assigned turn; accepted complete source response and no unassigned nonannotation items. |
| `verified-absence` | Fully validated source with every leaf accounted for, no unassigned nonannotation items and zero matching assigned turns. State refers to this supplied record, with draft status visible. |
| `incomplete` | Accepted data has attribution gaps, whether or not matching turns exist; never describes the subset as full participation coverage or verified absence. |
| `unavailable` | No accepted published record exists; no conclusion about participation. |

Loading, retrieval/schema/digest errors, offline-unsaved, unavailable device storage and
incompatible saved data are separate reader states, not no-contributions outcomes.

IndexedDB stores the validated catalogue, preferences (`language`, valid selected IDs),
and opened results keyed by `(memberId, sittingId)`. Save a pair's identity, turns, gap
passages, annotations and provenance in one transaction; announce offline availability
only after transaction completion and confirmed shell-cache readiness with the catalogue
also committed. A committed transcript alone may be acknowledged as saved without
promising offline application reopening. Saving the catalogue or fetching a sitting for one
member does not mark another pair as saved. Storage failure leaves online reading usable.

## State transitions

1. Acquisition: no record -> validated available record; valid record -> unchanged or
   changed accepted replacement. Failed/invalid replacement -> retained last valid record,
   or unavailable if none exists. Invalid catalogue -> retain last validated inventory.
2. Reading: valid selections -> loading -> validated semantic result, or error with retry.
   Changing either selection invalidates the pending request; its late result cannot
   replace the current pair. Language changes preserve IDs and source text.
3. Online reopening: recheck published catalogue -> validate the matching shard -> replace
   the saved pair transactionally. Failure -> readable prior saved pair with dated notice;
   the prior identity/provenance remains intact.
4. Offline: compatible saved pair -> saved readable result; unsaved pair -> connection
   required. Evicted data -> unavailable offline, never invented recovery or absence.
5. Updates: preserve valid selections before user-approved application update. Compatible
   saved results remain readable; incompatible schema/identity -> explicitly unavailable
   until a new online retrieval. Activation does not destructively migrate saved data.
