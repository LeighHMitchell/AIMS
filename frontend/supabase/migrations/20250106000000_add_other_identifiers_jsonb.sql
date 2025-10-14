-- Add other_identifiers JSONB column to activities table
-- This column stores an array of other identifier objects with type, code, and optional owner-org data
-- Format: [{"type": "A1", "code": "ABC123", "ownerOrg": {"ref": "AA-AAA-123456789", "narrative": "Organisation name"}}]

-- Add the new column if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS other_identifiers JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN activities.other_identifiers IS 'Array of other identifiers for this activity (IATI other-identifier elements). Format: [{"type": "A1", "code": "ABC123", "ownerOrg": {"ref": "...", "narrative": "..."}}]';

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_activities_other_identifiers ON activities USING gin (other_identifiers);

