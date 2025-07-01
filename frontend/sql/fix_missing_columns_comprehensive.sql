-- Comprehensive fix for missing activity columns
-- This script safely adds missing columns and handles potential issues

-- First, check what columns already exist
DO $$
BEGIN
    -- Add default_aid_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'default_aid_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN default_aid_type TEXT;
        RAISE NOTICE 'Added default_aid_type column';
    ELSE
        RAISE NOTICE 'default_aid_type column already exists';
    END IF;

    -- Add flow_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'flow_type'
    ) THEN
        ALTER TABLE activities ADD COLUMN flow_type TEXT;
        RAISE NOTICE 'Added flow_type column';
    ELSE
        RAISE NOTICE 'flow_type column already exists';
    END IF;

    -- Ensure objectives column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'objectives'
    ) THEN
        ALTER TABLE activities ADD COLUMN objectives TEXT;
        RAISE NOTICE 'Added objectives column';
    ELSE
        RAISE NOTICE 'objectives column already exists';
    END IF;

    -- Ensure target_groups column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'target_groups'
    ) THEN
        ALTER TABLE activities ADD COLUMN target_groups TEXT;
        RAISE NOTICE 'Added target_groups column';
    ELSE
        RAISE NOTICE 'target_groups column already exists';
    END IF;

    -- Ensure icon column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE activities ADD COLUMN icon TEXT;
        RAISE NOTICE 'Added icon column';
    ELSE
        RAISE NOTICE 'icon column already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN activities.default_aid_type IS 'Default aid type for the activity (IATI aid type codes)';
COMMENT ON COLUMN activities.flow_type IS 'Flow type for the activity (IATI flow type codes)';
COMMENT ON COLUMN activities.objectives IS 'Activity objectives description';
COMMENT ON COLUMN activities.target_groups IS 'Target groups/beneficiaries description';
COMMENT ON COLUMN activities.icon IS 'URL or path to activity icon/logo';

-- Grant necessary permissions (adjust role names as needed)
GRANT SELECT, INSERT, UPDATE ON activities TO authenticated;
GRANT SELECT ON activities TO anon;

-- Refresh the schema cache by touching the table
-- This forces Supabase to update its internal schema cache
ALTER TABLE activities ADD COLUMN _temp_refresh BOOLEAN DEFAULT false;
ALTER TABLE activities DROP COLUMN _temp_refresh;

-- Verify all columns are present
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities' 
AND column_name IN ('default_aid_type', 'flow_type', 'objectives', 'target_groups', 'icon')
ORDER BY column_name;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. All required columns are now present.';
END $$; 