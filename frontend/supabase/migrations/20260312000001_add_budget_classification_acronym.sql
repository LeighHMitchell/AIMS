-- Add acronym field to budget_classifications
-- Allows storing short acronyms like "MoE" for "Ministry of Education"
ALTER TABLE budget_classifications
  ADD COLUMN IF NOT EXISTS acronym VARCHAR(20);

COMMENT ON COLUMN budget_classifications.acronym IS 'Short acronym e.g. MoE for Ministry of Education';
