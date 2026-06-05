import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { titleWithAcronym } from '@/lib/reports/format-helpers';
import { getReportableActivityIds } from '@/lib/analytics-transaction-filters';
import { safeUsd } from '@/lib/safe-usd';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000
const round2 = (n: number) => Math.round(n * 100) / 100
// IATI BudgetType: 1 = Original, 2 = Revised.
const BUDGET_TYPE: Record<string, string> = { '1': 'Original', '2': 'Revised' }

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Published + non-deleted activities only.
    const reportableIds = await getReportableActivityIds(supabase)
    if (!reportableIds.length) return NextResponse.json({ data: [], error: null })

    const { data: budgets, error } = await supabase
      .from('activity_budgets')
      .select('activity_id, type, status, period_start, period_end, value, usd_value, currency')
      .in('activity_id', reportableIds)
      .is('deleted_at', null)
      .order('period_start', { ascending: true })

    if (error) {
      console.error('[Reports API] Error fetching budgets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch budgets', details: error.message },
        { status: 500 }
      )
    }
    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Resolve activity identifiers + title for context.
    const actIds = Array.from(new Set(budgets.map(b => b.activity_id).filter(Boolean))) as string[]
    const actById = new Map<string, { other: string; iati: string; title: string }>()
    for (let i = 0; i < actIds.length; i += PAGE_SIZE) {
      const slice = actIds.slice(i, i + PAGE_SIZE)
      const { data: acts } = await supabase
        .from('activities')
        .select('id, other_identifier, iati_identifier, title_narrative, acronym')
        .in('id', slice)
      acts?.forEach(a => actById.set(a.id, {
        other: a.other_identifier || '',
        iati: a.iati_identifier || '',
        title: titleWithAcronym(a.title_narrative, a.acronym),
      }))
    }

    const reportData = budgets.map(b => {
      const act = actById.get(b.activity_id)
      const status = codeAndName('budget_status', b.status)
      return {
        activity_identifier: act?.other || '',
        iati_identifier: act?.iati || '',
        activity_title: act?.title || '',
        budget_type_code: b.type != null ? String(b.type) : '',
        budget_type_name: b.type != null ? (BUDGET_TYPE[String(b.type)] || '') : '',
        budget_status_code: status.code,
        budget_status_name: status.name,
        period_start: b.period_start || '',
        period_end: b.period_end || '',
        value: b.value != null ? b.value : '',
        currency: b.currency || '',
        value_usd: round2(safeUsd(b)),
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
