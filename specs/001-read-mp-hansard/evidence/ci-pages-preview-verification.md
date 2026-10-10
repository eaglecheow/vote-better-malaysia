# Public preview repair verification — 2026-10-10

The user approved an explicitly labeled public preview with a smaller checklist.
This verifies the local repair operation on `codex/fix-ci-pages`, based on merged
main `0ad1c20450718e308d6dc81f3a6b5ef24e4230a9`. Original full-release acceptance
remains pending; no hosted repair run or deployment has been claimed.

## Changed behavior

- Controlled local acquisition tests explicitly select local context, including
  when the host has `GITHUB_ACTIONS=true`. Production trust validation is unchanged.
- Ordinary PRs install Chromium before native units and independently build/test
  the production shell. The approved preview omits full-release evidence gates;
  `release-acceptance` explicitly enables them and missing genuine inputs still fail.
- CI and main candidate production share source-backed collector fixture selection,
  real assigned member IDs and complete selected hashes; main promotion rejects
  tampered manifests and performs no rebuild.
- A manual, main-only `pages-preview.yml` gates static Pages deployment on all units,
  complete fresh source acquisition, build, source/byte validation and all three
  authored browser engines. Only `dist/` is uploaded. Preview/normal publication
  use the same concurrency group and separate minimum deployment authority.
- The reader and guidance label the public preview in BM/English and describe
  manual refresh and unverified full-release/device/reuse boundaries.

## Observed local checks

All checks use Node 24.21.0, pinned dependencies and the existing installed browser
directory `/private/tmp/hansard-browsers` where applicable.

| Check | Observed result | Boundary |
| --- | --- | --- |
| [Full unit suite](ci-pages-preview-unit-green.log) | **2,038/2,038**, exit 0, with `GITHUB_ACTIONS=true` | Includes native Chromium boundaries and controlled provider/report cases. |
| [Final focused CI/preview/docs](ci-pages-preview-final-focused.log) | **89/89**, exit 0 | Includes final language assertion and executable missing-locator feedback. |
| [Final build/type](ci-pages-preview-build.log) | Exit **0** | Final bilingual notice and corrected help, full historical source output. |
| [Final frozen production browsers](ci-pages-preview-browser-green.log) | **108/108**, exit 0, **23.6 s** | Authored native Chromium/WebKit journeys at the repository subpath on macOS; no rebuild. |
| [Complete preview byte/source scan](pages-preview-sizes-final.log) | **4,090** source shards; shell **24,225** gzip bytes, JS **15,170** gzip bytes, icons **3,998** bytes, artifact **357,817,929** stored bytes | All source/layout/per-shard/catalogue/whole-artifact and shell/JS/icon limits pass; no timing/physical-device claim. |
| [Actual invalid preview outputs](pages-preview-sizes.log) | Oversized shell/JS/icons and missing source shard reject; restored complete output passes | Uses the actual preview workflow size script on owned temporary copies. |
| [Workflow syntax](ci-pages-preview-shell-syntax.json) | **70/70** shell bodies | Ruby parses actual YAML; bash validates syntax. No hosted execution proof. |
| [Callable documentation](ci-pages-preview-code-docs.log) | `[]` missing comments | Current checkout scanner; no fabricated human accuracy review. |
| [Preview UI evidence](tdd-pages-preview.md) | BM/English 320-pixel native Chromium checks and inspected screenshot | Visible persistent notice with explicit paragraph languages and no horizontal overflow. |

The final root artifact's **4,099** path/length/SHA-256 triples exactly match the
independently measured final temporary build. [Binding](ci-pages-preview-artifact-binding.json)
records canonical artifact digest
`6b328acd878302945a5a5c7516a61f8d0c42661ccfe769dfac7109c1af0c0b5c`
and application fingerprint
`6bf90c39765f13f603b08f17e4b494aeb5f5a453940169fc1a97c45a5b4cab08`.
The source is the previously acquired complete snapshot
`46deaa63-9074-408c-a1df-7fd687af312c`, prepared `2026-10-10T06:24:11.774Z`.
It was revalidated here, not freshly acquired or published. The hosted manual
preview workflow performs fresh acquisition before deploying.

The first unrestricted unit run was blocked by sandbox loopback binding; the
unchanged suite passes outside that restriction. [Sandbox output](ci-pages-preview-unit-sandbox.log)
is retained as an environment failure, not behavioral RED.
One initial browser run had six WebKit offline navigation failures. Targeted and
complete unchanged comparisons subsequently pass, followed by the final changed
build's **108/108** run. The [investigation](tdd-preview-browser-recovery.md) preserves
the failed run and reports the cause as unconfirmed. No retry flag, browser skip,
offline assertion weakening or speculative worker fix was added.

## Release and remote boundary

Repair RED/GREEN/no-unnecessary-refactor evidence is linked from
[acquisition context](tdd-ci-acquisition-context.md), [CI workflow](tdd-ci-preview-workflow.md),
[candidate fixtures](tdd-pages-fixtures.md) and [preview workflow/banner](tdd-pages-preview.md).
Independent connected-code review found no remaining actionable defect after the
bilingual Help correction. Source/document whitespace checks pass. Captured test
logs retain their exact original output, including runner-emitted blank/trailing
whitespace; staged whitespace validation excludes only those raw evidence logs.

Read-only GitHub inspection confirms `main` is public, Pages is disabled and the
caller has push/admin access. The earlier PR
[hosted failure](https://github.com/eaglecheow/vote-better-malaysia/actions/runs/38052361819)
is historical evidence for the repaired defects. The repair has not been pushed,
so its hosted Ubuntu/Firefox checks and actual Pages address remain unverified.
The known macOS Firefox pre-launch limitation is not replaced with a passing claim.
Physical device, lab/field performance, human reviews and full-release source reuse
policy applicability remain pending under the original checklist.

The local preview repair is ready for remote verification. Push requires explicit
user authorization under `AGENTS.md`; a successful hosted check and confirmed live
preview must precede any publication-success claim.
