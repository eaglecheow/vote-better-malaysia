# Project guidance

## Coding

- State assumptions before implementation. Ask when ambiguity affects the result.
- Use the smallest change that fully solves the requested problem. Avoid speculative
  features, configuration, and single-use abstractions.
- Match the surrounding style and preserve unrelated work. Every changed line must
  trace to the request.
- Define verifiable success criteria. Reproduce bugs before fixing them and run checks
  appropriate to the change; report what was and was not verified.

## Spec Kit

This project uses Spec Kit 1.1.3 with Codex skills in `.agents/skills/`.
Read `.specify/memory/constitution.md` before planning or implementation.

- Follow the enabled lifecycle hooks in `.specify/extensions.yml`. Mandatory hooks
  must actually execute, including the local commit hook after each successful core
  operation. Pass the exact event name, such as `after_plan`, to the Git commit skill.
- Start an operation with a clean Git working tree. If unrelated changes exist, stop
  before editing and ask the user how to preserve them; the bundled commit script
  stages all non-ignored changes in the repository.
- Run post-operation commit hooks only after the operation completes successfully and
  its required validation passes. On failure, report the failure and leave changes
  uncommitted. Read-only operations with no changes need no commit.
- Commits are local. Push only when the user explicitly requests it.
- The Git extension creates a numbered feature branch before `speckit-specify`.
  Constitution updates run on the current branch.

See the README for commands and hook configuration.
