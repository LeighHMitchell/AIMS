import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

/**
 * Lightweight Transactions List API
 *
 * Optimized for list views - returns only essential fields.
 * For detailed transaction data, use /api/transactions/[id]
 *
 * Performance improvements:
 * - Minimal field selection (~90% smaller payload)
 * - Single query with minimal joins
 * - Supports all filters used by the transactions page
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const { supabase, response: authResponse } = await requireAuth();

  if (authResponse) return authResponse;


  try {

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get('sortField') || 'transaction_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Filters
    const transactionTypes = searchParams.get('transactionTypes')?.split(',').filter(Boolean) || [];
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
    const financeTypes = searchParams.get('financeTypes')?.split(',').filter(Boolean) || [];
    const organizations = searchParams.get('organizations')?.split(',').filter(Boolean) || [];
    const search = searchParams.get('search') || '';
    const flowType = searchParams.get('flowType');
    const aidType = searchParams.get('aidType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // SLIM SELECT: Essential fields for list view plus fields needed for filtering display
    let query = supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        transaction_type,
        transaction_date,
        value,
        value_usd,
        currency,
        status,
        provider_org_id,
        provider_org_name,
        receiver_org_id,
        receiver_org_name,
        description,
        finance_type,
        flow_type,
        aid_type,
        created_at
      `, { count: 'exact' });

    // Apply filters
    if (transactionTypes.length > 0) {
      query = query.in('transaction_type', transactionTypes);
    }

    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }

    if (financeTypes.length > 0) {
      query = query.in('finance_type', financeTypes);
    }

    if (flowType && flowType !== 'all') {
      query = query.eq('flow_type', flowType);
    }

    if (aidType && aidType !== 'all') {
      query = query.eq('aid_type', aidType);
    }

    if (organizations.length > 0) {
      query = query.or(`provider_org_id.in.(${organizations.join(',')}),receiver_org_id.in.(${organizations.join(',')})`);
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    // SECURITY: Escape ILIKE wildcards to prevent filter injection
    if (search) {
      const escapedSearch = escapeIlikeWildcards(search);
      query = query.or(`provider_org_name.ilike.%${escapedSearch}%,receiver_org_name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }

    // Apply sorting
    const orderOptions = { ascending: sortOrder === 'asc' };
    query = query.order(sortField, orderOptions);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('[Transactions List] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: error.message },
        { status: 500 }
      );
    }

    // Get activity titles for the transactions (single batch query)
    const activityIds = [...new Set((transactions || []).map((t: { activity_id: string }) => t.activity_id).filter(Boolean))];
    let activityTitles = new Map<string, string>();

    if (activityIds.length > 0) {
      const { data: activities } = await supabase
        .from('activities')
        .select('id, title_narrative')
        .in('id', activityIds);

      if (activities) {
        activities.forEach((a: { id: string; title_narrative: string | null }) => {
          activityTitles.set(a.id, a.title_narrative || 'Untitled');
        });
      }
    }

    // Transform to slim response with camelCase keys for frontend
    const transformedTransactions = (transactions || []).map((t: {
      uuid: string;
      activity_id: string;
      transaction_type: string;
      transaction_date: string | null;
      value: number | null;
      value_usd: number | null;
      currency: string | null;
      status: string | null;
      provider_org_id: string | null;
      provider_org_name: string | null;
      receiver_org_id: string | null;
      receiver_org_name: string | null;
      description: string | null;
      finance_type: string | null;
      flow_type: string | null;
      aid_type: string | null;
      created_at: string;
    }) => ({
      // Use both uuid and id for compatibility
      uuid: t.uuid,
      id: t.uuid,
      activity_id: t.activity_id,
      activityId: t.activity_id,
      activityTitle: activityTitles.get(t.activity_id) || 'Unknown',
      transaction_type: t.transaction_type,
      transactionType: t.transaction_type,
      transaction_date: t.transaction_date,
      transactionDate: t.transaction_date,
      value: t.value,
      value_usd: t.value_usd,
      valueUsd: t.value_usd,
      currency: t.currency,
      status: t.status,
      provider_org_id: t.provider_org_id,
      provider_org_name: t.provider_org_name,
      providerOrg: t.provider_org_name,
      receiver_org_id: t.receiver_org_id,
      receiver_org_name: t.receiver_org_name,
      receiverOrg: t.receiver_org_name,
      description: t.description?.substring(0, 200), // Truncate for list view
      finance_type: t.finance_type,
      flow_type: t.flow_type,
      aid_type: t.aid_type,
      created_at: t.created_at,
      createdAt: t.created_at
    }));

    const executionTime = Date.now() - startTime;
    const totalCount = count || 0;

    return NextResponse.json({
      data: transformedTransactions,
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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Response-Time': `${executionTime}ms`
      }
    });

  } catch (error) {
    console.error('[Transactions List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
