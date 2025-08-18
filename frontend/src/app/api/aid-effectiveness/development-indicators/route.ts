import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

interface DevelopmentIndicatorData {
  indicator: string
  indicatorName: string
  yes_count: number
  no_count: number
  yes_percentage: number
  total_activities: number
}

interface OutcomeIndicatorData {
  range: string
  count: number
  percentage: number
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
        sectors!inner(sector_code),
        locations,
        transactions(provider_org_id)
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
      return NextResponse.json({ 
        indicators: [], 
        outcomeIndicators: [],
        total_activities: 0 
      })
    }

    const totalActivities = activities.length
    
    // Initialize counters for each indicator
    const indicatorCounts = {
      linkedToGovFramework: { yes: 0, no: 0 },
      supportsPublicSector: { yes: 0, no: 0 },
      indicatorsFromGov: { yes: 0, no: 0 },
      indicatorsViaGovData: { yes: 0, no: 0 },
      finalEvalPlanned: { yes: 0, no: 0 }
    }

    const outcomeIndicatorRanges = {
      '0': 0,
      '1-3': 0,
      '4-6': 0,
      '7-10': 0,
      '10+': 0
    }

    // Process each activity
    activities.forEach((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      
      // Count yes/no responses for each indicator
      Object.keys(indicatorCounts).forEach(key => {
        const value = aidEffectiveness[key]
        if (value === 'yes') {
          indicatorCounts[key as keyof typeof indicatorCounts].yes++
        } else if (value === 'no') {
          indicatorCounts[key as keyof typeof indicatorCounts].no++
        }
      })

      // Count outcome indicators by range
      const numIndicators = parseInt(aidEffectiveness.numOutcomeIndicators) || 0
      if (numIndicators === 0) {
        outcomeIndicatorRanges['0']++
      } else if (numIndicators >= 1 && numIndicators <= 3) {
        outcomeIndicatorRanges['1-3']++
      } else if (numIndicators >= 4 && numIndicators <= 6) {
        outcomeIndicatorRanges['4-6']++
      } else if (numIndicators >= 7 && numIndicators <= 10) {
        outcomeIndicatorRanges['7-10']++
      } else if (numIndicators > 10) {
        outcomeIndicatorRanges['10+']++
      }
    })

    // Format indicator data for chart
    const indicatorData: DevelopmentIndicatorData[] = [
      {
        indicator: 'linkedToGovFramework',
        indicatorName: 'Linked to Government Framework',
        yes_count: indicatorCounts.linkedToGovFramework.yes,
        no_count: indicatorCounts.linkedToGovFramework.no,
        yes_percentage: Math.round((indicatorCounts.linkedToGovFramework.yes / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        indicator: 'supportsPublicSector',
        indicatorName: 'Supports Public Sector Capacity',
        yes_count: indicatorCounts.supportsPublicSector.yes,
        no_count: indicatorCounts.supportsPublicSector.no,
        yes_percentage: Math.round((indicatorCounts.supportsPublicSector.yes / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        indicator: 'indicatorsFromGov',
        indicatorName: 'Uses Government Indicators',
        yes_count: indicatorCounts.indicatorsFromGov.yes,
        no_count: indicatorCounts.indicatorsFromGov.no,
        yes_percentage: Math.round((indicatorCounts.indicatorsFromGov.yes / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        indicator: 'indicatorsViaGovData',
        indicatorName: 'Uses Government Data Systems',
        yes_count: indicatorCounts.indicatorsViaGovData.yes,
        no_count: indicatorCounts.indicatorsViaGovData.no,
        yes_percentage: Math.round((indicatorCounts.indicatorsViaGovData.yes / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        indicator: 'finalEvalPlanned',
        indicatorName: 'Final Evaluation Planned',
        yes_count: indicatorCounts.finalEvalPlanned.yes,
        no_count: indicatorCounts.finalEvalPlanned.no,
        yes_percentage: Math.round((indicatorCounts.finalEvalPlanned.yes / totalActivities) * 100),
        total_activities: totalActivities
      }
    ]

    // Format outcome indicator data
    const outcomeIndicatorData: OutcomeIndicatorData[] = Object.entries(outcomeIndicatorRanges).map(([range, count]) => ({
      range,
      count,
      percentage: Math.round((count / totalActivities) * 100)
    }))

    return NextResponse.json({
      indicators: indicatorData,
      outcomeIndicators: outcomeIndicatorData,
      total_activities: totalActivities,
      summary: {
        avg_yes_percentage: Math.round(
          indicatorData.reduce((sum, item) => sum + item.yes_percentage, 0) / indicatorData.length
        ),
        most_adopted: indicatorData.reduce((max, current) => 
          current.yes_percentage > max.yes_percentage ? current : max
        ),
        least_adopted: indicatorData.reduce((min, current) => 
          current.yes_percentage < min.yes_percentage ? current : min
        )
      }
    })

  } catch (error) {
    console.error('Error in development-indicators API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
