-- ============================================================================
-- AIMS Pooled Funds FAQ Seed Data
-- 2 FAQs covering Multi-Donor Trust Fund reporting workflows
-- ============================================================================

INSERT INTO faq (id, question, answer, category, tags, status, view_count, is_pinned, created_at, updated_at)
VALUES

-- ============================================================================
-- FAQ 1: Donor contributing to a trust fund
-- ============================================================================

(
  gen_random_uuid(),
  'How do I report a contribution to a Multi-Donor Trust Fund?',
  'This guide walks through reporting a financial contribution to a pooled trust fund — for example, Australia contributing to a World Bank-managed trust fund.

Before you start
Make sure the trust fund activity already exists in AIMS and has been marked as a "Pooled Fund" (you''ll see a Pooled Fund badge on its activity card). If it hasn''t been created yet, ask the fund manager or a system administrator to set it up first.

Step 1: Open the trust fund activity
Find the trust fund in the Activities list and click into it.

Step 2: Go to the Finances tab
In the activity editor, click on the "Funding & Delivery" group, then select the "Finances" tab.

Step 3: Add a new transaction
Click the "+ Add Transaction" button.

Step 4: Fill in the transaction details
Set the Transaction Type based on where things stand:
  - "Incoming Funds" if money has already been transferred to the fund.
  - "Incoming Commitment" if it has been formally agreed but not yet transferred.
  - "Incoming Pledge" if it has been announced but not formally committed.

Then fill in:
  - Date: The date the contribution was made, agreed, or pledged.
  - Amount: The contribution amount (e.g. 10,000,000).
  - Currency: The currency of the contribution (e.g. AUD). The system will automatically convert to USD.
  - Provider Organisation: This should auto-fill with your organisation (the donor). If it doesn''t, select your organisation manually.
  - Receiver Organisation: This should auto-fill with the fund manager (e.g. World Bank). If it doesn''t, select the fund manager manually.

Step 5: Save
Click Save. Your contribution will now appear in the fund''s Contributions tab.

What you''ll see afterwards
Go to the fund''s "Contributions" tab (visible because this is a Pooled Fund). You''ll see a breakdown of all donors with columns for Pledged, Committed, and Received amounts. There''s also a chart view showing contributions by donor or by year.

Tips
- Use "Incoming Pledge" for early-stage announcements that are not yet binding.
- Use "Incoming Commitment" for formally agreed amounts where a transfer is expected.
- Use "Incoming Funds" once money has actually been transferred.
- You can record all three for the same contribution as it progresses — the fund overview will show each stage separately so the fund manager can see the full pipeline.',
  'Pooled Funds',
  ARRAY['pooled funds', 'trust fund', 'contributions', 'transactions', 'donor reporting', 'MDTF'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
),

-- ============================================================================
-- FAQ 2: Fund manager receiving and disbursing
-- ============================================================================

(
  gen_random_uuid(),
  'How does a fund manager receive contributions and report disbursements to sub-activities?',
  'This guide walks through how a fund manager (e.g. the World Bank) manages a multi-donor trust fund in AIMS — receiving donor contributions and recording how money flows to child projects.


PART A: SETTING UP THE TRUST FUND

Step 1: Create or open the trust fund activity
Create a new activity for the trust fund, or open an existing one.

Step 2: Mark it as a Pooled Fund
In the activity editor, look for the activity type toggle near the top of the page. Click "Pooled Fund" instead of "Standard Activity." This unlocks the fund management tabs: Fund Overview, Contributions, Disbursements, and Reconciliation.

Step 3: Link your child activities
Go to the "Linked Activities" tab. Search for each project that the fund will disburse to and add it with the relationship type "Parent" (meaning this fund is the parent of that project). Repeat for every sub-activity or project under the fund.


PART B: RECEIVING DONOR CONTRIBUTIONS

Donors will normally record their own contributions directly on the trust fund activity. Once they do, their contributions automatically appear in your fund''s Contributions tab — you don''t need to enter them again.

You can review all contributions by going to the Finances tab and clicking "Contributions." You''ll see each donor listed with their pledged, committed, and received amounts.

If a donor has not yet recorded their contribution in the system, you can add it yourself:
  1. Open the trust fund activity and go to Finances.
  2. Click "+ Add Transaction."
  3. Set the transaction type to "Incoming Funds."
  4. Enter the amount, currency, and date.
  5. Set the Provider Organisation to the donor (e.g. DFAT / Australia).
  6. The Receiver Organisation should auto-fill with your organisation.
  7. Save.


PART C: RECORDING DISBURSEMENTS TO CHILD ACTIVITIES

When the fund allocates money to a child project, record it as a disbursement on the trust fund activity.

  1. Open the trust fund activity and go to Finances.
  2. Click "+ Add Transaction."
  3. Fill in the details:
     - Transaction Type: Select "Disbursement" for actual transfers, or "Outgoing Commitment" for approved allocations not yet transferred.
     - Date: The date of the transfer or allocation.
     - Amount: The amount being sent to the child project.
     - Currency: The currency of the transfer.
     - Provider Organisation: Should auto-fill with your organisation (the fund manager).
     - Receiver Organisation: Select the organisation implementing the child project.
  4. Link to the child activity: In the "Activity Links" section of the form, search for and select the child activity in the "Receiver Activity" field. This is important — it connects the disbursement to the specific project so the fund''s tracking tabs can follow the money.
  5. Save.

Repeat for each disbursement to each child project.


WHAT YOU''LL SEE AFTERWARDS

Fund Overview tab:
Shows total contributions received, total disbursed, and the remaining balance. Also shows your top donors, top sectors (drawn from child activities), and a quarterly disbursement trend chart.

Contributions tab:
A table of all donors and their contribution amounts, with a chart view option.

Disbursements tab:
Shows how much has gone to each child activity. You can switch between views: by Activity, by Sector, or by Region.

Reconciliation tab:
Compares what the fund recorded as disbursements with what the child activities recorded as receipts. This flags any mismatches — for example, if you recorded a $2M disbursement to a project but the project only shows $1.8M received. Use this to catch data entry discrepancies.


TIPS

- Always link disbursements to child activities using the "Receiver Activity" field. Without this link, the Disbursements and Reconciliation tabs won''t be able to track where money went.
- The fund balance is calculated as Total Contributions minus Total Disbursements. If the balance looks wrong, check whether all contributions have been recorded and whether disbursement amounts match.
- If a child activity hasn''t been created in the system yet, create it first as a standard activity, then come back to the trust fund and link it as a child.',
  'Pooled Funds',
  ARRAY['pooled funds', 'trust fund', 'fund manager', 'disbursements', 'sub-activities', 'reconciliation', 'MDTF'],
  'published',
  0,
  FALSE,
  NOW(),
  NOW()
);
