-- ============================================================
-- Pooled Fund Test Data
-- ============================================================
-- This script turns an existing activity into a pooled fund and
-- creates three child activities with realistic financial flows.
--
-- FUND:   "Rural Roads Connectivity and Market Access Project"  (a1000001-0001-4000-8000-000000000005)
-- CHILD1: "Solar Microgrid Deployment – Northern Region"
-- CHILD2: "Wind Energy Pilot – Coastal Communities"
-- CHILD3: "Solar Home Systems – Rural Households"
--
-- Run against your Supabase database with the service-role key.
-- ============================================================

-- -------------------------------------------------------
-- 0. Mark the existing activity as a pooled fund
-- -------------------------------------------------------
UPDATE activities
SET is_pooled_fund = TRUE
WHERE id = 'a1000001-0001-4000-8000-000000000005';

-- -------------------------------------------------------
-- 1. Create three child activities
-- -------------------------------------------------------
INSERT INTO activities (
  id, title_narrative, description_narrative, iati_identifier,
  activity_status, planned_start_date, planned_end_date,
  actual_start_date, default_currency, hierarchy,
  reporting_org_id, submission_status, publication_status
)
SELECT
  '00000001-aaaa-bbbb-cccc-000000000001',
  'Solar Microgrid Deployment – Northern Region',
  '<p>Deployment of 150 solar microgrids across the Northern Region, serving 75,000 households with reliable, clean electricity.</p>',
  'XI-IATI-DEMO-10001-CHILD-01',
  '2', '2024-06-01', '2026-12-31', '2024-07-15', 'USD', 2,
  a.reporting_org_id, 'validated', 'published'
FROM activities a WHERE a.id = 'a1000001-0001-4000-8000-000000000005'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activities (
  id, title_narrative, description_narrative, iati_identifier,
  activity_status, planned_start_date, planned_end_date,
  actual_start_date, default_currency, hierarchy,
  reporting_org_id, submission_status, publication_status
)
SELECT
  '00000002-aaaa-bbbb-cccc-000000000002',
  'Wind Energy Pilot – Coastal Communities',
  '<p>Pilot installation of community wind turbines in five coastal towns, targeting 20,000 households and local fish-processing cooperatives.</p>',
  'XI-IATI-DEMO-10001-CHILD-02',
  '2', '2024-09-01', '2027-06-30', '2024-10-01', 'USD', 2,
  a.reporting_org_id, 'validated', 'published'
FROM activities a WHERE a.id = 'a1000001-0001-4000-8000-000000000005'
ON CONFLICT (id) DO NOTHING;

INSERT INTO activities (
  id, title_narrative, description_narrative, iati_identifier,
  activity_status, planned_start_date, planned_end_date,
  default_currency, hierarchy,
  reporting_org_id, submission_status, publication_status
)
SELECT
  '00000003-aaaa-bbbb-cccc-000000000003',
  'Solar Home Systems – Rural Households',
  '<p>Distribution and installation of 100,000 solar home systems to off-grid rural households, including training for local maintenance technicians.</p>',
  'XI-IATI-DEMO-10001-CHILD-03',
  '2', '2025-01-01', '2027-12-31', 'USD', 2,
  a.reporting_org_id, 'validated', 'published'
FROM activities a WHERE a.id = 'a1000001-0001-4000-8000-000000000005'
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 2. Link children to the fund (parent→child, type '1')
-- -------------------------------------------------------
INSERT INTO activity_relationships (activity_id, related_activity_id, relationship_type, narrative)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '00000001-aaaa-bbbb-cccc-000000000001', '1', 'Parent fund → Solar Microgrid child'),
  ('a1000001-0001-4000-8000-000000000005', '00000002-aaaa-bbbb-cccc-000000000002', '1', 'Parent fund → Wind Energy child'),
  ('a1000001-0001-4000-8000-000000000005', '00000003-aaaa-bbbb-cccc-000000000003', '1', 'Parent fund → Solar Home Systems child')
ON CONFLICT (activity_id, related_activity_id) DO NOTHING;

-- Reverse links (child→parent, type '2')
INSERT INTO activity_relationships (activity_id, related_activity_id, relationship_type, narrative)
VALUES
  ('00000001-aaaa-bbbb-cccc-000000000001', 'a1000001-0001-4000-8000-000000000005', '2', 'Solar Microgrid child → Parent fund'),
  ('00000002-aaaa-bbbb-cccc-000000000002', 'a1000001-0001-4000-8000-000000000005', '2', 'Wind Energy child → Parent fund'),
  ('00000003-aaaa-bbbb-cccc-000000000003', 'a1000001-0001-4000-8000-000000000005', '2', 'Solar Home Systems child → Parent fund')
ON CONFLICT (activity_id, related_activity_id) DO NOTHING;

