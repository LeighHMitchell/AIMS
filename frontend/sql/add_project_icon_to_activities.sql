-- Add project_icon field to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS project_icon TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN activities.project_icon IS 'URL to the project icon image for the activity'; 