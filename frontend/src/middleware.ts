import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Create a response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Refresh Supabase session cookies so server-side auth stays valid.
  // Use a 5s timeout to prevent MIDDLEWARE_INVOCATION_TIMEOUT on slow edges.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
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

    // Race getUser() against a 5s timeout to avoid MIDDLEWARE_INVOCATION_TIMEOUT
    // on slow edge locations (e.g. Singapore → US Supabase)
    try {
      await Promise.race([
        supabase.auth.getUser(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ])
    } catch {
      // Timeout or Supabase error — proceed without refresh.
      // The client SDK or route handler will retry token refresh.
    }
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

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }

  // For API routes that handle user updates (with profile pictures)
  if (request.nextUrl.pathname === '/api/users' && request.method === 'PUT') {
    response.headers.set('x-middleware-request-size-limit', '10mb')
  }

  // Add request ID and cache headers for API calls
  if (isApiRoute) {
    const requestId = Math.random().toString(36).substring(7)

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    if (request.nextUrl.pathname.includes('/activities/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, private')
      response.headers.set('Vercel-CDN-Cache-Control', 'no-cache')
    }

    response.headers.set('X-Request-ID', requestId)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
