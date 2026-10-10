# Worker/build review: additional pre-production RED

On 2026-10-10, root authorized focused **test-only** preparation while publication
T038/T039 was in progress. US3 production still waits for T044. This report supplements
[the original T046/T049 evidence](tdd-worker.md); it does not relabel that historical
145-case run or claim that its guarded later assertions were reached.

Only [worker tests](../../../tests/unit/worker.test.ts),
[build tests](../../../tests/unit/build-worker.test.ts) and this evidence/log set changed.
Existing assertions remain in place. The worker, builder, package/configuration, index,
public assets, native PWA fixture, task markers and aggregate evidence were not edited.
The worker and builder remain inert. No actual-engine PWA pass is claimed.

## Reachability and fixture boundaries

New WREV/BREV cases invoke the existing production entry points and inspect independent
effects without stopping first at a returned status/manifest or required-listener guard.
Missing responses/files are handled as nullable observed output, not dereferenced or
read as nonexistent files. Soft assertions reach later required effects in the same test.

The client fixture now models native enumeration defaults: uncontrolled windows are
hidden unless `includeUncontrolled:true` is requested. It records the supplied options
and makes no application cleanup decision. All pre-existing fixture clients default to
controlled, so existing assertions and scenarios remain intact. A restart fixture copies
independently seeded cache bytes and retains live windows into fresh worker memory with
an empty client-version map; it does not run installation or activation policy.

The bootstrap case copies the **actual** `worker/service-worker.ts` into an isolated
temporary project, invokes the real builder entry point, and evaluates generated classic
bytes against an inert native-shaped VM scope. The scope records listener registration;
its spies supply no successful install, cache, fetch or readiness behavior. When the inert
builder emits nothing, an empty valid script is evaluated and required listeners are
observably absent. This is unit bootstrap evidence, not a native browser installation.

Build mutations remain valid JSON/HTML/JS/CSS/PNG inputs. Future storage/update modules
are temporary source fixtures. Data strings are deliberately unverified layout inputs
excluded from shell generation; they do not establish source completeness or validation.

## Excluded harness run

The initial 17:52:38 MYT run is preserved in
[the harness log](tdd-worker-review-harness.log) and is excluded from RED evidence.
String matchers received undefined values, and containment matchers received undefined
arrays. These matcher errors were repaired using empty-string/array fallbacks while
retaining direct positive output assertions. No production code changed during repair.
An intermediate repaired run at 17:53:05 produced 189 failures/5 controls before the final
lifecycle/omission cases were appended; its raw log was superseded by the final complete
run below and is not used as a separate durable RED claim.

## Final observed RED

Runtime: Node **24.21.0**, npm **11.17.0**, Vitest **5.0.3**. Tested HEAD
`1c4b079935bc5b7604474c1ba55def43ed6f0270` plus authorized working-tree changes; this
is not a new commit.

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts tests/unit/build-worker.test.ts \
  > specs/001-read-mp-hansard/evidence/tdd-worker-review-red.log 2>&1
```

**17:54:06 MYT**, exit **1**, **201 failed /5 passed out of 206**, two files, 785 ms:
worker **120 failed/5 passed out of 125**, build **81/81 failed**. The unchanged historical
145 cases remain RED, alongside **56 new failing cases** and **5 passing controls**.
[Complete raw log](tdd-worker-review-red.log).

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
npm test -- --run tests/unit/worker.test.ts tests/unit/build-worker.test.ts \
  -t 'WREV|BREV' \
  > specs/001-read-mp-hansard/evidence/tdd-worker-review-focused-red.log 2>&1
```

**17:54:26 MYT**, exit **1**, **56 failed/5 passed/145 skipped out of 206**, 556 ms.
The [focused raw log](tdd-worker-review-focused-red.log) isolates all **61 additions**:
worker **33 RED +5 controls**, build **23 RED**. No TypeError, ReferenceError,
SyntaxError, ENOENT, unhandled error or invalid-matcher combination appears in either
final RED log. The reported counts are **test cases**, not the larger number of soft
assertion failures printed by Vitest.

