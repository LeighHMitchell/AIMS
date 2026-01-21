import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET - Retrieve bookmarked activity IDs for the current user
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!supabase) {
      console.error('[Bookmarks API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: bookmarks, error } = await supabase
      .from('activity_bookmarks')
      .select('activity_id')
      .eq('user_id', userId);

    if (error) {
      console.error('[Bookmarks API] Error fetching bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Return array of activity IDs
    const activityIds = (bookmarks || []).map((b: { activity_id: string }) => b.activity_id);
    
    return NextResponse.json({ activityIds });
  } catch (error) {
    console.error('[Bookmarks API] Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a bookmark
export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const body = await request.json();
    const { userId, activityId } = body;

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

    // Insert bookmark (upsert to handle duplicates gracefully)
    const { data: bookmark, error } = await supabase
      .from('activity_bookmarks')
      .upsert(
        { user_id: userId, activity_id: activityId },
        { onConflict: 'user_id,activity_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Bookmarks API] Error adding bookmark:', error);
      return NextResponse.json({ error: 'Failed to add bookmark' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bookmark,
      message: 'Activity bookmarked successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('[Bookmarks API] Error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
