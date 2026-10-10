# Feature Specification: MP Hansard Reader MVP

**Feature Branch**: `001-read-mp-hansard`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Create a PWA that gets data from the Malaysian Parliament Hansard API, lets users select an MP name and a specific parliament session, and displays that MP's transcript for the selected session. Design it for GitHub Pages hosting, where there may be no backend."

## Clarifications

### Session 2026-10-10

- Q: Which Dewan Rakyat sittings must users be able to select when the MVP launches? → A: All available sittings across every Parliament represented by the official source.
- Q: How soon after the official source publishes a new sitting or revises a record should it be available to online readers? → A: Best-effort within 24 hours; this supersedes the earlier guaranteed 24-hour requirement following the source research and approval below.
- Q: Which languages should the reader’s controls, messages, and user guidance support at launch? → A: Bahasa Melayu and English, with Bahasa Melayu as the default and a language switch; transcripts retain their original language.
- Q: Which browsers must pass the MVP’s reading, offline, and application-update checks? → A: Android Chrome, iPhone Safari, and desktop Chrome, Edge, Firefox, and Safari, using stable releases at acceptance time; installation is checked where supported.
- Q: May the reader use the official portal's internal JSON endpoints through publication-time data preparation, despite missing public API support, revision timestamps, and some speaker attribution? → A: Yes. Use build-time acquisition from the official JSON endpoints, best-effort 24-hour refresh, and clearly labeled attribution gaps. Preserve original words and reliably attributed turns; do not guess missing identities, invent revision times, or convert uncertain attribution into a no-contributions claim.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read an MP's contributions to a sitting (Priority: P1)

As a Malaysian voter, I can select an MP and a parliamentary sitting and read what that MP said, with enough source information to check the original record.

**Why this priority**: Finding and reading the selected MP's actual words is the entire core value of the MVP.

**Independent Test**: Open the public site, select a known MP and dated sitting, compare all reliably attributed contributions with the corresponding official JSON and Hansard, and check that any attribution gaps are visible with access to the unassigned source passages.

**Acceptance Scenarios**:

1. **Given** published member and sitting lists, **When** I open the site, **Then** I can select an MP by name and a sitting by date, with Parliament, Penggal and Mesyuarat context identifying the sitting unambiguously.
2. **Given** either selection is missing, **When** I try to read a transcript, **Then** the site identifies the missing selection and does not show a result for an incomplete pair.
3. **Given** both selections identify an available transcript, **When** I request it, **Then** I see every contribution reliably attributed to that MP in the supplied official record, in source order and original language, with readable paragraphs and available timestamps or source locations; if attribution is incomplete, the result says so and provides access to the sitting's unassigned passages without assigning them to the MP.
4. **Given** a displayed transcript, **When** I inspect its heading and source details, **Then** I see the selected MP, constituency where provided, sitting context, official source link, source status such as draft where provided, and when the displayed data was last refreshed.
5. **Given** a displayed transcript, **When** I change either selection, **Then** the previous transcript is cleared or explicitly marked as belonging to the previous pair until the matching result appears; a late result from an earlier selection cannot replace the current result.
6. **Given** MPs with similar names or changing constituencies across parliamentary terms, **When** I select a member, **Then** the source identity and labels match the selected sitting's record; missing historical name or constituency details are explicitly unavailable rather than filled from a current member list or guessed from text.

---

### User Story 2 - Understand missing records and recover from failures (Priority: P2)

As a voter, I can tell whether an MP has no recorded contributions or whether the record could not be obtained, and can retry without choosing the same fields again.

**Why this priority**: Missing data and access failures must not be presented as evidence that an MP did not speak.

**Independent Test**: Exercise a verified sitting with no contributions for the selected MP, an unpublished record, and a failed retrieval; each must produce a distinct, understandable outcome while preserving the selection.

**Acceptance Scenarios**:

