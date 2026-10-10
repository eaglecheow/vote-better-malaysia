# Update failure notice regression

At 19:16 MYT on 2026-10-10, before changing reader/messages production, root ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/reader-update-notice.test.ts --reporter=json --outputFile=specs/001-read-mp-hansard/evidence/update-notice-red.json
```

Observed exit 1: four cases RED, zero GREEN, eight reached `AssertionError`s.
UPDATE-NOTICE001 in Malay/English observed an absent empty update-status notice
and absent `role=status`/`aria-live=polite`; UPDATE-NOTICE002 observed undefined
authoritative failure copy. Continue remains enabled as an already-GREEN control.
The inert boundary supplies failed update state only, never reader markup or policy.
No import, fixture, matcher or timeout failures count as RED.

[Structured RED](update-notice-red.json), SHA-256
`4dc4581b05b589cbb847ac580171984d09c48e5ed5a71715f8b2a5aa646aa722`;
test SHA-256 `7be54a33703c95f94459c154119739b7bfdfb44382e1f06e2eb25db6137b55a3`.
Before-production main SHA-256
`cfddf5b8e5ab2738225f9a27d36f080fbe37f4be08f9e9bf0eb0a34ffe617f8e`,
messages `1f64149ba4140560f8884880c5202ea605098a827d5a104f6e1bf748f604e2d9`.
Root authorizes the smallest bilingual failure notice after this recorded RED.
Native update-transaction evidence remains a separate browser requirement.

At 19:18:03 MYT the four new notice/message cases and the existing saved-reader,
bootstrap and bilingual-copy regressions passed **82/82**, exit 0.
[GREEN output](update-notice-green.log), SHA-256
`7f33a1f8ba6b9ac264054db90a07e8104c30925781f4eee7e9c90ec1fa77ce07`.
The two locale failure labels now come from `src/messages.ts`; main renders one
stable polite status node. No additional abstraction/refactor was necessary.
