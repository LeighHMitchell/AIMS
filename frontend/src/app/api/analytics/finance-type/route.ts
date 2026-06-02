import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// IATI Finance Types (simplified list)
const FINANCE_TYPES = {
  "110": "Aid grant excluding debt reorganisation",
  "210": "Standard grant",
  "310": "Loan excluding debt reorganisation",
  "410": "Aid loan excluding debt reorganisation",
  "421": "Standard loan",
  "422": "Reimbursable grant",
  "510": "Common equity",
  "520": "Non-bank guaranteed export credits",
} as const;

interface ChartDataPoint {
  financeType: string;
  financeTypeName: string;
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
    const flowType = searchParams.get('flowType') || 'all';
    const topN = searchParams.get('topN') || '10';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const supabaseAdmin = supabase;

    // Get activities with transactions. Finance type comes from the transaction's
    // own finance_type, falling back to the activity's default_finance_type
    // (real data — no longer simulated).
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        default_finance_type,
        transactions:transactions!transactions_activity_id_fkey1 (
          transaction_type,
          value_usd,
          receiver_activity_uuid,
          finance_type,
          transaction_date
        )
      `)
      .eq('publication_status', 'published')
      .is('deleted_at', null);

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    // Process the data by REAL finance type, grouping untagged under "Unspecified".
    const financeTypeMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';
    const fromD = dateFrom ? new Date(dateFrom) : null;
    const toD = dateTo ? new Date(dateTo) : null;

    activities?.forEach((activity: any) => {
      activity.transactions?.forEach((transaction: any) => {
        // Exclude internal transfers (pooled fund flows) to avoid double-counting
        if (transaction.receiver_activity_uuid) return;

        if (transaction.transaction_date) {
          const txDate = new Date(transaction.transaction_date);
          if (fromD && txDate < fromD) return;
          if (toD && txDate > toD) return;
        }

        const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;
        if (isNaN(value) || !isFinite(value) || value === 0) return;

        const code = String(transaction.finance_type || activity.default_finance_type || 'Unspecified');
        const financeTypeName = (FINANCE_TYPES as Record<string, string>)[code] || (code === 'Unspecified' ? 'Unspecified' : code);

        if (!financeTypeMap.has(code)) {
          financeTypeMap.set(code, {
            financeType: code,
            financeTypeName,
            budget: 0,
            disbursements: 0,
            expenditures: 0,
            totalSpending: 0,
          });
        }
        const financeTypeData = financeTypeMap.get(code)!;

        switch (String(transaction.transaction_type)) {
          case '2': // Commitment
            financeTypeData.budget += value;
            break;
          case '3': // Disbursement
            financeTypeData.disbursements += value;
            financeTypeData.totalSpending += value;
            break;
          case '4': // Expenditure
            financeTypeData.expenditures += value;
            financeTypeData.totalSpending += value;
            break;
        }
      });
    });

    // Convert to array and sort by total budget
    let chartData = Array.from(financeTypeMap.values()).sort((a, b) => b.budget - a.budget);

    // Apply top N filter
    if (topN !== 'all') {
      const limit = parseInt(topN);
      chartData = chartData.slice(0, limit);
    }

    return NextResponse.json({
      data: chartData,
      currency: defaultCurrency,
      summary: {
        totalFinanceTypes: financeTypeMap.size,
        showing: chartData.length,
      },
      filters: {
        donor,
        aidType,
        flowType,
        topN
      }
    });

  } catch (error) {
    console.error('Error in finance-type API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}