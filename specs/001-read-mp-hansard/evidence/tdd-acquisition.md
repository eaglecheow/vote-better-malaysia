# Bootstrap acquisition RED — 2026-10-10

Base revision `1c4b079`, uncommitted test/scaffold/fixture fingerprint (sorted path + NUL + bytes + NUL): `4b2e58b48db377f2e23da42fe7be4d0fa58a97e74ad8e5107b50be3e898133be`.

Command under Node24.21.0: `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`. Exit 1: 26 tests failed, 0 passed. Imports/fixtures/harness executed correctly. No acquisition production behavior exists.

Expected missing-behavior failures: discovery returns no ID, request boundary returns no response/rejection, bootstrap stages no result, size gate accepts/rejects no limits. Observed assertions: `expected undefined to be ...`, `expected undefined to be an instance of Response`, `promise resolved ... instead of rejecting`, and `expected [Function] to throw an error`.

Observed failing test identifiers:

- T013 discovery accepts a validated __NEXT_DATA__ deployment ID
- T013 discovery rejects unsupported build metadata: <html>no deployment metadata</html>
- T013 discovery rejects unsupported build metadata: <script id="__NEXT_DATA__">{"buildId":"../other-host"}</script>
- T013 discovery rejects unsupported build metadata: <script id="__NEXT_DATA__">{"buildId":42}</script>
- T013 discovery rejects unsupported build metadata: <script id="__NEXT_DATA__">{"buildId":""}</script>
- T013 discovery rejects unsupported build metadata: <script id="__NEXT_DATA__">not-json</script>
- T013 request boundary rejects nonofficial or unapproved URL https://example.com/
- T013 request boundary rejects nonofficial or unapproved URL http://hansard.parlimen.gov.my/
- T013 request boundary rejects nonofficial or unapproved URL https://hansard.parlimen.gov.my/../private
- T013 request boundary rejects nonofficial or unapproved URL https://hansard.parlimen.gov.my/_next/data/x/private.json
- T013 approved requests use manual redirects and a timeout signal
- T013 rejects off-host redirects without requesting their target
- T013 access denial stops source requests
- T013 bootstrap stages all supplied leaves with distinct hashes, gzip, dates and serial pacing
- T013 malformed source inventory blocks static replacement
- T013 output cannot replace or overlap private input state
- T013 accepts exact catalogue-gzip byte ceiling
- T013 accepts exact sitting-gzip byte ceiling
- T013 accepts exact catalogue-decoded byte ceiling
- T013 accepts exact sitting-decoded byte ceiling
- T013 accepts exact total byte ceiling
- T013 rejects one byte over catalogue-gzip ceiling
- T013 rejects one byte over sitting-gzip ceiling
- T013 rejects one byte over catalogue-decoded ceiling
- T013 rejects one byte over sitting-decoded ceiling
- T013 rejects one byte over total ceiling

The exact catalogue/shard compressed/decoded and total size boundaries each have separate RED assertions. Request/preservation/checkpoint coverage is still being extended: T013/T014 remain unchecked until all required cases have verified RED. No T015 implementation is authorized by this partial run. The full raw log is temporary `/private/tmp/hansard-acquisition-red-initial.log`.

## Extended RED before production

`npm test -- --run tests/unit/acquisition-bootstrap.test.ts`: exit 1, 39/39 tests fail behaviorally. Added accepted-record retention, new unavailable metadata, corrupt/untrusted/expired checkpoint rejection, lost-baseline output preservation, safe refresh bootstrap fallback and deterministic shard assertions. Observed failures are assertion mismatches or promise resolving undefined instead of rejecting; no import/harness errors. Callback-only cleanup subsequently replaced assertion arrows with native `bind` without adding production behavior. Post-cleanup working-tree fingerprint: `45467f959ae1ade05e8d07ea59d18982d7374ca52270018331805365a0d2b914`. Run log: `/private/tmp/hansard-acquisition-red-extended.log`.

