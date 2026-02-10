import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Create a response that we can modify
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Handle CORS for all API routes
  if (isApiRoute) {
    if (request.method === 'OPTIONS') {
      const corsResponse = new NextResponse(null, { status: 200 });
      corsResponse.headers.set('Access-Control-Allow-Origin', '*');
      corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
      return corsResponse;
    }

    // Add CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }

  // For API routes that handle user updates (with profile pictures)
  if (request.nextUrl.pathname === '/api/users' && request.method === 'PUT') {
    // Allow larger request bodies for profile picture uploads
    response.headers.set('x-middleware-request-size-limit', '10mb')
  }

  // Add request ID and cache headers for API calls
  if (isApiRoute) {
    const requestId = Math.random().toString(36).substring(7)

    // Add cache headers to prevent stale responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Additional cache-busting headers for activity endpoints
    if (request.nextUrl.pathname.includes('/activities/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, private')
      response.headers.set('Vercel-CDN-Cache-Control', 'no-cache')
    }

    // Add request ID for tracking
    response.headers.set('X-Request-ID', requestId)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
