-- SIMPLIFY ACTIVITY_SECTORS TABLE
-- The current structure is overly complex and duplicative
-- This simplifies it to match what the frontend actually needs

-- STEP 1: Check current structure
SELECT 'Current overly complex structure:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- STEP 2: Create backup
CREATE TABLE IF NOT EXISTS activity_sectors_complex_backup AS 
SELECT * FROM activity_sectors;

-- STEP 3: Drop the overly complex table and recreate with simple structure
DROP TABLE IF EXISTS activity_sectors CASCADE;

-- STEP 4: Create simplified table that matches frontend needs
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

-- STEP 8: Migrate data from backup if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_sectors_complex_backup') THEN
        -- Migrate data from the complex backup table
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
            activity_id,
            sector_code,
            sector_name,
            COALESCE(sector_percentage, percentage, 0) as percentage,
            COALESCE(allocation_level, 
                CASE 
                    WHEN LENGTH(sector_code) = 3 THEN 'group'
                    WHEN LENGTH(sector_code) = 5 THEN 'subsector'
                    ELSE 'sector'
                END
            ) as level,
            COALESCE(sector_category_code, sector_group_code, LEFT(sector_code, 3)) as category_code,
            COALESCE(sector_category_name, sector_group_name, category_name) as category_name,
            COALESCE(type, 'secondary') as type,
            user_id,
            COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM activity_sectors_complex_backup
        WHERE sector_code IS NOT NULL
        ON CONFLICT (activity_id, sector_code) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from complex backup table';
    END IF;
END $$;

-- STEP 9: Add helpful comments
COMMENT ON TABLE activity_sectors IS 'Simplified sector allocations supporting 3-level hierarchy';
COMMENT ON COLUMN activity_sectors.sector_code IS 'DAC sector code (3, 4, or 5 digits)';
COMMENT ON COLUMN activity_sectors.level IS 'Hierarchy level: group (3-digit), sector (4-digit), subsector (5-digit)';
COMMENT ON COLUMN activity_sectors.category_code IS 'Parent category code (usually first 3 digits)';
COMMENT ON COLUMN activity_sectors.percentage IS 'Percentage allocation for this sector';

-- STEP 10: Show simplified structure
SELECT 'Simplified table structure:' as info;
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
    COUNT(CASE WHEN level = 'subsector' THEN 1 END) as subsector_records
FROM activity_sectors;

SELECT 'Table simplification completed!' as status; 