-- ============================================================================
-- Debug Choropleth Issue
-- ============================================================================

-- 1. What allocation_levels exist now?
SELECT 'Allocation levels:' as info;
SELECT COALESCE(allocation_level, 'NULL') as level, COUNT(*)
FROM subnational_breakdowns
GROUP BY allocation_level;

-- 2. Sample of township entries - check the region_name format
SELECT 'Sample township entries (region_name format):' as info;
SELECT
  region_name,
  SPLIT_PART(region_name, ' - ', 1) as state_part,
  SPLIT_PART(region_name, ' - ', 2) as township_part,
  percentage,
  ts_pcode
FROM subnational_breakdowns
WHERE allocation_level = 'township'
LIMIT 20;

-- 3. Check if township names match GeoJSON TS property
-- The GeoJSON has TS like "Myitkyina", "Kalaw", etc.
-- The API extracts: SPLIT_PART(region_name, ' - ', 2) which should = TS
SELECT 'Extracted township names (should match GeoJSON TS):' as info;
SELECT DISTINCT
  SPLIT_PART(region_name, ' - ', 2) as extracted_township,
  COUNT(*) as count
FROM subnational_breakdowns
WHERE allocation_level = 'township'
GROUP BY SPLIT_PART(region_name, ' - ', 2)
ORDER BY extracted_township
LIMIT 30;

-- 4. Check for any entries that DON'T have " - " separator
SELECT 'Township entries WITHOUT " - " separator (problematic):' as info;
SELECT region_name, percentage, ts_pcode
FROM subnational_breakdowns
WHERE allocation_level = 'township'
  AND region_name NOT LIKE '% - %';

-- 5. Specifically check for Kalaw
SELECT 'Kalaw entries:' as info;
SELECT
  region_name,
  percentage,
  allocation_level,
  ts_pcode,
  activity_id
FROM subnational_breakdowns
WHERE region_name ILIKE '%kalaw%';

-- 6. Check total count of township breakdowns
SELECT 'Total township breakdown entries:' as info;
SELECT COUNT(*) FROM subnational_breakdowns WHERE allocation_level = 'township';

-- 7. Are activities published? (API only fetches published)
SELECT 'Activities with township breakdowns - publication status:' as info;
SELECT
  a.publication_status,
  COUNT(DISTINCT sb.activity_id) as activity_count
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
GROUP BY a.publication_status;
