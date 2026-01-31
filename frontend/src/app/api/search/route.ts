import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { searchCache, cacheKeys } from '@/lib/search-cache'
import { highlightSearchResults, extractSearchTerms } from '@/lib/search-highlighting'
import { escapeIlikeWildcards, sanitizeSearchInput } from '@/lib/security-utils'

export const dynamic = 'force-dynamic'

interface SearchResult {
  id: string
  entity_type: string
  title: string
  subtitle: string | null
  rank: number
  metadata: Record<string, any>
}

export async function GET(request: NextRequest) {
  // SECURITY: Require authentication before any search operations.
  // Search results include PII (emails, phone numbers, names) that must not
  // be exposed to unauthenticated users.
  const { supabase, user, response: authResponse } = await requireAuth()
  if (authResponse) {
    return authResponse
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    )
  }

  console.log(`[AIMS API] GET /api/search - Authenticated user: ${user?.id}`)

  const startTime = Date.now()
  let searchAnalyticsData = null

  try {
    const searchParams = request.nextUrl.searchParams
    const rawQuery = searchParams.get('q')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const includeFuzzy = searchParams.get('fuzzy') !== 'false' // Default to true

    // SECURITY: Sanitize and validate search input
    const query = sanitizeSearchInput(rawQuery);
    if (!query) {
      return NextResponse.json({
        results: [],
        total: 0,
        page: 1,
        limit,
        hasMore: false
      })
    }

    // Track search analytics with authenticated user ID
    searchAnalyticsData = {
      search_query: query,
      search_type: 'global',
      user_id: user?.id || null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    }

    const searchTerm = query  // Already sanitized above

    // SECURITY: Escape wildcards for ILIKE queries (used in sector search)
    const escapedSearchTerm = escapeIlikeWildcards(searchTerm);

    // Check cache first
    const cacheKey = cacheKeys.search(searchTerm, page, limit)
    const cachedResult = searchCache.get(cacheKey)

    if (cachedResult) {
      console.log(`[AIMS API] Cache hit for query: "${query}"`)
      return NextResponse.json({
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      })
    }

    // Use the unified search_all RPC function for fast full-text search
    // This replaces 6 sequential ILIKE queries with a single optimized call
    const [searchResult, sectorsResult, countsResult] = await Promise.all([
      // Main search using RPC
      supabase.rpc('search_all', {
        search_query: searchTerm,
        result_limit: limit,
        result_offset: offset,
        include_fuzzy: includeFuzzy,
        min_similarity: 0.3
      }),

      // Sectors still need separate query (not in RPC since they use activity_sectors table)
      // SECURITY: Use escaped search term to prevent wildcard injection
      supabase
        .from('activity_sectors')
        .select('sector_code, sector_name')
        .ilike('sector_name', `%${escapedSearchTerm}%`)
        .order('sector_name')
        .limit(limit),

      // Get counts for pagination
      supabase.rpc('search_count', {
        search_query: searchTerm
      })
    ])

    if (searchResult.error) {
      console.error('[AIMS API] Search RPC error:', searchResult.error)
      throw searchResult.error
    }

    const rpcResults: SearchResult[] = searchResult.data || []

    // Process sectors (deduplicate)
    let sectors: any[] = []
    if (!sectorsResult.error && sectorsResult.data) {
      const uniqueSectors = new Map<string, any>()
      sectorsResult.data.forEach((sector: any) => {
        if (!uniqueSectors.has(sector.sector_code)) {
          uniqueSectors.set(sector.sector_code, {
            id: sector.sector_code,
            sector_code: sector.sector_code,
            sector_name: sector.sector_name,
            level: sector.sector_code?.length === 3 ? 'category' :
                   sector.sector_code?.length === 5 ? 'subsector' : 'sector'
          })
        }
      })
      sectors = Array.from(uniqueSectors.values()).slice(0, Math.ceil(limit / 4))
    }

    // Calculate total counts from RPC results
    let totalResults = 0
    if (!countsResult.error && countsResult.data) {
      totalResults = countsResult.data.reduce((sum: number, item: any) => sum + (item.count || 0), 0)
    }
    totalResults += sectors.length

    // Format results from RPC
    const formattedResults = [
      // Results from RPC (activities, organizations, users, tags, contacts)
      ...rpcResults.map(result => ({
        id: result.id,
        type: result.entity_type as 'activity' | 'organization' | 'user' | 'tag' | 'contact',
        title: result.title,
        subtitle: result.subtitle || undefined,
        rank: result.rank,
        metadata: {
          ...result.metadata,
          // Clean up null values
          ...(result.entity_type === 'activity' && {
            acronym: result.metadata?.acronym || undefined,
            status: result.metadata?.status || undefined,
            reporting_org: result.metadata?.reporting_org || undefined,
            reporting_org_acronym: result.metadata?.reporting_org_acronym || undefined,
            partner_id: result.metadata?.partner_id || undefined,
            iati_id: result.metadata?.iati_id || undefined,
            updated_at: result.metadata?.updated_at || undefined,
            activity_icon_url: result.metadata?.activity_icon_url || undefined
          }),
          ...(result.entity_type === 'organization' && {
            acronym: result.metadata?.acronym || undefined,
            iati_identifier: result.metadata?.iati_identifier || undefined,
            type: result.metadata?.type || undefined,
            country: result.metadata?.country || undefined,
            logo_url: result.metadata?.logo_url || undefined,
            banner_url: result.metadata?.banner_url || undefined
          }),
          ...(result.entity_type === 'user' && {
            profile_picture_url: result.metadata?.profile_picture_url || undefined
          }),
          ...(result.entity_type === 'tag' && {
            code: result.metadata?.code || undefined,
            activity_count: result.metadata?.activity_count || 0
          }),
          ...(result.entity_type === 'contact' && {
            activity_id: result.metadata?.activity_id || undefined,
            position: result.metadata?.position || undefined,
            organisation: result.metadata?.organisation || undefined,
            email: result.metadata?.email || undefined,
            phone: result.metadata?.phone || undefined,
            contact_type: result.metadata?.contact_type || undefined
          })
        }
      })),

      // Sectors (formatted separately)
      ...sectors.map(sector => ({
        id: sector.sector_code,
        type: 'sector' as const,
        title: sector.sector_name,
        subtitle: `${sector.level.charAt(0).toUpperCase() + sector.level.slice(1)}: ${sector.sector_code}`,
        rank: 0.5,
        metadata: {
          sector_code: sector.sector_code,
          level: sector.level
        }
      }))
    ]

    // Sort by rank (highest first)
    formattedResults.sort((a, b) => (b.rank || 0) - (a.rank || 0))

    const hasMore = offset + limit < totalResults
    const responseTime = Date.now() - startTime

    // Record search analytics (don't await to not block response)
    if (searchAnalyticsData) {
      supabase
        .from('search_analytics')
        .insert({
          ...searchAnalyticsData,
          result_count: totalResults,
          response_time_ms: responseTime
        })
        .then(() => {})
        .catch((analyticsError) => {
          console.warn('[AIMS API] Failed to record search analytics:', analyticsError)
        })
    }

    console.log(`[AIMS API] Supercharged search completed - Found ${formattedResults.length} results for query: "${query}"`)
    console.log(`[AIMS API] Performance: ${responseTime}ms (target: <50ms), Pagination: page ${page}, limit ${limit}, offset ${offset}, total ${totalResults}, hasMore ${hasMore}`)

    // Extract search terms for highlighting
    const searchTerms = extractSearchTerms(query)

    // Highlight search results
    const highlightedResults = highlightSearchResults(formattedResults, searchTerms)

    const result = {
      results: highlightedResults,
      total: totalResults,
      page,
      limit,
      hasMore,
      query,
      searchTerms,
      responseTime,
      timestamp: new Date().toISOString()
    }

    // Cache the result for future requests
    const cacheResult = {
      results: formattedResults,
      total: totalResults,
      page,
      limit,
      hasMore,
      query,
      responseTime,
      timestamp: new Date().toISOString()
    }
    searchCache.set(cacheKey, cacheResult)

    return NextResponse.json(result)

  } catch (error) {
    console.error('[AIMS API] Search error:', error)

    // Fallback to legacy search if RPC fails (e.g., migration not yet applied)
    // SECURITY: Pass authenticated supabase client to fallback
    return fallbackLegacySearch(request, supabase, user?.id)
  }
}

