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

    console.log('[Top10GovernmentValidated] Found activities:', activities?.length || 0);

    // Query government endorsements separately
    // Handle case where table might not exist or be empty gracefully
    let validatedActivityIds: string[] = [];

    try {
      const { data: endorsements, error: endorsementsError } = await supabase
        .from('government_endorsements')
        .select('activity_id')
        .eq('validation_status', 'validated');

      if (endorsementsError) {
        // If table doesn't exist or has RLS issues, log but continue with fallback
        console.warn('[Top10GovernmentValidated] Endorsements query issue (will use fallback):', endorsementsError.message);
        // Don't return - continue to fallback logic below
      } else {
        validatedActivityIds = endorsements?.map(e => e.activity_id).filter(Boolean) || [];
      }
    } catch (error) {
      // Table might not exist - continue to fallback
      console.warn('[Top10GovernmentValidated] Could not query endorsements table (will use fallback):', error);
    }

    // Get activity IDs to query - either validated ones or all published activities as fallback
    let targetActivityIds = validatedActivityIds;
    let isUsingFallback = false;

    // If no validated activities, fall back to all published activities
    if (targetActivityIds.length === 0) {
      console.log('[Top10GovernmentValidated] No validated activities found, using all published activities as fallback');
      isUsingFallback = true;
      const activityIds = activities?.map((a: any) => a.id) || [];
      targetActivityIds = activityIds;
    }

    if (targetActivityIds.length === 0) {
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
      .in('activity_id', targetActivityIds)
      .in('transaction_type', ['2', '3']) // Commitments or Disbursements
      .eq('status', 'actual');

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

    console.log('[Top10GovernmentValidated] Transactions found:', transactions?.length || 0);

    // Aggregate by organization
    const orgTotals = new Map<string, { value: number; projectCount: Set<string> }>();

    // First try using provider_org_id from transactions
    let transactionsWithProvider = 0;
    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) return;
      transactionsWithProvider++;

      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = orgTotals.get(t.provider_org_id) || { value: 0, projectCount: new Set() };
      current.value += value;
      current.projectCount.add(t.activity_id);
      orgTotals.set(t.provider_org_id, current);
    });

    console.log('[Top10GovernmentValidated] Transactions with provider_org_id:', transactionsWithProvider);
    console.log('[Top10GovernmentValidated] Unique orgs from transactions:', orgTotals.size);

    // If no provider_org_id data, fall back to using activity_participating_organizations
    if (orgTotals.size === 0 && targetActivityIds.length > 0) {
      console.log('[Top10GovernmentValidated] Falling back to activity_participating_organizations');

      // Get participating organizations with Funding role (1) for these activities
      const { data: participatingOrgs } = await supabase
        .from('activity_participating_organizations')
        .select('organization_id, activity_id')
        .in('activity_id', targetActivityIds)
        .eq('iati_role_code', 1); // Funding role (integer)

      // Create a map of activity_id -> total value
      const activityValues = new Map<string, number>();
      transactions?.forEach((t: any) => {
        const value = parseFloat(t.value_usd?.toString() || '0') || 0;
        const current = activityValues.get(t.activity_id) || 0;
        activityValues.set(t.activity_id, current + value);
      });

      // Aggregate by funding organization
      participatingOrgs?.forEach((po: any) => {
        if (!po.organization_id) return;
        const activityValue = activityValues.get(po.activity_id) || 0;
        const current = orgTotals.get(po.organization_id) || { value: 0, projectCount: new Set() };
        current.value += activityValue;
        current.projectCount.add(po.activity_id);
        orgTotals.set(po.organization_id, current);
      });

      console.log('[Top10GovernmentValidated] Organizations from participating orgs:', orgTotals.size);
    }

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

    console.log('[Top10GovernmentValidated] Final result count:', result.length);
    if (result.length > 0) {
      console.log('[Top10GovernmentValidated] Top result:', result[0]?.name, 'value:', result[0]?.totalValue);
    }

    return NextResponse.json({ partners: result });
  } catch (error) {
    console.error('[Top10GovernmentValidated] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

