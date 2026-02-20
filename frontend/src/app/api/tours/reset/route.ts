import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/tours/reset
 * Body: { tourSlug?: string } — if tourSlug provided, reset only that tour; otherwise reset all.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
    if (!supabase || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tourSlug = body.tourSlug;

    let query = supabase
      .from('user_tour_completions')
      .delete()
      .eq('user_id', user.id);

    if (tourSlug && typeof tourSlug === 'string') {
      query = query.eq('tour_slug', tourSlug);
    }

    const { error } = await query;

    if (error) {
      console.error('[Tours API] Error resetting completions:', error);
      return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tours API] Error in POST reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
