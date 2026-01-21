import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Get filter parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    const limit = parseInt(searchParams.get('limit') || '10');

    // First, get activity IDs that match country and sector filters
    let activitiesQuery = supabase
      .from('activities')
      .select('id');

    if (country && country !== 'all') {
      activitiesQuery = activitiesQuery.contains('locations', [{ country_code: country }]);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[Top10TotalFinancialValue] Activities error:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activityIds = activities?.map(a => a.id) || [];

    // If sector filter is applied, filter by sector
    let filteredActivityIds = activityIds;
    if (sector && sector !== 'all' && activityIds.length > 0) {
      const { data: sectorData } = await supabase
        .from('activity_sectors')
        .select('activity_id')
        .eq('sector_code', sector)
        .in('activity_id', activityIds);

      filteredActivityIds = sectorData?.map(s => s.activity_id) || [];
    }

    // Now query transactions for these activities
    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        value,
        value_usd,
        transaction_type,
        activity_id
      `)
      .in('transaction_type', ['2', '3']) // Commitment (2) or Disbursement (3)
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);

    if (filteredActivityIds.length > 0) {
      transactionsQuery = transactionsQuery.in('activity_id', filteredActivityIds);
    } else {
      // If no activities match filters, return empty result
      return NextResponse.json({ donors: [] });
    }

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }

    const { data: transactions, error } = await transactionsQuery;

    if (error) {
      console.error('[Top10TotalFinancialValue] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Aggregate by donor organization
    const donorTotals = new Map<string, { total: number; orgId: string }>();

    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) return;
      
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = donorTotals.get(t.provider_org_id) || { total: 0, orgId: t.provider_org_id };
      current.total += value;
      donorTotals.set(t.provider_org_id, current);
    });

    // Get organization names
    const orgIds = Array.from(donorTotals.keys());
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Convert to array, sort, and limit
    const result = Array.from(donorTotals.entries())
      .map(([orgId, data]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          totalValue: data.total
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    // Calculate "Others" total if there are more donors
    const othersTotal = Array.from(donorTotals.entries())
      .slice(limit)
      .reduce((sum, [, data]) => sum + data.total, 0);

    if (othersTotal > 0) {
      result.push({
        orgId: 'others',
        name: 'All Others',
        acronym: null,
        totalValue: othersTotal
      });
    }

    return NextResponse.json({ donors: result });
  } catch (error) {
    console.error('[Top10TotalFinancialValue] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

