import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { excludeInternalTransfers, getPooledFundIds, getReportableActivityIds } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic'

function safeCode(codelist: string, code: string): { code: string; name: string } {
  try {
    return codeAndName(codelist as any, code)
  } catch {
    return { code, name: code }
  }
}

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Only published & non-deleted activities are reportable.
    const reportableIds = await getReportableActivityIds(supabase);
    if (!reportableIds.length) return NextResponse.json({ data: [], error: null });

    // Exclude internal pooled-fund transfers to avoid double counting
    let txQuery = supabase
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
    const pooledFundIds = await getPooledFundIds(supabase)
    txQuery = excludeInternalTransfers(txQuery, pooledFundIds)
    const { data: transactions, error } = await txQuery

    if (error) {
      console.error('[Reports API] Error fetching transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const byType = new Map<string, { count: number; total: number }>()
    let grandTotal = 0
    transactions.forEach(t => {
      const key = t.transaction_type ?? ''
      const existing = byType.get(key) || { count: 0, total: 0 }
      existing.count += 1
      existing.total += (t.value_usd || 0)
      byType.set(key, existing)
      grandTotal += (t.value_usd || 0)
    })

    const reportData = Array.from(byType.entries())
      .map(([code, v]) => {
        const type = safeCode('transaction_type', code)
        return {
          transaction_type_code: type.code,
          transaction_type_name: type.name,
          transaction_count: v.count,
          total_value_usd: Math.round(v.total),
          percentage_of_total: grandTotal > 0
            ? Math.round((v.total / grandTotal) * 100 * 10) / 10
            : 0,
        }
      })
      .sort((a, b) => b.total_value_usd - a.total_value_usd)

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
