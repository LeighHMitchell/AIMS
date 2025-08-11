-- Simple migration to add missing columns to users table
-- This is a minimal fix for the profile update issue

-- Add the essential columns that the application expects
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS mailing_address TEXT,
ADD COLUMN IF NOT EXISTS organisation TEXT;

-- Grant basic permissions for users to update their own profile fields
GRANT UPDATE (first_name, last_name, job_title, department, telephone, website, mailing_address, organisation) ON users TO authenticated;

-- Simple RLS policy to allow users to update their own records
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Check that the columns were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('first_name', 'last_name', 'job_title', 'department', 'telephone', 'website', 'mailing_address', 'organisation')
ORDER BY column_name;
