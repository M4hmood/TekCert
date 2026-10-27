# Decisions (ADRs)

One short entry per decision: context → decision → consequences.

## ADR-001 Stack
Next.js + NestJS + PostgreSQL in a pnpm/Turborepo monorepo. Accepted.

## ADR-002 Auth
Email + password limited to @tek-up.de, httpOnly cookie sessions. SSO can be added later. Accepted.

## Open
- Hosting provider for staging and production
- SMTP provider for transactional email
- File storage provider (S3-compatible)
- Who administers the certification catalog before the staff console exists (seed files vs. a minimal admin page)
