-- Add budget status columns to activities table
-- Allows government users to flag activities as on-budget, off-budget, or partial

-- Add budget_status column
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS budget_status VARCHAR(20) DEFAULT 'unknown';

-- Add constraint for valid values (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activities_budget_status_check'
  ) THEN
    ALTER TABLE activities
    ADD CONSTRAINT activities_budget_status_check
    CHECK (budget_status IN ('on_budget', 'off_budget', 'partial', 'unknown'));
  END IF;
END $$;

-- Add on_budget_percentage column (for partial status)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS on_budget_percentage NUMERIC(5, 2);

-- Add constraint for percentage range (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activities_on_budget_percentage_check'
  ) THEN
    ALTER TABLE activities
    ADD CONSTRAINT activities_on_budget_percentage_check
    CHECK (on_budget_percentage IS NULL OR (on_budget_percentage >= 0 AND on_budget_percentage <= 100));
  END IF;
END $$;

-- Add budget_status_notes column
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS budget_status_notes TEXT;

-- Add timestamp for when budget status was last updated
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS budget_status_updated_at TIMESTAMP WITH TIME ZONE;

-- Add reference to user who last updated budget status
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS budget_status_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for filtering by budget status
CREATE INDEX IF NOT EXISTS idx_activities_budget_status ON activities(budget_status);

-- Add comments for documentation
COMMENT ON COLUMN activities.budget_status IS 'Government-assigned budget status: on_budget (fully on budget), off_budget (not on budget), partial (partially on budget), unknown (not yet determined)';
COMMENT ON COLUMN activities.on_budget_percentage IS 'Percentage of activity funding that is on government budget (0-100, required when status is partial)';
COMMENT ON COLUMN activities.budget_status_notes IS 'Optional notes explaining the budget status determination';
COMMENT ON COLUMN activities.budget_status_updated_at IS 'Timestamp when budget status was last modified';
COMMENT ON COLUMN activities.budget_status_updated_by IS 'User who last modified the budget status';
