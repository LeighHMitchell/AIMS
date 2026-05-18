# AIMS Persona Review — May 2026

**Scope:** AIMS / DFMIS module (Project Bank + Land Bank deferred).
**Method:** Code-grounded walkthrough of each persona's jobs-to-be-done, with running dev-server probes (`localhost:3000`) for routing and timings. Chrome MCP was not available in this session, so visual feel (Lighthouse, real-render LCP, click-target sizing) is **not** assessed end-to-end — flagged inline where it matters.
**Severity:** **P0** blocks the persona; **P1** significant friction; **P2** polish / clarity; **P3** ideas. **Effort:** **S** under a day; **M** 1–3 days; **L** a week+.
**Reproducibility:** Every finding cites a file path with line number or a URL the reader can hit.

---

## Executive Summary

The platform is broad and feature-rich — the four personas can technically complete most of their primary jobs — but the **default landing experience does not match any one persona's first goal**. Operators (Khin, Daw) land on `/dashboard` which is **organization-scoped** and tab-heavy (9 tabs); executives (U Kyaw, Maria) need to manually navigate to `/analytics-dashboard` which is a 50+ chart wall with no headline tile. Across all four, recurring themes:

1. **Role-permission UX is silent.** A Government Editor (`gov_partner_tier_2`) trying to validate gets a hard redirect home with no message (`/validations` page, `validations/page.tsx:56-59`). A junior donor analyst opening a sibling org's submitted activity sees a read-only form with no banner explaining why.
2. **The dashboards don't carry the executive narrative.** `/dashboard` shows "my org" KPIs; `/analytics-dashboard` shows everything but starts at the chart wall, not a headline. Neither answers "what is the state of aid in this country right now?" in 30 seconds.
3. **Reports are pre-built and exportable** (a real strength — `/reports`), but the journey from "I need a Health sector number" → CSV is buried under categorized tabs, and there's no in-app preview of what each report contains before download.
4. **The Activity Editor is 25 sections across 6 groups** — superb for IATI completeness, overwhelming for a junior donor analyst on day one. There is no "first-90-days" guided creation path distinct from the full editor.
5. **Cold-start performance is a real risk in production** even though warm timings are fine. `/atlas` (27s dev cold), `/reports` (17s), `/analytics-dashboard` (37s) all import dozens of heavy components statically. Dev-mode timings inflate, but production LCP for the executive personas needs real measurement.

### Top P0/P1 findings (highest leverage)

| # | Finding | Persona | Pri | Effort |
|---|---------|---------|-----|--------|
| 1 | Gov Editor (`tier_2`) hard-redirected from `/validations` with no message | Khin | **P0** | S |
| 2 | `/dashboard` is org-scoped — no "country-wide aid landscape" tile for execs landing logged-in | U Kyaw | **P1** | M |
| 3 | No banner on a donor-submitted activity explaining why gov user can't edit | Khin | **P1** | S |
| 4 | Activity Editor has no completeness checklist / "what's missing to publish" panel | Daw | **P1** | M |
| 5 | `/analytics-dashboard` opens on chart wall — no Executive Summary tile | U Kyaw, Maria | **P1** | M |
| 6 | No in-app preview of what's in each Report before downloading CSV | Khin, Daw | **P1** | S |
| 7 | `permissions.ts:7-9` — legacy `hasPermission("canCreate")` returns true unconditionally | All | **P1** | S |
| 8 | Cold-load bundle size: 50+ static chart imports on `/analytics-dashboard` | U Kyaw, Maria | **P1** | M |

---

## Persona 1 — Khin, Government Aid Coordinator

**Role mapped:** `gov_partner_tier_1`
**JTBD recap:** validate donor-submitted activities, enter GPEDC inputs, generate a Health sector report on demand, spot data gaps.

### Job 1.1 — Validate a donor-submitted activity

**Path walked:** Login → `/dashboard` → `/validations` → click submitted activity → review → accept/reject.

**Findings:**

- **F1.1.a — P0/S:** `gov_partner_tier_2` (Government Editor) is hard-redirected from `/validations` to `/` with no toast or explanation (`frontend/src/app/validations/page.tsx:56-59`). Same pattern would silently exclude any tier_2 staff member trying to help with validation triage. Compare with `/data-clinic/page.tsx:75-89` which renders a clear "Access Restricted" card. **What should happen instead:** render the same Access Restricted card with a one-line "Validation is restricted to Government Manager (tier_1) users — contact your administrator if you need this role."