1. **Given** a successfully obtained, complete sitting record with no contributions attributed to the selected MP, **When** I request that pair, **Then** I see "No recorded contributions for this MP in this sitting," with the pair and official source identified.
2. **Given** a missing or unpublished record, **When** I request it, **Then** I see that the transcript is unavailable, without a claim that the MP did not speak.
3. **Given** a connection or source-access failure, **When** retrieval fails, **Then** I see an actionable error and can retry with the MP and sitting selections preserved.
4. **Given** incomplete content or uncertain speaker attribution, **When** the result is displayed, **Then** it is labeled incomplete or unverified, uncertain passages are not assigned to the selected MP, I can inspect the sitting's unassigned passages and open the official source, and an empty attributed subset is not described as proof that the MP had no contributions.
5. **Given** member or sitting lists cannot be obtained, **When** I open the site, **Then** I see a list-loading error with a retry action, or an explicitly dated previously saved list, rather than an empty list implying no MPs or sittings exist.

---

### User Story 3 - Reopen the reader and saved transcripts offline (Priority: P2)

As a returning voter, I can install the reader on a supporting device and reopen previously read transcripts when my connection is unavailable.

**Why this priority**: This provides the minimum useful PWA behavior for unreliable connectivity without requiring the entire parliamentary archive to be downloaded.

**Independent Test**: Open and finish reading a transcript online, close the reader, disconnect, reopen it, and read that same pair. Check an unread pair separately, then reconnect and exercise an application update.

**Acceptance Scenarios**:

1. **Given** a browser that supports installation, **When** I use its installation flow, **Then** the installed app launches the same reader; other supported browsers can use the ordinary website.
2. **Given** a successful previous visit and a transcript saved on this device, **When** I reopen the reader offline, **Then** I can access the saved member and sitting choices and read that transcript with its source details and saved-data indication.
3. **Given** I am offline and a chosen pair has not been saved, **When** I request it, **Then** I see that it requires a connection rather than a no-contributions result.
4. **Given** a saved transcript and a restored connection, **When** I request that pair again, **Then** the reader checks the latest published site-data snapshot, identifies both the source-acquisition time and successful device-refresh time, makes a successfully saved refreshed version available offline when the saved reader is ready, and preserves the last compatible saved version if validation or saving fails with a clear saved-data notice; it does not imply a live fetch from Parliament.
5. **Given** a new application version becomes available while I am reading, **When** the update is offered, **Then** I can continue reading until I choose to apply it, and my valid MP and sitting selections are preserved after the update. Compatible saved transcripts remain readable; any saved content that cannot safely be reused is explicitly identified as unavailable and requires a new online retrieval.
6. **Given** saved data was removed by the browser or could not be stored, **When** I use the reader, **Then** online reading still works and offline availability is not promised for missing content.
7. **Given** a saved pair and newly validated online data, **When** saving the refreshed pair fails, **Then** the new online result remains readable with its successful device-check time, the saved copy retains its previous content and refresh time, and the reader distinguishes the current online result from the older offline copy without promising that the new result is saved.

### Edge Cases

