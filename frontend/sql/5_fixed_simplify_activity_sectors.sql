-- FIXED SIMPLIFY ACTIVITY_SECTORS TABLE
-- This fixes the circular reference issue in the migration

-- STEP 1: Check if backup exists and show current structure
SELECT 'Current table structure before simplification:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- STEP 2: Create backup with a unique name to avoid conflicts
DROP TABLE IF EXISTS activity_sectors_before_simplify;
CREATE TABLE activity_sectors_before_simplify AS 
SELECT * FROM activity_sectors;

-- STEP 3: Drop the current table and recreate with simplified structure
DROP TABLE IF EXISTS activity_sectors CASCADE;

-- STEP 4: Create the simplified table
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

-- STEP 5: Create indexes
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

-- STEP 7: Enable RLS
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

-- STEP 8: Migrate data from backup (fixed to avoid circular reference)
DO $$
DECLARE
    backup_exists boolean;
    record_count integer := 0;
BEGIN
    -- Check if backup table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'activity_sectors_before_simplify'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- Migrate data from the backup table with explicit column mapping
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
            b.sector_code,
            b.sector_name,
            -- Get percentage from any available column
            COALESCE(
                b.sector_percentage,
                NULLIF(b.percentage, 0),
                0
            ) as percentage,
            -- Determine level from existing data or code length
            COALESCE(
                b.allocation_level,
                CASE 
                    WHEN LENGTH(b.sector_code) = 3 THEN 'group'
                    WHEN LENGTH(b.sector_code) = 5 THEN 'subsector'
                    ELSE 'sector'
                END
            ) as level,
            -- Get category code from various possible sources
            COALESCE(
                b.sector_category_code,
                b.sector_group_code,
                LEFT(b.sector_code, 3)
            ) as category_code,
            -- Get category name from various possible sources
            COALESCE(
                NULLIF(b.sector_category_name, ''),
                NULLIF(b.sector_group_name, ''),
                'Category ' || LEFT(b.sector_code, 3)
            ) as category_name,
            COALESCE(b.type, 'secondary') as type,
            b.user_id,
            COALESCE(b.created_at, CURRENT_TIMESTAMP)
        FROM activity_sectors_before_simplify b
        WHERE b.sector_code IS NOT NULL 
          AND b.activity_id IS NOT NULL
        ON CONFLICT (activity_id, sector_code) DO UPDATE SET
            sector_name = EXCLUDED.sector_name,
            percentage = EXCLUDED.percentage,
            level = EXCLUDED.level,
            category_code = EXCLUDED.category_code,
            category_name = EXCLUDED.category_name,
            type = EXCLUDED.type,
            updated_at = CURRENT_TIMESTAMP;
        
        GET DIAGNOSTICS record_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % records from backup table', record_count;
    ELSE
        RAISE NOTICE 'No backup table found - starting with empty table';
    END IF;
END $$;

-- STEP 9: Add helpful comments
COMMENT ON TABLE activity_sectors IS 'Simplified sector allocations supporting 3-level hierarchy';
COMMENT ON COLUMN activity_sectors.sector_code IS 'DAC sector code (3, 4, or 5 digits)';
COMMENT ON COLUMN activity_sectors.level IS 'Hierarchy level: group (3-digit), sector (4-digit), subsector (5-digit)';
COMMENT ON COLUMN activity_sectors.category_code IS 'Parent category code (usually first 3 digits)';
COMMENT ON COLUMN activity_sectors.percentage IS 'Percentage allocation for this sector';

-- STEP 10: Show simplified structure
SELECT 'NEW simplified table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- STEP 11: Show migration results
SELECT 'Migration results:' as info;
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT level) as distinct_levels,
    COUNT(CASE WHEN level = 'group' THEN 1 END) as group_records,
    COUNT(CASE WHEN level = 'sector' THEN 1 END) as sector_records,
    COUNT(CASE WHEN level = 'subsector' THEN 1 END) as subsector_records,
    COUNT(DISTINCT activity_id) as distinct_activities
FROM activity_sectors;

-- STEP 12: Show sample data
SELECT 'Sample migrated data:' as info;
SELECT 
    activity_id,
    sector_code,
    sector_name,
    percentage,
    level,
    category_code,
    category_name,
    type
FROM activity_sectors 
ORDER BY activity_id, sector_code 
LIMIT 10;

SELECT 'Table simplification completed successfully!' as status; 