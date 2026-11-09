# S03b · Tailwind CSS + shadcn/ui migration

**Goal:** The whole frontend is styled with Tailwind CSS and built on shadcn/ui components, and every screen still matches /design.

**Design reference:** every built screen: Connexion, Onboarding, Sidebar, BottomNav, Catalogue, Fiche-certification, Design-System

## Before coding
1. Read this file, PLAN.md and CLAUDE.md.
2. Answer the questions at the bottom of "Plan".
3. Stop and wait for approval.

## Scope
- [x] Tailwind CSS v4 set up in the monorepo, driven by the existing design tokens
- [x] shadcn/ui set up in `packages/ui`, themed with the TekCert tokens
- [x] `packages/ui` base components rebuilt on shadcn, with their public API unchanged
- [x] Hand-built widgets replaced by shadcn (select, sheet, dialog, tabs, switch, and so on)
- [x] All 19 CSS Module files removed
- [x] ADR and CLAUDE.md updated

## Done when
- [x] No `*.module.css` file is left, and lint rejects new ones
- [x] Every screen matches its pre-migration screenshot at 1440 and 390, light and dark, apart from differences listed in the sprint notes
- [x] Unit, API e2e and Playwright suites pass; format, lint, typecheck and build pass
- [x] Keyboard behaviour of the replaced widgets is checked (`e2e/tests/keyboard.spec.ts`)
- [ ] Screen-reader behaviour checked with a real screen reader (roles and names are tested; nobody has listened to it yet)

## Out of scope
- New screens, features, copy or layout changes
- Redesigning anything toward the default shadcn look (see Question 1)
- Backend, database and API
- Right-to-left support itself (Release 2), although new classes use logical properties so it stays cheap

## Plan

Status: **approved 2026-11-09 with the recommended answers (exact look, after S03, full conversion).** Branch `sprint/S03b-tailwind-shadcn`, cut from `main` once S03 has merged. One PR at the end.

### 0. What exists today
| Area | CSS lines | Files |
|---|---|---|
| Tokens, element defaults, entry point (`packages/ui/src`) | 218 | 3 |
| `packages/ui` components | 412 | 5 |
| Shell (Sidebar, Splash, BottomNav, PageHeader, ThemeToggle, SettingRow, Avatar, layouts) | 700 | 9 |
| Auth | 450 | 1 |
| Catalog | 947 | 2 |
| Certification page | 957 | 1 |
| Onboarding | 1,253 | 1 |
| **Total** | **4,937** | **22** |

- There are 504 CSS Module class references across 44 `.tsx` files.
- Tests help here: they select by role and text, and none selects a CSS Module class. There are no visual regression tests, so section 6 adds a baseline.

### 1. Foundations
- **Packages:** `tailwindcss` and `@tailwindcss/postcss` 4.3.x, `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui`. Add `frontend/postcss.config.mjs`.
- **Entry point stays `@tekcert/ui/styles.css`**, which gains `@import 'tailwindcss'` and `@source` lines for `frontend/src` and `packages/ui/src`.
- **`tokens.css` remains the source of truth.** The palette, light/dark values and cookie-based theme (ADR-010) don't change. A new `theme.css` exposes them to Tailwind with `@theme inline`.
- **`base.css` moves into `@layer base`. This is required:** unlayered CSS beats every Tailwind layer, so today's `h1, h2, h3, p { margin: 0 }` and `a { color }` would silently cancel utilities like `mt-4`.
- **Dark mode:** `@custom-variant dark` follows `data-theme`, and also the OS when no theme is forced, so it matches `tokens.css`. Tokens already switch by themselves, so `dark:` should be rare.
- **Default colour palette turned off** (`--color-*: initial`), keeping only `white`, `black`, `transparent` and `current`. An ad-hoc `bg-blue-500` then doesn't exist, which enforces the CLAUDE.md token rule.

### 2. Token mapping
**shadcn variables, defined from our tokens:**

| shadcn | TekCert | shadcn | TekCert |
|---|---|---|---|
| `--background` | `--bg` | `--muted` | `--sf2` |
| `--foreground` | `--ink` | `--muted-foreground` | `--ink3` |
| `--card`, `--popover` | `--sf` | `--accent` | `--pri-sf` |
| `--card-foreground`, `--popover-foreground` | `--ink` | `--accent-foreground` | `--pri` |
| `--primary` | `--pri` | `--destructive` | `--err` |
| `--primary-foreground` | `--pri-ink` | `--border` | `--ln` |
| `--secondary` | `--sf2` | `--input` | `--ln2` |
| `--secondary-foreground` | `--ink` | `--ring` | `--focus` |

