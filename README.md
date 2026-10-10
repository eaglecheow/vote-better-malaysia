# Vote Better Malaysia

A static reader for Malaysian Parliament's Dewan Rakyat Hansard records.

## About

The first implementation lets readers choose a source identity and dated sitting,
then read the speaking turns attributed to that identity in the original source
language. It preserves unassigned passages and links to the official record.
Implementation and acceptance status are recorded in the
[task list](specs/001-read-mp-hansard/tasks.md) and
[evidence index](specs/001-read-mp-hansard/evidence/acceptance.md).

## Features

- Source-identity and dated-sitting selection with acquisition and coverage details.
- Original speaking turns, attribution-gap passages and official record links.
- Bahasa Melayu and English reader controls and guidance.
- Saving of opened transcripts for offline reading, with separate saved-copy and
  offline-readiness notices, plus deliberate application updates.

These mechanisms have local unit and native-engine evidence. Physical-device,
performance, human accessibility/usability, remote CI enforcement and GitHub Pages
acceptance remain pending; the repository does not yet claim a verified launch.

The next publication stage is an explicitly labeled public preview, as approved
on 2026-10-10. Its manual workflow checks the complete source, build, unit tests,
artifact byte limits and authored browser journeys before deployment. Full release
acceptance remains pending. See [Public preview deployment](docs/development.md#public-preview-deployment)
for GitHub Pages configuration, launch and refresh instructions.

## Getting Started

### Prerequisites

- Git, Python 3.11+, [uv](https://docs.astral.sh/uv/), and Codex.
- Spec Kit **1.1.3**, with the bundled Git extension **1.0.1**.
- Node.js 24 LTS and npm for application development.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eaglecheow/vote-better-malaysia.git
cd vote-better-malaysia
```

2. Install the pinned Spec Kit release:
```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.3
specify version
specify check
```

3. Open this folder in Codex. Project skills are installed in `.agents/skills/`;
   open a new chat if they are not yet visible.

For application installation, configuration, run/test/build commands and their current
verification status, see [Developer setup](docs/development.md). The first implementation
is the [MP Hansard Reader](specs/001-read-mp-hansard/spec.md); its
[validation guide](specs/001-read-mp-hansard/quickstart.md) preserves the planning command
contract and required delivery checks.

See the bilingual [Hansard reader guide](docs/user-guide.md) for reading, source
attribution and current feature limits. The application also links to reading help.

## Usage

The constitution is initialized at `.specify/memory/constitution.md`. Invoke these
skills in Codex chat, one operation at a time:

```text
$speckit-specify Describe the feature, its users, and the intended outcome.
$speckit-clarify
$speckit-plan Describe the implementation constraints and proposed stack.
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

Clarification and analysis are optional. Repeat implement and converge until the feature
converges. Use `$speckit-checklist` for requirement quality checks and
`$speckit-constitution` to amend project principles. These are agent skills, not shell
commands.

### Git automation

The official Git extension creates a numbered feature branch before specification.
Mandatory post-operation hooks make a **local commit** after every successful core
operation when files change:

`constitution`, `specify`, `clarify`, `plan`, `tasks`, `implement`, `checklist`,
`analyze`, `converge`, and the deprecated `taskstoissues` operation.

The hooks live in `.specify/extensions.yml`; enabled events and commit messages live in
`.specify/extensions/git/git-config.yml`. This setup adds `after_converge`, which is
absent from the bundled Git extension's default hooks. Before-operation commits are
disabled. Read-only operations with no changes skip the commit. Optional bug and idea
assessment extensions are not installed.

These are Spec Kit lifecycle hooks executed by the coding agent. Native Git hooks
under `.git/hooks` do not receive Spec Kit operation events. Start each operation with
a clean working tree: the bundled script stages all non-ignored repository changes.
The agent must finish the operation's required checks before running its commit hook.
Failed operations leave changes uncommitted.

Push manually when ready:

```bash
git push -u origin HEAD
```

Reinstalling, re-enabling, or updating the Git extension can reset hook settings.
After such a change, restore this policy: keep repository initialization and feature
branching enabled; disable all before-operation commit hooks; enable mandatory
(`optional: false`) after-operation commit hooks for all ten operations, including
`after_converge`; enable their matching `auto_commit` events in the Git config.

See the [official Git extension documentation](https://github.com/github/spec-kit/blob/v1.1.3/extensions/git/README.md).

## Project Structure

```
vote-better-malaysia/
├── .agents/skills/             # Codex Spec Kit skills
├── .specify/                   # Templates, workflow, constitution, Git extension
├── AGENTS.md                   # Coding and automatic commit guidance
├── README.md
├── docs/                       # Developer and bilingual reader guidance
├── src/                        # Static reader, source model and device storage
├── worker/                     # Versioned offline shell and update protocol
├── scripts/                    # Acquisition, checks and candidate controllers
├── public/                     # Help, install assets and ignored generated data
├── tests/                      # Unit and native-engine mechanism checks
├── .github/workflows/          # CI and Pages delivery configuration
└── specs/                      # Feature specifications, plans, tasks and evidence
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Use `$speckit-specify` to create a numbered feature branch and specification
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the current branch (`git push -u origin HEAD`)
5. Open a Pull Request

Please make sure to:
- Follow our code style guidelines
- Write clear commit messages
- Update documentation as needed
- Add tests for new features

## License

This checkout has no `LICENSE` file. A repository licence and applicability of
Hansard reuse policy still require confirmation before publication; see the
[source evidence](specs/001-read-mp-hansard/evidence/source.md) for the verified
source boundary. No licence is established by the source-access approvals.

## Contact

For questions, suggestions, or feedback, please reach out to:
- GitHub Issues: [Create an issue](https://github.com/eaglecheow/vote-better-malaysia/issues)
- [Add other contact methods if applicable]

## Acknowledgments

- [Add acknowledgments or credits]
- The Malaysian voting community and civic enthusiasts

---

**Note:** This is a community-driven project. We encourage all Malaysians interested in improving voter literacy to contribute!
