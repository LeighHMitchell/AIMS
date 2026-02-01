/**
 * Script to pre-fetch health facilities data from OpenStreetMap Overpass API
 * and save as static JSON files for fast loading.
 *
 * Run with: npx tsx scripts/fetch-health-facilities.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Use alternative Overpass server (less rate limiting)
const OVERPASS_API = 'https://overpass.kumi.systems/api/interpreter';

// Country bounding boxes (south, west, north, east)
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  MM: [9.5, 92.0, 28.5, 101.2], // Myanmar
  TH: [5.6, 97.3, 20.5, 105.6], // Thailand
  KH: [10.0, 102.3, 14.7, 107.6], // Cambodia
  LA: [13.9, 100.1, 22.5, 107.7], // Laos
  VN: [8.4, 102.1, 23.4, 109.5], // Vietnam
  BD: [20.7, 88.0, 26.6, 92.7], // Bangladesh
  IN: [6.7, 68.1, 35.5, 97.4], // India
  NP: [26.3, 80.0, 30.4, 88.2], // Nepal
  PH: [4.6, 116.9, 21.1, 126.6], // Philippines
  ID: [-11.0, 95.0, 6.1, 141.0], // Indonesia
};

async function fetchHealthFacilities(country: string): Promise<any> {
  const bbox = COUNTRY_BOUNDS[country];
  if (!bbox) {
    throw new Error(`Unknown country code: ${country}`);
  }

  console.log(`Fetching health facilities for ${country}...`);
  console.log(`Bounding box: ${bbox.join(', ')}`);

  const query = `
    [out:json][timeout:120];
    (
      node["amenity"="hospital"](${bbox.join(',')});
      node["amenity"="clinic"](${bbox.join(',')});
      node["amenity"="doctors"](${bbox.join(',')});
      node["amenity"="pharmacy"](${bbox.join(',')});
      node["amenity"="dentist"](${bbox.join(',')});
      node["healthcare"](${bbox.join(',')});
      way["amenity"="hospital"](${bbox.join(',')});
      way["amenity"="clinic"](${bbox.join(',')});
    );
    out center body;
  `;

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Received ${data.elements?.length || 0} elements`);

  // Convert to GeoJSON
  const features = data.elements
    .filter((el: any) => {
      if (el.type === 'way') {
        return el.center && el.center.lat && el.center.lon;
      }
      return el.lat && el.lon;
    })
    .map((el: any) => {
      const lat = el.type === 'way' ? el.center.lat : el.lat;
      const lon = el.type === 'way' ? el.center.lon : el.lon;
      const tags = el.tags || {};

      let facilityType = tags.amenity || tags.healthcare || 'health_facility';

      return {
        type: 'Feature' as const,
        id: `${el.type}/${el.id}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [lon, lat],
        },
        properties: {
          id: `${el.type}/${el.id}`,
          name: tags.name || tags['name:en'] || `${facilityType.charAt(0).toUpperCase() + facilityType.slice(1)}`,
          type: facilityType,
          operator: tags.operator,
          operatorType: tags['operator:type'],
          beds: tags.beds ? parseInt(tags.beds) : null,
          emergency: tags.emergency === 'yes',
          wheelchair: tags.wheelchair,
          phone: tags.phone || tags['contact:phone'],
          website: tags.website || tags['contact:website'],
          openingHours: tags.opening_hours,
          address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || null,
        },
      };
    });

  return {
    type: 'FeatureCollection' as const,
    features,
    metadata: {
      total: features.length,
      source: 'OpenStreetMap via Overpass API',
      generatedAt: new Date().toISOString(),
      country,
      bbox,
    },
  };
}

async function main() {
  const countries = process.argv.slice(2);

  if (countries.length === 0) {
    console.log('Usage: npx tsx scripts/fetch-health-facilities.ts <country-codes>');
    console.log('Example: npx tsx scripts/fetch-health-facilities.ts MM TH');
    console.log('\nAvailable countries:', Object.keys(COUNTRY_BOUNDS).join(', '));
    console.log('\nFetching Myanmar (MM) by default...');
    countries.push('MM');
  }

  const outputDir = path.join(process.cwd(), 'public', 'data', 'health-facilities');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const country of countries) {
    try {
      const geojson = await fetchHealthFacilities(country.toUpperCase());
      const outputPath = path.join(outputDir, `${country.toLowerCase()}.json`);

      fs.writeFileSync(outputPath, JSON.stringify(geojson));

      console.log(`✓ Saved ${geojson.features.length} facilities to ${outputPath}`);
      console.log(`  File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error(`✗ Failed to fetch ${country}:`, error);
    }
  }
}

main();
