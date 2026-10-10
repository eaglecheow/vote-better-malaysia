# T018/T020/T022 message subset

## Scope

The online reader has forty generated message keys in explicit `ms` and `en` locales. `getMessages(language)` supplies labels only; the first-visit BM choice, target-language switch, selection preservation and transcript rendering belong to the reader integration. Source identity wording does not verify MP membership or invent a constituency. Complete-record absence, unresolved passages and record unavailability have distinct scoped wording. Successful source acquisition, snapshot preparation, confirmed site publication and device validation have separate labels; absent official dates remain explicitly unavailable.

## Recorded RED before labels

- UTC time: 2026-10-10T04:59:21Z; base revision `1c4b079935bc5b7604474c1ba55def43ed6f0270`; Node 24.21.0.
- Command: `npm test -- --run tests/unit/messages.test.ts`. Exit 1, **83/83 tests fail with behavioral assertion failures**; no syntax/import/fixture/harness errors. Full observed output: [tdd-messages-red.log](tdd-messages-red.log).
- Production was an inert typed `{}` return, with no labels, locale dispatch, source translation or default-locale behavior.
- All eighty `MSG-MS-<key>` and `MSG-EN-<key>` assertions fail because each required label is `undefined`. The two `MSG-KEYS-ms/en` assertions observe `[]` instead of the forty required keys. `MSG-SOURCE` observes missing descriptions instead of the explicit original-language explanations.
- The source-byte equality is a boundary check and already holds for inert code. It is not claimed as an independently failing translation or reader-rendering assertion; the message module receives no source data. Exact source text preservation through language switching must pass the separately owned reader/browser tests.
- `npm run typecheck`: exit 0 before production labels.
- Inert `src/messages.ts` SHA-256: `893d2f1ebd9217069c304dadd6ec857209127147929e9f97dea3a59212917ceb`.
- Test SHA-256: `5180082f25ef1c4533f23fc852b4a4925028bba6d1a290443146a8fbaac8f36e`.
- Archived source fixture SHA-256: `60efab60d09b2b8553d3615bd4afa930b683d943d1012853757771876e41e526`.

The forty per-locale identifiers are: `title`, `description`, `language`, `search`, `member`, `sitting`, `read`, `loadingCatalogue`, `loading`, `chooseBoth`, `resultsReady`, `gapsIntro`, `noMatchedGap`, `verifiedAbsence`, `unavailable`, `error`, `source`, `historyUnavailable`, `officialPublishedUnavailable`, `officialRevisedUnavailable`, `snapshotPrepared`, `sitePublished`, `sourceAcquired`, `deviceRefreshed`, `unknownTime`, `draft`, `final`, `statusUnavailable`, `turns`, `gaps`, `annotations`, `section`, `time`, `index`, `sourceId`, `help`, `coverage`, `parliament`, `penggal`, `mesyuarat`.

## GREEN and review

- UTC time: 2026-10-10T05:00:05Z.
- `npm test -- --run tests/unit/messages.test.ts tests/unit/documentation.test.ts`: exit 0, **131/131 passed** in two files, comprising all **83 message cases** and 48 existing documentation regressions.
- `npm run typecheck`: exit 0. `git diff --check`: exit 0.
- `checkCodeDocumentation` restricted to `src/messages.ts` and `tests/unit/messages.test.ts`: zero findings. The callable comments document locale selection, complete labels and the source-only boundary accurately.
- `getMessages` uses one typed static map per locale, with no transcript input, date generation, identity inference, markup or side effects. No additional abstraction/refactor was needed. First-visit default, language-switch rendering, pair preservation and real browser behavior remain the separately owned reader/integration gates.
- GREEN `src/messages.ts` SHA-256: `321353b3ecd0985ee30965304fd10e700153ff6ccd5be9427e297bdb3b8e2495`.
- Unchanged test SHA-256: `5180082f25ef1c4533f23fc852b4a4925028bba6d1a290443146a8fbaac8f36e`.
