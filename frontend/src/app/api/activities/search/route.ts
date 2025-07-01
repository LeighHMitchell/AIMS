import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = getSupabaseAdmin()
      .from('activities')
      .select('id, title, iati_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,iati_id.ilike.%${search}%`);
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