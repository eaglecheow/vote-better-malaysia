# Browser execution evidence

## Final original frozen-site gate, 2026-10-10

After final CI and help inputs stabilized, the rebuilt complete source output was
renamed to `.cache/hansard/local-final-site-20261010-help`. `dist/` was absent during
the next run; no rebuild occurred. **108/108 Chromium/WebKit cases pass**, exit 0,
in **20.5 seconds**. [Final verification](final-verification.md) binds the actual
command, output, application fingerprint and measured canonical deployed-file hash.
The earlier pre-help build/run are preserved separately as history.

An additional fresh-origin native Chromium check used the complete real source
catalogue and actual sitting **29326**, dated **2026-02-10**, member ID **1839**
(`LIM GUAN ENG`), without intercepted data. Exact DOM words/order match the shared
source result: **2 turns, 66 gaps, 8 annotations**, outcome `incomplete`. All passage
details were opened; BM and English pages fit **320 CSS pixels**, and desktop fits
**1440**. The actual native transcript-save notice was observed. This record uses
the preserved pre-help frozen directory; reader/data code is identical to the final
directory, and the final native suite covers the later shell/help stamp.
[Structured real-source result](final-full-source-browser.json) records that scope.

The final help was separately rendered from the final frozen site at 320 CSS pixels
with the short bilingual preview notice; [actual result](final-help-browser.json).
Root visually inspected the saved reader and help images. These qualitative checks
are neither timed acceptance nor assistive-technology/first-time-user studies.
Firefox's approved host deferral and all physical, deployed, human and laboratory
requirements remain open.

## Current local PWA gate, 2026-10-10 19:45 MYT

