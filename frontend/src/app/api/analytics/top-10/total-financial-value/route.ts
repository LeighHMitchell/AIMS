import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { excludeInternalTransfers, getPooledFundIds } from '@/lib/analytics-transaction-filters';

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
    // Basis: which transaction types feed the totals.
    //   "total"        → commitments (2) + disbursements (3) (default, original)
    //   "commitment"   → only commitments (2)
    //   "disbursement" → only disbursements (3)
    const basis = (searchParams.get('basis') || 'total') as 'total' | 'commitment' | 'disbursement';
    const transactionTypes = basis === 'commitment' ? ['2']
      : basis === 'disbursement' ? ['3']
      : ['2', '3'];

    // First, get activity IDs that match country and sector filters
    let activitiesQuery = supabase
      .from('activities')
      .select('id')
      .eq('publication_status', 'published');

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
      .in('transaction_type', transactionTypes)
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);
    // Exclude internal transfers (pooled fund flows)
    const pooledFundIds = await getPooledFundIds(supabase);
    transactionsQuery = excludeInternalTransfers(transactionsQuery, pooledFundIds, transactionTypes);

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

    // Aggregate by donor organization — track per-transaction-type amounts so
    // the table can show Commitments (type 2) and Disbursements (type 3) in
    // separate columns, while `total` still drives ranking + the bar chart.
    const donorTotals = new Map<string, { total: number; commitments: number; disbursements: number; orgId: string }>();

    transactions?.forEach((t: any) => {
      if (!t.provider_org_id) return;

      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      const current = donorTotals.get(t.provider_org_id) || { total: 0, commitments: 0, disbursements: 0, orgId: t.provider_org_id };
      current.total += value;
      if (String(t.transaction_type) === '2') current.commitments += value;
      else if (String(t.transaction_type) === '3') current.disbursements += value;
      donorTotals.set(t.provider_org_id, current);
    });

    // Get organization names + country (used for recipient-country filtering).
    const orgIds = Array.from(donorTotals.keys());
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym, iati_org_id, country')
      .in('id', orgIds);

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym, iatiOrgId: o.iati_org_id, country: o.country }]) || []);

    // Recipient country to exclude. Myanmar-only deployment.
    // Mirrors the all-donors API: drop any provider org whose country resolves
    // to Myanmar so recipient-government ministries (MOALI, MoHS, MoE, …) don't
    // surface as "development partners" when they self-report internal flows.
    const RECIPIENT_COUNTRY_VALUES = new Set(['MM', 'mm', 'MMR', 'mmr', 'Myanmar', 'myanmar']);
    // eslint-disable-next-line security/detect-unsafe-regex -- TODO(audit-001): known-safe alternation filter for Myanmar gov org names
    const MYANMAR_GOV_NAME_RX = /\b(MOALI|MOPF|MoNREC|MoSWRR|MoEE|MoTC|MoBA|MoLES|MoLF|MoFA|MoIP|MoEnv|MoHS|MoE|Ministry of|Department of|Government of (the )?(Republic of (the )?)?Union of Myanmar|State Administration Council)\b/i;
    const isExcluded = (orgId: string): boolean => {
      const o = orgMap.get(orgId) as { country?: string | null; name?: string | null } | undefined;
      if (!o) return false;
      if (o.country && RECIPIENT_COUNTRY_VALUES.has(o.country)) return true;
      if (!o.country && o.name && MYANMAR_GOV_NAME_RX.test(o.name)) return true;
      return false;
    };

    // Drop excluded orgs from the totals map BEFORE ranking + computing Others.
    Array.from(donorTotals.keys()).forEach((id) => {
      if (isExcluded(id)) donorTotals.delete(id);
    });

    // Convert to array, sort, and limit
    const result = Array.from(donorTotals.entries())
      .map(([orgId, data]) => {
        const org = orgMap.get(orgId);
        return {
          orgId,
          organisationId: org?.iatiOrgId || null,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          totalValue: data.total,
          commitments: data.commitments,
          disbursements: data.disbursements
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);

    // Calculate "Others" total if there are more donors
    const allSorted = Array.from(donorTotals.entries()).sort((a, b) => b[1].total - a[1].total);
    const othersRows = allSorted.slice(limit);
    const othersTotal = othersRows.reduce((sum, [, data]) => sum + data.total, 0);
    const othersCommitments = othersRows.reduce((sum, [, data]) => sum + data.commitments, 0);
    const othersDisbursements = othersRows.reduce((sum, [, data]) => sum + data.disbursements, 0);

    if (othersTotal > 0) {
      result.push({
        orgId: 'others',
        organisationId: null,
        name: 'All Others',
        acronym: null,
        totalValue: othersTotal,
        commitments: othersCommitments,
        disbursements: othersDisbursements
      });
    }

    return NextResponse.json({ donors: result });
  } catch (error) {
    console.error('[Top10TotalFinancialValue] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