| New cases | Count | Observed missing behavior |
| --- | ---: | --- |
| WREV001–006 | 6 RED | Missing cached required bodies/requests, no obsolete-cache deletion, no skipWaiting, missing actual-source map entry, undefined readiness for independently mixed/opaque cache fixtures |
| WREV008 | 2 RED | No explicit `matchAll({includeUncontrolled:true,type:'window'})` request for unknown/older uncontrolled windows |
| WREV009–010 | 2 RED | No source status reply after fresh worker memory; no Response/exact old cached body after restart |
| WREV012 | 6 RED | Explicit empty/null/bad/uppercase/numeric/boolean versions return undefined instead of rejection; none may become omitted-version discovery |
| WREV013 | 3 RED | Missing/foreign/lookalike actual CLIENT_VERSION sources return undefined instead of rejection |
| WREV014–015 | 2 RED | Empty message/install lifetimes, no source reply, and empty install work resolves instead of exposing the required failed lifetime |
| WREV017–019 | 3 RED | No respondWith/data body, absent install lifetime/cached bodies, and absent activation lifetime/obsolete-cache deletion |
| WREV020 | 9 RED | Each omitted mandatory resource declaration resolves undefined instead of rejecting before any fetch/cache operation |
| BREV001 | 1 RED | No complete sorted asset declaration, generated index stamp or worker body |
| BREV002 | 12 RED | Before/after versions both undefined, violating direct invalidation assertions for eight original inputs plus storage/update modules, package and TypeScript configuration |
| BREV003 | 6 RED | Before/after versions both undefined after valid index/help/JS/CSS/manifest/PNG byte changes |
| BREV004 | 1 RED | Missing declarations for newly introduced font/image/HTML assets |
| BREV005 | 1 RED | No valid version or emitted worker on either repeat invocation |
| BREV006 | 1 RED | No valid generated version after changing only excluded data/prose/test files |
| BREV007 | 1 RED | No generated worker or required install/activate/fetch/message listener registration from the copied production entry |

The five **already-passing controls**, never counted as RED, are WREV007 (native-default
fixture enumeration), WREV011 (old cache remains with fresh unknown client tracking),
and WREV016's three non-client event sources (null, empty object, missing ID cause no
reply, map mutation or skip). Their current inert-handler passes do **not** establish
implemented source validation or native lifecycle acceptance.

BREV005's equality comparisons currently compare missing values and pass; only required
valid version/body emission fails. BREV006's absent-value equality and no-data inclusion
comparisons also pass; only valid generated identity fails. Those predicates are reachable
future regression checks, **not independent observed RED for determinism or data
independence**. Likewise cache/other-client preservation and no-claim/no-skip controls
within failing cases are not relabeled as failures. Direct invalidation, required output
and lifecycle effects have the failures listed above.

## Fingerprints

| File | SHA-256 |
| --- | --- |
| `tests/unit/worker.test.ts` | `79ce17f1d2c31a18b2db42349a12ae88b24aeab74cd2b5e9eabc5ea337a07252` |
| `tests/unit/build-worker.test.ts` | `426a0c55a8af3d83271347f0300573a3037bad4c7c7f2578aafd433563b90bea` |
| Complete RED log | `1086063f1c61659aeda5078af2d78f964f92d5c691ba537a3e345d47cda30d50` |
| Focused RED log | `9af13f011ec654af678181534e7c56d9650416633ea60e34b4751cb9034b469c` |
| Unchanged `worker/service-worker.ts` | `f4e25f0690859c67a2c94fa7fe0a601d69177fd1c0eeb2899bb79664b52bd5a1` |
| Unchanged `scripts/build-worker.ts` | `1ad036446efe924744febfdcb0594150b269a2646e1e7a08dddab9a9b376790b` |
| Unchanged `vite.config.ts` | `31c26b653f20988b46cd6dcb45a225a801bfdb901aa8ceb9b0e61d590416f78e` |
| Unchanged `package.json` | `941d2c48c4387d3d14d3ede458fbcc2c01c2873c2f1b520ecf62f7e2d94d7ad6` |
| Unchanged `index.html` | `657886b7b64284bff8df9ccbdc46524918165ddc1688e1c33c398165952856b2` |

## Checks and remaining gate

- `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck`:
  exit 0; [typecheck log](tdd-worker-review-typecheck.log).
- `checkCodeDocumentation(process.cwd())` through Node 24's TypeScript loading:
  exit 0, `[]` across the repository; [mechanical documentation log](tdd-worker-review-documentation.log).
- `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run
  tests/unit/documentation.test.ts tests/unit/harness.test.ts`: **49/49 GREEN**, two files,
  17:54:26 MYT, 988 ms; [control regression log](tdd-worker-review-controls.log).

This is test preparation, so it has no production GREEN/refactor claim. No broader test
refactor was needed; the only existing fixture changes model the native platform boundary.
T044 still gates US3 production. Subsequent implementation must pass these suites and
appropriate regressions/type/documentation checks, record its refactor/no-refactor decision,
and run actual native PWA journeys. Real worker termination, uncontrolled-tab behavior,
Cache Storage/IndexedDB lifetimes, browser installation and physical target acceptance
remain separate evidence; controlled unit scopes and a VM bootstrap cannot establish them.
