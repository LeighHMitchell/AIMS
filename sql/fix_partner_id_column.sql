-- Add partner_id column to activities table if it doesn't exist
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS partner_id UUID,
ADD CONSTRAINT fk_activities_partner_id 
  FOREIGN KEY (partner_id) 
  REFERENCES organizations(id) 
  ON DELETE SET NULL;

-- Add comment to explain the column
COMMENT ON COLUMN activities.partner_id IS 'The organization ID of the partner that created this activity - references organizations table';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_partner_id ON activities(partner_id); 