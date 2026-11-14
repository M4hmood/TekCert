# S07 · Notifications + settings

**Goal:** Students get notified and control their account.

**Design reference:** Notifications, Parametres (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Notification model + in-app list: filters, read / unread, mark all read
- [x] Email notifications with per-type preferences
- [x] Settings: enrolment (year, group, specialty), privacy, notification preferences, appearance (light / dark / system), account (display name, export my data as CSV, sign out)
- [x] New academic year prompt (confirm year / repeating / left TEK-UP)

## Done when
- [x] Every notification type in the design can be triggered from a real event: the three Release 1 categories. The Release 2 kinds wait for their features (decision 1)
- [x] Theme preference persists across devices

## Out of scope
- Push notifications

## Plan
_Written 2026-11-13 and approved the same day with the six recommendations; built after S06 merged. See the outcome under "Notes / decisions"._

Branch `sprint/S07-notifications-settings`, cut from `main` (515eada). One PR at the end.

### Decisions I need from you
Each one has my recommendation first.

1. **Which notifications exist in Release 1.** The design shows exam requests, verified certifications, answers to questions and exam sessions. None of those features exist before Release 2, so no real event can trigger them.
   **Recommended:** build the three categories that real events can trigger today, and leave the others out of the filters and the preferences until their features exist.

   | Category | Notification | Real event behind it |
   |---|---|---|
   | Community | "3 students in your class started SAA-C03" | A classmate starts a certification I'm preparing. One per certification per day, the count and names grow. |
   | Leaderboard | "You moved up 3 places on the CIM leaderboard" | A weekly job (Monday 08:00, Tunis time) reads the same 7-day change the leaderboard shows. Sent only when the rank changed, up or down. |
   | Progress | "You reached level 3", "You earned the Pioneer badge", "You finished the SAA-C03 syllabus" | The level, badge and finished-syllabus events from S04. |

   The filters become All, Unread · n, Community, Leaderboard, Progress.
2. **Email defaults.** Every category is on in the app. **Recommended for email:** Progress on, Community off, Leaderboard off (the design's defaults for the nearest rows). An email is sent once per notification, after the event is saved; a failed send is logged and not retried.
3. **"I'm no longer at TEK-UP".** The design says "Your profile switches to alumni mode" and shows nothing else.
   **Recommended:** the student keeps their account, points and profile. The profile shows "Alumni" with their last class. They leave the leaderboards and their old class's community notifications, and the year prompt never returns. They can undo it in Settings › Enrolment by saving a class again.
4. **When the year prompt appears.** **Recommended:** from 1 September (Tunis time), for every student whose enrolment isn't confirmed for the new academic year. Everyone already onboarded counts as confirmed for 2026-27, so the first real prompt is 1 September 2027.
   - "Moving up" asks for the group, and for the specialty when moving up to ING-4.
   - In ING-5 the first option becomes "I graduated", which is the alumni path.
   - "Remind me tomorrow" hides the prompt for 24 hours on that device. The banner in Settings › Enrolment stays until it's confirmed.
5. **Export my data.** The design lists certifications, practice tests and requests; only the first exists.
   **Recommended:** one CSV file with a `record` column: my profile, the certifications I hold or am preparing (with progress), every chapter I finished, and every line of my points ledger. One file opens directly in Excel and needs no zip library.
6. **Display name.** The design has one field; the account stores a first and a last name, and lists sort on them.
   **Recommended:** two fields, First name and Last name. The email stays read-only.

### Rules
- A notification is only ever read by its owner. The API never returns another student's.
- Preferences are checked when the event happens. In-app off means no row is written; email off means no email.
- A student who hid their name is never named in someone else's notification. They still count: "2 students in your class…" without the name.
- Students who aren't verified or haven't finished onboarding get nothing.
- Theme: the account stores light, dark or system. The cookie stays as the first-paint copy and is rewritten from the account when the shell loads, so a new device picks the saved theme. The header button saves to the account too.
- Changing class in Settings moves the student on the leaderboards at once. The ledger isn't touched.

### Database
One migration.
- `notifications`: owner, kind, certification (optional), a small JSON payload (count, names, rank, change, badge, level), a dedupe key unique per owner (so a retry or a second server can't write it twice), `read_at`, `emailed_at`, timestamps. Indexes on (owner, newest first) and on unread rows.
- `notification_preferences`: owner + category → `in_app`, `email`. No row means the defaults.
- `users`: `theme`, `enrolment_confirmed_year`, `alumni_since`.

### API
A new `notifications/` module that owns its two tables and exports `NotificationsService` (ADR-017). Progress and Leaderboard call it; it doesn't call them.
- `GET /me/notifications?filter=all|unread|community|leaderboard|progress&cursor=…`: 20 per page, with the unread count.
- `GET /me/notifications/unread-count`: for the sidebar badge.
- `PUT /me/notifications/:id/read` and `POST /me/notifications/read-all`.
- `GET` and `PUT /me/notification-preferences`.
- `GET /me/settings`: account, enrolment, privacy, theme and whether the year prompt is due.
- `PATCH /me/account` (names), `PUT /me/enrolment` (the onboarding rules and schema), `PATCH /me/preferences` (theme), `POST /me/academic-year` (moving up, repeating, left).
- `GET /me/export.csv`.
- Privacy keeps using `PATCH /me/profile` from S05 and S06.

New dependency: `@nestjs/schedule` for the weekly leaderboard job. The job is safe to run on several servers because of the dedupe key.

Emails reuse the layout of the auth emails: one line, one button to the right screen, and a footer link to Settings › Notifications.

### Frontend
- `/notifications`: the header with "n unread", "Mark all as read" and the link to preferences; the filter tabs; groups Today, This week, Earlier; unread rows tinted with a dot; a row's button opens the right screen and marks it read; "Load more". States: loading, error, "You're all caught up".
- The sidebar shows the unread count. On phones the bell in the dashboard header leads there (design/Tableau-de-bord), and filters are chips.
- `/settings/<section>`: Account, Enrolment, Privacy, Notifications, Appearance, with the section list on the left. The design has no phone layout for Settings: on phones `/settings` is the list of sections and each one opens on its own page.
  - **Account:** names, read-only email, Export, Sign out.
  - **Enrolment:** year, group, specialty cards from ING-4 (the note about choosing in ING-4 below that), Save with a toast, and the "not confirmed" banner when the prompt is due.
  - **Privacy:** the two switches (leaderboard, available to help). No profile-visibility choice (decision of 2026-10-29). They stay on the profile as well.
  - **Notifications:** the table of categories with In the app and Email switches.
  - **Appearance:** Light, Dark, System cards; applies at once.
- The year prompt: a dialog on desktop and a bottom sheet on phones, shown over any screen of the shell when due.
- New shadcn primitive if needed: `radio-group`. 1440 and 390 px, light and dark.

### Tests
- **Unit:** grouping by day, the dedupe keys, the preference defaults, when the prompt is due around 1 September in Tunis time, the next class for each prompt answer, the CSV escaping.
- **API e2e:** each notification kind is created by its real event (start a certification, tick to a level and a badge, finish a syllabus, run the weekly job); preferences switch the row and the email off; nobody can read or mark another student's notification; hidden names stay hidden; the three prompt answers; the export matches the ledger; the theme round-trips.
- **web and Playwright:** read one, read all, filters, empty state; each settings section saves and survives a reload; the theme follows the account into a second browser; the year prompt with the clock moved to September. New visual screens for both pages and the prompt.

### Not in this sprint
- Push notifications, live updates without a reload, and a daily email digest.
- Exam request, verification, question and exam-session notifications (Release 2 features).
- "Stop preparing" a certification: it still needs the decision about ticked chapters and points (backlog).
- Changing email or password from Settings, and deleting the account.
- Deleting old notifications (goes to the backlog with the other clean-up job).

## Notes / decisions

### Decisions from review (2026-11-13)
The plan was approved with all six recommendations:
1. Three categories of notification, each from a real event: Community, Leaderboard, Progress. The Release 2 kinds wait for their features.
2. Everything is on in the app. By email: Progress on, Community and Leaderboard off.
3. "I'm no longer at TEK-UP" keeps the account, points and profile, marks the student as an alumnus with their last class, and takes them off the leaderboards. Saving a class in Settings undoes it.
4. The year prompt is due from 1 September (Tunis time). Everyone already onboarded counts as confirmed for 2026-27.
5. "Export my data" is one CSV file with a `record` column.
6. First name and Last name are two fields; the email is read-only.

### Outcome (2026-11-14)
Tests:
- types: 161 (Vitest), 27 new
- backend: 84 unit + 138 API e2e (Jest), 11 and 30 new
- frontend: 189 (Vitest), 59 new
- Playwright: 98 runs at 1440 and 390 px, 17 skipped by design; 18 new runs for notifications, settings and the year prompt. One run of the catalog test failed once on a connection reset and passed when run again.
- Visual baseline: retaken for every screen (80 captures across 4 projects, 17 skipped by design) and compared again with no difference. Every signed-in screen changed, because the sidebar now shows the unread count and the setup has two more students. New screens: the notifications list and its empty state, the six settings screens, the year prompt (two states) and the "not confirmed" notice.

Lint, typecheck and build pass. One migration (`AddNotificationsAndSettings`): two tables, three columns on `users`. Screens checked at 1440 and 390 px, light and dark, against design/Notifications and design/Parametres.

**Every notification type can be triggered from a real event ("Done when"):** the API tests start a certification, tick chapters up to a badge, a level and a finished syllabus, and run the weekly leaderboard job, then read the notification and the email each one produced.

**The theme persists across devices ("Done when"):** a Playwright test picks Dark in Settings, signs in from a second browser with no cookie and finds it dark, changes it there, and sees the first browser follow.

Where the build differs from the plan or the design:
- **"In-app off" still writes a row when email is on.** It is hidden from the list and only stops a second email for the same event. With both channels off nothing is written, as planned.
- **The saved theme starts empty**, not as "System". A default would have overridden a theme picked in the browser before signing in. The first visit hands that choice to the account.
- **Moving up is accepted once a year.** A second click, or a second tab, answers 409 instead of moving the student up twice. Repeating and leaving can be answered again.
- **In ING-5 the first answer is "I graduated"** and "I'm no longer at TEK-UP" stays as the third; both lead to alumni mode.
- **The leaderboard notification is about the all-time specialty board**, so there is always a week to compare with. Its button opens that board.
- **ING-1 to 3 students choose the specialty they aim for in Settings › Enrolment**, "Undecided" included, as in onboarding. The design only shows a note there.
- **Privacy has two switches and a line of explanation.** The design's "Profile visibility" choice is gone (decision of 2026-10-29).
- **Settings on phones** is a list of sections, each on its own page, with Sign out under the list. The design has no phone layout for Settings.
- **The dashboard has the bell from design/Tableau-de-bord**, with a dot when something is unread. It is the way to Notifications on phones.
- **On phones a notification row opens its screen when tapped**, because the row's button is hidden there.
- **Empty states** that the design doesn't show for a category: "Nothing here yet".
- **Alumni** are marked on their profile and on directory cards ("Alumni · ING-5 CIM · group A").
- **`@nestjs/schedule` 6**, not 12: version 12 is ESM only and Jest can't load it in this setup.

Found on the way:
- **Windows reserved port 5432 after a reboot**, so Postgres couldn't start. The tests ran with the database on another port (`TEST_DATABASE_URL`, and a new `VISUAL_DATABASE_URL` for the visual run).
- **The visual "theme forced" screens now set the theme on the account.** A cookie alone no longer forces it for a signed-in student.

Backlog added to PLAN.md: the Release 2 notification kinds, deleting old notifications, retrying failed emails, an unsubscribe link, a 1 September reminder, live unread counts, changing the email or password and deleting the account, and moving the weekly run out of the API process.
