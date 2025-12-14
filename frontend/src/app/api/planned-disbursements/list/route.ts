import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Search and filters
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    const organization = searchParams.get('organization') || 'all';
    const sortField = searchParams.get('sortField') || 'period_start';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('[Planned Disbursements List API] Query params:', { page, limit, search, type, sortField, sortOrder });

    // Build query - fetch disbursements first
    let query = supabase
      .from('planned_disbursements')
      .select('*', { count: 'exact' });

    // Apply type filter
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply organization filter
    if (organization !== 'all') {
      query = query.or(`provider_org_id.eq.${organization},receiver_org_id.eq.${organization}`);
    }

    // Apply sorting
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: disbursementsData, error: disbursementsError, count } = await query;

    if (disbursementsError) {
      console.error('[Planned Disbursements List API] Error fetching disbursements:', disbursementsError);
      return NextResponse.json(
        { error: 'Failed to fetch planned disbursements', details: disbursementsError.message },
        { status: 500 }
      );
    }

    // Now fetch all related activities and organizations in parallel
    const disbursements = disbursementsData || [];
    const allActivityIds = new Set<string>();
    const allOrgIds = new Set<string>();

    disbursements.forEach((d: any) => {
      if (d?.activity_id) allActivityIds.add(d.activity_id);
      if (d?.provider_activity_uuid) allActivityIds.add(d.provider_activity_uuid);
      if (d?.receiver_activity_uuid) allActivityIds.add(d.receiver_activity_uuid);
      if (d?.provider_org_id) allOrgIds.add(d.provider_org_id);
      if (d?.receiver_org_id) allOrgIds.add(d.receiver_org_id);
    });

    console.log('[Planned Disbursements List API] Looking up activity IDs:', Array.from(allActivityIds).slice(0, 3));
    console.log('[Planned Disbursements List API] Looking up org IDs:', Array.from(allOrgIds).slice(0, 3));

    let activitiesMap: Record<string, any> = {};
    let organizationsMap: Record<string, any> = {};

    // Fetch activities and organizations in parallel
    const [activitiesResult, organizationsResult] = await Promise.all([
      allActivityIds.size > 0
        ? supabase
            .from('activities')
            .select('id, title_narrative, iati_identifier')
            .in('id', Array.from(allActivityIds))
        : Promise.resolve({ data: null, error: null }),
      allOrgIds.size > 0
        ? supabase
            .from('organizations')
            .select('id, name, acronym, logo')
            .in('id', Array.from(allOrgIds))
        : Promise.resolve({ data: null, error: null })
    ]);

    if (activitiesResult.error) {
      console.error('[Planned Disbursements List API] Error fetching activities:', activitiesResult.error);
    }

    if (activitiesResult.data) {
      console.log('[Planned Disbursements List API] Found', activitiesResult.data.length, 'activities out of', allActivityIds.size, 'requested');
      console.log('[Planned Disbursements List API] Sample activity data:', activitiesResult.data[0]);
      activitiesMap = Object.fromEntries(
        activitiesResult.data.map(a => [a.id, a])
      );
    } else {
      console.log('[Planned Disbursements List API] No activities found!');
    }

    if (organizationsResult.error) {
      console.error('[Planned Disbursements List API] Error fetching organizations:', organizationsResult.error);
    }

    if (organizationsResult.data) {
      console.log('[Planned Disbursements List API] Found', organizationsResult.data.length, 'organizations out of', allOrgIds.size, 'requested');
      console.log('[Planned Disbursements List API] Sample organization data:', organizationsResult.data[0]);
      organizationsMap = Object.fromEntries(
        organizationsResult.data.map(o => [o.id, o])
      );
    } else {
      console.log('[Planned Disbursements List API] No organizations found!');
    }

    // Combine disbursements with their activities and organizations
    const data = disbursements.map((disbursement: any) => {
      const providerOrg = disbursement?.provider_org_id ? organizationsMap[disbursement.provider_org_id] : null;
      const receiverOrg = disbursement?.receiver_org_id ? organizationsMap[disbursement.receiver_org_id] : null;

      return {
        ...disbursement,
        activity: disbursement?.activity_id ? activitiesMap[disbursement.activity_id] || null : null,
        provider_activity: disbursement?.provider_activity_uuid ? activitiesMap[disbursement.provider_activity_uuid] || null : null,
        receiver_activity: disbursement?.receiver_activity_uuid ? activitiesMap[disbursement.receiver_activity_uuid] || null : null,
        provider_org_acronym: providerOrg?.acronym || disbursement.provider_org_acronym || null,
        provider_org_name: providerOrg?.name || disbursement.provider_org_name || null,
        provider_org_logo: providerOrg?.logo || null,
        receiver_org_acronym: receiverOrg?.acronym || disbursement.receiver_org_acronym || null,
        receiver_org_name: receiverOrg?.name || disbursement.receiver_org_name || null,
        receiver_org_logo: receiverOrg?.logo || null,
      };
    });

    console.log(`[Planned Disbursements List API] Successfully fetched ${data?.length || 0} disbursements, total: ${count}`);
    console.log('[Planned Disbursements List API] Sample disbursement with activity:', data[0]);

    return NextResponse.json({
      disbursements: data || [],
      total: count || 0,
      page,
      limit,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Unexpected error fetching planned disbursements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
