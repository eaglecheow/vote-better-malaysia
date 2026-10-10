# CI workflow static review

On 2026-10-10 the implemented `.github/workflows/ci.yml` was reviewed without editing
production or invoking GitHub workflows/settings. Reviewed workflow SHA256:
`1866c0f11ddd290f1c8f40102a4c57bdfd04c697e17c8ecc0f6770ad52dbf871`.

[Structured syntax results](ci-shell-syntax.json), SHA256
`f7291729485bce30c0ec8a64da28132d492e712612067b14e4738f649200b40d`, record **39/39**
shell bodies passing `bash --noprofile --norc -n`. YAML was parsed with Ruby
`YAML.safe_load(..., aliases: false)` and serialized through JSON. Only GitHub expression
placeholders were replaced with harmless validated values for the shell checks; no run
body was executed. This does not validate GitHub's expression engine or establish hosted
workflow success.

The reviewed configuration has explicit PR-head checkouts, a separate main-only manual
producer, rejecting dependent gates after failed immutable inputs, read-only repository
permissions, and no Pages deployment role. The laboratory step owns its locked-Vite
preview PID, checks readiness and serves the frozen candidate at the repository subpath
before collection. Its trap cleans up only that process. Candidate upload precedes the
laboratory origin binding, which uses the actual upload ID/digest and separate producer
and tested revisions. These are configuration observations, not measured lab results.

Pinned download accepts exact artifact IDs, rejects digest mismatches against provider
metadata and extracts a single selected artifact directly into the requested directory.
The verified multi-path upload preserves `candidate/`, `lab/`, `reports/` and `result.json`
beneath their common root. Sources: [pinned download implementation](https://raw.githubusercontent.com/actions/download-artifact/9000827ccba6bdab643e8b6fd33ac0654aef8333/src/download-artifact.ts)
and [pinned upload path logic](https://raw.githubusercontent.com/actions/upload-artifact/cf430e030ddbb5b0abf93d22962f4752f3646cd9/src/shared/search.ts).
The CI helper separately must enforce the locator's digest and every required archive
file; `if-no-files-found: error` alone does not require all listed paths.

Runtime helper verification, complete-source/actual-device evidence, real Ubuntu
collection, remote required-status settings and observed merge blocking remain separate
gates. This static review marks none of those complete.
