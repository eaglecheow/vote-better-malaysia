# Production performance evidence — acceptance pending

## Complete local frozen-output size diagnostics

The final uncommitted working-tree build contains **4,099 files**, including all
**4,090 source shards**. Independent authoritative `measureArtifact` validation
passes layout, every catalogue-to-shard descriptor/digest/accounting check and all
byte limits. [Structured diagnostics](performance-local-sizes.json) retain every
file hash and every compressed/decoded shard size; [final verification](final-verification.md)
records the application and canonical artifact digests.

| Measurement | Actual bytes | Limit bytes |
| --- | ---: | ---: |
| Shell gzip, including HTML/CSS/worker/help/manifest | 23,938 | 153,600 |
| JavaScript gzip | 15,169 | 102,400 |
| Icons combined | 3,998 | 61,440 |
| Entire stored artifact | 357,817,266 | 900,000,000 |
| Catalogue gzip | 519,418 | 1,048,576 |
| Catalogue decoded | 3,431,888 | 5,242,880 |
| Largest sitting gzip | 295,108 | 524,288 |
| Largest sitting decoded | 1,745,574 | 5,242,880 |

The ranked decoded fixtures are median `25935`, p95 `25716` and largest `26123`.
The source snapshot remains `46deaa63-9074-408c-a1df-7fd687af312c`, prepared
`2026-10-10T06:24:11.774Z`, publication time null. No source time was relabeled.

This is a **local size diagnostic**, publication-ineligible, with the committed base
and uncommitted inputs distinguished. T071 stays unchecked because authentic immutable
reviewed-main candidate provenance and the required served baseline are not established.
Actual transport bytes are unmeasured; no timing, laboratory, physical-device or field
pass is inferred from file size. All 4,090 records are retained without truncation.

## Available host, 2026-10-10

The read-only hardware probe was:

```sh
sysctl -n hw.model hw.memsize machdep.cpu.brand_string
```

It returned `Mac16,10`, `17179869184` bytes (16 GiB), and `Apple M4`.
This host is neither the plan's `ubuntu-24.04` x64 laboratory allocation
(four vCPUs, nominal 16 GiB, verified runner image and CPU) nor its physical
desktop Safari baseline (MacBook Air M1, 8 GiB). Local Chromium/WebKit mechanism
checks on this host cannot supply either performance acceptance result.
The first sandboxed probe was denied; the subsequent authorized read returned
the values above. No inferred hardware specification is used as a measurement.

The [performance checker](../../../scripts/check-performance.ts) and
[laboratory collector](../../../scripts/collect-performance.ts) have controlled
positive/negative tests, including exact candidate matching, all six physical
targets, runner allocation, raw samples, limits and report expiry. See
[checker TDD](tdd-performance.md), [regressions](tdd-performance-regressions.md),
[collector TDD](tdd-performance-collector.md), and [CI evidence](ci.md).
These are mechanism checks; their synthetic measurements are not observations
of this complete production reader.

## Required measurements still unavailable

T072 remains unchecked. No authentic production laboratory report has been
collected on the specified Ubuntu allocation. No matching actual-target report
has been supplied for Pixel 6a Chrome, iPhone 13 Safari, Windows 11 x64
i5-8250U/8 GiB Chrome, Edge or Firefox, or MacBook Air M1/8 GiB Safari.
Each independent target still requires 30 online attempts over at least five
differently sized sittings (at least 29 within five seconds) and ten closed-reader
saved offline attempts (all within two seconds), on the same frozen candidate.
Named plan hardware does not establish its availability during this operation.

The required laboratory report still needs both profiles, the ranked
median/p95/largest records, all 240 raw observations, exact conditions and
actual served bytes. Local file lengths and controlled browser timing plumbing
cannot substitute for measured transport bytes or these observations. Missing
reports must fail the existing gate; no partial or fabricated passing report is
created here.

Mobile real-user p75 LCP/INP/CLS: **unavailable and unverified**.
Desktop real-user p75 LCP/INP/CLS: **unavailable and unverified**.
Neither is inferred from laboratory TBT, interaction tests or the other device
group. First offline visits and unsaved pairs have no readable-result time budget;
their explicit connection-required feedback remains interaction-tested.

The complete archive's acquisition measurements are in [source evidence](source.md).
The final local whole-output diagnostics above remain separate from trusted
CI/publication candidate provenance, actual network observations and T072.
