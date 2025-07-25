-- CHECK AND FIX ACTIVITY_SECTORS TABLE
-- This script checks the current table structure and creates the correct simplified table

-- STEP 1: Check if table exists and show current structure
SELECT 'Checking activity_sectors table...' as info;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activity_sectors'
    ) THEN 'Table exists' 
    ELSE 'Table does NOT exist' 
    END as table_status;

-- Show current columns if table exists
SELECT 'Current table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- Count existing records
SELECT 'Current data count:' as info;
SELECT COUNT(*) as total_records FROM activity_sectors;

-- STEP 2: Create backup of existing data (if table exists and has data)
DO $$
DECLARE
    table_exists boolean;
    record_count integer := 0;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activity_sectors'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Get record count
        SELECT COUNT(*) INTO record_count FROM activity_sectors;
        RAISE NOTICE 'Found % existing records in activity_sectors', record_count;
        
        IF record_count > 0 THEN
            -- Create backup
            DROP TABLE IF EXISTS activity_sectors_backup_fix;
            EXECUTE 'CREATE TABLE activity_sectors_backup_fix AS SELECT * FROM activity_sectors';
            RAISE NOTICE 'Created backup table: activity_sectors_backup_fix';
        END IF;
    END IF;
END $$;

-- STEP 3: Drop existing table and create simplified structure
DROP TABLE IF EXISTS activity_sectors CASCADE;

-- STEP 4: Create the simplified table with correct structure
CREATE TABLE activity_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Core sector data (what frontend actually uses)
  sector_code text NOT NULL,
  sector_name text NOT NULL,
  percentage numeric NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  
  -- Level indicator for 3-level hierarchy
  level text CHECK (level IN ('group', 'sector', 'subsector')),
  
  -- Category information (derived from code or provided)
  category_code text,
  category_name text,
  
  -- Metadata
  type text DEFAULT 'secondary' CHECK (type IN ('primary', 'secondary')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique sector per activity
  UNIQUE(activity_id, sector_code)
);

-- STEP 5: Create indexes for performance
CREATE INDEX idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_sector_code ON activity_sectors(sector_code);
CREATE INDEX idx_activity_sectors_level ON activity_sectors(level);
CREATE INDEX idx_activity_sectors_user_id ON activity_sectors(user_id);

-- STEP 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_activity_sectors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activity_sectors_updated_at
    BEFORE UPDATE ON activity_sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_sectors_updated_at();

-- STEP 7: Enable RLS and create policies
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "activity_sectors_read_policy" 
ON activity_sectors FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "activity_sectors_write_policy" 
ON activity_sectors FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM activities 
        WHERE activities.id = activity_sectors.activity_id
    )
);

-- STEP 8: Migrate data from backup if it exists
DO $$
DECLARE
    backup_exists boolean;
    record_count integer := 0;
    migrated_count integer := 0;
BEGIN
    -- Check if backup table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'activity_sectors_backup_fix'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- Get backup record count
        SELECT COUNT(*) INTO record_count FROM activity_sectors_backup_fix;
        RAISE NOTICE 'Found backup table with % records', record_count;
        
        IF record_count > 0 THEN
            -- Migrate data from backup with robust column mapping
            INSERT INTO activity_sectors (
                activity_id,
                sector_code,
                sector_name,
                percentage,
                level,
                category_code,
                category_name,
                type,
                user_id,
                created_at
            )
            SELECT DISTINCT
                b.activity_id,
                COALESCE(b.sector_code, b.code) as sector_code,
                COALESCE(b.sector_name, b.name) as sector_name,
                COALESCE(
                    b.percentage, 
                    b.sector_percentage, 
                    b.category_percentage, 
                    0
                ) as percentage,
                COALESCE(
                    b.level,
                    b.allocation_level,
                    CASE 
                        WHEN LENGTH(COALESCE(b.sector_code, b.code, '')) = 3 THEN 'group'
                        WHEN LENGTH(COALESCE(b.sector_code, b.code, '')) = 5 THEN 'subsector'
                        ELSE 'sector'
                    END
                ) as level,
                COALESCE(
                    b.category_code,
                    b.sector_category_code,
                    b.sector_group_code,
                    LEFT(COALESCE(b.sector_code, b.code, ''), 3)
                ) as category_code,
                COALESCE(
                    b.category_name,
                    b.sector_category_name,
                    b.sector_group_name,
                    'Category ' || LEFT(COALESCE(b.sector_code, b.code, ''), 3)
                ) as category_name,
                COALESCE(b.type, 'secondary') as type,
                b.user_id,
                COALESCE(b.created_at, CURRENT_TIMESTAMP)
            FROM activity_sectors_backup_fix b
            WHERE b.activity_id IS NOT NULL 
            AND COALESCE(b.sector_code, b.code) IS NOT NULL
            ON CONFLICT (activity_id, sector_code) DO UPDATE SET
                sector_name = EXCLUDED.sector_name,
                percentage = EXCLUDED.percentage,
                level = EXCLUDED.level,
                category_code = EXCLUDED.category_code,
                category_name = EXCLUDED.category_name,
                type = EXCLUDED.type,
                updated_at = CURRENT_TIMESTAMP;
            
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE 'Successfully migrated % records from backup', migrated_count;
        END IF;
    ELSE
        RAISE NOTICE 'No backup table found - starting with empty activity_sectors table';
    END IF;
END $$;

-- STEP 9: Show final table structure
SELECT 'Final table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

SELECT 'Final data count:' as info;
SELECT COUNT(*) as total_records FROM activity_sectors;

-- Final completion notice
DO $$
BEGIN
    RAISE NOTICE 'Activity sectors table setup complete!';
END $$; 