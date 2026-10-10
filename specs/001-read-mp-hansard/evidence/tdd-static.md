# Published static retrieval TDD

Base revision: `1c4b079`; uncommitted source model already passed its own RED/GREEN.
The two new retrieval exports are inert `undefined` scaffolds at this RED point.

## T017 / relevant T020 RED

Command with Node 24.21.0 selected:

```sh
npm test -- --run tests/unit/static-data.test.ts
```

Observed exit **1**, **41/41 behavioral failures**; [full durable output](tdd-static-red.log).
Positive cases report expected catalogue/result versus `undefined`; negative cases
report a resolved promise where rejection is required. Every `T017` identifier is
listed in the log: both real Fetch representations, scoped GET/digest/cache options,
catalogue-only retrieval, unchanged refresh, processing marks, invalid selections,
network/status/HTML/gzip/UTF-8/JSON/schema/path/redirect boundaries, hash/identity/
accounting, one coherent retry and revalidated selections, byte ceilings/cancellation,
unavailable timestamps, split magic bytes/signal and ambiguous base rejection.

An earlier fixture attempt passed the member array without the required `pageProps`
envelope; its normalization failures are **not RED**. The envelope was repaired before
the observed behavioral run and before production retrieval. Typechecking passes.
The exact 5-MiB catalogue contains explicitly synthetic test padding; it proves byte
enforcement, not a complete real archive. The 2014 transcript leaves are the saved
official excerpt described by the manifest; transport metadata/digests are controlled.

Preimplementation SHA-256:

```text
src/source.ts ed40a3bad52b71af6ebfbb152a8065e3e4574b4f26326751d3cc427baf14166f
tests/unit/static-data.test.ts 54d355bf78585cdb7abf9c3da0773660ff6db7ebac42cf87a20d4928f096602d
tests/fixtures/static.ts 2edb5798cfa63e54004c554fa2163b3a4c4af3003365ee7c53df12c4240b7d59
```

The final RED uses soft assertions to observe exact content/digest/time/mark failures
independently, plus a dedicated request ledger and a cancellation-first assertion.
No early failed assertion conceals the observed cache/base/signal or cancellation RED.
T021 may now implement its relevant T020 behaviors; the combined T020 task remains
unchecked until reader/message RED is recorded as well.

## T021 GREEN and review

At 13:02:50 MYT on 2026-10-10 the same command passed **41/41**. Typechecking
passed. At 13:03:11 the prior foundation/checker/harness suites plus static retrieval
and messages passed **761/761** across nine files. Reader and collector suites still
have their independently recorded preimplementation RED and are not counted as
existing implemented regression behavior in this run. Mechanical callable coverage
returned no findings. Source SHA-256 after implementation:
`e5c156ef6eee05b4ef4830768bdbc29080dadc57c84b5d8ac8a849c125d3e8fe`.

No refactor was needed: one bounded stream/representation boundary serves both
resources; identity/result rules remain authoritative in `src/source.ts`. Processing
marks surround buffered-wire decode, parse, hash, validation and result construction,
excluding network download. Full native-engine, live-source and physical-device
acceptance remain pending; unit native streams do not establish browser delivery.
