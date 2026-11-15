# Screen-reader check

The automated checks (axe on every screen, keyboard tests, names and roles in unit tests) can't
tell whether TekCert makes sense when you **listen** to it. This is the script for a person to do
that once before the pilot, and again after a large change. It takes about 45 minutes.

## Setup

- **Windows:** NVDA (free) with Firefox or Chrome. Start NVDA, open the app, press `Insert+Space`
  to switch between browse and focus mode when needed.
- **macOS / iOS:** VoiceOver (`Cmd+F5` on a Mac; Settings › Accessibility on an iPhone) with Safari.
- One student account that finished onboarding, and one that hasn't (`pnpm db:seed:pilot` gives
  classmates to look at).

Write down anything that is missing, read twice, read in a confusing order, or not announced.
Each row says what you should hear.

## Script

| # | Screen | Do | You should hear |
|---|---|---|---|
| 1 | Landing `/` | Tab from the top | "Skip to content", then the TekCert home link, the four section links, "Change theme", "Sign in", "Create my account" |
| 2 | Landing | List the headings (NVDA `Insert+F7`, VoiceOver rotor) | One level 1 ("Earn the IT certifications that count…"), then a level 2 per section |
| 3 | Sign in | Submit empty, then a wrong password | Each error is read at once; "attempts left" is announced |
| 4 | Onboarding | Go through the four steps | The step ("Step 2 of 4 · Specialty"); each card read as a pressed / not pressed button |
| 5 | Dashboard | Tick a chapter | The new state of the chapter, then the toast with "Undo" |
| 6 | Catalog | Filter by provider, then sort | The number of results after each change; the sort menu's options |
| 7 | Certification page | Move between the tabs with the arrow keys | "tab, selected, 2 of 4" style announcements |
| 8 | Community | Search a name | The result count; each card read starting with the student's name |
| 9 | Leaderboard | Switch scope and period | The table's caption; your row marked as yours; an anonymous row read as "Anonymous" |
| 10 | Notifications | Read the list, open a filter, mark all as read | Group headings (Today, This week…); "Unread:" before unread titles; the toast |
| 11 | Settings › Notifications | Toggle a switch | "Community by email, switch, on" |
| 12 | Settings › Appearance | Arrow through the theme cards | "Dark, radio button, checked, 2 of 3" |
| 13 | Year prompt | Let it open (or open it from Settings › Enrolment), then press Esc | The dialog's title; focus inside it; on Esc, focus back on the button that opened it |
| 14 | Any page | Open the sidebar's Notifications link with unread items | "Notifications, 2 unread" |
| 15 | Phone | Repeat 1, 5, 10 and 13 with VoiceOver on an iPhone | The bottom tab bar is read as navigation; the sheet version of the year prompt |

## After the check

Add the findings to PLAN.md › Backlog (or fix them in the sprint), and tick the screen-reader item
in `sprints/S03b-tailwind-shadcn.md` with the date and the reader used.
