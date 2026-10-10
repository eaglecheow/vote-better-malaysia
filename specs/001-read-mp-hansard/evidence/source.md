# Source acquisition and staging evidence

The final [tracked outcome ledger](source-outcomes.json) records all 4,090 actual
source identities, sitting flags, successful acquisition times, raw/normalized hashes,
resource sizes and leaf accounting, bound to the complete independent comparison and
actual rejected temporary catalogue. [Failure output](live-bootstrap-run.log),
[actual catalogue measurement](live-bootstrap-sizes.json) and
[preserved empty initial output/checkpoint](live-bootstrap-preservation.json) are
durable. No transcript bodies or private raw receipts were added to this ledger.
The user subsequently approved **1 MiB and conditional real absence** on 2026-10-10;
[policy decision](source-policy.md) and [new RED/GREEN evidence](tdd-catalogue-policy.md)
record the revised gate. The earlier failure below remains the result of its original
200 KiB policy. [Validated local re-staging](source-restaging.md) completed at
**2026-10-10T09:08:44.384Z**: all 4,090 records and 4,093 raw receipts matched,
the catalogue remains 519,418 gzip bytes, and actual staged data totals 357,744,140
stored bytes. All source timestamps and the frozen snapshot are unchanged. The
checkpoint is local development and ineligible for publication. T027 passes under
the revised source gates; no real verified-absence pair or publication is claimed.

## T015/T016 controlled implementation result

