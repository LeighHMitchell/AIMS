-- Add msdp_strategies as jsonb array to support multi-select
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS msdp_strategies jsonb;

-- Migrate existing single strategy to array
UPDATE project_bank_projects
SET msdp_strategies = jsonb_build_array(msdp_strategy_area)
WHERE msdp_strategy_area IS NOT NULL
  AND msdp_strategies IS NULL;
