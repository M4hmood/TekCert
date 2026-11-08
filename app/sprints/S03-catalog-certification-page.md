# S03 · Catalog + certification page

**Goal:** Students browse every funded certification and open its page.

**Design reference:** Catalogue, Fiche-certification (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [x] Catalog: search by name or code, filters (provider, level, specialty, max difficulty), sort, empty and loading states, mobile filter sheet
- [x] Certification page tabs: Overview, Syllabus (chapters), Resources (external links), Who to ask (earned / preparing lists)
- [x] “Start” a certification → status in progress
- [x] Read-only “who to ask” from real users, respecting privacy
- [x] Certification logos (badges) on catalog cards and the certification page (see Notes: "Badge images")

## Done when
- [x] Catalog filters are URL-driven (shareable links)
- [x] Certification page works for all 56 seeded certs

## Out of scope
- Declare as earned, exam request, practice tests (Release 2)

## Plan

Status: **approved 2026-10-30 with the recommended answers, built.** Branch `sprint/S03-catalog-certification-page`, cut from `main` after the ADR-017 refactor merged (PR #4). One PR at the end.

### 0. What the designs show that S03 leaves out
- **Release 2, hidden:** the "Practice tests" tab, "Declare as earned", "Add proof", "Request an exam", the exam-request box and the "+500 points once verified" panel.
- **S04, hidden until then:** chapter tick boxes, the progress ring and percentage, "Continue the syllabus" progress, "N/11 chapters" in the status note, and the "% done" on "Preparing it" cards. The Syllabus tab is read-only in S03.
- **Copy kept from the design:** "earned" means held, as in the design's "earned · unverified" state. In Release 1 every held certification is unverified (from onboarding), so the counts and the "Earned it" list include them, and each person carries an "Unverified" chip instead of "Verified".
- **Certifications outside the funded catalog** (Google, CompTIA, DP-900, AI-102) are not shown. Providers, codes and names come from the seed.

### 1. Catalog (`/catalog`)
- **Header:** "Catalog" + "Every certification funded by TEK-UP this academic year." + theme toggle.
- **Desktop filters (right column, 248 px):** Provider (checkboxes, provider dot, live count), Certification level (4 toggles), Specialty (checkboxes with specialty dot and count), Maximum difficulty (1–5 stepper, "Any difficulty" / "Up to 3/5").
- **Toolbar:** search field (name, code or exam code), "Sort:" menu, result count ("12 certifications"), active filter chips with remove buttons, "Clear all".
- **Sort:** Most earned (default), Name A–Z, Easiest first, Level.
- **Cards:** badge (or the provider chip with the cert code when `badgeAsset` is null), provider, code, name, level bars, difficulty dots, specialty tags (or "All specialties"), "N students earned it", and my status pill (Unverified / In progress) when I have one. The whole card links to `/catalog/[slug]`.
- **Mobile 390:** search + "Filters · N" button + horizontally scrolling provider chips. The filter sheet (dialog, focus trapped) holds level, specialty and difficulty, with "Reset" and "Show N certifications", live-counted while editing.
- **States:** loading skeleton (`loading.tsx`, shimmer cards, matching the design), no results for a search ("No results for 'xyz'" + "Clear search"), no results for filters ("No certification matches" + "Clear filters"), catalog unavailable (inline error + retry).
- **URL-driven:** `?q=cloud&provider=AWS,AZURE&level=associate&specialty=CIM&maxDifficulty=3&sort=name`. The server page parses `searchParams` with the shared zod schema (bad values are dropped, never a crash), so a shared link renders filtered on first paint. Changes update the URL with `router.replace` (search debounced 250 ms); Back and reload keep the filters.
- **How filtering runs:** the page loads the whole active catalog once (56 rows) and filters in the browser for instant results and live counts. The filter, sort and facet-count rules are one pure function in `packages/types`, used by the browser, the server render and the API, so they can't drift.

### 2. Certification page (`/catalog/[slug]`)
- **Header:** breadcrumb (Catalog › provider › code, the provider links to the catalog filtered on it), badge or provider chip, code, level, difficulty, "Useful in" specialty tags, name, description, fact row (duration, questions, passing score, "Covered by TEK-UP"). Facts that are unknown for a certification are left out, not shown empty.
- **My status card:**
  - Available: "Start" button. Note: "N students preparing it".
  - In progress: "Started October 30" + "Go to the syllabus".
  - Unverified (held from onboarding): "Declared during onboarding". No Start.
  - Visitors never reach this page: the shell already requires sign-in.
- **Start:** `PUT /me/preparations/:slug`, then the card switches to In progress, the Syllabus tab opens and a toast says "Added to your dashboard". A double click or a retry is harmless (idempotent).
- **Tabs, kept in the URL (`?tab=syllabus`):**
  - **Overview:** description, domains assessed with weights, prerequisites (see below) with my status on each, exam format (duration, questions, passing score, languages, delivery, validity).
  - **Syllabus:** domains with their chapters (number, title, estimated time) and the count ("11 chapters"). Read-only until S04.
  - **Resources:** type filter (All / Documentation / Videos / Labs / Practice), external links that open in a new tab (`rel="noopener noreferrer"`), the "External links · TekCert hosts no courses" note.
  - **Community** (the design's tab name, heading "Who to ask?"): see section 3.
- **Prerequisites** come from the paths already seeded: every certification listed as a `prerequisite` of this one on any path. No new content to write. Shown as "Recommended", with "You declared it" when I hold it.
- **Mobile 390:** back arrow, compact header, status card, scrolling tab bar with the short labels (Overview / Syllabus / Resources / Community), stacked sections, as in the design.
- **States:** loading skeleton, 404 for unknown or retired slugs (existing `not-found`), Start failing (inline error, retry), empty resources ("No resources yet for this certification").
- Works for all 56 seeded certifications (a Playwright smoke test opens each one).

### 3. Who to ask (Community tab)
- Two lists: **Earned it** (students holding it; Release 1 = unverified) and **Preparing it** (students who pressed Start).
- **Scope** switch from the design: My class / My specialty / My level / Whole institute (default). Plus a specialty select (All, the 6 specialties, "Not yet (ING-1 to 3)") and a level select (All, ING-1…5), with "Reset".
- **Cards:** photo or initials, name, class code, then "Unverified" (Earned it) or "Started Oct 2026" (Preparing it), and a mail button to their institute email (Q4).
- **Privacy, enforced in the API:**
  - signed-in students only (401 for visitors)
  - only students with a verified email who finished onboarding
  - never the viewer themselves
  - fields: id, name, photo URL, class code, year, specialty, institute email and the date. Nothing else.
  - No opt-out: every profile is visible (decision 2026-10-29). The leaderboard switch doesn't apply here.
- At most 50 people per list, newest first, with the full count in the header ("Earned it · 14").
- Empty list: "Nobody for this filter yet."

### 4. Database (TypeORM migration `AddCatalogDetails`)
- `certifications` gains nullable columns: `description` text, `exam_minutes` smallint, `question_count` smallint, `passing_score` varchar(40) (e.g. "720 / 1,000", "70 %"), `languages` varchar(120), `delivery` varchar(80), `validity_years` smallint. Nullable because retired or performance-based exams don't publish all of them.
- New table `certification_resources`: id, certification_id (FK, cascade), `order`, `kind` enum `certification_resource_kind` (`doc`, `video`, `lab`, `practice`), title, url, source (host shown on the card), duration label (nullable). Unique (certification_id, order).
- New table `preparations`: id, user_id (FK users, cascade), certification_id (FK), started_at timestamptz default now(). Unique (user_id, certification_id), index on certification_id. S04 hangs chapter progress and points off it. It sits in `certifications/` next to `user_certifications`, so no module cycle appears (ADR-017).
- No "stop preparing" in S03 (backlog, S04 or S07).
- Seed: the content from Q2 goes into `certifications.ts` and is upserted like the rest. Resources are replaced per certification on each run.

### 5. API
| Endpoint | Auth | Behaviour |
|---|---|---|
| `GET /certifications` | public | Adds `q`, multi-value `provider` / `level` / `specialty` (comma lists), `maxDifficulty`, `sort`. Returns `items` (each with `earnedCount`), `total` and `facets` (counts per provider, level and specialty, each computed with the other filters applied). Uses the shared pure function. |
| `GET /certifications/:slug` | public | Adds description, exam facts, resources, prerequisites (code, slug, name), `earnedCount`, `preparingCount`. |
| `GET /me/certifications` | signed in | `[{ slug, status: 'unverified' \| 'in_progress', since }]`. Feeds the catalog pills and the status card. Held wins over in progress. |
| `PUT /me/preparations/:slug` | signed in | Starts preparing: 201 the first time, 200 after. 404 unknown or retired slug, 409 when I already hold it. |
| `GET /certifications/:slug/community` | signed in | `?scope=class\|specialty\|year\|institute&specialty=&year=` → `{ earned: { total, items }, preparing: { total, items } }`, with the privacy rules from section 3. |

- Ownership (ADR-017): certifications reads people through a new `UsersService.findDirectoryEntries(ids, filter)`, never the users repository. "My specialty" uses the class specialty for ING-4/5 and the target specialty for ING-1…3.
- Counts are aggregates: they name nobody, so the public endpoints can carry them.

### 6. Shared contract (`packages/types/catalog.ts`)
The list query (comma lists, `maxDifficulty`, `sort`), the facets, the extended detail (facts, resources, prerequisites, counts), my-certification status, the community query and person card. Plus `filterCatalog()` / `catalogFacets()` / `sortCatalog()` as pure functions, and `serializeCatalogQuery()` for building URLs.

### 7. Web
- `frontend/src/components/catalog/`: `CatalogView` (client), `FilterPanel`, `FilterSheet`, `ActiveFilterChips`, `SortMenu`, `CertCard`, `CertBadge`, `EmptyState`.
- `frontend/src/components/certification/`: `CertHeader`, `StatusCard` + `StartButton`, `CertTabs`, `OverviewTab`, `SyllabusTab`, `ResourcesTab`, `CommunityTab`, `PersonCard`.
- **Badges:** `CertBadge` renders `next/image` from `${BADGE_BASE_URL}/${badgeAsset}` (`BADGE_BASE_URL` defaults to `/badges`), and the provider chip with the code when there is no file (per Notes › Badge images). Same component on cards, the page header and prerequisites.
- Both routes get a `loading.tsx`. Everything uses the `packages/ui` tokens, light and dark, desktop 1440 and mobile 390 as in the designs.
- The S02 onboarding certification picker keeps its own list. It doesn't switch to the new catalog components.

### 8. Tests
- **types (Vitest):** query parsing (comma lists, bad values dropped), every filter, "All specialties" matching any specialty filter, facet counts that ignore their own filter, the 4 sorts, URL round-trip.
- **Jest unit:** status precedence (held > in progress > available), community scope resolution for ING-1…3 vs ING-4/5, prerequisites from path nodes.
- **Jest API e2e:**
  - list: `q` on name, code and exam code; multi-provider + level + maxDifficulty; facets; `earnedCount` after an onboarding declaration
  - detail for all 56 slugs: 200, with at least one resource each; retired slug → 404
  - start: 201 then 200; held → 409; unknown → 404; visitor → 401
  - `/me/certifications` statuses
  - community: visitor 401; self excluded; unfinished onboarding excluded; class / specialty / year scopes; a student who starts shows up under "Preparing it"
- **Vitest (web):** filters ↔ URL, chips and "Clear all", both empty states, card pills, badge fallback chip, tab switching, the Start button states.
- **Playwright (1440 + 390):**
  - filter by provider + level, copy the URL into a fresh page: same results
  - search with no result, then "Clear search"
  - mobile filter sheet: "Show N certifications" matches the list
  - open a certification, go through the 4 tabs, Start → In progress; a second student sees the first under "Preparing it"
  - smoke: all 56 certification pages render (desktop only)

### 9. Docs
- ADR-018: catalog content (facts and resources in the seed, DRAFT for staff review), `preparations` as the start of progress, and who-to-ask privacy.
- Sprint notes and the checklist at the end; backlog: "stop preparing", staff review of the drafted descriptions and resources.

### Order of work
1. Shared schemas + pure filter/sort/facets + Vitest
2. Migration, entities, seed content
3. API: list, detail, me, start, community + Jest
4. Catalog UI (desktop, mobile, sheet, states)
5. Certification page UI (tabs, status, Start, community)
6. Playwright, ADR, checklist

### Questions
1. **The ADR-017 refactor is still uncommitted** on `refactor/backend-modules` (staged, plus the `docs/decisions.md` edit). S03 builds on its module layout. Commit it, open its PR and merge it, then cut the S03 branch from `main` **(Recommended)**? Or cut S03 from the refactor branch and ship both in one PR?
2. **Content for 56 certifications.** The seed has no description, exam facts or resources today. Draft all of them from the vendors' public pages, marked DRAFT for staff review: a 1–2 sentence description, the facts the vendor publishes, and 1–4 resources per cert, always including the official certification page **(Recommended)**. Retired exams (CCENT, the Cisco R&S track, Java SE 8…) get fewer facts and links. Or SAA-C03 in full (as in the design) and only descriptions for the other 55?
3. **Who to ask: scope filters.** Build the full design (scope switch + specialty + level selects) **(Recommended: the data exists since S02)**, or only the two lists for the whole institute?
4. **Contacting someone before profiles exist (S05).** The design says "Their institute email is on their profile", but profiles arrive in S05. Show a mail button on each card in S03 (the email is already visible to students by the 2026-10-29 decision) and add the profile link in S05 **(Recommended)**? Or no contact until S05?

## Notes / decisions

### Decisions from review (2026-10-30)
1. The ADR-017 refactor merged first (PR #4); S03 starts from `main`.
2. Descriptions, exam facts and resources are drafted for all 56 certifications from the vendors' public pages, marked DRAFT for staff review. Every certification links to its official page.
3. "Who to ask" gets the full design: scope switch plus specialty and level selects.
4. Each person card has a mail button to the institute email until profiles arrive in S05.

### Outcome (2026-10-30)
Tests:
- types: 59 (Vitest)
- backend: 54 unit + 69 API e2e (Jest)
- frontend: 67 (Vitest)
- Playwright: 42 passing at 1440 and 390 px (11 skipped by design: desktop-only or mobile-only tests)

Format, lint, typecheck and build pass. `migration:generate --check` finds no drift. Screens checked at both widths, light and dark, against design/Catalogue and design/Fiche-certification.

Where the build differs from the plan:
- **Two text fields, not one.** The design has a short line under the title and a longer Overview text, so `certifications` gets `summary` (required) and `description` (optional; the summary stands in). Only SAA-C03 has a description for now.
- **Badge base URL is `NEXT_PUBLIC_BADGE_BASE_URL`.** Cards are client components, so the setting must be public to the browser. Default `/badges`.
- **Status card copy.** In progress says "Started October 30" and offers "Go to the syllabus"; held certifications say "Declared …" with a note that proof upload comes later. The toast says "SAA-C03 started · it is now in progress" rather than "Added to your dashboard", since the dashboard arrives in S04.
- **Syllabus side note** explains that ticking chapters arrives in the next update, instead of the design's "Tick a chapter…".
- **"Who to ask" cards** show "Unverified" instead of "Verified" (Release 1), a "started Oct 2026" date instead of a percentage (S04), and a mail button (decision 4). The subtitle no longer says "Only public profiles are shown", since every profile is visible.
- **Not shown:** the design's free-text prerequisites ("Hands-on AWS console experience") and the "+500 points" panel (Release 2).
- **Added after the build, on request:** catalog pagination, 12 per page with `?page=` in the URL. The designs have no pagination, so it reuses the difficulty stepper's shapes. Phones show Previous / "Page 2 of 5" / Next.
- **Validation errors stay 400.** `?level=master` returns 400 with the error on `level.0`, since levels are now a comma list.

### Certification catalog (56 certs, 10 providers, as of 2026-10-29)
Source of truth: `backend/src/database/seed/data/certifications.ts` (loaded by `pnpm db:seed`). Built from the vendor sheets TEK-UP supplied plus the Azure, EC-Council and INE certs. Google certs are excluded (not supported by TEK-UP). Chapters, difficulty and specialties are drafts for staff review. Badge = file in `frontend/public/badges/`; "none" shows the provider chip.

**Cisco (7)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| CCENT | Cisco Certified Entry Networking Technician | 100-105 ICND1 | foundational | 2/5 | none |
| CCNA-RS | Cisco Certified Network Associate Routing & Switching | 200-125 | associate | 3/5 | cisco-ccna.webp |
| CCNA-SEC | Cisco Certified Network Associate Security | 210-260 IINS | associate | 3/5 | none |
| CCNP-SWITCH | Cisco Certified Network Professional Switch | 300-115 SWITCH | professional | 4/5 | cisco-ccnp.webp |
| CCNP-ROUTE | Cisco Certified Network Professional Route | 300-101 ROUTE | professional | 4/5 | cisco-ccnp.webp |
| CCNP-RS | Cisco Certified Network Professional Routing & Switching | ROUTE + SWITCH + TSHOOT | professional | 4/5 | cisco-ccnp.webp |
| CCIE-RS | Cisco Certified Internetwork Expert Routing & Switching | Written + lab | expert | 5/5 | cisco-ccie.webp |

**Amazon Web Services (7)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| CLF-C02 | AWS Certified Cloud Practitioner | – | foundational | 1/5 | aws-clf-c02.webp |
| SAA-C03 | AWS Certified Solutions Architect – Associate | – | associate | 3/5 | aws-saa-c03.webp |
| DVA-C02 | AWS Certified Developer – Associate | – | associate | 3/5 | aws-dva-c02.webp |
| SOA-C03 | AWS Certified CloudOps Engineer – Associate | – | associate | 3/5 | none |
| AIF-C01 | AWS Certified AI Practitioner | – | foundational | 2/5 | aws-aif-c01.webp |
| DOP-C02 | AWS Certified DevOps Engineer – Professional | – | professional | 5/5 | none |
| SAP-C02 | AWS Certified Solutions Architect – Professional | – | professional | 5/5 | aws-sap-c02.webp |

**Microsoft Azure (6)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| AZ-900 | Microsoft Azure Fundamentals | – | foundational | 1/5 | azure-fundamentals.webp |
| AI-900 | Microsoft Azure AI Fundamentals | – | foundational | 1/5 | azure-fundamentals.webp |
| AZ-104 | Microsoft Azure Administrator | – | associate | 3/5 | azure-associate.webp |
| AZ-204 | Microsoft Azure Developer Associate | – | associate | 3/5 | azure-associate.webp |
| AZ-500 | Microsoft Azure Security Engineer Associate | – | associate | 4/5 | azure-associate.webp |
| AZ-400 | Microsoft DevOps Engineer Expert | – | expert | 4/5 | azure-expert.webp |

**Oracle (4)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| OCA-JAVA | Oracle Certified Associate, Java SE 8 Programmer | 1Z0-808 | associate | 2/5 | none |
| OCP-JAVA | Oracle Certified Professional, Java SE 8 Programmer | 1Z0-809 | professional | 4/5 | none |
| OCA-DB | Oracle Certified Associate, Database SQL | 1Z0-071 | associate | 2/5 | none |
| OCP-DB | Oracle Certified Professional, Database SQL | – | professional | 4/5 | none |

**Red Hat (7)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| RHCSA | Red Hat Certified System Administrator | EX200 | associate | 4/5 | none |
| RHCSA-OS | Red Hat Certified System Administrator in Red Hat OpenStack | EX210 | associate | 4/5 | none |
| RHCE | Red Hat Certified Engineer | EX294 | professional | 5/5 | none |
| RHCE-OS | Red Hat Certified Engineer in Red Hat OpenStack | EX310 | professional | 5/5 | none |
| RHCA | Red Hat Certified Architect | RHCE + 5 specialist exams | expert | 5/5 | none |
| RHCJA | Red Hat Certified JBoss Administrator | EX248 | associate | 4/5 | none |
| RHCS-ANS | Red Hat Certified Specialist in Ansible Automation | EX407 | associate | 4/5 | none |

**The Linux Foundation (8)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| LFCS | Linux Foundation Certified System Administrator | – | associate | 3/5 | none |
| LFCE | Linux Foundation Certified Engineer | – | professional | 4/5 | none |
| CKA | Certified Kubernetes Administrator | – | professional | 4/5 | lf-cka.webp |
| CKAD | Certified Kubernetes Application Developer | – | associate | 4/5 | lf-ckad.png |
| CFCD | Cloud Foundry Certified Developer | – | associate | 3/5 | none |
| COA | Certified OpenStack Administrator | – | associate | 4/5 | none |
| CHSA | Certified Hyperledger Sawtooth Administrator | – | associate | 3/5 | none |
| MCSA | MCSA: Linux on Azure | – | associate | 3/5 | none |

**EC-Council (3)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| CEH | Certified Ethical Hacker | 312-50 | associate | 3/5 | none |
| CHFI | Computer Hacking Forensic Investigator | 312-49 | professional | 4/5 | none |
| CND | Certified Network Defender | 312-38 | associate | 3/5 | none |

**INE Security (7)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| eWPT | INE Security Web Application Penetration Tester | – | associate | 3/5 | ine-ewpt.svg |
| eMAPT | INE Security Mobile Application Penetration Tester | – | professional | 4/5 | none |
| eJPT | eLearnSecurity Junior Penetration Tester | – | foundational | 2/5 | ine-ejpt.svg |
| eCPPT | INE Security Certified Professional Penetration Tester | – | professional | 4/5 | ine-ecppt.svg |
| ICCA | INE Certified Cloud Associate | – | foundational | 2/5 | none |
| eCIR | INE Security Certified Incident Responder | – | professional | 4/5 | none |
| eSOC | INE Security Operations | – | associate | 3/5 | ine-esoc.svg |

**Python Institute (4)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| PCEP | Certified Entry-Level Python Programmer | PCEP-30-02 | foundational | 1/5 | pi-pcep.png |
| PCAP | Certified Associate in Python Programming | PCAP-31-03 | associate | 2/5 | pi-pcap.png |
| PCPP-32-1/2 | Certified Professional in Python Programming 1/2 | PCPP-32-1xx / PCPP-32-2xx | professional | 4/5 | pi-pcpp.png |
| CEPP | Certified Expert in Python Programming | – | expert | 5/5 | none |

**Huawei (3)**

| Code | Name | Exam | Level | Difficulty | Badge |
|---|---|---|---|---|---|
| HCNA | Huawei Certified Network Associate | HCNA Routing & Switching | associate | 3/5 | none |
| HCNP-WLAN | Huawei Certified Network Professional – WLAN | HCNP WLAN | professional | 4/5 | none |
| HCIE | Huawei Certified Internet Expert | Written + lab | expert | 5/5 | none |


### Badge images (agreed 2026-10-28, before S03 planning)
- **Storage for now:** the logos live in the repo and are served by the frontend from `frontend/public/badges/`, copied from `design/assets/certs/` and `design/assets/official/` with clean names (e.g. `aws-saa-c03.webp`). The extension is part of the stored name, so `.webp`, `.png` and `.svg` can be mixed. The app only shows images from `frontend/public/badges/`, never from `design/assets/`.
- **Database:** `Certification.badgeAsset` holds only the file name (a key), never a full URL. The seed already stores `public/badges/` file names (e.g. `aws-saa-c03.webp`), or `null` when the cert has no badge file yet.
- **URL:** the frontend builds `${BADGE_BASE_URL}/${badgeAsset}`. `BADGE_BASE_URL` is an env setting that defaults to `/badges`.
- **Rendering:** `next/image` handles resizing, caching and lazy loading. When `badgeAsset` is null (31 certs today, including all Red Hat, Huawei and Oracle ones), show a coloured provider chip with the cert code instead, per the Design-System rule "neutral provider dot, never a logo".
- **Later, on AWS:** upload the same files to the private S3 bucket behind CloudFront from the architecture diagram, set `BADGE_BASE_URL` to the CloudFront path, and add that domain to `next/image` `remotePatterns`. No database migration is needed.
- **Not in S03:** S3-compatible storage (MinIO locally, S3 in the cloud) arrives with the first user uploads: profile photos (S02 or later) and proofs (Release 2). Badges can move to it then, or once a staff console lets admins upload logos.
- **To check with the institute before the public Landing page (S08):** vendor badges are trademarks, so confirm they may be shown.
