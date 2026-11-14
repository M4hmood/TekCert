# S08 · Hardening + pilot

**Goal:** Ready for a pilot with one class.

**Design reference:** Landing (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Accessibility pass (keyboard, focus, contrast, 44 px targets)
- [ ] Performance: image optimisation, caching, bundle size
- [ ] Playwright e2e for every MVP flow; seed realistic pilot data
- [ ] Error monitoring + uptime check; backups for Postgres
- [ ] Landing page (public) with the certifications showcase

## Done when
- [ ] All e2e tests green on staging
- [ ] A pilot class can sign up and use every MVP screen

## Plan
_Written 2026-11-14 and approved the same day with the six recommendations. See the outcome under "Notes / decisions"._

Branch `sprint/S08-hardening-pilot`, stacked on `sprint/S07-notifications-settings` until that PR merges. One PR at the end.

### Decisions I need from you
Each one has my recommendation first.

1. **Staging.** "Done when" asks for the tests green on staging, and there is no staging yet: `infra/` has the network, the load balancers and the instance groups, but no database, no deploy step and no URL (PLAN.md backlog).
   **Recommended:** keep this sprint on the production builds run locally, as every sprint since S00, and make staging its own piece of work after it. "Done when" becomes: every test green against the production builds, and a pilot class can use every screen on them. The checklist says so plainly.
   The other choice is to pull the AWS staging work into this sprint. That is Terraform for the database, secrets, storage and deploys, on your team's AWS account, and it is larger than everything else here together.
2. **What the public landing page shows.** The design shows live numbers, named students ("Ons earned AZ-900, 2 h ago"), verified certifications and certifications TEK-UP doesn't fund (Google, CompTIA).
   **Recommended:**
   - No student names on a public page. Profiles are for signed-in students only (decision of 2026-10-29).
   - Three numbers, all real and all totals: certifications in the catalog, students on TekCert, students preparing one. "Earned by specialty" becomes "Preparing by specialty".
   - The showcase and the paths come from the real catalog (56 certifications, 10 providers, 7 paths).
   - Step III reads "Find who can help" instead of "Pass the exam, get it verified", which is Release 2.
   - `/` shows the landing page to visitors and still sends signed-in students to their dashboard.
3. **Error monitoring.** **Recommended:** Sentry, for the web app and the API, switched on only when a `SENTRY_DSN` is set, and with names and emails stripped before anything is sent. It needs a free Sentry account from you; until then the code is in place and off.
   The other choice is no outside service: the API already logs every error with a request id, and alerts would come from AWS with staging.
4. **Uptime check and backups, before staging exists.** **Recommended for this sprint:**
   - One URL that answers for both tiers: `/healthz` on the web app also checks that the API and its database answer. Any uptime service can watch it once there is a public address.
   - `pnpm db:backup` and `pnpm db:restore` for the Postgres we run today, with a test that restores a backup into an empty database and compares it.
   - A short runbook: what to watch, how to restore, and the settings to give the AWS database when staging is built (daily backups kept 7 days, point-in-time restore).
5. **Pilot data.** **Recommended:** a separate `pnpm db:seed:pilot` that fills a database with about 60 invented students in a few classes, with several weeks of progress, so every screen has something to show in a demo. They can't sign in, apart from one demo account whose password comes from an environment variable. It refuses to run when `NODE_ENV` is production: the real pilot class signs up by itself.
6. **Budgets for performance and accessibility.** **Recommended:**
   - Lighthouse on a phone profile, against the production build: Performance 90 or more and Accessibility 100 on the landing page, the catalog and the dashboard.
   - No WCAG 2.1 AA violation found by axe on any screen, in light and dark, checked in Playwright.
   - Touch targets of 44 px: where the design draws a smaller control (filter segments at 38 px, chips at 36 px), the control keeps its size and its tap area grows invisibly, as the switches already do.

### What gets built
**Accessibility**
- An axe check in Playwright on every screen and state, at 1440 and 390 px, light and dark. New dev dependency: `@axe-core/playwright`.
- Keyboard: every flow done without a mouse (extend `keyboard.spec.ts` to notifications, settings and the year prompt); visible focus everywhere; focus returns after dialogs and sheets.
- Contrast: fix whatever axe reports on the tokens, in `packages/ui`, without changing the look beyond the fix.
- 44 px tap areas, tested by measuring them.
- The screen-reader item left open in S03b needs a person listening with NVDA or VoiceOver. I'll write the script of what to check; I can't do the listening.

**Performance**
- The icon font: about 3 MB today for 39 icons. Subset it to the icons used (backlog item).
- Images: the badge images go through `next/image` with fixed sizes; the largest files (a 386 KB SVG, PNGs over 130 KB) are re-exported.
- Caching: long-lived for hashed assets and badges, a short public cache with revalidation on the public catalog API, none on anything personal.
- Bundle: measure each route's first load, and split what only one screen needs (the photo cropper, the year prompt).
- A tick or a setting still being saved when the student leaves the page is sent with `keepalive` (backlog item).
- The numbers before and after go in this file.

**End-to-end tests and pilot data**
- A table in this file: each MVP flow and the test that covers it. Gaps I expect to fill: the landing page, the session renewing itself after 15 minutes, and the error screens.
- `E2E_BASE_URL` lets the same suite run against a deployed address later (without the tests that read emails from Mailpit).
- The pilot seed of decision 5.

**Operations**
- Sentry behind `SENTRY_DSN` (decision 3), the deep health check, the backup scripts and the runbook (decision 4).
- A daily job that deletes expired sessions, email tokens, login attempts and notifications older than 90 days (backlog items; the scheduler is there since S07).

**Landing page** (design/Landing)
- Public, server-rendered, at `/`: navigation, hero with the sign-up button, the three numbers, the certifications showcase by provider, the three steps, the paths, and the footer.
- A public API route for the three numbers and the per-specialty counts: totals only, nothing about any one student.
- 1440 and 390 px, light and dark, with loading and error states. New visual screens.

### Not in this sprint
- Staging on AWS, an uptime service and the database backups in the cloud, unless you choose otherwise in decision 1.
- Anything from Release 2 that the landing design shows: verified certifications, exam sessions, named activity.
- French and Arabic.

## Notes / decisions
