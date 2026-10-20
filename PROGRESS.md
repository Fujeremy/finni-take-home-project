# Progress

## Milestones

| Milestone | State |
|---|---|
| A. Foundation | **Complete** — approved after Fujeremy/finni-take-home-project#1–#3 merged |
| B. Core workflow | **Complete** — approved after Fujeremy/finni-take-home-project#4–#7 merged |
| C. Polish and verify | **Complete** — approved after Fujeremy/finni-take-home-project#8–#9 merged |

All planned milestones are complete; the take-home is ready to submit.

## Continuous improvements

Developer-requested polish after the milestones, each proposed and approved before work starts.

| Work | Branch | State |
|---|---|---|
| 50-patient mock dataset with `db:seed` and `db:reset` | `dev/mock-patients` | **Complete** — merged in Fujeremy/finni-take-home-project#10 |
| Error responses for bad requests, and the directory kept visible when a refresh fails | `fix/request-errors` | **Complete** — merged in Fujeremy/finni-take-home-project#12 |
| `npm start` runs the production build, with Express serving the built client | `polish/production-start` | **Complete** — merged in Fujeremy/finni-take-home-project#13 |
| Darker backdrop behind the add patient dialog | `polish/dialog-backdrop` | **Complete** — merged in Fujeremy/finni-take-home-project#15 |
| One-line patient rows, with the full text of shortened names and addresses on hover or focus | `polish/one-line-rows` | **Complete** — merged in Fujeremy/finni-take-home-project#16 |
| Name search for the directory (PR 1 of 4: search, status filter, sorting, toolbar layout) | `feat/directory-name-search` | **Complete** — merged in Fujeremy/finni-take-home-project#17 |
| Multi-select status filter for the directory (PR 2 of 4), stacked on PR 1 | `feat/directory-status-filter` | Approved and merged into PR 1's branch in Fujeremy/finni-take-home-project#18; reaches `main` through the follow-up PR from `feat/directory-sorting` |
| Browser-side sorting for the directory (PR 3 of 4), stacked on PR 2 | `feat/directory-sorting` | Approved and merged into PR 2's branch in Fujeremy/finni-take-home-project#19; reaches `main` through the follow-up PR from `feat/directory-sorting` |
| Directory header and toolbar matching the developer's reference layout (PR 4 of 4), stacked on PR 3 | `polish/directory-toolbar-layout` | Approved and merged into PR 3's branch in Fujeremy/finni-take-home-project#20; reaches `main` through the follow-up PR from `feat/directory-sorting` |

## Implemented

- **Data and API:** Postgres 17 (Docker Compose) with separate dev and test databases; `patients` table per PLAN.md §6 via the Knex CLI. Express API: `GET /api/health`, `GET /api/patients` (newest first, birth dates as stored `YYYY-MM-DD`, `createdAt` in UTC), and `POST /api/patients` (validated by the shared schema; 400 `VALIDATION_ERROR` with `fieldErrors`, 400 `INVALID_JSON` for unreadable or non-object bodies, 415 `UNSUPPORTED_MEDIA_TYPE` for non-JSON bodies). Bodies over 100 KB return 413 `PAYLOAD_TOO_LARGE`, unknown `/api` paths return a JSON 404 `NOT_FOUND`, and unexpected failures return a generic JSON 500.
- **Shared:** `createPatientSchema` with every field rule from PLAN.md §6, and the `Patient` response type built from it.
- **Client:** patient directory (loading, error with Retry, a Retry banner above the last loaded list when a later refresh fails, empty state pointing to the header button, and a table with name, birth date, status badge, full address on one line, and added time; each row stays on one line, and a shortened name or address shows its full text in a tooltip on hover or Tab focus). Add patient dialog: grouped fields, validation when a field is left and on Save, reserved space for errors, server field errors beside fields, values kept on failure, saving state, discard confirmation, toast naming the patient, and focus returned to Add patient.
- **Name search:** a search box above the table filters the loaded list by first, middle, and last name, ignoring case, Latin accents, and extra spaces; every typed word must match. While searching, "Showing X of Y patients" is announced and a Clear filters button empties the search and refocuses the box. No matches replaces the table with a "No matching patients" message and its own Clear filters button. The search box only appears once patients are saved, and the search stays applied through refreshes, failed refreshes, and newly added patients. Filtering runs in the browser; the API is unchanged.
- **Status filter:** a Status dropdown beside the search box has a checkbox per status with its count across all patients. Checking several shows only those statuses, and checking none shows every status. The button reads "All statuses", one or two status names, or "3 statuses"; screen readers hear it with a "Status:" prefix. Search and statuses combine, Clear filters resets both, and the no-match message names the search and statuses ("No patient names match “chen” with status Active or Churned.").
- **Sorting:** a Sort menu offers Recently added (default, the API order), Oldest added, Last name A–Z, and Last name Z–A. Name sorts compare last, first, then middle name, ignoring case and accents, and equal names keep the API order. Sorting applies to the filtered list, doesn't show the result count, and is kept by Clear filters. It runs in the browser; the API still returns its fixed order.
- **Toolbar layout:** follows the developer's reference. The title is larger and Add patient is 40px tall. The result line and Clear filters sit on the left; the search box (320px), Status, and Sort (224px each, styled like select boxes) sit on the right, all 40px tall. The neutral theme is unchanged.
- **Mock data:** 50 fictional patients (`server/src/db/mockPatients.ts`) covering length limits, accents and non-Latin scripts, optional fields present and absent, birth-date bounds, and Canadian and US postal formats. `npm run db:seed` replaces every patient in the development database with them; `npm run db:reset` empties it.
- **Production start:** `npm start` builds every workspace, then runs the compiled API, which also serves `client/dist` when it exists. The page and API share http://localhost:3001; development still uses Vite on 5173.
- **Docs:** final README per PLAN.md §11, verified from a fresh clone (C2), with seeding, resetting, and `npm start` documented.

