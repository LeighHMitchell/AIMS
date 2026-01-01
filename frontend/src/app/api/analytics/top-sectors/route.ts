import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import dacSectors from '@/data/dac-sectors.json';

export const dynamic = 'force-dynamic';

type MetricType = "budgets" | "planned" | "commitments" | "disbursements";

interface SectorData {
  id: string;
  name: string;
  code: string;
  value: number;
  activityCount: number;
}

// Build a map from DAC 3-digit code to category name from dac-sectors.json
// The keys in dac-sectors.json are like "112 - Basic Education"
const sectorNameMap = new Map<string, string>();
Object.keys(dacSectors).forEach(key => {
  // Extract code from key like "112 - Basic Education"
  const match = key.match(/^(\d{3})\s*-\s*(.+)$/);
  if (match) {
    sectorNameMap.set(match[1], match[2]);
  }
});

function getSectorName(code: string): string {
  return sectorNameMap.get(code) || `Sector ${code}`;
}

/**
 * GET /api/analytics/top-sectors
 * Returns top sectors aggregated by DAC 3-digit category
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = (searchParams.get('metric') || 'commitments') as MetricType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const topN = parseInt(searchParams.get('topN') || '5');

    // Map to aggregate by sector
    const sectorMap = new Map<string, { 
      name: string;
      value: number; 
      activityIds: Set<string>;
    }>();

    // Get all activity sectors with their percentages
    const { data: activitySectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, category_code, category_name, percentage');

    if (sectorsError) {
      console.error('[TopSectors] Error fetching activity sectors:', sectorsError);
      throw new Error('Failed to fetch activity sectors');
    }

    // Build activity to sector mapping with percentages
    const activitySectorMap = new Map<string, Array<{ code: string; name: string; percentage: number }>>();
    activitySectors?.forEach((s: any) => {
      const categoryCode = s.category_code || s.sector_code?.substring(0, 3);
      if (!categoryCode || !s.activity_id) return;
      
      // Look up proper sector name from DAC codes reference
      const categoryName = getSectorName(categoryCode);
      const percentage = (s.percentage || 100) / 100;
      
      const existing = activitySectorMap.get(s.activity_id) || [];
      existing.push({ code: categoryCode, name: categoryName, percentage });
      activitySectorMap.set(s.activity_id, existing);
    });

    if (metric === 'budgets') {
      // Get budgets from activity_budgets table
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('usd_value, value, activity_id, period_start, period_end');

      if (budgetError) {
        console.error('[TopSectors] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;

        const sectors = activitySectorMap.get(budget.activity_id);
        if (!sectors || sectors.length === 0) return;

        const totalValue = parseFloat(budget.usd_value?.toString() || budget.value?.toString() || '0') || 0;
        if (totalValue === 0) return;

        // Distribute value across sectors based on percentages
        sectors.forEach(sector => {
          const sectorValue = totalValue * sector.percentage;
          const existing = sectorMap.get(sector.code) || { 
            name: sector.name, 
            value: 0, 
            activityIds: new Set<string>()
          };
          existing.value += sectorValue;
          existing.activityIds.add(budget.activity_id);
          sectorMap.set(sector.code, existing);
        });
      });

    } else if (metric === 'planned') {
      // Get planned disbursements
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_disbursements')
        .select('usd_amount, amount, period_start, period_end, activity_id');

      if (plannedError) {
        console.error('[TopSectors] Error fetching planned disbursements:', plannedError);
        throw new Error('Failed to fetch planned disbursements data');
      }

      plannedData?.forEach((pd: any) => {
        // Apply date filter if provided
        if (dateFrom && pd.period_start && new Date(pd.period_start) < new Date(dateFrom)) return;
        if (dateTo && pd.period_end && new Date(pd.period_end) > new Date(dateTo)) return;

        const sectors = activitySectorMap.get(pd.activity_id);
        if (!sectors || sectors.length === 0) return;

        const totalValue = parseFloat(pd.usd_amount?.toString() || pd.amount?.toString() || '0') || 0;
        if (totalValue === 0) return;

        // Distribute value across sectors based on percentages
        sectors.forEach(sector => {
          const sectorValue = totalValue * sector.percentage;
          const existing = sectorMap.get(sector.code) || { 
            name: sector.name, 
            value: 0, 
            activityIds: new Set<string>()
          };
          existing.value += sectorValue;
          if (pd.activity_id) existing.activityIds.add(pd.activity_id);
          sectorMap.set(sector.code, existing);
        });
      });

    } else {
      // Commitments or Disbursements: From transactions table
      const transactionType = metric === 'commitments' ? '2' : '3';

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('value_usd, value, transaction_date, activity_id')
        .eq('transaction_type', transactionType)
        .eq('status', 'actual');

      if (txError) {
        console.error('[TopSectors] Error fetching transactions:', txError);
        throw new Error('Failed to fetch transaction data');
      }

      txData?.forEach((tx: any) => {
        // Apply date filter if provided
        if (dateFrom && tx.transaction_date && new Date(tx.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && tx.transaction_date && new Date(tx.transaction_date) > new Date(dateTo)) return;

        const sectors = activitySectorMap.get(tx.activity_id);
        if (!sectors || sectors.length === 0) return;

        const totalValue = parseFloat(tx.value_usd?.toString() || tx.value?.toString() || '0') || 0;
        if (totalValue === 0) return;

        // Distribute value across sectors based on percentages
        sectors.forEach(sector => {
          const sectorValue = totalValue * sector.percentage;
          const existing = sectorMap.get(sector.code) || { 
            name: sector.name, 
            value: 0, 
            activityIds: new Set<string>()
          };
          existing.value += sectorValue;
          if (tx.activity_id) existing.activityIds.add(tx.activity_id);
          sectorMap.set(sector.code, existing);
        });
      });
    }

    // Sort and get top N
    const sorted = Array.from(sectorMap.entries())
      .filter(([code]) => code && code !== '')
      .sort((a, b) => b[1].value - a[1].value);

    const topSectors: SectorData[] = sorted.slice(0, topN).map(([code, data]) => ({
      id: code,
      name: `${code} - ${data.name}`,
      code,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    // Aggregate others
    const othersValue = sorted.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    const othersActivityCount = sorted.slice(topN).reduce((sum, [, data]) => sum + data.activityIds.size, 0);
    if (othersValue > 0) {
      topSectors.push({
        id: 'others',
        name: 'OTHERS',
        code: 'others',
        value: othersValue,
        activityCount: othersActivityCount,
      });
    }

    // Calculate grand total
    const grandTotal = sorted.reduce((sum, [, data]) => sum + data.value, 0);

    return NextResponse.json({
      success: true,
      data: topSectors,
      grandTotal,
      metric,
    });

  } catch (error: any) {
    console.error('[TopSectors API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