- **F1.1.b — P1/S:** When Khin opens a donor-submitted activity and finds an error (wrong sector code, wrong amount), she cannot edit it directly — `getActivityPermissions` in `activity-permissions.ts:103` gates `canEditActivity` on `isCreator || (isGovUser && submissionStatus === 'draft')`. Submitted activities are read-only to gov; she must reject and ask the donor to fix and re-submit. The form simply appears uneditable with **no banner** explaining the workflow. **What should happen instead:** when a gov user opens a submitted activity, show a sticky banner: "You're reviewing a submitted activity. You can validate or reject it, but cannot edit. To request changes, use **Reject with comment**."

- **F1.1.c — P1/S:** `/validations/page.tsx:65` fetches `/api/activities` with no scoping filter, then filters client-side by `submissionStatus`. For a country with 1000+ activities this is wasteful and slow. **What should happen instead:** call `/api/activities?submissionStatus=submitted,validated,rejected` and let the server do it.

- **F1.1.d — P2/S:** No diff view between submitted and last validated version. Khin must read the entire activity to know what changed since last validation. Useful for repeat-submission cycles.

### Job 1.2 — Enter GPEDC / Government Inputs

**Path walked:** Open activity → navigate to Government Inputs section → fill 7-section GPEDC questionnaire.

**Findings:**

- **F1.2.a — Positive:** The `AidEffectivenessForm` (`frontend/src/components/AidEffectivenessForm.tsx`) has thorough GPEDC indicator references in tooltips (lines 268-300+). Each question maps to a specific GPEDC indicator, which is exactly right for a knowledgeable gov user.

- **F1.2.b — P1/M:** The form is **9 sections, ~50+ fields, single linear scroll** with no progress indicator showing "you've completed 4 of 9 sections." For a busy coordinator, this is hard to come back to mid-task. **What should happen instead:** add a section-rail with completion ticks, similar to the Activity Editor's left-side scrollspy. Save state means partial work is preserved; surface that.

- **F1.2.c — P1/S:** `canEditGovInputs` (`activity-permissions.ts:122`) is `true` for super, gov, AND donor users. **Donors can edit the GPEDC form.** This may be intentional (donor self-reports), but there is no UI affordance distinguishing "field filled by gov" from "field filled by donor." For a coordinator validating gov-systems-use claims, this matters. **What should happen instead:** stamp every answer with the role/org that entered it, and add a "verified by gov" toggle for tier_1 users.

- **F1.2.d — P2/S:** "GPEDC" appears in tooltip text but the section labels say "Section 1: Government Ownership..." with no glossary or onboarding for what GPEDC means. Gov staff likely know; new hires may not.

### Job 1.3 — Generate a Health sector report on demand

**Path walked:** `/reports` → Financial Reports tab → "Sector Funding Breakdown" → download CSV.

**Findings:**

- **F1.3.a — Positive:** The Reports page (`reports/page.tsx`) has a clean configuration-driven structure with 6+ pre-built reports including Sector Funding Breakdown. CSV/Excel exports are wired through `/api/reports/...` endpoints — confirmed gated 401 (good auth posture).

- **F1.3.b — P1/S:** **No in-app preview of report content before download.** Khin has to download a CSV to know if it's the right shape for her minister. **What should happen instead:** clicking the report card opens a modal with a 10-row preview + column descriptions, then "Download CSV / Excel / PDF" buttons.

- **F1.3.c — P1/M:** **No sector filter on the report page.** "Sector Funding Breakdown" returns ALL sectors; Khin then has to filter Excel to find Health. The minister asked specifically for Health. **What should happen instead:** add a single optional "Sector" filter dropdown on the report card before download.

- **F1.3.d — P2/S:** The Reports page has its own category grouping (Activities / Financial / Organization / Funds / Data Quality). For a gov coordinator the mental model is **"who" / "what" / "where" / "how much"** — consider re-grouping by question type, not entity type.

- **F1.3.e — P3/M:** No saved-report or scheduled-report feature. Khin will run "Sector Funding Breakdown for Health, last quarter" repeatedly. A save-as-favorite or weekly-email feature would be high-leverage for repeat reporters.

### Job 1.4 — Spot data gaps

**Path walked:** `/data-clinic` → review missing-field, duplicates, financial completeness tabs.

**Findings:**

- **F1.4.a — Positive:** `/data-clinic` has 8 tabs (Activities, Transactions, Organizations, Timeliness, Financial Dates, Budgets, Financial Completeness, Duplicates — `frontend/src/app/data-clinic/page.tsx:10-17`) and renders "Access Restricted" cleanly for non-authorized roles. This is the right tool for Khin's "spot data gaps" job.

- **F1.4.b — P1/M:** Data Clinic is **gated to `gov_partner_tier_1` + `super_user` only** (`data-clinic/page.tsx:32`). A tier_2 editor cannot help triage. Either tier_2 should get read-only access, or the gating should be configurable. **What should happen instead:** allow tier_2 gov users read-only access to flag issues to tier_1.

