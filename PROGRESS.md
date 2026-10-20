# Progress

## Current milestone

**A. Foundation** — implemented, awaiting PR 3 review and milestone approval. 3 PRs.

| PR | Branch | Scope | State |
|---|---|---|---|
| 1 | `foundation/workspace-db` | Workspaces, shared constants, Postgres, `patients` migration | Merged (Fujeremy/finni-take-home-project#1) |
| 2 | `foundation/api` | `GET /api/health`, JSON error handler | Merged (Fujeremy/finni-take-home-project#2) |
| 3 | `foundation/client` | Vite client shell, proxy, README setup | Committed locally (3 commits), not pushed, awaiting review |

## Implemented

- npm workspaces (`shared`, `server`, `client`) with a shared TypeScript base config and ESLint (React Hooks rules for client code).
- `@finni/shared`: patient status values, `PatientStatus` type, and field-length constants. Built to `dist/` with `tsc -b`. Declared as a dependency of both client and server; no permanent imports yet (first real use in Milestone B).
- Docker Compose Postgres 17 on port 5432, with `finni_dev` and a separate `finni_test` database.
- `patients` migration matching PLAN.md §6, including status and country check constraints. Run with `npm run db:migrate`; other Knex CLI commands run through `npm run knex -w server -- <command>` using `server/knexfile.ts`.
- Server test setup: migrates `finni_test` once, refuses to run if it matches the dev database, runs files serially.
- Express app (`createApp(db)`) with `GET /api/health`, which runs `select 1` and returns `{ "status": "ok" }`.
- Unexpected errors return 500 `{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." } }` and log details on the server only.
- Client: Vite, React, Tailwind CSS v4, shadcn (radix-nova) with Button, TanStack Query. Vite proxies `/api` to port 3001.
- Temporary connection check on the page: "API connected.", or an error message with a Retry button. Milestone B replaces it with the directory.
- README: prerequisites, setup, migration, dev, test, check, and build commands. Root `dev:server` and `dev:client` scripts.

## Verification

PR 1 (2026-10-19) and PR 2 (2026-10-20): see their PR descriptions. 5 server tests, typecheck, lint, and build pass.

PR 3 (2026-10-20, each commit in its own state):
- `npm ci`, `npm test` (5 passed), `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Browser, through the Vite proxy: "API connected." with the API up; error message and Retry with the API stopped; keyboard Retry recovered after restarting the API; the API's generic message shown with Postgres stopped.
- Shared imports: a temporary import of `@finni/shared` worked in the client typecheck, Vite dev, client production build, built server, and tsx server, then was removed.
- README followed from a fresh clone with a fresh database: install, `.env`, Compose, migrate, tests, checks, build, both dev commands, and "API connected." in the browser.

Not yet verified: client UI tests (client test setup arrives with the first UI tests in Milestone B).

## Decisions made

- Connectivity is proven with `GET /api/health` (PLAN.md §7 and §8A updated). Patient listing moves to Milestone B.
- Health failures use the standard 500 error rather than a 503.
- Error shape: `{ "error": { "code", "message" } }`; validation errors add `fieldErrors` in Milestone B.
- TypeScript is pinned to 6.0 because typescript-eslint does not support 7.x yet.
- ESLint ignores `.claude/worktrees/`, where agent sessions keep separate checkouts, and allows unused arguments prefixed with `_`.
- Shared package: dependency declared on both sides now, permanent imports added with Milestone B's first real use.
- Client tests (jsdom, Testing Library) are set up with the first UI tests in Milestone B.

## Open questions

- `npm audit` reports 7 high-severity findings, all from one `braces` advisory reached through the `shadcn` CLI's tooling. Not in the browser bundle; the only offered fix downgrades shadcn to 1.0.

## Next step

Developer review of PR 3, then approval to push and open it, and approval of Milestone A. After that, the Milestone B proposal.
