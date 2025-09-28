-- Migration to extend activity_locations table for IATI v2.03 Location compliance
-- This migration adds all required IATI location fields while maintaining backward compatibility

-- Add IATI-specific columns to activity_locations table
DO $$
BEGIN
    -- Basic location information (already exists but extending)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'address_line1') THEN
        ALTER TABLE activity_locations ADD COLUMN address_line1 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'address_line2') THEN
        ALTER TABLE activity_locations ADD COLUMN address_line2 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'city') THEN
        ALTER TABLE activity_locations ADD COLUMN city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'postal_code') THEN
        ALTER TABLE activity_locations ADD COLUMN postal_code TEXT;
    END IF;

    -- IATI Location fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_reach') THEN
        ALTER TABLE activity_locations ADD COLUMN location_reach SMALLINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'exactness') THEN
        ALTER TABLE activity_locations ADD COLUMN exactness SMALLINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_class') THEN
        ALTER TABLE activity_locations ADD COLUMN location_class SMALLINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'feature_designation') THEN
        ALTER TABLE activity_locations ADD COLUMN feature_designation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_id_vocabulary') THEN
        ALTER TABLE activity_locations ADD COLUMN location_id_vocabulary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_id_code') THEN
        ALTER TABLE activity_locations ADD COLUMN location_id_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_level') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_level SMALLINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_code') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'srs_name') THEN
        ALTER TABLE activity_locations ADD COLUMN srs_name TEXT DEFAULT 'http://www.opengis.net/def/crs/EPSG/0/4326';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'activity_location_description') THEN
        ALTER TABLE activity_locations ADD COLUMN activity_location_description TEXT;
    END IF;

    -- Percentage allocation for multi-location activities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'percentage_allocation') THEN
        ALTER TABLE activity_locations ADD COLUMN percentage_allocation DECIMAL(5,2) CHECK (percentage_allocation >= 0 AND percentage_allocation <= 100);
    END IF;

    -- Validation and metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'validation_status') THEN
        ALTER TABLE activity_locations ADD COLUMN validation_status TEXT CHECK (validation_status IN ('valid', 'warning', 'error'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'source') THEN
        ALTER TABLE activity_locations ADD COLUMN source TEXT CHECK (source IN ('map', 'search', 'manual'));
    END IF;

    -- Sensitive location flag for data protection
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'is_sensitive') THEN
        ALTER TABLE activity_locations ADD COLUMN is_sensitive BOOLEAN DEFAULT FALSE;
    END IF;

    -- Location description narrative (for IATI compliance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_description') THEN
        ALTER TABLE activity_locations ADD COLUMN location_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'country_code') THEN
        ALTER TABLE activity_locations ADD COLUMN country_code CHAR(2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_unit') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_unit TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_area_name') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_area_name TEXT;
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_locations_iati_fields ON activity_locations(
    location_reach,
    exactness,
    location_class,
    feature_designation,
    location_id_vocabulary,
    location_id_code
);

CREATE INDEX IF NOT EXISTS idx_activity_locations_admin ON activity_locations(
    admin_level,
    admin_code
);

CREATE INDEX IF NOT EXISTS idx_activity_locations_percentage ON activity_locations(
    percentage_allocation
) WHERE percentage_allocation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_locations_validation ON activity_locations(
    validation_status
);

CREATE INDEX IF NOT EXISTS idx_activity_locations_source ON activity_locations(
    source
);

-- Add comments for IATI compliance documentation
COMMENT ON COLUMN activity_locations.address_line1 IS 'IATI: location/address/address-line - First line of address';
COMMENT ON COLUMN activity_locations.address_line2 IS 'IATI: location/address/address-line - Second line of address';
COMMENT ON COLUMN activity_locations.city IS 'IATI: location/address/city - City name';
COMMENT ON COLUMN activity_locations.postal_code IS 'IATI: location/address/postal-code - Postal/ZIP code';
COMMENT ON COLUMN activity_locations.location_reach IS 'IATI: location/location-reach/@code - 1=Activity happens here, 2=Beneficiaries live here';
COMMENT ON COLUMN activity_locations.exactness IS 'IATI: location/exactness/@code - 1=Exact, 2=Approximate, 3=Extrapolated';
COMMENT ON COLUMN activity_locations.location_class IS 'IATI: location/location-class/@code - Administrative region, Settlement, Structure, Site, Area';
COMMENT ON COLUMN activity_locations.feature_designation IS 'IATI: location/feature-designation/@code - UN/GeoNames feature designation code';
COMMENT ON COLUMN activity_locations.location_id_vocabulary IS 'IATI: location/location-id/@vocabulary - G1=GeoNames, G2=OpenStreetMap, etc.';
COMMENT ON COLUMN activity_locations.location_id_code IS 'IATI: location/location-id/@code - GeoNames ID, OSM node/way/relation ID';
COMMENT ON COLUMN activity_locations.admin_level IS 'IATI: location/administrative/@level - Administrative division level (0-5)';
COMMENT ON COLUMN activity_locations.admin_code IS 'IATI: location/administrative/@code - Administrative division code';
COMMENT ON COLUMN activity_locations.srs_name IS 'IATI: location/point/@srsName - Spatial Reference System (default: WGS84)';
COMMENT ON COLUMN activity_locations.activity_location_description IS 'IATI: location/activity-description/narrative - Description of activity at this location';
COMMENT ON COLUMN activity_locations.percentage_allocation IS 'IATI: location/percentage - Percentage allocation across multiple locations';
COMMENT ON COLUMN activity_locations.validation_status IS 'Internal: Validation status - valid, warning, error';
COMMENT ON COLUMN activity_locations.source IS 'Internal: How location was created - map, search, manual';
COMMENT ON COLUMN activity_locations.is_sensitive IS 'Internal: Flag for sensitive locations requiring data protection';
COMMENT ON COLUMN activity_locations.location_description IS 'IATI: location/description/narrative - Description of the location itself';

