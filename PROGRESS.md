# Progress

## Milestones

| Milestone | State |
|---|---|
| A. Foundation | **Complete** — approved after Fujeremy/finni-take-home-project#1–#3 merged |
| B. Core workflow | **Complete** — approved after Fujeremy/finni-take-home-project#4–#7 merged |
| C. Polish and verify | In progress — proposal approved: 2 PRs |

## Current milestone: C. Polish and verify

| PR | Branch | Scope | State |
|---|---|---|---|
| C1 | `polish/bundle-size` | Split the add patient dialog out of the page's first download | Committed locally (2 commits), not pushed, awaiting review |
| C2 | `polish/readme-verification` | Final README (§11) and the §9 manual checklist on a fresh clone | Not started |

Screen-reader review: the developer will run through the app and report issues in chat; fixes land before C2's final verification.

## Implemented

- **Data and API:** Postgres 17 (Docker Compose) with separate dev and test databases; `patients` table per PLAN.md §6 via the Knex CLI. Express API: `GET /api/health`, `GET /api/patients` (newest first, birth dates as stored `YYYY-MM-DD`, `createdAt` in UTC), and `POST /api/patients` (validated by the shared schema; 400 `VALIDATION_ERROR` with `fieldErrors`, 400 `INVALID_JSON`). Unexpected failures return a generic JSON 500.
- **Shared:** `createPatientSchema` with every field rule from PLAN.md §6, and the `Patient` response type built from it.
- **Client:** patient directory (loading, error with Retry, empty state pointing to the header button, and a table with name, birth date, status badge, full address, and added time). Add patient dialog: grouped fields, validation when a field is left and on Save, reserved space for errors, server field errors beside fields, values kept on failure, saving state, discard confirmation, toast naming the patient, and focus returned to Add patient.
- **Docs:** README setup steps verified from a fresh clone (Foundation).

## Verification

- **Foundation and Milestone B:** each commit checked in its own state with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`; key tests confirmed to fail when their code is broken; browser checks for every user-facing change. Details are in PRs #1–#7.
- **Current totals:** 45 shared, 20 server, and 28 client tests pass.
- **C1:** the production build splits into a 332 KB main file (105 KB gzipped) and a 231 KB dialog file, with no size warning. In the browser, the page loads the main file first and the dialog file right after; the first open takes about 44ms. Loading the dialog only on first open was tried and rejected: React's Suspense reveal made that first open take about 334ms.
- **Not yet verified:** a real screen reader (pending the developer's review); the §9 checklist in one pass on a fresh clone (C2).

## Decisions made

- Health endpoint proves connectivity; patient listing belongs to Milestone B.
- Error shape: `{ "error": { "code", "message" } }`, with `fieldErrors` for validation and `INVALID_JSON` for bad bodies (PLAN.md §7).
- Birth dates: 1900-01-01 through today, checked against each side's local date with no timezone header (PLAN.md §6, KNOWN_LIMITATIONS.md).
- Directory shows an "Added" column; dates display like "Mar 14, 1988". The empty state points to the header's Add patient button (PLAN.md §4).
- Dialog: Radix Select for status; region labelled "Province or state"; fields validated when left (`onTouched`) and on Save; no `maxLength`, so over-limit text is flagged rather than cut off; each field reserves one line for its error and length messages read "100 characters max."; opening focuses the dialog itself; invalid fields get a soft red border with the glow only on keyboard focus; asks before discarding entries; closing blocked while saving.
- Generated shadcn edits: Sonner uses the light theme instead of next-themes; Dialog and AlertDialog have no backdrop blur or zoom, because redrawing the blur made typing laggy. Light theme only (KNOWN_LIMITATIONS.md).
- Client bundle: the add patient dialog is a separate file that starts loading right after the page renders, so the page's first download is smaller without slowing the first open.
- Pins: TypeScript 6.0 (typescript-eslint doesn't support 7.x); `@hookform/resolvers` 5.2 (6.x has unresolvable optional peers).
- `npm audit`: 7 high findings from one `braces` advisory in the `shadcn` CLI's tooling. Not reachable at runtime and not in the bundle; no patched `braces` exists. Developer decision: neither fix nor document.

## Deferred

- **Canada and US addresses** (developer decision, 2026-10-20; implement only when asked, likely as its own PR):
  - Country becomes a required dropdown (Canada, United States) with no default; saving without one shows "Choose a country."
  - Province or state becomes a dropdown that depends on the country (13 provinces and territories, or 50 states plus DC).
  - Country moves to the top of the Address group; Province or state and Postal code stay visible but disabled with a "Choose a country first" hint until a country is chosen. Changing the country clears the region and rechecks the postal code.
  - Postal code format: Canada `A1A 1A1` (saved uppercase with one space); US `12345` or `12345-6789`. The label switches between Postal code and ZIP code.
  - Needs PLAN.md §6 and KNOWN_LIMITATIONS.md updates and a new migration narrowing the country check to CA and US.

## Open questions

None.

## Next step

Developer review of C1, then approval to push and open it. Meanwhile, the developer's screen-reader feedback; then C2 (final README and §9 checklist).