**TekCert tokens, as utilities:**
- Colours: `text-ink2`, `text-ink3`, `bg-sf`, `bg-sf2`, `border-ln2`, `bg-pri-sf`, `text-gold`, `bg-gold-sf`, `bg-gold-fill`, `text-ok`, `bg-ok-sf`, `text-warn`, `bg-warn-sf`, `text-err`, `bg-err-sf`, `bg-hero`, `text-hero-ink`, `bg-spec-sdia` and the other specialties.
- Radius: `rounded-tag`, `rounded-field`, `rounded-card`, `rounded-pill`. Shadow: `shadow-raised`, `shadow-elevated`.
- Fonts: `font-serif`, `font-sans`, `font-mono`.
- **Type styles become `type-display`, `type-h1` … `type-code` (`@utility`), not `text-h1`.** Our `--text-*` tokens are `font` shorthands, while Tailwind's `--text-*` namespace expects sizes. `tailwind-merge` could also mistake `text-h1` for a colour and drop one of them.
- Breakpoints: Tailwind's `md` 768, `lg` 1024 and `xl` 1280 already match ADR-010. Existing `max-width` rules translate directly to `max-md:` and friends. Add `xs` (480) and named breakpoints for the two one-off widths (1100 and 1200).
- **Off-scale design values stay exact:** `text-[14.5px]`, `border-[1.5px]`, `gap-[7px]`. Rounding them would drift from /design. Values that repeat get promoted to theme tokens.

### 3. shadcn setup
- **Lives in `packages/ui`** (CLAUDE.md: base components go there), using shadcn's monorepo layout: `components.json` in both `packages/ui` and `frontend`, generated files in `packages/ui/src/components/ui/`.
- **Written by hand, not with `shadcn init`,** because init rewrites the CSS and installs its defaults. Components come from `shadcn add`, previewed with `--dry-run`.
- **Radix primitives** (the CLI default and the best documented).
- **Icons stay Material Symbols** through our `<Icon>` (ADR-010). Generated `lucide-react` imports are swapped out and the package isn't installed.
- **The generated files are edited to our design:** heights (44, 36 and 48 px), 1.5 px borders, our focus treatment.
- **Public API kept:** `Button`, `Field`, `Select` and the rest stay the exports of `@tekcert/ui`, built on the shadcn primitives. Call sites don't churn. `cx` becomes `cn`.

| Today | Becomes |
|---|---|
| `Button`, `IconButton`, `buttonClass` | `button` with cva variants (primary, secondary, ghost, sm, icon, outlined) |
| `Badge` | `badge` |
| `Field`, `PasswordField` | `input` + `label` |
| `Checkbox` | `checkbox` |
| `Alert` | `alert` |
| `Select` (hand-built combobox) | `select` |
| `FilterSheet` (native `<dialog>`) | `sheet`, bottom side |
| `PhotoStep` crop dialog (native `<dialog>`) | `dialog` |
| Certification tabs | `tabs`, still driven by `?tab=` |
| Community scope switch | `toggle-group` |
| Onboarding `Switch` | `switch` |
| Onboarding progress bar | `progress` |
| `Avatar` | `avatar` |
| Catalog and certification skeletons | `skeleton` |

