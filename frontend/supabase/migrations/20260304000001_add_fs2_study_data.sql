-- Add JSONB column for FS-2 detailed feasibility study data
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS fs2_study_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN project_bank_projects.fs2_study_data IS
  'Structured data for the FS-2 detailed feasibility study form (overview, demand, technical, financial, economic, environmental, risk, implementation tabs)';
