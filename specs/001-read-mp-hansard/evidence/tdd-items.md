# T009/T010: source leaves, attribution, and result RED evidence

Executed 2026-10-10 in the implementation working tree, based on local revision
`1c4b079935bc5b7604474c1ba55def43ed6f0270`.

## Scope and assumptions

`source-samples.json` contains partial source-derived excerpts, not complete sittings
or proof of real-source absence. The six-leaf 2026 excerpt, two-leaf 2014 excerpt,
and one-leaf 1959 excerpt preserve exact text, indices, headings and labels.
Controlled complete records test semantic absence without asserting real Parliament absence.
The optional leaf `new_author_id` is an explicitly supplied, synthetic structured second ID
for compatibility/conflict tests; this field was not observed in a source speech fixture.
Only `author_id` can establish a source speaker ID; labels/prose/secondary IDs cannot repair it.

## Observed RED

Exact command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-items.test.ts
```

Exit 1, **120 tests failed out of 120**, one test file failed. All failures were behavioral
assertions against inert entry points: normalization returned `{ items: [] }` and result
derivation returned empty partitions. Positive assertions observed missing fields/empty
items; malformed-input assertions observed `expected [Function] to throw an error`.
No syntax, import, dependency, fixture, or test-harness error counts as RED. Invalid array
parameters were explicitly wrapped as single arguments before this recorded run so `[]`
was tested as `[]`, not spread away into a missing argument.

Harness/type validation also ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
```

Exit 0. No production item/result behavior had been implemented at this point.

Working-tree SHA-256 fingerprints at this RED:

| Input | SHA-256 |
|---|---|
| `tests/unit/source-items.test.ts` | `cfd46a5ef4d5e4b14c7d13004fb268793624ab8784e62a3e747c4f0791c27ea1` |
| `src/source.ts` (inert entry points) | `f8551ec4ec07d2cb0c83ddbaed23431fd0599222738bdd6b06340c038e3679eb` |
| `tests/fixtures/catalogue.ts` | `e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a` |
| `tests/fixtures/source-samples.json` | `60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526` |

## Per-behavior observed failure identifiers

Every entry below was printed with `×` in the recorded run. Normalization/marker/
attribution/timestamp acceptance cases expected the independently specified original
`SourceItem` data, while their inert result was empty. Invalid cases expected an error
but the inert entry point did not throw. Result acceptance cases expected their named
semantic outcome/identity/partitions but inert result fields were absent. Identity,
accounting, and normalized-item invalid cases expected rejection but received none.

