-- Add icon column to activities table
ALTER TABLE activities ADD COLUMN icon TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN activities.icon IS 'Base64 encoded project icon image (max 2MB, recommended 512x512px)';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name = 'icon';