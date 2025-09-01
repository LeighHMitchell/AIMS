-- Add activity_scope column to activities table
-- This field stores IATI Activity Scope codes (1-8) as defined in IATI Standard v2.03

DO $$ BEGIN
    -- Add activity_scope column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'activity_scope'
    ) THEN
        ALTER TABLE activities 
        ADD COLUMN activity_scope VARCHAR(2) NULL;
        
        -- Add constraint to ensure only valid IATI Activity Scope codes
        ALTER TABLE activities 
        ADD CONSTRAINT activities_activity_scope_check 
        CHECK (activity_scope IS NULL OR activity_scope IN ('1', '2', '3', '4', '5', '6', '7', '8'));
        
        -- Add comment explaining the field
        COMMENT ON COLUMN activities.activity_scope IS 'IATI Activity Scope code: 1=Global, 2=Regional, 3=Multi-national, 4=National, 5=Sub-national multi-first-level, 6=Sub-national single first-level, 7=Sub-national single second-level, 8=Single location';
    END IF;
END $$;