- A selected MP has several separate speaking turns, interruptions, or quoted references to other MPs; another person's speech must not become the selected MP's contribution.
- Similar names, titles, spelling variations, and constituencies changing between terms must not merge different member identities.
- Records contain mixed languages, long contributions, repeated speaker headings, missing timestamps, or missing constituency details.
- A record is draft, revised, incomplete, or temporarily inaccessible; the published snapshot or saved data may predate the current official record. Source failures, build/scheduler delays, and unsuccessful refreshes that miss the best-effort 24-hour target must be reported separately, with acquisition/pipeline status and saved-data indication. Official revision times may be unavailable.
- The portal changes its internal JSON deployment identifier or response structure. Publication-time acquisition must fail visibly and retain validated previously published data rather than silently produce empty records.
- The user changes selections while a previous result is still loading.
- No contribution is distinguishable from unpublished data, uncertain attribution, failed retrieval, and an unread transcript requested offline.
- First visits without a connection cannot obtain unsaved data; later visits may encounter cleared or unavailable device storage.
- The deployed site uses a repository subpath, and the reader is reopened or refreshed from that address or from an installed app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST acquire member, sitting, and transcript data at build/publication time from the official Malaysian Parliament Digital Hansard portal's public JSON endpoints, as approved by the user. The deployed reader MUST read prepared static site data and provide official record links and acquisition provenance. It MUST NOT require direct browser access to Parliament, substitute a third-party source, or imply that the internal endpoints have a guaranteed public support contract.
- **FR-002**: Users MUST be able to select an MP by name from the available source-identity catalogue, with constituency or parliamentary-term context where needed and provided to distinguish identities. Source speakers without verified membership context MUST be labeled accordingly; the reader MUST NOT present every source speaker as a verified MP or infer membership/constituency from names or bracketed labels.
- **FR-003**: Users MUST be able to select one dated Dewan Rakyat sitting. At launch, the catalogue MUST include all available sittings across every Parliament represented by the official source, including source-identified historical members needed for those sittings. Each choice MUST show its date and Parliament, Penggal and Mesyuarat context. The catalogue MUST state its supported coverage, acquisition time, and missing identity/record details; acquisition failures must not remove sittings or imply lack of participation.
- **FR-004**: The reader MUST require both valid selections, provide loading feedback, and ensure each result belongs to the currently selected member and sitting even when earlier requests finish later.
- **FR-005**: The reader MUST display all speaking turns reliably attributed by source identity to the selected MP in the supplied official record, in source order and original language, preserving words and paragraph structure. Available timestamps/source locations MUST remain associated with their turns. Missing or conflicting source identities MUST remain unassigned, with a visible gap notice and access to those passages in sitting order. Only explicitly source-marked annotations may be classified as annotations; their words and order MUST be preserved separately. Missing annotation status MUST NOT be inferred from text or used to exclude a possible speaking item from attribution-gap accounting. It MUST NOT guess attribution, invent text, silently omit reliably attributed turns, or imply complete participation coverage when attribution is incomplete.
- **FR-006**: Every result MUST identify the source member and sitting and provide an official link, draft/final or revision status where supplied, publication/revision dates where supplied, source-acquisition time, and successful device-refresh time. Missing historical identity/context and official publication/revision dates MUST be explicitly unavailable. An unavailable/error state MUST retain known pair/source details and explicitly identify unavailable acquisition or device-refresh times when no accepted record or successful pair validation exists; a failed-attempt time MUST NOT substitute for a successful time. Acquisition time, site publication time, and device-refresh time MUST not be presented as an official change time.
- **FR-007**: The reader MUST distinguish a verified absence of recorded contributions from unavailable records, incomplete or uncertain attribution, connectivity/source failures, and unsaved offline content. It MUST retain valid selections and allow retry after failures.
- **FR-008**: The complete selection-to-reading journey MUST be usable with a keyboard and assistive technology, including labeled controls, visible focus, and announced loading, result, and error states. At a viewport width of 320 CSS pixels, controls and transcript text MUST remain readable without horizontal page scrolling.
- **FR-009**: The reader MUST be installable where the browser supports PWA installation and usable as a normal website otherwise. Both entry points MUST support the same selection and reading journey. Supported targets MUST include Android Chrome, iPhone Safari, and desktop Chrome, Edge, Firefox, and Safari, using their stable releases at acceptance time.
- **FR-010**: Following a successful online visit, the reader MUST reopen offline on the same device with saved selection lists and successfully opened transcripts while that device's saved data remains available. Offline reading MUST retain attribution and source details; saving the entire archive is outside MVP scope.
- **FR-011**: The publication pipeline MUST target best-effort availability of new sittings and revised catalogue/transcript data within 24 hours. It MUST attempt scheduled acquisition, detect changes to historical as well as recent records, retain validated data on failure, and expose acquisition time, last successful pipeline status, and known stale/failed refresh conditions. Missing acquisition state MUST NOT permit a bootstrap to replace a previously published accepted record with unavailable content or silently omit prior inventory entries; publication MUST wait for a validated retention baseline if it cannot be safely recovered. The target is not a guarantee: scheduler/build/source and required acceptance-evidence delays MUST be disclosed, and missing official change times MUST not be invented. Scheduled acquisition does not promise unattended publication: missing candidate-matched acceptance evidence MUST hold publication and preserve the served site pending maintainer validation. The reader can expose only status known to its published snapshot and age-based overdue checks; the workflow MUST report unpublished failures and evidence waits in its run summary/logs and available receipt artifacts, and repository maintainers MUST review failures/overdue work and perform manual recovery. Published guidance MUST identify those reporting locations without pretending that the old static site knows later events. Online reopening MUST check the latest published static snapshot. Successful validation of a matching pair advances the current result's device-refresh time even when content is unchanged; saving that result is a separate operation. The saved version and its refresh time MUST change only after a successful save. Failed validation or saving MUST preserve the previous compatible saved copy and its times, with an accurate saved-data notice; online reading of newly validated data MUST remain available after saving failure.
- **FR-012**: Application updates MUST not interrupt active reading or mix incompatible saved content. Users MUST be able to apply an available update deliberately; valid selections MUST survive it. Content that cannot safely be reused MUST be treated as unavailable rather than displayed under an incorrect member or sitting.
- **FR-013**: The deployed MVP MUST operate on GitHub Pages, including a repository subpath, without an application backend, server-side runtime, private credential embedded in public files, or separately operated proxy. Opening, refreshing, installation, offline reopening, and updates MUST work from the deployed address.
- **FR-014**: The MVP MUST provide developer documentation for prerequisites, installation, configuration, running, testing, building, and GitHub Pages deployment, discoverable from the README. It MUST provide user guidance for selecting records, source coverage and status, installation, offline limits, saved-data freshness, errors, and updates, discoverable from the README or reader.
- **FR-015**: Reader controls, status and error messages, assistive-technology announcements, and user guidance MUST be available in Bahasa Melayu and English. The interface MUST default to Bahasa Melayu and provide a language switch. Switching the interface language MUST preserve valid member/sitting selections and leave transcript words and their original language unchanged.

