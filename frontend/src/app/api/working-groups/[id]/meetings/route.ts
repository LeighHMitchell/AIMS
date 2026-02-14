import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('working_group_meetings')
      .select('*')
      .eq('working_group_id', id)
      .order('meeting_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.title || !body.meeting_date) {
      return NextResponse.json({ error: 'title and meeting_date are required' }, { status: 400 });
    }

    // Build start datetime from meeting_date + start_time
    let startIso = `${body.meeting_date}T${body.start_time || '09:00'}:00`;
    let endIso: string | null = null;
    if (body.end_time) {
      endIso = `${body.meeting_date}T${body.end_time}:00`;
    }

    // Get working group name for the calendar event title
    const { data: wgData } = await supabase
      .from('working_groups')
      .select('label')
      .eq('id', id)
      .single();

    const wgLabel = wgData?.label || 'Working Group';

    // Create the working group meeting
    const { data: meeting, error } = await supabase
      .from('working_group_meetings')
      .insert([{
        working_group_id: id,
        title: body.title,
        meeting_date: body.meeting_date,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        location: body.location || null,
        agenda: body.agenda || null,
        status: 'scheduled',
        created_by: user?.id || null,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also create a calendar event so it shows on the main calendar
    try {
      const calendarTitle = `${wgLabel}: ${body.title}`;
      const { data: calEvent } = await supabase
        .from('calendar_events')
        .insert({
          title: calendarTitle,
          description: body.agenda || `Working group meeting for ${wgLabel}`,
          start: startIso,
          end: endIso,
          location: body.location || null,
          type: 'meeting',
          color: '#6366f1', // Indigo for WG meetings
          organizer_id: user?.id || null,
          organizer_name: user?.name || user?.email || 'System',
          attendees: [],
          status: 'approved', // WG meetings are auto-approved
        })
        .select()
        .single();

      // Link the calendar event to the meeting
      if (calEvent?.id && meeting?.id) {
        await supabase
          .from('working_group_meetings')
          .update({ calendar_event_id: calEvent.id })
          .eq('id', meeting.id);
      }
    } catch (calError) {
      // Don't fail the meeting creation if calendar event fails
      console.error('[WG Meetings] Calendar event creation failed:', calError);
    }

    return NextResponse.json(meeting, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
