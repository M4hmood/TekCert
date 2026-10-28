# TekCert

A web platform where TEK-UP students prepare the IT certifications funded by the institute, track their progress and find classmates who can help.

## Getting started

### Prerequisites
- Node 24 LTS: `nvm install 24.22.1 && nvm use 24.22.1` (`.nvmrc` pins the version)
- pnpm through Corepack: `corepack enable`
- Docker Desktop, for PostgreSQL 16

### First run
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
pnpm install
pnpm db:up          # start Postgres in Docker
pnpm db:migrate     # apply migrations
pnpm db:seed        # load the 44 certifications, chapters, classes and paths
pnpm dev            # db + API on :4000 + web on :3000
```

Once it's running:
- the app is at http://localhost:3000
- the API docs (OpenAPI) are at http://localhost:4000/docs
- `GET http://localhost:4000/certifications` returns the seeded catalog

### Everyday commands
| Command | What it does |
|---|---|
| `pnpm dev` | Starts Postgres, the API and the web app with hot reload |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Code quality checks across the workspace |
| `pnpm test` | Unit tests (Vitest for frontend and types, Jest for backend) |
| `pnpm test:api` | API e2e tests against the `tekcert_test` database |
| `pnpm build && pnpm test:e2e` | Playwright smoke tests against the production builds |
| `pnpm db:reset` | Drops, migrates and re-seeds the dev database |
| `pnpm bundle` | Builds the self-contained deploy folders in `deploy/backend` and `deploy/frontend` |

Before the first Playwright run, install the browser once with `pnpm --filter e2e install-browsers`.

### Running the deploy bundles
The frontend and backend deploy separately (one EC2 group each). After `pnpm build && pnpm bundle`:
```bash
# API
cd deploy/backend
DATABASE_URL=postgresql://… npx prisma migrate deploy
DATABASE_URL=postgresql://… PORT=4000 node dist/main.js

# Web
cd deploy/frontend/frontend
API_URL=http://<api-host>:4000 PORT=3000 HOSTNAME=0.0.0.0 node server.js
```
Health checks: `GET /health` on the API (includes a database ping) and `GET /healthz` on the web app.

## Repository layout
| Path | Contents |
|---|---|
| `frontend/` | Next.js 16 app (App Router, server components by default) |
| `backend/` | NestJS 11 REST API, Prisma schema, migrations and seed (`prisma/seed/data/`) |
| `packages/types` | Shared zod schemas: the API contract used by both apps |
| `packages/ui` | Design tokens (CSS variables, light and dark) and base components |
| `packages/config` | Shared tsconfig and ESLint presets |
| `e2e/` | Playwright smoke tests |
| `design/` | HTML designs (open `design/Index.dc.html`, e.g. with `npx serve design`) |
| `docs/decisions.md` | Architecture decision records |
| `PLAN.md`, `sprints/` | Roadmap, backlog and one file per sprint |

Screen file names in `design/` are in French (e.g. `Tableau-de-bord` = Dashboard); their content is in English.

## Working with Claude Code
`CLAUDE.md` holds the rules Claude Code follows. Each sprint goes plan → approval → build → tests → checklist update. To start the next sprint, ask Claude Code to read `CLAUDE.md`, `PLAN.md` and the sprint file and to write its plan before coding.
