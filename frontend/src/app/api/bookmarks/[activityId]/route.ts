import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// DELETE - Remove a bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { activityId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }
    if (!supabase) {
      console.error('[Bookmarks API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { error } = await supabase
      .from('activity_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('activity_id', activityId);

    if (error) {
      console.error('[Bookmarks API] Error removing bookmark:', error);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bookmark removed successfully' 
    });
  } catch (error) {
    console.error('[Bookmarks API] Error in DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
