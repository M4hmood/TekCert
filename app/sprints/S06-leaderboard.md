# S06 · Leaderboard

**Goal:** Ranked views by scope and period.

**Design reference:** Classement (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Students and Specialties views
- [ ] Scopes (class, specialty, institute) and periods (month, semester, all time)
- [ ] Pinned “you” row on mobile, position change indicator
- [ ] “Hide my name” → shown as Anonymous
- [ ] Query strategy: SQL view or materialized view refreshed on point events

## Done when
- [ ] Leaderboard numbers match the points ledger exactly
- [ ] p95 response under 300 ms with 1,000 seeded students

## Out of scope
- Points from verified certs (Release 2)

## Plan
_Written 2026-11-11, ahead of time at your request. Building starts only after S05 is finished and this plan is approved._

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
