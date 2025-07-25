-- Check the current activity_sectors table structure after migration
SELECT 'Current table structure after migration:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activity_sectors'
ORDER BY ordinal_position;

-- Show sample data to understand the structure
SELECT 'Sample data (first 3 records):' as info;
SELECT * FROM activity_sectors LIMIT 3; 