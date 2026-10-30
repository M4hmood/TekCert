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
  - TypeORM 1.1 (see ADR-007).
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

## ADR-007 Database access: TypeORM (S00, revised)
- **Context:** S00 was first built with Prisma 7. On review, the team chose TypeORM instead, before the PR was merged.
- **Decision:**
  - TypeORM 1.1 with `@nestjs/typeorm` and the `pg` driver.
  - Entities are decorated classes in `backend/src/database/entities`. Every column has an explicit type, so the CLI also works under `tsx`, which emits no decorator metadata.
  - A snake_case naming strategy maps `providerId` to `provider_id`.
  - Enums are native Postgres enums. UUIDs come from `gen_random_uuid()`.
  - One `dataSourceOptions()` function feeds both the Nest app and the TypeORM CLI (`src/database/data-source.ts`).
  - The schema only changes through generated, reviewed migrations in `src/database/migrations`. `synchronize` and `migrationsRun` are both off. Migrations run explicitly: `pnpm db:migrate` in dev, and `db:deploy` from compiled JS on servers.
  - The seed lives in `src/database/seed` and compiles with the app, so a deploy bundle can seed itself (`db:seed:deploy`). It is idempotent: it upserts by natural key and never deletes certifications, only deactivates them. Chapters keep their ids when their titles change.
  - `autoInstallPeers: false` in pnpm, so optional peers such as `mysql2` or Prisma are not pulled into the bundles.
- **Consequences:**
  - Re-seeding staging is safe, and chapter progress (S04) can reference chapter ids.
  - Database errors map to Problem Details: `23505`/`23503` become 409 and `EntityNotFoundError` becomes 404.
  - TypeORM 1.x removed `loadRelationCountAndMap`, so chapter counts use a `@VirtualColumn` subquery.

## ADR-008 Catalog source of truth (S00)
- **Context:** The Landing design listed 44 certifications from 10 providers. Catalogue, Parcours and Onboarding use a different sample that includes CompTIA, Google Cloud, SAP-C02, AI-102 and others.
- **Decision:**
  - The funded certifications are the catalog; the 7 paths are redrawn using only those. S00 started from the Landing's 44. On 2026-10-29 the catalog was reset to the vendor sheets TEK-UP supplied (AWS, Cisco, Linux Foundation, Oracle, Red Hat, Huawei, Python Institute) plus the Azure, EC-Council and INE certs: 56 certs from 10 providers. Google (AAD) is out because TEK-UP does not support Google certifications; Red Hat RHCS (EX180) is out because the sheets do not show it (AWS AIF-C01 stays, added back at the user's request); Huawei, SAP-C02, eJPT and the Cisco and Red Hat variants are in.
  - Two Oracle certs would otherwise share the code "OCA", and two "OCP", so their codes are suffixed: `OCA-JAVA`, `OCA-DB`, `OCP-JAVA`, `OCP-DB`.
  - URLs use a `slug` because some codes aren't URL-safe (`PCPP-32-1/2` → `pcpp-32-1-2`).
- **Consequences:**
  - Chapters, levels, difficulty, specialties and paths are drafts (marked `DRAFT` in the seed files) and need staff review. SAA-C03 matches its design exactly.
  - Some Landing certs are retired by their vendors (e.g. LFCE, CHSA, MCSA, and the Cisco CCENT, CCNA/CCNP/CCIE Routing & Switching track). Staff should confirm they are still funded.

## ADR-009 Classes (S00)
- **Decision:** The class code follows the institute pattern: `ING-4-CIM-C` for years 4–5 and `ING-2-B` for years 1–3. Groups are rows, not an enum. The demo seed creates groups A–D, which gives 60 classes.
- **Consequences:** Real enrolment can add or remove groups without a migration.

