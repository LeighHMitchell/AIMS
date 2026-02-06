-- ============================================================================
-- Populate Subnational Breakdowns from Activity Locations
-- ============================================================================
-- This script:
-- 1. Deletes existing subnational breakdowns for activities with locations
-- 2. Creates new breakdowns based on coverage-type activity locations
-- 3. Distributes 100% equally across all distinct locations per activity
-- 4. Uses region-level allocation (from admin_unit field)
-- ============================================================================

-- First, let's preview what activity locations exist
-- Uncomment this SELECT to see the data before running:
/*
SELECT
    al.activity_id,
    a.title_narrative as activity_title,
    al.location_type,
    al.admin_unit,
    al.location_name
FROM activity_locations al
JOIN activities a ON a.id = al.activity_id
WHERE al.location_type = 'coverage'
  AND al.admin_unit IS NOT NULL
  AND al.admin_unit != 'nationwide'
ORDER BY a.title_narrative, al.admin_unit;
*/

-- ============================================================================
-- DIAGNOSTIC: Check for unmapped admin_unit values BEFORE running
-- ============================================================================
-- Run this first to see if there are any admin_unit values not in our mapping
-- If this returns rows, add them to the mapping table below!
/*
SELECT DISTINCT
    al.admin_unit,
    COUNT(*) as usage_count
FROM activity_locations al
WHERE al.location_type = 'coverage'
  AND al.admin_unit IS NOT NULL
  AND al.admin_unit != 'nationwide'
  AND al.admin_unit NOT IN (
      'kachin_state', 'kayah_state', 'kayin_state', 'chin_state',
      'mon_state', 'rakhine_state', 'shan_state',
      'sagaing_region', 'tanintharyi_region', 'bago_region',
      'magway_region', 'mandalay_region', 'yangon_region', 'ayeyarwady_region',
      'naypyidaw', 'naypyidaw_union_territory'
  )
GROUP BY al.admin_unit
ORDER BY al.admin_unit;
*/

-- ============================================================================
-- STEP 1: Create a mapping table for admin_unit -> region details
-- ============================================================================
-- This maps the snake_case admin_unit values to proper region names and pcodes

CREATE TEMP TABLE admin_unit_mapping (
    admin_unit TEXT PRIMARY KEY,
    region_name TEXT NOT NULL,
    st_pcode TEXT NOT NULL,
    allocation_level TEXT DEFAULT 'region'
);

INSERT INTO admin_unit_mapping (admin_unit, region_name, st_pcode) VALUES
    -- States
    ('kachin_state', 'Kachin State', 'MMR001'),
    ('kayah_state', 'Kayah State', 'MMR002'),
    ('kayin_state', 'Kayin State', 'MMR003'),
    ('chin_state', 'Chin State', 'MMR004'),
    ('mon_state', 'Mon State', 'MMR011'),
    ('rakhine_state', 'Rakhine State', 'MMR012'),
    ('shan_state', 'Shan State', 'MMR014'),
    -- Regions
    ('sagaing_region', 'Sagaing Region', 'MMR005'),
    ('tanintharyi_region', 'Tanintharyi Region', 'MMR006'),
    ('bago_region', 'Bago Region', 'MMR007'),
    ('magway_region', 'Magway Region', 'MMR009'),
    ('mandalay_region', 'Mandalay Region', 'MMR010'),
    ('yangon_region', 'Yangon Region', 'MMR013'),
    ('ayeyarwady_region', 'Ayeyarwady Region', 'MMR017'),
    -- Union Territory
    ('naypyidaw', 'Naypyidaw Union Territory', 'MMR018'),
    ('naypyidaw_union_territory', 'Naypyidaw Union Territory', 'MMR018');

