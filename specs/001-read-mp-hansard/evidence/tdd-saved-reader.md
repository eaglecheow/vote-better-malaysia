# T047 saved-reader coordination RED

Recorded 2026-10-10 before T054 production. The existing online reader received only
root-owned optional dependency types (`openStorage`, `updates`, `online`); it never
reads or executes them yet. Tests call the actual `mountReader` in jsdom and observe
missing stored-reader/update integration, without implementing it in scaffolding.
US3 production still requires US2 T044 and the corresponding T049 gate.

## Controlled boundary and presentation

The existing `ReaderStorage` API supplies independently controlled catalogue/preferences,
saved/missing/incompatible exact pairs and transaction-completion promises. `UpdateClient`
supplies independently controlled confirmed-shell state and observer events. These mocks
record calls and return explicit boundary outcomes; they do not validate source, persist
data, activate workers, reload tabs or establish offline behavior. Source compatibility
remains authoritative in source/storage modules, not duplicated in reader tests.

The old source-derived excerpt has one selected turn, all two unassigned passages and
its annotation. Tests compare every rendered original text in order, exact selected IDs,
own source/snapshot metadata and successful times. Unchanged-byte refresh preserves the
digest while advancing the controlled successful device time. The changed-byte branch
explicitly appends synthetic fixture text and recomputes the coherent descriptor digest,
decoded bytes and gzip length. Neither branch claims real full-source absence or live
source acquisition.

Native semantic selectors agreed for integration/browser tests:

- `#reader-save-status` with `data-saved=true|false` reflects the current transcript.
- `#reader-offline-status` with `data-offline-ready=true|false` separately reflects
  confirmed reader reopening readiness, with a distinct older-copy notice when applicable.
- `#reader-update-offer[data-update-version]`, `#reader-update-status`,
  `#apply-update-button` and `#continue-update-button` represent the actual waiting offer.
- `[data-field=saved-refreshed-at]` and `[data-field=prior-saved-refreshed-at]` keep
  committed/prior times separate from the current successful `refreshed-at`.

Exact equivalent BM/EN notice/control wording is frozen in test constants. Production
message maps have not been edited. A later authoritative message implementation must keep
transcript-saved versus reader-ready meanings distinct; regex matching only “saved” is
insufficient because it also matches “not saved”.

## Tested working tree and command

Base HEAD: `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

| File | SHA-256 |
|---|---|
| `tests/unit/saved-reader.test.ts` | `d4bba3316a5411d66fb52c9b8244d96d0754c9b708b530de4890f72166d3a832` |
| `src/main.ts` online reader plus type-only dependencies | `26484c98643148f5bdfa71f87b287cb527173d025716c4753144c41b691c498f` |
| `src/messages.ts` existing reader plus inert recovery labels | `a5a4f18bba88b4688229af4b0643ae778f251ace045d211ea83bb2c0fe48883d` |
| `src/storage.ts` inert API | `234dcdcd3b8b46e58d86702bd6789a5d3862866c7565b0219c82670ff08b82ec` |
| `src/updates.ts` inert API | `fd20c577239e028a834f01e09d993c3c3995133e7642d658cec71ece6020d9aa` |
| `tests/fixtures/reader.ts` | `919b715ef5c9b48bce435f3fcabd239aea6e85e5d1a7cf7ec70d7d26b6a6c1ea` |

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/updates.test.ts tests/unit/saved-reader.test.ts
```

Final observed run started `13:59:25`, Vitest 5.0.3: **39/39 saved-reader cases failed**
plus 24/24 update-client cases, 63 total, exit1, duration1.02seconds. Every case reached
behavioral assertions. The first exploratory saved-reader run had invalid null/string
matcher combinations on missing metadata nodes; those matcher errors are excluded.
The helper was repaired to return an empty string for missing DOM text, then the final
run observed actual `expected '' to contain <successful timestamp/original label>`
failures. No TypeError, ReferenceError, SyntaxError, unhandled error or invalid matcher
combination remained. No feature implementation was introduced during the repair.

