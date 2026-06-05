import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getReportableActivityIds,
  getPooledFundIds,
  excludeInternalTransfers,
  txUsd,
} from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic';

/**
 * Disbursement timeliness by provider — planned vs actual disbursement DATES.
 *
 * Each activity has a planned disbursement schedule (planned_disbursements: a
 * target amount due by a period-end date) and an actual disbursement stream
 * (transactions, type 3). For each planned tranche we compute the cumulative
 * planned target at its due date, then find the earliest point at which the
 * activity's cumulative ACTUAL disbursements reached that target — the
 * fulfilment date. Lateness = fulfilment date − planned due date (days).
 *
 *  - on time : fulfilled on or before the planned due date (lateness ≤ 0)
 *  - late    : fulfilled after, or not yet fulfilled though already due
 * Only tranches whose due date is in the past are judged. Results are grouped
 * by the tranche's provider organisation (≥3 judged tranches, top 10 by
 * on-time share).
 *
 * Canonical rules for actuals: published & non-deleted activities, status
 * 'actual', disbursements only, internal pooled-fund transfers excluded, USD.
 */

const PAGE = 1000;
const DAY = 86_400_000;

async function fetchAll(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function GET() {
  const { supabase, response } = await requireAuth();
  if (response) return response;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const NOW = new Date().getTime();

  try {
    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) return NextResponse.json({ data: [] });
    const pooledFundIds = await getPooledFundIds(supabase);

    // Planned schedule (only tranches with a USD amount and a due date).
    const planned = await fetchAll((from, to) =>
      supabase
        .from('planned_disbursements')
        .select('activity_id, provider_org_id, provider_org_name, period_start, period_end, usd_amount')
        .in('activity_id', reportableIds)
        .range(from, to)
    );

    // Actual disbursements.
    const actuals = await fetchAll((from, to) => {
      let q = supabase
        .from('transactions')
        .select('activity_id, transaction_date, value, value_usd, currency, provider_org_id, provider_org_name, receiver_activity_uuid')
        .eq('transaction_type', '3')
        .eq('status', 'actual')
        .is('deleted_at', null)
        .in('activity_id', reportableIds)
        .range(from, to);
      q = excludeInternalTransfers(q, pooledFundIds, ['3']);
      return q;
    });

    // Per-activity cumulative actual stream, sorted by date.
    const actualsByActivity = new Map<string, { t: number; cum: number }[]>();
    const rawActuals = new Map<string, { t: number; amt: number }[]>();
    for (const r of actuals) {
      if (!r.transaction_date) continue;
      const amt = txUsd(r);
      if (amt <= 0) continue;
      const arr = rawActuals.get(r.activity_id) || [];
      arr.push({ t: new Date(r.transaction_date).getTime(), amt });
      rawActuals.set(r.activity_id, arr);
    }
    // Planned disbursements rarely carry a provider in this data, so attribute
    // each activity's tranches to the partner who actually did the disbursing
    // (largest actual-disbursement total for that activity).
    const provAgg = new Map<string, Map<string, { name: string; amt: number }>>();
    for (const r of actuals) {
      const amt = txUsd(r);
      if (amt <= 0) continue;
      const pk = r.provider_org_id || r.provider_org_name;
      if (!pk) continue;
      const m = provAgg.get(r.activity_id) || new Map<string, { name: string; amt: number }>();
      const cur = m.get(pk.toString()) || { name: r.provider_org_name || 'Unknown organisation', amt: 0 };
      cur.amt += amt;
      m.set(pk.toString(), cur);
      provAgg.set(r.activity_id, m);
    }
    const providerByActivity = new Map<string, { key: string; name: string }>();
    Array.from(provAgg.entries()).forEach(([act, m]) => {
      const ranked = Array.from(m.entries()).sort((a, b) => b[1].amt - a[1].amt);
      if (ranked.length) providerByActivity.set(act, { key: ranked[0][0], name: ranked[0][1].name });
    });

    Array.from(rawActuals.entries()).forEach(([act, arr]) => {
      arr.sort((a, b) => a.t - b.t);
      let cum = 0;
      const cumArr = arr.map((x) => {
        cum += x.amt;
        return { t: x.t, cum };
      });
      actualsByActivity.set(act, cumArr);
    });

    // Per-activity planned tranches, sorted by due date.
    const plannedByActivity = new Map<string, { due: number; amt: number; provKey: string; provName: string }[]>();
    for (const p of planned) {
      const amt = Number(p.usd_amount) || 0;
      if (amt <= 0) continue;
      const dueRaw = p.period_end || p.period_start;
      if (!dueRaw) continue;
      const provKey = (p.provider_org_id || p.provider_org_name || 'unattributed').toString();
      const provName = p.provider_org_name || 'Unattributed';
      const arr = plannedByActivity.get(p.activity_id) || [];
      arr.push({ due: new Date(dueRaw).getTime(), amt, provKey, provName });
      plannedByActivity.set(p.activity_id, arr);
    }

    // Walk each activity's planned schedule cumulatively, judging past-due tranches.
    const stats = new Map<string, { name: string; onTime: number; total: number; totalDelay: number }>();
    const bump = (key: string, name: string, onTime: boolean, delayDays: number) => {
      const cur = stats.get(key) || { name, onTime: 0, total: 0, totalDelay: 0 };
      cur.total += 1;
      if (onTime) cur.onTime += 1;
      else cur.totalDelay += Math.max(0, delayDays);
      stats.set(key, cur);
    };

    Array.from(plannedByActivity.entries()).forEach(([act, tranches]) => {
      tranches.sort((a, b) => a.due - b.due);
      const cumActual = actualsByActivity.get(act) || [];
      let cumPlanned = 0;
      // Prefer the planned tranche's own provider; fall back to who actually
      // disbursed for this activity; finally 'Unattributed'.
      const actProv = providerByActivity.get(act);
      for (const tr of tranches) {
        cumPlanned += tr.amt;
        if (tr.due > NOW) continue; // not yet due → can't judge
        const provKey = tr.provKey !== 'unattributed' ? tr.provKey : actProv?.key ?? 'unattributed';
        const provName = tr.provKey !== 'unattributed' ? tr.provName : actProv?.name ?? 'Unattributed';
        // earliest actual point whose cumulative ≥ this cumulative planned target
        let fulfilment: number | null = null;
        for (const a of cumActual) {
          if (a.cum >= cumPlanned) {
            fulfilment = a.t;
            break;
          }
        }
        if (fulfilment != null) {
          const lateness = Math.round((fulfilment - tr.due) / DAY);
          bump(provKey, provName, lateness <= 0, lateness);
        } else {
          // not yet fulfilled though already due → late by however long it's been overdue
          bump(provKey, provName, false, Math.round((NOW - tr.due) / DAY));
        }
      }
    });

    const data = Array.from(stats.values())
      .filter((s) => s.total >= 3)
      .map((s) => {
        const late = s.total - s.onTime;
        return {
          donor: s.name,
          onTimePercentage: Math.round((s.onTime / s.total) * 100),
          averageDelay: late > 0 ? Math.round(s.totalDelay / late) : 0,
          totalTransactions: s.total,
        };
      })
      .sort((a, b) => b.onTimePercentage - a.onTimePercentage)
      .slice(0, 10);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[disbursement-timeliness] error:', error);
    return NextResponse.json({ error: 'Failed to compute timeliness' }, { status: 500 });
  }
}
