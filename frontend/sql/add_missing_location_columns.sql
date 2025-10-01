-- Add missing columns for location form
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- Add admin_vocabulary column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'admin_vocabulary') THEN
        ALTER TABLE activity_locations ADD COLUMN admin_vocabulary text;
        RAISE NOTICE 'Added admin_vocabulary column';
    END IF;
    
    -- Add spatial_reference_system column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'spatial_reference_system') THEN
        ALTER TABLE activity_locations ADD COLUMN spatial_reference_system text DEFAULT 'http://www.opengis.net/def/crs/EPSG/0/4326';
        RAISE NOTICE 'Added spatial_reference_system column';
    END IF;
    
    -- Add district_name and district_code columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'district_name') THEN
        ALTER TABLE activity_locations ADD COLUMN district_name text;
        RAISE NOTICE 'Added district_name column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'district_code') THEN
        ALTER TABLE activity_locations ADD COLUMN district_code text;
        RAISE NOTICE 'Added district_code column';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activity_locations' 
AND column_name IN ('admin_vocabulary', 'spatial_reference_system', 'district_name', 'district_code')
ORDER BY column_name;
