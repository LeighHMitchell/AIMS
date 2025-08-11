-- Debug script to check why profile saves are still failing
-- Run this to identify the exact issue

-- 1. Check current user data
SELECT 
  id,
  email,
  first_name,
  last_name,
  job_title,
  role,
  organisation,
  department,
  telephone,
  website,
  mailing_address
FROM users 
WHERE email = 'testuser@aims.local';

-- 2. Check RLS policies
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
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Check permissions
SELECT 
  grantee,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users'
AND grantee IN ('authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 4. Check if there are any constraints that might be blocking updates
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users'
ORDER BY tc.constraint_name;

-- 5. Test a simple update to see if it works at the database level
-- (This simulates what the API should be doing)
UPDATE users 
SET 
  first_name = 'Test Update',
  updated_at = NOW()
WHERE email = 'testuser@aims.local'
RETURNING id, first_name, last_name, updated_at;

-- 6. Reset back to correct values
UPDATE users 
SET 
  first_name = 'Leigh',
  last_name = 'Mitchell',
  job_title = 'System Administrator'
WHERE email = 'testuser@aims.local'
RETURNING id, first_name, last_name, job_title;
