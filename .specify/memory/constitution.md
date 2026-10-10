# Vote Better Malaysia Constitution

## Core Principles

### I. Think Before Coding

Assumptions MUST be stated before implementation. Ambiguity that changes scope or
behavior MUST be resolved with the user. Simpler approaches and material tradeoffs
MUST be surfaced before committing to an implementation.

### II. SOLID, DRY, and Simplicity

Designs MUST apply SOLID where applicable to the chosen language and architecture:

- Single responsibility: modules MUST have focused responsibilities and reasons to change.
- Open/closed: extensions MUST use established boundaries when they meet the concrete need.
- Liskov substitution: substitutes MUST preserve their contracts and observable behavior.
- Interface segregation: interfaces MUST expose only the capabilities their consumers need.
- Dependency inversion: business rules MUST depend on explicit, testable boundaries rather
  than be coupled to infrastructure details.

Plans MUST identify how these principles apply and justify any non-applicable principle.
Dependencies MUST be explicit and code MUST remain testable. Shared business rules MUST
have one authoritative implementation; duplication MUST NOT create competing definitions.

Changes MUST contain only what solves the agreed problem. Abstractions MUST have a
documented concrete need, such as an existing shared rule or a required test boundary.
Speculative features, configuration, frameworks, unnecessary layers, and abstractions
without such a need MUST NOT be added. Designs MUST use existing project patterns and
standard platform capabilities when they satisfy the requirements.

### III. Surgical Changes

Every changed line MUST trace to the requested work. Existing style and unrelated
user changes MUST be preserved. Remove code made unused by the change, while leaving
unrelated cleanup for a separate request.

### IV. Mandatory Test-Driven Development

Every feature MUST begin with meaningful failing unit tests before production
implementation. Tests MUST assert required observable behavior, including invalid inputs
when relevant, rather than merely mirror implementation details. Every bug fix MUST begin
with a failing regression test that reproduces the defect.
New validation logic MUST have unit tests covering invalid inputs.

Each behavior change MUST follow RED -> GREEN -> REFACTOR:

1. RED: write and run the relevant tests, confirm a behavioral assertion fails because
   the required behavior is missing or incorrect, and record the evidence. Syntax,
   dependency, import, fixture, or test-harness errors MUST be repaired and MUST NOT count
   as RED. Tests that already pass MUST NOT count as RED.
2. GREEN: only after verified RED, implement the smallest production change that makes
   the tests pass, then run the relevant suite to check for regressions.
3. REFACTOR: assess the design and perform only necessary refactoring while keeping the
   tests green. If no refactoring is needed, record that decision.

This sequence MUST apply to foundational components that add production behavior as well
as user-facing features. Production implementation of a covered behavior MUST NOT begin
until its RED evidence is recorded. Test-harness setup MUST NOT introduce feature behavior.

Unit tests MUST be supplemented with browser/integration tests for relevant PWA behavior,
including offline use, cache population and invalidation, and service-worker installation,
activation, and updates. These tests MUST exercise actual browser behavior; passing mocks
or unit tests alone MUST NOT establish that offline or update flows work.

Feature artifacts or durable linked test reports MUST record the test identifiers,
commands, tested revision or working-tree state, expected failure, observed initial
assertion failure, and subsequent passing results. Evidence MUST be recorded when the
tests run; tests added after implementation MUST NOT be presented as TDD evidence.
Refactors MUST preserve behavior through checks before and after the change. Verification
reports MUST distinguish tested behavior from assumptions and remaining gaps.

### V. Accurate, Accessible Voter Information

Published voting, candidate, and policy information MUST identify its sources and
the dates relevant to time-sensitive claims. Unverified or outdated information MUST
be labeled. Features MUST make information understandable and accessible to the
Malaysian voters they serve.

### VI. Measurable Performance

The PWA MUST target Core Web Vitals of LCP <= 2.5 seconds, INP <= 200 milliseconds,
and CLS <= 0.1 at the 75th percentile, evaluated separately for mobile and desktop
real users. Results MUST NOT combine these device groups to claim compliance.

Before production implementation, plans MUST define numeric budgets for relevant bundle
sizes and critical operations. Each budget MUST specify its units, bundle accounting
(such as compressed transfer size), representative devices, network conditions, datasets,
measurement method, run count, and pass/fail aggregation rule. Budgets MUST cover relevant
cold loads, repeat loads, and offline operations; any non-applicable scenario MUST have a
written rationale.

Production builds MUST be validated using repeatable performance checks under the defined
conditions. Reports MUST identify the build revision, measurement conditions, measured
values, and budget results. CI MUST enforce the defined budgets before merge: an exceeded
budget or missing required check MUST block merging.

Reports MUST distinguish laboratory measurements from real-user results. Passing unit
tests or a Lighthouse score alone MUST NOT be claimed as proof of real-user performance.
Unavailable evidence MUST be explicitly reported, including unavailable real-user data
or insufficient data for a device group. A laboratory pass MUST NOT be reported as proof
that the real-user percentile targets have been met.

### VII. Required Developer, User, and Code Documentation