After the worker response-body backpressure correction, native observer repair and
recorded initial-online-error regression, the current production build and typecheck
passed. [Build output](us3-native-repaired-build.log), SHA-256
`2c305d55616a6a7d85257232bcdbf74385922bdbcf4ad4accf19c9129891e555`.
Root then served those original bytes without another build:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
HANSARD_FROZEN_SITE=dist npm run test:browser -- --project=chromium --project=webkit
```

Exit 0: **108/108 passed** in 22.0 seconds, comprising the 60 online/recovery
journeys and 48 native PWA journeys. [Actual output](us3-native-repaired-browser.log),
SHA-256 `7f8d34441440f1f1f6d2f47ff182130b6dffa07eaa90c5534afd07dcc43daf5b`.
Node 24.21.0, pinned Playwright 1.64.0, Chromium 156.0.8078.4 and WebKit 27.2 ran
on the same macOS 27.2 host. The ordinary preview used the repository subpath;
PWA fixtures used isolated real localhost origins and generated versioned A/B bytes.

Actual native IndexedDB, Cache Storage and service workers cover commit versus request
success, genuine abort/failed replacement, preserved old saved text/times, catalogue
and pair restoration, closed-reader offline reopening, unsaved other-member pairs,
eviction/incompatible state, valid/invalid refresh, storage/cache/install failures,
waiting versions, deliberate preference-commit-before-Apply, consenting-tab reload,
other-tab continuity and retained old hashed assets. Complete original words, gaps,
annotations/provenance and separate current/saved times were asserted. The manifest
entry remains a usable website without assuming a prompt event.

The initial 46/48 PWA run had two late-observer ordering failures, resolved by
[real transaction-creation instrumentation](pwa-native-probe.md); those were not
feature RED. The subsequent 104/108 run exposed a genuine online error-notice
regression, reproduced by [two bilingual unit RED cases](tdd-initial-network.md)
before its one-condition correction. This final run includes both repaired paths.

Tested main SHA-256 `326e642689655d359f37931b6caae2289c2b951e8addf6737c1c8118a8f33084`;
source `8793b0c06adda7c39ee0161ee93d2e3cb6c251d98b1c70986b131ed200078e5e`;
storage `e273f52d3406449c3cba18707e6c3e4d3acb6e1a1c37ea7ae8b696938dcc1ccc`;
updates `993bdabd3bd014cd6917052c8d5ed9dd429965b967fa41d0f44cc53fb68a5e62`;
worker `da792f9655d3c7b232f4e4152c3b3f0121e8b8e67694814332f7a23cf73cd9d3`;
native probe `348a3b80f2e0ebdfd113f9e36d555887a0afce386fdcd233d34e6bb9abbe27e9`.
Built index SHA-256 `7ad0e0ea3092febd353bd5b89fb9fc02175725c54986517e4e5914945c942432`;
built worker `2e2629f275be955bacdb9bd941aee2b6ef9695941e6be7cb1c7effa09e1ec095`.

T055's local gate passes under the user's specific Firefox host deferral recorded
below. T028 remains unchecked; no Firefox, stable branded browser, physical-device,
installed-device, deployed-address, screen-reader, human or timing acceptance is
claimed. T057–T062 and release acceptance remain independent required work.

## Online reader: controlled production build

2026-10-10, Node 24.21.0, pinned Playwright 1.64.0 and its installed engines on macOS
27.2 (26B5091g). Base: `http://127.0.0.1:4173/vote-better-malaysia/`.
Base Git revision `1c4b079`; source implementation hashes are in
[reader TDD](tdd-reader.md) and [retrieval TDD](tdd-static.md). Fixtures and synthetic
scope are defined by `tests/fixtures/manifest.json` and `reader.ts`; these browser
checks do not prove full live archive acquisition or a real-source absence case.

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npm run test:browser
```

Observed exit **1**: **16 passed** (eight each in Chromium and WebKit), **8 Firefox
launch failures before assertions**. [Durable output](browser-us1-run.log).
Every configured engine remains enabled. No passing Firefox or stable physical-browser
acceptance is claimed. A Docker fallback is unavailable on this host (no Docker CLI).

Passing native checks cover the application shell, complete exact source strings/
paragraphs/order, native gzip and already decoded JSON Fetch bodies, accessible gap and
annotation disclosures, source/provenance, literal hostile text, native keyboard
type-ahead/Read/disclosure controls, bilingual labels/focus/announcements, delayed
obsolete-request cancellation, both locales at 320 CSS pixels with all disclosures
open, and actual help navigation under the repository base.

The initial keyboard harness opened macOS native popup menus with synthetic arrows
without a reliable committed choice; those failed runs are not feature RED. It was
corrected to native select type-ahead. WebKit's default Tab traversal skipped the
button; Option-Tab reached it and the actual Enter action passed. This follows
[Apple's Safari keyboard guidance](https://support.apple.com/en-gb/guide/safari/cpsh003/27.0/mac/27),
which describes traversal and relevant Keyboard Navigation/Safari settings. No system
setting was changed. Actual stable Safari and assistive-technology evidence remains
separate from this automated WebKit result.

Full T028 remains unchecked because Firefox could not launch and T027 full-source
acceptance is still running.

## Specific local phase-gate exception

On 2026-10-10 the human user answered **"Allow this phase-gate exception"** to:

> May I defer T028’s Firefox launch gate on this macOS host and continue the later
> local implementation once the full-source check finishes? Firefox and release
> acceptance would remain unverified and unchecked.

This authorizes deferring only this host's Firefox launch gate for subsequent local
implementation, after the full-source check finishes. It does not make T028 pass,
waive source reconciliation or size limits, change the constitution, or supply stable
Firefox/physical-device/release evidence. No source-size or verified-absence exception
is implied. The root records the permission in this report; T028 remains unchecked.

## Remaining acceptance

IndexedDB/worker/update/install, closed-reader offline, physical devices, actual Pages
address and first-time-user/screen-reader study checks remain pending. Controlled
mechanism passes are not physical, deployed-address, human or performance acceptance.

## Recorded full official sitting: native text and layout comparison

At 2026-10-10T05:39:31Z–05:39:34Z, the existing production build rendered the
complete recorded official 1966-10-25 response for sitting `23251` and source identity
`21375` (TAN CHEE KHOON). [Machine-readable report](browser-real-source.json) binds the
raw response, normalized record, served build assets, analysis script and screenshots
by SHA-256. Source acquisition completed at 05:19:52.591Z; the official response's
raw digest is `f68cc43cf9e050cb26060ebb711d159b730fb89da041ebe0963ec45e65964ae7`.

Chromium 156.0.8078.4 and WebKit 27.2 each passed BM and English comparisons:
all **33 selected turns and 183 unresolved passages** matched exact source text,
order, headings, author labels, ordinals and indices. The complete record has 344
leaves, 161 assigned and 183 unresolved, with zero explicit annotations. It remains
**incomplete**, with every gap inspectable. Native gzip delivery used 91,202 stored
bytes and 344,444 decoded bytes. Both document and body widths stayed at 320 CSS
pixels with disclosures open. No page errors or external requests occurred.

These tests route the recorded full response into a clearly labelled one-sitting
verification cohort, with controlled catalogue metadata and `publishedAt: null`.
They do not stage the full archive or establish publication, Firefox, physical-device,
performance or offline acceptance. The source record contains no paragraph-break
leaves or annotations; no positive real-source coverage of those cases is claimed.
The three report-linked screenshots were visually inspected; the root also inspected
the desktop and BM 320-pixel captures. The full-source T027 and browser T028 gates
remain unchecked.

## Online-reader rebuild after foundation repairs

At 14:14–14:15 MYT on 2026-10-10, the root stopped its own preview server, then
rebuilt and reran only the already implemented online-reader paths:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npm run test:browser -- tests/browser/harness.spec.ts tests/browser/reading.spec.ts --project=chromium --project=webkit
```

Observed exit 0, **16/16 passed** across Chromium and WebKit.
[Durable output](browser-us1-repair-run.log) and [repaired source/build hashes](foundation-repair-hashes.json).
Node 24.21.0 was selected. Text, paragraph/order/gap/annotation preservation, gzip
and decoded delivery, keyboard/focus/language/announcements, literal untrusted text,
obsolete selection races, 320-pixel layout and actual help navigation passed again.
The first attempt stopped before tests because the root's preview still occupied
4173; after stopping that owned process the complete rerun passed. This is no
additional feature RED and does not execute the authored recovery/PWA journeys.
Firefox remains specifically deferred locally and unverified, with T028 unchecked.

