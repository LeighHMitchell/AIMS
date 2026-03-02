-- ============================================================
-- SEE Transfers: create tables + seed data
-- ============================================================

-- 1. Main transfers table
CREATE TABLE IF NOT EXISTS see_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code   text NOT NULL UNIQUE,
  see_name        text NOT NULL,
  see_sector      text,
  see_ministry    text,
  description     text,
  status          text NOT NULL DEFAULT 'draft',
  transfer_mode   text,
  current_annual_revenue   numeric,
  current_annual_expenses  numeric,
  total_assets             numeric,
  total_liabilities        numeric,
  employee_count           integer,
  valuation_amount         numeric,
  valuation_date           date,
  valuation_method         text,
  valuation_firm           text,
  shares_allotted_to_state numeric,
  regulatory_separation_done    boolean NOT NULL DEFAULT false,
  legislation_review_done       boolean NOT NULL DEFAULT false,
  fixed_asset_register_maintained boolean NOT NULL DEFAULT false,
  restructuring_notes      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_by      uuid
);

-- Auto-generate transfer_code when not provided
CREATE OR REPLACE FUNCTION generate_see_transfer_code()
RETURNS trigger AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.transfer_code IS NULL OR NEW.transfer_code = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN transfer_code ~ '^SEE-[0-9]+$'
           THEN CAST(substring(transfer_code from 5) AS integer)
           ELSE 0
      END
    ), 0) + 1
    INTO next_num
    FROM see_transfers;

    NEW.transfer_code := 'SEE-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_see_transfer_code ON see_transfers;
CREATE TRIGGER trg_see_transfer_code
  BEFORE INSERT ON see_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_see_transfer_code();

-- 2. Financial history / projections
CREATE TABLE IF NOT EXISTS see_transfer_financials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id     uuid NOT NULL REFERENCES see_transfers(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  period_type     text NOT NULL DEFAULT 'historical',
  revenue         numeric,
  expenses        numeric,
  net_income      numeric,
  free_cash_flow  numeric,
  capex           numeric,
  depreciation    numeric
);

-- 3. Documents
CREATE TABLE IF NOT EXISTS see_transfer_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id     uuid NOT NULL REFERENCES see_transfers(id) ON DELETE CASCADE,
  document_type   text NOT NULL,
  file_name       text NOT NULL,
  file_path       text NOT NULL,
  file_size       bigint,
  mime_type       text,
  upload_stage    text,
  description     text,
  uploaded_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE see_transfers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE see_transfer_financials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE see_transfer_documents     ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (mirrors other project-bank tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'see_transfers' AND policyname = 'see_transfers_auth_all') THEN
    CREATE POLICY see_transfers_auth_all ON see_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'see_transfer_financials' AND policyname = 'see_transfer_financials_auth_all') THEN
    CREATE POLICY see_transfer_financials_auth_all ON see_transfer_financials FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'see_transfer_documents' AND policyname = 'see_transfer_documents_auth_all') THEN
    CREATE POLICY see_transfer_documents_auth_all ON see_transfer_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Seed data — realistic Myanmar SEE equitization records
-- ============================================================

INSERT INTO see_transfers (
  transfer_code, see_name, see_sector, see_ministry, description,
  status, transfer_mode,
  current_annual_revenue, current_annual_expenses,
  total_assets, total_liabilities, employee_count,
  valuation_amount, valuation_date, valuation_method, valuation_firm,
  shares_allotted_to_state,
  regulatory_separation_done, legislation_review_done, fixed_asset_register_maintained,
  restructuring_notes
) VALUES

-- 1. Transferred (complete)
(
  'SEE-0001',
  'Myanmar Timber Enterprise — Plywood Division',
  'Industrial',
  'Ministry of Natural Resources and Environmental Conservation',
  'Partial divestiture of the plywood manufacturing division, retaining upstream log supply under state control. Includes two factories in Bago Region.',
  'transferred', 'competitive_bid',
  18500000000, 15200000000,
  42000000000, 8500000000, 1240,
  33500000000, '2025-09-15', 'DCF + Asset-Based', 'Myanmar Valuations Ltd',
  35,
  true, true, true,
  'Separated plywood division financials from parent MTE accounts. Retained forestry concession licences under MTE.'
),

-- 2. Tender stage
(
  'SEE-0002',
  'Myanma Posts and Telecommunications — Mobile Tower Network',
  'ICT',
  'Ministry of Transport and Communications',
  'Transfer of 2,800 passive mobile tower infrastructure assets via long-term lease concession to private tower company.',
  'tender', 'lease_concession',
  9200000000, 4100000000,
  28500000000, 3200000000, 380,
  25300000000, '2025-11-20', 'Replacement Cost', 'Deloitte Myanmar',
  100,
  true, true, true,
  'Tower assets ring-fenced from active network operations. Anchor tenancy agreement drafted for MPT continued use.'
),

-- 3. Valuation stage
(
  'SEE-0003',
  'Myanmar Pharmaceutical Enterprise',
  'Health',
  'Ministry of Health',
  'Full equitization of state pharmaceutical manufacturing. Three production facilities in Yangon and Mandalay producing essential medicines.',
  'valuation', 'public_offering',
  12800000000, 11500000000,
  22000000000, 6800000000, 890,
  NULL, NULL, NULL, NULL,
  40,
  false, true, false,
  'GMP certification renewal required before transfer. WHO prequalification application in progress for two product lines.'
),