## ADR-010 Styling and theming (S00)
- **Decision:**
  - The design tokens are CSS variables in `@tekcert/ui` (`tokens.css`, with light and dark palettes). Components use CSS Modules; there is no Tailwind.
  - Fonts are self-hosted from npm: `@fontsource` for Newsreader, Instrument Sans and IBM Plex Mono, and `material-symbols` for the icons. S01 replaced `next/font/google`, because every page returned 500 whenever Google Fonts was slow to answer.
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

## ADR-013 Session model (S01)
- **Context:** The sprint asks for httpOnly cookie sessions with access and refresh tokens. The browser only talks to the web origin, which proxies `/api/*` (ADR-011).
- **Decision:**
  - **Access token:** a JWT signed with HS256 (`jsonwebtoken`), valid for 15 minutes, holding the user id and role. It travels in the `tc_access` cookie.
  - **Refresh token:** 32 random bytes in the `tc_refresh` cookie. The database stores only its SHA-256 hash, one row per token in `sessions`.
  - **Rotation:** every refresh replaces the refresh token. If a token that was already replaced shows up again, the whole sign-in (token family) is revoked. A 10-second grace period covers parallel requests that refresh at the same moment.
  - **"Stay signed in":** a 30-day sliding expiry. Without it: browser-session cookies, and the sign-in ends after 12 hours at most.
  - **Cookie flags:** both cookies are `HttpOnly` and `SameSite=Lax`, and `Secure` everywhere except local HTTP. Their path is `/`, which lets Next's `proxy.ts` refresh a session while rendering any page. The plan had scoped the refresh cookie to `/api/auth`, but then the page server never receives it.
  - **CSRF:** `SameSite=Lax` blocks cross-site POSTs, and the API also refuses state-changing requests whose `Origin` header isn't the web app.
  - **Per-account lockout:** 5 failures lock the address for 15 minutes. It's tracked per email in `login_attempts`, so an unknown address behaves exactly like a wrong password.
  - **Per-IP limit:** `@nestjs/throttler` adds a limit per IP on `/auth/*`.
  - **Who checks what:** `proxy.ts` only reads the token's expiry to decide where to send the browser. The API verifies every token.
- **Consequences:**
  - A stolen refresh token stops working as soon as the legitimate client refreshes.
  - The throttler keeps its counts in memory, per instance. With several API instances on AWS, a shared store is needed (backlog).
  - `JWT_ACCESS_SECRET` must come from Secrets Manager in the cloud.

## ADR-014 Password hashing (S01)
- **Decision:** argon2id through `@node-rs/argon2`, with the OWASP baseline (19 MiB memory, 2 iterations, 1 lane). pnpm installs the Linux binaries too (`supportedArchitectures`), so a bundle built on Windows runs on Amazon Linux. When the email is unknown, the API checks the password against a dummy hash, so response times don't reveal which accounts exist.
- **Consequences:** No native compilation anywhere. Each hash takes about 20 ms on a laptop.

## ADR-015 Transactional email (S01)
- **Decision:**
  - Nodemailer over SMTP (`SMTP_URL`) in every environment. Locally that's Mailpit from docker compose, with its inbox at http://localhost:8025. CI runs Mailpit as a service too.
  - Emails send in the background: API responses never wait for SMTP.
  - Templates are plain HTML plus text.
  - Links are single-use and only their hash is stored: verification links last 24 hours, reset links 30 minutes, with a 60-second resend cooldown.
  - The verify and reset pages send the token with a POST, so link scanners that open URLs can't use it up.
  - Signing up with an existing address returns the same response as a new sign-up, and the owner gets an email instead.
- **Consequences:**
  - A delivery failure is logged rather than shown; the student can press "Resend".
  - Staging still needs a real SMTP provider (open item).
  - Use `127.0.0.1` rather than `localhost` in `SMTP_URL`: on Windows, nodemailer spends seconds resolving `localhost`.

