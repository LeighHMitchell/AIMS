-- Manual migration script for adding otherIdentifiers column
-- Run this in the Supabase SQL Editor

-- Add otherIdentifiers column to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS otherIdentifiers JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN activities.otherIdentifiers IS 'Array of other identifier objects: [{"type": "A1", "code": "ORG-123"}, ...]';

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_other_identifiers 
ON activities USING GIN (otherIdentifiers);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name = 'otherIdentifiers';
