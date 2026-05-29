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
      .select('id, activity_status')

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

    // Budget per activity (currency-safe USD)
    const budgetByActivity = new Map<string, number>()
    budgets?.forEach(b => {
      const usd = (b.usd_value != null && Number.isFinite(Number(b.usd_value)))
        ? Number(b.usd_value)
        : ((b.currency ?? '').toString().toUpperCase() === 'USD' ? Number(b.value) || 0 : 0)
      budgetByActivity.set(b.activity_id, (budgetByActivity.get(b.activity_id) || 0) + usd)
    })

    // Disbursements (transaction types 3 and 4) per activity
    const disbursedByActivity = new Map<string, number>()
    transactions?.forEach(t => {
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        disbursedByActivity.set(t.activity_id, (disbursedByActivity.get(t.activity_id) || 0) + (t.value_usd || 0))
      }
    })

    // Aggregate by activity status
    const byStatus = new Map<string, { count: number; budget: number; disbursed: number }>()
    activities.forEach(a => {
      const key = a.activity_status ?? ''
      const existing = byStatus.get(key) || { count: 0, budget: 0, disbursed: 0 }
      existing.count += 1
      existing.budget += budgetByActivity.get(a.id) || 0
      existing.disbursed += disbursedByActivity.get(a.id) || 0
      byStatus.set(key, existing)
    })

    const totalActivities = activities.length

    const reportData = Array.from(byStatus.entries())
      .map(([code, v]) => {
        const status = codeAndName('activity_status', code)
        return {
          activity_status_code: status.code,
          activity_status_name: status.name,
          activity_count: v.count,
          percentage_of_activities: totalActivities > 0
            ? Math.round((v.count / totalActivities) * 100 * 10) / 10
            : 0,
          total_budget: Math.round(v.budget),
          total_disbursed: Math.round(v.disbursed),
        }
      })
      .sort((a, b) => b.activity_count - a.activity_count)

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
