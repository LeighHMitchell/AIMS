import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, user, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    // Upsert: only the first view per user per activity triggers the count increment
    const { error } = await supabase!
      .from('activity_views')
      .upsert(
        { activity_id: id, user_id: user!.id },
        { onConflict: 'activity_id,user_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[Views] Error recording view:', error);
      // Non-fatal: still return the current count
    }

    // Fetch current count from denormalized column
    const { data: activity } = await supabase!
      .from('activities')
      .select('unique_view_count')
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      viewCount: activity?.unique_view_count ?? 0,
    });
  } catch (err) {
    console.error('[Views] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}
