import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { excludeInternalTransfers, getPooledFundIds, txUsd } from '@/lib/analytics-transaction-filters';
import { safeUsd } from '@/lib/safe-usd';
import { findParentGroup, INSTITUTIONAL_GROUPS } from '@/data/location-groups';

export const dynamic = 'force-dynamic';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";

interface DonorGroupData {
  id: string;
  name: string;
  value: number;
  byMetric: Record<string, number>;
  activityCount: number;
  orgCount: number;
}

/**
 * Maps a country_represented value to its parent group if applicable.
 * - For sub-groups (like "UNDP", "IDA"), returns the parent group name ("United Nations", "World Bank Group")
 * - For parent groups, returns the group name as-is
 * - For countries, returns the country name as-is
 */
function mapToParentGroup(countryRepresented: string): string {
  if (!countryRepresented) return 'Unknown';
  
  const normalized = countryRepresented.trim();
  
  // Check if it's a sub-group that should be mapped to a parent
  const parentGroup = findParentGroup(normalized);
  if (parentGroup) {
    return parentGroup.name;
  }
  
  // Check if it's already a parent institutional group
  for (const group of INSTITUTIONAL_GROUPS) {
    if (group.name.toLowerCase() === normalized.toLowerCase()) {
      return group.name;
    }
  }
  
  // It's a country name - return as-is
  return normalized;
}

