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

    // First, get activity IDs that match country and sector filters
    let activitiesQuery = supabase
      .from('activities')
      .select('id');

    if (country && country !== 'all') {
      activitiesQuery = activitiesQuery.contains('locations', [{ country_code: country }]);
    }

    const { data: activities, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('[Top10DisbursementCommitmentRatio] Activities error:', activitiesError);
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

    // Build query for commitments (transaction_type = '2')
    let commitmentsQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        value,
        value_usd,
        activity_id
      `)
      .eq('transaction_type', '2') // Commitment
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);

    if (filteredActivityIds.length > 0) {
      commitmentsQuery = commitmentsQuery.in('activity_id', filteredActivityIds);
    } else {
      return NextResponse.json({ partners: [] });
    }

    if (dateFrom) {
      commitmentsQuery = commitmentsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      commitmentsQuery = commitmentsQuery.lte('transaction_date', dateTo);
    }

    const { data: commitments, error: commitmentsError } = await commitmentsQuery;

    if (commitmentsError) {
      console.error('[Top10DisbursementCommitmentRatio] Commitments error:', commitmentsError);
      return NextResponse.json({ error: 'Failed to fetch commitments' }, { status: 500 });
    }

    // Build query for disbursements (transaction_type = '3')
    let disbursementsQuery = supabase
      .from('transactions')
      .select(`
        provider_org_id,
        value,
        value_usd,
        activity_id
      `)
      .eq('transaction_type', '3') // Disbursement
      .eq('status', 'actual')
      .not('provider_org_id', 'is', null);

    if (filteredActivityIds.length > 0) {
      disbursementsQuery = disbursementsQuery.in('activity_id', filteredActivityIds);
    }

    if (dateFrom) {
      disbursementsQuery = disbursementsQuery.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      disbursementsQuery = disbursementsQuery.lte('transaction_date', dateTo);
    }

    const { data: disbursements, error: disbursementsError } = await disbursementsQuery;

    if (disbursementsError) {
      console.error('[Top10DisbursementCommitmentRatio] Disbursements error:', disbursementsError);
      return NextResponse.json({ error: 'Failed to fetch disbursements' }, { status: 500 });
    }

    // Aggregate commitments by donor (USD only)
    const commitmentsByDonor = new Map<string, number>();
    commitments?.forEach((t: any) => {
      if (!t.provider_org_id) return;
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      if (value === 0) return; // Skip non-USD transactions
      const current = commitmentsByDonor.get(t.provider_org_id) || 0;
      commitmentsByDonor.set(t.provider_org_id, current + value);
    });

    // Aggregate disbursements by donor (USD only)
    const disbursementsByDonor = new Map<string, number>();
    disbursements?.forEach((t: any) => {
      if (!t.provider_org_id) return;
      const value = parseFloat(t.value_usd?.toString() || '0') || 0;
      if (value === 0) return; // Skip non-USD transactions
      const current = disbursementsByDonor.get(t.provider_org_id) || 0;
      disbursementsByDonor.set(t.provider_org_id, current + value);
    });

    // Get organization names
    const allOrgIds = new Set([
      ...Array.from(commitmentsByDonor.keys()),
      ...Array.from(disbursementsByDonor.keys())
    ]);
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', Array.from(allOrgIds));

    const orgMap = new Map(orgs?.map((o: any) => [o.id, { name: o.name, acronym: o.acronym }]) || []);

    // Calculate ratios for all donors with disbursements
    const ratios = Array.from(allOrgIds)
      .map((orgId) => {
        const commitmentsTotal = commitmentsByDonor.get(orgId) || 0;
        const disbursementsTotal = disbursementsByDonor.get(orgId) || 0;

        // Only include donors with disbursements (not just commitments)
        if (disbursementsTotal === 0) return null;

        const ratio = commitmentsTotal > 0 ? (disbursementsTotal / commitmentsTotal) * 100 : 0;
        const org = orgMap.get(orgId);

        return {
          orgId,
          name: org?.name || 'Unknown Organization',
          acronym: org?.acronym || null,
          commitments: commitmentsTotal,
          disbursements: disbursementsTotal,
          ratio: isNaN(ratio) || !isFinite(ratio) ? 0 : ratio
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.disbursements - a.disbursements) // Sort by disbursement amount, not ratio
      .slice(0, limit);

    // Calculate "Others" if there are more donors
    const othersRatios = Array.from(allOrgIds)
      .slice(limit)
      .map((orgId) => {
        const commitmentsTotal = commitmentsByDonor.get(orgId) || 0;
        const disbursementsTotal = disbursementsByDonor.get(orgId) || 0;
        if (commitmentsTotal === 0) return null;
        return (disbursementsTotal / commitmentsTotal) * 100;
      })
      .filter((r): r is number => r !== null);

    const othersCommitments = Array.from(allOrgIds)
      .slice(limit)
      .reduce((sum, orgId) => sum + (commitmentsByDonor.get(orgId) || 0), 0);
    const othersDisbursements = Array.from(allOrgIds)
      .slice(limit)
      .reduce((sum, orgId) => sum + (disbursementsByDonor.get(orgId) || 0), 0);

    if (othersCommitments > 0 && othersRatios.length > 0) {
      const othersRatio = (othersDisbursements / othersCommitments) * 100;
      if (!isNaN(othersRatio) && isFinite(othersRatio)) {
        ratios.push({
          orgId: 'others',
          name: 'All Others',
          acronym: null,
          commitments: othersCommitments,
          disbursements: othersDisbursements,
          ratio: othersRatio
        });
      }
    }

    return NextResponse.json({ partners: ratios });
  } catch (error) {
    console.error('[Top10DisbursementCommitmentRatio] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

