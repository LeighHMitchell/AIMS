-- Check users table structure before running migration
-- This script helps diagnose what columns actually exist

-- 1. List all columns in users table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if specific columns exist
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') as has_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') as has_first_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') as has_last_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') as has_is_active_column;

-- 3. Check current person_unified_view definition if it exists
SELECT view_definition 
FROM information_schema.views 
WHERE table_name = 'person_unified_view';

-- 4. List all views that depend on the users table
SELECT DISTINCT 
  v.table_name as view_name
FROM information_schema.view_column_usage vcu
JOIN information_schema.views v ON v.table_name = vcu.view_name
WHERE vcu.table_name = 'users'
ORDER BY v.table_name;

-- 5. Show sample data from users table
SELECT 
  id,
  email,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') 
    THEN name ELSE NULL END as name,
  first_name,
  last_name,
  role
FROM users
LIMIT 5; 