import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
  try {
    const { searchParams } = new URL(request.url);
    const donor = searchParams.get('donor') || 'all';
    const aidType = searchParams.get('aidType') || 'all';
    const flowType = searchParams.get('flowType') || 'all';
    const topN = searchParams.get('topN') || '10';

    const supabaseAdmin = getSupabaseAdmin();


    


    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get activities with transactions
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        title_narrative,
        transactions:transactions!transactions_activity_id_fkey1 (
          transaction_type,
          value_usd
        )
      `)
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    // Process the data by finance type (simulate since finance_type field doesn't exist in current schema)
    const financeTypeMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    // Simulate finance type distribution for demo purposes
    const financeTypeCodes = Object.keys(FINANCE_TYPES);
    
    activities?.forEach((activity: any, index: number) => {
      // Simulate finance type assignment (in production, use activity.finance_type)
      const financeTypeCode = financeTypeCodes[index % financeTypeCodes.length];
      const financeTypeName = FINANCE_TYPES[financeTypeCode as keyof typeof FINANCE_TYPES];
      
      // Initialize finance type data if not exists
      if (!financeTypeMap.has(financeTypeCode)) {
        financeTypeMap.set(financeTypeCode, {
          financeType: financeTypeCode,
          financeTypeName: financeTypeName,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
        });
      }

      const financeTypeData = financeTypeMap.get(financeTypeCode)!;

      // Process transactions (USD only)
      activity.transactions?.forEach((transaction: any) => {
        // Parse transaction value (USD only)
        const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;

        if (isNaN(value) || !isFinite(value) || value === 0) {
          return; // Skip invalid or non-USD values
        }

        switch (transaction.transaction_type) {
          case '2': // Commitment
          case 2:
            financeTypeData.budget += value;
            break;
          case '3': // Disbursement
          case 3:
            financeTypeData.disbursements += value;
            financeTypeData.totalSpending += value;
            break;
          case '4': // Expenditure
          case 4:
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