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
_(Claude Code writes the plan here, then waits for approval.)_

## Notes / decisions
