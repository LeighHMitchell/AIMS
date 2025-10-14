-- Add budget_lines column to activity_budgets table for IATI budget-line elements
-- This column will store optional budget line items as JSON array

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_budgets' 
    AND column_name = 'budget_lines'
  ) THEN
    ALTER TABLE activity_budgets 
    ADD COLUMN budget_lines JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE 'Added budget_lines column to activity_budgets table';
  ELSE
    RAISE NOTICE 'Column budget_lines already exists in activity_budgets table';
  END IF;
END $$;

-- Add a comment to document the column
COMMENT ON COLUMN activity_budgets.budget_lines IS 'Optional IATI budget-line elements stored as JSON array. Each line has: ref, value, currency, value_date, narrative';

-- Example of budget_lines structure:
-- [
--   {
--     "ref": "1",
--     "value": 1500,
--     "currency": "EUR",
--     "value_date": "2014-01-01",
--     "narrative": "Salary costs"
--   },
--   {
--     "ref": "2",
--     "value": 1500,
--     "currency": "EUR",
--     "value_date": "2014-01-01",
--     "narrative": "Equipment purchases"
--   }
-- ]

