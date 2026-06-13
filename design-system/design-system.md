# æther / AIMS Design System

Reverse-engineered 2026-06-11 from `frontend/tailwind.config.js`, `src/app/globals.css`, the shared `src/components/ui/` library, and verified against **rendered computed styles** on the live Activities screen. When code and render disagreed, the rendered value won and the mismatch is listed in [Deviations](#deviations-found-during-the-audit).

Companion files: `styleguide.html` (visual source of truth), `tokens.css` (CSS custom properties + utilities), `components.jsx` (drop-in React snippets).

---

## 1. Foundations

### 1.1 Color

Neutrals carry the UI. Brand colors are accents only.

| Token | Value | Role |
|---|---|---|
| `background` | `#ffffff` | Page and card background |
| `foreground` | `#0a0a0a` (hsl 0 0% 3.9%) | Primary text |
| `primary` | `#1d1f21` (hsl 210 6% 12%, "gunmetal") | Solid buttons, selected states, checkboxes |
| `primary-foreground` | `#fafafa` | Text on primary |
| `muted` | `#f5f5f5` (hsl 0 0% 96.1%) | Code-chip bg, ghost/outline hover, row hover (at 50%), secondary buttons |
| `muted-foreground` | `#737373` (hsl 0 0% 45.1%) | Secondary text, chip text, table headers, helper text |
| `border` / `input` | `#e5e5e5` (hsl 0 0% 89.8%) | Every border, divider, and input outline |
| `ring` | `#0a0a0a` | Focus rings |
| `destructive` | `#ef4444` | Destructive buttons/text only |
| `surface-muted` | `#f6f5f3` | **Structural** warm gray: left sidebar, table `<thead>`/`<tfoot>`, dialog headers, hover-cards |

**The three light grays are distinct on purpose — never substitute:**

- `#f5f5f5` (`muted`) — *interactive* gray: chips, hovers, secondary buttons.
- `#f6f5f3` (`surface-muted`) — *structural* gray: sidebar, table header bands, modal headers.
- `#f1f4f8` (`platinum`) — *brand tint*: chart backgrounds, Project Bank badges. Never as a neutral surface.

**Brand palette** (charts, accents, Project Bank pipeline): scarlet `#dc2625`, blue-slate `#4c5568`, cool-steel `#7b95a7`, pale-slate `#cfd0d5`, platinum `#f1f4f8`.

**Semantic feedback** (badges/alerts; consumed as `hsl(var(--…))`):

| Intent | bg | text | border | Allowed for |
|---|---|---|---|---|
| success | `142 76% 93%` | `143 64% 24%` | `142 69% 84%` | Validated, accepted, copy-success check icon |
| warning | `48 96% 89%` | `41 96% 25%` | `48 96% 77%` | Pending Validation, "Unlinked" org badge, caution |
| error | `0 93% 94%` | `0 63% 31%` | `0 93% 87%` | Rejected, failed |
| info | `214 95% 93%` | `224 71% 30%` | `214 93% 85%` | Neutral notices |

**Color-usage rules**

- **DO** color *validation/publication state* badges with the semantic set above. **DON'T** color IATI lifecycle statuses (Pipeline/Implementation/Closed…) — those are plain text with a code chip (§3.1). *Why: lifecycle is data, not feedback; coloring it implies judgement.*
- **DO** route every chart color through `src/lib/chart-colors.ts` (`getTransactionTypeColor`, `getFinancialSeriesColor`). **DON'T** hardcode hex in chart components. *Why: kills "same series, different color on another page".*
- **DO** reserve scarlet `#dc2625` for brand accent moments and `destructive #ef4444` for delete actions. **DON'T** use scarlet as a generic highlight.

### 1.2 Typography

- **Family:** Geist Sans (body), Geist Mono (codes only). Loaded via `geist/font` in `layout.tsx`; mono exposed as `--font-geist-mono`.
- **Default size is 16px** — including buttons, table headers, and table cells. This is unusual and deliberate; don't "correct" new screens down to 14px.
- Tabular figures (`tabular-nums`) apply automatically to `table` and `.font-mono` content (set globally in `globals.css`).
- All headings get `text-wrap: balance` globally.

| Role (Tailwind token) | Size / line-height | Weight | Notes |
|---|---|---|---|
| `text-page-title` | 30px / 1.15 | 700 | One per page |
| `text-section-title` | 24px / 1.2 | 600 | |
| `text-card-title` | 20px / 1.3 | 600 | Chart/card headings |
| dialog title (`text-lg`) | 18px | 600 | Text-only — **no leading icon** |
| `text-body` | 16px / 1.55 | 400 | Default everywhere |
| `text-helper` | 14px / 1.5 | 400 | Secondary text, usually `text-muted-foreground` |
| `text-section-label` | 12px / 1.3, +0.05em | 400–500 | UPPERCASE eyebrow, `text-muted-foreground` |
| `text-caption` / chip | 12px / 1.4 | 400 | Code chips use this size in Geist Mono |

### 1.3 Spacing, radii, shadows, z-index

- **Spacing:** Tailwind 4px grid. Canonical paddings — chip `2px 6px`; dense cell `8px 16px`; th `12px 16px`; default cell `16px`; card/dialog `24px`; empty state `48px`.
- **Radii:** `4px` chips (`rounded`) · `6px` buttons/inputs/badges (`rounded-md`) · `12px` cards/dialogs (`rounded-lg` = `--radius: 0.75rem`) · **`0` tables — square corners app-wide, no exceptions.**
- **Shadows:** `shadow-card` `0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)` resting; `shadow-card-hover` for clickable cards; dialogs use `shadow-xl`.
- **Z-index layers:** content ≤50 · leaflet map 200–800 · NProgress bar 9999 · dialog overlay+content `z-[10000]`.
- **Motion:** buttons `transition-all duration-150` + `active:scale-[0.97]`; accordions 200ms; **only chart-expand modals animate** (opt-in `chart` prop on `DialogContent`); everything else opens instantly. `prefers-reduced-motion` is honored globally.
- **Breakpoints:** Tailwind defaults; container is centered, 2rem padding, max `1400px`.

---

## 2. Components

### 2.1 Buttons (`ui/button.tsx`)

Base: `inline-flex items-center justify-center whitespace-nowrap rounded-md text-body font-medium transition-all duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none`.

| Variant | Recipe | Use |
|---|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` | The single primary action of a view |
| `secondary` | `bg-secondary hover:bg-secondary/80` | Co-equal secondary actions |
| `outline` | `border border-input bg-background hover:bg-muted` | Toolbars, filters (e.g. "Compact" toggle) |
| `ghost` | `hover:bg-muted` | Icon buttons, dense rows |
| `destructive` | `bg-destructive hover:bg-destructive/90` | Delete/irreversible only |
| `link` | `text-primary underline-offset-4 hover:underline` | Inline navigation |

Sizes: default `h-10 px-4 py-2` · `sm h-9 px-3` · `lg h-11 px-8` · `icon h-10 w-10`.

- **DO** use `bg-primary` (#1d1f21) and `rounded-md` for primary CTAs. **DON'T** use gray-900 `#111827` or `rounded-lg` (the sidebar "Add New Activity" currently does both — see Deviations). *Why: one primary color, one button radius.*
- States to support every time: default / hover (90% bg) / active (scale .97) / focus-visible (2px ring, 2px offset) / disabled (50% opacity, no pointer events).

### 2.2 The code chip (`ui/code-badge.tsx`, `ui/copyable-id-badge.tsx`)

The signature element. **Every machine code renders in this chip:** IATI identifiers, partner/activity IDs, status codes, transaction-type codes, finance/aid-type codes, sector codes.

Recipe (verified rendered): `font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground` → Geist Mono 12px, `#737373` on `#f5f5f5`, padding 2px 6px, radius 4px, tabular figures.

- Copyable variant (IDs): wrap in a `<button>` adding `hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1`; show a green check (`--success-icon`) for 1.5s after copy; toast "… copied to clipboard". Use the shared `CopyableIdBadge`.
- Overlay variant (on imagery): `bg-white/20 text-white/90`.
- **DO** keep 12px (`text-xs`). **DON'T** shrink to `text-[10px]` (one profile section does — see Deviations), bold it, color it, or make it a pill.

### 2.3 Badges (`ui/badge.tsx`)

`inline-flex items-center rounded-md px-2.5 py-0.5 text-helper font-semibold`. Use semantic variants (`success`/`warning`/`gray`…) for state feedback, `pb-*` variants for Project Bank pipeline. Badges are 14px semibold *sans* — never confuse with the 12px mono code chip.

### 2.4 Tables (`ui/table.tsx`)

Anatomy and rules (verified rendered on Activities):

| Part | Spec |
|---|---|
| Container | `TableContainer` = `border overflow-hidden` — single outer hairline, **square corners** |
| Header | `<thead>` `bg-surface-muted border-b`; th `h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground`; no uppercase, no bold |
| Body row | `border-b transition-colors hover:bg-muted/50`; last row borderless; **no zebra striping** |
| Cell | `p-4 align-top` default; dense list tables (Activities, Transactions) use `px-4 py-2` |
| Numbers | `text-right tabular-nums`; currency as `<span class="text-helper text-muted-foreground">USD</span> <span class="font-medium">36.0m</span>` |
| First/label column | `font-medium` |
| Footer / totals | `bg-surface-muted font-semibold border-t-2 border-border` |
| Sorting | single `ChevronUp/Down h-4 w-4 text-muted-foreground` shown **only on the active column**; sortable th adds `cursor-pointer hover:bg-muted/80` |
| Empty state | `EmptyState` card: `p-12 text-center`, illustration at 60% opacity, body-medium title, muted message, optional `sm` button |

- **DO** right-align every numeric column. **DON'T** left-align numbers or render full unabbreviated amounts in list tables (use `36.0m` style with muted `USD` prefix).
- **DO** wrap long titles (`whitespace-normal break-words leading-tight`). **DON'T** truncate activity titles in tables.

### 2.5 Forms (`ui/input.tsx`)

Input: `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50`. Label above: `text-body font-medium mb-1`. Helper below: 14px muted. Filter-bar triggers are the `outline` button at `h-9` with a leading 16px icon.

**Required, errors & autosave:**

- Required marker = `RequiredDot`: a 6px red dot (`w-1.5 h-1.5 rounded-full bg-destructive ml-1 align-middle`) after the label — **not an asterisk**.
- Field error = 14px destructive text below the field (`text-helper text-destructive mt-1`); the input border stays neutral.
- Editor fields autosave via the `autosave-input`/`autosave-select` wrappers (label + save indicator + field + error slot, `space-y-2`). Indicator states: saving = `CircleDashed h-4 w-4 text-orange-600 animate-spin` beside the label; saved = `CheckCircle h-4 w-4 text-[hsl(var(--success-icon))]` (green-800). Don't hand-roll save feedback.

### 2.6 Cards & dialogs (`ui/card.tsx`, `ui/dialog.tsx`)

- Card: `rounded-xl border border-border/60 bg-card shadow-card ring-1 ring-black/[0.03]`; `CardHeader p-6`, `CardContent p-6 pt-0`; `CardTitle text-2xl font-semibold tracking-tight`; hover lift (`shadow-card-hover`) only when clickable.
- Dialog: overlay `bg-black/50 backdrop-blur-sm z-[10000]`; panel `max-w-lg p-6 border shadow-xl sm:rounded-lg max-h-[85vh]`.
- **DialogHeader is always `bg-surface-muted px-6 py-4 border-b`** (full-bleed via `-mx-6 -mt-6`). Title `text-lg font-semibold`, **text-only — never a leading icon**.
- Only chart-expand modals animate (grid-centered fade+zoom via the `chart` prop). Form/confirm dialogs open instantly.

### 2.7 Section labels

`text-section-label uppercase tracking-wider text-muted-foreground` (12px, +0.05em). Used above detail groups ("Parties Involved", "Status Indicators"). Sidebar group headings use the same token.

### 2.8 Icons

Lucide. Standard `h-4 w-4`; tiny inline affordances (copy, check) `h-3 w-3`; avoid `h-5 w-5` except hero contexts. Inline icon color follows the text it accompanies (`text-muted-foreground` default).

### 2.9 Other shared components — quick reference

All recipes verbatim from `src/components/ui/` (import counts in parentheses; full rendered examples in `styleguide.html` §8–§12).

| Component | Recipe / rule |
|---|---|
| **Label** (240) | `text-body font-medium leading-none`, above the field |
| **Select trigger** (222) | input silhouette: `h-10 rounded-md border-input bg-background px-3 py-2 text-body justify-between` + muted chevron; placeholder `text-muted-foreground` |
| **Skeleton** (176) | `animate-pulse rounded-md bg-muted`; gradient `.skeleton-shimmer` for large blocks; match the real content's shape |
| **Tooltip** (143) | **light**, never inverted: `rounded-md border bg-white px-3 py-1.5 text-body text-muted-foreground shadow-lg max-w-[16rem]`, `z-[10010]`; leaf components self-provide `TooltipProvider` |
| **Textarea** (133) | input recipe + `min-h-[80px] resize-y` |
| **Popover** (128) | `rounded-md border bg-white p-4 shadow-lg`, `z-[10005]` |
| **Alert** (122) | `rounded-lg border px-4 py-3 text-body` white bg, icon absolute top-left; destructive = red border/50 + red text, **bg stays white** |
| **Command/combobox** (85) | `h-11` input row with bottom hairline, 300px scroll list, items `rounded-sm px-2 py-1.5 text-body aria-selected:bg-accent` |
| **DropdownMenu** (84) | panel `min-w-[8rem] rounded-md border bg-white p-1 shadow-md z-[10001]`; items `rounded-sm px-2 py-1.5 text-body hover:bg-muted`; destructive items red text, not red bg |
| **Tabs — page navigation** (canonical, 10+ pages) | **use `PageTabsList` + `PageTabsTrigger` from `ui/tabs.tsx`** (added 2026-06-12 — never re-type the classes). Recipe: track `p-1 h-auto bg-background gap-1 border flex flex-wrap mb-6` (white, hairline border, wraps); trigger `gap-2 rounded-md px-3 py-1.5 text-body font-medium` with leading `h-4 w-4` icon; **active = muted pill** (`data-[state=active]:bg-muted … shadow-sm`); counts = destructive Badge `h-5 min-w-5 px-1`, capped "99+" |
| **Tabs — nested sub-tabs** (ui/tabs.tsx default) | the inverse (muted track, raised white active pill) — ONLY for small toggles inside a tab's content (e.g. Activities/Organisations inside My Portfolio); never page-level. Content fades 150ms |
| **Switch** (74) | `h-6 w-11 rounded-full`; **brand colors**: checked `#4c5568` blue-slate, unchecked `#cfd0d5` pale-slate — never green |
| **Checkbox** (72) | `h-4 w-4 rounded-sm border-primary`; checked `bg-primary text-primary-foreground` |
| **Avatar** (38) | `h-10 w-10 rounded-full` + `.image-outline` inset ring; fallback initials on `bg-muted` |
| **Progress** (37) | track `h-2 rounded-full bg-secondary`; bar `#4c5568` blue-slate (informational, not green); striped `.progress-stripes` for active operations |
| **DatePicker trigger** (25) | same as select trigger; unselected `text-muted-foreground`; selected calendar day = pill on `#1d1f21` |
| **Breadcrumbs** (23) | `flex gap-1.5 text-body text-muted-foreground mb-4`; current `font-medium text-foreground`; truncate `max-w-[200px]` |
| **CardShell** (13) | profile-card outlier: `rounded-3xl`, `h-48` banner + black gradient overlay, 56px circular logo overlay, dashed rip-line — profile/gallery cards only |
| **CompactChartCard** (8) | Card + `CardHeader pb-2`, 18px semibold truncated title, top-right cluster of `h-7 w-7` bordered icon buttons (incl. serif ƒ formula tooltip) |
| **Toasts** (global) | sonner in `layout.tsx`: `top-center richColors closeButton duration=5000 expand`, 14px body, action button `#166534` white; always `toast.success/error`, never custom |
| **VersionBadge** (3) | `text-[9px] font-semibold uppercase tracking-wide rounded bg-muted text-muted-foreground/80` — the one sanctioned sub-12px text |
| **Pagination** | quiet text buttons `px-2 py-1 rounded text-body text-muted-foreground hover:bg-muted`; active page `bg-muted font-semibold` (component exists but pages mostly hand-roll this — converge on it) |

**Overlay stacking is fixed:** dialogs `z-10000` → select/dropdown menus `z-10001` → popovers `z-10005` → tooltips `z-10010`. All open with fade + `zoom-in-95` `ease-out-expo`, 150ms close.

---

## 3. Composition rules (hard requirements)

### 3.1 Status + code

**Whenever a status (or any coded classification) is shown, its code appears to its LEFT as a code chip.**

```html
<span class="inline-flex items-center gap-1.5">
  <code class="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">2</code>
  <span class="text-body">Implementation</span>
</span>
```

- ✅ `[2] Implementation` · `[3] Disbursement` · `[110] Standard grant`
- ❌ Bare `Implementation` (the Activities-table status column currently does this — fix target)
- ❌ Colored pill for lifecycle statuses
- *Why:* the code is the IATI ground truth; the label is a translation. Showing both makes rows scannable and exports unambiguous.
- When the label wraps in a narrow cell, float the chip: `float-left mr-1.5 mt-0.5` (TransactionTable finance-type cell).

### 3.2 Activity ID + title

**ID and title sit inline on one line; the title wraps while staying aligned; the chip anchors the first line.** The chip is rendered *inside* the heading element (verified live markup):

```html
<h3 class="font-medium text-foreground leading-tight min-w-0 [text-wrap:wrap]">
  <button class="mr-1.5 align-middle text-xs font-mono bg-muted text-muted-foreground
                 hover:bg-muted/70 hover:text-foreground px-1.5 py-0.5 rounded
                 whitespace-nowrap inline-flex items-center gap-1">PARTNER-41119000</button>
  Strengthening Maternal &amp; Newborn Health Services in Conflict-Affected Areas
  <span class="font-medium text-foreground"> (SMNHS)</span>
</h3>
```

- ✅ Chip first with `mr-1.5 align-middle whitespace-nowrap`; title flows and wraps after it.
- ❌ ID stacked above/below the title in lists; ❌ truncating the title to avoid wrapping; ❌ ID after the title.
- *Why:* the fixed-format mono chip gives every row a stable visual anchor; inline flow means no second row to mis-align.

### 3.3 Title + acronym

**The acronym always accompanies the title, in the SAME family, size, and weight, as ` (ACRONYM)`.**

- ✅ `Central Dry Zone Smallholder Agriculture and Climate Resilience Project (AGRI-CDZ)` — acronym span is `font-medium text-foreground`, i.e. identical to the title.
- ❌ Smaller/lighter/muted acronym; ❌ separators other than a single space + parentheses (no em-dash, no comma); ❌ acronym rendered as a chip or badge.
- *Why:* users search and recognize activities by acronym; demoting it visually buries the most-recognized token.

### 3.4 Numbers and currency

`text-right tabular-nums`; muted 14px `USD` prefix + foreground 500 compact value (`36.0m`). Totals rows `font-semibold` on `surface-muted` with a 2px top border.

### 3.5 Surfaces

- Tables: square corners, always (`TableContainer`, never `rounded-*` on table wrappers).
- Dialog headers: always `bg-surface-muted`, text-only titles.
- Sidebar/table-header/totals share `surface-muted` — that consistency is the "structure vs content" cue; don't paint content areas with it.

---

## 4. Deviations found during the audit

Normalization choices — the canonical value is listed first; the deviation should migrate toward it.

1. **Activities table "Activity Status" column renders the bare label** (`Implementation`) with no code chip — violates §3.1. TransactionTable and the profile header already comply. *Canonical: `[code] Label` status-row.*
2. **Sidebar "Add New Activity" CTA** renders `#111827` (Tailwind gray-900) at 12px radius instead of `bg-primary #1d1f21` at `rounded-md` 6px. *Canonical: `bg-primary` + `rounded-md`.*
3. **Chip size drift:** profile "IATI Classification Details" uses `text-[10px]` chips; everywhere else is `text-xs` (12px). *Canonical: `text-xs`.*
4. **Hardcoded grays in `globals.css` calendar/datepicker overrides** (`#f3f4f6`, `#e5e7eb`, `#6b7280`, `#9ca3af`, `#d1d5db`) — cool-toned Tailwind grays that don't match the neutral tokens. *Canonical: token equivalents (`muted`, `border`, `muted-foreground`).*
5. **Page title** renders 30px/36px/700 (`text-3xl font-bold`) rather than the defined `text-page-title` (30px/1.15). Same size, slightly different leading. *Canonical: use the `text-page-title` token.*
6. **Two badge-ish systems coexist** by design: 14px semibold sans `Badge` (state feedback) vs 12px mono `CodeChip` (machine codes). Not a bug — documented so they don't get cross-used.

---

## 5. App shell & page layout

- **Sidebar:** 288px (`w-72`), bg `surface-muted #f6f5f3`, hairline right border. Active item = **raised white pill**: `bg-[hsl(var(--nav-active-bg))] rounded-md font-semibold shadow-sm ring-1 ring-black/5`; hover `--nav-hover-bg` (near-white). Group headings use the section-label token. Per-module accents: `--nav-accent-aims #dc2625`, `--nav-accent-project-bank #4c5568`, `--nav-accent-land-bank #7b95a7`. The global primary CTA ("Add New Activity") lives in the sidebar, not page headers.
- **Page header:** 30px/700 title + 16px muted subtitle; page-level utility actions top-right. Below it the **filter bar**: 16px medium muted labels above 36px outline-style triggers, view toggles right-aligned.
- **Profile pages** open with `ProfileHero` — fixed heights, exported constants: **360px with banner image / 260px without**. Never eyeball these.
- **Loading:** route transitions show the NProgress top bar (3px, slate `#64748b`, no spinner). In-content loading = skeletons shaped like the real content (§2.9); spinners only inside buttons/inline ops.
- **Responsive stance:** desktop-first. Mobile shows the `MobileGate` overlay ("Best on a bigger screen"); don't invest in sub-768px layouts. Tables overflow with horizontal scroll, never reflow to cards.
- **Dark mode is intentionally disabled** (`darkMode: ['selector', '.__dark-mode-disabled__']`). Never add `dark:` variants; existing ones are dead code.
- **Accessibility:** icon-only buttons always get `aria-label`; global `:focus-visible` ring is the only focus treatment (never remove without replacing); `prefers-reduced-motion` is honored globally; copy actions announce via toast.

## 6. Status systems (domain → treatment mappings)

Three **independent axes** — never merge or cross-color them:

| Axis | Source | Values & treatment |
|---|---|---|
| Activity lifecycle | IATI activity-status codelist (`data/activity-status-types.ts`) | `1` Pipeline · `2` Implementation · `3` Finalisation · `4` Closed · `5` Cancelled · `6` Suspended — **code chip + plain label, no color** |
| Validation | `lib/validation-status.ts` (3-state display model) | Pending Validation = warning badge · Validated = success badge · Rejected = error badge. Raw `submission_status` values (draft/submitted/pending…) all collapse to "Pending Validation" — never surface them in UI |
| Publication | `publication_status` | Draft = gray badge · Published = success badge. "Is it publicly visible" — independent of validation |

**Project Bank pipeline** uses the dedicated `pb-*` Badge variants (in `badge.tsx`): progression darkens through the brand slate ramp — Entry `#f1f4f8`, In-progress `#e8ecf1`, Review `#7b95a7`, Approved/Active `#4c5568` (white text), Done `#cfd0d5`, Rejected `#dc2625`. Use the variants, don't recreate.

Transaction types follow the lifecycle treatment in tables (`[3] Disbursement` chip+label) and get their canonical chart color (§7) in visualizations.

## 7. Chart colors (single source of truth)

`src/lib/chart-colors.ts` is authoritative. **Financial-series colors are deterministic per IATI code — never assigned by series index** — so a Disbursement is the same red on every chart, page, legend, and tooltip. Resolve via `getTransactionTypeColor(code)` / `getFinancialSeriesColor(name)` (the latter maps any human label — "Budget", "Commitments", "Cumulative Disbursements" — to the same hue as its transaction type).

| Code | Series | Hex |
|---|---|---|
| 1 | Incoming Funds | `#3ebcd2` |
| 2 | Outgoing Commitment | `#379a8b` |
| 3 | Disbursement (hero) | `#db444b` |
| 4 | Expenditure | `#9a607f` |
| 5 | Interest Payment | `#d1b07c` |
| 6 | Loan Repayment | `#758d99` |
| 7 | Reimbursement | `#a81829` |
| 8 | Purchase of Equity | `#78405f` |
| 9 | Sale of Equity | `#00788d` |
| 10 | Credit Guarantee | `#818a00` |
| 11 | Incoming Commitment | `#b4ba39` |
| 12 | Outgoing Pledge | `#89a2ae` |
| 13 | Incoming Pledge | `#3d89c3` |
| — | **Budget** (anchor) | `#006ba2` |
| — | **Planned Disbursement** (anchor) | `#ebb434` |
| — | Total Spending (aggregate) | `#3f5661` |
| — | Perfect-spend reference line | `#a4bdc9` |
| — | "All Others" / unknown codes (`OTHERS_COLOR`) | `#94a3b8` |

Supporting palettes, by use case:

- **Ranked slate ramp** (`CHART_RANKED_PALETTE`, slate-700→100): share-of-whole and Top-N charts where the only signal is "darker = higher" (sector pies, rankings).
- **Economist extended palette** (20 hues anchored on the same red/blue/yellow): only for high-cardinality categorical breakdowns (~20 DAC sectors).
- **Brand 5-color palette** (`CHART_COLOR_PALETTE`): only ad-hoc non-financial categories with no canonical color.

Rules: DO route every financial color through the resolvers; DON'T hardcode hex, use recharts defaults, or index-based assignment; DO use `OTHERS_COLOR` for unknowns; DO give every analytics card the ƒ formula-tooltip button.

## 8. Content & formatting standards

Canonical helpers: `src/lib/format.ts` and `ui/currency-value.tsx`. Import them — never define local formatters.

| What | Standard | Example |
|---|---|---|
| Currency — charts/cards/tooltips | `formatCurrency`: **symbol first**, compact 1-dp lowercase k/m/b, sign first, currency-aware symbol via Intl | `$23.4m`, `€43.3k`, `-$1.2b`, `$850` |
| Currency — data-table cells | `<CurrencyValue>`: muted 14px ISO code + tabular value (uppercase M/B/k), right-aligned | `USD 36.0M` |
| Expanded tooltips | `formatCurrencyPrecise` (full 2-dp) when a chart modal is expanded | `$23,400,000.00` |
| Dates | `formatDate`: en-GB "D MMM YYYY", no leading zero. Relative dates are a separate concern | `18 May 2024` |
| Empty values | Em-dash `—` in `text-muted-foreground` — never "N/A"/"null"/blank | — |
| Missing titles | Literal `Untitled Activity` | |
| Spelling & case | British English ("Organisations", "Finalisation"); sentence case for UI copy; Title Case only for nav items and page titles | |
| Table numbers | `tabular-nums` (automatic inside `<table>` and `.font-mono`) | |

**The two currency styles are deliberate and context-scoped:** symbol-first compact for narrative surfaces; muted ISO-code prefix inside data tables (the code disambiguates multi-currency rows). Don't mix styles within one surface.

## 9. Quick checklist for new screens

- [ ] Geist Sans 16px body; codes in Geist Mono 12px chips
- [ ] Every status/classification = chip code left + label right (`gap-1.5`)
- [ ] Activity rows: chip inside the `<h3>`, title wraps, ` (ACRONYM)` same weight
- [ ] Tables: square corners, `surface-muted` header, no zebra, numbers right + tabular, muted `USD` prefix
- [ ] One `bg-primary` button per view; everything else outline/ghost/secondary
- [ ] Dialog header `bg-surface-muted`, text-only title; no animation unless it's a chart-expand
- [ ] Colors: semantic set for validation states only; charts via `chart-colors.ts`; scarlet sparingly
- [ ] Focus: rely on the global `:focus-visible` ring; never `outline: none` without a replacement
- [ ] Money/dates via `format.ts` / `<CurrencyValue>`; `—` for empty; British spelling
- [ ] Statuses mapped per §6 (lifecycle = chip, validation/publication = badges); chart series per §7
- [ ] Required = red dot, errors = 14px destructive text, editor fields use autosave wrappers
- [ ] No `dark:` variants; no sub-768px work (MobileGate covers it)
