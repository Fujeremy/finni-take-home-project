# Progress

## Current milestone

**A. Foundation** — in progress. Approved plan: 3 PRs, 10 commits.

| PR | Branch | Scope | State |
|---|---|---|---|
| 1 | `foundation/workspace-db` | Workspaces, shared constants, Postgres, `patients` migration | Draft PR open: Fujeremy/finni-take-home-project#1 (7 commits), awaiting review |
| 2 | `foundation/api` | `GET /api/patients`, JSON error handler | Not started |
| 3 | `foundation/client` | Vite client shell, proxy, README setup | Not started |

## Implemented

- npm workspaces (`shared`, `server`) with a shared TypeScript base config and ESLint.
- `@finni/shared`: patient status values, `PatientStatus` type, and field-length constants. Built to `dist/` with `tsc -b`.
- Docker Compose Postgres 17 on port 5432, with `finni_dev` and a separate `finni_test` database.
- `patients` migration matching PLAN.md §6, including status and country check constraints. Run with `npm run db:migrate`; other Knex CLI commands run through `npm run knex -w server -- <command>` using `server/knexfile.ts`.
- Server test setup: migrates `finni_test` once, refuses to run if it matches the dev database, runs files serially.

## Verification

Run on 2026-10-19, against each commit's own state as it was built:
- `npm run db:migrate`: applied once, then reported up to date on a second run.
- `npm test`: 3 database tests passed (defaults, status check, country check).
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm ci` from a clean `node_modules`, then all checks: passed.
- Fresh Postgres volume: init script created `finni_dev` and `finni_test`.

Not yet verified: following the README from a clean checkout (README is updated in PR 3).

## Decisions made

- Connectivity is proven with `GET /api/patients` (no health endpoint).
- Error shape: `{ "error": { "code", "message" } }`; validation errors add `fieldErrors` in Milestone B.
- TypeScript is pinned to 6.0 because typescript-eslint does not support 7.x yet.
- ESLint ignores `.claude/worktrees/`, where agent sessions keep separate checkouts.

## Open questions

None.

## Next step

Developer review of PR 1. Then start PR 2 on `foundation/api`, branched from `foundation/workspace-db`: `GET /api/patients` and the JSON error handler.
