# Progress

## Milestones

| Milestone | State |
|---|---|
| A. Foundation | **Complete** — approved by the developer after PRs Fujeremy/finni-take-home-project#1, #2, and #3 merged |
| B. Core workflow | In progress — proposal approved: 4 PRs |
| C. Polish and verify | Not started |

## Current milestone: B. Core workflow

| PR | Branch | Scope | State |
|---|---|---|---|
| B1 | `core/shared-validation` | `createPatientSchema` in shared, birth-date rules, shared watch build | Merged (Fujeremy/finni-take-home-project#4) |
| B2 | `core/patients-api` | `GET` and `POST /api/patients` | Committed locally (2 commits), not pushed, awaiting review |
| B3 | `core/directory` | Patient directory table with loading, empty, and error states | Not started |
| B4 | `core/add-patient` | Add patient dialog with validation, saving, and discard confirmation | Not started |

## Implemented (Milestone B so far)

- `createPatientSchema` in `@finni/shared`: trimmed text, required fields, blank optional fields as null, length limits, required status, uppercase two-letter country codes, and birth dates from 1900-01-01 through the local date today. `CreatePatientInput` and `CreatePatientData` types are inferred from it.
- `npm run dev:shared` rebuilds the shared package on change.
- `GET /api/patients`: all patients newest first (ties by id), camelCase fields, birth dates as stored `YYYY-MM-DD`, `createdAt` as UTC ISO.
- `POST /api/patients`: validates with `createPatientSchema`; 201 with the saved patient, 400 `VALIDATION_ERROR` with `fieldErrors`, 400 `INVALID_JSON`.

## Implemented (Foundation)

- npm workspaces (`shared`, `server`, `client`) with strict TypeScript and ESLint.
- Postgres 17 in Docker Compose with separate dev and test databases; `patients` migration per PLAN.md §6, run through the Knex CLI.
- Express app with `GET /api/health` and a generic JSON error for unexpected failures.
- Vite React client with Tailwind, shadcn, TanStack Query, and a temporary API connection check.
- README setup verified from a fresh clone.

## Verification

Foundation: 5 server tests, typecheck, lint, build, browser checks through the proxy, and README from a fresh clone (see PRs #1–#3).

B1 (2026-10-20, each commit in its own state):
- `npm test`: 45 shared schema tests and 5 server tests pass. The local-date test fails when "today" is computed in UTC.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm run dev:shared` rebuilt `shared/dist` after a source edit and after reverting it.

B2 (2026-10-20, each commit in its own state):
- `npm test`: 45 shared and 20 server tests pass (3 list, 11 create). The birth-date test fails without the date setting; the invalid-JSON test fails without its handler.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Manual with curl against the dev server: valid create returned 201 trimmed and uppercased; invalid create returned every field error; list returned the saved patient. The test patient was then deleted from the dev database.
- With `dev:shared` and `dev:server` running, editing a shared message changed the API's response without a restart, and reverting it changed it back.

Not yet verified: the client reloading on shared changes (the client imports the schema in B4).

## Decisions made

- Health endpoint proves connectivity; patient listing is part of Milestone B.
- Error shape: `{ "error": { "code", "message" } }`; validation errors add `fieldErrors`, and invalid JSON returns `INVALID_JSON` (PLAN.md §7).
- Birth dates: 1900-01-01 through today, checked against each side's local date; no timezone header (PLAN.md §6, KNOWN_LIMITATIONS.md).
- Directory shows an "Added" column; dates display like "Mar 14, 1988".
- Status uses shadcn's Radix Select; closing the dialog with entered values asks first; closing is blocked while saving.
- TypeScript is pinned to 6.0 because typescript-eslint does not support 7.x yet.

## Open questions

- `npm audit` reports 7 high-severity findings from one `braces` advisory reached through the `shadcn` CLI package. Kept as is by developer decision; not in the browser bundle.

## Next step

Developer review of B2, then approval to push and open it. After that, B3 (`core/directory`): the patient directory table.
