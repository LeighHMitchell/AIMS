-- Add humanitarian flag to activities table
-- IATI Standard: humanitarian attribute indicates if activity relates entirely or partially to humanitarian aid
-- Reference: https://iatistandard.org/en/guidance/standard-guidance/humanitarian/

DO $$ BEGIN
    -- Add humanitarian column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'humanitarian'
    ) THEN
        ALTER TABLE activities 
        ADD COLUMN humanitarian BOOLEAN DEFAULT false;
        
        -- Add comment explaining the field
        COMMENT ON COLUMN activities.humanitarian IS 'IATI humanitarian flag: indicates if activity relates entirely or partially to humanitarian aid (boolean)';
    END IF;
END $$;

