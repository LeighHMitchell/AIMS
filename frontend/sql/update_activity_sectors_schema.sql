-- AIMS Sector Allocation Schema Update
-- This migration updates the activity_sectors table to support full OECD DAC sector tracking
-- with both sector categories (3-digit) and sub-sectors (5-digit) with independent percentage splits

-- Step 1: Backup existing data if any
CREATE TABLE IF NOT EXISTS activity_sectors_backup AS 
SELECT * FROM public.activity_sectors;

-- Step 2: Drop existing table and recreate with new schema
DROP TABLE IF EXISTS public.activity_sectors CASCADE;

-- Step 3: Create new table with full DAC sector tracking
CREATE TABLE public.activity_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  
  -- Category fields (3-digit codes)
  sector_category_code TEXT NOT NULL,         -- e.g. "112"
  sector_category_name TEXT NOT NULL,         -- e.g. "Basic Education"
  category_percentage NUMERIC(5,2) CHECK (category_percentage >= 0 AND category_percentage <= 100),
  
  -- Sector fields (5-digit codes)
  sector_code TEXT NOT NULL,                  -- e.g. "11220"
  sector_name TEXT NOT NULL,                  -- e.g. "Primary education"
  sector_percentage NUMERIC(5,2) CHECK (sector_percentage >= 0 AND sector_percentage <= 100),
  
  -- Additional fields
  type TEXT DEFAULT 'secondary',              -- "primary" or "secondary"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique sector per activity
  UNIQUE(activity_id, sector_code)
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_activity_sectors_activity_id ON public.activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_sector_code ON public.activity_sectors(sector_code);
CREATE INDEX idx_activity_sectors_category_code ON public.activity_sectors(sector_category_code);

-- Step 5: Enable Row Level Security
ALTER TABLE public.activity_sectors ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Allow all authenticated users to read
CREATE POLICY "activity_sectors_read_policy" 
ON public.activity_sectors FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to insert/update/delete sectors for activities they can edit
CREATE POLICY "activity_sectors_write_policy" 
ON public.activity_sectors FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.activities 
        WHERE activities.id = activity_sectors.activity_id
    )
);

-- Step 7: Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create trigger for updated_at
CREATE TRIGGER update_activity_sectors_updated_at 
BEFORE UPDATE ON public.activity_sectors 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Migrate data from backup if it exists
-- Note: This migration assumes we don't have category data in the old table
-- so we'll derive it from the sector code (first 3 digits)
DO $$
BEGIN
    -- Check if backup table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_sectors_backup') 
       AND EXISTS (SELECT 1 FROM activity_sectors_backup LIMIT 1) THEN
        
        -- Migrate data with safe column handling
        INSERT INTO public.activity_sectors (
            id, 
            activity_id, 
            sector_code, 
            sector_name, 
            sector_percentage,
            sector_category_code,
            sector_category_name,
            category_percentage,
            type,
            created_at
        )
        SELECT 
            id,
            activity_id,
            sector_code,
            COALESCE(sector_name, 'Unknown Sector') as sector_name,
            COALESCE(percentage, 0) as sector_percentage,
            SUBSTRING(sector_code FROM 1 FOR 3) as sector_category_code,
            'Category ' || SUBSTRING(sector_code FROM 1 FOR 3) as sector_category_name,
            COALESCE(percentage, 0) as category_percentage,
            'secondary' as type,  -- Default value since old schema likely doesn't have this
            COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
        FROM activity_sectors_backup;
        
        RAISE NOTICE 'Migrated % rows from activity_sectors_backup', (SELECT COUNT(*) FROM activity_sectors_backup);
    ELSE
        RAISE NOTICE 'No data to migrate from activity_sectors_backup';
    END IF;
END $$;

-- Step 10: Grant permissions
GRANT SELECT ON public.activity_sectors TO authenticated;
GRANT ALL ON public.activity_sectors TO service_role;

-- Step 11: Add helpful comments
COMMENT ON TABLE public.activity_sectors IS 'Stores OECD DAC sector allocations for activities with support for both 3-digit categories and 5-digit sub-sectors';
COMMENT ON COLUMN public.activity_sectors.sector_category_code IS 'OECD DAC 3-digit category code (e.g., 112 for Basic Education)';
COMMENT ON COLUMN public.activity_sectors.sector_code IS 'OECD DAC 5-digit sector code (e.g., 11220 for Primary Education)';
COMMENT ON COLUMN public.activity_sectors.category_percentage IS 'Percentage allocation at the category level (3-digit)';
COMMENT ON COLUMN public.activity_sectors.sector_percentage IS 'Percentage allocation at the sector level (5-digit)';

-- Verification queries
SELECT 'Schema update completed successfully' as status;

-- Show new table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position; 