- `ITM-N001: every nested source leaf is retained exactly once with its original headings and paragraphs`
- `ITM-N002: exact text and raw author labels survive without trim, HTML interpretation, or bracket parsing`
- `ITM-N003: traversal order and sequential ordinals include annotations rather than sorting clock or indices`
- `ITM-N004: noncontiguous unique source indices are accepted unchanged`
- `ITM-N005: missing source index stays null rather than being invented`
- `ITM-N005: null source index stays null rather than being invented`
- `ITM-N006: a duplicate provided index rejects the replacement even across headings`
- `ITM-N007: invalid source index -1 rejects the replacement`
- `ITM-N007: invalid source index 1.5 rejects the replacement`
- `ITM-N007: invalid source index "7" rejects the replacement`
- `ITM-N007: invalid source index true rejects the replacement`
- `ITM-N007: invalid source index {} rejects the replacement`
- `ITM-N007: invalid source index 9007199254740992 rejects the replacement`
- `ITM-N008: sibling heading arrays and directly nested arrays preserve every leaf and heading`
- `ITM-N009: unfamiliar or mixed leaf structure {} rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure null rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure "stray text" rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure 1 rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure {"UNKNOWN":{}} rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure {"UNKNOWN":"lost passage"} rejects instead of dropping source content`
- `ITM-N009: unfamiliar or mixed leaf structure {"speech":"Original words.\n\nSecond paragraph.","author":"Tuan Lim Guan Eng [Bagan]","author_id":1839,"timestamp":1010,"is_annotation":false,"index":7,"HIDDEN":[{"speech":"Original words.\n\nSecond paragraph.","author":"Tuan Lim Guan Eng [Bagan]","author_id":1839,"timestamp":1010,"is_annotation":false,"index":8}]} rejects instead of dropping source content`
- `ITM-N010: nonstring speech null rejects the replacement`
- `ITM-N010: nonstring speech 42 rejects the replacement`
- `ITM-N010: nonstring speech {} rejects the replacement`
- `ITM-N010: nonstring speech [] rejects the replacement`
- `ITM-N011: nonstring author label 42 rejects the replacement`
- `ITM-N011: nonstring author label {} rejects the replacement`
- `ITM-N011: nonstring author label [] rejects the replacement`
- `ITM-N012: missing author metadata stays null while exact ID attribution works`
- `ITM-N012: null author metadata stays null while exact ID attribution works`
- `ITM-M001: annotation marker "missing" remains a speaking item`
- `ITM-M001: annotation marker null remains a speaking item`
- `ITM-M001: annotation marker false remains a speaking item`
- `ITM-M002: only explicit true creates an annotation, even when it carries a known member ID`
- `ITM-M003: unsupported annotation marker "true" rejects the record`
- `ITM-M003: unsupported annotation marker "false" rejects the record`
- `ITM-M003: unsupported annotation marker 0 rejects the record`
- `ITM-M003: unsupported annotation marker 1 rejects the record`
- `ITM-M003: unsupported annotation marker {} rejects the record`
- `ITM-M003: unsupported annotation marker [] rejects the record`
- `ITM-A001: exact reconciled source ID assigns speech despite title and formatting differences`
- `ITM-A002: an unknown source ID survives as an unassigned gap`
- `ITM-A003: missing author ID stays missing despite quoted names and a preceding speaker`
- `ITM-A003: null author ID stays missing despite quoted names and a preceding speaker`
- `ITM-A004: malformed source author ID 0 rejects rather than guessing`
- `ITM-A004: malformed source author ID -1 rejects rather than guessing`
- `ITM-A004: malformed source author ID 1.5 rejects rather than guessing`
- `ITM-A004: malformed source author ID true rejects rather than guessing`
- `ITM-A004: malformed source author ID {} rejects rather than guessing`
- `ITM-A004: malformed source author ID [] rejects rather than guessing`
- `ITM-A004: malformed source author ID 9007199254740992 rejects rather than guessing`
- `ITM-A004: malformed source author ID "01" rejects rather than guessing`
- `ITM-A004: malformed source author ID "name" rejects rather than guessing`
- `ITM-A005: contradictory structured new_author_id is a conflict, never a label comparison`
- `ITM-A006: a matching optional structured identity preserves assignment`
- `ITM-A007: optional second identity does not repair a missing authoritative author_id`
- `ITM-A008: malformed optional structured identity true rejects the replacement`
- `ITM-A008: malformed optional structured identity {} rejects the replacement`
- `ITM-A008: malformed optional structured identity -1 rejects the replacement`
- `ITM-A008: malformed optional structured identity "01" rejects the replacement`
- `ITM-A009: embedded names and quotation text do not transfer a valid turn to another member`
- `ITM-T001: original source speech timestamp 1000 is opaque and preserved`
- `ITM-T001: original source speech timestamp "" is opaque and preserved`
- `ITM-T001: original source speech timestamp "unknown source time" is opaque and preserved`
- `ITM-T001: original source speech timestamp null is opaque and preserved`
- `ITM-T002: missing speech timestamp stays null`
- `ITM-T003: unsupported source speech timestamp true rejects the replacement`
- `ITM-T003: unsupported source speech timestamp {} rejects the replacement`
- `ITM-T003: unsupported source speech timestamp [] rejects the replacement`
- `ITM-N013: historical source text, null context, and empty speech time remain unchanged`
- `ITM-N014: normalization emits the exact validated sitting identity and official record link`
- `ITM-I001: mismatched raw date identity rejects the replacement`
- `ITM-I001: mismatched raw filename identity rejects the replacement`
- `ITM-I001: mismatched raw is_final identity rejects the replacement`
- `ITM-I002: mismatched raw cycle term rejects the replacement`
- `ITM-I002: mismatched raw cycle session rejects the replacement`
- `ITM-I002: mismatched raw cycle meeting rejects the replacement`
- `ITM-I002: mismatched raw cycle house rejects the replacement`
- `ITM-I003: a wrong source meta record path rejects the replacement`
- `ITM-N015: malformed speeches container null never establishes an empty valid record`
- `ITM-N015: malformed speeches container {} never establishes an empty valid record`
- `ITM-N015: malformed speeches container "empty" never establishes an empty valid record`
- `ITM-N015: malformed speeches container undefined never establishes an empty valid record`
- `ITM-N016: a fully validated source response may contain an explicitly empty speeches array`
- `ITM-R001: ready means matching assigned turns and no speaking gaps, while annotations remain separate`
- `ITM-R002: validated zero matching turns without gaps yields verified absence with draft status preserved`
- `ITM-R003: a complete validated empty source array yields verified absence`
- `ITM-R004: speaking gaps force incomplete whether selected turns exist (true)`
- `ITM-R004: speaking gaps force incomplete whether selected turns exist (false)`
- `ITM-R005: all gap kinds and annotations survive in source order with their original details`
- `ITM-R006: known missing-ID index 2 remains an accessible gap despite the visible member name`
- `ITM-R007: unavailable sitting keeps known identities and source details without inventing accepted times`
- `ITM-R008: result preserves exact selected identity copies, digest, schema, and source provenance`
- `ITM-R009: historical result preserves supplied identity and null context without label-derived constituency`
- `ITM-R010: mismatched shard schemaVersion never yields participation conclusions`
- `ITM-R010: mismatched shard sittingId never yields participation conclusions`
- `ITM-R010: mismatched shard sourceUrl never yields participation conclusions`
- `ITM-R011: mismatched shard identity date rejects instead of matching display names`
- `ITM-R011: mismatched shard identity parliament rejects instead of matching display names`
- `ITM-R011: mismatched shard identity penggal rejects instead of matching display names`
- `ITM-R011: mismatched shard identity mesyuarat rejects instead of matching display names`
- `ITM-R011: mismatched shard identity house rejects instead of matching display names`
- `ITM-R011: mismatched shard identity filename rejects instead of matching display names`
- `ITM-R011: mismatched shard identity isFinal rejects instead of matching display names`
- `ITM-R012: unknown member rejects even when source display names are familiar`
- `ITM-R012: unknown sitting rejects even when source display names are familiar`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"4463","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"999999","memberId":"999999","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":1,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"annotation","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":null,"attribution":"unassigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":7,"rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R014: duplicate shard indices are rejected instead of silently omitting a turn`
- `ITM-R015: an accepted descriptor requires its matching shard and never substitutes unavailable`
- `ITM-R016: an unavailable descriptor cannot accept an unrelated supplied shard`
- `ITM-R017: returned identities and item collections do not alias mutable catalogue or shard input`
- `ITM-R019: shard partitions must match the accepted descriptor source accounting`
- `ITM-R018: malformed device refresh instant not-a-time rejects`
- `ITM-R018: malformed device refresh instant 2026-10-10 rejects`
- `ITM-R018: malformed device refresh instant 2026-10-10T06:00:00+08:00 rejects`

## GREEN gate

T011 remains gated on this RED and the separate T008 schema GREEN. Subsequent GREEN,
regressions, type validation, and refactor/no-refactor decisions will be appended only
when actually run. No browser, full-archive, performance, deployment, or live-source
accuracy claim is established by these unit assertions.

## Additional boundary RED before implementation

The official temporary response envelope was read without a network call: all three
source response files contain `pageProps` with `meta`, `cycle`, `date`, `filename`,
`speeches` and `is_final`. Added `ITM-N017` for that observed wrapper and `ITM-I004`
for an unreconciled selected sitting ID. These are feature-boundary assertions rather
than fixture-shape assertions. All helper/callback documentation also received explicit
`@param` and `@returns` tags; invalid-boundary callbacks document propagated errors.

Ran the same exact RED command above against unchanged inert source entry points:
**122 tests failed out of 122**, exit 1, with no fixture/import/syntax/harness error.
`ITM-N017` observed the inert shard missing `schemaVersion`, `sittingId` and its
required gap item. `ITM-I004` observed `expected [Function] to throw an error`.

Updated test SHA-256: `68d472531db00b2bc6b4d6db53d11ff0149eb708b0716b88ebb7e6c132d9a7ae`.
The inert source SHA-256 remained
`f8551ec4ec07d2cb0c83ddbaed23431fd0599222738bdd6b06340c038e3679eb`.


## Complete normalized trust-boundary RED before implementation

Added malformed published-item fields to `ITM-R013`, malformed shard item containers to
`ITM-R020`, all separate selected turns in source order to `ITM-R021`, and nullable
unavailable refresh metadata to `ITM-R022`. Also corrected controlled unavailable
catalogue summary counts/failed-attempt metadata before asserting semantic outcomes;
these fixtures are now coherent when the schema validator runs.

The same exact RED command above exited 1: **141/141 tests failed by assertion** against
the unchanged inert source entry points. No input/fixture/import/syntax/harness error
counts as RED. `npm run typecheck` with the same Node 24 PATH exited 0.

Test SHA-256 at this RED: `ab727f46ed334dcf9777a55e07095d51e2f7c8ef257f95305bc0123e6ba6ba59`.
The normalization/result entry points remained inert. The independently gated schema
implementation was being written concurrently, so a stable whole-module fingerprint
will be recorded by a repeated RED run before item/result production implementation.

New observed failure identifiers:

- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":"7","sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":-1,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[7],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":7,"sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"01","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":{},"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"unknown","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":null,"attribution":"assigned","timestamp":1010,"gapReason":null} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":"1839","attribution":"assigned","timestamp":1010,"gapReason":"missing-id"} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":null,"attribution":"annotation","timestamp":1010,"gapReason":"missing-id"} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":null,"memberId":null,"attribution":"unassigned","timestamp":1010,"gapReason":"unknown-id"} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":"1839","memberId":null,"attribution":"unassigned","timestamp":1010,"gapReason":"unknown-id"} rejects before filtering`
- `ITM-R013: malformed normalized item {"ordinal":0,"sourceIndex":7,"sectionPath":[],"text":"Original words.\n\nSecond paragraph.","rawAuthor":"Tuan Lim Guan Eng [Bagan]","sourceAuthorId":null,"memberId":null,"attribution":"unassigned","timestamp":1010,"gapReason":"conflicting-id"} rejects before filtering`
- `ITM-R020: malformed shard items null rejects rather than becoming an empty subset`
- `ITM-R020: malformed shard items {} rejects rather than becoming an empty subset`
- `ITM-R020: malformed shard items "empty" rejects rather than becoming an empty subset`
- `ITM-R020: malformed shard items undefined rejects rather than becoming an empty subset`
- `ITM-R021: all selected turns remain separate and ordered among other speakers and annotations`
- `ITM-R022: unavailable content never receives a successful pair refresh timestamp`


