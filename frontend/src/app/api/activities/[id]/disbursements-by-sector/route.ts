import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch activity sectors with percentages
    const { data: activitySectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('sector_code, sector_name, percentage')
      .eq('activity_id', activityId);

    if (sectorsError) {
      console.error('[DisbursementsBySector] Error fetching sectors:', sectorsError);
      return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
    }

    // Fetch planned disbursements
    const { data: plannedDisbursements, error: plannedError } = await supabase
      .from('planned_disbursements')
      .select('amount, usd_amount, currency, period_start, period_end')
      .eq('activity_id', activityId);

    if (plannedError) {
      console.error('[DisbursementsBySector] Error fetching planned disbursements:', plannedError);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    // Fetch actual disbursements (transactions with type '3' - Disbursement)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        transaction_type,
        transaction_date,
        value,
        value_usd,
        currency,
        sector_code
      `)
      .eq('activity_id', activityId)
      .eq('transaction_type', '3')
      .eq('status', 'actual');

    if (transactionsError) {
      console.error('[DisbursementsBySector] Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Fetch transaction sector lines for granular sector allocation
    const transactionIds = transactions?.map(t => t.uuid) || [];
    let transactionSectorLines: any[] = [];
    
    if (transactionIds.length > 0) {
      const { data: sectorLines, error: sectorLinesError } = await supabase
        .from('transaction_sector_lines')
        .select('transaction_id, sector_code, sector_name, percentage, amount_minor')
        .in('transaction_id', transactionIds)
        .is('deleted_at', null);

      if (!sectorLinesError && sectorLines) {
        transactionSectorLines = sectorLines;
      }
    }

    // Process data by sector and year
    const sectorDataMap = new Map<string, {
      sectorCode: string;
      sectorName: string;
      yearlyData: Map<number, { planned: number; actual: number }>;
    }>();

    // Initialize sectors from activity sectors
    activitySectors?.forEach(sector => {
      sectorDataMap.set(sector.sector_code, {
        sectorCode: sector.sector_code,
        sectorName: sector.sector_name,
        yearlyData: new Map()
      });
    });

    // Process planned disbursements
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start) return;
      
      const year = new Date(pd.period_start).getFullYear();
      const amount = pd.usd_amount || pd.amount || 0;
      
      // Allocate to sectors based on activity sector percentages
      activitySectors?.forEach(sector => {
        const sectorData = sectorDataMap.get(sector.sector_code);
        if (!sectorData) return;
        
        const yearData = sectorData.yearlyData.get(year) || { planned: 0, actual: 0 };
        yearData.planned += amount * (sector.percentage / 100);
        sectorData.yearlyData.set(year, yearData);
      });
    });

    // Process actual disbursements
    transactions?.forEach(transaction => {
      if (!transaction.transaction_date) return;
      
      const year = new Date(transaction.transaction_date).getFullYear();
      const transactionValue = transaction.value_usd || transaction.value || 0;
      
      // Check if this transaction has sector lines
      const sectorLines = transactionSectorLines.filter(
        sl => sl.transaction_id === transaction.uuid
      );
      
      if (sectorLines.length > 0) {
        // Use transaction-level sector allocation
        sectorLines.forEach(line => {
          let sectorData = sectorDataMap.get(line.sector_code);
          if (!sectorData) {
            // Add new sector if not in activity sectors
            sectorData = {
              sectorCode: line.sector_code,
              sectorName: line.sector_name,
              yearlyData: new Map()
            };
            sectorDataMap.set(line.sector_code, sectorData);
          }
          
          const yearData = sectorData.yearlyData.get(year) || { planned: 0, actual: 0 };
          yearData.actual += transactionValue * (line.percentage / 100);
          sectorData.yearlyData.set(year, yearData);
        });
      } else if (transaction.sector_code) {
        // Use legacy transaction-level sector
        let sectorData = sectorDataMap.get(transaction.sector_code);
        if (!sectorData) {
          sectorData = {
            sectorCode: transaction.sector_code,
            sectorName: 'Unknown Sector',
            yearlyData: new Map()
          };
          sectorDataMap.set(transaction.sector_code, sectorData);
        }
        
        const yearData = sectorData.yearlyData.get(year) || { planned: 0, actual: 0 };
        yearData.actual += transactionValue;
        sectorData.yearlyData.set(year, yearData);
      } else {
        // No sector info, allocate based on activity sectors
        activitySectors?.forEach(sector => {
          const sectorData = sectorDataMap.get(sector.sector_code);
          if (!sectorData) return;
          
          const yearData = sectorData.yearlyData.get(year) || { planned: 0, actual: 0 };
          yearData.actual += transactionValue * (sector.percentage / 100);
          sectorData.yearlyData.set(year, yearData);
        });
      }
    });

    // Convert to response format
    const result = {
      sectors: Array.from(sectorDataMap.values()).map(sector => ({
        sectorCode: sector.sectorCode,
        sectorName: sector.sectorName,
        years: Array.from(sector.yearlyData.entries()).map(([year, data]) => ({
          year,
          planned: data.planned,
          actual: data.actual
        })).sort((a, b) => a.year - b.year)
      }))
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DisbursementsBySector] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}






