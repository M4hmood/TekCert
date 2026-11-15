# S08 · Hardening + pilot

**Goal:** Ready for a pilot with one class.

**Design reference:** Landing (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Accessibility pass (keyboard, focus, contrast, 44 px targets)
- [x] Performance: image optimisation, caching, bundle size (downloads cut from about 5 MB to under 1.1 MB; the Lighthouse Performance budget is not met yet, see the outcome)
- [x] Playwright e2e for every MVP flow; seed realistic pilot data
- [x] Error monitoring + uptime check; backups for Postgres (in place; Sentry needs an account and the uptime monitor a public address)
- [x] Landing page (public) with the certifications showcase

## Done when
- [x] All e2e tests green on staging: on the production builds, as decided (decision 1). Staging is the next piece of work
- [x] A pilot class can sign up and use every MVP screen (on the production builds)

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

### Decisions from review (2026-11-14)
The plan was approved with all six recommendations:
1. S08 runs on the production builds locally; staging on AWS is its own piece of work right after.
2. The landing page shows totals only, the real catalog and paths, and no student's name.
3. Sentry for errors, on the API and in the browser, off until `SENTRY_DSN` is set, with personal data stripped.
4. `/status` for uptime, backup and restore scripts with a restore check, and a runbook.
5. A separate pilot seed of invented students, which refuses production.
6. Budgets: Lighthouse Performance 90 and Accessibility 100 on three pages, no axe violation, 44 px tap areas.

### Outcome (2026-11-15)
Tests:
- types: 174 (Vitest), 13 new
- backend: 101 unit + 151 API e2e (Jest), 17 and 13 new
- frontend: 207 (Vitest), 18 new
- Playwright: 117 runs at 1440 and 390 px, all passing, 18 skipped by design; about 30 new runs (axe on every screen in both themes, tap areas, keyboard on notifications and settings, the landing page and the status check)
- Visual baseline: retaken for every screen (84 captures across 4 projects, 17 skipped by design) and compared again with no difference. New: the landing page and its provider rail
- `pnpm db:backup:check` restores a dump of the dev database and finds the same rows in all 23 tables

Lint, typecheck, format check and build pass. No migration.

**Accessibility.** axe (WCAG 2.1 A and AA) finds no violation on any screen, in light or dark, at either size. It found links named differently from what they show (the logo links, the directory and dashboard cards), now named by their visible text. Lighthouse Accessibility is 100 on the landing page, the catalog and the dashboard. Every control is at least 44 × 44 px on a phone, measured by a test: chips, segments and small links keep their look and get an invisible tap area (`tap-target`).

**Bug found on the way:** a dialog opened from state (the year prompt, opened from Settings › Enrolment) gave the focus back to the page instead of the button that opened it. The element to return to is now read when the dialog opens.

**Downloads** on a first visit, compressed (`pnpm --filter e2e test:perf`):

| Screen | Before | After |
|---|---|---|
| Landing | 5.9 MB | 1.0 MB |
| Sign in | 5.6 MB | 1.0 MB |
| Dashboard | 5.1 MB | 0.84 MB |
| Catalog | 5.3 MB | 0.82 MB |
| Notifications / Settings | 5.0 MB | 0.69 MB |

The icon font went from 4 MB to 88 kB (112 icons), the logo from 182 kB to a 96 px PNG and a 35 kB WebP, and the five heaviest badges to WebP (386 kB SVG, 130–150 kB PNGs, now about 20 kB each).

**Lighthouse Performance is not met.** On a phone profile: landing 36 (63 once the splash has played), catalog 55, dashboard 61, against 90. The scripts are the main cost: zod is on every page (about 105 kB compressed, 0.9 s of main thread under Lighthouse's throttling) because the browser checks API answers and forms with the shared schemas. The headings also wait for the serif font. This machine scores about 1,000–1,300 on Lighthouse's CPU benchmark, which lowers every number. Fixing it means changing how the browser validates answers, which is beyond this sprint: the options are in PLAN.md › Backlog.

**MVP flows and the tests that cover them** (Playwright):

| Flow | Test |
|---|---|
| Landing page, then sign up | `landing.spec.ts` |
| Sign up, verify the email, sign out, sign in; forgot password; lockout | `auth.spec.ts` |
| Onboarding, ING-4 and ING-3, resume after reload | `onboarding.spec.ts` |
| Catalog, filters, search, paging, certification page, Start | `catalog.spec.ts` |
| Tick chapters, points, levels, badges, dashboard | `progress.spec.ts` |
| Directory, profiles, "Available to help" | `community.spec.ts` |
| Leaderboard, Anonymous, specialties | `leaderboard.spec.ts` |
| Notifications, emails, filters, read | `notifications.spec.ts` |
| Settings, theme across devices, year prompt, alumni | `settings.spec.ts` |
| Navigation on both sizes, theme, not found | `shell.spec.ts` |
| Keyboard on every interactive screen | `keyboard.spec.ts` |
| Accessibility and tap areas | `accessibility.spec.ts` |

`E2E_BASE_URL` runs the same suite against a deployed address, without starting servers.

Where the build differs from the plan or the design:
- **The landing page's numbers** are students preparing, students on TekCert and certifications in the catalog. The design's "certifications verified this semester", named activity ("Ons earned AZ-900") and "Earned by specialty" are Release 2 or would name students. "Find help" shows what "Who to ask" lists, without people.
- **Step III** reads "Find who can help" instead of "Pass the exam, get it verified".
- **Provider cards** show the badges TekCert has; providers without official badge files show code tiles. The design's Google Developers card is left out (not funded).
- **Arrow keys on the theme cards**: Radix moves the focus a moment after the key goes down, so the test holds the key as a person would. Real use was not affected.
- **The visual setup** has a student who left TekCert, so that no two students tie on the boards (ties are ordered by random ids).
- **No Sentry account and no uptime monitor** are connected: both need an address and an account you choose.

Left for a person: the screen-reader check, with `docs/screen-reader-check.md`.