## Stable module fingerprint RED confirmation

After the separate schema implementation settled, reran the same exact RED command above.
Exit 1: **141/141 behavioral assertion failures**; item/result entry points remained inert.
Pre-run and post-run source SHA-256 matched: `f60f5d2b5837d0c867b9e3e6c344482a6364f2adeda1f90269312ed83017a515`.
Test SHA-256: `ab727f46ed334dcf9777a55e07095d51e2f7c8ef257f95305bc0123e6ba6ba59`.
Every existing named acceptance assertion still observed missing behavior; every named
malformed-input assertion still observed the required rejection missing. No harness error occurred.


## Raw integer versus published string ID RED

The source member/inventory IDs are safe integers; published IDs are canonical decimal strings.
Added raw numeric-string values `"1839"` to `ITM-A004` and `ITM-A008` before implementation.
Both observed `expected [Function] to throw an error` against inert normalization.
The same exact RED command exited 1: **143/143 assertion failures**; no harness errors.
Pre/post source SHA-256: `ae345a318a633eda336d7c3e5a502d80376fa6f76c3e584330d64ed854adbc86`.
Test SHA-256: `845bb499bc1656617c084b4fe0d114b969bc35b899ba08a7af9793da0888043d`.


## Nonfinite opaque-number timestamp RED

