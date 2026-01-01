import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findParentGroup, INSTITUTIONAL_GROUPS } from '@/data/location-groups';

export const dynamic = 'force-dynamic';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";

interface DonorGroupData {
  id: string;
  name: string;
  value: number;
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
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = (searchParams.get('metric') || 'disbursements') as MetricType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const topN = parseInt(searchParams.get('topN') || '5');

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
      .not('reporting_org_id', 'is', null);

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
      value: number; 
      activityIds: Set<string>;
      orgIds: Set<string>;
    }>();

    if (metric === 'budgets') {
      // Get budgets from activity_budgets table
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('usd_value, value, activity_id, period_start, period_end');

      if (budgetError) {
        console.error('[TopDonorGroups] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        const orgId = activityOrgMap.get(budget.activity_id);
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org || org.groupName === 'Unknown') return;

        const value = parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = groupMap.get(org.groupName) || { 
          value: 0, 
          activityIds: new Set<string>(),
          orgIds: new Set<string>()
        };
        existing.value += value;
        existing.activityIds.add(budget.activity_id);
        existing.orgIds.add(orgId);
        groupMap.set(org.groupName, existing);
      });

    } else if (metric === 'planned') {
      // Get planned disbursements - aggregate by provider_org_id
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('usd_amount, amount, period_start, period_end, provider_org_id, activity_id')
        .not('provider_org_id', 'is', null);

      if (plannedError) {
        console.error('[TopDonorGroups] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        const orgId = pd.provider_org_id;
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org || org.groupName === 'Unknown') return;

        const value = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = groupMap.get(org.groupName) || { 
          value: 0, 
          activityIds: new Set<string>(),
          orgIds: new Set<string>()
        };
        existing.value += value;
        if (pd.activity_id) existing.activityIds.add(pd.activity_id);
        existing.orgIds.add(orgId);
        groupMap.set(org.groupName, existing);
      });

    } else {
      // Commitments or Disbursements: From transactions table
      const transactionType = metric === 'commitments' ? '2' : '3';

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('value_usd, value, transaction_date, provider_org_id, activity_id')
        .eq('transaction_type', transactionType)
        .eq('status', 'actual')
        .not('provider_org_id', 'is', null);

      if (txError) {
        console.error('[TopDonorGroups] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        const orgId = tx.provider_org_id;
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org || org.groupName === 'Unknown') return;

        const value = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = groupMap.get(org.groupName) || { 
          value: 0, 
          activityIds: new Set<string>(),
          orgIds: new Set<string>()
        };
        existing.value += value;
        if (tx.activity_id) existing.activityIds.add(tx.activity_id);
        existing.orgIds.add(orgId);
        groupMap.set(org.groupName, existing);
      });
    }

    // Sort and get top N
    const sorted = Array.from(groupMap.entries())
      .filter(([name]) => name !== 'Unknown' && name !== '')
      .sort((a, b) => b[1].value - a[1].value);

    const topGroups: DonorGroupData[] = sorted.slice(0, topN).map(([name, data]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      value: data.value,
      activityCount: data.activityIds.size,
      orgCount: data.orgIds.size,
    }));

    // Aggregate others
    const othersValue = sorted.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    const othersOrgCount = sorted.slice(topN).reduce((sum, [, data]) => sum + data.orgIds.size, 0);
    if (othersValue > 0) {
      topGroups.push({
        id: 'others',
        name: 'OTHERS',
        value: othersValue,
        activityCount: 0,
        orgCount: othersOrgCount,
      });
    }

    // Calculate grand total
    const grandTotal = sorted.reduce((sum, [, data]) => sum + data.value, 0);

    return NextResponse.json({
      success: true,
      data: topGroups,
      grandTotal,
      metric,
    });

  } catch (error: any) {
    console.error('[TopDonorGroups API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
