-- =============================================================================
-- Seed data for Kachin State (MMR001) Location Profile
-- Populates: organizations, transactions, activity_participating_organizations
-- to bring Funding Trends, Transaction Types, Top Donors, and financial
-- summary cards to life.
-- =============================================================================

-- ─── Step 1: Create donor & implementing organizations ──────────────────────
-- (Use ON CONFLICT or check to avoid duplicates if re-run)

INSERT INTO organizations (id, name, acronym, type, "Organisation_Type_Code", country, created_at, updated_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Japan International Cooperation Agency', 'JICA', '10', '10', 'JP', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000002', 'World Bank Group', 'WB', '40', '40', 'US', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000003', 'European Union', 'EU', '15', '15', 'BE', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000004', 'United Nations Development Programme', 'UNDP', '40', '40', 'US', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000005', 'Department for International Development', 'DFID', '10', '10', 'GB', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000006', 'Danish International Development Agency', 'DANIDA', '10', '10', 'DK', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000007', 'Myanmar Red Cross Society', 'MRCS', '22', '22', 'MM', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ─── Step 2: Gather Kachin activity IDs into a temp table ───────────────────
-- We pull the existing activities that are linked to Kachin State (MMR001)

CREATE TEMP TABLE kachin_activities AS
SELECT DISTINCT a.id, a.activity_status
FROM activities a
JOIN activity_locations al ON al.activity_id = a.id
WHERE al.state_region_code = 'MMR001';


-- ─── Step 3: Assign donors to activities via activity_participating_organizations ─
-- role_type: 'extending' = Funding/Donor, 'implementing' = Implementer, 'government' = Govt partner
-- We spread the 7 orgs across the 9 activities for realistic coverage

-- Assign funding orgs (role_type = 'extending') - each donor funds 2-4 activities
INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, narrative)
SELECT ka.id, org.id, 'extending', org.name
FROM (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities
) ka
CROSS JOIN LATERAL (
  SELECT id, name FROM organizations
  WHERE id IN (
    'd0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000002',
    'd0000001-0000-0000-0000-000000000003',
    'd0000001-0000-0000-0000-000000000004',
    'd0000001-0000-0000-0000-000000000005',
    'd0000001-0000-0000-0000-000000000006'
  )
) org
WHERE
  (org.id = 'd0000001-0000-0000-0000-000000000001' AND ka.rn <= 4)
  OR (org.id = 'd0000001-0000-0000-0000-000000000002' AND ka.rn BETWEEN 2 AND 5)
  OR (org.id = 'd0000001-0000-0000-0000-000000000003' AND ka.rn BETWEEN 3 AND 7)
  OR (org.id = 'd0000001-0000-0000-0000-000000000004' AND ka.rn BETWEEN 5 AND 8)
  OR (org.id = 'd0000001-0000-0000-0000-000000000005' AND ka.rn BETWEEN 6 AND 9)
  OR (org.id = 'd0000001-0000-0000-0000-000000000006' AND ka.rn IN (1, 8, 9))
ON CONFLICT (activity_id, organization_id, role_type) DO NOTHING;

-- Assign implementing orgs (role_type = 'implementing')
INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, narrative)
SELECT ka.id, 'd0000001-0000-0000-0000-000000000007', 'implementing', 'Myanmar Red Cross Society'
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
WHERE ka.rn IN (1, 3, 5, 7, 9)
ON CONFLICT (activity_id, organization_id, role_type) DO NOTHING;

INSERT INTO activity_participating_organizations (activity_id, organization_id, role_type, narrative)
SELECT ka.id, 'd0000001-0000-0000-0000-000000000004', 'implementing', 'United Nations Development Programme'
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
WHERE ka.rn IN (2, 4, 6, 8)
ON CONFLICT (activity_id, organization_id, role_type) DO NOTHING;


-- ─── Step 4: Insert transactions ────────────────────────────────────────────
-- transaction_type is TEXT: '2'=Commitment, '3'=Disbursement, '4'=Expenditure, '1'=Incoming Funds
-- Columns: value (amount), currency, value_usd, transaction_date, value_date, description

-- COMMITMENTS (type '2')
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, value_usd, description)
SELECT
  ka.id,
  '2',
  t.tx_date,
  t.amount,
  'USD',
  t.tx_date,
  t.amount,
  'Annual commitment - Kachin State program'
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
CROSS JOIN LATERAL (
  VALUES
    (CASE WHEN ka.rn <= 5 THEN (ka.rn * 150000 + 200000)::numeric ELSE NULL END, DATE '2022-03-15'),
    (CASE WHEN ka.rn <= 7 THEN (ka.rn * 120000 + 250000)::numeric ELSE NULL END, DATE '2023-04-01'),
    ((ka.rn * 180000 + 300000)::numeric, DATE '2024-01-20'),
    ((ka.rn * 200000 + 350000)::numeric, DATE '2025-02-10'),
    (CASE WHEN ka.rn <= 7 THEN (ka.rn * 160000 + 400000)::numeric ELSE NULL END, DATE '2026-01-15')
) AS t(amount, tx_date)
WHERE t.amount IS NOT NULL;