-- ============================================================================
-- STEP 2: Preview activities and their location counts (for verification)
-- ============================================================================
-- Uncomment this SELECT to see what will be created:
/*
WITH activity_locations_mapped AS (
    SELECT DISTINCT
        al.activity_id,
        aum.region_name,
        aum.st_pcode,
        aum.allocation_level
    FROM activity_locations al
    JOIN admin_unit_mapping aum ON aum.admin_unit = al.admin_unit
    WHERE al.location_type = 'coverage'
      AND al.admin_unit IS NOT NULL
      AND al.admin_unit != 'nationwide'
),
activity_location_counts AS (
    SELECT
        activity_id,
        COUNT(DISTINCT region_name) as location_count
    FROM activity_locations_mapped
    GROUP BY activity_id
)
SELECT
    a.title_narrative as activity_title,
    alm.region_name,
    ROUND(100.0 / alc.location_count, 2) as percentage,
    alm.st_pcode,
    alm.allocation_level
FROM activity_locations_mapped alm
JOIN activity_location_counts alc ON alc.activity_id = alm.activity_id
JOIN activities a ON a.id = alm.activity_id
ORDER BY a.title_narrative, alm.region_name;
*/

-- ============================================================================
-- STEP 3: Delete existing subnational breakdowns for activities with locations
-- ============================================================================
-- Only delete for activities that have coverage locations we can map

DELETE FROM subnational_breakdowns
WHERE activity_id IN (
    SELECT DISTINCT al.activity_id
    FROM activity_locations al
    JOIN admin_unit_mapping aum ON aum.admin_unit = al.admin_unit
    WHERE al.location_type = 'coverage'
      AND al.admin_unit IS NOT NULL
      AND al.admin_unit != 'nationwide'
);

-- ============================================================================
-- STEP 4: Insert new subnational breakdowns
-- ============================================================================
-- Equal distribution: 100% divided by number of distinct regions/townships
-- With rounding adjustment to ensure sum = exactly 100%

WITH activity_locations_mapped AS (
    -- Get distinct regions per activity (avoid duplicates if same region appears multiple times)
    SELECT DISTINCT
        al.activity_id,
        aum.region_name,
        aum.st_pcode,
        aum.allocation_level
    FROM activity_locations al
    JOIN admin_unit_mapping aum ON aum.admin_unit = al.admin_unit
    WHERE al.location_type = 'coverage'
      AND al.admin_unit IS NOT NULL
      AND al.admin_unit != 'nationwide'
),
activity_location_counts AS (
    -- Count distinct locations per activity for percentage calculation
    SELECT
        activity_id,
        COUNT(DISTINCT region_name) as location_count
    FROM activity_locations_mapped
    GROUP BY activity_id
),
ranked_locations AS (
    -- Rank locations alphabetically within each activity (first one gets the rounding adjustment)
    SELECT
        alm.activity_id,
        alm.region_name,
        alm.st_pcode,
        alm.allocation_level,
        alc.location_count,
        ROW_NUMBER() OVER (PARTITION BY alm.activity_id ORDER BY alm.region_name) as rn
    FROM activity_locations_mapped alm
    JOIN activity_location_counts alc ON alc.activity_id = alm.activity_id
),
breakdown_data AS (
    -- Calculate percentage for each location
    -- First location (alphabetically) gets the rounding remainder to ensure sum = 100%
    SELECT
        rl.activity_id,
        rl.region_name,
        CASE
            WHEN rl.rn = 1 THEN
                -- First location gets: 100 - (base_percentage * (count - 1))
                -- This ensures the total is exactly 100%
                ROUND(100.0 - (FLOOR(10000.0 / rl.location_count) / 100.0 * (rl.location_count - 1)), 2)
            ELSE
                -- Other locations get the base percentage (rounded down)
                ROUND(FLOOR(10000.0 / rl.location_count) / 100.0, 2)
        END as percentage,
        false as is_nationwide,
        rl.allocation_level,
        rl.st_pcode,
        NULL::TEXT as ts_pcode
    FROM ranked_locations rl
)
INSERT INTO subnational_breakdowns (
    activity_id,
    region_name,
    percentage,
    is_nationwide,
    allocation_level,
    st_pcode,
    ts_pcode,
    created_at,
    updated_at
)
SELECT
    activity_id,
    region_name,
    percentage,
    is_nationwide,
    allocation_level,
    st_pcode,
    ts_pcode,
    NOW(),
    NOW()
FROM breakdown_data;

-- ============================================================================
-- STEP 5: Handle nationwide activities separately
-- ============================================================================
-- For activities with 'nationwide' admin_unit, set is_nationwide = true

