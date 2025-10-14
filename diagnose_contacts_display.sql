-- =====================================================
-- CONTACTS DISPLAY DIAGNOSTIC SCRIPT
-- =====================================================
-- Purpose: Diagnose why 2 contacts exist in database but only 1 shows in UI
-- 
-- INSTRUCTIONS:
-- 1. Replace '<ACTIVITY_ID>' with your actual activity UUID
-- 2. Run this script in Supabase SQL Editor
-- 3. Review all output sections
-- =====================================================

-- SECTION 1: DIRECT CONTACT QUERY
-- =====================================================
-- This shows ALL contacts for the activity with full details
SELECT 
  '=== SECTION 1: All Contacts for Activity ===' AS section,
  NULL AS id, NULL AS activity_id, NULL AS type, NULL AS first_name, 
  NULL AS middle_name, NULL AS last_name, NULL AS position, NULL AS job_title,
  NULL AS email, NULL AS phone, NULL AS organisation, NULL AS department,
  NULL AS website, NULL AS mailing_address, NULL AS display_on_web,
  NULL AS is_focal_point, NULL AS has_editing_rights, NULL AS linked_user_id,
  NULL AS created_at, NULL AS updated_at
UNION ALL
SELECT 
  'DATA' AS section,
  id::text, 
  activity_id::text, 
  type, 
  first_name,
  middle_name, 
  last_name, 
  position, 
  job_title,
  email, 
  phone, 
  organisation, 
  department,
  website, 
  mailing_address, 
  display_on_web::text,
  is_focal_point::text, 
  has_editing_rights::text, 
  linked_user_id::text,
  created_at::text, 
  updated_at::text
FROM activity_contacts
WHERE activity_id = '<ACTIVITY_ID>'
ORDER BY section DESC, created_at ASC;

-- SECTION 2: CONTACT COUNT
-- =====================================================
SELECT 
  '=== SECTION 2: Contact Count ===' AS info,
  COUNT(*) AS total_contacts,
  COUNT(CASE WHEN display_on_web = true THEN 1 END) AS display_on_web_true,
  COUNT(CASE WHEN display_on_web = false THEN 1 END) AS display_on_web_false,
  COUNT(CASE WHEN display_on_web IS NULL THEN 1 END) AS display_on_web_null
FROM activity_contacts
WHERE activity_id = '<ACTIVITY_ID>';

-- SECTION 3: CHECK FOR DUPLICATE DETECTION FIELDS
-- =====================================================
-- Contacts with same email+name are considered duplicates by the system
SELECT 
  '=== SECTION 3: Duplicate Detection Analysis ===' AS info,
  LOWER(TRIM(email)) AS normalized_email,
  LOWER(TRIM(first_name)) AS normalized_first_name,
  LOWER(TRIM(last_name)) AS normalized_last_name,
  COUNT(*) AS contact_count,
  STRING_AGG(id::text, ', ') AS contact_ids
FROM activity_contacts
WHERE activity_id = '<ACTIVITY_ID>'
  AND email IS NOT NULL
GROUP BY LOWER(TRIM(email)), LOWER(TRIM(first_name)), LOWER(TRIM(last_name))
HAVING COUNT(*) > 1;

-- SECTION 4: CHECK REQUIRED FIELDS
-- =====================================================
-- Verify all contacts have required NOT NULL fields populated
SELECT 
  '=== SECTION 4: Required Fields Validation ===' AS info,
  id,
  CASE WHEN first_name IS NULL OR first_name = '' THEN 'MISSING' ELSE 'OK' END AS first_name_status,
  CASE WHEN last_name IS NULL OR last_name = '' THEN 'MISSING' ELSE 'OK' END AS last_name_status,
  CASE WHEN position IS NULL OR position = '' THEN 'MISSING' ELSE 'OK' END AS position_status,
  CASE WHEN type IS NULL OR type = '' THEN 'MISSING' ELSE 'OK' END AS type_status
FROM activity_contacts
WHERE activity_id = '<ACTIVITY_ID>';

-- SECTION 5: CHECK LINKED USERS
-- =====================================================
-- Verify linked users exist if contacts have linked_user_id
SELECT 
  '=== SECTION 5: Linked User Verification ===' AS info,
  ac.id AS contact_id,
  ac.first_name || ' ' || ac.last_name AS contact_name,
  ac.linked_user_id,
  CASE 
    WHEN ac.linked_user_id IS NULL THEN 'No linked user'
    WHEN u.id IS NOT NULL THEN 'User exists: ' || u.first_name || ' ' || u.last_name
    ELSE 'ORPHANED - User does not exist!'
  END AS user_status
FROM activity_contacts ac
LEFT JOIN users u ON ac.linked_user_id = u.id
WHERE ac.activity_id = '<ACTIVITY_ID>';

-- SECTION 6: CHECK RLS POLICIES
-- =====================================================
-- Show all Row Level Security policies on activity_contacts table
SELECT 
  '=== SECTION 6: RLS Policies ===' AS info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'activity_contacts';

-- SECTION 7: CHECK ACTIVITY OWNERSHIP
-- =====================================================
-- Verify activity ownership and contributor status
SELECT 
  '=== SECTION 7: Activity Ownership ===' AS info,
  a.id AS activity_id,
  a.title,
  a.created_by AS creator_user_id,
  a.created_by_org AS creator_org_id,
  o.name AS creator_org_name,
  (SELECT COUNT(*) FROM activity_contributors WHERE activity_id = a.id AND status = 'accepted') AS contributor_count
FROM activities a
LEFT JOIN organizations o ON a.created_by_org = o.id
WHERE a.id = '<ACTIVITY_ID>';

-- SECTION 8: COMPARE CONTACTS SIDE-BY-SIDE
-- =====================================================
-- Show contacts with key differentiating fields
SELECT 
  '=== SECTION 8: Contact Comparison ===' AS info,
  ROW_NUMBER() OVER (ORDER BY created_at) AS contact_number,
  SUBSTRING(id::text, 1, 8) || '...' AS short_id,
  first_name || ' ' || last_name AS full_name,
  email,
  type,
  display_on_web,
  is_focal_point,
  has_editing_rights,
  linked_user_id IS NOT NULL AS has_linked_user,
  created_at::date AS created_date
FROM activity_contacts
WHERE activity_id = '<ACTIVITY_ID>'
ORDER BY created_at;

-- =====================================================
-- END OF DIAGNOSTIC SCRIPT
-- =====================================================
-- 
-- INTERPRETATION GUIDE:
-- 
-- Section 1: Shows full raw data for all contacts
-- Section 2: Contact counts - if total_contacts = 2, both exist in DB
-- Section 3: Duplicate detection - if any rows, contacts may merge on import
-- Section 4: Required fields - all should show 'OK'
-- Section 5: Linked users - check for orphaned references
-- Section 6: RLS policies - verify SELECT policy allows viewing
-- Section 7: Activity ownership - helps debug RLS issues
-- Section 8: Side-by-side comparison for quick visual inspection
-- 
-- =====================================================

