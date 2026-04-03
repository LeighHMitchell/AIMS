import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const sector = searchParams.get('sector') || undefined;
    const workingGroupId = searchParams.get('working_group_id') || undefined;
    const coordinationLevel = searchParams.get('coordination_level') || undefined;
    const isPublic = searchParams.get('is_public') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Build query
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        working_group:working_group_id (
          id,
          name
        )
      `)
      .order('start', { ascending: true });

    // Apply filters
    if (sector) {
      query = query.contains('sector_tags', [sector]);
    }

    if (workingGroupId) {
      query = query.eq('working_group_id', workingGroupId);
    }

    if (coordinationLevel) {
      query = query.eq('coordination_level', coordinationLevel);
    }

    if (isPublic !== undefined && isPublic !== null) {
      query = query.eq('is_public', isPublic === 'true');
    }

    if (dateFrom) {
      query = query.gte('start', dateFrom);
    }

    if (dateTo) {
      query = query.lte('start', dateTo);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('[Coordination Calendar API] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform events
    const transformedEvents = (events || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      type: event.type,
      status: event.status,
      color: event.color || '#4c5568',
      organizerId: event.organizer_id,
      organizerName: event.organizer_name,
      attendees: event.attendees || [],
      sectorTags: event.sector_tags || [],
      workingGroupId: event.working_group_id,
      workingGroupName: event.working_group?.name || null,
      isRecurring: event.is_recurring || false,
      recurrencePattern: event.recurrence_pattern,
      meetingNotes: event.meeting_notes,
      actionItems: event.action_items || [],
      isPublic: event.is_public !== false,
      coordinationLevel: event.coordination_level,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    }));

    // Compute stats
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(now);
    monthEnd.setDate(monthEnd.getDate() + 30);

    const thisWeek = transformedEvents.filter(
      (e: any) => new Date(e.start) >= now && new Date(e.start) <= weekEnd
    ).length;

    const thisMonth = transformedEvents.filter(
      (e: any) => new Date(e.start) >= now && new Date(e.start) <= monthEnd
    ).length;

    const byLevel: Record<string, number> = {};
    transformedEvents.forEach((e: any) => {
      if (e.coordinationLevel) {
        byLevel[e.coordinationLevel] = (byLevel[e.coordinationLevel] || 0) + 1;
      }
    });

    return NextResponse.json({
      events: transformedEvents,
      stats: {
        thisWeek,
        thisMonth,
        total: transformedEvents.length,
        byLevel,
      },
    });
  } catch (error) {
    console.error('[Coordination Calendar API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coordination calendar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
