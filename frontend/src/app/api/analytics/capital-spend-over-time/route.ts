import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type MetricType = 'budgets' | 'planned' | 'commitments' | 'disbursements';

interface YearlyCapitalSpend {
  year: number;
  capitalSpend: number;
  nonCapitalSpend: number;
  total: number;
}

/**
 * GET /api/analytics/capital-spend-over-time
 * Returns yearly breakdown of capital vs non-capital spending
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

    // First, fetch all activities with their capital_spend_percentage
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('id, capital_spend_percentage');

    if (activitiesError) {
      console.error('[CapitalSpendOverTime] Error fetching activities:', activitiesError);
      throw new Error('Failed to fetch activities');
    }

    // Create a map of activity capital spend percentages
    const activityCapitalMap = new Map<string, number>();
    activitiesData?.forEach((activity: any) => {
      // Default to 0 if no capital spend percentage is set
      activityCapitalMap.set(
        activity.id, 
        parseFloat(activity.capital_spend_percentage) || 0
      );
    });

    // Map to accumulate values by year
    const yearlyData = new Map<number, { capitalSpend: number; nonCapitalSpend: number }>();

    if (metric === 'budgets') {
      // Total Budgets: Sum of activity_budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, usd_value, value, period_start');

      if (budgetError) {
        console.error('[CapitalSpendOverTime] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        if (!budget.period_start) return;
        
        const budgetDate = new Date(budget.period_start);
        // Apply date filter if provided
        if (dateFrom && budgetDate < new Date(dateFrom)) return;
        if (dateTo && budgetDate > new Date(dateTo)) return;

        const year = budgetDate.getFullYear();
        const value = parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0;
        if (value === 0) return;

        const capitalPct = activityCapitalMap.get(budget.activity_id) || 0;
        const capitalValue = value * (capitalPct / 100);
        const nonCapitalValue = value - capitalValue;

        const existing = yearlyData.get(year) || { capitalSpend: 0, nonCapitalSpend: 0 };
        existing.capitalSpend += capitalValue;
        existing.nonCapitalSpend += nonCapitalValue;
        yearlyData.set(year, existing);
      });

    } else if (metric === 'planned') {
      // Planned Disbursements
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('activity_id, usd_amount, amount, period_start');

      if (plannedError) {
        console.error('[CapitalSpendOverTime] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        if (!pd.period_start) return;
        
        const pdDate = new Date(pd.period_start);
        // Apply date filter if provided
        if (dateFrom && pdDate < new Date(dateFrom)) return;
        if (dateTo && pdDate > new Date(dateTo)) return;

        const year = pdDate.getFullYear();
        const value = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0;
        if (value === 0) return;

        const capitalPct = activityCapitalMap.get(pd.activity_id) || 0;
        const capitalValue = value * (capitalPct / 100);
        const nonCapitalValue = value - capitalValue;

        const existing = yearlyData.get(year) || { capitalSpend: 0, nonCapitalSpend: 0 };
        existing.capitalSpend += capitalValue;
        existing.nonCapitalSpend += nonCapitalValue;
        yearlyData.set(year, existing);
      });

    } else {
      // Commitments or Disbursements from transactions
      const transactionType = metric === 'commitments' ? '2' : '3';

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('activity_id, value_usd, value, transaction_date')
        .eq('transaction_type', transactionType)
        .eq('status', 'actual');

      if (txError) {
        console.error('[CapitalSpendOverTime] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        if (!tx.transaction_date) return;
        
        const txDate = new Date(tx.transaction_date);
        // Apply date filter if provided
        if (dateFrom && txDate < new Date(dateFrom)) return;
        if (dateTo && txDate > new Date(dateTo)) return;

        const year = txDate.getFullYear();
        const value = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0;
        if (value === 0) return;

        const capitalPct = activityCapitalMap.get(tx.activity_id) || 0;
        const capitalValue = value * (capitalPct / 100);
        const nonCapitalValue = value - capitalValue;

        const existing = yearlyData.get(year) || { capitalSpend: 0, nonCapitalSpend: 0 };
        existing.capitalSpend += capitalValue;
        existing.nonCapitalSpend += nonCapitalValue;
        yearlyData.set(year, existing);
      });
    }

    // Convert map to sorted array
    const results: YearlyCapitalSpend[] = Array.from(yearlyData.entries())
      .map(([year, data]) => ({
        year,
        capitalSpend: data.capitalSpend,
        nonCapitalSpend: data.nonCapitalSpend,
        total: data.capitalSpend + data.nonCapitalSpend
      }))
      .sort((a, b) => a.year - b.year);

    // Calculate totals
    const totals = results.reduce(
      (acc, item) => ({
        capitalSpend: acc.capitalSpend + item.capitalSpend,
        nonCapitalSpend: acc.nonCapitalSpend + item.nonCapitalSpend
      }),
      { capitalSpend: 0, nonCapitalSpend: 0 }
    );

    return NextResponse.json({
      success: true,
      data: results,
      totals,
      metric,
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all'
      }
    });

  } catch (error: any) {
    console.error('[CapitalSpendOverTime API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
