# T041/T043 controlled candidate and publication checks

On 2026-10-10 at 18:47 MYT, the three positive preparation/promotion/wait
scenarios passed using controlled native files and authenticated synthetic
transport. [Raw candidate identities and outcomes](publication-controlled-candidates.log)
has SHA-256 `cab2252b8125a4cca0dfe3e0576185ce5581ac07cc1aeae136dad143f32b1d3d`.
These are mechanism checks, without actual publication or physical-device evidence.

The reused candidate had source revision `1111111111111111111111111111111111111111`,
snapshot `controlled-frozen-candidate`, application fingerprint
`cd555c9886d35a09428455b0e3b25d7fc9e9cf257464d2bffa504a0015e431cf`,
artifact digest `513fec8c4d50ee74d0500a069c686474580d942a38f283172def694cb4e4f30d`,
and prior served-baseline digest
`f2b678cd720f565c483f06820709a3a0c593beee92c8d8c894f403d06947b22f`.
The fixture catalogue digest was
`c702e950e9ba4dc1e47f545979a3df5cbdb46bdf8b579f7731550c02f5e3ff28`;
both sitting fixture hashes and the conditions digest are preserved in the raw log.

Its controlled acquisition time was 02:51:40 UTC and preparation time 03:00 UTC.
The synthetic review time 03:59:59 UTC preceded the 04:00 UTC run journal.
Exact promotion returned `ready` with no source request, acquisition or build
command; missing performance evidence returned `awaiting-evidence`, likewise with
no source request or command. Neither returned a publication receipt or performed
publication. This one-hour evidence window is an illustrative controlled clock,
not observed human review, scheduler delay or official-source latency.

A separate successful preparation used source revision
`2222222222222222222222222222222222222222`, snapshot
`afb12005-064c-45ea-84c5-af598a1d1cc7`, the same application fingerprint, and artifact
digest `96889645874d3aa7ed45b68c3a4001f1a14b530ffa37924ea92ebbf16f5bd19c`.
Its controlled acquisition/staging interval was 04:00:00–04:00:07 UTC;
`preparedAt` was 04:00:07 UTC. Only this new preparation ran build/check commands.
Acquisition and staging succeeded, deployment awaited evidence, and its receipt
remained null. The official change time is unknown.

The runtime matrix additionally exercises changed bytes, same revision with a
different artifact, missing/expired evidence, superseded baseline, failed staging,
untrusted archives, wrong schema/deployment identities, and failed postdeployment
live probes. The incremental acquisition matrix below covers newly discovered and
changed historical records, unchanged content, incomplete sweeps, 429/Retry-After,
access denial, expired checkpoints and unrecoverable baseline. Accepted bytes and
successful source times survive failed replacement. See [publication evidence](tdd-publication.md)
and [workflow evidence](tdd-publication-workflow.md) for per-case RED/GREEN and
provider-shape limitations. A successful enclosing deployment job with a skipped
Pages action now records `not-attempted`, rather than publication success.

The two-success [bounded state control](publication-bounded-state-control.log)
passed at 18:51 MYT. It seeds stale snapshots, raw receipts and journals, prepares
run 300, authenticates its completed state in run 301, and checks each transported
bundle contains only its checkpoint, origin and actual referenced shard-root files.
Each payload is hash/schema validated. Older private history remains locally but
is not transported. This is later regression coverage for existing copy behavior,
not initial RED; the workflow upload change has its own earlier observed RED.

# T034 controlled incremental acquisition and retention

Recorded 2026-10-10 after T027's validated local re-staging and the separately approved
local Firefox phase exception. The [source policy](source-policy.md) and
[original full-source evidence](source.md) remain distinct. This report proves
controlled refresh behavior, not an actual scheduled workflow or new live publication.

The existing `acquire`/`stageSnapshot` APIs and CLI arguments are preserved. Refresh
uses the authoritative source rules and shared byte limits, with no publication behavior.
Private `refresh.bucketChecks` stores six nullable successful sweep timestamps;
private partial state preserves original targets, accepted and failed descriptors,
actual source times/hashes and pending work. `receipts/<sessionId>/refresh.json`
records acquisition and staging separately from any later served publication receipt.

Validated behavior:

