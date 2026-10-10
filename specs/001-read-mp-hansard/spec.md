# Feature Specification: MP Hansard Reader MVP

**Feature Branch**: `001-read-mp-hansard`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Create a PWA that gets data from the Malaysian Parliament Hansard API, lets users select an MP name and a specific parliament session, and displays that MP's transcript for the selected session. Design it for GitHub Pages hosting, where there may be no backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read an MP's contributions to a sitting (Priority: P1)

As a Malaysian voter, I can select an MP and a parliamentary sitting and read what that MP said, with enough source information to check the original record.

**Why this priority**: Finding and reading the selected MP's actual words is the entire core value of the MVP.

**Independent Test**: Open the public site, select a known MP and dated sitting with published contributions, and compare all displayed contributions with the corresponding official Hansard.

**Acceptance Scenarios**:

1. **Given** published member and sitting lists, **When** I open the site, **Then** I can select an MP by name and a sitting by date, with Parliament, Penggal and Mesyuarat context identifying the sitting unambiguously.
2. **Given** either selection is missing, **When** I try to read a transcript, **Then** the site identifies the missing selection and does not show a result for an incomplete pair.
3. **Given** both selections identify an available transcript, **When** I request it, **Then** I see every contribution attributed to that MP in that sitting, in the published order and original language, with readable paragraphs and available timestamps or source locations.
4. **Given** a displayed transcript, **When** I inspect its heading and source details, **Then** I see the selected MP, constituency where provided, sitting context, official source link, source status such as draft where provided, and when the displayed data was last refreshed.
5. **Given** a displayed transcript, **When** I change either selection, **Then** the previous transcript is cleared or explicitly marked as belonging to the previous pair until the matching result appears; a late result from an earlier selection cannot replace the current result.
6. **Given** MPs with similar names or changing constituencies across parliamentary terms, **When** I select a member, **Then** the identity and constituency used for the transcript match the selected sitting's record rather than assuming the member's current constituency.

---

### User Story 2 - Understand missing records and recover from failures (Priority: P2)

As a voter, I can tell whether an MP has no recorded contributions or whether the record could not be obtained, and can retry without choosing the same fields again.

**Why this priority**: Missing data and access failures must not be presented as evidence that an MP did not speak.

**Independent Test**: Exercise a verified sitting with no contributions for the selected MP, an unpublished record, and a failed retrieval; each must produce a distinct, understandable outcome while preserving the selection.

**Acceptance Scenarios**:

1. **Given** a successfully obtained, complete sitting record with no contributions attributed to the selected MP, **When** I request that pair, **Then** I see "No recorded contributions for this MP in this sitting," with the pair and official source identified.
2. **Given** a missing or unpublished record, **When** I request it, **Then** I see that the transcript is unavailable, without a claim that the MP did not speak.
3. **Given** a connection or source-access failure, **When** retrieval fails, **Then** I see an actionable error and can retry with the MP and sitting selections preserved.
4. **Given** incomplete content or uncertain speaker attribution, **When** the result is displayed, **Then** it is labeled incomplete or unverified, uncertain passages are not assigned to the selected MP, and I can open the official source.
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
4. **Given** a saved transcript and a restored connection, **When** I request that pair again, **Then** the reader attempts to refresh it, identifies the successful refresh time, makes the refreshed version available for the next offline visit, and preserves the last readable version if refreshing fails with a clear saved-data notice.
5. **Given** a new application version becomes available while I am reading, **When** the update is offered, **Then** I can continue reading until I choose to apply it, and my valid MP and sitting selections are preserved after the update. Compatible saved transcripts remain readable; any saved content that cannot safely be reused is explicitly identified as unavailable and requires a new online retrieval.
6. **Given** saved data was removed by the browser or could not be stored, **When** I use the reader, **Then** online reading still works and offline availability is not promised for missing content.

### Edge Cases

