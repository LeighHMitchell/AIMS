# AIMS Feature Specifications — Non-Technical Guide

This document describes **how each feature would work** from the perspective of someone using or managing the system. It is written for people familiar with **aid effectiveness**, **ODA**, and **development finance** but not with software development. For each feature you will find: what it is, why it matters, what users would see and do, what data would be captured or shown, and how it fits with the rest of AIMS.

---

## 1. Complete IATI XML Export

### What it is
Today, when you “Export to IATI XML” for an activity, the system produces a file that contains the activity’s basic details, participating organisations, and transactions. That file is **incomplete** by IATI’s full standard: it does not yet include budgets, planned disbursements, policy markers (e.g. gender, climate), tags, the results framework, conditions, contact information, document links, recipient countries and sectors at activity level, forward spending survey (FSS) data, or loan terms and loan status (CRS-add). Many of these are already stored and edited in AIMS; they are simply not yet written into the export file.

### Why it matters
- **IATI compliance and validation:** A complete export allows the file to pass IATI validation and be accepted by the IATI Registry and by partners who consume IATI data.
- **Transparency and reporting:** Donors and countries that publish to IATI need the full picture (financial plans, results, policy markers, documents) in the export, not only in the system.

### How we would build it
- **Data already in AIMS:** We would connect the export process to every relevant part of the activity that already exists: budgets, planned disbursements, FSS forecasts, policy markers, tags, results and indicators, document links, recipient countries and sectors, financing terms and loan status, and (where applicable) conditions and contact info.
- **One export, one file:** When a user clicks “Export to IATI XML,” the system would gather all of that information for that activity and produce a **single** IATI 2.03–compliant XML file that includes every supported element. No separate exports for “basic” vs “financial” vs “results.”
- **Optional check before export:** We could add a “Check before export” step that runs the file against IATI’s rules and shows a short report (e.g. “Ready to publish” or “3 warnings: …”) so users can fix issues in AIMS before publishing.
- **User experience:** Same place as now (e.g. from the activity’s “Export” menu). The only change is that the downloaded file would be complete, so it can be used for Registry publishing and for sharing with any IATI-based system.

### Features included
- Export includes: activity identity and titles/descriptions; participating organisations (with roles and CRS channel where used); activity status and dates; recipient countries and regions; sectors (DAC and/or other); budgets; planned disbursements; forward spending survey; transactions (with provider/receiver, aid type, flow type where available); policy markers; tags; results and indicators (with periods and targets/actuals where stored); document links; conditions; contact info (if stored); loan terms and yearly loan status (if the activity has them); humanitarian flag and scope (if used).
- Optional pre-export validation report so users see whether the file is likely to pass IATI checks.
- Filename and content follow IATI 2.03 so the file can be uploaded to the IATI Registry or used by other tools without manual editing.

---

## 2. OECD DAC CRS Reporting Module

### What it is
The **Creditor Reporting System (CRS)** is how DAC members and many other reporters send detailed ODA data to the OECD. Reports are structured into standard tables: for example, **Table 1** (ODA by recipient country), **Table 2** (ODA by sector), and **Table 5** (ODA by channel/modality). Today, AIMS holds much of the underlying data (activities, recipients, sectors, transactions, participating organisations with CRS channel codes), but there is **no dedicated CRS report**: no way to generate these tables or the full CRS++ detail file from within the system.

### Why it matters
- **Reporting to the OECD:** Countries and agencies that report to the DAC need to produce Table 1, Table 2, Table 5, and often the full CRS++ submission. Doing this manually from spreadsheets is slow and error-prone.
- **Consistency:** Building these reports from the same data that drives IATI and internal dashboards keeps figures consistent and avoids “two sets of books.”

### How we would build it
- **Same data, new reports:** We would not invent new data entry; we would use what AIMS already has: which activities go to which recipient countries, which DAC sectors they use, what amounts were committed and disbursed, and (where recorded) channel codes and flow/finance types. The system would aggregate this by the dimensions required for each table.
- **Filters:** Users would choose a time period (e.g. calendar or fiscal year), and optionally filter by organisation, country, or sector—same idea as existing AIMS reports. The CRS reports would respect these filters so you can produce “all ODA” or “ODA from Agency X” or “ODA to Country Y.”
- **Three main tables plus detail:**
  - **Table 1 — ODA by recipient:** Rows = recipient countries (and possibly regions); columns = time period; values = ODA amounts (e.g. commitments and/or disbursements). Totals and subtotals as needed.
  - **Table 2 — ODA by sector:** Rows = DAC sectors (e.g. 3-digit or 5-digit); columns = time period; values = ODA amounts. Again with totals.
  - **Table 5 — ODA by modality/channel:** Rows = channel or modality (e.g. bilateral, multilateral, type of finance); columns = time period; values = ODA amounts.
  - **CRS++ detail:** A full, row-by-row export (e.g. one row per activity or per transaction line) with all the columns the OECD expects (recipient, sector, flow type, finance type, channel, amounts, dates, etc.) so it can be uploaded or used for the actual CRS submission.
- **Where it would live:** A new section on the existing **Reports** page, e.g. “CRS Reports,” with one option per table plus “Full CRS++ export.” Each option would have a short description (e.g. “Table 1: ODA by recipient country”) and buttons such as “Run report” and “Download” (e.g. Excel or CSV). Labels for sectors and channels would follow standard DAC/CRS names so the output is recognisable to anyone who handles OECD reporting.

### Features included
- Report “Table 1 — ODA by recipient” with period and optional filters; downloadable table (e.g. Excel/CSV).
- Report “Table 2 — ODA by sector” with same filters; sector names/codes as per DAC.
- Report “Table 5 — ODA by modality/channel” with same filters.
- “Full CRS++ export” giving a detailed row-level file suitable for OECD submission or further processing.
- All figures derived from the same activity and transaction data used elsewhere in AIMS (no separate CRS data entry).
- Optional short guidance on the Reports page (e.g. “Use Table 1 for DAC Table 1 submission”) for reporting officers.

---

## 3. Forward Spending Plan / MTEF Integration

### What it is
**Forward spending** is the multi-year view of expected aid flows—what donors plan to disburse in future years. AIMS already has a **Forward Spend** tab per activity where users enter or import FSS (Forward Spending Survey) data and planned disbursements. What is missing is a **portfolio-level view**: a single place where government or donors can see total expected flows by year, and optionally by sector, region, or donor, so it can be used in **Medium-Term Expenditure Framework (MTEF)** and budget planning.

### Why it matters
- **Budget planning:** Finance ministries and line ministries need to know how much aid is expected in each of the next 3–5 years to align with national budgets and sector plans.
- **Predictability:** Forward spending visibility supports aid predictability (e.g. GPEDC Indicator 5) and dialogue between donors and government.
- **Single source of truth:** Today the data exists per activity; we would make it visible and exportable at the level of the whole portfolio or by strategic dimension.

### How we would build it
- **No new data entry:** We would use existing FSS and planned disbursement data. The system would add a new “Forward Spending” or “MTEF” view that **aggregates** this across activities.
- **What users would see:**
  - **By year:** Total expected disbursements (and optionally commitments) for the current year and the next several years (e.g. 3–5), with the same filters as other AIMS reports (organisation, country, sector, date range).
  - **By sector:** The same forward totals broken down by DAC sector (or national sector if that’s how you classify), so e.g. “Health: $X in 2025, $Y in 2026.”
  - **By region:** If AIMS has location data at region/state level, the same totals by region so subnational planning can use them.
  - **By donor/organisation:** Optional breakdown of forward spending by funding organisation, for government to see who is planning what.
- **Charts and tables:** A dedicated **Forward Spending** or **MTEF** page (or tab under Analytics) with simple charts (e.g. bar chart by year, or stacked bar by sector) and tables. Users could switch between “chart” and “table” and download the table (e.g. Excel/CSV) for use in MTEF tools or presentations.
- **Alignment with existing concepts:** The page would use the same filters (date range, country, sector, organisation) as the rest of AIMS so it feels like one system, not a separate tool.

### Features included
- One consolidated view of forward spending (FSS + planned disbursements) for the whole portfolio or filtered subset.
- Totals by future year (e.g. 2025–2030) with optional breakdown by sector, region, and donor.
- Charts (e.g. by year, by sector) and tables; option to download data for MTEF or reporting.
- No duplicate data entry—all figures come from activity-level FSS and planned disbursements already in AIMS.

---

## 4. Counterpart / Co-Financing Tracking

### What it is
**Counterpart funding** (or co-financing) is the government’s own commitment to fund part of a project alongside donor money—e.g. “The Ministry of Health will contribute $2m and the donor $5m.” Many recipient-country AIMS need to record and monitor these domestic commitments: how much was committed, by which ministry or department, and (optionally) how much has actually been disbursed. Today AIMS does not have a dedicated place for this; it would be a new, structured way to capture and report on counterpart commitments per activity.

