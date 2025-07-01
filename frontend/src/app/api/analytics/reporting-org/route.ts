import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  organization: string;
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
        reporting_org_id,
        created_by_org_name,
        created_by_org_acronym,
        transactions (
          transaction_type,
          value,
          currency
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

    // Process the data to create chart data points
    const orgMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    activities?.forEach((activity: any) => {
      const orgName = activity.created_by_org_name || activity.created_by_org_acronym || 'Unknown Organization';
      
      // Initialize organization data if not exists
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          organization: orgName,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
        });
      }

      const orgData = orgMap.get(orgName)!;

      // Process transactions
      activity.transactions?.forEach((transaction: any) => {
        const value = transaction.currency === defaultCurrency ? transaction.value : transaction.value;

        switch (transaction.transaction_type) {
          case '2': // Commitment
          case 2:
            orgData.budget += value;
            break;
          case '3': // Disbursement
          case 3:
            orgData.disbursements += value;
            orgData.totalSpending += value;
            break;
          case '4': // Expenditure
          case 4:
            orgData.expenditures += value;
            orgData.totalSpending += value;
            break;
        }
      });
    });

    // Convert to array and sort by total budget
    let chartData = Array.from(orgMap.values()).sort((a, b) => b.budget - a.budget);

    // Apply top N filter
    if (topN !== 'all') {
      const limit = parseInt(topN);
      chartData = chartData.slice(0, limit);
    }

    return NextResponse.json({
      data: chartData,
      currency: defaultCurrency,
      summary: {
        totalOrganizations: orgMap.size,
        showing: chartData.length,
      },
      filters: {
        donor,
        aidType,
        financeType,
        flowType,
        topN
      }
    });

  } catch (error) {
    console.error('Error in reporting-org API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}