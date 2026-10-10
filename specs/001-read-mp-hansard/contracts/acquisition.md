# Acquisition and Publication Contract

**Scope**: Trusted build tooling only; no deployed REST service. Read with
[research](../research.md), [static data](static-data.md) and [plan](../plan.md).

## Command contract

Implementation must provide:

```text
npm run data:acquire -- --mode bootstrap --state .cache/hansard --out public/data
npm run data:acquire -- --mode refresh --state .cache/hansard --out public/data
```

These commands do not exist yet. `bootstrap` reconciles/fetches the full catalogue;
`refresh` restores accepted state and prioritizes new, failed, recent and overdue records.
Missing valid state converts refresh to bootstrap. `--state` is private, ignored workflow
state/receipts; `--out` is generated static data. No source token is required. Paths must
not cause writes outside the chosen output/state directories or delete input state.

Exit 0 means a complete, validated output snapshot was staged, possibly with explicitly
reported source failures and retained/unavailable records. It does not mean every source
retrieval succeeded. A fatal discovery/inventory/schema/output failure exits nonzero and
does not replace accepted output. Reports distinguish success, degraded source refresh
and failed staging; a partial/error payload cannot masquerade as an empty valid record.

## Official source boundary

1. Fetch official portal HTML and read `__NEXT_DATA__.buildId`; validate it as a route
   component. Do not pin the research build ID or derive an unverified production host.
2. Fetch `/_next/data/{buildId}/en-GB/cari-mp.json` and catalogue/sitting routes described
   in research.
   The sitting route includes `?date=YYYY-MM-DD`, as verified by the probe.
3. Accept only HTTP success, expected JSON and supported schemas. Verify house/date,
   filename, Parliament/Penggal/Mesyuarat and source identity against the catalogue.
4. On a missing old-build route, rediscover once and retry against the new build. If
   schemas change or access becomes denied, record failure and preserve accepted data.

All official-source requests use `https://hansard.parlimen.gov.my`; allow redirects only within the
official host. Never scrape private credentials or fall back to a third-party mirror.
Source strings are untrusted data and are never executed as HTML/code/instructions.

## Schedule and historical refresh

Run reviewed default-branch code at `17 */4 * * *` UTC (every four hours at minute 17),
plus manual dispatch. No schedule is created by this planning operation. Use one workflow
concurrency group without canceling an active publication; persist unfinished work.

Each run rediscovers the build ID and checks the member/catalogue inventories. Deduplicate
and prioritize new/unavailable records, prior failures, the latest 30 dated sittings,
overdue records and one of six stable sitting-ID buckets. Assign a bucket by a documented
deterministic hash of the exact source ID modulo six; use oldest successful bucket check
first. Within six normal successful runs every historical record is targeted. A missed
or incomplete sweep remains overdue, rather than advancing a false completion timestamp.

Requests are serial, start at most once per second, time out after 15 seconds and have
at most two retries with backoff. Honor rate limits/`Retry-After`; stop on access denial.
Cap acquisition at four hours per run. Checkpoint accepted individual records on timeout;
later runs resume overdue work. Delays, throttling and scheduler inactivity can miss the
best-effort 24-hour target and must remain visible in receipts/overdue indications.
Waiting for required physical-device evidence can also delay publication; do not hold
the acquisition concurrency lock while an operator collects that evidence.

## Normalization, state and failures

- Recursively reconcile the entire official dated inventory. Every entry has an available,
  retained or unavailable outcome. Preserve omitted prior sittings with an explicit
  latest-inventory omission label; do not silently erase coverage or infer withdrawal.
- Use the shared source rules to account for every speech/annotation leaf exactly once,
  preserve traversal order/text/paragraphs and assign only reconciled source IDs. Missing,
  unknown or conflicting IDs remain accessible unassigned content.
- Retain canonical source identities referenced in acquired Dewan Rakyat records across
  all terms. Membership/constituency remain unavailable unless explicitly sourced; a
  speaker occurrence is not evidence of electoral tenure. Unknown IDs are gaps, not
  fabricated member records. Retain previous valid identities needed by saved/retained data.
- Store raw-response SHA-256 and retrieval receipts for audit; use decoded normalized
  content SHA-256 for static record comparison. Keep successful `acquiredAt` distinct from
  failed `lastAttemptAt`. A recheck may advance acquisition time without changing content.