### Why it matters
- **National ownership and accountability:** Tracking counterpart funding shows how seriously government is backing each programme and helps line ministries and finance plan their own budgets.
- **Donor dialogue:** Donors often want to see that government is co-investing; having this in AIMS makes it easy to report and discuss.
- **Completeness:** Without it, the “full picture” of project financing (donor + government) is incomplete.

### How we would build it
- **New data per activity:** For each activity, we would add a **Counterpart funding** (or **Co-financing**) section. In it, users would record one or more **counterpart commitments**: for example, “Ministry of Health, $2m, fiscal year 2025, committed on [date].” Optional fields could include: which ministry or department, currency, notes, and (if desired) whether any of that commitment has already been disbursed (e.g. “$0.5m disbursed as of June 2025”).
- **Where it would live:** A new tab or sub-section within the activity, e.g. under “Funding & delivery” next to Budgets and Planned disbursements. The label could be “Counterpart funding” or “Co-financing.”
- **What users would see:** A table listing all counterpart commitments for that activity (who, amount, currency, year, date committed, optional disbursed amount). Buttons to add a new commitment, edit, or remove. If the system uses a standard currency (e.g. USD), we could show a converted amount for each commitment so totals are comparable.
- **Reporting:** We could add a simple report or dashboard that shows, across all activities (or filtered by sector/ministry), total counterpart commitments by year or by ministry, so finance or sector leads can see the big picture.
- **No change to donor-side data:** Donor commitments and disbursements stay as they are (transactions, planned disbursements); counterpart is an additional layer that says “government is putting in this much too.”

### Features included
- Per-activity list of counterpart (government) commitments: amount, currency, fiscal year, committing ministry/department, date, optional notes.
- Optional tracking of “disbursed so far” against each commitment.
- Add, edit, delete commitments from the activity screen; optional conversion to a standard currency (e.g. USD) for display.
- Optional portfolio-level summary: total counterpart commitments by year or by ministry, with filters (sector, period) consistent with the rest of AIMS.

---

## 5. Disbursement Forecasting / Predictability Analysis

### What it is
**Predictability** here means: how much of what was **planned** to be disbursed actually **was** disbursed, and how that changes over time or by donor/sector. AIMS already has screens that compare planned vs actual disbursements (e.g. by year or by activity). What we would add is a clear **predictability metric** (e.g. in the spirit of GPEDC Indicator 5b) and a dedicated place to see it: e.g. “In 2024, 78% of planned disbursements were delivered on time,” plus the ability to see which activities or donors are above or below that average.

### Why it matters
- **Aid effectiveness:** Predictability is a core Busan/GPEDC commitment; governments and donors need to monitor and report on it.
- **Planning:** Knowing how reliable past plans were helps improve future planning and dialogue (e.g. “Donor X typically delivers 90% of plans; Donor Y often revises down”).
- **Transparency:** A single, consistent number (or dashboard) avoids ad hoc spreadsheets and different definitions.

### How we would build it
- **Definition of “predictability”:** We would fix a simple rule, e.g. “For a given period (e.g. year), compare total actual disbursements to total planned disbursements for that same period; the ratio (or percentage) is predictability.” Optionally we could do it per activity and then aggregate (e.g. “percentage of activities that achieved at least 80% of their planned disbursements”). The exact definition would be documented so reporting officers can use it in GPEDC or other reports.
- **What the system would do:** Using existing planned disbursement and transaction (actual disbursement) data, the system would:
  - For each period (e.g. year), sum planned amounts and actual amounts (with the same filters: organisation, country, sector if needed).
  - Compute the ratio or percentage.
  - Optionally break it down by activity or by donor so users can see who is on track and who is not.
- **Where users would see it:** A dedicated **Predictability** section (e.g. on the Aid Effectiveness dashboard or under Analytics). It would show:
  - A headline number (e.g. “Portfolio predictability 2024: 78%”) and a short time series (e.g. last 3–5 years).
  - A table: activity (or donor), planned amount, actual amount, ratio, and perhaps a simple “on track” / “below plan” indicator.
  - Option to download the table (e.g. Excel) for internal or external reporting.
- **No new data entry:** Everything would be calculated from existing planned disbursements and disbursement transactions.

### Features included
- One clear predictability metric (e.g. % of planned disbursements that were actually disbursed in the period) at portfolio level, with a documented definition.
- Time series of that metric (e.g. by year) and optional breakdown by sector or donor.
- Table of activities (or donors) with planned vs actual and ratio, so users can see outliers.
- Download of the underlying data for GPEDC or other reports.
- All figures derived from existing planned disbursement and transaction data.

---

## 6. Loan Lifecycle Management

### What it is
AIMS already stores **loan terms** (interest rate, repayment type, key dates) and **loan status** (e.g. interest received, principal outstanding, arrears) per year for activities that are loans. What is missing is a **lifecycle** view: an amortisation schedule (who pays what and when), the evolution of **outstanding balance** over time, and (for ODA reporting) an indication of **concessionality**—how “grant-like” the loan is, often expressed as grant equivalent. That is important for DAC reporting and for debt sustainability discussions.

### Why it matters
- **ODA and DAC:** Since 2018, DAC reports ODA loans in grant-equivalent terms; countries need to know how much of their loan portfolio counts as ODA and how concessional it is.
- **Debt management:** Finance ministries need to see future repayment schedules and outstanding balances to plan debt service and engage with IMF/World Bank.
- **Transparency:** A clear schedule and one number for “grant equivalent” or “concessionality” make it easier to explain to parliament and the public.

### How we would build it
- **Amortisation schedule:** From the existing loan terms (interest rate, repayment type, start/end dates), the system would **calculate** a schedule: for each period (e.g. year or quarter), how much principal is due, how much interest is due, and what the outstanding balance is after that period. Users would see this as a table (and optionally a chart) on the activity’s loan section. Where actual loan status data exists (e.g. “principal outstanding at end of 2024”), we could show both “planned” schedule and “actual” position side by side.
- **Outstanding balance over time:** A simple view (table or chart) showing how the outstanding balance evolves year by year, using either the calculated schedule or the stored loan status figures, so debt managers can see the profile at a glance.
- **Concessionality / grant equivalent:** We would introduce a **calculation** (based on DAC methodology): using the loan’s interest rate and repayment profile and a reference rate (e.g. discount rate), the system would compute how much of the loan is “grant equivalent.” That number could be shown on the activity (e.g. “Grant equivalent: $X”) and used in reports (e.g. “Total ODA in grant-equivalent terms”). The methodology would be documented (e.g. “DAC reference rate, 10-year average”) so it is auditable.
- **Where it would live:** All of this would sit in or next to the existing **Loan terms** / **Financing terms** area for the activity. No need for users to enter the schedule by hand—the system would generate it from the terms they already enter; they could still override or add notes if needed for exceptional cases.
- **Reporting:** Optional report or export: “All loan activities with outstanding balance and grant equivalent” for use in debt bulletins or DAC reporting.

### Features included
- Amortisation schedule (principal and interest due per period, outstanding balance) generated from existing loan terms, shown as table and optionally chart.
- View of outstanding balance over time (from schedule and/or from stored loan status).
- Concessionality / grant-equivalent calculation per loan, with documented methodology (e.g. DAC reference rate).
- Display of “grant equivalent” on the activity and possibility to use it in ODA/CRS-style reports.
- Optional portfolio-level list or export of loans with schedule and grant equivalent for debt and DAC reporting.

---

## 7. Multi-Donor Trust Fund / Pooled Fund Management

### What it is
A **pooled fund** (or trust fund) is an activity that receives money from several donors and then disburses it to downstream projects (which may be other activities in AIMS). Today AIMS can link activities (e.g. “this project is funded by that fund”) but does not **aggregate** the financial picture: who gave how much to the fund, and how much the fund passed on to which sectors or regions. A “pooled fund” feature would give a clear view of **contributions into** the fund and **disbursements out** of the fund, so fund managers and government can see the full flow.

### Why it matters
- **Accountability:** Fund managers need to report to contributors (“your $X was disbursed to health in Region Y”) and to government (“this fund delivered $Z to these sectors”).
- **Planning:** Government needs to know how much is flowing through funds by sector/region to align with national plans.
- **Transparency:** Many countries have multiple pooled funds; a single place to see contributions and outflows reduces confusion.