-- -------------------------------------------------------
-- 3. Sectors for child activities
-- -------------------------------------------------------
INSERT INTO activity_sectors (activity_id, sector_code, sector_name, percentage)
VALUES
  ('00000001-aaaa-bbbb-cccc-000000000001', '23110', 'Energy generation, renewable sources', 100),
  ('00000002-aaaa-bbbb-cccc-000000000002', '23110', 'Energy generation, renewable sources', 70),
  ('00000002-aaaa-bbbb-cccc-000000000002', '23181', 'Energy education/training', 30),
  ('00000003-aaaa-bbbb-cccc-000000000003', '23110', 'Energy generation, renewable sources', 60),
  ('00000003-aaaa-bbbb-cccc-000000000003', '23182', 'Energy research', 40)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 4. Incoming transactions on the FUND (contributions)
--    Types: 1 = Incoming Funds, 11 = Incoming Commitment, 13 = Incoming Pledge
-- -------------------------------------------------------

-- Donor 1: World Bank – pledge, commitment, then funds received
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_org_ref, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '13', '2023-11-15', 25000000, 'USD', '2023-11-15',
   'World Bank pledge to Rural Roads Pooled Fund', 'World Bank', 'XM-DAC-903', 25000000),
  ('a1000001-0001-4000-8000-000000000005', '11', '2024-01-10', 25000000, 'USD', '2024-01-10',
   'World Bank commitment confirmed', 'World Bank', 'XM-DAC-903', 25000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2024-03-01', 10000000, 'USD', '2024-03-01',
   'World Bank first tranche received', 'World Bank', 'XM-DAC-903', 10000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2024-09-15', 8000000, 'USD', '2024-09-15',
   'World Bank second tranche received', 'World Bank', 'XM-DAC-903', 8000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2025-03-01', 7000000, 'USD', '2025-03-01',
   'World Bank third tranche received', 'World Bank', 'XM-DAC-903', 7000000);

-- Donor 2: DFID/FCDO
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_org_ref, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '11', '2024-02-01', 15000000, 'USD', '2024-02-01',
   'FCDO commitment to Rural Roads Pooled Fund', 'FCDO', 'GB-GOV-1', 15000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2024-04-15', 7500000, 'USD', '2024-04-15',
   'FCDO first tranche received', 'FCDO', 'GB-GOV-1', 7500000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2024-10-01', 7500000, 'USD', '2024-10-01',
   'FCDO second tranche received', 'FCDO', 'GB-GOV-1', 7500000);

-- Donor 3: EU
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_org_ref, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '13', '2024-01-20', 10000000, 'USD', '2024-01-20',
   'EU pledge to Rural Roads Pooled Fund', 'European Union', 'XI-IATI-EC', 10000000),
  ('a1000001-0001-4000-8000-000000000005', '11', '2024-06-01', 10000000, 'USD', '2024-06-01',
   'EU commitment confirmed', 'European Union', 'XI-IATI-EC', 10000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2024-08-01', 5000000, 'USD', '2024-08-01',
   'EU first tranche received', 'European Union', 'XI-IATI-EC', 5000000),
  ('a1000001-0001-4000-8000-000000000005', '1', '2025-02-01', 5000000, 'USD', '2025-02-01',
   'EU second tranche received', 'European Union', 'XI-IATI-EC', 5000000);

-- -------------------------------------------------------
-- 5. Outgoing transactions from the FUND (disbursements to children)
--    Types: 2 = Outgoing Commitment, 3 = Disbursement
-- -------------------------------------------------------

-- Fund → Child 1 (Solar Microgrid)
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, receiver_org_name, receiver_activity_uuid, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '2', '2024-06-01', 18000000, 'USD', '2024-06-01',
   'Commitment to Solar Microgrid Deployment', 'Solar Microgrid PMU', '00000001-aaaa-bbbb-cccc-000000000001', 18000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2024-07-15', 6000000, 'USD', '2024-07-15',
   'Q3 2024 disbursement – Solar Microgrid', 'Solar Microgrid PMU', '00000001-aaaa-bbbb-cccc-000000000001', 6000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2024-10-15', 4000000, 'USD', '2024-10-15',
   'Q4 2024 disbursement – Solar Microgrid', 'Solar Microgrid PMU', '00000001-aaaa-bbbb-cccc-000000000001', 4000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2025-01-15', 4000000, 'USD', '2025-01-15',
   'Q1 2025 disbursement – Solar Microgrid', 'Solar Microgrid PMU', '00000001-aaaa-bbbb-cccc-000000000001', 4000000);

