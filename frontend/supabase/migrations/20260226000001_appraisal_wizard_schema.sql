-- Appraisal Wizard Schema Migration
-- Adds multi-stage appraisal workflow columns, project_documents table,
-- appraisal_shadow_prices reference table, and project-documents storage bucket.

-- =================================================================
-- A. Extend project_bank_projects with appraisal workflow columns
-- =================================================================

-- Appraisal workflow state
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS appraisal_stage text DEFAULT 'intake'
    CHECK (appraisal_stage IN (
      'intake', 'preliminary_fs', 'msdp_screening', 'firr_assessment',
      'eirr_assessment', 'vgf_assessment', 'dp_consultation', 'routing_complete', 'rejected'
    )),
  ADD COLUMN IF NOT EXISTS routing_outcome text
    CHECK (routing_outcome IN (
      'private_with_state_support', 'private_no_support', 'ppp_mechanism',
      'rejected_not_msdp', 'rejected_low_eirr', NULL
    ));

-- Intake fields (Stage 1)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS contact_officer text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS sub_sector text,
  ADD COLUMN IF NOT EXISTS townships text[],
  ADD COLUMN IF NOT EXISTS estimated_start_date date,
  ADD COLUMN IF NOT EXISTS estimated_duration_months integer,
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS target_beneficiaries text;

-- Preliminary FS fields (Stage 2)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS construction_period_years integer,
  ADD COLUMN IF NOT EXISTS operational_period_years integer,
  ADD COLUMN IF NOT EXISTS project_life_years integer,
  ADD COLUMN IF NOT EXISTS preliminary_fs_summary text,
  ADD COLUMN IF NOT EXISTS preliminary_fs_date date,
  ADD COLUMN IF NOT EXISTS preliminary_fs_conducted_by text,
  ADD COLUMN IF NOT EXISTS cost_table_data jsonb,
  ADD COLUMN IF NOT EXISTS technical_approach text,
  ADD COLUMN IF NOT EXISTS technology_methodology text,
  ADD COLUMN IF NOT EXISTS technical_risks text,
  ADD COLUMN IF NOT EXISTS has_technical_design boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS technical_design_maturity text,
  ADD COLUMN IF NOT EXISTS environmental_impact_level text,
  ADD COLUMN IF NOT EXISTS social_impact_level text,
  ADD COLUMN IF NOT EXISTS land_acquisition_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resettlement_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_affected_households integer,
  ADD COLUMN IF NOT EXISTS has_revenue_component boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS revenue_sources text[],
  ADD COLUMN IF NOT EXISTS market_assessment_summary text,
  ADD COLUMN IF NOT EXISTS projected_annual_users integer,
  ADD COLUMN IF NOT EXISTS projected_annual_revenue numeric,
  ADD COLUMN IF NOT EXISTS revenue_ramp_up_years integer;

-- MSDP fields (Stage 3)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS msdp_strategy_area text,
  ADD COLUMN IF NOT EXISTS secondary_ndp_goals uuid[],
  ADD COLUMN IF NOT EXISTS alignment_justification text,
  ADD COLUMN IF NOT EXISTS sector_strategy_reference text,
  ADD COLUMN IF NOT EXISTS in_sector_investment_plan boolean DEFAULT false;

-- Calculation data (Stages 4-6)
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS firr_calculation_data jsonb,
  ADD COLUMN IF NOT EXISTS eirr_calculation_data jsonb,
  ADD COLUMN IF NOT EXISTS eirr_shadow_prices jsonb,
  ADD COLUMN IF NOT EXISTS vgf_calculation_data jsonb,
  ADD COLUMN IF NOT EXISTS vgf_status text,
  ADD COLUMN IF NOT EXISTS dap_compliant boolean,
  ADD COLUMN IF NOT EXISTS dap_notes text,
  ADD COLUMN IF NOT EXISTS budget_allocation_status text,
  ADD COLUMN IF NOT EXISTS budget_amount numeric(15,2);


-- =================================================================
-- B. Create project_documents table
-- =================================================================

CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'concept_note', 'project_proposal', 'preliminary_fs_report',
    'cost_estimate', 'environmental_screening', 'msdp_alignment_justification',
    'firr_calculation_workbook', 'eirr_calculation_workbook',
    'cost_benefit_analysis', 'detailed_fs_report', 'vgf_calculation',
    'risk_allocation_matrix', 'funding_request', 'other'
  )),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  upload_stage text,
  description text,
  is_required boolean DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS for project_documents
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project documents"
  ON project_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project documents"
  ON project_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project documents"
  ON project_documents FOR DELETE
  TO authenticated
  USING (true);


-- =================================================================
-- C. Create appraisal_shadow_prices reference table
-- =================================================================

CREATE TABLE IF NOT EXISTS appraisal_shadow_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shadow_wage_rate numeric(5,3) DEFAULT 0.600,
  shadow_exchange_rate numeric(5,3) DEFAULT 1.200,
  standard_conversion_factor numeric(5,3) DEFAULT 0.900,
  social_discount_rate numeric(5,2) DEFAULT 6.00,
  sector text,
  effective_from date,
  effective_to date,
  is_active boolean DEFAULT true,
  approved_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS for appraisal_shadow_prices
ALTER TABLE appraisal_shadow_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shadow prices"
  ON appraisal_shadow_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage shadow prices"
  ON appraisal_shadow_prices FOR ALL
  TO authenticated
  USING (true);

-- Seed default row
INSERT INTO appraisal_shadow_prices (
  shadow_wage_rate, shadow_exchange_rate, standard_conversion_factor,
  social_discount_rate, sector, is_active, approved_by, notes
) VALUES (
  0.600, 1.200, 0.900, 6.00, NULL, true,
  'System Default', 'National default shadow prices for economic analysis'
);


-- =================================================================
-- D. Create project-documents storage bucket
-- =================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,
  52428800,  -- 50MB
  ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload project documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can read project documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can delete project documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-documents');
