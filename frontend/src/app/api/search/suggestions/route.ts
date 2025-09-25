import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-simple'
import { searchCache, cacheKeys } from '@/lib/search-cache'
import { highlightSearchResults, extractSearchTerms } from '@/lib/search-highlighting'

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        popularSearches: []
      })
    }

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }

    const searchTerm = `%${query.toLowerCase()}%`

    // Check cache first
    const cacheKey = cacheKeys.suggestions(query, limit)
    const cachedResult = searchCache.get(cacheKey)

    if (cachedResult) {
      console.log(`[AIMS API] Cache hit for suggestions: "${query}"`)
      return NextResponse.json({
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      })
    }

    // Get popular searches from analytics (if available)
    let popularSearches: string[] = []
    try {
      const { data: popularData } = await supabase
        .from('search_analytics')
        .select('search_query')
        .ilike('search_query', `%${query}%`)
        .limit(5)

      if (popularData) {
        popularSearches = [...new Set(popularData.map(item => item.search_query))].slice(0, 5)
      }
    } catch (err) {
      // Ignore analytics errors, continue with basic suggestions
      console.log('[AIMS API] Could not fetch popular searches:', err)
    }

    // Search for activities with better matching
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        acronym,
        other_identifier,
        iati_identifier,
        activity_status
      `)
      .or(`title_narrative.ilike.${searchTerm},acronym.ilike.${searchTerm},other_identifier.ilike.${searchTerm},iati_identifier.ilike.${searchTerm}`)
      .limit(Math.ceil(limit / 3))
      .order('updated_at', { ascending: false })

    if (activitiesError) {
      console.error('[AIMS API] Error searching activities for suggestions:', activitiesError)
    }

    // Search for organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, iati_org_id, type, country')
      .or(`name.ilike.${searchTerm},acronym.ilike.${searchTerm},iati_org_id.ilike.${searchTerm}`)
      .limit(Math.ceil(limit / 3))
      .order('name')

    if (orgsError) {
      console.error('[AIMS API] Error searching organizations for suggestions:', orgsError)
    }

    // Search for sectors
    let sectors: any[] = []
    try {
      const { data: sectorsData, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select('sector_code, sector_name')
        .ilike('sector_name', searchTerm)
        .limit(Math.ceil(limit / 6))

      if (!sectorsError && sectorsData) {
        // Deduplicate sectors
        const uniqueSectors = new Map()
        sectorsData.forEach((sector: any) => {
          if (!uniqueSectors.has(sector.sector_code)) {
            uniqueSectors.set(sector.sector_code, {
              id: sector.sector_code,
              sector_name: sector.sector_name,
              level: sector.sector_code.length === 3 ? 'category' :
                     sector.sector_code.length === 5 ? 'subsector' : 'sector'
            })
          }
        })
        sectors = Array.from(uniqueSectors.values())
      }
    } catch (err) {
      console.log('[AIMS API] Sector suggestions failed:', err)
    }

    // Build suggestions array
    const suggestions: SearchSuggestion[] = []

    // Add activities
    if (activities) {
      activities.forEach(activity => {
        suggestions.push({
          id: activity.id,
          type: 'activity',
          title: activity.title_narrative || 'Untitled Activity',
          subtitle: [activity.other_identifier, activity.iati_identifier].filter(Boolean).join(' • ') || undefined,
          metadata: {
            count: suggestions.filter(s => s.type === 'activity').length + 1
          }
        })
      })
    }

    // Add organizations
    if (organizations) {
      organizations.forEach(org => {
        suggestions.push({
          id: org.id,
          type: 'organization',
          title: org.name,
          subtitle: [org.acronym, org.type, org.country].filter(Boolean).join(' • ') || undefined,
          metadata: {
            count: suggestions.filter(s => s.type === 'organization').length + 1
          }
        })
      })
    }

    // Add sectors
    sectors.forEach(sector => {
      suggestions.push({
        id: sector.id,
        type: 'sector',
        title: sector.sector_name,
        subtitle: `${sector.level.charAt(0).toUpperCase() + sector.level.slice(1)}: ${sector.id}`,
        metadata: {
          category: sector.level,
          count: suggestions.filter(s => s.type === 'sector').length + 1
        }
      })
    })

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, limit)

    console.log(`[AIMS API] Generated ${limitedSuggestions.length} search suggestions for query: "${query}"`)

    // Extract search terms for highlighting
    const searchTerms = extractSearchTerms(query)

    // Highlight suggestions
    const highlightedSuggestions = highlightSearchResults(limitedSuggestions, searchTerms)

    const result = {
      suggestions: highlightedSuggestions,
      popularSearches,
      query,
      searchTerms,
      timestamp: new Date().toISOString()
    }

    // Cache the result for future requests (cache without highlighting to save space)
    const cacheResult = {
      suggestions: limitedSuggestions,
      popularSearches,
      query,
      timestamp: new Date().toISOString()
    }
    searchCache.set(cacheKey, cacheResult)

    return NextResponse.json(result)

  } catch (error) {
    console.error('[AIMS API] Search suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate search suggestions' },
      { status: 500 }
    )
  }
}