-- DISBURSEMENTS (type '3')
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, value_usd, description)
SELECT
  ka.id,
  '3',
  t.tx_date,
  t.amount,
  'USD',
  t.tx_date,
  t.amount,
  'Quarterly disbursement - Kachin State program'
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
CROSS JOIN LATERAL (
  VALUES
    (CASE WHEN ka.rn <= 4 THEN (ka.rn * 60000 + 80000)::numeric ELSE NULL END, DATE '2022-06-30'),
    (CASE WHEN ka.rn <= 4 THEN (ka.rn * 55000 + 70000)::numeric ELSE NULL END, DATE '2022-12-15'),
    (CASE WHEN ka.rn <= 6 THEN (ka.rn * 65000 + 90000)::numeric ELSE NULL END, DATE '2023-07-15'),
    (CASE WHEN ka.rn <= 6 THEN (ka.rn * 50000 + 85000)::numeric ELSE NULL END, DATE '2023-11-30'),
    ((ka.rn * 70000 + 100000)::numeric, DATE '2024-03-31'),
    ((ka.rn * 65000 + 95000)::numeric,  DATE '2024-06-30'),
    ((ka.rn * 60000 + 90000)::numeric,  DATE '2024-09-30'),
    ((ka.rn * 55000 + 85000)::numeric,  DATE '2024-12-31'),
    ((ka.rn * 75000 + 110000)::numeric, DATE '2025-03-15'),
    ((ka.rn * 70000 + 105000)::numeric, DATE '2025-06-30'),
    ((ka.rn * 68000 + 100000)::numeric, DATE '2025-09-30'),
    ((ka.rn * 65000 + 95000)::numeric,  DATE '2025-12-31'),
    (CASE WHEN ka.rn <= 7 THEN (ka.rn * 80000 + 120000)::numeric ELSE NULL END, DATE '2026-03-15')
) AS t(amount, tx_date)
WHERE t.amount IS NOT NULL;


-- EXPENDITURES (type '4')
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, value_usd, description)
SELECT
  ka.id,
  '4',
  t.tx_date,
  t.amount,
  'USD',
  t.tx_date,
  t.amount,
  'Program expenditure - Kachin State'
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
CROSS JOIN LATERAL (
  VALUES
    (CASE WHEN ka.rn <= 5 THEN (ka.rn * 45000 + 60000)::numeric ELSE NULL END, DATE '2023-09-30'),
    ((ka.rn * 50000 + 70000)::numeric, DATE '2024-06-30'),
    ((ka.rn * 48000 + 65000)::numeric, DATE '2024-12-31'),
    ((ka.rn * 55000 + 75000)::numeric, DATE '2025-06-30'),
    ((ka.rn * 52000 + 72000)::numeric, DATE '2025-12-31'),
    (CASE WHEN ka.rn <= 6 THEN (ka.rn * 40000 + 55000)::numeric ELSE NULL END, DATE '2026-02-28')
) AS t(amount, tx_date)
WHERE t.amount IS NOT NULL;


-- INCOMING FUNDS (type '1')
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, value_usd, description,
                          provider_org_id, provider_org_name)
SELECT
  ka.id,
  '1',
  t.tx_date,
  t.amount,
  'USD',
  t.tx_date,
  t.amount,
  'Donor fund transfer received',
  t.donor_id,
  t.donor_name
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM kachin_activities) ka
CROSS JOIN LATERAL (
  VALUES
    (CASE WHEN ka.rn <= 4 THEN (ka.rn * 100000 + 200000)::numeric ELSE NULL END,
     DATE '2023-02-15', 'd0000001-0000-0000-0000-000000000001'::uuid, 'JICA'),
    (CASE WHEN ka.rn BETWEEN 2 AND 5 THEN (ka.rn * 130000 + 250000)::numeric ELSE NULL END,
     DATE '2024-03-01', 'd0000001-0000-0000-0000-000000000002'::uuid, 'World Bank Group'),
    (CASE WHEN ka.rn BETWEEN 3 AND 7 THEN (ka.rn * 110000 + 180000)::numeric ELSE NULL END,
     DATE '2024-08-15', 'd0000001-0000-0000-0000-000000000003'::uuid, 'European Union'),
    (CASE WHEN ka.rn BETWEEN 5 AND 8 THEN (ka.rn * 140000 + 220000)::numeric ELSE NULL END,
     DATE '2025-01-20', 'd0000001-0000-0000-0000-000000000004'::uuid, 'UNDP'),
    (CASE WHEN ka.rn BETWEEN 6 AND 9 THEN (ka.rn * 120000 + 200000)::numeric ELSE NULL END,
     DATE '2025-07-01', 'd0000001-0000-0000-0000-000000000005'::uuid, 'DFID'),
    (CASE WHEN ka.rn IN (1, 8, 9) THEN (ka.rn * 90000 + 150000)::numeric ELSE NULL END,
     DATE '2026-02-01', 'd0000001-0000-0000-0000-000000000006'::uuid, 'DANIDA')
) AS t(amount, tx_date, donor_id, donor_name)
WHERE t.amount IS NOT NULL;


-- ─── Step 5: Clean up temp table ────────────────────────────────────────────
DROP TABLE IF EXISTS kachin_activities;
