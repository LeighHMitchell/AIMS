-- Diagnose why sectors are saving with 0% percentage
-- Run this in Supabase SQL Editor to see what's happening

-- Helper function for column check (define first)
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

-- 1. Check current table structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- 2. Check if we have the old or new column names
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'percentage')
        THEN '❗ OLD SCHEMA: has "percentage" column'
        ELSE '✅ NEW SCHEMA: no "percentage" column'
    END as percentage_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'sector_percentage')
        THEN '✅ NEW SCHEMA: has "sector_percentage" column'
        ELSE '❗ OLD SCHEMA: missing "sector_percentage" column'
    END as sector_percentage_check;

-- 3. Show sample of current data with dynamic column check
DO $$
DECLARE
    has_percentage boolean;
    has_sector_percentage boolean;
BEGIN
    -- Check which columns exist
    SELECT column_exists('activity_sectors', 'percentage') INTO has_percentage;
    SELECT column_exists('activity_sectors', 'sector_percentage') INTO has_sector_percentage;
    
    -- Show appropriate data based on existing columns
    IF has_sector_percentage THEN
        RAISE NOTICE 'Using sector_percentage column (NEW schema)';
        -- This would be for new schema
    ELSIF has_percentage THEN
        RAISE NOTICE 'Using percentage column (OLD schema)';
        -- This would be for old schema
    ELSE
        RAISE NOTICE 'No percentage column found!';
    END IF;
END $$;

-- Show data with simpler approach
SELECT 
    activity_id,
    sector_code,
    sector_name,
    CASE 
        WHEN column_name = 'percentage' THEN percentage::text
        WHEN column_name = 'sector_percentage' THEN sector_percentage::text
        ELSE 'Column not found'
    END as current_percentage,
    created_at
FROM activity_sectors a
CROSS JOIN LATERAL (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'activity_sectors' 
    AND column_name IN ('percentage', 'sector_percentage')
    LIMIT 1
) AS col
ORDER BY created_at DESC
LIMIT 5;

-- Clean up
DROP FUNCTION IF EXISTS column_exists(text, text);

-- 4. DIAGNOSIS SUMMARY
SELECT 
    '🔍 DIAGNOSIS: Your sectors are saving with 0% because:' as diagnosis,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_sectors' AND column_name = 'sector_percentage')
        THEN E'\n❌ The database has the OLD schema with "percentage" column\n❌ But the code is trying to save to "sector_percentage" column\n❌ This mismatch causes the value to default to 0\n\n✅ SOLUTION: Run the migration script sql/update_activity_sectors_schema_safe.sql'
        ELSE E'\n✅ Database has the correct schema\n❓ Check browser console for other errors'
    END as details; 