Developer getting-started documentation MUST describe prerequisites, installation,
required configuration, and the commands to run, test, and build the project. The README
MUST contain this information or link directly to it. Documented commands MUST be
verified against the current project setup.

User documentation MUST explain each implemented feature, how to use it, and any
user-relevant limitations, including offline behavior where applicable. It MUST be
discoverable from the README or the application. Developer and user documentation MUST
be prepared with the corresponding work and updated whenever setup or features change.

Every function and method MUST have documentation comments using the chosen language's
convention, such as JSDoc for JavaScript or docstrings for Python. These comments MUST
explain purpose, parameters, return values, and relevant side effects or errors, where
applicable, and MUST stay consistent with the implementation.

Documentation makes the project usable by new developers and voters and preserves code
contracts for maintainers. Missing or outdated required documentation MUST block
completion of the affected work.

## Project Scope

Vote Better Malaysia is a Progressive Web App (PWA). The README defines its voter
information, candidate profiles, policy comparison, resources, and localized content goals.
Feature specifications MUST define the requested subset and relevant offline, caching,
and service-worker behavior before implementation. Technology choices MUST be justified
in the implementation plan; this constitution does not prescribe a stack.

## Development Workflow

Work MUST use Spec Kit to specify a feature, resolve material ambiguity, plan it, generate
tasks, implement it, and assess convergence. Each artifact MUST enforce these gates:

- Specifications (`spec.md`) MUST define observable acceptance criteria, require failing
  unit tests before feature implementation and regression tests before bug fixes, identify
  relevant PWA browser scenarios, include measurable performance success criteria, and
  identify developer and user documentation deliverables for the requested work.
- Plans (`plan.md`) MUST include a Constitution Check before research and again after
  design. It MUST cover the RED -> GREEN -> REFACTOR sequence, test tools and evidence
  locations, applicable SOLID decisions, authoritative shared rules, numeric performance
  budgets and measurement conditions, browser validation, and CI merge gates. Plans MUST
  identify documentation locations and the language's function/method comment convention.
  Missing budgets or test strategy MUST block implementation.
- Tasks (`tasks.md`) MUST include explicit test-writing and RED verification/evidence
  tasks before each corresponding production implementation task. Every task MUST define
  observable success criteria and complete its relevant checks. Dependencies MUST
  prevent implementation from starting, including in parallel, before that behavior's
  RED gate passes. GREEN validation, necessary refactoring or a no-refactor decision,
  browser/integration checks, production-build performance checks, and CI budget
  enforcement MUST be included where relevant. Tasks MUST include developer and user
  documentation preparation or updates; production code tasks MUST require documentation
  comments for every function and method they introduce or change. Test tasks MUST NOT
  be optional or deferred to a final polish phase.
- Implementation MUST execute and record these gates in order. A test-writing task MUST
  NOT be marked complete until the tests run and the required behavioral failure is
  confirmed; production code MUST NOT be written to make an unverified test task pass.
- Completion and convergence checks MUST trace acceptance criteria to test results and
  include initial RED evidence, passing unit/regression and relevant browser suites,
  production-build budget results, CI enforcement evidence, documentation review results,
  and any remaining limitations. Documentation review MUST verify developer setup commands,
  user coverage of implemented features, and function/method comment coverage and accuracy.
  Missing required evidence or a failed gate MUST prevent a completion or convergence
  claim. Unavailable real-user data MUST be disclosed and MUST NOT be treated as a
  failed laboratory check or as proof that real-user targets passed.

Analysis and review MUST treat missing test tasks, implementation scheduled before RED,
missing numeric budgets or CI enforcement, and unsupported performance claims as
constitution violations. Missing or outdated required developer, user, or code
documentation MUST also be treated as a constitution violation. Generic template or
command language making tests optional MUST NOT override this project's mandatory TDD
requirements. A test-policy exemption MUST NOT be inferred from a feature's size or
apparent simplicity.

The configured Git lifecycle hooks MUST create a numbered branch before feature
specification and commit locally after successful core operations when files change.
Operations MUST begin with a clean working tree so automatic commits contain only
the operation's work. Failed operations MUST leave changes uncommitted. Pushing
requires an explicit user request.

## Governance

Reviewers MUST check specifications, plans, tasks, implementation, and completion evidence
against this constitution before merge. Its requirements MUST take precedence over
conflicting template defaults and routine workflow guidance. The user's explicit task
instructions take precedence. Violations MUST be resolved before the affected work is
marked complete; a change to a principle MUST be made through an explicit constitution
amendment rather than a silent waiver in a feature artifact.

Amendments MUST explain their reason and impact, preserve still-applicable guidance,
update the version and amendment date, and be recorded in Git. Versioning MUST use MAJOR
for incompatible principle removals or redefinitions, MINOR for new or materially expanded
principles or sections, and PATCH for non-semantic clarifications. Reviewers MUST assess
the amendment's effect on active feature artifacts and require any necessary updates
before implementation continues. See `AGENTS.md` for day-to-day guidance.

**Version**: 1.2.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
