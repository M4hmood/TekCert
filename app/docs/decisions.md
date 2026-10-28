# Decisions (ADRs)

One short entry per decision: context → decision → consequences.

## ADR-001 Stack
Next.js + NestJS + PostgreSQL in a pnpm/Turborepo monorepo. Accepted.

## ADR-002 Auth
Email + password limited to @tek-up.de, httpOnly cookie sessions. SSO can be added later. Accepted.

## ADR-003 Runtime and workspace layout (S00)
- **Context:** Node 20 reached end of life in April 2026. The frontend and backend will run on separate EC2 instances.
- **Decision:** Node 24 LTS, pinned in `.nvmrc`, `engines` and CI. pnpm 10 through Corepack (`packageManager`), with Turborepo for task orchestration and caching. The apps live in `frontend/` and `backend/`, and shared code in `packages/{types,ui,config}`.
- **Consequences:** pnpm's strict `node_modules` stops undeclared imports. `pnpm deploy` packs the backend into a self-contained folder. CLAUDE.md's `apps/web` and `apps/api` map to `frontend/` and `backend/`.

## ADR-004 Framework versions (S00)
- **Context:** In October 2026, NestJS 12 is ESM-only and `nestjs-zod` only supports NestJS ≤ 11. typescript-eslint supports TypeScript < 6.1. `eslint-config-next`'s React, import and a11y plugins only declare support up to ESLint 9.
- **Decision:**
  - Next.js 16 (App Router, Turbopack) with React 19.
  - NestJS 11, which is still patched.
  - TypeScript 6.0.
  - ESLint 9 with flat config.
  - Prisma 7.10 (the stable line; 8 is still RC).
- **Consequences:**
  - Move to NestJS 12 once `nestjs-zod` supports it.
  - Move to ESLint 10 once `eslint-config-next` does. ESLint 9 is already marked unsupported upstream.

## ADR-005 Contracts and validation (S00)
- **Context:** CLAUDE.md requires every API input to be validated, and the frontend must not drift from the API.
- **Decision:** Zod schemas in `@tekcert/types` are the single contract. The API uses `nestjs-zod` for three things:
  - a global `ZodValidationPipe` for request validation
  - `ZodResponse` for response serialization, so fields that aren't in the schema are stripped
  - OpenAPI generated from the same schemas, at `/docs`
  
  The frontend parses every API response with the same schemas.
- **Consequences:** A contract change is one edit in `packages/types`. A drift fails loudly in tests instead of at runtime in the UI.

## ADR-006 Errors and logging (S00)
- **Decision:**
  - Every API error is an RFC 9457 Problem Details body (`application/problem+json`). A validation failure includes an `errors[]` array of `{ path, message }`.
  - Unexpected errors return a generic 500 and are logged, never echoed.
  - Logs are JSON through `nestjs-pino`, pretty-printed in development. Every request gets an `x-request-id`, reused from the caller when one is sent.
- **Consequences:** Clients handle one error shape. Request ids correlate frontend, proxy and API logs.

## ADR-007 Database access (S00)
- **Decision:**
  - Prisma 7 with the `prisma-client` generator (CommonJS output in `backend/src/generated`) and the `@prisma/adapter-pg` driver adapter. The connection URL is set in `prisma.config.ts`.
  - The seed is idempotent: it upserts by natural key and never deletes certifications, only deactivates them. Chapters keep their ids when their titles change.
- **Consequences:** Re-seeding staging is safe. Chapter progress (S04) can reference chapter ids.

## ADR-008 Catalog source of truth (S00)
- **Context:** The Landing design lists 44 certifications from 10 providers. Catalogue, Parcours and Onboarding use a different sample that includes CompTIA, Google Cloud, SAP-C02, AI-102 and others.
- **Decision:**
  - The 44 funded certifications on the Landing screen are the catalog. The 7 paths were redrawn using only those 44.
  - Two Oracle certs would otherwise share the code "OCA", and two "OCP", so their codes are suffixed: `OCA-JAVA`, `OCA-DB`, `OCP-JAVA`, `OCP-DB`.
  - URLs use a `slug` because some codes aren't URL-safe (`PCPP-32-1/2` → `pcpp-32-1-2`).
- **Consequences:**
  - Chapters, levels, difficulty, specialties and paths are drafts (marked `DRAFT` in the seed files) and need staff review. SAA-C03 matches its design exactly.
  - Some Landing certs are retired by their vendors (e.g. LFCE, CHSA, MCSA, AAD, Red Hat EX180). Staff should confirm they are still funded.

## ADR-009 Classes (S00)
- **Decision:** The class code follows the institute pattern: `ING-4-CIM-C` for years 4–5 and `ING-2-B` for years 1–3. Groups are rows, not an enum. The demo seed creates groups A–D, which gives 60 classes.
- **Consequences:** Real enrolment can add or remove groups without a migration.

## ADR-010 Styling and theming (S00)
- **Decision:**
  - The design tokens are CSS variables in `@tekcert/ui` (`tokens.css`, with light and dark palettes). Components use CSS Modules; there is no Tailwind.
  - Fonts load through `next/font` (Newsreader, Instrument Sans, IBM Plex Mono). Material Symbols is self-hosted from the `material-symbols` package.
  - The theme and the sidebar state live in cookies that the server reads, so the first paint is already correct with no flash. With no cookie, the theme follows the OS.
  - Breakpoints: expanded sidebar at ≥ 1280 px, collapsed rail at 768–1279 px, BottomNav below 768 px.
- **Consequences:** Pages render on the server per request, which is fine for an authenticated app.

## ADR-011 API access from the frontend (S00)
- **Decision:**
  - The browser only calls the web origin. A Next.js route handler at `/api/*` proxies to `API_URL`, which matches the architecture diagram (web → internal ALB → app).
  - Server components call `API_URL` directly.
  - `API_URL` is read at runtime, so one frontend build runs in any environment.
- **Consequences:**
  - Auth cookies (S01) stay same-origin.
  - The API is never exposed publicly.
  - CORS is only a fallback.

## ADR-012 Tests and CI (S00)
- **Decision:**
  - Vitest for `frontend` and `packages/types`.
  - Jest for `backend`: unit tests, plus e2e tests with supertest against a dedicated `tekcert_test` database.
  - Playwright smoke tests at 1440 px and 390 px. They run against the production builds, each started as its own process, which mirrors the separate-instance deployment.
  - One GitHub Actions job runs format, lint, typecheck, unit tests, API e2e, build and Playwright, with a Postgres 16 service.
- **Consequences:** A green CI also proves the two deploy bundles run independently.

## Open
- Hosting for staging and production. The target is the AWS 3-tier design in `../docs/AWS-Architecture-V1.drawio`; the work is deferred (see PLAN.md backlog).
- SMTP provider for transactional email
- File storage provider (S3-compatible)
- Who administers the certification catalog before the staff console exists (seed files vs. a minimal admin page). For now the answer is the seed files in `backend/prisma/seed/data/`.
