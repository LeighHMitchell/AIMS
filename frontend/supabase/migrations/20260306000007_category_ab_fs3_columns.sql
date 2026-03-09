-- Category A (Private Investment) structuring fields
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS private_partner_name text,
  ADD COLUMN IF NOT EXISTS private_partner_experience text,
  ADD COLUMN IF NOT EXISTS investor_commitments text,
  ADD COLUMN IF NOT EXISTS procurement_method text,
  ADD COLUMN IF NOT EXISTS procurement_timeline text,
  ADD COLUMN IF NOT EXISTS concession_period_years integer,
  ADD COLUMN IF NOT EXISTS security_arrangements text,
  ADD COLUMN IF NOT EXISTS financial_closure_target date,
  ADD COLUMN IF NOT EXISTS private_structuring_data jsonb;

-- Category B (Government Budget) structuring fields
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS budget_source text,
  ADD COLUMN IF NOT EXISTS budget_fiscal_year text,
  ADD COLUMN IF NOT EXISTS annual_operating_cost numeric(15,2),
  ADD COLUMN IF NOT EXISTS maintenance_responsibility text,
  ADD COLUMN IF NOT EXISTS procurement_method_gov text,
  ADD COLUMN IF NOT EXISTS implementation_agency_confirmed boolean,
  ADD COLUMN IF NOT EXISTS cost_recovery_mechanism text,
  ADD COLUMN IF NOT EXISTS handover_timeline text,
  ADD COLUMN IF NOT EXISTS gov_structuring_data jsonb;

-- Category D (ODA) structuring fields
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS oda_donor_type text,
  ADD COLUMN IF NOT EXISTS oda_donor_name text,
  ADD COLUMN IF NOT EXISTS oda_financing_type text,
  ADD COLUMN IF NOT EXISTS oda_grant_amount numeric(15,2),
  ADD COLUMN IF NOT EXISTS oda_loan_amount numeric(15,2),
  ADD COLUMN IF NOT EXISTS oda_counterpart_funding numeric(15,2),
  ADD COLUMN IF NOT EXISTS oda_conditions text,
  ADD COLUMN IF NOT EXISTS oda_iati_sector_code text,
  ADD COLUMN IF NOT EXISTS oda_activity_description text,
  ADD COLUMN IF NOT EXISTS oda_structuring_data jsonb;
