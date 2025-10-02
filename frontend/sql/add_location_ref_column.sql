-- Add location_ref column to activity_locations table
-- This stores the IATI location ref attribute (e.g., AF-KAN, KH-PNH)

DO $$
BEGIN
    -- Add location_ref column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_locations' AND column_name = 'location_ref') THEN
        ALTER TABLE activity_locations ADD COLUMN location_ref TEXT;
        RAISE NOTICE 'Added location_ref column';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Add comment for documentation
COMMENT ON COLUMN activity_locations.location_ref IS 'IATI location reference identifier from the ref attribute (e.g., AF-KAN, KH-PNH)';

-- Verify the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activity_locations' 
AND column_name = 'location_ref'
ORDER BY column_name;

