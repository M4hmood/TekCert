# S05 · Community directory + profiles

**Goal:** Students find classmates who hold or are preparing a certification.

**Design reference:** Communaute, Profil (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Scope switcher: my class, my specialty, my year, whole institute
- [x] Search by name or certification, filters (certification held, available to help)
- [x] Student profile: my view, another student (the private profile state was dropped on 2026-10-29)
- [x] Copy email / open mail client
- [x] Privacy rules enforced in the API, not only in the UI

## Done when
- [x] A private profile never appears in any API response to other students (now: a student who hasn't verified or finished onboarding never appears, and visitors get nothing)
- [x] Community + Profile states match the design

## Out of scope
- Messaging inside the app

## Plan
_Written 2026-11-11. Approved the same day; see the outcome under "Notes / decisions"._

Branch `sprint/S05-community-directory-profiles`, stacked on the S04 branch until PR #11 merges.

### What already exists
- "Who to ask" on the certification page (S03): scopes, the privacy rules (verified email, onboarding finished) and `UsersService.findCommunityMembers`.
- Levels, badges, points and the activity feed (S04). `/profile` already shows the level and badges blocks.
- Every profile is visible to signed-in students (decision of 2026-10-29), so the "private profile" state is dropped: no lock card in the directory, no "This profile is private" screen.

### Decisions I need from you
Each one has my recommendation first.

1. **Where "Available to help" is switched on.** The directory filters on it, but Settings is S07.
   **Recommended:** a switch on the student's own profile now; S07 also shows it in Settings.
   Otherwise the filter ships with nobody able to turn it on.
2. **Scopes.** The sprint lists four (class, specialty, year, institute); the design draws three.
   **Recommended:** four, the same as "Who to ask", so both screens behave alike.
3. **Points of students who hide their name on the leaderboard.** If the directory and their profile show exact points, anyone can match them to the "Anonymous" row.
   **Recommended:** for those students, other people see the level but not the points.
4. **Profile content that doesn't exist in Release 1.** Nothing is verified yet, and practice tests and "follow a path" are Release 2.
   **Recommended:**
   - Stats strip: Unverified, Preparing, Chapters done, Badges (instead of Verified and Practice tests passed).
   - "Followed paths" becomes "Path": the student's own path (specialty, target specialty or Fundamentals) with held/total.
   - Collection cards all carry the Unverified chip, with "Declared at onboarding".
5. **"Edit profile".** Photo, class and privacy are edited in Settings (S07).
   **Recommended:** the button links to `/settings`; nothing new to edit in S05 besides the switch in point 1.

### Database
One migration: `users.available_to_help boolean NOT NULL DEFAULT false`. No new tables.

### API
A new `community/` module with no entities. It reads through the services of `users`, `certifications`, `progress` and `paths` (ADR-017).

- `GET /community/students`: the directory.
  - Query: `scope` (class, specialty, year, institute; default specialty), `q` (2 to 60 characters), `holds` (certification slug), `help` (true), `specialty` (code or `none`, for the chips), `page`.
  - Search matches the full name, or the code or name of a certification the student holds or prepares.
  - 24 per page, ordered by name with the viewer first. Returns `total`, the items, and the specialty counts for the chips.
  - Each item: id, name, photo, class, year, specialty, available to help, up to 3 held and 1 in-progress certification codes, earned and in-progress counts, level, points (null per decision 3), and `isMe`.
- `GET /community/students/:id`: a profile. `GET /me/profile`: mine, same shape plus the privacy flags.
  - Header: name, photo, class, specialty or target specialty, email, level.
  - Collection, Preparing (percentage only for other students, as in S04), path, badges, the last 5 activity lines.
- `PATCH /me/profile`: `{ availableToHelp }`.

**Privacy, enforced in the API:**
- Signed-in students only; 401 otherwise.
- Only students with a verified email and finished onboarding are listed or opened. Anyone else is a 404, the same as an unknown id.
- No response carries which chapters someone ticked, their consent dates, their role or anything from sessions.
- Search input is escaped (`%` and `_`), and results never depend on fields the viewer can't see.

### Frontend
- `/community`: header with the scope switcher, search, "Holds …" select and "Available to help" toggle, specialty chips on the institute scope, the count line with "Clear filters", a 3-column card grid, "Show more", and the "Nobody matches" empty state. Filters live in the URL, like the catalog.
- Mobile: list rows with a chevron, search, and a filter sheet with its active count.
- `/community/[id]`: another student's profile, with "Write to {first name}" (mailto) and copy email with the "Email copied" toast. Community stays active in the navigation.
- `/profile`: my view, replacing the S04 placeholder: same layout, the "Visible to students" and leaderboard chips, the switch from decision 1, and "Edit profile".
- Names in "Who to ask" and in the classmates feed become links to the profile.
- States: loading skeletons, error, empty, and a not-found page for a profile that can't be opened. 1440 and 390 px, light and dark.

### Tests
- **types:** query and response schemas.
- **API e2e:** each scope, search by name and by certification, each filter, paging, the specialty counts, and a privacy matrix (signed out, unverified, not onboarded, hidden-on-leaderboard points, no chapter ids in any response).
- **web (Vitest):** directory filters and empty state, the profile variants, copy email.
- **Playwright:** find a classmate by certification, open the profile, copy the email; switch on "Available to help" and find myself under the filter. New visual screens for both pages.

### Order of work
1. Types and the migration.
2. API with its e2e tests.
3. Directory page, then profile pages.
4. Links from "Who to ask" and the feed, Playwright, visual screens.
5. ADR-021, checklist, summary, PR.

### Not in this sprint
- Messaging (out of scope), header search across the app, following several paths, verified certifications.
- Name search stays a simple `ILIKE`; a trigram index goes to the backlog if the directory gets slow.

## Notes / decisions

### Decisions from review (2026-11-11)
The plan was approved with all five recommendations:
1. "Available to help" is switched from the student's own profile now; S07 also shows it in Settings.
2. Four scopes (class, specialty, year, institute), as in "Who to ask".
3. For a student who hides their name on the leaderboard, other students see the level but not the points.
4. Release 1 profile: stats are Unverified, Preparing, Chapters done and Badges; "Followed paths" is the student's own path; every held certification is unverified.
5. "Edit profile" links to `/settings`.

The "private profile" items of the scope and "Done when" lists are replaced by the 2026-10-29 decision (every profile is visible): the API rule is "signed-in students only", and students who haven't verified their email or finished onboarding are never listed or opened.

### Outcome (2026-11-11)
Tests:
- types: 112 (Vitest)
- backend: 63 unit + 99 API e2e (Jest), 16 of them new for the directory, the profiles and the privacy rules
- frontend: 117 (Vitest)
- Playwright: 74 passing at 1440 and 390 px, 17 skipped by design (desktop-only or mobile-only tests); 6 new runs for the directory and profiles
- Visual baseline: taken for every screen (64 captures across 4 projects, 17 skipped by design), then compared again with no difference. The random test email is masked, because it changed the profile screens from run to run. It now includes the directory (default, institute, help filter, no results, phone filter sheet) and the profiles (mine, another student, not found).

Lint, typecheck and build pass. `migration:generate --check` finds no drift, and the migration reverts and re-applies cleanly. Screens checked at 1440 and 390 px, light and dark, against design/Communaute and design/Profil.

Where the build differs from the plan or the design:
- **Certification chips on a card** use the unverified look (dashed) for held certifications, not the green "verified" chip of the design: nothing is verified in Release 1.
- **A hidden-points card** shows the level name where the points would be.
- **Phones:** the profile shows the level in the header line ("Novice · 40 pts") and no level card, as in the design. The copy button is desktop only; on phones the mail button carries the address.
- **My own card** in the directory opens `/profile`; `/community/<my id>` redirects there.
- **The "Holds" filter** lists the certifications at least one student holds, read from the catalog.
- **The profile's back link** always goes to the directory. The design returns to the certification page the student came from; that is in the backlog.
- **`/profile` no longer has an "Open settings" row**: "Edit profile" goes to Settings. The row only shows if the profile fails to load, so phones keep a way to Settings and Sign out.
- **API tests start from a clean set of students.** The test database kept students between runs, and after a few runs the dashboard's "Also preparing" test (S04) failed because older students filled the list. The test setup now deletes the students of earlier runs.
- **Names link to profiles** in "Who to ask" and in the classmates feed, as planned. "Also preparing" on the dashboard doesn't yet.

Known limit: while chapters are the only source of points, the percentages under "Preparing" let someone estimate the points a student chose to hide (ADR-021, backlog).

Backlog added to PLAN.md: header search across the app, a trigram index for name search, the hidden-points estimate, and the profile back link.
