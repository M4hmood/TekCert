# S03 · Catalog + certification page

**Goal:** Students browse every funded certification and open its page.

**Design reference:** Catalogue, Fiche-certification (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Catalog: search by name or code, filters (provider, level, specialty, max difficulty), sort, empty and loading states, mobile filter sheet
- [ ] Certification page tabs: Overview, Syllabus (chapters), Resources (external links), Who to ask (earned / preparing lists)
- [ ] “Start” a certification → status in progress
- [ ] Read-only “who to ask” from real users, respecting privacy
- [ ] Certification logos (badges) on catalog cards and the certification page (see Notes: "Badge images")

## Done when
- [ ] Catalog filters are URL-driven (shareable links)
- [ ] Certification page works for all 44 seeded certs

## Out of scope
- Declare as earned, exam request, practice tests (Release 2)

## Plan
_(Claude Code writes the plan here, then waits for approval.)_

## Notes / decisions

### Badge images (agreed 2026-10-28, before S03 planning)
- **Storage for now:** the logos live in the repo and are served by the frontend from `frontend/public/badges/`, copied from `design/assets/certs/` and `design/assets/official/` with clean names (e.g. `aws-saa-c03.png`).
- **Database:** `Certification.badgeAsset` holds only the file name (a key), never a full URL. The seed currently stores design paths such as `official/b-aws-saa.png`; S03 changes these to the new file names.
- **URL:** the frontend builds `${BADGE_BASE_URL}/${badgeAsset}`. `BADGE_BASE_URL` is an env setting that defaults to `/badges`.
- **Rendering:** `next/image` handles resizing, caching and lazy loading. When `badgeAsset` is null (the 3 Red Hat certs today), show a coloured provider chip with the cert code instead, per the Design-System rule "neutral provider dot, never a logo".
- **Later, on AWS:** upload the same files to the private S3 bucket behind CloudFront from the architecture diagram, set `BADGE_BASE_URL` to the CloudFront path, and add that domain to `next/image` `remotePatterns`. No database migration is needed.
- **Not in S03:** S3-compatible storage (MinIO locally, S3 in the cloud) arrives with the first user uploads: profile photos (S02 or later) and proofs (Release 2). Badges can move to it then, or once a staff console lets admins upload logos.
- **To check with the institute before the public Landing page (S08):** vendor badges are trademarks, so confirm they may be shown.