### How we would build it
- **Identifying a fund:** We would use the existing way of linking activities (e.g. “parent” and “child” activities). A **pooled fund** would be an activity that is marked as a “fund” or “trust fund” and has **child** activities (the projects it finances). No need to re-enter financial data—we would use the same transactions and planned disbursements, but **interpret** them in two ways: (1) money going **into** the fund (e.g. commitments or disbursements from donors to the fund activity), and (2) money going **out** (e.g. disbursements from the fund to child activities, or transactions recorded on the child activities that are linked to the fund).
- **Contributions view:** For a fund activity, a new **Contributions** (or **Donors to this fund**) view would list each contributing organisation and the total they have committed or disbursed to the fund, with optional breakdown by year. This would be built from existing data (e.g. participating organisations with “funder” role and transaction or planned disbursement amounts).
- **Disbursements view:** A **Disbursements from this fund** (or **Where the money went**) view would show how much went to each child activity, and optionally aggregate by sector or region (using the sector and location of the child activities). Again, built from existing transactions and activity links.
- **Portfolio view:** A separate **Pooled funds** list or dashboard could list all activities that are marked as funds and show, for each, total contributions and total disbursements (and perhaps “balance” or “pipeline”), so government or fund managers can see all funds in one place.
- **User experience:** When you open an activity that is a fund, you would see the usual activity details plus these two clear sections: “Who contributed” and “Where it went.” No duplicate data entry—just a new way of **viewing and aggregating** existing data.

### Features included
- Ability to mark an activity as a “pooled fund” (or trust fund) and link child activities to it (using existing relationship/link features).
- For each fund activity: **Contributions** view (by donor organisation, with amounts and optional year breakdown).
- For each fund activity: **Disbursements** view (by child activity and optionally by sector/region).
- Optional **Pooled funds** overview: list of all funds with total contributions and disbursements.
- All figures derived from existing transactions, planned disbursements, and activity links—no separate “fund ledger.”

---

## 8. Donor Division of Labour / Fragmentation Analysis

### What it is
**Fragmentation** means many donors working in the same sector or region, which can lead to high transaction costs and coordination problems. **Division of labour** is the idea that donors and government agree who does what (e.g. “Donor A leads in health, Donor B in education”) to reduce overlap. AIMS already has **fragmentation** views (e.g. a heatmap of “donors × sectors”). What we would add is a clearer **division of labour** angle: for each sector (or region), how many donors are active, how concentrated or spread the funding is (e.g. a simple concentration index), and optionally how that compares to an agreed “ideal” (e.g. national priorities or a division-of-labour matrix).

### Why it matters
- **Paris/Busan:** Reducing fragmentation and improving division of labour is a long-standing commitment; countries and donors need to monitor it.
- **Dialogue:** A simple “sector X has 12 donors, sector Y has 3” view supports discussions on rebalancing.
- **Evidence:** One consistent picture (number of donors per sector, concentration) avoids conflicting spreadsheets.

### How we would build it
- **Building on what exists:** We would use the same data that already feeds the fragmentation heatmaps (which activities and donors operate in which sectors). The system would add a few **summary numbers** per sector (and optionally per region): (1) number of distinct donors, (2) total funding (e.g. commitments or disbursements), (3) share of each donor (e.g. “Donor A 40%, Donor B 30%, …”), and (4) a **concentration index** (e.g. Herfindahl: sum of squared shares; higher = more concentrated, lower = more fragmented). No new data entry—just new calculations and views.
- **Where users would see it:** A **Division of labour** (or “Fragmentation summary”) view, either as a new tab in the existing Fragmentation section or as a separate page. It would show:
  - A table: one row per sector (or region), with columns “Number of donors,” “Total amount,” “Top 3 donors,” “Concentration index,” and perhaps “Notes” or “Target” if you later add agreed division-of-labour targets.
  - Optional chart (e.g. bar chart of “donors per sector” or “concentration by sector”).
  - Same filters as elsewhere (period, country, organisation) so you can run it for the whole portfolio or for a subset.
- **Export:** Users could download the table (e.g. Excel) for use in strategy documents or dialogue meetings.
- **Optional future step:** If the country later defines a “recommended” division of labour (e.g. “Health: max 5 lead donors”), we could add a column that compares actual vs recommended and highlights gaps; that would require a small configuration (e.g. a table of “sector X, max donors Y”).

### Features included
- For each sector (and optionally region): number of donors, total funding, top donors and their shares, and a concentration (fragmentation) index.
- A single “Division of labour” or “Fragmentation summary” view (table and optional chart) with filters (period, country, etc.).
- Download of the table for reporting and dialogue.
- Optional later: comparison to an agreed “ideal” division of labour if that is configured.

---

## 9. Excel/CSV Template-Based Bulk Data Entry

### What it is
Today, bulk data often enters AIMS via **IATI XML** import. Many partners (especially those not yet publishing to IATI) prefer to submit data in **Excel** or **CSV** using a fixed template. This feature would provide: (1) **downloadable templates** (e.g. “Activities list,” “Transactions list,” “Budgets list”) with clear column headers and instructions, and (2) an **upload and check** process: partners fill the template, upload it, and the system checks it (e.g. required fields, valid codes) and either imports the data or shows a list of errors so they can fix and re-upload.

### Why it matters
- **Inclusivity:** Not all partners use IATI; Excel is universal and reduces the barrier to reporting.
- **Quality:** A standard template and automated checks reduce missing or invalid data.
- **Efficiency:** Bulk upload is faster than entering many activities or transactions one by one.

### How we would build it
- **Templates:** We would define one or more Excel (or CSV) templates. Each template would have a fixed set of columns—e.g. for “Activities”: Activity ID, Title, Description, Status, Start date, End date, Recipient country, Sector code, etc. The first row would be headers; the second row could be an example or instructions. A short instruction sheet (e.g. PDF or tab in the Excel file) would explain each column, which are required, and which codes to use (e.g. DAC sector codes, IATI activity status codes). Users would download the template from AIMS (e.g. from a “Bulk upload” or “Templates” page).
- **Upload:** On the same (or a linked) page, users would choose “Activities,” “Transactions,” or “Budgets” (or whatever templates we support), then select their filled file and click “Upload.” The system would read the file and check every row against the rules (e.g. “Activity ID must be filled,” “Sector must be a valid DAC code,” “Date must be in YYYY-MM-DD format”).
- **Check results:** After the check, the user would see: (1) how many rows are valid, (2) a list of errors (e.g. “Row 5: Sector code XYZ not found,” “Row 7: End date missing”). They could then fix the file and upload again, or choose to “Import only valid rows” (and perhaps export the errors as a file so they can fix them offline).
- **Import:** Once the user confirms (e.g. “Import 80 valid rows”), the system would create or update the corresponding activities, transactions, or budgets in AIMS, using the same validation and rules as the rest of the system so that data quality is consistent. The user would get a short summary (“80 activities created,” “2 skipped due to duplicate ID”) and, if applicable, a link to view the imported items.
- **Governance:** We would decide who can use bulk upload (e.g. same roles that can create activities), and whether each template is for “new only” or also “update existing” (e.g. update activity title if the same Activity ID is in the file).

### Features included
- Downloadable Excel (or CSV) templates for at least: Activities, Transactions, Budgets (and optionally Planned disbursements, Participating organisations), with clear column names and an instruction sheet.
- Upload page where users select template type and upload their file.
- Automatic check of all rows: required fields, valid codes (sector, country, status, etc.), date formats.
- Clear report of errors (row number, column, message) so users can correct and re-upload.
- Option to import only valid rows, with a short summary of what was created or updated.
- Consistency with existing AIMS rules (e.g. no duplicate activity IDs, valid organisation references) so bulk data matches the quality of manually entered data.

---

## 10. Procurement / Contract Tracking

### What it is
Many activities involve **procurement**: tenders, contracts, and contractors. Today AIMS does not record these. This feature would add a simple way to record, per activity: **tenders** (e.g. reference, title, procedure type, deadline, status) and **contracts** (e.g. reference, title, contractor organisation, value, start/end date, status). The aim is to support implementation monitoring and accountability (“who won this contract?”, “what is the total contract value for this activity?”), not to replace a full procurement system.

### Why it matters
- **Implementation oversight:** Project managers and government need to see how procurement is progressing (tenders launched, contracts signed, value committed).
- **Transparency:** Parliament and civil society often ask “who got the contract?”; having it in AIMS makes that answer available in one place with the rest of the activity.
- **Future IATI:** IATI has optional procurement elements; recording this now prepares for future export if needed.

### How we would build it
- **Per activity:** Each activity would have an optional **Procurement** (or **Contracts**) section. In it, users would see two lists (or two tabs): **Tenders** and **Contracts.**
- **Tenders:** For each tender, users would enter (at minimum): reference number, title, procedure type (e.g. open, restricted, direct), status (e.g. planned, launched, closed, awarded), deadline date, and optional notes. The system would store this and show it in a table with options to add, edit, or remove.
- **Contracts:** For each contract, users would enter: reference number, title, **contractor** (selected from the same organisation list used elsewhere in AIMS, or free text if the contractor is not yet in the system), contract value and currency, start and end date, status (e.g. draft, signed, in progress, completed), and optional notes. Again, a table with add/edit/remove.
- **Reporting:** Optionally, a simple report or dashboard could show “Total contract value by activity” or “Contracts by contractor” across the portfolio, with filters (sector, period) for use by procurement or audit units.
- **User experience:** The Procurement section would look and feel like other AIMS sections (e.g. Budgets, Transactions): tables, buttons to add or edit, and clear labels. No complex workflow—just recording and viewing. If the country later wants to link procurement to IATI transaction elements, that could be a separate step; the priority is to capture the data in a structured way.

