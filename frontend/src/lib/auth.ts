import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

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
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { supabase, user, response: null }
}

/**
 * Authentication + admin authorization helper for API routes.
 * Verifies the user is authenticated AND has the super_user role.
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { supabase, user, response } = await requireAdmin()
 *   if (response) return response
 *
 *   // ... your admin-only logic here
 * }
 * ```
 */
export async function requireAdmin(): Promise<{
  supabase: SupabaseClient | null
  user: User | null
  response: NextResponse | null
}> {
  const { supabase, user, response } = await requireAuth()
  if (response) return { supabase: null, user: null, response }

  const { data: profile, error: profileError } = await supabase!
    .from('users')
    .select('role')
    .eq('auth_user_id', user!.id)
    .single()

  if (profileError || !profile || profile.role !== 'super_user') {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 }
      )
    }
  }

  return { supabase, user, response: null }
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
    logger.error('CRON_SECRET environment variable not set', { context: 'auth' })
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
