import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all published activities where this organization is the reporting org
    const { data: reportingActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .eq('reporting_org_id', organizationId)
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('[AIMS] Error fetching reporting activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch reporting activities' }, { status: 500 });
    }

    const activityIds = reportingActivities?.map(a => a.id) || [];

    if (activityIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all planned disbursements for those activities
    const { data: disbursements, error: disbursementsError } = await supabase
      .from('planned_disbursements')
      .select(`
        id,
        activity_id,
        amount,
        currency,
        period_start,
        period_end,
        provider_org_id,
        provider_org_name,
        provider_org_ref,
        receiver_org_id,
        receiver_org_name,
        receiver_org_ref,
        status,
        value_date,
        notes,
        usd_amount,
        exchange_rate_used,
        usd_conversion_date,
        usd_convertible,
        created_at,
        updated_at
      `)
      .in('activity_id', activityIds)
      .order('period_start', { ascending: false });

    if (disbursementsError) {
      console.error('[AIMS] Error fetching planned disbursements:', disbursementsError);
      return NextResponse.json({ error: 'Failed to fetch planned disbursements' }, { status: 500 });
    }

    // Get activity titles for enrichment
    const uniqueActivityIds = [...new Set(disbursements?.map(d => d.activity_id) || [])];

    const { data: activities, error: activityTitlesError } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym')
      .in('id', uniqueActivityIds);

    if (activityTitlesError) {
      console.error('[AIMS] Error fetching activity titles:', activityTitlesError);
      // Continue without titles rather than failing
    }

    // Get organization logos for provider and receiver orgs
    const allOrgIds = new Set<string>();
    (disbursements || []).forEach(d => {
      if (d.provider_org_id) allOrgIds.add(d.provider_org_id);
      if (d.receiver_org_id) allOrgIds.add(d.receiver_org_id);
    });

    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, icon')
      .in('id', Array.from(allOrgIds));

    if (orgsError) {
      console.error('[AIMS] Error fetching organizations:', orgsError);
      // Continue without org details rather than failing
    }

    // Create lookup maps
    const activityMap = new Map(
      (activities || []).map(a => [a.id, { title: a.title_narrative, acronym: a.acronym }])
    );

    const orgMap = new Map(
      (organizations || []).map(o => [o.id, { name: o.name, acronym: o.acronym, logo: o.icon }])
    );

    // Enrich disbursements with activity and org info
    const enrichedDisbursements = (disbursements || []).map(disbursement => ({
      ...disbursement,
      activity_title: activityMap.get(disbursement.activity_id)?.title || 'Unknown Activity',
      activity_acronym: activityMap.get(disbursement.activity_id)?.acronym || null,
      provider_org_logo: disbursement.provider_org_id ? orgMap.get(disbursement.provider_org_id)?.logo : null,
      provider_org_acronym: disbursement.provider_org_id ? orgMap.get(disbursement.provider_org_id)?.acronym : null,
      receiver_org_logo: disbursement.receiver_org_id ? orgMap.get(disbursement.receiver_org_id)?.logo : null,
      receiver_org_acronym: disbursement.receiver_org_id ? orgMap.get(disbursement.receiver_org_id)?.acronym : null
    }));

    return NextResponse.json(enrichedDisbursements);
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching organization planned disbursements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
