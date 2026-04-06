import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * Authentication helper for API routes.
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { supabase, user, response } = await requireAuth()
 *   if (response) return response
 *   
 *   // ... your authenticated logic here
 * }
 * ```
 * 
 * Returns:
 * - `supabase`: Authenticated Supabase client (respects RLS)
 * - `user`: The authenticated user object
 * - `response`: A 401 response if not authenticated (null if authenticated)
 */
export async function requireAuth(): Promise<{
  supabase: SupabaseClient | null
  user: User | null
  response: NextResponse | null
}> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              })
            })
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
  
  // Use getSession() for local JWT validation instead of getUser() which makes
  // a network call to Supabase auth server on every request. This prevents
  // rate-limiting/timeout issues when many API routes are called concurrently
  // (e.g. dashboard load). The middleware already refreshes sessions via getSession().
  const { data: { session }, error } = await supabase.auth.getSession()

  if (!session?.user || error) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { supabase, user: session.user, response: null }
}

/**
 * Authentication helper for API routes that also allows visitor (read-only) access.
 * Visitors have no Supabase session, so this falls back to the admin client for GET requests
 * when the X-Visitor-Mode header is present.
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { supabase, user, response, isVisitor } = await requireAuthOrVisitor(request)
 *   if (response) return response
 *   // ... your logic here (isVisitor = true means read-only visitor)
 * }
 * ```
 */
export async function requireAuthOrVisitor(request: NextRequest): Promise<{
  supabase: SupabaseClient | null
  user: User | null
  response: NextResponse | null
  isVisitor: boolean
}> {
  // Try normal auth first
  const authResult = await requireAuth()

  if (!authResult.response) {
    // Normal authenticated user
    return { ...authResult, isVisitor: false }
  }

  // Auth failed — check if this is a visitor making a GET request
  const isVisitorMode = request.headers.get('X-Visitor-Mode') === 'true'
  const isGetRequest = request.method === 'GET'

  if (isVisitorMode && isGetRequest) {
    const adminClient = getSupabaseAdmin()
    if (adminClient) {
      return {
        supabase: adminClient,
        user: null,
        response: null,
        isVisitor: true,
      }
    }
  }

  // Not a valid visitor request — return the original 401
  return { ...authResult, isVisitor: false }
}

/**
 * Verify cron job authentication using secret header.
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authError = verifyCronSecret(request)
 *   if (authError) return authError
 *   
 *   // ... your cron job logic here
 * }
 * ```
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('[Auth] CRON_SECRET environment variable not set')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return null
}
