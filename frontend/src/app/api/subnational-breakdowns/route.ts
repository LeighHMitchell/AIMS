import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server'
import { STATE_PCODE_MAPPING, REGION_NAME_MAPPING } from '@/types/subnational'

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const orgFilter = searchParams.get('organization')
    const statusFilter = searchParams.get('status')
    const viewLevel = searchParams.get('view_level') || 'region' // 'region' or 'township'

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

    const orgIdFilter = searchParams.get('organizationId')
    if (orgIdFilter) {
      activityQuery = activityQuery.eq('reporting_org_id', orgIdFilter)
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
      // organizations is a single object from the inner join, not an array
      // Supabase types it as an array but the !inner join returns a single object
      const org = activity.organizations as unknown as { id: string; name: string } | null
      activityMap.set(activity.id, {
        id: activity.id,
        title: activity.title_narrative,
        status: activity.activity_status,
        organization: org?.name || 'Unknown Organization'
      })
    })

    // Aggregate breakdowns by region or township
    const aggregation: Record<string, {
      totalPercentage: number
      activityCount: number
      pcode: string | null
      activities: Array<{
        id: string
        title: string
        status: string
        organization: string
      }>
    }> = {}

    breakdowns?.forEach((breakdown: any) => {
      let key: string
      let pcode: string | null = null

      if (viewLevel === 'township' && breakdown.allocation_level === 'township') {
        // Use township-level data - extract just the township name for map matching
        // region_name format is "State/Region - Township" (e.g., "Kachin State - Myitkyina")
        if (breakdown.region_name.includes(' - ')) {
          const parts = breakdown.region_name.split(' - ')
          key = parts[1] // Just the township name (e.g., "Myitkyina")
        } else {
          key = breakdown.region_name
        }
        pcode = breakdown.ts_pcode
      } else {
        // Aggregate to region level
        // For township entries, aggregate to parent region using st_pcode
        if (breakdown.allocation_level === 'township' && breakdown.st_pcode) {
          // Get the primary pcode for this state
          const primaryPcode = STATE_PCODE_MAPPING[breakdown.st_pcode] || breakdown.st_pcode

          // Find the region name from the breakdown (format: "Region - Township")
          const regionName = breakdown.region_name.includes(' - ')
            ? breakdown.region_name.split(' - ')[0]
            : breakdown.region_name

          key = regionName
          pcode = primaryPcode
        } else {
          // Region-level entry
          key = breakdown.region_name
          pcode = breakdown.st_pcode
        }
      }

      const activityInfo = activityMap.get(breakdown.activity_id)
      if (!activityInfo) return // Skip if activity not found

      if (!aggregation[key]) {
        aggregation[key] = {
          totalPercentage: 0,
          activityCount: 0,
          pcode,
          activities: []
        }
      }

      aggregation[key].totalPercentage += breakdown.percentage
      aggregation[key].activityCount += 1
      aggregation[key].activities.push(activityInfo)

      // Update pcode if not set
      if (!aggregation[key].pcode && pcode) {
        aggregation[key].pcode = pcode
      }
    })

    // Convert aggregation to the format expected by the map
    const result: {
      breakdowns: Record<string, number>
      details: typeof aggregation
    } = {
      breakdowns: {},
      details: aggregation
    }

    // Calculate normalized percentages for map visualization
    // Find the max totalPercentage to normalize the color scale
    const maxPercentage = Math.max(...Object.values(aggregation).map(r => r.totalPercentage), 1)

    Object.entries(aggregation).forEach(([regionName, data]) => {
      // Use normalized totalPercentage for map coloring (scaled 0-100 based on max)
      // This ensures visible color differences even when absolute percentages are small
      result.breakdowns[regionName] = (data.totalPercentage / maxPercentage) * 100
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