-- Fund → Child 2 (Wind Energy)
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, receiver_org_name, receiver_activity_uuid, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '2', '2024-09-01', 12000000, 'USD', '2024-09-01',
   'Commitment to Wind Energy Pilot', 'Coastal Wind Authority', '00000002-aaaa-bbbb-cccc-000000000002', 12000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2024-10-01', 3000000, 'USD', '2024-10-01',
   'Q4 2024 disbursement – Wind Energy', 'Coastal Wind Authority', '00000002-aaaa-bbbb-cccc-000000000002', 3000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2025-01-01', 3000000, 'USD', '2025-01-01',
   'Q1 2025 disbursement – Wind Energy', 'Coastal Wind Authority', '00000002-aaaa-bbbb-cccc-000000000002', 3000000);

-- Fund → Child 3 (Solar Home Systems)
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, receiver_org_name, receiver_activity_uuid, value_usd)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '2', '2025-01-01', 8000000, 'USD', '2025-01-01',
   'Commitment to Solar Home Systems', 'Rural Electrification Agency', '00000003-aaaa-bbbb-cccc-000000000003', 8000000),
  ('a1000001-0001-4000-8000-000000000005', '3', '2025-02-15', 2500000, 'USD', '2025-02-15',
   'Q1 2025 disbursement – Solar Home Systems', 'Rural Electrification Agency', '00000003-aaaa-bbbb-cccc-000000000003', 2500000);

-- -------------------------------------------------------
-- 6. Matching incoming transactions on CHILD activities
--    (from the fund, so provider_activity_uuid points back)
-- -------------------------------------------------------

-- Child 1 receives from fund
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_activity_uuid, value_usd)
VALUES
  ('00000001-aaaa-bbbb-cccc-000000000001', '1', '2024-07-15', 6000000, 'USD', '2024-07-15',
   'Q3 2024 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 6000000),
  ('00000001-aaaa-bbbb-cccc-000000000001', '1', '2024-10-15', 4000000, 'USD', '2024-10-15',
   'Q4 2024 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 4000000),
  ('00000001-aaaa-bbbb-cccc-000000000001', '1', '2025-01-15', 4000000, 'USD', '2025-01-15',
   'Q1 2025 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 4000000);

-- Child 2 receives from fund
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_activity_uuid, value_usd)
VALUES
  ('00000002-aaaa-bbbb-cccc-000000000002', '1', '2024-10-01', 3000000, 'USD', '2024-10-01',
   'Q4 2024 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 3000000),
  ('00000002-aaaa-bbbb-cccc-000000000002', '1', '2025-01-01', 3000000, 'USD', '2025-01-01',
   'Q1 2025 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 3000000);

-- Child 3 receives from fund
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value, currency, value_date, description, provider_org_name, provider_activity_uuid, value_usd)
VALUES
  ('00000003-aaaa-bbbb-cccc-000000000003', '1', '2025-02-15', 2500000, 'USD', '2025-02-15',
   'Q1 2025 received from Rural Roads Pooled Fund', 'Rural Roads Pooled Fund', 'a1000001-0001-4000-8000-000000000005', 2500000);

-- -------------------------------------------------------
-- 7. Planned disbursements on the fund
-- -------------------------------------------------------
INSERT INTO planned_disbursements (activity_id, period_start, period_end, amount, currency, value_date, notes)
VALUES
  ('a1000001-0001-4000-8000-000000000005', '2025-04-01', '2025-06-30', 5000000, 'USD', '2025-04-01', 'Q2 2025 planned – Solar Microgrid & Wind Energy'),
  ('a1000001-0001-4000-8000-000000000005', '2025-07-01', '2025-09-30', 6000000, 'USD', '2025-07-01', 'Q3 2025 planned – All three child programmes'),
  ('a1000001-0001-4000-8000-000000000005', '2025-10-01', '2025-12-31', 5500000, 'USD', '2025-10-01', 'Q4 2025 planned – Solar Home Systems scale-up');

-- -------------------------------------------------------
-- Done! Summary of what was created:
-- -------------------------------------------------------
-- Fund: "Rural Roads Connectivity and Market Access Project" marked is_pooled_fund = TRUE
--
-- 3 donors contributed:
--   World Bank:      $25M pledged → $25M committed → $25M received (3 tranches)
--   FCDO:            $15M committed → $15M received (2 tranches)
--   European Union:  $10M pledged → $10M committed → $10M received (2 tranches)
--   TOTAL:           $50M pledged, $50M committed, $50M received
--
-- 3 child activities linked:
--   Solar Microgrid:    $18M committed, $14M disbursed (3 tranches)
--   Wind Energy:        $12M committed, $6M disbursed (2 tranches)
--   Solar Home Systems: $8M committed, $2.5M disbursed (1 tranche)
--   TOTAL:              $38M committed, $22.5M disbursed
--
-- Fund balance: $50M received − $22.5M disbursed = $27.5M remaining
-- Utilisation rate: 45%
