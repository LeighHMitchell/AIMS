import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * Lightweight Organizations List API
 *
 * Optimized for list views - returns only essential fields with pre-computed stats.
 * For detailed organization data, use /api/organizations/[id]
 *
 * Performance improvements:
 * - Minimal field selection (excludes logo, banner, description)
 * - Server-side aggregation for activity counts and financial totals
 * - Single efficient query pattern instead of fetching all data
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get('sortField') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Filters
    const search = searchParams.get('search') || '';
    const typeFilter = searchParams.get('type') || '';

    // Essential fields for list view including logo/banner for card display
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        acronym,
        type,
        Organisation_Type_Code,
        Organisation_Type_Name,
        country,
        country_represented,
        iati_org_id,
        website,
        name_aliases,
        logo,
        banner,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,acronym.ilike.%${search}%`);
    }

    // Apply type filter
    if (typeFilter) {
      query = query.eq('Organisation_Type_Code', typeFilter);
    }

    // Apply sorting
    const orderOptions = { ascending: sortOrder === 'asc' };
    query = query.order(sortField, orderOptions);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: organizations, error, count } = await query;

    if (error) {
      console.error('[Organizations List] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: error.message },
        { status: 500 }
      );
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        performance: {
          executionTimeMs: Date.now() - startTime,
          isSlimEndpoint: true
        }
      });
    }

    // Get org IDs for batch statistics query
    const orgIds = organizations.map((o: { id: string }) => o.id);

    // Batch query for activity counts and IDs per organization
    // Single query to get all activities for these orgs (used for both count and budget lookup)
    const { data: orgActivities } = await supabase
      .from('activities')
      .select('id, reporting_org_id')
      .in('reporting_org_id', orgIds);

    // Count activities per org and build activity map
    const activityCounts = new Map<string, number>();
    const orgActivityMap = new Map<string, string[]>();
    if (orgActivities) {
      orgActivities.forEach((a: { id: string; reporting_org_id: string }) => {
        const orgId = a.reporting_org_id;
        // Count activities
        activityCounts.set(orgId, (activityCounts.get(orgId) || 0) + 1);
        // Build org -> activity ids map
        const existing = orgActivityMap.get(orgId) || [];
        existing.push(a.id);
        orgActivityMap.set(orgId, existing);
      });
    }

    // Get all activity IDs for budget query
    const allActivityIds = orgActivities?.map((a: { id: string }) => a.id) || [];

    // Fetch budgets for all activities in one query
    const orgBudgeted = new Map<string, number>();
    if (allActivityIds.length > 0) {
      const { data: budgetStats } = await supabase
        .from('activity_budgets')
        .select('activity_id, usd_value, value, currency')
        .in('activity_id', allActivityIds);

      // Create a map of activity -> budget total
      const activityBudgetMap = new Map<string, number>();
      if (budgetStats) {
        budgetStats.forEach((b: { activity_id: string; usd_value: number | null; value: number | null; currency: string | null }) => {
          // Use usd_value, fallback to value if currency is USD
          const amount = b.usd_value || (b.currency === 'USD' ? b.value : 0) || 0;
          const existing = activityBudgetMap.get(b.activity_id) || 0;
          activityBudgetMap.set(b.activity_id, existing + amount);
        });
      }

      // Sum budgets per organization
      orgActivityMap.forEach((activityIds, orgId) => {
        let total = 0;
        activityIds.forEach(actId => {
          total += activityBudgetMap.get(actId) || 0;
        });
        orgBudgeted.set(orgId, total);
      });
    }

    // Batch query for financial totals - disbursements (type 3)
    // Only for organizations in the current page
    // Note: UUIDs in the .or() filter need proper quoting for PostgREST
    const quotedOrgIds = orgIds.map((id: string) => `"${id}"`).join(',');
    const { data: transactionStats } = await supabase
      .from('transactions')
      .select('provider_org_id, receiver_org_id, transaction_type, value_usd')
      .or(`provider_org_id.in.(${quotedOrgIds}),receiver_org_id.in.(${quotedOrgIds})`)
      .eq('transaction_type', '3');

    // Calculate disbursement totals per org
    const orgDisbursed = new Map<string, number>();

    if (transactionStats) {
      transactionStats.forEach((t: {
        provider_org_id: string | null;
        receiver_org_id: string | null;
        transaction_type: string;
        value_usd: number | null
      }) => {
        const value = t.value_usd || 0;

        // Disbursements (type 3) - where org is provider or receiver
        if (t.provider_org_id && orgIds.includes(t.provider_org_id)) {
          orgDisbursed.set(t.provider_org_id, (orgDisbursed.get(t.provider_org_id) || 0) + value);
        }
        if (t.receiver_org_id && orgIds.includes(t.receiver_org_id)) {
          orgDisbursed.set(t.receiver_org_id, (orgDisbursed.get(t.receiver_org_id) || 0) + value);
        }
      });
    }

    // Transform to response with computed stats
    const transformedOrganizations = organizations.map((org: {
      id: string;
      name: string;
      acronym: string | null;
      type: string | null;
      Organisation_Type_Code: string | null;
      Organisation_Type_Name: string | null;
      country: string | null;
      country_represented: string | null;
      iati_org_id: string | null;
      website: string | null;
      name_aliases: string[] | null;
      logo: string | null;
      banner: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: org.id,
      name: org.name,
      acronym: org.acronym,
      type: org.type,
      Organisation_Type_Code: org.Organisation_Type_Code || org.type,
      Organisation_Type_Name: org.Organisation_Type_Name,
      country: org.country,
      country_represented: org.country_represented,
      iati_org_id: org.iati_org_id,
      website: org.website,
      name_aliases: org.name_aliases,
      logo: org.logo,
      banner: org.banner,
      created_at: org.created_at,
      updated_at: org.updated_at,
      // Computed stats
      activeProjects: activityCounts.get(org.id) || 0,
      reportedActivities: activityCounts.get(org.id) || 0,
      totalBudgeted: orgBudgeted.get(org.id) || 0,
      totalDisbursed: orgDisbursed.get(org.id) || 0
    }));

    const executionTime = Date.now() - startTime;
    const totalCount = count || 0;

    return NextResponse.json({
      data: transformedOrganizations,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      performance: {
        executionTimeMs: executionTime,
        isSlimEndpoint: true
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Response-Time': `${executionTime}ms`
      }
    });

  } catch (error) {
    console.error('[Organizations List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