Before item/result implementation, added invalid `Number.NaN`, positive infinity and
negative infinity to raw timestamp rejection (`ITM-T003`), plus NaN/positive infinity
normalized timestamp rejection (`ITM-R013`). Opaque source time accepts numbers/strings/
null, but nonfinite numbers cannot preserve stable JSON values and must reject.

The same exact RED command exited 1: **148/148 assertion failures**. Each of these five
additional cases observed `expected [Function] to throw an error` against the unchanged
inert normalizer/result entry points. No fixture/import/syntax/harness errors occurred.
The JSON-based Vitest name formatter prints nonfinite numbers as `null`; the code's
parameter values are explicitly listed here to distinguish them from valid null time.

Test SHA-256 during this run: `dbe12e2d4880d55180eb98eae7771954188537525124098871774b79553cbd6f`.
Source SHA-256: `ae345a318a633eda336d7c3e5a502d80376fa6f76c3e584330d64ed854adbc86`.
A subsequent documentation-only change added the descriptor-mutation `@remarks` tag
requested by the documentation checker; no assertion behavior changed.


## First item/result GREEN and requested schema timestamp regression RED

Ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-items.test.ts tests/unit/source-schema.test.ts tests/unit/harness.test.ts
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
```

Both exited 0: **299/299 tests passed** across three files, including 148 item/result
assertions and the existing schema/harness regressions. The initial implementation run
had 147/148 item passes and one fixture error: historical shard fixtures updated only
their own gap count instead of summing every catalogue descriptor. The fixture helper
was corrected to preserve a coherent catalogue; this was not a production defect or RED.

Root review requested known-at-preparation timestamp validation. Before changing its
production behavior, added three `SCHEMA-KNOWN-AT-PREPARATION` regressions to
`source-schema.test.ts`, covering `status.completedAt`, accepted `record.acquiredAt`
(with matching later attempt), and `record.lastAttemptAt` later than `preparedAt`.
Ran the schema-only command using the same Node 24 PATH. Exit 1: **3 assertion failures**
with all existing 150 schema cases passing. Each new case observed
`expected [Function] to throw an error`; current validation accepted the future metadata.
No fixture/import/syntax/harness error occurred.

RED SHA-256 `src/source.ts`: `c3a53709f02474a1e2338c99bd8e2c33cd9c8ddf73dcdbcbeb06dd6a60ce1fe6`.
RED SHA-256 `tests/unit/source-schema.test.ts`: `c3a062587b31eac2bd999f455377e99d5fa972fca3dea63e86243b18df419a5c`.


## Final T011/T012 GREEN, regression, and documentation review

After the three observed timestamp regressions, the smallest source-validator change
rejects acquisition attempts/acquisition and pipeline completion later than `preparedAt`.
These are already-known snapshot events, not inferred official publication times.

Ran the exact combined item/schema/harness regression command and typecheck shown above:
both exited 0, **302/302 tests passed** across three files (148 item/result, 153 schema,
one harness). Intentional future acquisition/performance/documentation RED suites were
excluded from this phase's regression command; no pass is claimed for those gates here.

Implementation scope: recursive original-heading/array traversal, every leaf retained
once, exact decoded text/label/time preservation, sequential ordinals, noncontiguous
unique provided indices, conservative markers/structured ID attribution, strict shard
identity/all-leaf accounting, and self-contained semantic selected results. Shared
`validateSittingRecord(value, sitting, catalogue)` and `sourceAccounting(items)` exports
are available to concrete acquisition/static consumers. Normalizing a changed source
record deliberately does not compare its new counts to the old accepted descriptor;
published-shard validation does require exact descriptor counts. Digest/byte verification
belongs to the later retrieval/publication boundary and is not claimed by this validator.

The six-leaf excerpt's normalized categories reconcile as 3 assigned + 2 unassigned +
1 annotation = 6 source leaves. The missing-ID question at original index 2 survives as
an ordered, original-text gap. Incomplete outcomes persist for both empty and populated
selected subsets; source annotations never establish assigned member speech. Controlled
empty valid arrays can establish supplied-record absence; malformed/missing trees cannot.

Mechanical function/method documentation review ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH node --input-type=module
```

