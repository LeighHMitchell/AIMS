import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Activity status mapping
const ACTIVITY_STATUS_MAP: Record<string, string> = {
  '1': 'Pipeline/Identification',
  '2': 'Implementation',
  '3': 'Finalisation',
  '4': 'Closed',
  '5': 'Cancelled',
  '6': 'Suspended',
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch activities with related data
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        iati_identifier,
        title_narrative,
        activity_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        reporting_org_id,
        created_by_org_name
      `)
      .order('title_narrative', { ascending: true })

    if (activitiesError) {
      console.error('[Reports API] Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: activitiesError.message },
        { status: 500 }
      )
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Get activity IDs for batch queries
    const activityIds = activities.map(a => a.id)

    // Fetch sectors for all activities
    const { data: sectors } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_name')
      .in('activity_id', activityIds)

    // Fetch locations for all activities
    const { data: locations } = await supabase
      .from('activity_locations')
      .select('activity_id, name, admin1_name')
      .in('activity_id', activityIds)

    // Fetch transactions for budget and disbursement totals
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)

    // Fetch budgets
    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value')
      .in('activity_id', activityIds)

    // Fetch reporting organizations
    const reportingOrgIds = activities
      .map(a => a.reporting_org_id)
      .filter((id): id is string => id !== null)
    
    const { data: organizations } = reportingOrgIds.length > 0
      ? await supabase
          .from('organizations')
          .select('id, name, acronym')
          .in('id', reportingOrgIds)
      : { data: [] }

    // Create lookup maps
    const sectorsByActivity = new Map<string, string[]>()
    sectors?.forEach(s => {
      const existing = sectorsByActivity.get(s.activity_id) || []
      if (s.sector_name && !existing.includes(s.sector_name)) {
        existing.push(s.sector_name)
      }
      sectorsByActivity.set(s.activity_id, existing)
    })

    const locationsByActivity = new Map<string, string[]>()
    locations?.forEach(l => {
      const existing = locationsByActivity.get(l.activity_id) || []
      const locationName = l.admin1_name || l.name
      if (locationName && !existing.includes(locationName)) {
        existing.push(locationName)
      }
      locationsByActivity.set(l.activity_id, existing)
    })

    const budgetByActivity = new Map<string, number>()
    budgets?.forEach(b => {
      const existing = budgetByActivity.get(b.activity_id) || 0
      budgetByActivity.set(b.activity_id, existing + (b.value || 0))
    })

    const disbursementByActivity = new Map<string, number>()
    transactions?.forEach(t => {
      // Transaction types 3 and 4 are disbursements and expenditures
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        const existing = disbursementByActivity.get(t.activity_id) || 0
        disbursementByActivity.set(t.activity_id, existing + (t.value_usd || 0))
      }
    })

    const orgById = new Map<string, { name: string; acronym: string | null }>()
    organizations?.forEach(o => {
      orgById.set(o.id, { name: o.name, acronym: o.acronym })
    })

    // Transform data for export
    const reportData = activities.map(activity => {
      const org = activity.reporting_org_id ? orgById.get(activity.reporting_org_id) : null
      const reportingOrg = org?.acronym || org?.name || activity.created_by_org_name || 'Unknown'
      
      return {
        iati_identifier: activity.iati_identifier || '',
        title: activity.title_narrative || '',
        status: ACTIVITY_STATUS_MAP[activity.activity_status] || activity.activity_status || '',
        reporting_org: reportingOrg,
        start_date: activity.actual_start_date || activity.planned_start_date || '',
        end_date: activity.actual_end_date || activity.planned_end_date || '',
        total_budget: Math.round(budgetByActivity.get(activity.id) || 0),
        total_disbursed: Math.round(disbursementByActivity.get(activity.id) || 0),
        sectors: (sectorsByActivity.get(activity.id) || []).join('; '),
        locations: (locationsByActivity.get(activity.id) || []).join('; '),
      }
    })

    const response = NextResponse.json({ data: reportData, error: null })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


