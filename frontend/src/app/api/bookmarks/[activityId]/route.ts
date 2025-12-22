import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// DELETE - Remove a bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
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