## ADR-016 Profile photos (S02)
- **Decision:**
  - Photos go through the API, not presigned uploads: `PUT /me/avatar` (multipart, field `photo`). Multer caps the body at 5 MB and keeps it in memory.
  - The API checks the magic bytes (JPEG or PNG only; the file name and the browser's type aren't trusted). `sharp` then applies the EXIF orientation, centre-crops to a square, resizes to 512×512 and re-encodes as WebP. Re-encoding drops EXIF, GPS and anything appended to the file. It also refuses images over 50 megapixels (decompression bombs).
  - The browser crops first (`react-easy-crop`, square, zoom, keyboard-movable) and sends a JPEG of at most 1024 px. The server crop is a safety net.
  - Storage is S3 through `@aws-sdk/client-s3` with a private bucket. The object key contains a content hash (`avatars/<user>/<hash>.webp`). The old object is deleted after a replacement.
  - Photos are only served by `GET /users/:id/avatar`, which needs a session. Every profile is visible to signed-in students (PLAN.md decision, 2026-10-29), so any signed-in student may load any photo. URLs carry `?v=<hash>`, so `Cache-Control: private, max-age=86400` is safe.
  - Locally and in CI the S3 server is **S3Mock** (`adobe/s3mock`), not MinIO: MinIO no longer publishes container images (Docker Hub and quay.io both refuse pulls). S3Mock is configured entirely with env vars and creates the bucket at start, so it also runs as a GitHub Actions service container.
  - On AWS, `S3_ENDPOINT` and the keys stay unset, so the SDK uses the regional endpoint and the instance role.
- **Consequences:**
  - S3Mock doesn't check credentials or bucket policies. Access rules are only exercised for real on AWS (staging backlog).
  - Uploads go through the web proxy and the API (5 MB at most), which is fine at TekCert's scale. Presigned uploads would only be worth it for much larger files (Release 2 proofs, maybe).

## ADR-017 Backend module boundaries (proposed, after S02)
- **Context:** All 13 entities sit in `database/entities/`, and every feature module registers whatever repositories it wants. Auth, onboarding and avatars each read and write `users` on their own. No module exports a service. `CLOCK` is provided twice. `avatarPath()` lives in avatars but auth and onboarding import it. S03 (catalog) and S05 (directory) will add more readers of the same tables.
- **Decision:**
  - **Each module owns its entities.** A module calls `TypeOrmModule.forFeature` only for entities it owns. Other modules reach that data by importing the module and injecting the service it exports, never by injecting its repository.
  - **Ownership:**

    | Module | Owns | Exports |
    |---|---|---|
    | `users/` (new) | `User` | `UsersService` |
    | `school/` (new) | `Specialty`, `SchoolClass` | `SchoolService` |
    | `certifications/` | `Provider`, `Certification`, `CertificationDomain`, `Chapter`, `UserCertification` | `CertificationsService`, `UserCertificationsService` |
    | `paths/` (new) | `Path`, `PathNode` | `PathsService` |
    | `auth/` | `Session`, `EmailToken`, `LoginAttempt` | nothing (global guards) |
    | `onboarding/`, `avatars/`, `health/` | nothing | nothing |

    S04 decides whether `UserCertification` moves to a progress module.
  - **Dependency direction:** `auth`, `onboarding` and `avatars` depend on `users`, `school`, `certifications` and `paths`. Those four depend only on infrastructure: config, database, mail, storage and common. A cycle means an entity has the wrong owner. Fix the ownership instead of using `forwardRef`.
  - **Module layout:** `*.module.ts`, `*.controller.ts` and `*.service.ts`, plus their specs, sit at the module root. Everything else goes in subfolders, and each module only has the ones it needs: `dto/`, `entities/`, `guards/`, `decorators/`, `utils/` (pure functions, specs alongside), `templates/`, `indicators/`, `interfaces/`, `adapters/`.
  - **Infrastructure:** a global `CommonModule` provides `CLOCK` once. `common/` is split into `filters/`, `exceptions/`, `middleware/` (origin check) and `utils/` (clock). Mail and storage keep only their port in `interfaces/`, and storage keeps the S3 implementation in `adapters/`. The auth email templates move to `auth/templates/`, so `mail/` is transport only. `database/` keeps the connection, `data-source.ts`, the naming strategy, the `Timestamped` base, migrations and seed. It also keeps one `entities.ts` registry that imports every module's entities, because the TypeORM CLI needs the full list.
  - **Transactions across modules:** the caller opens `dataSource.transaction(...)` and passes its `EntityManager` to the exported methods, which take an optional last `manager` argument. Onboarding's held-certifications step does this today. No new dependency.
  - **Enforcement:** an ESLint `no-restricted-imports` rule bans `*/entities/*` imports from other modules. Entity files (needed for relations) and the database registry are exempt.
