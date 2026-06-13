# Design System Compliance Audit — Violations Report

**Date:** 2026-06-11 · **Scope:** `frontend/src/components` + `frontend/src/app` (scripts/tests excluded) · **Method:** six parallel rule-dimension sweeps against `design-system/design-system.md`, headline findings spot-verified against source. **Read-only — no changes made.**

Line numbers are as-found; treat as approximate anchors in very large files (XmlImportTab, IatiImportTab).

---

## Executive summary

| # | Theme | Scale | Severity |
|---|---|---|---|
| 1 | Primary-button drift (`bg-gray-900` / `bg-blue-600` instead of `bg-primary`) | ~22 buttons / 15 files | **P0** |
| 2 | Lifecycle statuses as colored pills / missing code chips | 10+ files | **P0** |
| 3 | Zebra striping — incl. a **shared component** (`ui/finance-table.tsx`) | 8 files | **P0** |
| 4 | Financial chart colors wrong or bypassing `chart-colors.ts` | 6 high + 4 medium files | **P0** |
| 5 | Local `formatCurrency`/`formatDate` definitions (explicitly banned by `lib/format.ts`) | **~203 defs / 140+ files** | **P0 (bulk)** |
| 6 | Date-format drift (`en-US`, `MMM d, yyyy`) | ~123 call sites | **P0 (bulk)** |
| 7 | Z-index layer violations (`z-[100000]`, `z-[9999]` popovers under dialogs) | 14 files | **P1** |
| 8 | Table anatomy drift (rounded wrappers, tiny headers, hand-rolled tables) | ~25 files | **P1** |
| 9 | Code-chip drift (`text-[10px]`/`text-[9px]`, amber bg, unchipped codes) | ~12 files | **P1** |
| 10 | Icons inside Dialog/AlertDialog titles | 13 dialogs | **P1** |
| 11 | `'N/A'` / `'-'` instead of em-dash; hardcoded `$` | 69 + 15 sites | **P1** |
| 12 | Focus ring hardcoded `ring-blue-500`; required `*` instead of RequiredDot | ~40 + 6 | **P2** |
| 13 | Dead `dark:` classes; hardcoded grays; arbitrary font sizes; blue accent dots | ~98 + misc | **P2/cleanup** |

---

## P0 — Fix first (high-visibility, clear violations)

### 1. Primary-button drift

