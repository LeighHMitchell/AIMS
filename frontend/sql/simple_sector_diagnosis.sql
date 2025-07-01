-- Simple diagnosis for sector percentage issue
-- Run this in Supabase SQL Editor

-- 1. Show your current table columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- 2. Check which percentage column you have
SELECT 
    COUNT(*) FILTER (WHERE column_name = 'percentage') as has_old_percentage,
    COUNT(*) FILTER (WHERE column_name = 'sector_percentage') as has_new_sector_percentage
FROM information_schema.columns
WHERE table_name = 'activity_sectors';

-- 3. Show sample data (works with any schema)
SELECT *
FROM activity_sectors
ORDER BY created_at DESC
LIMIT 5;

-- 4. DIAGNOSIS
WITH schema_check AS (
    SELECT 
        COUNT(*) FILTER (WHERE column_name = 'percentage') > 0 as has_old_schema,
        COUNT(*) FILTER (WHERE column_name = 'sector_percentage') > 0 as has_new_schema
    FROM information_schema.columns
    WHERE table_name = 'activity_sectors'
)
SELECT 
    CASE 
        WHEN has_old_schema AND NOT has_new_schema THEN 
            '❌ You have the OLD schema - This is why percentages show as 0%!'
        WHEN has_new_schema THEN 
            '✅ You have the NEW schema - Check browser console for other errors'
        ELSE 
            '❓ Unexpected schema state'
    END as diagnosis,
    CASE 
        WHEN has_old_schema AND NOT has_new_schema THEN 
            E'The code expects "sector_percentage" but your DB has "percentage"\nRun sql/update_activity_sectors_schema_safe.sql to fix this'
        ELSE 
            'Schema looks correct'
    END as solution
FROM schema_check; 