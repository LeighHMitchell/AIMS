import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';

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
      .select('id, iati_identifier, title_narrative, activity_status, reporting_org_id, created_by_org_name')

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

    const activityIds = activities.map(a => a.id)

    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('activity_id, value, usd_value, currency')
      .in('activity_id', activityIds)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('activity_id', activityIds)

    const reportingOrgIds = activities
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

    const reportData = activities
      .map(a => {
        const budget = Math.round(budgetByActivity.get(a.id) || 0)
        const disbursed = Math.round(disbursedByActivity.get(a.id) || 0)
        const org = a.reporting_org_id ? orgById.get(a.reporting_org_id) : null
        const status = codeAndName('activity_status', a.activity_status)
        return {
          iati_identifier: a.iati_identifier || '',
          title: a.title_narrative || '',
          reporting_org: org?.acronym || org?.name || a.created_by_org_name || 'Unknown',
          activity_status_name: status.name,
          total_budget: budget,
          total_disbursed: disbursed,
          undisbursed_balance: budget - disbursed,
          execution_rate: budget > 0 ? Math.round((disbursed / budget) * 100 * 10) / 10 : 0,
        }
      })
      // Only meaningful for activities that have a budget to execute against
      .filter(r => r.total_budget > 0)
      .sort((a, b) => b.execution_rate - a.execution_rate)

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
