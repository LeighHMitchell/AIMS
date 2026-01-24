-- Fix activity_relationships table to ensure all required columns exist
-- This migration is idempotent and safe to run multiple times

-- Add columns if they don't exist (using DO block for conditional logic)
DO $$
BEGIN
  -- Add external_iati_identifier if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'external_iati_identifier'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN external_iati_identifier VARCHAR(255);
  END IF;

  -- Add external_activity_title if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'external_activity_title'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN external_activity_title TEXT;
  END IF;

  -- Add is_resolved if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'is_resolved'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Make related_activity_id nullable if it isn't already (needed for external links)
ALTER TABLE activity_relationships 
  ALTER COLUMN related_activity_id DROP NOT NULL;

-- Drop the constraint if it exists (to recreate it properly)
ALTER TABLE activity_relationships 
  DROP CONSTRAINT IF EXISTS check_relationship_target;

-- Add the constraint to ensure either internal or external link is set
-- Note: We use a more lenient constraint that allows existing data
ALTER TABLE activity_relationships
  ADD CONSTRAINT check_relationship_target
  CHECK (
    related_activity_id IS NOT NULL OR external_iati_identifier IS NOT NULL
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_activity_relationships_external_iati
  ON activity_relationships(external_iati_identifier)
  WHERE external_iati_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_relationships_unresolved
  ON activity_relationships(is_resolved)
  WHERE is_resolved = FALSE AND external_iati_identifier IS NOT NULL;

-- Add comments
COMMENT ON COLUMN activity_relationships.external_iati_identifier IS
  'IATI identifier of a related activity that does not exist in the database yet';

COMMENT ON COLUMN activity_relationships.external_activity_title IS
  'Title of the external activity (optional, for display purposes)';

COMMENT ON COLUMN activity_relationships.is_resolved IS
  'TRUE if this external link has been resolved to an actual activity in the database';