### Features included
- Per-activity **Tenders** list: reference, title, procedure type, status, deadline, notes; add, edit, delete.
- Per-activity **Contracts** list: reference, title, contractor (from organisation list or text), value, currency, start/end date, status, notes; add, edit, delete.
- Optional portfolio-level summary: total contract value, number of contracts, or list of contracts by contractor or by activity, with filters consistent with the rest of AIMS.

---

## 11. Climate Finance Tagging and Reporting

### What it is
**Climate finance** is ODA (or other finance) that targets climate change mitigation or adaptation. Many reporting frameworks (UNFCCC, $100B commitment, national climate plans) require countries and donors to report how much of their aid is climate-related. AIMS already has **policy markers** (e.g. Rio Markers), including markers for climate; what is missing is a **dedicated climate finance view**: one place to see total climate-tagged funding over time, by sector, by donor, and optionally by “adaptation” vs “mitigation,” so it can be used for national and international reporting.

### Why it matters
- **Reporting:** Countries and donors need to report climate finance to UNFCCC, OECD, and others; a single dashboard avoids ad hoc extraction.
- **$100B and beyond:** Tracking progress toward climate finance goals requires consistent tagging and aggregation.
- **Planning:** Sector and environment ministries need to see where climate finance is going to align with NDCs and sector plans.

### How we would build it
- **Using existing data:** We would **not** add a new “climate” field from scratch. We would use the existing **policy marker** (Rio Marker) that indicates climate: activities (or transactions) marked with that marker would be counted as “climate finance.” If the system already distinguishes “adaptation” vs “mitigation” (e.g. different marker codes or a sub-field), we would use that; otherwise we would start with “total climate” and add adaptation/mitigation later if the data exists.
- **Climate finance dashboard:** A new **Climate finance** section (e.g. under Analytics or Aid Effectiveness) would show:
  - **Over time:** A chart and table of total climate finance (e.g. commitments or disbursements) by year, with the same filters (organisation, country, sector) as other AIMS reports.
  - **By sector:** Breakdown of climate finance by DAC sector (or national sector) so users can see “health receives $X, energy $Y.”
  - **By donor:** Optional breakdown by funding organisation for government to see who is providing climate finance.
  - **Adaptation vs mitigation:** If the data supports it, a split (e.g. pie or bar) of climate finance that is adaptation vs mitigation.
  - **Optional target:** If the country has a target (e.g. “$X million climate finance by 2030”), a simple progress bar or number (“$Y so far, $Z to go”).
- **Export:** Users could download the underlying table (e.g. Excel) for use in UNFCCC reports, OECD reporting, or national climate reports.
- **Consistency:** The same definitions (which marker = climate, which = adaptation/mitigation) would be documented so reporting officers can cite them in official reports.

### Features included
- Definition of “climate finance” based on existing policy markers (e.g. Rio Marker for climate); no duplicate tagging.
- **Climate finance** dashboard: totals over time, by sector, by donor, and (if data allows) adaptation vs mitigation.
- Charts and tables; option to download data for UNFCCC, OECD, or national reporting.
- Optional display of progress toward a national or portfolio climate finance target.
- Same filters (period, country, organisation, sector) as the rest of AIMS.

---

## 12. Environmental and Social Safeguards Tracking

### What it is
**Environmental and social (E&S) safeguards** are assessments and measures to avoid or mitigate harm from projects (e.g. environmental impact assessments, social safeguards, grievance mechanisms). Some donors and governments require that each activity (or each large activity) has a record of: what type of safeguard applies, whether an assessment was done, the status (e.g. planned, in progress, completed), and optionally a link to the assessment document. Today AIMS does not capture this; the feature would add a simple, structured way to record and monitor it per activity.

### Why it matters
- **Compliance:** Donors and national regulations often require evidence that safeguards have been considered and implemented.
- **Risk management:** Having a central view of “which activities have completed E&S assessments” helps project and environment units track gaps.
- **Transparency:** Parliament and civil society increasingly ask about environmental and social due diligence; AIMS can be the single place to see it.

### How we would build it
- **Per activity:** Each activity would have an optional **Safeguards** (or **E&S safeguards**) section. In it, users would record one or more **safeguard records.** Each record would include at least: **type** (e.g. environmental assessment, social assessment, grievance mechanism, other), **status** (e.g. not applicable, planned, in progress, completed), **date** (e.g. assessment date or completion date), **notes** (short description or findings), and optionally a **link** to a document (e.g. the actual assessment report) if AIMS supports document links.
- **List view:** The section would show a table of all safeguard records for that activity, with columns for type, status, date, and notes. Buttons to add a new record, edit, or remove. No complex workflow—just recording.
- **Portfolio view:** Optionally, a simple report or dashboard could list “Activities with incomplete safeguards” or “Safeguards by type and status” across the portfolio (with filters by sector, donor, period) so environment or project units can prioritise follow-up.
- **Flexibility:** The list of “types” (environmental, social, grievance, etc.) could be configurable so the country can align with its own or donor taxonomies. The main goal is to have a consistent place to record and view safeguard status, not to replace specialist E&S systems.

### Features included
- Per-activity **Safeguards** section: list of safeguard records (type, status, date, notes, optional document link).
- Types could include: environmental assessment, social assessment, grievance mechanism, other (configurable).
- Status: e.g. not applicable, planned, in progress, completed.
- Add, edit, delete records; optional portfolio-level view (e.g. “activities with missing or incomplete safeguards”) with filters.

---

## 13. Results Aggregation and Portfolio-Level Reporting

### What it is
AIMS already has a **results framework** per activity: results (e.g. outcome, output) and indicators with targets and actuals. What is missing is a **portfolio-level** view: across many activities (e.g. all health sector activities, or all activities in a region), can we say “how many clinics were built?” or “what is the aggregate progress on indicator X?” This feature would add reports and dashboards that **aggregate** results and indicators across activities (by sector, country, or other dimension) so programme and sector leads can see the big picture without opening each activity.

### Why it matters
- **Sector reporting:** Health, education, and other sectors need to report “across all projects we achieved X.” Today that often requires manual aggregation from many activity reports.
- **SDG and national targets:** Linking aggregated results to national or global indicators (e.g. SDG targets) requires summing or averaging across activities in a consistent way.
- **Accountability:** Parliament and citizens want to know “what did aid achieve overall?”—portfolio-level results answer that.

### How we would build it
- **What we would aggregate:** We would use the same result and indicator data that already exists per activity. The system would allow users to choose a **filter** (e.g. all activities in sector “Health,” or all activities in “Region X,” or all activities of “Organisation Y”) and then **aggregate** in a few ways: (1) **By result type** (e.g. total number of “output” results, or list of outcome titles with counts), (2) **By indicator** (e.g. for indicators that are comparable—same measure and unit—sum or average the “actual” values across activities), (3) **By sector or country** (e.g. “Health sector: these 10 results, these 15 indicators, with combined actuals where meaningful”). The exact aggregation rules (e.g. “sum actuals only when indicator has same unit”) would be documented so users know what the numbers mean.
- **Where users would see it:** A new **Portfolio results** (or **Results overview**) page or section under Analytics. It would offer: (1) Choice of filter (sector, country, organisation, period), (2) Tables: e.g. “Results by sector” (sector, number of results, number of indicators, aggregated actuals where applicable), “Indicators by type” (indicator title or code, number of activities, sum or average of actuals), (3) Optional charts (e.g. bar chart of “aggregated actuals by sector”). Download of the table (e.g. Excel) for use in sector reports or SDG reporting.
- **Caveats:** Not all indicators can be summed (e.g. “% of households with electricity” should be averaged or weighted, not summed). We would define simple rules (e.g. “sum for count indicators, average for percentage indicators”) and show them in the interface or in help text so reporting officers use the figures correctly.
- **No change to activity-level results:** Each activity would still have its own results and indicators; this feature only **adds** a layer of aggregation and reporting on top.

### Features included
- **Portfolio results** view: aggregate results and indicators across activities, with filters (sector, country, organisation, period).
- Tables: e.g. by sector (number of results/indicators, aggregated actuals), by indicator (activities using it, sum or average of actuals).
- Clear rules for when we sum vs average (e.g. count vs percentage) and short documentation.
- Optional charts and download (Excel) for sector reports and SDG reporting.
- All data from existing activity results and indicators—no new data entry.