Its module script imported `checkCodeDocumentation` from
`scripts/check-documentation.ts`, called it for this checkout, and printed findings for
`src/source.ts`, `tests/unit/source-items.test.ts` and `tests/unit/source-schema.test.ts`.
Exit 0 with no findings for these three files. Manual contract review confirmed purpose,
parameter/return tags, propagated validation errors, and captured/fixture mutation remarks.
This is code-comment review, not candidate-specific human documentation accuracy evidence.

REFACTOR: no additional refactoring needed. Existing shared schema helpers are reused;
normalization/result/accounting rules live in the authoritative source module, no other
module contains a second filtering/attribution definition. No unrelated code was changed.

Final working-tree fingerprints (the last source change only clarified its @throws tag):

- `src/source.ts`: `4c19bccb1a73afcaba2cfc41340c39821e91c0674eda0c506f31947ede7ab3b4`.
- `tests/unit/source-items.test.ts`: `860a4c0b24dd4704a84eb8da6855bf41f005360d41b800a3a331d784903f32ec`.
- `tests/unit/source-schema.test.ts`: `c3a062587b31eac2bd999f455377e99d5fa972fca3dea63e86243b18df419a5c`.

Remaining boundary: partial fixtures do not establish complete-archive/source accuracy,
actual-browser PWA behavior, publication, physical-device performance or real-user metrics.


