-- Add locations JSON column to activities table
-- This will store both specificLocations and coverageAreas as JSON

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '{"specificLocations": [], "coverageAreas": []}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN activities.locations IS 'JSON object containing specificLocations and coverageAreas arrays for activity locations';

-- Create index for better performance on location queries
CREATE INDEX IF NOT EXISTS idx_activities_locations ON activities USING GIN (locations);

-- Update existing rows to have the default JSON structure if they have NULL
UPDATE activities 
SET locations = '{"specificLocations": [], "coverageAreas": []}'::jsonb 
WHERE locations IS NULL;