### Delivery and Validation Requirements

These project governance requirements supplement the user-facing acceptance criteria; they do not select an implementation stack.

- **DV-001**: Each implemented behavior MUST begin with meaningful failing unit tests, and bug fixes MUST begin with failing regression tests. Delivery evidence MUST record test identifiers, commands, tested revision or working-tree state, expected and observed behavioral assertion failures, subsequent passing checks, and necessary refactoring or an explicit no-refactor decision.
- **DV-002**: Actual browser validation MUST cover source integration, keyboard use, repository-subpath deployment, installation where supported, offline reopening, saved-data population and replacement, storage loss, and application installation/activation/update behavior. Mocks alone MUST not establish those outcomes.
- **DV-003**: Before implementation, the plan MUST define numeric performance budgets and repeatable measurement conditions covering cold visits, repeat visits, selected-record reading, and offline reopening, with a rationale for any non-applicable scenario. Production-build checks and CI merge gates MUST enforce those budgets; reports MUST distinguish laboratory results from real-user results and disclose unavailable evidence for either device group.
- **DV-004**: Developer setup and deployment commands, user guidance, and documentation comments for every introduced or changed function/method MUST be reviewed for completeness and accuracy as part of delivery. Missing required documentation or validation evidence MUST prevent an implementation-completion claim.
- **DV-005**: Source acquisition validation MUST reconcile the complete dated-sitting inventory, account for all supplied speaking items and attribution gaps, exercise deployment-ID/schema changes and failed refreshes, and verify that publication does not replace validated content with partial or empty error output. It MUST cover explicit, missing, and invalid annotation markers and retention of previously published records/inventory when acquisition state is missing or expired. Reports MUST distinguish source-acquisition, site-publication, and device-refresh times and disclose the internal API and reuse-policy verification limits.

