-- Combined migration script for activity_locations table
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns with IF NOT EXISTS checks
DO $$
BEGIN
    -- Add address columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'address_line1') THEN
        ALTER TABLE activity_locations ADD COLUMN address_line1 text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'address_line2') THEN
        ALTER TABLE activity_locations ADD COLUMN address_line2 text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'city') THEN
        ALTER TABLE activity_locations ADD COLUMN city text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'postal_code') THEN
        ALTER TABLE activity_locations ADD COLUMN postal_code text;
    END IF;
    
    -- Add IATI-specific columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_reach') THEN
        ALTER TABLE activity_locations ADD COLUMN location_reach smallint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'exactness') THEN
        ALTER TABLE activity_locations ADD COLUMN exactness smallint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_class') THEN
        ALTER TABLE activity_locations ADD COLUMN location_class smallint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'feature_designation') THEN
        ALTER TABLE activity_locations ADD COLUMN feature_designation text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_id_vocabulary') THEN
        ALTER TABLE activity_locations ADD COLUMN location_id_vocabulary text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_id_code') THEN
        ALTER TABLE activity_locations ADD COLUMN location_id_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_level') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_level smallint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_code') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'srs_name') THEN
        ALTER TABLE activity_locations ADD COLUMN srs_name text DEFAULT 'http://www.opengis.net/def/crs/EPSG/0/4326';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'activity_location_description') THEN
        ALTER TABLE activity_locations ADD COLUMN activity_location_description text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'percentage_allocation') THEN
        ALTER TABLE activity_locations ADD COLUMN percentage_allocation numeric(5,2) CHECK (percentage_allocation >= 0 AND percentage_allocation <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'validation_status') THEN
        ALTER TABLE activity_locations ADD COLUMN validation_status text CHECK (validation_status IN ('valid', 'warning', 'error'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'source') THEN
        ALTER TABLE activity_locations ADD COLUMN source text CHECK (source IN ('map', 'search', 'manual'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'is_sensitive') THEN
        ALTER TABLE activity_locations ADD COLUMN is_sensitive boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_description') THEN
        ALTER TABLE activity_locations ADD COLUMN location_description text;
    END IF;
    
    -- Add administrative data columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'state_region_code') THEN
        ALTER TABLE activity_locations ADD COLUMN state_region_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'state_region_name') THEN
        ALTER TABLE activity_locations ADD COLUMN state_region_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'township_code') THEN
        ALTER TABLE activity_locations ADD COLUMN township_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'township_name') THEN
        ALTER TABLE activity_locations ADD COLUMN township_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'country_code') THEN
        ALTER TABLE activity_locations ADD COLUMN country_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_unit') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_unit text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_area_name') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_area_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'village_name') THEN
        ALTER TABLE activity_locations ADD COLUMN village_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'coverage_scope') THEN
        ALTER TABLE activity_locations ADD COLUMN coverage_scope text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'site_type') THEN
        ALTER TABLE activity_locations ADD COLUMN site_type text;
    END IF;
END $$;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_locations_activity_id ON activity_locations(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_locations_location_type ON activity_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_activity_locations_country_code ON activity_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_activity_locations_state_region_code ON activity_locations(state_region_code);
CREATE INDEX IF NOT EXISTS idx_activity_locations_township_code ON activity_locations(township_code);

-- Step 3: Create or replace function to validate percentage allocations
CREATE OR REPLACE FUNCTION validate_location_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage NUMERIC;
BEGIN
    -- Calculate total percentage for the activity
    SELECT COALESCE(SUM(percentage_allocation), 0)
    INTO total_percentage
    FROM activity_locations
    WHERE activity_id = NEW.activity_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Add the new/updated location's percentage
    total_percentage := total_percentage + COALESCE(NEW.percentage_allocation, 0);
    
    -- Raise warning if total exceeds 100
    IF total_percentage > 100 THEN
        RAISE WARNING 'Total percentage allocation for activity % is %. Maximum allowed is 100%%', NEW.activity_id, total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for percentage validation
DROP TRIGGER IF EXISTS trigger_validate_location_percentages ON activity_locations;
CREATE TRIGGER trigger_validate_location_percentages
    BEFORE INSERT OR UPDATE OF percentage_allocation ON activity_locations
    FOR EACH ROW
    EXECUTE FUNCTION validate_location_percentages();

-- Step 5: Create or replace function for auto-validation
CREATE OR REPLACE FUNCTION auto_validate_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Set validation status based on data completeness
    IF NEW.location_type = 'site' THEN
        IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
            NEW.validation_status := 'error';
        ELSIF NEW.exactness IS NULL OR NEW.location_class IS NULL THEN
            NEW.validation_status := 'warning';
        ELSE
            NEW.validation_status := 'valid';
        END IF;
    ELSIF NEW.location_type = 'coverage' THEN
        IF NEW.admin_unit IS NULL THEN
            NEW.validation_status := 'error';
        ELSE
            NEW.validation_status := 'valid';
        END IF;
    ELSE
        NEW.validation_status := 'valid';
    END IF;
    
    -- Validate gazetteer fields
    IF NEW.location_id_vocabulary IS NOT NULL AND NEW.location_id_code IS NULL THEN
        NEW.validation_status := 'error';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for auto-validation
DROP TRIGGER IF EXISTS trigger_auto_validate_location ON activity_locations;
CREATE TRIGGER trigger_auto_validate_location
    BEFORE INSERT OR UPDATE ON activity_locations
    FOR EACH ROW
    EXECUTE FUNCTION auto_validate_location();

-- Step 7: Grant appropriate permissions
GRANT ALL ON activity_locations TO authenticated;
GRANT ALL ON activity_locations TO service_role;

-- Step 8: Verify the schema
DO $$
DECLARE
    missing_columns TEXT[];
    col TEXT;
BEGIN
    -- List of required columns
    missing_columns := ARRAY[]::TEXT[];
    
    -- Check each required column
    FOR col IN SELECT unnest(ARRAY[
        'address_line1', 'address_line2', 'city', 'postal_code',
        'location_reach', 'exactness', 'location_class', 'feature_designation',
        'location_id_vocabulary', 'location_id_code', 'admin_level', 'admin_code',
        'srs_name', 'activity_location_description', 'percentage_allocation',
        'validation_status', 'source', 'is_sensitive', 'location_description',
        'state_region_code', 'state_region_name', 'township_code', 'township_name',
        'country_code', 'admin_unit', 'admin_area_name', 'village_name',
        'coverage_scope', 'site_type'
    ])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'activity_locations' 
                      AND column_name = col) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns are present in activity_locations table';
    END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully. All location fields are now available.' as status;
