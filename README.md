# Finni Health — Patient Management

A take-home application for providers to create patient records and view saved
information in a desktop directory. For **fictional patient information only**.

## Current status

Foundation is in progress. The API server, database, and client shell run
locally, and the page confirms it can reach the API. Patient entry and the
patient directory are not built yet.

## Prerequisites

- Node.js 24 or later (includes npm)
- Docker with Docker Compose

The app uses these local ports: 5432 (PostgreSQL), 3001 (API), and 5173 (client).
If another PostgreSQL is already using port 5432, stop it before starting the
database.

## Setup

Run these from the repository root:

```bash
npm install
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
```

`docker compose up` starts PostgreSQL with a development database and a separate
test database. `npm run db:migrate` creates the tables in the development database.

## Run in development

Start the API and the client in two terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open http://localhost:5173. The page shows "API connected." when the client can
reach the API through the Vite proxy.

## Test, check, and build

The database must be running. Tests use the separate test database and migrate it
automatically.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Database commands

`npm run db:migrate` applies pending migrations. Other Knex CLI commands run
through the server workspace, for example:

```bash
npm run knex -w server -- migrate:status
```

## Project documentation

- [PLAN.md](PLAN.md): feature scope, stack, architecture, and acceptance checks.
- [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): excluded features and limitations.
- [PROGRESS.md](PROGRESS.md): current milestone, verification status, and next step.
- [CLAUDE.md](CLAUDE.md): agent workflow and code/test readability standards.
