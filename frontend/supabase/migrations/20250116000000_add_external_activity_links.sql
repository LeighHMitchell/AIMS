-- Add support for linking to activities that don't exist in the database yet
-- This allows users to save IATI identifiers of related activities
-- and later sync them when those activities are added to the system

ALTER TABLE activity_relationships
  ADD COLUMN IF NOT EXISTS external_iati_identifier VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_activity_title TEXT,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Make related_activity_id nullable to support external links
ALTER TABLE activity_relationships
  ALTER COLUMN related_activity_id DROP NOT NULL;

-- Add check constraint: either related_activity_id OR external_iati_identifier must be set
ALTER TABLE activity_relationships
  ADD CONSTRAINT check_relationship_target
  CHECK (
    (related_activity_id IS NOT NULL AND external_iati_identifier IS NULL) OR
    (related_activity_id IS NULL AND external_iati_identifier IS NOT NULL)
  );

-- Create index for external IATI identifiers for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_relationships_external_iati
  ON activity_relationships(external_iati_identifier)
  WHERE external_iati_identifier IS NOT NULL;

-- Create index for unresolved external links
CREATE INDEX IF NOT EXISTS idx_activity_relationships_unresolved
  ON activity_relationships(is_resolved)
  WHERE is_resolved = FALSE AND external_iati_identifier IS NOT NULL;

COMMENT ON COLUMN activity_relationships.external_iati_identifier IS
  'IATI identifier of a related activity that does not exist in the database yet';

COMMENT ON COLUMN activity_relationships.external_activity_title IS
  'Title of the external activity (optional, for display purposes)';

COMMENT ON COLUMN activity_relationships.is_resolved IS
  'TRUE if this external link has been resolved to an actual activity in the database';