## Self-contained snapshot provenance regression RED

Read-only connected-contract review identified that result records had `snapshotId` and
source acquisition provenance, but omitted the accepted snapshot preparation/publication
metadata, coverage, and known workflow status. An older saved pair could otherwise be
shown with a newer catalogue's metadata. Root authorized correcting the foundational
result contract before reader/storage implementation.

Added `ITM-SNAPSHOT001` (nullable publication with exact snapshot metadata),
`ITM-SNAPSHOT002` (confirmed publication distinct from preparation/acquisition/device
validation), and `ITM-SNAPSHOT003` (old result retains independent accepted metadata
when a valid newer catalogue changes), before adding production fields.

Exact command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-items.test.ts -t ITM-SNAPSHOT
```

Exit 1: **3/3 new assertions failed**, 148 existing item cases were skipped. Each
failure observed the required `snapshot` metadata missing from the produced result.
The third case builds both valid old/new results before asserting the old result's
metadata; neither source fixture nor catalogue validation failed. No syntax, import,
dependency, fixture, or harness error counts as RED.

RED SHA-256 `src/source.ts`: `4c19bccb1a73afcaba2cfc41340c39821e91c0674eda0c506f31947ede7ab3b4`.
RED SHA-256 `tests/unit/source-items.test.ts`: `b3701ffd2f043c10ef7c031651c48641ce6c4408438fc4e22f2790d884f9ef21`.


## Self-contained snapshot provenance GREEN

After the three recorded assertions failed, added the typed `TranscriptResult.snapshot`
field as `Pick<Catalogue, 'preparedAt' | 'publishedAt' | 'coverage' | 'status'>`.
`buildTranscriptResult` includes these accepted values in its existing structured clone,
so old saved results retain independent nested coverage/status/receipt data while later
catalogues change. Preparation/publication/acquisition/device timestamps remain distinct;
nullable publication time is not populated by inference. No separate metadata authority
or additional reader/storage feature was introduced.

Exact regression command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-items.test.ts tests/unit/source-schema.test.ts tests/unit/documentation.test.ts tests/unit/harness.test.ts
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
```

Regression exit 0: **352/352 assertions passed** across four files. An initial concurrent
checkout-wide typecheck was temporarily blocked by an independently edited acquisition
fixture using Buffer as Response body; that test's owner repaired its fixture typing.
Reran the exact typecheck after the repair: exit 0. No source/result error was hidden or
counted as a feature RED. Documentation AST review reported no findings for the changed
source module or item test file; the result constructor's return documentation names
accepted snapshot metadata explicitly.

REFACTOR: no additional refactoring needed; the existing clone establishes the new
self-contained metadata contract with one field and one literal projection.

GREEN SHA-256 `src/source.ts`: `67d8ec67b0b1a8a62831615a44eceb201e18b8a28a2729d71585372b904c5ef7`.
GREEN SHA-256 `tests/unit/source-items.test.ts`: `b3701ffd2f043c10ef7c031651c48641ce6c4408438fc4e22f2790d884f9ef21`.
