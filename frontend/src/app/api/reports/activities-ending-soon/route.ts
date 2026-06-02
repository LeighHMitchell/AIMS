import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { titleWithAcronym, orgWithAcronym } from '@/lib/reports/format-helpers';

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, other_identifier, iati_identifier, title_narrative, acronym, activity_status, planned_end_date, actual_end_date, reporting_org_id, created_by_org_name')
      .eq('publication_status', 'published')
      .is('deleted_at', null)

    if (error) {
      console.error('[Reports API] Error fetching activities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activities', details: error.message },
        { status: 500 }
      )
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Window: from today through the next 12 months
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setMonth(horizon.getMonth() + 12)

    const ending = activities.filter(a => {
      const endStr = a.actual_end_date || a.planned_end_date
      if (!endStr) return false
      const end = new Date(endStr)
      if (isNaN(end.getTime())) return false
      return end >= today && end <= horizon
    })

    if (ending.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const activityIds = ending.map(a => a.id)

    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, usd_value, currency')
      .in('activity_id', activityIds)
      .is('deleted_at', null)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)
      .is('deleted_at', null)

    const reportingOrgIds = ending
      .map(a => a.reporting_org_id)
      .filter((id): id is string => id != null)

    const { data: organizations } = reportingOrgIds.length > 0
      ? await supabase.from('organizations').select('id, name, acronym').in('id', reportingOrgIds)
      : { data: [] }

    const budgetByActivity = new Map<string, number>()
    budgets?.forEach(b => {
      const usd = (b.usd_value != null && Number.isFinite(Number(b.usd_value)))
        ? Number(b.usd_value)
        : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0)
      budgetByActivity.set(b.activity_id, (budgetByActivity.get(b.activity_id) || 0) + usd)
    })

    const disbursedByActivity = new Map<string, number>()
    transactions?.forEach(t => {
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        disbursedByActivity.set(t.activity_id, (disbursedByActivity.get(t.activity_id) || 0) + (t.value_usd || 0))
      }
    })

    const orgById = new Map<string, { name: string; acronym: string | null }>()
    organizations?.forEach(o => orgById.set(o.id, { name: o.name, acronym: o.acronym }))

    const reportData = ending
      .map(a => {
        const org = a.reporting_org_id ? orgById.get(a.reporting_org_id) : null
        const reportingOrg = orgWithAcronym(org?.name, org?.acronym, a.created_by_org_name)
        // Sort key keeps the original actual-or-planned effective end date.
        const effectiveEnd = a.actual_end_date || a.planned_end_date || ''
        const budget = Math.round(budgetByActivity.get(a.id) || 0)
        const disbursed = Math.round(disbursedByActivity.get(a.id) || 0)
        const status = codeAndName('activity_status', a.activity_status)
        return {
          activity_identifier: a.other_identifier || '',
          iati_identifier: a.iati_identifier || '',
          title: titleWithAcronym(a.title_narrative, a.acronym),
          reporting_org: reportingOrg,
          activity_status_code: status.code,
          activity_status_name: status.name,
          planned_end_date: a.planned_end_date || '',
          actual_end_date: a.actual_end_date || '',
          effective_end: effectiveEnd,
          total_budget: budget,
          total_disbursed: disbursed,
          undisbursed_balance: budget - disbursed,
        }
      })
      .sort((a, b) => (a.effective_end < b.effective_end ? -1 : a.effective_end > b.effective_end ? 1 : 0))

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
