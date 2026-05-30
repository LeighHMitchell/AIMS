import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { titleWithAcronym, orgWithAcronym, admLevelSummary } from '@/lib/reports/format-helpers';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch activities with related data
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        iati_identifier,
        title_narrative,
        acronym,
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
      .select('activity_id, sector_code, sector_name')
      .in('activity_id', activityIds)

    // Fetch locations for all activities (incl. admin-hierarchy fields for ADM level)
    const { data: locations } = await supabase
      .from('activity_locations')
      .select('activity_id, location_name, state_region_name, state_region_code, district_name, district_code, township_name, township_code, admin_level')
      .in('activity_id', activityIds)

    // Fetch transactions for budget and disbursement totals
    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)

    // Fetch budgets
    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, usd_value, currency')
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
      const label = [s.sector_code, s.sector_name].filter(Boolean).join(' – ')
      if (label && !existing.includes(label)) {
        existing.push(label)
      }
      sectorsByActivity.set(s.activity_id, existing)
    })

    const locationsByActivity = new Map<string, string[]>()
    const locationRowsByActivity = new Map<string, any[]>()
    locations?.forEach(l => {
      const existing = locationsByActivity.get(l.activity_id) || []
      const locationName = l.state_region_name || l.location_name
      if (locationName && !existing.includes(locationName)) {
        existing.push(locationName)
      }
      locationsByActivity.set(l.activity_id, existing)

      const rows = locationRowsByActivity.get(l.activity_id) || []
      rows.push(l)
      locationRowsByActivity.set(l.activity_id, rows)
    })

    const budgetByActivity = new Map<string, number>()
    budgets?.forEach(b => {
      // Currency-safe: prefer converted USD; only fall back to raw value when currency is USD.
      const usd = (b.usd_value != null && Number.isFinite(Number(b.usd_value)))
        ? Number(b.usd_value)
        : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0)
      const existing = budgetByActivity.get(b.activity_id) || 0
      budgetByActivity.set(b.activity_id, existing + usd)
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
      const reportingOrg = orgWithAcronym(org?.name, org?.acronym, activity.created_by_org_name)
      const status = codeAndName('activity_status', activity.activity_status)

      return {
        iati_identifier: activity.iati_identifier || '',
        title: titleWithAcronym(activity.title_narrative, activity.acronym),
        activity_status_code: status.code,
        activity_status_name: status.name,
        reporting_org: reportingOrg,
        // Planned vs actual kept explicit (no silent fallback).
        planned_start_date: activity.planned_start_date || '',
        actual_start_date: activity.actual_start_date || '',
        planned_end_date: activity.planned_end_date || '',
        actual_end_date: activity.actual_end_date || '',
        total_budget: Math.round(budgetByActivity.get(activity.id) || 0),
        total_disbursed: Math.round(disbursementByActivity.get(activity.id) || 0),
        sectors: (sectorsByActivity.get(activity.id) || []).join('; '),
        locations: (locationsByActivity.get(activity.id) || []).join('; '),
        adm_levels: admLevelSummary(locationRowsByActivity.get(activity.id) || []),
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



