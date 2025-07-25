-- SIMPLE ACTIVITY_SECTORS TABLE FIX
-- Run this in your Supabase SQL Editor

-- Step 1: Check current table structure
SELECT 'Checking current table...' as step;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- Step 2: Create backup (if table exists and has data)
CREATE TABLE IF NOT EXISTS activity_sectors_backup_simple AS 
SELECT * FROM activity_sectors WHERE 1=0; -- Create empty table first

-- Insert data into backup if original table has data
INSERT INTO activity_sectors_backup_simple 
SELECT * FROM activity_sectors 
WHERE EXISTS (SELECT 1 FROM activity_sectors LIMIT 1);

-- Step 3: Drop and recreate table with correct structure
DROP TABLE IF EXISTS activity_sectors CASCADE;

CREATE TABLE activity_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Core sector data
  sector_code text NOT NULL,
  sector_name text NOT NULL,
  percentage numeric NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  
  -- Level indicator for hierarchy
  level text CHECK (level IN ('group', 'sector', 'subsector')),
  
  -- Category information
  category_code text,
  category_name text,
  
  -- Metadata
  type text DEFAULT 'secondary' CHECK (type IN ('primary', 'secondary')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(activity_id, sector_code)
);

-- Step 4: Create indexes
CREATE INDEX idx_activity_sectors_activity_id ON activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_sector_code ON activity_sectors(sector_code);
CREATE INDEX idx_activity_sectors_level ON activity_sectors(level);

-- Step 5: Enable RLS
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
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

-- Step 7: Migrate data from backup if it exists (only if backup has data)
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
SELECT 
    b.activity_id,
    b.sector_code,
    COALESCE(b.sector_name, 'Unknown Sector') as sector_name,
    COALESCE(b.percentage, 0) as percentage,
    COALESCE(b.level, 'sector') as level,
    COALESCE(b.category_code, LEFT(b.sector_code, 3)) as category_code,
    COALESCE(b.category_name, 'Category ' || LEFT(b.sector_code, 3)) as category_name,
    COALESCE(b.type, 'secondary') as type,
    b.user_id,
    COALESCE(b.created_at, CURRENT_TIMESTAMP)
FROM activity_sectors_backup_simple b
WHERE b.activity_id IS NOT NULL 
AND b.sector_code IS NOT NULL
AND b.sector_code != ''
AND EXISTS (SELECT 1 FROM activity_sectors_backup_simple LIMIT 1)
ON CONFLICT (activity_id, sector_code) DO UPDATE SET
    sector_name = EXCLUDED.sector_name,
    percentage = EXCLUDED.percentage,
    level = EXCLUDED.level,
    category_code = EXCLUDED.category_code,
    category_name = EXCLUDED.category_name,
    type = EXCLUDED.type,
    updated_at = CURRENT_TIMESTAMP;

-- Step 8: Show final results
SELECT 'Final table structure:' as result_type;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

SELECT 'Final record count:' as result_type;
SELECT COUNT(*) as total_records FROM activity_sectors; 