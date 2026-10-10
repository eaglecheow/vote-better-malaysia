# Saved reader pending-network regressions

## Saved-storage access and recovery correction

Before production changes at 19:23 MYT, root ran the two SAVED-ACCESS-LIMIT
locale regressions with the Vitest JSON reporter and `-t SAVED-ACCESS-LIMIT`.
Observed exit 1: two cases, four reached `AssertionError`s: reopening remained
`true` and promised readiness despite a real storage-boundary access rejection.
The prior complete saved words/time remained readable and storage-failure text
appeared as already-GREEN controls. Eight unrelated cases were skipped.
[Structured RED](saved-access-red.json), SHA-256
`5349fb1254ca625e458aa0ab161c89abadfa2fe8fe620d417d7341885726ac81`;
test `1a57faca76dd8b13e688945e302e15fe201129f6c27ceb011c269afcffea270b`;
main unchanged `0c8ae3bc0f40691fe19f96f7a0118f7bb40a89a4b16f6c1bbf13fd1a738547b6`.
Root authorizes the minimal access-limit and successful-commit recovery corrections
after these assertions and the separately recorded transient-write RED below.

Root accepts the six observed assertion failures and authorizes the pending-display
fix at 19:20 MYT, before production edits. Restored catalogue and exact committed
pair content must announce readiness independently of a pending network check.

At 19:20:30 MYT root's six new cases and the eight existing reader/recovery/message/
bootstrap suites passed **252/252**, exit 0; TypeScript also passed.
[GREEN log](saved-reader-pending-green.log), SHA-256
`00cd69448e6e2a2c6bbce32de6953540e4dec9836b22572c2d81bd64617b3e81`;
main SHA-256 `0c8ae3bc0f40691fe19f96f7a0118f7bb40a89a4b16f6c1bbf13fd1a738547b6`.
The reader restores the exact saved pair before catalogue revalidation and retains
it during matching pair checks/retries. Timing marks describe usable saved controls/
content, without pretending that network validation or a new save completed.
No additional refactor was necessary; native engine evidence remains separate.

Root authorized these six focused test-only regressions after read-only review of US3. The current reader restores lists/preferences, but waits for initial catalogue retrieval before reading a saved pair and clears the displayed result during an online pair check. The accepted plan/reader contract requires showing saved data with its own label/time while checking the latest published snapshot, replacing it only after validation.

Only `tests/unit/saved-reader-pending.test.ts` and this evidence/log are owned here. No production edits, task-marker changes, aggregate report edits or commits were made. Root owns the later reader fix.

## Meaningful observed RED