### Key Entities *(include if feature involves data)*

- **Member / Source Speaker Identity**: A source-identified person referenced in acquired Dewan Rakyat records, with source name and historical constituency/term context where available. An MP's contributions use this identity; a source speaker is not automatically a verified MP. Preserve historical identities and label unavailable membership/context explicitly; membership and constituency must not be guessed from names, bracketed labels or a current member list.
- **Parliamentary Sitting**: One dated Dewan Rakyat sitting, identified within a Parliament, Penggal and Mesyuarat, with an associated official record and publication status.
- **Contribution**: One source speaking item within a sitting, with original text, source order and available timestamp/location; its identity is either reliably assigned or explicitly unassigned. One member may have many assigned contributions.
- **Transcript Result**: The selected member/sitting pair and its ordered contributions, or its explicit absence/unavailability state, together with provenance, completeness, source status and refresh time. A device may retain a saved copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 9 of 10 first-time test users can select a specified MP and sitting and begin reading the correct contributions within 60 seconds, without assistance or an account.
- **SC-002**: At least 95% of 30 online reading attempts per device group, spanning at least five published sittings of different transcript lengths under documented representative mobile and desktop network conditions, display the matching attributed subset with any required gap notice, or a verified no-contributions outcome, within five seconds. Retrieval failures are separately reported and are not counted as successful outcomes.
- **SC-003**: Across at least ten manually verified member/sitting pairs from at least five sittings, 100% of reliably source-attributed turns for each selected MP appear in source order with correct words and identity. Every encountered missing/conflicting speaker identity MUST be visibly labeled, accessible as unassigned sitting content, and excluded from the MP's attributed subset. The sample MUST include multiple turns, interruptions, a draft where available, a verified no-contributions case, and the known missing-ID question in the 10 February 2026 record. No incomplete result may claim complete participation coverage or verified absence; all results expose the official source.
- **SC-004**: In 10 offline reopen attempts on each supported mobile and desktop browser used for acceptance, 100% of previously saved test transcripts become readable within two seconds and identify their saved-data state. Every tested unsaved pair shows a connection-required outcome. Refresh/update checks produce no incorrectly attributed content or unintended loss of compatible saved transcripts; incompatible saved content is explicitly identified as unavailable and requires online retrieval. Refresh acceptance MUST include unchanged data, changed data, failed validation, failed saving, and failed reader-shell saving, with accurate current-result versus saved-copy times and separate transcript-saved versus offline-ready outcomes.
- **SC-005**: Real-user page experience meets LCP <= 2.5 seconds, INP <= 200 milliseconds, and CLS <= 0.1 at the 75th percentile, evaluated separately for mobile and desktop. Before sufficient real-user data exists, delivery reports MUST state that these targets are unverified and report laboratory budget results separately.
- **SC-006**: All primary acceptance journeys pass keyboard and assistive-technology checks and remain readable without horizontal page scrolling at 320 CSS pixels and representative desktop widths.
- **SC-007**: All applicable online, reload, installed-app, offline, and update acceptance journeys pass from the GitHub Pages deployment address, including its repository subpath, with no application backend or private credentials required.
- **SC-008**: At launch, 100% of Dewan Rakyat sittings in the verified official-source inventory are selectable, across every represented Parliament. Catalogue reconciliation MUST record the source inventory and its verification time.
- **SC-009**: Acceptance MUST exercise acquisition/publication of a newly discovered sitting and a changed historical record, verify scheduled refresh configuration, and record observation, acquisition, and site-publication times. The best-effort target is publication within 24 hours; use official change time when supplied, otherwise explicitly report observation-based latency without claiming the official publication-to-reader interval is known. Delay, failure or waiting for required candidate-matched acceptance evidence must produce an operational report and a stale-data indication while retaining validated content; the old site's knowledge remains limited to its published metadata and age-based overdue checks. Controlled source fixtures may verify the mechanism; real-source observations and unavailable timing evidence MUST be reported separately.
- **SC-010**: Every reader-generated control, status/error message, assistive-technology announcement, and item of user guidance in the primary acceptance journeys MUST be available in both Bahasa Melayu and English. A first visit MUST use Bahasa Melayu; switching to either language MUST preserve valid selections and the original transcript text.