2026-10-10T04:56:12Z, Node 24.21.0, branch `001-read-mp-hansard`, base commit `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

`scripts/acquire.ts` implements official Next page-data discovery, recursive complete inventory handling, lossless source-ID reconciliation, ordered record normalization, private raw-byte receipts, deterministic normalized/gzip digests, validated trusted/local checkpoints, interruption checkpoints, bounded acquisition, byte-budget staging and atomic output/checkpoint replacement. [TDD evidence](tdd-acquisition.md) records the preimplementation RED and later regression REDs.

The controlled API tests use real temporary state/output files, the archived source excerpts in `tests/fixtures/source-samples.json`, explicitly synthetic prior accepted records, a controlled official-source transport and clock, and actual filesystem rename failures. The eighteen-entry catalogue fixture includes all sixteen sampled meeting-zero entries plus the sampled oldest/current entries. Every supplied inventory entry receives an explicit available, retained or unavailable outcome; fifteen inaccessible controlled entries remain selectable and unavailable. Final public member identities are projected from assigned items in accepted records, including identities required by retained records. The full source speaker list stays private for normalization; no unreferenced source identity is silently presented as an MP.

The controlled checks cover separate compressed and decoded resource sizes/digests, repeated preparation with deterministic shard bytes, source text/section ordering/accounting, raw receipt privacy and acquisition times, failed-record retention, inventory omission, draft-to-final success/failure coherence, stable identity conflict rejection, stale-build rediscovery once, one-second request pacing, fifteen-second aborts, initial attempt plus at most two retries, Retry-After, whole-run four-hour interruption, immediate access-denial stop, safe redirects, actual rename rollback and all five byte ceilings. Exact ceilings and over-limit cases use clearly synthetic filesystem measurement values; they do not measure or prove full-archive fit. CLI staging measures actual stored bytes and includes retained shards.

Private successful local checkpoints carry `originKind: local-development`, the actual repository/branch/code fingerprint and `publicationEligible: false`; refresh may restore only the same development context after checksum/schema/reference/date validation. Workflow contexts reject local state. A private interrupted acquisition may resume only the matching validated session, execution context, repository, branch and code fingerprint. Successful reviewed-main workflow artifact trust and independently supplied served-baseline proof are separately validated. An existing published retention baseline cannot be replaced using an untrusted/missing/expired cache. The programmatic served-baseline proof requires the repository's derived Pages origin, deployment receipt, successful origin, exact code fingerprint and catalogue/shard checksums. The CLI currently has no independent served-proof import option; later workflow wiring must provide the trusted artifact or recovery context.

## Recorded official sample scope

Official origin: <https://hansard.parlimen.gov.my>. Verified deployment build ID: `Zlu4qRDxrOCEM-7h59E5o`. Raw reconnaissance files remain outside the repository under `/private/tmp/hansard-recon`; only selected exact leaves and their manifest are repository fixtures. [Fixture manifest](../../../tests/fixtures/manifest.json) records verified acquisition completion times, full raw-response hashes, excerpt hashes, extraction paths and synthetic-case labels. `source-samples.json` SHA-256: `60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526`.

- Members: `/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/cari-mp.json`; sampled raw response has 2,017 source speaker identities. No electoral historical context was observed; demographic fields are not published.
- Inventory: `/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/katalog/dewan-rakyat.json`; raw archive has 4,090 sittings across parliaments 1–15. Seven meeting-zero nodes contain sixteen sittings. Ancestor start/end metadata and recursive hierarchy were inspected and validated privately by the parser.
- Sitting page-data routes: `/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/hansard/dewan-rakyat/YYYY-MM-DD.json?date=YYYY-MM-DD`; inspected dates `2026-02-10`, `2014-07-23`, `1959-09-11`.
- Raw leaves have `speech`, `author`, numeric/null `author_id`, number/string/null `timestamp`, boolean `is_annotation` and numeric `index`, nested under arrays and heading dictionaries. Record metadata has `meta.id`, date/filename and numeric hierarchy in `cycle`; no raw sitting-ID field was observed. Numeric identifiers remain source identities, and raw text/author labels are never used to infer attribution.
- The three full sampled responses contain respectively 66/487, 41/375 and 1/2 unassigned nonannotation items. No real verified-absence fixture is claimed. Empty complete records, malformed responses, contradictory synthetic IDs and prior accepted content are separately controlled tests.

## Verification and next live gate

Acquisition tests: 99/99 passed. Full independent unit command `npm test -- --run`: 637/637 passed across seven files at 12:56:05 MYT. `npm run typecheck`: exit 0. Acquisition/test callable documentation scan: zero findings. Unit fixtures do not establish complete live archive acquisition, aggregate archive byte fit, real workflow artifact restoration, live served publication, revision/publication timestamps, physical-device performance or participant/assistive-technology results.

Expected Node-24 local commands:

```sh
npm run data:acquire -- --mode bootstrap --state .cache/hansard --out public/data
npm run data:acquire -- --mode refresh --state .cache/hansard --out public/data
```

Both currently perform the bounded full bootstrap path; later refresh prioritization is a separate task. Private state must be outside and disjoint from generated output. A first live run needs at least about 68 minutes at the mandated one-start-per-second limit, before retries, and is bounded to four hours. The CLI reads the actual Git repository/branch and actual workflow environment; it never stamps a feature-branch development run as a reviewed-main publication. Set `HANSARD_SESSION_ID` consistently only when resuming the same private interrupted session. No full live CLI run was performed in T015/T016.

## T027 live bootstrap: independently compared completed prefix

Read-only comparison time: **2026-10-10T05:21:36.878Z**. The real bootstrap session `implement-001-20261010` began capturing the official portal at 05:14:43.855Z and was still running. This is a completed-response prefix, **not a completed archive, staged snapshot, publication or T027 pass**. The comparison issued no HTTP requests and did not change production code, acquisition state or generated output.

Fresh verified source receipts:

| Resource | Actual successful acquisition UTC | Raw-response SHA-256 | Current supplied coverage |
|---|---|---|---|
| [Source identities](https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/cari-mp.json) | 2026-10-10T05:14:44.434Z | `16591062f73226e56bddad100e4fc834d3a79ca2cbe34192ed6ad65d675dfcea` | 2,017 exact source identities |
| [Dewan Rakyat inventory](https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/katalog/dewan-rakyat.json) | 2026-10-10T05:14:45.084Z | `3758f5a22783914b6a8b7bd58847189ccc10023cee898c698c39fa158dc3813f` | 4,090 sittings; Parliaments 1–15; 1959-09-11 through 2026-10-08; sixteen Mesyuarat 0 entries |

The captured snapshot contained **414 complete private raw-response receipts**, all with HTTP 200: discovery, identities, inventory and **411 sitting responses**. Every raw-file SHA-256 matched its receipt. An independent recursive traversal reconstructed all leaf fields, indices, heading paths, opaque timestamps, explicit annotation markers and exact-ID attribution from each full raw response. It compared those expected items field by field with the production normalizer, including original text and author labels. Raw requested date/URL, record identity and inventory hierarchy also matched. **34,398/34,398 supplied leaves matched, with zero comparison errors:** 8,004 assigned, 26,394 unresolved nonannotation passages and zero explicit annotations. This confirms complete preservation for this prefix; it does not establish historical membership, hidden source speeches or unacquired sittings.

The comparison used private coherent single-record catalogues constructed solely as validation contexts. Their snapshot/preparation/status values are analysis metadata, not a staged or served-site receipt. All 2,017 source identities were available privately for exact-ID reconciliation, with historical context explicitly null; the script wrote no demographic/public member data. Public acquisition must still project only identities referenced by accepted records.

Ten actual source-identity/sitting pairs across five full source responses were selected for multiple attributed turns. Their source flags are all `is_final: false`; no final/draft meaning beyond that supplied flag was invented. All matched turns, all gaps and all annotations were checked against their source partitions in source order. **337 selected turns matched exactly.** Each record contains literal interruption/laughter wording, preserved as original source text without using it to infer a different identity. None of these five records supplies a double-newline paragraph boundary; all supplied words and single-newline positions nevertheless match exactly.

| Official record / source sitting ID | Parliament/Penggal/Mesyuarat | Exact source identity ID and name | Matched turns | All unresolved passages | Result |
|---|---|---|---:|---:|---|
| [1966-10-25](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1966-10-25) / 23251 | 2/3/1 | 21375 — TAN CHEE KHOON | 33 | 183 | incomplete |
| 1966-10-25 / 23251 | 2/3/1 | 21455 — KHAW KAI BOH | 33 | 183 | incomplete |
| [1967-08-21](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1967-08-21) / 23244 | 2/3/2 | 21364 — MOHAMED KHIR JOHARI | 30 | 278 | incomplete |
| 1967-08-21 / 23244 | 2/3/2 | 21409 — ALI HAJI AHMAD | 26 | 278 | incomplete |
| [1967-08-24](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1967-08-24) / 23236 | 2/3/2 | 21375 — TAN CHEE KHOON | 65 | 250 | incomplete |
| 1967-08-24 / 23236 | 2/3/2 | 21346 — LIM KEAN SIEW | 13 | 250 | incomplete |
| [1967-11-13](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1967-11-13) / 23241 | 2/3/2 | 21375 — TAN CHEE KHOON | 31 | 313 | incomplete |
| 1967-11-13 / 23241 | 2/3/2 | 21409 — ALI HAJI AHMAD | 27 | 313 | incomplete |
| [1968-08-21](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1968-08-21) / 23327 | 2/5/1 | 21634 — NG KAM POH | 55 | 951 | incomplete |
| 1968-08-21 / 23327 | 2/5/1 | 21375 — TAN CHEE KHOON | 24 | 951 | incomplete |

Actual acquisition and exact raw/normalized provenance for every selected record:

| Date / source ID | Successful acquisition UTC | Private raw receipt basename | Raw SHA-256 | Normalized decoded SHA-256 |
|---|---|---|---|---|
| 1966-10-25 / 23251 | 2026-10-10T05:19:52.591Z | `9955ae9c-f4de-42c5-b48e-b5c9e047fc0a.bin` | `f68cc43cf9e050cb26060ebb711d159b730fb89da041ebe0963ec45e65964ae7` | `0ad66bc8a151e283bac3089c1c506a9bf80425e667509820ec34d8b5925387dc` |
| 1967-08-21 / 23244 | 2026-10-10T05:20:36.611Z | `2a8ee3ef-0aee-404f-9350-33e2eb3e3889.bin` | `6864cdc9d0c760d7919514644eb13b04fc0079de350756f4f0e9dcfc9a8bb260` | `7cac46b30a562c13ca0e15cab2aa1ec495272f611367f7000755c0d8bb06a0ba` |
| 1967-08-24 / 23236 | 2026-10-10T05:20:39.895Z | `9c86a27a-534f-4787-b972-192549c0ed58.bin` | `8cf984aa1f2e523f396c00b5c8bf488c197007a60c40cba7e730ea80d99e26c6` | `addba9e8a90d1a6029f844c6e9ea3b58e8401f1d860be4a5dbac1563cc856349` |
| 1967-11-13 / 23241 | 2026-10-10T05:20:42.800Z | `a7c72af1-820c-4339-b534-dc332f9cec7d.bin` | `f212c730811e318f3c51c458a766689868678c02ff61ac744e1ffff6a4c64d1a` | `7655867113e4d1687881fa04e274c6e782db57d4dcc3620d6194c734788a1689` |
| 1968-08-21 / 23327 | 2026-10-10T05:21:27.172Z | `21d83181-d360-42d8-80f3-7a4259889d64.bin` | `b143fc1852e30a0eea013fe94eb87e811302ab5eb2add7b28602b4c5898883b4` | `dde8e04a431e79aba931e3cc059977ed704e9a6c9f69cd391ba4cfb9ccb84daf` |

Those basenames are under `.cache/hansard/receipts/implement-001-20261010/`, with the corresponding `.bin.json` receipt containing the exact approved URL. Each sitting page-data URL is `https://hansard.parlimen.gov.my/_next/data/Zlu4qRDxrOCEM-7h59E5o/en-GB/hansard/dewan-rakyat/<date>.json?date=<date>`. The frozen private comparison ledger records every compared record's URL, path, raw hash, acquisition time, normalized/leaf digest and all selected turns' ordinal/source index/headings/raw author/source ID/timestamp/text hash. No full raw response or transcript body was added to the repository.