---

## 14. Comprehensive Audit Log with Search and Export

### What it is
AIMS already keeps an **activity log**: a list of who did what and when (e.g. “User X edited activity Y,” “User Z added a transaction”). What is missing is the ability to **search** that log (e.g. “all changes to activity A in the last month,” “all actions by user B,” “all validations”), to **filter** by type of action or by date range, and to **export** the log (e.g. for auditors or compliance). Some users also want to see **what changed** in a given action (e.g. “field ‘Budget’ changed from $1m to $1.2m”) rather than only “Budget was edited.”

### Why it matters
- **Accountability:** Auditors and oversight bodies need to trace who changed what and when.
- **Compliance:** Some regulations require keeping and producing an audit trail.
- **Troubleshooting:** When data looks wrong, “who last changed it?” is the first question; search and export make that answer easy.

### How we would build it
- **Search and filters:** The existing “Activity log” (or “Audit log”) page would get **filters**: (1) **Date range** (from/to), (2) **Type of action** (e.g. create, edit, delete, validate, add transaction, etc.), (3) **Who** (user), (4) **Which entity** (e.g. a specific activity, or “all activities,” or optionally organisation, report, etc.). A **search box** would allow free-text search in the log description (e.g. “budget” to find all log entries that mention budget). Results would still be shown as a list (or table), most recent first, with the same columns as now (date, user, action, entity, description).
- **Export:** A button **Export** would produce a file (e.g. Excel or CSV) of the **filtered** log—i.e. whatever is currently on screen after applying the filters. So auditors could, for example, filter “last 12 months, all edits” and then export that subset. The export would include the same information visible in the list (date, user, action, entity, description, and any extra details we store).
- **What changed (optional):** Where we already store “old value” and “new value” for an edit (e.g. in the log details), we could add a **“View details”** or **“View change”** link per log row that shows a simple before/after (e.g. “Budget: $1,000,000 → $1,200,000”). If we do not yet store field-level changes, we could introduce that for key fields (e.g. budget, status, transaction amount) so that future log entries include it; the “View change” would then apply to those entries. This could be phased: first search and export, then field-level diff where feasible.
- **Retention and access:** We would document how long logs are kept and who can access them (e.g. same as today: super users and perhaps government tier), so it is clear for compliance.

### Features included
- **Filters** on the audit/activity log: date range, action type, user, entity (e.g. activity).
- **Search** in log descriptions (free text).
- **Export** of the filtered log to Excel or CSV for auditors and compliance.
- Optional **“View change”** for edit actions where old/new value is stored (with possible extension to store and show field-level changes for key fields).
- Clear documentation on retention and who can access the log.

---

## 15. Multi-Language User Interface (i18n)

### What it is
Today the AIMS **interface** (menus, buttons, labels, messages, report titles) is in **English** only. Many users work in another language (e.g. French, Spanish, Burmese). **Multi-language support** means: the same application can be shown in different languages; users (or an administrator) choose their preferred language, and every label, button, and message they see is in that language. The **data** (activity titles, descriptions, organisation names) can already be in any language; this feature is only about the **interface** language.

### Why it matters
- **Inclusivity:** National staff, line ministries, and local partners often prefer to work in the national language.
- **Uptake:** Lower barrier to adoption when the tool “speaks” the user’s language.
- **Compliance:** Some countries require government systems to be available in the official language(s).

### How we would build it
- **Choice of language:** We would add a **language selector** (e.g. in the header or in the user profile/settings): a dropdown or list of supported languages (e.g. English, French, Spanish). When a user selects a language, the entire interface would switch to that language: menu items, section titles, button labels (“Save,” “Cancel,” “Export”), table headers, form labels, error messages, and help text. The choice would be **remembered** (e.g. stored in the user’s profile or in the browser) so they do not have to select it every time.
- **What gets translated:** Every **fixed** text that the system shows would be translated: navigation (e.g. “Dashboard,” “Activities,” “Reports”), page titles and descriptions, form labels (e.g. “Activity title,” “Start date”), table column names, buttons and links, validation messages (e.g. “This field is required”), and report names. We would **not** automatically translate the **content** that users enter (activity titles, descriptions, organisation names)—that stays as entered; only the “frame” of the application changes.
- **Phased rollout:** We would start with the **most used** parts of the system: e.g. main menu, Dashboard, Activities list and activity detail, and Reports. Once that is stable, we would extend to other pages (e.g. Organisations, Data Clinic, Admin). A small “translation coverage” note (e.g. “This page is available in English and French”) could be shown until all pages are done.
- **Who provides translations:** Translations would be provided by professional translators or bilingual staff; we would store them in a structured way (e.g. one file per language with “key: text” pairs) so that updating a label in one language does not affect others. If a translation is missing for a given language, we could fall back to English (or another default) so the system never shows a blank or a technical key.
- **Consistency:** The same term would be translated the same way everywhere (e.g. “Planned disbursement” always as “Décaissement prévu” in French), so users get a consistent experience and reporting officers can refer to the same terms in manuals.

### Features included
- **Language selector** in header or profile; choice is remembered.
- **Full translation** of interface text (menus, pages, forms, buttons, messages) for at least two languages (e.g. English + one other), with the option to add more later.
- **Phased rollout** (e.g. Dashboard, Activities, Reports first; rest later) with clear indication where translation is complete.
- **No translation of user-entered content** (titles, descriptions)—only the application’s own labels and messages.
- **Fallback** to a default language (e.g. English) if a translation is missing.
- **Consistent terminology** (same term = same translation across the system) to support training and manuals.

---

## 16. Offline Data Entry / Progressive Web App (PWA)

### What it is
Today AIMS requires an **internet connection**: every time a user opens a page or saves data, the browser talks to the server. In many field offices or remote areas, connectivity is poor or intermittent. **Offline support** would allow users to **open AIMS and enter (or edit) data** even when they are offline; the system would **store** that work locally on their device and **send it to the server** when the connection is back. So they could, for example, complete a monitoring form in a village with no signal and have it sync the next day when they are back in the office.

### Why it matters
- **Field use:** Monitoring visits, project site visits, and partner meetings often happen where internet is unreliable.
- **Resilience:** When the network or power is down, work is not lost if it is saved locally first.
- **Adoption:** Organisations that work in remote areas are more likely to use a system that works offline.

### How we would build it
- **What works offline:** We would define a **subset** of AIMS that works offline—for example: (1) View and edit **one activity** (e.g. the one the user has “opened for offline”), including its main fields, transactions, and perhaps results; (2) **Add** a new transaction or a new result; (3) **Add** a new activity (with basic fields). The system would **download** the necessary data (e.g. that activity’s details and code lists like sectors, countries) when the user is online and “prepare for offline.” When they go offline, that data would be available from the device’s local storage, and they could edit and add within that scope. Not everything would be offline (e.g. full search across all activities might stay online-only); we would prioritise the most common field tasks.
- **Saving offline:** When the user clicks “Save” while offline, the system would **store** the change in a **local queue** on the device (not yet sent to the server). The screen would show a clear message like “Saved locally. Will sync when you’re back online.” Optionally, we could show a small indicator (e.g. “3 changes pending sync”) so users know what is waiting.
- **Syncing when back online:** When the device is online again, the system would **automatically** try to send the queued changes to the server, in order. If the server accepts them, they would be removed from the queue and the user would see “Synced.” If the server rejects one (e.g. because someone else changed the same activity in the meantime), we would show a message like “1 change could not be synced: conflict on Activity X” and let the user choose (e.g. “Use my version” or “Use server version” or “Edit again”). We would not lose data: either the change is applied or the user is asked to resolve the conflict.
- **Limitations:** Offline would have limits: e.g. only one or a few activities prepared in advance; no real-time collaboration (two people editing the same activity at the same time offline would create a conflict to resolve later); and large reports or bulk operations might stay online-only. We would document these clearly so users know what to expect.
- **Security:** Data stored on the device for offline use would be protected (e.g. only accessible when the user is logged in, and cleared when they log out or after a period of inactivity) so that a lost or shared device does not expose sensitive data.

### Features included
- **Offline preparation:** User can “prepare for offline” one (or a few) activities and related code lists when online.
- **Offline editing:** When offline, user can view and edit that activity and add transactions or results; “Save” stores changes locally with a clear “Saved locally, will sync later” message.
- **Sync when online:** When connection is back, queued changes are sent automatically; user sees “Synced” or is notified of conflicts.
- **Conflict handling:** If the server has a different version (e.g. someone else edited), user is informed and can choose how to resolve (e.g. keep my change, keep server, or edit again).
- **Clear scope** of what works offline (e.g. one activity, add transaction/result) and what stays online-only; documented for users.
- **Security:** Offline data tied to the user session and cleared on logout or after inactivity.

---

## 17. South–South and Triangular Cooperation Tracking

