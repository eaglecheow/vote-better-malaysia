# T045 storage unit RED

Recorded 2026-10-10, before storage production. T050 remains blocked by US2 T044 and
the aggregate T049 gate. This report establishes the storage subset's unit RED only;
it does not establish native-browser IndexedDB, service-worker, shell-cache, or offline
reopening behavior. Tasks and the aggregate evidence report remain root-owned.

## Boundary and approved API

`src/storage.ts` contains inert typed entry points and no storage behavior. Its methods
return undefined or resolve immediately so tests reach observable assertions without
import, dependency, fixture, or missing-export errors:

- `openStorage({baseUrl, indexedDB?})` returns `readState`, `saveState`, `readPair`,
  `savePair`, and `close`.
- `readState()` returns validated nullable catalogue/preferences. Invalid stored values
  are not exposed; raw incompatible values are retained.
- `saveState(catalogue|null, preferences)` atomically persists validated list/preferences.
  Null catalogue preserves an older accepted list and requires absent selected IDs.
- `readPair(memberId, sittingId)` distinguishes `saved`, `missing`, and `incompatible`.
- `savePair(catalogue, result, preferences)` commits catalogue/preferences/exact pair
  together, acknowledges a copied `saved:true` result only on transaction completion,
  and leaves the online input unchanged. Catalogue/result snapshot, source member,
  sitting, digest, and selected-pair preferences must match.
- `transactionCommitted(transaction)` observes native complete/abort events.
- Temporary inert `validateSavedResult(value)` will delegate result semantics to the
  authoritative source helper after that module's frozen acquisition input is released.

The namespace is the complete absolute repository base (`hansard:<base URL>`), database
version 1, with `catalogue`, `preferences`, and `pairs` stores. Singleton keys are
`current`; pair keys are native `[memberId, sittingId]` compound keys. The validated
selected subset cannot reconstruct the complete shard digest; tests require its declared
record digest to match its self-contained accepted sitting descriptor, not an invented
hash of the subset.

Tests inject the exact dev dependency `fake-indexeddb@6.2.5` and use its transaction
events, compound keys, rollback, and independent raw reads in Node. Controlled quota,
access, and abort cases wrap that API. These are unit boundaries, not evidence from
a physical browser or proof of offline availability. The default reader fixture preserves
the supplied recent excerpt's original text, one selected turn, all two attribution gaps,
and its annotation. Ready/absence branches are explicitly synthetic complete records,
not claims about real source participation or full-sitting completeness.

## Tested working tree

Base HEAD: `1c4b079935bc5b7604474c1ba55def43ed6f0270`. Relevant working-tree SHA-256:

| File | SHA-256 |
|---|---|
| `src/storage.ts` (inert) | `234dcdcd3b8b46e58d86702bd6789a5d3862866c7565b0219c82670ff08b82ec` |
| `tests/unit/storage.test.ts` | `66f54226123d52dc598add5f5e0d97facbb516b34b5ade347f3e500ac0bd66f8` |
| `tests/fixtures/reader.ts` | `919b715ef5c9b48bce435f3fcabd239aea6e85e5d1a7cf7ec70d7d26b6a6c1ea` |
| `package-lock.json` | `65ee9af9092fdc689d9fea1dfe37fd540a6d9a476a7cc581220857bcd2ccf7f9` |

