-- Check for triggers on activities table that reference updated_by
DO $$
BEGIN
  -- First, check if there's a trigger using updated_by instead of last_edited_by
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger t 
    JOIN pg_class c ON t.tgrelid = c.oid 
    WHERE c.relname = 'activities' 
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE 'Found triggers on activities table';
  END IF;
END $$;

-- If there's a trigger setting NEW.updated_by, we need to update it to use NEW.last_edited_by
-- This query will show us the trigger definition
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'activities' 
AND n.nspname = 'public';

-- Check if activities table has updated_by column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND table_schema = 'public'
AND column_name IN ('updated_by', 'last_edited_by')
ORDER BY column_name; 