- **SC-011**: Reading, offline reopening, saved-data refresh, and application-update acceptance journeys MUST pass on every browser target in FR-009. Installation MUST also pass on each target that supports it. Validation MUST record the acceptance date, browser and operating-system versions, and devices used; results for one target MUST NOT stand in for another.

## Assumptions

- The MVP serves public readers without accounts. Its scope is selecting and reading original Hansard contributions; summaries, transcript translations, MP rankings, political analysis, and the README's other voter-information features are outside this feature.
- "MP" means a Dewan Rakyat member. Dewan Negara and Kamar Khas are outside the MVP. "Specific parliament session" is interpreted as one dated sitting, with Parliament/Penggal/Mesyuarat shown as context, rather than combining every sitting in a Penggal into one transcript.
- Launch coverage includes all available Dewan Rakyat sittings across every Parliament represented by the official source, with historical members where relevant. Records absent from the official source are not assumed to exist; source coverage gaps and refresh information must be visible.
- Installation depends on browser support. Offline availability starts after a successful online visit and reading of the relevant transcript, and depends on the device retaining saved data. First visits and unread transcripts require a connection.
- The user approved build-time acquisition from the official portal JSON endpoints. A publication pipeline may prepare static data; the deployed reader still has no application backend or proxy and does not fetch Parliament directly. Internal endpoint changes and best-effort refresh delays are accepted limitations that must remain visible.
- Reliably assigned source identities are authoritative for filtering. Missing/conflicting identities are visible attribution gaps, including gaps that could contain the selected MP's words; the reader does not promise to reconstruct them or infer participation from incomplete records.

### Source Dependencies and Verification Boundary

- Checked on **10 October 2026**: Parliament's official [Digital Hansard portal](https://hansard.parlimen.gov.my/en-GB) and [MP search](https://hansard.parlimen.gov.my/en-GB/cari-mp) provide official reading and member-search entry points. The [10 February 2026 Dewan Rakyat record](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10) demonstrates member-attributed text, dated sitting context, and draft status. These observations establish source provenance, not complete coverage or API suitability.
- Research on **10 October 2026** verified anonymous official portal JSON endpoints for members, catalogue, and a sampled transcript. The catalogue enumerated 4,090 unique sittings across Parliaments 1–15. Sampled response headers did not allow cross-origin browser reads, so the user approved acquisition before publication. Endpoint URLs, payload evidence, and deployment-ID dependence are recorded in [research.md](research.md); this is an internal interface, not a promised public API support contract.
- The sampled record lacks official publication/revision timestamps and has missing speaker identities, including a question explicitly naming Lim Guan Eng/Bagan. The user's approval replaces the earlier feasibility blocker with best-effort refresh and explicit attribution/identity-gap behavior. Missing metadata MUST remain unavailable, and the implementation MUST not claim complete official-record coverage beyond the supplied validated data.
- Parliament publishes general open-data terms, but their explicit applicability to Hansard API/exports remains unverified. The user's instruction authorizes this source choice; it does not establish an external data licence. Document source attribution and the policy-verification limit; comply with any source-specific restrictions discovered before publication. Do not claim reuse permission has been verified.
- [GitHub's hosting documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) confirms static hosting. The plan MUST define publication-time acquisition, static data layout/size budgets, source-validation and failure-preservation rules, and repository-subpath behavior. Full archive retrieval, actual deployment, and runtime acceptance remain implementation validation work.
