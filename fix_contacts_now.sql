-- =====================================================
-- FIX CONTACTS NOW - Immediate Solution
-- =====================================================
-- Activity ID: 634c2682-a81a-4b66-aca2-eb229c0e9581
-- =====================================================

-- STEP 1: See all current contacts (you probably have 5 now)
SELECT 
  id,
  first_name,
  last_name,
  email,
  created_at
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
ORDER BY created_at DESC;

-- Expected: 5 contacts (2 old from 07:47 + 3 new from 12:22)

-- STEP 2: Delete the OLD duplicates (keep the 3 newest)
DELETE FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
AND created_at < '2025-10-12T12:00:00+00:00';

-- This removes contacts created before noon today

-- STEP 3: Verify only 3 contacts remain
SELECT 
  COUNT(*) as total_contacts,
  STRING_AGG(first_name || ' ' || last_name, ', ') as contact_names
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581';

-- Expected: 3 contacts (A. Example, 123 123, BBB BBBB)

-- STEP 4: Check RLS policies (to see why DELETE might be failing)
SELECT 
  policyname,
  cmd as allowed_operations,
  CASE 
    WHEN cmd = 'ALL' THEN 'SELECT, INSERT, UPDATE, DELETE'
    ELSE cmd::text
  END as operations_detail
FROM pg_policies 
WHERE tablename = 'activity_contacts'
ORDER BY policyname;

-- You should see policies that allow DELETE operations

-- =====================================================
-- IF RLS IS BLOCKING DELETES
-- =====================================================
-- Run this to check if there's a specific DELETE policy:

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN 'Includes DELETE'
    WHEN cmd = 'DELETE' THEN 'DELETE only'
    ELSE 'Does NOT include DELETE'
  END as delete_status
FROM pg_policies 
WHERE tablename = 'activity_contacts';

-- If no policy shows "Includes DELETE" or "DELETE only", that's the problem!

-- =====================================================
-- NEXT STEPS
-- =====================================================
-- 1. Run the DELETE query above to clean up duplicates
-- 2. Refresh your Activity Editor
-- 3. All 3 contacts should appear
-- 4. Try adding another contact and watch terminal logs
-- 5. You should see "[Field API] 🗑️ Deleting existing contacts"
-- =====================================================

