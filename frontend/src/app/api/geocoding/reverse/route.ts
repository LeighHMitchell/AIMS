import { NextRequest, NextResponse } from 'next/server';
import { validateGeocodingResult } from '@/lib/schemas/location';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

const DEFAULT_REVERSE_PARAMS = {
  format: 'json',
  addressdetails: '1',
  zoom: '18',
} as const;

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || 'AIMS-Application/1.0 (geo@aims.gov.mm)';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required.' },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    ...DEFAULT_REVERSE_PARAMS,
    lat,
    lon,
  });

  const zoom = searchParams.get('zoom');
  if (zoom) {
    params.set('zoom', zoom);
  }

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to reverse geocode: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const result = validateGeocodingResult(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Geocoding Reverse] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates.' },
      { status: 500 },
    );
  }
}

