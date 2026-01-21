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
    // First try with provider_org_id
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
      .eq('status', 'actual');

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
    let transactionsWithProvider = 0;

    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) {
        return;
      }
      transactionsWithProvider++;
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = donorTotals.get(t.provider_org_id) || 0;
      donorTotals.set(t.provider_org_id, current + value);
    });

    console.log('[Top10SectorFocused] Transactions with provider_org_id:', transactionsWithProvider);
    console.log('[Top10SectorFocused] Unique organizations from transactions:', donorTotals.size);

    // If no provider_org_id data, fall back to using activity_participating_organizations
    // with role code '1' (Funding) to aggregate by funding organization
    if (donorTotals.size === 0 && activityIds.length > 0) {
      console.log('[Top10SectorFocused] Falling back to activity_participating_organizations');

      // Get participating organizations with Funding role (1) for these activities
      const { data: participatingOrgs, error: partOrgError } = await supabase
        .from('activity_participating_organizations')
        .select('organization_id, activity_id')
        .in('activity_id', activityIds)
        .eq('iati_role_code', 1); // Funding role (integer)

      if (partOrgError) {
        console.error('[Top10SectorFocused] Error fetching participating orgs:', partOrgError);
      }

      // Get all transactions for these activities (regardless of provider_org_id)
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('activity_id, value_usd')
        .in('activity_id', activityIds)
        .in('transaction_type', ['2', '3'])
        .eq('status', 'actual');

      // Create a map of activity_id -> total value
      const activityValues = new Map<string, number>();
      allTransactions?.forEach((t: any) => {
        const value = parseFloat(t.value_usd?.toString() || '0') || 0;
        const current = activityValues.get(t.activity_id) || 0;
        activityValues.set(t.activity_id, current + value);
      });

      // Aggregate by funding organization
      participatingOrgs?.forEach((po: any) => {
        if (!po.organization_id) return;
        const activityValue = activityValues.get(po.activity_id) || 0;
        const current = donorTotals.get(po.organization_id) || 0;
        donorTotals.set(po.organization_id, current + activityValue);
      });

      console.log('[Top10SectorFocused] Organizations from participating orgs:', donorTotals.size);
    }

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

