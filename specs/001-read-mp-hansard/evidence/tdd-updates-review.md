# Update-client review additions: RED before US3 production

After both regression fixes, update/storage/worker suites passed **264/264** at
19:09:50 MYT (34 update, 105 storage, 125 worker), with typecheck and mechanical
documentation clear. [Final protocol GREEN](updates-protocol-final-green.log),
SHA-256 `1b1e2c1bef37fc7df224d93ce7c5b4e66251b439e28021b5f0277b04807018aa`.
Final update/test SHA-256 values:
`993bdabd3bd014cd6917052c8d5ed9dd429965b967fa41d0f44cc53fb68a5e62`,
`0b4be56b3c4a602e048f10eae19e1787e44875330a1df227146a7fd0afa5421e`.
No further refactor was needed after focused independent review. Worker/build
tests passed 207/207, fingerprint/documentation regressions 106/106 and the actual
production worker build succeeded; T050–T053 prerequisites are now ready for T054.

Independent review identified a real mixed-message race: ordinary client-version
or shell-status replies from the newly active target can precede its delayed
Apply acknowledgement. At **19:09:32 MYT**, UPDATE024's two cases observed **six
reached AssertionError failures** (pending action became failure, later exact
acknowledgement could not succeed, and no consenting reload occurred), exit 1,
33 skipped. [Raw ordering RED](update-ack-order-red.log), SHA-256
`7b88b8f8121460c569a7f80c47c8c552d881f57649212278a72a3f9f5e3850e3`.
Production remained `e661c3ab115f758ff74f55b615ad309026ae08d6c6a6199798fd0d8a1c485ae8`;
expanded test SHA-256 `ac1cd00e56ea4886a5f5ea375c4511a68e3272aa855be70e570b7930b8b6abfa`.

The original UPDATE018 wrong-action fixture treated an ordinary SHELL_STATUS as
an invalid acknowledgement and required rejection. That overly strict fixture
is superseded by UPDATE024's observed ordering RED, without retrospective TDD
claims: status alone still cannot authorize reload, but must not reject a pending
real action. Wrong-base/version actual APPLY_ACCEPTED variants retain their
rejection assertions. The minimal fix inspects only APPLY_ACCEPTED as an action
acknowledgement and processes other protocol replies through normal status handling.

UPDATE023 observed valid regression RED at **19:07:24 MYT**, before correction:
`npm test -- --run tests/unit/updates.test.ts -t UPDATE023`, exit 1, one behavioral
AssertionError and 32 skipped. The actual current worker's fresh compatible-cache
`ready:false` incorrectly left `shellReady:true`. [Raw RED](update-cache-loss-red.log),
SHA-256 `5498b23cf9cc9eaf6c9088aa446b305fd357d465c87b17fb3fc09f2ec21149c1`.
Production still had SHA-256 `aac9d9265c9772f1a69fe26eaadb284c2566e07bcdb40b72c9acc89b8c2a86c0`;
expanded tests SHA-256 `2cf5b157abe0e07756a25fb08f7567c50e761b57892e7aa3c53e91f1e267c9fa`.
Its positive initial readiness and no-reload assertion already passed and are controls.
The fix may revoke readiness for actual loss of the compatible shell; failed new
waiting-shell status must still preserve separately confirmed current readiness.

At 19:06 MYT, root authorizes T053 production after T044/T049 and genuine storage/
worker protocol readiness: 105 storage and 125 worker cases GREEN, storage/source
regressions 450/450, type/documentation checks clear. T050/T051 final reports/build
wiring continue independently; reader integration still waits for all prerequisites.
The 24 original and eight review assertions below are the recorded production RED.

T053's first implementation passed **32/32** update cases at 19:05:59 MYT.
[Raw GREEN](updates-green.log), SHA-256
`004b6a2b80c976d304683c77dabfb323776aae56363222ffcd5b55d15cad33e1`.
A TypeScript nullable capture was then narrowed without changing behavior;
typecheck passed, and update/worker/storage regressions passed **262/262** at
19:06:13 MYT. [Protocol GREEN](updates-protocol-green.log), SHA-256
`64c58dbc65697cd168e2bb540ecd8b4db844c2657ba6dc7c0ff2abe19ba6cae6`.
Mechanical callable documentation returned `[]`.
Update implementation SHA-256:
`aac9d9265c9772f1a69fe26eaadb284c2566e07bcdb40b72c9acc89b8c2a86c0`;
unchanged test SHA-256:
`35069a5e39a5fd84ec3013219a5aeca0ee9054e3632451016e2df578b66fadfe`.

The native registration promise runs independently of the returned client, so a
pending registration cannot block startup. Exact native source objects bind
readiness and acknowledgements; a same-URL impostor cannot activate consent.
Preference completion precedes messaging, actual activated state controls reload,
and only the consenting instance reloads. Continue does not persist/activate;
close removes this client's listeners without unregistering shared workers.
Current old document stamps are resent when a controller changes, preserving
conservative old-client cache retention. Independent review and actual browser
lifecycle checks remain pending; unit/native-shaped objects alone do not establish
offline reopening, native updates or physical-browser acceptance.

At **2026-10-10 17:53:44 MYT**, root ran:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/updates.test.ts -t 'UPDATE020|UPDATE021|UPDATE022'
```

Exit 1: **eight behavioral failures, 24 previously recorded cases skipped**.
[Raw output](updates-review-red.log) contains assertion failures only. The production
update client remains its original inert scaffold; US3 production still waits for
T044. Test writing does not open that phase.

UPDATE020's three cases observe missing rejection of empty, malformed and uppercase
current application stamps. UPDATE021's four cases observe missing rejection of FTP,
query-bearing, fragment-bearing and credential-bearing repository URLs. Registration
absence already passes for the inert scaffold and is recorded only as a negative
control, not independent RED.

UPDATE022 observes the missing native posts to an actual changed controller:
`CLIENT_VERSION` and exact-version `SHELL_STATUS` must carry the still-open,
nonconsenting tab's **unchanged** application version. This allows conservative
cache retention after another tab applies an update or a worker restarts. No reload
already passes for the inert scaffold and is a control. The unit boundary records
native-shaped object identities/messages; actual browser lifecycle checks remain
separate.

```text
tests/unit/updates.test.ts: 35069a5e39a5fd84ec3013219a5aeca0ee9054e3632451016e2df578b66fadfe
src/updates.ts (unchanged scaffold): fd20c577239e028a834f01e09d993c3c3995133e7642d658cec71ece6020d9aa
updates-review-red.log: e7cd7b45bbdbd4e0a25654b80e27c9417d7b1d9777e4e3ea017437be963b5c6d
```

Mechanical callable coverage returns `[]`. These additions require their own GREEN
and regression checks after implementation; historical update RED remains separate.