Final run at **2026-10-10 19:19:14 MYT**, Node 24/Vitest 5.0.3:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/saved-reader-pending.test.ts --reporter=verbose
```

Observed **6/6 cases failed**, exit **1**. [Complete raw RED output](tdd-saved-reader-pending-red.log), SHA-256 `9f1682ded6feb2f0e5d07921d4474fa37db34a998d13d3996dc2981d259f4167`. Every case reaches soft behavioral assertions, followed by cleanup. There are no import, dependency, TypeError, ReferenceError, timeout or unhandled-rejection failures counted as RED.

| Identifier (each in BM and EN) | Actually reached failed behavior |
| --- | --- |
| `SAVED-PENDING-CATALOGUE` | The actual catalogue request is pending, but the committed pair is never read. Result member/sitting/complete attributes are empty, all original turn/gap/annotation texts are absent, original preparation/device/saved times are absent, and saved/offline-ready statuses are false. Both usable-catalogue and complete-reader readiness marks are absent. |
| `SAVED-PENDING-PAIR` | The actual newest-pair request has started and remains pending. The saved fallback has been read, but the result region still lacks its original identities, complete source content and metadata; saved/offline-ready statuses are false. Complete-reader readiness is not emitted while that valid copy is usable. |
| `SAVED-PENDING-RETRY` | The first failed retrieval displays the exact committed saved result and its old times; those assertions pass as controls. Clicking the actual visible native Retry starts a second pending newest-pair request and removes all saved content/metadata, changes saved/offline statuses to false, and does not emit complete-reader readiness. The timing recorder is explicitly cleared before Retry, so an earlier fallback readiness mark cannot satisfy the pending-Retry assertion. |

The two locale variants use the same original source strings and metadata. The test fixture independently returns source-built accepted old/new results, a committed saved pair, compatible shell status and native-shaped deferred HTTP outcomes. It does not implement fallback, selection, readiness or DOM policy. Assertions compare every included original turn/gap/annotation string, exact pair IDs, preparation time, successful device/saved refresh time and semantic save/readiness attributes. No new online refresh time may appear, and no pair save may happen while the latest response remains pending. Those no-premature-save/time equalities are controls, not claimed as additional RED.

The initial six cases already failed at 19:17:53 and again at 19:18:33 against the same notice-only main implementation. Root then explicitly requested early readiness assertions before production; the final 19:19:14 run above includes and observes those missing marks. The earlier logs are superseded by the complete final log, without any pending-display production change between runs.

## Tested bytes and supporting checks

Before and after the final RED, current main has the same SHA-256. Its separate update-failure notice implementation was already present; this test adds no notice behavior.

```text
src/main.ts: bf333fa45dd35a1393bf969b9eb637077839e9aa6d71f92bce382100dd098fe2
tests/unit/saved-reader-pending.test.ts: 60f3ed42fad5c37835ca76b022a202d640fed1b277b1976bdad41d9f7ffc0567
tests/fixtures/reader.ts: 919b715ef5c9b48bce435f3fcabd239aea6e85e5d1a7cf7ec70d7d26b6a6c1ea
src/storage.ts: e273f52d3406449c3cba18707e6c3e4d3acb6e1a1c37ea7ae8b696938dcc1ccc
src/source.ts: 8793b0c06adda7c39ee0161ee93d2e3cb6c251d98b1c70986b131ed200078e5e
```

Typecheck exited 0 for the new cases before the final recorder-only assertions; the final mechanical callable documentation checker returns `[]`. The injected UserTiming recorder establishes when the actual reader reports usable saved content; it does not claim browser paint, network timing, physical-device performance or native offline opening. Those remain separate native/browser acceptance gates. No GREEN claim is made before the root-owned fix.

## Transient state-save failure: observed RED

After the root-owned pending-display fix, root authorized two BM/EN regressions for a transient state write failure followed by a successful complete pair commit. At **19:21:40 MYT**, the same command passed all six pending-display controls and failed only these **2/2 new behavioral assertions**, exit 1. [Complete raw output](tdd-saved-reader-transient-red.log), SHA-256 `7a0f5877df12d276b4bdb4d7ec90a247c7d12146ae128e6a5ff16a6253177dd7`.

Each case rejects only the first `saveState` boundary with a controlled quota exception, then observes the actual reader invoking `savePair` with its valid latest catalogue/result/preferences. A separate deferred transaction acknowledgement remains pending until explicitly resolved with the accepted saved result. After that acknowledgement, the reader correctly exposes `data-saved=true`, `data-offline-ready=true`, and the newly committed saved refresh time. Those passing checks independently prove the application consumed the successful boundary. The visible label incorrectly stays at the earlier storage-unavailable notice:

| Locale | Expected after commit | Actual failed assertion |
| --- | --- | --- |
| BM | `Transkrip disimpan pada peranti.` | `Storan peranti tidak tersedia. Bacaan dalam talian masih boleh digunakan.` |
| EN | `Transcript saved on this device.` | `Device storage is unavailable. Online reading remains usable.` |

No source/mock policy performs the recovery for the reader. This tests the real consumer of an independently supplied completed storage boundary; actual three-store native transaction correctness has its separate storage/native tests. There are no fixture, import, timeout, TypeError or unhandled-error failures. No production edit was made here.

```text
src/main.ts before/after RED: 0c8ae3bc0f40691fe19f96f7a0118f7bb40a89a4b16f6c1bbf13fd1a738547b6
tests/unit/saved-reader-pending.test.ts (six prior + two new): 8d3f198c3b3559d35bbbdbcba07a77721d11d6a5d8afcf42e215a60b8d3cb5a9
```

Final typecheck exits 0 and callable documentation checker returns `[]`. Existing report additions from root, original pending-display RED and its GREEN remain preserved above. The root-owned transient-save fix must follow this observed RED; no GREEN claim is made for that fix here.
