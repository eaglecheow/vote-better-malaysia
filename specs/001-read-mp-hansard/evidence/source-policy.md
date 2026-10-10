# Approved source policy decision — 2026-10-10

The user directly approved the policy in the implementation chat with the exact answer:

> Approve 1 MiB and conditional absence

The parent agent relayed that approval to the documentation agent on 2026-10-10.
This record was prepared after the agent observed **2026-10-10T09:00:15Z**; that is an
agent-recorded time, not a captured timestamp of the user's answer.

The decision changes only two feature requirements:

- The complete catalogue gzip ceiling increases from 204,800 bytes (200 KiB) to
  **1,048,576 bytes (1 MiB)**. It still applies to the complete catalogue, without
  removing members, sittings, provenance, status or retained references.
- A real verified-absence sample is required only when the complete source supplies
  an eligible fully validated record with zero unresolved nonannotation items and
  zero assigned matches for the selected identity. When none exists, acceptance must
  record the complete dated archive eligibility search, reconciled inventory/record
  counts, method and result, and explicitly disclose that a real-source absence
  sample is unavailable.

The authoritative result classifier is unchanged: zero matches in a record containing
attribution gaps remain **incomplete**, never verified absence. Exact source words,
all-leaf accounting, IDs and annotations remain unchanged. Controlled complete-record
absence tests remain mandatory and cannot establish real-source absence.

All other budgets remain unchanged, including each sitting gzip ≤524,288 bytes,
each decoded data resource ≤5,242,880 bytes, full staged data and whole deployed artifact
≤900,000,000 stored bytes, and every shell/icon/timing limit. Required TDD, source
reconciliation, browser/device, documentation, CI and release checks still apply.

The [original full-archive source report](source.md) remains unchanged. It records an
actual candidate catalogue of **519,418 gzip bytes**, exceeding the then-applicable
204,800-byte ceiling by 314,618 bytes; staging rejected that candidate. The report also
records a complete eligibility search of all **4,090** captured records: every record
has at least one unresolved nonannotation item, with **zero** eligible zero-gap records.
The complete raw comparison and candidate descriptor reconciliation are recorded there,
with timestamps, hashes, methods and private receipt references. The revised policy
does not retroactively make the rejected staging run succeed or create an absence pair.

Implementing the revised ceiling requires fresh meaningful boundary RED before the
production change, GREEN/regression checks and successful re-staging/measurement under
the new ceiling. Existing completed task markers and earlier evidence cannot substitute
for those checks. This document records approval and requirements only; it claims no
new staging, browser, performance or publication result.

The separately approved [local Firefox phase deferral](browser.md) is preserved. It
allows later local implementation after the full-source check finishes while this
macOS host cannot launch Firefox. **T028 remains unchecked**; Firefox and all final
browser/device/release checks remain unverified until executed. Neither approval
authorizes publication with missing acceptance evidence or amends the constitution.

Design alignment: [specification](../spec.md), [plan](../plan.md), [research](../research.md),
[quickstart](../quickstart.md), [static data contract](../contracts/static-data.md),
and [tasks](../tasks.md). Historical evidence and reviewer-owned checklists were not edited.
