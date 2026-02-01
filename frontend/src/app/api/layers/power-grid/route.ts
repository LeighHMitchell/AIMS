import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for power grid infrastructure using OpenStreetMap Overpass API
 * Fetches power infrastructure data (lines, substations, plants) and returns as GeoJSON
 *
 * Query params:
 * - country: ISO country code (e.g., "MM" for Myanmar) - used to get bounding box
 * - bbox: Bounding box "south,west,north,east" (optional, overrides country)
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

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

// Parse voltage string to number (handles "400 kV", "400000", etc.)
function parseVoltage(voltageStr: string | undefined): number | null {
  if (!voltageStr) return null;
  const match = voltageStr.match(/(\d+)/);
  if (!match) return null;
  let voltage = parseInt(match[1]);
  // If voltage is small, assume it's in kV
  if (voltage < 1000) voltage *= 1000;
  return voltage;
}

// Categorize voltage level
function getVoltageCategory(voltage: number | null): string {
  if (!voltage) return 'unknown';
  if (voltage >= 220000) return 'transmission'; // >= 220kV
  if (voltage >= 110000) return 'sub_transmission'; // 110-220kV
  return 'distribution'; // < 110kV
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country');
  const bboxParam = searchParams.get('bbox');

  let bbox: [number, number, number, number];

  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      bbox = parts as [number, number, number, number];
    } else {
      return NextResponse.json(
        { error: 'Invalid bbox format. Expected: south,west,north,east' },
        { status: 400 }
      );
    }
  } else if (country && COUNTRY_BOUNDS[country]) {
    bbox = COUNTRY_BOUNDS[country];
  } else {
    return NextResponse.json(
      { error: 'Either country code or bbox parameter is required' },
      { status: 400 }
    );
  }

  // Overpass QL query for power infrastructure
  // Note: Using longer timeout for potentially large datasets
  const query = `
    [out:json][timeout:120];
    (
      // Power lines (ways)
      way["power"="line"](${bbox.join(',')});
      way["power"="minor_line"](${bbox.join(',')});
      way["power"="cable"](${bbox.join(',')});
      // Substations (nodes and ways)
      node["power"="substation"](${bbox.join(',')});
      way["power"="substation"](${bbox.join(',')});
      // Power plants (nodes and ways)
      node["power"="plant"](${bbox.join(',')});
      way["power"="plant"](${bbox.join(',')});
      node["power"="generator"](${bbox.join(',')});
    );
    out center body;
  `;

  try {
    console.log('[PowerGrid] Fetching from Overpass API for bbox:', bbox);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      console.error('[PowerGrid] Overpass API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Overpass API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Separate lines (ways) and points (nodes/way centers)
    const lineFeatures: any[] = [];
    const pointFeatures: any[] = [];

    data.elements.forEach((el: any) => {
      const tags = el.tags || {};
      const powerType = tags.power;

      if (el.type === 'way' && (powerType === 'line' || powerType === 'minor_line' || powerType === 'cable')) {
        // Power lines - need geometry from nodes
        if (el.geometry && el.geometry.length >= 2) {
          const voltage = parseVoltage(tags.voltage);
          const voltageCategory = getVoltageCategory(voltage);

          lineFeatures.push({
            type: 'Feature' as const,
            id: `way/${el.id}`,
            geometry: {
              type: 'LineString' as const,
              coordinates: el.geometry.map((node: any) => [node.lon, node.lat]),
            },
            properties: {
              id: `way/${el.id}`,
              name: tags.name || tags.ref || `Power Line`,
              type: powerType,
              voltageCategory,
              voltage: voltage,
              voltageDisplay: tags.voltage || null,
              operator: tags.operator,
              cables: tags.cables ? parseInt(tags.cables) : null,
              circuits: tags.circuits ? parseInt(tags.circuits) : null,
              frequency: tags.frequency,
            },
          });
        }
      } else {
        // Points: substations, plants, generators
        let lat: number, lon: number;

        if (el.type === 'way' && el.center) {
          lat = el.center.lat;
          lon = el.center.lon;
        } else if (el.type === 'node' && el.lat && el.lon) {
          lat = el.lat;
          lon = el.lon;
        } else {
          return; // Skip if no coordinates
        }

        const voltage = parseVoltage(tags.voltage);

        pointFeatures.push({
          type: 'Feature' as const,
          id: `${el.type}/${el.id}`,
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat],
          },
          properties: {
            id: `${el.type}/${el.id}`,
            name: tags.name || tags['name:en'] || `${powerType.charAt(0).toUpperCase() + powerType.slice(1)}`,
            type: powerType,
            voltage: voltage,
            voltageDisplay: tags.voltage || null,
            operator: tags.operator,
            output: tags['plant:output:electricity'] || tags.output,
            source: tags['plant:source'] || tags['generator:source'],
            method: tags['plant:method'] || tags['generator:method'],
          },
        });
      }
    });

    // Combine all features
    const allFeatures = [...lineFeatures, ...pointFeatures];

    const geojson = {
      type: 'FeatureCollection' as const,
      features: allFeatures,
      metadata: {
        total: allFeatures.length,
        lines: lineFeatures.length,
        points: pointFeatures.length,
        source: 'OpenStreetMap via Overpass API',
        bbox,
      },
    };

    console.log(`[PowerGrid] Found ${lineFeatures.length} lines and ${pointFeatures.length} points`);

    return NextResponse.json(geojson, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[PowerGrid] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch power grid data' },
      { status: 500 }
    );
  }
}