- A selected MP has several separate speaking turns, interruptions, or quoted references to other MPs; another person's speech must not become the selected MP's contribution.
- Similar names, titles, spelling variations, and constituencies changing between terms must not merge different member identities.
- Records contain mixed languages, long contributions, repeated speaker headings, missing timestamps, or missing constituency details.
- A record is draft, revised, incomplete, or temporarily inaccessible; saved data may predate the current official record.
- The user changes selections while a previous result is still loading.
- No contribution is distinguishable from unpublished data, uncertain attribution, failed retrieval, and an unread transcript requested offline.
- First visits without a connection cannot obtain unsaved data; later visits may encounter cleared or unavailable device storage.
- The deployed site uses a repository subpath, and the reader is reopened or refreshed from that address or from an installed app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST obtain its member, sitting, and transcript data from the Malaysian Parliament Hansard API requested by the user. All published content MUST be traceable to official Parliament records; API availability and permitted access are planning dependencies, not verified assumptions.
- **FR-002**: Users MUST be able to select an MP by name from the available member catalogue, with constituency or parliamentary-term context where needed and provided to distinguish identities.
- **FR-003**: Users MUST be able to select one dated Dewan Rakyat sitting. Each choice MUST show its date and Parliament, Penggal and Mesyuarat context. The catalogue MUST state its supported coverage and last refresh time so users can distinguish unavailable coverage from an MP's participation.
- **FR-004**: The reader MUST require both valid selections, provide loading feedback, and ensure each result belongs to the currently selected member and sitting even when earlier requests finish later.
- **FR-005**: The reader MUST display all published speaking turns attributed to the selected MP for that sitting, in source order and original language, preserving the words and paragraph structure. Available timestamps or source locations MUST remain associated with their turns. It MUST NOT invent text, silently omit known turns, or attribute another speaker's words to the MP.
- **FR-006**: Every result MUST identify the selected member and sitting and provide an official source link, source draft/final or revision status where supplied, publication/revision dates where supplied, and the last successful data-refresh time. Missing source metadata MUST not be invented.
- **FR-007**: The reader MUST distinguish a verified absence of recorded contributions from unavailable records, incomplete or uncertain attribution, connectivity/source failures, and unsaved offline content. It MUST retain valid selections and allow retry after failures.
- **FR-008**: The complete selection-to-reading journey MUST be usable with a keyboard and assistive technology, including labeled controls, visible focus, and announced loading, result, and error states. At a viewport width of 320 CSS pixels, controls and transcript text MUST remain readable without horizontal page scrolling.
- **FR-009**: The reader MUST be installable where the browser supports PWA installation and usable as a normal website otherwise. Both entry points MUST support the same selection and reading journey.
- **FR-010**: Following a successful online visit, the reader MUST reopen offline on the same device with saved selection lists and successfully opened transcripts while that device's saved data remains available. Offline reading MUST retain attribution and source details; saving the entire archive is outside MVP scope.
- **FR-011**: Saved content MUST show its last successful refresh time and that it is a saved copy whenever an up-to-date online result cannot be established. Reopening a selected pair online MUST attempt a refresh; failed refreshes MUST not destroy the last readable version. A successful refresh MUST replace the saved version for subsequent offline reading.
- **FR-012**: Application updates MUST not interrupt active reading or mix incompatible saved content. Users MUST be able to apply an available update deliberately; valid selections MUST survive it. Content that cannot safely be reused MUST be treated as unavailable rather than displayed under an incorrect member or sitting.
- **FR-013**: The deployed MVP MUST operate on GitHub Pages, including a repository subpath, without an application backend, server-side runtime, private credential embedded in public files, or separately operated proxy. Opening, refreshing, installation, offline reopening, and updates MUST work from the deployed address.
- **FR-014**: The MVP MUST provide developer documentation for prerequisites, installation, configuration, running, testing, building, and GitHub Pages deployment, discoverable from the README. It MUST provide user guidance for selecting records, source coverage and status, installation, offline limits, saved-data freshness, errors, and updates, discoverable from the README or reader.

### Delivery and Validation Requirements

These project governance requirements supplement the user-facing acceptance criteria; they do not select an implementation stack.

- **DV-001**: Each implemented behavior MUST begin with meaningful failing unit tests, and bug fixes MUST begin with failing regression tests. Delivery evidence MUST record test identifiers, commands, tested revision or working-tree state, expected and observed behavioral assertion failures, subsequent passing checks, and necessary refactoring or an explicit no-refactor decision.
- **DV-002**: Actual browser validation MUST cover source integration, keyboard use, repository-subpath deployment, installation where supported, offline reopening, saved-data population and replacement, storage loss, and application installation/activation/update behavior. Mocks alone MUST not establish those outcomes.
- **DV-003**: Before implementation, the plan MUST define numeric performance budgets and repeatable measurement conditions covering cold visits, repeat visits, selected-record reading, and offline reopening, with a rationale for any non-applicable scenario. Production-build checks and CI merge gates MUST enforce those budgets; reports MUST distinguish laboratory results from real-user results and disclose unavailable evidence for either device group.
- **DV-004**: Developer setup and deployment commands, user guidance, and documentation comments for every introduced or changed function/method MUST be reviewed for completeness and accuracy as part of delivery. Missing required documentation or validation evidence MUST prevent an implementation-completion claim.

