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

    // Search activities - by title_narrative and acronym
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
      .or(`title_narrative.ilike.${searchTerm},acronym.ilike.${searchTerm}`)
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
        // Debug raw icon data
        if (activity.icon) {
          const iconPreview = activity.icon.substring(0, 100)
          console.log(`   Raw icon (first 100 chars): ${iconPreview}...`)
          console.log(`   Icon contains unsplash: ${activity.icon.includes('unsplash.com')}`)
          console.log(`   Will be filtered out: ${activity.icon.includes('unsplash.com')}`)
        } else {
          console.log(`   No icon in database`)
        }
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


    // Search sectors - deduplicated unique sectors
    let sectors: any[] = []
    try {
      const { data: sectorsData, error: sectorsError } = await supabase
        .from('activity_sectors')
        .select(`
          sector_code,
          sector_name
        `)
        .ilike('sector_name', searchTerm)
        .order('sector_name')

      if (!sectorsError && sectorsData) {
        // Deduplicate sectors by sector_code
        const uniqueSectors = new Map<string, any>()
        sectorsData.forEach((sector: any) => {
          if (!uniqueSectors.has(sector.sector_code)) {
            uniqueSectors.set(sector.sector_code, {
              id: sector.sector_code, // Use sector_code as unique ID
              sector_code: sector.sector_code,
              sector_name: sector.sector_name,
              // Determine sector level for display
              level: sector.sector_code.length === 3 ? 'category' : 
                     sector.sector_code.length === 5 ? 'subsector' : 'sector'
            })
          }
        })
        sectors = Array.from(uniqueSectors.values()).slice(0, limit)
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
        .select('id, email, first_name, last_name, avatar_url')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
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

    // Search activity contacts - search by contact names
    let contacts: any[] = []
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('activity_contacts')
        .select(`
          id,
          activity_id,
          type,
          title,
          first_name,
          middle_name,
          last_name,
          position,
          organisation,
          email,
          phone,
          activities (
            id,
            title_narrative,
            other_identifier,
            iati_identifier
          )
        `)
        .or(`first_name.ilike.${searchTerm},middle_name.ilike.${searchTerm},last_name.ilike.${searchTerm},name.ilike.${searchTerm}`)
        .limit(limit)
        .order('first_name')

      if (!contactsError && contactsData) {
        contacts = contactsData
      } else {
        console.log('[AIMS API] Could not search contacts:', contactsError?.message)
      }
    } catch (err) {
      console.log('[AIMS API] Contact search failed, skipping:', err)
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
          reporting_org: activity.created_by_org_name || undefined,
          reporting_org_acronym: activity.created_by_org_acronym || undefined,
          partner_id: activity.other_identifier || undefined,
          iati_id: activity.iati_identifier || undefined,
          updated_at: activity.updated_at,
          // Don't show Unsplash banner images as activity icons
          activity_icon_url: (activity.icon && !activity.icon.includes('unsplash.com')) ? activity.icon : undefined
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
      
      // Format sectors with improved display
      ...(sectors || []).map(sector => ({
        id: sector.sector_code, // Use sector_code as ID for navigation
        type: 'sector' as const,
        title: sector.sector_name,
        subtitle: `${sector.level.charAt(0).toUpperCase() + sector.level.slice(1)}: ${sector.sector_code}`,
        metadata: {
          sector_code: sector.sector_code,
          level: sector.level
        }
      })),
      
      // Format users
      ...(users || []).map(user => ({
        id: user.id,
        type: 'user' as const,
        title: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        subtitle: user.email,
        metadata: {
          profile_picture_url: user.avatar_url || undefined
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
      })),

      // Format contacts
      ...(contacts || []).map(contact => {
        // Build contact full name
        const nameParts = [contact.title, contact.first_name, contact.middle_name, contact.last_name]
          .filter(Boolean)
        const fullName = nameParts.join(' ') || contact.name || 'Unknown Contact'
        
        // Build subtitle with position and organization
        const subtitleParts = []
        if (contact.position) subtitleParts.push(contact.position)
        if (contact.organisation) subtitleParts.push(contact.organisation)
        if (contact.activities?.title_narrative) {
          subtitleParts.push(`Activity: ${contact.activities.title_narrative}`)
        }
        
        return {
          id: contact.id,
          type: 'contact' as const,
          title: fullName,
          subtitle: subtitleParts.join(' • ') || undefined,
          metadata: {
            activity_id: contact.activity_id,
            activity_title: contact.activities?.title_narrative,
            position: contact.position,
            organisation: contact.organisation,
            email: contact.email,
            phone: contact.phone,
            contact_type: contact.type
          }
        }
      })
    ]

    // Calculate totals and pagination metadata
    const totalActivities = activitiesCount || 0
    const totalOrganizations = organizationsCount || 0
    const totalSectors = sectors.length // Note: sectors don't have pagination yet
    const totalUsers = users.length // Note: users don't have pagination yet
    const totalTags = tags.length // Note: tags don't have pagination yet
    const totalContacts = contacts.length // Note: contacts don't have pagination yet
    const totalResults = totalActivities + totalOrganizations + totalSectors + totalUsers + totalTags + totalContacts
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
          // Debug icon URL specifically
          if (result.type === 'activity' && result.metadata.activity_icon_url) {
            console.log(`   Activity icon URL (first 100 chars): ${result.metadata.activity_icon_url.substring(0, 100)}...`)
          } else if (result.type === 'activity') {
            console.log(`   Activity has no icon URL (filtered out or not available)`)
          }
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