import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

interface TiedAidData {
  category: string
  tied_count: number
  untied_count: number
  partially_tied_count: number
  tied_percentage: number
  untied_percentage: number
  partially_tied_percentage: number
  total_activities: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const donor = searchParams.get('donor') || 'all'
    const sector = searchParams.get('sector') || 'all'
    const country = searchParams.get('country') || 'all'
    const implementingPartner = searchParams.get('implementingPartner') || 'all'
    const groupBy = searchParams.get('groupBy') || 'overall'

    const supabaseAdmin = getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    // Build base query
    let query = supabaseAdmin
      .from('activities')
      .select(`
        id,
        general_info,
        planned_start_date,
        created_by_org_id,
        sectors!inner(sector_code, name),
        locations,
        transactions!inner(
          provider_org_id,
          organizations!provider_org_id(name, acronym)
        )
      `)
      .eq('publication_status', 'published')
      .not('general_info->aidEffectiveness', 'is', null)

    // Apply filters
    if (from && to) {
      query = query
        .gte('planned_start_date', from)
        .lte('planned_start_date', to)
    }

    if (donor !== 'all') {
      query = query.eq('transactions.provider_org_id', donor)
    }

    if (sector !== 'all') {
      query = query.eq('sectors.sector_code', sector)
    }

    if (country !== 'all') {
      query = query.contains('locations', { country_code: country })
    }

    if (implementingPartner !== 'all') {
      query = query.eq('created_by_org_id', implementingPartner)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      )
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ data: [], total_activities: 0 })
    }

    // Group data based on groupBy parameter
    const groupedData = new Map<string, { tied: number, untied: number, partially_tied: number, total: number }>()

    activities.forEach((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      const tiedStatus = aidEffectiveness.tiedStatus

      let groupKey = 'Overall'
      
      if (groupBy === 'donor' && activity.transactions?.[0]?.organizations) {
        const donorName = activity.transactions[0].organizations.acronym || activity.transactions[0].organizations.name
        groupKey = donorName || 'Unknown Donor'
      } else if (groupBy === 'sector' && activity.sectors?.[0]) {
        groupKey = activity.sectors[0].name || 'Unknown Sector'
      } else if (groupBy === 'country' && activity.locations?.[0]) {
        groupKey = activity.locations[0].country_name || 'Unknown Country'
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, { tied: 0, untied: 0, partially_tied: 0, total: 0 })
      }

      const group = groupedData.get(groupKey)!
      group.total++

      switch (tiedStatus) {
        case 'tied':
          group.tied++
          break
        case 'untied':
          group.untied++
          break
        case 'partially_tied':
          group.partially_tied++
          break
        default:
          // Count as untied if not specified (following OECD-DAC guidelines)
          group.untied++
      }
    })

    // Format data for chart
    const chartData: TiedAidData[] = Array.from(groupedData.entries()).map(([category, counts]) => ({
      category,
      tied_count: counts.tied,
      untied_count: counts.untied,
      partially_tied_count: counts.partially_tied,
      tied_percentage: Math.round((counts.tied / counts.total) * 100),
      untied_percentage: Math.round((counts.untied / counts.total) * 100),
      partially_tied_percentage: Math.round((counts.partially_tied / counts.total) * 100),
      total_activities: counts.total
    })).sort((a, b) => b.total_activities - a.total_activities)

    // Calculate overall statistics
    const totalActivities = activities.length
    const overallTied = chartData.reduce((sum, item) => sum + item.tied_count, 0)
    const overallUntied = chartData.reduce((sum, item) => sum + item.untied_count, 0)
    const overallPartiallyTied = chartData.reduce((sum, item) => sum + item.partially_tied_count, 0)

    return NextResponse.json({
      data: chartData,
      total_activities: totalActivities,
      summary: {
        overall_tied_percentage: Math.round((overallTied / totalActivities) * 100),
        overall_untied_percentage: Math.round((overallUntied / totalActivities) * 100),
        overall_partially_tied_percentage: Math.round((overallPartiallyTied / totalActivities) * 100),
        best_performer: chartData.reduce((best, current) => 
          current.untied_percentage > best.untied_percentage ? current : best
        ),
        needs_improvement: chartData.reduce((worst, current) => 
          current.tied_percentage > worst.tied_percentage ? current : worst
        )
      },
      groupBy
    })

  } catch (error) {
    console.error('Error in tied-aid API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
