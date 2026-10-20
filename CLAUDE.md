# CLAUDE.md — Engineering Working Agreement

## Mission and source of truth
- Read `PLAN.md` before implementation; it defines core features, optional enhancements, approved dependencies, contracts, and milestones.
- Read `KNOWN_LIMITATIONS.md` for explicitly excluded features and acknowledged omissions.
- Read `PROGRESS.md` next; it records the current milestone, state, and open questions. If it is missing, create it when application implementation begins.
- Do not implement excluded features or optional enhancements without explicit approval. Do not add preparatory UI, API parameters, or abstractions for excluded work.
- The developer owns product and architectural decisions. Agents assist with implementation, testing, and code review while following established conventions.
- Implement the current milestone or explicitly assigned task. Do not silently omit required functionality or add unplanned features.

## Stack and architecture
- Use only the stack and structure in `PLAN.md` §3 (Architecture and stack).
- Add layers only when they own distinct responsibilities. No speculative generic repositories or pass-through services.

## Decision boundaries
- Planned direct dependencies and documented shadcn/framework-required packages are **preapproved**. Install as their milestone requires; no repeated permission needed.
- Before adding/removing/replacing **unplanned** direct dependencies, changing the agreed data/API contracts, introducing an architectural layer, or materially altering UX/scope/security behavior: propose the change and wait for developer approval.
- Ordinary implementation details (names, component internals, test fixtures, refactoring inside established boundaries) don't require approval.
- If an approved design proves technically incompatible, describe the evidence and smallest viable change rather than silently deviating.

## Spec changes
- Do not edit `PLAN.md` or `CLAUDE.md` without explicit developer approval, including small wording fixes.
- Propose spec changes in the handoff: what to change, why, and the evidence.
- Once a change is approved, update its owning document in the same task: `PLAN.md` for features and technical contracts, `KNOWN_LIMITATIONS.md` for omissions, and `CLAUDE.md` for working rules. `PROGRESS.md` records actual implementation and verification status.

## Pull requests and deployment
- Use `.claude/skills/prepare-pr/SKILL.md` when preparing or publishing a PR.
- Prepare the proposed title, complete description, base/head branches, and verification results locally for developer review before publishing. Do not create or edit a GitHub PR until the developer explicitly approves that concrete proposal.
- Read the current repository's PR template from disk, including comments, and preserve every heading, field, and comment. After publishing, read back the saved description and correct any template omissions before reporting completion.
- Approval to implement or prepare a PR does not authorize commits, pushes, or PR publication. Obtain explicit authorization for each action; one instruction may authorize multiple named actions.
- PR publication does not authorize merging, enabling auto-merge, or deployment. Do not perform those actions without separate explicit developer authorization. Before an authorized push or PR publication, inspect repository workflows for automatic deployment; disclose any deployment trigger and obtain deployment authorization before triggering it.

## Progress tracking
- `PROGRESS.md` is a short status board, not a log. Keep it current rather than appending history.
- Update `PROGRESS.md` after each meaningful implementation or verification checkpoint and at every handoff. Record implemented functionality, work in progress, verification results, blockers or open questions, and the next step.
- Keep progress claims aligned with the actual application: distinguish implemented behavior from planned work, and verified behavior from work that has not been checked.
- Mark a milestone complete only after the developer approves it. Finishing the work is not the same as approval.

## Before implementation
For a new feature or structural change, propose the approach, files, and tests, then wait for approval. Routine fixes within an approved task can proceed.
Include the intended test scenarios in plain language in the proposal so coverage can be reviewed before writing code. Focus on the behaviors in `PLAN.md` §6 (Automated verification); add the optional enhancement's coverage in §6 only when implementing it.

## Implementation scope and workflow
- Implement one logical feature or vertical slice at a time. Avoid unrelated features, refactoring, or restructuring.
- Keep each commit and PR digestible: a reviewer should be able to understand and verify it in one pass.
  - One purpose per commit, describable in a single sentence without "and".
  - Separate mechanical changes (scaffolding, generated files, dependency installs, renames, formatting) from logic changes.
  - Introduce at most one or two new concepts (a contract, layer, or pattern) per commit.
  - Each commit leaves the app building and runnable, and includes the tests for the behavior it adds.
  - Every changed file must serve the stated purpose; no drive-by edits.
