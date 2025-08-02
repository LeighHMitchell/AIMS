import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock user ID to database user ID mapping (same as comments)
const USER_ID_MAP: Record<string, string> = {
  "1": "85a65398-5d71-4633-a50b-2f167a0b6f7a",
  "2": "0864da76-2323-44a5-ac33-b27786da024e", 
  "3": "e75c1196-8daa-41f7-b9dd-e8b0bb62981f",
  "4": "ab800211-10a9-4d2f-8cfb-bb007fe01c51",
  "5": "0420c51c-eb0c-44c6-8dd8-380e88e9e6ed",
};

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET notifications for a user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('[AIMS Notifications API] GET request for user:', userId);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Notifications API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }

    let query = supabase
      .from('comment_notifications')
      .select('*')
      .eq('user_id', realUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('[AIMS Notifications API] Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    console.log('[AIMS Notifications API] Found', notifications?.length || 0, 'notifications');

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error('[AIMS Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH to mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationIds, markAllRead } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('[AIMS Notifications API] PATCH request for user:', userId);
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[AIMS Notifications API] Supabase admin client is null');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Map mock user ID to real database user ID if needed
    let realUserId = userId;
    if (!isValidUUID(userId)) {
      realUserId = USER_ID_MAP[userId] || userId;
    }
    
    if (!isValidUUID(realUserId)) {
      realUserId = "85a65398-5d71-4633-a50b-2f167a0b6f7a"; // fallback
    }

    let query = supabase
      .from('comment_notifications')
      .update({ is_read: true })
      .eq('user_id', realUserId);

    if (markAllRead) {
      // Mark all notifications as read for this user
      query = query.eq('is_read', false);
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      query = query.in('id', notificationIds);
    } else {
      return NextResponse.json({ error: 'Either notificationIds array or markAllRead flag is required' }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AIMS Notifications API] Error updating notifications:', error);
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    console.log('[AIMS Notifications API] Updated notifications successfully');

    return NextResponse.json({ success: true, updated: data });
  } catch (error) {
    console.error('[AIMS Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
} 