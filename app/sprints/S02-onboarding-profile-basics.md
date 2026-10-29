# S02 · Onboarding + profile basics

**Goal:** A new student finishes onboarding and lands on a recommended path.

**Design reference:** Onboarding (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] 4 steps: year (ING-1…5), specialty or target specialty + group, existing certifications (saved as unverified), profile photo
- [ ] Photo upload to S3-compatible storage (MinIO locally), square crop, 5 MB limit
- [ ] Privacy toggles: visible profile, appear on leaderboards
- [ ] Recommended path result screen (from seeded paths)
- [ ] Skip / resume onboarding; redirect until complete

## Done when
- [ ] Onboarding desktop + mobile states match the design
- [ ] A user’s class, specialty and privacy settings are stored and used by later sprints

## Out of scope
- Proof upload for existing certs (Release 2)

## Plan

Status: **draft, waiting for approval.** Branch `sprint/S02-onboarding-profile-basics`, one PR at the end.

### 0. Change to S01: every profile is visible (decided 2026-10-29)
This replaces S01 decision 1 (optional, unticked consent).
- **Sign-up:** the checkbox becomes required. `SignUpSchema` takes `acceptVisibility: z.literal(true)`, so the API rejects a sign-up without it (422), not only the form. The form shows an inline error under the box: "You need to accept this to create an account."
- **Copy:** the design's "You can change this at any time" is no longer true. New text: "I understand that my name, class, certifications and institute email are visible to TEK-UP students."
- **Database (in `AddOnboarding`):**
  - drop `users.profile_visible`; a column that is always true only invites bugs
  - backfill `visibility_consented_at` for existing rows, then make it NOT NULL, so it records when each student accepted
  - only dev/test accounts exist before the S08 pilot, so the backfill touches no real students
- **API:** `/auth/me` loses `profileVisible`. Every signed-in student can see every other student's profile and photo; visitors still see nothing.
- **Leaderboards stay opt-out:** "Appear on leaderboards" keeps its switch (on by default, as in the design).
- **Later sprints:** S05 loses the "private profile" state and S07 loses the profile-visibility setting (noted in PLAN.md).
- **Tests updated:** the types, Vitest and API e2e sign-up tests; a new one checks that a sign-up without the box returns 422.

### 1. Flow
- **Step 1 · Year:** ING-1 … ING-5 cards, plus the "Coming from a 3-year bachelor's? Pick ING-3" note.
- **Step 2 · Specialty + group:**
  - ING-4/5: "What's your specialty?" (6 cards, each showing its path preview), then a group picker (see Q2) and "Your class: ING-4-CIM-C · N students on TekCert".
  - ING-1/2/3: "Which specialty are you aiming for?" (6 cards + "Undecided · Fundamentals path"), then "Your group in ING-3".
  - Both resolve to an existing seeded `classes` row. Unknown combinations return 422.
- **Step 3 · Certifications (optional):** a searchable list of the 56 funded certifications (provider chip, name, code). The picks are saved as `unverified`. "Skip this step" saves nothing.
- **Step 4 · Photo + privacy:** drag-and-drop or "Upload a photo", then a square crop dialog. "Later" skips the photo. One switch, "Appear on leaderboards" (on by default). In place of the design's "Profile visible" switch, a short note: "Your profile is visible to TEK-UP students: name, class, certifications and institute email."
- **Result:** "Here's your recommended path". Horizontal 3-node track on desktop, vertical on mobile. Node states: Unverified (held) / Your next step / Available / Locked (prerequisite not held). Footer: "N students also follow this path" and "N certifications in this path". "Go to my dashboard" completes onboarding.
- **Chrome:** desktop header with the logo, "Step 2 of 4 · …" label, 4 progress segments (gold on the result) and the theme toggle. Desktop footer: Back / Skip / Continue. Mobile: back arrow + segments + "2/4" on top, a sticky full-width CTA at the bottom ("Continue · ING-3 Group B").
- The eyebrow uses the real first name ("Welcome, Yassine").
- Certifications from the designs that the institute doesn't fund (Google, CompTIA, AI-102…) are not shown. The specialty "Path:" previews come from the seeded paths.

