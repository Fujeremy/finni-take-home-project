# Finni Health — Patient Management

A take-home project for providers to create patient records and view saved
information in a desktop directory. The planned application uses a React
frontend, an Express API, and PostgreSQL for persistence.

Uses **fictional patient information only**. This demonstration is not
suitable for real patient information.

## Current status

This repository currently contains project documentation and agent working
instructions. Application code, database configuration, and runnable scripts
have not been implemented yet. The features below describe the planned scope.

## Planned workflow

- Create a patient through an accessible dialog with name, date of birth,
  status, and structured address fields.
- Browse all saved patient information in a desktop table.
- Validate inputs on the client and server using the same shared Zod schema.
- Provide loading, empty, error, retry, saving, and success feedback.
- Preserve saved records after refreshing the application.

The initial submission focuses on one provider workspace and a small dataset.
See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for excluded features.
A separate read-only patient detail page is optional, as described in
[PLAN.md](PLAN.md#10-optional-enhancement-patient-details).

## Planned stack and structure

| Area | Tools |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Forms and validation | React Hook Form, Zod |
| Server state | TanStack Query |
| Backend | Express, Knex |
| Database | PostgreSQL, run locally through Docker Compose |
| Testing | Vitest, React Testing Library, Supertest |

The planned source layout separates frontend features, API routes and data
access, and browser-safe shared validation:

```text
client/src/             # Directory, create dialog, API client, UI components
server/src/             # Express app, patient routes/data access, migrations
shared/src/             # Patient validation schema and inferred input types
```

Requests flow from the UI through the API to server validation, Knex, and
PostgreSQL. The server remains the enforcement boundary. Detailed field rules,
date handling, API contracts, and the full structure live in [PLAN.md](PLAN.md).

## Local setup

The planned prerequisites are Node.js, npm, and Docker with Compose support.
Only PostgreSQL will run in Docker; the frontend and API will run locally.
The Node.js version and database image version are not pinned yet.

To obtain the repository:

```bash
git clone https://github.com/Fujeremy/finni-take-home-project.git
cd finni-take-home-project
```

Application startup is not available yet. Exact installation, environment,
database creation/migration, and startup commands will be documented here
after the corresponding configuration and scripts exist and are verified.
The previous attempt's commands, ports, reset scripts, and seed data do not
apply to this repository.

## Verification

The planned checks are typechecking, linting, automated tests, and a production
build. API tests will use a separate test database. Coverage and manual checks
are specified in [PLAN.md](PLAN.md#9-verification).

No application checks have run yet because there is no implementation.
Exact test/build commands and verified setup instructions will be added as
implementation progresses.

## Project documentation

- [PLAN.md](PLAN.md): features, architecture, validation rules, API contracts,
  implementation sequence, and acceptance checks.
- [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): excluded functionality and
  acknowledged limitations.
- [CLAUDE.md](CLAUDE.md): agent workflow, readable code and test standards,
  review requirements, and progress tracking.

`PROGRESS.md` will be created when application implementation begins and will
track implemented work, verification results, blockers, and next steps.