- **F1.4.c — P1/M:** The Data Clinic is **not surfaced on the Dashboard** as an "Actions Required" item. The Dashboard's `ActionsRequiredPanel` component exists (`dashboard/page.tsx:43, 382-386`) — wire Data Clinic counts (e.g., "23 activities missing locations") into it. Today, Khin has to remember to visit `/data-clinic`.

- **F1.4.d — P2/S:** `useEffect` on Data Clinic auto-runs a `/api/data-clinic/debug` endpoint and toasts "Database migration required!" if `migrationRequired` returns true (`data-clinic/page.tsx:34-52, 62-64`). This is a **developer-facing message in a user-facing app** — a non-technical gov user will see a "migration required" toast and not know what to do. **What should happen instead:** if true, page should display "Please contact your administrator — system maintenance required" rather than developer jargon.

---

## Persona 2 — Daw, Junior Donor Analyst

**Role mapped:** `dev_partner_tier_2`
**JTBD recap:** create new activity end-to-end, bulk-import IATI XML quarterly transactions, edit existing activities when budget revisions come down, extract org's activity list for the country director.

### Job 2.1 — Create a new activity end-to-end

**Path walked:** Sidebar → ACTIVITIES → click "+ New Activity" → land at `/activities/new` → walk 6 tab groups, 25 sections.

**Findings:**

- **F2.1.a — P1/M:** **No first-time-user / minimum-viable-activity path.** The Activity Editor presents all 6 groups (Overview, Locations, Stakeholders, Funding & Delivery, Strategic Alignment, Supporting Info, plus Advanced) on first creation. A junior PO who's never seen IATI faces 25 sections immediately. There is a `QuickAddActivityModal` (`SidebarNav.tsx:43, 88`) — investigate whether it's actually surfaced to new users or hidden behind a button. **What should happen instead:** on first activity ever for a user, default to QuickAdd flow with 6-8 required fields, then offer "Complete remaining sections" guided tour.

- **F2.1.b — P1/M:** **No completeness checklist.** The activity editor uses field-level autosave (good — `useFieldAutosave` hooks) but the user has no aggregate view of "you've filled 12 of the 18 required fields to publish." Compare to GitHub PR's "X of Y checks passing." **What should happen instead:** add a top-of-page completeness pill ("Draft — 12/18 required fields complete · Cannot publish yet") that links to the missing section.

- **F2.1.c — P2/S:** Autosave is silent in most form fields (per the agent's earlier finding: only banner/icon uploads have a visible Saved indicator). A junior user will close the tab fearing they've lost work. **What should happen instead:** every field with `useFieldAutosave` should render an inline `LabelSaveIndicator` at minimum on first save.

- **F2.1.d — P2/S:** The role badge for Daw is "Partner Editor" (`user.ts:14`). "Partner Editor" is ambiguous — is she editing partners? Or is she an editor at a partner org? **What should happen instead:** rename to "Development Partner — Editor" or just "Donor Editor" for clarity.

### Job 2.2 — Bulk-import IATI XML quarterly transactions

**Path walked:** `/iati-import-enhanced` → upload XML → validate → fix → preview → import.

**Findings:**

- **F2.2.a — Positive:** A 5-step wizard structure exists (per the explore agent) and the API path `/api/iati/bulk-import/route.ts` has batch + individual fallback (per `CLAUDE.md` patterns). Solid foundation.

- **F2.2.b — P1/M:** The Activity Editor's IATI Import section is also called "IATI Import" inside the Supporting Info group — **two different IATI import flows** with no clear "use this one for full bulk, that one for single activity sync." A junior user will be confused. **What should happen instead:** rename in-editor flow to "Sync This Activity from IATI Registry" and link to bulk import as "Import multiple activities."

- **F2.2.c — P1/M:** No pre-flight validation **before** upload. The wizard validates after parsing, then shows errors. For a 50MB file from a donor, that's a multi-minute round-trip. **What should happen instead:** client-side XSD/schema check + size sniff before POSTing the file.

- **F2.2.d — P2/S:** Error model is grouped by type ("5 orphaned transactions") but drilling into a specific orphan requires modal-in-modal (per explore agent). Junior users get lost. **What should happen instead:** error drilldown should navigate to a dedicated error page or a side-panel, not a stacked modal.

### Job 2.3 — Edit existing activity for a budget revision

**Path walked:** `/activities` → search by title → open activity → Funding & Delivery → update finances → upload revised LogFrame to Library.

**Findings:**

- **F2.3.a — P1/S:** Activity search on `/activities` is fast (148ms warm) but **no recently-edited filter / "my recent activities."** A donor analyst probably edited the same activity 2 weeks ago; getting back to it requires remembering the title. **What should happen instead:** add a "Recent" view on `/activities` keyed on the current user's edit history.

- **F2.3.b — P1/S:** Daw can edit her own org's contributions only when activity status is not 'validated' (`activity-permissions.ts:113` — `canEditOwnContributions`). If gov has already validated the activity and a budget revision lands, she **cannot edit** until gov unvalidates. There's no in-UI way for her to request unvalidation. **What should happen instead:** add a "Request Re-opening" button when a validated activity needs an edit, which notifies the gov focal point.

- **F2.3.c — P2/S:** The Library section is part of the Supporting Info group but documents (LogFrames, agreements) are central to a donor's workflow. Surface a "Documents" quick-link in the activity header.

### Job 2.4 — Extract org's activity list for country director

**Path walked:** `/reports` → "Development Partners Summary" → download → filter Excel by own org. OR `/organizations/[ourOrg]` → Activities tab → export.

**Findings:**

- **F2.4.a — P1/S:** Org-scoped report extraction relies on either downloading the full Development Partners Summary CSV (`reports/page.tsx:117`) and filtering in Excel, or going to the Org Profile and using its export. The first is wasteful; the second exists per the explore agent's map of `OrganizationProfileV2View.tsx` but **isn't surfaced from `/reports`** with "filtered to my org" as a one-click option. **What should happen instead:** add a "My Org" pre-filter chip on every Report card that supports it.

- **F2.4.b — P2/S:** The "Disbursements by Development Partner" report doesn't have a date range filter visible at the card level (the underlying API may support it, but the user-facing card doesn't show it). A country director almost always wants "last quarter" or "fiscal year to date."

