import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-simple'
import { searchCache, cacheKeys } from '@/lib/search-cache'
import { highlightSearchResults, extractSearchTerms } from '@/lib/search-highlighting'
import { escapeIlikeWildcards } from '@/lib/security-utils'

export const dynamic = 'force-dynamic'

interface SearchSuggestion {
  id: string
  type: 'activity' | 'organization' | 'sector' | 'tag' | 'user' | 'contact'
  title: string
  subtitle?: string
  metadata?: {
    count?: number
    category?: string
  }
}

interface RPCSuggestion {
  id: string
  entity_type: string
  title: string
  subtitle: string | null
  rank: number
}

export async function GET(request: NextRequest) {
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

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    // Check cache first
    const cacheKey = cacheKeys.suggestions(query, limit)
    const cachedResult = searchCache.get(cacheKey)

    if (cachedResult) {
      console.log(`[AIMS API] Cache hit for suggestions: "${query}" (${Date.now() - startTime}ms)`)
      
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

      const responseTime = Date.now() - startTime
      console.log(`[AIMS API] Supercharged suggestions: ${suggestions.length} results for "${query}" in ${responseTime}ms`)

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
    console.log('[AIMS API] Falling back to legacy suggestions search')
    return fallbackLegacySuggestions(request, query, limit, popularSearches, startTime)

  } catch (error) {
    console.error('[AIMS API] Search suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate search suggestions' },
      { status: 500 }
    )
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
    const supabase = createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    const searchTerm = `%${query.toLowerCase()}%`

    // Run all searches in parallel for better performance
    const [activitiesResult, orgsResult, sectorsResult] = await Promise.all([
      // Activities
      supabase
        .from('activities')
        .select('id, title_narrative, acronym, other_identifier, iati_identifier')
        .or(`title_narrative.ilike.${searchTerm},acronym.ilike.${searchTerm},other_identifier.ilike.${searchTerm},iati_identifier.ilike.${searchTerm}`)
        .limit(Math.ceil(limit / 2))
        .order('updated_at', { ascending: false }),
      
      // Organizations
      supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id, type, country')
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
          subtitle: [activity.other_identifier, activity.iati_identifier].filter(Boolean).join(' • ') || undefined
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
          subtitle: [org.acronym, org.type, org.country].filter(Boolean).join(' • ') || undefined
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

    console.log(`[AIMS API] Legacy suggestions: ${limitedSuggestions.length} results for "${query}" in ${responseTime}ms`)

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




