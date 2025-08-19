-- Add logo and banner columns to custom_groups table
ALTER TABLE custom_groups 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS banner TEXT;

-- Add comments for documentation
COMMENT ON COLUMN custom_groups.logo IS 'URL path to the group logo image';
COMMENT ON COLUMN custom_groups.banner IS 'URL path to the group banner image';
