-- Ensure activity_contributors table has all required columns for tracking nominations

-- Add organization_name column if it doesn't exist
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Add nominated_by_name column if it doesn't exist
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS nominated_by_name TEXT;

-- Update organization_name for existing records where it's null
UPDATE activity_contributors ac
SET organization_name = o.name 
FROM organizations o 
WHERE ac.organization_id = o.id 
AND ac.organization_name IS NULL;

-- Update nominated_by_name for existing records where it's null
-- Use only columns that we know exist in the users table
UPDATE activity_contributors ac
SET nominated_by_name = COALESCE(
    CASE 
        WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
        THEN CONCAT(u.first_name, ' ', u.last_name)
        WHEN u.first_name IS NOT NULL 
        THEN u.first_name
        WHEN u.last_name IS NOT NULL 
        THEN u.last_name
        ELSE NULL
    END,
    u.email,                                      -- Email as fallback
    CONCAT('User ID: ', u.id::text),             -- ID as last resort
    'Unknown User'                                -- Final fallback
)
FROM users u 
WHERE ac.nominated_by = u.id 
AND (ac.nominated_by_name IS NULL OR ac.nominated_by_name = 'Unknown User');

-- Set default for any remaining nulls
UPDATE activity_contributors 
SET organization_name = 'Unknown Organization' 
WHERE organization_name IS NULL;

UPDATE activity_contributors 
SET nominated_by_name = 'Unknown User' 
WHERE nominated_by_name IS NULL AND nominated_by IS NOT NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_activity_contributors_activity_id 
ON activity_contributors(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_contributors_organization_id 
ON activity_contributors(organization_id);

-- Add a comment to document these columns
COMMENT ON COLUMN activity_contributors.organization_name IS 'Denormalized organization name for performance';
COMMENT ON COLUMN activity_contributors.nominated_by_name IS 'Denormalized name of the user who nominated this contributor';