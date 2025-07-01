-- Diagnostic query to check users table structure
-- Run this first to understand your table structure

-- Check users table structure
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

-- Check if specific columns exist
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') as has_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') as has_first_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') as has_last_name_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') as has_is_active_column;

-- Check current person_unified_view definition
SELECT view_definition 
FROM information_schema.views 
WHERE table_name = 'person_unified_view';

-- List all views that reference the users table
SELECT DISTINCT 
  v.table_name as view_name,
  v.view_definition
FROM information_schema.view_column_usage vcu
JOIN information_schema.views v ON v.table_name = vcu.view_name
WHERE vcu.table_name = 'users'
ORDER BY v.table_name;

-- Check if there's a reference to auth.users
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='users';

-- Check existing users (just the ID columns)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN 'id exists'
        ELSE 'id does not exist'
    END as id_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_id') THEN 'auth_id exists'
        ELSE 'auth_id does not exist'
    END as auth_id_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN 'user_id exists'
        ELSE 'user_id does not exist'
    END as user_id_check; 