import { NextRequest, NextResponse } from 'next/server';

/**
 * Tile proxy for Humanitarian OpenStreetMap Team (HOT) tiles
 * This proxy fetches tiles from the French OSM server and returns them
 * with appropriate CORS headers, bypassing the CORS restrictions.
 *
 * URL format: /api/tiles/hot/{z}/{x}/{y}.png
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (!path || path.length < 3) {
    return NextResponse.json(
      { error: 'Invalid tile path. Expected format: /api/tiles/hot/{z}/{x}/{y}.png' },
      { status: 400 }
    );
  }

  // Extract z, x, y from path
  const [z, x, yWithExt] = path;
  const y = yWithExt.replace('.png', '');

  // Validate coordinates are numbers
  if (isNaN(Number(z)) || isNaN(Number(x)) || isNaN(Number(y))) {
    return NextResponse.json(
      { error: 'Invalid tile coordinates' },
      { status: 400 }
    );
  }

  // Use multiple subdomains for load balancing
  const subdomains = ['a', 'b', 'c'];
  const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];

  const tileUrl = `https://${subdomain}.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'AIMS-Platform/1.0 (https://aims-platform.org)',
        'Accept': 'image/png,image/*',
        'Referer': 'https://aims-platform.org',
      },
      // Cache tiles for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`[TileProxy] Failed to fetch tile: ${tileUrl}, status: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch tile' },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[TileProxy] Error fetching tile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tile' },
      { status: 500 }
    );
  }
}
