-- Add otherIdentifiers column to activities table
-- This stores an array of other identifier objects with type and code
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS otherIdentifiers JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN activities.otherIdentifiers IS 'Array of other identifier objects: [{"type": "A1", "code": "ORG-123"}, ...]';

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_other_identifiers 
ON activities USING GIN (otherIdentifiers);
