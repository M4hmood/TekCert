# S06 · Leaderboard

**Goal:** Ranked views by scope and period.

**Design reference:** Classement (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Students and Specialties views
- [x] Scopes (class, specialty, institute) and periods (month, semester, all time)
- [x] Pinned “you” row on mobile, position change indicator
- [x] “Hide my name” → shown as Anonymous
- [x] Query strategy: decided against a view; one grouped query on the ledger per request (ADR-022)

## Done when
- [x] Leaderboard numbers match the points ledger exactly
- [x] p95 response under 300 ms with 1,000 seeded students (110 ms on the slowest board)

## Out of scope
- Points from verified certs (Release 2)

## Plan
_Written 2026-11-11 and approved the same day; built after S05. See the outcome under "Notes / decisions"._

Branch `sprint/S06-leaderboard`, cut once S05 is done.

### Decisions I need from you
Each one has my recommendation first.

1. **Query strategy.** The checklist asks for a SQL view or a materialized view.
   **Recommended:** neither. One grouped query on `point_events` per request, ranked in a pure function.
   - It always matches the ledger exactly, with nothing to refresh.
   - 1,000 students is a small aggregate. I'll measure p95 with 1,000 seeded students and write the number here.
   - If it misses 300 ms, the fallback is a materialized view refreshed after each tick.
2. **Periods.** Month is the current calendar month in Africa/Tunis.
   **Recommended for semester:** Semester 1 is 1 September to 31 January, Semester 2 is 1 February to 31 August. Tell me the real dates if they differ.
3. **"Change" column.** There are no rank snapshots.
   **Recommended:** places gained or lost over the last 7 days, computed from the ledger. The mobile line reads "↑ 3 places this week".
4. **"Verified" column.** Nothing is verified in Release 1.
   **Recommended:** replace it with "Chapters" (finished in the period). The subtitle becomes "Points come from finished chapters", and the Scoring card lists only "+10 per chapter" with a note that certifications and practice tests come later.
5. **Where "Hide my name" is switched.** Settings is S07.
   **Recommended:** a second switch on the student's own profile, next to "Available to help" from S05. The link on the leaderboard goes there, as in the design.

### Rules
- Ranked: students with a verified email who finished onboarding, in the chosen scope. Ties share a rank (1, 1, 3). "of N" counts everyone in the scope.
- A student who hides their name stays ranked as "Anonymous": no name, photo, class, id or profile link. They still see "You" on their own row.
- Specialties view: average points per student, all years. ING-1 to 3 count under their target specialty; undecided students are left out.

### Database
No new tables. One index on `point_events (created_at, user_id)` if the measurement asks for it.

### API
A new `leaderboard/` module with no entities (ADR-017).
- `GET /leaderboard/students?scope=class|specialty|institute&period=month|semester|all`
  - The top 20, then the viewer's row with two neighbours on each side when they are further down.
  - Each row: rank, change, points, chapters, and the person (or Anonymous).
  - `me`: rank, of N, points, change, the gap to the student above, and the certification to continue.
- `GET /leaderboard/specialties?period=…`: code, students, average, and which one is mine.
- `PATCH /me/profile` gains `leaderboardVisible`.

### Frontend
- `/leaderboard`: Students and Specialties tabs, scope tabs, period select, the table with medals for the top 3, the "···" gap, my highlighted row, the "Your position" card and the Scoring card.
- Mobile: scope tabs, list rows, and my row pinned above the tab bar.
- States: loading, error, and "No points yet this month". 1440 and 390 px, light and dark.

### Tests
- **Unit:** ranking with ties, the window around the viewer, period boundaries in Africa/Tunis, the 7-day change.
- **API e2e:** every row equals `SUM(delta)` from the ledger for each scope and period; Anonymous rows leak nothing; unticking lowers the total.
- **Performance:** a script seeds 1,000 students and their events, then measures p95 over 200 requests per board. The result goes in this file.
- **web and Playwright:** tabs, scopes and periods; hide my name and see "Anonymous" from a classmate's account; the pinned row on mobile. New visual screens.

### Not in this sprint
- Points from verified certifications and practice tests (Release 2).
- Rank snapshots or history charts.

## Notes / decisions

### Decisions from review (2026-11-11)
The plan was approved with all five recommendations:
1. No SQL view or materialized view: one grouped query on the ledger per request, measured with 1,000 students.
2. Semester 1 is 1 September to 31 January, Semester 2 is 1 February to 31 August.
3. "Change" is the places gained or lost over the last 7 days, computed from the ledger.
4. The "Verified" column becomes "Chapters"; Scoring lists only "+10 per chapter".
5. "Hide my name" is a second switch on the student's own profile.

### Outcome (2026-11-12)
Tests:
- types: 134 (Vitest)
- backend: 73 unit + 108 API e2e (Jest), 9 of the API tests new for the leaderboards
- frontend: 130 (Vitest)
- Playwright: 80 passing at 1440 and 390 px, 17 skipped by design; 6 new runs for the leaderboard
- Visual baseline: retaken for every screen (68 captures across 4 projects, 17 skipped by design) and compared again with no difference. It now includes the leaderboard (default, class over all time, specialties). The other test students got names of their own, because lists order by name and identical names fell back on random ids; a run that straddles midnight still differs on the dashboard date.

**Performance ("Done when"):** with 1,000 seeded students and 100,000 ledger rows, 100 requests per board:

| Board | p50 | p95 |
|---|---|---|
| Students · class · month / semester / all time | 45 / 55 / 73 ms | 74 / 83 / 110 ms |
| Students · specialty · month / semester / all time | 42 / 45 / 51 ms | 66 / 81 / 74 ms |
| Students · institute · month / semester / all time | 42 / 47 / 59 ms | 62 / 78 / 101 ms |
| Specialties · month / semester / all time | 30 / 35 / 55 ms | 42 / 50 / 101 ms |

The budget is 300 ms. Run it again with `pnpm --filter backend test:perf` (it rebuilds the `tekcert_perf` database).

**Numbers match the ledger ("Done when"):** the API tests compare every row with `SUM(delta)` from `point_events`, for each period and after an untick.

Lint, typecheck and build pass. No migration: the sprint adds no table and no index. Screens checked at 1440 and 390 px, light and dark, against design/Classement.

Where the build differs from the plan or the design:
- **The first measurement missed the budget** (p95 about 500 ms on the institute board). The ledger query took about 35 ms; building 1,000 user entities with their relations took about 200 ms. The boards now read students as plain rows.
- **"Change" is empty for a student who had no points a week ago.** Comparing with a week where everyone was at zero (all tied for first) showed a fall for every newcomer.
- **A period's points can be negative** when a chapter from an earlier month is unticked. The board shows the ledger's sum as it is.
- **Phones** show the view switch, the scope tabs, the period and the list, with my row pinned above the tab bar. The "Your position" and "Scoring" cards are desktop only, as in the design.
- **Empty states** aren't in the design: "No points yet in November 2026" when nobody has points in the period.
- **The test ports can move.** After a restart Windows had reserved a port range that includes 4010, so the API couldn't start. `E2E_API_PORT=4510 pnpm --filter e2e test:e2e` runs it elsewhere.
- **Playwright starts from a clean set of students**, like the API tests since S05: boards and lists filled up with students of earlier runs.

Backlog added to PLAN.md: a per-month summary table if the ledger grows past a few million rows, and rank history.