Canonical: the one primary action per view = `bg-primary` (#1d1f21) + `rounded-md`.

**`bg-gray-900 hover:bg-gray-800` (should be `bg-primary hover:bg-primary/90`):**
- `navigation/SidebarNav.tsx:356` — **"Add New Activity"** (the app's most prominent CTA) ✓ verified
- `navigation/SidebarNav.tsx:452` — "Submit Project" (project-bank)
- `navigation/SidebarNav.tsx:466` — "Register Parcel" (land-bank)
- `app/home/page.tsx:178` — module action buttons
- `iati/bulk-import/BulkImportWizard.tsx:187–190` — wizard step indicators
- `activities/ResultsTab.tsx:2204` — `<Badge className="bg-gray-900 text-white">On Track</Badge>` (an "On Track" status as gray-900 — should be the success badge)
- `project-bank/appraisal/AppraisalProgressRail.tsx:163,223,304` — completed-step state

**`bg-blue-600/blue-500` action buttons (16 instances, 10+ files):**
- `activities/XmlImportTab.tsx:9482, 9527, 10886, 10984` — import/submit buttons
- `activities/IatiImportTab.tsx:14471` — "Apply Mapping"
- `activities/LinkedActivitiesTab.tsx:475` — Search button (`bg-blue-600 … rounded-lg` — two violations in one)
- `activities/FundFlowGraph.tsx:447,460,473` — view-mode toggles (active state)
- `activities/FinancialAnalyticsTab.tsx:1274,1286` — period toggles
- `activities/LinkedTransactionsTab.tsx:236` — icon action button
- `app/iati/page.tsx:151`, `app/iati-import/page.tsx:1147`, `app/global-error.tsx:20`
- `ExampleActivityEditorInline.tsx:192,209`

### 2. Status composition violations (Rule A: code chip left, no colored lifecycle pills)

**Lifecycle statuses rendered as colored pills:**
- `activities/EnhancedActivityEditor.tsx:613` — "Implementation" → `bg-blue-100 text-blue-800`
- `dashboard/OrgActivitiesTable.tsx:68,78` + `dashboard/BookmarkedActivitiesTable.tsx:68,78` — blue/yellow status pills
- `organizations/analytics/ProjectsTable.tsx:51–52` — pipeline → blue pill
- `admin/PendingValidationsManagement.tsx:94,98` — status codes 2/6 → blue/yellow pills
- `analytics/ProjectPipeline.tsx:155–169` — full colored status map (blue/green/yellow)
- `StrategiesTab.tsx:145–147` — colored status pills

**Status shown without its code chip:**
- Activities list table status column (verified live earlier — "Implementation" bare)
- `dashboard/OrgActivitiesTable.tsx:454–458` — bare label
- `activities/ActivityCardModern.tsx:204` — plain text status in card footer

### 3. Zebra striping (8 files — rule: hairline dividers only, no zebra)

- `ui/finance-table.tsx:170` — `index % 2 === 1 && "bg-muted/5"` ✓ verified — **a shared component striping by default; fixing this one file fixes every consumer**
- `analytics/Top10GovernmentValidatedChart.tsx:294`, `Top10ActiveProjectsChart.tsx:252`, `Top10SectorFocusedChart.tsx:278` — `index % 2 … 'bg-muted' : 'bg-white'`
- `analytics/AidMap.tsx:176`, `analytics/ProjectPipeline.tsx:225` — `bg-card`/`bg-muted` alternation
- `organizations/OrganizationFundingVisualization.tsx:573`, `analytics/FundingOverTimeAnalytics.tsx:684` — inline-style zebra with platinum

### 4. Financial chart-color violations (single-source-of-truth rule)

Adoption is ~73% of chart files, but:

- `analytics/PlannedActualDisbursementBySector.tsx:65–70` ✓ verified — local palette commented *"slate-only for dashboard consistency"* renders **Planned Disbursements as `#4c5568`** (canonical `#ebb434`) and **Actual Disbursements as `#7b95a7`** (canonical `#db444b`). A deliberate local choice that directly contradicts the canon — needs a decision, then alignment.
- `activities/FinancialAnalyticsTab.tsx:278–283, 422, 438, 458` — imports `getFinancialSeriesColor` but then uses local `COLORS` arrays + `COLORS[index % length]` for Sankey/Area series (non-deterministic; commitments rendered `#3B82F6`)
- Orphaned recharts default `fill="#8884d8"` on `<Pie>`: `charts/ActivityStatusChart.tsx:410`, `charts/TransactionTypeChart.tsx:253`, `analytics/SectorPieChart.tsx:258`, `charts/SectorAnalysisChart.tsx:271` (Cells override it, but it's a landmine)
- `charts/FundFlowSankey.tsx:35` — local red-ramp palette (possibly intentional "actual spend" emphasis — document or align)
- `analytics/FundingOverTimeAnalytics.tsx:51–61` — local green/amber/indigo for actual/partial/indicative (colors not in the system)

### 5. Local formatter definitions — ~203 across 140+ files

`lib/format.ts` header explicitly bans this ("Import from here — do NOT define formatCurrency/formatDate locally"). Worst user-visible offenders:

- `TransactionsManager.tsx:979–985` (two local formatters in the main transactions editor)
- `organizations/OrganizationTable.tsx:90` (also falls back to `'-'` instead of `—`)
- `activities/ActivityCardModern.tsx:59`, `activities/ActivityHeroCards.tsx:152,161`
- `ActivityAnalyticsCharts.tsx:296`, `MyanmarRegionsMap.tsx:100`, `maps/SubnationalChoroplethMap.tsx:157` — all hardcode `$` (USD assumption)
- `dashboard/HeroVisualizationCards.tsx:186–187`, `analytics/CoordinationCirclePack.tsx:88–112`, `analytics/national-priorities-dashboard/ExecutingAgenciesChart.tsx:66–88` (3 formatters in one file)

### 6. Date-format drift — ~123 call sites

Canonical: `formatDate()` → "18 May 2024" (en-GB, D MMM YYYY).

- `toLocaleDateString('en-US')` — **68 occurrences** (e.g. `admin/PendingValidationsManagement.tsx:78`, `ui/version-badge.tsx:20`, `activities/PeriodRowEnhanced.tsx:148–152`)
- `format(…, 'MMM d, yyyy')` (month-first, comma) — 30+: `CommentsDrawer.tsx:384` (**comments appear everywhere**), the whole tasks suite (`TaskCard.tsx:155`, `TaskTable.tsx:334`, `CreatedTasksTable.tsx:358`, `CreateTaskModal.tsx:201`), `ui/document-dropzone.tsx:388`, `ui/year-range-chip.tsx:307`, `organizations/ProjectTimeline.tsx:126–127,208`
- `toLocaleDateString('en-AU')` on chart axes: `OrganizationSpendTrajectoryChart.tsx:401`, `ActivitySpendTrajectoryChart.tsx:352`, `PortfolioSpendTrajectoryChart.tsx:693`

---

## P1 — High priority

### 7. Z-index layer violations

Canonical: dialogs 10000 → menus 10001 → popovers 10005 → tooltips 10010; NProgress 9999.

- `activities/TransactionCalendarHeatmap.tsx:1100` — **`z-[100000]`** ✓ verified — sits above everything including tooltips
- `ChartFullscreen.tsx:67,85` — overlay `z-[999]` / content `z-[1000]` — a fullscreen takeover that sits **under** dialogs and NProgress
- `z-[9999]` popovers/menus that will render **under any open dialog**: `maps/MapStyleSelect.tsx:47`, `maps/MapSearch.tsx:194`, `admin/SectorMappingsManagement.tsx:968`, `activities/IatiImportTab.tsx:13809`, `activities/XmlImportTab.tsx:10141`, `reports/FieldPreviewTooltip.tsx:145` (a tooltip — should be 10010), `MobileGate.tsx:28`
- Odd mid-range one-offs: `TransactionsManager.tsx:200` (`z-[200]`), `TransactionList.tsx:242,1276` (`z-[100]`/`z-[200]`)

### 8. Table anatomy drift

- **Rounded tables** (square-corner rule): `AidEffectivenessForm.tsx:2229`, `GovernmentInputsSectionEnhanced.tsx:969,1318`, `ui/document-dropzone.tsx:341`, `AdminUserTable.tsx:717`
- **Header drift** (`text-helper`/`text-sm` + `p-2` instead of 16px medium muted `px-4 py-3`): `GovernmentInputsSectionEnhanced.tsx:972–976,1321–1323`, `AidEffectivenessForm.tsx:2233–2234`, `government/ContributionModal.tsx:818–824`, `ui/document-dropzone.tsx:345–346`, `dashboard/MyPortfolioTab.tsx:297+,340+,384+,437+`, `organizations/OrganizationContactsTab.tsx:737,746,750`
- **Canon inconsistency**: `ui/chart-data-table.tsx:310,333` headers use `text-foreground` where `ui/table.tsx` says `text-muted-foreground` — the two canonical table components disagree; pick one
- **Currency cells without the muted-prefix pattern**: `TransactionModal.tsx:1705–1723`, `transaction/TransactionMultiElementManager.tsx:268–297` (bare `.toLocaleString()`), `iati/bulk-import/BulkPreviewStep.tsx:1424,1463,1833` (currency code same weight as value)
- **Hand-rolled `<table>`s** bypassing the shared components (15+ files, incl. all Top10 analytics charts, MyPortfolioTab, ContributionModal) — each re-invents header/cell styling and is where most drift above lives

### 9. Code-chip drift

- `text-[10px]` chips: `activities/ActivityProfileHeader.tsx:867–945` (7×), `activities/IatiImportTab.tsx:1110–1363` (5×), `organizations/OrganizationFormContent.tsx:1706`
- `text-[9px]` chips: `activities/IatiImportTab.tsx:1416–1556` (9×)
- **Amber chip backgrounds** (`bg-amber-100 text-amber-800/900` on IDs/codes): `organizations/OrgTypeMappingModal.tsx:170`, `OrganizationFormContent.tsx:2106`, `EditOrganizationModal.tsx:1567`, `activities/IatiImportFieldsTable.tsx:5497` — if "legacy/changed" semantics are needed, that's a warning badge next to a normal chip, not an amber chip
- **Unchipped codes** (`font-mono text-xs` with no bg/padding/radius): `activities/TransactionForm.tsx:843,1217,1310,1343,1376,1409` (select options), `SDGAlignmentSectionSimplified.tsx:468`
- `ActivityCardModern.tsx:167,172` — ID chips `bg-white/20` stacked below title (overlay variant is legit on imagery, but stacking violates the inline rule for list contexts)

### 10. Icons inside dialog titles (existing rule: DialogTitle is text-only)

- `ui/confirmation-dialog.tsx:65` — **the shared confirmation dialog renders `{displayIcon}` inside DialogTitle**, propagating the violation to DeleteAccountModal, ResetPasswordModal, PasswordChangeDialog, EmailChangeConfirmDialog
- `CommentsDrawer.tsx:398` — MessageSquare in title
- AlertDialogTitle with icons: `EditOrganizationModal.tsx (~1350)`, `OrganizationFormContent.tsx (~2300)`, `PBSectorsManagement.tsx (~968)`, `NationalPrioritiesManagement.tsx (~1200)`, `GeographyLevelToggle.tsx (~180)`, `SectorAllocationModeToggle.tsx (~230)`
- Hand-rolled modals bypassing the Dialog system entirely (no surface-muted header, z-50): `calendar/EventDetailModal.tsx:429`, `calendar/EventCreateModal.tsx:544`

### 11. Empty values & currency symbols

- `'N/A'` — **69 instances** (canon: muted em-dash `—`): `LocationsTab.tsx:547`, `organizations/OrganizationFundingEnvelopeTab.tsx:430`, `organizations/IATIBudgetManager.tsx:344`, `locations/ActivityLocationsTable.tsx:177`, `activities/IatiSearchTab.tsx:435,444`, XML/IATI import tabs (10+), `project-bank/EIRRCalculatorModal.tsx:205–222`
- `'null'` rendered as literal string: `forms/DefaultFieldsSection.tsx:166–310` (7×)
- Single hyphen `'-'`: `organizations/OrganizationTable.tsx:91`
- Hardcoded `$` assuming USD: ~15 sites in maps/charts (MyanmarRegionsMap, SubnationalChoroplethMap, ActivityAnalyticsCharts, sector/donor charts)

---

## P2 — Cleanup / lower priority

- **Focus ring color**: ~40 inputs with `focus:ring-blue-500` instead of `focus:ring-ring` (e.g. `ActivityEditor.tsx:169–236`, `TransactionModal.full.tsx:1401,1432`); a handful with `outline-none` and no ring at all (`TransactionModal.tsx:3316`)
- **Required asterisks** instead of RequiredDot (6): `land-bank/ParcelWizard.tsx:201,227`, `project-bank/AddDonorModal.tsx:65`, `see-assessment/StageTransferMode.tsx:190`, `StageSEEProfile.tsx:48`, `app/project-bank/transfers/new/page.tsx:100`
- **Dead `dark:` classes**: **98 occurrences** (dark mode disabled by design) — top: SidebarNav (10), ActivityLocationsHeatmap (7), reports/page (7), `ui/popover.tsx` (6 — in the shared component), Atlas (6), LandBankMapShell (6)
- **Hardcoded grays**: `text-gray-500/600` + `border-gray-300` small pockets (`data-clinic/DataClinicEntity.tsx:307`, `DataClinicOrganizations.tsx:457`, `maps/*` map-frame borders); `dark:bg-gray-900/60` overlays (TopNav, OrganizationEditor)
- **Arbitrary font sizes**: `text-[15px]` rich-text descriptions in `ActivityProfileHeader.tsx:737–758` (should be `text-body`), `text-[13px]` breadcrumb in `ProfileHero.tsx:116` + profile badges, `text-[7px]/[8px]` micro-labels in `StageMSDPScreening.tsx:291,303`, `AidEffectivenessForm.tsx:513`
- **Page-title drift**: `app/transactions/[id]/page.tsx:137` (`text-2xl font-semibold`), `app/policy-markers/[id]/edit/page.tsx:172` (`text-xl`)
- **Blue accent dots/markers** (`bg-blue-500`) on timelines/maps/legends (~15 sites: DateRevisionHistory, FundFlowGraph legend, LocationMap, ui/map, sdg-avatar-group, iati-import) — should standardize on a token (brand cool-steel/blue-slate or primary)
- **Input height outliers**: `ui/region-searchable-select.tsx:106` and `ui/hierarchical-admin-select.tsx:262` at `h-11`
- **Status colors off-script (minor)**: `CustomGroupCard.tsx:165` green "public" badge; `SDGAlignmentSectionSimplified.tsx:302–303` green/blue save-state buttons; `profile/RailStatusTimeline.tsx:11–12` blue pipeline dots
- **GPEDC orange `#F37021`** (`AidEffectivenessForm.tsx`, 7×) — domain-specific indicator color; either adopt as a named token or align to brand

## Remediation log

**2026-06-11 — the four shared-component violations are FIXED:**
- `ui/finance-table.tsx` — zebra striping removed; row hover aligned to canonical `hover:bg-muted/50` (was `bg-muted/10`).
- `ui/confirmation-dialog.tsx` — icon removed from DialogTitle (text-only rule); unused `icon` prop deleted (no consumers passed it).
- `ui/chart-data-table.tsx` — both header cells `text-foreground` → `text-muted-foreground`, matching `ui/table.tsx`.
- `ui/popover.tsx` — dead `dark:` classes stripped from both content variants.

**2026-06-11 — primary-button drift FIXED (P0 item 1):** all `bg-gray-900`/`bg-blue-600`/`bg-blue-500` primary-action buttons → `bg-primary` (+`text-primary-foreground hover:bg-primary/90`; `rounded-lg`→`rounded-md` where hand-rolled): SidebarNav ×3, home/page, BulkImportWizard steps, XmlImportTab ×4, IatiImportTab, iati-import step indicators (incl. `bg-green-600` past-step → `bg-primary/70`), iati/page, LinkedActivitiesTab, LinkedTransactionsTab, FundFlowGraph ×3, FinancialAnalyticsTab ×2, ExampleActivityEditorInline ×2, global-error, AppraisalProgressRail ×3. ResultsTab On-Track/Attention/Off-Track badges converted from gray ramp to semantic success/warning/error badges. Verified live: sidebar CTA renders #1d1f21. NOTE: GlassButton's own 12px radius left as-is (component-level design choice — decide separately).

**2026-06-11 — status composition FIXED (P0 item 2):** new shared `ui/status-row.tsx` (`StatusRow` + `ActivityStatusRow`, with overlay variant) adopted everywhere a lifecycle status renders: Activities list status column (app/activities/page.tsx), OrgActivitiesTable, ProjectsTable, ProjectPipeline, PendingValidationsManagement, EnhancedActivityEditor, ActivityCardModern (overlay chip in banner), ActivityProfileHeader, ActivityOverviewTab, ActivityCard, FundDisbursementsView, funds page ×2. All colored lifecycle pill maps deleted (incl. dead map in BookmarkedActivitiesTable); `activity-status-utils.ts` colored classes neutralized to `bg-muted text-foreground` for any legacy caller. StrategiesTab publication statuses remapped to the semantic set (success/warning/muted — no more blue/orange/purple). Verified live: Activities table renders `[2] Implementation`.

**2026-06-11 — zebra striping FIXED (P0 item 3):** all 7 `index % 2` patterns removed (Top10GovernmentValidated/ActiveProjects/SectorFocused charts, AidMap, ProjectPipeline, OrganizationFundingVisualization, FundingOverTimeAnalytics) → canonical `border-b hover:bg-muted/50` rows (inline-style platinum zebra dropped).

**2026-06-11 — chart colors FIXED (P0 item 4):** PlannedActualDisbursementBySector "slate-only" palette replaced with canonical anchors (Budget `BUDGET_COLOR`, Planned `PLANNED_DISBURSEMENT_COLOR`, Disbursement `getTransactionTypeColor('3')`, Commitment `('2')`) — decision: dashboard consistency now comes from the shared palette, not a local slate ramp. FinancialAnalyticsTab Sankey's local 5-hex array deduplicated to `CHART_COLOR_PALETTE` (org nodes are categorical, so index-based brand palette is sanctioned). All four orphaned recharts-default `fill="#8884d8"` replaced with `OTHERS_COLOR` (ActivityStatusChart, TransactionTypeChart, SectorPieChart, SectorAnalysisChart). NOTE: audit's claim of `#3B82F6` area-chart colors in FinancialAnalyticsTab was a false positive — not present. FundFlowSankey red-ramp + FundingOverTimeAnalytics data-type colors left as documented intentional choices.

**2026-06-11 — z-index layers FIXED (P1 item 7):** TransactionCalendarHeatmap `z-[100000]`→`z-[10005]`; ChartFullscreen overlay/content `z-[999]/[1000]`→`z-[10000]` (dialog layer); MapStyleSelect override removed (inherits SelectContent `z-[10001]`); MapSearch + SectorMappingsManagement popovers → `z-[10005]`; Xml/IatiImportTab fixed dropdowns → `z-[10001]`; FieldPreviewTooltip → `z-[10010]`. MobileGate left at `z-[9999]` intentionally (app-level banner, below dialogs). TransactionsManager/TransactionList mid-range one-offs (z-100/200) left — local stacking contexts, no dialog conflict.

**2026-06-12 — bulk codemods DONE (P0 items 5–6 + P2):**
- Focus rings: all `focus:ring-blue-*` → `focus:ring-ring`, `focus:border-blue-500` → `focus:border-ring` (28 sites, 15 files) — zero residual.
- Dead `dark:` classes: all stripped from src/components + src/app (~76 tokens) — zero residual. Lint-verified, no parse breakage (159 files touched by the combined codemod).
- Date formats: `'MMM d, yyyy'` (and `MMMM`/`dd`/datetime variants) → day-first `'d MMM yyyy'` (~85 literals); `toLocaleDateString('en-US')` → `'en-GB'` (29 files) — all dates now render day-month-year per `lib/format.ts` canon. Zero residual.
- Formatter consolidation (worst user-visible 18 files, via 3 parallel agents + verification): TransactionsManager, OrganizationTable, ActivityCardModern, ActivityHeroCards, ActivityAnalyticsCharts, HeroVisualizationCards, ProjectsTable, TopProjectsChart, AidOverTimeChart, IATIBudgetManager, OrganizationFundingEnvelopeTab, MyanmarRegionsMap, SubnationalChoroplethMap, CoordinationCirclePack, ExecutingAgenciesChart, FinancialAnalyticsTab, CommentsDrawer, currency-tooltip — local `formatCurrency`/`formatDate` definitions deleted, now importing from `@/lib/format`; table-style cells keep the muted USD-prefix presentation; `'N/A'` fallbacks in these files → `—`. CommentsDrawer keeps a `formatDateTime` (time-of-day, day-first pattern) — sanctioned exception. All 18 lint at 0 errors.
- STILL OPEN from the formatter class: the long tail (~120 more files with local formatters, e.g. ActivityBudgetsTab, ActivityCard, ActivityCardWithSDG/ForExport, DisbursementsBySectorChart) and the remaining `'N/A'` sites outside the 18 — same recipe applies.

**2026-06-12 — enforcement layer ADDED:**
- `PageTabsList` / `PageTabsTrigger` added to `ui/tabs.tsx` (the canonical white-track/muted-pill page bar); all 14 hand-copied override sites migrated (data-clinic, organizations, admin ×3, library, iati-import, dashboard, profile, analytics-dashboard, working-groups, RecycleBin, OrgFinancialTabs, activities/[id] tier-2 trigger). The `text-helper` drift on organizations' triggers normalized to text-body in the process. Nested default sub-tabs untouched.
- ESLint guardrails in `.eslintrc.json` (`no-restricted-syntax`, error level, verified firing): bans `dark:` classes, month-first `'MMM d, yyyy'` patterns, `toLocaleDateString('en-US')`, and recharts-default `#8884d8`. Date codemod extended to ALL of `src` (`.ts` incl. lib/api/export files) so the repo lints clean with the rules on — zero residuals.
- Deferred to "warn-later": bans on `bg-gray-900`/`bg-blue-600` buttons and local `formatCurrency` defs — can't be errors until the long tail (9/15/127 residual sites) is cleared.

**2026-06-13 — formatter long-tail DONE (P0 formatter class closed):** all 135 files with local `formatCurrency`/`formatDate`/`formatValue` defs processed via 8 agent batches across two days. Outcome: the ONLY remaining non-delegating money formatter in the tree is `ui/currency-value.tsx` itself (the canonical source). All other surviving defs are sanctioned thin wrappers that delegate to `@/lib/format` (measure-aware `formatValue` routing the currency case to the lib; `formatDate` wrappers adding `—` fallbacks; month-year/long-month date helpers the lib doesn't provide). Data-table cells migrated to the shared `<CurrencyValue>` (muted ISO-prefix style preserved, never flipped to `$`); charts use `formatAxisCurrency`/`formatTooltipCurrency`/`formatCurrencyCompact`; `'N/A'`/`'-'`/`'Not available'` UI fallbacks → `—`. Repo lints clean (0 errors) with the guardrails on; zero `#8884d8` / en-US dates / `MMM d, yyyy` / `dark:` remain.

**Ban-promotion note:** the two deferred warn-tier bans (`bg-gray-900`/`bg-blue-600` on buttons; local `formatCurrency` defs) are NOT cleanly promotable to eslint errors via `no-restricted-syntax`: button-class residuals (24) are all legit non-button uses (timeline dots, kanban/status colors) and a literal-string ban can't scope to buttons; a `const formatCurrency` ban would false-positive on the sanctioned delegating wrappers + the canonical component. Promotion would need either a custom rule that inspects JSX element type / call body, or first eliminating the 24 non-button color uses. Left deferred deliberately.

**Pre-existing (not introduced here):** `<YAxis tickFormatter={formatAxisCurrency}>` trips TS2769 (recharts types the 2nd param as `index:number`, lib's is `currency?:string`; runtime-safe via the lib's code-normalizer). Repo-wide, predates this work — candidate for a follow-up signature widen or arrow-wrap.

**2026-06-13 — production build GREEN:** `next build` exit 0, ✓ Generating static pages (222/222), full route table emitted. The two prior failures were the documented PageNotFoundError flake (different `/api/*` route each run, all routes exist+tracked+unmodified by this work, compile/typecheck/lint always passed). Bulk of the design-system work committed by the user (c73e22c7 + worktree-agent merges); ~4 last-batch files lint-clean and pending the next commit.

All other findings in this report remain open.

## Notes & judgment calls

- `ActivityCardModern.tsx:157` title `line-clamp-2`: cards plausibly clamp by design (unlike tables). Flagged, but decide before treating as a bug.
- Brand-hex usage in `OrganizationTable` type badges, `badge.tsx` pb-* variants, `AdminUserTable` blue-slate text = **compliant** (intentional brand tokens), excluded from counts.
- `finance-table.tsx` zebra is extremely subtle (`bg-muted/5`); it still violates the written rule — either fix the component or amend the rule.
- Two shared components contradict the canon themselves (`finance-table` zebra, `confirmation-dialog` icon-in-title, `chart-data-table` header color, `popover.tsx` dark: classes) — fixing those four files removes violations from dozens of consumer screens at once.

## Suggested fix order (if/when you want changes)

1. **Shared components first** (finance-table, confirmation-dialog, chart-data-table, popover) — highest leverage.
2. SidebarNav CTAs + the 16 blue buttons (mechanical find/replace to Button/`bg-primary`).
3. Status pills → code-chip+label (one shared `StatusRow` adoption pass).
4. Chart colors: decide on PlannedActualDisbursementBySector's "slate-only" stance, then align FinancialAnalyticsTab + remove `#8884d8` fills.
5. Bulk codemods: local formatters → `@/lib/format` (203), date formats (123), `'N/A'` → `—` (69), `dark:` strip (98), `ring-blue-500` → `ring-ring` (~40).
6. Z-index: heatmap popover, ChartFullscreen, the six `z-[9999]`s.
