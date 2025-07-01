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

-- Create IATIImportLog table to track import history
CREATE TABLE IF NOT EXISTS iati_import_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  import_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  import_type TEXT NOT NULL, -- 'manual', 'auto', 'bulk'
  result_status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields_updated TEXT[], -- Array of field names that were updated
  previous_values JSONB, -- Store previous values for rollback if needed
  error_details TEXT,
  imported_by UUID REFERENCES auth.users(id),
  iati_version TEXT, -- IATI version used for import
  source_url TEXT, -- IATI Datastore URL or file source
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_sync_status ON activities(sync_status);
CREATE INDEX IF NOT EXISTS idx_activities_auto_sync ON activities(auto_sync);
CREATE INDEX IF NOT EXISTS idx_activities_last_sync_time ON activities(last_sync_time);
CREATE INDEX IF NOT EXISTS idx_iati_import_log_activity_id ON iati_import_log(activity_id);
CREATE INDEX IF NOT EXISTS idx_iati_import_log_timestamp ON iati_import_log(import_timestamp);
CREATE INDEX IF NOT EXISTS idx_iati_import_log_result_status ON iati_import_log(result_status);

-- Add comments for IATIImportLog table
COMMENT ON TABLE iati_import_log IS 'Track all IATI import operations for audit and rollback purposes';
COMMENT ON COLUMN iati_import_log.import_type IS 'Type of import: manual (user-triggered), auto (scheduled sync), bulk (batch import)';
COMMENT ON COLUMN iati_import_log.result_status IS 'Import result: success (all fields updated), partial (some fields failed), failed (import failed)';
COMMENT ON COLUMN iati_import_log.result_summary IS 'JSON summary of the import including counts, warnings, and other metadata';
COMMENT ON COLUMN iati_import_log.fields_updated IS 'Array of field names that were successfully updated during this import';
COMMENT ON COLUMN iati_import_log.previous_values IS 'Previous field values stored for potential rollback';

-- Add RLS policies for iati_import_log
ALTER TABLE iati_import_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view import logs for activities they can access
CREATE POLICY "Users can view import logs for their activities" ON iati_import_log
  FOR SELECT
  USING (
    activity_id IN (
      SELECT id FROM activities 
      WHERE created_by = auth.uid() 
         OR created_by_org IN (
           SELECT organization_id FROM user_organizations 
           WHERE user_id = auth.uid()
         )
    )
  );

-- Policy: Users can create import logs for activities they can edit
CREATE POLICY "Users can create import logs for their activities" ON iati_import_log
  FOR INSERT
  WITH CHECK (
    activity_id IN (
      SELECT id FROM activities 
      WHERE created_by = auth.uid() 
         OR created_by_org IN (
           SELECT organization_id FROM user_organizations 
           WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
         )
    )
  );

-- Create a function to update sync status when activity is modified
CREATE OR REPLACE FUNCTION update_activity_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If auto_sync is enabled and a synced field was modified, mark as outdated
  IF NEW.auto_sync = true AND OLD.auto_sync = true THEN
    -- Check if any auto-synced fields were modified
    IF (NEW.auto_sync_fields IS NOT NULL AND jsonb_array_length(NEW.auto_sync_fields) > 0) THEN
      -- For simplicity, if any tracked field changes, mark as outdated
      -- In production, you'd check specific fields
      IF NEW.title != OLD.title 
         OR NEW.description != OLD.description 
         OR NEW.sectors != OLD.sectors
         OR NEW.planned_start_date != OLD.planned_start_date
         OR NEW.planned_end_date != OLD.planned_end_date
         OR NEW.actual_start_date != OLD.actual_start_date
         OR NEW.actual_end_date != OLD.actual_end_date
         OR NEW.activity_status != OLD.activity_status
         OR NEW.default_aid_type != OLD.default_aid_type
         OR NEW.flow_type != OLD.flow_type
      THEN
        NEW.sync_status = 'outdated';
      END IF;
    END IF;
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update sync status
DROP TRIGGER IF EXISTS trigger_update_activity_sync_status ON activities;
CREATE TRIGGER trigger_update_activity_sync_status
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_sync_status();

-- Sample auto_sync_fields configuration:
-- ["title", "description", "sectors", "planned_start_date", "planned_end_date", 
--  "actual_start_date", "actual_end_date", "activity_status", "budget", 
--  "participating_orgs", "implementing_partners", "locations"] 