import { NextRequest, NextResponse } from 'next/server'
import { requireAuthOrVisitor } from '@/lib/auth'
import { createSupabaseClient } from '@/lib/supabase-simple'
import { getSupabaseAdmin } from '@/lib/supabase'
import { searchCache, cacheKeys } from '@/lib/search-cache'
import { highlightSearchResults, extractSearchTerms } from '@/lib/search-highlighting'
import { escapeIlikeWildcards } from '@/lib/security-utils'

export const dynamic = 'force-dynamic'

interface SearchSuggestion {
  id: string
  type: 'activity' | 'organization' | 'sector' | 'tag' | 'user' | 'contact'
  title: string
  subtitle?: string
  metadata?: Record<string, any>
}

interface RPCSuggestion {
  id: string
  entity_type: string
  title: string
  subtitle: string | null
  rank: number
}

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAuthOrVisitor(request)
  if (authResponse) return authResponse

  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 50)

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        popularSearches: []
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      })
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    // Check cache first
    const cacheKey = cacheKeys.suggestions(query, limit)
    const cachedResult = searchCache.get(cacheKey)

    if (cachedResult) {
      
      // Extract search terms and highlight cached results
      const searchTerms = extractSearchTerms(query)
      const highlightedSuggestions = highlightSearchResults(cachedResult.suggestions || [], searchTerms)
      
      return NextResponse.json({
        ...cachedResult,
        suggestions: highlightedSuggestions,
        cached: true,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      })
    }

    // Use the fast search_suggestions RPC function
    const [suggestionsResult, popularResult] = await Promise.all([
      // Fast prefix-based suggestions
      supabase.rpc('search_suggestions', {
        search_query: query.trim(),
        result_limit: limit
      }),
      
      // Popular searches (fire and forget style - don't block on this)
      // SECURITY: Escape ILIKE wildcards to prevent filter injection
      supabase
        .from('search_analytics')
        .select('search_query')
        .ilike('search_query', `%${escapeIlikeWildcards(query)}%`)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Handle popular searches
    let popularSearches: string[] = []
    if (!popularResult.error && popularResult.data) {
      popularSearches = [...new Set(popularResult.data.map(item => item.search_query))].slice(0, 5)
    }

    // If RPC succeeded, use those results
    if (!suggestionsResult.error && suggestionsResult.data) {
      const rpcSuggestions: RPCSuggestion[] = suggestionsResult.data
      
      // Format RPC suggestions
      const suggestions: SearchSuggestion[] = rpcSuggestions.map(s => ({
        id: s.id,
        type: s.entity_type as SearchSuggestion['type'],
        title: s.title || 'Untitled',
        subtitle: s.subtitle || undefined,
        metadata: {
          category: s.entity_type
        }
      }))

      // Enrich org/activity suggestions with logos and IATI identifiers so the
      // dropdown can render organisation logos and activity code pills.
      // Uses the admin client because the anon client used above is blocked by
      // RLS on organizations/activities (the suggestions RPC is SECURITY DEFINER,
      // so titles come through, but a direct anon SELECT returns no rows).
      await enrichSuggestions(getSupabaseAdmin() || supabase, suggestions)

      const responseTime = Date.now() - startTime

      // Extract search terms for highlighting
      const searchTerms = extractSearchTerms(query)

      // Highlight suggestions
      const highlightedSuggestions = highlightSearchResults(suggestions, searchTerms)

      const result = {
        suggestions: highlightedSuggestions,
        popularSearches,
        query,
        searchTerms,
        responseTime,
        timestamp: new Date().toISOString()
      }

      // Cache the result (without highlighting)
      const cacheResult = {
        suggestions,
        popularSearches,
        query,
        timestamp: new Date().toISOString()
      }
      searchCache.set(cacheKey, cacheResult)

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      })
    }

    // Fallback to legacy search if RPC fails
    return fallbackLegacySuggestions(request, query, limit, popularSearches, startTime)

  } catch (error) {
    console.error('[AIMS API] Search suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate search suggestions' },
      { status: 500 }
    )
  }
}

/**
 * Enriches suggestion metadata in place with the extra fields the dropdown
 * needs but the lightweight `search_suggestions` RPC does not return:
 *  - organisations get their logo URL + acronym (rendered as an avatar)
 *  - activities get their IATI identifier + icon (rendered as a code pill)
 */