// Fallback to legacy ILIKE search if RPC is not available
// SECURITY: This function is only called from authenticated context
async function fallbackLegacySearch(
  request: NextRequest,
  supabase: any,
  userId: string | undefined
) {
  console.log('[AIMS API] Falling back to legacy search')

  try {
    const searchParams = request.nextUrl.searchParams
    const rawQuery = searchParams.get('q')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // SECURITY: Sanitize and validate search input
    const query = sanitizeSearchInput(rawQuery);
    if (!query) {
      return NextResponse.json({
        results: [],
        total: 0,
        page: 1,
        limit,
        hasMore: false
      })
    }

    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    const searchTerm = query;  // Already sanitized

    // SECURITY: Escape SQL ILIKE wildcards to prevent filter injection
    // Without this, a search for "%" would return ALL rows (data enumeration attack)
    const escapedTerm = escapeIlikeWildcards(searchTerm);

    // Run all searches in parallel for better performance
    // SECURITY: All ILIKE patterns use escapedTerm to prevent wildcard injection
    const [activitiesResult, orgsResult, usersResult, tagsResult, contactsResult, sectorsResult] = await Promise.all([
      // Activities
      supabase
        .from('activities')
        .select('id, title_narrative, acronym, other_identifier, iati_identifier, activity_status, updated_at, created_by_org_name, created_by_org_acronym, icon', { count: 'exact' })
        .or(`title_narrative.ilike.%${escapedTerm}%,acronym.ilike.%${escapedTerm}%,other_identifier.ilike.%${escapedTerm}%,iati_identifier.ilike.%${escapedTerm}%`)
        .range(offset, offset + limit - 1)
        .order('updated_at', { ascending: false }),

      // Organizations
      supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id, type, country, logo, banner', { count: 'exact' })
        .or(`name.ilike.%${escapedTerm}%,acronym.ilike.%${escapedTerm}%,iati_org_id.ilike.%${escapedTerm}%`)
        .range(offset, offset + limit - 1)
        .order('name'),

      // Users
      supabase
        .from('users')
        .select('id, email, first_name, last_name, avatar_url')
        .or(`first_name.ilike.%${escapedTerm}%,last_name.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`)
        .limit(limit)
        .order('first_name'),

      // Tags
      supabase
        .from('tags')
        .select('id, name, code, created_at, activity_tags(count)')
        .ilike('name', `%${escapedTerm}%`)
        .limit(limit)
        .order('name'),

      // Contacts
      supabase
        .from('activity_contacts')
        .select('id, activity_id, type, title, first_name, middle_name, last_name, position, organisation, email, phone')
        .or(`first_name.ilike.%${escapedTerm}%,middle_name.ilike.%${escapedTerm}%,last_name.ilike.%${escapedTerm}%`)
        .limit(limit)
        .order('first_name'),

      // Sectors
      supabase
        .from('activity_sectors')
        .select('sector_code, sector_name')
        .ilike('sector_name', `%${escapedTerm}%`)
        .order('sector_name')
        .limit(limit)
    ])

    const activities = activitiesResult.data || []
    const organizations = orgsResult.data || []
    const users = usersResult.data || []
    const tags = (tagsResult.data || []).map((tag: any) => ({
      ...tag,
      activity_count: tag.activity_tags?.[0]?.count || 0
    }))
    const contacts = contactsResult.data || []

    // Deduplicate sectors
    const uniqueSectors = new Map<string, any>()
    ;(sectorsResult.data || []).forEach((sector: any) => {
      if (!uniqueSectors.has(sector.sector_code)) {
        uniqueSectors.set(sector.sector_code, {
          id: sector.sector_code,
          sector_code: sector.sector_code,
          sector_name: sector.sector_name,
          level: sector.sector_code?.length === 3 ? 'category' :
                 sector.sector_code?.length === 5 ? 'subsector' : 'sector'
        })
      }
    })
    const sectors = Array.from(uniqueSectors.values())

    // Format results
    const results = [
      ...activities.map((activity: any) => ({
        id: activity.id,
        type: 'activity' as const,
        title: activity.title_narrative,
        subtitle: activity.other_identifier || activity.iati_identifier || undefined,
        metadata: {
          acronym: activity.acronym || undefined,
          status: activity.activity_status,
          reporting_org: activity.created_by_org_name || undefined,
          reporting_org_acronym: activity.created_by_org_acronym || undefined,
          partner_id: activity.other_identifier || undefined,
          iati_id: activity.iati_identifier || undefined,
          updated_at: activity.updated_at,
          activity_icon_url: (activity.icon && !activity.icon.includes('unsplash.com')) ? activity.icon : undefined
        }
      })),
      ...organizations.map((org: any) => ({
        id: org.id,
        type: 'organization' as const,
        title: org.name,
        subtitle: [org.iati_org_id, org.type, org.country].filter(Boolean).join(' • ') || undefined,
        metadata: {
          acronym: org.acronym || undefined,
          iati_identifier: org.iati_org_id || undefined,
          logo_url: org.logo || undefined,
          banner_url: org.banner || undefined
        }
      })),
      ...sectors.map((sector: any) => ({
        id: sector.sector_code,
        type: 'sector' as const,
        title: sector.sector_name,
        subtitle: `${sector.level.charAt(0).toUpperCase() + sector.level.slice(1)}: ${sector.sector_code}`,
        metadata: {
          sector_code: sector.sector_code,
          level: sector.level
        }
      })),
      ...users.map((user: any) => ({
        id: user.id,
        type: 'user' as const,
        title: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        subtitle: user.email,
        metadata: {
          profile_picture_url: user.avatar_url || undefined
        }
      })),
      ...tags.map((tag: any) => ({
        id: tag.id,
        type: 'tag' as const,
        title: tag.name,
        subtitle: `${tag.activity_count || 0} activities`,
        metadata: {
          code: tag.code,
          activity_count: tag.activity_count || 0,
          created_at: tag.created_at
        }
      })),
      ...contacts.map((contact: any) => {
        const nameParts = [contact.title, contact.first_name, contact.middle_name, contact.last_name].filter(Boolean)
        const fullName = nameParts.join(' ') || 'Unknown Contact'
        const subtitleParts = []
        if (contact.position) subtitleParts.push(contact.position)
        if (contact.organisation) subtitleParts.push(contact.organisation)

        return {
          id: contact.id,
          type: 'contact' as const,
          title: fullName,
          subtitle: subtitleParts.join(' • ') || undefined,
          metadata: {
            activity_id: contact.activity_id,
            position: contact.position,
            organisation: contact.organisation,
            email: contact.email,
            phone: contact.phone,
            contact_type: contact.type
          }
        }
      })
    ]

    const totalResults = (activitiesResult.count || 0) + (orgsResult.count || 0) + sectors.length + users.length + tags.length + contacts.length
    const hasMore = offset + limit < totalResults

    // Extract search terms for highlighting
    const searchTerms = extractSearchTerms(query)

    // Highlight search results
    const highlightedResults = highlightSearchResults(results, searchTerms)

    return NextResponse.json({
      results: highlightedResults,
      total: totalResults,
      page,
      limit,
      hasMore,
      query,
      searchTerms,
      responseTime: Date.now(),
      timestamp: new Date().toISOString(),
      fallback: true
    })

  } catch (error) {
    console.error('[AIMS API] Fallback search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
