import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

interface BudgetPlanningData {
  category: string
  annual_budget_shared: number
  forward_plan_shared: number
  both_shared: number
  none_shared: number
  total_activities: number
  transparency_score: number
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const donor = searchParams.get('donor') || 'all'
    const sector = searchParams.get('sector') || 'all'
    const country = searchParams.get('country') || 'all'
    const implementingPartner = searchParams.get('implementingPartner') || 'all'
    const groupBy = searchParams.get('groupBy') || 'overall'

    const supabaseAdmin = supabase

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
    const groupedData = new Map<string, { 
      annual: number, 
      forward: number, 
      both: number, 
      none: number, 
      total: number 
    }>()

    activities.forEach((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      
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
        groupedData.set(groupKey, { annual: 0, forward: 0, both: 0, none: 0, total: 0 })
      }

      const group = groupedData.get(groupKey)!
      group.total++

      const annualShared = aidEffectiveness.annualBudgetShared === 'yes'
      const forwardShared = aidEffectiveness.forwardPlanShared === 'yes'

      if (annualShared && forwardShared) {
        group.both++
      } else if (annualShared) {
        group.annual++
      } else if (forwardShared) {
        group.forward++
      } else {
        group.none++
      }
    })

    // Format data for chart
    const chartData: BudgetPlanningData[] = Array.from(groupedData.entries()).map(([category, counts]) => {
      const transparencyScore = Math.round(((counts.annual + counts.forward + (counts.both * 2)) / (counts.total * 2)) * 100)
      
      return {
        category,
        annual_budget_shared: counts.annual,
        forward_plan_shared: counts.forward,
        both_shared: counts.both,
        none_shared: counts.none,
        total_activities: counts.total,
        transparency_score: transparencyScore
      }
    }).sort((a, b) => b.transparency_score - a.transparency_score)

    // Calculate overall statistics
    const totalActivities = activities.length
    const overallAnnual = chartData.reduce((sum, item) => sum + item.annual_budget_shared, 0)
    const overallForward = chartData.reduce((sum, item) => sum + item.forward_plan_shared, 0)
    const overallBoth = chartData.reduce((sum, item) => sum + item.both_shared, 0)
    const overallNone = chartData.reduce((sum, item) => sum + item.none_shared, 0)

    const overallTransparencyScore = Math.round(((overallAnnual + overallForward + (overallBoth * 2)) / (totalActivities * 2)) * 100)

    return NextResponse.json({
      data: chartData,
      total_activities: totalActivities,
      summary: {
        overall_transparency_score: overallTransparencyScore,
        annual_budget_percentage: Math.round(((overallAnnual + overallBoth) / totalActivities) * 100),
        forward_plan_percentage: Math.round(((overallForward + overallBoth) / totalActivities) * 100),
        both_shared_percentage: Math.round((overallBoth / totalActivities) * 100),
        none_shared_percentage: Math.round((overallNone / totalActivities) * 100),
        best_performer: chartData.length > 0 ? chartData[0] : null,
        needs_improvement: chartData.length > 0 ? chartData[chartData.length - 1] : null
      },
      groupBy
    })

  } catch (error) {
    console.error('Error in budget-planning API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
