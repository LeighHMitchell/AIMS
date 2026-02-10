import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// List of API routes
const API_ROUTES = ['/api/activities', '/api/partners', '/api/activity-logs', '/api/projects']

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/logout', '/api/auth/callback', '/api/waitlist', '/api/faq']

export async function middleware(request: NextRequest) {
  // Create a response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Refresh Supabase session if we have cookies
  // This ensures tokens are refreshed before they expire
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Skip Supabase session refresh for API routes — they handle their own
  // auth via requireAuth(). This avoids middleware timeouts when the
  // Supabase getUser() call is slow from certain edge locations.
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (supabaseUrl && supabaseAnonKey && !isApiRoute) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the request for downstream handlers
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Also set cookies on the response so they're sent to the browser
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              path: '/',
            })
          })
        },
      },
    })

    // Refresh the session - this will update cookies if needed
    // Using getUser() as recommended by Supabase for server-side auth
    await supabase.auth.getUser()
  }

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

  // Add request ID for debugging API calls
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