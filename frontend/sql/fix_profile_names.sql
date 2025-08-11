-- Fix profile names by adding missing columns and populating them from existing name field
-- This solves the issue where names display correctly but edit form shows blank fields

-- First, add the missing columns if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS mailing_address TEXT,
ADD COLUMN IF NOT EXISTS organisation TEXT;

-- Update first_name and last_name by splitting the existing name field
-- This handles cases where name exists but first_name/last_name are empty
UPDATE users 
SET 
  first_name = CASE 
    WHEN first_name IS NULL OR first_name = '' THEN 
      TRIM(split_part(name, ' ', 1))
    ELSE first_name 
  END,
  last_name = CASE 
    WHEN last_name IS NULL OR last_name = '' THEN 
      TRIM(regexp_replace(name, '^[^ ]+ +', ''))
    ELSE last_name 
  END
WHERE name IS NOT NULL AND name != '';

-- Fix job titles - convert 'Super User' role to a proper job title if job_title is empty
UPDATE users 
SET job_title = CASE 
  WHEN (job_title IS NULL OR job_title = '' OR job_title = 'Super User') AND role = 'super_user' THEN 
    'System Administrator'
  WHEN (job_title IS NULL OR job_title = '' OR job_title = 'Super User') AND role LIKE '%gov%' THEN 
    'Government Partner'
  WHEN (job_title IS NULL OR job_title = '' OR job_title = 'Super User') AND role LIKE '%dev%' THEN 
    'Development Partner'
  ELSE job_title 
END;

-- Ensure RLS policies allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Grant permissions for users to update profile fields
GRANT UPDATE (first_name, last_name, job_title, department, telephone, website, mailing_address, organisation) ON users TO authenticated;

-- Display the results to verify the fix
SELECT 
  id,
  name,
  first_name,
  last_name,
  job_title,
  role
FROM users 
WHERE email = 'testuser@aims.local'
LIMIT 1;
