-- Migration: Consolidate profiles table into users table
-- This migration adds profile fields to the users table and migrates data from profiles
-- After this migration, the profiles table will no longer be needed

-- Step 1: Add profile columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reporting_org_id TEXT;

-- Note: These columns might already exist from profiles syncing, but we're being safe
ALTER TABLE users
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Migrate data from profiles to users
-- Only update fields that exist in the profiles table
UPDATE users u
SET 
  avatar_url = COALESCE(u.avatar_url, p.avatar_url),
  bio = COALESCE(u.bio, p.bio),
  phone = COALESCE(u.phone, u.telephone, p.phone),
  telephone = COALESCE(u.telephone, u.phone, p.phone),
  position = COALESCE(u.position, p.position, u.job_title),
  job_title = COALESCE(u.job_title, u.position, p.position),
  preferred_language = CASE 
    WHEN p.iati_preferred_language IS NOT NULL THEN COALESCE(u.preferred_language, p.iati_preferred_language, 'en')
    ELSE COALESCE(u.preferred_language, 'en')
  END,
  reporting_org_id = CASE
    WHEN p.iati_reporting_org_id IS NOT NULL THEN COALESCE(u.reporting_org_id, p.iati_reporting_org_id)
    ELSE u.reporting_org_id
  END
FROM profiles p
WHERE p.user_id = u.id;

-- Step 3: Drop triggers that sync between tables
DROP TRIGGER IF EXISTS sync_users_to_profiles ON users;
DROP TRIGGER IF EXISTS sync_profiles_to_users ON profiles;
DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON users;

-- Step 4: Drop the sync functions
DROP FUNCTION IF EXISTS sync_users_profile_fields();
DROP FUNCTION IF EXISTS sync_profiles_user_fields();
DROP FUNCTION IF EXISTS sync_user_to_profile();

-- Step 5: Create updated RLS policies for users table
-- First drop any existing policies
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own profile fields" ON users;

-- Create new policies
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super users can view all users
CREATE POLICY "Super users can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user'
    )
  );

-- Super users can update all users
CREATE POLICY "Super users can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user'
    )
  );

-- Step 6: Update the handle_new_user function to not create profile records
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- We no longer need to create a profile record
  -- Just return the new user
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Step 8: Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Profile data has been migrated to users table';
  RAISE NOTICE 'Number of users updated: %', (
    SELECT COUNT(*) FROM users u WHERE EXISTS (
      SELECT 1 FROM profiles p WHERE p.user_id = u.id
    )
  );
END $$;

-- Step 9: Backup profiles table before dropping (optional)
-- CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Step 10: Drop the profiles table (commented out for safety - run manually after verification)
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Verification queries (run these manually to check the migration)
-- SELECT COUNT(*) as total_users, 
--        COUNT(avatar_url) as users_with_avatar,
--        COUNT(preferred_language) as users_with_language,
--        COUNT(reporting_org_id) as users_with_reporting_org
-- FROM users; 