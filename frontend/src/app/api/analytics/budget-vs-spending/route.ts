import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  allocateAcrossCalendarYears,
  allocateAcrossFiscalYears,
  getFiscalYearForDate,
} from '@/utils/year-allocation';
import { fetchCustomYearById } from '@/lib/custom-year-server';
import { getCustomYearLabel } from '@/types/custom-years';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  period: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const donor = searchParams.get('donor') || 'all';
    const aidType = searchParams.get('aidType') || 'all';
    const financeType = searchParams.get('financeType') || 'all';
    const flowType = searchParams.get('flowType') || 'all';
    const timePeriod = searchParams.get('timePeriod') || 'year';
    const customYearId = searchParams.get('customYearId');
    const isExport = searchParams.get('export') === 'true';

    const supabaseAdmin = supabase;
    const customYear = await fetchCustomYearById(supabaseAdmin, customYearId);

    // Build the base query for activities with transactions
    let activitiesQuery = supabaseAdmin
      .from('activities')
      .select(`
        id,
        title_narrative,
        planned_start_date,
        planned_end_date,
        activity_status,
        publication_status,
        transactions:transactions!transactions_activity_id_fkey1 (
          transaction_type,
          value_usd,
          transaction_date,
          receiver_activity_uuid
        )
      `)
      .eq('publication_status', 'published');

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    // Get budget data from activity_budgets table
    const { data: budgetData, error: budgetError } = await supabaseAdmin
      .from('activity_budgets')
      .select('*')
      .order('period_start');

    if (budgetError) {
      console.error('Error fetching budgets:', budgetError);
    }

    // Process the data to create chart data points
    const dataMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    // Process budget data first — pro-rata split period-spanning budgets across years
    // so a Jun 2025 – Aug 2025 budget contributes to 2025 proportionally rather than
    // dumping the full amount into period_start's year (also matters across year boundaries).
    // When a custom fiscal year is supplied, we split across that fiscal year's boundaries.
    budgetData?.forEach((budget: any) => {
      const usdValue = parseFloat(budget.usd_value?.toString() || '0') || 0;
      if (!budget.period_start || usdValue === 0) return;

      const periodEnd = budget.period_end || budget.period_start;

      if (timePeriod === 'year') {
        if (customYear) {
          const allocations = allocateAcrossFiscalYears(
            budget.period_start,
            periodEnd,
            usdValue,
            customYear
          );
          for (const allocation of allocations) {
            const periodKey = allocation.label;
            if (!dataMap.has(periodKey)) {
              dataMap.set(periodKey, {
                period: periodKey,
                budget: 0,
                disbursements: 0,
                expenditures: 0,
                totalSpending: 0,
              });
            }
            dataMap.get(periodKey)!.budget += allocation.amount;
          }
        } else {
          const allocations = allocateAcrossCalendarYears(
            budget.period_start,
            periodEnd,
            usdValue
          );
          for (const allocation of allocations) {
            const periodKey = allocation.year.toString();
            if (!dataMap.has(periodKey)) {
              dataMap.set(periodKey, {
                period: periodKey,
                budget: 0,
                disbursements: 0,
                expenditures: 0,
                totalSpending: 0,
              });
            }
            dataMap.get(periodKey)!.budget += allocation.amount;
          }
        }
      } else {
        // Quarterly bucketing keeps prior behaviour (period_start-based) — the
        // allocator is year-granular, so quarterly pro-rata would need a separate helper.
        const startDate = new Date(budget.period_start);
        const quarter = Math.floor(startDate.getMonth() / 3) + 1;
        const periodKey = `${startDate.getFullYear()}-Q${quarter}`;
        if (!dataMap.has(periodKey)) {
          dataMap.set(periodKey, {
            period: periodKey,
            budget: 0,
            disbursements: 0,
            expenditures: 0,
            totalSpending: 0,
          });
        }
        dataMap.get(periodKey)!.budget += usdValue;
      }
    });

    // Process activities and their transactions
    activities?.forEach((activity: any) => {
      // Process transactions - use transaction date, not activity start date (USD only)
      activity.transactions?.forEach((transaction: any) => {
        // Exclude internal transfers (pooled fund flows) to avoid double-counting
        if (transaction.receiver_activity_uuid) return;

        // Parse transaction value (USD only)
        const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;

        if (isNaN(value) || !isFinite(value) || value === 0) {
          return; // Skip invalid or non-USD values
        }

        // Use transaction date to determine the period, not activity start date
        const transactionDate = transaction.transaction_date
          ? new Date(transaction.transaction_date)
          : (activity.planned_start_date ? new Date(activity.planned_start_date) : new Date());

        let periodKey: string;
        if (timePeriod === 'quarter') {
          const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
          periodKey = `${transactionDate.getFullYear()}-Q${quarter}`;
        } else if (customYear) {
          const fy = getFiscalYearForDate(transactionDate, customYear);
          periodKey = getCustomYearLabel(customYear, fy);
        } else {
          periodKey = transactionDate.getFullYear().toString();
        }

        // Initialize period data if not exists
        if (!dataMap.has(periodKey)) {
          dataMap.set(periodKey, {
            period: periodKey,
            budget: 0,
            disbursements: 0,
            expenditures: 0,
            totalSpending: 0,
          });
        }

        const periodData = dataMap.get(periodKey)!;

        switch (transaction.transaction_type) {
          case '2': // Commitment
          case 2:
            // Only use commitments as budget if no actual budget data exists
            if (!budgetData || budgetData.length === 0) {
              periodData.budget += value;
            }
            break;
          case '3': // Disbursement
          case 3:
            periodData.disbursements += value;
            periodData.totalSpending += value;
            break;
          case '4': // Expenditure
          case 4:
            periodData.expenditures += value;
            periodData.totalSpending += value;
            break;
        }
      });
    });

    // Convert to array and sort by period. Fiscal-year labels like "AUFY2024-25" don't
    // parseInt cleanly, so we extract the first 4-digit run as the ordering key.
    const extractYear = (period: string): number => {
      const match = period.match(/\d{4}/);
      return match ? parseInt(match[0], 10) : 0;
    };
    const chartData = Array.from(dataMap.values()).sort((a, b) => {
      if (timePeriod === 'quarter') {
        // Sort quarters: 2023-Q1, 2023-Q2, etc.
        const [yearA, quarterA] = a.period.split('-Q');
        const [yearB, quarterB] = b.period.split('-Q');
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        return parseInt(quarterA) - parseInt(quarterB);
      }
      return extractYear(a.period) - extractYear(b.period);
    });

    // Handle export request
    if (isExport) {
      const csvHeaders = ['Period', 'Budget', 'Disbursements', 'Expenditures', 'Total Spending'];
      const csvRows = chartData.map(row => [
        row.period,
        row.budget.toString(),
        row.disbursements.toString(),
        row.expenditures.toString(),
        row.totalSpending.toString()
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="budget-vs-spending.csv"'
        }
      });
    }

    // Calculate summary statistics
    const totalBudget = chartData.reduce((sum, item) => sum + item.budget, 0);
    const totalSpending = chartData.reduce((sum, item) => sum + item.totalSpending, 0);
    const executionRate = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

    return NextResponse.json({
      data: chartData,
      currency: defaultCurrency,
      summary: {
        totalBudget,
        totalSpending,
        executionRate: Math.round(executionRate * 100) / 100,
        totalDisbursements: chartData.reduce((sum, item) => sum + item.disbursements, 0),
        totalExpenditures: chartData.reduce((sum, item) => sum + item.expenditures, 0),
      },
      filters: {
        donor,
        aidType,
        financeType,
        flowType,
        timePeriod
      }
    });

  } catch (error) {
    console.error('Error in budget-vs-spending API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}