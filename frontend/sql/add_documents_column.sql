-- Add documents JSON column to activities table
-- This will store IATI document links as JSON array

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN activities.documents IS 'JSON array containing IATI document links with metadata (title, url, format, description, etc.)';

-- Create index for better performance on document queries
CREATE INDEX IF NOT EXISTS idx_activities_documents ON activities USING GIN (documents);

-- Update existing rows to have the default JSON structure if they have NULL
UPDATE activities 
SET documents = '[]'::jsonb 
WHERE documents IS NULL; 