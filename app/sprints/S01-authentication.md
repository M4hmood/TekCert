# S01 · Authentication

**Goal:** Students can create an account and sign in with their @tek-up.de email.

**Design reference:** Connexion (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Sign up (first name, last name, institute email, password rules: 8 chars, a number, a symbol, visibility consent)
- [ ] Email domain restricted to @tek-up.de, with inline error state
- [ ] Email verification link (dev: Mailpit; staging: real SMTP)
- [ ] Sign in, “stay signed in”, sign out; httpOnly cookie session (access + refresh tokens)
- [ ] Forgot / reset password (30-minute link, resend timer)
- [ ] Rate limit: 5 attempts then 15-minute lock, with the remaining-attempts message
- [ ] Route guards on web + api; roles column (student, staff, admin) present but only student used

## Done when
- [ ] All Connexion states from the design work: sign-in, error, sign-up, forgot, link sent
- [ ] Passwords hashed with argon2; tokens rotate; e2e test covers sign-up → verify → sign-in

## Out of scope
- SSO
- Admin accounts UI

## Plan

Status: **draft, waiting for approval.** Branch `sprint/S01-authentication`, one PR at the end. The first commit also carries the S00 "CI green on main" checkbox.

### 1. How the session works
- **Access token:** a JWT signed with HS256 (`jose`), valid for 15 minutes. It holds `sub` (user id) and `role`. It travels in the `tc_access` cookie.
- **Refresh token:** an opaque random value (32 bytes). The database stores only its SHA-256 hash, in a new `sessions` table. It travels in the `tc_refresh` cookie, whose path is limited to `/api/auth`, so the browser only sends it to the auth endpoints.
- **Rotation:** every refresh replaces the refresh token. If an old, already-used refresh token is presented again, that suggests theft, so the API revokes the whole session family and both devices must sign in again.
- **"Stay signed in":**
  - checked: the refresh cookie lasts 30 days and slides forward on each refresh
  - unchecked: browser-session cookies, and the session ends after at most 12 hours
- **Cookie flags:** `HttpOnly`, `SameSite=Lax`, and `Secure` everywhere except local dev. Cookies stay first-party because the browser only ever talks to the web origin; the `/api/*` proxy passes `Set-Cookie` headers through.
- **CSRF:** `SameSite=Lax` blocks cross-site POSTs, and the API also checks the `Origin` header on every state-changing request.
- **Secrets:** `JWT_ACCESS_SECRET` (at least 32 characters) is validated at boot and comes from `.env` for now. On AWS it moves to Secrets Manager, as in the diagram.

### 2. Database (TypeORM migration `AddAuth`)
- `users` gains:
  - `password_hash` (argon2id)
  - `email_verified_at`
  - `profile_visible` and `visibility_consented_at` (see Q1)
- New table `sessions`: id, user_id, family_id, token_hash (unique), expires_at, last_used_at, revoked_at, replaced_by_id, user_agent, ip. The device fields are kept for Settings › "On this device" in S07.
- New table `email_tokens`: id, user_id, type (`verify_email` | `reset_password`), token_hash (unique), expires_at, used_at, created_at. Tokens are single-use, and only the hash is stored.
- New table `login_attempts`: email (PK), failed_count, first_failed_at, locked_until. It is keyed by email rather than user, so an unknown address behaves exactly like a known one.

### 3. API (`backend/src/auth`)
| Endpoint | Behaviour |
|---|---|
| `POST /auth/sign-up` | First name, last name, email, password, consent. Validated with shared zod schemas: the email must be `@tek-up.de` (case-insensitive) and the password must have ≥ 8 characters, a number and a symbol (max 128). The email is lowercased. Creates an unverified user and sends the verification email. |
| `POST /auth/verify-email` | `{ token }`: marks the email as verified and signs the user in (sets cookies). Expired or used links return a clear Problem Details error. |
| `POST /auth/resend-verification` | `{ email }`: 60-second cooldown, enforced on the server to match the design's "Resend in 0:58". |
| `POST /auth/sign-in` | `{ email, password, remember }`. A failure returns 401 with an `attemptsLeft` extension. The 5th failure locks the address for 15 minutes; a locked address returns 429 with `retryAfter`. A correct password on an unverified account returns 403 `email-not-verified`. |
| `POST /auth/refresh` | Rotates the refresh token and sets new cookies. |
| `POST /auth/sign-out` | Revokes the session and clears the cookies. |
| `POST /auth/forgot-password` | `{ email }`: always answers 202, so it doesn't reveal whether an account exists. The link is valid for 30 minutes and has the same 60-second resend cooldown. |
| `POST /auth/reset-password` | `{ token, password }`: sets the new password and revokes every session for that user. |
| `GET /auth/me` | The current user: id, names, email, role. |

- **Guards:**
  - A global `AuthGuard` checks the access cookie, and routes opt out with `@Public()`. Public routes are `/health`, the auth endpoints, and the catalog reads (see Q4).
  - A `RolesGuard` with `@Roles()` exists, but only `student` is used this sprint.
- **IP throttling:** `@nestjs/throttler` adds a per-IP limit on `/auth/*` (e.g. 20 requests per minute). It runs on top of the per-account lockout, to slow down guessing across many accounts. Express `trust proxy` is set so the real client IP comes through the proxy.
- **Passwords:** hashed with `@node-rs/argon2` (argon2id with OWASP parameters). I chose it over the `argon2` package because it ships prebuilt binaries, so there's no native build on Windows, in CI or on Amazon Linux.
- **Email:**
  - Nodemailer through `SMTP_URL`, with plain HTML and text templates in English and `MAIL_FROM` as the sender.
  - Links point to `WEB_URL`: `/verify-email?token=…` and `/reset-password?token=…`.
  - Locally, Mailpit runs in Docker Compose (SMTP on :1025, inbox UI at http://localhost:8025).

### 4. Shared contract (`packages/types`)
- `auth.ts` defines the schemas for sign-up, sign-in, forgot, reset, verify, me, and the error extensions.
- The password rules are exported as a list of `{ id, label, test }`. The sign-up form's live checklist ("8 characters / A number / A symbol") and the API validation use the same rules.

### 5. Web (`frontend`)
- **Pages** follow the Connexion design: a hero panel on the left with the badge wall (desktop only) and the form card on the right.
  - `/sign-in` and `/sign-up` are tabs, and each has its own URL.
  - `/forgot-password` has two states: the form, then "Check your inbox" with the resend countdown.
  - Sign-up also ends on "Check your inbox", with the countdown.
  - `/verify-email` and `/reset-password` are not in the designs. I'll build them from the same card and copy style.
- **States to cover:**
  - inline error for a non-@tek-up.de address
  - "Incorrect email or password. You have N attempts left before a 15-minute lockout."
  - locked: "Too many attempts. Try again in 15 minutes." (new copy)
  - unverified account, with a "Resend link" action
  - expired or used link
  - success
- **Badge wall:** the design uses 18 badge images. I'll copy them into `frontend/public/badges/` with the naming planned for S03, so S03 reuses them.
- **Hero stat:** the design says "142 certifications verified this semester", but Release 1 has no verified certifications. See Q6.
- **Route guards:**
  - Next 16 `proxy.ts` sends visitors without a session from shell routes and `/onboarding` to `/sign-in?next=…`.
  - When only the refresh cookie is left, it refreshes silently on the server and sets the new cookies before the page renders.
  - Signed-in users who open `/sign-in` or `/sign-up` go to `/dashboard`. After S02 that becomes onboarding.
- **Current user:** the shell layout loads it with `GET /auth/me`, forwarding the cookies. The sidebar account card shows the real name and email (the class arrives in S02).
- **Sign out:** a "Sign out · On this device" row in Settings, as in the design. BottomNav has no Settings tab, so the Profile placeholder gets a link to Settings for mobile users.
- **Client requests:** a small fetch helper calls `/api/auth/refresh` and retries once when it gets a 401.

### 6. Tests
- **Jest unit:**
  - password rules and the email domain check
  - token hashing and expiry
  - lockout counter: 5 failures → locked, reset after a successful sign-in, expiry after 15 minutes (with a fake clock)
  - refresh rotation and reuse detection
- **Jest API e2e** (test database plus an in-memory mail transport that captures messages):
  - sign-up → the email contains a link → verify → cookies are set → `/auth/me`
  - wrong password → `attemptsLeft` counts down → lockout
  - an unverified account cannot sign in
  - refresh rotates the token, and reusing an old one kills the session family
  - forgot → reset → old sessions are revoked
  - an expired reset link fails
  - protected routes return 401 without a session
- **Vitest:** the live password checklist, inline domain error, tab switching, the resend countdown, and the refresh-and-retry helper.
- **Playwright (Done-when):** sign-up → read the email from Mailpit's API → open the verify link → sign out → sign in → land on the dashboard. Also: a protected URL redirects to sign-in and comes back after login. The existing shell smoke tests run signed in.
- **CI:** adds a Mailpit service container and the new environment variables.

### 7. Docs
- **ADRs:**
  - ADR-013: session model (JWT access + rotating refresh, cookie scopes, CSRF)
  - ADR-014: argon2id via `@node-rs/argon2`
  - ADR-015: email (Nodemailer, Mailpit in dev)
- **README:** Mailpit and the new environment variables.
- **Backlog:**
  - a job to clean up expired sessions and tokens
  - choosing the SMTP provider for staging (already an open decision)

### Order of work
1. Shared schemas + migration + entities
2. Password hashing, tokens, sessions, email service, auth endpoints, guards, throttling + Jest tests
3. Web pages and states, `proxy.ts` guard, current user in the shell, sign out + Vitest
4. Mailpit in Compose and CI, Playwright auth flow, signed-in smoke tests
5. ADRs, README, checklist

### Questions
1. **Visibility consent at sign-up.** The design shows it pre-ticked: "my name, class and certifications are visible to TEK-UP students. You can change this at any time." Should it be:
   - (a) optional and unticked by default, where unticked means a private profile **(Recommended: consent shouldn't be pre-ticked, and the text itself says it can be changed later)**
   - (b) required to create an account
   - (c) optional but pre-ticked, as in the design
2. **Verification link lifetime.** I suggest 24 hours. Reset links stay at 30 minutes, as the sprint file says.
3. **Session lengths.** OK with "stay signed in" = 30 days (sliding) and unticked = a browser session capped at 12 hours?
4. **Catalog API.** Should `GET /certifications` stay public? It's read-only with no personal data, and the sign-in hero and the S08 Landing page need it. Every screen in the app itself still requires sign-in.
5. **Signing up with an email that already exists.** Show "An account already exists for this address. Sign in or reset your password" **(Recommended: addresses follow the guessable `firstname.lastname@tek-up.de` pattern, so hiding it protects little)**, or show the generic "check your inbox" and email the owner instead?
6. **Hero stat.** Replace "142 certifications verified by TEK-UP students this semester" with a live "44 certifications funded by the institute" until verified certifications exist (Release 2)?

## Notes / decisions
