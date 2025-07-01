-- Add IATI sync columns to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'never';

-- Add comments explaining the columns
COMMENT ON COLUMN activities.auto_sync IS 'Whether this activity should automatically sync with IATI';
COMMENT ON COLUMN activities.last_sync_time IS 'Timestamp of the last successful IATI sync';
COMMENT ON COLUMN activities.sync_status IS 'Current IATI sync status: live, pending, outdated, error, never'; 