A real zero-match example is source identity 21328 (`ONG YOKE LIN`) with [1959-09-11 / 22942](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/1959-09-11). It has zero confidently attributed matching turns and one unresolved nonannotation passage, therefore **incomplete**, never verified absence. Raw SHA-256 is `6de60f46bd97b947571f7faa162a8833e5d20b12f1fff78025c445c99eccc297`; successful acquisition was 2026-10-10T05:14:46.392Z; private receipt is `c66b4b4f-40ca-4521-95e1-e46ed10b8e0e.bin`. Every one of the 411 compared sittings has at least one attribution gap. **No actual verified-absence pair was found in this prefix.** Controlled unit absence remains separate and cannot satisfy that live gate.

Frozen evidence inputs outside the repository:

```text
/private/tmp/hansard-live-comparison-20261010T052136Z.json
SHA-256: 06e81ecbebc0165f7f77b26fb4ebbb34c4659b9803453a6b63cf61fabadc393c
/private/tmp/hansard-live-compare-20261010T052136Z.ts
SHA-256: 2b95e5efb9443a24a2807fcdc08c775e71933918cb5e573dbe2bd7b261edb6c8
src/source.ts at comparison: 59e42f8f7da4c170bc156573f9310b85c0fa1d93a3b48c6a4351f16899748b7d
Sorted receipt-metadata-name snapshot: a7fe1a0a5b0c8a153e731d7b7e28b8fab2458522e498815e72d6eab9001d3303
```

