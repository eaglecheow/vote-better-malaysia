# Vote Better Malaysia Constitution

## Core Principles

### I. Think Before Coding

Assumptions MUST be stated before implementation. Ambiguity that changes scope or
behavior MUST be resolved with the user. Simpler approaches and material tradeoffs
MUST be surfaced before committing to an implementation.

### II. Simplicity First

Changes MUST contain only what solves the agreed problem. Speculative features,
configuration, and abstractions for a single use MUST NOT be added. Prefer existing
project patterns and standard platform capabilities.

### III. Surgical Changes

Every changed line MUST trace to the requested work. Existing style and unrelated
user changes MUST be preserved. Remove code made unused by the change, while leaving
unrelated cleanup for a separate request.

### IV. Verifiable Outcomes

Each task MUST define observable success criteria and complete the relevant checks.
Bug fixes MUST first reproduce the failure. New validation MUST cover invalid inputs.
Refactors MUST preserve behavior through checks before and after the change.
Verification reports MUST distinguish tested behavior from assumptions and remaining gaps.

### V. Accurate, Accessible Voter Information

Published voting, candidate, and policy information MUST identify its sources and
the dates relevant to time-sensitive claims. Unverified or outdated information MUST
be labeled. Features MUST make information understandable and accessible to the
Malaysian voters they serve.

## Project Scope

The README defines the project's voter information, candidate profiles, policy
comparison, resources, and localized content goals. Feature specifications MUST
define the requested subset before implementation. Technology choices MUST be
justified in the implementation plan; this constitution does not prescribe a stack.

## Development Workflow

Use Spec Kit to specify a feature, resolve material ambiguity, plan it, generate
tasks, implement it, and assess convergence. Plans MUST check these principles.
Completed work MUST report the relevant validation and any remaining limitations.

The configured Git lifecycle hooks MUST create a numbered branch before feature
specification and commit locally after successful core operations when files change.
Operations MUST begin with a clean working tree so automatic commits contain only
the operation's work. Failed operations MUST leave changes uncommitted. Pushing
requires an explicit user request.

## Governance

Reviewers MUST check feature artifacts and implementation against this constitution.
The user's explicit task instructions take precedence. Amendments MUST explain their
reason and impact, update the version and amendment date, and be recorded in Git.
Use MAJOR versions for incompatible principle changes, MINOR for new or expanded
principles, and PATCH for clarifications. See `AGENTS.md` for day-to-day guidance.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
