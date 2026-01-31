import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for health facilities using OpenStreetMap Overpass API
 * Fetches health facility data and returns as GeoJSON
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

  // Overpass QL query for health facilities
  const query = `
    [out:json][timeout:60];
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

  try {
    console.log('[HealthFacilities] Fetching from Overpass API for bbox:', bbox);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      console.error('[HealthFacilities] Overpass API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Overpass API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Convert Overpass response to GeoJSON
    const features = data.elements
      .filter((el: any) => {
        // For ways, use center coordinates
        if (el.type === 'way') {
          return el.center && el.center.lat && el.center.lon;
        }
        return el.lat && el.lon;
      })
      .map((el: any) => {
        const lat = el.type === 'way' ? el.center.lat : el.lat;
        const lon = el.type === 'way' ? el.center.lon : el.lon;
        const tags = el.tags || {};

        // Determine facility type
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

    const geojson = {
      type: 'FeatureCollection' as const,
      features,
      metadata: {
        total: features.length,
        source: 'OpenStreetMap via Overpass API',
        bbox,
      },
    };

    console.log(`[HealthFacilities] Found ${features.length} facilities`);

    return NextResponse.json(geojson, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[HealthFacilities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health facilities' },
      { status: 500 }
    );
  }
}