### What it is
**South–South cooperation (SSC)** is when one developing country supports another (e.g. Brazil supporting Mozambique). **Triangular cooperation** is when a traditional donor supports that (e.g. Germany funding Brazil’s work in Mozambique). Reporting and policy often treat these differently from “traditional” North–South ODA. Today AIMS does not explicitly flag whether an activity is SSC or triangular; it would be a single **classification** per activity (e.g. “North–South,” “South–South,” “Triangular”) so that reports and dashboards can show “how much is SSC?” and “how much is triangular?”

### Why it matters
- **Reporting:** Many countries and agencies report SSC and triangular cooperation separately to the UN, OECD, or regional bodies.
- **Policy:** National strategies often set targets or priorities for SSC; tracking requires a clear tag.
- **Transparency:** Parliament and partners want to see the mix of traditional ODA vs SSC vs triangular.

### How we would build it
- **One field per activity:** We would add a **Cooperation type** (or “Modality”) field to the activity: a short list of options, e.g. “North–South (traditional ODA),” “South–South,” “Triangular,” and possibly “Other” or “Not specified.” Users would choose one when creating or editing an activity (e.g. in the General or Classification section). The field would be optional so existing activities are not forced to be reclassified immediately; over time, data entry can fill it in.
- **Where it would live:** In the activity form, in a logical place (e.g. next to “Aid type” or “Flow type,” or in a “Classification” block). One dropdown or set of radio buttons; no extra complexity.
- **Reports and dashboards:** We would add **filters** to the main activity list and to key reports (e.g. “Filter by cooperation type: South–South”). So users can, for example, list “all South–South activities” or “all triangular activities.” We would also add a **dashboard** or report card: “Cooperation type breakdown” showing, for the selected period and filters, total funding (or number of activities) by cooperation type—e.g. “North–South: $X, South–South: $Y, Triangular: $Z,” with a simple chart (e.g. pie or bar). Option to download the underlying table (e.g. Excel) for use in national or international reports.
- **Consistency:** The same list of options (North–South, South–South, Triangular) would be used everywhere so that reporting is consistent. If the country uses different terms (e.g. “SSC” vs “South–South”), we could use the same underlying code and show the preferred label.

### Features included
- **Cooperation type** field per activity: North–South, South–South, Triangular (and optionally Other / Not specified); optional so existing data is not broken.
- **Filter** on activity list and reports by cooperation type.
- **Dashboard or report:** “Cooperation type breakdown” (totals by type, with chart and optional download) using the same period and filters as other AIMS reports.
- **Consistent list** of options and labels across the system; optional short guidance (e.g. “South–South = developing country to developing country”) in help text.

---

## 18. ODA Eligibility Checker

### What it is
Not all aid counts as **ODA** (Official Development Assistance). The DAC has rules: the recipient must be on the ODA-eligible list, the flow must be concessional enough (grant or grant-equivalent above a threshold), and the purpose must be development. Today AIMS does not check whether an activity **qualifies as ODA**. An **ODA eligibility checker** would: for each activity (or for the whole portfolio), run a simple check against these rules and show “Eligible” or “Not eligible,” with short reasons (e.g. “Recipient country not on ODA list,” “Concessionality below threshold”).

### Why it matters
- **Reporting:** Countries and agencies that report to the DAC need to know which activities count as ODA before submitting.
- **Quality:** Catching ineligible activities early avoids corrections and reputational risk.
- **Transparency:** A clear “ODA eligible: Yes/No” and reason helps project and reporting officers understand the rules.

### How we would build it
- **Rules we would implement:** (1) **Recipient:** At least one recipient country must be on the current DAC list of ODA-eligible countries (we would use the official list and update it periodically). (2) **Concessionality:** For grants, we assume eligible; for loans, we would use the **grant equivalent** (from the Loan lifecycle feature, if implemented) and check that it meets the DAC threshold (e.g. minimum grant element). If grant equivalent is not yet calculated, we could show “Cannot assess—loan terms missing or grant equivalent not calculated.” (3) **Purpose:** We would check that the activity has a development-relevant sector (or purpose); if the activity has no sector or a non-ODA sector, we would flag “Purpose not clearly development.” The exact rules would follow the latest DAC guidance and be documented.
- **Where users would see it:** On each **activity**, a small **ODA eligibility** block (e.g. in the Summary or Classification section) showing: **Result:** “Eligible” (green) or “Not eligible” (red or amber), and **Reasons:** e.g. “Recipient: OK. Concessionality: OK. Purpose: OK.” or “Recipient: Not on ODA list” or “Concessionality: Below threshold (grant equivalent 45%; required 50%).” So the user sees at a glance whether that activity counts and why not if it doesn’t.
- **Portfolio report:** A **report** (e.g. “ODA eligibility”) that lists all activities (or filtered subset) with columns: Activity ID, Title, ODA eligible (Yes/No), Reasons. So reporting officers can quickly see “these 10 activities are not eligible, fix them before submission.” Optional filter: “Show only not eligible.”
- **No automatic exclusion:** The checker would **not** delete or hide ineligible activities; it would only **flag** them. Some activities may be intentionally non-ODA (e.g. humanitarian only); the checker is informational.

### Features included
- **Per-activity ODA eligibility:** Result (Eligible / Not eligible) and short reasons (recipient, concessionality, purpose), using current DAC rules.
- **Portfolio report:** List of activities with ODA eligibility and reasons; filter “not eligible only”; optional download for reporting officers.
- **Documented rules** (which list, which threshold, which sectors) so the result is auditable.
- **No automatic removal** of ineligible activities—checker is for information and quality assurance.

---

## 19. Debt Sustainability Integration

### What it is
**Debt sustainability** refers to whether a country can service its debt without crisis; the IMF and World Bank produce **Debt Sustainability Analyses (DSAs)** and assign risk ratings (e.g. low, moderate, high, in debt distress). Today AIMS does not link to this. The feature would **show** the current DSA rating (and optionally a link to the assessment) for each **recipient country** (or for the country as a whole), so that when users look at loans or at activities in a given country, they see the context: “This country is in high risk of debt distress.”

### Why it matters
- **Loan decisions:** When considering new loans, government and donors need to know the country’s debt situation.
- **Reporting:** Debt sustainability is often reported alongside aid and loan data in fiscal and aid reports.
- **Awareness:** A simple “Debt risk: High” on the country or activity view raises awareness without requiring users to look up DSA elsewhere.

### How we would build it
- **What we would show:** For each **country** (e.g. in a country summary or when viewing activities in that country), we would show: **Debt sustainability:** e.g. “Moderate risk (IMF–World Bank DSA, January 2025)” and optionally a **link** to the full DSA document or the country’s page on the IMF/World Bank site. So the information is in one place: “When I look at Kenya, I see its DSA rating and can click to read more.”
- **Where the data comes from:** Two options. (1) **Manual:** A designated person (e.g. from the Ministry of Finance or central AIMS admin) periodically enters or updates the DSA rating and link per country (e.g. in a simple “Country settings” or “DSA” list). The system would store “Country X, Rating: High, Source: IMF, Date: Jan 2025, Link: …” and display it wherever that country is shown. (2) **Automatic:** If the IMF or World Bank provides a public feed or file with country ratings, we could pull it periodically and update the display; this would require a stable external source and a small process to import it. We would start with the manual option so the feature is usable quickly; automatic could be added later if the data source exists.
- **Where users would see it:** (1) On a **country** page or country summary (if AIMS has one), (2) Optionally on the **activity** when the activity is in a single recipient country (e.g. “Recipient: Kenya. Debt sustainability: Moderate risk.”), (3) In a **report** or filter: e.g. “List all activities in countries at high risk of debt distress” for use in debt management or dialogue. No change to how activities or loans are entered—only an extra piece of **context** (the rating) next to the country.

### Features included
- **DSA rating and link** shown for each recipient country (e.g. “Moderate risk, IMF–World Bank DSA, Jan 2025” with link to document).
- **Data entry or update** of rating and link per country (manual, by authorised user), with date and source.
- **Optional automatic update** from an external DSA feed if available and agreed.
- **Display** on country view and optionally on activity view when one recipient country; optional **report or filter** “Activities in high debt-risk countries.”
- **No change** to loan or activity data—purely contextual information.

---

## 20. Outcome-Based / Results-Based Financing (RBF) Tracking

### What it is
**Results-based financing** (RBF) includes instruments where payment is tied to results: e.g. payment by results (PbR), development impact bonds (DIBs), outcome funding. They are often reported separately from “standard” grants or loans. Today AIMS records finance types and results, but there is no explicit **flag** for “this activity (or transaction) is RBF.” Adding such a flag would allow filtering and reporting “how much is RBF?” and “which activities use RBF?”

