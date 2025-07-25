import { createClient } from '@supabase/supabase-js'

// Environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Log configuration status only once
let hasLoggedConfig = false
if (typeof window === 'undefined' && !hasLoggedConfig) {
  console.log('[Supabase] Configuration status:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓ Set' : '✗ Missing')
  hasLoggedConfig = true
}

// Create a singleton instance for the admin client
let _supabaseAdmin: any = null

// Helper function to create admin client with proper error handling
function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isValidUrl(supabaseUrl)) {
    console.error('[Supabase] Missing or invalid environment variables for admin client')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
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
    console.error('[Supabase] Error creating admin client:', error)
    return null
  }
}

// Client-side Supabase client (uses anon key)
export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null as any

// Server-side Supabase client with lazy initialization
export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    // Don't create admin client on client-side
    return null
  }
  
  // During build time, environment variables might not be available
  if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseServiceRoleKey)) {
    console.warn('[Supabase] Environment variables not available during build')
    return null
  }
  
  if (!_supabaseAdmin) {
    _supabaseAdmin = createAdminClient()
  }
  
  return _supabaseAdmin
}

// Database types (you can generate these from Supabase later)
export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          other_identifier: string | null
          iati_identifier: string | null
          title_narrative: string
          description_narrative: string | null
            created_by_org_name: string | null
  created_by_org_acronym: string | null
          collaboration_type: string | null
          activity_status: string
          publication_status: string
          submission_status: string
          banner: string | null
          icon: string | null
          reporting_org_id: string | null
          hierarchy: number
          linked_data_uri: string | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          submitted_by: string | null
          submitted_at: string | null
          validated_by: string | null
          validated_at: string | null
          published_by: string | null
          published_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          created_by: string | null
          last_edited_by: string | null
          created_at: string
          updated_at: string
          default_tied_status: string | null
          default_currency: string | null
          default_aid_type: string | null
          default_finance_type: string | null
          default_flow_type: string | null
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          activity_id: string
          organization_id: string | null
          transaction_type: string
          provider_org: string | null
          receiver_org: string | null
          value: number
          currency: string
          transaction_date: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      partners: {
        Row: {
          id: string
          name: string
          type: string | null
          country: string | null
          email: string | null
          phone: string | null
          address: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['partners']['Insert']>
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      organizations: {
        Row: {
          id: string
          name: string
          acronym: string | null
          type: string | null
          organisation_type: string | null
          country: string | null
          country_represented: string | null
          cooperation_modality: string | null
          iati_org_id: string | null
          description: string | null
          website: string | null
          email: string | null
          phone: string | null
          address: string | null
          logo: string | null
          banner: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_id: string | null
          action: string
          details: any
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
      }
      activity_sectors: {
        Row: {
          id: string
          activity_id: string
          sector_code: string
          sector_name: string
          percentage: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_sectors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_sectors']['Insert']>
      }
      activity_comments: {
        Row: {
          id: string
          activity_id: string
          user_id: string | null
          content: string
          type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_comments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_comments']['Insert']>
      }
      activity_contributors: {
        Row: {
          id: string
          activity_id: string
          organization_id: string | null
          status: string
          nominated_by: string | null
          nominated_at: string
          responded_at: string | null
          can_edit_own_data: boolean
          can_view_other_drafts: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_contributors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activity_contributors']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          budget: number | null
          currency: string
          status: string
          organization_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
    }
  }
} 