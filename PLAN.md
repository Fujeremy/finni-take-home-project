# Finni Health — Patient Management

## 1. Goal and scope

Build a desktop web application that lets providers create patient records and view all saved information. Records must persist after refreshing the application.

Each patient record includes:

- First, middle, and last name
- Date of birth
- Status: Inquiry, Onboarding, Active, or Churned
- Address

Deliver a complete, polished creation and viewing workflow.

### Assumptions

- Use fictional patient information only.
- The application represents one provider workspace.
- Different patients may share the same name.
- The demonstration dataset is small enough to load in one request. Search, filtering, sorting, and pagination run in the browser.
- Excluded features and production considerations are documented in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

## 2. User experience

Use one main page with a patient directory and an **Add patient** button.

### Patient directory

Display a desktop table containing each patient’s full name, birth date, status, address, and the date they were added. Show the added date in the viewer’s timezone, without the time, and status as text with a supporting color.

Keep rows on one line, with comma-separated address parts. Truncate long names and addresses and expose the full text on hover or keyboard focus. Avoid page-level horizontal scrolling.

Provide loading, retryable error, and empty states. Distinguish an empty directory from a search with no matching patients.

### Search, filter, sort, and pagination

Show a toolbar above the loaded, nonempty directory with:

- **Name search:** Match all query words across first, middle, and last name, ignoring case, accents, and surrounding spaces.
- **Status filter:** Allow multiple selections and show counts across all patients. No selection includes every status. Provide a clear action.
- **Sort:** Recently added by default, oldest added, last name A–Z, or last name Z–A. Name sorting compares last, first, then middle name, ignoring case and accents; ties retain API order.

Apply search and status filtering together, then sort and paginate the results.

The pager shows a result range, Previous/Next controls, and page sizes of 25, 50, or 100, defaulting to 25. Disable navigation at page boundaries and hide the pager when no results match.

Return to page 1 when search, filter, sort, or page size changes. Preserve directory settings during refetches and patient creation; clamp unavailable pages to the last page. Reloading the application resets all settings.

Keep controls keyboard accessible, preserve focus after clearing filters or changing pages, scroll the table into view on page changes, and announce the updated range.

### Add patient

Open an accessible dialog with fields grouped into name, patient details, and address.

- Use visible labels, identify optional fields, and provide appropriate date and status controls.
- Show field-level validation errors and preserve entered values after failed submission.
- Show a saving state and prevent duplicate submissions.
- On success, close the dialog, refresh the directory, and show confirmation.
- Allow cancellation, confirm before discarding unsaved changes, and manage focus when opening and closing the dialog.

## 3. Architecture and stack

| Area | Tools |
|---|---|
| Frontend | React, Vite, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Forms and validation | React Hook Form, Zod |
| Server state | TanStack Query |
| Backend | Express |
| Persistence | Knex, PostgreSQL |
| Testing | Vitest, React Testing Library, Supertest |

Organize the repository into:

```text
client/   Patient directory, form, UI components, API client
server/   Express routes, database access, migrations
shared/   Browser-safe validation schemas and shared types
```

Define `createPatientSchema` in `shared/src/patients.schema.ts` and infer creation input types from it. Both the form and API use this schema; the server remains the validation enforcement boundary. Keep database connections, Express imports, and server configuration outside shared code.

Use a plain React table. The core single-page workflow does not require a router.

During development, Vite proxies API requests to Express. For production builds, Express serves the built client and API on one port. Docker Compose runs PostgreSQL; the application runs locally.

## 4. Data model and validation

Use one `patients` table:

| Field | Type | Rules |
|---|---|---|
| id | UUID | Generated primary key |
| first_name | varchar(100) | Required |
| middle_name | varchar(100) | Optional |
| last_name | varchar(100) | Required |
| date_of_birth | date | Required |
| status | varchar(20) | Required; supported status; database default `inquiry` |
| address_line_1 | varchar(255) | Required |
| address_line_2 | varchar(255) | Optional |
| city | varchar(100) | Required |
| region | varchar(100) | Required |
| postal_code | varchar(20) | Required |
| country | varchar(2) | Required; two uppercase ASCII letters |
| created_at | timestamptz | Generated creation timestamp |

### Text and status

