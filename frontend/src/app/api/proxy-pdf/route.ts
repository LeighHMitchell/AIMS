import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Proxy PDF files to avoid CORS issues when rendering thumbnails
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }

    // Fetch the PDF
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIMS-Bot/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // Check if it's actually a PDF or allowed type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed && !url.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF and image files are allowed' },
        { status: 400 }
      );
    }

    // Get the body as array buffer
    const arrayBuffer = await response.arrayBuffer();

    // Return with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[AIMS] Error proxying PDF:', error);
    return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 });
  }
}