-- First, delete any existing breakdowns for nationwide activities
DELETE FROM subnational_breakdowns
WHERE activity_id IN (
    SELECT DISTINCT al.activity_id
    FROM activity_locations al
    WHERE al.location_type = 'coverage'
      AND al.admin_unit = 'nationwide'
)
AND activity_id NOT IN (
    -- Don't delete if activity also has non-nationwide locations
    SELECT DISTINCT al.activity_id
    FROM activity_locations al
    JOIN admin_unit_mapping aum ON aum.admin_unit = al.admin_unit
    WHERE al.location_type = 'coverage'
);

-- Insert nationwide entries
INSERT INTO subnational_breakdowns (
    activity_id,
    region_name,
    percentage,
    is_nationwide,
    allocation_level,
    st_pcode,
    ts_pcode,
    created_at,
    updated_at
)
SELECT DISTINCT
    al.activity_id,
    'Nationwide' as region_name,
    100.00 as percentage,
    true as is_nationwide,
    'region' as allocation_level,
    NULL as st_pcode,
    NULL as ts_pcode,
    NOW(),
    NOW()
FROM activity_locations al
WHERE al.location_type = 'coverage'
  AND al.admin_unit = 'nationwide'
  AND al.activity_id NOT IN (
      -- Skip if activity also has non-nationwide locations (those take precedence)
      SELECT DISTINCT al2.activity_id
      FROM activity_locations al2
      JOIN admin_unit_mapping aum ON aum.admin_unit = al2.admin_unit
      WHERE al2.location_type = 'coverage'
  )
ON CONFLICT (activity_id, region_name) DO NOTHING;

-- ============================================================================
-- STEP 6: Verification - Check results
-- ============================================================================
-- Show the new breakdowns grouped by activity

SELECT
    a.title_narrative as activity_title,
    sb.region_name,
    sb.percentage,
    sb.is_nationwide,
    sb.allocation_level,
    sb.st_pcode
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
ORDER BY a.title_narrative, sb.region_name;

-- Summary statistics
SELECT
    'Activities with breakdowns' as metric,
    COUNT(DISTINCT activity_id)::TEXT as value
FROM subnational_breakdowns
UNION ALL
SELECT
    'Total breakdown entries' as metric,
    COUNT(*)::TEXT as value
FROM subnational_breakdowns
UNION ALL
SELECT
    'Activities summing to 100%' as metric,
    COUNT(*)::TEXT as value
FROM (
    SELECT activity_id, SUM(percentage) as total
    FROM subnational_breakdowns
    GROUP BY activity_id
    HAVING ABS(SUM(percentage) - 100) < 0.1
) valid_activities
UNION ALL
SELECT
    'Activities NOT summing to 100%' as metric,
    COUNT(*)::TEXT as value
FROM (
    SELECT activity_id, SUM(percentage) as total
    FROM subnational_breakdowns
    GROUP BY activity_id
    HAVING ABS(SUM(percentage) - 100) >= 0.1
) invalid_activities;

-- ============================================================================
-- STEP 7: Show activities WITHOUT subnational breakdowns
-- ============================================================================
-- These are activities that either:
-- 1. Have no activity_locations at all
-- 2. Have only 'site' type locations (no coverage areas)
-- 3. Have coverage locations but with unmapped admin_unit values

SELECT
    a.id as activity_id,
    a.title_narrative as activity_title,
    a.activity_status,
    CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM activity_locations al WHERE al.activity_id = a.id
        ) THEN 'No activity locations'
        WHEN NOT EXISTS (
            SELECT 1 FROM activity_locations al
            WHERE al.activity_id = a.id AND al.location_type = 'coverage'
        ) THEN 'Only site locations (no coverage)'
        ELSE 'Coverage locations have unmapped admin_unit values'
    END as reason
FROM activities a
WHERE NOT EXISTS (
    SELECT 1 FROM subnational_breakdowns sb WHERE sb.activity_id = a.id
)
ORDER BY a.title_narrative;

-- Drop temp table
DROP TABLE admin_unit_mapping;
