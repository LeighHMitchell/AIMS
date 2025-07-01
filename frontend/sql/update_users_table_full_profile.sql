-- Migration to update users table with full profile fields
-- Run this after the initial tables are created

-- First, let's see what roles currently exist
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Current roles in users table:';
  FOR r IN SELECT DISTINCT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role
  LOOP
    RAISE NOTICE 'Role: %, Count: %', r.role, r.count;
  END LOOP;
END $$;

-- Add new columns to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS organisation TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- IMPORTANT: Update ALL role values to the new schema BEFORE adding the constraint
UPDATE users
SET role = CASE
  -- Map old roles to new roles
  WHEN role = 'admin' THEN 'super_user'
  WHEN role = 'super_admin' THEN 'super_user'
  WHEN role = 'superuser' THEN 'super_user'
  WHEN role = 'orphan' THEN 'dev_partner_tier_2'
  WHEN role = 'dev_partner' THEN 'dev_partner_tier_1'
  WHEN role = 'government' THEN 'gov_partner_tier_1'
  WHEN role = 'gov_partner' THEN 'gov_partner_tier_1'
  WHEN role = 'partner_government' THEN 'gov_partner_tier_1'
  WHEN role = 'development_partner' THEN 'dev_partner_tier_1'
  -- If role is already valid, keep it
  WHEN role IN ('gov_partner_tier_1', 'gov_partner_tier_2', 'dev_partner_tier_1', 'dev_partner_tier_2', 'super_user') THEN role
  -- Default any unknown roles to tier 2
  ELSE 'dev_partner_tier_2'
END
WHERE role IS NOT NULL;

-- Set a default role for any NULL roles
UPDATE users
SET role = 'dev_partner_tier_2'
WHERE role IS NULL;

-- Now check if all roles are valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM users
  WHERE role NOT IN ('gov_partner_tier_1', 'gov_partner_tier_2', 'dev_partner_tier_1', 'dev_partner_tier_2', 'super_user');
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % users with invalid roles after migration', invalid_count;
  END IF;
END $$;

-- Drop the existing constraint if it exists
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

-- Now add the new constraint (this should work now that all roles are valid)
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
  'gov_partner_tier_1',
  'gov_partner_tier_2', 
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'super_user'
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_organisation ON users(organisation);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update the profiles table to include these fields as well (for consistency)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS organisation TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Function to sync user data to profiles
CREATE OR REPLACE FUNCTION sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when users table is updated
  UPDATE profiles
  SET
    name = COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.name),
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    organisation = NEW.organisation,
    department = NEW.department,
    job_title = NEW.job_title,
    phone = NEW.telephone,
    telephone = NEW.telephone,
    website = NEW.website,
    mailing_address = NEW.mailing_address,
    updated_at = NOW()
  WHERE user_id = NEW.id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO profiles (
      id,
      user_id,
      name,
      first_name,
      last_name,
      organisation,
      department,
      job_title,
      phone,
      telephone,
      website,
      mailing_address
    ) VALUES (
      NEW.id,
      NEW.id,
      COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.name),
      NEW.first_name,
      NEW.last_name,
      NEW.organisation,
      NEW.department,
      NEW.job_title,
      NEW.telephone,
      NEW.telephone,
      NEW.website,
      NEW.mailing_address
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync user updates to profile
DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON users;
CREATE TRIGGER sync_user_to_profile_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_to_profile();

-- Update RLS policies for the new fields
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile fields" ON users;

-- Ensure users can update their own profile fields
CREATE POLICY "Users can update their own profile fields"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Users cannot change their own role
    (OLD.role = NEW.role OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'super_user'
    ))
  );

-- Grant necessary permissions
GRANT SELECT ON users TO authenticated;
GRANT UPDATE (first_name, last_name, organisation, department, job_title, telephone, website, mailing_address) ON users TO authenticated;
GRANT ALL ON users TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN users.first_name IS 'User''s first name';
COMMENT ON COLUMN users.last_name IS 'User''s last name';
COMMENT ON COLUMN users.organisation IS 'User''s organization name';
COMMENT ON COLUMN users.department IS 'Department within the organization';
COMMENT ON COLUMN users.job_title IS 'User''s job title/position';
COMMENT ON COLUMN users.telephone IS 'User''s telephone number';
COMMENT ON COLUMN users.website IS 'User''s professional website';
COMMENT ON COLUMN users.mailing_address IS 'User''s mailing address';
COMMENT ON COLUMN users.role IS 'User role: gov_partner_tier_1, gov_partner_tier_2, dev_partner_tier_1, dev_partner_tier_2, super_user';

-- Display final role distribution
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Final role distribution:';
  FOR r IN SELECT DISTINCT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role
  LOOP
    RAISE NOTICE 'Role: %, Count: %', r.role, r.count;
  END LOOP;
END $$; 