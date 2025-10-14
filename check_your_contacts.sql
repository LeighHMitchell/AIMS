-- Check contacts for activity: 634c2682-a81a-4b66-aca2-eb229c0e9581

-- See all contacts currently in database
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
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
ORDER BY created_at DESC;

-- Check if any fields are missing
SELECT 
  id,
  first_name,
  last_name,
  position,
  type,
  CASE 
    WHEN first_name IS NULL OR first_name = '' THEN 'MISSING first_name'
    WHEN last_name IS NULL OR last_name = '' THEN 'MISSING last_name'
    WHEN position IS NULL OR position = '' THEN 'MISSING position'
    WHEN type IS NULL OR type = '' THEN 'MISSING type'
    ELSE 'All required fields OK'
  END as validation_status
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581';

-- Fix display_on_web if needed
UPDATE activity_contacts 
SET display_on_web = true
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
  AND (display_on_web = false OR display_on_web IS NULL);

-- Count total
SELECT COUNT(*) as total_contacts
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581';

