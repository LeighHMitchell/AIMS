import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getReportableActivityIds,
  getPooledFundIds,
  excludeInternalTransfers,
  txUsd,
} from '@/lib/analytics-transaction-filters';
import {
  buildHistogram,
  madFences,
  iqrFences,
  fenceToOriginal,
  summarize,
  type Fences,
  type HistogramBin,
  type DistributionSummary,
} from '@/lib/outlier-stats';

export const dynamic = 'force-dynamic';

/**
 * Outliers / distribution API.
 *
 * One endpoint, selected by `?metric=`:
 *   - transaction_value : USD value of every reportable transaction (log scale)
 *   - activity_size     : total disbursements (type 3) per published activity (log)
 *   - budget_spend_ratio: spend (3+4) ÷ budget per activity (linear ratio)
 *   - org_totals        : commitments+disbursements per provider org (log)
 *   - sector_totals     : disbursements allocated per DAC sector (log)
 *
 * Every metric returns the same envelope: { metric, unit, scale, summary,
 * fences, bins, outliers, outlierCount }. `outliers` are the flagged records
 * with enough fields for the client to render a drill-down table + link.
 *
 * All monetary metrics follow the canonical reporting rules: published &
 * non-deleted activities only, USD-converted amounts (txUsd), internal
 * pooled-fund transfers excluded.
 */

type Metric =
  | 'transaction_value'
  | 'activity_size'
  | 'budget_spend_ratio'
  | 'org_totals'
  | 'sector_totals';

interface OutlierRecord {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  /** how this record is unusual — drives the badge/colour client-side */
  kind: 'high' | 'low' | 'over' | 'under';
  href?: string;
}

/** One value for the strip/box-plot views: value, is-outlier flag, optional drill-down link. */
interface PointDto {
  v: number;
  o: boolean;
  href?: string;
}

interface OutliersResponse {
  metric: Metric;
  unit: 'usd' | 'ratio';
  scale: 'linear' | 'log10';
  summary: DistributionSummary;
  fences: Fences;
  /** count of values that couldn't enter a log histogram (≤ 0) */
  nonPositiveCount?: number;
  bins: HistogramBin[];
  /** every value (for strip & box-plot views); only outlier points carry an href */
  points: PointDto[];
  outliers: OutlierRecord[];
  outlierCount: number;
}

/** Build the per-value point list, flagging values beyond the fence and
 *  attaching a drill-down href only to those (keeps the payload lean). */
function buildPoints(items: Array<{ v: number; href?: string }>, fences: Fences): PointDto[] {
  return items.map(({ v, href }) => {
    const o =
      (fences.upper != null && v >= fences.upper) || (fences.lower != null && v <= fences.lower);
    return o ? { v, o: true, ...(href ? { href } : {}) } : { v, o: false };
  });
}

const PAGE = 1000;

