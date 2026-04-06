import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrVisitor } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuthOrVisitor(request);
  if (authResponse) return authResponse;

  try {
    // Create admin client inline to bypass RLS for activity/org lookups
    // Note: getSupabaseAdmin() can return null due to module-level env var timing issues
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Search and filters - support both single values and arrays
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status') || 'all';
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
    const organization = searchParams.get('organization') || 'all';
    const organizations = searchParams.get('organizations')?.split(',').filter(Boolean) || [];
    const sortField = searchParams.get('sortField') || 'period_start';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('[Budgets List API] Query params:', { page, limit, search, types, statuses, organizations, sortField, sortOrder });

    // Build query - fetch budgets first, then join activities separately
    let query = supabase
      .from('activity_budgets')
      .select('*', { count: 'exact' });

    // Apply type filter - support both array and single value
    if (types.length > 0) {
      query = query.in('type', types);
    } else if (type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply status filter - support both array and single value
    if (statuses.length > 0) {
      query = query.in('status', statuses);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply organization filter - budgets don't have org directly, filter via activity's reporting_org_id
    if (organizations.length > 0) {
      const { data: orgActivities } = await adminSupabase
        .from('activities')
        .select('id')
        .in('reporting_org_id', organizations);
      const activityIds = (orgActivities || []).map((a: any) => a.id);
      if (activityIds.length > 0) {
        query = query.in('activity_id', activityIds);
      } else {
        // No activities for this org — return empty
        return NextResponse.json({ budgets: [], total: 0, page, limit }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store'
          }
        });
      }
    } else if (organization !== 'all') {
      const { data: orgActivities } = await adminSupabase
        .from('activities')
        .select('id')
        .eq('reporting_org_id', organization);
      const activityIds = (orgActivities || []).map((a: any) => a.id);
      if (activityIds.length > 0) {
        query = query.in('activity_id', activityIds);
      } else {
        return NextResponse.json({ budgets: [], total: 0, page, limit }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store'
          }
        });
      }
    }

    // Apply sorting
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: budgetsData, error: budgetsError, count } = await query;

    if (budgetsError) {
      console.error('[Budgets List API] Error fetching budgets:', budgetsError);
      console.error('[Budgets List API] Error details:', {
        code: budgetsError.code,
        message: budgetsError.message,
        details: budgetsError.details,
        hint: budgetsError.hint
      });
      return NextResponse.json(
        { error: 'Failed to fetch budgets', details: budgetsError.message },
        { status: 500 }
      );
    }

    // Now fetch all related activities in one query
    // Use admin client to bypass RLS — the user-scoped client may not have access to all activities
    const budgets = budgetsData || [];
    const allActivityIds = new Set<string>();

    budgets.forEach((b: any) => {
      if (b?.activity_id) allActivityIds.add(b.activity_id);
    });

    let activitiesMap: Record<string, any> = {};
    if (allActivityIds.size > 0) {
      const { data: activitiesData, error: activitiesError } = await adminSupabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, reporting_org_id, created_by_org_name, created_by_org_acronym, submission_status, created_by, updated_by')
        .in('id', Array.from(allActivityIds));

      if (activitiesError) {
        console.error('[Budgets List API] Error fetching activities:', activitiesError);
      }

      if (activitiesData) {
        console.log('[Budgets List API] Found', activitiesData.length, 'activities out of', allActivityIds.size, 'requested');
        activitiesMap = Object.fromEntries(
          activitiesData.map(a => [a.id, a])
        );
      }
    }

    // Fetch reporting organizations for activities
    const reportingOrgIds = new Set<string>();
    Object.values(activitiesMap).forEach((activity: any) => {
      if (activity?.reporting_org_id) {
        reportingOrgIds.add(activity.reporting_org_id);
      }
    });

    let organizationsMap: Record<string, any> = {};
    if (reportingOrgIds.size > 0) {
      const { data: organizationsData, error: orgsError } = await adminSupabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id, logo')
        .in('id', Array.from(reportingOrgIds));

      if (orgsError) {
        console.error('[Budgets List API] Error fetching organizations:', orgsError);
      }

      if (organizationsData) {
        organizationsMap = Object.fromEntries(
          organizationsData.map(o => [o.id, o])
        );
      }
    }

    // Combine budgets with their activities and map usd_value to value_usd
    const data = budgets.map((budget: any) => {
      const activity = budget?.activity_id ? activitiesMap[budget.activity_id] || null : null;
      let reportingOrg = null;
      
      // First try to get from organizations map using reporting_org_id
      if (activity?.reporting_org_id) {
        reportingOrg = organizationsMap[activity.reporting_org_id] || null;
      }
      
      // Fallback: if no organization found but we have created_by_org_name, create a synthetic org object
      if (!reportingOrg && activity && (activity.created_by_org_name || activity.created_by_org_acronym)) {
        reportingOrg = {
          id: null,
          name: activity.created_by_org_name || null,
          acronym: activity.created_by_org_acronym || null,
          iati_org_id: null,
        };
      }
      
      // Debug logging for first budget
      if (budgets.indexOf(budget) === 0) {
        console.log('[Budgets List API] Sample budget mapping:', {
          budgetId: budget.id,
          activityId: budget.activity_id,
          activity: activity,
          reportingOrgId: activity?.reporting_org_id,
          reportingOrg: reportingOrg,
          createdByOrgName: activity?.created_by_org_name,
          createdByOrgAcronym: activity?.created_by_org_acronym,
          organizationsMapSize: Object.keys(organizationsMap).length,
          reportingOrgIds: Array.from(reportingOrgIds)
        });
      }
      
      return {
        ...budget,
        value_usd: budget.usd_value || null, // Map usd_value to value_usd for frontend consistency
        activity: activity ? {
          ...activity,
          reporting_org: reportingOrg
        } : null,
      };
    });

    console.log('[Budgets List API] Fetched data:', {
      count: data?.length,
      total: count,
      sampleBudget: data?.[0],
      sampleActivity: data?.[0]?.activity,
      sampleReportingOrg: data?.[0]?.activity?.reporting_org
    });

    console.log(`[Budgets List API] Successfully fetched ${data?.length || 0} budgets, total: ${count}`);

    return NextResponse.json({
      budgets: data || [],
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
    console.error('Unexpected error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
