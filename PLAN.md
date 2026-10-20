# Finni Health — Patient Management

## 1. Goal

Build a web application that lets providers enter patient information
and view saved patient records.

Deliver a complete, polished core workflow before considering extras.

## 2. Requirements

Providers can enter and save:

- First, middle, and last name
- Date of birth
- Status: Inquiry, Onboarding, Active, or Churned
- Address

Providers can view all saved information. Records remain available
after refreshing the application.

The architecture includes:

- A frontend that communicates with a backend through APIs
- A backend that validates requests and accesses the database
- A database that persists patient records

## 3. Assumptions

Features outside the initial submission scope are listed in
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

- Use fictional patient information only.
- The application represents one provider workspace.
- Different patients may have the same name.
- The demonstration dataset is small enough to load in one request and
  page through in the browser. Searching, filtering, sorting, and paging
  in the browser is a take-home simplification: with a large patient
  list they should move to the server, as query parameters on
  `GET /api/patients` backed by database indexes, so the browser loads
  one page at a time.
- Field and date rules are defined in §6 (Data model).

## 4. Core user experience

Use one main page containing a patient directory and an “Add patient”
button.

### View patients

- Show each patient’s name, date of birth, status, and full address.
  Show the address on one line, with its parts separated by commas.
- Keep each patient on one line. Shorten long names and addresses with
  “…” and show the full text in a tooltip on hover or keyboard focus.
- Show when each patient was added, in the viewer's timezone.
- Use a simple table for the supported desktop view.
- Display status as a text label with a supporting color.
- Show patients one page at a time (see “Page through patients”), ordered as defined in §7 (API) by default.
- Include a helpful empty state that points to the “Add patient” button in the page header.
- Show loading and error states, including a retry action.
- Keep information readable without page-level horizontal scrolling.

### Find patients

Search, filter, and sort the loaded list in the browser; the API is unchanged.

- Show a toolbar between the page header and the table with a name
  search box, a status filter, and a sort menu. Hide it while patients load, when
  loading fails, and when no patients are saved.
- Give the search box an accessible label. Match case- and
  accent-insensitively against first, middle, and last name, ignoring
  surrounding spaces; every typed word must appear in the name.
- Use a dropdown menu with checkable statuses for the status filter.
  Each option shows its count across all patients. Selecting no status
  shows every status. The trigger shows “All statuses”, one or two
  status labels, or “3 statuses”; its accessible name starts with
  “Status:”.
- While any status is checked, show an X at the right edge of the
  status filter, labeled “Clear status filter”. It unchecks every
  status at once and moves focus to the status filter. The search box
  clears with its own × or Escape.
- Apply search and status filter together.
- Use a dropdown menu with one choice for sorting, shown as
  “Sort: <choice>”: Recently added (default, the §7 order), Oldest
  added (the reverse), Last name A–Z, and Last name Z–A. Name sorts
  compare last, then first, then middle name, ignoring case and
  accents; equal names keep the §7 order. Sorting applies to the
  filtered list and is not a filter.
- When nothing matches, replace the table with a message naming the
  search and statuses, and a hint to change them. Keep it distinct
  from the “No patients yet” state.
- Keep filters and sort after a refresh failure and after adding a
  patient; reset them when the page is reloaded.

### Page through patients

Page through the searched, filtered, and sorted list in the browser;
the API still returns every patient in one request (see §3).

- Show a pager below the table: a “Rows per page” dropdown menu with
  25 (default), 50, and 100 on the left, and the shown range, such as
  “1–25 of 48”, with Previous and Next buttons on the right. The range
  counts the patients that match the current search and filter.
- Keep the pager when everything fits on one page, with both buttons
  disabled. Hide it with the table when nothing matches.
- Return to page 1 when the search, statuses, sort, or page size change.
- Keep the current page after a refresh or after adding a patient; when
  that page no longer exists, show the last page. Reset to page 1 and
  25 rows when the page is reloaded.
- When the page changes, scroll the top of the table into view and keep
  focus on the button that was pressed. Announce the new range in a
  polite live region.

### Add a patient

Use a standard accessible dialog containing one form.

- Group related fields into name, patient details, and address.
- Provide visible labels and identify optional fields.
- Use a date input for date of birth and a select for status.
- Validate input and show errors beside the affected fields.
- Preserve entered values when submission fails.
- Show a saving state and prevent duplicate submissions.
- On success, close the dialog, refresh the directory, and show
  a confirmation message.
- Allow cancellation without saving.
- Ask before discarding entered values when the dialog is closed.
- Manage keyboard focus when opening and closing the dialog.

