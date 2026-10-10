# T029/T032/T035 recovery message RED

Recorded **2026-10-10T05:45:08Z**, Node 24.21.0, base revision
`1c4b079935bc5b7604474c1ba55def43ed6f0270`.

`npm test -- --run tests/unit/recovery.test.ts tests/unit/recovery-messages.test.ts` exits 1:
the fourteen message cases all fail behaviorally within the combined **44/44 RED** run.
[Durable output](tdd-recovery-full-red.log). No malformed fixture/import/harness failure
counts as RED. Production `getRecoveryMessages('ms'|'en')` is an inert empty typed map;
the existing forty reader labels and their getter are unchanged.

Twelve distinct per-locale identifiers, `REC-MSG-MS-<key>` and `REC-MSG-EN-<key>`, expect
their agreed nonblank literal strings but receive `undefined`. The six keys are `retry`,
`retryCatalogue`, `overdue`, `knownSourceFailure`, `pipelineEvidence`, `staticKnowledgeLimit`.
`REC-MSG-KEYS-ms/en` expect the full equivalent six-key set but receive an empty array.
Overdue copy explicitly refers to successful source acquisition; known failure copy is
limited to a dated record attempt; static-copy guidance does not imply later-workflow
knowledge or direct live Parliament retrieval. The module receives no source transcript
or identity values to translate or classify. Existing absence/incomplete/unavailable/error
messages remain authoritative in `getMessages`, rather than being duplicated here.

```text
src/messages.ts: a5a4f18bba88b4688229af4b0643ae778f251ace045d211ea83bb2c0fe48883d
tests/unit/recovery-messages.test.ts: 3045a98c1439fd69f36fe48f86bfa5e87625b88fd633e972f82077eca8978b4a
```

`npm run typecheck` passes. Existing messages/reader regressions pass **116/116**, including
all original **83 message cases**. Restricted message/test callable documentation scan
reports zero findings. T035 implementation is still gated on US1 T028 and full T032;
no new recovery strings, runtime defaults, guidance edits, task marking or commits occurred.

## T035 GREEN after the recovery production gate

Following root's T027 restaging/T032 gate authorization, `getRecoveryMessages` now returns the exact six-key BM/English map asserted by the unchanged fourteen tests. The original forty reader labels and getter are unchanged; the module still receives no transcript or source identity values. Source absence/incomplete/unavailable/error classification remains with the existing source and reader authority.

At **2026-10-10 17:10:44 MYT**, Node 24.21.0, the recovery-message suite's **14/14 cases passed** within the affected **525/525** nine-suite regression run, including the original **83/83 message cases**. [Complete GREEN output](tdd-recovery-foundation-green.txt). Root-owned reader recovery integration and its browser tests remain subsequent work; this map's unit GREEN does not claim they ran.

`npm run typecheck`: exit 0. Direct `checkCodeDocumentation(process.cwd())`: `[]`, exit 0. Scoped whitespace inspection: exit 0. No task marks, aggregate evidence edits, guidance changes or commits were performed by this agent.

```text
src/messages.ts: 20d79f5ca7df20d9f57872297ae8b034a307d9e2ba1ed7ae6e348d35faf79730
tests/unit/recovery-messages.test.ts: 3045a98c1439fd69f36fe48f86bfa5e87625b88fd633e972f82077eca8978b4a
```

Refactoring assessment: a small typed locale map and the existing getter pattern fully satisfy this scope; no further abstraction is needed. Historical RED logs/fingerprints remain intact.