- Restore checkpoints only from validated successful default-branch workflow artifacts;
  verify checksums/schema/references, repository/run origin and input code compatibility.
  Set retention to seven days. Never use PR-produced state or assume a workflow cache is
  durable. Missing/expired state requires bootstrap and an explicit report. If a prior
  publication exists, recover its retention baseline from validated trusted state or its
  last served catalogue/records checked against a matching trusted deployment receipt,
  including schema/identity/digest validation. Reconcile prior inventory entries and
  preserve accepted records on new acquisition failure. If the baseline cannot be
  validated, exit nonzero without publication; checkpoint expiry cannot turn previously
  accepted records into new unavailable records or silently erase prior entries.
- Individual source failures retain previous valid shards and label the dated failure.
  New inaccessible sittings stay selectable with unavailable content. Malformed inventory
  cannot replace the accepted catalogue. Structural validation/size failure cannot publish.

## Publication and evidence

Stage all files before replacing output. Validate inventory reconciliation, reference and
digest consistency, gzip round trips, schema/identity, all-item accounting and every
[budget](../plan.md). Deploy one complete artifact using reviewed application code after
required checks. Scheduled data work must not auto-edit/merge application source.

Acquisition size-rejection behavior requires its own foundational unit RED: exact-limit
and one-byte-over cases for catalogue/shard gzip, decoded resources and total staged data,
with prior accepted output/state preserved on rejection. The total staged-data ceiling is
≤900,000,000 bytes; the later whole-artifact gate additionally includes every shell/other
deployed file. A staged-data pass cannot establish that the complete site fits.

Prepare a frozen candidate and retain its artifact digest, `snapshotId`, application
fingerprint, fixture references, source revision and prior served-baseline digest outside
the deployed file set. Use the [plan's evidence applicability rules](../plan.md#publication-evidence-applicability).
New candidates run fresh automated checks and require actual-target reports on a trusted
test-only HTTPS origin under the repository subpath. Reuse reviewed reports only for the
exact same candidate/application/dataset/conditions; any deployed-byte change requires
new reports, even if application code is unchanged.

Missing or failed prepublication evidence records `awaiting-evidence` or the relevant
failure in the run summary/receipts, retains the prior site and ends the run. Keep frozen
candidate/report artifacts for seven days. Manual promotion names trusted default-branch
candidate/evidence artifact run IDs, verifies provenance/checksums and every prepublication
gate, and publishes the same bytes without reacquisition/rebuild. Reject expired artifacts,
changed application inputs and a candidate whose prior served baseline no longer matches
the current site. Live Pages-address checks follow publication and block a delivery claim
if they fail; they cannot be required before the first deployment.

After successful Pages deployment, record a `DeploymentReceipt` containing `snapshotId`,
deployment identifier, GitHub-confirmed `publishedAt`, `verifiedServedAt` after a live
snapshot-ID probe, and workflow URL. Never substitute build preparation or upload time
for confirmed publication. Save only validated state for subsequent runs; checkpoints
must identify which records reached a served snapshot versus merely completed acquisition.

Reports include observed change, acquisition, preparation and deployment times, raw hashes,
inventory counts, attempted/successful/failed/overdue records, missing identity/context,
size/timing results and reuse-policy limits. Official change-to-publication latency is
unavailable without official change timestamps; label observation-based latency instead.
Exercise new sitting and historical revision mechanisms with controlled fixtures and
report live observations separately.

A failed deployment leaves the old site. It cannot publish its own failure: external
workflow logs report it; the old reader shows the age of its last recorded source check.
A later successful snapshot may include dated source failures, never a claim that shipped
metadata is the latest global workflow status. No source-specific reuse permission has
been verified; attribution and that verification boundary belong in publication guidance.

The workflow is responsible for recording each started run's acquisition/staging/deployment
outcome in its GitHub Actions run summary/logs and available receipt artifacts. Repository
maintainers review failures and overdue work and restore a validated retention baseline
before manual recovery/dispatch when required. Developer guidance must explain recovery
steps and report locations. Bilingual user guidance must link the workflow run listing
and explain that missed schedules may have no run report and old snapshots cannot know
later unpublished outcomes. A shipped run URL identifies known evidence, not the latest run.
