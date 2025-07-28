-- Create activity_locations table for normalized location storage
-- This allows multiple locations per activity with proper relational structure

CREATE TABLE IF NOT EXISTS activity_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    
    -- Location type and basic info
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('site', 'coverage')),
    location_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- For site locations (specific coordinates)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    site_type VARCHAR(100), -- e.g., 'office', 'project_site', 'warehouse'
    
    -- For coverage areas
    admin_unit VARCHAR(255), -- e.g., 'Yangon Region', 'Mandalay Township'
    coverage_scope VARCHAR(50) CHECK (coverage_scope IN ('national', 'subnational', 'regional', 'local')),
    
    -- Administrative hierarchy for Myanmar
    state_region_code VARCHAR(10),
    state_region_name VARCHAR(255),
    township_code VARCHAR(10),
    township_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT activity_locations_coords_check 
        CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
    CONSTRAINT activity_locations_site_data_check
        CHECK (location_type != 'site' OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
    CONSTRAINT activity_locations_coverage_data_check
        CHECK (location_type != 'coverage' OR coverage_scope IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_locations_activity_id ON activity_locations(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_locations_type ON activity_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_activity_locations_coords ON activity_locations(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_locations_admin ON activity_locations(state_region_code, township_code);

-- Add comments for documentation
COMMENT ON TABLE activity_locations IS 'Stores location data for activities including both specific sites and coverage areas';
COMMENT ON COLUMN activity_locations.location_type IS 'Type of location: site (specific coordinates) or coverage (administrative area)';
COMMENT ON COLUMN activity_locations.site_type IS 'Category of site location (office, project_site, warehouse, etc.)';
COMMENT ON COLUMN activity_locations.coverage_scope IS 'Scope of coverage area (national, subnational, regional, local)';
COMMENT ON COLUMN activity_locations.admin_unit IS 'Administrative unit name for coverage areas';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_activity_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_locations_updated_at
    BEFORE UPDATE ON activity_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_locations_updated_at();