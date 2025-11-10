import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SectorData {
  sectorCode: string;
  sectorName: string;
  activityCount: number;
  totalBudget: number;
  totalDisbursements: number;
  totalExpenditures: number;
  budgetPercentage: number;
  disbursementPercentage: number;
  expenditurePercentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topN = parseInt(searchParams.get('topN') || '10');

    const supabaseAdmin = getSupabaseAdmin();


    


    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // First, get only published activities
    const { data: publishedActivities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id')
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('Error fetching published activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    const publishedActivityIds = publishedActivities?.map(a => a.id) || [];

    if (publishedActivityIds.length === 0) {
      return NextResponse.json({
        data: []
      });
    }

    // Get activity sectors only for published activities
    const { data: activitySectors, error: sectorsError } = await supabaseAdmin
      .from('activity_sectors')
      .select('sector_code, sector_name, percentage, activity_id')
      .in('activity_id', publishedActivityIds);

    if (sectorsError) {
      console.error('Error fetching activity sectors:', sectorsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity sectors data' },
        { status: 500 }
      );
    }

    if (!activitySectors || activitySectors.length === 0) {
      return NextResponse.json({
        data: []
      });
    }

    // Get transactions only for published activities (only USD values)
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('activity_id, transaction_type, value_usd')
      .in('transaction_type', ['2', '3', '4']) // Commitment, Disbursement, Expenditure
      .in('activity_id', publishedActivityIds)
      .not('value_usd', 'is', null); // Only include transactions with USD values

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions data' },
        { status: 500 }
      );
    }

    // Build activity to sector mapping with percentages
    const activitySectorMap = new Map<string, Array<{ sectorCode: string; sectorName: string; percentage: number }>>();

    activitySectors.forEach((sector: any) => {
      const activityId = sector.activity_id;
      if (!activitySectorMap.has(activityId)) {
        activitySectorMap.set(activityId, []);
      }
      activitySectorMap.get(activityId)!.push({
        sectorCode: sector.sector_code || 'Unknown',
        sectorName: sector.sector_name || sector.sector_code || 'Unknown',
        percentage: sector.percentage || 0
      });
    });

    // Process transactions and allocate to sectors based on percentage
    const sectorMap = new Map<string, {
      sectorName: string;
      activityIds: Set<string>;
      totalBudget: number;
      totalDisbursements: number;
      totalExpenditures: number;
    }>();

    transactions?.forEach((transaction: any) => {
      const activityId = transaction.activity_id;
      const sectors = activitySectorMap.get(activityId);

      if (!sectors || sectors.length === 0) return;

      // Parse transaction value (USD only)
      const value = parseFloat(transaction.value_usd?.toString() || '0') || 0;

      if (isNaN(value) || !isFinite(value) || value === 0) return;

      // Allocate value to sectors based on their percentages
      sectors.forEach(sector => {
        const sectorCode = sector.sectorCode;
        const sectorName = sector.sectorName;
        const percentage = sector.percentage / 100; // Convert to decimal

        if (!sectorMap.has(sectorCode)) {
          sectorMap.set(sectorCode, {
            sectorName,
            activityIds: new Set(),
            totalBudget: 0,
            totalDisbursements: 0,
            totalExpenditures: 0
          });
        }

        const sectorData = sectorMap.get(sectorCode)!;
        sectorData.activityIds.add(activityId);

        // Allocate proportional value based on sector percentage
        const allocatedValue = value * percentage;

        switch (transaction.transaction_type) {
          case '2':
          case 2:
            sectorData.totalBudget += allocatedValue;
            break;
          case '3':
          case 3:
            sectorData.totalDisbursements += allocatedValue;
            break;
          case '4':
          case 4:
            sectorData.totalExpenditures += allocatedValue;
            break;
        }
      });
    });

    // Calculate totals across all sectors
    let grandTotalBudget = 0;
    let grandTotalDisbursements = 0;
    let grandTotalExpenditures = 0;

    sectorMap.forEach(data => {
      grandTotalBudget += data.totalBudget;
      grandTotalDisbursements += data.totalDisbursements;
      grandTotalExpenditures += data.totalExpenditures;
    });

    // Convert to result format with percentages
    const result: SectorData[] = Array.from(sectorMap.entries())
      .map(([sectorCode, data]) => ({
        sectorCode,
        sectorName: data.sectorName,
        activityCount: data.activityIds.size,
        totalBudget: data.totalBudget,
        totalDisbursements: data.totalDisbursements,
        totalExpenditures: data.totalExpenditures,
        budgetPercentage: grandTotalBudget > 0 ? (data.totalBudget / grandTotalBudget) * 100 : 0,
        disbursementPercentage: grandTotalDisbursements > 0 ? (data.totalDisbursements / grandTotalDisbursements) * 100 : 0,
        expenditurePercentage: grandTotalExpenditures > 0 ? (data.totalExpenditures / grandTotalExpenditures) * 100 : 0
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget) // Sort by budget descending
      .slice(0, topN); // Apply top N limit

    return NextResponse.json({
      data: result,
      summary: {
        totalSectors: sectorMap.size,
        showing: result.length,
        totalActivities: new Set(activitySectors.map((s: any) => s.activity_id)).size,
        grandTotalBudget,
        grandTotalDisbursements,
        grandTotalExpenditures
      }
    });

  } catch (error) {
    console.error('Error in sectors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}