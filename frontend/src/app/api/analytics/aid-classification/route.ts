import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getReportableActivityIds,
  getPooledFundIds,
  excludeInternalTransfers,
  txUsd,
} from '@/lib/analytics-transaction-filters';
import { TIED_STATUS_LABELS } from '@/types/transaction';
import flowTypesData from '@/data/flow-types.json';
import aidTypesData from '@/data/aid-types.json';

/**
 * Aid-classification breakdowns for the Country Analytics dashboard. Returns
 * commitments (type 2) and disbursements (type 3), USD-weighted, grouped three
 * ways: by Flow Type (ODA/OOF…), Aid Type (budget support, project-type…) and
 * Tied Status (untied/partially/tied). Each breakdown includes a "Not reported"
 * bucket so the chart reconciles with the underlying financial totals instead
 * of silently dropping un-classified value.
 *
 * Canonical aggregation: published + non-deleted activities, status='actual',
 * internal/pooled-fund transfers excluded, value via txUsd().
 */

const NOT_REPORTED = '__none__';
const NOT_REPORTED_LABEL = 'Not reported';

// code → name lookups
const flowMap = new Map<string, string>(
  (flowTypesData as Array<{ code: string; name: string }>).map((f) => [f.code, f.name]),
);
const aidMap = new Map<string, string>();
const flattenAid = (nodes: Array<{ code: string; name: string; children?: any[] }>) => {
  for (const n of nodes) {
    if (n.code) aidMap.set(n.code, n.name);
    if (n.children?.length) flattenAid(n.children);
  }
};
flattenAid(aidTypesData as any[]);

/** IATI CollaborationType codelist (activity-level field, not on transactions). */
const COLLABORATION_LABELS: Record<string, string> = {
  '1': 'Bilateral',
  '2': 'Multilateral (inflows)',
  '3': 'Multilateral (outflows)',
  '4': 'Bilateral, core contributions to NGOs/private bodies',
  '6': 'Private sector outflows',
  '7': 'Bilateral, ex-post NGO reporting',
  '8': 'Bilateral, triangular co-operation',
};

type Dim = 'flow' | 'aid' | 'tied' | 'collab';

const labelFor = (dim: Dim, code: string): string => {
  if (code === NOT_REPORTED) return NOT_REPORTED_LABEL;
  if (dim === 'flow') return flowMap.get(code) || code;
  if (dim === 'aid') return aidMap.get(code) || code;
  if (dim === 'collab') return COLLABORATION_LABELS[code] || code;
  return (TIED_STATUS_LABELS as Record<string, string>)[code] || code;
};

type Bucket = { disbursements: number; commitments: number };

function toArray(dim: Dim, m: Map<string, Bucket>) {
  return Array.from(m.entries())
    .map(([code, v]) => ({
      code,
      name: labelFor(dim, code),
      disbursements: v.disbursements,
      commitments: v.commitments,
    }))
    // Largest disbursement first, but always pin "Not reported" to the end.
    .sort((a, b) => {
      if (a.code === NOT_REPORTED) return 1;
      if (b.code === NOT_REPORTED) return -1;
      return b.disbursements - a.disbursements;
    })
    .filter((r) => r.disbursements !== 0 || r.commitments !== 0);
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = request.nextUrl.searchParams;
    const dateFrom = sp.get('dateFrom');
    const dateTo = sp.get('dateTo');

    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) {
      return NextResponse.json({ flow: [], aid: [], tied: [] });
    }
    const pooledFundIds = await getPooledFundIds(supabase);

    let q = supabase
      .from('transactions')
      .select(`
        activity_id,
        transaction_type,
        value,
        value_usd,
        currency,
        aid_type,
        flow_type,
        tied_status,
        activities!transactions_activity_id_fkey1 (
          default_flow_type,
          default_aid_type,
          default_tied_status,
          collaboration_type
        )
      `)
      .in('transaction_type', ['2', '3'])
      .eq('status', 'actual')
      .in('activity_id', reportableIds);

    if (dateFrom) q = q.gte('transaction_date', dateFrom);
    if (dateTo) q = q.lte('transaction_date', dateTo);
    q = excludeInternalTransfers(q, pooledFundIds, ['2', '3']);

    const { data: transactions, error } = await q;
    if (error) {
      console.error('[AidClassification] transactions error:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const flow = new Map<string, Bucket>();
    const aid = new Map<string, Bucket>();
    const tied = new Map<string, Bucket>();
    const collab = new Map<string, Bucket>();
    const add = (m: Map<string, Bucket>, code: string | null, isDisb: boolean, value: number) => {
      const key = code && String(code).trim() ? String(code).trim() : NOT_REPORTED;
      const b = m.get(key) || { disbursements: 0, commitments: 0 };
      if (isDisb) b.disbursements += value;
      else b.commitments += value;
      m.set(key, b);
    };

    for (const tx of transactions || []) {
      const value = txUsd(tx);
      if (!value) continue;
      const isDisb = String(tx.transaction_type) === '3';
      // Supabase returns the to-one relation as object or single-element array.
      const act: any = Array.isArray((tx as any).activities)
        ? (tx as any).activities[0]
        : (tx as any).activities;
      add(flow, (tx as any).flow_type || act?.default_flow_type, isDisb, value);
      add(aid, (tx as any).aid_type || act?.default_aid_type, isDisb, value);
      add(tied, (tx as any).tied_status || act?.default_tied_status, isDisb, value);
      // Collaboration type is an activity-level field only (no transaction equivalent).
      add(collab, act?.collaboration_type, isDisb, value);
    }

    return NextResponse.json({
      flow: toArray('flow', flow),
      aid: toArray('aid', aid),
      tied: toArray('tied', tied),
      collaboration: toArray('collab', collab),
    });
  } catch (e) {
    console.error('[AidClassification] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
