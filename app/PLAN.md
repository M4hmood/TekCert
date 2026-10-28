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
- Staging on AWS, moved out of S00: Terraform for the 3-tier design in `../docs/AWS-Architecture-V1.drawio`, a one-command deploy and destroy, and a staging URL. The deploy bundles (`pnpm bundle`) and health checks are ready.
- Staff review of the drafted catalog data: chapters, levels, difficulty, specialties and the 7 paths (`backend/src/database/seed/data/`). Also confirm that retired vendor certs (LFCE, CHSA, MCSA, AAD, EX180) are still funded.
- Add the certifications the designs use outside the funded 44 (CompTIA, Google Cloud, SAP-C02, AI-102, AZ-305, DP-900/100, SC-900, SCS-C02, MLA-C01), if the institute funds them.
- Upgrade to NestJS 12 once `nestjs-zod` supports it, and to ESLint 10 once `eslint-config-next` does (ADR-004).
- Clean up expired rows in `sessions`, `email_tokens` and `login_attempts` (a scheduled job).
- Move the per-IP auth rate limit to a shared store (e.g. Redis) once the API runs on several instances.
- Subset the Material Symbols font to the icons actually used (it is about 3 MB today). Fits with the S08 performance pass.

## Note on MVP scope
Declaring certifications and staff review are in Release 2, so in Release 1 points come from chapters only. Certifications imported during onboarding stay “unverified” and earn no points until Release 2.
