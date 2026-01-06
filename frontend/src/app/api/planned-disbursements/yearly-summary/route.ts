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
    
    // Filters (same as planned-disbursements list API)
    const typesParam = searchParams.get('types');
    const organizationsParam = searchParams.get('organizations');
    const search = searchParams.get('search') || '';
    
    // Custom year params
    const startMonth = searchParams.get('startMonth') ? parseInt(searchParams.get('startMonth')!) : null;
    const startDay = searchParams.get('startDay') ? parseInt(searchParams.get('startDay')!) : null;
    const useCustomYear = startMonth !== null && startDay !== null;
    
    // Parse array parameters
    const types = typesParam ? typesParam.split(',').filter(Boolean) : [];
    const organizations = organizationsParam ? organizationsParam.split(',').filter(Boolean) : [];
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('planned_disbursements')
      .select('period_start, period_end, amount, usd_amount, currency, activity_id, provider_org_id, receiver_org_id');
    
    // Apply type filter (multiple types)
    if (types.length > 0) {
      query = query.in('type', types);
    }
    
    // Apply organization filter (check both provider and receiver for any of the selected organizations)
    if (organizations.length > 0) {
      const orConditions = organizations
        .map(org => `provider_org_id.eq.${org},receiver_org_id.eq.${org}`)
        .join(',');
      query = query.or(orConditions);
    }
    
    // Execute query
    const { data: disbursements, error } = await query;
    
    if (error) {
      console.error('[Planned Disbursements Yearly Summary] Error fetching disbursements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch planned disbursements', details: error.message },
        { status: 500 }
      );
    }
    
    let filteredDisbursements = disbursements || [];
    
    // Apply search filter if provided (search by activity title)
    if (search) {
      const activityIds = new Set(filteredDisbursements.map(d => d.activity_id).filter(Boolean));
      if (activityIds.size > 0) {
        const { data: activities } = await getSupabaseAdmin()
          .from('activities')
          .select('id, title_narrative')
          .in('id', Array.from(activityIds))
          .ilike('title_narrative', `%${search}%`);
        
        const matchingActivityIds = new Set(activities?.map(a => a.id) || []);
        filteredDisbursements = filteredDisbursements.filter(d => matchingActivityIds.has(d.activity_id));
      }
    }
    
    // Aggregate by year (using period_start)
    const yearlyData: Record<number, number> = {};
    
    filteredDisbursements.forEach((d: any) => {
      if (!d.period_start) return;
      
      const date = new Date(d.period_start);
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      // Use custom year calculation if params provided, otherwise use calendar year
      const year = useCustomYear 
        ? getCustomYearForDate(date, startMonth!, startDay!)
        : date.getFullYear();
      
      // Prefer usd_amount, fallback to amount if currency is USD
      let value = parseFloat(d.usd_amount) || 0;
      if (!value && d.currency === 'USD' && d.amount) {
        value = parseFloat(d.amount) || 0;
      }
      
      if (!yearlyData[year]) {
        yearlyData[year] = 0;
      }
      
      yearlyData[year] += value;
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
    console.error('[Planned Disbursements Yearly Summary] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}