- Every implementation proposal lists the planned commits, each with its purpose and main files. Split slices that fail these criteria before writing code.
- If work grows beyond its planned purpose, stop at a stable point and propose a split instead of continuing.
- Before any handoff, commit request, or PR proposal, show `git diff --stat` and confirm the change meets these criteria. Explain any large or wide diff, or propose a split.
- For backend behavior, start with a failing behavior/API test where useful (red → green → refactor). For UI, test meaningful interactions rather than styling details.
- Follow existing conventions and implement the smallest solution that meets the agreed behavior.
- Complete the applicable checks in `PLAN.md` §6 before handoff.
- Self-review the diff for correctness, unnecessary complexity, dead code, unsafe data handling, and contract mismatches.
- Leave the application runnable after each milestone. Do not commit changes unless explicitly instructed.

## Code and API quality
- Use explicit TypeScript types, descriptive names, small cohesive modules; avoid `any` without a documented reason.
- Handle expected HTTP, validation, network, and persistence failures with actionable messages and stable API error shapes. Do not expose raw SQL errors in responses.
- Prefer readable direct implementations over abstraction for hypothetical future features. Document non-obvious decisions, not trivial statements.

## Readability and simplicity
- Use feature-specific components and direct functions. Do not introduce generic form/table builders, extra backend layers, or custom state-management abstractions for this workflow.
- Optimize for code a developer can understand on the first read.
- Use straightforward control flow. Avoid nested ternaries, dense one-liners, and long chains of transformations.
- Use names that explain the domain and purpose. Avoid vague names such as `data`, `item`, or `handleAction` when a specific name helps.
- Keep each function focused on one clear responsibility. Extract a helper when it makes the caller easier to understand; avoid helpers that only rename a simple expression or add indirection.
- Keep related logic together. Do not split a feature across extra files merely to make individual files shorter.
- Prefer explicit code over configurable abstractions for a single use case. Introduce shared abstractions only for demonstrated needs.
- Prefer clear intermediate variables over compressed expressions.
- Use early returns when they reduce nesting.
- Comments should explain intent, constraints, or surprising behavior. Rewrite confusing code before adding a comment explaining its mechanics.
- Follow established project conventions instead of introducing a new pattern for each feature.
- Before handoff, review the changed code for readability: simplify unnecessary branches, remove redundant state and indirection, and confirm names communicate what the code does.

## Testing
- Follow `PLAN.md` §6 (Delivery and verification) for what to test and how the test database is isolated. When implementing the optional enhancement, also follow its verification requirements in §6.
- Test observable behavior, not implementation details or third-party component internals. Never rewrite a test just to hide a regression; investigate the behavior.

## Test readability
- Write tests as readable examples of application behavior.
- Use descriptive names that state the scenario and expected outcome, such as “rejects a future date of birth without saving the patient.”
- Keep each test focused on one behavior. Multiple assertions are fine when they verify the same outcome.
- Organize tests into arrange, act, and assert sections, separated by blank lines. Add section comments only when they help.
- Keep the action and important expectations visible in the test itself. Avoid helpers that hide requests, interactions, or assertions.
- Use a small valid patient fixture with explicit overrides for each scenario. Make the values relevant to the test easy to see.
- Use fictional, deterministic data. Avoid random values and reliance on execution order or shared mutable state.
- Prefer explicit test cases. Use parameterized tests only when the cases share the same behavior and remain easy to understand.
- For UI tests, use accessible roles and labels, and interact through the UI as a user would.
- For API tests, make the request, expected status, response, and any relevant persistence checks easy to follow.
- Mock only necessary boundaries; follow the database isolation requirements in `PLAN.md` §6.
- Avoid arbitrary delays, excessive setup, snapshot-heavy assertions, and checks of implementation details.
- Before handoff, read each new test independently: its setup, action, and expected behavior should be understandable without tracing several helper files.

## UI/UX
- Follow `PLAN.md` §2 (User experience) for required states, accessibility, and feedback rules, and §6 (Manual verification) for manual checks. Apply the optional enhancement's requirements in §6 when implementing it.
- A visual mock with hardcoded data is not completion of an API-backed workflow.

## Handoff
After each slice, stop and report:
- What changed and why, with each file's role.
- Identify any abstraction or unusual pattern introduced and explain why it is needed.
- A walkthrough of the data flow through actual files and functions: where validation, logic, state, and persistence happen, and the failure paths.
- Commands and tests actually run and their results; untested behavior. Never claim unrun checks passed.
- Proposed spec changes, if any.

Follow the Progress tracking requirements before handoff.

Leave changes uncommitted. Don't start the next slice without approval.