### Why it matters
- **Reporting:** Donors and countries increasingly report RBF separately in ODA and aid effectiveness reports.
- **Learning:** Tracking which activities use RBF supports evaluation and policy dialogue on what works.
- **Transparency:** Parliament and partners want to know the share of aid that is results-based.

### How we would build it
- **One flag or type per activity (or transaction):** We would add a way to mark that an activity (or optionally a specific transaction) is **results-based financing**. Options: (1) A **checkbox** on the activity (e.g. “This activity uses results-based financing (e.g. payment by results, DIB)”), or (2) A **finance type** or **tag** (e.g. “RBF,” “Payment by results,” “DIB”) that can be selected in addition to the existing flow/finance type. The simplest is one checkbox or one “RBF type” dropdown per activity so that we can filter and report without changing the whole data model.
- **Where it would live:** In the activity form, e.g. in the Funding or Classification section, next to other finance-related fields. Short help text: “Check if this activity uses payment by results, development impact bonds, or other results-based financing.”
- **Reports and dashboards:** We would add a **filter** on the activity list and reports: “RBF only” (or “Include RBF” / “Exclude RBF”). We would add a **dashboard** or report card: “RBF volume” (total commitments or disbursements for activities marked as RBF, by year or by sector), with a simple chart and optional download. So reporting officers can answer “How much RBF did we have in 2024?” and “Which sectors use RBF?”
- **Optional link to results:** For activities that are both “RBF” and have results/indicators, we could (in a later step) show a short summary “Results linked to this RBF activity” so that outcome and payment can be seen together; the core feature is the flag and the aggregate report.

### Features included
- **RBF flag or type** per activity (e.g. checkbox or “RBF” option); optional short list (PbR, DIB, other) if needed.
- **Filter** on activity list and reports by “RBF” so users can list and report only RBF activities.
- **Dashboard or report:** “RBF volume” (total amount by year, optional by sector) with chart and download.
- **Optional** link to results/indicators for RBF activities in the activity view.
- **Consistent definition** (what counts as RBF) in help text or documentation.

---

## 21. Country Strategy / Partnership Framework Management

### What it is
Many countries have **Country Partnership Frameworks (CPF)**, **Country Strategy Papers (CSP)**, or **Joint Country Strategies** that set priorities (e.g. “Health and education are priority sectors for Country X”). Today AIMS does not store these strategies or link activities to them. This feature would: (1) **Record** each strategy (title, country, type, period, summary, and optional document link), and (2) **Link** activities to one or more strategies (or to priorities within a strategy), so that reports can show “How much aid is aligned to the CPF?” or “Which activities support Priority 1?”

### Why it matters
- **Alignment:** Government and donors want to see whether aid is aligned with agreed country strategies.
- **Reporting:** “Alignment to CPF” or “Alignment to national priorities” is a common ask in aid effectiveness and dialogue.
- **Planning:** Storing strategies in AIMS makes them the single reference for “what are our priorities?” when filtering or reporting.

### How we would build it
- **Strategy record:** We would add a **Strategies** (or **Partnership frameworks**) area where authorised users can **create** and **edit** strategy documents. Each strategy would have at least: **Title**, **Country** (or region), **Type** (e.g. CPF, CSP, JCS), **Period** (start and end date), **Summary** (short text), and **Document link** (URL or upload of the PDF). Optionally we could add **Priorities** (e.g. “Priority 1: Health,” “Priority 2: Education”) as a list under each strategy so that alignment can be reported by priority.
- **Linking activities to strategies:** When editing an activity, we would add a **“Link to strategy”** (or “Alignment”) field: the user could select one or more strategies (and optionally which priority within the strategy) that this activity supports. So each activity could say “This activity supports CPF 2023–2027, Priority 1 (Health).” The link would be stored and used for reporting.
- **Where users would see it:** (1) A **Strategies** page: list of all strategies with title, country, type, period, and link to view/edit. (2) On the **activity**: a line or block showing “Aligned to: CPF Kenya 2023–2027, Priority 1” (and a link to the strategy). (3) A **report** or dashboard: “Alignment to CPF” (or “Funding by strategy priority”) showing, for a chosen strategy (or country), how much funding (or how many activities) is linked to each priority—e.g. “Priority 1: $X, Priority 2: $Y.” Optional download for strategy reviews and dialogue.
- **Governance:** We would decide who can create and edit strategies (e.g. government strategy unit or admin only) and who can link activities (e.g. any user who can edit the activity). Strategies would not delete when an activity is deleted; only the link would be removed.

### Features included
- **Strategy register:** Create and edit strategies (title, country, type, period, summary, document link, optional list of priorities).
- **Link activities to strategies** (and optionally to a priority within the strategy) from the activity form.
- **Strategies page:** List and view strategies; optional list of activities linked to each strategy.
- **Alignment report:** For a chosen strategy (or country), show funding or activity count by priority (or by “linked” vs “not linked”); optional chart and download.
- **Clear roles** for who manages strategies vs who links activities.

---

## 22. Parliamentary Reporting Module

### What it is
Many countries present aid data to **parliament** in a standard format: e.g. an executive summary (totals, by sector, by donor), a detailed table of activities, and an annex (methodology, data quality). Today AIMS has general reports and dashboards but no **parliament-specific** layout or template. This feature would provide one or more **report templates** designed for parliamentary use: fixed structure, clear titles, and optional **PDF export** so that the output can be printed or submitted as a formal document.

### Why it matters
- **Accountability:** Parliament holds government to account on aid; a standard report format supports that.
- **Efficiency:** Producing the report from AIMS (with one click or a few clicks) avoids rebuilding it in Word or Excel every time.
- **Consistency:** The same structure every time makes it easier for parliament to compare across years.

### How we would build it
- **Content of the report:** We would define **what** goes in the parliamentary report, in agreement with the user (e.g. Ministry of Finance or aid coordination unit). Typical elements: (1) **Cover and title** (e.g. “Aid Report to Parliament, Fiscal Year 2024”), (2) **Executive summary:** total ODA received (commitments and disbursements), top sectors, top donors, and perhaps 2–3 key messages. (3) **Detail table:** list of activities (or a subset) with columns such as Activity ID, Title, Donor, Sector, Commitment, Disbursement, Status. (4) **Annex:** short note on methodology (e.g. “Data from AIMS as of [date]. Includes all activities with status Implementation or Completion.”) and data quality (e.g. “X% of activities have complete sector data”). All figures would be **generated from AIMS data** (same as other reports); we would not ask users to type totals by hand.
- **How users would run it:** On the **Reports** page, a new section **“Parliamentary reports”** with options such as “Executive summary” and “Full report.” The user would choose the **reporting period** (e.g. fiscal year 2024) and optionally filters (e.g. “All donors” or “Bilateral only”), then click **“Generate report.”** The system would run the same queries used elsewhere (totals by sector, by donor, activity list with key fields) and **fill** the template. The result would be shown on screen (e.g. HTML) so the user can check it, and a **“Download PDF”** button would produce a PDF with the same content, formatted for printing (page breaks, headers, table of contents if needed). So the workflow is: choose period → generate → review on screen → download PDF → submit or print.
- **Template design:** The look and structure (headings, table layout, logo, disclaimer) would be agreed with the user so the PDF is suitable for formal submission. We would keep the template flexible (e.g. configurable title “Aid Report to Parliament” vs “ODA Annual Report”) so one AIMS instance can serve different country names and titles.

### Features included
- **Parliamentary report template(s):** at least Executive summary + Detail table + Annex (methodology/data quality), with cover and title.
- **Generate from AIMS:** All figures and tables pulled from live data; user selects period and optional filters.
- **Preview on screen** (e.g. HTML) before download.
- **Download as PDF** with print-friendly layout (headers, page numbers, optional TOC).
- **Configurable** title and basic branding so the same template works for different countries or institutions.

---

## 23. Donor Self-Assessment Portal

### What it is
**Data Clinic** in AIMS today lets authorised users (e.g. government or super users) see data quality issues across the whole database. Donors often want to see **their own** data quality: “How complete and timely is the data for activities where we are the funder?” A **donor self-assessment** would give each **donor organisation** (or each user belonging to that organisation) a dedicated view: scorecards (e.g. “Completeness: 85%,” “Timeliness: 90%”) and a list of **their** activities that need attention (e.g. missing sector, no transaction in 12 months). So donors can improve their data before government validates it, without seeing other donors’ data.

### Why it matters
- **Quality:** When donors can see their own gaps, they fix them faster; this reduces the validation burden on government.
- **Dialogue:** Government can say “Please use the self-assessment before we run the full validation.”
- **Fairness:** Each donor sees only their own data and scores, so the process is transparent and focused.

