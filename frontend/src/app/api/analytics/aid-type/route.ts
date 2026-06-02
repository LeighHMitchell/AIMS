import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Define AID_TYPES locally
const AID_TYPES: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Pooled funds/basket funds',
  'B04': 'Donor country personnel',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

interface ChartDataPoint {
  aidType: string;
  aidTypeName: string;
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
    const financeType = searchParams.get('financeType') || 'all';
    const flowType = searchParams.get('flowType') || 'all';
    const topN = searchParams.get('topN') || '10';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const supabaseAdmin = supabase;

    // Get activities with transactions. Aid type comes from the transaction's
    // own aid_type, falling back to the activity's default_aid_type (real data —
    // no longer simulated).
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        default_aid_type,
        transactions:transactions!transactions_activity_id_fkey1 (
          transaction_type,
          value_usd,
          receiver_activity_uuid,
          aid_type,
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

    // Process the data by REAL aid type: each transaction's aid_type, falling
    // back to the activity's default_aid_type. Untagged transactions are grouped
    // under "Unspecified".
    const aidTypeMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';
    const fromD = dateFrom ? new Date(dateFrom) : null;
    const toD = dateTo ? new Date(dateTo) : null;

    activities?.forEach((activity: any) => {
      activity.transactions?.forEach((transaction: any) => {
        // Exclude internal transfers (pooled fund flows) to avoid double-counting
        if (transaction.receiver_activity_uuid) return;

        // Date-range filter (transaction date)
        if (transaction.transaction_date) {
          const txDate = new Date(transaction.transaction_date);
          if (fromD && txDate < fromD) return;
          if (toD && txDate > toD) return;
        }

        const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;
        if (isNaN(value) || !isFinite(value) || value === 0) return;

        const code = String(transaction.aid_type || activity.default_aid_type || 'Unspecified');
        const aidTypeName = AID_TYPES[code] || (code === 'Unspecified' ? 'Unspecified' : code);

        if (!aidTypeMap.has(code)) {
          aidTypeMap.set(code, {
            aidType: code,
            aidTypeName,
            budget: 0,
            disbursements: 0,
            expenditures: 0,
            totalSpending: 0,
          });
        }
        const aidTypeData = aidTypeMap.get(code)!;

        switch (String(transaction.transaction_type)) {
          case '2': // Commitment
            aidTypeData.budget += value;
            break;
          case '3': // Disbursement
            aidTypeData.disbursements += value;
            aidTypeData.totalSpending += value;
            break;
          case '4': // Expenditure
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