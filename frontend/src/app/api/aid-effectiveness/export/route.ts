import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

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
        sectors!inner(sector_code, name),
        locations,
        transactions!inner(
          provider_org_id,
          value,
          transaction_type,
          organizations!provider_org_id(name, acronym)
        ),
        organizations!created_by_org_id(name, acronym, type)
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
      return NextResponse.json(
        { error: 'No activities found for the specified criteria' },
        { status: 404 }
      )
    }

    // Prepare CSV data
    const csvHeaders = [
      'Activity ID',
      'Activity Title',
      'Donor',
      'Implementing Partner',
      'Sector',
      'Country',
      'Status',
      'Start Date',
      'End Date',
      'Implementing Partner Field',
      'Linked to Gov Framework',
      'Supports Public Sector',
      'Number of Outcome Indicators',
      'Indicators from Government',
      'Indicators via Gov Data',
      'Final Evaluation Planned',
      'Final Evaluation Date',
      'Gov Budget System',
      'Gov Financial Reporting',
      'Gov Audit System',
      'Gov Procurement System',
      'Annual Budget Shared',
      'Forward Plan Shared',
      'Tied Status',
      'Contact Name',
      'Contact Organization',
      'Contact Email',
      'External Document Link',
      'Remarks',
      'GPEDC Compliant'
    ]

    const csvRows = activities.map((activity: any) => {
      const aidEffectiveness = activity.general_info?.aidEffectiveness || {}
      const donor = activity.transactions?.[0]?.organizations?.acronym || activity.transactions?.[0]?.organizations?.name || 'Unknown'
      const implementingPartner = activity.organizations?.acronym || activity.organizations?.name || 'Unknown'
      const sector = activity.sectors?.[0]?.name || 'Unknown'
      const country = activity.locations?.[0]?.country_name || 'Unknown'

      // Calculate GPEDC compliance
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

      return [
        activity.id,
        activity.title_narrative || '',
        donor,
        implementingPartner,
        sector,
        country,
        activity.activity_status || '',
        activity.planned_start_date || '',
        activity.planned_end_date || '',
        aidEffectiveness.implementingPartner || '',
        aidEffectiveness.linkedToGovFramework || '',
        aidEffectiveness.supportsPublicSector || '',
        aidEffectiveness.numOutcomeIndicators || '',
        aidEffectiveness.indicatorsFromGov || '',
        aidEffectiveness.indicatorsViaGovData || '',
        aidEffectiveness.finalEvalPlanned || '',
        aidEffectiveness.finalEvalDate || '',
        aidEffectiveness.govBudgetSystem || '',
        aidEffectiveness.govFinReporting || '',
        aidEffectiveness.govAudit || '',
        aidEffectiveness.govProcurement || '',
        aidEffectiveness.annualBudgetShared || '',
        aidEffectiveness.forwardPlanShared || '',
        aidEffectiveness.tiedStatus || '',
        aidEffectiveness.contactName || '',
        aidEffectiveness.contactOrg || '',
        aidEffectiveness.contactEmail || '',
        aidEffectiveness.externalDocumentLink || '',
        aidEffectiveness.remarks || '',
        isCompliant ? 'Yes' : 'No'
      ]
    })

    // Generate CSV content
    const csvContent = [
      csvHeaders.join(','),
            ...csvRows.map((row: any) =>
        row.map((cell: any) => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(',')
      )
    ].join('\n')

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="aid-effectiveness-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error in aid-effectiveness export API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
