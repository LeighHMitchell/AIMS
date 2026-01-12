import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const orgType = searchParams.get('orgType') || 'all'

    // If filtering by org type, first get the org IDs of that type
    let orgIdsOfType: string[] | null = null
    if (orgType && orgType !== 'all') {
      const { data: orgsOfType } = await supabase
        .from('organizations')
        .select('id')
        .eq('type', orgType)

      orgIdsOfType = orgsOfType?.map(o => o.id) || []

      // If no orgs of this type, return empty
      if (orgIdsOfType.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0
        })
      }
    }

    // Fetch activities with votes, ordered by vote_score
    // Only include activities that have received at least one vote
    let query = supabase
      .from('activities')
      .select('id, iati_identifier, title_narrative, activity_status, reporting_org_id, vote_score, upvote_count, downvote_count')
      .or('upvote_count.gt.0,downvote_count.gt.0')

    // Filter by org type if specified
    if (orgIdsOfType) {
      query = query.in('reporting_org_id', orgIdsOfType)
    }

    const { data: activities, error: activitiesError } = await query
      .order('vote_score', { ascending: false })
      .limit(limit)

    if (activitiesError) {
      console.error('[TopVotedActivities API] Error fetching activities:', activitiesError)
      return NextResponse.json({ error: activitiesError.message }, { status: 500 })
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      })
    }

    // Get reporting org names
    const orgIds = Array.from(new Set(activities.map((a: any) => a.reporting_org_id).filter(Boolean)))
    let orgMap: Record<string, { name: string; acronym: string | null }> = {}

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .in('id', orgIds)

      for (const org of (orgs || [])) {
        orgMap[org.id] = {
          name: org.name || 'Unknown',
          acronym: org.acronym || null
        }
      }
    }

    // Format the data
    const formattedData = activities.map(activity => {
      const org = orgMap[activity.reporting_org_id] || { name: 'Unknown', acronym: null }
      return {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier || null,
        title: activity.title_narrative || 'Untitled Activity',
        voteScore: activity.vote_score || 0,
        upvoteCount: activity.upvote_count || 0,
        downvoteCount: activity.downvote_count || 0,
        status: activity.activity_status,
        reportingOrgName: org.name,
        reportingOrgAcronym: org.acronym,
        // Keep backward compatibility
        reportingOrg: org.acronym || org.name
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    })

  } catch (err) {
    console.error('[TopVotedActivities API] Error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
