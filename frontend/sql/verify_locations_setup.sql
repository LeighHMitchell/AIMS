-- Verification script to check if locations setup is working properly

-- 1. Check if activity_locations table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'activity_locations';

-- 2. If table exists, check its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'activity_locations' 
ORDER BY ordinal_position;

-- 3. Check if there are any location records
SELECT 
    COUNT(*) as total_locations,
    COUNT(CASE WHEN location_type = 'site' THEN 1 END) as site_locations,
    COUNT(CASE WHEN location_type = 'coverage' THEN 1 END) as coverage_locations
FROM activity_locations;

-- 4. Sample data (if any exists)
SELECT 
    id,
    activity_id,
    location_type,
    location_name,
    latitude,
    longitude,
    coverage_scope,
    created_at
FROM activity_locations 
ORDER BY created_at DESC 
LIMIT 5;