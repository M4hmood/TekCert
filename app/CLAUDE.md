# CLAUDE.md · TekCert

## Rules
- **Do not write product code until Sprint 0 is approved.** Start by reading PLAN.md and sprints/S00-foundations.md, write your plan in that file, and stop.
- Work on one sprint at a time. Never start the next sprint without approval.
- For every sprint: plan → wait for approval → build → run tests → update the sprint checklist → summarise what changed.
- Stay inside the sprint scope. Put anything else in PLAN.md → backlog.

## Stack
- Monorepo: pnpm workspaces + Turborepo
- frontend/: Next.js (App Router, TypeScript, server components by default)
- backend/: NestJS (REST, OpenAPI), Prisma ORM
- PostgreSQL 16 (Docker Compose locally)
- packages/types: shared zod schemas; packages/ui: design tokens + base components
- Tests: Vitest (web), Jest (api), Playwright (e2e)

## Conventions
- Strict TypeScript, no any. Validate every API input with zod / class-validator.
- Privacy and permissions are enforced in the API, never only in the UI.
- Points are an append-only ledger; totals are always derived.
- Styling uses the design tokens (CSS variables) from packages/ui. Match /design screens for layout, copy and states.
- Conventional commits; one PR per sprint.

## Design reference
/design contains the HTML designs. Open them in a browser. Each screen shows desktop (1440) and mobile (390) with all states.
