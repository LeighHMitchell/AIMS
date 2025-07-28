-- Enhance activity_locations table for automatic administrative data population
-- This migration adds better indexing and constraints for State/Region and Township data

-- First check if the table exists and the columns are there
DO $$
BEGIN
    -- Add columns if they don't exist (in case table was created without them)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'state_region_code') THEN
        ALTER TABLE activity_locations ADD COLUMN state_region_code VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'state_region_name') THEN
        ALTER TABLE activity_locations ADD COLUMN state_region_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'township_code') THEN
        ALTER TABLE activity_locations ADD COLUMN township_code VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'township_name') THEN
        ALTER TABLE activity_locations ADD COLUMN township_name VARCHAR(255);
    END IF;
END $$;

-- Add better indexes for administrative lookups
CREATE INDEX IF NOT EXISTS idx_activity_locations_state_region ON activity_locations(state_region_code, state_region_name);
CREATE INDEX IF NOT EXISTS idx_activity_locations_township ON activity_locations(township_code, township_name);
CREATE INDEX IF NOT EXISTS idx_activity_locations_admin_hierarchy ON activity_locations(state_region_code, township_code);

-- Add spatial index for coordinate-based lookups (if PostGIS is available)
-- This will help with reverse geocoding performance
CREATE INDEX IF NOT EXISTS idx_activity_locations_spatial ON activity_locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Update comments to reflect automatic population
COMMENT ON COLUMN activity_locations.state_region_code IS 'Myanmar State/Region code - automatically populated from coordinates or manual selection';
COMMENT ON COLUMN activity_locations.state_region_name IS 'Myanmar State/Region name - automatically populated from coordinates or manual selection';
COMMENT ON COLUMN activity_locations.township_code IS 'Myanmar Township code - automatically populated from coordinates or manual selection';
COMMENT ON COLUMN activity_locations.township_name IS 'Myanmar Township name - automatically populated from coordinates or manual selection';

-- Add constraint to ensure administrative data consistency
-- If we have a township, we should also have a state/region
ALTER TABLE activity_locations 
DROP CONSTRAINT IF EXISTS activity_locations_admin_consistency;

ALTER TABLE activity_locations 
ADD CONSTRAINT activity_locations_admin_consistency 
CHECK (
    (township_code IS NULL AND township_name IS NULL) OR 
    (township_code IS NOT NULL AND township_name IS NOT NULL AND state_region_code IS NOT NULL AND state_region_name IS NOT NULL)
);