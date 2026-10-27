# S00 · Foundations

**Goal:** A running, empty, deployable skeleton. No product features.

**Design reference:** Sidebar, BottomNav, Design-System (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Monorepo: pnpm workspaces + Turborepo — apps/web (Next.js 15, App Router, TypeScript), apps/api (NestJS), packages/types (shared zod schemas + DTO types), packages/ui (design tokens + base components)
- [ ] PostgreSQL 16 in Docker Compose; Prisma schema + first migration (users, specialties, classes, certifications, chapters, paths)
- [ ] Seed script: 6 specialties, ING-1…ING-5 years and groups, full certification catalog (10 providers, 44 certs) with chapters, the 7 paths
- [ ] Design tokens from the design system → CSS variables (light + dark), Newsreader / Instrument Sans / IBM Plex Mono, Material Symbols
- [ ] App shell: Sidebar (desktop) + BottomNav (mobile), theme toggle, empty routes for every MVP screen
- [ ] API: health check, global validation pipe, error format, OpenAPI at /docs, config module (.env), request logging
- [ ] Quality: ESLint + Prettier, strict TS, Vitest (web) / Jest (api), Playwright smoke test, GitHub Actions (lint, typecheck, test, build)
- [ ] Staging deploy (web + api + db) with one command
- [ ] docs/decisions.md: record each stack decision as a short ADR

## Done when
- [ ] pnpm dev starts web, api and db locally
- [ ] CI is green on main
- [ ] Staging URL shows the app shell with working navigation
- [ ] Seeded catalog is queryable at GET /certifications

## Out of scope
- Any auth, any feature logic

## Plan

Status: **revised with your answers, waiting for approval.**

Branch `sprint/S00-foundations`, small conventional commits, one PR to `main` at the end.

### 0. Repository layout
The git root is `TekCert/`. `app/` (this folder) becomes the monorepo root. GitHub Actions lives at `TekCert/.github/workflows/` and runs with `working-directory: app`. The workspace uses the `frontend/` and `backend/` folders you created in place of `apps/web` and `apps/api`.

```
app/
  frontend/         Next.js 16, App Router, TS strict
  backend/          NestJS + Prisma (prisma/schema.prisma, migrations, seed/)
  packages/types    zod schemas + inferred DTO types (shared by frontend + backend)
  packages/ui       tokens.css (light/dark), fonts, base components (Button, Icon, Chip…)
  packages/config   shared tsconfig / eslint / prettier presets
  e2e/              Playwright
  docker-compose.yml, turbo.json, pnpm-workspace.yaml, .nvmrc, .env.example
```

### 1. Tooling baseline
- **Node 24 LTS (24.22.1)** pinned in `.nvmrc`, `engines` and CI.
- pnpm 10 (via `packageManager` + corepack) and Turborepo with `dev`, `build`, `lint`, `typecheck`, `test` and `test:e2e` pipelines plus caching.
- Strict TS everywhere (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`). ESLint flat config bans `any` (`@typescript-eslint/no-explicit-any: error`). Prettier.

### 2. Database (PostgreSQL 16 + Prisma)
- `docker-compose.yml`: `postgres:16-alpine` with a named volume and a healthcheck, plus a second `tekcert_test` database for API e2e tests.
- Schema for the first migration (`init`):
  - `Specialty`: code (SDIA, CIM, GLOps, SSIR, AIOT, DMWM), name, hue (the oklch hue from the design)
  - `Class`: year 1–5, `specialtyId?` (ING-4/5 only), `group` (a letter), unique `code` following the institute pattern: `ING-4-CIM-C` for ING-4/5 and `ING-2-B` for ING-1–3. Groups are rows, not an enum, so the number of groups can follow real enrolment.
  - `User`: id (uuid), email (unique, citext), firstName, lastName, role enum (student|staff|admin), `classId?`, timestamps. No credentials yet; S01 adds them.
  - `Provider`: code, name, hue
  - `Certification`: code (unique, e.g. SAA-C03), slug, name, level enum (foundational|associate|professional|expert), difficulty 1–5, providerId, `forAllSpecialties` bool, `badgeAsset?`, `isActive`
  - `CertificationSpecialty`: M:N join table
  - `CertificationDomain`: certId, order, title, shortTitle, weightPct (the exam domains in Fiche-certification)
  - `Chapter`: certId, domainId?, order, title, estimatedMinutes
  - `Path`: code (FOND + the 6 specialties), name, kind (shared|specialty), specialtyId?
  - `PathNode`: pathId, certId, col, row, prerequisiteCertId? (the graph layout used in Parcours)
- No points tables yet. The append-only ledger arrives in S04.

### 3. Seed
- Typed data files in `apps/api/prisma/seed/data/` (specialties, classes, providers, certifications, chapters, paths), each checked against a zod schema from `packages/types` before insert.
- Idempotent upserts by natural key, so re-running `pnpm db:seed` is safe on staging.
- Contents:
  - 6 specialties
  - Demo classes with 4 groups (A–D) each: ING-1/2/3 × A–D, and ING-4/5 × 6 specialties × A–D, for 60 classes in total
  - The 10 providers and 44 certifications listed on the Landing design. These are the source of truth, and other certs come later.
  - Chapters grouped by exam domain for each cert
  - The 7 paths, redrawn using only those 44 certs and flagged for your review in the PR
- SAA-C03 uses the 11 chapters and 4 domains from Fiche-certification exactly. Chapters, levels, difficulty and specialties for the other certs are drafted from each vendor's public exam outline and flagged `// DRAFT: needs staff review`.

### 4. API (NestJS)
- `ConfigModule` with a zod-validated env (`DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGIN`). The app fails fast at boot if the env is invalid.
- Validation: `nestjs-zod` global `ZodValidationPipe`. DTOs come from the `packages/types` schemas, and the same schemas generate OpenAPI. Swagger UI is at `/docs` and the JSON at `/docs-json`.
- Error format: RFC 9457 Problem Details (`application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, `requestId`, `errors[]` for validation). One global exception filter maps zod, Prisma (P2002 → 409, P2025 → 404) and Nest HTTP errors.
- Logging: `nestjs-pino`, which gives JSON logs with a request id (from `x-request-id` or generated) and pretty output in dev.
- Endpoints:
  - `GET /health`: liveness, plus a DB ping via `@nestjs/terminus`. The ALB health check uses it.
  - `GET /certifications`: the seeded catalog with provider, level, difficulty, specialties and chapter count. Optional `provider`, `level` and `specialty` query filters are validated with zod. Public for now (there is no auth yet).
  - `GET /certifications/:code`: one cert with its domains and chapters. Kept minimal so the seed is easy to check. Remove it if you want S00 strictly to the listed scope.
- Graceful shutdown hooks and `helmet`.

### 5. Design tokens + `packages/ui`
- `tokens.css` holds the full semantic palette from the designs (`--bg`, `--sf`, `--sf2`, `--ln`, `--ln2`, `--ink`…`--ink3`, `--pri*`, `--gold*`, `--ok*`, `--warn*`, `--err*`, `--hero*`, `--focus`) for light (`:root`) and dark (`[data-theme="dark"]`). With no explicit choice, the theme follows `prefers-color-scheme`.
- Also from Design-System: the type scale (Display 64/68 … Code 13/18), radii (4 tags, 8 fields, 14 cards, pill), the two shadows (flat, elevated), 44 px minimum targets and a visible focus ring. Provider and specialty colours are generated from their `oklch(0.66 0.14 h)` / `oklch(0.6 0.13 h)` hues.
- Fonts come through `next/font/google`: Newsreader, Instrument Sans and IBM Plex Mono with the weights the designs use. Material Symbols Outlined is a self-hosted variable font loaded with `display: block` so icon names never flash as text.
- Base components in S00 are only what the shell needs: `Icon`, `Button` (44/36), `IconButton`, `NavItem` and `Badge`. Everything else comes with the sprint that first needs it.
- Styling uses CSS Modules + the CSS variables. No Tailwind, since the tokens already are the system.

### 6. Web app shell (Next.js)
- Server components by default. Only the theme toggle and the sidebar collapse are client components.
- Theme: a cookie (`theme=light|dark|system`) is read on the server and set on `<html data-theme>`, so dark mode never flashes on first paint. The sidebar collapsed state persists the same way.
- Layout follows the Sidebar and BottomNav designs:
  - ≥ 1280 px: expanded 256 px sidebar that the user can collapse to 76 px
  - 768–1279 px: collapsed sidebar
  - < 768 px: BottomNav with 5 tabs
  - Active item uses `aria-current="page"` with the filled icon. The profile card shows a neutral placeholder until S01, and the badges stay hidden.
- Paths and My requests stay in the nav as designed and open a "Coming in Release 2" empty state.
- Empty routes, each with a title and the "nothing here yet" empty state:
  - App shell: `/dashboard`, `/catalog`, `/catalog/[code]`, `/paths`, `/community`, `/leaderboard`, `/profile`, `/notifications`, `/settings`
  - Outside the shell: `/sign-in`, `/onboarding`, and `/` (redirects to `/dashboard` until the S08 landing page)
  - `not-found` and `error` boundaries
- API access: the browser only ever calls the web origin. Next rewrites `/api/*` to the API (`API_URL`), which matches the architecture diagram (web → internal ALB → app) and keeps cookies same-origin for S01. Server components call `API_URL` directly through a small typed fetch client that parses responses with the shared zod schemas.

### 7. Quality + CI
- Tests:
  - Vitest + Testing Library (web): nav renders the right active item, theme toggle sets the cookie and the attribute
  - Jest (api): unit tests for the exception filter and env schema, and e2e tests with supertest against the real `tekcert_test` DB for `/health` and `/certifications` (count = 44, filters)
  - Playwright smoke at desktop 1440 and mobile 390: open the shell, visit every route through the nav, toggle the theme, and check `/api/certifications` returns 44 items
- GitHub Actions `ci.yml` on PR and on push to `main`:
  - install with the pnpm cache, then lint, typecheck and test in parallel through turbo
  - test runs with a `postgres:16` service container and runs migrations + seed first
  - then `build`, then `e2e` (Playwright against the built apps)
  - Playwright report uploaded as an artifact on failure

### 8. Staging: deferred
There is no AWS work this sprint. The "Staging deploy" scope item and the "Staging URL" done-when item stay unticked and move to the PLAN.md backlog. Everything else is built so it can be deployed later: env-driven config, `/health` for load balancer checks, and the `/api/*` proxy that matches the architecture diagram.

The frontend and backend will later run on **separate EC2 instances**, so in S00 each app must build and run on its own:
- **Frontend:** Next.js `output: "standalone"` gives a self-contained `server.js` folder with no dependency on the monorepo. Its only link to the backend is `API_URL` (the internal ALB later). It gets its own `/healthz` route.
- **Backend:** `pnpm --filter backend deploy --prod <dir>` produces a self-contained folder with production dependencies and the shared packages included. The Prisma client is generated for both Windows and Amazon Linux (`binaryTargets` includes `rhel-openssl-3.0.x`), and migrations run with `prisma migrate deploy`.
- **Shared packages:** `packages/types` and `packages/ui` are built to plain JS during `pnpm build`, so neither app needs the other's source at runtime.
- **Configuration:** nothing is hardcoded to localhost. CORS origin, API URL and DB URL all come from env.
- **CI check:** a CI step builds both deploy folders and starts each one alone, to prove they don't depend on each other.

### 9. Docs
- `docs/decisions.md` gets one ADR each for: Node 24 + pnpm/Turborepo layout, Next.js 16, nestjs-zod + shared schemas, Prisma, Problem Details errors, pino logging, CSS Modules + tokens + cookie theme, test stack + CI, the catalog source of truth (Landing's 44), and class naming. Hosting stays an open item.
- `README.md` gets a "Getting started" section above the existing handoff notes: prerequisites, `pnpm i`, `pnpm dev`, `pnpm db:seed` and the test commands.

### Order of work (commits)
1. Workspace + tooling + CI skeleton
2. docker-compose + Prisma schema + migration
3. Seed data + seed script
4. API (config, validation, errors, logging, health, certifications, OpenAPI) + Jest
5. `packages/ui` tokens + fonts + base components
6. Web shell + routes + theme + Vitest
7. Playwright smoke + full CI
8. ADRs + README + backlog + checklist update

### Decisions from review (2026-10-27)
1. Catalog: the 44 certs from the Landing design are the source of truth. The other certs come in a later sprint, and the paths are redrawn from the 44.
2. Chapters, levels, difficulty and specialties: drafted from public exam outlines and marked for staff review.
3. No AWS work in S00. Staging is deferred to the backlog.
4. Node 24 LTS through nvm, and Next.js 16.
5. Paths and My requests stay in the nav with a "Coming in Release 2" state.
6. Classes follow the pattern `ING-4-CIM-C` (groups A–D). The seed creates 4 groups per class for the demo, and the real number depends on enrolment.
7. Install `gh`. Some PRs will still be opened by hand.

Remaining assumption: ING-1–3 classes are named `ING-1-A`…`ING-3-D` (no specialty in the name). Tell me if the real pattern differs.

## Notes / decisions
