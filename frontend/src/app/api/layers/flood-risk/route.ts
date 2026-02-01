import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

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
    // Try to load from static file
    const filePath = path.join(process.cwd(), 'public', 'data', 'flood-risk', `${country.toLowerCase()}.json`);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const geoJson = JSON.parse(fileContent);

      console.log(`[FloodRisk] Loaded ${geoJson.features?.length || 0} zones for ${country}`);

      return NextResponse.json(geoJson, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800', // Cache for 1 day / 7 days
        },
      });
    } catch (fileError) {
      // File doesn't exist - return empty but valid GeoJSON
      console.log(`[FloodRisk] No data file found for ${country}, returning empty collection`);

      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        metadata: {
          country,
          source: 'No data available',
          note: 'Flood risk data file not found. Please add data to /public/data/flood-risk/{country}.json',
        },
      }, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('[FloodRisk] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flood risk data' },
      { status: 500 }
    );
  }
}
