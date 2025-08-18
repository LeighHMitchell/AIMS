import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

interface GovernmentSystemData {
  system: string
  systemName: string
  usage_count: number
  usage_percentage: number
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

    const supabaseAdmin = getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    // Build base query for activities with Aid Effectiveness data
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
      return NextResponse.json({ data: [], total_activities: 0 })
    }

    const totalActivities = activities.length
    const systemCounts = {
      govBudgetSystem: 0,
      govFinReporting: 0,
      govAudit: 0,
      govProcurement: 0
    }

    // Count usage of each government system
    activities.forEach((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      
      if (aidEffectiveness.govBudgetSystem === 'yes') {
        systemCounts.govBudgetSystem++
      }
      if (aidEffectiveness.govFinReporting === 'yes') {
        systemCounts.govFinReporting++
      }
      if (aidEffectiveness.govAudit === 'yes') {
        systemCounts.govAudit++
      }
      if (aidEffectiveness.govProcurement === 'yes') {
        systemCounts.govProcurement++
      }
    })

    // Format data for chart
    const chartData: GovernmentSystemData[] = [
      {
        system: 'budget',
        systemName: 'Budget System',
        usage_count: systemCounts.govBudgetSystem,
        usage_percentage: Math.round((systemCounts.govBudgetSystem / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        system: 'financial',
        systemName: 'Financial Reporting',
        usage_count: systemCounts.govFinReporting,
        usage_percentage: Math.round((systemCounts.govFinReporting / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        system: 'audit',
        systemName: 'Audit System',
        usage_count: systemCounts.govAudit,
        usage_percentage: Math.round((systemCounts.govAudit / totalActivities) * 100),
        total_activities: totalActivities
      },
      {
        system: 'procurement',
        systemName: 'Procurement System',
        usage_count: systemCounts.govProcurement,
        usage_percentage: Math.round((systemCounts.govProcurement / totalActivities) * 100),
        total_activities: totalActivities
      }
    ]

    return NextResponse.json({
      data: chartData,
      total_activities: totalActivities,
      summary: {
        highest_usage: chartData.reduce((max, current) => 
          current.usage_percentage > max.usage_percentage ? current : max
        ),
        lowest_usage: chartData.reduce((min, current) => 
          current.usage_percentage < min.usage_percentage ? current : min
        ),
        average_usage: Math.round(
          chartData.reduce((sum, item) => sum + item.usage_percentage, 0) / chartData.length
        )
      }
    })

  } catch (error) {
    console.error('Error in government-systems API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
