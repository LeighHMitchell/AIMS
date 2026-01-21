import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { TaskEventType } from '@/types/task';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/events - Get task event history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const eventType = searchParams.get('event_type') as TaskEventType | null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isSuperUser = user?.role === 'super_user';

    // Get task to verify it exists and check access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, created_by')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isCreator = task.created_by === userId;

    // Check if user is assignee
    const { data: assignment } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .eq('assignee_id', userId)
      .single();

    const hasAccess = isSuperUser || isCreator || !!assignment;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('task_events')
      .select(`
        *,
        actor:users!actor_user_id(id, first_name, last_name, email, avatar_url)
      `, { count: 'exact' })
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by event type if specified
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error, count } = await query;

    if (error) {
      console.error('[Events API] Error fetching events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: events || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('[Events API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/events - Log custom event (for manual events like "opened")
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: taskId } = await params;
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId, event_type, metadata = {} } = body;

    if (!userId || !event_type) {
      return NextResponse.json({
        error: 'User ID and event_type are required'
      }, { status: 400 });
    }

    // Validate event type
    const validEventTypes = [
      'opened', 'email_sent', 'email_failed', 'reminder_sent', 'overdue_flagged'
    ];

    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json({
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
      }, { status: 400 });
    }

    // Get task to verify it exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('task_events')
      .insert({
        task_id: taskId,
        event_type,
        actor_user_id: userId,
        metadata,
      })
      .select(`
        *,
        actor:users!actor_user_id(id, first_name, last_name, email, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('[Events API] Error creating event:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('[Events API] Event logged:', event_type, 'for task:', taskId);

    return NextResponse.json({
      success: true,
      data: event,
    }, { status: 201 });
  } catch (error) {
    console.error('[Events API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
