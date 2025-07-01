-- Add updated_by column to organizations table
-- This column tracks who last updated the organization record

-- Add the column if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add updated_at timestamp if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
BEFORE UPDATE ON organizations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Comment on the new columns
COMMENT ON COLUMN organizations.updated_by IS 'UUID of the user who last updated this organization';
COMMENT ON COLUMN organizations.updated_at IS 'Timestamp of the last update to this organization'; 