---

## Persona 3 — U Kyaw, Senior Government Executive

**Role mapped:** `gov_partner_tier_1` (using as read-only browser); may also enter via `/visitor` if no account.
**JTBD recap:** headline numbers in 30 seconds, drill into "his" ministry, identify gaps/overlaps, take something away for a briefing.

### Job 3.1 — Get the headline in 30 seconds

**Path walked:** Login → `/dashboard` (or `/visitor` → `/atlas`).

**Findings:**

- **F3.1.a — P1/M:** Logged-in `/dashboard` is **organization-scoped** (`dashboard/page.tsx:367, 372, 377, 384, 390` all pass `organizationId={user.organizationId}`). For a senior gov exec whose "org" might be a single ministry, this is fine — but he won't see **country-wide aid totals** without leaving the dashboard. **What should happen instead:** offer a toggle "My Ministry / All Country" at the top of the dashboard for gov users with cross-ministry viewing rights, or add a global "Country Aid Landscape" widget on the Overview tab.

- **F3.1.b — P1/M:** `/analytics-dashboard` is where country-wide headlines live, but it **opens straight onto the chart wall** with no executive summary tile. The KPI fetch (`analytics-dashboard/page.tsx:316-496`) computes 8 KPIs but they're rendered amongst dozens of charts. **What should happen instead:** introduce a sticky "Headline Tile" at top: Total ODA committed / disbursed YTD, top 5 donors, top 5 sectors, country trend arrow vs last year. Above the chart wall.

- **F3.1.c — P1/M:** Cold-compile timings (dev mode): `/atlas` 27.6s, `/reports` 16.8s, `/analytics-dashboard` 36.6s. These are **dev-mode worst case** but they signal a huge static bundle (50+ chart components statically imported on analytics-dashboard, `analytics-dashboard/page.tsx:41-137`). For executives landing cold, production LCP needs measurement. **What should happen instead:** dynamic-import every chart component below the fold; render headline tiles in <200kB JS.

- **F3.1.d — P2/S:** The Dashboard "Welcome, [first name]" header (`dashboard/page.tsx:254-258`) is friendly but eats vertical space for an exec who is glancing for numbers. Provide a compact mode toggle.

### Job 3.2 — Drill into "his" ministry / sector

**Path walked:** `/analytics-dashboard` → choose Health → `/analytics/sectors` → /sectors profile → activities list.

**Findings:**

- **F3.2.a — P2/M:** Sector filter UX appears across multiple pages (analytics-dashboard, sectors page, reports, search) but the filter state **does not persist across navigation**. U Kyaw selects Health on `/analytics-dashboard`, navigates to `/reports`, and has to re-pick Health. **What should happen instead:** stash sector/year/donor filters in URL search params and rehydrate on entry. Some pages already do (analytics dashboard has `LEGACY_TAB_MAP`) — extend pattern globally.