## 5. Stack and structure

Use:

- React, Vite, and TypeScript for the frontend
- Tailwind CSS and shadcn/ui for styling and accessible components
- React Hook Form and Zod for form state and validation
- TanStack Query for fetching patients and refreshing after creation
- Express for the API
- Knex and PostgreSQL for database access and persistence
- Vitest, React Testing Library, and Supertest for testing

Use one repository with a client, server, and shared validation code:

    client/src/
      components/ui/
      features/patients/
      lib/api.ts
      App.tsx
    server/src/
      db/
        migrations/
      patients/
        patients.routes.ts
        patients.data.ts
      app.ts
      server.ts
    shared/src/
      patients.schema.ts
    compose.yaml
    .env.example
    README.md
    package.json

Define `createPatientSchema` in `shared/src/patients.schema.ts` and
infer the patient creation input types from it. The client form uses
this schema through the Zod resolver, and the server validates POST
requests with the same schema. Sharing these rules avoids duplicate
validation definitions and keeps both sides consistent; the backend
remains the enforcement boundary.

Keep shared code browser-safe: no database connections, Express imports,
or server configuration. Keep other application types and helpers close
to where they are used, sharing them when there is a concrete need.

Use a plain table and direct React rendering.
No client-side router is needed for the core single-page workflow.
Add React Router if implementing the optional patient detail route.

The Vite development server proxies API requests to Express.
For a production build, Express also serves the built client, so the
page and API share one port.
Docker Compose runs PostgreSQL; the application runs locally.

## 6. Data model

Use one `patients` table:

| Field | Type | Rules |
|---|---|---|
| id | UUID | Primary key, generated |
| first_name | varchar(100) | Required |
| middle_name | varchar(100) | Optional |
| last_name | varchar(100) | Required |
| date_of_birth | Date | Required |
| status | varchar(20) | Required; inquiry, onboarding, active, or churned; database default inquiry |
| address_line_1 | varchar(255) | Required |
| address_line_2 | varchar(255) | Optional |
| city | varchar(100) | Required |
| region | varchar(100) | Required |
| postal_code | varchar(20) | Required |
| country | varchar(2) | Required; exactly two uppercase ASCII letters |
| created_at | timestamptz | Generated on creation; represents an absolute instant |

### Field validation and normalization

- Keep postal codes as strings to preserve spaces and leading zeros.
- Trim text before validation and store blank optional fields as null.
  Required text must remain nonempty after trimming.
- Enforce the table's length limits in both the shared Zod schema and
  PostgreSQL `varchar(n)` columns. Oversized API input returns 400 with
  field errors before a database write; never silently truncate values.
- Define field-length constants in `shared/` for validation. Migrations
  use fixed matching limits rather than importing application code.
- Trim and uppercase the country code, then require exactly two ASCII
  letters (`A`–`Z`). This is format validation only; ISO membership and
  country-specific postal code/region validation are outside scope.
  Label the form field “Country code” with an example such as `CA`.
- Use lowercase status values in JSON and PostgreSQL, and title-case
  labels in the UI. `createPatientSchema` requires an explicit supported
  status; missing, null, or invalid status returns 400. The form defaults
  to `inquiry`. The database default is a safety net, not an API fallback.

### Dates and timezones

- Store birth dates as `YYYY-MM-DD` dates without timezone conversion.
  Reject invalid dates, dates before 1900-01-01, and dates after today.
- The client and server each determine today from their own local date.
  See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for the timezone assumption.
- Store creation timestamps as `timestamptz`, return UTC ISO strings,
  and display them in the viewer's browser timezone.

Use database constraints for required fields and allowed statuses.
No additional search or sorting indexes are necessary initially.

## 7. API

### GET /api/health

- Confirm the API is running and can reach the database with a trivial query.
- Return 200 with `{ "status": "ok" }`.
- Database failures use the standard JSON error response.

### POST /api/patients

- Validate the request on the server using the shared `createPatientSchema`.
- Insert the patient into PostgreSQL.
- Return 201 with the complete saved patient.
- Return 400 with field-level details for invalid input.
- Invalid input returns 400 with `{ "error": { "code": "VALIDATION_ERROR", "message", "fieldErrors": { "<field>": ["<message>"] } } }`, keyed by the JSON field names.
- A body that is not valid JSON, or is JSON but not an object, returns 400 with code `INVALID_JSON`.
- A body sent in a format other than JSON returns 415 with code `UNSUPPORTED_MEDIA_TYPE`.

### GET /api/patients

