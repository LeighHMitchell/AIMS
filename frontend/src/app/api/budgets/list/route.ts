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
    const status = searchParams.get('status') || 'all';
    const organization = searchParams.get('organization') || 'all';
    const sortField = searchParams.get('sortField') || 'period_start';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('[Budgets List API] Query params:', { page, limit, search, type, status, sortField, sortOrder });

    // Build query using joins like transactions API
    let query = supabase
      .from('budgets')
      .select(`
        *,
        activity:activities!activity_id (
          id,
          title_narrative,
          title,
          iati_identifier
        )
      `, { count: 'exact' });

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

    const { data, error, count } = await query;

    console.log('[Budgets List API] Fetched data:', {
      count: data?.length,
      total: count,
      sampleBudget: data?.[0],
      sampleActivity: data?.[0]?.activity
    });

    if (error) {
      console.error('[Budgets List API] Error fetching budgets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch budgets', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[Budgets List API] Successfully fetched ${data?.length || 0} budgets, total: ${count}`);

    return NextResponse.json({
      budgets: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Unexpected error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
