# CLAUDE.md · TekCert

TekCert guides Tek-Up students toward the school's free certifications (AWS, Azure, Red Hat…).
Semester group project (ING-4 CIM), team of 4. One git repository holds the product and its
infrastructure.

## Layout
- `app/`: the product. pnpm + Turborepo monorepo: Next.js frontend, NestJS backend, shared
  packages, Playwright e2e. Run `pnpm` commands from `app/`. Rules: `app/CLAUDE.md` (below).
- `infra/`: Terraform for AWS (AWS Academy Learner Lab). Run `terraform` from `infra/envs/dev`.
  Rules: `infra/CLAUDE.md` (below).
- `docs/`: `AWS-Architecture-V1.drawio` / `.png`, the source of truth for the architecture.
- `.github/workflows/ci.yml`: CI.

## Working from the root
- Each folder keeps its own rules, and the paths in them are relative to that folder: `/design`
  in the app rules means `app/design`, `envs/dev` in the infra rules means `infra/envs/dev`.
- Work on one side at a time, and follow that side's process: sprints with a plan approved first
  for `app/`, explain-every-resource and never `apply`/`destroy` for `infra/`.
- The two sides depend on each other. When a change on one side affects the other, say so and
  update both, or list what the other side still needs. The contract today:
  - web listens on 3000, the API on 4000 (the ASGs and target groups use these ports);
  - the ALBs check the web at `/healthz` and the API at `/health`;
  - Next.js calls the API server-side only: the internal ALB is not reachable from browsers;
  - configuration comes from environment variables (`app/backend/.env.example`,
    `app/frontend/.env.example`); secrets come from Secrets Manager in AWS, never from code or
    tfvars.
- Git: one branch and one PR per piece of work, cut from `main`. Commit or push only when asked.
  Conventional commits.

## App rules
@app/CLAUDE.md

## Infra rules
@infra/CLAUDE.md
