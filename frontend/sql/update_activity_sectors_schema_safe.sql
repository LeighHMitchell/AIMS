-- SAFE VERSION: AIMS Sector Allocation Schema Update
-- This version checks your current schema before migrating

-- First, let's see what columns you currently have
DO $$
DECLARE
    has_percentage_col boolean;
    has_type_col boolean;
    has_category_col boolean;
    backup_count integer;
BEGIN
    -- Check which columns exist in current table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_sectors' AND column_name = 'percentage'
    ) INTO has_percentage_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_sectors' AND column_name = 'type'
    ) INTO has_type_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_sectors' AND column_name = 'category'
    ) INTO has_category_col;
    
    -- Show current schema info
    RAISE NOTICE 'Current schema check:';
    RAISE NOTICE '  - percentage column: %', CASE WHEN has_percentage_col THEN 'EXISTS' ELSE 'NOT FOUND' END;
    RAISE NOTICE '  - type column: %', CASE WHEN has_type_col THEN 'EXISTS' ELSE 'NOT FOUND' END;
    RAISE NOTICE '  - category column: %', CASE WHEN has_category_col THEN 'EXISTS' ELSE 'NOT FOUND' END;
    
    -- Count existing records
    SELECT COUNT(*) INTO backup_count FROM activity_sectors;
    RAISE NOTICE 'Found % existing sector records to migrate', backup_count;
END $$;

-- Create backup of existing data
DROP TABLE IF EXISTS activity_sectors_backup;
CREATE TABLE activity_sectors_backup AS 
SELECT * FROM public.activity_sectors;

-- Drop and recreate with new schema
DROP TABLE IF EXISTS public.activity_sectors CASCADE;

CREATE TABLE public.activity_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  
  -- Category fields (3-digit codes)
  sector_category_code TEXT NOT NULL,
  sector_category_name TEXT NOT NULL,
  category_percentage NUMERIC(5,2) CHECK (category_percentage >= 0 AND category_percentage <= 100),
  
  -- Sector fields (5-digit codes)
  sector_code TEXT NOT NULL,
  sector_name TEXT NOT NULL,
  sector_percentage NUMERIC(5,2) CHECK (sector_percentage >= 0 AND sector_percentage <= 100),
  
  -- Additional fields
  type TEXT DEFAULT 'secondary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique sector per activity
  UNIQUE(activity_id, sector_code)
);

-- Create indexes
CREATE INDEX idx_activity_sectors_activity_id ON public.activity_sectors(activity_id);
CREATE INDEX idx_activity_sectors_sector_code ON public.activity_sectors(sector_code);
CREATE INDEX idx_activity_sectors_category_code ON public.activity_sectors(sector_category_code);

-- Enable RLS
ALTER TABLE public.activity_sectors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "activity_sectors_read_policy" 
ON public.activity_sectors FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "activity_sectors_write_policy" 
ON public.activity_sectors FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.activities 
        WHERE activities.id = activity_sectors.activity_id
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_sectors_updated_at 
BEFORE UPDATE ON public.activity_sectors 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check column existence (define BEFORE using it)
CREATE OR REPLACE FUNCTION column_exists(p_table text, p_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table 
        AND column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

-- Migrate data from backup
DO $$
DECLARE
    migrated_count integer;
    has_percentage boolean;
    has_sector_percentage boolean;
BEGIN
    -- Check if backup exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_sectors_backup') THEN
        
        -- Check which columns exist in backup
        SELECT column_exists('activity_sectors_backup', 'percentage') INTO has_percentage;
        SELECT column_exists('activity_sectors_backup', 'sector_percentage') INTO has_sector_percentage;
        
        -- Build insert based on what columns exist
        IF has_percentage THEN
            -- Old schema with 'percentage' column
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
                COALESCE(sector_name, 'Unknown Sector'),
                percentage, -- Map old percentage to new sector_percentage
                SUBSTRING(sector_code FROM 1 FOR 3),
                'Category ' || SUBSTRING(sector_code FROM 1 FOR 3),
                percentage, -- Same for category
                'secondary',
                COALESCE(created_at, CURRENT_TIMESTAMP)
            FROM activity_sectors_backup
            WHERE sector_code IS NOT NULL;
        ELSIF has_sector_percentage THEN
            -- Already new schema
            INSERT INTO public.activity_sectors
            SELECT * FROM activity_sectors_backup
            WHERE sector_code IS NOT NULL;
        ELSE
            RAISE NOTICE 'No percentage column found in backup - skipping migration';
        END IF;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Successfully migrated % sector records', migrated_count;
        
    ELSE
        RAISE NOTICE 'No backup table found - starting with empty sectors table';
    END IF;
END $$;

-- Clean up
DROP FUNCTION IF EXISTS column_exists(text, text);

-- Grant permissions
GRANT SELECT ON public.activity_sectors TO authenticated;
GRANT ALL ON public.activity_sectors TO service_role;

-- Add comments
COMMENT ON TABLE public.activity_sectors IS 'Stores OECD DAC sector allocations for activities';
COMMENT ON COLUMN public.activity_sectors.sector_category_code IS 'OECD DAC 3-digit category code';
COMMENT ON COLUMN public.activity_sectors.sector_code IS 'OECD DAC 5-digit sector code';

-- Final verification
DO $$
DECLARE
    new_count integer;
BEGIN
    SELECT COUNT(*) INTO new_count FROM activity_sectors;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '   - New table created with enhanced schema';
    RAISE NOTICE '   - % records in new table', new_count;
    RAISE NOTICE '   - Backup preserved in activity_sectors_backup';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Run this to verify: SELECT * FROM activity_sectors LIMIT 5;';
END $$; 