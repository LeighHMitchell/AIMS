import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  organization: string;
  acronym: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
  iati_id?: string;
  org_type?: string;
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
    const topN = searchParams.get('topN') || '10';

    const supabaseAdmin = supabase;

    // Get activities with transactions and organization details
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select(`
        id,
        title_narrative,
        reporting_org_id,
        created_by_org_name,
        created_by_org_acronym,
        reporting_org:organizations!activities_reporting_org_id_fkey (
          iati_org_id,
          org_type
        ),
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

    // Process the data to create chart data points
    const orgMap = new Map<string, ChartDataPoint>();
    const defaultCurrency = 'USD';

    activities?.forEach((activity: any) => {
      const orgName = activity.created_by_org_name || activity.created_by_org_acronym || 'Unknown Organization';
      const orgAcronym = activity.created_by_org_acronym || orgName;
      const iatiId = activity.reporting_org?.iati_org_id;
      const orgType = activity.reporting_org?.org_type;

      // Initialize organization data if not exists
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          organization: orgName,
          acronym: orgAcronym,
          budget: 0,
          disbursements: 0,
          expenditures: 0,
          totalSpending: 0,
          iati_id: iatiId,
          org_type: orgType,
        });
      }

      const orgData = orgMap.get(orgName)!;

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