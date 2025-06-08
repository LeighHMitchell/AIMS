-- Add cooperation_modality and is_development_partner columns to organizations table

-- Add cooperation_modality column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS cooperation_modality VARCHAR(20);

-- Add is_development_partner column  
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_development_partner BOOLEAN DEFAULT FALSE;

-- Add comment to explain the cooperation_modality values
COMMENT ON COLUMN organizations.cooperation_modality IS 'Cooperation modality: Multilateral, Regional, External, Internal, Global, Other';

-- Add comment to explain the is_development_partner field
COMMENT ON COLUMN organizations.is_development_partner IS 'Whether this organization is considered a development partner';

-- Create index on cooperation_modality for faster filtering
CREATE INDEX IF NOT EXISTS idx_organizations_cooperation_modality ON organizations(cooperation_modality);

-- Create index on is_development_partner for faster filtering  
CREATE INDEX IF NOT EXISTS idx_organizations_is_development_partner ON organizations(is_development_partner); 