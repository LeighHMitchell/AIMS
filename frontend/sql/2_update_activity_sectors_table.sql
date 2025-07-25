-- ACTIVITY_SECTORS TABLE UPDATE FOR 3-LEVEL HIERARCHY
-- This script updates the activity_sectors table to support:
-- 1. Sector Groups (3-digit codes like "110" for Education)
-- 2. Sectors (4-digit codes like "1110" for Basic Education) 
-- 3. Sub-sectors (5-digit codes like "11110" for Primary Education)

-- STEP 1: Backup existing data
CREATE TABLE IF NOT EXISTS activity_sectors_backup AS 
SELECT * FROM activity_sectors;

-- STEP 2: Add missing columns to support hierarchy
-- Add columns for sector groups (3-digit codes)
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS sector_group_code text,
ADD COLUMN IF NOT EXISTS sector_group_name text;

-- Add columns for sector categories (4-digit codes) 
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS sector_category_code text,
ADD COLUMN IF NOT EXISTS sector_category_name text,
ADD COLUMN IF NOT EXISTS category_percentage numeric;

-- Add columns for sub-sectors (5-digit codes)
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS sector_subsector_code text,
ADD COLUMN IF NOT EXISTS sector_subsector_name text;

-- Add hierarchy level indicator
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS allocation_level text;

-- Add sector percentage if missing (some schemas have just 'percentage')
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS sector_percentage numeric;

-- Add user tracking
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add type field if missing
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'secondary';

-- Add updated_at if missing
ALTER TABLE activity_sectors 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT CURRENT_TIMESTAMP;

-- STEP 3: Add constraints
-- Ensure allocation_level is valid
ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS check_allocation_level;
ALTER TABLE activity_sectors 
ADD CONSTRAINT check_allocation_level 
CHECK (allocation_level IN ('group', 'sector', 'subsector'));

-- Ensure type is valid
ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS check_type;
ALTER TABLE activity_sectors 
ADD CONSTRAINT check_type 
CHECK (type IN ('primary', 'secondary'));

-- Ensure percentages are valid
ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS check_sector_percentage;
ALTER TABLE activity_sectors 
ADD CONSTRAINT check_sector_percentage 
CHECK (sector_percentage >= 0 AND sector_percentage <= 100);

ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS check_category_percentage;
ALTER TABLE activity_sectors 
ADD CONSTRAINT check_category_percentage 
CHECK (category_percentage >= 0 AND category_percentage <= 100);

-- Legacy percentage column constraint
ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS check_percentage;
ALTER TABLE activity_sectors 
ADD CONSTRAINT check_percentage 
CHECK (percentage >= 0 AND percentage <= 100);

-- STEP 4: Add foreign key for user_id if not exists
ALTER TABLE activity_sectors 
DROP CONSTRAINT IF EXISTS fk_activity_sectors_user;
ALTER TABLE activity_sectors 
ADD CONSTRAINT fk_activity_sectors_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEP 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_allocation_level ON activity_sectors(allocation_level);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_group_code ON activity_sectors(sector_group_code);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_category_code ON activity_sectors(sector_category_code);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_subsector_code ON activity_sectors(sector_subsector_code);
CREATE INDEX IF NOT EXISTS idx_activity_sectors_user_id ON activity_sectors(user_id);

-- STEP 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_activity_sectors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_activity_sectors_updated_at ON activity_sectors;
CREATE TRIGGER trigger_activity_sectors_updated_at
    BEFORE UPDATE ON activity_sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_sectors_updated_at();

-- STEP 7: Add comments for documentation
COMMENT ON TABLE activity_sectors IS 'Sector allocations for activities supporting 3-level hierarchy (Groups, Sectors, Sub-sectors)';
COMMENT ON COLUMN activity_sectors.sector_group_code IS '3-digit DAC group code (e.g., 110 for Education)';
COMMENT ON COLUMN activity_sectors.sector_group_name IS 'Human-readable group name (e.g., Education)';
COMMENT ON COLUMN activity_sectors.sector_category_code IS '4-digit DAC sector code (e.g., 1110 for Basic Education)';
COMMENT ON COLUMN activity_sectors.sector_category_name IS 'Human-readable sector name (e.g., Basic Education)';
COMMENT ON COLUMN activity_sectors.sector_subsector_code IS '5-digit DAC sub-sector code (e.g., 11110 for Primary Education)';
COMMENT ON COLUMN activity_sectors.sector_subsector_name IS 'Human-readable sub-sector name (e.g., Primary Education)';
COMMENT ON COLUMN activity_sectors.allocation_level IS 'Level of allocation: group, sector, or subsector';
COMMENT ON COLUMN activity_sectors.sector_percentage IS 'Percentage allocation for this specific entry';
COMMENT ON COLUMN activity_sectors.category_percentage IS 'Percentage allocation at the category level (for rollup calculations)';
COMMENT ON COLUMN activity_sectors.type IS 'primary: main sector, secondary: additional sector';

-- STEP 8: Migrate existing data if any
-- Copy percentage to sector_percentage if sector_percentage is null
UPDATE activity_sectors 
SET sector_percentage = percentage 
WHERE sector_percentage IS NULL AND percentage IS NOT NULL;

-- Set default allocation_level based on code length if not set
UPDATE activity_sectors 
SET allocation_level = 
    CASE 
        WHEN LENGTH(sector_code) = 3 THEN 'group'
        WHEN LENGTH(sector_code) = 4 THEN 'sector'
        WHEN LENGTH(sector_code) = 5 THEN 'subsector'
        ELSE 'sector'
    END
WHERE allocation_level IS NULL;

-- Extract group codes for existing records
UPDATE activity_sectors 
SET sector_group_code = LEFT(sector_code, 3)
WHERE sector_group_code IS NULL AND sector_code IS NOT NULL;

-- Set category codes for 4+ digit codes
UPDATE activity_sectors 
SET sector_category_code = LEFT(sector_code, 4)
WHERE sector_category_code IS NULL AND LENGTH(sector_code) >= 4;

-- Set subsector codes for 5-digit codes
UPDATE activity_sectors 
SET sector_subsector_code = sector_code
WHERE sector_subsector_code IS NULL AND LENGTH(sector_code) = 5;

-- STEP 9: Show updated schema
SELECT 'Updated table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- STEP 10: Verification
SELECT 'Migration verification:' as info;
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT allocation_level) as distinct_levels,
    COUNT(CASE WHEN allocation_level = 'group' THEN 1 END) as group_records,
    COUNT(CASE WHEN allocation_level = 'sector' THEN 1 END) as sector_records,
    COUNT(CASE WHEN allocation_level = 'subsector' THEN 1 END) as subsector_records
FROM activity_sectors;

SELECT 'Schema update completed successfully!' as status; 