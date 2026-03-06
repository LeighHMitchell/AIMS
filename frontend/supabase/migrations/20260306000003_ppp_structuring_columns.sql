-- Add PPP / VGF Structuring columns to project_bank_projects
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS ppp_contract_type TEXT,
  ADD COLUMN IF NOT EXISTS ppp_contract_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS equity_ratio NUMERIC(5,2);

COMMENT ON COLUMN project_bank_projects.ppp_contract_type IS 'PPP contract modality: bot, bto, boo, btl, om, availability_payment, other';
COMMENT ON COLUMN project_bank_projects.ppp_contract_details IS 'Contract-type-specific details (transfer dates, concession periods, lease terms, etc.)';
COMMENT ON COLUMN project_bank_projects.equity_ratio IS 'Private equity contribution as percentage of total project cost';

-- Widen scoring stage check constraints to include fs3
ALTER TABLE scoring_criteria DROP CONSTRAINT IF EXISTS scoring_criteria_stage_check;
ALTER TABLE scoring_criteria ADD CONSTRAINT scoring_criteria_stage_check CHECK (stage IN ('intake', 'fs1', 'fs2', 'fs3'));

ALTER TABLE project_scores DROP CONSTRAINT IF EXISTS project_scores_stage_check;
ALTER TABLE project_scores ADD CONSTRAINT project_scores_stage_check CHECK (stage IN ('intake', 'fs1', 'fs2', 'fs3'));