/** Fetch every row of a transactions query, paging past the 1000-row cap. */
async function fetchAll(buildQuery: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const metric = (new URL(request.url).searchParams.get('metric') || 'transaction_value') as Metric;
  const madZ = Number(new URL(request.url).searchParams.get('z')) || 3.5;
  const method = (new URL(request.url).searchParams.get('method') || 'mad') as 'mad' | 'iqr';

  try {
    const reportableIds = await getReportableActivityIds(supabase);
    if (reportableIds.length === 0) {
      return NextResponse.json(emptyResponse(metric));
    }
    const pooledFundIds = await getPooledFundIds(supabase);

    switch (metric) {
      case 'transaction_value':
        return NextResponse.json(
          await transactionValue(supabase, reportableIds, pooledFundIds, method, madZ)
        );
      case 'activity_size':
        return NextResponse.json(
          await activitySize(supabase, reportableIds, pooledFundIds, method, madZ)
        );
      case 'budget_spend_ratio':
        return NextResponse.json(
          await budgetSpendRatio(supabase, reportableIds, pooledFundIds)
        );
      case 'org_totals':
        return NextResponse.json(
          await orgTotals(supabase, reportableIds, pooledFundIds, method, madZ)
        );
      case 'sector_totals':
        return NextResponse.json(
          await sectorTotals(supabase, reportableIds, pooledFundIds, method, madZ)
        );
      default:
        return NextResponse.json({ error: `Unknown metric: ${metric}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[outliers] error:', error);
    return NextResponse.json({ error: 'Failed to compute outliers' }, { status: 500 });
  }
}

function emptyResponse(metric: Metric): OutliersResponse {
  return {
    metric,
    unit: metric === 'budget_spend_ratio' ? 'ratio' : 'usd',
    scale: metric === 'budget_spend_ratio' ? 'linear' : 'log10',
    summary: summarize([]),
    fences: { lower: null, upper: null, method: 'mad' },
    bins: [],
    points: [],
    outliers: [],
    outlierCount: 0,
  };
}

function chooseFences(logOrLinearValues: number[], method: 'mad' | 'iqr', z: number): Fences {
  return method === 'iqr' ? iqrFences(logOrLinearValues) : madFences(logOrLinearValues, z);
}

const ACTIVITY_HREF = (id: string) => `/activities/${id}`;

// ─────────────────────────────────────────────────────────────────────────────
// transaction_value
// ─────────────────────────────────────────────────────────────────────────────
async function transactionValue(
  supabase: any,
  reportableIds: string[],
  pooledFundIds: string[],
  method: 'mad' | 'iqr',
  z: number
): Promise<OutliersResponse> {
  const rows = await fetchAll((from, to) => {
    let q = supabase
      .from('transactions')
      .select('uuid, value, value_usd, currency, transaction_type, transaction_date, activity_id, provider_org_name, receiver_org_name')
      .eq('status', 'actual')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to);
    q = excludeInternalTransfers(q, pooledFundIds, ['1', '2', '3', '4', '11', '13']);
    return q;
  });

  const titleMap = await activityTitleMap(supabase, rows.map((r) => r.activity_id));

  // Build a parallel array of {usd, row}; log histogram uses positive values only.
  const usdRows = rows
    .map((r) => ({ usd: txUsd(r), row: r }))
    .filter((x) => Number.isFinite(x.usd));
  const positive = usdRows.filter((x) => x.usd > 0);
  const nonPositiveCount = usdRows.length - positive.length;

  const values = positive.map((x) => x.usd);
  const logs = values.map((v) => Math.log10(v));
  const fencesLog = chooseFences(logs, method, z);
  const fences = fenceToOriginal(fencesLog, 'log10');

  const bins = buildHistogram(values, { space: 'log10', fencesInSpace: fencesLog });

  const outliers: OutlierRecord[] = positive
    .filter((x) => (fences.upper != null && x.usd >= fences.upper) || (fences.lower != null && x.usd <= fences.lower))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 200)
    .map((x) => {
      const t = x.row;
      const partner = t.provider_org_name || t.receiver_org_name || '';
      return {
        id: t.uuid,
        label: titleMap.get(t.activity_id) || 'Untitled activity',
        sublabel: [txTypeLabel(t.transaction_type), partner, t.transaction_date].filter(Boolean).join(' · '),
        value: x.usd,
        kind: (fences.upper != null && x.usd >= fences.upper ? 'high' : 'low') as 'high' | 'low',
        href: t.activity_id ? ACTIVITY_HREF(t.activity_id) : undefined,
      };
    });

  return {
    metric: 'transaction_value',
    unit: 'usd',
    scale: 'log10',
    summary: summarize(values),
    fences,
    nonPositiveCount,
    bins,
    points: buildPoints(
      positive.map((x) => ({ v: x.usd, href: x.row.activity_id ? ACTIVITY_HREF(x.row.activity_id) : undefined })),
      fences
    ),
    outliers,
    outlierCount: outliers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// activity_size — total disbursements (type 3) per published activity
// ─────────────────────────────────────────────────────────────────────────────
async function activitySize(
  supabase: any,
  reportableIds: string[],
  pooledFundIds: string[],
  method: 'mad' | 'iqr',
  z: number
): Promise<OutliersResponse> {
  const rows = await fetchAll((from, to) => {
    let q = supabase
      .from('transactions')
      .select('value, value_usd, currency, activity_id, receiver_activity_uuid')
      .eq('status', 'actual')
      .eq('transaction_type', '3')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to);
    q = excludeInternalTransfers(q, pooledFundIds, ['3']);
    return q;
  });

  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.activity_id, (totals.get(r.activity_id) || 0) + txUsd(r));
  }
  // Include every reportable activity (so $0-disbursement activities show up
  // as the empty-shell tail), but the log histogram only uses positive totals.
  const titleMap = await activityTitleMap(supabase, reportableIds);
  const entries = reportableIds.map((id) => ({ id, total: totals.get(id) || 0 }));

  const positive = entries.filter((e) => e.total > 0);
  const nonPositiveCount = entries.length - positive.length;

  const values = positive.map((e) => e.total);
  const logs = values.map((v) => Math.log10(v));
  const fencesLog = chooseFences(logs, method, z);
  const fences = fenceToOriginal(fencesLog, 'log10');
  const bins = buildHistogram(values, { space: 'log10', fencesInSpace: fencesLog });

  const outliers: OutlierRecord[] = positive
    .filter((e) => (fences.upper != null && e.total >= fences.upper) || (fences.lower != null && e.total <= fences.lower))
    .sort((a, b) => b.total - a.total)
    .slice(0, 200)
    .map((e) => ({
      id: e.id,
      label: titleMap.get(e.id) || 'Untitled activity',
      sublabel: 'Total disbursements',
      value: e.total,
      kind: (fences.upper != null && e.total >= fences.upper ? 'high' : 'low') as 'high' | 'low',
      href: ACTIVITY_HREF(e.id),
    }));

  return {
    metric: 'activity_size',
    unit: 'usd',
    scale: 'log10',
    summary: summarize(values),
    fences,
    nonPositiveCount,
    bins,
    points: buildPoints(
      positive.map((e) => ({ v: e.total, href: ACTIVITY_HREF(e.id) })),
      fences
    ),
    outliers,
    outlierCount: outliers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// budget_spend_ratio — spend (3+4) ÷ budget per activity
// ─────────────────────────────────────────────────────────────────────────────
async function budgetSpendRatio(
  supabase: any,
  reportableIds: string[],
  pooledFundIds: string[]
): Promise<OutliersResponse> {
  // Spend per activity (disbursements + expenditures)
  const txRows = await fetchAll((from, to) => {
    let q = supabase
      .from('transactions')
      .select('value, value_usd, currency, activity_id, receiver_activity_uuid')
      .eq('status', 'actual')
      .in('transaction_type', ['3', '4'])
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to);
    q = excludeInternalTransfers(q, pooledFundIds, ['3', '4']);
    return q;
  });
  const spend = new Map<string, number>();
  for (const r of txRows) spend.set(r.activity_id, (spend.get(r.activity_id) || 0) + txUsd(r));

  // Budget per activity (USD)
  const budgetRows = await fetchAll((from, to) =>
    supabase
      .from('activity_budgets')
      .select('activity_id, usd_value')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to)
  );
  const budget = new Map<string, number>();
  for (const b of budgetRows) {
    const v = Number(b.usd_value) || 0;
    budget.set(b.activity_id, (budget.get(b.activity_id) || 0) + v);
  }

  const titleMap = await activityTitleMap(supabase, reportableIds);

  // Only activities that have a positive budget can have a meaningful ratio.
  const ratios: { id: string; ratio: number; budget: number; spend: number }[] = [];
  for (const id of reportableIds) {
    const b = budget.get(id) || 0;
    if (b <= 0) continue;
    const s = spend.get(id) || 0;
    ratios.push({ id, ratio: s / b, budget: b, spend: s });
  }

  const values = ratios.map((r) => r.ratio);
  // Domain-rule fences rather than statistical: meaningful thresholds are
  // 0 (nothing spent) and >1.2 (overspend / likely data error).
  const fences: Fences = { lower: 0, upper: 1.2, method: 'ratio' };
  // Linear bins, but cap the x-axis at 2.0 so a single 50× overspend doesn't
  // flatten the whole histogram; everything ≥2 lands in the last bin.
  const capped = values.map((v) => Math.min(v, 2));
  const bins = buildHistogram(capped, {
    space: 'linear',
    nbins: 20,
    fencesInSpace: { lower: null, upper: 1.2 },
  });

  const outliers: OutlierRecord[] = ratios
    .filter((r) => r.ratio === 0 || r.ratio > 1.2)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 200)
    .map((r) => ({
      id: r.id,
      label: titleMap.get(r.id) || 'Untitled activity',
      sublabel:
        r.ratio === 0
          ? `Budget $${Math.round(r.budget).toLocaleString()} · nothing spent`
          : `Spend $${Math.round(r.spend).toLocaleString()} of $${Math.round(r.budget).toLocaleString()} budget`,
      value: r.ratio,
      kind: (r.ratio === 0 ? 'under' : 'over') as 'over' | 'under',
      href: ACTIVITY_HREF(r.id),
    }));

  return {
    metric: 'budget_spend_ratio',
    unit: 'ratio',
    scale: 'linear',
    summary: summarize(values),
    fences,
    bins,
    points: buildPoints(
      ratios.map((r) => ({ v: r.ratio, href: ACTIVITY_HREF(r.id) })),
      fences
    ),
    outliers,
    outlierCount: outliers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// org_totals — commitments + disbursements per provider org
// ─────────────────────────────────────────────────────────────────────────────
async function orgTotals(
  supabase: any,
  reportableIds: string[],
  pooledFundIds: string[],
  method: 'mad' | 'iqr',
  z: number
): Promise<OutliersResponse> {
  const rows = await fetchAll((from, to) => {
    let q = supabase
      .from('transactions')
      .select('value, value_usd, currency, provider_org_id, provider_org_name, activity_id, receiver_activity_uuid')
      .eq('status', 'actual')
      .in('transaction_type', ['2', '3'])
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to);
    q = excludeInternalTransfers(q, pooledFundIds, ['2', '3']);
    return q;
  });

  const totals = new Map<string, { name: string; total: number }>();
  for (const r of rows) {
    const key = r.provider_org_id || r.provider_org_name;
    if (!key) continue;
    const cur = totals.get(key) || { name: r.provider_org_name || 'Unknown organisation', total: 0 };
    cur.total += txUsd(r);
    totals.set(key, cur);
  }

  const entries = Array.from(totals.entries())
    .map(([id, v]) => ({ id, name: v.name, total: v.total }))
    .filter((e) => e.total > 0);

  const values = entries.map((e) => e.total);
  const logs = values.map((v) => Math.log10(v));
  const fencesLog = chooseFences(logs, method, z);
  const fences = fenceToOriginal(fencesLog, 'log10');
  const bins = buildHistogram(values, { space: 'log10', fencesInSpace: fencesLog });

  const outliers: OutlierRecord[] = entries
    .filter((e) => (fences.upper != null && e.total >= fences.upper) || (fences.lower != null && e.total <= fences.lower))
    .sort((a, b) => b.total - a.total)
    .slice(0, 200)
    .map((e) => ({
      id: e.id,
      label: e.name,
      sublabel: 'Commitments + disbursements (as provider)',
      value: e.total,
      kind: (fences.upper != null && e.total >= fences.upper ? 'high' : 'low') as 'high' | 'low',
    }));

  return {
    metric: 'org_totals',
    unit: 'usd',
    scale: 'log10',
    summary: summarize(values),
    fences,
    bins,
    points: buildPoints(entries.map((e) => ({ v: e.total })), fences),
    outliers,
    outlierCount: outliers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// sector_totals — disbursements allocated per DAC sector (activity %)
// ─────────────────────────────────────────────────────────────────────────────
async function sectorTotals(
  supabase: any,
  reportableIds: string[],
  pooledFundIds: string[],
  method: 'mad' | 'iqr',
  z: number
): Promise<OutliersResponse> {
  const txRows = await fetchAll((from, to) => {
    let q = supabase
      .from('transactions')
      .select('value, value_usd, currency, activity_id, receiver_activity_uuid')
      .eq('status', 'actual')
      .eq('transaction_type', '3')
      .is('deleted_at', null)
      .in('activity_id', reportableIds)
      .range(from, to);
    q = excludeInternalTransfers(q, pooledFundIds, ['3']);
    return q;
  });
  const disbByActivity = new Map<string, number>();
  for (const r of txRows) disbByActivity.set(r.activity_id, (disbByActivity.get(r.activity_id) || 0) + txUsd(r));

  // NB: the live activity_sectors table uses `percentage` (the 20250706
  // migration's `sector_percentage` no longer exists — verified against the DB).
  const sectorRows = await fetchAll((from, to) =>
    supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, percentage')
      .in('activity_id', reportableIds)
      .range(from, to)
  );

  const totals = new Map<string, { name: string; total: number }>();
  for (const s of sectorRows) {
    const disb = disbByActivity.get(s.activity_id) || 0;
    if (disb <= 0) continue;
    const pct = Number(s.percentage) || 0;
    if (pct <= 0) continue;
    const code = s.sector_code || 'unknown';
    const cur = totals.get(code) || { name: s.sector_name || code, total: 0 };
    cur.total += disb * (pct / 100);
    totals.set(code, cur);
  }

  const entries = Array.from(totals.entries())
    .map(([code, v]) => ({ code, name: v.name, total: v.total }))
    .filter((e) => e.total > 0);

  const values = entries.map((e) => e.total);
  const logs = values.map((v) => Math.log10(v));
  const fencesLog = chooseFences(logs, method, z);
  const fences = fenceToOriginal(fencesLog, 'log10');
  const bins = buildHistogram(values, { space: 'log10', fencesInSpace: fencesLog });

  const outliers: OutlierRecord[] = entries
    .filter((e) => (fences.upper != null && e.total >= fences.upper) || (fences.lower != null && e.total <= fences.lower))
    .sort((a, b) => b.total - a.total)
    .slice(0, 200)
    .map((e) => ({
      id: e.code,
      label: `${e.code} · ${e.name}`,
      sublabel: 'Disbursements allocated to this sector',
      value: e.total,
      kind: (fences.upper != null && e.total >= fences.upper ? 'high' : 'low') as 'high' | 'low',
    }));

  return {
    metric: 'sector_totals',
    unit: 'usd',
    scale: 'log10',
    summary: summarize(values),
    fences,
    bins,
    points: buildPoints(entries.map((e) => ({ v: e.total })), fences),
    outliers,
    outlierCount: outliers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
async function activityTitleMap(supabase: any, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < unique.length; i += PAGE) {
    const chunk = unique.slice(i, i + PAGE);
    const { data } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .in('id', chunk);
    for (const a of data || []) map.set(a.id, a.title_narrative || 'Untitled activity');
  }
  return map;
}

function txTypeLabel(code: string | number): string {
  const map: Record<string, string> = {
    '1': 'Incoming Funds',
    '2': 'Commitment',
    '3': 'Disbursement',
    '4': 'Expenditure',
    '5': 'Interest Payment',
    '6': 'Loan Repayment',
    '7': 'Reimbursement',
    '8': 'Purchase of Equity',
    '11': 'Incoming Commitment',
    '13': 'Incoming Pledge',
  };
  return map[String(code)] || `Type ${code}`;
}
