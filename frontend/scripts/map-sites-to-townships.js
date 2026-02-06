/**
 * Map Site Locations to Townships
 *
 * This script:
 * 1. Reads site locations from a JSON export (you'll need to export from DB first)
 * 2. Loads township GeoJSON boundaries
 * 3. Does point-in-polygon matching to find which township each site is in
 * 4. Generates SQL to populate subnational_breakdowns at township level
 *
 * Usage:
 * 1. First export site locations from DB:
 *    Run this SQL and save output as site_locations.json:
 *
 *    SELECT json_agg(row_to_json(t))
 *    FROM (
 *      SELECT
 *        al.activity_id,
 *        al.latitude,
 *        al.longitude,
 *        al.location_name,
 *        a.title_narrative as activity_title
 *      FROM activity_locations al
 *      JOIN activities a ON a.id = al.activity_id
 *      WHERE al.location_type = 'site'
 *        AND al.latitude IS NOT NULL
 *        AND al.longitude IS NOT NULL
 *    ) t;
 *
 * 2. Save the JSON output to: frontend/scripts/site_locations.json
 *
 * 3. Run: node frontend/scripts/map-sites-to-townships.js
 *
 * 4. Execute the generated SQL file
 */

const fs = require('fs');
const path = require('path');

// Simple point-in-polygon algorithm (ray casting)
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// Check if point is in any polygon of a feature (handles MultiPolygon)
function pointInFeature(point, feature) {
  const geometry = feature.geometry;

  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(point, polygon[0])) {
        return true;
      }
    }
  }

  return false;
}

// Find township for a given lat/lng
function findTownship(lat, lng, townships) {
  const point = [lng, lat]; // GeoJSON uses [lng, lat]

  for (const feature of townships.features) {
    if (pointInFeature(point, feature)) {
      return {
        township: feature.properties.TS,
        ts_pcode: feature.properties.TS_PCODE,
        state: feature.properties.ST,
        st_pcode: feature.properties.ST_PCODE
      };
    }
  }

  return null;
}