-- 4. Assessment stage
(
  'SEE-0004',
  'Myanma Electric Power Enterprise — Thaketa Gas Turbine Plant',
  'Energy',
  'Ministry of Electricity and Energy',
  'BOT concession for 120MW gas-fired power plant in Thaketa Township, Yangon. Plant requires turbine overhaul estimated at USD 18M.',
  'assessment', 'bot_boo',
  22000000000, 19500000000,
  65000000000, 12000000000, 520,
  NULL, NULL, NULL, NULL,
  NULL,
  false, false, false,
  NULL
),

-- 5. Restructuring stage
(
  'SEE-0005',
  'Myanma Port Authority — Sule Wharf Terminal',
  'Transport',
  'Ministry of Transport and Communications',
  'Management concession for container and general cargo operations at Sule Wharf, Yangon River. Excludes land title — state retains ownership.',
  'restructuring', 'lease_concession',
  8500000000, 7200000000,
  35000000000, 4500000000, 650,
  NULL, NULL, NULL, NULL,
  NULL,
  true, false, true,
  'Separating wharf operations from regulatory/pilotage functions. Labour redeployment plan in consultation with unions.'
),

-- 6. Draft
(
  'SEE-0006',
  'Myanmar Ceramic Industries',
  'Industrial',
  'Ministry of Industry',
  'Full asset sale of state ceramic tile factory in Sagaing Region. Outdated kiln technology, requires significant capital investment for modernization.',
  'draft', NULL,
  3200000000, 3800000000,
  8500000000, 2100000000, 310,
  NULL, NULL, NULL, NULL,
  NULL,
  false, false, false,
  NULL
),

-- 7. Tender stage (Swiss Challenge)
(
  'SEE-0007',
  'Myanma Railways — Yangon Circular Line Operations',
  'Transport',
  'Ministry of Transport and Communications',
  'Swiss Challenge concession for the Yangon Circular Railway operations and station commercial development. Track and signalling remain state assets.',
  'tender', 'swiss_challenge',
  5800000000, 9200000000,
  48000000000, 7500000000, 2100,
  40500000000, '2025-10-01', 'DCF + Replacement Cost', 'KPMG Myanmar',
  100,
  true, true, true,
  'Operations separated from infrastructure maintenance. Unsolicited proposal received from consortium — Swiss Challenge process initiated per Notification 2/2018.'
),

-- 8. Assessment (early stage)
(
  'SEE-0008',
  'Myanmar Paper and Chemical Industries',
  'Industrial',
  'Ministry of Industry',
  'Potential management buyout of paper mill in Bago. Environmental liabilities from chemical by-products need assessment.',
  'assessment', 'management_buyout',
  2100000000, 2800000000,
  6200000000, 3900000000, 280,
  NULL, NULL, NULL, NULL,
  NULL,
  false, false, false,
  NULL
),

-- 9. Valuation stage
(
  'SEE-0009',
  'Myanma Agricultural Development Bank — Microfinance Division',
  'Banking & Finance',
  'Ministry of Planning and Finance',
  'Spin-off of microfinance lending portfolio to create independent MFI. Portfolio of 45,000 active borrowers across Ayeyarwady and Bago Regions.',
  'valuation', 'public_offering',
  4500000000, 2800000000,
  18000000000, 15500000000, 420,
  NULL, NULL, NULL, NULL,
  30,
  false, true, false,
  'Loan portfolio audit in progress. NPL ratio currently at 8.2% — restructuring target is below 5% before transfer.'
),

-- 10. Cancelled
(
  'SEE-0010',
  'Myanmar Jute Industries',
  'Agriculture',
  'Ministry of Agriculture, Livestock and Irrigation',
  'Proposed auction of jute processing facilities in Ayeyarwady Region. Cancelled due to environmental contamination discovered during assessment.',
  'cancelled', 'auction',
  1200000000, 1800000000,
  4500000000, 5200000000, 180,
  NULL, NULL, NULL, NULL,
  NULL,
  false, false, false,
  'Environmental assessment revealed soil contamination requiring remediation estimated at MMK 3.5B. Transfer suspended pending cleanup.'
),

-- 11. Restructuring
(
  'SEE-0011',
  'Myanma Oil and Gas Enterprise — Onshore Block RSF-5',
  'Energy',
  'Ministry of Natural Resources and Environmental Conservation',
  'Production sharing contract for mature onshore oil field in Magway Region. Current production ~800 barrels/day with enhanced recovery potential.',
  'restructuring', 'competitive_bid',
  15500000000, 12800000000,
  38000000000, 9200000000, 340,
  NULL, NULL, NULL, NULL,
  NULL,
  true, false, true,
  'Ring-fencing block financials from MOGE parent accounts. Decommissioning liability assessment underway for 12 legacy wells.'
),

-- 12. Draft (large enterprise)
(
  'SEE-0012',
  'Myanmar Shipyards — Sinmalaik Dockyard',
  'Industrial',
  'Ministry of Defence',
  'Potential conversion of naval repair dockyard to commercial ship repair facility. Strategic location on Yangon River, 15,000 DWT dry dock capacity.',
  'draft', NULL,
  6800000000, 8200000000,
  52000000000, 4800000000, 780,
  NULL, NULL, NULL, NULL,
  NULL,
  false, false, false,
  NULL
)

ON CONFLICT (transfer_code) DO NOTHING;
