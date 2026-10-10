# T047 update-client RED

Recorded 2026-10-10 before T053 production. The update client is an inert typed scaffold.
US3 production still requires US2 T044 and the corresponding T049 gate. Native-worker
activation, waiting versions, Cache Storage and real multi-tab continuity remain T048/T055
browser proof; controlled unit event/post recorders do not establish those outcomes.

## Approved concrete boundary

`connectUpdates({baseUrl, version, serviceWorker?, reload?})` returns an `UpdateClient`.
The connection promise establishes native registration/listeners; readiness and waiting
discovery remain asynchronous state observations, so ordinary online reading does not
depend on a worker replying. `getState()` and `subscribe()` expose
`{shellReady, waitingVersion, applying, failed}`. `apply(persistPreferences)` requires the
caller preference transaction to commit before posting to the still-current actual
`registration.waiting` worker. `continue()` dismisses the offer without activation or
reader-data changes; `close()` removes listeners.

The stable `sw.js` URL cannot identify its embedded version. The agreed nonactivating
`{type:'SHELL_STATUS', base}` query discovers the actual waiting object's embedded SHA64
and readiness. Exact-version queries confirm current compatible-shell readiness.
Responses are bound to native source object, base and canonical version. Apply uses
`{type:'APPLY_UPDATE', base, version}` and accepts only the actual target's matching
`APPLY_ACCEPTED`. The consenting instance reloads after confirmed target activation,
including its `statechange('activated')`; `clients.claim`/automatic controller claiming
is not assumed. Another instance never inherits consent. Worker-side protocol tests and
implementation remain separately owned.

`src/updates.ts` presently returns undefined state, inert unsubscribe, immediate Apply,
and empty Continue/close methods. It performs no registration, validation, messaging,
persistence, activation, readiness or reload. Test fixtures expose native-shaped
EventTarget/registration/worker identity and explicit canned replies; they never apply
app policy or change worker lifecycle automatically after a post.

## Tested working tree and command

Base HEAD: `1c4b079935bc5b7604474c1ba55def43ed6f0270`.

| File | SHA-256 |
|---|---|
| `src/updates.ts` inert scaffold | `fd20c577239e028a834f01e09d993c3c3995133e7642d658cec71ece6020d9aa` |
| `tests/unit/updates.test.ts` | `6328e0eaf9ca5a73e2ae357a71c376ed98e433d71620f104d298ad2a22083885` |

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npm test -- --run tests/unit/updates.test.ts tests/unit/saved-reader.test.ts
```

Final observed run started `13:59:25`, Vitest 5.0.3: **24/24 update-client cases failed**
and 39/39 saved-reader cases failed, 63 total, exit 1, duration 1.02 seconds. Each reached
behavioral assertions. No TypeError, ReferenceError, SyntaxError, unhandled error or
invalid matcher combination occurred. Combined temporary log SHA-256:
`5bb9c3add45c1703cd2b5ac57d83d2af6b745ba3878eb7546bc0a5ee3b42228b`.
Durable per-case observed failures are below. Root independently observed the same 24
update cases inside the 301-case T049 expected-RED cohort (storage93, worker87,
build58, saved-reader39, updates24), before production.

| Identifiers | Required behavior | Actual assertion RED |
|---|---|---|
| UPDATE001 | Base-scoped native registration and current CLIENT_VERSION handshake | Register spy was never called with `https://example.test/vote-better-malaysia/sw.js`, scope `/vote-better-malaysia/`; active worker posts lacked CLIENT_VERSION. |
| UPDATE002 | Exact current-shell readiness separate from actual waiting discovery | Both status-query posts were absent; state was undefined rather than ready current shell plus waiting version `b`×64. |
| UPDATE003 | Explicit unsupported-platform unavailability | State was undefined rather than all-false readiness/applying/failure and null waiting version. |
| UPDATE004 | Native registration failure never confirms shell success | State was undefined rather than unavailable readiness and failed:true. |
| UPDATE005 | Continue dismisses only waiting offer and preserves compatible reading | State was undefined rather than ready old shell and dismissed offer. No-activation/reload guards passed inert code and are not counted as RED alone. |
| UPDATE006 | Preference commit before actual waiting-version Apply | Persist spy had zero calls; applying state was undefined; after releasing commit, actual waiting posts lacked APPLY_UPDATE. Active-worker no-Apply guard executed. |
| UPDATE007 | Failed preference commit blocks activation and retains older readiness | Apply resolved instead of rejecting controlled commit abort; state was undefined rather than preserved ready shell and failure. |
| UPDATE008 | Waiting replacement during pending commit invalidates stale consent | Apply resolved instead of rejecting. Both old/replacement no-stale-post guards executed. |
| UPDATE009 | Accepted actual target activation reloads only consenting instance | Its reload spy had zero calls; other-instance no-reload guard executed. |
| UPDATE010 | Nonconsenting activation/controller change never reloads reading instance | State was undefined rather than ready current reader with no offer; no-reload guard executed. |
| UPDATE011 | Failed new-shell confirmation preserves old confirmed readiness | State was undefined rather than shellReady:true, no waiting offer, failed:true. |
| UPDATE012 (four replies) | Reject off-base, non-SHA, uppercase SHA and nonboolean readiness waiting payloads | Each state was undefined rather than old confirmed readiness with no offer and failure. |
| UPDATE013 | Same-URL foreign object cannot supply actual waiting readiness | State was undefined rather than old readiness with no validated waiting version. |
| UPDATE014 | Native later updatefound/install notifies subscribed observers | Observer had no required discovered-version call; unsubscribe guard executed. |
| UPDATE015 | Close removes actual listener registrations | Initial retained listener count was 0 rather than >0. Cleanup count check executed; absence of initial listeners is not presented as proof of correct cleanup. |
| UPDATE016 | Missing actual waiting version rejects Apply | Apply resolved instead of rejecting; no-persist/reload guards executed. |
| UPDATE017 | Duplicate Apply cannot duplicate commits or posts | Persist spy had zero calls instead of one; actual waiting Apply posts had length0 instead of1. |
| UPDATE018 (three replies) | Reject wrong-base, wrong-version and wrong-action Apply acknowledgements | Each Apply resolved instead of rejecting. Target activation never-reload guards executed. |
| UPDATE019 | Same-URL impostor acknowledgement cannot authorize target activation reload | Pending legitimate Apply state was undefined rather than applying:true. Foreign-ack no-reload and close/settlement guards executed. |

## Checks and remaining work

Full `npm run typecheck` passed in the final run, exit0. An intermediate rerun identified
a concurrent browser-fixture callback type error in `tests/fixtures/pwa.ts:153`
(`server.close` callback versus Promise<void> resolver); that file's owner repaired it.
That unrelated harness type error was not counted as RED.
`checkCodeDocumentation(process.cwd())` filtered to the owned update/saved-reader paths
returned `[]`; owned-file whitespace checks passed. The full candidate accuracy-review
CLI is a later release gate, not claimed here.

No GREEN or refactor result is claimed, and no runtime main/messages/source/storage
behavior was changed. After the story/RED gates permit production, implement this
concrete native client, run these cases GREEN, assess necessary refactoring, and supplement
with actual native-worker/browser journeys before claiming waiting/update behavior.
