# Activity Profile — Data Inventory

**Purpose.** Phase 0 deliverable for the Aether DFMIS unified profile-page redesign. This file enumerates every data element rendered on the current Activity profile page, maps it to a new home in the redesigned layout, and applies a Keep / Move / Merge / Deprecate decision per row. No element ships out of the redesign without an explicit decision in this file.

**Status.** Pass 1 — Header & top strip only. Subsequent passes will append: Overview tab → Finances tab → Sectors → Geography → SDG → Policy Markers → Partners → Contacts → Results → Library → Discussion → Related → Gov Inputs → Analytics → API-only fields → IATI cross-check.

---

## Methodology

For each element rendered or potentially-rendered on `/activities/[id]`:

1. **Source** — where the value comes from. API field path on the `/api/activities/[id]` JSON, computed expression, or external lookup.
2. **Currently shown where** — file:line reference in the current codebase.
3. **Visible by default?** — true/false. "False" means user has to click a tab, expand a section, or hover/scroll to see it.
4. **New design location** — exact placement in the new shell: hero · Overview anchor-section · tab/sub-tab · rail block · drawer.
5. **Decision** — Keep / Move / Merge / Deprecate.
6. **Notes** — rationale, blockers, dependencies.

Per the spec, default decision when in doubt is Keep — Overview tab, "Additional details" anchor section. Deprecate decisions require written rationale and explicit Leigh sign-off.

---

## Decisions log

Confirmed before this inventory was written:

| # | Decision | Rationale |
|---|---|---|
| 1 | **Tab collapse: 13 → 5.** Top tabs become Overview · Finances · Results · Documents · History. | Spec cap of 5 tabs to preserve information scent. |
| 2 | **Anchor-nav inside Overview** for sub-sections (About / Classifications / Geography / Partners / SDGs / Policy Markers). Not a second tab row. | Lighter UI, doesn't dilute top-row scent, scrolls naturally. |
| 3 | **Sub-tabs inside Finances** for Transactions / Budgets / Planned Disbursements / Analytics. | Distinct datasets, each needs its own surface. |
| 4 | **`focal_points` table is a Phase 1 schema prerequisite.** New first-class entity per the spec's data-model addition. Rail Focal Points block renders empty state until migration ships. | No existing data source. Cannot be derived from contacts or contributors without ambiguity. |
| 5 | **IATI completeness check anchors to `app/api/activities/[id]/export-iati/route.ts`** (the file the UI actually calls), not to `iati-xml-generator.ts` or `iati-export.ts` (orphan files, no callers). | Verified by grep: only `export-iati/route.ts` is imported by UI code. The two `lib/iati-*` files are dead and can be deleted in a separate cleanup. |
| 6 | **Two production emitters fork is a separate finding** — not a UI gap. The production emitter `export-iati/route.ts` is missing many IATI 2.03 elements that we store in the DB (sectors, policy markers, budgets, planned-disbursements, results, locations, contacts, default classifications, humanitarian-scope, country-budget-items). Logged in Appendix D. | Out of scope for the redesign; flagged for a follow-up bug. |

---

## Glossary of layout zones in the new shell

- **Hero** — coloured strip with title, type/status badges, IATI ref, action buttons. ~140–180px tall.
- **Overview anchor-sections** — sticky in-page jump-list inside the Overview tab. Sections in fixed order: About → Money → Classifications → Geography → SDGs → Policy Markers → Partners → Tags.
- **Top-row tab** — Overview / Finances / Results / Documents / History.
- **Finances sub-tab** — Transactions / Budgets / Planned / Analytics.
- **Rail block** — sticky right-rail component. Order: Focal Points → Participating Orgs → Status & Timeline → Key Numbers → Identity.
- **Drawer** — overlay surface launched from a tab body (e.g. "Full sector breakdown →" opens a Sankey drawer).

---

## Pass 1 — Hero & top strip

Source files: `frontend/src/components/activities/ActivityProfileHeader.tsx` (1010 lines) and `frontend/src/app/activities/[id]/page.tsx` lines 1551–1660.

### A. Toolbar (top-right action cluster)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Back to Activities button | `onNavigateBack` callback → `router.push('/activities')` | Header.tsx:306–313 | Yes | Hero top-left | **Keep** | Standard breadcrumb action; spec hero shows breadcrumb chevron. |
| 2 | View count | `viewCount` prop, hydrated separately | Header.tsx:317–322 | Yes (when > 0) | Identity rail block (lower row) | **Move** | Engagement metric is metadata, belongs in Identity not in primary toolbar. |
| 3 | Activity vote (likes/upvote) | `<ActivityVote activityId={...} />` | Header.tsx:323–325 | Yes | Hero top-right cluster | **Keep** | First-class engagement; per spec hero "action buttons" cluster. |
| 4 | Comments button (drawer trigger) | `<CommentsDrawer>` | Header.tsx:330–340 | Yes | Hero top-right cluster | **Keep** | Drawer behaviour preserved. |
| 5 | Bookmark / Save toggle | `useBookmarks()` hook | Header.tsx:342–356 | Yes | Hero top-right cluster | **Keep** | Spec lists Bookmark explicitly. |
| 6 | "More actions" overflow menu | inline | Header.tsx:359–416 | Yes (button); contents on click | Hero top-right cluster | **Keep** | Overflow pattern preserved. |
| 6a | → Add banner image | `setShowEditBanner(true)` | Header.tsx:373–376 | False (only if no banner) | Same overflow menu | **Keep** | Conditional render preserved. |
| 6b | → Add logo | `setShowEditIcon(true)` | Header.tsx:378–382 | False (only if no icon) | Same overflow menu | **Keep** | Conditional render preserved. |
| 6c | → Print as PDF | `onPrintPDF` callback | Header.tsx:385–388 | False (in menu) | Same overflow menu | **Keep** | |
| 6d | → Export as CSV | `onExportCSV` callback | Header.tsx:389–392 | False (in menu) | Same overflow menu | **Keep** | |
| 6e | → Export IATI XML | `GET /api/activities/[id]/export-iati` | Header.tsx:393–414 | False (in menu) | Same overflow menu | **Keep** | This is the production IATI emitter call. |
| 7 | Edit button | `<Link href="/activities/new?id=...">` | Header.tsx:420–426 | Yes | Hero top-right cluster | **Keep** | Permissions gate to be applied in Phase 1. |

### B. Banner image (optional)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 8 | Banner image | `activity.banner` (Supabase storage URL) | Header.tsx:464–475 | Yes (when uploaded) | Hero strip background | **Keep** | Spec: "Optional image upload. When present, the hero adds a 35% black gradient scrim from bottom-left so title text remains readable." Current scrim is `from-background/60 to-transparent` — Phase 1 should align to spec's 35% black scrim. |
| 9 | Banner vertical position | `activity.bannerPosition` | Header.tsx:470 | Yes (computed, not visible UI) | Hero (same) | **Keep** | Position selector in BannerUpload modal. |
| 10 | Bottom scrim gradient | inline | Header.tsx:473 | Yes (when banner) | Hero (same) | **Keep** | Restyle per spec. |

### C. Identity row (icon + title + status)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 11 | Activity icon/logo | `activity.icon` (Supabase storage) | Header.tsx:481–500 | Yes (when uploaded) | Hero — overlapping bottom edge | **Keep** | Spec doesn't mandate an icon; current icon-overlap pattern is good. Keep as-is. |
| 12 | Icon scale | `activity.iconScale` (0–100%) | Header.tsx:493–497 | Yes (computed) | Hero (same) | **Keep** | Edit-time control. |
| 13 | Activity title (h1) | `activity.title` | Header.tsx:505–510 | Yes | Hero — title position | **Keep** | Spec: 22–24px weight 500 white on coloured strip. Current is 30–36px on light bg — restyle to spec. |
| 14 | Acronym | `activity.acronym` | Header.tsx:507–509 | Yes (when present) | Hero — appended to title in parens | **Keep** | |
| 15 | Copy-title button | `onCopyToClipboard(title, "activityTitle")` | Header.tsx:511–521 | False (hover-reveal) | Hero — same hover pattern | **Keep** | |
| 16 | Reporting org logo | `reportingOrg.logo` | Header.tsx:529–535 | Yes (when present) | Hero — uppercase prefix line | **Move** | Spec hero bottom-left line is `ACTIVITY · XM-DAC-…`. Reporting org logo can sit alongside or replace `ACTIVITY` token. |
| 17 | Reporting org name (link to org profile) | `reportingOrg.id`, `.name`, `.acronym` | Header.tsx:536–546 | Yes | Hero prefix line + Identity rail block | **Move** | Hero shows a compact reference; full reporting-org metadata moves to Identity rail. |
| 18 | Activity status badge | `getActivityStatusDisplay(activity.activityStatus)` | Header.tsx:552 | Yes | Hero top-left badge cluster | **Keep** | Spec: Status badge top-left of hero. |
| 19 | Humanitarian badge | `activity.humanitarian` (boolean) | Header.tsx:555–557 | False (only if true) | Hero top-left badge cluster (next to status) | **Keep** | Spec lists Humanitarian flag = coral. Keep destructive-red current colour or shift to coral per spec. |

