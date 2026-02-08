-- ============================================================================
-- AIMS/DFMIS FAQ Seed Data — Activity Editor (Advanced Users)
-- 20 FAQs for users completing activities in the Activity Editor
-- ============================================================================

INSERT INTO faq (id, question, answer, category, tags, status, view_count, is_pinned, created_at, updated_at)
VALUES

-- ============================================================================
-- CATEGORY: Activity Editor — General
-- ============================================================================

(
  gen_random_uuid(),
  'How does autosave work in the Activity Editor, and do I need to press a Save button?',
  'The Activity Editor uses a field-level autosave system, which means each field saves independently as you work — there is no single "Save" button you need to remember to press.

When you change a field (typing text, selecting a dropdown, toggling a checkbox), the system waits about one to two seconds after you stop making changes, then automatically saves that field in the background. You will see visual feedback as this happens: a small spinner while the save is in progress, a green checkmark when it succeeds, or a red indicator if something went wrong.

This means you can move freely between tabs without worrying about losing your work. Each change is persisted the moment you make it.

There are a couple of things to keep in mind. When you are creating a brand-new activity, the very first save (usually the title field) actually creates the activity in the database. Until that first save completes, the other tabs are locked. Once the activity is created, all tabs unlock and you will see a notification confirming this. Also, if you are working on a field and immediately navigate away before the autosave timer fires, the save may not have completed — so it is good practice to pause briefly after making changes before closing the browser.',
  'Activity Editor — General',
  ARRAY['autosave', 'saving', 'editor', 'field-level-save', 'workflow'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What do the tab icons in the editor navigation mean (green checkmarks, yellow warnings, gray circles)?',
  'The navigation panel on the left side of the Activity Editor shows a small status icon next to each tab. These icons give you a quick visual summary of how complete your activity data is.

A green checkmark means the tab has valid, complete data. For example, the General tab shows green once you have entered a title, the Sectors tab shows green when your sector allocations add up to 100%, and the Organizations tab shows green when at least one participating organization has been added.

A yellow warning triangle means there is data on the tab but something needs attention — for instance, your sector percentages might not add up to 100%, or a required field within the tab is missing.

A gray circle means the tab has not been filled in yet or is optional and can be left empty.

These indicators are meant to guide you through the completion process. They are especially useful when preparing an activity for publication or government validation, as they help you quickly identify which sections still need work. You do not need every tab to be green — some tabs are optional depending on the nature of your activity.',
  'Activity Editor — General',
  ARRAY['tab-status', 'completion', 'validation', 'checkmarks', 'editor-navigation'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How are the editor tabs organized, and do I need to complete them in order?',
  'The Activity Editor organizes its tabs into six major groups, each covering a different aspect of the activity.

The first group, IATI Tools, includes the XML Import and IATI Link tabs for connecting your activity to external IATI data. The second group, Activity Overview, covers the fundamentals: General information (title, description, dates, status), Sectors, Humanitarian scope, Country/Region targeting, and Locations. The third group, Stakeholders, handles Participating Organisations, Contacts, and Linked Activities. The fourth group, Funding and Delivery, is the largest — it includes Financial Information, Planned Disbursements, Budgets, Forward Spend, Results, Capital Spend, Financing Terms, and Conditions. The fifth group, Strategic Alignment, covers SDG Alignment, Budget Mapping, Tags, Working Groups, and Policy Markers. The sixth group, Supporting Info, holds Documents and Aid Effectiveness. Finally, the Administration group includes Metadata, a Readiness Checklist, and Government Inputs.

You do not need to complete the tabs in any particular order. Thanks to autosave, you can jump between tabs freely and fill in data as it becomes available. The only constraint is that for a brand-new activity, the General tab must be completed first (specifically the title field) because that is what creates the activity record in the database and unlocks the remaining tabs.',
  'Activity Editor — General',
  ARRAY['tabs', 'groups', 'navigation', 'order', 'editor-structure'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Sectors
-- ============================================================================

(
  gen_random_uuid(),
  'Why must my sector percentages add up to exactly 100%, and what happens if they do not?',
  'Sector percentages represent how the activity''s resources are distributed across its focus areas. If an activity is 60% Health and 40% Education, that means roughly 60% of the funding is directed toward health outcomes and 40% toward education. These percentages must add up to exactly 100% because the system uses them to proportionally allocate financial values in analytics and reports.

For example, if your activity has a $1 million budget and you tag it as 60% Health and 40% Education, the Analytics dashboard will count $600,000 toward the Health sector and $400,000 toward Education. If the percentages did not add up to 100%, those financial allocations would be inaccurate — the numbers would either overcount or undercount across sectors.

If your percentages do not add up to 100%, the editor will show a warning message displaying your current total. The tab''s status icon will turn yellow to flag the issue. You can still save your work and move to other tabs (autosave does not block on this), but the activity will not pass validation checks until the sectors total 100%. The system displays the remaining percentage as you work so you can easily see how much allocation is left to assign.

If your activity genuinely focuses on a single sector, simply assign that sector 100%. If it spans multiple sectors, divide the percentages to reflect the approximate resource split.',
  'Activity Editor — Sectors',
  ARRAY['sectors', 'percentages', '100-percent', 'allocation', 'validation', 'dac'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What is the difference between DAC 3-digit and DAC 5-digit sector codes?',
  'DAC sector codes are a standardized classification maintained by the OECD''s Development Assistance Committee. They come in two levels of detail.

DAC 3-digit codes are high-level categories. For example, 110 is Education, 120 is Health, and 150 is Government and Civil Society. These give you a broad picture of what an activity is about.

DAC 5-digit codes are much more specific. Within Education (110), you might have 11220 for Primary Education or 11330 for Vocational Training. Within Health (120), you could have 12220 for Basic Health Care or 12250 for Infectious Disease Control.

In the Activity Editor, you work with DAC 5-digit codes because they provide the granularity needed for meaningful analysis. When you select a 5-digit code, the system automatically links it to its parent 3-digit category, so both levels are available for reporting and analytics. The sectors are displayed in the editor grouped by their 3-digit parent, which makes it easier to browse and find the right code.

The system also supports country-specific sector vocabularies if your national government has defined custom classifications. These sit alongside the DAC codes and can be configured by administrators under the Chart of Accounts settings.',
  'Activity Editor — Sectors',
  ARRAY['sectors', 'dac-3-digit', 'dac-5-digit', 'oecd', 'classification', 'codes'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Transactions
-- ============================================================================

(
  gen_random_uuid(),
  'What fields are required when entering a transaction, and what are the optional fields for?',
  'When entering a transaction, four fields are required: the transaction type (such as Commitment, Disbursement, or Expenditure), the transaction date, the value (which must be greater than zero), and the currency.

Beyond those essentials, there are several optional fields that add important context. The provider organization is who the money came from, and the receiver organization is who it went to — these are especially useful for tracking fund flows between entities. The description field lets you add a narrative explaining what the transaction was for. The value date can differ from the transaction date and is used for currency conversion purposes.

There are also classification fields that default from the activity level but can be overridden per transaction: flow type, finance type, aid type, tied status, and disbursement channel. If a specific transaction has a different classification than the activity default, you can set it here.

For more advanced use, you can assign sector allocations at the transaction level (splitting the transaction value across multiple sectors with percentages that must total 100%), specify a recipient country or region, add a humanitarian flag, and link the transaction to a related activity. Linked transactions are particularly powerful — they let you connect an outgoing commitment in one activity to an incoming fund in another, creating a traceable chain of fund flows across the system.',
  'Activity Editor — Transactions',
  ARRAY['transactions', 'required-fields', 'optional-fields', 'provider', 'receiver', 'classification'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How does the system handle currency conversion for transactions?',
  'When you enter a transaction in a currency other than USD, the system automatically converts it to a USD equivalent. Here is how the process works in detail.

You enter the transaction value in its original currency — say EUR 500,000 with a transaction date of March 15, 2025. The system looks up the historical exchange rate for EUR to USD on that specific date. It then calculates the USD equivalent and stores both values: the original EUR 500,000 and the converted USD amount.

The value date field matters here. If you set a value date that differs from the transaction date, the system uses the value date for the exchange rate lookup. This is important because IATI guidelines sometimes call for the value date to be the date when the financial commitment was formally made, which might differ from when it was recorded.

Once converted, the USD amount is stored permanently and does not change even if exchange rates fluctuate later. This ensures your historical financial data remains stable and auditable. You can see both the original currency amount and the USD equivalent on transaction lists, the activity''s Finances tab, and in exported reports.

If a transaction is already denominated in USD, the original and converted values will be identical and no conversion takes place.',
  'Activity Editor — Transactions',
  ARRAY['currency-conversion', 'usd', 'exchange-rate', 'value-date', 'transactions'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Organizations
-- ============================================================================

(
  gen_random_uuid(),
  'What are the organization roles (Funding, Extending, Implementing, Government) and when should I use each one?',
  'Each participating organization in an activity is assigned a role that describes how they are involved. Getting these right is important because the Analytics dashboard and reports use roles to calculate fund flows and organizational contributions.

A Funding organization is the one providing the money. This is typically a bilateral donor, a multilateral fund, or a foundation. In a typical scenario, the donor headquarters pledging funds to a country program would be listed as the funder.

An Extending organization manages the funds and oversees the activity on behalf of the funder. Think of this as the entity that passes the money along — for instance, a UN agency that receives funds from a donor and channels them to implementing partners. In many cases the extending organization is the same as the reporting organization.

An Implementing organization carries out the actual work on the ground. These are the NGOs, contractors, government line ministries, or community organizations who deliver the services, build the infrastructure, or run the programs.

A Government organization is the government counterpart or partner entity. This role is specific to AIMS and reflects the national government''s involvement — typically a line ministry or government agency that is overseeing or co-managing the activity.

It is common for an organization to hold multiple roles. A multilateral development bank might be both the funder and the extending organization. A government ministry might be both a government partner and an implementer. You can add the same organization multiple times with different roles.',
  'Activity Editor — Organizations',
  ARRAY['organizations', 'roles', 'funding', 'extending', 'implementing', 'government', 'participating'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Results Framework
-- ============================================================================

(
  gen_random_uuid(),
  'How do I set up a results framework with indicators, baselines, and targets?',
  'The Results tab lets you build a structured monitoring and evaluation framework for your activity. It follows a hierarchy: Results contain Indicators, and Indicators contain Baselines and Periods.

Start by creating a Result. Each result needs a type — Output (direct deliverables), Outcome (medium-term changes), Impact (long-term goals), or Other. Give it a title and optionally a description. You can also add document links for evidence and set an aggregation status if the result can be aggregated across activities.

Within each result, add one or more Indicators. Each indicator needs a title and a measure type: Unit (counting things like "number of people trained"), Percentage (like "% of target population reached"), Currency (financial outcomes), or Qualitative (narrative assessments). You also specify whether the indicator is ascending (higher is better, like enrollment rates) or descending (lower is better, like mortality rates), which affects how achievement percentages are calculated.

For each indicator, set a Baseline — the starting value before the activity began. This includes a year or date, a numeric value, and optionally a comment and disaggregated dimensions (breaking the value down by sex, age group, disability status, or geographic area).

Then add Periods — specific time windows with targets and actuals. Each period has a start date, end date, target value, and actual value. The system automatically calculates achievement status: green for 85% or above, yellow for 60-84%, and red for below 60%. You can also add comments, dimensions, and supporting document links at the period level.

This structure gives you a complete picture of what you planned to achieve, what your starting point was, and how actual performance compares to targets over time.',
  'Activity Editor — Results',
  ARRAY['results', 'indicators', 'baselines', 'targets', 'periods', 'monitoring', 'evaluation'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What do the achievement status colors (green, yellow, red) mean on indicators?',
  'When you enter both a target value and an actual value for an indicator period, the system automatically calculates an achievement percentage and assigns a color-coded status.

Green means the indicator has achieved 85% or more of its target. This signals strong performance — the activity is on track or exceeding expectations for this measure.

Yellow means the achievement is between 60% and 84% of the target. This is a caution signal — progress is being made but there is a gap between what was planned and what has been delivered so far.

Red means the achievement is below 60% of the target. This flags a significant shortfall that likely needs attention, investigation, or corrective action.

How the percentage is calculated depends on whether the indicator is ascending or descending. For ascending indicators (where higher is better, like "number of schools built"), achievement is simply actual divided by target. For descending indicators (where lower is better, like "malaria incidence rate"), the calculation is inverted so that reducing the number toward the target registers as positive progress.

These status colors appear in the Results tab, on the activity overview, and in reports. They provide a quick visual summary of how the activity is performing against its objectives without needing to examine every number in detail.',
  'Activity Editor — Results',
  ARRAY['results', 'achievement', 'status-colors', 'targets', 'performance', 'green-yellow-red'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Locations
-- ============================================================================

(
  gen_random_uuid(),
  'What is the difference between Site Locations and Coverage Locations?',
  'The Locations tab supports two types of geographic targeting, each suited to different kinds of activities.

Site Locations are specific, pinpointed places where work is happening. They require a name and geographic coordinates (latitude and longitude), and they appear as markers on the map. You would use site locations for things like a school being built at a particular address, a health clinic at known GPS coordinates, or a training center in a specific town. Each site can include detailed address fields, a site type (project site, office, warehouse, health facility, school, community center, or other), and administrative unit classifications (state/region, township, district, village).

Coverage Locations describe broader geographic areas where the activity operates, without pinpointing exact coordinates. They require a name and a coverage scope (national, subnational, regional, or local), plus optional administrative unit descriptions. You would use coverage locations when an activity operates across an entire province, supports a national policy, or covers multiple districts without specific site addresses.

Many activities use both. A nationwide health program might have a Coverage Location of "National" to indicate its scope, while also listing specific Site Locations for the clinics and hospitals where services are actually delivered.

Separately, the Country/Region tab handles higher-level geographic targeting — which countries and regions the activity covers, with percentage allocations that must add up to 100%. This is about where funds are directed, while the Locations tab is about where work physically happens.',
  'Activity Editor — Locations',
  ARRAY['locations', 'site-locations', 'coverage-locations', 'coordinates', 'geographic', 'map'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — SDGs & Policy Markers
-- ============================================================================

(
  gen_random_uuid(),
  'How do I map my activity to Sustainable Development Goals, and what does alignment strength mean?',
  'The SDG Alignment tab lets you indicate which of the 17 Sustainable Development Goals your activity contributes to. You can select one or more goals, and for each goal you can optionally specify a more precise target (there are 169 targets across the 17 goals).

For each SDG mapping, you set an alignment strength. Primary means the SDG is a core focus of the activity — it is a main reason the activity exists. Secondary means the SDG is a significant part of the work but not the primary objective. Indirect means the activity contributes to the SDG as a side benefit rather than a deliberate focus.

You can also add an optional contribution percentage and notes explaining the rationale for the alignment. The notes field is particularly useful during reviews and audits, as it documents why you believe the activity supports that particular goal.

The SDG mappings feed into the Analytics dashboard, where you can see how your portfolio of activities aligns with each goal. This helps national planners and development partners understand whether their collective efforts are adequately addressing all 17 goals or whether certain goals are being underserved.',
  'Activity Editor — SDGs & Policy Markers',
  ARRAY['sdg', 'sustainable-development-goals', 'alignment', 'targets', 'primary', 'secondary'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How do Policy Markers work, and what do the significance levels (0, 1, 2) mean?',
  'Policy Markers are cross-cutting themes tracked according to the IATI standard. They help measure how much development activities address important global priorities like gender equality, climate change, and disability inclusion.

The standard IATI policy markers include Gender Equality, Aid to Environment, Participatory Development/Good Governance, Trade Development, Biodiversity, Climate Change Mitigation, Climate Change Adaptation, Desertification, Disaster Risk Reduction, Disability, Nutrition, and Reproductive, Maternal, Newborn, and Child Health (RMNCH).

For each marker, you assign a significance level. Level 0 means the activity does not target that theme at all — it is not relevant. Level 1 means it is a significant objective — the theme is an important part of the activity''s design, but it is not the main reason the activity exists. Level 2 means it is the principal objective — the activity was specifically designed to address this theme, and it would not have been undertaken without this motivation.

There is a special case for RMNCH, which uses a 0 to 4 scale instead: 0 is negligible or no funding, 1 is at least a quarter of funding, 2 is half the funding, 3 is most funding targeted, and 4 is an explicit primary objective.

Each marker also has an optional rationale field where you can explain why you assigned that significance level. Your organization may also have custom policy markers (created by administrators) that appear alongside the standard IATI ones. Changes to policy markers autosave like other fields in the editor.',
  'Activity Editor — SDGs & Policy Markers',
  ARRAY['policy-markers', 'significance', 'gender', 'climate', 'environment', 'iati-markers'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — IATI Sync
-- ============================================================================

(
  gen_random_uuid(),
  'How do I link my activity to the IATI Datastore and control which fields sync?',
  'The IATI Link tab lets you connect your AIMS activity to its published version on the IATI Datastore. This enables automatic synchronization so your local data stays aligned with what the development partner publishes internationally.

To set it up, go to the IATI Link tab and enter the activity''s IATI Identifier — this is the unique identifier used in the IATI registry, typically formatted like the publisher''s organization ID followed by the activity reference (for example, "XM-DAC-41114-PROJECT-00123"). Once entered, the system will search the Datastore and link to the matching record.

After linking, you can toggle auto-sync on or off. When enabled, a background job checks the Datastore periodically for updates. The key feature here is granular field control — you can choose exactly which fields are synchronized. The options include Title, Description, Status, Dates, Transactions, Budgets, Sectors, Organizations, Locations, Contacts, Documents, Countries, Planned Disbursements, and Policy Markers. You might choose to sync transactions and budgets automatically but manage the title and description locally, for example.

Fields that you do not enable for sync will never be overwritten by Datastore data, giving you full control. You can also use the Compare feature to see a side-by-side view of your local data versus the Datastore version, with differences highlighted. From there you can selectively import specific fields without enabling ongoing sync.

If you ever need an immediate update rather than waiting for the next scheduled run, use the "Sync Now" button to trigger a manual check.',
  'Activity Editor — IATI Sync',
  ARRAY['iati-link', 'iati-sync', 'auto-sync', 'field-control', 'datastore', 'iati-identifier'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'What do the sync status indicators (Live, Outdated, Not Synced) mean?',
  'After you link an activity to the IATI Datastore, you will see a sync status indicator on both the IATI Link tab and the Activities list page. These tell you how your local data compares to what is published internationally.

Live (shown in green) means your AIMS data matches the latest version on the IATI Datastore. The last sync check found no differences in any of the fields you have enabled for synchronization.

Outdated (shown in yellow) means the system has detected changes in the Datastore version that have not yet been applied to your local data. This could mean the development partner has updated their IATI publication since the last sync. If auto-sync is enabled, the next scheduled run will pull in the updates. If not, you can use the Compare feature to review the differences and decide which to import.

Not Synced (shown in gray) means either auto-sync is disabled for this activity, the activity has no IATI identifier linked, or the initial sync has not yet run.

On the Activities list, these status badges give you a portfolio-level view of data currency. If you see several activities showing Outdated, it may be worth triggering manual syncs or investigating why the automatic sync has not processed them yet — common reasons include the development partner having recently updated their IATI publication or the sync schedule not having run since the update.',
  'Activity Editor — IATI Sync',
  ARRAY['sync-status', 'live', 'outdated', 'not-synced', 'iati-indicators'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Documents
-- ============================================================================

(
  gen_random_uuid(),
  'How do I attach documents, and what are the IATI document categories?',
  'The Documents and Images tab lets you link documents to your activity using URLs. Rather than uploading files directly, you provide the web address where the document is hosted (it must be a valid HTTPS link). The system will automatically detect the file format from the URL and, if it is an image, display a thumbnail preview.

Each document link includes a title, an optional description, a document date, a language code, and most importantly an IATI document category. These categories follow the IATI standard and are split into two groups.

The "A" categories cover activity-level documents: Pre and Post Activity Documents, Objectives and Purpose of Activity, Intended Beneficiaries, Conditions, Budget, Summary Information, Annual Reports, Impact Appraisals, Memoranda of Understanding, Evaluations, and Results and Indicators.

The "B" categories cover organizational and financial documents: Budget documents, Audit reports, Country Strategy papers, Procurement policies, Institutional assessments, Annual activity reports, Country Audit reports, Exclusion policies, and various other administrative documents.

Choosing the right category matters because it helps other users find relevant documents quickly and ensures your IATI publication correctly classifies the supporting materials. For instance, an evaluation report should use category A10 (Evaluations), not A06 (Summary Information).

You can add multiple documents, reorder them by dragging, and search or filter the document list by category, language, or date range. Documents attached here also appear in the system-wide Library, making them discoverable outside the context of this specific activity.',
  'Activity Editor — Documents',
  ARRAY['documents', 'attachments', 'iati-categories', 'links', 'images', 'file-types'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Government Validation
-- ============================================================================

(
  gen_random_uuid(),
  'How does the government validation workflow work in the Activity Editor?',
  'The Government Inputs tab manages the formal process of government review and endorsement of activity data. This tab is only visible to users with the appropriate permissions (typically government partners and super users).

The workflow follows a structured path. First, a development partner enters and completes the activity data across all relevant tabs. When they are satisfied the data is accurate and ready for review, they set the submission status to "Submitted."

A government reviewer (Gov Partner Tier 1 or Super User) then reviews the activity. They can examine every tab and compare the data against their own records. Based on their review, they choose one of three outcomes: Validated (the data is confirmed as accurate), Rejected (the data has issues that need correction), or More Info Requested (additional details are needed before a decision can be made).

When validating, the reviewer sets an effective date (when the endorsement becomes active), records the validating authority (which government body or official is endorsing), and can add validation notes explaining any observations or caveats. They can also attach a supporting document — for instance, an official endorsement letter.

If the activity is rejected or more information is requested, the development partner sees the status change and the reviewer''s notes, then makes corrections and resubmits. This cycle continues until the activity is validated.

The validation status is tracked across the system — the Admin Panel has a Pending Validations queue, and the Analytics dashboard can report on how many activities have been government-endorsed.',
  'Activity Editor — Government Validation',
  ARRAY['government-validation', 'endorsement', 'submission-status', 'review', 'workflow', 'government-inputs'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Conditions & Humanitarian
-- ============================================================================

(
  gen_random_uuid(),
  'What are activity Conditions, and when should I use each condition type?',
  'The Conditions tab records any formal conditions attached to the activity — requirements that must be met for funding to continue or be released. These are common in development assistance, where donors may require specific commitments from recipient governments or implementing partners.

There are three condition types defined by the IATI standard.

Policy conditions require the recipient to implement specific policies. For example, a budget support grant might be conditional on the government passing a public financial management reform bill or establishing an anti-corruption commission. These are typically high-level, strategic requirements.

Performance conditions require the activity to achieve specific outputs or outcomes. For example, the next tranche of funding might be released only after a certain number of schools are built or a target vaccination rate is reached. These tie funding directly to measurable results.

Fiduciary conditions require specific financial management measures. For example, the recipient might need to establish a dedicated bank account, conduct independent audits, or follow specific procurement procedures. These protect the integrity of how funds are used.

For each condition, you enter the type, a narrative description (which supports multiple languages), and an "attached" flag that indicates whether the condition is formally attached to the activity agreement. Documenting conditions properly is important for transparency and for tracking whether they have been met over the life of the activity.',
  'Activity Editor — Conditions & Humanitarian',
  ARRAY['conditions', 'policy', 'performance', 'fiduciary', 'requirements', 'conditionality'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'How do I mark an activity as humanitarian and add humanitarian scope codes?',
  'The Humanitarian tab handles two related things: flagging the activity as humanitarian, and adding structured humanitarian scope classifications.

The humanitarian flag is a simple toggle at the top of the tab. Switching it on marks the entire activity as humanitarian assistance (as opposed to long-term development). This flag affects how the activity appears in the Analytics dashboard — the Humanitarian tab in Analytics tracks the share and trends of humanitarian versus development aid, and it relies on this flag to make the distinction.

Humanitarian scope codes provide more detailed classification. Each scope entry has a type (Emergency or Appeal), a vocabulary (GLIDE for global emergency identifiers, HRP for Humanitarian Response Plans, Country Emergency for nationally declared emergencies, or a custom vocabulary), and a code that identifies the specific emergency or appeal.

For example, if your activity responds to a specific cyclone, you would add a scope entry with type "Emergency," vocabulary "GLIDE," and the GLIDE number for that event. If it falls under a Humanitarian Response Plan, you would use type "Appeal" with the HRP vocabulary and the relevant plan code.

The Country Emergency vocabulary connects to the emergencies database managed by administrators in the Admin Panel. When you select this vocabulary, the system presents a list of officially declared national emergencies with their date ranges, making it easy to link your activity to the right event.

You can add multiple humanitarian scope entries — for instance, an activity might respond to both a specific emergency and fall under an HRP appeal.',
  'Activity Editor — Conditions & Humanitarian',
  ARRAY['humanitarian', 'humanitarian-scope', 'emergency', 'glide', 'hrp', 'appeal'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Budgets & Planning
-- ============================================================================

(
  gen_random_uuid(),
  'How do I enter budgets and what is the difference between Original, Revised, and Indicative budget types?',
  'The Budgets tab lets you record the financial envelope for your activity, broken down by time period. Each budget entry has a type, a start date, an end date, a value, and a currency.

There are three budget types to choose from, and understanding the distinction helps keep your financial data accurate over time.

An Original budget is the first approved budget for a given period. When an activity is initially approved with a budget of $2 million for the fiscal year, that goes in as the Original budget. This represents the baseline plan.

A Revised budget is an updated version of the budget after the original has been modified. If midway through the year the budget is increased to $2.5 million or reduced to $1.8 million, you would add a Revised budget for the same period with the new amount. The original entry stays in the system for historical reference — you do not overwrite it.

An Indicative budget is a forward-looking estimate that has not been formally approved. If you know a project is expected to continue for several more years but the budgets have not been officially signed off, you would record those future years as Indicative. This helps with planning and forecasting even when final numbers are not yet available.

Budget values are automatically converted to USD using the same historical exchange rate mechanism as transactions. You can view yearly totals and a summary chart on the Budgets page. Each budget entry autosaves as you complete it.',
  'Activity Editor — Budgets & Planning',
  ARRAY['budgets', 'original', 'revised', 'indicative', 'budget-types', 'financial-planning'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Related Activities & Contacts
-- ============================================================================

(
  gen_random_uuid(),
  'How do I link related activities and what do the relationship types mean?',
  'The Linked Activities tab lets you connect your activity to other activities in the system, creating a web of relationships that helps users understand the broader project landscape.

There are five relationship types. Parent means the linked activity is a higher-level program or project that your activity falls under. Child means the linked activity is a sub-component or sub-project of yours. Sibling means both activities sit at the same level under a common parent. Co-funded means both activities share funding from the same source or contribute to the same objective through parallel funding. Third-party means an external activity managed by another organization is somehow related to yours.

You can link to activities that exist within AIMS by searching the internal database, or you can reference external activities by entering their IATI identifier. For external links, the system will check whether that IATI identifier has since been imported into the database and offer to convert it to an internal link if so.

The tab displays relationships in both a sortable table and an interactive network graph built with D3.js. The network graph is particularly useful for visualizing complex program hierarchies — you can see at a glance how a large program breaks down into sub-projects and how activities relate to each other.

Relationships are directional — if you add Activity B as a child of Activity A, the system records that Activity A is the parent of Activity B. Both sides of the relationship are visible when viewing either activity.',
  'Activity Editor — Related Activities',
  ARRAY['related-activities', 'linked-activities', 'parent', 'child', 'sibling', 'network-graph'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- CATEGORY: Activity Editor — Publishing & Status
-- ============================================================================

(
  gen_random_uuid(),
  'What is the difference between Activity Status and Submission Status?',
  'These two status fields serve different purposes and it is important not to confuse them.

Activity Status describes where the activity is in its real-world lifecycle. It uses the IATI standard codes: Pipeline/Identification (under consideration, not yet started), Implementation (actively underway), Finalisation (mostly complete but not formally closed), Closed (officially finished), Cancelled (will not proceed), and Suspended (temporarily paused). This reflects what is actually happening with the project on the ground.

Submission Status describes where the activity record is in the AIMS data management workflow. It tracks the internal review and validation process: Draft (the activity is being prepared and is not yet ready for review), Submitted (the data has been sent for government review), Validated (the government has endorsed the data as accurate), Rejected (the government has found issues that need correction), and Published (the data is publicly visible).

An activity can be in Implementation (active on the ground) but still in Draft submission status (the data entry is not complete yet). Or it could be Closed (finished in reality) but only just Submitted (the final data is being reviewed by the government for the first time).

When preparing an activity for government validation, make sure both statuses are appropriate. The Activity Status should accurately reflect the real-world situation, while the Submission Status tracks your progress through the internal data review pipeline.',
  'Activity Editor — Publishing & Status',
  ARRAY['activity-status', 'submission-status', 'publication', 'draft', 'validated', 'workflow'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
);
