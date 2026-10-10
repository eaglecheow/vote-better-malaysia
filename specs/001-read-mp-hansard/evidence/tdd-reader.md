# T018 reader behavior RED evidence

The operation is on the implementation working tree on 2026-10-10. Reader behavior
remained inert in `src/main.ts`: `mountReader` returned a nonfunctional cleanup callback.
Unit setup supplied empty inert native controls so tests could dispatch events and reach
behavioral assertions without null/import/fixture failures. Those controls supplied no
labels, request handling, rendering, language or generation behavior.

`readerFixture` preserves the six source-derived recent leaves for the gaps branch.
Ready/absence/untrusted/unavailable branches are explicitly controlled synthetic cases;
no source completeness or real-source absence is claimed. Metadata/digest/gzip bytes are
controlled coherent test values around those source strings, not an acquired release.

## Observed RED

Exact command:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/reader.test.ts
```

Exit 1: **29/29 behavioral assertions failed**. Representative failures were expected
`en` to be `ms`, empty controls to contain exact source IDs, all seven choices to match
the two searched identities, empty source arrays to equal original strings, missing
semantic/identity attributes to equal the expected pair, missing gap text to equal the
known question, and missing timing marks to contain the required completion names.
Every case below observed an assertion failure for missing required reader behavior.
No syntax/import/dependency/fixture/test-harness failure counts as RED. An initial jsdom
fixture import.meta URL was HTTP rather than file: it was repaired to a Node filesystem
fixture path before this recorded run; those earlier fixture failures were excluded.

The messages subset independently recorded 83 behavioral RED assertions before its
implementation in `tdd-messages.md`. Unit DOM tests do not prove native-browser layout,
real paint, glyph rendering, screen-reader behavior, native gzip or physical devices.

## Per-case observed missing behavior

- `READER001: first visit defaults to BM with labeled native controls and equivalent language choices`
- `READER002: similar source names stay distinct with exact IDs and supplied historical context`
- `READER003: name search filters source choices without changing their IDs or names`
- `READER004: all dated sitting choices remain selectable including unavailable records and Mesyuarat 0`
- `READER005: missing both selection is identified without a pair request`
- `READER005: missing member selection is identified without a pair request`
- `READER005: missing sitting selection is identified without a pair request`
- `READER006: valid Read shows loading and calls only the exact selected pair`
- `READER007: attributed turns preserve every exact word, paragraph, heading, source index and time`
- `READER008: known missing-ID question is an accessible original-text gap and never assigned by its visible name`
- `READER009: every gap and annotation retains its original words and source order separately`
- `READER010: controlled ready stays a distinct semantic result`
- `READER010: controlled absence stays a distinct semantic result`
- `READER010: controlled unavailable stays a distinct semantic result`
- `READER011: empty attributed subset with source gaps stays incomplete and retains all gap passages`
- `READER012: pair/source identity, draft status and official link are visible with exact context`
- `READER013: successful source, snapshot and device times keep distinct truthful labels`
- `READER014: unavailable historical membership and official dates are explicit rather than label-derived`
- `READER015: untrusted transcript and author strings are text nodes with exact bytes rather than executable markup`
- `READER016: language switching preserves selected source IDs, every transcript byte, and focus`
- `READER017: loading and results announce through a polite live region without moving Read focus`
- `READER018: changing member-select clears the old result before another request`
- `READER018: changing sitting-select clears the old result before another request`
- `READER019: a late old response cannot replace the newer selected pair`
- `READER020: switching language during a pending request retains IDs and renders its result in the chosen UI language`
- `READER021: readiness marks follow populated controls and interaction ends after the supplied paint boundary`
- `READER022: bilingual help links to reachable user guidance under the repository base`
- `READER023: retrieval errors preserve controls and never produce an empty participation result`
- `READER024: cleanup prevents a late request from rendering into a disposed reader`

## RED working-tree fingerprints

- `src/main.ts`: `0b938535f106696479c2687fbcee1eb4309ebcb976a53ec3cc5573ebcae914b5`.
- `tests/unit/reader.test.ts`: `11382c45c821e1445e5ea67c987fda8e75ca8894cd769d4a148ce9963658add5`.
- `tests/fixtures/reader.ts`: `919b715ef5c9b48bce435f3fcabd239aea6e85e5d1a7cf7ec70d7d26b6a6c1ea`.

## Additional request/list boundary RED

Before main production, added READER025 for same-pair repeated-Read generation protection
and READER026 for initial catalogue retrieval errors. Repeated the exact reader command above:
exit 1, **31/31 behavioral assertion failures** against unchanged inert main.
READER025 observed missing refreshed-at text instead of the newer successful timestamp;
READER026 observed empty status rather than announced static-list retrieval error.
No fixture/import/syntax/harness error occurred.
Test SHA-256: `e88d35f505cb9e52a98f4a819f0f425903a5543ba98f3056886397540fed64a8`.

## Current UI pair-boundary RED

Before production, READER027 supplies a separately valid source result for a different
member than the current controls. The filtered reader command with `-t READER027`
exited1: one assertionfailure (31skipped), observedempty status ratherthan the
required error/withheld-result response. This supplements source validation without
duplicating source attribution rules. No fixture/harness errors occurred.
Test SHA-256: `b607a3b4881dada0d52f982973dc8082c5b8208c193b7046c4a22a5d93d4a2b7`.

## Provenance-label regression RED

Root review identified coverage using the transcript acquisition label alongside the
source inventory acquisition time. Before fixing it, READER028 asserted that coverage
must not use the successful transcript-acquisition label. Filtered command with
`-t READER028` exited1: one behavioralassertionfailure (32skipped). Actualcoverage
contained thatlabel and inventory timestamp, violating distinct timestamp meanings.
RED SHA-256 `src/main.ts`: `27a672e6e3f631b467249282150d389b34c56ee9da336e7b2ce708b8519eb041`.
RED SHA-256 `tests/unit/reader.test.ts`: `d73ba6bcfe5125aef3f3a3382a35161d56494db32b19089441a29c3de4abc25d`.


## T023/T024 reader GREEN and documentation review

Only after the reader assertions and message assertions had their recorded RED, and
root confirmed T021 static retrieval GREEN, implemented `mountReader` with labeled native
search/select controls, BM default, English equivalence, stable source IDs, exact text-node
rendering, complete ordered category partitions and nullable historical/source metadata.
The reader uses authoritative results from `src/source.ts`, never recomputes attribution
or derives identity from labels/prose. Selection changes and repeated Read advance request
generation and abort previous requests; obsolete completions are withheld even if a provider
ignores cancellation. Provider pair IDs must match the snapshotted current request.

Readiness marks follow usable populated controls; interaction completion follows injected
unit paint completion or two native browser animation frames. This records a paint
opportunity, not proof of a particular compositor paint or physical-device performance.
`hansard.reader-ready` in this online increment describes initial controls/catalogue;
future saved-reader readiness must include the required US3 restoration/commit/cache checks.

CSS provides paragraph-preserving `pre-wrap`, word wrapping, native control widths,
visible keyboard focus and a one-column small-screen form. Its actual visual/browser
acceptance remains the T019/T028 native production-browser gate, not these DOM unit checks.
Help is a repository-relative `./help.html#ms` / `#en` destination; root owns its bilingual
published HTML/user-guide preparation and browser reachability verification.

