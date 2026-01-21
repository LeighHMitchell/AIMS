-- Add social media fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS youtube TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.twitter IS 'Twitter/X handle or URL';
COMMENT ON COLUMN organizations.facebook IS 'Facebook page handle or URL';
COMMENT ON COLUMN organizations.linkedin IS 'LinkedIn company handle or URL';
COMMENT ON COLUMN organizations.instagram IS 'Instagram handle or URL';
COMMENT ON COLUMN organizations.youtube IS 'YouTube channel handle or URL';
