import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  applyPublishedFilter,
  parsePagination,
  mapPublicTransaction,
  withPublicHeaders,
  publicApiError,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

// Bound the set of published activities we resolve when no activity filter is
// given, so the IN(...) query stays sane. Surfaced in the response meta.
const PUBLISHED_SCOPE_CAP = 5000;

/**
 * GET /api/v1/public/transactions
 *
 * Public, unauthenticated, read-only transactions belonging to PUBLISHED
 * activities. Transactions have no publish flag of their own, so visibility is
 * inherited from the parent activity.
 *
 * Query params:
 *   - activity_id (optional) restrict to one activity (must be published)
 *   - page  (default 1)
 *   - limit (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = request.nextUrl;
    const { page, limit, offset } = parsePagination(searchParams);
    const activityId = searchParams.get('activity_id')?.trim();

    let truncatedScope = false;
    let allowedIds: string[];

    if (activityId) {
      // Single activity: confirm it is published before returning anything.
      let check = supabase.from('activities').select('id').eq('id', activityId);
      check = applyPublishedFilter(check);
      const { data: found } = await check.limit(1);
      if (!found || found.length === 0) {
        // Don't reveal whether it exists but is unpublished.
        return withPublicHeaders(
          NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } })
        );
      }
      allowedIds = [activityId];
    } else {
      // Resolve the (capped) set of published activity ids.
      let idQuery = supabase
        .from('activities')
        .select('id')
        .range(0, PUBLISHED_SCOPE_CAP - 1);
      idQuery = applyPublishedFilter(idQuery);
      const { data: idRows, error: idErr } = await idQuery;
      if (idErr) {
        return publicApiError('Failed to resolve published activities', 500, idErr.message);
      }
      allowedIds = (idRows ?? []).map((r: any) => r.id);
      truncatedScope = allowedIds.length >= PUBLISHED_SCOPE_CAP;
    }

    if (allowedIds.length === 0) {
      return withPublicHeaders(
        NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } })
      );
    }

    const { data: txns, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .in('activity_id', allowedIds)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return publicApiError('Failed to fetch transactions', 500, error.message);
    }

    const data = (txns ?? []).map(mapPublicTransaction);
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
      ...(truncatedScope
        ? { meta: { note: `Published-activity scope capped at ${PUBLISHED_SCOPE_CAP}; use activity_id for complete coverage.` } }
        : {}),
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
