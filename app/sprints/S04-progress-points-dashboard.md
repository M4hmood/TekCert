# S04 · Progress, points + dashboard

**Goal:** Ticking chapters earns points and the dashboard reflects it.

**Design reference:** Tableau-de-bord, Profil (level + badges blocks) (in /design)

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Write your implementation plan at the bottom of this file under “Plan”.
3. Stop and wait for approval.

## Scope
- [ ] Chapter tick / untick on the certification page (+10 / −10 points)
- [ ] Points ledger table (append-only events) + level computation (Novice → Emeritus)
- [ ] Badge engine for MVP badges: First step, Dedicated (30 chapters); others defined but locked
- [ ] Activity events table feeding the classmates feed
- [ ] Dashboard: current certification ring, level card, next recommended cert, my path summary, classmates activity, empty / loading / error states

## Done when
- [ ] Points are always recomputable from the ledger
- [ ] Dashboard states match the design (filled, empty, loading, error)

## Out of scope
- Points from verified certifications and practice tests (Release 2)

## Plan
_(Claude Code writes the plan here, then waits for approval.)_

## Notes / decisions
