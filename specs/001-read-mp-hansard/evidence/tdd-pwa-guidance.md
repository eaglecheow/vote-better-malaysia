# T056 saved-reader guidance

Root explicitly authorized these actual documentation changes after its T055 gate:
**108/108 native Chromium/WebKit mechanism cases and 260/260 focused reader unit cases**,
with build/type/callable checks passed under the approved local Firefox-host deferral.
Root retains the actual browser/gate evidence and owns task markers, aggregate reports,
rebuild and release checks. These engine results do not establish named stable-browser,
physical-device, human usability, performance or Pages-address acceptance.

Only `docs/user-guide.md`, `public/help.html`, `docs/development.md` and this focused
report/logs changed here. No source, workflow, README, task markers or commits changed.
Private drafts were prepared before the gate and applied only after GO.

## Semantics review

Compared both locale sections and their matching static help against the accepted reader,
source/storage/update contracts and authoritative current labels:

- Saving applies only to an explicitly opened exact identity/sitting pair. Its selected
  source turns, all attribution gaps, annotations and original metadata remain accessible;
  reading another member is separately unsaved, and the whole archive is not cached.
- Transcript-save completion is distinct from complete offline-reader readiness. The
  latter also needs accessible committed catalogue/pair state and a compatible cached
  shell. A visible result, installed icon or successful individual request is insufficient.
- Online opening and native Retry retain the compatible saved words/time during pending
  catalogue/pair checks. This is retrieval from the published static site, not a live
  Parliament request. Successful online validation can advance a device-check time even
  with unchanged wording; only a committed save advances the saved copy's time.
- Failed validation preserves the older accepted result/time. Failed saving leaves new
  online content readable and unsaved, identifies the prior saved time separately, and
  limits an older-copy offline notice to that actual older copy.
- First offline visits, unsaved/removed/incompatible/inaccessible device content and storage
  failures have connection/offline-limit guidance, without any no-contributions inference.
  Native list/pair retry and successful disappearing-button focus behavior are described.
- Continue preserves current reading. Apply saves language and valid selections before
  requesting the actual waiting version; only its consenting tab reloads. Other reading
  tabs can continue, and saved schemas are not destructively migrated on activation.
- Installation is optional; the ordinary website remains usable. Both locales give
  corresponding iPhone/Android/desktop Chrome/Edge/Mac routes and explain that the installed
  context must be opened online and reach its own saved/readiness statuses. Physical-device
  and target-browser acceptance remain incomplete rather than inferred from menu guidance.

The existing conservative attribution, conditional real-absence, 4,090 accepted-record
source evidence, approved 1 MiB catalogue policy, nullable source/publication dates,
scheduler/provenance and reuse/publication limitations remain intact. The dated developer
status distinguishes implemented GREEN cohorts from the remaining intentionally RED CI
preparation assertions. Source/readiness implementation details stay in the developer
section rather than becoming additional application controls.

Official installation guidance was independently read on 2026-10-10 and linked next to
its instructions: [Apple iPhone](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios),
[Apple Mac](https://support.apple.com/guide/safari/ibrw9e991864/mac),
[Google Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en),
[Google desktop](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=en),
and [Microsoft Edge](https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge).
Availability, labels and versions may differ; these sources are installation instructions,
not proof of this application's device acceptance.

## Actual documentation checks

At **2026-10-10 19:47:06 MYT**:

```sh
PATH=/private/tmp/hansard-node24/node_modules/node/bin:$PATH npx vitest run tests/unit/documentation.test.ts --reporter=verbose
```

The current suite actually collects **48/48 tests**, all GREEN, exit 0; no invented 49th
case is claimed. [Complete documentation output](tdd-pwa-guidance-documentation.log).
These are existing authoritative documentation-checker fixture regressions, not a new
human accuracy approval of the production candidate.

`npm run typecheck` exits 0. [Type output](tdd-pwa-guidance-typecheck.log).
Global `checkCodeDocumentation(process.cwd())` returns `[]`. [Static guidance checks and
final hashes](tdd-pwa-guidance-checks.log) also record **22 existing local Markdown links**,
nonempty BM/EN guide/help sections, four preparation steps and five linked installation
options per locale, valid help fragments/repository-relative reader navigation, and no
help script. New bilingual status text carries explicit language attributes. Static DOM
parsing does not prove native layout, screen-reader behavior or physical installation.
Scoped whitespace inspection passes. No new tests mirror reversible text changes.

Setup probes independently returned Node **24.21.0**, npm **11.17.0**, Ruby
**2.6.10p210**, and the expected JSON from Ruby's YAML/JSON standard-library parser. Ruby
is documented as an explicit workflow-test prerequisite; no Ruby major is prescribed.
The guide retains the temporary Playwright browser path actually used on this host and
labels default-cache installation as unverified here.

```text
docs/user-guide.md: d8452a960224c7fc046bfec5a9cd8f2be22531b4540da1f20679e916d0a6cb67
public/help.html: ebe057308786ef9c30199234a4ac928aaf595005cdd624b3c742fe1be98f4343
docs/development.md: 1a18d24527aa5fa5671067856024757b5bce84017848530740e6718c9feb2377
```

Refactor assessment: none needed. Static bilingual prose/HTML updates replace obsolete
PWA-unavailable text and add only the required setup/readiness/install/update guidance.
No generic documentation generator, runtime help script or new product flow was added.
Root must rebuild after help bytes change, because deployed help and worker/application
fingerprints change. A current candidate-bound human documentation-accuracy report remains
separate; none was fabricated by these mechanical/agent checks.
