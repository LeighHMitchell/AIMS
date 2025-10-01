import { NextRequest, NextResponse } from 'next/server';
import { validateLocationSearchResult } from '@/lib/schemas/location';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

const DEFAULT_SEARCH_PARAMS = {
  format: 'json',
  addressdetails: '1',
  limit: '10',
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

  const params = new URLSearchParams({
    ...DEFAULT_SEARCH_PARAMS,
    q: query.trim(),
    limit,
  });

  if (countryCodes) {
    params.set('countrycodes', countryCodes);
  }

  const fetchWithParams = async (p: URLSearchParams) => {
    const response = await fetch(`${NOMINATIM_BASE_URL}?${p.toString()}`, {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data)
      ? data.map((item) => validateLocationSearchResult(item))
      : [];
  };

  try {
    // Try Myanmar first when no explicit country code provided
    if (!countryCodes) {
      const mmParams = new URLSearchParams(params);
      mmParams.set('countrycodes', 'mm');

      const mmResults = await fetchWithParams(mmParams);
      if (mmResults.length > 0) {
        return NextResponse.json({ results: mmResults });
      }
    }

    const results = await fetchWithParams(params);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Geocoding Search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations from Nominatim.' },
      { status: 500 },
    );
  }
}

