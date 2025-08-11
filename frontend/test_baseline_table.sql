-- Test if the baseline table and permissions are working

-- 1. First, let's check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'indicator_baselines'
) as table_exists;

-- 2. Check the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'indicator_baselines'
ORDER BY ordinal_position;

-- 3. Check if there are any RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'indicator_baselines';

-- 4. Try a simple insert (replace the UUIDs with real ones from your data)
-- First, get a real indicator_id from your database
SELECT id, title FROM result_indicators LIMIT 5;

-- 5. Test insert with a real indicator_id (replace 'YOUR_INDICATOR_ID' with one from above)
-- INSERT INTO indicator_baselines (
--   indicator_id,
--   baseline_year,
--   value
-- ) VALUES (
--   'YOUR_INDICATOR_ID',
--   2024,
--   100
-- );

-- 6. Check current user
SELECT current_user, session_user;

-- 7. Check if we can select from the table
SELECT * FROM indicator_baselines LIMIT 5;