- **F3.2.b — P1/M:** From `/analytics-dashboard` there is no clear "see all activities in this sector" link — execs have to mentally hop to `/activities?sector=...` or `/search?q=health`. **What should happen instead:** every drill-down chart should have an explicit "View N activities" CTA in the corner.

- **F3.2.c — P2/S:** The map (`/atlas`) shows activity locations but for an exec who wants "Health activities in Region X," the map needs an aggregation toggle (treemap by region / sector overlay). The recent "thematic map overlays" commit suggests this is in flight; verify it covers the exec use case.

### Job 3.3 — Identify gaps and overlaps

**Path walked:** Geographic + sector cross-tabulation, ideally on one screen.

**Findings:**

- **F3.3.a — P1/L:** No "gap analysis" view exists in the navigation. The closest is `/aid-effectiveness-dashboard` (which is more about GPEDC effectiveness than coverage gaps). The Project Bank has a `/project-bank/gaps` page — that's a different gaps concept (funding gaps in pipeline projects). **What should happen instead:** add a "Coverage" page that crosses Sector × Region × Donor, with white-space cells highlighted. Use the existing `CoordinationCirclePack` component (`analytics-dashboard/page.tsx:85`) as a starting visualization.

- **F3.3.b — P2/M:** `ProgramFragmentationChart`, `SectorFragmentationChart`, `LocationFragmentationChart` exist (`analytics-dashboard/page.tsx:115-117`) — these are fragmentation indices. Surface them with a one-line interpretation: "high fragmentation = many small donors in this sector" so an exec can read them without a data team.

### Job 3.4 — Take something away (chart for slide, PDF for briefing)

**Path walked:** Open chart → "Download chart" or "Export."

**Findings:**

- **F3.4.a — Positive:** `chart-export.ts` exists with CSV exports, `ActivityExportModal` exists, and IATI XML export for activities. Export infrastructure is there.

