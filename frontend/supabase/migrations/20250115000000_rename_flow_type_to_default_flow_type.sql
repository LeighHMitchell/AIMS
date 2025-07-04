-- Rename flow_type to default_flow_type in activities table
ALTER TABLE activities 
RENAME COLUMN flow_type TO default_flow_type;

-- Update the comment on the renamed column
COMMENT ON COLUMN activities.default_flow_type IS 'Default IATI Flow Type code (e.g., 10 for ODA)';

-- Update any views that reference flow_type
-- Note: This will need to be adjusted based on your actual views
DO $$
BEGIN
    -- Check if any views need updating
    -- You may need to recreate views that reference the old column name
    NULL;
END $$; 