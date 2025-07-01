-- Create activity_locations table for storing both site-specific and broad coverage locations
CREATE TABLE IF NOT EXISTS activity_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('site', 'coverage')),
  
  -- Common fields
  location_name TEXT NOT NULL,
  description TEXT,
  
  -- Site-specific location fields
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  category VARCHAR(100), -- health_site, education_site, etc.
  
  -- Broad coverage fields
  admin_unit VARCHAR(100), -- kachin_state, yangon_region, nationwide, etc.
  coverage_scope VARCHAR(50), -- city_wide, provincial, multi_region, national
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT site_location_coords CHECK (
    (location_type = 'site' AND latitude IS NOT NULL AND longitude IS NOT NULL) OR
    location_type = 'coverage'
  ),
  CONSTRAINT coverage_location_admin CHECK (
    (location_type = 'coverage' AND admin_unit IS NOT NULL) OR
    location_type = 'site'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_activity_locations_activity_id ON activity_locations(activity_id);
CREATE INDEX idx_activity_locations_type ON activity_locations(location_type);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_locations_updated_at BEFORE UPDATE ON activity_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE activity_locations IS 'Stores both site-specific locations (with coordinates) and broad coverage areas for activities';
COMMENT ON COLUMN activity_locations.location_type IS 'Type of location: site (specific coordinates) or coverage (administrative area)';
COMMENT ON COLUMN activity_locations.admin_unit IS 'Administrative unit identifier for broad coverage locations';
COMMENT ON COLUMN activity_locations.category IS 'Category of site location (e.g., health_site, education_site)';