- **F3.4.b — P1/M:** **No PNG / SVG chart export** visible — only CSV. An exec drafting a slide wants the chart image, not the underlying data. **What should happen instead:** add "Download as PNG" on every chart card (use html-to-image or recharts' built-in SVG export).

- **F3.4.c — P1/M:** **No "share a dashboard view" / permalink with filters baked in.** U Kyaw can't email his policy advisor a link to "Health, last 3 years, all donors" because the URL doesn't carry the filter state on every page. **What should happen instead:** every dashboard page should produce a shareable URL with all filters in query params.

- **F3.4.d — P2/M:** No PDF report generation. A minister briefing wants a 2-page PDF, not a CSV. Wire up a print stylesheet + "Generate Briefing PDF" button on `/analytics-dashboard` and the org/activity profiles.

---

## Persona 4 — Maria, Senior Donor Country Director

**Role mapped:** `dev_partner_tier_1`
**JTBD recap:** sector landscape scan (who's doing what at what scale), identify white-space / co-financing opportunities, benchmark own org against peers, pull a defensible Sankey for a board paper.

### Job 4.1 — Landscape scan of a sector

**Path walked:** `/analytics-dashboard?tab=sectors-sdgs` → filter Health → review charts → `/atlas` for geography.

**Findings:**

- **F4.1.a — P1/M:** The Analytics Dashboard's `LEGACY_TAB_MAP` (`analytics-dashboard/page.tsx:173-181`) shows the dashboard has been refactored from tabs like `sector-thematic` → `sectors-sdgs`. Bookmark continuity is preserved (good). But the **default landing tab is "overview"** which is generic — Maria's first action is always to find Sector. **What should happen instead:** for `dev_partner_tier_1` users, default to `?tab=sectors-sdgs` (or remember the user's last viewed tab in localStorage).

- **F4.1.b — P1/M:** Many of the powerful landscape charts (`Top10TotalFinancialValueChart`, `Top10ActiveProjectsChart`, `CoordinationCirclePack`, `OrganizationalPositioningMap`, `AidEcosystemSolarSystem`) are present in code but the **navigation between them is via tabs**, not a guided story. Maria has to know to click each one. **What should happen instead:** a "Landscape Story" guided template — 4-5 charts in sequence with annotated reading: Top donors → top sectors → fragmentation index → coordination map → org positioning → conclusion.

### Job 4.2 — Identify white-space / co-financing opportunities

**Findings:**

- **F4.2.a — P1/L:** Same gap as Job 3.3 — no Coverage / White-space view. For a donor planning a new investment, this is the most valuable possible view. **What should happen instead:** see F3.3.a.

- **F4.2.b — P2/M:** The `participatingOrgsSankey` (analytics-dashboard:82) shows donor flows but it's hard to tell from a Sankey "who could I co-finance with" — there's no co-funder suggestion. **What should happen instead:** on each org profile, show "other donors active in your top sectors" as a co-funder shortlist.

### Job 4.3 — Benchmark own org against peers

**Path walked:** `/organizations/[ourOrg]` profile → compare to peer org profiles manually.

**Findings:**

- **F4.3.a — P1/M:** The Organization Profile v2 (`OrganizationProfileV2View.tsx`) shows the user's own org metrics richly (Finances, Locations, Partnerships, etc., per explore agent) but **provides no peer benchmark**. There is no "vs. peer median" or "vs. top quartile" view. **What should happen instead:** add a benchmark rail showing median commitment-to-disbursement ratio, average sector concentration index, etc., computed across the org's peer group (same type, same country presence).

- **F4.3.b — P2/M:** No org-vs-org side-by-side. Maria can only open one org profile at a time. **What should happen instead:** allow `/organizations/compare?orgs=A,B,C` for up to 3 orgs with synced metrics.

- **F4.3.c — P3/L:** Aid Transparency Index page (`/transparency-index`) exists but isn't linked from the org profile. Maria's own org's transparency score should be a permanent KPI tile on her dashboard.

### Job 4.4 — Pull a defensible Sankey for a board paper

**Findings:**

- **F4.4.a — Positive:** Multiple Sankey components exist (`SankeyFlow`, `ParticipatingOrgsSankey`, `OrgSankeyFlow` for org-scoped, plus the new `OrganizationFundingFlowsSankey.tsx` in the working set). Strong foundation.

- **F4.4.b — P1/M:** Same export gap as F3.4.b — no PNG/SVG export to drop into PowerPoint. **What should happen instead:** see F3.4.b.

- **F4.4.c — P2/S:** Sankey diagrams need a "Methodology note" (data source, currency conversion approach, transactions vs commitments, fiscal year definition) so a board paper user can cite them. **What should happen instead:** every analytics chart should expose a hover-or-click "Methodology" info button with source provenance.

- **F4.4.d — P2/S:** No "annotated export" — a single chart with a one-line caption baked in. Useful for board appendices.

---

## Cross-Cutting Findings

### Auth & onboarding

- **CC-A1 — P1/S:** `frontend/src/lib/permissions.ts:7-9` — legacy `hasPermission("canCreate", ...)` returns **true unconditionally** regardless of role. The newer `getUserPermissions` correctly gates `canCreateActivities` per role, but if any code path still calls the legacy `hasPermission`, it silently grants create rights to everyone (including PUBLIC_USER and VISITOR). **What should happen instead:** grep callsites — if there are none, delete `permissions.ts`. If there are some, port them to `getUserPermissions`.

- **CC-A2 — P2/S:** Default-case for `getUserPermissions` (`user.ts:203-216`) silently returns all-false — good defensive default — but if a user lands with a typo'd role from the DB, they'll see an empty app with no error. Log a warning at minimum.

- **CC-A3 — P2/S:** Role label "Partner Manager" vs "Partner Editor" (`user.ts:13-14`) is ambiguous (already flagged F2.1.d). Same critique for "Government Manager / Editor" — these are *internal* role tiers, not the user's *external* job title. Reduce risk of confusion with the user's actual job title which is rendered next to the badge.

### Performance / LCP

- **CC-P1 — P1/M:** `/analytics-dashboard/page.tsx:41-137` statically imports **50+ chart components** (every chart used on any tab). That's a massive initial JS bundle. **What should happen instead:** dynamic-import per-tab. Only the visible tab's charts should load.

- **CC-P2 — P1/M:** `/analytics-dashboard/page.tsx:317-496` executes the KPI fetch as **sequential Supabase queries** (`disbursed → commitments → active projects → donors → budget → expenditure → completed`). Each `supabase.from('transactions').select(...)` is a round-trip. **What should happen instead:** batch via a single `/api/analytics/kpis` server route that issues parallel queries; cache via runtime cache (TTL ~5min).

- **CC-P3 — P1/M:** No server-side pagination evident in `/activities/page.tsx` quick scan and `/validations` (which fetches all and filters client-side, F1.1.c). Confirm and paginate.

- **CC-P4 — P2/S:** Dev cold compile spans 16-37s on key pages. While dev mode inflates, this signals attention is needed for production LCP — measure with real Lighthouse / Core Web Vitals.

### Copy & microcopy

- **CC-C1 — P2/S:** `/data-clinic/page.tsx:34-52` auto-shows toast "Database migration required!" — developer language exposed to gov users. (Already flagged F1.4.d.)

- **CC-C2 — P2/S:** Sidebar nav: "Dashboards" (plural) links to `/analytics-dashboard` (singular), while user's own `/dashboard` (singular) is reached via the top-nav home icon. Pluralization is inconsistent and confusing. **What should happen instead:** rename the EXPLORE → Dashboards item to "Analytics" or "Country Analytics."

- **CC-C3 — P2/S:** "AIMS / DFMIS" branding is used inconsistently — "DFMIS workspace overview" appears on `/dashboard`, "AIMS sidebar" elsewhere. Pick one country-facing brand and stick to it (DFMIS = "Development Finance Management Information System"?). Especially confusing for executives encountering both labels.

### Accessibility

- **CC-A11Y1 — P1/M:** Status not assessed in this review (no Chrome DevTools MCP available). Recommend running `chrome-devtools-mcp:a11y-debugging` on the four highest-traffic pages: `/dashboard`, `/analytics-dashboard`, `/activities/[id]/edit`, `/reports`. Likely areas of concern based on code: heavy tab-list structures (9 tabs on dashboard, 5+ on analytics) — confirm keyboard navigation order; many charts (svg with no aria-label by default in recharts) need a text-equivalent table for screen-reader users.

### Mobile / responsive

- **CC-M1 — P1/M:** The Activity Editor (25 sections, scrollspy nav, multi-column layout) is unlikely to be usable on mobile. Probably acceptable — operators use desktop. But executives (U Kyaw, Maria) may pull this up on a phone. **What should happen instead:** verify `/dashboard` and `/analytics-dashboard` collapse to single-column on `sm` breakpoint and that chart titles remain legible.

### Empty states

- **CC-ES1 — P2/M:** Not deeply audited but warrants a sweep. E.g., for a brand-new tier_2 donor analyst with zero activities, what does `/dashboard` show? Likely the org-scoped widgets render zero-state for every card — confirm copy is helpful, not empty.

### Provenance & trust

- **CC-T1 — P1/M:** For executives, every number they see in a chart is something they may quote in a public document. Surface **provenance** consistently: "Source: X activities, Y transactions, currency converted via Z rate set, as of [date]." This builds trust and avoids "where did this number come from" objections. See F4.4.c.

---

## Prioritized Backlog

Sorted by (Priority, Effort). **One row per finding.**

| ID | Priority | Effort | Persona | Finding |
|----|----------|--------|---------|---------|
| F1.1.a | **P0** | S | Khin | Gov Editor (tier_2) hard-redirected from `/validations` with no message |
| F1.1.b | **P1** | S | Khin | No banner on donor-submitted activity explaining gov can't edit |
| F1.1.c | **P1** | S | Khin | `/validations` fetches all activities, filters client-side |
| F1.3.b | **P1** | S | Khin, Daw | No in-app preview of report content before CSV download |
| F1.4.d | **P2** | S | Khin | "Database migration required" toast leaks dev jargon to users |
| F2.1.c | **P2** | S | Daw | Field-level autosave silent — no visible "Saved" indicator |
| F2.1.d | **P2** | S | Daw | "Partner Editor" role badge ambiguous |
| F2.3.a | **P1** | S | Daw | No "Recent activities" filter on `/activities` |
| F2.3.b | **P1** | S | Daw | No "Request Re-opening" CTA for validated activities |
| F2.4.a | **P1** | S | Daw | No "My Org" pre-filter on Reports cards |
| CC-A1 | **P1** | S | All | Legacy `hasPermission("canCreate")` returns true unconditionally |
| CC-A2 | **P2** | S | All | Default-case in `getUserPermissions` silent — no warning log |
| CC-C2 | **P2** | S | All | Plural/singular "Dashboards" vs "Dashboard" naming inconsistent |
| CC-C3 | **P2** | S | All | AIMS / DFMIS brand inconsistency in nav and dashboard |
| F1.2.c | **P1** | S | Khin | GPEDC form editable by donors with no role provenance stamp |
| F1.2.d | **P2** | S | Khin | "GPEDC" glossary missing for new gov staff |
| F1.3.c | **P1** | M | Khin | No sector filter on Sector Funding report card |
| F1.3.d | **P2** | S | Khin | Reports grouped by entity type, not user question type |
| F1.2.b | **P1** | M | Khin | GPEDC form has no progress / section completion rail |
| F1.4.b | **P1** | M | Khin | Data Clinic gated to tier_1 only; tier_2 cannot triage |
| F1.4.c | **P1** | M | Khin | Data Clinic counts not surfaced on Dashboard Actions Required |
| F2.1.a | **P1** | M | Daw | No first-time guided minimum-viable-activity flow |
| F2.1.b | **P1** | M | Daw | No completeness checklist / "X of Y fields to publish" |
| F2.2.b | **P1** | M | Daw | Two IATI Import flows with confusing names |
| F2.2.c | **P1** | M | Daw | No pre-upload validation for IATI XML files |
| F2.2.d | **P2** | S | Daw | IATI import error drilldown in modal-in-modal |
| F2.3.c | **P2** | S | Daw | Documents/Library not surfaced in activity header |
| F2.4.b | **P2** | S | Daw | "Disbursements by Partner" report has no date range filter |
| F3.1.a | **P1** | M | U Kyaw | `/dashboard` org-scoped — no "country aid landscape" view |
| F3.1.b | **P1** | M | U Kyaw | `/analytics-dashboard` opens to chart wall, no headline tile |
| F3.1.c | **P1** | M | U Kyaw, Maria | Production LCP risk: 50+ static chart imports |
| F3.1.d | **P2** | S | U Kyaw | Dashboard header wastes vertical space for execs |
| F3.2.a | **P2** | M | U Kyaw | Filter state doesn't persist across navigation |
| F3.2.b | **P1** | M | U Kyaw | No "View N activities" CTA on drill-down charts |
| F3.2.c | **P2** | S | U Kyaw | Map needs aggregation toggle (region / sector overlay) |
| F3.3.a | **P1** | L | U Kyaw, Maria | No Coverage / White-space view (Sector × Region × Donor) |
| F3.3.b | **P2** | M | U Kyaw | Fragmentation charts lack plain-English interpretation |
| F3.4.b | **P1** | M | U Kyaw, Maria | No PNG/SVG chart export for slides |
| F3.4.c | **P1** | M | U Kyaw, Maria | No shareable filtered-view permalinks |
| F3.4.d | **P2** | M | U Kyaw | No PDF briefing report generation |
| F4.1.a | **P1** | M | Maria | Default analytics tab is generic Overview, not user-relevant |
| F4.1.b | **P1** | M | Maria | No guided "Landscape Story" template across charts |
| F4.2.b | **P2** | M | Maria | No co-funder suggestion on org profile |
| F4.3.a | **P1** | M | Maria | No peer benchmark on Organization Profile |
| F4.3.b | **P2** | M | Maria | No org-vs-org side-by-side compare view |
| F4.3.c | **P3** | L | Maria | Transparency Index score not surfaced on org profile |
| F4.4.c | **P2** | S | Maria | Charts lack "Methodology" provenance note |
| F4.4.d | **P2** | S | Maria | No annotated single-chart export with caption |
| F1.3.e | **P3** | M | Khin | No saved-report / scheduled-report feature |
| F1.1.d | **P2** | S | Khin | No diff view between submission versions |
| CC-P1 | **P1** | M | All | Dynamic-import charts per tab to shrink initial bundle |
| CC-P2 | **P1** | M | All | Parallelize KPI fetches; cache via runtime cache |
| CC-P3 | **P1** | M | All | Confirm + add server-side pagination where missing |
| CC-P4 | **P2** | S | All | Real Lighthouse / Core Web Vitals measurement on prod |
| CC-C1 | **P2** | S | All | (== F1.4.d) |
| CC-A11Y1 | **P1** | M | All | Run a11y audit on the four highest-traffic pages |
| CC-M1 | **P1** | M | All | Confirm mobile responsive collapse on dashboards |
| CC-ES1 | **P2** | M | All | Empty-state copy sweep — esp. zero-activity new user |
| CC-T1 | **P1** | M | All | Provenance footnote on every analytics chart |

---

## Methodology footnote

- **Pages walked via dev server:** `/dashboard`, `/analytics-dashboard`, `/activities`, `/atlas`, `/reports`, `/search`, `/visitor`, `/home`, `/`.
- **Code paths read:** `frontend/src/types/user.ts`, `frontend/src/lib/permissions.ts`, `frontend/src/lib/visitor.ts`, `frontend/src/lib/activity-permissions.ts`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/app/analytics-dashboard/page.tsx`, `frontend/src/app/reports/page.tsx`, `frontend/src/app/data-clinic/page.tsx`, `frontend/src/app/validations/page.tsx`, `frontend/src/app/search/page.tsx`, `frontend/src/components/navigation/SidebarNav.tsx`, `frontend/src/components/activities/groups/ActivityOverviewGroup.tsx`, `frontend/src/components/activities/groups/index.ts`, `frontend/src/components/AidEffectivenessForm.tsx`.
- **Not done in this review (acknowledged limits):** real-render Lighthouse / Core Web Vitals, full keyboard-traversal a11y audit, mobile responsive smoke test, end-to-end form submission tests. Chrome DevTools MCP was unavailable in the session.
- **Not in scope:** Project Bank and Land Bank modules; Supabase RLS / schema; localization strings.
