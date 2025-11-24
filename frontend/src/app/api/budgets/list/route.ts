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
    const status = searchParams.get('status') || 'all';
    const organization = searchParams.get('organization') || 'all';
    const sortField = searchParams.get('sortField') || 'period_start';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('[Budgets List API] Query params:', { page, limit, search, type, status, sortField, sortOrder });

    // Build query - fetch budgets first, then join activities separately
    let query = supabase
      .from('activity_budgets')
      .select('*', { count: 'exact' });

    // Apply type filter
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
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
    const budgets = budgetsData || [];
    const allActivityIds = new Set<string>();

    budgets.forEach((b: any) => {
      if (b?.activity_id) allActivityIds.add(b.activity_id);
    });

    let activitiesMap: Record<string, any> = {};
    if (allActivityIds.size > 0) {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier')
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

    // Combine budgets with their activities and map usd_value to value_usd
    const data = budgets.map((budget: any) => ({
      ...budget,
      value_usd: budget.usd_value || null, // Map usd_value to value_usd for frontend consistency
      activity: budget?.activity_id ? activitiesMap[budget.activity_id] || null : null,
    }));

    console.log('[Budgets List API] Fetched data:', {
      count: data?.length,
      total: count,
      sampleBudget: data?.[0],
      sampleActivity: data?.[0]?.activity
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
