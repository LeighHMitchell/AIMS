import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  orgType: string;
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

    // First, get all organizations to map their types
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, type, organisation_type');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
    }

    // Create a map of org id to type
    const orgIdToTypeMap = new Map();
    organizations?.forEach((org: any) => {
      orgIdToTypeMap.set(org.id, org.organisation_type || org.type || 'Unknown');
    });

    // Get activities with transactions
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        title_narrative,
        reporting_org_id,
        created_by_org_name,
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

    // Process the data to create chart data points by organization type
    const orgTypeMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    activities?.forEach((activity: any) => {
      const orgType = activity.reporting_org_id ? orgIdToTypeMap.get(activity.reporting_org_id) || 'Unknown' : 'Unknown';
      
      // Initialize org type data if not exists
      if (!orgTypeMap.has(orgType)) {
        orgTypeMap.set(orgType, {
          orgType: orgType,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
        });
      }

      const orgTypeData = orgTypeMap.get(orgType)!;

      // Process transactions
      activity.transactions?.forEach((transaction: any) => {
        // Safely parse transaction value
        let value = 0;
        if (transaction.value !== null && transaction.value !== undefined) {
          if (typeof transaction.value === 'string') {
            value = parseFloat(transaction.value) || 0;
          } else if (typeof transaction.value === 'number') {
            value = transaction.value;
          } else if (typeof transaction.value === 'object' && transaction.value.toString) {
            value = parseFloat(transaction.value.toString()) || 0;
          }
        }
        
        if (isNaN(value) || !isFinite(value)) {
          return; // Skip invalid values
        }

        switch (transaction.transaction_type) {
          case '2': // Commitment
          case 2:
            orgTypeData.budget += value;
            break;
          case '3': // Disbursement
          case 3:
            orgTypeData.disbursements += value;
            orgTypeData.totalSpending += value;
            break;
          case '4': // Expenditure
          case 4:
            orgTypeData.expenditures += value;
            orgTypeData.totalSpending += value;
            break;
        }
      });
    });

    // Convert to array and sort by total budget
    let chartData = Array.from(orgTypeMap.values()).sort((a, b) => b.budget - a.budget);

    // Apply top N filter
    if (topN !== 'all') {
      const limit = parseInt(topN);
      chartData = chartData.slice(0, limit);
    }

    return NextResponse.json({
      data: chartData,
      currency: defaultCurrency,
      summary: {
        totalOrgTypes: orgTypeMap.size,
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
    console.error('Error in org-type API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}