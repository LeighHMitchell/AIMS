-- Simple Migration: Consolidate profiles table into users table
-- This version only migrates columns that actually exist

-- Step 1: Check what columns exist in profiles table
DO $$
DECLARE
    column_list TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'profiles';
    
    RAISE NOTICE 'Profiles table has these columns: %', column_list;
END $$;

-- Step 2: Add profile columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reporting_org_id TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 3: Migrate only the data that exists
-- This approach checks each column individually
DO $$
DECLARE
    has_avatar_url BOOLEAN;
    has_bio BOOLEAN;
    has_phone BOOLEAN;
    has_position BOOLEAN;
    has_iati_preferred_language BOOLEAN;
    has_iati_reporting_org_id BOOLEAN;
    has_profile_picture_url BOOLEAN;
    has_iati_default_currency BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') INTO has_avatar_url;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') INTO has_bio;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') INTO has_phone;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'position') INTO has_position;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'iati_preferred_language') INTO has_iati_preferred_language;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'iati_reporting_org_id') INTO has_iati_reporting_org_id;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_picture_url') INTO has_profile_picture_url;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'iati_default_currency') INTO has_iati_default_currency;
    
    -- Update avatar_url
    IF has_avatar_url THEN
        UPDATE users u
        SET avatar_url = COALESCE(u.avatar_url, p.avatar_url)
        FROM profiles p
        WHERE p.user_id = u.id AND p.avatar_url IS NOT NULL;
        RAISE NOTICE 'Migrated avatar_url';
    ELSIF has_profile_picture_url THEN
        UPDATE users u
        SET avatar_url = COALESCE(u.avatar_url, p.profile_picture_url)
        FROM profiles p
        WHERE p.user_id = u.id AND p.profile_picture_url IS NOT NULL;
        RAISE NOTICE 'Migrated profile_picture_url to avatar_url';
    END IF;
    
    -- Update bio
    IF has_bio THEN
        UPDATE users u
        SET bio = COALESCE(u.bio, p.bio)
        FROM profiles p
        WHERE p.user_id = u.id AND p.bio IS NOT NULL;
        RAISE NOTICE 'Migrated bio';
    END IF;
    
    -- Update phone
    IF has_phone THEN
        UPDATE users u
        SET phone = COALESCE(u.phone, u.telephone, p.phone),
            telephone = COALESCE(u.telephone, u.phone, p.phone)
        FROM profiles p
        WHERE p.user_id = u.id AND p.phone IS NOT NULL;
        RAISE NOTICE 'Migrated phone';
    END IF;
    
    -- Update position
    IF has_position THEN
        UPDATE users u
        SET position = COALESCE(u.position, p.position, u.job_title),
            job_title = COALESCE(u.job_title, u.position, p.position)
        FROM profiles p
        WHERE p.user_id = u.id AND p.position IS NOT NULL;
        RAISE NOTICE 'Migrated position';
    END IF;
    
    -- Update preferred_language
    IF has_iati_preferred_language THEN
        UPDATE users u
        SET preferred_language = COALESCE(u.preferred_language, p.iati_preferred_language, 'en')
        FROM profiles p
        WHERE p.user_id = u.id AND p.iati_preferred_language IS NOT NULL;
        RAISE NOTICE 'Migrated iati_preferred_language to preferred_language';
    END IF;
    
    -- Update reporting_org_id
    IF has_iati_reporting_org_id THEN
        UPDATE users u
        SET reporting_org_id = COALESCE(u.reporting_org_id, p.iati_reporting_org_id)
        FROM profiles p
        WHERE p.user_id = u.id AND p.iati_reporting_org_id IS NOT NULL;
        RAISE NOTICE 'Migrated iati_reporting_org_id to reporting_org_id';
    END IF;
    
    RAISE NOTICE 'Migration completed';
END $$;

-- Step 4: Drop triggers that sync between tables
DROP TRIGGER IF EXISTS sync_users_to_profiles ON users;
DROP TRIGGER IF EXISTS sync_profiles_to_users ON profiles;
DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 5: Drop the sync functions
DROP FUNCTION IF EXISTS sync_users_profile_fields();
DROP FUNCTION IF EXISTS sync_profiles_user_fields();
DROP FUNCTION IF EXISTS sync_user_to_profile();
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Step 6: Create updated RLS policies for users table
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

-- Step 7: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Step 8: Show migration summary
SELECT 
    'Users migrated:' as info,
    COUNT(DISTINCT u.id) as count
FROM users u
INNER JOIN profiles p ON p.user_id = u.id
UNION ALL
SELECT 
    'Users with avatar:' as info,
    COUNT(*) as count
FROM users
WHERE avatar_url IS NOT NULL
UNION ALL
SELECT 
    'Users with preferred language:' as info,
    COUNT(*) as count
FROM users
WHERE preferred_language IS NOT NULL;

-- Step 9: Backup reminder
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'The profiles table still exists but is no longer used.';
    RAISE NOTICE 'To remove it after verifying everything works:';
    RAISE NOTICE '  DROP TABLE IF EXISTS profiles CASCADE;';
    RAISE NOTICE '';
    RAISE NOTICE 'To create a backup first:';
    RAISE NOTICE '  CREATE TABLE profiles_backup AS SELECT * FROM profiles;';
    RAISE NOTICE '=====================================================';
END $$; 