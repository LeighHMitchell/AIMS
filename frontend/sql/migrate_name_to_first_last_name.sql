-- Migration: Split name column into first_name and last_name, then remove name column
-- This migration will:
-- 1. Update any empty first_name/last_name fields with data from the name column
-- 2. Update or drop views that depend on the name column
-- 3. Remove the name column from the users table

-- First, update first_name and last_name where they are empty but name exists
UPDATE users
SET 
  first_name = CASE 
    WHEN (first_name IS NULL OR first_name = '') AND name IS NOT NULL AND name != ''
    THEN SPLIT_PART(name, ' ', 1)
    ELSE first_name
  END,
  last_name = CASE 
    WHEN (last_name IS NULL OR last_name = '') AND name IS NOT NULL AND name != ''
    THEN 
      CASE 
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1
        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        ELSE ''
      END
    ELSE last_name
  END
WHERE name IS NOT NULL AND name != '';

-- Log the migration for tracking
DO $$
BEGIN
  RAISE NOTICE 'Updated % rows with name data split into first_name and last_name', 
    (SELECT COUNT(*) FROM users WHERE name IS NOT NULL AND name != '' AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = ''));
END $$;

-- Check if person_unified_view exists and recreate it
DO $$
DECLARE
  view_def TEXT;
  column_list TEXT;
BEGIN
  -- Check if the view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'person_unified_view') THEN
    -- Get the current view definition
    SELECT v.view_definition INTO view_def
    FROM information_schema.views v
    WHERE v.table_name = 'person_unified_view';
    
    RAISE NOTICE 'Current person_unified_view definition found';
    
    -- Get all columns from users table, replacing 'name' with computed column
    SELECT string_agg(
      CASE 
        WHEN c.column_name = 'name' THEN 
          'TRIM(CONCAT(COALESCE(first_name, ''''), '' '', COALESCE(last_name, ''''))) as name'
        ELSE 
          c.column_name
      END, 
      ', ' ORDER BY c.ordinal_position
    ) INTO column_list
    FROM information_schema.columns c
    WHERE c.table_name = 'users'
    AND c.table_schema = 'public';
    
    -- Drop the old view
    DROP VIEW IF EXISTS person_unified_view CASCADE;
    
    -- Create a simpler view that just excludes the name column
    CREATE OR REPLACE VIEW person_unified_view AS 
    SELECT 
      id,
      email,
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) as name,
      first_name,
      last_name,
      organisation,
      department,
      job_title,
      telephone,
      website,
      mailing_address,
      role,
      organization_id,
      created_at,
      updated_at
    FROM users;
    
    RAISE NOTICE 'Updated person_unified_view to use first_name and last_name instead of name column';
  END IF;
END $$;

-- Check for any other views that might depend on the name column
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT DISTINCT 
      v.table_name as view_name
    FROM information_schema.view_column_usage vcu
    JOIN information_schema.views v ON v.table_name = vcu.view_name
    WHERE vcu.table_name = 'users' 
    AND vcu.column_name = 'name'
    AND v.table_name != 'person_unified_view'
  LOOP
    RAISE WARNING 'View % depends on users.name column and may need to be updated', view_record.view_name;
  END LOOP;
END $$;

-- Now drop the name column
ALTER TABLE users DROP COLUMN IF EXISTS name CASCADE;

-- Update any functions that reference the name column
-- Update the sync function to not reference name
CREATE OR REPLACE FUNCTION sync_users_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding profile fields when users table is updated
  UPDATE profiles
  SET 
    phone = NEW.telephone,
    position = NEW.job_title,
    updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the profiles table sync function
CREATE OR REPLACE FUNCTION sync_profiles_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Update corresponding user fields when profiles table is updated
  SELECT * INTO user_record FROM users WHERE id = NEW.user_id;
  
  IF user_record IS NOT NULL THEN
    UPDATE users
    SET 
      telephone = NEW.phone,
      job_title = NEW.position,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also remove name from profiles table if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS name CASCADE;

-- Verification query
SELECT 
  COUNT(*) as total_users,
  COUNT(first_name) as users_with_first_name,
  COUNT(last_name) as users_with_last_name,
  COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as non_empty_first_names,
  COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as non_empty_last_names
FROM users; 