/**
 * GET /api/analytics/top-donor-groups
 * Returns top donor groups aggregated by country_represented field
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
    // per group.
    const metricsParam = searchParams.get('metrics');
    const rawMetrics = metricsParam
      ? metricsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [searchParams.get('metric') || 'disbursements'];
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
    if (!wantBudgets && !wantPlanned && txCodes.size === 0) txCodes.add('3');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const topNParam = searchParams.get('topN') || '5';
    const topN = topNParam === 'all' ? Number.MAX_SAFE_INTEGER : (parseInt(topNParam) || 5);
    // Optional drill-down: when set, show the member orgs of this parent group
    // (e.g. "United Nations") instead of the group aggregates.
    const groupFilter = searchParams.get('group');

    // Restrict all activity-derived data to published activities only.
    const { data: publishedActivitiesAll } = await supabase
      .from('activities')
      .select('id')
      .eq('publication_status', 'published')
      .is('deleted_at', null);
    const publishedActivityIds = (publishedActivitiesAll || []).map((a: any) => a.id);

    // Step 1: Fetch all organizations with their country_represented
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, country_represented, country');

    if (orgsError) {
      console.error('[TopDonorGroups] Error fetching organizations:', orgsError);
      throw new Error('Failed to fetch organizations');
    }

    // Build org lookup map with group info
    const orgMap = new Map<string, { name: string; groupName: string }>();
    orgsData?.forEach((org: any) => {
      const countryRep = org.country_represented || org.country || 'Unknown';
      const groupName = mapToParentGroup(countryRep);
      orgMap.set(org.id, {
        name: org.name || 'Unknown',
        groupName
      });
    });

    // Step 2: Fetch activities with their reporting_org_id
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('id, reporting_org_id')
      .not('reporting_org_id', 'is', null)
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('[TopDonorGroups] Error fetching activities:', activitiesError);
      throw new Error('Failed to fetch activities data');
    }

    // Create activity to org mapping
    const activityOrgMap = new Map<string, string>();
    activitiesData?.forEach((activity: any) => {
      if (activity.reporting_org_id) {
        activityOrgMap.set(activity.id, activity.reporting_org_id);
      }
    });

    // Map to aggregate by group
    const groupMap = new Map<string, {
      name: string;
      value: number;
      byMetric: Record<string, number>;
      activityIds: Set<string>;
      orgIds: Set<string>;
    }>();

    // Shared accumulator. Default (overview) view aggregates by parent group.
    // When `groupFilter` is set it DRILLS INTO that group — keeping only its
    // member orgs and aggregating per individual org, so the chart shows the
    // agencies within e.g. "United Nations". Selected metrics sum into `value`
    // and are also tracked separately in `byMetric` (keyed 'budgets'|'planned'|
    // 'tx_<code>') so the chart can render one bar per metric.
    const addToGroup = (
      orgId: string | null | undefined,
      value: number,
      activityId: string | null | undefined,
      metricKey: string
    ) => {
      if (!orgId) return;
      const org = orgMap.get(orgId);
      if (!org || org.groupName === 'Unknown') return;
      if (!value) return;

      let key: string;
      let displayName: string;
      if (groupFilter) {
        if (org.groupName !== groupFilter) return;
        key = orgId;
        displayName = org.name;
      } else {
        key = org.groupName;
        displayName = org.groupName;
      }

      const existing = groupMap.get(key) || {
        name: displayName,
        value: 0,
        byMetric: {} as Record<string, number>,
        activityIds: new Set<string>(),
        orgIds: new Set<string>(),
      };
      existing.value += value;
      existing.byMetric[metricKey] = (existing.byMetric[metricKey] || 0) + value;
      if (activityId) existing.activityIds.add(activityId);
      existing.orgIds.add(orgId);
      groupMap.set(key, existing);
    };

    if (wantBudgets) {
      // Get budgets from activity_budgets table
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('usd_value, value, currency, activity_id, period_start, period_end')
        .in('activity_id', publishedActivityIds);

      if (budgetError) {
        console.error('[TopDonorGroups] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        const value = safeUsd({ usd_value: budget.usd_value, value: budget.value, currency: budget.currency });
        addToGroup(activityOrgMap.get(budget.activity_id), value, budget.activity_id, 'budgets');
      });

    }

    if (wantPlanned) {
      // Get planned disbursements - aggregate by provider_org_id
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('usd_amount, amount, currency, period_start, period_end, provider_org_id, activity_id')
        .not('provider_org_id', 'is', null)
        .in('activity_id', publishedActivityIds);

      if (plannedError) {
        console.error('[TopDonorGroups] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        const value = safeUsd({ usd_value: pd.usd_amount, amount: pd.amount, currency: pd.currency });
        addToGroup(pd.provider_org_id, value, pd.activity_id, 'planned');
      });

    }

    if (txCodes.size > 0) {
      // Transactions of the selected IATI types, summed by provider org's group.
      const txTypes = Array.from(txCodes);

      let txQuery = supabase
        .from('transactions')
        .select('value_usd, value, currency, transaction_date, provider_org_id, activity_id, transaction_type')
        .in('transaction_type', txTypes)
        .eq('status', 'actual')
        .not('provider_org_id', 'is', null)
        .in('activity_id', publishedActivityIds);
      // Exclude internal transfers (pooled fund flows)
      const pooledFundIds = await getPooledFundIds(supabase);
      txQuery = excludeInternalTransfers(txQuery, pooledFundIds, txTypes);
      const { data: txData, error: txError } = await txQuery;

      if (txError) {
        console.error('[TopDonorGroups] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        const value = txUsd(tx);
        addToGroup(tx.provider_org_id, value, tx.activity_id, `tx_${tx.transaction_type}`);
      });
    }

    // Sort and get top N
    const sorted = Array.from(groupMap.entries())
      .filter(([, data]) => data.name !== 'Unknown' && data.name !== '')
      .sort((a, b) => b[1].value - a[1].value);

    const topGroups: DonorGroupData[] = sorted.slice(0, topN).map(([key, data]) => ({
      id: key.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      value: data.value,
      byMetric: data.byMetric,
      activityCount: data.activityIds.size,
      orgCount: data.orgIds.size,
    }));

    // Aggregate others (value + per-metric breakdown)
    const othersValue = sorted.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    const othersOrgCount = sorted.slice(topN).reduce((sum, [, data]) => sum + data.orgIds.size, 0);
    const othersByMetric: Record<string, number> = {};
    sorted.slice(topN).forEach(([, data]) => {
      Object.keys(data.byMetric).forEach((k) => {
        othersByMetric[k] = (othersByMetric[k] || 0) + data.byMetric[k];
      });
    });
    if (othersValue > 0) {
      topGroups.push({
        id: 'others',
        name: 'OTHERS',
        value: othersValue,
        byMetric: othersByMetric,
        activityCount: 0,
        orgCount: othersOrgCount,
      });
    }

    // Calculate grand total
    const grandTotal = sorted.reduce((sum, [, data]) => sum + data.value, 0);

    // All distinct parent groups (for the drill-down dropdown), independent of
    // the current filter.
    const availableGroups = Array.from(
      new Set(Array.from(orgMap.values()).map((o) => o.groupName))
    ).filter((g) => g && g !== 'Unknown').sort();

    return NextResponse.json({
      success: true,
      data: topGroups,
      grandTotal,
      metrics: rawMetrics,
      groups: availableGroups,
      group: groupFilter || null,
    });

  } catch (error: any) {
    console.error('[TopDonorGroups API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
