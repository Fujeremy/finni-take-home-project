# Progress

## Current milestone

**A. Foundation** — in progress. 3 PRs.

| PR | Branch | Scope | State |
|---|---|---|---|
| 1 | `foundation/workspace-db` | Workspaces, shared constants, Postgres, `patients` migration | Merged (Fujeremy/finni-take-home-project#1) |
| 2 | `foundation/api` | `GET /api/health`, JSON error handler | Committed locally (4 commits), not pushed, awaiting review |
| 3 | `foundation/client` | Vite client shell, proxy, README setup | Not started |

## Implemented

- npm workspaces (`shared`, `server`) with a shared TypeScript base config and ESLint.
- `@finni/shared`: patient status values, `PatientStatus` type, and field-length constants. Built to `dist/` with `tsc -b`.
- Docker Compose Postgres 17 on port 5432, with `finni_dev` and a separate `finni_test` database.
- `patients` migration matching PLAN.md §6, including status and country check constraints. Run with `npm run db:migrate`; other Knex CLI commands run through `npm run knex -w server -- <command>` using `server/knexfile.ts`.
- Server test setup: migrates `finni_test` once, refuses to run if it matches the dev database, runs files serially.
- Express app (`createApp(db)`) with `GET /api/health`, which runs `select 1` and returns `{ "status": "ok" }`.
- Server entry point on `PORT` (3001): `npm run dev -w server` (tsx watch), `npm run build`, `npm run start -w server`.
- Unexpected errors return 500 `{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." } }` and log details on the server only.

## Verification

PR 1 (2026-10-19, each commit in its own state): migration applied and re-ran as up to date; 3 database tests; typecheck, lint, build; `npm ci`; fresh Postgres volume created both databases.

PR 2 (2026-10-20, each commit in its own state):
- `npm test`: 5 tests passed (3 database, health ok, generic error with an unreachable database). The error test fails when the handler is removed.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Manual: built server and `tsx watch` dev server both returned 200 `{"status":"ok"}`; with Postgres stopped, the built server returned the generic 500 body and logged the connection error.

Not yet verified: following the README from a clean checkout (README is updated in PR 3).

## Decisions made

- Connectivity is proven with `GET /api/health` (PLAN.md §7 and §8A updated). Patient listing moves to Milestone B.
- Health failures use the standard 500 error rather than a 503.
- Error shape: `{ "error": { "code", "message" } }`; validation errors add `fieldErrors` in Milestone B.
- TypeScript is pinned to 6.0 because typescript-eslint does not support 7.x yet.
- ESLint ignores `.claude/worktrees/`, where agent sessions keep separate checkouts, and allows unused arguments prefixed with `_`.

## Open questions

None.

## Next step

Developer review of PR 2, then approval to push and open it. After that, PR 3 (`foundation/client`): Vite client, proxy, connection check against `/api/health`, README setup.
