-- Fix activity_locations source check constraint to include 'import'
-- This allows locations imported from IATI XML files

-- Drop the existing constraint
ALTER TABLE activity_locations DROP CONSTRAINT IF EXISTS activity_locations_source_check;

-- Add updated constraint with 'import' included
ALTER TABLE activity_locations ADD CONSTRAINT activity_locations_source_check 
  CHECK (source IN ('map', 'search', 'manual', 'import'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'activity_locations_source_check';