### D. Metadata strip (under identity row)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 20 | Primary ID label | computed: "IATI ID" \| "Ref" \| "ID" | Header.tsx:572 | Yes | Hero — uppercase prefix line | **Move** | One canonical ID always shown; secondaries move to Identity rail. |
| 21 | Primary ID value | `activity.iatiIdentifier` \| `partnerId` \| `auto_ref` | Header.tsx:567–568, 591 | Yes | Hero — uppercase prefix line | **Move** | Same as above. |
| 22 | Copy-primary-ID button | `onCopyToClipboard(...)` | Header.tsx:594–604 | False (hover) | Hero — keep hover-reveal | **Keep** | |
| 23 | Secondary IDs dropdown — Internal ref (`auto_ref`) | `activity.auto_ref` | Header.tsx:576–578, 615–626 | False (in dropdown) | Identity rail block | **Move** | All non-primary IDs go to Identity rail, no longer behind a hover dropdown. Deprecate the dropdown UI. |
| 24 | Secondary IDs dropdown — Partner ID | `activity.partnerId` | Header.tsx:579–581 | False (in dropdown) | Identity rail block | **Move** | Same as 23. |
| 25 | Secondary IDs dropdown — IATI ID (when not primary) | `activity.iatiIdentifier` | Header.tsx:582–584 | False (in dropdown) | Identity rail block | **Move** | Same as 23. |
| 26 | Country flags (top 4) + names | `countryAllocations[]` | Header.tsx:639–658 | Yes | Hero badge cluster (truncated) AND Geography anchor-section in Overview | **Keep** | Hero shows top 2 countries + "+N more"; full list with percentages in Overview Geography section. |
| 27 | "+N more" countries overflow | computed | Header.tsx:654–656 | Yes (when >4) | Hero (same pattern) | **Keep** | |
| 28 | Region badges (top 3) | `regionAllocations[]` | Header.tsx:660–668 | Yes | Hero badge cluster + Overview Geography section | **Keep** | |
| 29 | Active date range (start → end) | `activity.actualStartDate \|\| plannedStartDate` → `actualEndDate \|\| plannedEndDate` | Header.tsx:673–692 | Yes | **Status & Timeline rail block** | **Move** | Spec: Status & Timeline rail contains start, end, progress bar, "% of timeline elapsed". Hero gets a compact dates label. |
| 30 | "All dates" history drawer trigger | `<AllDatesHistory>` | Header.tsx:682–691 | False (icon click) | Status & Timeline rail block (drawer) | **Move** | Drawer launched from rail. |
| 31 | Custom dates | `activity.customDates[]` | Header.tsx:690 | False (in drawer) | Status & Timeline rail block (drawer) | **Keep** | |
| 32 | Last-updated timestamp | `activity.updatedAt` | Header.tsx:696–698 | Yes | Identity rail block | **Move** | Identity rail per spec. |
| 33 | Publication status pill | `activity.publicationStatus` ("published" / draft / etc) | Header.tsx:701–717 | Yes (when set) | Hero top-left badge cluster (small dot) AND Identity rail | **Keep** | Indicator stays in hero; explanation text in Identity rail. |
| 34 | IATI sync indicator (synced/outdated/From IATI) | `activity.autoSync`, `activity.syncStatus` | Header.tsx:719–756 | Yes (when iatiIdentifier set) | Identity rail block | **Move** | Spec rail Identity row: "Source (IATI / Manual / Imported)". |
| 35 | Last sync time | `activity.lastSyncTime` | Header.tsx:746–748 | False (in tooltip) | Identity rail block | **Move** | Surface in rail directly, not behind tooltip. |
| 36 | Auto-sync flag | `activity.autoSync` | Header.tsx:749–751 | False (in tooltip) | Identity rail block | **Move** | Rail row with toggle/indicator. |

### E. Description block (sits below hero on current page)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 37 | Description / general (description type=1) | `activity.description` | Header.tsx:770–772 | Yes | Overview tab — "About" anchor-section | **Keep** | Spec mockup: "About (description, ~3 lines visible, 'Show more')". |
| 38 | Objectives (description type=2) | `activity.descriptionObjectives` | Header.tsx:773–778 | Yes (when present) | Overview "About" — sub-heading | **Keep** | |
| 39 | Target Groups (description type=3) | `activity.descriptionTargetGroups` | Header.tsx:779–788 | Yes (when present) | Overview "About" — sub-heading | **Keep** | |
| 40 | Additional Information (Aether-specific, no IATI mapping) | `activity.descriptionOther` | Header.tsx:789–794 | Yes (when present) | Overview "About" — sub-heading | **Keep** | Aether-specific. Not emitted to IATI XML. Document this in IATI cross-check appendix. |
| 41 | Show more / Show less toggle | `isDescriptionExpanded` state | Header.tsx:796–813 | True (button); content hidden if combined > 500 chars | Overview "About" — same pattern | **Keep** | Threshold ok. Spec: "~3 lines visible, 'Show more'." |

### F. Description-block right column (a proto-rail today)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 42 | Participating Organisations heading | static | Header.tsx:821–823 | Yes | Participating Orgs **rail block** | **Move** | Per spec, Participating Orgs is rail block #2. |
| 43 | Org list (top 5) with role colour dots | `participatingOrgs[]` | Header.tsx:824–861 | Yes | Participating Orgs rail block | **Move** | Spec: "Compact list, no avatars, just name + role". Current uses colour dot + optional logo + name + role — close to spec. |
| 44 | Role colour mapping (funding=rose / extending=sky / implementing=amber / accountable=muted / other) | inline | Header.tsx:826–831 | Yes (computed) | Rail block | **Keep** | Phase 1 should align with spec status colours; current rose/sky/amber palette is fine for role identity. |
| 45 | Role label (Funding / Extending / Implementing / Accountable) | inline mapping | Header.tsx:832–837 | Yes | Rail block | **Keep** | Note: current code maps `org.role_type === "government"` → "Accountable". This conflates IATI role 2 (Accountable) with internal "government" type — verify in Phase 1 schema review. |
| 46 | Org logo (when present) | `org.organization.logo` | Header.tsx:842–844 | Yes (when present) | Rail block | **Keep** | |
| 47 | Org name link → /organizations/[id] | `org.organization.id`, `.name`, `.acronym`, `.narrative` | Header.tsx:845–855 | Yes | Rail block | **Keep** | |
| 48 | "+N more partners" toggle | `showAllPartners` state | Header.tsx:862–869 | False (when >5) | Rail block — link to "All partners →" Partners section in Overview | **Move** | Per spec, the rail shows a max preview (5) and links to the full list. Don't expand inline. |
| 49 | SDG Alignment heading | static | Header.tsx:874–878 | Yes (when sdgMappings) | Overview tab — "SDGs" anchor-section | **Move** | Spec doesn't put SDGs in the rail. Move to Overview anchor-section. (SDG profile pages are a separate template.) |
| 50 | SDG image grid (icons) | `<SDGImageGrid sdgCodes={...}>` | Header.tsx:879–883 | Yes | Overview tab — "SDGs" anchor-section | **Move** | Same. |

### G. IATI Classification Details block (sits below description, expanded by default if any field set)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 51 | "IATI Classification Details" heading | static | Header.tsx:894 | Yes (when `hasTechnicalDetails`) | Overview tab — "Classifications" anchor-section | **Move** | Group all classification fields under one anchor section. |
| 52 | Hierarchy code + label | `activity.hierarchy` (1–5), `HIERARCHY_LEVELS` map | Header.tsx:897–909 | Yes (when set) | Overview "Classifications" | **Keep** | Emitted to IATI XML as `iati-activity@hierarchy`. |
| 53 | Collaboration type code + name | `activity.collaborationType`, `getCollaborationTypeByCode()` | Header.tsx:910–922 | Yes (when set) | Overview "Classifications" | **Keep** | Stored in DB, **not** emitted to current production IATI XML — see Appendix D. |
| 54 | Default Flow Type code + label | `activity.defaultFlowType` (≠ "0"), `FLOW_TYPE_LABELS` | Header.tsx:923–935 | Yes (when set) | Overview "Classifications" | **Keep** | Stored in DB, **not** emitted to current production IATI XML — see Appendix D. |
| 55 | Default Finance Type code + label | `activity.defaultFinanceType` (≠ "0"), `FINANCE_TYPE_LABELS` | Header.tsx:936–948 | Yes (when set) | Overview "Classifications" | **Keep** | Same — Appendix D. |
| 56 | Default Aid Type code + label | `activity.defaultAidType` (≠ "0"), `AID_TYPE_LABELS` | Header.tsx:949–961 | Yes (when set) | Overview "Classifications" | **Keep** | Same — Appendix D. |
| 57 | Default Tied Status code + label | `activity.defaultTiedStatus` (≠ "0"), `TIED_STATUS_LABELS` | Header.tsx:962–974 | Yes (when set) | Overview "Classifications" | **Keep** | Same — Appendix D. |
| 58 | Activity Scope code + label | `activity.activityScope` (≠ "0"), `getActivityScopeLabel()` | Header.tsx:975–987 | Yes (when set) | Overview "Classifications" | **Keep** | Same — Appendix D. |

### H. Tags strip

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 59 | Tags badges (top 12) | `activity.tags[]` | Header.tsx:993–999 | Yes (when present) | Overview tab — "Tags" anchor-section (last) | **Move** | Currently dangling at the very bottom of the header block. Move to a proper Overview section. |
| 60 | "+N more tags" overflow | computed | Header.tsx:1000–1003 | Yes (when >12) | Same | **Keep** | |

### I. Financial Summary Strip (page.tsx, between header component and tabs)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 61 | Implementation-vs-plan % (big number) | `implementationVsPlanPercent` (computed: spent / budgeted) | page.tsx:1588–1591 | Yes | **Key Numbers rail block** + Overview "Money" anchor-section (large card) | **Move** | Spec rail: "Activity: Budget / Disbursed / Spent / % spent". Pick one location; recommend rail = primary, Overview Money = expanded view. |
| 62 | Progress bar (bar fill = implementationVsPlanPercent) | computed | page.tsx:1593–1601 | Yes | Status & Timeline rail block (timeline-elapsed bar) AND Key Numbers rail | **Merge** | Spec rail Status & Timeline shows "% of timeline elapsed", which is *time-based*, not *spend-based*. Current bar is spend-based and is mislabeled in the spec mapping. **Keep both bars but label distinctly** — spend bar in Key Numbers, time-elapsed bar in Status & Timeline. |
| 63 | Financial-delivery-% caption ("X% of committed funds spent") | `financialDeliveryPercent` (computed: spent / committed) | page.tsx:1602–1606 | False (only when ≠ implementation%) | Overview "Money" anchor-section | **Move** | Secondary metric; not rail-worthy. |
| 64 | Budgeted | `totalBudgeted` (computed from `budgets[]`, USD) | page.tsx:1611–1614 | Yes | Key Numbers rail block (compact) + Overview Money section (full) | **Keep** | |
| 65 | Committed | `financials.totalCommitment` | page.tsx:1615–1618 | Yes | Key Numbers rail + Overview Money | **Keep** | |
| 66 | Disbursed | `financials.totalDisbursement` | page.tsx:1620–1623 | Yes | Key Numbers rail + Overview Money | **Keep** | |
| 67 | Expended | `financials.totalExpenditure` | page.tsx:1624–1627 | Yes | Key Numbers rail + Overview Money | **Keep** | |
| 68 | Total Spent (Disbursed + Expended) | `financials.totalDisbursement + financials.totalExpenditure` | page.tsx:1628–1632 | Yes | Key Numbers rail + Overview Money | **Keep** | |
| 69 | "N records pending USD conversion" warning pill | `totalPendingUsdCount`, `pendingBudgetCount`, `pendingPlannedCount`, `pendingTransactionCount` | page.tsx:1635–1645 | Yes (when count > 0) | Overview Money anchor-section (banner above metric cards) | **Keep** | Conditional warning is important; rail is too small for it. |

### J. Year-type selector (between summary strip and charts)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 70 | "Year basis" label | static | page.tsx:1651 | Yes (when customYears.length > 0) | Overview Money anchor-section AND Finances tab — top-bar control | **Move** | Year basis affects multiple charts; goes alongside the charts it controls, not in hero strip. |
| 71 | Custom-year selector dropdown | `customYears[]`, `selectedCustomYearId`, `setSelectedCustomYearId` | page.tsx:1652–1657 | Yes (when customYears present) | Same as 70 | **Move** | |

