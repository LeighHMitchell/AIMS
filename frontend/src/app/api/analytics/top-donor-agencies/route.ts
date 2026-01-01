import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type MetricType = 'budgets' | 'planned' | 'commitments' | 'disbursements';

interface DonorData {
  id: string;
  name: string;
  acronym: string;
  value: number;
  activityCount: number;
}

/**
 * GET /api/analytics/top-donor-agencies
 * Returns top 5 donor agencies + "OTHERS" aggregated, with support for 4 metrics
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
    const metric = (searchParams.get('metric') || 'commitments') as MetricType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

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

    let donorMap = new Map<string, { name: string; acronym: string; value: number; activityCount: number }>();

    if (metric === 'budgets') {
      // Total Budgets: Sum of activity_budgets.value_usd where org is reporting_org_id
      // First get activities with their reporting_org_id
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, reporting_org_id')
        .not('reporting_org_id', 'is', null);

      if (activitiesError) {
        console.error('[TopDonorAgencies] Error fetching activities:', activitiesError);
        throw new Error('Failed to fetch activities data');
      }

      console.log(`[TopDonorAgencies] Found ${activitiesData?.length || 0} activities with reporting_org_id`);

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
        .select('usd_value, value, activity_id, period_start, period_end');

      if (budgetError) {
        console.error('[TopDonorAgencies] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      console.log(`[TopDonorAgencies] Found ${budgetData?.length || 0} budgets`);
      
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

      console.log(`[TopDonorAgencies] Matched budgets: ${matchedBudgets}, Unmatched: ${unmatchedBudgets}`);

      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        const orgId = activityOrgMap.get(budget.activity_id);
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org) return;

        // Use usd_value if available, otherwise fall back to original value
        const value = parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = donorMap.get(orgId) || {
          name: org.name,
          acronym: org.acronym,
          value: 0,
          activityCount: 0
        };
        existing.value += value;
        existing.activityCount += 1;
        donorMap.set(orgId, existing);
      });

    } else if (metric === 'planned') {
      // Planned Disbursements: Sum of planned_disbursements.usd_amount where org is provider_org_id
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('usd_amount, amount, period_start, period_end, provider_org_id')
        .not('provider_org_id', 'is', null);

      if (plannedError) {
        console.error('[TopDonorAgencies] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        const orgId = pd.provider_org_id;
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org) return;

        // Use usd_amount if available, otherwise fall back to amount
        const value = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = donorMap.get(orgId) || {
          name: org.name,
          acronym: org.acronym,
          value: 0,
          activityCount: 0
        };
        existing.value += value;
        existing.activityCount += 1;
        donorMap.set(orgId, existing);
      });

    } else {
      // Commitments or Disbursements: From transactions table
      const transactionType = metric === 'commitments' ? '2' : '3';

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('value_usd, value, transaction_date, provider_org_id')
        .eq('transaction_type', transactionType)
        .eq('status', 'actual')
        .not('provider_org_id', 'is', null);

      if (txError) {
        console.error('[TopDonorAgencies] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        const orgId = tx.provider_org_id;
        if (!orgId) return;

        const org = orgMap.get(orgId);
        if (!org) return;

        // Use value_usd if available, otherwise fall back to value
        const value = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = donorMap.get(orgId) || {
          name: org.name,
          acronym: org.acronym,
          value: 0,
          activityCount: 0
        };
        existing.value += value;
        existing.activityCount += 1;
        donorMap.set(orgId, existing);
      });
    }

    // Sort by value descending and get top 5
    const sortedDonors = Array.from(donorMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const top5 = sortedDonors.slice(0, 5);
    const othersData = sortedDonors.slice(5);

    // Calculate grand total
    const grandTotal = sortedDonors.reduce((sum, [, data]) => sum + data.value, 0);

    // Build result array
    const result: DonorData[] = top5.map(([id, data]) => ({
      id,
      name: data.name,
      acronym: data.acronym,
      value: data.value,
      activityCount: data.activityCount
    }));

    // Add "OTHERS" if there are more than 5 donors
    if (othersData.length > 0) {
      const othersValue = othersData.reduce((sum, [, data]) => sum + data.value, 0);
      const othersCount = othersData.reduce((sum, [, data]) => sum + data.activityCount, 0);
      
      result.push({
        id: 'others',
        name: 'Others',
        acronym: 'OTHERS',
        value: othersValue,
        activityCount: othersCount
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      grandTotal,
      metric,
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