- Trim text before validation. Required fields must remain nonempty; blank optional fields become `null`.
- Enforce matching length limits in Zod and PostgreSQL. Reject oversized input before writing; never truncate it.
- Keep validation length constants in shared code and fixed matching limits in migrations.
- Preserve postal codes as strings.
- Normalize country codes to uppercase and require two ASCII letters. Label the field **Country code**, with an example such as `CA`. Country membership and regional address validation are outside scope.
- Use lowercase status values in JSON and PostgreSQL, with title-case UI labels. The form defaults to Inquiry; the API requires an explicit supported status.

### Dates

Store birth dates as `YYYY-MM-DD` without timezone conversion. Reject invalid dates, dates before `1900-01-01`, and future dates.

The client and server each determine today using their local date; the timezone assumption is documented in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

Store creation timestamps as `timestamptz`, return UTC ISO strings, and display them in the browser’s timezone.

Enforce required fields and allowed statuses with database constraints. Additional search and sorting indexes are unnecessary for the demonstration dataset.

## 5. API

Use camelCase JSON fields and snake_case database columns.

| Endpoint | Behavior |
|---|---|
| `GET /api/health` | Check API and database connectivity; return `200` with `{ "status": "ok" }` |
| `GET /api/patients` | Return all saved patient fields, ordered by creation time descending, then ID ascending; return an empty collection when none exist |
| `GET /api/patients/:patientId` | Return `200` with the complete saved patient. Reject an ID that is not a UUID before querying the database |
| `POST /api/patients` | Validate with the shared schema, persist the patient, and return `201` with the complete saved record |

Use a consistent JSON error envelope containing an error code and message. Validation errors also include `fieldErrors`, keyed by JSON field name.

| Condition | HTTP status | Error code |
|---|---|---|
| Invalid patient fields | 400 | `VALIDATION_ERROR` |
| Patient ID that is not a UUID | 400 | `INVALID_PATIENT_ID` |
| No patient with that ID | 404 | `PATIENT_NOT_FOUND` |
| Malformed JSON or non-object JSON body | 400 | `INVALID_JSON` |
| Non-JSON request format | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Request body over 100 KB | 413 | `PAYLOAD_TOO_LARGE` |
| Unknown API path | 404 | `NOT_FOUND` |

Unexpected failures, including database failures, return the standard error envelope. Log diagnostic details on the server without exposing them to users.

## 6. Delivery and verification

### Implementation sequence

1. **Foundation:** Set up workspaces, environment configuration, shared validation, PostgreSQL, and migrations. Verify frontend-to-API connectivity through the health endpoint.
2. **Core workflow:** Implement creation and listing, connect the form and directory, and confirm persistence after refresh.
3. **Polish and submission:** Complete interaction states and keyboard behavior, run checks, verify desktop layouts, and validate clean-checkout setup.

Keep the application runnable throughout implementation.

### Automated verification

Cover:

- Creation and listing, including empty results and persistence.
- Validation boundaries, normalization, required status, and birth-date rules.
- API error responses and rejection without saving invalid records.
- Form validation, failed-submission recovery, and successful directory updates.
- Combined search, filtering, sorting, and pagination, including defaults, clearing, page resets, and page clamping.
- Relevant focus behavior and timestamp display across timezones.

Run API tests against a separate test database. Typecheck, lint, tests, and production build must pass.

### Manual verification

Verify complete and minimal patient records, persistence after reload, keyboard operation, long-text readability, supported desktop layouts including 1440px, and useful feedback when the API is unavailable.

Follow the README from a clean checkout. It must explain prerequisites, environment setup, startup and migration commands, testing and builds, assumptions, limitations, and fictional-data-only usage.

### Optional enhancement

After the core workflow is verified and the added scope is explicitly approved, consider a read-only patient detail page at `/patients/:patientId`, linked from a directory at `/patients`.

Add a single-patient endpoint with invalid-ID and not-found responses. Support direct links, refreshes, loading and retryable error states, and navigation back to the directory. Verify both routes and update the limitations document.

### Definition of done

A reviewer can start the application, create a patient, view every saved field, and refresh without losing information. The interface is readable and keyboard accessible, failures are understandable, and the implementation is small enough to explain confidently.