**Stays custom, restyled in Tailwind:**
- `Sidebar` and `BottomNav`: shadcn's `sidebar` has its own cookie, layout and widths, and would fight the server-rendered sidebar state and the design.
- `Pagination`, which is URL-driven and has phone-specific markup.
- `EmptyState`, the certification cards and the single Start toast (`sonner` isn't worth a dependency for one message).
- `Splash` animation: moved to `@theme` keyframes.
- **View transitions:** the auth `::view-transition-*` rules can't be written as utilities, so they stay as a small plain CSS block in `@layer base`. This is the only hand-written CSS left beyond tokens, theme and element defaults.

### 4. Coexistence rule during the migration
CSS Modules are unlayered, so they beat Tailwind utilities. **A component is converted whole.** No element carries both a module class and utilities, and a module file is deleted in the commit that finishes it. Every commit leaves the app working.

### 5. Order of work
1. **Baseline:** screenshots from the current code (section 6).
2. **Foundations:** Tailwind, layers and theme with no visual change. The first check is that Turbopack, the `@source` paths, `standalone` output and the workspace aliases all work together.
3. **`packages/ui`** rebuilt on shadcn (412 lines).
4. **Shell** (700 lines), since every screen sits inside it.
5. **Auth** (450).
6. **Catalog** (947).
7. **Certification page** (957).
8. **Onboarding** (1,253).
9. **Cleanup:** remove the leftovers, `cx`, and the CSS Modules option in `vitest.config.mts`; add the lint rule; docs; checklist.

### 6. Tests
- **Visual baseline (new, local only, `e2e/visual/`):** Playwright screenshots of every route and main state at 1440 and 390, light and dark, taken before any change and compared after each phase. Not added to CI, because font rendering differs between machines.
- **Vitest (web):** role-based tests should mostly carry over. To rewrite: `Select.test.tsx` (Radix Select has different internals) and the `showModal` mock in `catalog.test.tsx`. `vitest.setup.ts` gains the jsdom polyfills Radix needs (pointer capture, `scrollIntoView`, `ResizeObserver`).
- **Playwright:** the existing 1440 and 390 suite must stay green, with selector updates for Select and the sheet.
- **Accessibility pass:** keyboard use of select, sheet, dialog, tabs, switch and toggle-group; visible focus; 44 px touch targets.

### 7. Expected behaviour changes
- **Select:** Tab no longer commits the highlighted option, unlike the hand-built one. Radix also locks page scroll while the list is open, so I'll check for layout shift.
- **Sheet and dialog:** they render in a portal instead of a native `<dialog>`. Focus trap, Esc and tap-outside stay; Radix now provides them.
- **JavaScript:** Radix adds some client JS to screens using these widgets. Server components stay server components. Sizes before and after go in the sprint notes.
- **Future CSP (S08):** Radix sets inline styles for positioning, so a strict `style-src` would have to allow them. There is no CSP today.

### 8. Docs
- **ADR-019** replaces the "Components use CSS Modules; there is no Tailwind" line of ADR-010. Its fonts, cookies and breakpoints still stand.
- **CLAUDE.md:** add Tailwind and shadcn to the Stack, and how to add a component.
- **PLAN.md:** add this sprint between S03 and S04.
- **`frontend/AGENTS.md`:** left alone, it's generated by `next dev`.

### Risks
- **Size:** about 4,700 lines of CSS to convert and check against the designs, roughly one full sprint. Onboarding is the largest and riskiest.
- **Long-lived branch:** S04 shouldn't start until this merges, or the two will conflict on every screen.
- **CI:** the GitHub Actions billing lock noted on S03 has to be lifted before "CI green" can be confirmed.

### Questions
1. **How should it look?** Keep the current look exactly, with Tailwind and shadcn underneath and /design as the reference **(Recommended: CLAUDE.md requires matching /design)**? Or adopt the default shadcn look, which means changing /design and every screen's visual rules first?
2. **When does it start?** Finish S03 first: commit the 13 files of uncommitted work (including the new `Select`), merge PR #8, then branch from `main` **(Recommended: it follows the one-sprint-at-a-time rule and avoids migrating a moving target)**? Or start now on top of the S03 branch and ship both together?
3. **How far does it go?** Convert everything in this sprint and delete all CSS Modules **(Recommended: mixing the two is what section 4 guards against, and S04+ then starts clean)**? Or set up Tailwind and shadcn, convert only `packages/ui` and the shell, and migrate the other screens as later sprints touch them?

## Notes / decisions

### Outcome (2026-11-09)
Tests:
- frontend: 86 (Vitest); backend: 54 unit + 69 API e2e (Jest)
- Playwright: 60 passing at 1440 and 390 px (17 skipped by design: desktop-only or mobile-only tests), including 6 new keyboard tests
- Screenshots: 215 at 1440 and 390, light and dark, plus widths between the breakpoints. All 50 test groups match the pre-migration build to within 25 pixels per screen.

Format, lint, typecheck and build pass. GitHub Actions has not run this branch (the billing lock noted on S03).

Baselines (`e2e/visual/__screenshots__`, not in git) come from the pre-migration build, with two exceptions, both checked by hand:
- `sign-in-error`: the first capture had a random email in the field, so it was re-captured. That email was the only difference.
- The open sort menu is captured at viewport size, because a full-page capture resizes the window and Radix closes the list. It differed by 0 pixels from the pre-migration capture.

Bundle, total of all route chunks, uncompressed:

| | Before | After |
|---|---|---|
| JavaScript | 1,282,517 bytes | 1,533,339 bytes (+20%) |
| CSS | 68,991 bytes | 75,571 bytes (+10%) |

Where the build differs from the plan:
- **`Checkbox` API changed:** `onChange(event)` became `onCheckedChange(checked)`, because the box is now a Radix button rather than a native input. The two call sites are updated. The other exports keep their API.
- **One `components.json`, not two:** only `packages/ui` needs it, since every primitive lives there.
- **The shadcn CLI needs cleaning up after:** it wrote `import { cn } from "cn"` and added an unrelated npm package named `cn`. Both are fixed here, and CLAUDE.md says what to do next time.
- **`toggle.tsx` is generated but unused:** the toggle group doesn't need it. It can be deleted.
- **Avatar:** the photo appears once it has loaded, with the initials until then, because Radix renders it on the client.

Behaviour changes, as expected in section 7:
- **Select:** Tab no longer commits the highlighted option, focus moves through the options instead of `aria-activedescendant`, and the list closes when the window is resized.
- **Sheet and dialog:** they render in a portal and slide or fade in. Radix returns focus to its own trigger, and these open from state, so `useReturnFocus` restores it.

Reset side effects found by the screenshots and fixed (useful for S04 onwards): Preflight's `img { max-width: 100% }` can squeeze an image in a flex row, and it removes the default padding of inputs and text-only buttons. A later `text-[…]` in `cn()` drops an earlier `leading-[…]`, so put the line height after the size.
