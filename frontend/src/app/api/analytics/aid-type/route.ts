import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AID_TYPES } from '@/types/transaction';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  aidType: string;
  aidTypeName: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const donor = searchParams.get('donor') || 'all';
    const financeType = searchParams.get('financeType') || 'all';
    const flowType = searchParams.get('flowType') || 'all';
    const topN = searchParams.get('topN') || '10';

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
        title,
        transactions (
          id,
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

    // Process the data by aid type (simulate since aid_type field doesn't exist in current schema)
    const aidTypeMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    // Simulate aid type distribution for demo purposes
    // In production, this would use actual aid_type field from activities
    const aidTypeCodes = Object.keys(AID_TYPES);
    
    activities?.forEach((activity, index) => {
      // Simulate aid type assignment (in production, use activity.aid_type)
      const aidTypeCode = aidTypeCodes[index % aidTypeCodes.length];
      const aidTypeName = AID_TYPES[aidTypeCode as keyof typeof AID_TYPES];
      
      // Initialize aid type data if not exists
      if (!aidTypeMap.has(aidTypeCode)) {
        aidTypeMap.set(aidTypeCode, {
          aidType: aidTypeCode,
          aidTypeName: aidTypeName,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
        });
      }

      const aidTypeData = aidTypeMap.get(aidTypeCode)!;

      // Process transactions
      activity.transactions?.forEach(transaction => {
        const value = transaction.currency === defaultCurrency ? transaction.value : transaction.value;

        switch (transaction.transaction_type) {
          case 'C':
          case 'commitment':
            aidTypeData.budget += value;
            break;
          case 'D':
          case 'disbursement':
            aidTypeData.disbursements += value;
            aidTypeData.totalSpending += value;
            break;
          case 'E':
          case 'expenditure':
            aidTypeData.expenditures += value;
            aidTypeData.totalSpending += value;
            break;
        }
      });
    });

    // Convert to array and sort by total budget
    let chartData = Array.from(aidTypeMap.values()).sort((a, b) => b.budget - a.budget);

    // Apply top N filter
    if (topN !== 'all') {
      const limit = parseInt(topN);
      chartData = chartData.slice(0, limit);
    }

    return NextResponse.json({
      data: chartData,
      currency: defaultCurrency,
      summary: {
        totalAidTypes: aidTypeMap.size,
        showing: chartData.length,
      },
      filters: {
        donor,
        financeType,
        flowType,
        topN
      }
    });

  } catch (error) {
    console.error('Error in aid-type API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}