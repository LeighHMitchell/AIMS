import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get activities with transactions and organization info
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        title,
        created_by_org,
        transactions (
          id,
          transaction_type,
          value,
          currency
        ),
        organizations!activities_created_by_org_fkey (
          id,
          name,
          type
        )
      `)
      .eq('publication_status', 'published')
      .not('created_by_org', 'is', null);

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

    activities?.forEach(activity => {
      const orgName = activity.organizations?.name || 'Unknown Organization';
      
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
      activity.transactions?.forEach(transaction => {
        const value = transaction.currency === defaultCurrency ? transaction.value : transaction.value;

        switch (transaction.transaction_type) {
          case 'C':
          case 'commitment':
            orgData.budget += value;
            break;
          case 'D':
          case 'disbursement':
            orgData.disbursements += value;
            orgData.totalSpending += value;
            break;
          case 'E':
          case 'expenditure':
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