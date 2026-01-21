import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

interface ImplementingPartnerData {
  partner_name: string
  partner_type: string
  activity_count: number
  total_budget: number
  avg_outcome_indicators: number
  gov_systems_usage_rate: number
  gpedc_compliance_rate: number
  tied_aid_percentage: number
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
    const topN = searchParams.get('topN') || '10'

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
        sectors!inner(sector_code),
        locations,
        transactions!inner(
          provider_org_id,
          value,
          transaction_type
        ),
        organizations!created_by_org_id(
          id,
          name,
          acronym,
          type
        )
      `)
      .eq('publication_status', 'published')
      .not('general_info->aidEffectiveness', 'is', null)
      .not('created_by_org_id', 'is', null)

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

    // Group by implementing partner
    const partnerMap = new Map<string, {
      partner_name: string
      partner_type: string
      activities: any[]
      total_budget: number
    }>()

    activities.forEach((activity: any) => {
      const org = activity.organizations
      if (!org) return

      const partnerKey = org.id
      const partnerName = org.acronym || org.name
      const partnerType = org.type || 'Unknown'

      if (!partnerMap.has(partnerKey)) {
        partnerMap.set(partnerKey, {
          partner_name: partnerName,
          partner_type: partnerType,
          activities: [],
          total_budget: 0
        })
      }

      const partner = partnerMap.get(partnerKey)!
      partner.activities.push(activity)

      // Calculate budget from commitments
      const commitments = activity.transactions?.filter((t: any) => 
        t.transaction_type === '2' || t.transaction_type === 2
      ) || []
      const budget = commitments.reduce((sum: number, t: any) => sum + (t.value || 0), 0)
      partner.total_budget += budget
    })

    // Calculate metrics for each partner
    const chartData: ImplementingPartnerData[] = Array.from(partnerMap.entries()).map(([partnerId, partner]) => {
      const activities = partner.activities
      const activityCount = activities.length

      // Calculate average outcome indicators
      let totalOutcomeIndicators = 0
      let indicatorCount = 0

      // Calculate government systems usage
      let govSystemsUsage = 0

      // Calculate GPEDC compliance
      let gpedc_compliant = 0

      // Calculate tied aid
      let tied_count = 0

      activities.forEach((activity: any) => {
        const aidEffectiveness = activity.general_info?.aidEffectiveness || {}

        // Outcome indicators
        if (aidEffectiveness.numOutcomeIndicators) {
          totalOutcomeIndicators += parseInt(aidEffectiveness.numOutcomeIndicators) || 0
          indicatorCount++
        }

        // Government systems usage (any system used)
        const usesGovSystems = !!(
          aidEffectiveness.govBudgetSystem === 'yes' ||
          aidEffectiveness.govFinReporting === 'yes' ||
          aidEffectiveness.govAudit === 'yes' ||
          aidEffectiveness.govProcurement === 'yes'
        )
        if (usesGovSystems) {
          govSystemsUsage++
        }

        // GPEDC compliance (all required fields)
        const isCompliant = !!(
          aidEffectiveness.implementingPartner &&
          aidEffectiveness.linkedToGovFramework === 'yes' &&
          aidEffectiveness.supportsPublicSector === 'yes' &&
          aidEffectiveness.numOutcomeIndicators &&
          aidEffectiveness.indicatorsFromGov === 'yes' &&
          aidEffectiveness.indicatorsViaGovData === 'yes' &&
          aidEffectiveness.finalEvalPlanned === 'yes' &&
          aidEffectiveness.govBudgetSystem === 'yes' &&
          aidEffectiveness.govFinReporting === 'yes' &&
          aidEffectiveness.govAudit === 'yes' &&
          aidEffectiveness.govProcurement === 'yes' &&
          aidEffectiveness.annualBudgetShared === 'yes' &&
          aidEffectiveness.forwardPlanShared === 'yes' &&
          aidEffectiveness.tiedStatus === 'untied'
        )
        if (isCompliant) {
          gpedc_compliant++
        }

        // Tied aid
        if (aidEffectiveness.tiedStatus === 'tied') {
          tied_count++
        }
      })

      return {
        partner_name: partner.partner_name,
        partner_type: partner.partner_type,
        activity_count: activityCount,
        total_budget: partner.total_budget,
        avg_outcome_indicators: indicatorCount > 0 ? Math.round((totalOutcomeIndicators / indicatorCount) * 10) / 10 : 0,
        gov_systems_usage_rate: Math.round((govSystemsUsage / activityCount) * 100),
        gpedc_compliance_rate: Math.round((gpedc_compliant / activityCount) * 100),
        tied_aid_percentage: Math.round((tied_count / activityCount) * 100)
      }
    })

    // Sort by activity count and apply top N filter
    let sortedData = chartData.sort((a, b) => b.activity_count - a.activity_count)
    
    if (topN !== 'all') {
      const limit = parseInt(topN)
      sortedData = sortedData.slice(0, limit)
    }

    return NextResponse.json({
      data: sortedData,
      total_activities: activities.length,
      total_partners: partnerMap.size,
      showing: sortedData.length,
      summary: {
        avg_compliance_rate: Math.round(
          sortedData.reduce((sum, p) => sum + p.gpedc_compliance_rate, 0) / sortedData.length
        ),
        avg_gov_systems_usage: Math.round(
          sortedData.reduce((sum, p) => sum + p.gov_systems_usage_rate, 0) / sortedData.length
        ),
        best_performer: sortedData.reduce((best, current) => 
          current.gpedc_compliance_rate > best.gpedc_compliance_rate ? current : best
        ),
        most_active: sortedData[0] || null,
        partner_types: Array.from(new Set(sortedData.map(p => p.partner_type)))
      }
    })

  } catch (error) {
    console.error('Error in implementing-partners API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