## Recovery rebuild after completed-Retry correction

On 2026-10-10, with completion observed by the root at **09:25:04 UTC**, Node
24.21.0 and the same pinned engines rebuilt the production reader and ran:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers npm run test:browser -- tests/browser/harness.spec.ts tests/browser/reading.spec.ts tests/browser/failures.spec.ts --project=chromium --project=webkit
```

Exit 0: **60/60 passed** in 14.5 seconds. [Actual output](recovery-browser-post-review.log)
has SHA-256 `8c33ab26f82cdc346f9dce0e851ce31c0450a298311af6ec67db1ef5a94c1211`.
The tested reader SHA-256 is
`deeb77bf78fbade3435c69dd8e30ad6ee6f450f88e536003b478a243496fed2a`;
source authority `1276c0f9612ebad901be17d800d34777bc274630b16638843f3629881cdd9089`;
bilingual messages `20d79f5ca7df20d9f57872297ae8b034a307d9e2ba1ed7ae6e348d35faf79730`.

Both languages passed controlled catalogue and shard HTTP/body/schema/digest failures,
Retry with preserved valid choices, delayed obsolete Retry races, dated known source
failure versus overdue age, snapshot knowledge limits, keyboard/live-region behavior
and 320-pixel source details, together with the original reading journeys. Controlled
complete-record absence remains distinct from an empty subset containing attribution
gaps. These fixtures do not establish real-source absence: the completed
[full archive eligibility search](source.md) found zero eligible zero-gap records
among all 4,090 captured records, under the approved conditional sample policy.

The two [unit review regressions](tdd-recovery-review.md) additionally verify that a
successful Retry hides its completed control and transfers focus to Read only when
Retry held focus. Native results do not substitute for physical browsers, screen-reader
or human acceptance. Firefox remains deferred locally and unverified; T028 stays open.

After the independent list-Retry focus RED/correction, the same native command
rebuilt again and passed **60/60** in 14.5 seconds;
[focus-aware native output](recovery-browser-focus.log). Main SHA-256 is
`d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82`;
failure-suite SHA-256 is
`e9e3e4a419d1f4db47861a4d6c3fc1867ae0d4767917fd5cd29af172b9d9f8bb`.
Both engines and languages now explicitly check that completed list Retry is hidden
with focus on member search, and completed pair Retry is hidden with focus on Read.
The unit [list-focus evidence](tdd-recovery-review.md#focus-after-successful-list-recovery-independent-red)
records **164/164** affected GREEN assertions. All earlier acceptance boundaries remain.
# Final local recovery gate after publication guidance

On 2026-10-10 at 18:44 MYT, Node 24.21.0 rebuilt the current online reader and
new bilingual help with `npm run build`: exit 0.
[Build output](us2-final-build.log), SHA-256
`39affc67851587e90139cd1acd834d44ee653044624d03a3ca5e406ee4bedb9c`.
The native check then previewed those original bytes without a second build:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/hansard-browsers \
HANSARD_FROZEN_SITE=/Users/eaglecheow/dev/vote-better-malaysia/dist \
npx playwright test tests/browser/harness.spec.ts tests/browser/reading.spec.ts \
  tests/browser/failures.spec.ts --project=chromium --project=webkit
```

Exit 0, **60/60 passed** in 11.2 seconds. [Native output](us2-final-browser.log),
SHA-256 `d70844280ab3ac01c8ecfcc6e4dc586baa8e3aeda4c96d41d06d5f8a34259f99`.
Both languages exercised complete source-shaped absence, incomplete empty subsets
with visible original gaps, unavailable records, failed lists and shard validation,
safe Retry races, honest null/successful times, keyboard focus, announcements and
320-pixel layout. Reading text, paragraph order, provenance and help remained valid.
The actual source has no eligible complete zero-gap absence sample; the approved
conditional requirement is supported by [the complete dated search](source.md).

Tested input hashes: reader `d2592eb8520c0891d21f791378b635a1a0acd20ad2f0e549d8e2a26fd5d5ac82`,
source `29be26a412e5e88cd429608b6009251b05acd1f3c55ba30a1f55ee8979b0e7aa`,
messages `0e3c8a2465ffbc03ac9ed0f6637379f87ef5fd802976d218347dd56c064c7f1f`,
help `2f8f631b4691c8f94b0edb119166df03c1a6ca8a80efb126c42c1243efeb2ca1`,
Playwright configuration `ea06d6796b0ed86333aaca0bdcfd022189c25e5a4d9df13816638e877072c3ee`.
The source/message additions at this point are inert, separately RED-tested US3
interfaces; this check does not establish saved/offline/update behavior.
Firefox remains unverified under the approved local phase deferral. All three
projects remain configured, T028 remains unchecked, and physical/live/human release
acceptance is still required. The local T044 result may support later implementation
only after the remaining publication regression checks also pass.