| Boundary | Observed result |
|---|---|
| Priorities and historical sweep | Exact-ID SHA-256 interpreted as the full unsigned digest modulo six; new/unavailable, oldest prior failures, latest 30, strict >24-hour overdue work, then oldest selected bucket. IDs are deduplicated; six normal controlled runs cover all 70 historical fixture sittings. |
| Time ordering | Whole-second and millisecond UTC strings compare by their actual instants; stored source strings are preserved, with exact ID ties. |
| Untargeted and omitted records | Unselected accepted bytes/hashes/times stay unchanged. Historical omitted IDs remain selectable/recheckable without inventing a latest-inventory listing. |
| Changed and unchanged responses | Both genuinely accepted responses advance successful acquisition time; decoded hashes distinguish changed from unchanged text. |
| Individual failures | Existing accepted shards retain exact bytes/hash/acquisition time with a separate real failed-attempt time. New inaccessible records stay unavailable; attempted failures are not completed or unattempted pending work. |
| Bucket completion | A failed selected-bucket target cannot advance its sweep. An unrelated recent-target failure does not erase a separately successful bucket. Sweep history advances only with accepted source completion and committed staging. |
| Pacing and cap | Existing serial pacing, two bounded retries, Retry-After and four-hour cap remain enforced. Interrupted runs preserve accepted public/checkpoint bytes and resume only unfinished work, retaining completed and failed source times. |
| Resume context | A newly completed private record omitted before resume is retained with coherent identity/bytes/times. A genuinely new identity in the next fresh inventory is acquired before older pending work. |
| Later-known identities | Previously accepted unknown-ID gaps keep exact original text/IDs/order/hash and successful times in retained attribution context when another rechecked record establishes that identity. No guessed reassignment or fabricated failed attempt occurs. |
| Trust and private metadata | Malformed six-bucket history, impossible/future times, duplicate/unknown/inconsistent partial partitions, unreferenced hashes and expired/future partial state reject. Valid legacy history absence remains compatible. Missing/expired accepted state safely bootstraps only without prior publication, or uses the existing independently validated served-baseline boundary. |
| Fatal and commit failures | Discovery/inventory/record/denial and size/staging failures preserve old accepted bytes. A real filesystem refusal at the required private report path also rolls back output/checkpoint and cannot persist a successful sweep. |

These fixtures use native temporary filesystem operations and explicit controlled
transport/UTC clocks around synthetic source-shaped data. Supplied served-baseline
proofs are controlled fixtures, not evidence of real trusted GitHub artifacts.

RED history is recorded in [tdd-refresh.md](tdd-refresh.md) and
[tdd-refresh-additional.md](tdd-refresh-additional.md), including five already-passing
controls and five later peer-review regression failures before their fixes. Final
acquisition checks: **86 refresh + 99 bootstrap = 185/185 passed**. The relevant
18-file regression command below passed **1024/1024**, exit 0, at
**2026-10-10 17:32:07 MYT (09:32:07 UTC)** in 8.84 s:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
npm test -- --run tests/unit/acquisition-refresh.test.ts \
  tests/unit/acquisition-bootstrap.test.ts tests/unit/acquisition-regressions.test.ts \
  tests/unit/source-retention.test.ts tests/unit/catalogue-policy.test.ts \
  tests/unit/source-schema.test.ts tests/unit/source-items.test.ts \
  tests/unit/static-data.test.ts tests/unit/served-representation.test.ts \
  tests/unit/reader.test.ts tests/unit/messages.test.ts tests/unit/recovery.test.ts \
  tests/unit/recovery-messages.test.ts tests/unit/dom-harness.test.ts \
  tests/unit/performance.test.ts tests/unit/performance-collector.test.ts \
  tests/unit/documentation.test.ts tests/unit/harness.test.ts
```

Durable output: [tdd-refresh-regressions.log](tdd-refresh-regressions.log), SHA-256
`fe2c1460772abc0ea868fe7166581e32aacc4a0eaa58d06671e12b361cf6f3c5`.
The native collector tests used approved local loopback execution; those existing
tooling checks do not constitute lab performance or PWA/device acceptance.

Final relevant working-tree fingerprints, Node 24.21.0:

```text
scripts/acquire.ts: 787c398c64ac31115d117ead754ee41b455a2149c9a74c35d0effff0e399966f
tests/unit/acquisition-refresh.test.ts: 376af1f536de5d6e682017e9036f561443e8ca3fd67d103a371682f127a52a88
src/source.ts: 1276c0f9612ebad901be17d800d34777bc274630b16638843f3629881cdd9089
src/main.ts: d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82
```

Full typecheck passes, global callable documentation scan reports zero findings,
and `git diff --check` passes. No broader refactor was needed: the private staging
helper exists solely to include required sweep/outcome writes in the original rollback
boundary; redundant completed-resume loop handling was removed after completed records
were validated/applied before pending work. Public boundaries, request behavior and
source normalization remain shared. Checks passed before and after that surgical cleanup.

No new live-source refresh, scheduler run, successful workflow artifact restoration,
official change-to-reader interval, publication, deployed-browser or physical-device
result is claimed here. Strict checkpoint code compatibility remains required; the
earlier live capture is not relabeled as tested by this changed acquisition module.
Workflow/candidate/deployment finalization stays in T038–T041 and later operational
checks. Root alone controls task markers and the aggregate evidence report.
