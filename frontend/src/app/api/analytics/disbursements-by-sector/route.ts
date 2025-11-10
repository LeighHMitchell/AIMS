import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const country = searchParams.get('country');
    const donor = searchParams.get('donor');
    const sector = searchParams.get('sector');

    // Fetch all activities with their sectors
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        activity_sectors (
          sector_code,
          sector_name,
          percentage
        )
      `);

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[DisbursementsBySector] Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Get activity IDs
    const activityIds = activities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json({ sectors: [] });
    }

    // Fetch planned disbursements with filters
    let plannedQuery = supabase
      .from('planned_disbursements')
      .select('activity_id, amount, usd_amount, currency, period_start, period_end')
      .in('activity_id', activityIds);

    if (dateFrom) {
      plannedQuery = plannedQuery.gte('period_start', dateFrom);
    }
    if (dateTo) {
      plannedQuery = plannedQuery.lte('period_start', dateTo);
    }

    const { data: plannedDisbursements, error: plannedError } = await plannedQuery;

    if (plannedError) {
      console.error('[DisbursementsBySector] Error fetching planned disbursements:', plannedError);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    // Fetch actual disbursements (transactions with type '3' - Disbursement)
    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        value_usd,
        currency,
        sector_code,
        provider_org_id,
        recipient_country_code
      `)
      .in('activity_id', activityIds)
      .eq('transaction_type', '3')
      .eq('status', 'actual');

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }
    if (donor && donor !== 'all') {
      transactionsQuery = transactionsQuery.eq('provider_org_id', donor);
    }
    if (country && country !== 'all') {
      transactionsQuery = transactionsQuery.eq('recipient_country_code', country);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;

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

    // Build activity sectors map
    const activitySectorsMap = new Map<string, any[]>();
    activities?.forEach(activity => {
      if (activity.activity_sectors && activity.activity_sectors.length > 0) {
        activitySectorsMap.set(activity.id, activity.activity_sectors);
        
        // Initialize sectors in our map
        activity.activity_sectors.forEach((sector: any) => {
          if (!sectorDataMap.has(sector.sector_code)) {
            sectorDataMap.set(sector.sector_code, {
              sectorCode: sector.sector_code,
              sectorName: sector.sector_name,
              yearlyData: new Map()
            });
          }
        });
      }
    });

    // Process planned disbursements
    plannedDisbursements?.forEach(pd => {
      if (!pd.period_start) return;
      
      const year = new Date(pd.period_start).getFullYear();
      const amount = pd.usd_amount || pd.amount || 0;
      const activitySectors = activitySectorsMap.get(pd.activity_id) || [];
      
      // Allocate to sectors based on activity sector percentages
      activitySectors.forEach(sector => {
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
      const transactionValue = transaction.value_usd || 0;
      const activitySectors = activitySectorsMap.get(transaction.activity_id) || [];
      
      // Check if this transaction has sector lines
      const sectorLines = transactionSectorLines.filter(
        sl => sl.transaction_id === transaction.uuid
      );
      
      if (sectorLines.length > 0) {
        // Use transaction-level sector allocation
        sectorLines.forEach(line => {
          let sectorData = sectorDataMap.get(line.sector_code);
          if (!sectorData) {
            // Add new sector if not already tracked
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
        activitySectors.forEach(sector => {
          const sectorData = sectorDataMap.get(sector.sector_code);
          if (!sectorData) return;
          
          const yearData = sectorData.yearlyData.get(year) || { planned: 0, actual: 0 };
          yearData.actual += transactionValue * (sector.percentage / 100);
          sectorData.yearlyData.set(year, yearData);
        });
      }
    });

    // Filter by sector if specified
    let resultSectors = Array.from(sectorDataMap.values());
    if (sector && sector !== 'all') {
      resultSectors = resultSectors.filter(s => s.sectorCode === sector);
    }

    // Convert to response format
    const result = {
      sectors: resultSectors.map(sector => ({
        sectorCode: sector.sectorCode,
        sectorName: sector.sectorName,
        years: Array.from(sector.yearlyData.entries()).map(([year, data]) => ({
          year,
          planned: data.planned,
          actual: data.actual
        })).sort((a, b) => a.year - b.year)
      })).filter(s => s.years.length > 0) // Only include sectors with data
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DisbursementsBySector] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

















