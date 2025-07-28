-- Debug script to check locations persistence issues

-- 1. Check if activity_locations table exists
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'activity_locations'
    ) as table_exists;

-- 2. If table exists, check its current data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_locations') THEN
        -- Show table structure
        RAISE NOTICE 'Table structure:';
        PERFORM column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'activity_locations' 
        ORDER BY ordinal_position;
        
        -- Show current data
        RAISE NOTICE 'Current data count:';
        PERFORM COUNT(*) FROM activity_locations;
        
        -- Show recent entries
        RAISE NOTICE 'Recent entries:';
        PERFORM * FROM activity_locations ORDER BY created_at DESC LIMIT 5;
    ELSE
        RAISE NOTICE 'activity_locations table does not exist!';
    END IF;
END $$;

-- 3. Check activities table for location data (in case it's using old structure)
SELECT 
    id,
    title_narrative,
    CASE 
        WHEN locations IS NOT NULL THEN 'HAS LOCATIONS'
        ELSE 'NO LOCATIONS'
    END as locations_status
FROM activities 
WHERE id IN (
    SELECT DISTINCT activity_id 
    FROM activity_locations 
    WHERE activity_id IS NOT NULL
    LIMIT 5
)
ORDER BY updated_at DESC 
LIMIT 5;

-- 4. Check for any orphaned location data
SELECT 
    al.id,
    al.activity_id,
    al.location_name,
    al.location_type,
    al.created_at,
    CASE 
        WHEN a.id IS NULL THEN 'ORPHANED - NO ACTIVITY'
        ELSE 'OK'
    END as status
FROM activity_locations al
LEFT JOIN activities a ON al.activity_id = a.id
ORDER BY al.created_at DESC
LIMIT 10;