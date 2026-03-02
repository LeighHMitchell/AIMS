-- Add implementing_agency, proponent, and contact officer detail fields
-- to project_bank_projects. These are used in the Project Bank intake form.

ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS implementing_agency text,
  ADD COLUMN IF NOT EXISTS proponent_name text,
  ADD COLUMN IF NOT EXISTS proponent_company text,
  ADD COLUMN IF NOT EXISTS proponent_contact text,
  ADD COLUMN IF NOT EXISTS contact_position text,
  ADD COLUMN IF NOT EXISTS contact_ministry text,
  ADD COLUMN IF NOT EXISTS contact_department text,
  ADD COLUMN IF NOT EXISTS operational_period_months_remainder integer,
  ADD COLUMN IF NOT EXISTS fs_conductor_type text CHECK (fs_conductor_type IN ('individual', 'company')),
  ADD COLUMN IF NOT EXISTS fs_conductor_company_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_company_address text,
  ADD COLUMN IF NOT EXISTS fs_conductor_company_phone text,
  ADD COLUMN IF NOT EXISTS fs_conductor_company_email text,
  ADD COLUMN IF NOT EXISTS fs_conductor_company_website text,
  ADD COLUMN IF NOT EXISTS fs_conductor_contact_person text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_name text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_email text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_phone text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_job_title text,
  ADD COLUMN IF NOT EXISTS fs_conductor_individual_company text,
  ADD COLUMN IF NOT EXISTS firr_cost_table_data jsonb;
