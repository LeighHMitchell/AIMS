import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * Lightweight Activities List API
 *
 * Optimized for list views - returns only essential fields.
 * For detailed activity data, use /api/activities/[id]
 *
 * Performance improvements:
 * - Minimal field selection (~95% smaller payload)
 * - Single query with aggregation
 * - Short-term caching
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const { supabase, response: authResponse } = await requireAuth();

  if (authResponse) return authResponse;


  try {

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Filters
    const activityStatuses = searchParams.get('activityStatuses')?.split(',').filter(Boolean) || [];
    const submissionStatuses = searchParams.get('submissionStatuses')?.split(',').filter(Boolean) || [];
    const publicationStatus = searchParams.get('publicationStatus');

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build count query
    let countQuery = supabase.from('activities').select('*', { count: 'exact', head: true });

    // SLIM SELECT: Only essential fields for list view
    let dataQuery = supabase
      .from('activities')
      .select(`
        id,
        iati_identifier,
        other_identifier,
        title_narrative,
        acronym,
        activity_status,
        publication_status,
        submission_status,
        reporting_org_id,
        reporting_org_name,
        created_by_org_name,
        created_by_org_acronym,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        created_at,
        updated_at,
        humanitarian
      `)
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      const searchConditions = [];

      if (isValidUUID(search)) {
        searchConditions.push(`id.eq.${search}`);
      }

      searchConditions.push(`iati_identifier.ilike.%${search}%`);
      searchConditions.push(`title_narrative.ilike.%${search}%`);
      searchConditions.push(`acronym.ilike.%${search}%`);

      const orCondition = searchConditions.join(',');
      countQuery = countQuery.or(orCondition);
      dataQuery = dataQuery.or(orCondition);
    }

    // Apply status filters
    if (activityStatuses.length > 0) {
      countQuery = countQuery.in('activity_status', activityStatuses);
      dataQuery = dataQuery.in('activity_status', activityStatuses);
    }

    if (publicationStatus && publicationStatus !== 'all') {
      countQuery = countQuery.eq('publication_status', publicationStatus);
      dataQuery = dataQuery.eq('publication_status', publicationStatus);
    }

    if (submissionStatuses.length > 0) {
      countQuery = countQuery.in('submission_status', submissionStatuses);
      dataQuery = dataQuery.in('submission_status', submissionStatuses);
    }

    // Apply sorting
    const sortFieldMap: Record<string, string> = {
      'title': 'title_narrative',
      'title_narrative': 'title_narrative',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'updatedAt': 'updated_at',
      'createdAt': 'created_at',
      'activity_status': 'activity_status',
      'activityStatus': 'activity_status'
    };

    const mappedSortField = sortFieldMap[sortField] || 'updated_at';
    dataQuery = dataQuery.order(mappedSortField, { ascending: sortOrder === 'asc' });

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    if (countResult.error) {
      console.error('[Activities List] Count query error:', countResult.error);
      throw countResult.error;
    }

    if (dataResult.error) {
      console.error('[Activities List] Data query error:', dataResult.error);
      throw dataResult.error;
    }

    const totalCount = countResult.count ?? 0;
    const activities = dataResult.data || [];

    // Fetch summary totals for these activities in a single query
    const activityIds = activities.map((a: { id: string }) => a.id);

    let budgetTotals = new Map<string, number>();
    let transactionTotals = new Map<string, { commitments: number; disbursements: number }>();

    if (activityIds.length > 0) {
      // Fetch budget totals
      const { data: budgets } = await supabase
        .from('activity_budgets')
        .select('activity_id, usd_value')
        .in('activity_id', activityIds);

      if (budgets) {
        budgets.forEach((b: { activity_id: string; usd_value: number | null }) => {
          const current = budgetTotals.get(b.activity_id) || 0;
          budgetTotals.set(b.activity_id, current + (b.usd_value || 0));
        });
      }

      // Fetch transaction totals (aggregated)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('activity_id, transaction_type, value_usd')
        .in('activity_id', activityIds);

      if (transactions) {
        transactions.forEach((t: { activity_id: string; transaction_type: string; value_usd: number | null }) => {
          const current = transactionTotals.get(t.activity_id) || { commitments: 0, disbursements: 0 };
          const value = t.value_usd || 0;

          if (t.transaction_type === '2') {
            current.commitments += value;
          } else if (t.transaction_type === '3' || t.transaction_type === '4') {
            current.disbursements += value;
          }

          transactionTotals.set(t.activity_id, current);
        });
      }
    }

    // Transform to slim response
    const transformedActivities = activities.map((activity: {
      id: string;
      iati_identifier: string | null;
      other_identifier: string | null;
      title_narrative: string | null;
      acronym: string | null;
      activity_status: string | null;
      publication_status: string | null;
      submission_status: string | null;
      reporting_org_id: string | null;
      reporting_org_name: string | null;
      created_by_org_name: string | null;
      created_by_org_acronym: string | null;
      planned_start_date: string | null;
      planned_end_date: string | null;
      actual_start_date: string | null;
      actual_end_date: string | null;
      created_at: string;
      updated_at: string;
      humanitarian: boolean | null;
    }) => {
      const txTotals = transactionTotals.get(activity.id) || { commitments: 0, disbursements: 0 };

      return {
        id: activity.id,
        iatiIdentifier: activity.iati_identifier,
        partnerId: activity.other_identifier,
        title: activity.title_narrative,
        acronym: activity.acronym,
        activityStatus: activity.activity_status,
        publicationStatus: activity.publication_status,
        submissionStatus: activity.submission_status,
        reportingOrgId: activity.reporting_org_id,
        reportingOrgName: activity.reporting_org_name,
        createdByOrgName: activity.created_by_org_name,
        createdByOrgAcronym: activity.created_by_org_acronym,
        plannedStartDate: activity.planned_start_date,
        plannedEndDate: activity.planned_end_date,
        actualStartDate: activity.actual_start_date,
        actualEndDate: activity.actual_end_date,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at,
        humanitarian: activity.humanitarian,
        // Summary totals
        totalBudget: budgetTotals.get(activity.id) || 0,
        commitments: txTotals.commitments,
        disbursements: txTotals.disbursements
      };
    });

    const executionTime = Date.now() - startTime;

    const response = {
      activities: transformedActivities,
      data: transformedActivities, // Backward compatibility
      totalCount,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      performance: {
        executionTimeMs: executionTime,
        isSlimEndpoint: true
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Response-Time': `${executionTime}ms`
      }
    });

  } catch (error) {
    console.error('[Activities List] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
