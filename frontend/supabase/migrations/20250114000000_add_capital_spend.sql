-- Add capital_spend_percentage column to activities table
-- This field tracks the percentage of the total activity budget or disbursements 
-- used for capital investment (e.g. infrastructure, equipment)

-- Add the column (idempotent - won't fail if column exists)
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS capital_spend_percentage DECIMAL(5,2);

-- Add constraint to ensure percentage is between 0 and 100
-- Drop existing constraint if it exists to make migration idempotent
ALTER TABLE activities
DROP CONSTRAINT IF EXISTS capital_spend_percentage_range;

ALTER TABLE activities
ADD CONSTRAINT capital_spend_percentage_range 
CHECK (capital_spend_percentage >= 0 AND capital_spend_percentage <= 100);

-- Add comment for documentation
COMMENT ON COLUMN activities.capital_spend_percentage IS 
'Percentage of the total activity cost used for fixed assets or infrastructure (0-100)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activities_capital_spend 
ON activities(capital_spend_percentage) 
WHERE capital_spend_percentage IS NOT NULL;

