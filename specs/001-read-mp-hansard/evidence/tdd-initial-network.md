# Initial catalogue network-error regression

Root authorized this focused unit reproduction after native browser cases exposed an
online initial HTTP failure being labeled as a first offline visit. The reader must
show the published-site retrieval/validation error while connected. The existing first
offline visit remains a connection-required state. No production edits, task markers,
aggregate report edits or commits were made here.

At **2026-10-10 19:40:57 MYT**, Node 24/Vitest 5.0.3:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/reader-initial-network.test.ts --reporter=verbose --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/tdd-initial-network-red.json
```

Observed **four cases: two meaningful behavioral RED and two existing GREEN controls**,
exit **1**. [Raw output](tdd-initial-network-red.log) and [complete structured report](tdd-initial-network-red.json)
retain every reached assertion. There are exactly two AssertionError messages; no
import, dependency, fixture, TypeError, ReferenceError, timeout or unhandled-error
failure is counted as RED.

| Identifier | Expected initial online announcement | Actual failed assertion |
| --- | --- | --- |
| `INITIAL-NETWORK ms` | `Data laman tidak dapat dimuatkan atau disahkan.` | `Sambungan diperlukan untuk memuatkan senarai dan rekod yang belum disimpan.` |
| `INITIAL-NETWORK en` | `Site data could not be loaded or validated.` | `A connection is required to load unsaved lists and records.` |

Both tests mount the actual reader with validated absent device source data and valid
language/null preferences, an independently controlled connected state, and one rejected
catalogue HTTP boundary followed by the source-derived accepted fixture. The initial
error comparison is soft, so the subsequent native behavior is reached: visible list
Retry; disabled member/sitting/Read controls; polite live-region markup; actual first
catalogue call and no pair call; focus and click on the real Retry; second accepted
catalogue response; complete choices restored; Retry hidden; focus returned to name
search; and the choose-both announcement. Those existing successful controls are not
claimed as additional RED.

`INITIAL-OFFLINE-CONTROL ms/en` use the same absent data and a separately false native
connectivity observation. They already pass with the authoritative first-offline label,
visible Retry, disabled controls, empty result and no pair retrieval. No harness callback
implements classification, retry or DOM policy, and no direct substitute handler is
called. Unit-controlled transport/storage are not native-browser evidence; root retains
the independent browser failure/recheck records.

Stable before/after RED SHA-256:

```text
src/main.ts: bb12a3a1f30a46fbc1a6625f0b11b6f7a49bbc52d8d571b4cdcf4066839e34cb
tests/unit/reader-initial-network.test.ts: 4af47b2c782c9b36954b93b2b4f66a35cc30d8b67f818c9f3c615897592c12a4
tdd-initial-network-red.log: 0f97b6f7072fd7037c859b1bb24fbf2058cac6769e2ebfc99ab2e8f039133279
tdd-initial-network-red.json: 0df4127f282e251cda51e02a8e64b1bb1d818df9510fcb4116baa98b92ee7f6f
```

Typecheck exits 0; actual callable-documentation checker returns `[]`. The root-owned
minimal classification fix must follow this observed RED; no implementation GREEN or
native-browser pass is claimed here. T056 actual documentation changes remain held.

## Minimal correction and unit GREEN

After reading the recorded RED, root changed only the initial no-catalogue
announcement condition: explicit `online() === false` selects the existing
first-offline message; online or unknown connectivity selects the existing
retrieval/validation error. No source classification, storage or Retry behavior
changed. No refactor was needed.

At **19:44:02 MYT**, the new regression and nine reader/recovery/bootstrap/message
suites passed **260/260**, exit 0. [Actual GREEN output](initial-network-final-green.log),
SHA-256 `d2a551f805d4f627170cbbdc866814bef6925b9bfb023b0ce0e24120f68011e6`.
Corrected main SHA-256:
`326e642689655d359f37931b6caae2289c2b951e8addf6737c1c8118a8f33084`.
The subsequent production build (including typecheck) passed; the full native
Chromium/WebKit rerun is recorded separately by root in [browser evidence](browser.md).
