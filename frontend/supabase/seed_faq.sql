-- ============================================================================
-- AIMS/DFMIS FAQ Seed Data
-- 22 Comprehensive FAQs for new users
-- ============================================================================

-- Remove all existing FAQs before inserting the new set
DELETE FROM faq;

INSERT INTO faq (id, question, answer, category, tags, status, view_count, is_pinned, created_at, updated_at)
VALUES

-- ============================================================================
-- CATEGORY: Getting Started
-- ============================================================================

(
  gen_random_uuid(),
  'What is AIMS and what is it used for?',
  'The Aid Information Management System (AIMS) is a platform that tracks, manages, and reports on international development assistance flowing into a country. It acts as the central hub where all aid-related data comes together, and it''s used by government agencies, development partners, NGOs, and the general public.

At its core, AIMS helps coordinate aid by giving everyone a single, shared view of all development activities — where they''re happening, who''s involved, and how much funding is moving. This makes it easier to spot gaps, avoid duplication, and ensure resources reach the communities that need them most.

On the financial side, AIMS records budgets, commitments, disbursements, and expenditures for every activity. It automatically converts amounts into US dollars so you can compare across currencies at a glance.

AIMS is built on the International Aid Transparency Initiative (IATI) 2.03 standard, which means it can exchange data directly with the global IATI Datastore. This keeps your data aligned with what development partners publish internationally, without requiring duplicate entry.

The system also generates dashboards, charts, and exportable reports that support decision-making and public accountability. And for the national aid coordination office, there''s a built-in validation workflow so government reviewers can endorse and verify partner-reported data.

Whether you''re a government official monitoring aid flows, a development partner reporting on your activities, an NGO tracking implementation, or a member of the public exploring aid data for transparency — AIMS is designed to serve your needs.',
  'Getting Started',
  ARRAY['overview', 'introduction', 'purpose', 'what-is-aims'],
  'published',
  0,
  TRUE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How do I navigate the system? What do the main menu sections mean?',
  'The left sidebar is your main way of getting around AIMS. It''s organized into logical groups, each serving a different purpose.

Dashboard is your home base. It''s scoped to your organization and gives you a quick overview of what matters most: key metrics, recent activities, and anything that needs your attention. From here you can check your notifications, see your organization''s activities (including recently edited ones and those closing soon), explore a map of where your activities operate, and view a Sankey diagram showing how funds flow through your organization. You''ll also find your bookmarks, your personal portfolio of assigned activities, and your task queue here.

Explore is where you dig deeper into the data. The Analytics section offers comprehensive dashboards covering financial summaries, sector breakdowns, partner networks, humanitarian aid, and much more. The Atlas lets you visualize activities on a map. Search provides a global search across activities, organizations, sectors, tags, users, and contacts. And Reports gives you both pre-built standard reports and a custom pivot-table builder for creating your own.

Activities takes you to the master list of all development activities in the system. This is where you''ll spend most of your time — searching, filtering, sorting, and managing activities.

Finances gives you a dedicated view of all financial data. You''ll find all transactions (commitments, disbursements, expenditures), planned disbursement schedules, and budget records with period breakdowns.

Actors is where you manage the people and organizations involved in development work. The Organizations section lists all development partners, government agencies, NGOs, and other entities. The Rolodex is your contact book for people associated with activities and organizations.

Operations contains the Library — a unified document repository where you can browse all documents, manage your personal bookmarks, and access your organization''s shared Reading Room.

Support is where you''ll find this FAQ section, along with other help resources.',
  'Getting Started',
  ARRAY['navigation', 'menu', 'sidebar', 'layout', 'sections'],
  'published',
  0,
  TRUE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What are the different user roles and what can each role do?',
  'AIMS uses a role-based access system, so what you can do in the system depends on the role you''ve been assigned.

Super Users are system administrators, typically from the national aid coordination office. They have full access to everything — creating, editing, and deleting any activity, managing user accounts, configuring system settings through the Admin Panel, managing the FAQ, and validating data across the board.

Dev Partner Tier 1 users are senior development partner staff with review authority. They can create and edit their own organization''s activities, validate and approve data submissions, review work from their colleagues, and access the full analytics suite.

Dev Partner Tier 2 users are data entry staff at development partner organizations. They can create and edit activities for their own organization and submit data for review, but they have read-only access to other organizations'' data. They can also use the analytics dashboards.

Gov Partner Tier 1 users are government staff with validation rights. They can view all activities across the system and validate or endorse government input sections. They have full access to analytics.

Gov Partner Tier 2 users are government data entry staff. Like their Tier 1 counterparts, they can view all activities, but instead of validating, they submit government inputs for review. They also have access to analytics.

Public Users are external visitors who sign in via Google or Apple. They get read-only access to published activities and analytics, and they can bookmark items and submit questions to the FAQ.

Roles are assigned by a Super User through the Admin Panel under User Management. Each user is also linked to an organization, which determines which data they can edit. If you think your role isn''t right, reach out to your system administrator.',
  'Getting Started',
  ARRAY['roles', 'permissions', 'access', 'users', 'security'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activities
-- ============================================================================

(
  gen_random_uuid(),
  'How do I create a new activity and what are the different ways to add one?',
  'AIMS gives you four different ways to add a new activity, depending on how much detail you have and where the data is coming from.

The Full Editor is the most comprehensive option. Go to Activities, click "+ New Activity," and choose "Full Editor." This opens the complete activity form with all available tabs — Overview, Finances, Locations, Sectors, Organizations, SDGs, Documents, Results, and more. It''s the best choice when you''re creating an activity from scratch and have all the details ready.

Quick Add is the streamlined alternative. Choose "Quick Add" from the new activity menu, and you''ll get a minimal form with just the essentials: title, description, status, dates, and reporting organization. You can always come back later to fill in the rest. This is ideal when you need to register an activity quickly but don''t have everything at hand yet.

Import from IATI lets you pull in a single activity from the IATI Datastore. Choose "Import from IATI," search by organization name or IATI identifier, find the activity you want, and the system maps all the IATI fields to AIMS automatically. This is the way to go when you know a specific activity already exists in the IATI registry.

The Bulk IATI Import is a multi-step wizard for bringing in many activities at once. You search the IATI Datastore with advanced filters (organization, country, sector, date range, status, and more), preview the results, select which activities to import, configure field mappings, and then execute the import with real-time progress tracking. At the end, you get a summary of what succeeded and what needs attention. This is the best approach when onboarding a large number of activities from a development partner''s IATI publications.

Once created by any method, every activity gets a unique internal ID and appears on the Activities list. You can edit it at any time by clicking on it and navigating to the relevant tab.',
  'Activities',
  ARRAY['create', 'new-activity', 'add', 'import', 'quick-add', 'bulk-import'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What does each tab on the Activity detail page show?',
  'When you open an activity, you''ll see a series of tabs across the page. Each one manages a different aspect of the activity, and together they give you the complete picture.

The Overview tab is where you''ll find the basics: the activity''s title, description, current status, planned and actual start and end dates, the reporting organization, activity scope, IATI identifier, and collaboration type. You can also set a banner image and icon here.

The Finances tab gives you the full financial picture — total budget, commitments, disbursements, and expenditures. It includes a disbursement gauge, a cumulative finance chart, the transaction list, budget records, and planned disbursements. All amounts appear in both their original currency and the USD equivalent.

Locations shows where the activity operates geographically — the recipient countries, regions, administrative areas, and specific coordinates displayed on a map.

Sectors displays the DAC sector classifications (both 3-digit and 5-digit codes), any country-specific sectors, and how the activity''s resources are allocated across them as percentages. There''s a sunburst chart that visualizes the breakdown.

Organizations lists all participating organizations, grouped by their role: Funding, Accountable, Extending, and Implementing.

SDGs and Policy Markers shows which Sustainable Development Goals the activity aligns with, along with policy markers for areas like gender equality, environment, and trade, each with a significance score.

Tags and Classifications covers custom tags, the activity type, default aid type, flow type, finance type, tied status, and other IATI classification fields.

Documents holds any attached files — PDFs, spreadsheets, images — along with their categories and descriptions.

Contacts lists the people associated with the activity, including their roles and contact details.

Results is the monitoring and evaluation section, with outcomes, indicators, baselines, targets, and actual data for each reporting period.

Related Activities shows links to parent, child, or sibling activities, helping you understand the project hierarchy.

Conditions captures any conditions attached to the activity, such as policy conditions or fiduciary requirements.

Humanitarian includes humanitarian scope codes, emergency classifications, and humanitarian markers.

Government Inputs is where government contributions, in-kind support, and the formal validation and endorsement workflow live.

IATI Link lets you view the raw IATI XML, compare your data field-by-field with the IATI Datastore version, and manage the activity''s sync status.

The Activity Log is a full audit trail showing every change made to the activity — who changed what and when.

And the Comments tab supports threaded discussions where team members can post comments, reply to each other, and react with emoji.',
  'Activities',
  ARRAY['activity-detail', 'tabs', 'overview', 'fields', 'activity-page'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What do the different activity statuses mean?',
  'Every activity in AIMS has a status that reflects where it is in its lifecycle. These statuses follow the IATI Activity Status codelist, so they''re consistent with international standards.

Pipeline/Identification means the activity is under consideration but hasn''t been formally approved or started yet. It might still be in the planning or design phase.

Implementation means the activity has been approved and work is actively underway. Funds are being disbursed and the project is moving forward.

Finalisation indicates that implementation is largely complete, but the activity hasn''t been formally closed yet. There may still be final disbursements, evaluations, or reporting to finish up.

Closed means the activity is officially done. All funds have been disbursed and final reports have been submitted.

Cancelled means the activity was planned or even started, but has been called off and won''t proceed any further.

Suspended means the activity has been temporarily put on hold. It may resume in the future.

These statuses affect how the system works in several ways. You can filter the Activities list by status to focus on, say, only active projects. The Analytics dashboard counts "Active Projects" and "Completed Projects" separately in its headline figures. The Dashboard highlights activities with planned end dates approaching so you can follow up. And when auto-sync is enabled, the status is kept in sync with the IATI Datastore.',
  'Activities',
  ARRAY['status', 'lifecycle', 'pipeline', 'implementation', 'closed', 'cancelled'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Finances
-- ============================================================================

(
  gen_random_uuid(),
  'What are the different transaction types and what does each one represent?',
  'AIMS supports all 13 IATI transaction types, though most of the time you''ll work with the four core types.

Incoming Funds represent money received by the reporting organization from an external source — for example, when a donor transfers funds to an implementing agency.

Outgoing Commitment is a firm, written promise to provide funds. Think of it as the donor''s formal obligation to fund an activity. The money hasn''t moved yet, but there''s a legal commitment in place.

Disbursement is when money actually changes hands — a transfer of funds from the reporting organization to another entity. This is the moment funds are really moving.

Expenditure is money spent directly by the reporting organization on goods or services. Unlike a disbursement, the funds aren''t transferred to another organization — they''re spent on things like supplies, consultants, or equipment.

The simplest way to remember the distinction: a commitment is "we promise to provide this amount," a disbursement is "we transferred this amount to another organization," and an expenditure is "we spent this amount directly."

Beyond these four, there are additional types you may encounter less frequently. These include interest payments and loan repayments (for loan-based activities), reimbursements (repayments for expenses already incurred), equity purchases and sales, credit guarantees, incoming commitments (the receiving side of an outgoing commitment), and pledges (non-binding indications of intent to provide or receive funds). These additional types follow the IATI standard and are available when you need them, but the vast majority of financial recording uses the four core types.',
  'Finances',
  ARRAY['transactions', 'commitment', 'disbursement', 'expenditure', 'incoming-funds', 'financial-types'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How are financial figures calculated on the Analytics dashboard (Budget Utilization, Disbursement Rate, etc.)?',
  'The Analytics dashboard displays several headline figures that summarize the financial state of your aid portfolio. Here''s what each one means and how it''s calculated.

Total Budgeted is the sum of all activity budget values, converted to USD. It tells you the total amount of money that has been planned or allocated across all activities you''re looking at.

Total Disbursed adds up all disbursement transactions (actual transfers of funds) in USD. This shows how much money has actually been sent to implementing entities.

Total Expenditure adds up all expenditure transactions in USD — money spent directly by reporting organizations on goods and services.

Budget Utilization shows what percentage of budgeted funds have actually been spent or transferred. It''s calculated by dividing the sum of disbursements and expenditures by the total budget. A low percentage might signal implementation delays or slow spending.

Disbursement Rate measures how well donors are delivering on their promises. It divides total disbursements by total commitments to show what percentage of committed funds have actually been transferred.

The dashboard also shows counts: Active Projects (activities currently in Implementation status), Completed Projects (activities that have been Closed), and Reporting Partners (how many development partners have at least one activity in the system).

All financial figures are converted to USD using historical exchange rates based on the date each transaction occurred, so comparisons across currencies are consistent. When you hover over a USD amount, you''ll see the original currency and value in a tooltip.

One important thing to keep in mind: all dashboard figures respect your current filter selections. If you filter by a specific sector, organization, or date range, every number on the page recalculates to reflect only the filtered data.',
  'Finances',
  ARRAY['calculations', 'budget-utilization', 'disbursement-rate', 'kpi', 'metrics', 'dashboard-figures'],
  'published',
  0,
  TRUE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How does currency conversion to USD work?',
  'Development activities involve many different currencies, so AIMS automatically converts all financial values to US dollars to make comparison and aggregation straightforward.

When a transaction is recorded, you enter the value in its original currency — whether that''s euros, yen, or anything else. The system then looks up the historical exchange rate for the date of that transaction and calculates the USD equivalent. Both the original value and the converted USD amount are stored in the database, so the conversion only happens once and stays consistent even if exchange rates change later.

You''ll see both values throughout the system. Transaction lists show the original currency alongside the USD equivalent. On the activity''s finance tab, totals appear in USD with tooltips that reveal the original amounts. The Analytics dashboards and charts all use USD for aggregated figures. And when you export reports, both columns are included.

A few things worth noting: the exchange rates are historical, meaning they reflect the rate on the date the transaction actually occurred — not today''s rate. If a transaction is already in USD, the original and converted values will naturally be identical. Budget values go through the same conversion process. And because the conversion is done once at the time of entry or import, your financial data remains stable and auditable over time.',
  'Finances',
  ARRAY['currency', 'usd', 'exchange-rate', 'conversion', 'multi-currency'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What is the difference between Budgets, Planned Disbursements, and Transactions?',
  'AIMS tracks financial information at three different levels, and understanding how they relate to each other helps you get the most out of the system.

A Budget is the total planned or allocated amount for an activity over a specific time period. Think of it as the financial envelope — the overall funding plan. For example, a project might have a budget of $5 million for 2024 through 2027.

A Planned Disbursement is a specific expected future payment — when and how much money is anticipated to be transferred. It''s a forward-looking schedule that breaks the budget down into concrete payment expectations. Continuing the example, the $5 million budget might be scheduled as $1.2 million in 2024, $1.5 million in 2025, $1.3 million in 2026, and $1 million in 2027.

A Transaction is an actual financial event that has already happened — money that was committed, transferred, or spent. These are historical records. In our example, $1,150,000 might have actually been disbursed in 2024, which is slightly less than the $1.2 million that was planned.

So the relationship flows from general to specific: the budget sets the total envelope, planned disbursements break that envelope into a schedule of expected payments, and transactions record what actually happened. Comparing planned disbursements against actual transactions is one of the best ways to see whether an activity is on track financially.

You can find each of these in the system under Finances in the main sidebar (with separate sections for Transactions, Planned Disbursements, and Budgets), or on any individual activity''s Finances tab where all three are shown together.',
  'Finances',
  ARRAY['budget', 'planned-disbursement', 'transactions', 'financial-planning', 'difference'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: IATI
-- ============================================================================

(
  gen_random_uuid(),
  'What is IATI and how does AIMS integrate with it?',
  'The International Aid Transparency Initiative (IATI) is a global standard for publishing information about development cooperation. Over 1,500 organizations worldwide publish their aid data in IATI format, making it searchable through a centralized database called the IATI Datastore.

AIMS is built on the IATI 2.03 standard, which means every field in the system maps to an IATI element. This tight alignment makes it possible to exchange data with the IATI Datastore seamlessly.

On the import side, you have several options. You can search the IATI Datastore and import a single specific activity directly into AIMS. Or you can use the Bulk Import wizard to search, preview, and bring in many activities at once with advanced filters. And once activities are in the system, you can enable auto-sync so that when a development partner updates their IATI publication, AIMS automatically pulls the latest version.

For quality assurance, any activity''s IATI Link tab lets you see a field-by-field comparison between your local AIMS data and the version published on the IATI Datastore. Fields that differ are highlighted, making it easy to spot discrepancies.

On the Activities list, you''ll see sync status indicators that tell you at a glance whether an activity is synced with IATI, whether differences exist, or whether it hasn''t been linked to the Datastore at all.

The practical benefit of all this is reduced duplicate data entry. Development partners who already publish to IATI can have their data imported and kept up to date automatically, saving significant time and improving data quality across the board.',
  'IATI',
  ARRAY['iati', 'datastore', 'sync', 'import', 'transparency', 'standard', 'xml'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How does the IATI Bulk Import work and what do the import steps mean?',
  'The Bulk Import wizard lets you bring in many activities from the IATI Datastore at once. It walks you through the process step by step.

In the first step, Search and Select, you query the IATI Datastore using a combination of filters. You can search by the publishing organization, any participating organization, the recipient country or region, DAC sector codes, activity status, date ranges, aid type, humanitarian flag, and more. The system fetches matching results from the Datastore, returning up to 1,000 per page.

The second step, Preview and Filter, lets you review what came back. You''ll see a table of activities with their titles, IATI identifiers, dates, and statuses. You can apply additional filters to narrow things down, select or deselect individual activities, or use "Select All." Take your time here — this is where you decide exactly which activities to bring in.

In the Field Mapping step, you configure how IATI data maps to AIMS fields. The system handles most of this automatically, but you can adjust things like how IATI organization references match up with existing AIMS organizations, how sector vocabularies are mapped, and other custom field assignments.

The Import step is where the actual work happens. The system processes your selected activities with a real-time progress bar, bringing in core activity data, participating organizations (creating new records if needed), sectors and classifications, transactions with USD conversion, budgets, planned disbursements, documents, locations, and other related records. Everything is inserted in batches for performance, with automatic fallback to individual record processing if a batch encounters issues.

Finally, the Review step shows you a summary of how everything went — how many activities were imported successfully, any that failed along with error details, and links to navigate directly to the newly imported activities.',
  'IATI',
  ARRAY['bulk-import', 'iati-import', 'wizard', 'datastore', 'import-steps'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What is IATI Auto-Sync and how do I configure it?',
  'Auto-Sync is a feature that automatically keeps AIMS activities up to date with their source data on the IATI Datastore. When a development partner updates their IATI publication, AIMS can detect the changes and update its records accordingly — without anyone having to lift a finger.

Here''s how it works: a scheduled background job runs periodically to check the IATI Datastore for updates. For each activity with auto-sync enabled, it fetches the latest published version, compares it against what''s currently in AIMS, and updates any fields that have changed. The sync timestamp is recorded so you can always see when the last update happened.

Auto-Sync is configured on individual activities through the IATI Link tab in the Activity Editor. Open the activity, go to the IATI Link tab, and toggle "Enable auto-sync every 24 hours" on or off. You can also choose which specific fields should be synced, giving you control over what gets updated automatically and what you''d prefer to manage manually.

After auto-sync runs, each activity shows a sync status indicator on the Activities list, and you can visit the IATI Link tab to see the last sync time and a detailed field-by-field comparison with the Datastore version.

If you need an immediate update rather than waiting for the next scheduled run, you can trigger a manual sync for any individual activity using the "Sync Now" button on its IATI Link tab.

Auto-sync settings can be managed by Super Users and Dev Partner Tier 1 users for their own organization''s activities.',
  'IATI',
  ARRAY['auto-sync', 'synchronization', 'iati-sync', 'cron', 'automatic-update'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Analytics & Reports
-- ============================================================================

(
  gen_random_uuid(),
  'What charts and visualizations are available in the Analytics dashboard?',
  'The Analytics dashboard, found under Explore in the sidebar, is packed with visualizations spread across eight specialized tabs. Here''s a tour of what''s available.

The Portfolio Summary tab is the most comprehensive. It includes a side-by-side bar chart comparing budgets, commitments, disbursements, and expenditures; a sector financial breakdown showing funding by DAC sector; a cumulative line chart tracking spending over time; a trajectory chart showing how spending compares to plans; a horizontal bar chart ranking all development partners by total funding; a Sankey flow diagram tracing money from funding sources through intermediaries to sectors; a list of the most upvoted activities; top 10 rankings for active projects, government-validated activities, and highest disbursements; and a national priorities dashboard showing how aid aligns with national development plans.

The Aid on Budget tab compares government domestic spending with aid by fiscal year, and breaks down which aid is on-budget versus off-budget.

The Humanitarian tab shows humanitarian aid as a share of total aid and tracks trends in humanitarian versus development funding over time.

The Sector and Thematic tab features a coordination circle pack (a bubble chart showing sector clusters), a time series of funding trends by sector, SDG funding alignment analysis, and a breakdown of policy markers like gender and environment.

The Partner Network tab offers an interactive network graph of organizational relationships, plus a four-tier Sankey diagram tracing funding flows from funders to accountable organizations to extenders to implementers.

The Aid Ecosystem tab provides creative visualizations of the aid landscape, including an organizational positioning map and a solar system-style visualization.

The Operations tab focuses on activity management with a status distribution chart, a calendar heatmap showing transaction volume over time, and a breakdown by transaction type.

Finally, the Tree Map tab displays a hierarchical treemap of intervention approaches, giving you a visual sense of where the emphasis lies across your portfolio.',
  'Analytics & Reports',
  ARRAY['analytics', 'dashboard', 'charts', 'visualizations', 'graphs', 'sankey', 'kpi'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How do I create custom reports using the Pivot Table report builder?',
  'AIMS includes a custom report builder that works like an Excel pivot table, but draws directly from your AIMS data. You''ll find it under Explore, then Reports, then the "Custom Report" tab.

Building a report is straightforward. First, choose what should appear in the rows — this might be sectors, organizations, countries, or activity statuses. Then choose what goes in the columns, such as years or transaction types. Next, select which values to aggregate (transaction amounts, budget amounts, activity counts, and so on) and how they should be summarized — as a sum, count, or average. You can also apply filters to narrow the underlying data before generating the table.

Once your pivot table is built, you can sort by clicking column headers, drill down into cells to see the underlying records, and export the results as Excel or CSV. You can save your report configuration for reuse and pin frequently used reports for quick access.

If you don''t need a custom report, AIMS also offers several pre-built standard reports that are ready to go. These include an All Activities Master List, Disbursements by Development Partner, Commitments vs. Disbursements, Sector Funding Breakdown, Funding by Region, Development Partners Summary, a Data Quality Report, and a Transparency Index Export.',
  'Analytics & Reports',
  ARRAY['reports', 'pivot-table', 'custom-reports', 'export', 'excel', 'standard-reports'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Organizations
-- ============================================================================

(
  gen_random_uuid(),
  'How are organizations structured and what are the different organization types?',
  'AIMS classifies organizations using the IATI Organisation Type codelist, which provides a standardized way to categorize the different kinds of entities involved in development work.

You''ll encounter several types. Government organizations include national government ministries and central agencies. Local Government covers municipal, provincial, or state-level entities. Other Public Sector includes public corporations and statutory bodies. On the non-governmental side, there are International NGOs (like Oxfam or Save the Children), National NGOs (domestic organizations), Regional NGOs (operating across multiple countries in a region), and Partner Country-based NGOs (local organizations in the recipient country). Multilateral organizations include UN agencies, the World Bank, and regional development banks. You''ll also see Foundations, Academic and Research institutions, Public-Private Partnerships, and an Other category for anything that doesn''t fit neatly elsewhere.

Within any given activity, an organization can play one or more roles. A Funding organization provides the financial resources. The Accountable organization bears overall responsibility for the activity. An Extending organization manages the budget and implementation. And the Implementing organization carries out the actual work on the ground. It''s common for an organization to hold multiple roles — for instance, a multilateral might be both the funder and the accountable party.

For analytical purposes, organizations can also belong to institutional groups like regional blocs (ASEAN, EU, African Union), economic groupings (G7, G20, BRICS, OECD), or development-specific groups (OECD-DAC, Paris Club). Administrators can also create custom organization groups — for example, "Health Sector Partners" or "Budget Support Donors" — with custom logos and banners, making it easy to filter and analyze by whatever groupings matter most.',
  'Organizations',
  ARRAY['organizations', 'types', 'roles', 'partners', 'institutional-groups', 'funding', 'implementing'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Documents & Library
-- ============================================================================

(
  gen_random_uuid(),
  'How does the Library work and what is the difference between Reading Room and My Library?',
  'The Library, found under Operations in the sidebar, is a unified document repository that pulls together all documents from across the system into one searchable, filterable place.

Documents come from four sources: files attached to specific activities (like project reports, evaluations, and terms of reference), files attached to financial transactions (invoices, receipts, transfer confirmations), files associated with organizations (strategy documents, annual reports), and standalone documents uploaded directly to the Library without being tied to a specific activity or organization.

The Library has three tabs. All Documents shows every document in the system, giving you a complete view of everything that''s been uploaded (within your access level). Reading Room is a shared collection curated at the organization level — when someone bookmarks a document to the Reading Room, it becomes visible to everyone in that organization. Think of it as your team''s shared reference shelf. My Library is your personal collection — documents you''ve bookmarked for your own reference that only you can see.

Bookmarking is simple: when viewing any document, you can add it to My Library for personal use or to the Reading Room to share it with your team.

The Library also offers full-text search, filters (by source type, document category, file format, reporting organization, and date range), two view modes (card grid and table list), in-browser document preview, and the ability to click through to the parent activity, transaction, or organization that a document belongs to.',
  'Documents & Library',
  ARRAY['library', 'documents', 'reading-room', 'bookmarks', 'my-library', 'files'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Search & Navigation
-- ============================================================================

(
  gen_random_uuid(),
  'How do I search for activities and what filters are available?',
  'AIMS gives you several ways to find the activities you''re looking for, from quick searches to detailed filtering.

The simplest option is the search bar at the top of the Activities page. Type in any keyword and it will search across activity titles, description text, and IATI identifiers. This is usually the fastest way to find a specific activity when you know part of its name or identifier.

For more targeted searching, click the filter icon on the Activities page to open the advanced filter panel. You can filter by activity status (Pipeline, Implementation, Finalisation, Closed, Cancelled, or Suspended), DAC sectors (both 3-digit and 5-digit codes), participating organizations in any role, locations (country, region, or administrative area), Sustainable Development Goal alignment, policy markers (gender, environment, trade, and more), date ranges (planned or actual start and end dates), IATI sync status, and publication status. Filters can be combined to narrow things down as precisely as you need.

If you''re looking beyond just activities, use the Global Search under Explore in the sidebar. This searches across activities, organizations, sectors, tags, users, and contacts all at once. Results are organized into tabs by type, each showing a count, and you can click through to anything you find.

On the Activities list, you can also sort by clicking column headers or using the sort dropdown, and you can customize which columns are visible. If you need to take action on multiple activities at once, select them using checkboxes and use the bulk operations menu to delete, export (as PDF or Excel), or bookmark them.',
  'Search & Navigation',
  ARRAY['search', 'filter', 'find', 'activities-list', 'sorting', 'global-search'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Data Quality
-- ============================================================================

(
  gen_random_uuid(),
  'What does the Validation Rules Check do and how does government validation work?',
  'AIMS includes multiple layers of data quality checks to help ensure that aid information is accurate and complete.

The Validation Rules Check, found on the Dashboard, runs a series of automated checks against your organization''s activities. It looks at several things: whether all required fields are filled in (title, description, dates, status, reporting organization, at least one sector, and at least one participating organization), whether financial data is consistent (for example, whether budget totals align with transaction sums and whether there are disbursements without corresponding commitments), whether dates make logical sense (end dates after start dates, transactions falling within the activity period), whether sector allocation percentages add up to 100%, and whether the activity meets the mandatory field requirements of the IATI 2.03 standard. Activities that fail any of these checks are flagged with specific error messages so you know exactly what needs fixing.

The Government Validation Workflow is a separate, more formal process. On each activity''s Government Inputs tab, the workflow goes like this: a development partner enters activity data and submits it for review. A government reviewer then looks it over and can either endorse the activity (confirming the data is accurate) or request changes, sending it back with comments. Government staff can also add their own inputs — government contributions, in-kind support, and budget classification data.

Individual transactions can go through validation too. The Admin Panel has a Pending Validations queue showing all transactions that are awaiting acceptance or rejection.

For a broader view of data quality, the Data Quality Report under Explore then Reports gives each activity a completeness score based on how well its fields are populated across all required and recommended elements. It''s a great way to identify which activities need attention.',
  'Data Quality',
  ARRAY['validation', 'data-quality', 'government-validation', 'endorsement', 'completeness', 'rules'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Admin & Permissions
-- ============================================================================

(
  gen_random_uuid(),
  'What can I do in the Admin Panel and who has access?',
  'The Admin Panel is available only to Super Users and provides system-wide configuration and management tools.

User Management is where you create, edit, and deactivate user accounts. You can assign roles (Super User, Dev Partner Tier 1 or 2, Gov Partner Tier 1 or 2, or Public User) and associate each user with their organization.

The User Activity Dashboard lets you see login history, track engagement, and identify who''s been active in the system recently.

IATI Import Logs give you a complete history of all IATI imports — when they ran, how many activities were brought in, and whether any errors were encountered.

Pending Validations is a queue of activities and transactions that are waiting for government validation or endorsement.

Feedback Management lets you review user-submitted feedback, feature requests, and bug reports, and track their status over time.

FAQ Management is where you create, edit, and publish FAQ entries (like this one). You can also review questions submitted by users and convert them into published FAQs, manage categories, and add attachments.

System Settings covers system-wide configuration, feature flags, and API settings.

The Chart of Accounts section is for managing budget classifications, mapping sectors to budget codes, configuring country-specific sectors, entering domestic budget data, and maintaining national development priorities.

Project References lets you manage external project reference systems and bulk-import reference codes from other tracking systems.

Emergencies is where you declare and manage country emergencies and humanitarian crises, which can then be tagged on relevant activities.

And Calendar Events lets you create system-wide events like coordination meetings and reporting deadlines that all users can see.

If you need Admin access and don''t currently have it, reach out to your organization''s AIMS focal point or the national aid coordination office.',
  'Admin & Permissions',
  ARRAY['admin', 'admin-panel', 'settings', 'user-management', 'configuration', 'super-user'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Sectors & Classifications
-- ============================================================================

(
  gen_random_uuid(),
  'What are DAC sectors and how do sector percentages work?',
  'DAC sectors are a standardized classification system maintained by the OECD''s Development Assistance Committee. They provide a common language for describing what development activities focus on, making it possible to compare and analyze aid across organizations and countries.

Sectors come in two levels of detail. The high-level categories use 3-digit codes — for example, 110 is Education, 120 is Health, and 150 is Government and Civil Society. Within each category, more specific 5-digit codes describe the detailed purpose — so 11220 is Primary Education and 12220 is Basic Health Care.

An activity can be tagged with multiple sectors, but the percentages must add up to 100%. These percentages represent how the activity''s resources are split across its focus areas. For instance, a health and education project might be 60% Health, 30% Education, and 10% Government and Civil Society.

These percentages matter because the Analytics dashboard uses them to proportionally allocate financial values. If a $1 million activity is tagged as 60% Health and 40% Education, then $600,000 counts toward the Health sector total and $400,000 toward Education. This prevents double-counting — the full million isn''t counted under both sectors.

In addition to the international DAC sectors, AIMS supports country-specific sector vocabularies. These are custom classifications defined by the national government to align with their own planning framework. Administrators can set these up under Admin, then Chart of Accounts, then Country Sectors.

On the activity detail page, you''ll see sectors visualized as a sunburst chart. On the Analytics dashboard, they appear in bar charts, time series, and the coordination circle pack.',
  'Sectors & Classifications',
  ARRAY['sectors', 'dac', 'classification', 'percentages', 'oecd', 'country-sectors'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Collaboration
-- ============================================================================

(
  gen_random_uuid(),
  'How do bookmarks, comments, and the task system work?',
  'AIMS includes several features designed to help you stay organized and collaborate with your team.

Bookmarks let you save items for quick access. You can bookmark activities from the Activities list or from any activity''s detail page, and find them all in one place under Dashboard then Bookmarks. Organization bookmarks work the same way for organizations you interact with frequently. And for documents, you can save them either to My Library (your personal collection, visible only to you) or to the Reading Room (shared with everyone in your organization).

Comments are available on every activity through the Comments tab. They support threaded discussions, so you can post observations, ask questions, or give feedback, and others can reply directly to specific comments. Quick emoji reactions are also available when a full reply isn''t needed. All comments are visible to anyone who can view the activity, and the full discussion history is preserved as a record of the conversation.

The Task System, found under Dashboard then Tasking, provides lightweight task management. You can create tasks related to activities (like "Update Q3 disbursement data" or "Upload evaluation report"), use pre-defined templates for common tasks, assign work to specific team members, track progress and completion, attach relevant documents, and review the full event history for each task.

Activities also support upvoting and downvoting, similar to a community rating system. The most upvoted activities appear in the Analytics dashboard under "Top Voted Activities," which helps surface high-impact or high-interest projects across the portfolio.

Tying it all together, the notification system (accessible from Dashboard then Notifications, with an unread count badge) keeps you informed about new comments, task assignments, validation requests, and other system events that are relevant to you.',
  'Collaboration',
  ARRAY['bookmarks', 'comments', 'tasks', 'voting', 'notifications', 'collaboration', 'teamwork'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
);