-- Create trigger to enforce percentage allocation constraints
-- Total percentage across all locations for an activity should not exceed 100%
CREATE OR REPLACE FUNCTION validate_location_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total percentage for this activity
    SELECT COALESCE(SUM(percentage_allocation), 0)
    INTO total_percentage
    FROM activity_locations
    WHERE activity_id = NEW.activity_id
    AND id != NEW.id; -- Exclude current record if updating

    -- Add the new/changed percentage
    total_percentage := total_percentage + COALESCE(NEW.percentage_allocation, 0);

    -- Check if total exceeds 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total percentage allocation for activity locations cannot exceed 100%%. Current total would be %%%', total_percentage;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_location_percentages ON activity_locations;

-- Create the trigger
CREATE TRIGGER trigger_validate_location_percentages
    BEFORE INSERT OR UPDATE ON activity_locations
    FOR EACH ROW
    EXECUTE FUNCTION validate_location_percentages();

-- Create function to auto-populate validation status
CREATE OR REPLACE FUNCTION auto_validate_location()
RETURNS TRIGGER AS $$
DECLARE
    has_coords BOOLEAN;
    has_admin_code BOOLEAN;
    has_percentage BOOLEAN;
    validation_result TEXT := 'valid';
BEGIN
    -- Check if location has required elements
    has_coords := (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL);
    has_admin_code := (NEW.location_id_vocabulary IS NOT NULL AND NEW.location_id_code IS NOT NULL);

    -- If it has a gazetteer vocabulary, it should have a code
    IF NEW.location_id_vocabulary IS NOT NULL AND NEW.location_id_code IS NULL THEN
        validation_result := 'error';
    END IF;

    -- If it has coordinates, ensure they're in valid range
    IF has_coords THEN
        IF NEW.latitude < -90 OR NEW.latitude > 90 OR NEW.longitude < -180 OR NEW.longitude > 180 THEN
            validation_result := 'error';
        END IF;
    END IF;

    -- If it has percentage allocation, ensure it's valid
    IF NEW.percentage_allocation IS NOT NULL THEN
        IF NEW.percentage_allocation < 0 OR NEW.percentage_allocation > 100 THEN
            validation_result := 'error';
        END IF;
    END IF;

    -- Set validation status
    NEW.validation_status := validation_result;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_validate_location ON activity_locations;

-- Create the trigger
CREATE TRIGGER trigger_auto_validate_location
    BEFORE INSERT OR UPDATE ON activity_locations
    FOR EACH ROW
    EXECUTE FUNCTION auto_validate_location();

-- Update existing records to have valid validation status
UPDATE activity_locations
SET validation_status = 'valid'
WHERE validation_status IS NULL;

-- Update existing records to have source information
UPDATE activity_locations
SET source = 'manual'
WHERE source IS NULL;

-- Create view for easier querying of IATI-compliant locations
DROP VIEW IF EXISTS iati_compliant_locations;
CREATE VIEW iati_compliant_locations AS
SELECT
    al.id,
    al.activity_id,
    al.location_type,
    al.location_name,
    al.description,
    al.location_description,
    al.activity_location_description,
    al.latitude,
    al.longitude,
    al.address,
    al.location_reach,
    al.exactness,
    al.location_class,
    al.feature_designation,
    al.location_id_vocabulary,
    al.location_id_code,
    al.admin_level,
    al.admin_code,
    al.srs_name,
    al.percentage_allocation,
    al.validation_status,
    al.source,
    al.is_sensitive,
    al.created_at,
    al.updated_at,
    al.created_by,
    al.updated_by,
    CASE
        WHEN al.latitude IS NOT NULL AND al.longitude IS NOT NULL THEN
            json_build_object(
                'latitude', al.latitude,
                'longitude', al.longitude,
                'srsName', al.srs_name
            )
        ELSE NULL
    END AS point_coordinates,
    CASE
        WHEN al.location_id_vocabulary IS NOT NULL AND al.location_id_code IS NOT NULL THEN
            json_build_object(
                'vocabulary', al.location_id_vocabulary,
                'code', al.location_id_code
            )
        ELSE NULL
    END AS location_id,
    CASE
        WHEN al.admin_level IS NOT NULL AND al.admin_code IS NOT NULL THEN
            json_build_object(
                'level', al.admin_level,
                'code', al.admin_code
            )
        ELSE NULL
    END AS administrative
FROM activity_locations al
WHERE al.validation_status IN ('valid', 'warning');
