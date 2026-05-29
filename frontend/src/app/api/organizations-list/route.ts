import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

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
    const hasIati = searchParams.get('has_iati') === 'true';

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
        reporting_org_ref,
        website,
        name_aliases,
        residency_status,
        logo,
        banner,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply search filter
    // SECURITY: Escape ILIKE wildcards to prevent filter injection
    if (search) {
      const escapedSearch = escapeIlikeWildcards(search);
      query = query.or(`name.ilike.%${escapedSearch}%,acronym.ilike.%${escapedSearch}%`);
    }

    // Apply type filter
    if (typeFilter) {
      query = query.eq('Organisation_Type_Code', typeFilter);
    }

    // Apply IATI identifier filter (organizations that have IATI identifiers configured)
    if (hasIati) {
      query = query.or('iati_org_id.not.is.null,reporting_org_ref.not.is.null');
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

    // Server-side aggregation: a single RPC computes per-org activity counts,
    // budget/disbursement totals and provider/receiver counts. This replaces
    // the previous pattern of fetching every activity/budget/transaction/PD for
    // these orgs and aggregating in Node (which scaled with whole-table size).
    interface OrgStatsRow {
      org_id: string;
      activity_count: number;
      total_budgeted: number;
      total_disbursed: number;
      provider_count: number;
      receiver_count: number;
    }

    const { data: statsRows, error: statsError } = await supabase
      .rpc('get_organization_stats', { p_org_ids: orgIds });

    if (statsError) {
      // Non-fatal: fall back to zeroed stats so the list still renders.
      console.error('[Organizations List] get_organization_stats RPC error:', statsError);
    }

    const statsMap = new Map<string, OrgStatsRow>();
    (statsRows as OrgStatsRow[] | null)?.forEach((s) => statsMap.set(s.org_id, s));

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
      reporting_org_ref: string | null;
      website: string | null;
      name_aliases: string[] | null;
      residency_status: string | null;
      logo: string | null;
      banner: string | null;
      created_at: string;
      updated_at: string;
    }) => {
      const stats = statsMap.get(org.id);
      const activityCount = Number(stats?.activity_count) || 0;
      const providerCount = Number(stats?.provider_count) || 0;
      const receiverCount = Number(stats?.receiver_count) || 0;

      return {
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        type: org.type,
        Organisation_Type_Code: org.Organisation_Type_Code || org.type,
        Organisation_Type_Name: org.Organisation_Type_Name,
        country: org.country,
        country_represented: org.country_represented,
        iati_org_id: org.iati_org_id,
        reporting_org_ref: org.reporting_org_ref,
        website: org.website,
        name_aliases: org.name_aliases,
        residency_status: org.residency_status,
        logo: org.logo,
        banner: org.banner,
        created_at: org.created_at,
        updated_at: org.updated_at,
        // Computed stats
        activeProjects: activityCount,
        reportedActivities: activityCount,
        totalBudgeted: Number(stats?.total_budgeted) || 0,
        totalDisbursed: Number(stats?.total_disbursed) || 0,
        // Provider/Receiver transaction counts
        providerTransactionCount: providerCount,
        receiverTransactionCount: receiverCount,
        totalTransactionCount: providerCount + receiverCount
      };
    });

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
