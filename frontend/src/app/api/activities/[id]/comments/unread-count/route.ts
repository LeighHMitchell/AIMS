import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get unread count for the current user
    const { data: unreadComments, error } = await supabase
      .from('activity_comments')
      .select('id')
      .eq('activity_id', id)
      .eq('is_read', false);

    if (error) {
      console.error('[AIMS Comments API] Error fetching unread count:', error);
      return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
    }

    return NextResponse.json({ 
      count: unreadComments?.length || 0 
    });
  } catch (error) {
    console.error('[AIMS Comments API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 