## Actual RED execution

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/storage.test.ts
```

Final observed run: Vitest 5.0.3, start `13:33:25`, **93 failed / 93 tests**, one failed
file, exit 1, duration 376 ms. The log displayed 111 failure entries (some parameterized
cases share a displayed assertion error). Every case reached behavioral assertions;
there were no TypeError, ReferenceError, SyntaxError, or unhandled-error failures.
The captured temporary log's SHA-256 was
`73110a147d13cfc43710d7e8d24f5f817df5245dc0584b3652b4f2173ee06c2d`.
The durable observed failures are recorded below rather than relying on that temporary log.

The initial 67-case run also reached assertion RED, before later boundary additions.
An intermediate duplicate-ordinal fixture accidentally reused its unchanged gap ordinal
0; that individual intermediate case is excluded as evidence. The final case sets that
gap ordinal to 2, duplicating the actual selected turn ordinal 2 across partitions, and
its required rejection failed. No storage production was added between these runs.
Soft assertions let later preservation/result assertions execute even when an earlier
missing implementation assertion fails. Assertions that pass against inert code, such
as input nonmutation and retained raw fixture values, are regression guards and do not
count as RED by themselves.

| Test identifiers / cases | Required observable behavior | Actual RED |
|---|---|---|
| STORAGE001 | Origin and repository-base namespace (three URLs) | Each namespace was undefined rather than its exact expected string. |
| STORAGE002 | Initialize only the scoped version-1 database | Native factory database list was `[]` rather than the named database. |
| STORAGE003 | Explicit null missing state and missing unopened pair | Both values were undefined rather than the expected null/missing structures. |
| STORAGE004 | Catalogue, language, and IDs survive close/reopen | Reopened state was undefined rather than the complete catalogue/preferences. |
| STORAGE005 | Complete result, gaps, annotations, original strings, nullable snapshot/provenance commit with catalogue/preferences | Acknowledgement, saved-pair read, and state read were undefined rather than the complete expected values. |
| STORAGE006 | Saving one member does not save another member from the same sitting | Other exact-pair read was undefined rather than `missing`. |
| STORAGE007 | List saving cannot imply a saved transcript | Pair read was undefined rather than `missing`. |
| STORAGE008 | Committed replacement retains the accepted new successful refresh time | Saved-pair read was undefined rather than the replacement with `07:00:00.000Z`. |
| STORAGE009 | Newer catalogue does not relabel older saved result identities, digest, snapshot, or successful time | Pair read was undefined rather than the exact older self-contained copy. |
| STORAGE010 | Another repository base has separate lists/preferences/pairs | Its state and pair reads were undefined rather than null/missing. |
| STORAGE011 | Request success is earlier than transaction completion | Completion flag was already `true` at request success; expected `false`. |
| STORAGE012 | Transaction abort rejects | Completion promise resolved undefined instead of rejecting. |
| STORAGE013 | Quota/write error rejects, leaving online result independently usable and unsaved | Save promise resolved undefined instead of rejecting with `QuotaExceededError`. |
| STORAGE014 | Failed replacement retains prior content and successful time | Pair read was undefined rather than the previously seeded saved copy. |
| STORAGE015 | Abort rolls back catalogue, preferences, and pair together | State and pair reads were undefined rather than the exact seeded prior values. |
| STORAGE016 | Removed/evicted pair is missing, separate from source absence | Pair read was undefined rather than `missing`. |
| STORAGE017 (38 cases) | Reject each malformed self-contained field listed below | Every call failed `expected [Function] to throw an error`; inert validator accepted without throwing. |
| STORAGE018 | Accept compatible complete self-contained metadata and original text | Validator returned undefined rather than the exact saved result. |
| STORAGE019 (schema, digest, member identity, text) | Return incompatible for malformed saved data, retaining raw values | Each pair read was undefined rather than `incompatible`; independent raw-read guards executed. |
| STORAGE020 | Key/result identity mismatch cannot be relabeled | Pair read was undefined rather than `incompatible`. |
| STORAGE021 (four cases) | Reject invalid locale, unknown member, unknown sitting, numeric ID and preserve accepted state | Each save resolved rather than rejecting; each prior-state read was undefined rather than the accepted values. |
| STORAGE022 | Persist language and absent selections before a list exists | State was undefined rather than null catalogue plus explicit preferences. |
| STORAGE023 | Null catalogue input preserves a prior accepted catalogue | State was undefined rather than the prior catalogue and new null selections. |
| STORAGE024 | Selected IDs require a validated supplied catalogue | Save promise resolved instead of rejecting. |
| STORAGE025 | Invalid replacement catalogue cannot overwrite accepted state | Save resolved instead of rejecting; prior-state read was undefined. |
| STORAGE026 | No accepted source record cannot be acknowledged as a saved transcript | Save resolved instead of rejecting. |
| STORAGE027 | Denied IndexedDB access propagates an independent storage error | Open promise resolved with inert methods rather than rejecting with `SecurityError`. |
| STORAGE028 | Unsupported future DB schema rejects and preserves its version/raw records | Open resolved rather than rejecting; independent future-version/raw-read guards executed. |
| STORAGE029 (`ready`, `absence`) | Saving preserves validated source semantic outcome | Both saved-pair reads were undefined rather than the accepted self-contained results. |
| STORAGE030 (schema, identity, digest, missing gaps) | Reject malformed opened result before replacement; keep previous saved copy | Each save resolved rather than rejecting; each previous pair read was undefined. |
| STORAGE031 (snapshot, member, sitting finality, digest) | Reject inconsistent result/catalogue before an atomic commit | Each save resolved instead of rejecting. |
| STORAGE032 | Stored `saved:false` cannot manufacture local saved availability | Pair read was undefined rather than `incompatible`. |
| STORAGE033 | Save preferences must identify the opened member/sitting | Save resolved instead of rejecting different-member preferences. |
| STORAGE034 (null/member, null/sitting, both-null selections) | Valid absent IDs persist with their accepted catalogue | Each state read was undefined rather than the exact list/preferences. |
| STORAGE035 | Incompatible stored catalogue exposes neither a validated list nor dependent IDs | State was undefined rather than both null; raw records remained independently readable. |
| STORAGE036 (four malformed stored preferences) | Only validated locale/IDs are exposed | Each state was undefined rather than valid catalogue plus null preferences; raw preferences remained readable. |
| STORAGE037 | Stored valid language/null selections survive absent catalogue | State was undefined rather than null catalogue plus valid preferences. |
| STORAGE038 | Public `savePair` waits for its real three-store commit | Observed request acknowledgement was null rather than false, transaction completion was false rather than true, and saved result was undefined. |

STORAGE017 overrides, independently asserted in parameterized cases:

```text
schemaVersion=2; memberId=4463; member.id=4463; member.name=42;
member.historicalContext=undefined; snapshotId=''; sittingId=26241;
sitting.id=26241; sitting.date=2026-02-11; sitting.house=dewan-negara;
sitting.filename=dr_wrong; recordDigest=<different canonical digest>;
sitting.record.digest=<different canonical digest>; recordDigest=bad-digest;
snapshot.preparedAt=yesterday; snapshot.publishedAt=guessed;
snapshot.status.acquisitionOutcome=unknown; snapshot.coverage.startDate=bad-date;
snapshot.coverage.latestInventoryCount=-1; provenance.membersRawDigest=bad-digest;
refreshedAt=2026-10-10; saved=yes; outcome=verified-absence despite attribution gaps;
turns.0.memberId=4463; turns.0.sourceAuthorId=999; turns.0.text=42;
turns.0.sectionPath=[42]; turns.0.timestamp={}; turns.0.ordinal=-1;
gaps.0.gapReason=null; gaps.0.memberId=1839; turns.0.attribution=unassigned;
turns.0.gapReason=unknown-id; gaps.0.ordinal=2 (duplicates selected turn 2);
annotations.0.attribution=assigned; annotations.0.memberId=1839;
gaps=[] despite nonzero accounting; annotations=[] despite nonzero accounting.
```

## Supporting checks and remaining gates

`PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck`
passed, exit 0. `checkCodeDocumentation(process.cwd())`, filtered to the owned storage
source/test paths, returned `[]`. This checks callable comments only; the full accuracy
review CLI correctly requires a candidate/report and was not represented as a completed
release documentation gate. `git diff --check` for the owned files passed.

No storage GREEN, feature refactor, T050 completion, browser IndexedDB proof, or offline
promise is claimed. When T044/T049 permit production, implement native transactions and
shared authoritative compatibility validation, make these 93 cases GREEN, assess only
necessary refactoring, and execute T048/T055 actual-browser transactions and failure
journeys before claiming PWA behavior.


## T050 production and GREEN

Root authorized US3 production at **2026-10-10 19:00 MYT**, after closing T040–T044. The earlier 93 original and 12 focused behavioral RED cases above remain unchanged. Production began only after that explicit gate; no task markers or aggregate report were edited here.

`src/storage.ts` now opens native database version 1 in the full origin/repository namespace, with `catalogue`, `preferences`, and exact compound-key `pairs` stores. `savePair` validates the opened result against its actual catalogue and chosen preferences, copies it with `saved:true`, then puts all three records in one native transaction. It acknowledges only the native `complete` event. A synchronous enqueue error aborts already queued writes, waits for native rollback, and rethrows the exact original exception. Native asynchronous transaction aborts reject without acknowledging a save. `saveState(null, preferences)` writes valid language/null choices while retaining an older stored catalogue.

Reads enqueue their requests together and await transaction completion before accepting data. Stored catalogues/preferences and pair bodies are validated after the read; malformed or future content remains stored and is exposed only as null/incompatible. Native open/read failures propagate. A saved pair is checked against its own original accepted metadata rather than a newer catalogue. Another member's pair remains genuinely missing. No database deletion, destructive schema migration, source-result relabeling, generated refresh timestamp, shell-cache claim or offline-reopen claim is added.

`src/source.ts` now supplies the authoritative `validateTranscriptResult(value, catalogue?)`. Existing provenance, snapshot-status/publication, sitting/descriptor and source-leaf checks are shared with the existing catalogue/full-record validators. The participation classifier is shared with the result builder. Self-contained validation checks selected identity, accepted digest/descriptor binding, exact full gap/annotation counts, original leaf fields, unique bounded cross-partition ordinals and provided indices, traversal order within each partition, and the corresponding semantic outcome. Omitted other-member turns create legitimate ordinal holes; neither those turns nor an old full catalogue are manufactured. Without an old full member inventory, accepted unknown-ID gaps keep their declared attribution. Optional write-time catalogue binding checks snapshot ID and all own copied snapshot/provenance/member/sitting metadata without relying on object-key insertion order. A selected subset cannot recompute its original full-shard digest; no such integrity proof is claimed.

At **19:04:34 MYT**, the first implementation passed **450/450** schema/items/static/storage cases, including all **105/105 storage** cases. `npm run typecheck` exited 0 and the callable documentation checker returned `[]`. There was no intervening failing implementation run or transient harness defect. The final source edit after that run only corrected indentation in the extracted source-leaf helper.

At **19:04:58 MYT**, the affected complete source/storage regression command passed **674/674 tests across nine suites**, exit 0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/storage.test.ts tests/unit/source-schema.test.ts tests/unit/source-items.test.ts tests/unit/source-retention.test.ts tests/unit/static-data.test.ts tests/unit/recovery.test.ts tests/unit/acquisition-bootstrap.test.ts tests/unit/acquisition-refresh.test.ts tests/unit/acquisition-regressions.test.ts --reporter=verbose
```