### Key Entities *(include if feature involves data)*

- **Member of Parliament**: A source-identified person with a name and constituency/term context relevant to a sitting. Membership and names must not be inferred solely from the current member list.
- **Parliamentary Sitting**: One dated Dewan Rakyat sitting, identified within a Parliament, Penggal and Mesyuarat, with an associated official record and publication status.
- **Contribution**: One speaking turn attributed to a member within a sitting, containing original transcript text, its published order, and available timestamp or source location. One member may have many contributions in a sitting.
- **Transcript Result**: The selected member/sitting pair and its ordered contributions, or its explicit absence/unavailability state, together with provenance, completeness, source status and refresh time. A device may retain a saved copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 9 of 10 first-time test users can select a specified MP and sitting and begin reading the correct contributions within 60 seconds, without assistance or an account.
- **SC-002**: At least 95% of 30 online reading attempts per device group, spanning at least five published sittings of different transcript lengths under documented representative mobile and desktop network conditions, display the matching transcript or verified no-contributions outcome within five seconds after the read request. Source failures are reported separately and are not counted as successful outcomes.
- **SC-003**: Across at least 10 manually verified member/sitting pairs from at least five sittings, 100% of published contributions for each selected MP appear in the correct order with correct words and attribution. The sample MUST include multiple speaking turns, other-speaker interruptions, a draft record where available, and a verified no-contributions case; all results MUST expose their official source.
- **SC-004**: In 10 offline reopen attempts on each supported mobile and desktop browser used for acceptance, 100% of previously saved test transcripts become readable within two seconds and identify their saved-data state. Every tested unsaved pair shows a connection-required outcome. Refresh/update checks produce no incorrectly attributed content or unintended loss of compatible saved transcripts; incompatible saved content is explicitly identified as unavailable and requires online retrieval.
- **SC-005**: Real-user page experience meets LCP <= 2.5 seconds, INP <= 200 milliseconds, and CLS <= 0.1 at the 75th percentile, evaluated separately for mobile and desktop. Before sufficient real-user data exists, delivery reports MUST state that these targets are unverified and report laboratory budget results separately.
- **SC-006**: All primary acceptance journeys pass keyboard and assistive-technology checks and remain readable without horizontal page scrolling at 320 CSS pixels and representative desktop widths.
- **SC-007**: All applicable online, reload, installed-app, offline, and update acceptance journeys pass from the GitHub Pages deployment address, including its repository subpath, with no application backend or private credentials required.

## Assumptions

- The MVP serves public readers without accounts. Its scope is selecting and reading original Hansard contributions; summaries, translations, MP rankings, political analysis, and the README's other voter-information features are outside this feature.
- "MP" means a Dewan Rakyat member. Dewan Negara and Kamar Khas are outside the MVP. "Specific parliament session" is interpreted as one dated sitting, with Parliament/Penggal/Mesyuarat shown as context, rather than combining every sitting in a Penggal into one transcript.
- The catalogue reflects the official source's supported data coverage, including historical members where relevant. Complete historical coverage and immediate publication of new records are not assumed; coverage and refresh information must be visible.
- Installation depends on browser support. Offline availability starts after a successful online visit and reading of the relevant transcript, and depends on the device retaining saved data. First visits and unread transcripts require a connection.
- Data acquisition or preparation before publication may be necessary; the deployed reader must satisfy the static-hosting constraint. The acquisition approach is a planning decision and must not silently replace the requested official API with an unapproved source.

### Source Dependencies and Verification Boundary

- Checked on **10 October 2026**: Parliament's official [Digital Hansard portal](https://hansard.parlimen.gov.my/en-GB) and [MP search](https://hansard.parlimen.gov.my/en-GB/cari-mp) provide official reading and member-search entry points. The [10 February 2026 Dewan Rakyat record](https://hansard.parlimen.gov.my/hansard/dewan-rakyat/2026-02-10) demonstrates member-attributed text, dated sitting context, and draft status. These observations establish source provenance, not complete coverage or API suitability.
- A documented public Hansard API has **not been verified**. Planning MUST verify availability, supported member and sitting identifiers, contribution completeness and attribution, browser access, credential requirements, usage permissions, and compatibility with backend-free deployment. If those conditions cannot be met, implementation MUST wait for an agreed change to the source or scope; a source-access failure cannot be converted into a no-contributions result.
- [GitHub's hosting documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) confirms that GitHub Pages provides static hosting. Planning must demonstrate a viable way to satisfy the requested official-data dependency within that hosting constraint before implementation begins.