async function enrichSuggestions(supabase: any, suggestions: SearchSuggestion[]) {
  const orgIds = suggestions.filter(s => s.type === 'organization').map(s => s.id)
  const activityIds = suggestions.filter(s => s.type === 'activity').map(s => s.id)

  if (orgIds.length === 0 && activityIds.length === 0) return

  try {
    const [orgsRes, actsRes] = await Promise.all([
      orgIds.length
        ? supabase.from('organizations').select('id, logo, acronym').in('id', orgIds)
        : Promise.resolve({ data: [] }),
      activityIds.length
        ? supabase.from('activities').select('id, iati_identifier, other_identifier, acronym, icon').in('id', activityIds)
        : Promise.resolve({ data: [] }),
    ])

    const orgMap = new Map<string, any>((orgsRes.data || []).map((o: any) => [o.id, o]))
    const actMap = new Map<string, any>((actsRes.data || []).map((a: any) => [a.id, a]))

    for (const s of suggestions) {
      if (s.type === 'organization') {
        const o = orgMap.get(s.id)
        if (o) {
          s.metadata = {
            ...s.metadata,
            logo_url: o.logo || undefined,
            acronym: o.acronym || undefined,
          }
        }
      } else if (s.type === 'activity') {
        const a = actMap.get(s.id)
        if (a) {
          s.metadata = {
            ...s.metadata,
            iati_identifier: a.iati_identifier || undefined,
            partner_id: a.other_identifier || undefined,
            acronym: a.acronym || undefined,
            activity_icon_url: (a.icon && !a.icon.includes('unsplash.com')) ? a.icon : undefined,
          }
        }
      }
    }
  } catch (error) {
    // Enrichment is best-effort — never fail the suggestions request over it.
    console.warn('[AIMS API] Failed to enrich search suggestions:', error)
  }
}

// Fallback to legacy ILIKE search if RPC is not available
async function fallbackLegacySuggestions(
  request: NextRequest,
  query: string,
  limit: number,
  popularSearches: string[],
  startTime: number
) {
  try {
    // Use the admin client: this fallback runs when the SECURITY DEFINER RPC
    // is unavailable/errors (e.g. sector-matching queries), and the anon client
    // is blocked by RLS on these tables (it would return nothing). Only
    // non-PII tables (activities/organizations/activity_sectors) are queried.
    const supabase = getSupabaseAdmin() || createSupabaseClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    const searchTerm = `%${query.toLowerCase()}%`

    // Run all searches in parallel for better performance
    const [activitiesResult, orgsResult, sectorsResult] = await Promise.all([
      // Activities
      supabase
        .from('activities')
        .select('id, title_narrative, acronym, other_identifier, iati_identifier, icon')
        .or(`title_narrative.ilike.${searchTerm},acronym.ilike.${searchTerm},other_identifier.ilike.${searchTerm},iati_identifier.ilike.${searchTerm}`)
        .limit(Math.ceil(limit / 2))
        .order('updated_at', { ascending: false }),

      // Organizations
      supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id, type, country, logo')
        .or(`name.ilike.${searchTerm},acronym.ilike.${searchTerm},iati_org_id.ilike.${searchTerm}`)
        .limit(Math.ceil(limit / 3))
        .order('name'),
      
      // Sectors
      supabase
        .from('activity_sectors')
        .select('sector_code, sector_name')
        .ilike('sector_name', searchTerm)
        .limit(Math.ceil(limit / 4))
    ])

    const suggestions: SearchSuggestion[] = []

    // Add activities
    if (!activitiesResult.error && activitiesResult.data) {
      activitiesResult.data.forEach((activity: any) => {
        suggestions.push({
          id: activity.id,
          type: 'activity',
          title: activity.title_narrative || 'Untitled Activity',
          subtitle: [activity.other_identifier, activity.iati_identifier].filter(Boolean).join(' • ') || undefined,
          metadata: {
            iati_identifier: activity.iati_identifier || undefined,
            partner_id: activity.other_identifier || undefined,
            acronym: activity.acronym || undefined,
            activity_icon_url: (activity.icon && !activity.icon.includes('unsplash.com')) ? activity.icon : undefined,
          }
        })
      })
    }

    // Add organizations
    if (!orgsResult.error && orgsResult.data) {
      orgsResult.data.forEach((org: any) => {
        suggestions.push({
          id: org.id,
          type: 'organization',
          title: org.name,
          subtitle: [org.acronym, org.type, org.country].filter(Boolean).join(' • ') || undefined,
          metadata: {
            logo_url: org.logo || undefined,
            acronym: org.acronym || undefined,
          }
        })
      })
    }

    // Add sectors (deduplicated)
    if (!sectorsResult.error && sectorsResult.data) {
      const uniqueSectors = new Map()
      sectorsResult.data.forEach((sector: any) => {
        if (!uniqueSectors.has(sector.sector_code)) {
          uniqueSectors.set(sector.sector_code, {
            id: sector.sector_code,
            sector_name: sector.sector_name,
            level: sector.sector_code?.length === 3 ? 'category' :
                   sector.sector_code?.length === 5 ? 'subsector' : 'sector'
          })
        }
      })
      
      Array.from(uniqueSectors.values()).forEach((sector: any) => {
        suggestions.push({
          id: sector.id,
          type: 'sector',
          title: sector.sector_name,
          subtitle: `${sector.level.charAt(0).toUpperCase() + sector.level.slice(1)}: ${sector.id}`,
          metadata: {
            category: sector.level
          }
        })
      })
    }

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, limit)
    const responseTime = Date.now() - startTime


    // Extract search terms for highlighting
    const searchTerms = extractSearchTerms(query)

    // Highlight suggestions
    const highlightedSuggestions = highlightSearchResults(limitedSuggestions, searchTerms)

    return NextResponse.json({
      suggestions: highlightedSuggestions,
      popularSearches,
      query,
      searchTerms,
      responseTime,
      fallback: true,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })

  } catch (error) {
    console.error('[AIMS API] Fallback suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate search suggestions' },
      { status: 500 }
    )
  }
}




