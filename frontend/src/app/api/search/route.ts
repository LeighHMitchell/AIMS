import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-simple'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('[AIMS API] GET /api/search - Starting search request')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    if (!query.trim()) {
      return NextResponse.json({ 
        results: [],
        total: 0,
        page: 1,
        limit,
        hasMore: false
      })
    }

    const supabase = createClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase client')
    }
    const searchTerm = `%${query.toLowerCase()}%`

    // Search activities - only activity names (title_narrative)
    const { data: activities, error: activitiesError, count: activitiesCount } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        other_identifier,
        iati_identifier,
        activity_status,
        updated_at,
        created_by_org_name,
        created_by_org_acronym,
        icon
      `, { count: 'exact' })
      .ilike('title_narrative', searchTerm)
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false })

    if (activitiesError) {
      console.error('[AIMS API] Error searching activities:', activitiesError)
      throw activitiesError
    }

    // Debug: Log raw activities data to see what's matching
    if (activities && activities.length > 0) {
      console.log(`[AIMS API] Raw activities found for "${query}":`)
      activities.forEach((activity, idx) => {
        console.log(`${idx + 1}. Title: "${activity.title_narrative}"`)
        console.log(`   Partner ID: "${activity.other_identifier}"`)
        console.log(`   IATI ID: "${activity.iati_identifier}"`)
        console.log('   ---')
      })
    }

    // Search organizations - only names and acronyms
    const { data: organizations, error: orgsError, count: organizationsCount } = await supabase
      .from('organizations')
      .select('id, name, acronym, type, country, logo, banner', { count: 'exact' })
      .or(`name.ilike.${searchTerm},acronym.ilike.${searchTerm}`)
      .range(offset, offset + limit - 1)
      .order('name')

    if (orgsError) {
      console.error('[AIMS API] Error searching organizations:', orgsError)
      throw orgsError
    }


    // Search sectors - only sector names
    let sectors: any[] = []
    try {
      const { data: sectorsData, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select(`
          id,
          sector_code,
          sector_name,
          activity_id
        `)
        .ilike('sector_name', searchTerm)
        .limit(limit)
        .order('sector_name')

      if (!sectorsError && sectorsData) {
        sectors = sectorsData
      } else {
        console.log('[AIMS API] Could not search sectors:', sectorsError?.message)
      }
    } catch (err) {
      console.log('[AIMS API] Sector search failed, skipping:', err)
    }

    // Search users - only user names
    let users: any[] = []
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, profile_picture_url, avatar_url')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .limit(limit)
        .order('first_name')
      
      if (!usersError && usersData) {
        users = usersData
      } else {
        console.log('[AIMS API] Could not search users:', usersError?.message)
      }
    } catch (err) {
      console.log('[AIMS API] User search failed, skipping:', err)
    }

    // Search tags - search by tag name and get associated activities count
    let tags: any[] = []
    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          code,
          created_at,
          activity_tags(count)
        `)
        .ilike('name', searchTerm)
        .limit(limit)
        .order('name')

      if (!tagsError && tagsData) {
        tags = tagsData.map(tag => ({
          ...tag,
          activity_count: tag.activity_tags?.[0]?.count || 0
        }))
      } else {
        console.log('[AIMS API] Could not search tags:', tagsError?.message)
      }
    } catch (err) {
      console.log('[AIMS API] Tag search failed, skipping:', err)
    }

    // Format results
    const results = [
      // Format activities
      ...(activities || []).map(activity => ({
        id: activity.id,
        type: 'activity' as const,
        title: activity.title_narrative,
        subtitle: activity.other_identifier || activity.iati_identifier || undefined,
        metadata: {
          status: activity.activity_status,
          reporting_org: activity.created_by_org_acronym || activity.created_by_org_name || undefined,
          partner_id: activity.other_identifier || undefined,
          iati_id: activity.iati_identifier || undefined,
          updated_at: activity.updated_at,
          activity_icon_url: activity.icon || undefined
        }
      })),
      
      // Format organizations
      ...(organizations || []).map(org => ({
        id: org.id,
        type: 'organization' as const,
        title: org.name,
        subtitle: [org.acronym, org.type, org.country].filter(Boolean).join(' • ') || undefined,
        metadata: {
          logo_url: org.logo || undefined,
          banner_url: org.banner || undefined
        }
      })),
      
      // Format sectors
      ...(sectors || []).map(sector => ({
        id: sector.id,
        type: 'sector' as const,
        title: sector.sector_name,
        subtitle: `Code: ${sector.sector_code}`,
        metadata: {
          sector_code: sector.sector_code
        }
      })),
      
      // Format users
      ...(users || []).map(user => ({
        id: user.id,
        type: 'user' as const,
        title: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        subtitle: user.email,
        metadata: {
          profile_picture_url: user.profile_picture_url || user.avatar_url || undefined
        }
      })),

      // Format tags
      ...(tags || []).map(tag => ({
        id: tag.id,
        type: 'tag' as const,
        title: tag.name,
        subtitle: `${tag.activity_count || 0} activities`,
        metadata: {
          code: tag.code,
          activity_count: tag.activity_count || 0,
          created_at: tag.created_at
        }
      }))
    ]

    // Calculate totals and pagination metadata
    const totalActivities = activitiesCount || 0
    const totalOrganizations = organizationsCount || 0
    const totalSectors = sectors.length // Note: sectors don't have pagination yet
    const totalUsers = users.length // Note: users don't have pagination yet
    const totalTags = tags.length // Note: tags don't have pagination yet
    const totalResults = totalActivities + totalOrganizations + totalSectors + totalUsers + totalTags
    const hasMore = offset + limit < totalResults

    console.log(`[AIMS API] Search completed - Found ${results.length} results for query: "${query}"`)
    console.log(`[AIMS API] Pagination: page ${page}, limit ${limit}, offset ${offset}, total ${totalResults}, hasMore ${hasMore}`)
    
    // Debug: Log the first few results to see what's matching
    if (results.length > 0) {
      console.log('[AIMS API] First few search results:')
      results.slice(0, 3).forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.type}: "${result.title}" - subtitle: "${result.subtitle}"`)
        if (result.metadata) {
          console.log(`   Metadata:`, JSON.stringify(result.metadata, null, 2))
        }
      })
    }

    return NextResponse.json({ 
      results,
      total: totalResults,
      page,
      limit,
      hasMore,
      query,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[AIMS API] Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}