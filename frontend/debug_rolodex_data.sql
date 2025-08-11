-- Debug script to understand current Rolodex data issues
-- Run this to diagnose why users aren't showing and profile pics aren't working

-- 1. Check if person_unified_view exists and what it contains
\d person_unified_view;

-- 2. Check users table structure 
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 3. Check activity_contacts table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activity_contacts' 
ORDER BY ordinal_position;

-- 4. Check if we have any users data
SELECT 
  id, 
  email, 
  COALESCE(first_name, '') as first_name,
  COALESCE(last_name, '') as last_name,
  COALESCE(name, '') as name,
  role,
  avatar_url,
  created_at
FROM users 
LIMIT 5;

-- 5. Check if we have any activity_contacts data
SELECT 
  id,
  first_name,
  last_name,
  email,
  position,
  activity_id,
  profile_photo,
  created_at
FROM activity_contacts 
LIMIT 5;

-- 6. Test the current unified view if it exists
SELECT 
  id,
  source_type,
  name,
  email,
  role_label,
  organization_display_name,
  profile_photo
FROM person_unified_view 
LIMIT 10;

-- 7. Check what the search function returns
SELECT * FROM search_unified_rolodex(
  p_search := NULL,
  p_source_type := NULL,
  p_role := NULL,
  p_organization_id := NULL,
  p_activity_id := NULL,
  p_country_code := NULL,
  p_limit := 10,
  p_offset := 0
);