The one-off comparison command was `node /private/tmp/hansard-live-compare.ts` under Node 24.21.0, exit 0. It verifies raw bytes and all leaves independently before exercising production normalization/result partitioning; it is not a browser, physical-device or external-human review. HTTP-200 captured responses do not prove that no unlogged transient/network failure occurred. Official source publication/revision times remain unavailable, and internal-interface support/reuse-policy scope remains unverified. Actual Mesyuarat 0 record comparison, the fresh 2026-02-10 index-2 case, positive real annotation coverage, real verified absence, final 100% inventory outcome accounting and all measured full-archive staging budgets remain pending until the bootstrap reaches those records and completes. Failure, size rejection or interruption must preserve the accepted baseline and keep T027 incomplete.

An actual prefix size probe serialized only the 411 verified `[raw SHA-256, normalized SHA-256]` pairs from the frozen ledger. That tiny hash-only projection is 55,897 decoded bytes and **29,872 gzip bytes** under the same level-nine Node gzip settings. A linear full-availability extrapolation to 4,090 sittings is 297,267 gzip bytes, already above the catalogue's 204,800-byte ceiling before other catalogue/member metadata. This is a material **forecast**, not a final measured catalogue or verified budget failure: remaining availability, final fields and compression still require actual staging measurement. The strict budget remains unchanged; the bootstrap must fail safely if the final catalogue exceeds it, without truncating inventory or weakening the check.

## T027 streaming completed-prefix verification

The replacement one-off comparison snapshots completed receipt metadata, then loads and
compares one raw sitting response at a time. It retains compact count/hash/size rows,
at most five complete pair-sample records, and receipt references for the first zero-gap
and incomplete candidates. It does not retain all raw bodies. The original frozen
411-response report and script above remain byte-for-byte unchanged.

Read-only trial snapshot: **2026-10-10T05:57:41.902Z**, completed at
**2026-10-10T05:58:10.108Z**. It verified 2,554 raw receipts, all HTTP 200, comprising
discovery, members, inventory and **2,551 distinct complete sitting responses**.
The inventory and member raw hashes match the fresh receipts above. All source identity,
raw checksum, exact author IDs/labels, original text, headings, timestamps, markers,
indices, order and production-normalizer comparisons passed: **590,873 leaves**, with
307,881 assigned items, 282,992 unresolved nonannotation passages and zero explicit
annotations. There were **zero comparison errors**. A separate concordance check
confirmed the exact raw hash, normalized hash, independent leaf-field hash and accounting
for all 411 rows from the frozen earlier report.

Every compared record was measured using exact canonical normalized JSON and actual
level-nine Node gzip bytes. The compact ledger includes both decoded and gzip SHA-256,
byte counts, raw response URL/path/hash and successful acquisition time. Aggregate
normalized bytes for this prefix are 682,487,969 decoded and 171,309,259 compressed;
the largest individual record is 1,103,020 decoded and 280,168 compressed bytes.
These individual records satisfy their respective 5,242,880/524,288-byte bounds.
The aggregate decoded sum is informational, not the staged stored-byte budget. This
prefix does not measure the actual final catalogue or final staged directory.

