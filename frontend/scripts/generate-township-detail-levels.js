#!/usr/bin/env node

/**
 * Generate multiple detail levels of Myanmar townships GeoJSON
 *
 * This script downloads the detailed Myanmar townships boundary data from MIMU
 * and creates simplified versions for different zoom levels.
 *
 * Requires: mapshaper (npm install -g mapshaper)
 *
 * Usage: node scripts/generate-township-detail-levels.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// MIMU (Myanmar Information Management Unit) township boundaries
// Source: https://geonode.themimu.info/
const TOWNSHIP_URL = 'https://geonode.themimu.info/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typename=geonode:mmr_polbnda_adm3_250k_mimu&outputFormat=json&srsName=EPSG:4326';

// Alternative source from HDX if MIMU is unavailable
const HDX_FALLBACK_URL = 'https://data.humdata.org/dataset/cod-ab-mmr/resource/download/mmr_polbnda_adm3_250k_mimu.geojson';

const OUTPUT_DIR = path.join(__dirname, '../public');

// Simplification levels (percentage of points to keep)
const DETAIL_LEVELS = [
  { name: 'low', keep: '0.5%', minZoom: 0, maxZoom: 7 },      // ~50KB - overview
  { name: 'medium', keep: '2%', minZoom: 7, maxZoom: 9 },     // ~200KB - state level
  { name: 'high', keep: '10%', minZoom: 9, maxZoom: 12 },     // ~1MB - detailed
  { name: 'full', keep: '100%', minZoom: 12, maxZoom: 22 },   // Full detail
];

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);

    const makeRequest = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const protocol = url.startsWith('https') ? https : require('http');

      protocol.get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`Redirecting to: ${response.headers.location}`);
          makeRequest(response.headers.location, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON'));
          }
        });
        response.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

async function main() {
  console.log('🗺️  Myanmar Township Detail Level Generator\n');

  // Check if mapshaper is installed
  try {
    execSync('mapshaper --version', { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ mapshaper is not installed. Install it with:');
    console.error('   npm install -g mapshaper');
    process.exit(1);
  }

  // Download the full detail townships
  let geojson;
  const fullPath = path.join(OUTPUT_DIR, 'myanmar-townships-full.geojson');

  if (fs.existsSync(fullPath)) {
    console.log('📂 Using existing full detail file...');
    geojson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } else {
    console.log('📥 Downloading township boundaries from MIMU...');
    try {
      geojson = await downloadFile(TOWNSHIP_URL);
    } catch (e) {
      console.log(`   MIMU failed (${e.message}), trying HDX fallback...`);
      try {
        geojson = await downloadFile(HDX_FALLBACK_URL);
      } catch (e2) {
        console.error(`❌ Failed to download from both sources: ${e2.message}`);
        console.log('\n💡 You can manually download from:');
        console.log('   https://geonode.themimu.info/layers/geonode:mmr_polbnda_adm3_250k_mimu');
        console.log('   and save as: public/myanmar-townships-full.geojson');
        process.exit(1);
      }
    }

    // Add stable IDs for hover state
    geojson.features = geojson.features.map((feature, idx) => ({
      ...feature,
      id: idx,
    }));

    // Save full detail version
    fs.writeFileSync(fullPath, JSON.stringify(geojson));
    console.log(`✅ Saved full detail: ${(fs.statSync(fullPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log(`\n📊 Total townships: ${geojson.features.length}`);

  // Generate simplified versions using mapshaper
  console.log('\n🔧 Generating simplified versions...\n');

  for (const level of DETAIL_LEVELS) {
    if (level.name === 'full') {
      // Just copy the full version
      const destPath = path.join(OUTPUT_DIR, `myanmar-townships-${level.name}.geojson`);
      fs.copyFileSync(fullPath, destPath);
      const size = fs.statSync(destPath).size;
      console.log(`   ${level.name}: ${(size / 1024 / 1024).toFixed(2)} MB (zoom ${level.minZoom}-${level.maxZoom})`);
    } else {
      const destPath = path.join(OUTPUT_DIR, `myanmar-townships-${level.name}.geojson`);

      // Use mapshaper to simplify
      const cmd = `mapshaper "${fullPath}" -simplify ${level.keep} keep-shapes -o "${destPath}" format=geojson`;

      try {
        execSync(cmd, { stdio: 'pipe' });
        const size = fs.statSync(destPath).size;
        console.log(`   ${level.name}: ${(size / 1024).toFixed(0)} KB (zoom ${level.minZoom}-${level.maxZoom})`);
      } catch (e) {
        console.error(`   ❌ Failed to generate ${level.name}: ${e.message}`);
      }
    }
  }

  // Create a manifest file for the detail levels
  const manifest = {
    generated: new Date().toISOString(),
    levels: DETAIL_LEVELS.map(l => ({
      name: l.name,
      file: `myanmar-townships-${l.name}.geojson`,
      minZoom: l.minZoom,
      maxZoom: l.maxZoom,
    })),
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'myanmar-townships-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('\n✅ Done! Generated files:');
  DETAIL_LEVELS.forEach(l => {
    console.log(`   - myanmar-townships-${l.name}.geojson`);
  });
  console.log('   - myanmar-townships-manifest.json');

  console.log('\n📝 Now update SubnationalChoroplethMap.tsx to use zoom-dependent loading.');
}

main().catch(console.error);
