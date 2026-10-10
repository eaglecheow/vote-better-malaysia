# Source schema TDD evidence — T005–T008

## RED — T005/T006

- Run time: 2026-10-10T04:15:52.951076+00:00
- Base revision: `1c4b079935bc5b7604474c1ba55def43ed6f0270`; uncommitted implementation work tree with inert schema entry points.
- Node: 24 (selected through `/private/tmp/hansard-node24/node_modules/node/bin`).
- Command: `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-schema.test.ts`
- Observed exit: 1; **148/148 tests failed with behavioral assertions**, one test file, no import/syntax/dependency/fixture failures.
- Full observed output: [tdd-schema-red.log](tdd-schema-red.log).
- Expected and observed initial failures: accepted IDs returned undefined instead of exact decimal IDs; accepted catalogue returned undefined instead of its unchanged value; invalid constrained fields/duplicate IDs/publication receipts/unavailable descriptors did not throw; source member projection returned an empty array rather than six identities; recursive source inventory returned zero instead of eighteen selected sittings.
- Test identifiers cover `SCHEMA-ID`, `SCHEMA-CATALOGUE`, `SCHEMA-MEMBER`, `SCHEMA-REJECT`, `SCHEMA-REQUIRED`, `SCHEMA-UNIQUE`, `SCHEMA-CONFLICT`, `SCHEMA-RETAINED`, `SCHEMA-UNAVAILABLE`, `SCHEMA-SIZES`, `SCHEMA-PUBLICATION`, `SCHEMA-TIMES`, `SCHEMA-RECEIPT`, `SCHEMA-RAW-MEMBERS`, `SCHEMA-RAW-INVENTORY`. Every parameterized case failed in the linked output.
- Scope: FR-001/002/005/006/008/013–015 source identity/metadata and DV-001 foundation schema validation; these results do not establish acquisition-size preservation (T013/T014), full-source completeness, browser/device behavior, publication or real absence.
- Source-derived fixture scope/hash/provenance are documented in `tests/fixtures/manifest.json`; aggregate catalogue counts/digests/status/receipts and invalid cases here are explicitly controlled synthetic cases.

### RED file fingerprints

```text
src/source.ts: f8551ec4ec07d2cb0c83ddbaed23431fd0599222738bdd6b06340c038e3679eb
tests/unit/source-schema.test.ts: 7513999bfed92f60cc7a337e959e301eebbcbea79f07e6d8c555825e6dca5409
tests/fixtures/catalogue.ts: e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a
tests/fixtures/source-samples.json: 60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526
```

Final additional preimplementation RED run: 2026-10-10T04:16:27.654845+00:00; includes all five invalid receipt fields, raw supplied historical context, invalid raw context and absent source final status. Final schema test SHA-256: `6610d0823f6f1a78a0437dfe56e5ff18ce2ddf5c395d65c50b9ca8d39107d19c`.

Before production, conflicting source filenames under distinct sitting IDs also failed in the final 148/148 behavioral RED run. Final test SHA-256: `e8a05d39a2fc64e4299ee2158c1156e574c09aa8a0906f4d37ce8cb0897ff86c`.

## GREEN — pending T007/T008

Production schema behavior will be written only after the recorded RED above.

## Review regression RED before fixes

- Time: 2026-10-10T04:19:58.253644+00:00
- Command: `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-schema.test.ts`
- Observed: 148 passed, 2 failed with `expected [Function] to throw an error`, exit 1.
- Regression 1: availability `["available"]` was incorrectly coerced to a supported enum.
- Regression 2: an unsupported root `start_date` array was skipped, hiding unvalidated source-like content.
- Output: [tdd-schema-regression-red.log](tdd-schema-regression-red.log).
- Production-before-fix source SHA-256: `f60f5d2b5837d0c867b9e3e6c344482a6364f2adeda1f90269312ed83017a515`.

## Final GREEN — T007/T008

- Time: 2026-10-10T04:20:59.566274+00:00
- `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/source-schema.test.ts tests/unit/harness.test.ts`: exit 0, **151/151 passing** (150 schema cases plus the pre-existing harness assertion), two test files.
- `PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm run typecheck`: exit 0.
- Mechanical `checkCodeDocumentation(process.cwd())` restricted to `src/source.ts`, `tests/unit/source-schema.test.ts`, `tests/fixtures/catalogue.ts`: zero missing callable-purpose/parameter/return/throw/side-effect findings. Inline callback documentation was added without changing behavioral assertions.
- The full `npm test -- --run` was also invoked: schema and harness passed; independently in-progress acquisition/items/performance/documentation behavior suites remained RED at that moment. This is not a full-repository GREEN claim. Their missing behavior is outside T005–T008, rather than an existing completed-behavior regression.
- Direct validation of the current full raw member/catalogue responses in `/private/tmp/hansard-recon/` accepted 2,017 source identities, 4,090 dated sittings and 16 Mesyuarat 0 sittings. This validates inventory shape only; full transcripts, real absence, archive size and browser delivery remain unverified.
- Refactor review: kept explicit small validation helpers shared by the four schema entrypoints; no additional refactoring needed. Every introduced production helper and test callback has a reviewed JSDoc purpose and required tags.
- Review regressions above are GREEN: enum coercion is rejected without coercion; unsupported root metadata cannot silently hide source-like data.
- Leaf normalization and result entrypoints remain inert scaffolding until their separate recorded RED/GREEN tasks.

### Final schema-group file fingerprints

```text
src/source.ts: ae345a318a633eda336d7c3e5a502d80376fa6f76c3e584330d64ed854adbc86
tests/unit/source-schema.test.ts: aafb3e9d6c76f4a64760a9d65f22e53e7d6dce39e2c2b41653ddbee992b7a76f
tests/fixtures/catalogue.ts: e198c89b1b49bb5217bfeeb3b8633adeb89f79de90efbac8f9c56a030183f94a
```