The run used a 256-MiB V8 heap ceiling, retaining five full sample records, and observed
245,235,712 bytes peak RSS (process maximum 239,808 KiB). Standalone TypeScript checking
and callable documentation inspection passed. Node's `--check` preflight does not strip
TypeScript in this runtime and rejected the `import type` syntax; actual Node-24
TypeScript execution exited 0. No HTTP, production source/acquisition code, state,
public output or staging resource was changed by the comparison.

In this receipt snapshot, **1,539 inventory IDs have no captured response**. They are
explicitly unobserved, not inferred unavailable, failed, absent or unattempted: a
receipt-only observer cannot establish whether an uncaptured network attempt occurred.
None of the sixteen Mesyuarat 0 entries or the 2026-02-10 response had yet appeared.
No zero-gap response was found, so actual verified absence remains unresolved. Positive
actual annotation, fresh index-2 question, final inventory outcome accounting and final
measured staging budgets likewise remain pending. This is not a T027 completion claim.

Private streaming evidence:

```text
/private/tmp/hansard-live-stream-compare.ts
SHA-256: 561e6945a02cf3cb334cffd57213178b7b3a9e9a64dfeddb5be2e318a70e643e
/private/tmp/hansard-live-stream-comparison-20261010T055741902Z.json
SHA-256: d1331bbba51321156904cf94677ef37741c0408c8d1c1e960bc50ebc43d20409
/private/tmp/hansard-live-stream-trial.log
/private/tmp/hansard-live-stream-progress.log
```

After the acquisition finishes, the same script can read the independent stage
observer's frozen actual catalogue as its optional first argument. It compares every
accepted descriptor against independent raw normalization and reports each inventory
ID's actual candidate available/retained/unavailable outcome, missing IDs, mismatches
and actual catalogue gzip/decoded bytes. An observer-captured staging candidate is not
successful staging or publication evidence; strict byte limits and acquisition exit
status still govern acceptance.

```sh
node --max-old-space-size=256 /private/tmp/hansard-live-stream-compare.ts \
  /Users/eaglecheow/dev/vote-better-malaysia/.cache/hansard/sessions/implement-001-20261010/stage-observation/catalogue.json.gz
```

Omit the first argument for a receipt-only prefix run. Each run writes a new timestamped
private report without overwriting the original frozen prefix proof.

## T027 complete captured archive comparison and rejected staging

Complete receipt snapshot: **2026-10-10T06:24:51.588Z**; comparison completed at
**2026-10-10T06:25:54.859Z** under Node 24.21.0 with a 256-MiB V8 heap ceiling.
All **4,093 completed private responses** were verified, all HTTP 200: discovery,
members, inventory and **all 4,090 distinct inventoried sitting responses**. Actual
sitting acquisitions span 2026-10-10T05:14:46.392Z through 06:23:23.192Z.
The fresh raw member/inventory hashes, official build ID and 2,017-source-identity /
Parliaments 1–15 / 1959-09-11–2026-10-08 coverage remain those recorded above.

Every inventoried ID has an independently compared full captured response. There are
zero missing response IDs and **zero comparison errors**. Independent raw traversal
and production normalization matched every leaf's original text, author label, exact
structured ID, opaque timestamp, explicit marker, index, heading path and traversal
order, as well as each sitting's raw date/filename/cycle/house/record-route identity.
Complete accounting is **1,695,818 leaves = 1,145,711 assigned contributions + 533,456
unassigned speaking passages + 16,651 explicitly marked annotations**. No unresolved
passage was assigned through its visible label or discarded as an inferred annotation.

The private ledger contains every record's exact approved URL, private receipt path,
raw SHA-256, successful acquisition time, independent leaf-field SHA-256, canonical
normalized decoded SHA-256, actual level-nine gzip SHA-256 and both measured byte counts.
It keeps only five complete sample records at a time. Peak observed RSS was 325,779,456
bytes (process maximum 318,144 KiB); raw bodies were not accumulated in memory or copied
into the repository.

### Runtime provenance remains distinct

The live bootstrap started before the foundation retention/commit repairs. Its archived
runtime inputs are under `.cache/hansard/sessions/implement-001-20261010/inputs/`:

