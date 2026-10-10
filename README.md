# Vote Better Malaysia

A platform dedicated to helping Malaysian voters make informed decisions through accessible voting information and resources.

## About

Vote Better Malaysia is an initiative to improve civic engagement and voter literacy in Malaysia. This project aims to provide voters with clear, accurate, and easy-to-access information about the voting process, candidates, and policies.

## Features

- **Voter Information Guide** - Step-by-step guides for voting in Malaysia
- **Candidate Profiles** - Detailed information about candidates and their platforms
- **Policy Comparison** - Compare different policies side-by-side
- **Voting Resources** - FAQs, tutorials, and educational materials
- **Localized Content** - Content tailored to different regions in Malaysia

## Getting Started

### Prerequisites

- Git, Python 3.11+, [uv](https://docs.astral.sh/uv/), and Codex.
- Spec Kit **1.1.3**, with the bundled Git extension **1.0.1**.

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

This repository contains the project setup and documentation. Application dependencies
and startup commands will be defined by the first feature's implementation plan.

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
└── specs/                      # Created when the first feature is specified
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

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## Contact

For questions, suggestions, or feedback, please reach out to:
- GitHub Issues: [Create an issue](https://github.com/eaglecheow/vote-better-malaysia/issues)
- [Add other contact methods if applicable]

## Acknowledgments

- [Add acknowledgments or credits]
- The Malaysian voting community and civic enthusiasts

---

**Note:** This is a community-driven project. We encourage all Malaysians interested in improving voter literacy to contribute!
