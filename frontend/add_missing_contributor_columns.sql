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

-- Update nominated_by_name for existing records
UPDATE activity_contributors 
SET nominated_by_name = COALESCE(u.name, u.email, 'Unknown User')
FROM users u 
WHERE activity_contributors.nominated_by = u.id 
AND activity_contributors.nominated_by_name IS NULL;

-- Make organization_name NOT NULL after populating it
ALTER TABLE activity_contributors 
ALTER COLUMN organization_name SET NOT NULL;

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activity_contributors' 
ORDER BY ordinal_position;