- **Target tree:**
  ```
  src/
    main.ts  setup.ts  app.module.ts
    config/env.ts
    common/    common.module.ts  filters/  exceptions/  middleware/  utils/
    database/  database.module.ts  data-source.ts  entities.ts  timestamped.ts  snake-naming.strategy.ts  migrations/  seed/
    mail/      mail.module.ts  interfaces/mail-sender.ts
    storage/   storage.module.ts  interfaces/object-storage.ts  adapters/s3-storage.ts
    health/    health.module.ts  health.controller.ts  indicators/database.indicator.ts
    users/     users.module.ts  users.service.ts  entities/user.entity.ts  utils/avatar-path.ts
    school/    school.module.ts  school.service.ts  entities/{specialty,school-class}.entity.ts
    certifications/ certifications.{module,controller,service}.ts  user-certifications.service.ts
               dto/  entities/{provider,certification,certification-domain,chapter,user-certification}.entity.ts
    paths/     paths.module.ts  paths.service.ts  entities/{path,path-node}.entity.ts  utils/recommended-path.ts
    auth/      auth.{module,controller,service}.ts  {access-token,password,sessions,login-attempts,email-tokens}.service.ts
               dto/  entities/{session,email-token,login-attempt}.entity.ts  guards/{auth,roles}.guard.ts
               decorators/auth.decorators.ts  utils/{cookies,tokens}.ts  templates/emails.ts
    onboarding/ onboarding.{module,controller,service}.ts  dto/
    avatars/   avatars.{module,controller,service}.ts  dto/  utils/avatar-image.ts
  ```
- **Plan (one PR, no behaviour change):**
  1. Infrastructure: `CommonModule`, then the new folder layout for common, mail, storage and health.
  2. `UsersModule`: move `User` and `avatarPath`, then switch auth, avatars and onboarding to `UsersService`.
  3. `SchoolModule`, `PathsModule` and the certifications entities with `UserCertificationsService`. Onboarding then injects only services.
  4. Auth internals into `dto/`, `entities/`, `guards/`, `decorators/`, `utils/` and `templates/`.
  5. Entity registry, delete `database/entities/`, update the test imports, add the lint rule.
  6. Check: typecheck, lint, all API unit and e2e tests, Playwright. `migration:generate` must produce an empty diff, because tables and columns don't change.
- **Consequences:**
  - The change is a structural refactor: the HTTP API, the schema and the migrations stay the same.
  - Services grow small, intention-named methods (for example `UsersService.setAvatarKey`, `SchoolService.findClassByCode`). Ad-hoc queries in other modules go away.
  - Unit tests can mock a single exported service instead of several repositories.
  - Timing: after the S02 PR merges and before S03, which reworks the catalog, and S05, which adds a users controller.

## Open
- Hosting for staging and production. The target is the AWS 3-tier design in `../docs/AWS-Architecture-V1.drawio`; the work is deferred (see PLAN.md backlog).
- SMTP provider for transactional email in staging and production (the code is ready; see ADR-015)
- Who administers the certification catalog before the staff console exists (seed files vs. a minimal admin page). For now the answer is the seed files in `backend/src/database/seed/data/`.
