import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    console.log('[XML Fetch API] Fetching XML from URL:', url);

    // Fetch the XML content with appropriate headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'AIMS-XML-Importer/1.0',
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch XML: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[XML Fetch API] Content-Type:', contentType);

    // Get the content
    const content = await response.text();
    
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Empty XML content received from URL' },
        { status: 400 }
      );
    }

    // Basic XML validation - check if it looks like XML
    if (!content.trim().startsWith('<')) {
      return NextResponse.json(
        { error: 'Content does not appear to be XML' },
        { status: 400 }
      );
    }

    console.log('[XML Fetch API] Successfully fetched XML, length:', content.length);

    return NextResponse.json({
      content,
      contentType,
      size: content.length
    });

  } catch (error) {
    console.error('[XML Fetch API] Error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - URL took too long to respond' },
          { status: 408 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch XML: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown error occurred while fetching XML' },
      { status: 500 }
    );
  }
}
