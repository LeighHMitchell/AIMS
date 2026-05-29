import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchCustomYearById } from '@/lib/custom-year-server';
import { getFiscalYearForDate } from '@/utils/year-allocation';

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
    // `metrics` (comma list) sums multiple sources; `metric` kept for back-compat.
    const VALID_METRICS = ['budgets', 'planned', 'commitments', 'disbursements'];
    const metricsParam = searchParams.get('metrics');
    let metrics: MetricType[] = metricsParam
      ? (metricsParam.split(',').filter(m => VALID_METRICS.includes(m)) as MetricType[])
      : [(searchParams.get('metric') || 'disbursements') as MetricType];
    if (metrics.length === 0) metrics = ['disbursements'];
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    // Optional fiscal/custom calendar — buckets by its fiscal year when supplied.
    const customYearId = searchParams.get('customYearId');
    const customYear = await fetchCustomYearById(supabase, customYearId);
    const bucketYear = (d: Date) => (customYear ? getFiscalYearForDate(d, customYear) : d.getFullYear());

    // First, fetch all activities with their capital_spend_percentage
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('id, capital_spend_percentage')
      .eq('publication_status', 'published');

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

    const publishedActivityIds = (activitiesData || []).map((a: any) => a.id);

    // Map to accumulate values by year, summed across every selected metric.
    const yearlyData = new Map<number, { capitalSpend: number; nonCapitalSpend: number }>();
    const addRecord = (activityId: string, date: Date, value: number) => {
      if (!value) return;
      const year = bucketYear(date);
      const capitalPct = activityCapitalMap.get(activityId) || 0;
      const capitalValue = value * (capitalPct / 100);
      const existing = yearlyData.get(year) || { capitalSpend: 0, nonCapitalSpend: 0 };
      existing.capitalSpend += capitalValue;
      existing.nonCapitalSpend += value - capitalValue;
      yearlyData.set(year, existing);
    };

    if (metrics.includes('budgets')) {
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, usd_value, value, period_start')
        .in('activity_id', publishedActivityIds);
      if (budgetError) {
        console.error('[CapitalSpendOverTime] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }
      budgetData?.forEach((budget: any) => {
        if (!budget.period_start) return;
        const budgetDate = new Date(budget.period_start);
        if (dateFrom && budgetDate < new Date(dateFrom)) return;
        if (dateTo && budgetDate > new Date(dateTo)) return;
        addRecord(budget.activity_id, budgetDate, parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0);
      });
    }

    if (metrics.includes('planned')) {
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('activity_id, usd_amount, amount, period_start')
        .in('activity_id', publishedActivityIds);
      if (plannedError) {
        console.error('[CapitalSpendOverTime] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }
      plannedData?.forEach((pd: any) => {
        if (!pd.period_start) return;
        const pdDate = new Date(pd.period_start);
        if (dateFrom && pdDate < new Date(dateFrom)) return;
        if (dateTo && pdDate > new Date(dateTo)) return;
        addRecord(pd.activity_id, pdDate, parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0);
      });
    }

    const txTypes: string[] = [];
    if (metrics.includes('commitments')) txTypes.push('2');
    if (metrics.includes('disbursements')) txTypes.push('3');
    if (txTypes.length > 0) {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('activity_id, value_usd, value, transaction_date')
        .in('transaction_type', txTypes)
        .eq('status', 'actual')
        .in('activity_id', publishedActivityIds);
      if (txError) {
        console.error('[CapitalSpendOverTime] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }
      txData?.forEach((tx: any) => {
        if (!tx.transaction_date) return;
        const txDate = new Date(tx.transaction_date);
        if (dateFrom && txDate < new Date(dateFrom)) return;
        if (dateTo && txDate > new Date(dateTo)) return;
        addRecord(tx.activity_id, txDate, parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0);
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
      metrics,
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
