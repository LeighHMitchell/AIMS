import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Filters (same as planned-disbursements list API)
    const type = searchParams.get('type');
    const organization = searchParams.get('organization');
    const search = searchParams.get('search') || '';
    
    // Build the query
    let query = getSupabaseAdmin()
      .from('planned_disbursements')
      .select('period_start, period_end, amount, usd_amount, currency, activity_id, provider_org_id, receiver_org_id');
    
    // Apply type filter
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    
    // Apply organization filter (check both provider and receiver)
    if (organization && organization !== 'all') {
      query = query.or(`provider_org_id.eq.${organization},receiver_org_id.eq.${organization}`);
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
      const year = date.getFullYear();
      
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




