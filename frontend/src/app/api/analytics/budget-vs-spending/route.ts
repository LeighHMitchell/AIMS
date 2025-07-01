import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  period: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const donor = searchParams.get('donor') || 'all';
    const aidType = searchParams.get('aidType') || 'all';
    const financeType = searchParams.get('financeType') || 'all';
    const flowType = searchParams.get('flowType') || 'all';
    const timePeriod = searchParams.get('timePeriod') || 'year';
    const isExport = searchParams.get('export') === 'true';

    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
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
        transactions (
          transaction_type,
          value,
          currency,
          transaction_date
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

    // Process budget data first
    budgetData?.forEach((budget: any) => {
      const startDate = new Date(budget.period_start);
      
      let periodKey: string;
      if (timePeriod === 'quarter') {
        const quarter = Math.floor(startDate.getMonth() / 3) + 1;
        periodKey = `${startDate.getFullYear()}-Q${quarter}`;
      } else {
        periodKey = startDate.getFullYear().toString();
      }

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
      periodData.budget += budget.value || 0;
    });

    // Process activities and their transactions
    activities?.forEach((activity: any) => {
      // Determine the time period for this activity
      const startDate = activity.planned_start_date ? new Date(activity.planned_start_date) : new Date();
      
      let periodKey: string;
      if (timePeriod === 'quarter') {
        const quarter = Math.floor(startDate.getMonth() / 3) + 1;
        periodKey = `${startDate.getFullYear()}-Q${quarter}`;
      } else {
        periodKey = startDate.getFullYear().toString();
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

      // Process transactions
      activity.transactions?.forEach((transaction: any) => {
        // Convert to USD if needed (simplified - in real app you'd use exchange rates)
        const value = transaction.currency === defaultCurrency ? transaction.value : transaction.value;

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
    const chartData = Array.from(dataMap.values()).sort((a, b) => {
      if (timePeriod === 'quarter') {
        // Sort quarters: 2023-Q1, 2023-Q2, etc.
        const [yearA, quarterA] = a.period.split('-Q');
        const [yearB, quarterB] = b.period.split('-Q');
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        return parseInt(quarterA) - parseInt(quarterB);
      } else {
        // Sort years
        return parseInt(a.period) - parseInt(b.period);
      }
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