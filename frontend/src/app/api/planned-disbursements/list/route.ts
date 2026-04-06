import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrVisitor } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Search and filters - support both single values and arrays
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const organization = searchParams.get('organization') || 'all';
    const organizations = searchParams.get('organizations')?.split(',').filter(Boolean) || [];
    const sortField = searchParams.get('sortField') || 'period_start';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const reportedByOrg = searchParams.get('reportedByOrg'); // 'self' | 'other'
    const reportedByUser = searchParams.get('reportedByUser'); // userId

    console.log('[Planned Disbursements List API] Query params:', { page, limit, search, types, organizations, sortField, sortOrder, reportedByOrg, reportedByUser });

    // Build query - fetch disbursements first
    let query = supabase
      .from('planned_disbursements')
      .select('*', { count: 'exact' });

    // Apply type filter - support both array and single value
    if (types.length > 0) {
      query = query.in('type', types);
    } else if (type !== 'all') {
      query = query.eq('type', type);
    }

    // Pre-fetch reporting org activity IDs for org-based filters
    let reportingActivityIds: string[] = [];
    const orgList = organizations.length > 0 ? organizations : (organization !== 'all' ? [organization] : []);
    if (orgList.length > 0) {
      const { data: reportingOrgActivities } = await supabase
        .from('activities')
        .select('id')
        .in('reporting_org_id', orgList);
      reportingActivityIds = (reportingOrgActivities || []).map((a: { id: string }) => a.id);
    }

    // Apply organization + reportedByOrg filter
    if (orgList.length > 0) {
      if (reportedByOrg === 'self') {
        // Only PDs on the org's own activities
        if (reportingActivityIds.length > 0) {
          query = query.in('activity_id', reportingActivityIds);
        } else {
          query = query.in('activity_id', ['__none__']);
        }
      } else if (reportedByOrg === 'other') {
        // Only PDs where org is provider/receiver but NOT on their own activities
        const orgConditions = orgList.map(org => `provider_org_id.eq.${org},receiver_org_id.eq.${org}`).join(',');
        query = query.or(orgConditions);
        if (reportingActivityIds.length > 0) {
          query = query.not('activity_id', 'in', `(${reportingActivityIds.join(',')})`);
        }
      } else {
        // 'all' — include PDs on own activities + where org is provider/receiver
        if (reportingActivityIds.length > 0) {
          const orgConditions = orgList.map(org => `provider_org_id.eq.${org},receiver_org_id.eq.${org}`).join(',');
          query = query.or(`${orgConditions},activity_id.in.(${reportingActivityIds.join(',')})`);
        } else {
          const orgConditions = orgList.map(org => `provider_org_id.eq.${org},receiver_org_id.eq.${org}`).join(',');
          query = query.or(orgConditions);
        }
      }
    }

    // Filter by specific user
    if (reportedByUser) {
      query = query.eq('created_by', reportedByUser);
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

    // Fetch related data sequentially: disbursements -> activities -> organizations
    // (sequential so reporting_org_ids from activities can be included in the org lookup)
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

    let activitiesMap: Record<string, any> = {};
    let organizationsMap: Record<string, any> = {};

    // Step 1: Fetch activities first (use admin client to bypass RLS)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const activitiesResult = allActivityIds.size > 0
      ? await adminSupabase
          .from('activities')
          .select('id, title_narrative, iati_identifier, reporting_org_id')
          .in('id', Array.from(allActivityIds))
      : { data: null, error: null };

    if (activitiesResult.error) {
      console.error('[Planned Disbursements List API] Error fetching activities:', activitiesResult.error);
    }

    if (activitiesResult.data) {
      console.log('[Planned Disbursements List API] Found', activitiesResult.data.length, 'activities out of', allActivityIds.size, 'requested');
      console.log('[Planned Disbursements List API] Sample activity data:', activitiesResult.data[0]);
      activitiesMap = Object.fromEntries(
        activitiesResult.data.map(a => [a.id, a])
      );

      // Add reporting_org_ids from activities to the org lookup set
      activitiesResult.data.forEach((a: any) => {
        if (a?.reporting_org_id) allOrgIds.add(a.reporting_org_id);
      });
    } else {
      console.log('[Planned Disbursements List API] No activities found!');
    }

    console.log('[Planned Disbursements List API] Looking up org IDs:', Array.from(allOrgIds).slice(0, 3));

    // Step 2: Fetch organizations (now includes reporting_org_ids) — use admin client
    const organizationsResult = allOrgIds.size > 0
      ? await adminSupabase
          .from('organizations')
          .select('id, name, acronym, logo')
          .in('id', Array.from(allOrgIds))
      : { data: null, error: null };

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
      const reportingOrgId = activitiesMap[disbursement.activity_id]?.reporting_org_id;
      const reportingOrg = reportingOrgId ? organizationsMap[reportingOrgId] : null;

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
        reporting_org_id: reportingOrgId || null,
        reporting_org_name: reportingOrg?.name || null,
        reporting_org_acronym: reportingOrg?.acronym || null,
        reporting_org_logo: reportingOrg?.logo || null,
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
