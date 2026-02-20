import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/tours/complete
 * Body: { tourSlug: string, dismissed?: boolean }
 * Upserts user_tour_completions for the current user.
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
    const dismissed = body.dismissed === true;

    if (!tourSlug || typeof tourSlug !== 'string') {
      return NextResponse.json({ error: 'tourSlug is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_tour_completions')
      .upsert(
        {
          user_id: user.id,
          tour_slug: tourSlug,
          completed_at: new Date().toISOString(),
          dismissed,
        },
        { onConflict: 'user_id,tour_slug' }
      );

    if (error) {
      console.error('[Tours API] Error upserting completion:', error);
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tours API] Error in POST complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
