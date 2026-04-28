-- Populate the contextual help bubble on the Activities list (/activities)
-- and the Activity Editor (/activities/new) with published Q&A that guides
-- users through navigation, saving, required fields, finances, and publishing.

-- Clean slate for these slugs so this migration is idempotent.
DELETE FROM public.page_help_content WHERE page_slug IN ('activities', 'activities/new');

INSERT INTO public.page_help_content (page_slug, question, answer, display_order, published) VALUES
  (
    'activities',
    'What is the Activity List?',
    'The Activity List is the central register of every aid activity tracked in the system. Each row represents one project, programme, or intervention. Click any row to open the Activity Editor and view or change its details.',
    1,
    true
  ),
  (
    'activities',
    'How do I find a specific activity?',
    'Use the search box for free-text matching on title or IATI identifier. Open the filter panel to narrow by Status, Validation, Reporting Organisation, or Sector — filters combine with AND logic. Columns can be sorted by clicking the header.',
    2,
    true
  ),
  (
    'activities',
    'How do I create a new activity?',
    'Click **+ Add New Activity** in the left sidebar. You''ll be taken to the Activity Editor where you can enter the title, dates, reporting organisation, and other IATI-required fields. Autosave runs as you go.',
    3,
    true
  ),
  (
    'activities',
    'What do the status values mean?',
    'Status follows the IATI activity-status codelist: **Pipeline** (identified but not started), **Implementation** (currently running), **Finalisation** (wrapping up), **Closed** (complete), **Cancelled**, and **Suspended**. Separate from that, **Publication Status** shows whether the record is a private draft or public.',
    4,
    true
  ),
  (
    'activities',
    'How do I customise the columns?',
    'Click the **Columns** button in the filter bar. Toggle columns on/off and drag to reorder. Your selection is saved to your browser. Optional columns include IATI ID, Capital Spend, Duration, Created By, and many transaction-type totals.',
    5,
    true
  ),
  (
    'activities',
    'How do I copy an Activity ID or IATI ID?',
    'Click the small pill badge next to the activity title (Activity ID) or enable the IATI ID column. A check mark confirms the copy. You can also export the filtered list to CSV or IATI XML via the export menu at the top right.',
    6,
    true
  ),
  (
    'activities',
    'What happens when I delete an activity?',
    'Deletes are soft — you have a short window to undo from the toast, and a super-user can restore the record from the admin tools. Published activities should be unpublished first if you want to hide them from the public register without losing the data.',
    7,
    true
  );

INSERT INTO public.page_help_content (page_slug, question, answer, display_order, published) VALUES
  (
    'activities/new',
    'What is the Activity Editor?',
    'The Activity Editor is where every piece of information about a single activity lives: identifiers, dates, participating organisations, finances, sectors, locations, results, and more. Use the left-hand navigation to move between tabs — each tab saves independently, so you can fill the record out in any order.',
    1,
    true
  ),
  (
    'activities/new',
    'How do I save my work?',
    'Most fields autosave as you type or change selection — look for the "Saved" timestamp near the top of each tab. If a save fails you''ll see a red warning with a retry button. You can safely navigate away once the indicator shows Saved.',
    2,
    true
  ),
  (
    'activities/new',
    'Which fields are required?',
    'Required IATI fields are marked with a small red asterisk. At a minimum you need: Activity Title, Activity Status, Reporting Organisation, Activity Dates (planned start/end), and at least one Sector allocation totalling 100%. The Overview tab shows a completeness indicator so you can track what''s still missing.',
    3,
    true
  ),
  (
    'activities/new',
    'How do I navigate between tabs?',
    'Use the left-hand navigation bar. Tabs are grouped by theme — **Overview**, **Sectors**, **Geography** (Countries & Regions, Activity Sites, Sub-national Allocation), **Stakeholders** (Participating Organisations, Contacts, Focal Points), **Finances** (Financial Information, Planned Disbursements, Budgets), **Alignment** (Plan Alignment, SDG Alignment, Policy Markers), and **Results & Extras** (Results, Documents, Conditions, etc.). You can jump straight to any tab without losing progress on others.',
    4,
    true
  ),
  (
    'activities/new',
    'How do I enter financial data?',
    'There are three financial tabs: **Budgets** (forward-looking, period-based budget lines per IATI), **Planned Disbursements** (expected cashflow to implementing partners), and **Financial Information** (actual transactions: commitments, disbursements, expenditures). Each transaction must have a type, date, value, and currency — USD equivalents are calculated automatically using the date''s FX rate.',
    5,
    true
  ),
  (
    'activities/new',
    'How do I add participating organisations?',
    'Open the **Participating Organisations** tab and click Add. Pick the organisation from the dropdown (start typing its name or acronym — don''t create a duplicate). Then set the role: **Funding**, **Accountable**, **Extending**, or **Implementing**. You can assign the same organisation multiple roles if relevant.',
    6,
    true
  ),
  (
    'activities/new',
    'How do I link sectors correctly?',
    'On the **Sectors** tab, add one or more DAC 5-digit purpose codes and assign each a percentage. The percentages must total 100% across the primary vocabulary. Use the search box to find sectors by code or name. Sub-categories and high-level groupings are derived automatically.',
    7,
    true
  ),
  (
    'activities/new',
    'Can I import an IATI XML file?',
    'Yes — use the **IATI Link** or **Import Single Activity** options in the left nav. Paste an IATI activity URL, an IATI identifier, or upload an XML file. Fields are pre-filled where the import maps cleanly; review each tab before saving to catch anything that needs manual attention.',
    8,
    true
  ),
  (
    'activities/new',
    'What does "Publish" do?',
    'Publishing flips the activity from a private draft to a publicly-visible record. It becomes available in the public activity list, exports, and IATI XML feeds. You can unpublish at any time. Validation runs before publish — if required fields are missing, you''ll see a checklist of what to fix first.',
    9,
    true
  ),
  (
    'activities/new',
    'How do I delete an activity?',
    'Open the ••• menu at the top-right of the editor and choose Delete. Activities are soft-deleted — you have a short window to undo from the toast, or a super-user can restore it from the admin tools. Published activities should be unpublished first if you want to hide them from the public register without losing the record.',
    10,
    true
  );