---

**Pass 1 row count: 71.**

---

## Pass 2 — Overview tab body (`ActivityOverviewTab.tsx`)

This tab today is a high-level summary repeating the four KPIs from the financial strip and previewing classification/SDG/partner data. Per decisions log #1–2, it becomes the home of the new Overview tab with anchor-nav sections.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 72 | Committed amount card | `allActivity.committed_usd` | OverviewTab:40–48 | Yes | Overview "Money" anchor — full card | **Merge** | Duplicates Key Numbers rail. Keep large card in Money anchor; remove the redundant rail-equivalent. |
| 73 | Disbursed amount card | `allActivity.disbursed_usd` | OverviewTab:49–57 | Yes | Overview "Money" anchor | **Merge** | Same. |
| 74 | Spent amount card | `allActivity.spent_usd` | OverviewTab:58–66 | Yes | Overview "Money" anchor | **Merge** | Same. |
| 75 | Budgeted amount card | `allActivity.budgeted_usd` | OverviewTab:67–75 | Yes | Overview "Money" anchor | **Merge** | Same. |
| 76 | Activity status repeat badge | `allActivity.status` | OverviewTab:85–90 | Yes (when set) | — | **Deprecate** | Already in hero badge cluster (row 18). Status badge should appear once on the page. |
| 77 | Timeline description | `allActivity.timeline_description` | OverviewTab:91–95 | Yes (when set) | Status & Timeline rail block | **Move** | Free-text caption alongside the timeline progress bar. |
| 78 | Sectors preview list (top 5) | `sectors[]` | OverviewTab:108–127 | Yes | Overview "Classifications" anchor — sectors block | **Move** | "View all sectors →" link opens full Sankey/table drawer (replaces today's Sectors tab). |
| 79 | Geography preview (countries+regions) | `countries[]`, `regions[]` | OverviewTab:138–167 | Yes | Overview "Geography" anchor | **Move** | Mirrors hero geography chips at higher detail; "View all locations →" link opens map. |
| 80 | SDG preview grid (top 8) | `sdgs[]` → `<SDGImageGrid>` | OverviewTab:177–208 | Yes | Overview "SDGs" anchor | **Move** | |
| 81 | Key partners preview (top orgs) | `partners[]` | OverviewTab:218–247 | Yes | Overview "Partners" anchor | **Move** | "All partners →" link opens dedicated Partners section (or expands inline). |
| 82 | "Money deep dive" navigation card | nav-only | OverviewTab:258–265 | Yes | — | **Deprecate** | Anchor-nav at top of Overview replaces these jump-cards. |
| 83 | "Scope deep dive" nav card | nav-only | OverviewTab:266–273 | Yes | — | **Deprecate** | Same. |
| 84 | "People deep dive" nav card | nav-only | OverviewTab:274–281 | Yes | — | **Deprecate** | Same. |
| 85 | "Delivery deep dive" nav card | nav-only | OverviewTab:282–289 | Yes | — | **Deprecate** | Same. |

---

## Pass 3 — Finances (sub-tabs: Transactions / Budgets / Planned / Analytics)

Per decisions log #3, Finances is one top-row tab with four sub-tabs.

### 3A. Budgets sub-tab (`ActivityBudgetsTab.tsx`)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 86 | Total budgets summary card | sum of `budget.usd_value` | BudgetsTab:1659–1664 | Yes | Finances → Budgets sub-tab — top strip | **Keep** | |
| 87 | Status filter dropdown (all / indicative / committed) | `statusFilter` state | BudgetsTab:1683–1702 | Yes | Same | **Keep** | |
| 88 | Type filter dropdown (all / original / revised) | `typeFilter` state | BudgetsTab:1703–1722 | Yes | Same | **Keep** | |
| 89 | CSV export button | `handleExport` | BudgetsTab:1724–1726 | Yes | Same | **Keep** | |
| 90 | Add budget button | `openModalForNewBudget` | BudgetsTab:1730–1733 | Yes (when !readOnly) | Same | **Keep** | |
| 91 | Budget table columns (ID/Period/Status/Type/Original Value/Value Date/USD Value/Actions) | `budget.*` per row | BudgetsTab:1952–2155 | Yes | Same | **Keep** | One row per column = 8 columns; consolidated as one inventory row. Sort and pagination preserved. |
| 92 | Budget row actions (Edit / Revise / Duplicate / Delete) | handlers | BudgetsTab:2145–2154 | False (in row menu) | Same | **Keep** | |
| 93 | Bulk-select checkbox + bulk delete toolbar | `selectedBudgetIds` Set | BudgetsTab:1943, 2921–2927 | Yes (when items selected) | Same | **Keep** | |
| 94 | Pagination counter + controls | computed | BudgetsTab:2173–2240 | Yes (when >itemsPerPage) | Same | **Keep** | |
| 95 | Empty state ("No budgets" + squirrel image) | `paginatedBudgets.length === 0` | BudgetsTab:1928–1935 | Conditional | Same | **Keep** | |
| 96 | Add/edit budget modal — type popover | `BUDGET_TYPES` | BudgetsTab:2340–2407 | False (modal) | Same | **Keep** | |
| 97 | Add/edit budget modal — status popover | `BUDGET_STATUSES` | BudgetsTab:2423–2488 | False (modal) | Same | **Keep** | |
| 98 | Add/edit budget modal — period start/end pickers | `modalBudget.period_start/period_end` | BudgetsTab:2506–2530 | False (modal) | Same | **Keep** | |
| 99 | Add/edit budget modal — currency, value, value-date | `modalBudget.currency/value/value_date` | BudgetsTab:2548–2622 | False (modal) | Same | **Keep** | |
| 100 | Add/edit budget modal — exchange rate (auto/manual) | `modalExchangeRate` | BudgetsTab:2630–2704 | False (modal, when currency≠USD) | Same | **Keep** | |
| 101 | Add/edit budget modal — calculated USD display | `modalCalculatedUsdValue` | BudgetsTab:2721–2727 | False (modal) | Same | **Keep** | |
| 102 | Add/edit budget modal — description textarea (Aether-only) | `modalBudget.description` | BudgetsTab:2738–2746 | False (modal) | Same | **Keep** | Not exported to IATI. |
| 103 | Add/edit budget modal — budget lines (advanced) | budget lines array | BudgetsTab:2750–2896 | False (modal, expanded) | Same | **Keep** | |

### 3B. Planned Disbursements sub-tab (`PlannedDisbursementsTab.tsx`)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 104 | Total planned disbursements summary card | sum of `disbursement.usd_value` | PlannedTab:1596–1601 | Yes | Finances → Planned sub-tab — top strip | **Keep** | |
| 105 | Status filter (all / original / revised) | `statusFilter` | PlannedTab:1616–1635 | Yes | Same | **Keep** | |
| 106 | CSV export button | `handleExport` | PlannedTab:1636 | Yes | Same | **Keep** | |
| 107 | Add planned disbursement button | `addPeriod` | PlannedTab:1642–1645 | Yes | Same | **Keep** | |
| 108 | PD table columns (ID/Period/Type/Provider→Receiver/Original/Value Date/USD/Actions) | `disbursement.*` per row | PlannedTab:1834–2049 | Yes | Same | **Keep** | 8 columns. |
| 109 | PD row actions (Edit / Delete) | handlers | PlannedTab:2034–2049 | False (in row menu) | Same | **Keep** | |
| 110 | PD bulk select + bulk delete | `selectedDisbursementIds` | PlannedTab:1737, 2708–2715 | Yes (when items selected) | Same | **Keep** | |
| 111 | PD pagination | computed | PlannedTab:2064–2131 | Yes (>itemsPerPage) | Same | **Keep** | |
| 112 | PD empty state (stork image + "No planned disbursements") | `disbursements.length === 0` | PlannedTab:1721–1728 | Conditional | Same | **Keep** | |
| 113 | PD modal — provider org searchable select | `provider_org_id` lookup | PlannedTab:2537–2562 | False (modal) | Same | **Keep** | |
| 114 | PD modal — provider activity combobox | `provider_activity_uuid` | PlannedTab:2574–2599 | False (modal) | Same | **Keep** | |
| 115 | PD modal — receiver org searchable select | `receiver_org_id` | PlannedTab:2611–2636 | False (modal) | Same | **Keep** | |
| 116 | PD modal — receiver activity combobox | `receiver_activity_uuid` | PlannedTab:2648–2673 | False (modal) | Same | **Keep** | |
| 117 | PD modal — type, period, currency, amount, value date, exchange rate, calculated USD | various | PlannedTab:2207–2525 | False (modal) | Same | **Keep** | Mirrors budgets modal. |
| 118 | PD modal — notes textarea (Aether-only) | `modalDisbursement.notes` | PlannedTab:2685–2692 | False (modal) | Same | **Keep** | |
| 119 | PD modal — auto-ID header (PD-####) | `modalDisbursement.auto_ref` | PlannedTab:2165–2182 | False (modal, edit mode) | Same | **Keep** | |

### 3C. Transactions sub-tab (`TransactionTab.tsx` → `TransactionList.tsx`)

The largest table on the page. ~70 sub-elements across columns, filters, expansion panels.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 120 | Transaction-type summary cards (count + total per type) | grouped sums | TransactionList — top strip | Yes (grouped view) | Finances → Transactions sub-tab — top strip | **Keep** | |
| 121 | Column visibility selector (searchable, grouped: Default/Classification/Additional) | `ActivityTransactionColumnSelector` | TransactionList top bar | Yes | Same | **Keep** | |
| 122 | Type filter dropdown | unique types | TransactionList top bar | Yes | Same | **Keep** | |
| 123 | Finance type filter dropdown | unique finance types | TransactionList top bar | Yes | Same | **Keep** | |
| 124 | Grouped-vs-paginated view toggle | `groupedView` state | TransactionList top bar | Yes | Same | **Keep** | |
| 125 | Expand-all / Collapse-all buttons | `expandedRows` Set | TransactionList top bar | Yes | Same | **Keep** | |
| 126 | CSV export button | export handler | TransactionList top bar | Yes | Same | **Keep** | |
| 127 | Add transaction button | open modal | TransactionList top bar | Yes (when !readOnly) | Same | **Keep** | |
| 128 | Transaction table columns (Expand / ID / Date / Type / Finance Type / Aid Type / Flow Type / Tied Status / Humanitarian / Provider→Receiver / Currency / Amount / Value Date / USD Value / Exchange Rate / Description / Disbursement Channel) | `transaction.*` per row | TransactionList:1646–2096 | Yes (subset; rest behind column selector) | Same | **Keep** | 17 columns. Inheritance indicator (reduced opacity) preserved when column value falls back to activity-default. |
| 129 | Group header row (badge + count + total USD) | grouped only | TransactionList:1598–1623 | Yes (grouped view) | Same | **Keep** | |
| 130 | Expanded detail panel — Transaction Details column (type / validation / original value / USD / value date / created date) | per-row | TransactionList:2100–2177 | False (expand) | Same | **Keep** | |
| 131 | Expanded detail panel — Parties & Identifiers column (provider/receiver org with type + inferred badge + ref / activity ID / IATI ID / activity UUID / transaction ref / transaction UUID / sector / recipient country / recipient region) | per-row | TransactionList:2196–2355 | False (expand) | Same | **Keep** | |
| 132 | Expanded detail panel — Funding Modality & Aid Classification column (aid type / flow type / finance type / tied status / disbursement channel / humanitarian flag) | per-row | TransactionList:2365–2498 | False (expand) | Same | **Keep** | |
| 133 | Expanded detail panel — Audit (created at/by + updated at/by + IATI-imported badge + validated at/by + validation comments) | per-row | TransactionList:2506–2555 | False (expand) | Same | **Keep** | |
| 134 | Expanded detail panel — Documents section | `transactionDocuments` map | TransactionList:2559–2589 | False (expand, when docs present) | Same | **Keep** | |
| 135 | Per-row export single transaction to CSV | handler | TransactionList:2104–2123 | False (in expand) | Same | **Keep** | |
| 136 | Pagination + rows-per-page selector | computed | TransactionList:2607–2707 | Yes (paginated view) | Same | **Keep** | |
| 137 | Bulk-select transactions | `selectedTransactionIds` | TransactionList | Yes (paginated view) | Same | **Keep** | |
| 138 | Add/edit transaction modal | `<TransactionModal>` | TransactionList:2724–2730 | False (modal) | Same | **Keep** | Modal covers all transaction fields; not enumerated separately here — see TransactionModal component. |

### 3D. Analytics sub-tab (`FinancialAnalyticsTab.tsx`, 3,532 lines)

Currently a top-level tab. Per decisions log #3, demoted to a Finances sub-tab.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 139 | Time-period filter (1m / 3m / 6m / 1y / 5y / all) | local state | FinAnalytics top bar | Yes | Finances → Analytics sub-tab | **Keep** | |
| 140 | Group-by toggle (Year / Month) | local state | FinAnalytics top bar | Yes | Same | **Keep** | |
| 141 | Cumulative vs periodic toggle | local state | FinAnalytics per-chart | Yes | Same | **Keep** | |
| 142 | Allocation method toggle (Proportional / Period-Start) | local state | FinAnalytics per-chart | Yes | Same | **Keep** | |
| 143 | Funding source type selector (Transactions / Planned Disbursements) | local state | FinAnalytics top bar | Yes | Same | **Keep** | |
| 144 | Funding transaction-type selector | local state | FinAnalytics conditional | Yes (when source=transactions) | Same | **Keep** | |
| 145 | Custom interactive legend | `<CustomInteractiveLegend>` | FinAnalytics charts | Yes | Same | **Keep** | |
| 146 | Funding-source Sankey diagram | D3 | FinAnalytics:3360+ section | Yes | Same | **Keep** | |
| 147 | Charts (Cumulative Spending / Budget vs Actual / Finance-Type Donut / Disbursements by Sector / Funding Source Breakdown / Cumulative Financial Overview) | computed series | FinAnalytics:2428, 3081, 3360+ | Yes | Same | **Keep** | Chart-by-chart enumeration deferred to Phase 1 implementation; no UI gap. |
| 148 | Per-chart CSV / JPG export buttons | handlers | FinAnalytics each chart | Yes | Same | **Keep** | |
| 149 | Hover tooltips (date + values + exchange-rate info) | computed | FinAnalytics each chart | False (hover) | Same | **Keep** | |
| 150 | Currency formatter ("1.2M" / "500K" etc.) | helper | FinAnalytics axes/cards | Yes | Same | **Keep** | |

---

## Pass 4 — Sectors → Overview "Classifications" anchor

Today's Sectors tab consolidates four visualizations of the same data. Per decisions log #1, Sectors becomes an Overview anchor section + an opt-in drawer for the deep visualizations.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 151 | Sector allocations preview (top 5 rows) | `activity.sectors[]` | OverviewTab:108–127 (preview), inline page.tsx Sectors tab (full) | Yes | Overview "Classifications" anchor — sectors block | **Move** | |
| 152 | "View full sector breakdown →" link | new — drawer launcher | n/a (new) | Yes | Same | **Keep** | Opens the Sankey/Sunburst/Bar/Table drawer. |
| 153 | Sankey diagram (Category → Sector → Subsector) | `<SectorSankeyVisualization viewMode="sankey">` | page.tsx:2632–2643 | False (tab activation) | Drawer launched from Overview | **Move** | All four chart variants kept inside the drawer. |
| 154 | Sunburst (radial pie) chart | same component, viewMode="sunburst" | same | False (drawer subview) | Same | **Move** | |
| 155 | Stacked bar chart (with Category / Sector / Subsector grouping) | viewMode="bar" | same | False (drawer subview) | Same | **Move** | |
| 156 | Sector table view (Category / Sector / Subsector / % / Budget / Planned / Transaction-type breakdown columns) | viewMode="table" | same | False (drawer subview) | Same | **Move** | |
| 157 | Metric mode selector (% / Budget / Planned) | parent state | page.tsx:2640 | Yes | Drawer top bar | **Keep** | |
| 158 | Bar grouping selector (Sector Category / Sector / Sub Sector) | parent state | page.tsx:2641 | Yes (bar view) | Same | **Keep** | |
| 159 | Sankey/Sunburst/Bar/Table CSV+JPG exports | handlers | SectorSankey:1557–1572 | Yes | Drawer | **Keep** | |
| 160 | Sectors empty state ("No sectors allocated") | `activity.sectors.length === 0` | page.tsx:2649–2655 | Conditional | Overview classifications block | **Keep** | |
| 161 | Sector code, name, percentage per row | `sector.*` | inline + drawer | Yes | Both anchor preview and drawer | **Keep** | |
| 162 | Sector level (3-digit category vs 5-digit subsector) | `sector.level` | OverviewTab + drawer | Yes | Same | **Keep** | |
| 163 | Sector type (primary / secondary) | `sector.type` | drawer | Yes | Drawer | **Keep** | Stored, **not** emitted to current production IATI XML. Appendix D. |

---

## Pass 5 — Geography → Overview "Geography" anchor

Today's Geography tab has the map + location cards/table + Myanmar regions block. Per spec, Activity → Overview gets a Geography summary; full map remains accessible.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 164 | Country allocations list (full, with %) | `countryAllocations[]` | OverviewTab:138–167 (preview), inline (full) | Yes | Overview "Geography" anchor — countries block | **Move** | Hero row 26 already shows top countries; this is the expanded view with %. |
| 165 | Region allocations list | `regionAllocations[]` | hero + Overview preview | Yes | Overview "Geography" anchor — regions block | **Move** | |
| 166 | Activity-locations map (`<ActivityLocationsMapViewV2>`) | `activityLocations[]` | page.tsx:3589–3607 | False (tab activation) | Overview "Geography" anchor — full-width map block | **Move** | Lazy-load preserved. |
| 167 | Map basemap selector (Streets / Voyager / OSM Liberty / HOT / Satellite) | local state | MapV2:322 | Yes | Same | **Keep** | |
| 168 | Markers / Heatmap toggle | local state | MapV2:326–354 | Yes | Same | **Keep** | |
| 169 | "Show other organisations" toggle | local state | MapV2:357–368 | Yes (when org context) | Same | **Keep** | |
| 170 | Reset-view button | local state | MapV2:231–240 | Yes (when loaded) | Same | **Keep** | |
| 171 | Map markers / popups / heatmap layer / other-orgs layer | computed layers | MapV2:400–423 | Yes | Same | **Keep** | |
| 172 | Map empty state ("No location data available") | `validLocations.length === 0` | MapV2:306–314 | Conditional | Same | **Keep** | |
| 173 | Cards-vs-Table view toggle (locations) | local state | page.tsx:3623–3641 | Yes | Same | **Keep** | |
| 174 | Location cards (`<LocationCard>` per location) | `activityLocations[]` | page.tsx:3648–3685 | Yes (when cards view) | Same | **Keep** | Card content covered in rows 175–179. |
| 175 | Location card — name, confirmed badge, description (with Show more), activity-location-description | location.* | LocationCard:185–228 | Yes | Same | **Keep** | |
| 176 | Location card — coordinates (lat,lng to 4 decimals) | location.latitude, longitude | LocationCard:232–236 | Yes (when present) | Same | **Keep** | |
| 177 | Location card — formatted address (township + district + city + state + postal + country) | composed | LocationCard:130–158 | Yes | Same | **Keep** | |
| 178 | Location card — embedded map thumbnail with red pin | `<MapCN>` | LocationCard:29–65 | Yes (site type only) | Same | **Keep** | |
| 179 | Location card — Edit / Delete row actions | `canEdit` | LocationCard:252–272 | False (row menu) | Same | **Keep** | |
| 180 | Locations table view (Name / Coordinates / Address / Description columns) | `activityLocations[]` | page.tsx:3689–3730 | Yes (when table view) | Same | **Keep** | |
| 181 | Locations empty state | `allActivityLocations.length === 0` | page.tsx:3733–3737 | Conditional | Same | **Keep** | |
| 182 | Myanmar regions map (`<MyanmarRegionsMap>`) | `subnationalBreakdowns` | page.tsx:3745–3751 | Yes (when breakdowns present) | Overview "Geography" anchor — subnational block | **Move** | Aether-specific. Spec didn't anticipate this; keep for Myanmar deployments, hide when no data. |
| 183 | Region polygon fill colour scale | `getShade(percentage)` | MyanmarMap:311 | Yes | Same | **Keep** | |
| 184 | Region hover tooltip (name + % + value + activity count) | computed | MyanmarMap:357–396 | False (hover) | Same | **Keep** | |
| 185 | Region map — expand to dialog + JPEG export | dialog + html2canvas | MyanmarMap:401–531 | False (button) | Same | **Keep** | |
| 186 | Subnational empty state card ("States/Regions Coverage") | breakdowns empty | page.tsx:3753–3772 | Conditional | Same | **Keep** | |
| 187 | Geography level (activity vs transaction) | `activity.geography_level` | API response only | False (not surfaced in UI) | Overview "Geography" anchor — small caption | **Move** | Currently API-only; surfacing it explains whether locations are on activity or roll up from transactions. |

---

## Pass 6 — SDGs → Overview "SDGs" anchor

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 188 | SDG icon grid (full set, not preview) | `sdgMappings[]` → `<SDGImageGrid>` | page.tsx:3802–3806 | False (tab activation) | Overview "SDGs" anchor | **Move** | Hero already shows compact preview (rows 49–50). |
| 189 | SDG goal name on hover | `SDG_GOAL_NAMES` | SDGImageGrid:127 | False (tooltip) | Same | **Keep** | |
| 190 | SDG goal description tooltip | `SDG_GOALS.find(...).description` | SDGImageGrid:168–172 | False (tooltip) | Same | **Keep** | |
| 191 | "Click to view" → /sdgs/{n} link | navigation | SDGImageGrid:145 | False (tooltip) | Same | **Keep** | Deep-links to SDG profile (separate template). |
| 192 | SDG Alignment Details — per-goal block (Goal {id}: {name} + alignment notes + targets) | grouped from `sdgMappings` | page.tsx:3815–3886 | Yes (when notes/targets present) | Same | **Keep** | |
| 193 | SDG target badges with hover-tooltip descriptions | `SDG_TARGETS` lookup | page.tsx:3862–3873 | False (hover) | Same | **Keep** | |
| 194 | SDG mapping fields stored but not rendered: `alignmentStrength` ("primary"/"secondary"), `contributionPercent` | API response | unsurfaced | False | Overview "SDGs" anchor — per-goal caption | **Move** | Currently dropped. Surface as small caption ("Primary alignment, 30% contribution"). |
| 195 | SDG empty state ("No SDG alignments" + globe icon) | `sdgMappings.length === 0` | page.tsx:3889–3893 | Conditional | Same | **Keep** | |

---

## Pass 7 — Policy Markers → Overview "Policy Markers" anchor

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 196 | Active policy markers table (Policy Marker / Category / Significance / Rationale) | `activityPolicyMarkers[]` filtered to significance>0 | PolicyAnalytics:213–215, 323–348 | False (tab activation) | Overview "Policy Markers" anchor | **Move** | |
| 197 | Sortable column headers + sort icons | local sort state | PolicyAnalytics:259–261 | Yes | Same | **Keep** | |
| 198 | Marker icon (per IATI code) | `getIconForMarker` | PolicyAnalytics:354 | Yes | Same | **Keep** | |
| 199 | IATI code badge (mono) | `policy_marker_details.iati_code` | PolicyAnalytics:364–368 | Yes (when present) | Same | **Keep** | |
| 200 | Significance level + tooltip explanation | `getSignificanceLabel` + dynamic text | PolicyAnalytics:382–391 | False (hover) | Same | **Keep** | |
| 201 | Rationale text (line-clamped) | `marker.rationale` | PolicyAnalytics:398–400 | Yes | Same | **Keep** | |
| 202 | Significance distribution chart | aggregated count | PolicyAnalytics:265–273 | Yes | Same | **Keep** | |
| 203 | Category distribution chart | aggregated count | PolicyAnalytics:276–284 | Yes | Same | **Keep** | |
| 204 | Rio Markers special section (codes 5-8) | filtered subset | PolicyAnalytics:287–290 | Yes (when present) | Same | **Keep** | |
| 205 | Custom (non-IATI) policy marker support — code + vocabulary URI + visibility override | `is_iati_standard=false` | PolicyMarkersSection:799–992 | False (modal) | Same | **Keep** | Aether extension. |
| 206 | Policy markers empty state ("No Policy Markers Selected" + wrench icon) | `activeMarkers.length === 0` | PolicyAnalytics:295–304 | Conditional | Same | **Keep** | |

---

## Pass 8 — People (Partners + Contacts + Focal Points)

Per spec, Focal Points are first-class data with their own rail block; Participating Orgs are a rail block; Contacts and the Reporting Org go into Overview "Partners" anchor.

### 8A. Reporting Organisation + Participating Orgs

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 207 | Reporting org card (logo / name link / acronym / IATI org ID / role="Reporting" / org type / country) | `reportingOrg.*` | page.tsx:2839–2932 | False (Partners tab activation) | Identity rail block + Overview "Partners" anchor | **Move** | Identity rail shows compact reference; Overview Partners section shows full row. |
| 208 | Participating orgs table (Organization / Role / Type / Country) — sortable | `participatingOrgs[]` | page.tsx:2934–3065 | False (tab) | Participating Orgs rail block (top 5) + Overview "Partners" anchor (full table) | **Move** | Spec rail shows top 5; full table behind "All partners →" link. |
| 209 | Participating org row — logo / name link / acronym / IATI org ref (mono) | per row | page.tsx:2995–3037 | False (tab) | Same | **Move** | |
| 210 | Participating org row — role label (Funding/Accountable/Extending/Implementing/Reporting) | `getOrganizationRoleName(iati_role_code OR getRoleCodeFromType(role_type))` | page.tsx:3038–3041 | False (tab) | Same | **Move** | |
| 211 | Participating org row — organisation type label | `getOrganizationTypeName(org_type OR organization.Organisation_Type_Code)` | page.tsx:3043–3050 | False (tab) | Same | **Move** | |
| 212 | Participating org row — country | `org.organization.country` | page.tsx:3051–3057 | False (tab) | Same | **Move** | |
| 213 | "Other Partners" derived list (orgs from transactions/PD that aren't in participating orgs) | `getOtherPartners()` | page.tsx:2713–2771, render lower in tab | False (tab) | Overview "Partners" anchor — separate sub-block | **Keep** | Useful for highlighting orgs that handle money but aren't formal participants. |
| 214 | Organisational network graph (D3 force-directed, role-coloured) | nodes from contributors + role colours | page.tsx:3067–3500+ | False (tab) | Drawer launched from Overview "Partners" anchor | **Move** | Heavy visualization; not rail-worthy. |
| 215 | Network role legend with toggle-to-hide-role | `hiddenRoles` Set | page.tsx:3170–3202 | False (tab) | Drawer | **Keep** | Note: `hiddenRoles` is **alive** here, contradicting earlier "dead state" assumption. |
| 216 | Network export-to-JPG button | SVG → canvas → blob | page.tsx:3081–3165 | False (tab) | Drawer | **Keep** | |
| 217 | Sortable participating-orgs sort icons | `partnershipsSortField`, `partnershipsSortDirection` | page.tsx:2950–2989 | Yes (tab) | Same | **Keep** | |

### 8B. Focal Points (NEW — schema migration required)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 218 | Focal Points rail block (top 3 visible + "+N more") | NEW `focal_points` table | n/a | False (no UI today) | Focal Points rail block (rail position #1) | **Keep** | Spec data model addition. Phase 1 prerequisite — see decision #4. |
| 219 | Focal point — avatar (28px circle, initials fallback) | `contacts.profile_photo` joined via `focal_points.person_id` | n/a | False | Same | **Keep** | |
| 220 | Focal point — name, role, organisation | join | n/a | False | Same | **Keep** | |
| 221 | Focal point — contact icon (mail / chat) | `focal_points.contact_email`, `contact_channel` | n/a | False | Same | **Keep** | |
| 222 | Focal point sort order (Government FP → DP FP → Technical Lead → Coordinator → others; primary first within role) | rail render | n/a | False | Same | **Keep** | |
| 223 | Historical focal point assignments (with end_date) | `focal_points.end_date IS NOT NULL` | n/a | False | History tab — section | **Keep** | |
| 224 | Existing focal-point indicator on Activity Contacts (`<MailPlus>` icon + tooltip) | `contact.isFocalPoint` | ContactsTab:259–272 | Yes (when set) | Migrate to focal_points table; deprecate boolean field once migration is complete | **Migrate** | Today's "isFocalPoint" boolean on contacts becomes the legacy seed for the new `focal_points` table. |
| 225 | Existing Government / Development-partner focal points panel | `focalPoints.government[]`, `focalPoints.development_partner[]` | ContactsTab:537–555 | Yes (when present) | Same — migrate to `focal_points` table | **Migrate** | Two separate sources today (`isFocalPoint` boolean + government_focal_points join). Schema cleanup in Phase 1. |

### 8C. Activity Contacts

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 226 | Contacts grid/table — full name, job title + department, organisation + acronym, email link, phone with country code, website, type label, profile photo / initials | `contact.*` | ContactsTab:153–448 | False (tab activation) | Overview "Partners" anchor — Contacts sub-block | **Move** | Today's standalone Contacts tab folds into Overview Partners section. |
| 227 | Contact view-mode toggle (Grid / Table) | local state | ContactsTab:570–586 | Yes | Same | **Keep** | |
| 228 | Contact "IATI imported" badge | `contact.importedFromIati` | ContactsTab:273–286 | Yes (when imported) | Same | **Keep** | |
| 229 | Contact loading skeleton + error state + empty state | states | ContactsTab:168–229 | Conditional | Same | **Keep** | |
| 230 | API-stored but unsurfaced contact fields: `secondaryEmail`, `fax`, `notes`, `middleName` | API response | unsurfaced | False | Same — surface in Contact card detail | **Move** | Currently dropped. Surface in Contact detail card. |

---

## Pass 9 — Results tab

Single tab in the new layout.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 231 | Results summary cards (high-achievement count ≥80%, medium 40–80%, low <40%, total indicators, total results) | computed from `results[]` | Results:490–544 | Yes | Results tab — top strip | **Keep** | |
| 232 | Achievement progress bar (3-segment colour) | `progressPercentages` | Results:508–526 | Yes | Same | **Keep** | |
| 233 | Charts vs Table view toggle | local state | Results:572–590 | Yes | Same | **Keep** | |
| 234 | Achievement pie chart (≥80%, 40–80%, <40%) | `chartData.achievementData` | Results:610–637 | Yes (charts view) | Same | **Keep** | |
| 235 | Type pie chart (Output/Outcome/Impact) | `chartData.typeData` | Results:647–678 | Yes (charts view) | Same | **Keep** | |
| 236 | Result row — type badge / title / "(No indicators defined)" | `RESULT_TYPE_LABELS`, localized title | Results:199, 689–711 | Yes | Same | **Keep** | |
| 237 | Indicator row — title / measure / baseline value+year / target value / actual value / period start+end / achievement % / status colour | `indicator.*` + `latestPeriod.*` | Results:199–315, 723–845 | Yes | Same | **Keep** | One row covering all indicator-row columns. |
| 238 | Indicator sparkline | `indicator.baseline + periods` | Results:819–825 | Yes (table view) | Same | **Keep** | |
| 239 | Expandable indicator detail — period table, location refs, dimensions, actual/target comments | `<IndicatorDetailTabs>` | Results:897–905 | False (expand) | Same | **Keep** | |
| 240 | Indicators / Documents tabs within Results | sub-tabs | Results:552–564 | Yes | Same | **Keep** | |
| 241 | Document count badge on Documents tab | `totalDocs` | Results:559–563 | Yes (when >0) | Same | **Keep** | |
| 242 | Documents gallery table (within Results) | `<DocumentsGalleryTable>` | Results:925 | Yes (Documents sub-tab) | Same | **Keep** | |
| 243 | Loading skeleton, error alert, empty state | states | Results:449–480 | Conditional | Same | **Keep** | |

---

## Pass 10 — Documents tab (`DocumentsAndImagesTabV2.tsx`)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 244 | Documents table columns (Title / Description / Category / Format / Language / Document Date / Thumbnail / Status / Actions) | `doc.*` | DocsTab:705–746 | Yes | Documents tab | **Keep** | 9 columns. |
| 245 | Search query input | `searchQuery` | DocsTab:559 | Yes | Same | **Keep** | |
| 246 | Category filter (Activity Level vs Organisation Level grouped) | `filterCategory` | DocsTab:568–576 | Yes | Same | **Keep** | |
| 247 | Date-range filter (week / month / etc) | `filterDateRange` | DocsTab:579–591 | Yes | Same | **Keep** | |
| 248 | Drag-drop upload zone with progress + status text | `uploadingFiles[]` | DocsTab:516, 606–610 | Yes (when !readOnly) | Same | **Keep** | |
| 249 | Per-document actions (Open / Edit / Delete) | handlers | DocsTab:750–776 | False (row buttons) | Same | **Keep** | |
| 250 | Validation issue count badge | `validationStatus.issueCount` | DocsTab:485, 481–488 | Yes (when issues) | Same | **Keep** | |
| 251 | Pagination + page indicators | computed | DocsTab:791–856 | Yes (>1 page) | Same | **Keep** | |
| 252 | Document drag-reorder | drag handlers | DocsTab:398–423 | False (drag) | Same | **Keep** | |
| 253 | Document edit modal (`<DocumentFormEnhanced>`) | `isFormOpen` | DocsTab:862–872 | False (modal) | Same | **Keep** | All edit fields handled by form component. |
| 254 | Empty states (no docs / no matches) | states | DocsTab:637–654 | Conditional | Same | **Keep** | |
| 255 | Supported formats caption | static | DocsTab:533–535 | Yes | Same | **Keep** | |

---

## Pass 11 — History tab

The History tab consolidates: Discussion (public comments), Date revision history, Related Activities, Submission/validation/publication workflow timeline. Per decisions log #1.

### 11A. Discussion (public comments)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 256 | Comment author avatar + name + role badge + timestamp | `comment.*` | PublicComments:263–286 | Yes | History tab — Discussion sub-section | **Move** | |
| 257 | Comment body (pre-wrap, supports newlines) | `comment.content` | PublicComments:319–321 | Yes | Same | **Keep** | |
| 258 | Like button + count + isLiked state | local | PublicComments:331–340 | Yes | Same | **Keep** | |
| 259 | Reply button → CommentInput | local state | PublicComments:342–375 | Yes (when logged in) | Same | **Keep** | |
| 260 | Nested replies (recursive, animated, expand/collapse) | `comment.replies[]` | PublicComments:386–416 | Yes (toggleable) | Same | **Keep** | |
| 261 | Delete (with undo toast, 5s) | `isOwnComment` | PublicComments:298–312, 604–624 | Yes (when own comment) | Same | **Keep** | |
| 262 | Sort: Newest / Top | `sortBy` | PublicComments:655–680 | Yes | Same | **Keep** | |
| 263 | Empty state ("No comments yet" + megaphone) | `comments.length === 0` | PublicComments:694–699 | Conditional | Same | **Keep** | |
| 264 | Sign-in prompt for non-authenticated users | `currentUser` falsy | PublicComments:88–93 | Conditional | Same | **Keep** | |
| 265 | Keyboard shortcuts (Cmd+Enter / Esc) | input handler | PublicComments:78–86 | False (hotkey) | Same | **Keep** | |

### 11B. Date revision history (`AllDatesHistory.tsx`)

Today: drawer launched from hero metadata strip. Per row 30, drawer moves to Status & Timeline rail. The history *log* (revisions over time) belongs in History tab.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 266 | Date type sections: Planned Start / Planned End / Actual Start / Actual End | `groupedHistory[type]` | AllDates:230–388 | False (drawer) | History tab — Dates timeline section + rail drawer | **Keep** | Drawer for compact view; History tab shows full timeline. |
| 267 | Per-date revision entries (Old → New + revision number + timestamp + user) | `change.*` | AllDates:307–388 | False (drawer) | Same | **Keep** | |
| 268 | Custom dates section (label / date / description) | `customDates[]` | AllDates:428–443 | False (drawer) | Same | **Keep** | |
| 269 | Custom dates revision history (added / removed / changed diff) | `customDatesHistory[]` | AllDates:457–520 | False (drawer) | Same | **Keep** | |
| 270 | Hover-prefetch + lazy-fetch (perf) | `loading`, `hasFetched` | AllDates:191–202 | False (perf) | Same | **Keep** | |
| 271 | Loading skeleton + error retry | states | AllDates:269–303 | Conditional | Same | **Keep** | |
| 272 | "No revisions recorded" empty state | `history.length === 0` | AllDates:342–346 | Conditional | Same | **Keep** | |

### 11C. Related Activities

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 273 | Related-activity table (Direction / Activity / IATI ID / Org / Status / Relationship / Source / Actions) | `relatedActivities[]` | Related:364–462 | False (tab activation) | History tab — Related Activities section | **Move** | |
| 274 | Direction icon (incoming / outgoing) | computed | Related:391–395 | Yes | Same | **Keep** | |
| 275 | Activity title + acronym + IATI identifier | `activity.*` | Related:399–412 | Yes | Same | **Keep** | |
| 276 | Status badge | `activity.status` | Related:420–425 | Yes | Same | **Keep** | |
| 277 | Relationship type + narrative | `activity.relationshipType`, `relationshipNarrative` | Related:429–435 | Yes | Same | **Keep** | |
| 278 | Source badge ("IATI Data" or "Linked Activities") | `activity.source` | Related:441–442 | Yes | Same | **Keep** | |
| 279 | External-unresolved warning + "Sync external links" button | `isExternal && !isResolved` | Related:301–307, 444–448 | Yes (when present) | Same | **Keep** | |
| 280 | Network-graph view of relationships (D3) | `<RelatedActivitiesNetworkGraph>` | Related:490–496 | False (toggle) | Same | **Keep** | |
| 281 | Sortable headers + sort icons | local state | Related:367–385 | Yes | Same | **Keep** | |
| 282 | Add link button + AddLinkedActivityModal | `showAddModal` | Related:317–322, 502–517 | False (button → modal) | Same | **Keep** | |
| 283 | Delete link with undo confirmation | `<ConfirmDialog>` | Related:518 | Yes (when !readOnly) | Same | **Keep** | |
| 284 | Empty state ("No related activities" + Link2 icon) | `relatedActivities.length === 0` | Related:263–275 | Conditional | Same | **Keep** | |

### 11D. Workflow audit trail (currently API-only)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 285 | Submitted (by + at + name) | `submittedBy/At/ByName` | API only — not surfaced | False | History tab — Workflow timeline section | **Move** | Currently dropped from UI. Spec demands visibility for IATI traceability. |
| 286 | Validated (by + at + name) | `validatedBy/At/ByName` | API only | False | Same | **Move** | |
| 287 | Rejected (by + at + name + reason) | `rejectedBy/At/ByName/rejectionReason` | API only | False | Same | **Move** | |
| 288 | Published (by + at) | `publishedBy/publishedAt` | API only | False | Same | **Move** | |
| 289 | Submission status pill | `submissionStatus` | API only | False | Identity rail block + History timeline | **Move** | Distinct from publicationStatus (already in hero/identity). |
| 290 | autoSyncFields list (which fields auto-sync from IATI) | `autoSyncFields[]` | API only | False | Identity rail — IATI sync details | **Move** | |

---

## Pass 12 — Government Inputs → Overview "Government alignment" anchor

Currently a top-level tab. Per decisions log #1 (5-tab cap), folds into Overview as a dedicated anchor section. This is heavy, Aether-specific data; gets its own anchor.

### 12A. Budget Classification (CABRI 6-dimension)

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 291 | On Plan / On Budget / On Treasury / On Parliament / On Procurement / On Audit dimension status (Yes/Partial/No/Unsure) | `governmentInputs.onBudgetClassification.*` | GovInputs:657, 743–749 | False (tab) | Overview "Government alignment" anchor — Budget block | **Move** | Six dimensions; consolidated as one row. |
| 292 | Budget dimensions completed count + progress bar | computed | GovInputs:734–736 | False (tab) | Same | **Keep** | |
| 293 | Budget supporting documents (DocumentDropzone) | `budgetDocs[]` | GovInputs:825–828 | False (tab) | Same | **Keep** | |
| 294 | "Clear all budget" button (with confirm) | `completedDimensions > 0 && !readOnly` | GovInputs:711–719 | False (when present) | Same | **Keep** | |
| 295 | Per-dimension detail expansion ("What does this mean?") | `getDimensionDetail` | GovInputs:765–786 | False (chevron expand) | Same | **Keep** | |

### 12B. Risk Assessment

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 296 | Risk categories: Political / Environmental / Social / Fiduciary / Operational — questions answered (Low/Medium/High/Unsure) | `riskAssessment[questionId]` | GovInputs:62–100, 671–678 | False (tab) | Overview "Government alignment" anchor — Risk block | **Move** | |
| 297 | Per-category average score + count answered | `categoryScores[]` | GovInputs:677–684 | False (tab) | Same | **Keep** | |
| 298 | Overall risk score + risk-level badge (Low/Medium/High) | computed | GovInputs:689–696 | False (tab) | Same | **Keep** | |
| 299 | Per-question detail expansion | `getRiskQuestionDetail` | GovInputs lines | False (chevron) | Same | **Keep** | |
| 300 | "Clear all risk" button | guard | GovInputs lines | False | Same | **Keep** | |

### 12C. Recipient Government (RGC) Contribution

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 301 | "Is RGC contribution provided?" (Yes / No) | `rgcContribution.isProvided` | GovInputs:874–890 | False (tab) | Overview "Government alignment" anchor — Contribution block | **Move** | |
| 302 | Currency, total local amount, total USD, exchange rate (auto/manual + value date), distribution mode (lump-sum / annual) | `rgc.*` | GovInputs:440–492 | False (tab) | Same | **Keep** | |
| 303 | Annual distribution rows (year / local / USD) | `rgc.annual[]` | GovInputs:502–509 | False (annual mode) | Same | **Keep** | |
| 304 | Distribute-evenly button | helper | GovInputs lines | False | Same | **Keep** | |
| 305 | In-kind contribution items (type / description / local / USD value) | `rgc.inKindItems[]` | GovInputs:122–125, 171, 325 | False (tab) | Same | **Keep** | |
| 306 | Other contributions list | `rgc.otherContributions[]` | GovInputs:175 | False (tab) | Same | **Keep** | |
| 307 | Contribution add/edit/delete (with undo) | `<ContributionModal>` | GovInputs:358, 391–433 | False (button → modal) | Same | **Keep** | |
| 308 | Exchange-rate fetch status (loading / error) | `isLoadingRate`, `rateError` | GovInputs:436–456 | Yes (during fetch) | Same | **Keep** | |

### 12D. Evaluation Results & National Plans

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 309 | Has-evaluation flag (Yes / No / Unsure) | `evaluationResults.hasEvaluation` | GovInputs:187 | False (tab) | Overview "Government alignment" anchor — Evaluation block | **Move** | |
| 310 | Evaluation document upload | `evaluationResults.evaluationDocument` | GovInputs:188 | False (tab) | Same | **Keep** | |
| 311 | Linked national plans selector + name + acronym + dates | `nationalPlans[]`, `linkedNationalPlanIds[]` | GovInputs:197, 537–563 | False (tab) | Same | **Keep** | |
| 312 | Evaluation documents (DocumentDropzone) | `evaluationDocs[]` | GovInputs:533, 587 | False (tab) | Same | **Keep** | |
| 313 | "Clear all evaluation" button | guard | GovInputs lines | False | Same | **Keep** | |
| 314 | Read-only warning banner | `readOnly` | GovInputs:701–706 | Yes (when read-only) | Same | **Keep** | |
| 315 | Government endorsement / validation status | `/api/activities/[id]/government-endorsement` | unsurfaced in current header (lazy) | False (lazy) | Identity rail block — gov-endorsement caption | **Move** | Adds a "Validated by gov" indicator alongside publication status. |

---

## Pass 13 — API-only fields (currently dropped from UI)

These are present in the `/api/activities/[id]` response but render nowhere on today's page. Each is a Move decision to a specific new home.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 316 | `language` (default narrative language) | API:1168 | False | Identity rail block | **Move** | Affects multilingual narratives; surface as small caption. |
| 317 | `defaultAidModality` + `defaultAidModalityOverride` (computed from aid+finance type) | API:1170–1172 | False | Overview "Classifications" anchor | **Move** | Computed but discarded by UI. Useful classification. |
| 318 | `defaultDisbursementChannel` | API:1173 | False (only on per-transaction view) | Overview "Classifications" anchor | **Move** | |
| 319 | `linkedDataUri` (IATI activity-level URI) | API:1179 | False | Identity rail block | **Move** | Linked-data URI for the activity, distinct from IATI ID. |
| 320 | `general_info` JSONB blob | API:1202 | False | n/a | **Deprecate** | Aether legacy field. Confirm contents; if non-empty in production, migrate per-key into structured fields before deprecating. **Sign-off needed.** |
| 321 | `aidEffectiveness` (sub-blob of `general_info`) | API:1203 | False | Overview "Government alignment" anchor (if non-empty) | **Move conditional** | Migrate to structured Aid Effectiveness tracking; otherwise deprecate with #320. |
| 322 | `budgetStatusUpdatedAt`, `budgetStatusUpdatedBy` | API:1213–1214 | False | Government alignment anchor — Budget block caption | **Move** | "Last updated by X on Y" line. |
| 323 | `sectorExportLevel` (activity vs transaction) | API:1221–1222 | False | Identity rail OR Overview "Classifications" caption | **Move** | Surface so editors know whether sectors are activity- or transaction-allocated. |
| 324 | `workingGroups[]` (Aether thematic groups) | API:1260–1266 | Yes (in tag-like badge somewhere?) — not visible in main page render path I traced | True/False (verify) | Overview "Tags" anchor (alongside tags) | **Move** | Confirm in Phase 1 whether already rendered; spec includes Working Group as a profile type. |
| 325 | `customDates[]` (additional named dates) | API:1205 | Yes (in AllDatesHistory drawer) | False (drawer) | Status & Timeline rail — drawer | **Keep** | Already covered by row 31; flagged here for completeness. |
| 326 | `acronym` (activity-level, distinct from org acronym) | API top-level | Yes (in title parens) | True | Hero title | **Keep** | Already covered by row 14. |
| 327 | `auto_ref` / `autoRef` (Aether-generated reference) | API:1144–1145 | False (in Identity dropdown) | Identity rail | **Keep** | Already covered by row 23. |

---

## Total inventory rows: 327

Pass 1 = 71 (header + financial strip).
Passes 2–13 = 256 (tab bodies + API-only fields).

---

## Appendix A — Deprecate decisions (require Leigh sign-off)

Every Deprecate row in the inventory above is listed here with its rationale. **No row may move from Keep/Move/Merge to Deprecate without explicit written sign-off below.**

| # | Element | Why deprecating | Where the data goes (if anywhere) |
|---|---|---|---|
| 76 | Activity status repeat badge in OverviewTab | Status is already rendered in hero (row 18). Showing it twice on the same scroll is redundant noise. | Hero badge cluster only. |
| 82–85 | "Money / Scope / People / Delivery deep dive" navigation cards in OverviewTab | Anchor-nav at the top of the new Overview tab replaces this jump-card pattern. The cards are nav chrome, not data. | Anchor-nav (no data loss). |
| 320 | `general_info` JSONB blob | Legacy untyped storage; opaque to users and IATI consumers. Should be migrated to typed fields per key, not surfaced as a blob. | If migration finds keys we don't have structured fields for, those need to be either modeled or written off. **Pre-deprecation audit task: enumerate the keys actually populated in production and decide per-key.** |

**Sign-off line (Leigh):**

> _I have reviewed the Deprecate decisions above and approve the removal of these elements from the redesigned Activity profile, subject to the per-row notes._
>
> Signed: ___________________ Date: __________

---

## Appendix B — Demoted elements (visible-by-default → behind-a-click)

Elements that previously rendered on first paint and now require user action (click/hover/scroll/tab activation) to see. Per the spec: "this needs product sign-off because they reduce data discoverability."

| # | Element | Today | New |
|---|---|---|---|
| 23–25 | Secondary IDs (Internal ref / Partner ID / IATI ID when not primary) | Hover → dropdown | Identity rail block (still visible, but in rail not hero) |
| 35 | IATI last-sync time | Tooltip on hero | Identity rail block (visible without hover) — *upgrade*, not a demotion |
| 36 | IATI auto-sync flag | Tooltip on hero | Identity rail block — *upgrade* |
| 50 | SDG image grid in description's right column | Visible alongside description | Overview "SDGs" anchor — requires scroll past About section |
| 59 | Tag badges | Visible at bottom of hero block | Overview "Tags" anchor — requires scroll |
| 207 | Reporting org full row (logo / IATI org ID / type / country) | Visible on Partners tab activation | Identity rail (compact) + Overview Partners anchor (full) — requires scroll |
| 208–217 | Participating orgs full table (sortable) | Tab activation | Overview Partners anchor (full) — requires scroll past hero. Top 5 visible immediately in rail. |
| 226 | Activity Contacts grid/table | Tab activation | Overview Partners anchor — Contacts sub-block — requires scroll. *This is more discoverable than a separate tab.* |
| 156 | Sankey/Sunburst/Bar/Table sector visualizations | Sectors tab activation | Drawer launched from Overview Classifications — requires explicit click. *Demotion.* |
| 214 | Organisational network graph | Partners tab activation | Drawer launched from Overview Partners — requires explicit click. *Demotion.* |

**Net assessment:** the redesign demotes the heavy visualizations (Sankey, Sunburst, network graph) from "tab activation" (one click) to "drawer" (one click + knowledge that the drawer exists). For the data-density-conscious user, this is a real cost. Recommend the Overview anchor sections include thumbnail/preview links that telegraph "click for full breakdown" rather than dry "→" arrows.

**Sign-off line (Leigh):**

> _I accept the demotions listed above and confirm that the new layout's discoverability trade-offs are acceptable given the simpler default state for typical users._
>
> Signed: ___________________ Date: __________

---

## Appendix C — IATI completeness statement

**Source of truth:** `frontend/src/app/api/activities/[id]/export-iati/route.ts` (the only IATI XML emitter actually wired to the UI, called from the Export-IATI-XML overflow menu and from the bulk export on the activities list page).

**Elements emitted by the production exporter** — every element below has at least one UI home in the redesigned Activity profile:

| IATI element / attribute | Production emitter line | UI home in new layout |
|---|---|---|
| `iati-activity@last-updated-datetime` | route.ts:221 | Identity rail block (Last updated, row 32) |
| `iati-activity@xml:lang="en"` (hardcoded) | route.ts:221 | Identity rail block (`language` field, row 316) |
| `iati-activity@default-currency` | route.ts:221 | Overview Classifications anchor (default currency caption) |
| `iati-activity@hierarchy` | route.ts:217, 221 | Overview Classifications anchor (row 52) |
| `iati-identifier` | route.ts:224–227 | Hero (rows 20–22) + Identity rail |
| `title > narrative` | route.ts:230–235 | Hero title (row 13) |
| `description type=1` (general) | route.ts:238–243 | Overview "About" anchor (row 37) |
| `description type=2` (objectives) | route.ts:246–251 | Overview "About" anchor (row 38) |
| `description type=3` (target groups) | route.ts:254–259 | Overview "About" anchor (row 39) |
| `participating-org @ref @type @role` + narrative | route.ts:262–274 | Participating Orgs rail block (rows 208–212) |
| `activity-status @code` | route.ts:277–281 | Hero status badge (row 18) |
| `activity-date type=1/2/3/4 @iso-date` | route.ts:284–299 | Status & Timeline rail block (row 29) + History tab Dates section (row 266) |
| `capital-spend @percentage` | route.ts:302–308 | Overview "Classifications" anchor (new caption — capital_spend_percentage is stored, this row was missed in earlier passes; **inventory addition needed**) |
| `related-activity @type @ref` | route.ts:311–314 | History tab — Related Activities section (row 273) |
| `transaction` (full sub-element tree: transaction-type / transaction-date / value / description / provider-org / receiver-org / aid-type / flow-type / tied-status) | route.ts:317–380 | Finances → Transactions sub-tab (rows 128–134) |

**Confirmation line:**

> _All IATI 2.03 elements currently emitted by `app/api/activities/[id]/export-iati/route.ts` remain visible in the new Activity profile layout, as enumerated in the table above._

**Inventory addendum:** `capital_spend_percentage` (stored at the activity level, emitted as `capital-spend@percentage`) is not currently rendered in the page header's IATI Classification block. **Add to inventory as row 328 — Move to Overview "Classifications" anchor**. Filed as an oversight in today's UI; the spec preserves it.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 328 | Capital-spend percentage | `activity.capital_spend_percentage` (0–100) | Not rendered on profile page | False | Overview "Classifications" anchor — capital-spend caption | **Move** | Stored and emitted to IATI; needs UI surface for editor review. |

### Self-audit addendum — editor-only data not currently visible on the profile

Confirmed by tracing imports and JSX usage in `app/activities/[id]/page.tsx`. The following are stored in the DB and editable in `/activities/new` but **never rendered on the read-only profile** today. Surfacing each is a Move decision in the new layout.

| # | Element | Source | Currently shown | Visible by default? | New location | Decision | Notes |
|---|---|---|---|---|---|---|---|
| 329 | Humanitarian scopes (type / vocabulary / code / vocabulary-uri / narratives) | `humanitarian` API → `humanitarian_scopes[]` | Editor only (`/activities/new`); not on profile | False (profile invisible) | Overview "Classifications" anchor — Humanitarian block | **Move** | When `humanitarian` flag is true, the related scopes (e.g. emergency event codes) belong on the profile. Phase 1 surface. |
| 330 | Project references (cross-references to other government project IDs) | `/api/activities/[id]/project-references` (consumed only by `GovernmentEndorsementTab`, which is NOT rendered on the profile) | Hidden — `GovernmentEndorsementTab` has no callers | False | Overview "Government alignment" anchor — Project references sub-block | **Move** | Stored and editable but the read-only profile drops it. Useful gov-side cross-reference data. |
| 331 | National priorities alignment (NationalPrioritiesSection) | `<NationalPrioritiesSection>` imported at page.tsx:136 but **never rendered** | False (dead import) | False | Overview "Government alignment" anchor — National priorities sub-block | **Move** | Component exists, fetches `/api/activities/[id]/national-priorities`, but isn't placed in the JSX tree. Either the component was meant to render and was forgotten, or the import is stale. Either way, surface the data in the new layout. |
| 332 | Country budget items (alignment with national budget categories) | `/api/activities/[id]/country-budget-items` | Not rendered on profile (sibling route exists, no UI consumer found) | False | Overview "Government alignment" anchor — Budget alignment block | **Move** | Stored, IATI-publishable (per the orphan emitter `iati-export.ts`, but production exporter doesn't emit it). Emitter gap is in Appendix D; UI gap is here. |

**Total inventory rows: 332.**

---

## Appendix D — Production IATI emitter completeness gap (separate finding)

**Out of scope for the UI redesign.** Filed as a follow-up bug to be addressed independently.

The production emitter `app/api/activities/[id]/export-iati/route.ts` does NOT emit the following IATI 2.03 elements that we *do* store in the database and surface in the UI:

| IATI element | Stored in DB | Rendered in UI | Emitted to XML? |
|---|---|---|---|
| `iati-activity@xml:lang` from `activity.language` (rather than hardcoded "en") | Yes (`activities.language`) | Yes (Identity rail) | ❌ Hardcoded "en" |
| `iati-activity@humanitarian` | Yes (`activities.humanitarian`) | Yes (hero badge, row 19) | ❌ Not emitted |
| `iati-activity@linked-data-uri` | Yes (`activities.linked_data_uri`) | Yes (Identity rail, row 319 — proposed) | ❌ Not emitted |
| `iati-activity@budget-not-provided` | Maybe — verify | n/a | ❌ Not emitted |
| `default-aid-type @code` | Yes | Yes (row 56) | ❌ Not emitted |
| `default-finance-type @code` | Yes | Yes (row 55) | ❌ Not emitted |
| `default-flow-type @code` | Yes | Yes (row 54) | ❌ Not emitted |
| `default-tied-status @code` | Yes | Yes (row 57) | ❌ Not emitted |
| `activity-scope @code` | Yes | Yes (row 58) | ❌ Not emitted |
| `collaboration-type @code` | Yes | Yes (row 53) | ❌ Not emitted |
| `recipient-country @code @percentage` (activity-level) | Yes (countryAllocations) | Yes (hero + Geography anchor) | ❌ Only emitted on transactions |
| `recipient-region @code @vocabulary @percentage` (activity-level) | Yes (regionAllocations) | Yes | ❌ Only on transactions |
| `sector @vocabulary @code @percentage` (activity-level) | Yes (`activity.sectors[]`) | Yes (Overview Classifications + drawer) | ❌ Not emitted at activity level |
| `policy-marker @vocabulary @code @significance` + narrative | Yes (`activityPolicyMarkers[]`) | Yes (Overview Policy Markers anchor) | ❌ Not emitted |
| `tag @vocabulary @code` + narrative | Yes (`activityTags[]`) | Yes (Overview Tags anchor) | ❌ Not emitted |
| `humanitarian-scope @type @vocabulary @code` + narrative | Schema unclear — verify | No specific UI today | ❌ Not emitted |
| `country-budget-items @vocabulary` + nested `budget-item` + descriptions | Yes (sibling API route exists: `/country-budget-items`) | Yes (Government alignment block) | ❌ Not emitted |
| `humanitarian` (transaction-level) | Yes (`transaction.is_humanitarian`) | Yes (column + detail) | ❌ Not emitted (column exists in route but not asserted) |
| `disbursement-channel @code` (transaction-level) | Yes | Yes (column) | ❌ Not emitted |
| `sector` (transaction-level) | Yes | Yes (detail) | ❌ Not emitted |
| `recipient-country` (transaction-level) | Yes | Yes (detail) | ❌ Not emitted |
| `recipient-region` (transaction-level) | Yes | Yes (detail) | ❌ Not emitted |
| `finance-type` (transaction-level) | Yes | Yes (column) | ❌ Not emitted |
| `humanitarian-scope` (transaction-level) | Yes — verify | Maybe — verify | ❌ Not emitted |
| `budget` (full activity budgets element with period-start/end + value) | Yes (`activity_budgets`) | Yes (Finances → Budgets) | ❌ Not emitted |
| `planned-disbursement` | Yes (`planned_disbursements`) | Yes (Finances → Planned) | ❌ Not emitted |
| `result` (full results framework) | Yes (`activity_results` and children) | Yes (Results tab) | ❌ Not emitted |
| `document-link` | Yes (activity_documents) | Yes (Documents tab) | ❌ Not emitted |
| `contact-info` | Yes (activity_contacts) | Yes (Contacts) | ❌ Not emitted |
| `location` | Yes (activity_locations, including site / coverage) | Yes (Geography) | ❌ Not emitted |
| `legacy-data` | Schema unclear | n/a | ❌ Not emitted |
| `crs-add` | Schema unclear | n/a | ❌ Not emitted |
| `fss` (Forward Spending Survey) | Sibling API route exists: `/import-fss` | Maybe | ❌ Not emitted |

**Recommendation:** open a separate ticket for "Production IATI exporter completeness against IATI 2.03." Estimated effort: 3–5 days to bring the emitter to parity with stored data. This gap exists today and is independent of the UI redesign — but it means our published IATI XML omits >70% of the data we collect.

---

## Appendix E — Dead state hooks in `app/activities/[id]/page.tsx`

Cleanup candidates for a separate PR independent of this redesign. These are React state hooks declared but never read or never written.

| State variable | Declared at | Used? | Recommendation |
|---|---|---|---|
| `hiddenRoles`, `setHiddenRoles` | page.tsx:417 | **Alive** — used in Partners tab network graph (row 215) | Keep — earlier audit was wrong |
| `showAllFundingPartners` etc | page.tsx:567–570 | Dead | Remove |
| `sectorFlowView` | page.tsx:530 | Dead (sector viz uses `sectorViewMode`) | Remove |
| `budgetAllocationMethod`, `budgetVsSpendAllocationMethod` | page.tsx:468–469 | Dead | Remove |
| `showActivityDetails` | page.tsx:461 | Dead | Remove |
| `isDescriptionExpanded` (page-level) | page.tsx:462 | Dead — there's a separate `isDescriptionExpanded` inside ActivityProfileHeader that IS used (Header.tsx:248) | Remove the page-level one |
| `sectorBreakdownView` | page.tsx:529 | Dead | Remove |
| `partners` state | page.tsx:536 | Loaded but never read — `participatingOrgs` is the live source | Remove the state hook and the `setPartners` call site |
| `allPartners` state | page.tsx:537 | Loaded but never displayed | Remove the state hook and the fetch call |

Estimated effort: 1–2 hours to remove and verify. No data loss — these are unused React state hooks, not unused data.

### Dead imports

| Import | Declared at | Status | Recommendation |
|---|---|---|---|
| `NationalPrioritiesSection` | page.tsx:136 | Imported but **never rendered** in the JSX tree | Either render it on the profile (per row 331 — recommended) or remove the import. Don't leave it as orphan code. |
| `GovernmentEndorsementTab` (component file exists) | `frontend/src/components/activities/GovernmentEndorsementTab.tsx` | Not imported by any page or sibling component | The file is the only home of the project-references UI (row 330). Either wire it into the profile or its functionality must be ported into another component. |

---

## Appendix F — Orphan IATI emitter files

| File | Status | Recommendation |
|---|---|---|
| `frontend/src/lib/iati-xml-generator.ts` (452 lines, exports `IATIXMLGenerator` class) | No imports anywhere in the codebase | Delete in a separate cleanup PR |
| `frontend/src/lib/iati-export.ts` (366 lines, exports `generateTransactionXML` etc.) | No imports anywhere in the codebase | Delete in a separate cleanup PR |

Both files duplicate functionality that exists (more correctly) in `app/api/activities/[id]/export-iati/route.ts`. Keeping them creates a "two emitters" mental-model trap for future engineers. The earlier explore-agent enumeration of "what we publish" was based on these orphan files and overstated our actual published-XML coverage — see Appendix D for the real picture.

Estimated effort: 30 minutes to verify zero callers + delete + run typecheck.

---

## Sign-off (final)

- [x] Every row has a Decision column filled in (no blanks, no "TBD")
- [ ] Every Deprecate decision has a written rationale and explicit Leigh sign-off (Appendix A)
- [x] IATI completeness confirmation line is present (Appendix C)
- [ ] List of demoted elements is present and signed off (Appendix B)
- [ ] Leigh has reviewed and approved the inventory in writing

**Phase 0 is unblocked for Phase 1 once Appendix A, Appendix B, and the final approval signature are filled in.**
