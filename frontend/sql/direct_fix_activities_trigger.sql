-- DIRECT FIX: Most likely the issue is with the updated_at trigger
-- This script will fix the common trigger that causes this error

-- 1. First, drop any existing update trigger on activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
DROP TRIGGER IF EXISTS set_activities_updated_at ON activities;
DROP TRIGGER IF EXISTS activities_updated_at ON activities;
DROP TRIGGER IF EXISTS update_activities_timestamp ON activities;
DROP TRIGGER IF EXISTS handle_activities_updated_at ON activities;

-- 2. Drop the function if it exists
DROP FUNCTION IF EXISTS update_activities_updated_at() CASCADE;
DROP FUNCTION IF EXISTS set_activities_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;

-- 3. Create the correct function that uses last_edited_by instead of updated_by
CREATE OR REPLACE FUNCTION update_activities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Don't set last_edited_by here - it's already set by the API
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
CREATE TRIGGER update_activities_timestamp
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activities_timestamp();

-- 5. Verify the fix by checking what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name IN ('updated_at', 'updated_by', 'last_edited_by')
ORDER BY column_name;

-- 6. If there's still an issue, this will show all update-related triggers
SELECT 
    tgname as trigger_name,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'activities'::regclass
AND tgtype & 16 = 16  -- UPDATE triggers
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname; 