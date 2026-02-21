import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { isPositiveValue } from '@/lib/aid-effectiveness-helpers';

interface AidEffectivenessMetrics {
  totalActivities: number
  gpedc_compliant: number
  compliance_rate: number
  avg_outcome_indicators: number
  gov_systems_usage: number
  tied_aid_percentage: number
  budget_sharing_rate: number
  evaluation_planning_rate: number
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

    const supabaseAdmin = supabase

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
        title_narrative,
        activity_status,
        planned_start_date,
        planned_end_date,
        general_info,
        created_by_org_id,
        sectors!inner(sector_code),
        locations,
        transactions(
          provider_org_id,
          value,
          transaction_type,
          transaction_date
        )
      `)
      .eq('publication_status', 'published')
      .not('general_info->aidEffectiveness', 'is', null)

    // Apply date filters if provided
    if (from && to) {
      query = query
        .gte('planned_start_date', from)
        .lte('planned_start_date', to)
    }

    // Apply donor filter
    if (donor !== 'all') {
      query = query.eq('transactions.provider_org_id', donor)
    }

    // Apply sector filter
    if (sector !== 'all') {
      query = query.eq('sectors.sector_code', sector)
    }

    // Apply country filter
    if (country !== 'all') {
      query = query.contains('locations', { country_code: country })
    }

    // Apply implementing partner filter
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
        totalActivities: 0,
        gpedc_compliant: 0,
        compliance_rate: 0,
        avg_outcome_indicators: 0,
        gov_systems_usage: 0,
        tied_aid_percentage: 0,
        budget_sharing_rate: 0,
        evaluation_planning_rate: 0
      })
    }

    // Calculate metrics
    const totalActivities = activities.length
    let gpedc_compliant = 0
    let total_outcome_indicators = 0
    let gov_systems_count = 0
    let tied_aid_count = 0
    let budget_sharing_count = 0
    let evaluation_planning_count = 0

    activities.forEach((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      
      // Check GPEDC compliance (all required fields completed)
      const isCompliant = !!(
        aidEffectiveness.implementingPartner &&
        isPositiveValue(aidEffectiveness.linkedToGovFramework) &&
        aidEffectiveness.supportsPublicSector === 'yes' &&
        aidEffectiveness.numOutcomeIndicators !== undefined &&
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

      // Count outcome indicators
      if (aidEffectiveness.numOutcomeIndicators) {
        total_outcome_indicators += parseInt(aidEffectiveness.numOutcomeIndicators) || 0
      }

      // Check government systems usage (any system used)
      const usesGovSystems = !!(
        aidEffectiveness.govBudgetSystem === 'yes' ||
        aidEffectiveness.govFinReporting === 'yes' ||
        aidEffectiveness.govAudit === 'yes' ||
        aidEffectiveness.govProcurement === 'yes'
      )
      if (usesGovSystems) {
        gov_systems_count++
      }

      // Check tied aid
      if (aidEffectiveness.tiedStatus === 'tied') {
        tied_aid_count++
      }

      // Check budget sharing
      if (aidEffectiveness.annualBudgetShared === 'yes' || aidEffectiveness.forwardPlanShared === 'yes') {
        budget_sharing_count++
      }

      // Check evaluation planning
      if (aidEffectiveness.finalEvalPlanned === 'yes') {
        evaluation_planning_count++
      }
    })

    const metrics: AidEffectivenessMetrics = {
      totalActivities,
      gpedc_compliant,
      compliance_rate: Math.round((gpedc_compliant / totalActivities) * 100),
      avg_outcome_indicators: Math.round((total_outcome_indicators / totalActivities) * 10) / 10,
      gov_systems_usage: Math.round((gov_systems_count / totalActivities) * 100),
      tied_aid_percentage: Math.round((tied_aid_count / totalActivities) * 100),
      budget_sharing_rate: Math.round((budget_sharing_count / totalActivities) * 100),
      evaluation_planning_rate: Math.round((evaluation_planning_count / totalActivities) * 100)
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error in aid-effectiveness metrics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
