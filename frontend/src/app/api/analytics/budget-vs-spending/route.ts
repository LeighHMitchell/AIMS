import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  splitBudgetAcrossFiscalYears,
  getTransactionFiscalYear,
} from '@/utils/year-allocation';
import { CustomYear, CustomYearRow, toCustomYear, getCustomYearLabel } from '@/types/custom-years';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  period: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
  sortKey: number;
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

    // Fetch custom year definition if provided. Only applied when timePeriod === 'year'.
    let customYear: CustomYear | null = null;
    if (customYearId && timePeriod === 'year') {
      const { data: cyData, error: cyError } = await supabaseAdmin
        .from('custom_years')
        .select('*')
        .eq('id', customYearId)
        .single();

      if (cyError) {
        console.error('[Budget vs Spending API] Custom year fetch error:', cyError);
      } else if (cyData) {
        customYear = toCustomYear(cyData as CustomYearRow);
      }
    }

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
          value,
          currency,
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

    const ensurePeriod = (periodKey: string, sortKey: number): ChartDataPoint => {
      let periodData = dataMap.get(periodKey);
      if (!periodData) {
        periodData = {
          period: periodKey,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
          sortKey,
        };
        dataMap.set(periodKey, periodData);
      }
      return periodData;
    };

    // Process budget data first
    budgetData?.forEach((budget: any) => {
      if (customYear) {
        // Fiscal year bucketing (proportional across fiscal years)
        const allocations = splitBudgetAcrossFiscalYears(
          {
            period_start: budget.period_start,
            period_end: budget.period_end,
            value: budget.value,
            usd_value: budget.usd_value,
            currency: budget.currency,
          },
          customYear
        );
        allocations.forEach(({ fiscalYear, label, amount }) => {
          const periodData = ensurePeriod(label, fiscalYear);
          periodData.budget += amount;
        });
      } else {
        const startDate = new Date(budget.period_start);
        if (isNaN(startDate.getTime())) return;

        let periodKey: string;
        let sortKey: number;
        if (timePeriod === 'quarter') {
          const quarter = Math.floor(startDate.getMonth() / 3) + 1;
          periodKey = `${startDate.getFullYear()}-Q${quarter}`;
          sortKey = startDate.getFullYear() * 10 + quarter;
        } else {
          periodKey = startDate.getFullYear().toString();
          sortKey = startDate.getFullYear();
        }

        const periodData = ensurePeriod(periodKey, sortKey);
        // Use only USD-converted value - no fallback to original currency
        periodData.budget += parseFloat(budget.usd_value?.toString() || '0') || 0;
      }
    });

    // Process activities and their transactions
    activities?.forEach((activity: any) => {
      activity.transactions?.forEach((transaction: any) => {
        // Exclude internal transfers (pooled fund flows) to avoid double-counting
        if (transaction.receiver_activity_uuid) return;

        // Parse transaction value (USD only)
        const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;

        if (isNaN(value) || !isFinite(value) || value === 0) {
          return; // Skip invalid or non-USD values
        }

        // Use transaction date to determine the period, not activity start date
        const rawDate = transaction.transaction_date || activity.planned_start_date;
        if (!rawDate) return;
        const transactionDate = new Date(rawDate);
        if (isNaN(transactionDate.getTime())) return;

        let periodKey: string;
        let sortKey: number;

        if (customYear) {
          const allocation = getTransactionFiscalYear(
            {
              transaction_date: rawDate,
              value: transaction.value,
              value_usd: transaction.value_usd,
              currency: transaction.currency,
            },
            customYear
          );
          if (!allocation) return;
          periodKey = allocation.label;
          sortKey = allocation.fiscalYear;
        } else if (timePeriod === 'quarter') {
          const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
          periodKey = `${transactionDate.getFullYear()}-Q${quarter}`;
          sortKey = transactionDate.getFullYear() * 10 + quarter;
        } else {
          periodKey = transactionDate.getFullYear().toString();
          sortKey = transactionDate.getFullYear();
        }

        const periodData = ensurePeriod(periodKey, sortKey);

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

    // Convert to array and sort by period
    const chartData = Array.from(dataMap.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ sortKey, ...rest }) => rest);

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
        timePeriod,
        customYearId: customYearId || null,
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
