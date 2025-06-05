import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of API routes
const API_ROUTES = ['/api/activities', '/api/partners', '/api/activity-logs', '/api/projects']

// List of public routes that don't require authentication
const PUBLIC_ROUTES = ['/api/test', '/api/health', '/api/test-env']

// List of auth routes
const AUTH_ROUTES = ['/login', '/auth']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Get authentication token from cookies
  const token = request.cookies.get('auth-token')?.value;
  
  // Check if route requires authentication
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');
  
  // Redirect to login if accessing protected route without authentication
  if (!token && !isPublicRoute && !isAuthRoute) {
    if (isApiRoute) {
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Redirect to login for web routes
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Add request ID for debugging
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  // Log API request in development only
  if (process.env.NODE_ENV === 'development' && isApiRoute) {
    console.log(`[API ${requestId}] ${request.method} ${pathname}`)
  }

  // Clone the response to add headers
  const response = NextResponse.next()
  
  // Add security headers to all routes
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Add CORS headers to API routes based on environment
  if (isApiRoute) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = request.headers.get('origin');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check if origin is allowed
    if (isDevelopment || (origin && allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Add cache headers to prevent stale responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    // Add request ID for tracking
    response.headers.set('X-Request-ID', requestId)
  }

  // Log response time in development
  if (process.env.NODE_ENV === 'development' && isApiRoute) {
    const duration = Date.now() - startTime
    console.log(`[API ${requestId}] Completed in ${duration}ms`)
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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 