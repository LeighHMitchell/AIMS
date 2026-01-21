import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

type MetricType = 'budgets' | 'disbursements' | 'commitments';

interface LocationData {
  id: string;
  name: string;
  value: number;
  activityCount: number;
}

// Valid Myanmar states/regions for subnational allocations
const VALID_REGIONS = new Set([
  'chin state', 'kachin state', 'kayah state', 'kayin state', 
  'mon state', 'rakhine state', 'shan state',
  'ayeyarwady region', 'bago region', 'magway region', 'mandalay region',
  'sagaing region', 'tanintharyi region', 'yangon region',
  'naypyidaw union territory', 'nationwide'
]);

// Normalize and validate region name - returns properly capitalized name or null if invalid
function normalizeRegion(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (VALID_REGIONS.has(lower)) {
    // Return properly capitalized version
    return lower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return null; // Invalid - skip this entry
}

/**
 * GET /api/analytics/top-locations
 * Returns top Myanmar states/regions from subnational_breakdowns with financial values split by percentage.
 * Only includes valid Myanmar administrative divisions (states, regions, union territory, or Nationwide).
 * Filters out Activity Site data that may have been incorrectly entered (e.g., "Test Location").
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = (searchParams.get('metric') || 'disbursements') as MetricType;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const topN = parseInt(searchParams.get('topN') || '10');

    // Map to aggregate by region
    const locationMap = new Map<string, { 
      value: number; 
      activityIds: Set<string>;
    }>();

    // Get all subnational breakdowns with their percentages
    const { data: breakdowns, error: breakdownsError } = await supabase
      .from('subnational_breakdowns')
      .select('activity_id, region_name, is_nationwide, percentage');

    if (breakdownsError) {
      console.error('[TopLocations] Error fetching subnational breakdowns:', breakdownsError);
      throw new Error('Failed to fetch subnational breakdowns');
    }

    // Build activity to region mapping with percentages (only valid Myanmar regions)
    const activityRegionMap = new Map<string, Array<{ regionName: string; percentage: number }>>();
    breakdowns?.forEach((b: any) => {
      if (!b.activity_id) return;
      
      // For nationwide, use "Nationwide", otherwise validate the region name
      let regionName: string | null;
      if (b.is_nationwide) {
        regionName = 'Nationwide';
      } else {
        regionName = normalizeRegion(b.region_name || '');
        if (!regionName) return; // Skip invalid entries like "Test Location", "Manil"
      }
      
      const percentage = (b.percentage || 100) / 100;
      
      const existing = activityRegionMap.get(b.activity_id) || [];
      existing.push({ regionName, percentage });
      activityRegionMap.set(b.activity_id, existing);
    });

    // Get activity IDs that have subnational breakdowns
    const activityIds = Array.from(activityRegionMap.keys());
    
    if (activityIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        grandTotal: 0,
        metric,
      });
    }

    let grandTotal = 0;

    if (metric === 'budgets') {
      // Get budgets from activity_budgets table
      const { data: budgetData, error: budgetError } = await supabase
        .from('activity_budgets')
        .select('activity_id, value_usd, value, period_start, period_end')
        .in('activity_id', activityIds);

      if (budgetError) {
        console.error('[TopLocations] Error fetching budgets:', budgetError);
        throw new Error('Failed to fetch budget data');
      }

      budgetData?.forEach((budget: any) => {
        if (!budget.activity_id) return;
        
        // Apply date filter if provided
        if (dateFrom && budget.period_start && new Date(budget.period_start) < new Date(dateFrom)) return;
        if (dateTo && budget.period_end && new Date(budget.period_end) > new Date(dateTo)) return;
        
        const budgetValue = parseFloat(budget.value_usd) || parseFloat(budget.value) || 0;
        const regions = activityRegionMap.get(budget.activity_id) || [];
        
        regions.forEach(({ regionName, percentage }) => {
          const allocatedValue = budgetValue * percentage;
          const existing = locationMap.get(regionName) || { value: 0, activityIds: new Set<string>() };
          existing.value += allocatedValue;
          existing.activityIds.add(budget.activity_id);
          locationMap.set(regionName, existing);
          grandTotal += allocatedValue;
        });
      });
    } else {
      // Get transactions (disbursements or commitments)
      const transactionType = metric === 'commitments' ? '2' : '3';
      
      const { data: transactionData, error: transError } = await supabase
        .from('transactions')
        .select('activity_id, value_usd, value, transaction_type, transaction_date, status')
        .in('activity_id', activityIds)
        .eq('transaction_type', transactionType)
        .eq('status', 'actual');

      if (transError) {
        console.error('[TopLocations] Error fetching transactions:', transError);
        throw new Error('Failed to fetch transaction data');
      }

      transactionData?.forEach((trans: any) => {
        if (!trans.activity_id) return;
        
        // Apply date filter if provided
        if (dateFrom && trans.transaction_date && new Date(trans.transaction_date) < new Date(dateFrom)) return;
        if (dateTo && trans.transaction_date && new Date(trans.transaction_date) > new Date(dateTo)) return;
        
        const transValue = parseFloat(trans.value_usd) || parseFloat(trans.value) || 0;
        const regions = activityRegionMap.get(trans.activity_id) || [];
        
        regions.forEach(({ regionName, percentage }) => {
          const allocatedValue = transValue * percentage;
          const existing = locationMap.get(regionName) || { value: 0, activityIds: new Set<string>() };
          existing.value += allocatedValue;
          existing.activityIds.add(trans.activity_id);
          locationMap.set(regionName, existing);
          grandTotal += allocatedValue;
        });
      });
    }

    // Sort and get top N
    const sortedLocations = Array.from(locationMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const topLocations: LocationData[] = sortedLocations.slice(0, topN).map(([name, data]) => ({
      id: name,
      name,
      value: data.value,
      activityCount: data.activityIds.size,
    }));

    // Add "OTHERS" if there are more locations
    const othersValue = sortedLocations.slice(topN).reduce((sum, [, data]) => sum + data.value, 0);
    if (othersValue > 0) {
      topLocations.push({
        id: 'others',
        name: 'OTHERS',
        value: othersValue,
        activityCount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: topLocations,
      grandTotal,
      metric,
      dateRange: {
        from: dateFrom || 'all',
        to: dateTo || 'all',
      },
    });

  } catch (error: any) {
    console.error('[TopLocations API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
