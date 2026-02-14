import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id, meetingId } = await params;

    // Fetch meeting
    const { data: meeting, error } = await supabase
      .from('working_group_meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('working_group_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch attendees
    const { data: attendees } = await supabase
      .from('working_group_meeting_attendees')
      .select('*')
      .eq('meeting_id', meetingId);

    // Fetch documents attached to this meeting
    const { data: documents } = await supabase
      .from('working_group_documents')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('uploaded_at', { ascending: false });

    return NextResponse.json({
      ...meeting,
      attendees: attendees || [],
      documents: documents || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id, meetingId } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.meeting_date !== undefined) updateData.meeting_date = body.meeting_date;
    if (body.start_time !== undefined) updateData.start_time = body.start_time;
    if (body.end_time !== undefined) updateData.end_time = body.end_time;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.agenda !== undefined) updateData.agenda = body.agenda;
    if (body.minutes !== undefined) updateData.minutes = body.minutes;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('working_group_meetings')
      .update(updateData)
      .eq('id', meetingId)
      .eq('working_group_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle attendees update if provided
    if (body.attendees && Array.isArray(body.attendees)) {
      // Delete existing attendees and re-insert
      await supabase
        .from('working_group_meeting_attendees')
        .delete()
        .eq('meeting_id', meetingId);

      if (body.attendees.length > 0) {
        const attendeeRows = body.attendees.map((a: any) => ({
          meeting_id: meetingId,
          membership_id: a.membership_id || null,
          person_name: a.person_name,
          attended: a.attended || false,
        }));

        await supabase
          .from('working_group_meeting_attendees')
          .insert(attendeeRows);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id, meetingId } = await params;
    const { error } = await supabase
      .from('working_group_meetings')
      .delete()
      .eq('id', meetingId)
      .eq('working_group_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