### How we would build it
- **Who sees what:** Each user would be linked to an **organisation** (as today). The self-assessment would show data **only for activities where that organisation is the funder (or accountable)**. So “Organisation A” sees only Organisation A’s activities and their quality metrics; Organisation B sees only B’s. Government or super users could still see the full Data Clinic; this feature adds a **restricted** view for donors.
- **What we would show:** (1) **Scorecards:** A small set of indicators, e.g. “Completeness” (e.g. % of your activities with all required fields filled), “Timeliness” (e.g. % of your activities with a transaction in the last 12 months), “Sector coverage” (% with at least one sector). Each could be a number and a simple “traffic light” (green/amber/red) if we define thresholds. (2) **List of activities needing attention:** e.g. “15 activities with missing sector,” “8 activities with no transaction in 12 months,” with links to open each activity and fix it. So the donor sees “You have 23 issues across 20 activities” and can click through to fix them.
- **Where it would live:** A **“Self-assessment”** or **“My organisation’s data quality”** page (or a tab on the Dashboard for donor users). When a donor user logs in, they would see this page; when a government user logs in, they would still see the full Data Clinic (and optionally a link to “Donor self-assessment” as a reminder to donors). We would not duplicate the Data Clinic logic—we would **reuse** the same checks (e.g. “has sector?”, “has recent transaction?”) but **filter** the results by the current user’s organisation.
- **Optional history:** We could store a **snapshot** of the scores each month (e.g. “Completeness: 80% in Jan, 85% in Feb”) so donors can see improvement over time; and we could let them **download** a short report (e.g. PDF or Excel) of their current self-assessment to share with their headquarters or with government.

### Features included
- **Donor-only view:** Each donor (organisation) sees only data quality for activities where they are funder or accountable.
- **Scorecards:** e.g. Completeness, Timeliness, Sector coverage (with optional traffic lights).
- **List of activities needing attention** (e.g. missing sector, no recent transaction) with links to open and fix.
- **Reuse** of existing Data Clinic checks; only the filter (by organisation) and the page are new.
- **Optional** monthly snapshot of scores and download of self-assessment report (PDF/Excel) for internal or government use.

---

## 24. Automated Data Quality Alerts

### What it is
Today, users must **open the Data Clinic** to see data quality issues. **Automated alerts** would **proactively** notify the right people when quality drops: e.g. “Organisation X has 15 activities with missing sectors” or “Your portfolio has 10 activities with no transaction in the last 12 months—please review.” Alerts could be sent by **email** or shown **in the application** (e.g. a notification bell or a message on login), on a **schedule** (e.g. every Monday) or when a **threshold** is crossed (e.g. “Alert when missing sectors &gt; 10”).

### Why it matters
- **Proactive quality:** Problems are fixed sooner when people are reminded automatically instead of having to remember to check the Data Clinic.
- **Accountability:** Regular alerts create a habit of “we check our data every week.”
- **Less manual work:** No need for someone to run the Data Clinic and email screenshots; the system does it.

### How we would build it
- **What triggers an alert:** We would define **rules**, e.g. (1) “Every Monday, run the same checks as the Data Clinic (e.g. missing sector, missing budget, no transaction in 12 months) and for each organisation that has issues, send an email to that organisation’s contact(s): ‘You have X activities with missing sector; here is the list.’” (2) Or: “When the number of activities with critical issues for Organisation Y goes above 10, send an alert immediately.” (3) Or: “Every month, send the government aid unit a summary: ‘Total activities with issues: 50; by organisation: A 10, B 15, …’” We would start with one or two rules (e.g. weekly email per organisation) and add more if needed.
- **Who receives the alert:** Each **organisation** would have one or more **alert recipients** (e.g. email addresses), configurable by an admin or by the organisation’s lead user. So when we run “alert Organisation A,” we send the email to A’s recipients. Government might receive a separate “summary” alert (all organisations) or use the Data Clinic as now.
- **Content of the alert:** The email (or in-app message) would be short: e.g. “AIMS Data Quality Alert. Organisation: X. You have 15 activities with missing sector. Please log in to AIMS and review the Data Clinic (or Self-assessment) to fix them. List of activity IDs: …” So the recipient knows what to do and where to go. We would not attach large files by default; we could add a link “View full report in AIMS” that takes them to the self-assessment or Data Clinic filtered to their organisation.
- **Schedule and thresholds:** We would add a simple **configuration** (e.g. in Admin or System settings): “Send organisation alerts: Weekly on Monday 9am” and “Send summary to government: Monthly on the 1st.” Optional: “Alert only when issue count &gt; N” so small numbers do not trigger emails. The system would run these checks in the background (e.g. a scheduled task) and send emails using the organisation’s configured addresses.
- **History:** We could keep a **log** of alerts sent (date, recipient, rule, summary) so admins can see “last alert sent Monday 3 Feb” and avoid duplicate sends. We would not re-send the same alert for the same issues within a short window (e.g. same week) unless the rule is “every time threshold is crossed.”

### Features included
- **Scheduled alerts** (e.g. weekly or monthly) that run the same quality checks as the Data Clinic.
- **Per-organisation alerts:** Each organisation receives a message (email or in-app) listing their activities with issues (e.g. missing sector, no recent transaction), with links to AIMS to fix.
- **Configurable recipients** (email or users) per organisation and optional summary alert for government.
- **Optional thresholds** (e.g. only alert when issue count &gt; N) and **alert history** (when was the last alert sent) to avoid spam.
- **Short, actionable** message content: what is wrong, how many, where to fix (link to Data Clinic or Self-assessment).

---

## 25. Historical Exchange Rate Gain/Loss Tracking

### What it is
When a commitment (or planned disbursement) is in **another currency** (e.g. euros), AIMS converts it to **USD** for reporting using the exchange rate on a given date. Over time, exchange rates change, so the **USD value** of that same commitment can change even though the foreign-currency amount did not: that is **exchange rate gain or loss**. Today AIMS does not track this. The feature would **re-value** commitments (and optionally planned disbursements) at a **reporting date** (e.g. end of year) and show the **difference** from the original USD value—so finance and audit can see “we had $X gain/loss due to exchange rates” and reconcile with treasury or accounting.

### Why it matters
- **Financial reporting:** Many countries report aid in USD; showing “exchange rate effect” explains why totals changed even when no new commitments were signed.
- **Reconciliation:** Treasury and aid units need to reconcile AIMS figures with other systems; exchange rate gains/losses are often a line item.
- **Transparency:** Parliament and auditors may ask “why did the USD value of commitments change?”—this feature answers that.

### How we would build it
- **What we would calculate:** For each **commitment** (and optionally each planned disbursement) that was originally in a currency other than USD, we would store or calculate: (1) **Original USD value** (at the date of the commitment—what AIMS already does), (2) **USD value at reporting date** (using the exchange rate on a chosen date, e.g. 31 December 2024). The **difference** (value at reporting date minus original value) is the gain or loss for that line. We would then **aggregate** across all such commitments (for a given period or portfolio): total gain, total loss, and net effect. So the report says “In 2024, exchange rate movements led to a net gain of $X” (or loss).
- **Where the rates come from:** We would use the **same** source of exchange rates that AIMS already uses for conversion (e.g. central bank or a fixed API). For “reporting date” we would use the rate on that date (e.g. 31 Dec). So we need two dates per commitment: “commitment date” (for original USD) and “reporting date” (for re-valued USD). The user would choose the reporting date when running the report (e.g. “Re-value as of 31 Dec 2024”).
- **Where users would see it:** A new **“Exchange rate impact”** (or “Revaluation”) section, e.g. under Financial Analytics or Reports. It would show: (1) A **table**: for each period (e.g. year) or each activity (optional), columns such as Original USD, Re-valued USD, Gain/Loss. (2) A **total** line: net gain or loss for the selected portfolio and reporting date. (3) Optional **chart** (e.g. gain/loss by year). Users would select the **reporting date** (e.g. 31 Dec 2024) and the **filters** (organisation, country, sector) as in other reports, then run the report. Download (Excel) for use in financial reports or audit.
- **Scope:** We would apply this to **commitments** first (transaction type “commitment” in non-USD); if useful, we could extend to planned disbursements. We would **not** change how daily data entry works—only add this **analytical** report so that finance can see the effect of rate changes in one place.

### Features included
- **Re-value** commitments (and optionally planned disbursements) in non-USD to USD at a **reporting date** (user-selected), using the same exchange rate source as AIMS.
- **Calculate** gain/loss per line (re-valued USD minus original USD) and **aggregate** (total gain, total loss, net) for the selected portfolio and period.
- **Report** “Exchange rate impact”: table (by period or activity), total net gain/loss, optional chart; filters (period, organisation, country) and download (Excel).
- **No change** to how commitments are entered or displayed day to day—only an additional report for finance and audit.
- **Documentation** of which rate is used (e.g. “Central bank rate as of reporting date”) so the figure is auditable.

---

*End of feature specifications. This document is intended for product owners, aid coordination units, and reporting officers to understand what each feature would do and how it would be used, without technical implementation detail.*
