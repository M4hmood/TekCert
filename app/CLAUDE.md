# CLAUDE.md · TekCert

## Rules
- **Do not write product code until Sprint 0 is approved.** Start by reading PLAN.md and sprints/S00-foundations.md, write your plan in that file, and stop.
- Work on one sprint at a time. Never start the next sprint without approval.
- For every sprint: plan → wait for approval → build → run tests → update the sprint checklist → summarise what changed.
- Stay inside the sprint scope. Put anything else in PLAN.md → backlog.

## Stack
- Monorepo: pnpm workspaces + Turborepo
- frontend/: Next.js (App Router, TypeScript, server components by default)
- backend/: NestJS (REST, OpenAPI), TypeORM
- PostgreSQL 16 (Docker Compose locally)
- Styling: Tailwind CSS v4 + shadcn/ui (Radix)
- packages/types: shared zod schemas; packages/ui: design tokens + base components + shadcn primitives
- Tests: Vitest (web), Jest (api), Playwright (e2e)

## Conventions
- Strict TypeScript, no any. Validate every API input with zod / class-validator.
- Privacy and permissions are enforced in the API, never only in the UI.
- Points are an append-only ledger; totals are always derived.
- Styling uses Tailwind utilities on the design tokens from packages/ui (`bg-sf`, `text-ink2`, `rounded-card`, `type-h1`). No CSS Modules. Match /design screens for layout, copy and states.
- Add a shadcn component with `pnpm dlx shadcn@latest add <name>` in packages/ui, then own it: import `cn` from `../../lib/utils` (the CLI writes a bad `cn` import and may add an npm package of that name; remove it), use `Icon` instead of lucide, and match the design's sizes and colours.
- Conventional commits; one PR per sprint.

## Design reference
/design contains the HTML designs. Open them in a browser. Each screen shows desktop (1440) and mobile (390) with all states.
