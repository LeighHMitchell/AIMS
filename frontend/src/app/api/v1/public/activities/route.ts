import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  applyPublishedFilter,
  parsePagination,
  mapPublicActivity,
  mapPublicOrg,
  withPublicHeaders,
  publicApiError,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/public/activities
 *
 * Public, unauthenticated, read-only list of PUBLISHED activities.
 * Query params:
 *   - page   (default 1)
 *   - limit  (default 20, max 100)
 *   - search (optional, matches title / iati identifier)
 *
 * Returns a lean list (no child collections). Use the detail endpoint
 * (`/api/v1/public/activities/[id]`) for sectors, transactions, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = request.nextUrl;
    const { page, limit, offset } = parsePagination(searchParams);
    const search = searchParams.get('search')?.trim();

    let query = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    query = applyPublishedFilter(query);

    if (search) {
      query = query.or(
        `title_narrative.ilike.%${search}%,iati_identifier.ilike.%${search}%`
      );
    }

    const { data: activities, error, count } = await query;
    if (error) {
      return publicApiError('Failed to fetch activities', 500, error.message);
    }

    // Batch-resolve reporting orgs (name/ref only) without N+1 queries.
    const orgIds = Array.from(
      new Set((activities ?? []).map((a: any) => a.reporting_org_id).filter(Boolean))
    );
    const orgMap = new Map<string, any>();
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, acronym, iati_org_id')
        .in('id', orgIds);
      for (const o of orgs ?? []) orgMap.set(o.id, o);
    }

    const data = (activities ?? []).map((a: any) =>
      mapPublicActivity(a, mapPublicOrg(orgMap.get(a.reporting_org_id)))
    );

    const total = count ?? data.length;
    const response = NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + data.length < total,
      },
    });
    return withPublicHeaders(response);
  } catch (err) {
    return publicApiError(
      'Internal error',
      500,
      err instanceof Error ? err.message : 'Unknown error'
    );
  }
}

export async function OPTIONS() {
  return withPublicHeaders(new NextResponse(null, { status: 204 }));
}
