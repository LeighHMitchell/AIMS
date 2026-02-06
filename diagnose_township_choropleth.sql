-- ============================================================================
-- Diagnose Township Choropleth Issue
-- ============================================================================

-- 1. Check allocation_level distribution
SELECT
  'Breakdown counts by allocation_level:' as info;
SELECT
  COALESCE(allocation_level, 'NULL') as allocation_level,
  COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- 2. Sample of township-level entries and their region_name format
SELECT
  'Sample township entries (checking region_name format):' as info;
SELECT
  region_name,
  allocation_level,
  percentage,
  ts_pcode,
  st_pcode
FROM subnational_breakdowns
WHERE allocation_level = 'township'
LIMIT 20;

-- 3. Check if region_name contains " - " separator
SELECT
  'Region names that contain " - ":' as info;
SELECT
  region_name,
  SPLIT_PART(region_name, ' - ', 1) as extracted_state,
  SPLIT_PART(region_name, ' - ', 2) as extracted_township
FROM subnational_breakdowns
WHERE allocation_level = 'township'
  AND region_name LIKE '% - %'
LIMIT 20;

-- 4. Check for any township entries WITHOUT the " - " separator
SELECT
  'Township entries WITHOUT " - " separator (potential issue):' as info;
SELECT
  region_name,
  allocation_level,
  ts_pcode
FROM subnational_breakdowns
WHERE allocation_level = 'township'
  AND region_name NOT LIKE '% - %';

-- 5. Check for specific township like Kalaw
SELECT
  'Searching for Kalaw entries:' as info;
SELECT
  region_name,
  allocation_level,
  percentage,
  ts_pcode,
  a.title_narrative
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE region_name ILIKE '%kalaw%'
   OR region_name ILIKE '%MMR014005%';

-- 6. Summary: How many activities have township vs region level
SELECT
  'Activities by allocation level:' as info;
SELECT
  COALESCE(allocation_level, 'region') as level,
  COUNT(DISTINCT activity_id) as activity_count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- 7. Check if there are duplicate townships with different names
SELECT
  'Checking for duplicate ts_pcodes with different region_names:' as info;
SELECT
  ts_pcode,
  COUNT(DISTINCT region_name) as name_count,
  STRING_AGG(DISTINCT region_name, ' | ') as names
FROM subnational_breakdowns
WHERE ts_pcode IS NOT NULL
GROUP BY ts_pcode
HAVING COUNT(DISTINCT region_name) > 1
LIMIT 10;