Combined temporary log SHA-256:
`5bb9c3add45c1703cd2b5ac57d83d2af6b745ba3878eb7546bc0a5ee3b42228b`.
Durable observed failures are below. Root's earlier301-case aggregate run is provisional
for the final saved-reader test hash pending its independent rerun after the focused
assertion-flow repairs documented below.

| Identifiers (both `ms` and `en`, except SAVED017) | Required behavior | Actual assertion RED |
|---|---|---|
| SAVED001 | Restore valid saved catalogue/locale/exact selected pair offline, all source partitions and own successful time | Turn/gap/annotation arrays were empty instead of complete originals; selected result IDs were null, controls empty, saved/offline notices empty, saved time absent; EN locale remained default BM. |
| SAVED002 | Another member in the same fetched sitting remains offline-unsaved | Status showed generic published-data error rather than connection requirement; exact other-pair storage read was absent; offline-ready attribute absent rather than false. |
| SAVED003 | Incompatible saved data is unavailable and requires valid online retrieval | Generic data error appeared instead of compatibility notice; not-saved notice was absent. No-source-absence/save guards executed. |
| SAVED004 | Revalidate selected online pair, atomically save complete new result and display separate saved/offline-ready notices | Pair load and save spies had no expected calls; complete source partitions/IDs, notices, saved/ready attributes and current/committed successful times were absent. |
| SAVED005 | Unchanged bytes still advance current validation time and saved time on commit | Save was not called; both later successful time fields were empty. Controlled digest-equality precondition passed and is not counted as RED. |
| SAVED006 | Changed validated bytes save every new source turn/gap/annotation | Complete accepted partitions were absent and save spy was not called with the new full result. Controlled changed-digest precondition passed. |
| SAVED007 | Failed save leaves complete new online result unsaved and identifies prior offline copy/time separately | New complete source was absent; not-saved/older-copy notices, false saved flag and both distinct successful time fields were absent. Input saved:false guard executed. |
| SAVED008 | Pending transaction cannot acknowledge save or advance its committed time | Pending not-saved/prior-time fields were absent; after explicit commit resolution, saved notice and new committed time were still absent. Early-new-time exclusion guard executed. |
| SAVED009 | Committed transcript plus unconfirmed shell stays saved without offline-reopen promise | Both distinct notices were absent; offline-ready attribute was undefined rather than false. |
| SAVED010 | Failed new-shell attempt cannot revoke older confirmed compatible reader | Complete saved source was absent and saved/offline-ready notices remained empty after the controlled failed-attempt observation. |
| SAVED011 (`hash`, `identity`, `schema` in each locale) | Failed validation preserves prior accepted content/time and never saves failed data | All complete prior partitions/IDs and prior current/committed successful time fields were absent. No-save guard executed. These are coordinator boundary failures; actual hash/schema/identity validation is tested in source/storage suites. |
| SAVED012 | Storage-open denial leaves valid online reading usable with an honest limit | Existing online reading/content assertions passed, but storage-unavailable and unconfirmed-offline notices were missing. Those missing notices, not already-working reading, establish RED. |
| SAVED013 | Newer cached inventory cannot relabel older saved source identities or snapshot/provenance | Original member heading and old prepared/acquired fields were empty; complete saved source was absent. |
| SAVED014 | Native Apply offers equivalent BM/EN controls and persists current valid IDs/language | Labels were empty, native Apply button null, apply spy called0 instead of1, recorded actual persistence callback undefined instead of function, and saveState lacked the exact current catalogue/locale/member4463/sitting29326 call. |
| SAVED015 | Continue preserves complete reading/preferences/focus without activation | Native Continue button was null, all complete reading arrays/IDs were missing, and Continue spy called0 instead of1. Startup saveState calls are cleared before observing this action. No-Apply/no-additional-persistence guards execute; actual focus check requires a native button and remains unreached when it is missing. |
| SAVED016 | Saved-reader readiness mark occurs only after complete matching saved pair is usable | After resolving the saved read, observed marks lacked `hansard.reader-ready`. Pre-release withholding guard executed. |
| SAVED017 (one two-root case) | Applying in one reader cannot alter another reader's complete reading | Native Apply button was null, consenting apply spy called0 instead of1, and every other-reader original partition/identity was missing. Other-instance no-Apply guard executes; direct client-scoped reload also has UPDATE009 RED. Same-document roots are unit isolation, not actual native multi-tab proof. |
| SAVED018 | First offline visit with no committed list cannot invent source inventory/absence | Generic data error appeared instead of the locale's unsaved-list connection requirement. No-turn/no-load/no-save guards executed. |