## Verification

- **Foundation and Milestone B:** each commit checked in its own state with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`; key tests confirmed to fail when their code is broken; browser checks for every user-facing change. Details are in PRs #1–#7.
- **Current totals (2026-10-20, `feat/directory-sorting`):** 45 shared, 33 server, and 59 client tests pass; typecheck, lint, and build pass. Server tests ran against a local PostgreSQL 16 test database.
- **Request errors:** each new server test was seen failing before its fix. With curl against the running API: `GET /api/nope` → 404 JSON, `[]` → 400 `INVALID_JSON`, `text/plain` → 415, a 200 KB body → 413, and a POST with no body still lists each missing field.
- **One-line rows:** the new tooltip tests failed before the change; the "fits" test was confirmed to fail when the truncation check is removed. In the browser with the 50 mock patients, at 1440px and 1280px: every row was 38px tall, nothing scrolled sideways, and 12 shortened names and addresses were the only Tab stops in the table. Hovering a shortened name and tabbing to a shortened address each showed the full text.
- **Name search:** 11 new tests (5 for the matching function, 6 for the directory). Matching any word instead of every word, and dropping the refocus after Clear filters, each made tests fail. The two tooltip Tab tests now count the search box as the first Tab stop. In the browser before rebasing onto one-line rows: "huong" found Hương Thị Đặng, "мария" and "明" each found one patient, Clear filters restored all 50 and focused the box, Escape cleared the search, and a 108-character search wrapped inside the no-match message with no sideways scroll. After rebasing, at 1440px: "bart" showed the one matching patient on a shortened one-line row, with no sideways scroll.
- **Status filter:** 6 new directory tests; the two tooltip Tab tests now count the Status button too. Ignoring statuses when filtering, leaving statuses checked after Clear filters, and closing the menu after each check each made tests fail. In the browser before rebasing onto one-line rows: counts read 12, 12, 15, and 11; the menu worked with Tab, Enter, arrow keys, and Space; an Escape keydown closed it and returned focus to the button (the browser pane's own Escape key didn't reach the menu, so a real keyboard Escape was checked only in jsdom tests); "chen" with Onboarding showed the no-match message, and Clear filters restored all 50. After rebasing, at 1440px: Inquiry and Onboarding showed 24 of 50 with only those statuses, every row stayed 38px tall, and nothing scrolled sideways.
- **Sorting:** 9 new tests (4 for the sort rule, 5 for the directory), seen failing on this branch before the code was added; the two tooltip Tab tests now count the Sort button too. Reversing A–Z for Z–A, ignoring the middle name, comparing accents, not applying the sort, and resetting it on Clear filters each made tests fail. In the browser before rebasing onto one-line rows: Last name A–Z put Abernathy first, Đặng between Costa and Dupuis, "van der Berg" under V, and non-Latin names last. After rebasing, at 1440px: Last name Z–A put the non-Latin names first and Abernathy last, showed no result count, kept every row 38px tall, and nothing scrolled sideways. The main file is now 435 KB (138 KB gzipped).
- **Toolbar layout:** no behavior changed, and all 137 tests (45 shared, 33 server, 59 client) pass unchanged. The finished files were compared with the pre-split snapshot: the search, sorting, and dropdown files and `App.tsx` match it exactly, and the only differences in the directory and its tests come from one-line rows (#16). The design detector found nothing. In the browser at 1440px: the title is 30px, Add patient, the search box, Status, and Sort are all 40px tall, Status and Sort are 224px wide, and nothing scrolls sideways. At 1280px with Inquiry and Onboarding checked: the label wasn't cut off, the result line showed 24 of 50, rows stayed 38px tall, and nothing scrolled sideways.
- **Bundle with the status filter:** the main file is 432 KB (137 KB gzipped, up from 125 KB) and the dialog file 164 KB (down from 186 KB), with no size warning. Radix menu code shared with the dialog now loads with the page because the dropdown needs it. Importing any value from `@finni/shared` in the directory pulled zod into the main file and triggered a size warning, so the status order comes from the client's labels instead.
- **Stale directory:** in the browser at 1440px with the 50 mock patients, stopping the API and returning to the tab kept all 50 rows and showed the refresh banner with Retry.
- **Production start:** `npm start` built everything and served the page (200 HTML), the patient list, and the JSON 404 from port 3001. In the browser at that address, adding a patient showed the toast and put the patient first in the table.
- **Mock dataset:** all 50 records pass the shared schema; every address is in Canada or the US; every text field hits its limit; `db:seed` and `db:reset` were run through npm against the test database (50 patients, then 50 again, then 0).
- **C1:** the production build splits into a 332 KB main file (105 KB gzipped) and a 231 KB dialog file, with no size warning. In the browser, the page loads the main file first and the dialog file right after; the first open takes about 44ms. Loading the dialog only on first open was tried and rejected: React's Suspense reveal made that first open take about 334ms.
- **Screen reader:** the developer reviewed the app with a screen reader (2026-10-20) and found nothing to fix.
- **§9 manual checklist (2026-10-20):** run in one pass on a fresh clone of `polish/readme-verification` with a fresh database, following the README. All passed:

  | Check | Result |
  |---|---|
  | Follow the README from a clean checkout | Install, `.env`, Compose (both databases), migrate, `npm test` (45 + 20 + 28, before the mock dataset's tests), typecheck, lint, and build all passed; the app started with an empty directory |
  | Create a patient with every field populated | Saved with status Onboarding; toast named the patient; every field shown, country `ca` saved as `CA` |
  | Create a patient without optional fields | Saved with a leap-day birth date and an accented city; optional fields stored as null; status defaulted to Inquiry |
  | Refresh and confirm all saved values remain | Table text and API data for all three patients (13 fields each) identical before and after reload |
  | Long names and addresses | A patient at every field's maximum length saved; values wrapped inside their cells (before one-line rows); the dialog showed no errors and no sideways scroll |
  | Complete the form using a keyboard | Opened, filled every field (including the date and status select), and saved with the keyboard only; focus returned to Add patient |
  | Desktop layouts, including 1440px | No horizontal scroll at 1440px or 1280px, for the page, the table, or the dialog |
  | Useful feedback when the API is unavailable | Directory showed "Patients couldn't be loaded." with Retry; saving showed "The patient wasn't saved." and kept every value; after restarting the API, clicking Retry loaded the list |

- **Not verified:** behavior on a slow network (all measurements were local).

## Decisions made

- Health endpoint proves connectivity; patient listing belongs to Milestone B.
- Error shape: `{ "error": { "code", "message" } }`, with `fieldErrors` for validation and `INVALID_JSON` for bad bodies (PLAN.md §7).
- Birth dates: 1900-01-01 through today, checked against each side's local date with no timezone header (PLAN.md §6, KNOWN_LIMITATIONS.md).
- Directory shows an "Added" column; dates display like "Mar 14, 1988". Columns have fixed widths (name 24%, birth date 12%, status 11%, address 35%, added 18%) so rows stay on one line; only shortened text gets a tooltip and a Tab stop, so keyboard users don't tab through every row. Tooltips open after a 300ms hover delay so they don't flash as the pointer passes over rows; keyboard focus opens them immediately. The empty state points to the header's Add patient button (PLAN.md §4).
- Dialog: Radix Select for status; region labelled "Province or state"; fields validated when left (`onTouched`) and on Save; no `maxLength`, so over-limit text is flagged rather than cut off; each field reserves one line for its error and length messages read "100 characters max."; opening focuses the dialog itself; invalid fields get a soft red border with the glow only on keyboard focus; asks before discarding entries; closing blocked while saving.
- Generated shadcn edits: Sonner uses the light theme instead of next-themes; Dialog and AlertDialog have no backdrop blur or zoom, because redrawing the blur made typing laggy. Tooltip is added unchanged. The Dialog backdrop is 50% black instead of 10% so the open dialog stands out; the AlertDialog backdrop stays at 10% because it only opens on top of the darkened Dialog. Light theme only (KNOWN_LIMITATIONS.md).
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

Found in a pre-submission review (2026-10-20); each needs a developer decision before any work starts:

- **Dialog code file:** the lazily loaded add patient dialog has no error boundary, so a failed download blanks the whole page.
- **Scope:** whether to add status editing. It is excluded in KNOWN_LIMITATIONS.md. (Search, a status filter, and browser-side sorting were approved on 2026-10-20 and are being delivered as four PRs.)

## Next step

Developer review and merge of the follow-up PR from `feat/directory-sorting` into `main`. PRs #18–#20 were merged into the stacked branches below them instead of `main`, so that PR carries their approved commits, unchanged, into `main`. Afterward, with developer approval, remove the local backup stash and the stacked branches (`feat/directory-search-filter`, `feat/directory-name-search`, `feat/directory-status-filter`, `feat/directory-sorting`, `polish/directory-toolbar-layout`).
