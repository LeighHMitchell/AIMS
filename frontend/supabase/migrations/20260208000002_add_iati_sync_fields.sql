-- Add IATI sync tracking fields to activities table
-- This migration adds support for automatic syncing with IATI Datastore

-- Add sync-related columns to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_sync_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Add constraint for sync_status values
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_sync_status;
ALTER TABLE activities ADD CONSTRAINT check_sync_status
  CHECK (sync_status IN ('live', 'pending', 'outdated'));

-- Add comments for documentation
COMMENT ON COLUMN activities.auto_sync IS 'Whether this activity should automatically sync with IATI Datastore';
COMMENT ON COLUMN activities.last_sync_time IS 'Timestamp of the last successful sync with IATI Datastore';
COMMENT ON COLUMN activities.auto_sync_fields IS 'JSON array of field names that should be synced automatically';
COMMENT ON COLUMN activities.sync_status IS 'Current sync status: live (up-to-date), pending (sync needed), outdated (manual changes made)';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_sync_status ON activities(sync_status);
CREATE INDEX IF NOT EXISTS idx_activities_auto_sync ON activities(auto_sync) WHERE auto_sync = true;
CREATE INDEX IF NOT EXISTS idx_activities_last_sync_time ON activities(last_sync_time);

-- Create a function to mark activity as outdated when user edits synced fields
-- This only fires when auto_sync is enabled and the sync system isn't the one making the update
CREATE OR REPLACE FUNCTION update_activity_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if auto_sync is not enabled
  IF NEW.auto_sync IS NOT TRUE OR OLD.auto_sync IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip if the sync system itself is updating (it sets sync_status = 'live')
  IF NEW.sync_status = 'live' AND OLD.sync_status IS DISTINCT FROM 'live' THEN
    RETURN NEW;
  END IF;

  -- Check if any core activity fields were modified
  IF NEW.title_narrative IS DISTINCT FROM OLD.title_narrative
     OR NEW.description_narrative IS DISTINCT FROM OLD.description_narrative
     OR NEW.planned_start_date IS DISTINCT FROM OLD.planned_start_date
     OR NEW.planned_end_date IS DISTINCT FROM OLD.planned_end_date
     OR NEW.actual_start_date IS DISTINCT FROM OLD.actual_start_date
     OR NEW.actual_end_date IS DISTINCT FROM OLD.actual_end_date
     OR NEW.activity_status IS DISTINCT FROM OLD.activity_status
     OR NEW.default_aid_type IS DISTINCT FROM OLD.default_aid_type
     OR NEW.default_flow_type IS DISTINCT FROM OLD.default_flow_type
     OR NEW.default_finance_type IS DISTINCT FROM OLD.default_finance_type
     OR NEW.default_tied_status IS DISTINCT FROM OLD.default_tied_status
     OR NEW.collaboration_type IS DISTINCT FROM OLD.collaboration_type
     OR NEW.recipient_countries IS DISTINCT FROM OLD.recipient_countries
  THEN
    NEW.sync_status = 'outdated';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update sync status
DROP TRIGGER IF EXISTS trigger_update_activity_sync_status ON activities;
CREATE TRIGGER trigger_update_activity_sync_status
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_sync_status();