| Actual archived bootstrap input | SHA-256 |
|---|---|
| `src/source.ts` | `59e42f8f7da4c170bc156573f9310b85c0fa1d93a3b48c6a4351f16899748b7d` |
| `scripts/acquire.ts` | `abed2917b0a8a273118f7b305ae4b3fa47fde793f285f7b589554dfb826b7c5d` |
| `package-lock.json` | `bae6ba449e28849a3a7b0651230a37918eae5d20087eee5b8897ac570526c7cb` |

This later read-only comparison uses the current validator module SHA-256
`8732d0bdd0964c538bfa2c3fb7fbad26ca90b833336849e48ff428fe93f84043`, which remained
unchanged throughout comparison. It does not relabel the running bootstrap as using the
repaired module or current acquisition/lock files. The base Git revision remains
`1c4b079935bc5b7604474c1ba55def43ed6f0270`; all exact uncommitted runtime/module hashes
above are part of the provenance. A prior progress message used the current lock hash;
the verified archived bootstrap lock hash in this table is authoritative.

### Additional actual pairs and explicit source cases

The complete archive supplies another ten checked exact-ID pairs across five full
source responses, totaling **3,033 matched turns**. All source flags in this added set
are `is_final: true`; the five draft responses and ten earlier checked pairs remain in
the unchanged frozen prefix proof. All added pairs are incomplete because every record
has unresolved speaking passages. Original paragraph boundaries, interruptions, matched
turns, gaps and annotations were compared field for field without translation.

| Official date / sitting ID | Parliament/Penggal/Mesyuarat | Exact source identity | Turns | Gaps | Annotations |
|---|---|---|---:|---:|---:|
| [2015-12-03](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2015-12-03) / 26340 | 13/3/3 | 1613 — ISMAIL BIN HAJI MOHAMED SAID | 338 | 397 | 121 |
| 2015-12-03 / 26340 | 13/3/3 | 1665 — SHAHIDAN BIN KASSIM | 234 | 397 | 121 |
| [2013-07-17](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2013-07-17) / 26201 | 13/1/1 | 1665 — SHAHIDAN BIN KASSIM | 310 | 295 | 67 |
| 2013-07-17 / 26201 | 13/1/1 | 1613 — ISMAIL BIN HAJI MOHAMED SAID | 301 | 295 | 67 |
| [2015-04-08](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2015-04-08) / 26314 | 13/3/1 | 2857 — RONALD KIANDEE | 329 | 185 | 71 |
| 2015-04-08 / 26314 | 13/3/1 | 1613 — ISMAIL BIN HAJI MOHAMED SAID | 269 | 185 | 71 |
| [2013-11-14](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2013-11-14) / 26233 | 13/1/3 | 2857 — RONALD KIANDEE | 594 | 188 | 242 |
| 2013-11-14 / 26233 | 13/1/3 | 3428 — MOHAMED AZMIN BIN ALI | 189 | 188 | 242 |
| [2010-04-01](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2010-04-01) / 25975 | 12/3/1 | 2857 — RONALD KIANDEE | 265 | 480 | 0 |
| 2010-04-01 / 25975 | 12/3/1 | 2242 — WAN JUNAIDI BIN TUANKU JAAFAR | 204 | 480 | 0 |

Exact raw and normalized provenance for those full records:

| Date / ID | Successful acquisition UTC | Raw-response SHA-256 | Normalized decoded SHA-256 |
|---|---|---|---|
| 2015-12-03 / 26340 | 2026-10-10T06:12:21.396Z | `4337742a02d8c5658e430cfd1ae33085e4e9b103ce7c77f4b0bd82970039e197` | `abb3356ca8fb332ba3e2dfcde9515a6e5c617459617f38a90932ebd298f360e7` |
| 2013-07-17 / 26201 | 2026-10-10T06:09:45.003Z | `a523a8585f86c5b7de3630db9ddfa23cfe185a93232a98ffabe7e897279fcb96` | `abb7e7e2a215ca20fbe3e844f28131b0f5d162b6719b623523205d7fc6814d2d` |
| 2015-04-08 / 26314 | 2026-10-10T06:11:39.098Z | `b8cb49f05fc446add9ccded755261fc7425352c1417d3892fe472b5069bd399e` | `6bad1be42b3d99aae522c6c4ed86e289c3c42702d8028c3334934a0a5fddba16` |
| 2013-11-14 / 26233 | 2026-10-10T06:10:08.919Z | `6c4903065eea7c40e1680ee3120adf7bd4bebe1436a44f7aa9dd82d375b40928` | `1ae82a100776c12e3c1316a8031c065cd1dd25fedcd1b0dfb4464e73abf1ff39` |
| 2010-04-01 / 25975 | 2026-10-10T06:06:05.736Z | `aad81720a8d2d354ae29a00f0557d244caad786db517e9eccc5024b40e0c49bf` | `96d69e2503b4cbe68336cd63d545b86f0777e7733295859ceab81d173944248a` |

