-- =====================================================
-- FIX CONTACTS DATABASE ISSUES
-- =====================================================
-- Purpose: Fix common issues that prevent contacts from displaying
-- 
-- INSTRUCTIONS:
-- 1. First, get your activity ID from the browser:
--    - Open Activity Editor with your activity
--    - Look at URL: /activities/YOUR-UUID-HERE
--    - Copy the UUID
-- 2. Replace ALL instances of 'YOUR-ACTIVITY-ID-HERE' below with your UUID
-- 3. Run each section ONE AT A TIME in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- SECTION 1: CHECK CURRENT STATE
-- =====================================================

-- See all contacts for the activity
SELECT 
  id,
  first_name,
  last_name,
  email,
  position,
  type,
  display_on_web,
  created_at
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE'
ORDER BY created_at DESC;

-- =====================================================
-- SECTION 2: FIX DISPLAY_ON_WEB FLAG
-- =====================================================
-- Contacts with display_on_web = false or NULL won't show in some views

-- Check how many contacts have display_on_web issues
SELECT 
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN display_on_web = true THEN 1 END) as visible_contacts,
  COUNT(CASE WHEN display_on_web = false OR display_on_web IS NULL THEN 1 END) as hidden_contacts
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE';

-- Fix: Set display_on_web to true for all contacts
UPDATE activity_contacts 
SET display_on_web = true
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE'
  AND (display_on_web = false OR display_on_web IS NULL);

-- Verify fix
SELECT COUNT(*) as now_visible 
FROM activity_contacts 
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE' 
  AND display_on_web = true;

-- =====================================================
-- SECTION 3: FIX MISSING REQUIRED FIELDS
-- =====================================================
-- Contacts must have first_name, last_name, position, and type

-- Check for missing required fields
SELECT 
  id,
  CASE 
    WHEN first_name IS NULL OR first_name = '' THEN 'MISSING first_name'
    ELSE 'OK'
  END as first_name_status,
  CASE 
    WHEN last_name IS NULL OR last_name = '' THEN 'MISSING last_name'
    ELSE 'OK'
  END as last_name_status,
  CASE 
    WHEN position IS NULL OR position = '' THEN 'MISSING position'
    ELSE 'OK'
  END as position_status,
  CASE 
    WHEN type IS NULL OR type = '' THEN 'MISSING type'
    ELSE 'OK'
  END as type_status
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE';

-- Fix: Fill in missing required fields with defaults
UPDATE activity_contacts 
SET 
  first_name = COALESCE(NULLIF(TRIM(first_name), ''), 'Unknown'),
  last_name = COALESCE(NULLIF(TRIM(last_name), ''), 'Contact'),
  position = COALESCE(NULLIF(TRIM(position), ''), 'Not specified'),
  type = COALESCE(NULLIF(TRIM(type), ''), '1')
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE'
  AND (
    first_name IS NULL OR first_name = '' OR
    last_name IS NULL OR last_name = '' OR
    position IS NULL OR position = '' OR
    type IS NULL OR type = ''
  );

-- Verify fix
SELECT 
  id,
  first_name,
  last_name,
  position,
  type
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE';

-- =====================================================
-- SECTION 4: FINAL VERIFICATION
-- =====================================================

-- This should return all your contacts with all fields properly set
SELECT 
  id,
  type,
  first_name,
  middle_name,
  last_name,
  position,
  email,
  phone,
  organisation,
  department,
  job_title,
  website,
  mailing_address,
  display_on_web,
  is_focal_point,
  has_editing_rights,
  created_at
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE'
ORDER BY created_at DESC;

-- Count should match what you expect
SELECT 
  COUNT(*) as total_contacts
FROM activity_contacts
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE';

-- =====================================================
-- NEXT STEPS
-- =====================================================
-- 
-- After running these fixes:
-- 1. Restart your dev server: npm run dev
-- 2. Refresh Activity Editor page
-- 3. Navigate to Contacts tab
-- 4. Contacts should now appear
-- 
-- =====================================================
