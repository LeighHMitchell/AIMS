import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { orgWithAcronym } from '@/lib/reports/format-helpers';

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
      .select('id, activity_status, reporting_org_id, created_by_org_name')
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

    const activityIds = activities.map(a => a.id)

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

    const reportingOrgIds = activities
      .map(a => a.reporting_org_id)
      .filter((id): id is string => id != null)

    const { data: organizations } = reportingOrgIds.length > 0
      ? await supabase.from('organizations').select('id, name, acronym, type').in('id', reportingOrgIds)
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

    const orgById = new Map<string, { name: string; acronym: string | null; type: string | null }>()
    organizations?.forEach(o => orgById.set(o.id, { name: o.name, acronym: o.acronym, type: o.type }))

    // Aggregate per reporting organisation (fall back to created_by_org_name)
    const aggregated = new Map<string, { name: string | null; acronym: string | null; fallback: string | null; type: string; count: number; active: number; budget: number; disbursed: number }>()
    activities.forEach(a => {
      const org = a.reporting_org_id ? orgById.get(a.reporting_org_id) : null
      const key = a.reporting_org_id || a.created_by_org_name || 'Unknown'
      const existing = aggregated.get(key) || { name: org?.name ?? null, acronym: org?.acronym ?? null, fallback: a.created_by_org_name ?? null, type: org?.type || '', count: 0, active: 0, budget: 0, disbursed: 0 }
      existing.count += 1
      // IATI ActivityStatus code 2 = Implementation
      if (a.activity_status === '2') existing.active += 1
      existing.budget += budgetByActivity.get(a.id) || 0
      existing.disbursed += disbursedByActivity.get(a.id) || 0
      aggregated.set(key, existing)
    })

    const reportData = Array.from(aggregated.values())
      .map(v => {
        const orgType = codeAndName('organization_type', v.type)
        return {
          organization_name: orgWithAcronym(v.name, v.acronym, v.fallback),
          organization_type_code: orgType.code,
          organization_type_name: orgType.name,
          activity_count: v.count,
          active_activities: v.active,
          total_budget: Math.round(v.budget),
          total_disbursed: Math.round(v.disbursed),
        }
      })
      .sort((a, b) => b.total_disbursed - a.total_disbursed)

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
