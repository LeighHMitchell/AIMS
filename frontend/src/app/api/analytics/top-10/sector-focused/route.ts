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
    const sector = searchParams.get('sector');
    const limit = parseInt(searchParams.get('limit') || '10');

    let activityIds: string[] = [];

    // If sector is 'all' or not provided, get all published activities
    if (!sector || sector === 'all') {
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id')
        .eq('publication_status', 'published');

      if (activitiesError) {
        console.error('[Top10SectorFocused] Activities error:', activitiesError);
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
      }

      activityIds = activities?.map(a => a.id) || [];
    } else {
      // Get activity IDs in the specified sector
      const { data: sectorActivities, error: sectorActivitiesError } = await supabase
        .from('activity_sectors')
        .select('activity_id')
        .eq('sector_code', sector);

      if (sectorActivitiesError) {
        console.error('[Top10SectorFocused] Sector activities error:', sectorActivitiesError);
        return NextResponse.json({ error: 'Failed to fetch sector activities' }, { status: 500 });
      }

      activityIds = sectorActivities?.map(s => s.activity_id) || [];
    }

    // Apply country filter if specified
    if (country && country !== 'all' && activityIds.length > 0) {
      const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .contains('locations', [{ country_code: country }])
        .in('id', activityIds);

      activityIds = activities?.map(a => a.id) || [];
    }

    if (activityIds.length === 0) {
      return NextResponse.json({ partners: [] });
    }

    // Build query for transactions in these activities
    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        value,
        value_usd,
        transaction_type,
        activity_id
      `)
      .in('activity_id', activityIds)
      .in('transaction_type', ['2', '3']) // Commitments or Disbursements
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }

    const { data: transactions, error } = await transactionsQuery;

    if (error) {
      console.error('[Top10SectorFocused] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    console.log('[Top10SectorFocused] Activity IDs:', activityIds.length);
    console.log('[Top10SectorFocused] Transactions found:', transactions?.length || 0);
    console.log('[Top10SectorFocused] Date range:', { dateFrom, dateTo });

    // Get sector name
    let sectorName = 'All Sectors';
    if (sector && sector !== 'all') {
      const { data: sectorData } = await supabase
        .from('activity_sectors')
        .select('sector_name')
        .eq('sector_code', sector)
        .limit(1)
        .single();

      sectorName = sectorData?.sector_name || `Sector ${sector}`;
    }

    // Aggregate by donor organization
    const donorTotals = new Map<string, number>();
    let transactionsWithoutProvider = 0;

    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) {
        transactionsWithoutProvider++;
        return;
      }
      
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = donorTotals.get(t.provider_org_id) || 0;
      donorTotals.set(t.provider_org_id, current + value);
    });

    console.log('[Top10SectorFocused] Transactions without provider_org_id:', transactionsWithoutProvider);
    console.log('[Top10SectorFocused] Unique organizations:', donorTotals.size);

    // Get organization names
    const orgIds = Array.from(donorTotals.keys());
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Convert to array, sort, and limit
    const result = Array.from(donorTotals.entries())
      .map(([orgId, totalValue]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          totalValue
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    // Calculate "Others" total if there are more donors
    const othersTotal = Array.from(donorTotals.entries())
      .slice(limit)
      .reduce((sum, [, value]) => sum + value, 0);

    if (othersTotal > 0) {
      result.push({
        orgId: 'others',
        name: 'All Others',
        acronym: null,
        totalValue: othersTotal
      });
    }

    return NextResponse.json({ 
      partners: result,
      sectorCode: sector,
      sectorName 
    });
  } catch (error) {
    console.error('[Top10SectorFocused] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

