# Recovery review: completed Retry visibility and focus

The focused read-only T036 review found one concrete state defect. `failPair` sets `pairRetryShown` after a failed read; successful same-pair recovery did not clear it. After a valid Retry result, the reader announced ready and displayed complete source content while the error-only Retry button stayed visible. The review found no further concrete defect in snapshot status, generation guards, failure context, equivalent labels or original-source text rendering.

Root authorized two focused regressions in `tests/unit/recovery.test.ts`, one in each interface language. They use the actual mounted native controls: a first failed read, keyboard focus on the visible Retry button, an actual Retry click, and an accepted second response. Existing `REC-PAIR-ms/en` remains the independent passing control for preserving focus on the member selector. Existing `REC-LOADING-ms/en` requires Retry to remain present while pending; this correction must occur only after validated success.

## RED before the correction

At **2026-10-10 17:15:26 MYT**, Node 24.21.0:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/recovery.test.ts --reporter=verbose
```

Observed **2 failed cases and 30 passing prior controls**. [Durable RED output](tdd-recovery-review-red.txt). Each failed case uses soft assertions so both required new behaviors were actually reached and failed:

- `REC-REVIEW-RETRY-ms`: `button.hidden` received `false`, expected `true`; actual focused element ID received `retry-button`, expected `read-button`.
- `REC-REVIEW-RETRY-en`: the same two independent assertion failures.

Both cases first passed their two-request, ready-announcement and complete-result assertions. No synthetic event handler, import error, missing fixture, or null-element exception is counted as RED. The source fixture is a recorded official excerpt under controlled complete-record metadata; this interaction test does not establish a real-source absence case or native screen-reader behavior.

```text
Pre-fix src/main.ts: 3880dab6932b200b18e93fd57f7cd2e0a659d94a847619060362befc847e0f5d
tests/unit/recovery.test.ts: b8d3695f68a6ce2a30eed9e1879eb77c54ab1a31285a02ce35c7eb773f446254
```

Root owns the smallest production correction: clear the error-only Retry flag after validated success, and move focus to stable Read only when the disappearing Retry currently owns focus. Other focused controls retain focus. This agent edits only the authorized test/evidence, preserving all earlier RED reports. Native browser verification belongs to root and is not inferred from this DOM test.

Pre-correction validation: `npm run typecheck` exit 0; direct callable documentation inspection `[]`, exit 0; scoped whitespace inspection exit 0. Test and durable evidence are ready for root's correction and subsequent GREEN/native verification. No production edit, task mark, aggregate report edit or commit was performed by this agent.

## Parent-verified GREEN correction

Root made the success-only correction after the RED capture above. A validated matching result clears `pairRetryShown` before its successful announcement. Focus moves to stable Read only when `doc.activeElement` is the Retry control that is about to disappear; focus on the member selector or any other existing control is preserved. Pending Retry remains visible as required by the existing loading cases.

At **2026-10-10 17:15:51 MYT**, root ran:

```sh
npm test -- --run tests/unit/reader.test.ts tests/unit/recovery.test.ts tests/unit/messages.test.ts tests/unit/recovery-messages.test.ts
```

Observed **162/162 passed across four files**, including the unchanged two new bilingual regressions, existing member-focus controls and pending-Retry controls. [Root's raw GREEN log](recovery-reader-review-green.log) was read to verify the command, timestamp and count. Final root-reported `src/main.ts` SHA-256 after the accurate focus side-effect documentation: `deeb77bf78fbade3435c69dd8e30ad6ee6f450f88e536003b478a243496fed2a`. The documented remarks adjustment changes no behavior.

Refactoring assessment: none needed. Clearing the existing flag and conditionally moving focus solves the defect without a new state layer or helper. Native post-fix browser verification remains root-owned and is not claimed by this unit GREEN addition.

## GREEN after root correction

At **17:15:51 MYT**, Node 24.21.0 ran:

```sh
npm test -- --run tests/unit/reader.test.ts tests/unit/recovery.test.ts tests/unit/messages.test.ts tests/unit/recovery-messages.test.ts
```

Observed exit 0, **162/162 passed**, four suites;
[durable output](recovery-reader-review-green.log). The production change clears
`pairRetryShown` only after a validated successful pair, moves focus from Retry to
Read only when Retry still owns focus, and preserves pending Retry and other focused
controls. The current `src/main.ts` SHA-256, including the accurate focus side-effect
comment, is `deeb77bf78fbade3435c69dd8e30ad6ee6f450f88e536003b478a243496fed2a`.
No further refactor was needed. Post-correction native verification remains separate.

## Focus after successful list recovery: independent RED

Root's follow-up review found the same hidden-focus problem on Reload lists. At
**17:27:26 MYT**, before changing production, Node 24.21.0 ran:

```sh
npm test -- --run tests/unit/recovery.test.ts -t REC-REVIEW-LIST-FOCUS
```

Exit 1: **two behavioral failures, 32 unrelated cases skipped**;
[raw output](recovery-list-focus-red.log). `REC-REVIEW-LIST-FOCUS-ms/en` both reached
their successful two-request, valid-choice, choose-both announcement and hidden-button
controls, then failed because actual focus remained `retry-catalogue-button` rather
than the stable first selection control, `member-search`. Those already-passing
controls are not new RED. No import, fixture or harness failure is counted.

Pre-fix main SHA-256 is
`deeb77bf78fbade3435c69dd8e30ad6ee6f450f88e536003b478a243496fed2a`;
updated test SHA-256 is
`cf58af5ca14bb908de77e074ef70a07ac51c0edef50c6f82a6860584c044d368`.
The planned correction moves focus only when the completed list Retry owns it.

The root then made that conditional correction. Four affected reader/message suites
passed **164/164**, exit 0; [raw GREEN](recovery-list-focus-green.log). Typecheck and
mechanical callable coverage passed. Main SHA-256 is now
`d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82`.
Native failure journeys now additionally assert hidden completed Retry controls and
the corresponding stable focus destinations; their next rebuild is separate evidence.
No new state or helper was needed, and no further refactor is warranted.
