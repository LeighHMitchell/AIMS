import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getReportableActivityIds,
  getPooledFundIds,
  excludeInternalTransfers,
  txUsd,
} from '@/lib/analytics-transaction-filters';
import { getContributions } from '@/components/government/contribution-types';

/**
 * Government (RGC) contribution vs external development-partner financing.
 *
 * - external: USD disbursements (type 3) on published activities, internal
 *   transfers excluded — i.e. what development partners actually disbursed.
 * - governmentFinancial: sum of recipient-government counterpart *financial*
 *   contributions (lump-sum amountUSD, or the sum of annual rows).
 * - governmentInKind: estimated USD value of in-kind + other contributions
 *   (staff, facilities, tax exemptions, …).
 *
 * Figures are cumulative "to date" (not date-windowed): government counterpart
 * contributions are activity-level commitments without a reliable per-period
 * breakdown, so date-slicing them would be misleading. Both sides are summed
 * over the same published-activity universe.
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = request.nextUrl.searchParams;
    const dateFrom = sp.get('dateFrom');
    const dateTo = sp.get('dateTo');
    const fromMs = dateFrom ? Date.parse(dateFrom) : null;
    const toMs = dateTo ? Date.parse(dateTo) : null;
    const fromYear = fromMs != null ? new Date(fromMs).getFullYear() : null;
    const toYear = toMs != null ? new Date(toMs).getFullYear() : null;
    // A government contribution counts if it falls in the window. Undated
    // entries (no valueDate / no annual year) can't be placed in time, so they
    // are always counted — surfaced in the chart's explainer.
    const inWindow = (d?: string | null): boolean => {
      if (fromMs == null && toMs == null) return true;
      if (!d) return true;
      const t = Date.parse(d);
      if (Number.isNaN(t)) return true;
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    };
    const yearInWindow = (y?: number | null): boolean => {
      if (fromYear == null && toYear == null) return true;
      if (y == null) return true;
      if (fromYear != null && y < fromYear) return false;
      if (toYear != null && y > toYear) return false;
      return true;
    };

    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) {
      return NextResponse.json({ external: 0, governmentFinancial: 0, governmentInKind: 0 });
    }
    const pooledFundIds = await getPooledFundIds(supabase);

    // External financing = actual disbursements (date-windowed).
    let txq = supabase
      .from('transactions')
      .select('value, value_usd, currency, activity_id')
      .eq('transaction_type', '3')
      .eq('status', 'actual')
      .in('activity_id', reportableIds);
    if (dateFrom) txq = txq.gte('transaction_date', dateFrom);
    if (dateTo) txq = txq.lte('transaction_date', dateTo);
    txq = excludeInternalTransfers(txq, pooledFundIds, ['3']);
    const { data: txs, error: txErr } = await txq;
    if (txErr) {
      console.error('[GovContribution] transactions error:', txErr);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
    const external = (txs || []).reduce((sum, t) => sum + txUsd(t), 0);

    // Government counterpart contributions.
    const { data: govRows, error: govErr } = await supabase
      .from('government_inputs')
      .select('activity_id, rgc_contribution')
      .in('activity_id', reportableIds);
    if (govErr) {
      console.error('[GovContribution] government_inputs error:', govErr);
      return NextResponse.json({ error: 'Failed to fetch government inputs' }, { status: 500 });
    }

    let governmentFinancial = 0;
    let governmentInKind = 0;
    for (const row of govRows || []) {
      const contributions = getContributions((row as any).rgc_contribution);
      for (const c of contributions) {
        if (c.type === 'financial') {
          const annual = Array.isArray(c.annual) ? c.annual : [];
          if (c.distributionMode === 'annual' && annual.length) {
            governmentFinancial += annual.reduce(
              (s, r) => s + (yearInWindow(r.year) ? (Number(r.amountUSD) || 0) : 0),
              0,
            );
          } else if (inWindow(c.valueDate)) {
            governmentFinancial += Number(c.amountUSD) || 0;
          }
        } else if (inWindow((c as any).valueDate)) {
          governmentInKind += Number((c as any).estimatedValueUSD) || 0;
        }
      }
    }

    return NextResponse.json({ external, governmentFinancial, governmentInKind });
  } catch (e) {
    console.error('[GovContribution] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
