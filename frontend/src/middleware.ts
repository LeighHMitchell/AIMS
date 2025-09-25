import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of API routes
const API_ROUTES = ['/api/activities', '/api/partners', '/api/activity-logs', '/api/projects']

export function middleware(request: NextRequest) {
  // Handle CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // Add CORS headers to all API responses
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // For API routes that handle user updates (with profile pictures)
  if (request.nextUrl.pathname === '/api/users' && request.method === 'PUT') {
    // Allow larger request bodies for profile picture uploads
    const response = NextResponse.next()
    response.headers.set('x-middleware-request-size-limit', '10mb')
    return response
  }

  // Only process API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Add request ID for debugging
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  // Log API request
  console.log(`[API ${requestId}] ${request.method} ${request.nextUrl.pathname}`)

  // Clone the response to add headers
  const response = NextResponse.next()
  
  // Add CORS headers to all API routes
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
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

  // Log response time
  const duration = Date.now() - startTime
  console.log(`[API ${requestId}] Completed in ${duration}ms`)

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