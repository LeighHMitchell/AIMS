-- Check and fix permissions for profile updates
-- Since columns exist, the issue might be permissions or RLS policies

-- Check current RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Check table and column permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users'
AND grantee = 'authenticated';

-- Check column-specific permissions
SELECT 
  grantee,
  column_name,
  privilege_type
FROM information_schema.column_privileges 
WHERE table_name = 'users'
AND grantee = 'authenticated'
ORDER BY column_name;

-- Ensure proper permissions exist
GRANT UPDATE (first_name, last_name, job_title, department, telephone, website, mailing_address, organisation) ON users TO authenticated;

-- Ensure RLS policy allows users to update their own records
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Also ensure users can select their own data
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Show final permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users'
AND grantee = 'authenticated';
