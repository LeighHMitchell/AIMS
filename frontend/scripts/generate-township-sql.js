/**
 * Generate SQL with township bounding boxes for point-in-polygon matching
 * This creates a pure SQL file that can do township lookup without PostGIS
 */

const fs = require('fs');
const path = require('path');

// Calculate bounding box for a polygon
function getBoundingBox(coordinates) {
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === 'number') {
      // This is a point [lng, lat]
      const [lng, lat] = coords;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    } else {
      // This is an array of coords
      coords.forEach(processCoords);
    }
  }

  processCoords(coordinates);
  return { minLng, maxLng, minLat, maxLat };
}

// Calculate centroid for a polygon (approximate)
function getCentroid(bbox) {
  return {
    lng: (bbox.minLng + bbox.maxLng) / 2,
    lat: (bbox.minLat + bbox.maxLat) / 2
  };
}

// Main
const townshipsPath = path.join(__dirname, '../public/myanmar-townships-simplified.geojson');
const townships = JSON.parse(fs.readFileSync(townshipsPath, 'utf8'));

console.log(`Processing ${townships.features.length} townships...`);

const townshipData = townships.features.map(feature => {
  const bbox = getBoundingBox(feature.geometry.coordinates);
  const centroid = getCentroid(bbox);
  const area = (bbox.maxLng - bbox.minLng) * (bbox.maxLat - bbox.minLat);

  return {
    ts_name: feature.properties.TS,
    ts_pcode: feature.properties.TS_PCODE,
    st_name: feature.properties.ST,
    st_pcode: feature.properties.ST_PCODE,
    min_lng: bbox.minLng,
    max_lng: bbox.maxLng,
    min_lat: bbox.minLat,
    max_lat: bbox.maxLat,
    centroid_lng: centroid.lng,
    centroid_lat: centroid.lat,
    area: area
  };
});

// Generate SQL
let sql = `-- ============================================================================
-- Township-level Subnational Breakdowns from Site Locations (Pure SQL)
-- Generated: ${new Date().toISOString()}
-- ============================================================================
-- This SQL maps site locations to townships using bounding box matching
-- and populates subnational_breakdowns at the TOWNSHIP level.
--
-- How it works:
-- 1. Creates a temp table with township bounding boxes
-- 2. Matches site coordinates to township bounding boxes
-- 3. For overlapping boxes, selects the smallest (most specific) match
-- 4. Calculates equal percentage distribution per activity
-- 5. Inserts township-level breakdowns
-- ============================================================================

-- ============================================================================
-- STEP 1: Create township bounding box lookup table
-- ============================================================================

DROP TABLE IF EXISTS tmp_township_bounds;
CREATE TEMP TABLE tmp_township_bounds (
  ts_name TEXT,
  ts_pcode TEXT,
  st_name TEXT,
  st_pcode TEXT,
  min_lng DECIMAL(12,8),
  max_lng DECIMAL(12,8),
  min_lat DECIMAL(12,8),
  max_lat DECIMAL(12,8),
  centroid_lng DECIMAL(12,8),
  centroid_lat DECIMAL(12,8),
  area DECIMAL(20,10)
);

INSERT INTO tmp_township_bounds VALUES
`;

// Add all township bounding boxes
const values = townshipData.map(t =>
  `('${t.ts_name.replace(/'/g, "''")}', '${t.ts_pcode}', '${t.st_name.replace(/'/g, "''")}', '${t.st_pcode}', ${t.min_lng.toFixed(8)}, ${t.max_lng.toFixed(8)}, ${t.min_lat.toFixed(8)}, ${t.max_lat.toFixed(8)}, ${t.centroid_lng.toFixed(8)}, ${t.centroid_lat.toFixed(8)}, ${t.area.toFixed(10)})`
);

sql += values.join(',\n') + ';\n\n';

