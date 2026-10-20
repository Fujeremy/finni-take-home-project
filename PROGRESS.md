# Progress

## Milestones

| Milestone | State |
|---|---|
| A. Foundation | **Complete** — approved by the developer after PRs Fujeremy/finni-take-home-project#1, #2, and #3 merged |
| B. Core workflow | Implemented — awaiting B4 review and milestone approval |
| C. Polish and verify | Not started |

## Current milestone: B. Core workflow

| PR | Branch | Scope | State |
|---|---|---|---|
| B1 | `core/shared-validation` | `createPatientSchema` in shared, birth-date rules, shared watch build | Merged (Fujeremy/finni-take-home-project#4) |
| B2 | `core/patients-api` | `GET` and `POST /api/patients` | Merged (Fujeremy/finni-take-home-project#5) |
| B3 | `core/directory` | Patient directory table with loading, empty, and error states | Merged (Fujeremy/finni-take-home-project#6) |
| B4 | `core/add-patient` | Add patient dialog with validation, saving, and discard confirmation | Draft PR open (Fujeremy/finni-take-home-project#7); 7 commits on GitHub plus 5 local, awaiting review |

## Implemented (Milestone B so far)

- `createPatientSchema` in `@finni/shared`: trimmed text, required fields, blank optional fields as null, length limits, required status, uppercase two-letter country codes, and birth dates from 1900-01-01 through the local date today. `CreatePatientInput` and `CreatePatientData` types are inferred from it.
- `npm run dev:shared` rebuilds the shared package on change.
- `GET /api/patients`: all patients newest first (ties by id), camelCase fields, birth dates as stored `YYYY-MM-DD`, `createdAt` as UTC ISO.
- `POST /api/patients`: validates with `createPatientSchema`; 201 with the saved patient, 400 `VALIDATION_ERROR` with `fieldErrors`, 400 `INVALID_JSON`.
- `Patient` response type defined once in shared from the schema; the insert is typed as a full row.
- Client tests: Vitest with jsdom and Testing Library; tests typechecked by `client/tsconfig.test.json`.
- Patient directory replaces the connection check: loading, error with Retry, empty state, and a table with name, birth date, status badge, full address, and added time.
- Add patient dialog, opened from the header's Add patient button: fields grouped into name, patient details, and address; validated with the shared schema when a field is left, then live as it is corrected, and all at once on Save; errors under each field; server field errors placed beside fields; other failures shown above the buttons; values kept on failure; "Saving…" blocks a second save and closing; on success the directory reloads, a toast names the patient, and focus returns to the Add patient button. Closing with entries asks "Discard this patient?".

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

B3 (2026-10-20, each commit in its own state):
- `npm test`: 45 shared, 20 server, and 8 client tests pass. Switching the display test to Tokyo, or formatting birth dates in local time, makes the timezone tests fail.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Browser with 5 fictional patients (all statuses, optional fields set and blank, maximum-length values): every field shown; long values wrap; no horizontal scrolling at 1280px or 1440px. Empty state shown with an empty database. With the API stopped, the error and Retry appear. Test patients were then deleted.

Not yet verified:
- A manual Retry click: TanStack Query refetched automatically when the browser pane regained focus, before the click landed. The automated test covers Retry.
- The client reloading on shared changes: verified in B4.

B4 (2026-10-20, each commit in its own state):
- `npm test`: 45 shared, 20 server, and 28 client tests pass. Mutations confirmed: allowing close while saving, skipping the directory reload, and skipping the discard prompt each fail tests.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed. The build warns that the client bundle is 562 KB (175 KB gzipped), over Vite's 500 KB guideline.
- Browser, keyboard only: opened the dialog, submitted empty (every required field flagged, focus on First name), filled every field including the date and the Radix status select, saved; dialog closed, toast "Avery Jo Chen was added.", country saved as CA, focus returned to Add patient. The patient remained after refresh.
- Browser: Escape with entries asked to discard; Keep editing kept values; Discard closed without saving. With the API stopped, saving showed "The patient wasn't saved." and kept every value; after restarting the API, saving again succeeded.
- With `dev:shared` and `dev:client` running, a changed shared message appeared in the form without a restart.
- Test patients were deleted afterward.
- Validation on leaving a field: switching back to checking only on Save makes the two leave-the-field tests fail.
- Reserved error space: in the browser, all eight required errors plus a length error appearing moved no field and left the form height unchanged (760px). Errors sit 4px under their input and 8px above the next label.
- Opening focus: removing the dialog-focus override makes the three focus tests fail, including the one where starting in another field must not flag First name.

Not yet verified: a real screen reader (labels, descriptions, and roles were checked in tests and the browser only).

## Decisions made

- Health endpoint proves connectivity; patient listing is part of Milestone B.
- Error shape: `{ "error": { "code", "message" } }`; validation errors add `fieldErrors`, and invalid JSON returns `INVALID_JSON` (PLAN.md §7).
- Birth dates: 1900-01-01 through today, checked against each side's local date; no timezone header (PLAN.md §6, KNOWN_LIMITATIONS.md).
- Directory shows an "Added" column; dates display like "Mar 14, 1988".
- Status uses shadcn's Radix Select; closing the dialog with entered values asks first; closing is blocked while saving.
- Form layout groups short fields side by side; region is labelled "Province or state"; the toast names the patient.
- Inputs have no maxLength: over-limit text is kept and flagged rather than silently cut off.
- Fields are validated when the provider leaves them (`onTouched`), then live as they are corrected; Save checks every field.
- Each field reserves one line for its error so errors don't shift the form; length messages read "100 characters max." so every error fits on one line.
- Opening the dialog focuses the dialog itself, not First name; the first Tab reaches First name.
- `@hookform/resolvers` is pinned to 5.2 because 6.x lists optional peers npm cannot resolve together.
- Light theme only (KNOWN_LIMITATIONS.md); the Sonner component is edited to drop next-themes.
- The empty state points to the header's Add patient button instead of repeating it (PLAN.md §4 updated).
- Dialog and AlertDialog overlays have no backdrop blur and no zoom animation (quick fade only): redrawing the full-page blur made typing in the dialog feel laggy.
- TypeScript is pinned to 6.0 because typescript-eslint does not support 7.x yet.

## Deferred

- **Canada and US addresses** (developer decision, 2026-10-20; implement only when asked, likely as its own PR):
  - Country becomes a required dropdown (Canada, United States) with no default; saving without one shows "Choose a country."
  - Province or state becomes a dropdown that depends on the country (13 provinces and territories, or 50 states plus DC).
  - Country moves to the top of the Address group; Province or state and Postal code stay visible but disabled with a "Choose a country first" hint until a country is chosen. Changing the country clears the region and rechecks the postal code.
  - Postal code format: Canada `A1A 1A1` (saved uppercase with one space); US `12345` or `12345-6789`. The label switches between Postal code and ZIP code.
  - Needs PLAN.md §6 and KNOWN_LIMITATIONS.md updates and a new migration narrowing the country check to CA and US.

## Open questions

- `npm audit` reports 7 high-severity findings from one `braces` advisory reached through the `shadcn` CLI package. Kept as is by developer decision; not in the browser bundle.

## Next step

Developer review of B4, then approval to push and open it, and approval of Milestone B. After that, the Milestone C proposal (polish and verify), including the bundle size warning.
