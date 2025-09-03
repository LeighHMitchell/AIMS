-- Fix existing contributors with 'Unknown User' by updating their nominated_by_name
-- from the actual user data in the users table

-- Update nominated_by_name for existing records where it's 'Unknown User'
-- but we have a valid nominated_by user ID
UPDATE activity_contributors ac
SET nominated_by_name = COALESCE(
    -- Try name field first (computed field)
    CASE 
        WHEN u.name IS NOT NULL AND TRIM(u.name) != '' 
        THEN TRIM(u.name)
        ELSE NULL
    END,
    -- Try first_name + last_name combination
    CASE 
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
        THEN CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name))
        WHEN u.first_name IS NOT NULL AND TRIM(u.first_name) != ''
        THEN TRIM(u.first_name)
        WHEN u.last_name IS NOT NULL AND TRIM(u.last_name) != ''
        THEN TRIM(u.last_name)
        ELSE NULL
    END,
    -- Try job_title
    CASE 
        WHEN u.job_title IS NOT NULL AND TRIM(u.job_title) != ''
        THEN TRIM(u.job_title)
        ELSE NULL
    END,
    -- Try title
    CASE 
        WHEN u.title IS NOT NULL AND TRIM(u.title) != ''
        THEN TRIM(u.title)
        ELSE NULL
    END,
    -- Try username
    CASE 
        WHEN u.username IS NOT NULL AND TRIM(u.username) != ''
        THEN TRIM(u.username)
        ELSE NULL
    END,
    -- Use email prefix as last resort
    CASE 
        WHEN u.email IS NOT NULL AND TRIM(u.email) != ''
        THEN SPLIT_PART(u.email, '@', 1)
        ELSE NULL
    END,
    'Unknown User'  -- Final fallback
)
FROM users u 
WHERE ac.nominated_by = u.id 
AND (ac.nominated_by_name = 'Unknown User' OR ac.nominated_by_name IS NULL);

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % contributor records with proper user names', updated_count;
END $$;
