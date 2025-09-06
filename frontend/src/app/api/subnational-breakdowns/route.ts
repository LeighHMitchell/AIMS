import { getSupabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const orgFilter = searchParams.get('organization')
    const statusFilter = searchParams.get('status')

    // First, get published activities with their organizations
    let activityQuery = supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        activity_status,
        publication_status,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('publication_status', 'published')

    // Apply filters
    if (statusFilter && statusFilter !== 'all') {
      activityQuery = activityQuery.eq('activity_status', statusFilter)
    }

    if (orgFilter && orgFilter !== 'all') {
      activityQuery = activityQuery.eq('organizations.name', orgFilter)
    }

    const { data: activities, error: activitiesError } = await activityQuery

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      )
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        breakdowns: {},
        details: {}
      })
    }

    // Get activity IDs
    const activityIds = activities.map(a => a.id)

    // Now get subnational breakdowns for these activities
    const { data: breakdowns, error } = await supabase
      .from('subnational_breakdowns')
      .select('*')
      .in('activity_id', activityIds)
      .order('region_name')

    if (error) {
      console.error('Error fetching subnational breakdowns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subnational breakdown data', details: error.message },
        { status: 500 }
      )
    }

    // Create activity lookup map
    const activityMap = new Map()
    activities.forEach(activity => {
      activityMap.set(activity.id, {
        id: activity.id,
        title: activity.title_narrative,
        status: activity.activity_status,
        organization: activity.organizations?.name || 'Unknown Organization'
      })
    })

    // Aggregate breakdowns by region
    const regionAggregation: Record<string, {
      totalPercentage: number
      activityCount: number
      activities: Array<{
        id: string
        title: string
        status: string
        organization: string
      }>
    }> = {}

    breakdowns?.forEach((breakdown: any) => {
      const regionName = breakdown.region_name
      const activityInfo = activityMap.get(breakdown.activity_id)
      
      if (!activityInfo) return // Skip if activity not found (shouldn't happen)

      if (!regionAggregation[regionName]) {
        regionAggregation[regionName] = {
          totalPercentage: 0,
          activityCount: 0,
          activities: []
        }
      }

      regionAggregation[regionName].totalPercentage += breakdown.percentage
      regionAggregation[regionName].activityCount += 1
      regionAggregation[regionName].activities.push(activityInfo)
    })

    // Convert aggregation to the format expected by MyanmarAdminMap
    const result = {
      breakdowns: {} as Record<string, number>,
      details: regionAggregation
    }

    // Calculate normalized percentages for map visualization
    const totalActivities = Object.values(regionAggregation).reduce((sum, region) => sum + region.activityCount, 0)
    
    Object.entries(regionAggregation).forEach(([regionName, data]) => {
      // Use activity count percentage for map coloring
      result.breakdowns[regionName] = totalActivities > 0 ? (data.activityCount / totalActivities) * 100 : 0
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/subnational-breakdowns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}