import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Log configuration status only once in development
let hasLoggedConfig = false
if (typeof window === 'undefined' && !hasLoggedConfig && process.env.NODE_ENV === 'development') {
  console.log('[Supabase] Configuration status:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓ Set' : '✗ Missing')
  hasLoggedConfig = true
}

// Create a singleton instance for the admin client
let _supabaseAdmin: SupabaseClient<Database> | null = null

// Helper function to create admin client with proper error handling
function createAdminClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supabase] Missing required environment variables for admin client')
    }
    return null
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-supabase-request-source': 'server'
        }
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supabase] Error creating admin client:', error)
    }
    return null
  }
}

// Create a null client that throws informative errors
const createNullClient = (clientType: string): SupabaseClient<Database> => {
  const errorMessage = `Supabase ${clientType} client is not configured. Please check your environment variables.`
  
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(errorMessage)
    }
  })
}

// Client-side Supabase client (uses anon key)
export const supabase: SupabaseClient<Database> = (supabaseUrl && supabaseAnonKey) 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : createNullClient('client')

// Server-side Supabase client with singleton pattern
export const supabaseAdmin: SupabaseClient<Database> = (() => {
  if (typeof window !== 'undefined') {
    // Don't create admin client on client-side
    return createNullClient('admin (not available on client-side)')
  }
  
  if (!_supabaseAdmin) {
    const client = createAdminClient()
    if (!client) {
      return createNullClient('admin')
    }
    _supabaseAdmin = client
  }
  
  return _supabaseAdmin
})()

// Export database types
export type { Database } 