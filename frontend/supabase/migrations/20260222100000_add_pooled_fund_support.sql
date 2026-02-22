-- Add pooled fund support to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_pooled_fund BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_activities_is_pooled_fund ON activities(is_pooled_fund) WHERE is_pooled_fund = TRUE;

COMMENT ON COLUMN activities.is_pooled_fund IS 'Marks activity as a pooled/trust fund that receives contributions and disburses to child activities';
