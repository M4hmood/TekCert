# TekCert · Build plan

Solo developer + Claude Code · 1-week sprints · English only at launch · email + password sign-in.

## How we work
- One sprint at a time. Each sprint is a vertical slice: database → API → UI → tests.
- Every sprint ends deployable to staging, with CI green.
- Claude Code plans first, waits for approval, then builds in small commits on a sprint branch (sprint/S0X-name).
- Anything not in the sprint file is out of scope. New ideas go to the backlog below.

## Release 1 (MVP)
| Sprint | Name | Goal |
|---|---|---|
| S00 | Foundations | A running, empty, deployable skeleton. No product features. |
| S01 | Authentication | Students can create an account and sign in with their @tek-up.de email. |
| S02 | Onboarding + profile basics | A new student finishes onboarding and lands on a recommended path. |
| S03 | Catalog + certification page | Students browse every funded certification and open its page. |
| S03b | Tailwind + shadcn migration | The frontend is styled with Tailwind and shadcn/ui, and still matches /design. |
| S04 | Progress, points + dashboard | Ticking chapters earns points and the dashboard reflects it. |
| S05 | Community directory + profiles | Students find classmates who hold or are preparing a certification. |
| S06 | Leaderboard | Ranked views by scope and period. |
| S07 | Notifications + settings | Students get notified and control their account. |
| S08 | Hardening + pilot | Ready for a pilot with one class. |

## Release 2 (backlog)
- Declare a certification + proof upload (Declarer-certification)
- Staff review console for proofs (design needed first)
- Exam requests + vouchers (Demande-passage)
- Practice tests (Test-blanc)
- Paths graph + follow paths (Parcours)
- Points from verified certifications and practice tests
- French + Arabic (RTL) interface (Design-System)

## Backlog (from Sprint 0)
- **Next, after S08 (decision 2026-11-14):** staging on AWS, moved out of S00. Terraform for the 3-tier design in `../docs/AWS-Architecture-V1.drawio` (RDS with 7-day backups and point-in-time restore, secrets, the avatar bucket), a one-command deploy and destroy, and a staging URL. Then: run the browser suite against it (`E2E_BASE_URL`), point an uptime monitor at `/status`, set `SENTRY_DSN`, and pick an SMTP provider. The deploy bundles (`pnpm bundle`) and health checks are ready.
- Staff review of the drafted catalog data: chapters, levels, difficulty, specialties and the 7 paths (`backend/src/database/seed/data/`). Also confirm that retired vendor certs (LFCE, CHSA, MCSA, the Cisco R&S track) are still funded.
- Add the certifications the designs use outside the funded catalog (CompTIA, AI-102, AZ-305, DP-900/100, SC-900, SCS-C02, MLA-C01), if the institute funds them. Google certs are excluded: TEK-UP does not support them.
- Find official badge images for the certs that have none yet (31 of the 56; see `badgeAsset: null` in the seed). Drop them in `frontend/public/badges/` and set the file name in the seed.
- Upgrade to NestJS 12 once `nestjs-zod` supports it, and to ESLint 10 once `eslint-config-next` does (ADR-004).
- Staff review of the drafted certification page content (S03): summaries, exam facts and resource links in `backend/src/database/seed/data/certification-details.ts`. Most summaries and exam facts were written from general knowledge, so check them against each vendor's page. These links block automated checks or weren't confirmed and need a manual look: the Oracle exam pages and Live SQL, the Huawei Talent portal, edube.org, the Cisco certifications hub, docs.ansible.com, and the Red Hat developer, EX294 and certifications hub pages.
- "Stop preparing" a certification (S03 only has Start; S04 didn't add it). Decide what happens to the ticked chapters and their points first. Fits with S07 settings.
- Header search across the app (design/Tableau-de-bord). S05 built the directory's own search instead; decide what a global search covers first.
- A trigram index for the directory's name search if it gets slow (ADR-021).
- Hidden points can still be estimated from the "Preparing" percentages while chapters are the only source of points (ADR-021). Decide whether a student who hides their name also hides their percentages.
- The profile's back link always goes to the directory. The design returns to where the student came from ("Community · SAA-C03").
- A per-student, per-month points summary (or a materialized view) once the ledger passes a few million rows: the all-time leaderboard scans every row (ADR-022).
- Rank history: the leaderboard's "change" only compares with a week ago, and there are no rank charts.
- Move the per-IP auth rate limit to a shared store (e.g. Redis) once the API runs on several instances.
- Notifications for the Release 2 features: exam requests, verified certifications, answers to questions and exam sessions, each with its row in Settings › Notifications (ADR-023).
- Retry a notification email that failed to send; today it is logged and the notification stays in the app (ADR-023).
- A link in notification emails that turns a category off without signing in.
- An email or notification on 1 September asking students to confirm their year; today the prompt waits for their next visit.
- Show new notifications without a click: the unread count is read again on each navigation only (ADR-023).
- Change the email address or the password from Settings, and delete the account.
- Move the weekly leaderboard run out of the API process (one scheduled task) once the API runs on several instances; today each instance runs it and the dedupe key keeps one result (ADR-023).
- Done in S08, kept here for the record: `keepalive` on saves, the nightly clean-up of auth rows and old notifications, the icon font subset.
- Lighthouse Performance on a phone profile is 36 to 63 against a budget of 90 (S08). The two big costs: zod is in every page's scripts (about 105 kB compressed, 0.9 s of main thread when throttled), because the browser parses API answers and validates forms with the shared schemas; and the serif font files (about 280 kB for Newsreader normal and italic, which the headings wait for). Options: parse answers only in development and keep zod for forms on the pages that have one, or move to `zod/mini`; preload the main font with `next/font/local`, or use the lighter `wght` Newsreader files (a small change of look). Measure on a quieter machine too: this one scores about 1,000 to 1,300 on Lighthouse's CPU benchmark.
- Screen-reader check by a person, with `docs/screen-reader-check.md` (open since S03b).
- Official badge images for the providers the landing page shows as code tiles.

## Decision: every profile is visible (2026-10-29)
Students must accept profile visibility to sign up, and can't make their profile private afterwards (replaces S01 decision 1; built in S02). Impact on later sprints:
- S05: drop the "private profile" state. The API rule becomes "signed-in students only", and visitors still see nothing.
- S07: Settings › Privacy loses the profile-visibility switch. The leaderboard opt-out stays.

## Note on MVP scope
Declaring certifications and staff review are in Release 2, so in Release 1 points come from chapters only. Certifications imported during onboarding stay “unverified” and earn no points until Release 2.
