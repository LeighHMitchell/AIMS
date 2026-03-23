-- Add risk_assessment JSONB column to government_inputs table
-- Replaces the old geographic_context and strategic_considerations fields
ALTER TABLE government_inputs
  ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}';

COMMENT ON COLUMN government_inputs.risk_assessment IS
  'Scored risk assessment with 5 categories (political, environmental, social, fiduciary, operational). Each question stores {score: 1|2|3} keyed by question ID.';
