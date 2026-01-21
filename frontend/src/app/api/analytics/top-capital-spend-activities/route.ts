import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type MetricType = 'budgets' | 'planned' | 'commitments' | 'disbursements';

interface ActivityCapitalSpend {
  id: string;
  title: string;
  iatiIdentifier: string;
  capitalSpendPercentage: number;
  baseValue: number;
  capitalSpendValue: number;
}

/**
 * GET /api/analytics/top-capital-spend-activities
 * Returns top 5 activities ranked by capital spend value (dollar amount)
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
    const metric = (searchParams.get('metric') || 'disbursements') as MetricType;
    const topN = parseInt(searchParams.get('topN') || '5', 10);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // First, fetch all activities with their capital_spend_percentage
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier, capital_spend_percentage')
      .not('capital_spend_percentage', 'is', null)
      .gt('capital_spend_percentage', 0);

    if (activitiesError) {
      console.error('[TopCapitalSpend] Error fetching activities:', activitiesError);
      throw new Error('Failed to fetch activities');
    }

    // Create a map of activity data
    const activityMap = new Map<string, { 
      title: string; 
      iatiIdentifier: string; 
      capitalSpendPercentage: number;
    }>();
    
    activitiesData?.forEach((activity: any) => {
      activityMap.set(activity.id, {
        title: activity.title_narrative || 'Untitled Activity',
        iatiIdentifier: activity.iati_identifier || '',
        capitalSpendPercentage: parseFloat(activity.capital_spend_percentage) || 0
      });
    });

    // Map to accumulate financial values per activity
    const activityFinancials = new Map<string, number>();

    if (metric === 'budgets') {
      // Total Budgets: Sum of activity_budgets.value_usd (or usd_value)
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, usd_value, value, period_start, period_end');

      if (budgetError) {
        console.error('[TopCapitalSpend] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        if (!activityMap.has(budget.activity_id)) return;

        const value = parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = activityFinancials.get(budget.activity_id) || 0;
        activityFinancials.set(budget.activity_id, existing + value);
      });

    } else if (metric === 'planned') {
      // Planned Disbursements: Sum of planned_disbursements.usd_amount
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('activity_id, usd_amount, amount, period_start, period_end');

      if (plannedError) {
        console.error('[TopCapitalSpend] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        if (!activityMap.has(pd.activity_id)) return;

        const value = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = activityFinancials.get(pd.activity_id) || 0;
        activityFinancials.set(pd.activity_id, existing + value);
      });

    } else {
      // Commitments or Disbursements: From transactions table
      const transactionType = metric === 'commitments' ? '2' : '3';

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('activity_id, value_usd, value, transaction_date')
        .eq('transaction_type', transactionType)
        .eq('status', 'actual');

      if (txError) {
        console.error('[TopCapitalSpend] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        if (!activityMap.has(tx.activity_id)) return;

        const value = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0;
        if (value === 0) return;

        const existing = activityFinancials.get(tx.activity_id) || 0;
        activityFinancials.set(tx.activity_id, existing + value);
      });
    }

    // Calculate capital spend values and build result array
    const results: ActivityCapitalSpend[] = [];
    
    activityFinancials.forEach((baseValue, activityId) => {
      const activityInfo = activityMap.get(activityId);
      if (!activityInfo) return;

      const capitalSpendValue = baseValue * (activityInfo.capitalSpendPercentage / 100);
      
      if (capitalSpendValue > 0) {
        results.push({
          id: activityId,
          title: activityInfo.title,
          iatiIdentifier: activityInfo.iatiIdentifier,
          capitalSpendPercentage: activityInfo.capitalSpendPercentage,
          baseValue,
          capitalSpendValue
        });
      }
    });

    // Sort by capital spend value descending and get top N
    results.sort((a, b) => b.capitalSpendValue - a.capitalSpendValue);
    const topActivities = results.slice(0, topN);

    // Calculate grand total of capital spend across ALL activities (not just top N)
    const grandTotal = results.reduce((sum, item) => sum + item.capitalSpendValue, 0);

    return NextResponse.json({
      success: true,
      data: topActivities,
      grandTotal,
      metric,
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all'
      },
      totalActivities: results.length
    });

  } catch (error: any) {
    console.error('[TopCapitalSpend API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
