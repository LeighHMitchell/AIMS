-- Add district columns to activity_locations table
-- This migration adds district_name and district_code columns to support the new administrative hierarchy

ALTER TABLE activity_locations 
ADD COLUMN IF NOT EXISTS district_name TEXT,
ADD COLUMN IF NOT EXISTS district_code TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_locations_district_name ON activity_locations(district_name);
CREATE INDEX IF NOT EXISTS idx_activity_locations_district_code ON activity_locations(district_code);

-- Add comments to document the columns
COMMENT ON COLUMN activity_locations.district_name IS 'Name of the district administrative division';
COMMENT ON COLUMN activity_locations.district_code IS 'Code of the district administrative division';
