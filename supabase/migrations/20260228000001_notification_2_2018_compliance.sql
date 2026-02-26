-- ============================================================================
-- Notification No. 2/2018 Compliance Migration
-- Adds: project_bank_settings, unsolicited_proposals, proposal_bidders,
--        project_monitoring_schedules, project_monitoring_reports,
--        see_transfers, see_transfer_financials, see_transfer_documents
-- Extends: project_bank_projects (ppp_contract_type, ppp_contract_details,
--          implementing_agency, equity_ratio)
-- ============================================================================

-- A. Extend project_bank_projects
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS ppp_contract_type TEXT,
  ADD COLUMN IF NOT EXISTS ppp_contract_details JSONB,
  ADD COLUMN IF NOT EXISTS implementing_agency TEXT,
  ADD COLUMN IF NOT EXISTS equity_ratio NUMERIC(5,2);

-- PPP contract type check
DO $$ BEGIN
  ALTER TABLE project_bank_projects
    ADD CONSTRAINT chk_ppp_contract_type
    CHECK (ppp_contract_type IS NULL OR ppp_contract_type IN (
      'availability_payment','boo','bot','btl','bto','om','other'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B. project_bank_settings (key-value config for compliance rules)
CREATE TABLE IF NOT EXISTS project_bank_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  label TEXT NOT NULL,
  description TEXT,
  enforcement TEXT NOT NULL DEFAULT 'warn'
    CHECK (enforcement IN ('enforce','warn','off')),
  category TEXT DEFAULT 'compliance',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE project_bank_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings"
  ON project_bank_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings"
  ON project_bank_settings FOR UPDATE TO authenticated USING (true);

-- Seed default compliance rules
INSERT INTO project_bank_settings (key, value, label, description, enforcement, category)
VALUES
  ('minimum_project_size_mmk', '{"amount": 2000000000}', 'Minimum Project Size (MMK)',
   'Projects below this threshold in MMK may not qualify for the Project Bank.', 'warn', 'compliance'),
  ('equity_ratio_threshold_small', '{"percentage": 30}', 'Equity Ratio Threshold (<=50M USD)',
   'Minimum equity ratio required for projects with estimated cost <= $50M.', 'warn', 'compliance'),
  ('equity_ratio_threshold_large', '{"percentage": 20}', 'Equity Ratio Threshold (>50M USD)',
   'Minimum equity ratio required for projects with estimated cost > $50M.', 'warn', 'compliance'),
  ('cabinet_approval_threshold_usd', '{"amount": 100000000}', 'Cabinet Approval Threshold (USD)',
   'Projects exceeding this USD value require cabinet approval before advancing to approved status.', 'enforce', 'compliance'),
  ('monitoring_report_interval_months', '{"months": 6}', 'Monitoring Report Interval (Months)',
   'Default interval between required monitoring reports for approved projects.', 'enforce', 'compliance')
ON CONFLICT (key) DO NOTHING;

-- C. unsolicited_proposals
CREATE TABLE IF NOT EXISTS unsolicited_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  proponent_name TEXT NOT NULL,
  proponent_contact TEXT,
  proponent_company TEXT,
  proposal_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','under_review','rfp_published','counter_proposals_open','evaluation','awarded','rejected')),
  rfp_published_date DATE,
  counter_proposal_deadline DATE,
  original_proponent_match_deadline DATE,
  match_response TEXT,
  award_decision TEXT,
  award_date DATE,
  awarded_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_unsolicited_proposals_project ON unsolicited_proposals(project_id);

ALTER TABLE unsolicited_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD unsolicited_proposals"
  ON unsolicited_proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- D. proposal_bidders
CREATE TABLE IF NOT EXISTS proposal_bidders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES unsolicited_proposals(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  bid_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  proposal_document_id UUID REFERENCES project_documents(id),
  evaluation_score NUMERIC(5,2),
  evaluation_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','shortlisted','rejected','winner')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_bidders_proposal ON proposal_bidders(proposal_id);

ALTER TABLE proposal_bidders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD proposal_bidders"
  ON proposal_bidders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- E. project_monitoring_schedules
CREATE TABLE IF NOT EXISTS project_monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE UNIQUE,
  interval_months INTEGER NOT NULL DEFAULT 6,
  next_due_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_monitoring_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD monitoring_schedules"
  ON project_monitoring_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- F. project_monitoring_reports
CREATE TABLE IF NOT EXISTS project_monitoring_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES project_monitoring_schedules(id),
  report_period_start DATE,
  report_period_end DATE,
  due_date DATE,
  submitted_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','under_review','reviewed','overdue')),
  compliance_status TEXT DEFAULT 'not_assessed'
    CHECK (compliance_status IN ('compliant','partially_compliant','non_compliant','not_assessed')),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  document_id UUID REFERENCES project_documents(id),
  key_findings TEXT,
  recommendations TEXT,
  kpi_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_monitoring_reports_project ON project_monitoring_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_status ON project_monitoring_reports(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_due ON project_monitoring_reports(due_date);

ALTER TABLE project_monitoring_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD monitoring_reports"
  ON project_monitoring_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- G. see_transfers
CREATE TABLE IF NOT EXISTS see_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code TEXT UNIQUE,
  see_name TEXT NOT NULL,
  see_sector TEXT,
  see_ministry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','assessment','valuation','restructuring','tender','transferred','cancelled')),
  transfer_mode TEXT
    CHECK (transfer_mode IS NULL OR transfer_mode IN (
      'public_offering','auction','competitive_bid','swiss_challenge','asset_sale',
      'management_buyout','lease_concession','bot_boo','other'
    )),
  current_annual_revenue NUMERIC,
  current_annual_expenses NUMERIC,
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  employee_count INTEGER,
  valuation_amount NUMERIC,
  valuation_date DATE,
  valuation_method TEXT,
  valuation_firm TEXT,
  shares_allotted_to_state NUMERIC(5,2),
  regulatory_separation_done BOOLEAN DEFAULT false,
  legislation_review_done BOOLEAN DEFAULT false,
  fixed_asset_register_maintained BOOLEAN DEFAULT false,
  restructuring_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_see_transfers_status ON see_transfers(status);

ALTER TABLE see_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD see_transfers"
  ON see_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-generate transfer_code (SEE-YYYY-NNN)
CREATE OR REPLACE FUNCTION generate_see_transfer_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(transfer_code FROM 'SEE-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM see_transfers
  WHERE transfer_code LIKE 'SEE-' || year_str || '-%';

  NEW.transfer_code := 'SEE-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_see_transfer_code ON see_transfers;
CREATE TRIGGER trg_see_transfer_code
  BEFORE INSERT ON see_transfers
  FOR EACH ROW
  WHEN (NEW.transfer_code IS NULL OR NEW.transfer_code = '')
  EXECUTE FUNCTION generate_see_transfer_code();

-- H. see_transfer_financials
CREATE TABLE IF NOT EXISTS see_transfer_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES see_transfers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('historical','projected')),
  revenue NUMERIC,
  expenses NUMERIC,
  net_income NUMERIC,
  free_cash_flow NUMERIC,
  capex NUMERIC,
  depreciation NUMERIC,
  UNIQUE(transfer_id, year, period_type)
);

CREATE INDEX IF NOT EXISTS idx_see_financials_transfer ON see_transfer_financials(transfer_id);

ALTER TABLE see_transfer_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD see_transfer_financials"
  ON see_transfer_financials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- I. see_transfer_documents
CREATE TABLE IF NOT EXISTS see_transfer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES see_transfers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'financial_statements','audit_report','valuation_certificate','asset_register',
      'restructuring_plan','tender_document','transfer_agreement','other'
    )),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  upload_stage TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_see_documents_transfer ON see_transfer_documents(transfer_id);

ALTER TABLE see_transfer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD see_transfer_documents"
  ON see_transfer_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- J. Extend project_documents document_type check to include cabinet_approval, monitoring_report
-- Drop existing constraint and recreate with new values
DO $$ BEGIN
  ALTER TABLE project_documents DROP CONSTRAINT IF EXISTS project_documents_document_type_check;
  ALTER TABLE project_documents
    ADD CONSTRAINT project_documents_document_type_check
    CHECK (document_type IN (
      'concept_note','project_proposal','preliminary_fs_report',
      'cost_estimate','environmental_screening','msdp_alignment_justification',
      'firr_calculation_workbook','eirr_calculation_workbook',
      'cost_benefit_analysis','detailed_fs_report','vgf_calculation',
      'risk_allocation_matrix','funding_request','cabinet_approval','monitoring_report','other'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
