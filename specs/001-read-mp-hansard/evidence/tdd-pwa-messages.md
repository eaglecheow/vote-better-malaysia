# Saved-reader localization RED

At 2026-10-10 18:24:35 MYT, Node24.21.0 ran
`npx vitest run tests/unit/pwa-messages.test.ts`: **28 behavioral failures**,
exit1. PWA-MSG001 checks13 required labels in each locale; PWA-MSG002 checks both
complete key sets. The new getter is documented, inert and returns undefined;
tests use optional access/default empty keys so missing labels reach assertions
without import/object/matcher errors. No PWA production is implemented by this
scaffold. T044/T049 still gate implementation.

The eleven control/status labels preserve the exact meanings already asserted by
saved-reader tests. Two additional labels distinguish the committed copy's
successful validation time from an older saved copy's validation time; neither
purports to be a save-completion clock or source acquisition/publication time.
Existing online/recovery getters and their complete key sets are unchanged.

| File | SHA-256 at RED |
| --- | --- |
| src/messages.ts | 0e3c8a2465ffbc03ac9ed0f6637379f87ef5fd802976d218347dd56c064c7f1f |
| tests/unit/pwa-messages.test.ts | 8913104e5c8a18a60eeb9febf0ba35a16700a3f36cb1a2475ab05c18a5d50fef |
| [Raw RED](pwa-messages-red.log) | 3f8da5e490dda5977200e398522aeb7253a4eb4e3cb8d2ee2c99e59fd5c4b46a |

GREEN, semantic documentation review and native saved-reader evidence remain
required after production integration.
