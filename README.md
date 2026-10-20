# Finni Health — Patient Management

A web application for providers to enter patient information and view saved
patient records in a desktop directory.

> **Fictional data only.** This is a take-home submission. Do not enter real
> patient information; it does not establish readiness for storing real health data.

## What it does

- **Patient directory:** every saved patient in one table, newest first, showing
  name, date of birth, status, full address, and when they were added.
- **Add patient:** an accessible dialog that validates each field as you leave it,
  shows errors beside the affected fields, keeps what you entered if saving fails,
  and asks before discarding unsaved entries.
- **Persistence:** records are stored in PostgreSQL and remain after a refresh.
- **One set of rules:** the same validation code runs in the browser for instant
  feedback and in the API, which enforces it.

## Prerequisites

- Node.js 24 or later (includes npm)
- Docker with Docker Compose

The app uses local ports 5432 (PostgreSQL), 3001 (API), and 5173 (client).

## Setup

Run these from the repository root:

```bash
npm install
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
```

`docker compose up` starts PostgreSQL with a development database and a separate
test database. `npm run db:migrate` creates the `patients` table in the
development database.

## Run in development

Start the API and the client in two terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open http://localhost:5173. With an empty database you'll see "No patients yet";
use **Add patient** in the page header to add the first one.

When editing the shared validation code in `shared/`, also run this in a third
terminal so the API and client pick up each change:

```bash
npm run dev:shared
```

## Test, check, and build

The database must be running. Tests use the separate test database, migrate it
automatically, and never touch development data.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test` runs three suites:

- **shared:** every validation rule (required fields, length limits, country
  codes, statuses, and birth-date rules on a frozen clock).
- **server:** the API against the test database (listing, creating, rejecting
  invalid input without saving, and safe error responses).
- **client:** the directory and the add patient dialog through the UI, as a user
  would use them (loading, empty, and error states; validation; saving; discarding).

## Database commands

`npm run db:migrate` applies pending migrations. Other Knex CLI commands run
through the server workspace, for example:

```bash
npm run knex -w server -- migrate:status
```

To clear all patients from the development database:

```bash
docker compose exec db psql -U finni -d finni_dev -c "delete from patients;"
```

## Project layout

```
client/   React + Vite app: patient directory and add patient dialog
          (src/features/patients), API calls (src/lib/api.ts)
server/   Express API: routes and database access (src/patients),
          Knex setup and migrations (src/db)
shared/   Validation schema and patient types used by both client and server
```

The API has three endpoints, all under `/api`:

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Confirms the API is running and can reach the database |
| `GET /api/patients` | Lists all patients, newest first |
| `POST /api/patients` | Validates and saves a patient; returns field errors for invalid input |

## Product assumptions

- All patient information is fictional.
- The app represents one provider workspace, with no sign-in or separate accounts.
- Different patients may share the same name.
- The dataset is small enough to show in one list.
- The supported view is desktop; mobile and tablet layouts are not.

## Scope and known limitations

Design choices:

- **Birth dates** must be real dates from January 1, 1900 through today. "Today" is
  each side's own local date, which assumes the browser and server share a timezone.
- **Addresses** are free text with a two-letter country code. There are no postal
  code formats or address lookups.
- **Validation timing:** each field is checked when you leave it, then as you
  correct it, and all fields are checked on Save. Long text is flagged rather than
  silently cut off.
- **Health endpoint** proves the API and database are connected, separately from
  patient data.

Not included: editing, archiving, or deleting patients; search, filtering, sorting,
or pagination; sign-in, audit history, or duplicate detection; mobile layouts; dark
mode; and production deployment (the build compiles, but the app runs locally).
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) lists each one with what a future
version would add.

## Possible improvements

- **Canada and US addresses:** country and province or state dropdowns, with
  postal and ZIP code format checks.
- **Patient detail page** with a direct link for each patient (PLAN.md §10).
- **Search, status filters, and pagination** for larger directories.
- **Editing patients,** with change tracking and audit history.
- **Timezone-aware birth dates:** send the browser's timezone so the server checks
  "today" in the provider's timezone.
- **Continuous integration** running tests, typecheck, lint, and build on every PR.
- **Automated accessibility checks** alongside manual screen-reader testing.
- **Dark mode** that follows the system setting.
- **Production deployment** with backups and monitoring.

## Project documentation

- [PLAN.md](PLAN.md): feature scope, stack, architecture, and acceptance checks.
- [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): excluded features and limitations.
- [PROGRESS.md](PROGRESS.md): milestone status, verification, and decisions.
- [CLAUDE.md](CLAUDE.md): agent workflow and code/test readability standards.
