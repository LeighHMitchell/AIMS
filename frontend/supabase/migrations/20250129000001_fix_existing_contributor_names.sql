-- Fix existing contributors with "Unknown User" names
-- This migration updates existing contributor records to have proper user names

-- First, let's see what we're working with
SELECT 
  COUNT(*) as total_contributors,
  COUNT(CASE WHEN nominated_by_name = 'Unknown User' THEN 1 END) as unknown_users,
  COUNT(CASE WHEN nominated_by_name IS NULL THEN 1 END) as null_names,
  COUNT(CASE WHEN nominated_by_name NOT IN ('Unknown User', NULL) THEN 1 END) as known_names
FROM activity_contributors;

-- Update contributors with "Unknown User" names by fetching actual user information
-- Only use columns that are guaranteed to exist in most Supabase users tables
UPDATE activity_contributors ac
SET nominated_by_name = COALESCE(
    -- Try to get user name from various possible fields
    CASE 
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
        THEN CONCAT(u.first_name, ' ', u.last_name)
        WHEN u.first_name IS NOT NULL THEN u.first_name
        WHEN u.last_name IS NOT NULL THEN u.last_name
        WHEN u.email IS NOT NULL THEN 
            CASE 
                WHEN u.email LIKE '%@%' THEN split_part(u.email, '@', 1)
                ELSE u.email
            END
        ELSE NULL
    END,
    -- Fallback to user ID if no name available
    CONCAT('User ID: ', u.id::text)
)
FROM users u 
WHERE ac.nominated_by = u.id 
AND (ac.nominated_by_name = 'Unknown User' OR ac.nominated_by_name IS NULL);

-- For any remaining contributors with missing names, set a descriptive fallback
UPDATE activity_contributors 
SET nominated_by_name = CONCAT('User ID: ', nominated_by::text)
WHERE nominated_by IS NOT NULL 
AND (nominated_by_name IS NULL OR nominated_by_name = 'Unknown User');

-- Verify the results
SELECT 
  COUNT(*) as total_contributors,
  COUNT(CASE WHEN nominated_by_name = 'Unknown User' THEN 1 END) as unknown_users,
  COUNT(CASE WHEN nominated_by_name IS NULL THEN 1 END) as null_names,
  COUNT(CASE WHEN nominated_by_name NOT IN ('Unknown User', NULL) THEN 1 END) as known_names
FROM activity_contributors;

-- Show some examples of the updated data
SELECT 
  id,
  organization_id,
  nominated_by,
  nominated_by_name,
  nominated_at
FROM activity_contributors 
ORDER BY nominated_at DESC 
LIMIT 10;
