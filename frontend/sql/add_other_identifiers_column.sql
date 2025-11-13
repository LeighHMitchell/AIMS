-- Add other_identifiers JSONB column to activities table
-- This column stores an array of other identifiers with full IATI structure

-- Check if column exists and add it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'activities'
    AND column_name = 'other_identifiers'
  ) THEN
    ALTER TABLE activities
    ADD COLUMN other_identifiers JSONB DEFAULT '[]'::jsonb;

    COMMENT ON COLUMN activities.other_identifiers IS
    'IATI other-identifier elements with owner-org data. Format: [{code, type, ownerOrg: {narrative, ref, type}}]';

    RAISE NOTICE 'Column other_identifiers added to activities table';
  ELSE
    RAISE NOTICE 'Column other_identifiers already exists';
  END IF;
END $$;

-- Create index for better query performance on JSONB data
CREATE INDEX IF NOT EXISTS idx_activities_other_identifiers
ON activities USING GIN (other_identifiers);

-- Verify the column
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'activities'
  AND column_name = 'other_identifiers';