- Return all patients as a collection.
- Include every field needed by the directory.
- Order by creation time descending, then ID ascending.
- Return an empty collection when no records exist.

Use camelCase in JSON and snake_case in PostgreSQL.

A request body over 100 KB returns 413 with code `PAYLOAD_TOO_LARGE`.
An unknown path under `/api` returns 404 with code `NOT_FOUND`.

Handle unexpected failures with a consistent JSON error response.
Log diagnostic details on the server without returning them to users.

## 8. Implementation sequence

### A. Foundation

- Set up the client, server, and database.
- Wire shared validation imports for the client and server.
- Add environment configuration and a patient-table migration.
- Confirm the frontend can call the API through `GET /api/health`.

### B. Complete the core workflow

- Implement patient creation and listing.
- Apply the shared validation architecture defined in §5.
- Build the form and directory.
- Connect both to the API.
- Confirm a created patient appears and remains after refresh.

### C. Polish and verify

- Complete validation, loading, empty, error, and success states.
- Check keyboard operation and desktop layouts.
- Run automated checks.
- Verify clean setup and finish the README.

Keep the application runnable throughout implementation.

## 9. Verification

### Automated tests

Cover meaningful behavior:

- Valid creation saves all patient information.
- Invalid creation returns useful validation errors.
- Text at the specified length limits is accepted; over-limit values
  are rejected without saving a record.
- Country codes are normalized to uppercase and invalid formats rejected.
- Missing or invalid status is rejected; the form starts with Inquiry.
- Verify birth-date validation, including dates before 1900 and after
  today, and timestamp display across timezones.
- Listing returns persisted patients.
- An empty database returns an empty collection.
- Form validation identifies invalid fields.
- Failed submission preserves entered information.
- Successful submission updates the directory.
- Name search matches any name part regardless of case and accents,
  and requires every typed word to match.
- The status filter shows only the checked statuses, with counts and a
  trigger label naming the selection.
- Search and status filter combine; clearing the search box, or the
  status filter with its X, shows those patients again, and the X moves
  focus to the status filter.
- No matches shows a distinct message; the toolbar is hidden while
  loading, on load failure, and when no patients are saved.
- Sort starts at Recently added; Last name sorts order by last, first,
  then middle name, ignoring case and accents, keeping equal names in
  API order; Oldest added reverses the API order.
- Sorting applies to the filtered list.
- The pager shows 25 patients at first; Previous and Next move between
  pages and are disabled at the ends; choosing another page size
  changes how many rows show.
- Changing the search or sort returns to page 1; a refresh that removes
  the current page shows the last page; the pager is hidden when nothing
  matches.

Run API tests against a separate test database.

Typecheck, lint, tests, and production build must pass.

### Manual checks

- Create a patient with every field populated.
- Create a patient without optional fields.
- Refresh and confirm all saved values remain.
- Check that long names and addresses stay on one line and show their
  full text on hover and keyboard focus.
- Complete the form using a keyboard.
- Verify supported desktop layouts, including 1440px.
- Confirm useful feedback when the API is unavailable.
- Follow the README from a clean checkout.

## 10. Optional enhancement: patient details

Implement this only after the core workflow is complete and verified
and the developer explicitly approves the added scope. Update
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) when implemented.

### Patient detail route

- Use `/patients` for the directory and `/patients/:patientId` for a
  dedicated, read-only patient detail page.
- Make each patient’s name an accessible link in the table. Selecting
  it opens that patient’s detail route.
- Add `GET /api/patients/:patientId` to retrieve one patient by UUID.
  Return 400 for an invalid UUID and 404 when the patient does not exist.
- Show every saved patient field, grouped into name, patient details,
  and address, with a clear page heading.
- Support direct links and page refreshes by fetching the patient using
  the route parameter. Configure the frontend host to serve the app for
  these routes without intercepting API requests.
- Include loading, retryable error, and patient-not-found states.
- Provide a “Back to patients” link to `/patients`.
- Verify keyboard navigation and desktop layouts for both routes.

### Additional verification when implemented

- Verify opening a patient, refreshing a detail URL, handling missing
  patients, and returning to the directory.

## 11. Submission

The README explains:

- Prerequisites and exact startup commands
- Environment setup and database migration
- How to run tests and build the application
- Product assumptions and deliberate scope decisions
- Known limitations, a link to [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md),
  and a short list of possible improvements
- That the application is for fictional data only

## 12. Definition of done

A reviewer can start the application, enter a patient, save the record,
view every saved field, and refresh without losing information.

The interface is readable and accessible, errors are understandable,
and the implementation is small enough to explain confidently.
