import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * GET /api/notifications/user
 * Get notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[User Notifications] Error fetching:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('[User Notifications] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/user
 * Mark notifications as read
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, notificationIds, markAllRead } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (markAllRead) {
      // Mark all notifications as read for this user
      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[User Notifications] Error marking all read:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Notification IDs are required' }, { status: 400 });
    }

    // Mark specific notifications as read
    const { error } = await supabase
      .from('user_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) {
      console.error('[User Notifications] Error marking read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('[User Notifications] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