### 2. Skip / resume / redirect
- Steps 1–2 are required, because later sprints need the class. Steps 3–4 can be skipped (see Q4).
- Every "Continue" saves that step on the server and moves `onboarding_step` forward. Leaving and coming back resumes at the saved step, with the earlier answers prefilled.
- `/auth/me` gains `onboardingCompleted`. The shell layout sends students who haven't finished to `/onboarding`. `/onboarding` sends finished students to `/dashboard`. This covers sign-in, email verification and deep links, since they all land in the shell.
- The API stays the authority: the onboarding endpoints check step order (you can't complete before the enrolment is saved → 409).

### 3. Database (TypeORM migration `AddOnboarding`)
- `users` gains:
  - `target_specialty_id` (FK specialties, nullable): only for ING-1…3. Null means undecided.
  - `leaderboard_visible` boolean, default true
  - `avatar_key` varchar, nullable: the object key in storage, with a content hash so caches bust on change
  - `onboarding_step` smallint, default 1
  - `onboarding_completed_at` timestamptz, nullable
- The year comes from the class (`classes.year`), and the ING-4/5 specialty from `classes.specialty_id`. Nothing is duplicated on `users`.
- New table `user_certifications`: id, user_id (FK, cascade), certification_id (FK), status enum `user_certification_status` (`unverified` now; Release 2 adds `pending`/`verified`/`rejected`), source (`onboarding`), created_at. Unique (user_id, certification_id).
- No points are written: unverified certifications earn nothing in Release 1 (PLAN.md note).
- `users` loses `profile_visible`, and `visibility_consented_at` becomes NOT NULL (section 0).

### 4. API (`backend/src/onboarding`, `backend/src/avatars`)
| Endpoint | Behaviour |
|---|---|
| `GET /onboarding` | The saved state (step, year, specialty/target, group, class code, certification ids, privacy, avatar URL, completed) plus the options: specialties with hue and path preview, and groups per year. |
| `PUT /onboarding/enrolment` | `{ year, specialty?, targetSpecialty?, group }`. The shared zod schema enforces `specialty` for 4–5 and `targetSpecialty` (nullable) for 1–3. Resolves the class, returns the class code and the number of onboarded classmates. |
| `PUT /onboarding/certifications` | `{ certificationIds[] }`: replaces the set of onboarding-sourced unverified certifications. Unknown ids → 422. |
| `PUT /onboarding/privacy` | `{ leaderboardVisible }`. |
| `PUT /me/avatar` | Multipart, field `photo`. Multer caps the body at 5 MB (413 above). The magic bytes must be JPEG or PNG (415 otherwise; the browser's MIME type isn't trusted). `sharp` center-crops to a square as a safety net, resizes to 512×512, re-encodes as WebP and strips EXIF/GPS. Uploads to S3, then deletes the previous object. |
| `DELETE /me/avatar` | Removes the photo. |
| `GET /users/:id/avatar` | Streams the photo with `Cache-Control: private`. Signed-in students only (401 otherwise); 404 when the student has no photo. |
| `POST /onboarding/complete` | 409 if the enrolment isn't saved. Sets `onboarding_completed_at`. |
| `GET /me/recommended-path` | Path = class specialty (ING-4/5), else target specialty, else Fundamentals. Returns the track (see Q5) with node states, the total node count, the peer count, and up to 3 peer initials. |

- **Storage:** `@aws-sdk/client-s3` behind a small `StorageService`. Config: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, plus access keys locally. On AWS it uses the instance role and no keys. The bucket stays private: photos only go out through the API.
- **Docker Compose** adds MinIO (API :9000, console :9001) and a one-shot `mc` container that creates the private `tekcert-avatars` bucket.

### 5. Shared contract (`packages/types`)
`onboarding.ts`: the year/group enums, the enrolment schema (a discriminated union on the year band), certifications, privacy, onboarding state, recommended path and node state. Also `AVATAR_MAX_BYTES` and the accepted types, so the web pre-checks with the same rules the API enforces.

### 6. Web (`frontend/src/app/(focus)/onboarding`)
- A server page loads `GET /onboarding` and renders a client `OnboardingWizard`. The current step is kept in the URL (`?step=3`), so Back and reload behave.
- Components: `ChoiceCard`, `GroupChips`, `CertificationPicker` (client-side search over the catalog), `AvatarUploader` + `CropDialog` (`react-easy-crop`, square crop with zoom, keyboard accessible), `Switch`, `PathTrack` (horizontal/vertical).
- **States:**
  - nothing selected (Continue disabled)
  - saving
  - save error (inline banner, retry)
  - photo too large / wrong type (checked in the browser before upload, and again on the server)
  - upload in progress
  - no certifications match the search
  - result for each node state
- Everything uses the `packages/ui` tokens. Desktop 1440 and mobile 390 follow the design.
- **Shell:** the sidebar account card shows the class code and the photo (the initials stay as the fallback). It doesn't show a specialty for ING-1…3.

### 7. Tests
- **types (Vitest):** enrolment schema branches (4–5 need a specialty, 1–3 accept null), group values.
- **Jest unit:**
  - class resolution
  - track selection and node states (held / next / available / locked)
  - image checks (magic bytes, size)
  - `onboarding_step` only moves forward
- **Jest API e2e** (with MinIO):
  - ING-4 CIM → CIM path
  - ING-2 undecided → Fundamentals
  - certifications saved as unverified, and saving twice is idempotent
  - complete before enrolment → 409
  - a 6 MB photo → 413, a fake `.png` that is really a PDF → 415, a real PNG → 512×512 WebP that can be fetched
  - another signed-in student can fetch the photo; a visitor gets 401
  - `/auth/me.onboardingCompleted`
  - sign-up without the visibility box → 422
- **Vitest:** the year branch switches the step 2 variant and its label, Continue enables only when valid, certification search, switches, the photo pre-checks.
- **Playwright:**
  - new user is redirected to onboarding → full desktop flow (ING-4 CIM, one certification, photo fixture, switches) → result → dashboard
  - mobile ING-3 target-specialty branch
  - reload mid-way resumes at the same step
  - a finished user who opens `/onboarding` lands on the dashboard
  - the existing signed-in fixtures get a "finished onboarding" helper
- **CI** adds a MinIO service container and the S3 environment variables.

### 8. Docs
- ADR-016: avatar storage and processing (S3/MinIO, proxied through the API, sharp, privacy).
- README: MinIO and the new environment variables.
- Backlog: the yearly "confirm your year" prompt is already in S07; "N students are preparing it" on the result waits for S04 progress data.

### Order of work
1. Shared schemas + migration + entities
2. Onboarding service/endpoints, recommended path + Jest
3. MinIO in Compose, storage + avatar endpoints + Jest e2e
4. Wizard UI, all steps and states, desktop + mobile, redirects + Vitest
5. Playwright, CI, ADR, README, checklist

### Questions
1. **Group labels.** The design shows "Group 1…4" / "G1…G4", but the seeded classes use letters (`ING-2-B`, `ING-4-CIM-C`). Show **"Group A…D"** to match the class codes **(Recommended)**, or rename the classes to numbers?
2. **Group for ING-4/5.** The design's specialty step has no group picker, but the class needs one (`ING-4-CIM-C`). Add the same group chips under the specialty cards **(Recommended)**?
3. ~~Privacy defaults in step 4~~: settled by section 0. Profiles are always visible, and the leaderboard switch starts on.
4. **Skipping.** Steps 1–2 required, 3–4 skippable, no "skip the whole onboarding" **(Recommended: later sprints need the class)**. Or should there be a global "Skip for now"?
5. **Which track the result shows.** The seeded paths are 3×3 grids, but the design shows one chain. I suggest the row holding the most of the student's certifications (ties → the first row), with "N certifications in this path" counting the whole grid. OK?
6. ~~Peer avatars~~: settled by section 0. Every profile is visible, so the avatars can be any students on the path.
7. **Leaderboard opt-out.** Profiles are now compulsory-public. Should "Appear on leaderboards" stay a switch the student can turn off **(Recommended: the request was about profiles, and the design has the switch)**, or become compulsory too?

## Notes / decisions
