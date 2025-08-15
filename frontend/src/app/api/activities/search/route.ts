import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = getSupabaseAdmin();
    
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
        iati_identifier,
        activity_status,
        created_by_org_name,
        created_by_org_acronym,
        icon
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add search filter if provided
    if (search) {
      query = query.or(`title_narrative.ilike.%${search}%,iati_identifier.ilike.%${search}%,created_by_org_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Activities Search] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({ activities: data || [] });
  } catch (error) {
    console.error('[Activities Search] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 