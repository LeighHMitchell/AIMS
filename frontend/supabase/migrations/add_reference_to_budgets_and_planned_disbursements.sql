-- Add reference columns to activity_budgets and planned_disbursements
-- These provide human-readable identifiers like BUD-001, PD-001 (per activity)

ALTER TABLE activity_budgets ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_budgets_reference ON activity_budgets(activity_id, reference);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_reference ON planned_disbursements(activity_id, reference);
