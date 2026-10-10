# Captured-source revalidation and successful local staging

The user approved a **1,048,576-byte catalogue gzip ceiling** and made the actual-source
verified-absence sample conditional on a suitable complete record being available.
The root recorded all affected budget cases RED before the shared constant changed,
then 334 affected tests and 890 implemented tests passed. The root authorized this
receipt-based staging after those GREEN checks. The original 204,800-byte rejection
and original raw acquisition evidence remain unchanged in [source.md](source.md).

## Observed operation

Command under Node 24.21.0, actual branch `001-read-mp-hansard` and actual repository
`eaglecheow/vote-better-malaysia`:

```sh
node --max-old-space-size=256 /private/tmp/hansard-restage-captured.ts --stage
```

The private one-off script started at **2026-10-10T09:05:52.805Z** and verified that
both `public/data` and `.cache/hansard/checkpoint.json` were absent. It made **zero HTTP
requests** and did not alter captured source responses, acquisition timestamps, the
original snapshot, previous source evidence or application source.

It verified all **4,093 original raw-response hashes**, current member/inventory
provenance, complete unique sitting IDs, and all **4,090** records through the current
production normalizer and validators. For every record, the exact raw digest and
original successful acquisition time matched the captured candidate; normalized
decoded digest, level-nine gzip/decoded byte counts, sitting identity/status and
exhaustive leaf accounting also matched. All 1,246 published source identities are
exact current source identities actually referenced by assigned accepted items; the
full 2,017-entry raw identity list remains private.

Verification completed at **2026-10-10T09:07:53.639Z** with the same **1,695,818 leaves**:
1,145,711 assigned, 533,456 unassigned nonannotation passages and 16,651 explicit
annotations. It retained only compressed output buffers plus one raw/normalized
record at a time. Peak observed reconstruction RSS was 532,381,696 bytes; the 256-MiB
setting bounds the V8 heap, not external gzip buffers or total process RSS.

The actual existing `stageSnapshot` then ran its schema, reference, hash, gzip and
complete staged-directory budget checks, wrote all files and committed output plus
checkpoint using its repaired rollback path. It returned success at
**2026-10-10T09:08:44.384Z**. After that return, the script independently read and hashed
all 4,090 public shards and all 4,090 private checkpoint shards. Every stored hash,
checkpoint reference and exact catalogue byte sequence matched. The process exited 0.
The root independently confirmed public count, total bytes and catalogue/checkpoint hashes.

| Actual staged resource | Bytes | Required ceiling |
|---|---:|---:|
| Catalogue gzip | 519,418 | 1,048,576 |
| Catalogue decoded | 3,431,888 | 5,242,880 |
| Largest sitting gzip | 295,108 | 524,288 |
| Largest sitting decoded | 1,745,574 | 5,242,880 |
| Complete staged data, 4,090 shards plus catalogue | 357,744,140 | 900,000,000 |

All these staged-data checks pass. The later complete-site artifact, browser,
physical-device, performance and publication gates remain separate.

## Preserved source and snapshot provenance

The staged snapshot is the original frozen candidate
`46deaa63-9074-408c-a1df-7fd687af312c`, prepared at
`2026-10-10T06:24:11.774Z`. Catalogue gzip SHA-256 remains
`d5891d1a67bb1659a5e134e6d477b4697415e6876ce8bdcd5e8d315a8471fed9`; decoded SHA-256
remains `9ba0c5c332a39026a4d067b56d57982ada0c1025e0cbabc2ec84bfe807718e80`.
All original source acquisition times and raw hashes are unchanged. The current
restaging/checkpoint time is not a new source check, official revision, site publication
or successful device refresh. `publishedAt`, workflow URL and confirmed deployment
remain null; **no publication occurred**.

Original archived acquisition fingerprint:
`ebd608a3a69718dd4faff58f23f980ec442302716a52d1870e2cbf3a87f31756`.
Its source/acquisition/lock hashes remain `59e42…`, `abed29…` and `bae6ba…`, as
recorded fully in [source.md](source.md) and [the staging summary](source-restaging.json).

Actual executing revalidation/staging fingerprint:
`cd4df307b5fa75be9695df7bf5d720b3d50e789b4f2ef5a8eb73137b3cf89fa2`, calculated exactly
as the CLI does from current source + acquisition + lock bytes:

| Executing input | SHA-256 |
|---|---|
| `src/source.ts` | `ab5b02ac7dc3a3d484572ba1dba6a1a2818ae29d105130f83b2cb7246b8c6896` |
| `scripts/acquire.ts` | `3b98a97d721f00e63eff0126d790bffe01c269118351e04d15b1fb076be98910` |
| `package-lock.json` | `65ee9af9092fdc689d9fea1dfe37fd540a6d9a476a7cc581220857bcd2ccf7f9` |

Those inputs were checked unchanged before commit and after all post-commit hash checks.
Subsequent source/acquisition/lock edits invalidate this checkpoint's code compatibility;
this report remains tied to the actual operation above and must not be relabeled.

The newly accepted private checkpoint SHA-256 is
`f8bc6b83c055296b7bf4154f5ef8631ab3597890a4adb8c557729ab744ad9422`, created at
`2026-10-10T09:08:44.370Z`. Its status is `success: true`,
`originKind: local-development`, `publicationEligible: false`, with the actual feature
branch and current executing fingerprint. It does not claim reviewed-main workflow
origin or a served publication baseline. Its private shard root is
`snapshots/7f6bc0d7-5cde-4a59-b23a-168470be7cf2`.

The complete captured archive still has **zero zero-gap records**. No real
verified-absence pair was fabricated. Under the approved conditional sample requirement,
no suitable actual case is available; controlled verified-absence classifier tests remain
separate. All actual zero-match pairs retain their incomplete outcome and accessible gaps.

## Evidence

- [Compact machine-readable result](source-restaging.json): actual sizes, times,
  preserved provenance, runtime fingerprints, checkpoint status and private full-report hash.
- [Actual operation log](source-restaging.log): native verification/staging observations;
  its `staging-complete` event follows the shared function's return and post-commit hash checks.
- `/private/tmp/hansard-restaging-report-20261010T090552805Z.json`: complete per-record
  hashes, bytes, acquisition times and accounting; SHA-256
  `1c835ce655e567a6389297abf712555a93ee2e37029a73017707d57698f764b4`.
- `/private/tmp/hansard-restage-captured.ts`: one-off script SHA-256
  `5c71f7b20e4967ff30683dd71c78594c9e5e2ec187ac63011cef29cf7c1404aa`.

Standalone strict TypeScript checking and callable documentation checking passed.
No full raw response or transcript body was copied into this evidence directory.
