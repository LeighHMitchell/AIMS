import { createClient } from '@supabase/supabase-js'

// Simple, non-blocking Supabase client creation
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[Supabase] Missing environment variables')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (error) {
    console.error('[Supabase] Error creating client:', error)
    return null
  }
}

// Client-side Supabase client  
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export createClient function for API routes (same as createSupabaseAdmin)
export { createSupabaseAdmin as createClient }