## Checks and remaining gates

Full `npm run typecheck` passed in the final run, exit0. An intermediate rerun identified
a concurrent browser-fixture callback type error in `tests/fixtures/pwa.ts:153`;
its owner repaired it. That unrelated harness type error was not counted as RED.
Owned callable documentation scan returned `[]`; owned whitespace checks passed.

No saved-reader production, GREEN/refactor result, actual IndexedDB/Cache Storage,
service-worker activation, real two-tab continuity or offline promise is claimed.
After T044/T049 permit implementation, keep source classification authoritative,
make these39 unit cases GREEN, document the necessary/no-refactor decision, and execute
T048/T055 actual native-browser commit, failure, waiting-update and closed-reader journeys.

## Focused assertion-flow repair before production

Root authorized a test-only repair of SAVED014/015/017 after reviewing the provisional
run: missing-button assertions became soft assertions followed by optional actual native
clicks. No substitute callback, fake update action or production behavior was introduced.
SAVED014 conditionally invokes only the actual callback recorded from `updates.apply`,
if it exists, and always asserts the required `saveState` call. SAVED015 clears only
startup saveState observations before checking Continue adds no preference write.
The final39 cases are now frozen at the hash above.

Every observed failure message for these repaired cases follows (repeated original-text
array errors correspond, in order, to turn, gaps and annotation):

```text
SAVED014 ms
AssertionError: expected '' to be 'Gunakan kemas kini' // Object.is equality
AssertionError: expected '' to be 'Teruskan membaca' // Object.is equality
AssertionError: expected null not to be null
AssertionError: expected "vi.fn()" to be called once, but got 0 times
AssertionError: expected undefined to be type of 'function'
AssertionError: expected "vi.fn()" to be called with arguments: [ { schemaVersion: 1, …(8) }, …(1) ]

SAVED014 en
AssertionError: expected null not to be null
AssertionError: expected "vi.fn()" to be called once, but got 0 times
AssertionError: expected undefined to be type of 'function'
AssertionError: expected "vi.fn()" to be called with arguments: [ { schemaVersion: 1, …(8) }, …(1) ]
AssertionError: expected '' to be 'Apply update' // Object.is equality
AssertionError: expected '' to be 'Continue reading' // Object.is equality

SAVED015 ms
AssertionError: expected null not to be null
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected [] to deeply equal [ …(2) ]
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected null to be '1839' // Object.is equality
AssertionError: expected null to be '29326' // Object.is equality
AssertionError: expected "vi.fn()" to be called once, but got 0 times

SAVED015 en
AssertionError: expected null not to be null
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected [] to deeply equal [ …(2) ]
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected null to be '1839' // Object.is equality
AssertionError: expected null to be '29326' // Object.is equality
AssertionError: expected "vi.fn()" to be called once, but got 0 times

SAVED017
AssertionError: expected null not to be null
AssertionError: expected "vi.fn()" to be called once, but got 0 times
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected [] to deeply equal [ …(2) ]
AssertionError: expected [] to deeply equal [ Array(1) ]
AssertionError: expected null to be '1839' // Object.is equality
AssertionError: expected null to be '29326' // Object.is equality
```

The abbreviated saveState arguments above are the complete fresh accepted catalogue plus
`{language:'ms'|'en', memberId:'4463', sittingId:'29326'}`. An actual callback is absent,
so invoking its body is still impossible in this initial run; its missing function and
missing exact persistence call are observed RED. Focus-with-existing-button assertions
and negative no-activation/preservation guards that already pass inert code are not
presented as independently observed feature failures.
