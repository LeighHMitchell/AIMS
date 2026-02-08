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
      console.warn(`[Proxy PDF] URL validation failed for ${url}: ${validationError}`);
      // Return the raw URL as a fallback header so the client can try opening directly
      return NextResponse.json(
        { error: validationError, fallbackUrl: url },
        { status: 403 }
      );
    }

    console.log(`[Proxy PDF] User ${user?.id} fetching: ${url}`);

    // Fetch the PDF
    // Follow redirects (many PDF hosts redirect HTTP→HTTPS or to CDN)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIMS-Bot/1.0)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Proxy PDF] Upstream returned ${response.status} for ${url}`);
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // Check if it's actually a PDF or allowed type
    // Be permissive: allow application/octet-stream since many servers misreport PDF content-type
    const allowedTypes = [
      'application/pdf',
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    const isPdfUrl = url.toLowerCase().endsWith('.pdf');
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed && !isPdfUrl) {
      return NextResponse.json(
        { error: 'Only PDF and image files are allowed' },
        { status: 400 }
      );
    }

    // Get the body as array buffer
    const arrayBuffer = await response.arrayBuffer();

    // If the server said octet-stream but we know it's a PDF, fix the content-type
    const finalContentType = (contentType.includes('octet-stream') && isPdfUrl)
      ? 'application/pdf'
      : contentType;

    // Return with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': finalContentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[AIMS] Error proxying PDF:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out fetching the document' },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 });
  }
}