sql += `-- Create index for faster lookups
CREATE INDEX idx_township_bounds_coords ON tmp_township_bounds(min_lng, max_lng, min_lat, max_lat);

-- ============================================================================
-- STEP 2: Preview site locations and their township matches
-- ============================================================================
-- Uncomment to preview before making changes:
/*
WITH site_township_matches AS (
  SELECT
    al.activity_id,
    al.location_name,
    al.latitude,
    al.longitude,
    tb.ts_name,
    tb.ts_pcode,
    tb.st_name,
    tb.st_pcode,
    tb.area,
    -- Distance from centroid (for tie-breaking)
    SQRT(POWER(al.longitude - tb.centroid_lng, 2) + POWER(al.latitude - tb.centroid_lat, 2)) as dist_from_centroid,
    ROW_NUMBER() OVER (
      PARTITION BY al.id
      ORDER BY tb.area ASC, SQRT(POWER(al.longitude - tb.centroid_lng, 2) + POWER(al.latitude - tb.centroid_lat, 2)) ASC
    ) as match_rank
  FROM activity_locations al
  CROSS JOIN tmp_township_bounds tb
  WHERE al.location_type = 'site'
    AND al.latitude IS NOT NULL
    AND al.longitude IS NOT NULL
    AND al.longitude BETWEEN tb.min_lng AND tb.max_lng
    AND al.latitude BETWEEN tb.min_lat AND tb.max_lat
)
SELECT
  a.title_narrative,
  stm.location_name,
  stm.latitude,
  stm.longitude,
  stm.st_name || ' - ' || stm.ts_name as township,
  stm.ts_pcode
FROM site_township_matches stm
JOIN activities a ON a.id = stm.activity_id
WHERE stm.match_rank = 1
ORDER BY a.title_narrative, stm.ts_name;
*/

-- ============================================================================
-- STEP 3: Map sites to townships (best match = smallest bounding box)
-- ============================================================================

DROP TABLE IF EXISTS tmp_site_townships;
CREATE TEMP TABLE tmp_site_townships AS
WITH site_township_matches AS (
  SELECT
    al.activity_id,
    al.id as location_id,
    al.location_name,
    al.latitude,
    al.longitude,
    tb.ts_name,
    tb.ts_pcode,
    tb.st_name,
    tb.st_pcode,
    tb.area,
    -- Use smallest bounding box and closest to centroid for best match
    ROW_NUMBER() OVER (
      PARTITION BY al.id
      ORDER BY tb.area ASC,
               SQRT(POWER(al.longitude - tb.centroid_lng, 2) + POWER(al.latitude - tb.centroid_lat, 2)) ASC
    ) as match_rank
  FROM activity_locations al
  CROSS JOIN tmp_township_bounds tb
  WHERE al.location_type = 'site'
    AND al.latitude IS NOT NULL
    AND al.longitude IS NOT NULL
    AND al.longitude BETWEEN tb.min_lng AND tb.max_lng
    AND al.latitude BETWEEN tb.min_lat AND tb.max_lat
)
SELECT
  activity_id,
  location_id,
  location_name,
  latitude,
  longitude,
  ts_name,
  ts_pcode,
  st_name,
  st_pcode
FROM site_township_matches
WHERE match_rank = 1;

-- Show mapping results
SELECT 'Sites mapped to townships: ' || COUNT(*)::TEXT as info FROM tmp_site_townships;

-- Show unmapped sites (outside Myanmar or no match)
SELECT 'Unmapped sites: ' || COUNT(*)::TEXT as info
FROM activity_locations al
WHERE al.location_type = 'site'
  AND al.latitude IS NOT NULL
  AND al.longitude IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tmp_site_townships st WHERE st.location_id = al.id
  );

-- ============================================================================
-- STEP 4: Calculate township distribution per activity
-- ============================================================================

DROP TABLE IF EXISTS tmp_activity_townships;
CREATE TEMP TABLE tmp_activity_townships AS
SELECT DISTINCT
  activity_id,
  ts_name,
  ts_pcode,
  st_name,
  st_pcode,
  st_name || ' - ' || ts_name as region_name
FROM tmp_site_townships;

-- Count townships per activity
DROP TABLE IF EXISTS tmp_township_counts;
CREATE TEMP TABLE tmp_township_counts AS
SELECT
  activity_id,
  COUNT(*) as township_count
FROM tmp_activity_townships
GROUP BY activity_id;

-- ============================================================================
-- STEP 5: Delete existing breakdowns for activities with site locations
-- ============================================================================

DELETE FROM subnational_breakdowns
WHERE activity_id IN (SELECT DISTINCT activity_id FROM tmp_activity_townships);

-- ============================================================================
-- STEP 6: Insert township-level breakdowns with equal distribution
-- ============================================================================

WITH ranked_townships AS (
  SELECT
    at.activity_id,
    at.region_name,
    at.ts_pcode,
    at.st_pcode,
    tc.township_count,
    ROW_NUMBER() OVER (PARTITION BY at.activity_id ORDER BY at.region_name) as rn
  FROM tmp_activity_townships at
  JOIN tmp_township_counts tc ON tc.activity_id = at.activity_id
),
breakdown_data AS (
  SELECT
    activity_id,
    region_name,
    ts_pcode,
    st_pcode,
    township_count,
    CASE
      WHEN rn = 1 THEN
        -- First township gets remainder to ensure sum = 100%
        ROUND(100.0 - (FLOOR(10000.0 / township_count) / 100.0 * (township_count - 1)), 2)
      ELSE
        ROUND(FLOOR(10000.0 / township_count) / 100.0, 2)
    END as percentage
  FROM ranked_townships
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
  false,
  'township',
  st_pcode,
  ts_pcode,
  NOW(),
  NOW()
FROM breakdown_data;

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

-- Count by allocation level
SELECT
  'Breakdown counts by level:' as info;
SELECT
  COALESCE(allocation_level, 'region') as level,
  COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- Verify all activities sum to 100%
SELECT
  'Activities with percentage totals:' as info;
SELECT
  a.title_narrative,
  sb.allocation_level,
  COUNT(*) as township_count,
  SUM(sb.percentage) as total_percentage
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.activity_id IN (SELECT DISTINCT activity_id FROM tmp_activity_townships)
GROUP BY a.title_narrative, sb.allocation_level
ORDER BY a.title_narrative;

-- Show sample of new breakdowns
SELECT
  'Sample township breakdowns:' as info;
SELECT
  a.title_narrative,
  sb.region_name,
  sb.percentage,
  sb.ts_pcode
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
ORDER BY a.title_narrative, sb.region_name
LIMIT 30;

-- Cleanup temp tables
DROP TABLE IF EXISTS tmp_township_bounds;
DROP TABLE IF EXISTS tmp_site_townships;
DROP TABLE IF EXISTS tmp_activity_townships;
DROP TABLE IF EXISTS tmp_township_counts;
`;

// Write SQL file
const outputPath = path.join(__dirname, '../..', 'populate_township_breakdowns_sql_only.sql');
fs.writeFileSync(outputPath, sql);

console.log(`\n✅ SQL file generated: ${outputPath}`);
console.log(`\nTownships included: ${townshipData.length}`);
console.log('\nRun this SQL file directly in your database - no Node.js needed!');
