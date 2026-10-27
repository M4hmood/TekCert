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

## Note on MVP scope
Declaring certifications and staff review are in Release 2, so in Release 1 points come from chapters only. Certifications imported during onboarding stay “unverified” and earn no points until Release 2.
