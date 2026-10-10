# Approved 1-MiB catalogue performance policy

Scope: the user-approved catalogue stored-gzip cap changes from 204,800 to 1,048,576 bytes. Sitting gzip, decoded-resource, timing, artifact, source-verification and actual-device requirements retain their existing limits. This evidence supplements earlier reports; earlier frozen reports keep the policy and fingerprints recorded when they ran.

## RED before production

On 2026-10-10 at 17:02:19 MYT, with `DATA_LIMITS.catalogueGzip` still 204,800, ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/performance.test.ts --reporter=verbose
```

Observed **3 assertion failures and 188 passing controls (191 tests)**. [Complete RED output](tdd-catalogue-performance-policy-red.txt) was saved before the shared production constant changed.

| Required new acceptance | Observed assertion failure |
| --- | --- |
| `evaluateBudgets` accepts 204,801 stored catalogue bytes | `expected [Function bound evaluateBudgets] to not throw` received `Error: catalogueGzip bytes: exceeded 204800` |
| `evaluateBudgets` accepts 1,048,576 stored catalogue bytes | The same assertion rejected at the former 204,800-byte ceiling. |
| `measureArtifact` measures a real 1,048,576-byte gzip file | `promise rejected ... instead of resolving`, caused by `data/catalogue.json.gz compressed bytes: exceeded 204800`. |

The native filesystem measurement fixture contains legal gzip of `{}` with trailing zero padding. It must report `catalogueGzip: 1048576`, `catalogueDecoded: 2`, and `sourceVerified: false`. This proves the stored-byte allowance and independent decoded measurement; it does not establish source completeness or actual performance/device acceptance.

The new report and real-file rejection cases at **1,048,577 bytes were already GREEN under the old cap**, so they are controls, not new RED evidence. They will establish the exact new boundary only when they remain GREEN after the production cap changes. Existing negative catalogue size fixtures were moved to this new one-byte-over value. The original 204,800-byte positive measurement remains a valid below-cap control and its label now says bounded measurement.

An earlier trial incorrectly expected the existing measurement error to contain `stored-gzip bound`. The actual stable error says `compressed bytes`; that matcher was repaired before the final RED run. The trial's fourth failure is excluded from behavioral RED claims. No import, fixture, or runtime harness failure is counted.

Fingerprints at the recorded behavioral RED:

- `tests/unit/performance.test.ts`: `e6ff52e1684170a8d21e080f7e2449d8c8d9c3fd970afeb645f10ec34517a5ab`
- `scripts/check-performance.ts`: `fa9c3c5643507908b55fa8880a7f6c4be8b89b8df7031dfd7ffb8cddf25d561d`
- `src/source.ts`: `8732d0bdd0964c538bfa2c3fb7fbad26ca90b833336849e48ff428fe93f84043`

After this capture, only comments and the unchanged positive-control label were clarified in the test file. No production module was edited by this agent. Parent owns the shared constant change and subsequent GREEN verification.

## GREEN after the shared cap change

Parent changed `DATA_LIMITS.catalogueGzip` to 1,048,576 after the acceptance assertions above were observed RED. At 17:03:11 MYT the same performance suite passed **191/191**, including all three new acceptance assertions and both 1,048,577-byte rejection controls. [Complete GREEN output](tdd-catalogue-performance-policy-green.txt) is retained separately from the RED log.

- Final test fingerprint after comment/label clarification: `2060a5839cb402d59d1802839234f34a536648eef3edacc6dff23c53f1dae421`.
- Parent-reported post-change source fingerprint: `ab5b02ac7dc3a3d484572ba1dba6a1a2818ae29d105130f83b2cb7246b8c6896`.
- `npm run typecheck`: exit 0.
- Direct `checkCodeDocumentation(process.cwd())`: `[]`, exit 0; this checks callable comments without claiming final candidate accuracy acceptance. The broader `npm run check:docs` CLI requires candidate/review inputs, so its missing-input invocation is excluded from validation claims.
- Scoped `git diff --check`: exit 0.

Both `.txt` logs and this Markdown evidence are outside ignore rules; no force staging, task edits, or commit was performed by this agent. These are controlled unit/filesystem proofs of the approved byte policy, not a new lab run or physical-device result.
