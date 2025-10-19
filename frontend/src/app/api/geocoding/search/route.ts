import { NextRequest, NextResponse } from 'next/server';
import { validateLocationSearchResult } from '@/lib/schemas/location';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

const DEFAULT_SEARCH_PARAMS = {
  format: 'json',
  addressdetails: '1',
  limit: '30',
  dedupe: '1',
} as const;

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || 'AIMS-Application/1.0 (geo@aims.gov.mm)';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const limit = searchParams.get('limit') || DEFAULT_SEARCH_PARAMS.limit;
  const countryCodes = searchParams.get('countryCodes');

  console.log('[Geocoding API] Search request:', {
    query: query.trim(),
    countryCodes,
    limit
  });

  const params = new URLSearchParams({
    ...DEFAULT_SEARCH_PARAMS,
    q: query.trim(),
    limit,
  });

  if (countryCodes) {
    params.set('countrycodes', countryCodes);
  }

  const fetchWithParams = async (p: URLSearchParams) => {
    const url = `${NOMINATIM_BASE_URL}?${p.toString()}`;
    console.log('[Geocoding API] Fetching from Nominatim:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[Geocoding API] Nominatim error:', response.status, response.statusText);
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const validated = Array.isArray(data)
      ? data.map((item) => validateLocationSearchResult(item))
      : [];
    
    console.log('[Geocoding API] Results count:', validated.length);
    return validated;
  };

  try {
    // Search globally by default, or filter by country if specified
    const results = await fetchWithParams(params);
    console.log('[Geocoding API] Returning results:', results.length);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Geocoding Search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations from Nominatim.' },
      { status: 500 },
    );
  }
}

