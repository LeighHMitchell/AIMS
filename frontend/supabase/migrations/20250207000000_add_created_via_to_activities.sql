-- Add created_via field to track how activities were created
-- This helps with analytics and improves UX by showing different workflows

-- Add the column with CHECK constraint
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS created_via TEXT
CHECK (created_via IN ('manual', 'quick_add', 'import'))
DEFAULT 'manual';

-- Add a comment to document the column
COMMENT ON COLUMN activities.created_via IS 'Tracks how the activity was created: manual (full editor), quick_add (quick add modal), or import (IATI/XML import)';

-- Update existing records to have 'manual' as the default
UPDATE activities
SET created_via = 'manual'
WHERE created_via IS NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activities_created_via ON activities(created_via);
