import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '8',
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AIMS-Myanmar-Map/1.0 (https://aims-myanmar.org)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Geocode API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}

