import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validateUrlSafety } from '@/lib/security-utils';

export const dynamic = 'force-dynamic';

// Proxy PDF files to avoid CORS issues when rendering thumbnails
// SECURITY: Requires authentication and validates URLs to prevent SSRF
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication before any operations
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // SECURITY: Validate URL is safe before fetching (SSRF protection)
    // Note: We allow HTTP here since some PDFs are hosted on HTTP-only servers
    const validationError = await validateUrlSafety(url, {
      allowHttp: true,
      logPrefix: '[Proxy PDF]'
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 403 });
    }

    console.log(`[Proxy PDF] User ${user?.id} fetching: ${url}`);

    // Fetch the PDF
    // SECURITY: Disable redirects to prevent redirect-based SSRF bypass
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIMS-Bot/1.0)',
      },
      redirect: 'error',
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

    // SECURITY: Handle redirect errors gracefully
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json(
        { error: 'URL redirects are not allowed for security reasons' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 });
  }
}
