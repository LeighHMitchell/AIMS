import { createClient } from '@supabase/supabase-js'

// Connection pool and query optimization for Supabase
class SupabaseConnectionManager {
  private static instance: SupabaseConnectionManager
  private adminClient: any = null
  private lastConnectionTime = 0
  private connectionTTL = 5 * 60 * 1000 // 5 minutes
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  private constructor() {}
  
  static getInstance(): SupabaseConnectionManager {
    if (!SupabaseConnectionManager.instance) {
      SupabaseConnectionManager.instance = new SupabaseConnectionManager()
    }
    return SupabaseConnectionManager.instance
  }
  
  getAdminClient() {
    const now = Date.now()
    
    // Reuse existing connection if still valid
    if (this.adminClient && (now - this.lastConnectionTime) < this.connectionTTL) {
      return this.adminClient
    }
    
    // Create new connection with optimized settings
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[Supabase Optimized] Missing environment variables')
      return null
    }
    
    try {
      this.adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-supabase-request-source': 'server-optimized',
            'Cache-Control': 'max-age=300' // 5 minutes cache
          }
        },
        // Connection pool settings to reduce CPU usage
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      })
      
      this.lastConnectionTime = now
      console.log('[Supabase Optimized] Created new optimized connection')
      return this.adminClient
      
    } catch (error) {
      console.error('[Supabase Optimized] Error creating client:', error)
      return null
    }
  }
  
  // Cached query execution to reduce repeated database hits
  async executeQuery(
    cacheKey: string, 
    queryFn: () => Promise<any>, 
    ttl: number = 60000 // 1 minute default
  ): Promise<any> {
    // Check cache first
    const cached = this.queryCache.get(cacheKey)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      console.log(`[Supabase Optimized] Cache hit for: ${cacheKey}`)
      return cached.data
    }
    
    // Execute query and cache result
    try {
      const result = await queryFn()
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: now,
        ttl
      })
      
      // Clean old cache entries
      this.cleanCache()
      
      console.log(`[Supabase Optimized] Query executed and cached: ${cacheKey}`)
      return result
      
    } catch (error) {
      console.error(`[Supabase Optimized] Query error for ${cacheKey}:`, error)
      throw error
    }
  }
  
  // Clean expired cache entries
  private cleanCache() {
    const now = Date.now()
    const entries = Array.from(this.queryCache.entries())
    for (const [key, value] of entries) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key)
      }
    }
  }
  
  // Optimized activities query with minimal fields
  async getActivitiesOptimized(
    limit: number = 20, 
    offset: number = 0,
    search?: string
  ) {
    const cacheKey = `activities_${limit}_${offset}_${search || 'all'}`
    
    return this.executeQuery(cacheKey, async () => {
      const client = this.getAdminClient()
      if (!client) throw new Error('No database connection')
      
      let query = client
        .from('activities')
        .select(`
          id,
          title_narrative,
          activity_status,
          publication_status,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (search) {
        query = query.or(`title_narrative.ilike.%${search}%,iati_identifier.ilike.%${search}%`)
      }
      
      return await query
    }, 120000) // 2 minutes cache for activities
  }
  
  // Optimized organizations query
  async getOrganizationsOptimized(limit: number = 50) {
    const cacheKey = `organizations_${limit}`
    
    return this.executeQuery(cacheKey, async () => {
      const client = this.getAdminClient()
      if (!client) throw new Error('No database connection')
      
      return await client
        .from('organizations')
        .select('id, name, acronym, type, country')
        .limit(limit)
        .order('name')
    }, 300000) // 5 minutes cache for organizations
  }
  
  // Simple health check without heavy queries
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const client = this.getAdminClient()
      if (!client) {
        return { healthy: false, message: 'No database connection available' }
      }
      
      // Simple count query instead of selecting data
      const { count, error } = await client
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        return { healthy: false, message: `Database error: ${error.message}` }
      }
      
      return { 
        healthy: true, 
        message: `Database healthy. Activities count: ${count || 0}` 
      }
      
    } catch (error) {
      return { 
        healthy: false, 
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }
  
  // Clear all caches
  clearCache() {
    this.queryCache.clear()
    console.log('[Supabase Optimized] Cache cleared')
  }
}

// Export singleton instance
export const supabaseOptimized = SupabaseConnectionManager.getInstance()

// Export optimized admin client getter
export function getOptimizedSupabaseAdmin() {
  return supabaseOptimized.getAdminClient()
}