All sixteen actual Mesyuarat 0 responses match their inventory and raw hierarchy:

| Source ID | Date | Parliament/Penggal | Assigned / gaps / annotations |
|---|---|---|---|
| 26241 | 2014-07-23 | 13/2 | 318 / 41 / 16 |
| 26299 | 2016-01-26 | 13/3 | 625 / 72 / 10 |
| 26298 | 2016-01-27 | 13/3 | 731 / 224 / 47 |
| 26611 | 2021-07-26 | 14/3 | 1288 / 446 / 99 |
| 26612 | 2021-07-27 | 14/3 | 1243 / 370 / 32 |
| 26610 | 2021-07-28 | 14/3 | 878 / 179 / 9 |
| 26609 | 2021-07-29 | 14/3 | 445 / 190 / 46 |
| 26668 | 2022-01-20 | 14/4 | 901 / 278 / 33 |
| 26719 | 2022-04-11 | 14/5 | 278 / 76 / 8 |
| 26760 | 2023-09-11 | 15/2 | 126 / 83 / 4 |
| 26757 | 2023-09-12 | 15/2 | 692 / 113 / 20 |
| 26755 | 2023-09-13 | 15/2 | 521 / 67 / 7 |
| 26759 | 2023-09-14 | 15/2 | 753 / 93 / 15 |
| 26756 | 2023-09-18 | 15/2 | 1033 / 157 / 11 |
| 26758 | 2023-09-19 | 15/2 | 1344 / 315 / 112 |
| 28921 | 2025-05-05 | 15/4 | 331 / 41 / 18 |

The fresh [2026-02-10 / 29326](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10)
response was acquired at 2026-10-10T06:22:55.274Z, raw SHA-256
`2f0b3f1e0b3f6889bde11633fa334423e1230964457eebdf046721e79e85c2bf`.
Its known question is source index 2, normalized ordinal 2, under
`WAKTU PERTANYAAN-PERTANYAAN MENTERI`. Raw author and authoritative author ID remain
null. It is an unassigned `missing-id` passage, never a contribution assigned from the
visible name. Exact original text is 455 UTF-8 bytes, SHA-256
`a98b466e397bda851e58bc039a823d78368cdd482b2c3801b06da340ab9a6f2b`.

Positive actual annotation coverage is now established. For example,
[2008-08-20 / 25861](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2008-08-20),
acquired at 2026-10-10T06:04:00.597Z, raw SHA-256
`b87c6850bad27449f9eeb1197cc84362ab15b8b82d38e016d274f55f20d61085`, supplies an
explicitly marked annotation at source index/ordinal 34. Its raw author is `ANNOTATION`,
author/member IDs are null, and original 12-byte text SHA-256 is
`3024f5d6503fce6913b47baf64587a843bcb2d34958b0d9eec0b006602d02b0f`.
Its classification follows the actual marker, not the label or content.

**No actual verified-absence pair is available in this complete captured archive:**
every one of the 4,090 records has at least one unresolved nonannotation speaking item.
The zero-gap record count is zero. Any selected identity with zero confidently matched
turns therefore remains incomplete. The actual 1959-09-11 / 22942 and source ID 21328
zero-match example above remains incomplete with one gap. Controlled verified-absence
tests do not satisfy the required real-source absence evidence. No source marker,
attribution rule or acceptance requirement was waived to fabricate that case.

### Actual resource measurements and rejection

The independent stage observer captured the complete actual temporary catalogue at
2026-10-10T06:25:04.088Z before cleanup. Its candidate snapshot ID is
`46deaa63-9074-408c-a1df-7fd687af312c`; it describes 4,090 available records, no retained
or unavailable records, and 1,246 source identities actually referenced by assigned
accepted records. These are candidate outcomes, not served content or a publication.

| Actual measurement | Bytes | Required ceiling | Outcome |
|---|---:|---:|---|
| Candidate catalogue gzip | 519,418 | 204,800 | **Fails by 314,618 bytes** |
| Candidate catalogue decoded | 3,431,888 | 5,242,880 | Within limit |
| Largest individual normalized shard gzip | 295,108 | 524,288 | Within limit |
| Largest individual normalized shard decoded | 1,745,574 | 5,242,880 | Within limit |
| All normalized shard gzip bytes | 357,224,722 | Aggregate measurement only | Recorded |
| Catalogue plus described shard gzip bytes | 357,744,140 | 900,000,000 staged-data ceiling | Within this sum; complete-site gate remains separate |