// Main function
async function main() {
  console.log('Loading township GeoJSON...');
  const townshipsPath = path.join(__dirname, '../public/myanmar-townships-simplified.geojson');
  const townships = JSON.parse(fs.readFileSync(townshipsPath, 'utf8'));
  console.log(`Loaded ${townships.features.length} township boundaries`);

  // Check if site_locations.json exists
  const siteLocationsPath = path.join(__dirname, 'site_locations.json');
  if (!fs.existsSync(siteLocationsPath)) {
    console.log('\n⚠️  site_locations.json not found!');
    console.log('\nPlease export site locations from your database first.');
    console.log('Run this SQL query and save the output as site_locations.json:\n');
    console.log(`SELECT json_agg(row_to_json(t))
FROM (
  SELECT
    al.activity_id,
    al.latitude,
    al.longitude,
    al.location_name,
    a.title_narrative as activity_title
  FROM activity_locations al
  JOIN activities a ON a.id = al.activity_id
  WHERE al.location_type = 'site'
    AND al.latitude IS NOT NULL
    AND al.longitude IS NOT NULL
) t;`);
    console.log('\nSave the JSON array result to: frontend/scripts/site_locations.json');
    return;
  }

  console.log('\nLoading site locations...');
  const siteLocations = JSON.parse(fs.readFileSync(siteLocationsPath, 'utf8'));
  console.log(`Loaded ${siteLocations.length} site locations`);

  // Map each site to its township
  const mappedSites = [];
  const unmappedSites = [];

  console.log('\nMapping sites to townships...');
  for (const site of siteLocations) {
    const lat = parseFloat(site.latitude);
    const lng = parseFloat(site.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      unmappedSites.push({ ...site, reason: 'Invalid coordinates' });
      continue;
    }

    const township = findTownship(lat, lng, townships);

    if (township) {
      mappedSites.push({
        ...site,
        ...township
      });
    } else {
      unmappedSites.push({ ...site, reason: 'No matching township' });
    }
  }

  console.log(`\nMapped: ${mappedSites.length} sites`);
  console.log(`Unmapped: ${unmappedSites.length} sites`);

  if (unmappedSites.length > 0) {
    console.log('\nUnmapped sites:');
    unmappedSites.slice(0, 10).forEach(site => {
      console.log(`  - ${site.location_name} (${site.latitude}, ${site.longitude}): ${site.reason}`);
    });
    if (unmappedSites.length > 10) {
      console.log(`  ... and ${unmappedSites.length - 10} more`);
    }
  }

  // Group by activity_id and count townships
  const activityTownships = {};

  for (const site of mappedSites) {
    if (!activityTownships[site.activity_id]) {
      activityTownships[site.activity_id] = {
        activity_title: site.activity_title,
        townships: new Map()
      };
    }

    const key = site.ts_pcode;
    if (!activityTownships[site.activity_id].townships.has(key)) {
      activityTownships[site.activity_id].townships.set(key, {
        township: site.township,
        ts_pcode: site.ts_pcode,
        state: site.state,
        st_pcode: site.st_pcode,
        count: 0
      });
    }
    activityTownships[site.activity_id].townships.get(key).count++;
  }

  // Generate SQL
  console.log('\nGenerating SQL...');

  let sql = `-- ============================================================================
-- Auto-generated: Township-level Subnational Breakdowns from Site Locations
-- Generated: ${new Date().toISOString()}
-- ============================================================================
-- This SQL populates subnational_breakdowns at the TOWNSHIP level
-- based on site location coordinates mapped to township boundaries.
--
-- Activities covered: ${Object.keys(activityTownships).length}
-- Total township entries: ${Array.from(Object.values(activityTownships)).reduce((sum, a) => sum + a.townships.size, 0)}
-- ============================================================================

BEGIN;

-- Delete existing breakdowns for activities being updated
DELETE FROM subnational_breakdowns
WHERE activity_id IN (
${Object.keys(activityTownships).map(id => `  '${id}'`).join(',\n')}
);

-- Insert township-level breakdowns
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
) VALUES
`;

  const values = [];

  for (const [activityId, data] of Object.entries(activityTownships)) {
    const townshipCount = data.townships.size;
    const basePercentage = Math.floor(10000 / townshipCount) / 100; // Round down to 2 decimal places
    const remainder = Math.round((100 - basePercentage * townshipCount) * 100) / 100;

    let isFirst = true;
    for (const [, township] of data.townships) {
      // First township gets the remainder to ensure sum = 100%
      const percentage = isFirst ? (basePercentage + remainder).toFixed(2) : basePercentage.toFixed(2);
      isFirst = false;

      // Format region_name as "State - Township"
      const regionName = `${township.state} - ${township.township}`;

      values.push(`  (
    '${activityId}',
    '${regionName.replace(/'/g, "''")}',
    ${percentage},
    false,
    'township',
    '${township.st_pcode}',
    '${township.ts_pcode}',
    NOW(),
    NOW()
  )`);
    }
  }

  sql += values.join(',\n') + ';\n\nCOMMIT;\n';

  // Add verification query
  sql += `
-- ============================================================================
-- Verification: Check results
-- ============================================================================

-- Count by allocation level
SELECT allocation_level, COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- Verify percentages sum to 100%
SELECT
  a.title_narrative,
  COUNT(*) as township_count,
  SUM(sb.percentage) as total_percentage
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
GROUP BY a.title_narrative
ORDER BY a.title_narrative;
`;

  // Write SQL file
  const outputPath = path.join(__dirname, '../..', 'populate_township_breakdowns.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`\n✅ SQL generated: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('1. Review the generated SQL file');
  console.log('2. Run it in your database');
  console.log('3. Check the Atlas map township view');

  // Also generate a summary report
  console.log('\n--- Summary Report ---');
  console.log(`Activities with site locations: ${Object.keys(activityTownships).length}`);

  for (const [activityId, data] of Object.entries(activityTownships)) {
    console.log(`\n${data.activity_title}:`);
    for (const [, township] of data.townships) {
      console.log(`  - ${township.state} > ${township.township}: ${township.count} site(s)`);
    }
  }
}

main().catch(console.error);
