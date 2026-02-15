import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    console.log('[Activities Search API] Received search request:', { search, limit });
    if (!supabase) {
      console.error('[Activities Search] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }

    let query = supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        acronym,
        other_identifier,
        iati_identifier,
        activity_status,
        created_by_org_name,
        created_by_org_acronym,
        icon,
        recipient_countries,
        reporting_org:organizations!reporting_org_id (
          id, name, acronym, logo, country,
          type, Organisation_Type_Code, Organisation_Type_Name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add search filter if provided
    if (search) {
      const searchFilter = `title_narrative.ilike.%${search}%,acronym.ilike.%${search}%,other_identifier.ilike.%${search}%,iati_identifier.ilike.%${search}%,created_by_org_name.ilike.%${search}%`;
      console.log('[Activities Search API] Applying search filter:', searchFilter);
      query = query.or(searchFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Activities Search] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    console.log('[Activities Search API] Query completed:', {
      searchTerm: search,
      resultsCount: data?.length || 0,
      results: data?.map(a => ({ id: a.id, title: a.title_narrative, iatiId: a.iati_identifier }))
    });

    return NextResponse.json({ activities: data || [] });
  } catch (error) {
    console.error('[Activities Search] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 