The complete normalized decoded sum is 1,555,965,150 bytes, not an individual resource
or stored-artifact budget. The archive was not truncated to meet any limit. Bootstrap
reported an uncaught structural `Compressed resource exceeds acquisition budget` error
at `validateSizes` during `stageSnapshot`; required catalogue-size rejection blocked
staging. The parent records the terminal CLI process result. The observer's captured
candidate is not a successful staging checkpoint or publication receipt. **T027 remains
incomplete because the actual catalogue budget and required actual-absence evidence do
not pass.** Later publication/browser/whole-artifact acceptance is not inferred from
complete raw acquisition or source comparison.

Private full-capture evidence:

```text
/private/tmp/hansard-live-stream-comparison-20261010T062451588Z.json
SHA-256: 83501724434db70107dd088b70bbd08ac3d4486cf9f5b9b223213065be19af34
Comparison source module: 8732d0bdd0964c538bfa2c3fb7fbad26ca90b833336849e48ff428fe93f84043
Comparison script: 561e6945a02cf3cb334cffd57213178b7b3a9e9a64dfeddb5be2e318a70e643e
Receipt metadata digest: 7bb4b593f40a2552eb2c08e7a23878b4388291181c815a4e5c84e4ade8118918
Receipt filename snapshot: 100a42b3da1a26d23face437d2ce1fb1cf6b238bcbdc115d439d66353492cbd3
/private/tmp/hansard-live-stream-full.log
/private/tmp/hansard-live-stream-full-progress.log
/private/tmp/hansard-live-bootstrap.log
.cache/hansard/sessions/implement-001-20261010/stage-observation/catalogue.json.gz
Stored SHA-256: d5891d1a67bb1659a5e134e6d477b4697415e6876ce8bdcd5e8d315a8471fed9
Decoded SHA-256: 9ba0c5c332a39026a4d067b56d57982ada0c1025e0cbabc2ec84bfe807718e80
.cache/hansard/sessions/implement-001-20261010/stage-observation/measurement.json
```

The receipt-only full comparison exits 0 because all raw source comparisons pass.
Descriptor reconciliation against the separate actual observer catalogue is reported
separately; it cannot change the failed budget or create a verified-absence case.

### Actual candidate descriptor reconciliation

The second read-only run compared the same completed receipts with the independent
observer's exact frozen catalogue. Snapshot time: **2026-10-10T06:27:09.967Z**;
completed at **2026-10-10T06:28:11.033Z**, exit 0. All 4,090 source responses again
matched, with the same complete leaf accounting and source module hash. Every actual
candidate descriptor matched its independently normalized source record: sitting
identity/flag, raw digest, successful acquisition time, decoded digest, exact gzip and
decoded sizes, and exhaustive accounting. **No missing inventory IDs and no descriptor
mismatches** were found. All sixteen Mesyuarat 0 records are available in the actual
candidate, alongside all other inventoried IDs; its outcome counts are 4,090 available,
zero retained and zero unavailable. The candidate contains 1,246 referenced source
identities and matching fresh member/inventory provenance.

The observed catalogue's `preparedAt` and preparation-status `completedAt` are
2026-10-10T06:24:11.774Z. Its `publishedAt`, workflow URL and last confirmed deployment
are null. Its prefilled `stagingOutcome: success` is candidate input metadata, not proof
that later staging succeeded: the actual terminal size check rejected the 519,418-byte
catalogue. The source and descriptor comparisons pass, while the catalogue budget and
real verified-absence requirement remain failed/unavailable. No publication occurred.

The five added sample records contain actual double-newline paragraphs and literal
interruption/laughter passages: paragraph/interruption leaf counts are respectively
399/40 (2010-04-01), 453/72 (2013-07-17), 255/22 (2013-11-14), 452/46 (2015-04-08),
and 434/27 (2015-12-03). Their complete original fields and partitions match, including
all 3,033 selected turns; the transcript words are not translated or interpreted as HTML.

```text
/private/tmp/hansard-live-stream-comparison-20261010T062709967Z.json
SHA-256: 10d372ffefc99b1d135757222c06b8c70503282eb37daac322f921a19591e68d
/private/tmp/hansard-live-stream-candidate.log
/private/tmp/hansard-live-stream-candidate-progress.log
Observer measurement JSON SHA-256: 7fba5638d35485383747f5099ddfebbad1468353af7545c8fd4e3c03b834fd18
```

This report independently checks the exact observed staging bytes against complete raw
source capture. It does not convert a rejected candidate into an accepted checkpoint,
whole-artifact pass, live served snapshot or successful T027 gate.
