import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper function to determine which fiscal year a date belongs to
function getCustomYearForDate(
  date: Date,
  startMonth: number,
  startDay: number
): number {
  const month = date.getMonth() + 1; // JS months are 0-indexed
  const day = date.getDate();
  const year = date.getFullYear();
  
  // If date is before the fiscal year start, it belongs to the previous fiscal year
  if (month < startMonth || (month === startMonth && day < startDay)) {
    return year - 1;
  }
  return year;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Filters (same as budgets list API)
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const organization = searchParams.get('organization');
    const search = searchParams.get('search') || '';
    
    // Custom year params
    const startMonth = searchParams.get('startMonth') ? parseInt(searchParams.get('startMonth')!) : null;
    const startDay = searchParams.get('startDay') ? parseInt(searchParams.get('startDay')!) : null;
    const useCustomYear = startMonth !== null && startDay !== null;
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('activity_budgets')
      .select('period_start, period_end, value, usd_value, currency, activity_id');
    
    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Execute query
    const { data: budgets, error } = await query;
    
    if (error) {
      console.error('[Budgets Yearly Summary] Error fetching budgets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch budgets', details: error.message },
        { status: 500 }
      );
    }
    
    // If organization filter is applied, we need to filter by activity's organization
    let filteredBudgets = budgets || [];
    if (organization && organization !== 'all') {
      // Get activity IDs for this organization
      const { data: activities } = await getSupabaseAdmin()
        .from('activities')
        .select('id')
        .eq('partner_id', organization);
      
      const activityIds = new Set(activities?.map(a => a.id) || []);
      filteredBudgets = filteredBudgets.filter(b => activityIds.has(b.activity_id));
    }
    
    // Apply search filter if provided (search by activity title)
    if (search) {
      const activityIds = new Set(filteredBudgets.map(b => b.activity_id).filter(Boolean));
      if (activityIds.size > 0) {
        const { data: activities } = await getSupabaseAdmin()
          .from('activities')
          .select('id, title_narrative')
          .in('id', Array.from(activityIds))
          .ilike('title_narrative', `%${search}%`);
        
        const matchingActivityIds = new Set(activities?.map(a => a.id) || []);
        filteredBudgets = filteredBudgets.filter(b => matchingActivityIds.has(b.activity_id));
      }
    }
    
    // Aggregate by year (using period_start)
    const yearlyData: Record<number, number> = {};
    
    filteredBudgets.forEach((b: any) => {
      if (!b.period_start) return;
      
      const date = new Date(b.period_start);
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      // Use custom year calculation if params provided, otherwise use calendar year
      const year = useCustomYear 
        ? getCustomYearForDate(date, startMonth!, startDay!)
        : date.getFullYear();
      
      // Prefer usd_value, fallback to value if currency is USD
      let amount = parseFloat(b.usd_value) || 0;
      if (!amount && b.currency === 'USD' && b.value) {
        amount = parseFloat(b.value) || 0;
      }
      
      if (!yearlyData[year]) {
        yearlyData[year] = 0;
      }
      
      yearlyData[year] += amount;
    });
    
    // Convert to array format sorted by year
    const years = Object.keys(yearlyData)
      .map(Number)
      .sort((a, b) => a - b)
      .map(year => ({
        year,
        total: yearlyData[year],
      }));
    
    return NextResponse.json({ years });
    
  } catch (error) {
    console.error('[Budgets Yearly Summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