- T013 failed refresh retains accepted payload, digest, identity and acquisition time
- T013 new inaccessible sitting remains selectable as unavailable without invented accepted times
- T013 loss of a published retention baseline blocks replacement and preserves output
- T013 rejects untrusted, expired or corrupt checkpoint {"repository":"different/repository"}
- T013 rejects untrusted, expired or corrupt checkpoint {"branch":"pull-request"}
- T013 rejects untrusted, expired or corrupt checkpoint {"success":false}
- T013 rejects untrusted, expired or corrupt checkpoint {"codeFingerprint":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
- T013 rejects untrusted, expired or corrupt checkpoint {"createdAt":"2026-10-01T04:00:00.000Z"}
- T013 rejects untrusted, expired or corrupt checkpoint {"catalogueDigest":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}
- T013 rejects untrusted, expired or corrupt checkpoint {"shardDigests":{"26241":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}}
- T013 rejects untrusted, expired or corrupt checkpoint {"schemaVersion":9}
- T013 refresh without prior publication or checkpoint performs safe bootstrap
- T013 decoded content hashes and fixed gzip are deterministic across preparation times

T013/T014 still need stale rediscovery, served-baseline recovery, retry/timeout/run-cap, staging-rollback and size-preservation cases. T015 remains blocked until that coverage has observed RED.

## Complete preimplementation RED — T013/T014

- Time: 2026-10-10T04:35:14.749462+00:00
- Command under Node 24: `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`. Exit 1, **91/91 behavioral assertion failures**, no syntax/import/fixture or unhandled rejection errors.
- `npm run typecheck`: exit 0 before this RED run.
- Durable observed output: [tdd-acquisition-red.log](tdd-acquisition-red.log).
- Added each required branch: serial request pacing, exactly fifteen-second request aborts, at most two retries/backoff, numeric/date/invalid Retry-After, official redirect following, whole-run access-denial stop, one deployment rediscovery and exhaustion, eighteen-entry inventory outcomes and referenced member projection, prior inventory omission, private raw bytes/hashes, canonical/symlink path isolation, successful/failed draft-final revisions, conflicting stable sitting hierarchy, malformed success bodies, missing/expired trusted served-baseline recovery and mismatched provenance/receipt/code/hash/base rejection, four-hour private checkpoint interruption/same-session resume and foreign/corrupt partial rejection, and actual output/checkpoint rename fault rollback.
- Each of the five limits has independent exact-limit and one-byte-over RED, plus a combined reject-and-preserve RED using real temporary accepted output/checkpoint/shard bytes and a controlled filesystem measurement boundary. These are synthetic unit size reports, never archive measurements.
- Preservation distinction: an inert no-op already leaves old bytes unchanged. The initial combined rejection/preservation assertion fails because rejection is absent; old-byte equalities do not independently fail. No corruption or rollback execution is claimed for the inert scaffold. GREEN must verify both actual rejection and unchanged accepted payload/identity/digest/state. Rename fault cases initially also fail because no commit was attempted.
- Fixture repairs before final RED: restored raw ancestor start/end metadata; prior synthetic shard now has two assigned items so retained identities are genuinely referenced; the retention source fixture now actually omits the historical source ID; timeout outcome capture repairs an unhandled rejection harness issue. None of those malformed-fixture/harness runs counted as RED.
- T015 now has every requested behavioral gate recorded and T008/T012 shared schema/normalization GREEN available. Production acquisition is still inert at this evidence point.

### Final RED file fingerprints

```text
scripts/acquire.ts: 4d1838e9886a8fda7c27cee3aa134775bfbdf2f74432f7746f8b5734e6a22fe3
tests/unit/acquisition-bootstrap.test.ts: a1e70bf71c83a1a80579075276caf42a4454819b2aa8cd2e03a29da078fb908e
src/source.ts: 67d8ec67b0b1a8a62831615a44eceb201e18b8a28a2729d71585372b904c5ef7
tests/fixtures/source-samples.json: 60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526
tests/fixtures/catalogue.ts: e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a
```

## Development checkpoint regression RED before context boundary implementation

- Time: 2026-10-10T04:45:21.082807+00:00
- Command: `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`. Exit 1: prior 91 cases GREEN, four newly requested local-checkpoint cases RED.
- Observed: local bootstrap wrote no explicit local-development/nonpublication origin and its refresh was rejected; a local-development marker with otherwise valid controlled main metadata was incorrectly accepted in workflow, other-branch and published-baseline contexts.
- Local metadata is a controlled fixture; no GitHub environment variables were forged and no real publication/trusted workflow claim is made.
- Output: [tdd-acquisition-local-red.log](tdd-acquisition-local-red.log).
- Before-fix production SHA-256: `ccc340e08335235205140a2a241e731c9e9dd91a8c680460008a71c555955d0c`.

## Private local interruption trust regression RED

- Time: 2026-10-10T04:48:40.567984+00:00
- `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`: 95 existing cases passed, two new cases failed behaviorally. A same-session local feature-branch partial was rejected; a local-development partial marker was accepted into a simulated workflow context.
- A named main-session wrapper repaired an accidental Vitest callback-context argument; that invalid-fixture attempt did not count as RED.
- Output: [tdd-acquisition-partial-local-red.log](tdd-acquisition-partial-local-red.log).
- Before-fix production SHA-256: `23bedf9d7576382761d3cfc133de722056837a5f00fc62128dde228e354b82f5`.

## Request cancellation review regression RED

- Time: 2026-10-10T04:50:06.389115+00:00
- `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`: 95 earlier cases passed; pending two local-partial cases plus one new structural-body cancellation case failed.
- Observed new failure: a structural body rejection ended the attempt but left its actual request signal un-aborted; expected `aborted:true`, observed `false`. The subsequent fix must abort on attempt failure while retaining readable responses on success.
- Output: [tdd-acquisition-review-red.log](tdd-acquisition-review-red.log).
- Before-fix production SHA-256: `23bedf9d7576382761d3cfc133de722056837a5f00fc62128dde228e354b82f5`.

## Immediate-denial review regression RED

- Time: 2026-10-10T04:52:27.143390+00:00
- `npm test -- --run tests/unit/acquisition-bootstrap.test.ts`: 98 cases passed, one new required denial case failed behaviorally.
- Observed: HTTP 403 headers with a failing body caused three requests/three body reads; expected immediate stop after one request and zero denial-body reads.
- Output: [tdd-acquisition-denial-red.log](tdd-acquisition-denial-red.log).
- Before-fix production SHA-256: `4552e632cfcc2802f0842a959e21064f8119268c560cd9be3cb8066644cb7dbe`.

## T015/T016 final GREEN

- Time: 2026-10-10T04:56:12Z; Node 24.21.0; base commit `1c4b079935bc5b7604474c1ba55def43ed6f0270`, branch `001-read-mp-hansard`.
- Acquisition suite: **99/99 passed**, including the immediate-denial regression. The four local successful-checkpoint cases, two local interrupted-session cases, structural-body cancellation case and immediate-denial case each followed their recorded behavioral RED.
- Combined acquisition/schema/items/harness/documentation run: **452/452 passed** in five files. `npm run typecheck`: exit 0. Callable documentation inspection of `scripts/acquire.ts` and `tests/unit/acquisition-bootstrap.test.ts`: zero findings.
- Independent full regression command `npm test -- --run` at 12:56:05 MYT: exit 0, **637/637 passed** in seven files (2.57 seconds). This includes the performance checker unit suite; it is not a measured full-archive/browser performance result.
- Exact filesystem output/checkpoint rename faults and all five over-budget staging attempts reject while preserving accepted prior bytes, hashes, acquisition dates and identities. Exact-limit acceptance uses explicitly synthetic measurement inputs; actual staged measurements are used by the CLI.
- Final source and controlled staging scope are recorded in [source.md](source.md). No live full-archive bootstrap, trusted workflow restoration, served publication or physical-device gate is claimed by these unit results.

### GREEN file fingerprints

```text
scripts/acquire.ts: c24ffb125ee3d743058938bdb399c944fa9a6eb8df360508f19cb5ea9ec3da36
tests/unit/acquisition-bootstrap.test.ts: 19c07a1a4d7832a07e25cdbdc2864def989404d50606155125fa7db5148f6b51
src/source.ts: 67d8ec67b0b1a8a62831615a44eceb201e18b8a28a2729d71585372b904c5ef7
tests/fixtures/source-samples.json: 60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526
tests/fixtures/catalogue.ts: e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a
```
