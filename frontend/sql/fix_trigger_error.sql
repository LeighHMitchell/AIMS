-- Fix the trigger error by removing the problematic sync function
-- The error occurs because the trigger references fields that don't exist

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS sync_user_to_profile();

-- Now we can safely populate your user data
UPDATE users 
SET 
  first_name = 'Leigh',
  last_name = 'Mitchell',
  job_title = 'System Administrator',
  organisation = 'Agence Française de Développement',
  department = 'International Development'
WHERE email = 'testuser@aims.local';

-- Verify the update worked
SELECT 
  id,
  email,
  first_name,
  last_name,
  job_title,
  role,
  organisation,
  department
FROM users 
WHERE email = 'testuser@aims.local';

-- Ensure proper permissions for profile updates
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