[Complete GREEN output](tdd-storage-green.txt), SHA-256 `07da9ec049bafe7060cc8c71ea0272361ed46488cf11c431ba43562e00e3577d`. The command tested the shared extraction against current schema, original source strings/partitions, retention, retrieval, recovery and acquisition regression contracts. This uses fake IndexedDB in units; actual native browser transaction, persistence/offline reopening and worker compatibility remain separate T048/T055 gates.

Final production/test fingerprints at **19:05:31 MYT**:

```text
src/source.ts: 8793b0c06adda7c39ee0161ee93d2e3cb6c251d98b1c70986b131ed200078e5e
src/storage.ts: e273f52d3406449c3cba18707e6c3e4d3acb6e1a1c37ea7ae8b696938dcc1ccc
tests/unit/storage.test.ts (unchanged 105 cases): 88717acb03054f61cc2f9aee02a60e4a0df814937d37cdecf8ef596d569e1e52
```

The final mechanical callable documentation check again returned `[]`. Refactor assessment: only existing source authorities/classification were extracted to serve both full records and self-contained selected results. Storage uses one concrete shared state-write path for its two actual write operations, with no generalized persistence layer. No additional refactor is needed. Root owns main/messages/updates integration, native acceptance, aggregate evidence and task markers; no commit was made here.
