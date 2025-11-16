import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    // Now fetch all related activities in one query
    const disbursements = disbursementsData || [];
    const allActivityIds = new Set<string>();

    disbursements.forEach((d: any) => {
      if (d?.activity_id) allActivityIds.add(d.activity_id);
      if (d?.provider_activity_uuid) allActivityIds.add(d.provider_activity_uuid);
      if (d?.receiver_activity_uuid) allActivityIds.add(d.receiver_activity_uuid);
    });

    let activitiesMap: Record<string, any> = {};
    if (allActivityIds.size > 0) {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title_narrative, title, iati_identifier')
        .in('id', Array.from(allActivityIds));

      if (activitiesError) {
        console.error('[Planned Disbursements List API] Error fetching activities:', activitiesError);
      }

      if (activitiesData) {
        activitiesMap = Object.fromEntries(
          activitiesData.map(a => [a.id, a])
        );
      }
    }

    // Combine disbursements with their activities
    const data = disbursements.map((disbursement: any) => ({
      ...disbursement,
      activity: disbursement?.activity_id ? activitiesMap[disbursement.activity_id] || null : null,
      provider_activity: disbursement?.provider_activity_uuid ? activitiesMap[disbursement.provider_activity_uuid] || null : null,
      receiver_activity: disbursement?.receiver_activity_uuid ? activitiesMap[disbursement.receiver_activity_uuid] || null : null,
    }));

    console.log(`[Planned Disbursements List API] Successfully fetched ${data?.length || 0} disbursements, total: ${count}`);

    return NextResponse.json({
      disbursements: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Unexpected error fetching planned disbursements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
