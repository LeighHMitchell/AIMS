import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for flood risk zone data
 * Serves GeoJSON flood risk polygons from static files
 *
 * Data sources:
 * - OCHA Humanitarian Data Exchange (HDX)
 * - Global Flood Database
 * - National disaster management agencies
 *
 * Query params:
 * - country: ISO country code (e.g., "MM" for Myanmar)
 */

// Country-specific flood data availability
const AVAILABLE_COUNTRIES = ['MM']; // Add more as data becomes available

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country')?.toUpperCase();

  if (!country) {
    return NextResponse.json(
      { error: 'Country parameter is required' },
      { status: 400 }
    );
  }

  if (!AVAILABLE_COUNTRIES.includes(country)) {
    return NextResponse.json(
      {
        error: `Flood risk data not available for country: ${country}`,
        availableCountries: AVAILABLE_COUNTRIES
      },
      { status: 404 }
    );
  }

  try {
    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Fetch from public static file
    const staticUrl = `${baseUrl}/data/flood-risk/${country.toLowerCase()}.json`;
    console.log(`[FloodRisk] Fetching from: ${staticUrl}`);

    const response = await fetch(staticUrl, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      console.log(`[FloodRisk] Static file not found for ${country}`);
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        metadata: {
          country,
          source: 'No data available',
          note: 'Flood risk data file not found.',
        },
      }, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const geoJson = await response.json();
    console.log(`[FloodRisk] Loaded ${geoJson.features?.length || 0} zones for ${country}`);

    return NextResponse.json(geoJson, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (error) {
    console.error('[FloodRisk] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flood risk data' },
      { status: 500 }
    );
  }
}
