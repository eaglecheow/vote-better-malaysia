# Served source representation regression RED

Recorded 2026-10-10 before representation production changes. Root exported the existing
`verifyServedFile` helper and added an unused optional typed decoded-resource argument;
the helper's wire/decode/hash behavior remained unchanged. Test authoring modified only
`tests/unit/served-representation.test.ts` and this report. No production collector,
source/bootstrap state, task marker or commit was changed by the test author.

These tests use actual native Node HTTP on random `127.0.0.1` ports, actual response
streams and actual gzip/Brotli codecs. There is no mocked transport, runner spoofing,
official-source request or browser/laboratory/performance-budget claim. The JSON bodies
are explicitly synthetic byte-representation fixtures, not normalized Hansard samples.
Every listener and its connections close after its assertion.

## Defect and fixture identities

The reader's static-data contract accepts gzip or already-decoded JSON after HTTP
transport decoding. Native collector response verification already admits stored and
intrinsically decoded hashes. Preflight, however, applies a compressed-file wire cap
and accepts only stored gzip or transport-decoded stored gzip. It ignores the newly
supplied intrinsic JSON length/hash, so valid decoded JSON is falsely rejected.

Canonical fixture bytes (UTF-8 JSON and level9 stored gzip):

| Fixture | JSON bytes | Stored gzip bytes | Old wire cap | JSON SHA-256 | Stored SHA-256 |
|---|---:|---:|---:|---|---|
| small | 1,859 | 111 | 65,647 | `1b56b74420a7585862bbd7ed2c301c7d15ee6d45ef95c5713526698a6647751a` | `c5e7aa17c2217fa166818e4c75fe6e9a72f45e47c371bb0456c2d888203e651e` |
| large | 180,059 | 548 | 66,084 | `f8b7be32306bef92b43d6f3af3fa32276a5ce5c44a09bdee18c4f31ca7783354` | `6c27ec0dc4b8392f03d1fbe8dded520cd987e0dfa22056130edbfeef59f9f0cc` |

The alternate gzip JSON uses valid level1 settings and differs from canonical level9
stored bytes. The Brotli response decodes to those same frozen JSON bytes. Assertions
expect the helper to return the actual HTTP response-body bytes, not the stored file or
decoded JSON byte count. “Wire body” excludes HTTP headers/framing.

## Tested working tree

Base HEAD: `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

| File | SHA-256 before production fix |
|---|---|
| `tests/unit/served-representation.test.ts` | `61ecc214827d10bfcfb0bec7ab59ce767aac5ac120017be4477312801831ede2` |
| `scripts/collect-performance.ts` with exported unchanged helper | `08f6e3c97c468cdd979a8b58f6370a1d42734f2b61f39864e2bfab9e8aa7522d` |

## Actual native-loopback RED

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/served-representation.test.ts
```

The loopback execution used the existing local-server permission boundary. Vitest5.0.3
run started `14:15:18`: **4 failed, 3 passed, 7 total**, exit1, duration381ms. All four
required new cases reached `.resolves.toBe(actualBodyLength)` and failed because the
helper rejected supported exact frozen JSON. There were no import, dependency,
listener, fixture, TypeError, ReferenceError, syntax or unhandled-error failures.
Captured temporary log SHA-256:
`6adc0b9e5e290b4d6b3359fb1ed0cf5d790371799d849d4423722f7edf798b3a`.

| Test identifier / representation | Actual wire body bytes expected | Actual behavioral RED |
|---|---:|---|
| REPRESENTATION001 identity-small | 1,859 | `AssertionError: promise rejected "Error: served bytes differ from frozen ar…" instead of resolving`; cause `served bytes differ from frozen artifact: data/sittings/1.json.gz`. |
| REPRESENTATION001 identity-large | 180,059 | `AssertionError: promise rejected "Error: served frozen wire-byte bound exce…" instead of resolving`; cause `served frozen wire-byte bound exceeded`. Body exceeds the old66,084 bound while matching valid frozen decoded bytes. |
| REPRESENTATION001 gzip-json | 125 | `AssertionError: promise rejected "Error: served bytes differ from frozen ar…" instead of resolving`; HTTP Content-Encoding gzip decodes different valid compression bytes to the exact canonical JSON. |
| REPRESENTATION001 br-json | 74 | `AssertionError: promise rejected "Error: served bytes differ from frozen ar…" instead of resolving`; HTTP Content-Encoding br decodes to the same frozen JSON. |

Observed assertion location: `tests/unit/served-representation.test.ts:56`.
Observed helper causes: frozen-byte comparison at `scripts/collect-performance.ts:814`
and old wire bound at line806. These are supported-representation rejection failures,
not setup errors.

## Existing GREEN controls

These cases already pass before the production fix and are not counted as RED:

- REPRESENTATION002 identity-stored-gzip accepts native gzip bytes with no Content-Encoding
  and returns111 actual wire body bytes.
- REPRESENTATION002 transport-gzip-stored-gzip accepts a transport gzip wrapper around
  the canonical stored gzip and returns132 actual wire body bytes.
- REPRESENTATION003 rejects altered valid JSON with the same1,859-byte length and a
  different decoded SHA-256; equal lengths or JSON validity cannot replace exact integrity.

`npm run typecheck` passed, exit0. Owned callable-documentation scan returned `[]` and
owned whitespace checks passed. No actual hosted runner or production timing collection
was invoked.

## GREEN handoff

The pre-fix handoff required the root to derive intrinsic decoded metadata before preflight in `nativeBoundary`, pass
it to the helper, and accept only exact stored bytes, transport-decoded stored bytes,
or exact frozen decoded JSON with canonical SHA/length. Stored and decoded bounds stay
enforced, and raw HTTP body counts remain separately reported.

## Root repair GREEN

The root applied that repair after the four recorded behavioral failures. At
14:18:15 MYT, all **seven representation tests** passed within the **882/882**
fourteen-suite implemented regression selection. [Durable command/output](reviewed-implemented-green.log).
Typecheck and global mechanical callable-documentation checks passed; no further
refactor was needed. The altered same-length JSON remains rejected, and native
stored-gzip/double-transport-gzip behavior still passes. These actual local HTTP
checks do not claim a complete production laboratory or physical-device run.
