# S04 · Progress, points + dashboard

**Goal:** Ticking chapters earns points and the dashboard reflects it.

**Design reference:** Tableau-de-bord, Profil (level + badges blocks) (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Chapter tick / untick on the certification page (+10 / −10 points)
- [x] Points ledger table (append-only events) + level computation (Novice → Emeritus)
- [x] Badge engine for MVP badges: First step, Dedicated (30 chapters); others defined but locked
- [x] Activity events table feeding the classmates feed
- [x] Dashboard: current certification ring, level card, next recommended cert, my path summary, classmates activity, empty / loading / error states

## Done when
- [x] Points are always recomputable from the ledger
- [x] Dashboard states match the design (filled, empty, loading, error)

## Out of scope
- Points from verified certifications and practice tests (Release 2)

## Plan

Status: **approved 2026-11-10 with the recommended answers.** Branch `sprint/S04-progress-points-dashboard`, cut from `main` (ffa3d48). One PR at the end.

### 0. What the designs show that S04 leaves out
- **Release 2, hidden:** "Practice test" button, "exam request sent for the … session", the **My requests** block (and its mobile empty state), "N verified" counts, "Also following: SSIR", the Pioneer / Flawless / Multi-cloud unlock rules, "+500 once verified".
- **Later sprints, hidden:** header search "Certification, student…" (S05 directory), notifications bell (S07), "Open path" (Parcours is Release 2).
- **Release 1 wording:** every held certification is unverified, so the path summary says "2 of 9 earned" (no "1 verified"), path nodes I hold use the design's *unverified* style (dashed, `pending` icon), and the empty state says "12 ING-4 CIM students are already preparing or hold a certification" instead of "have a verified certification".

### 1. Rules (pure, in `packages/types/progress.ts`)
- **Points:** chapter ticked +10, unticked −10. No other source in Release 1.
- **Levels** (from Design-System › Recognition): I Novice 0 · II Bachelor 250 · III Licentiate 1,000 · IV Master 2,500 · V Emeritus 5,000. `levelFor(points)` returns rank, name, floor, next level, points to next and the bar fraction (1,480 → Licentiate, 32 %, "1,020 points to Master"). Emeritus has no next.
- **Badges** (from Profil): First step (`footprint`, first chapter completed) and Dedicated (`local_library`, 30 chapters completed at once) unlock in S04. Pioneer (`flag`), Flawless (`target`) and Multi-cloud (`cloud`) are defined and always locked ("· to unlock"). Count shown as "N of 5".
- **Chapter window:** the dashboard shows 4 chapters (3 on mobile) starting one before the first unticked chapter, as the design's `chapWin` does.
- **Percent:** `round(done / total × 100)`.

### 2. Database (TypeORM migration `AddProgress`)
- **`chapter_progress`** — the current state. PK (`user_id`, `chapter_id`); `certification_id` (for per-cert counts), `completed_at`. FKs: users cascade, chapters cascade. Index (`user_id`, `certification_id`).
- **`point_events`** — the ledger. `id` bigint identity, `user_id` (FK cascade), `delta` smallint, `reason` enum `point_reason` (`chapter_done`, `chapter_undone`; Release 2 adds certification and practice-test reasons), `certification_id`, `chapter_id` (no FK: history survives a chapter removed from the seed), `created_at`. Index (`user_id`, `created_at`) for S06 periods.
  - **Append-only in the database:** a trigger rejects every `UPDATE`, and any `DELETE` that isn't the cascade from deleting a user.
  - **No stored total anywhere.** Points = `SUM(delta)`; level = `levelFor(SUM)`.
- **`user_badges`** — PK (`user_id`, `badge`), enum `badge_key` (all 5 keys), `earned_at`.
- **`activity_events`** — the classmates feed. `id`, `user_id` (cascade), `kind` enum (`certification_started`, `chapters_done`, `syllabus_completed`, `badge_earned`, `level_reached`), `certification_id` / `badge` / `level` (nullable, per kind), `count`, `day` (date, Africa/Tunis), `created_at`, `updated_at`. Index on `created_at desc`.
  - `chapters_done` is a **daily roll-up**: one row per (user, certification, day), unique partial index, whose `count` goes up on tick and down on untick. The row is hidden at 0, so the feed reads "finished 3 AZ-104 chapters" instead of three lines.
  - `level_reached` is unique per (user, level): written the first time only, so ticking around a threshold doesn't repeat it.
- Nothing to backfill: nobody has ticked a chapter yet, so every existing student starts at 0 points.
- A chapter removed from the seed drops its `chapter_progress` rows, but the points already earned stay in the ledger (documented in the ADR).

### 3. Backend modules (ADR-017)
- **`certifications/`** gains `ChapterProgress` next to `Preparation` (both are per student, per certification), so the certification page and "Who to ask" can show my progress and classmates' percentages without a cycle. New exported methods: `setChapterDone(userId, chapterId, done, manager)` → `{ changed, certificationId, code, done, total }`, `progressFor(userId, certIds)`, `completedChapterCount(userId)`. `UserCertification` stays here: nothing in S04 needs it to move.
- **`progress/`** (new) owns `PointEvent`, `UserBadge`, `ActivityEvent`. It depends on `certifications`, `paths`, `users` and `school`; nothing depends on it. The tick runs in one `dataSource.transaction` started here: chapter state → ledger row → badges → level-reached → activity roll-up. A no-op tick writes nothing.
- The `PUT /me/preparations/:slug` handler moves into the progress controller (same URL and behaviour), so "started X" lands in the feed without `certifications` depending on `progress`.
- Pure helpers in `progress/utils/`: path summary node states, next recommended certification, activity scope resolution (shared with S03's community scopes).

### 4. API
| Endpoint | Auth | Behaviour |
|---|---|---|
| `PUT /me/chapters/:chapterId` | signed in | Tick. 200 `{ changed, delta, certification: { slug, done, total, pct }, points, level, newBadges }`. Ticking again: `changed: false`, no new ledger row. 404 unknown chapter or retired certification; 409 when I'm not preparing it (not started, or held). |
| `DELETE /me/chapters/:chapterId` | signed in | Untick, same response, −10. Idempotent. |
| `GET /me/certifications/:slug` | signed in | My status on one certification plus `doneChapterIds`, `done`, `total`, `pct`. Feeds the syllabus ticks. `GET /certifications/:slug` stays public and personal-data-free. |
| `GET /me/points` | signed in | `{ points, level, badges: [{ key, earnedAt \| null, available }] }`. |
| `GET /me/dashboard` | signed in | `{ current, level, badges, next, path, alsoPreparing, empty }` (section 5). One query each, run in parallel. |
| `GET /activity?scope=class\|specialty\|year\|institute` | signed in | 10 newest events in scope, never my own, from students with a verified email who finished onboarding. Each: who (first name, initials, photo), class code, kind, certification code, count/level/badge, `at`. |
| `GET /certifications/:slug/community` | signed in | "Preparing it" items gain `pct`. Percentage only, never which chapters (design: "Classmates see your percentage, never the details"). |

### 5. Dashboard (`/dashboard`)
- **Header:** "Tuesday, November 10, 2026 · Fall semester" (Africa/Tunis; Fall = September–January, Spring = February–August) and "Hello {firstName}". Theme toggle as today.
- **Current certification:** the in-progress certification I touched last (latest tick, else latest start). Ring with %, "N/M chapters", provider · code · level, name, "Started September 2". The chapter window is tickable right there: optimistic update, toast "Chapter done · +10 points" / "Chapter unticked · −10 points" / "Syllabus complete · you're ready for the exam", with **Undo**. On failure the tick rolls back and the toast says so. "See the full syllabus" → `/catalog/[slug]?tab=syllabus`.
- **My level:** roman numeral, name, points, bar, "N points to Master", the 5 badge icons and "N of 5 badges".
- **Next recommended certification:** the first node of my path (column, then row) that I neither hold nor prepare, and whose prerequisite I hold (or that has none). Copy: "Extend your Azure branch after AZ-900." when it has a prerequisite, otherwise "Next on your CIM path.", plus "9 ING-4 CIM students earned it." (my year and specialty). "View page". If the whole path is covered: "You've covered your path" + "Browse the catalog".
- **My path · CIM:** "Your specialty's path · 2 of 9 earned", 9 nodes with states held / in progress / available / locked. ING-1…3 see their target specialty's path, or Fundamentals when undecided ("Fundamentals path").
- **Also preparing {current code}** (see Q3): up to 4 students in my specialty, all years, with their %.
- **Classmate activity:** scope switch My class / My specialty (default) / My level / Whole institute, 5 events (3 on mobile), "2 h ago", "yesterday", "3 days ago". Icons and tones as in the design.
- **Empty (no preparation, 0 points):** Novice · 0 pts · "Finish a chapter to earn your first 10 points"; "Your path · CIM — Start with {next}" with level, chapter count, total study time and a **Start** button (the existing `PUT /me/preparations`, then the dashboard reloads filled); "Your class has already started" with 3 avatars, "+N" and the count. No activity yet in scope → "Nothing yet in your class. Be the first to finish a chapter."
- **Loading:** `loading.tsx` skeleton matching the mobile loading screen and the desktop grid. **Error:** a dashboard `error.tsx`: "Couldn't load your dashboard", "Check your connection. Your progress is saved, nothing is lost.", Try again, "Code ERR_… · 2:32 PM".
- Desktop 1440 and mobile 390 as in the design, light and dark.

### 6. Certification page + profile
- **Syllabus tab:** tick boxes when the certification is in progress; ticked chapters struck through with "Done"; header "5 / 11 chapters"; the side note becomes the design's "How it works" text. Same optimistic tick, toasts and Undo as the dashboard. Not started: boxes disabled, with "Start this certification to tick chapters" (see Q1). Held: no boxes.
- **Status card (in progress):** ring with %, "Started October 30 · 5/11 chapters", "Continue the syllabus".
- **Who to ask › Preparing it:** each card shows the %.
- **Profile (see Q4):** the level and badges blocks from Profil (shared with the dashboard), above the Settings row. The rest of the profile stays in S05.
- **Shared toast** in `packages/ui` with an optional action button (Undo). The S03 certification toast moves to it.

### 7. Shared contract (`packages/types`)
`progress.ts`: levels, `levelFor`, badge catalog and rules, `chapterWindow`, `pct`; tick response, my progress, points, dashboard, activity query and event schemas. `community.ts`: `pct` on preparing items.

### 8. Tests
- **types (Vitest):** `levelFor` at 0, 249, 250, 999, 1,000, 2,499, 2,500, 4,999, 5,000 and the bar/next values from the designs; badge rules (0, 1, 29, 30 chapters); `chapterWindow` at the start, middle and end; `pct`.
- **Jest unit:** path node states, next recommended (prerequisite held / missing / path covered / Fundamentals), activity scope resolution, "N ago" labels, current-certification choice.
- **Jest API e2e:**
  - tick → +10 and one ledger row; tick again → no row; untick → −10; untick again → no row
  - 10 concurrent ticks of one chapter → exactly one ledger row
  - after a random tick/untick sequence, `SUM(delta) = 10 × ticked chapters` and `GET /me/points` agrees
  - the trigger rejects `UPDATE` and direct `DELETE` on `point_events`; deleting a user still cascades
  - 409 not started / held; 404 unknown chapter; 401 visitor
  - First step on the first tick; Dedicated at 30 (three started certifications); a level reached once, even after untick and re-tick
  - dashboard: empty and filled shapes; activity scopes, self excluded, daily roll-up; community `pct`
- **Vitest (web):** optimistic tick, rollback on error, toast and Undo; level card; badge row; dashboard filled and empty; activity scope switch; error screen retry.
- **Playwright (1440 + 390):** start a certification, tick 2 chapters on its page → status card 2/N and 20 points on the dashboard with First step; untick from the dashboard → 10; a second student sees "finished 1 … chapter" under Whole institute; a new student sees the empty dashboard and Start fills it. Visual baselines for the dashboard (filled, empty, loading) in both themes.

### 9. Docs
- ADR-020: ledger + trigger, derived totals, levels and badges, the activity roll-up, module ownership (`progress/`, `ChapterProgress` in `certifications/`).
- Sprint notes and checklist at the end; backlog: "stop preparing" (still out), Release 2 point reasons.

### Order of work
1. Shared rules + schemas + Vitest
2. Migration, entities, trigger
3. API: tick/untick, my progress, points, community `pct` + Jest
4. Dashboard + activity API + Jest
5. Certification page ticking, shared toast, profile blocks
6. Dashboard UI (filled, empty, loading, error; desktop and mobile)
7. Playwright, visual baselines, ADR, checklist

### Questions
1. **Ticking before Start.** Boxes stay disabled until I press Start, as in the design where ticking only appears "in progress" **(Recommended)**? Or the first tick starts the certification automatically?
2. **Badges after an untick.** A badge, once earned, is kept (points still drop) **(Recommended)**? Or it is taken back when the count falls below the rule (e.g. 29 chapters loses Dedicated)?
3. **"Also preparing SAA-C03"** is in the design but not in the scope list. Build it now, reusing the community query plus the new `pct` **(Recommended: small)**? Or leave it for S05?
4. **Profile page.** Put the level and badges blocks on `/profile` now (the sprint names Profil as a reference) **(Recommended)**? Or only on the dashboard, with the profile built in S05?

## Notes / decisions

### Decisions from review (2026-11-10)
1. Chapter boxes stay disabled until the student presses Start.
2. A badge, once earned, is kept; points still drop on untick.
3. "Also preparing {code}" is built now, reusing the community query and the new `pct`.
4. The level and badges blocks go on `/profile` now; the rest of the profile stays in S05.

### Outcome (2026-11-10)
Tests:
- types: 93 (Vitest)
- backend: 63 unit + 83 API e2e (Jest)
- frontend: 101 (Vitest)
- Playwright: 68 passing at 1440 and 390 px, 17 skipped by design (desktop-only or mobile-only tests). The shell tests now expect the dashboard's "Hello Test" heading, and the theme-button test compares the button with the title line instead of an absolute position (the dashboard has a date line above its title).
- Once, with other heavy jobs running, 3 older auth and catalog Vitest tests hit the 5 s timeout; they pass alone and in a clean full run.

Lint, typecheck and build pass. `migration:generate --check` finds no drift, and the migration reverts and re-applies cleanly. Screens checked at 1440 and 390 px, light and dark, against design/Tableau-de-bord and the Profil level and badges blocks.

Where the build differs from the plan:
- **Concurrency bug found by the API tests.** Reads inside the tick transaction first went through the default repositories, which takes a second pool connection; ten concurrent ticks exhausted the pool and hung. Every read in the tick now uses the transaction's manager (ADR-020).
- **The error screen's code** is `ERR_HTTP_<status>` when the message carries one, else a short digest or `ERR_NETWORK`: production builds hide server error messages, so the digest is what support can match in the logs.
- **The empty dashboard on phones** shows level, Start and "Your class has already started", as in the design; the feed only appears once the student has started. Desktop has no empty design, so it shows the same cards plus the path strip and the feed.
- **"Nothing in progress"** (points earned, nothing started) isn't in the design: an empty card links to the catalog.
- **Toast** moved to `packages/ui` with an optional action (Undo). The certification page's own toast uses it too; its Start message now reads "SAA-C03 started · tick chapters as you revise them".
- **Chapter windows follow the chapter number**, not the domain order: SAA-C03's domains list 01, 02, 06, 07… so the dashboard can show 02–05 while 06–08 are ticked.
- **Not built:** "My requests", the practice-test button and verified counts (Release 2), the header search (S05) and the notifications bell (S07), as planned.
- **Certification header, changed on request (2026-11-11):** the title (with the badge beside it) now comes first, and the provider, code, level, difficulty and "Useful in" chips sit underneath it.
- **Backlog:** "Stop preparing" (still out), and a tick in flight is lost if the student leaves the page at once (seen in Playwright when reloading right after a click).
