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
- [ ] Certification page works for all 56 seeded certs

## Out of scope
- Declare as earned, exam request, practice tests (Release 2)

## Plan
_(Claude Code writes the plan here, then waits for approval.)_

## Notes / decisions

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
