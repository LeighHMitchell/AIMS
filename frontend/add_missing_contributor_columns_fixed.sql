-- Add missing columns to activity_contributors table
-- This will add the columns that our application code expects

-- Add organization_name column (denormalized for performance)
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Add nominated_by_name column (denormalized for performance) 
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS nominated_by_name TEXT;

-- Update organization_name for existing records
UPDATE activity_contributors 
SET organization_name = o.name 
FROM organizations o 
WHERE activity_contributors.organization_id = o.id 
AND activity_contributors.organization_name IS NULL;

-- Check what columns exist in the users table first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Update nominated_by_name for existing records
-- We'll try different possible column names for user identification
UPDATE activity_contributors 
SET nominated_by_name = COALESCE(
    u.email,           -- Most likely to exist
    u.username,        -- Common alternative
    u.full_name,       -- Another possibility
    u.first_name || ' ' || u.last_name,  -- If separate name fields
    'User ID: ' || u.id::text,           -- Fallback to ID
    'Unknown User'     -- Final fallback
)
FROM users u 
WHERE activity_contributors.nominated_by = u.id 
AND activity_contributors.nominated_by_name IS NULL;

-- Only make organization_name NOT NULL if we successfully populated it
DO $$
BEGIN
    -- Check if we have any NULL organization_name values
    IF NOT EXISTS (
        SELECT 1 FROM activity_contributors 
        WHERE organization_name IS NULL
    ) THEN
        -- Safe to make it NOT NULL
        ALTER TABLE activity_contributors 
        ALTER COLUMN organization_name SET NOT NULL;
    ELSE
        -- Set a default value for any remaining NULLs
        UPDATE activity_contributors 
        SET organization_name = 'Unknown Organization' 
        WHERE organization_name IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE activity_contributors 
        ALTER COLUMN organization_name SET NOT NULL;
    END IF;
END $$;

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activity_contributors' 
ORDER BY ordinal_position;