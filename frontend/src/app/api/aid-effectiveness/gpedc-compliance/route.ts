import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

interface GPEDCIndicator {
  indicator: string
  indicatorName: string
  description: string
  compliant_count: number
  non_compliant_count: number
  compliance_percentage: number
  total_activities: number
  principle: string
}

interface GPEDCPrincipleData {
  principle: string
  principleName: string
  indicators: GPEDCIndicator[]
  overall_compliance: number
  total_activities: number
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
    const detailed = searchParams.get('detailed') === 'true'

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

    const totalActivities = activities.length

    // Define GPEDC indicators mapped to form fields
    const gpedc_indicators = [
      {
        indicator: 'ownership',
        indicatorName: 'Country Ownership',
        description: 'Activities linked to government frameworks and supporting public sector capacity',
        principle: 'Ownership',
        fields: ['linkedToGovFramework', 'supportsPublicSector']
      },
      {
        indicator: 'alignment',
        indicatorName: 'Alignment to Government Systems',
        description: 'Use of government budget, financial, audit, and procurement systems',
        principle: 'Alignment',
        fields: ['govBudgetSystem', 'govFinReporting', 'govAudit', 'govProcurement']
      },
      {
        indicator: 'harmonisation',
        indicatorName: 'Harmonisation & Coordination',
        description: 'Use of government indicators and data systems',
        principle: 'Harmonisation',
        fields: ['indicatorsFromGov', 'indicatorsViaGovData']
      },
      {
        indicator: 'results',
        indicatorName: 'Managing for Results',
        description: 'Outcome indicators and evaluation planning',
        principle: 'Results',
        fields: ['numOutcomeIndicators', 'finalEvalPlanned']
      },
      {
        indicator: 'accountability',
        indicatorName: 'Mutual Accountability',
        description: 'Budget transparency and aid untying',
        principle: 'Accountability',
        fields: ['annualBudgetShared', 'forwardPlanShared', 'tiedStatus']
      }
    ]

    // Calculate compliance for each indicator
    const indicatorResults: GPEDCIndicator[] = gpedc_indicators.map(indicator => {
      let compliant_count = 0

      activities.forEach((activity: any) => {
        const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
        
        let isCompliant = false

        switch (indicator.indicator) {
          case 'ownership':
            isCompliant = !!(
              aidEffectiveness.linkedToGovFramework === 'yes' &&
              aidEffectiveness.supportsPublicSector === 'yes'
            )
            break
          case 'alignment':
            isCompliant = !!(
              aidEffectiveness.govBudgetSystem === 'yes' ||
              aidEffectiveness.govFinReporting === 'yes' ||
              aidEffectiveness.govAudit === 'yes' ||
              aidEffectiveness.govProcurement === 'yes'
            )
            break
          case 'harmonisation':
            isCompliant = !!(
              aidEffectiveness.indicatorsFromGov === 'yes' &&
              aidEffectiveness.indicatorsViaGovData === 'yes'
            )
            break
          case 'results':
            isCompliant = !!(
              aidEffectiveness.numOutcomeIndicators && 
              parseInt(aidEffectiveness.numOutcomeIndicators) > 0 &&
              aidEffectiveness.finalEvalPlanned === 'yes'
            )
            break
          case 'accountability':
            isCompliant = !!(
              (aidEffectiveness.annualBudgetShared === 'yes' || aidEffectiveness.forwardPlanShared === 'yes') &&
              aidEffectiveness.tiedStatus === 'untied'
            )
            break
        }

        if (isCompliant) {
          compliant_count++
        }
      })

      return {
        indicator: indicator.indicator,
        indicatorName: indicator.indicatorName,
        description: indicator.description,
        compliant_count,
        non_compliant_count: totalActivities - compliant_count,
        compliance_percentage: Math.round((compliant_count / totalActivities) * 100),
        total_activities: totalActivities,
        principle: indicator.principle
      }
    })

    // Group by principles if detailed view requested
    if (detailed) {
      const principleGroups = new Map<string, GPEDCIndicator[]>()
      
      indicatorResults.forEach(indicator => {
        if (!principleGroups.has(indicator.principle)) {
          principleGroups.set(indicator.principle, [])
        }
        principleGroups.get(indicator.principle)!.push(indicator)
      })

      const principleData: GPEDCPrincipleData[] = Array.from(principleGroups.entries()).map(([principle, indicators]) => {
        const overallCompliance = Math.round(
          indicators.reduce((sum, ind) => sum + ind.compliance_percentage, 0) / indicators.length
        )

        return {
          principle: principle.toLowerCase().replace(/\s+/g, '_'),
          principleName: principle,
          indicators,
          overall_compliance: overallCompliance,
          total_activities: totalActivities
        }
      })

      return NextResponse.json({
        principles: principleData,
        indicators: indicatorResults,
        total_activities: totalActivities,
        overall_compliance: Math.round(
          indicatorResults.reduce((sum, ind) => sum + ind.compliance_percentage, 0) / indicatorResults.length
        )
      })
    }

    // Return simplified view
    return NextResponse.json({
      data: indicatorResults,
      total_activities: totalActivities,
      summary: {
        overall_compliance: Math.round(
          indicatorResults.reduce((sum, ind) => sum + ind.compliance_percentage, 0) / indicatorResults.length
        ),
        best_indicator: indicatorResults.reduce((best, current) => 
          current.compliance_percentage > best.compliance_percentage ? current : best
        ),
        worst_indicator: indicatorResults.reduce((worst, current) => 
          current.compliance_percentage < worst.compliance_percentage ? current : worst
        ),
        principles_summary: [
          {
            principle: 'Ownership',
            compliance: indicatorResults.find(i => i.indicator === 'ownership')?.compliance_percentage || 0
          },
          {
            principle: 'Alignment', 
            compliance: indicatorResults.find(i => i.indicator === 'alignment')?.compliance_percentage || 0
          },
          {
            principle: 'Harmonisation',
            compliance: indicatorResults.find(i => i.indicator === 'harmonisation')?.compliance_percentage || 0
          },
          {
            principle: 'Results',
            compliance: indicatorResults.find(i => i.indicator === 'results')?.compliance_percentage || 0
          },
          {
            principle: 'Accountability',
            compliance: indicatorResults.find(i => i.indicator === 'accountability')?.compliance_percentage || 0
          }
        ]
      }
    })

  } catch (error) {
    console.error('Error in gpedc-compliance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
