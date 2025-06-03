import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of API routes
const API_ROUTES = ['/api/activities', '/api/partners', '/api/activity-logs', '/api/projects']

export function middleware(request: NextRequest) {
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
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  // Add request ID for tracking
  response.headers.set('X-Request-ID', requestId)

  // Log response time
  const duration = Date.now() - startTime
  console.log(`[API ${requestId}] Completed in ${duration}ms`)

  return response
}

export const config = {
  matcher: '/api/:path*',
} 