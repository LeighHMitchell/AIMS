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

    // Build query for validated activities
    // Query activities that are published
    let activitiesQuery = supabase
      .from('activities')
      .select(`
        id,
        locations,
        activity_sectors (sector_code),
        activity_participating_organizations (
          organization_id,
          iati_role_code
        )
      `)
      .eq('publication_status', 'published');

    if (country && country !== 'all') {
      activitiesQuery = activitiesQuery.contains('locations', [{ country_code: country }]);
    }
    if (sector && sector !== 'all') {
      activitiesQuery = activitiesQuery.eq('activity_sectors.sector_code', sector);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[Top10GovernmentValidated] Activities error:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Query government endorsements separately
    const { data: endorsements, error: endorsementsError } = await supabase
      .from('government_endorsements')
      .select('activity_id')
      .eq('validation_status', 'validated');

    if (endorsementsError) {
      console.error('[Top10GovernmentValidated] Endorsements error:', endorsementsError);
      return NextResponse.json({ error: 'Failed to fetch endorsements' }, { status: 500 });
    }

    const validatedActivityIds = endorsements?.map(e => e.activity_id) || [];

    // Get transaction values for validated activities
    if (validatedActivityIds.length === 0) {
      return NextResponse.json({ partners: [] });
    }

    let transactionsQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        value,
        value_usd,
        activity_id
      `)
      .in('activity_id', validatedActivityIds)
      .in('transaction_type', ['2', '3']) // Commitments or Disbursements
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);

    if (dateFrom) {
      transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      transactionsQuery = transactionsQuery.lte('transaction_date', dateTo);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      console.error('[Top10GovernmentValidated] Transactions error:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Aggregate by organization
    const orgTotals = new Map<string, { value: number; projectCount: Set<string> }>();

    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) return;
      
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = orgTotals.get(t.provider_org_id) || { value: 0, projectCount: new Set() };
      current.value += value;
      current.projectCount.add(t.activity_id);
      orgTotals.set(t.provider_org_id, current);
    });

    // Get organization names
    const orgIds = Array.from(orgTotals.keys());
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Convert to array, sort, and limit
    const result = Array.from(orgTotals.entries())
      .map(([orgId, data]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          totalValue: data.value,
          projectCount: data.projectCount.size
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    // Calculate "Others" if there are more organizations
    const othersData = Array.from(orgTotals.entries())
      .slice(limit)
      .reduce((acc, [, data]) => {
        acc.value += data.value;
        data.projectCount.forEach(id => acc.projectCount.add(id));
        return acc;
      }, { value: 0, projectCount: new Set<string>() });

    if (othersData.value > 0) {
      result.push({
        orgId: 'others',
        name: 'All Others',
        acronym: null,
        totalValue: othersData.value,
        projectCount: othersData.projectCount.size
      });
    }

    return NextResponse.json({ partners: result });
  } catch (error) {
    console.error('[Top10GovernmentValidated] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

