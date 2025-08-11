-- Debug script to check users table structure and permissions
-- Run this to see what might be causing the profile update to fail

-- 1. Check if the users table exists and its structure
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'users';

-- 2. Check what columns exist in the users table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies on users table
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
WHERE tablename = 'users';

-- 4. Check table permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users';

-- 5. Check column permissions
SELECT 
  grantee,
  column_name,
  privilege_type,
  is_grantable
FROM information_schema.column_privileges 
WHERE table_name = 'users';

-- 6. Check if there's any sample data in users table (just count and structure)
SELECT 
  COUNT(*) as total_users,
  COUNT(first_name) as users_with_first_name,
  COUNT(last_name) as users_with_last_name,
  COUNT(job_title) as users_with_job_title
FROM users;

-- 7. Check constraints on users table
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'users';

-- 8. Show one sample user (without sensitive info) to check data structure
SELECT 
  id,
  CASE WHEN first_name IS NOT NULL THEN '[HAS_VALUE]' ELSE '[NULL]' END as first_name_status,
  CASE WHEN last_name IS NOT NULL THEN '[HAS_VALUE]' ELSE '[NULL]' END as last_name_status,
  CASE WHEN job_title IS NOT NULL THEN '[HAS_VALUE]' ELSE '[NULL]' END as job_title_status,
  role,
  created_at
FROM users 
LIMIT 1;