Exact commands:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/reader.test.ts tests/unit/messages.test.ts
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck
```

Both exited0: **116/116 unit assertions passed** (33 reader, 83 messages). Initial
production typing had a Promise<void> resolver passed directly as a numeric RAF callback;
a documented zero-argument wrapper repaired this type error. It was not behavioral RED.
Mechanical code-documentation scan reported no findings for `src/main.ts`,
`tests/unit/reader.test.ts`, or `tests/fixtures/reader.ts`; manual review checked parameters,
returned values, propagated fixture errors and native/captured mutation remarks.

REFACTOR: no additional refactoring needed. One concrete mount boundary supplies its
own document context and explicit retrieval/timing dependencies; no separate view-model,
state framework or duplicated source filtering rule was introduced. The request provider
returns complete authoritative result objects, which the DOM displays as text.

T019 browser journeys were authored before main production and passed TypeScript checks;
root then took browser-file execution/review ownership. No real browser pass is claimed
here before that run finishes. No offline saving, worker/update, full-source completeness,
actual hardware, publication or real-user metric pass is established by these unit results.

Final working-tree fingerprints:

- `src/main.ts`: `c6f8552525e9e378e7aacf058e9d33f48a032ddec64b45956e23a05344bb2189`.
- `src/styles.css`: `71d8d72d0ef5feac1f5fefdfd37e8f8a1bdb468be73d1499fce0796ff4176bc3`.
- `tests/unit/reader.test.ts`: `d73ba6bcfe5125aef3f3a3382a35161d56494db32b19089441a29c3de4abc25d`.
- `tests/fixtures/reader.ts`: `919b715ef5c9b48bce435f3fcabd239aea6e85e5d1a7cf7ec70d7d26b6a6c1ea`.
