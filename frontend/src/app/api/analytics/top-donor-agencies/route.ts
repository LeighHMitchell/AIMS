import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { safeUsd } from '@/lib/safe-usd';
import { txUsd } from '@/lib/analytics-transaction-filters';

export const dynamic = 'force-dynamic';

type MetricType = 'budgets' | 'planned' | 'commitments' | 'disbursements';

interface DonorData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  byMetric: Record<string, number>;
  activityCount: number;
}

/**
 * GET /api/analytics/top-donor-agencies
 * Returns top 5 donor agencies + "OTHERS" aggregated, with support for 4 metrics
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    // Accept a comma-separated `metrics` list (budgets, planned, IATI
    // transaction types tx_1..tx_13, plus legacy commitments/disbursements);
    // fall back to the single `metric` param. All selected metrics are summed
    // per donor.
    const metricsParam = searchParams.get('metrics');
    const rawMetrics = metricsParam
      ? metricsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [searchParams.get('metric') || 'commitments'];
    let wantBudgets = false;
    let wantPlanned = false;
    const txCodes = new Set<string>();
    rawMetrics.forEach((m) => {
      if (m === 'budgets') wantBudgets = true;
      else if (m === 'planned') wantPlanned = true;
      else if (m === 'commitments') txCodes.add('2');
      else if (m === 'disbursements') txCodes.add('3');
      else if (m.startsWith('tx_')) txCodes.add(m.slice(3));
    });
    if (!wantBudgets && !wantPlanned && txCodes.size === 0) txCodes.add('2');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    // Top-N override — defaults to 5 to preserve the historic
    // "top 5 + Others" response shape. Clamped to a small range so the
    // grouped "Others" segment stays meaningful.
    const topNParam = searchParams.get('topN') || '5';
    const topNRaw = parseInt(topNParam, 10);
    // "all" → no limit (the slice/Others logic below then returns everyone and
    // no Others bucket).
    const topN = topNParam === 'all'
      ? Number.MAX_SAFE_INTEGER
      : (Number.isFinite(topNRaw) ? Math.min(Math.max(topNRaw, 1), 25) : 5);

    // Restrict all activity-derived data to published activities only.
    const { data: publishedActivitiesAll } = await supabase
      .from('activities')
      .select('id')
      .eq('publication_status', 'published')
      .is('deleted_at', null);
    const publishedActivityIds = (publishedActivitiesAll || []).map((a: any) => a.id);

    // First, fetch all organizations to build a lookup map
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym');

    if (orgsError) {
      console.error('[TopDonorAgencies] Error fetching organizations:', orgsError);
      throw new Error('Failed to fetch organizations');
    }

    const orgMap = new Map<string, { name: string; acronym: string }>();
    orgsData?.forEach((org: any) => {
      orgMap.set(org.id, {
        name: org.name || 'Unknown',
        acronym: org.acronym || org.name || 'Unknown'
      });
    });

    const donorMap = new Map<string, { name: string; acronym: string; value: number; byMetric: Record<string, number>; activityCount: number }>();
    // Selected metrics sum into `value`; each is also tracked in `byMetric`
    // (keyed 'budgets'|'planned'|'tx_<code>') so the chart can render one bar
    // per metric.
    const addToDonor = (orgId: string | null | undefined, value: number, metricKey: string) => {
      if (!orgId || !value) return;
      const org = orgMap.get(orgId);
      if (!org) return;
      const existing = donorMap.get(orgId) || { name: org.name, acronym: org.acronym, value: 0, byMetric: {} as Record<string, number>, activityCount: 0 };
      existing.value += value;
      existing.byMetric[metricKey] = (existing.byMetric[metricKey] || 0) + value;
      existing.activityCount += 1;
      donorMap.set(orgId, existing);
    };

    if (wantBudgets) {
      // Total Budgets: Sum of activity_budgets.value_usd where org is reporting_org_id
      // First get activities with their reporting_org_id
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .not('reporting_org_id', 'is', null)
        .eq('publication_status', 'published');

      if (activitiesError) {
        console.error('[TopDonorAgencies] Error fetching activities:', activitiesError);
        throw new Error('Failed to fetch activities data');
      }


      // Create activity to org mapping
      const activityOrgMap = new Map<string, string>();
      activitiesData?.forEach((activity: any) => {
        if (activity.reporting_org_id) {
          activityOrgMap.set(activity.id, activity.reporting_org_id);
        }
      });

      // Get budgets (include both usd_value and original value as fallback)
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('usd_value, value, currency, activity_id, period_start, period_end')
        .in('activity_id', publishedActivityIds);

      if (budgetError) {
        console.error('[TopDonorAgencies] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      
      // Debug: count how many budgets have matching activities
      let matchedBudgets = 0;
      let unmatchedBudgets = 0;

      budgetData?.forEach((budget: any) => {
        if (activityOrgMap.has(budget.activity_id)) {
          matchedBudgets++;
        } else {
          unmatchedBudgets++;
        }
      });


      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        addToDonor(activityOrgMap.get(budget.activity_id), safeUsd({ usd_value: budget.usd_value, value: budget.value, currency: budget.currency }), 'budgets');
      });

    }

    if (wantPlanned) {
      // Planned Disbursements: Sum of planned_disbursements.usd_amount where org is provider_org_id
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('usd_amount, amount, currency, period_start, period_end, provider_org_id')
        .not('provider_org_id', 'is', null)
        .in('activity_id', publishedActivityIds);

      if (plannedError) {
        console.error('[TopDonorAgencies] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        addToDonor(pd.provider_org_id, safeUsd({ usd_value: pd.usd_amount, amount: pd.amount, currency: pd.currency }), 'planned');
      });

    }

    if (txCodes.size > 0) {
      // Transactions of the selected IATI types, summed by provider org.
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('value_usd, value, currency, transaction_date, provider_org_id, transaction_type')
        .in('transaction_type', Array.from(txCodes))
        .eq('status', 'actual')
        .not('provider_org_id', 'is', null)
        .in('activity_id', publishedActivityIds);

      if (txError) {
        console.error('[TopDonorAgencies] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        addToDonor(tx.provider_org_id, txUsd(tx), `tx_${tx.transaction_type}`);
      });
    }

    // Sort by value descending, then slice off the Top N requested by the client.
    const sortedDonors = Array.from(donorMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const topSlice = sortedDonors.slice(0, topN);
    const othersData = sortedDonors.slice(topN);

    // Calculate grand total
    const grandTotal = sortedDonors.reduce((sum, [, data]) => sum + data.value, 0);

    // Build result array
    const result: DonorData[] = topSlice.map(([id, data]) => ({
      id,
      name: data.name,
      acronym: data.acronym,
      value: data.value,
      byMetric: data.byMetric,
      activityCount: data.activityCount
    }));

    // Add "OTHERS" if there are more donors than the requested Top N.
    if (othersData.length > 0) {
      const othersValue = othersData.reduce((sum, [, data]) => sum + data.value, 0);
      const othersCount = othersData.reduce((sum, [, data]) => sum + data.activityCount, 0);
      const othersByMetric: Record<string, number> = {};
      othersData.forEach(([, data]) => {
        Object.keys(data.byMetric).forEach((k) => {
          othersByMetric[k] = (othersByMetric[k] || 0) + data.byMetric[k];
        });
      });

      result.push({
        id: 'others',
        name: 'Others',
        acronym: 'OTHERS',
        value: othersValue,
        byMetric: othersByMetric,
        activityCount: othersCount
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      grandTotal,
      metrics: rawMetrics,
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all'
      },
      totalDonors: sortedDonors.length
    });

  } catch (error: any) {
    console.error('[TopDonorAgencies API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
