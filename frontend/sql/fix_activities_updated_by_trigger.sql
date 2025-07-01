-- Find ALL triggers on activities table (not just constraint triggers)
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'activities' 
AND n.nspname = 'public'
AND NOT t.tgisinternal  -- Exclude internal constraint triggers
ORDER BY t.tgname;

-- Check for any function that might be using updated_by
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%updated_by%'
AND pg_get_functiondef(p.oid) LIKE '%activities%';

-- Check what columns activities table actually has
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activities'
AND column_name IN ('updated_by', 'last_edited_by', 'updated_at')
ORDER BY ordinal_position;

-- Look for update triggers specifically
SELECT 
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'activities'
AND event_object_schema = 'public'
AND trigger_name NOT LIKE 'RI_%';  -- Exclude referential integrity triggers

-- If we find a trigger using updated_by, here's the fix:
-- First, drop the problematic trigger (replace TRIGGER_NAME with actual name)
-- DROP TRIGGER IF EXISTS TRIGGER_NAME ON activities;

-- Then recreate it with the correct column name
-- Example fix for a typical updated_at trigger:
/*
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- If your trigger was setting updated_by, change it to last_edited_by
  -- NEW.last_edited_by = auth.uid();  -- or however it was getting the user ID
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activities_updated_at();
*/ 