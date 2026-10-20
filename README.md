# Finni Health — Patient Management

A web application for providers to enter patient information and view saved
patient records in a desktop directory.

> **Fictional data only.** This is a take-home submission. Do not enter real
> patient information; it does not establish readiness for storing real health data.

## Prerequisites

- Node.js 24 or later (includes npm)
- Docker with Docker Compose

The app uses local ports 5432 (PostgreSQL), 3001 (API), and 5173 (development client).

## Quick start

From the repository root, these commands take a fresh clone to a running app
with 50 fictional patients:

```bash
npm install
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm start
```

Open http://localhost:3001.

- `docker compose up` starts PostgreSQL with a development database and a separate
  test database.
- `npm run db:migrate` creates the `patients` table in the development database.
- `npm run db:seed` fills the directory with mock patients (see [Mock data](#mock-data)).
  Skip it to start from an empty directory.
- `npm start` builds everything and serves the page and the API from port 3001.

## What it does

- **Patient directory:** a table showing each patient's name, date of birth,
  status, address, and when they were added. Each patient stays on one line; a
  shortened name or address shows its full text on hover or keyboard focus.
- **Find patients:** search by name (ignoring letter case and accents), filter by
  one or more statuses, and sort by date added or last name.
- **Pages:** 25, 50, or 100 patients per page, with Previous and Next.
- **Add patient:** an accessible dialog that validates each field as you leave it,
  shows errors beside the affected fields, keeps what you entered if saving fails,
  and asks before discarding unsaved entries. Text over a field's length limit is
  flagged rather than silently cut off.
- **Persistence:** records are stored in PostgreSQL and remain after a refresh.
- **One set of rules:** the same validation code runs in the browser for instant
  feedback and in the API, which enforces it.

## Try it (production build)

Use this to try the app as a reviewer would. It's the last Quick start step:

```bash
npm start
```

Open http://localhost:3001. Nothing reloads when files change, so rerun
`npm start` after editing code, or use live reload below.

## Develop with live reload

Use this while editing code. Start the API and the client in two terminals:

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
  would use them (loading, empty, and error states; search, status filter,
  sorting, and paging; validation; saving; discarding).

## Database commands

`npm run db:migrate` applies pending migrations. Other Knex CLI commands run
through the server workspace, for example:

```bash
npm run knex -w server -- migrate:status
```

### Mock data

To fill the directory with 50 fictional patients that exercise edge cases (names and
addresses at their length limits, names with accents and non-Latin scripts, optional
fields present and absent, the earliest and latest birth dates, and Canadian and US
postal formats; every address is in Canada or the US):

```bash
npm run db:seed
```

This replaces every patient in the development database, so each run starts from
the same 50. To empty the directory again:

```bash
npm run db:reset
```

Both commands only touch the development database; tests use their own. The records
live in `server/src/db/mockPatients.ts`, and each one must pass the app's validation
before it is saved.

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

`GET /api/patients` returns every patient in one response. The browser does the
searching, filtering, sorting, and paging.

## Product assumptions

- All patient information is fictional.
- The app represents one provider workspace, with no sign-in or separate accounts.
- Different patients may share the same name.
- The dataset is small enough to load in one request; search, filtering, sorting,
  and paging happen in the browser.
- The supported view is desktop; mobile and tablet layouts are not.

## Scope and known limitations

[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) lists every excluded feature and what
a future version would add. The most important:

- **Browser-only search and paging:** fine for the demonstration data, but a large
  patient list would need search, filtering, sorting, and paging on the server.
- **No editing, archiving, or deleting** of saved patients.
- **No sign-in or audit history:** one shared workspace with no access controls.
- **Free-text addresses:** a two-letter country code, with no postal code formats
  or address lookups.
- **Birth dates** run from January 1, 1900 through today, where "today" is each
  side's own local date. This assumes the browser and server share a timezone.
- **Desktop only, light theme only,** and no production deployment (`npm start`
  runs the production build locally).

## Possible improvements

Beyond the limitations above:

- **Patient detail page** with a direct link for each patient (the optional
  enhancement in PLAN.md §6).
- **Continuous integration** running tests, typecheck, lint, and build on every PR.
- **Automated accessibility checks** alongside manual screen-reader testing.

## Project documentation

- [PLAN.md](PLAN.md): feature scope, stack, architecture, and acceptance checks.
- [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): excluded features and limitations.
- [PROGRESS.md](PROGRESS.md): milestone status, verification, and decisions.
- [CLAUDE.md](CLAUDE.md): agent workflow and code/test readability standards.
