-- ============================================================================
-- Diagnostic: Examine activity_locations data structure
-- ============================================================================

-- 1. Show all columns in activity_locations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_locations'
ORDER BY ordinal_position;

-- 2. Sample of coverage-type locations (what we used for region-level)
SELECT
    al.id,
    al.activity_id,
    a.title_narrative,
    al.location_type,
    al.location_name,
    al.admin_unit,
    al.coverage_scope,
    al.description
FROM activity_locations al
JOIN activities a ON a.id = al.activity_id
WHERE al.location_type = 'coverage'
LIMIT 20;

-- 3. Sample of site-type locations (have coordinates)
SELECT
    al.id,
    al.activity_id,
    a.title_narrative,
    al.location_type,
    al.location_name,
    al.category,
    al.latitude,
    al.longitude,
    al.description
FROM activity_locations al
JOIN activities a ON a.id = al.activity_id
WHERE al.location_type = 'site'
LIMIT 20;

-- 4. Count by location_type
SELECT
    location_type,
    COUNT(*) as count
FROM activity_locations
GROUP BY location_type;

-- 5. Distinct admin_unit values used
SELECT DISTINCT
    admin_unit,
    COUNT(*) as usage_count
FROM activity_locations
WHERE admin_unit IS NOT NULL
GROUP BY admin_unit
ORDER BY admin_unit;

-- 6. Check if there are any township-like names in location_name for sites
SELECT DISTINCT
    location_name,
    COUNT(*) as count
FROM activity_locations
WHERE location_type = 'site'
GROUP BY location_name
ORDER BY location_name
LIMIT 50;
