import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const supabase = getSupabaseAdmin();
    
    const { data: event, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        activities(id, title),
        organizations(id, name, acronym),
        working_groups(id, label)
      `)
      .eq('id', id)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const supabase = getSupabaseAdmin();

    // First check if event exists and user has permission
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Only allow updating unapproved events (unless it's an admin approval)
    if (existingEvent.approved && !body.isAdminUpdate) {
      return NextResponse.json(
        { error: 'Cannot update approved events' },
        { status: 403 }
      );
    }

    // Validate fields if provided
    if (body.event_type) {
      const validEventTypes = [
        'Activity Milestone',
        'Transaction',
        'Working Group Meeting',
        'Donor Conference',
        'Custom'
      ];
      
      if (!validEventTypes.includes(body.event_type)) {
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        );
      }
    }

    if (body.visibility) {
      const validVisibility = ['public', 'org-only', 'private'];
      if (!validVisibility.includes(body.visibility)) {
        return NextResponse.json(
          { error: 'Invalid visibility setting' },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    const startDate = body.start_date || existingEvent.start_date;
    const endDate = body.end_date !== undefined ? body.end_date : existingEvent.end_date;
    
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.event_type !== undefined) updateData.event_type = body.event_type;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.related_activity_id !== undefined) updateData.related_activity_id = body.related_activity_id;
    if (body.related_organisation_id !== undefined) updateData.related_organisation_id = body.related_organisation_id;
    if (body.working_group_id !== undefined) updateData.working_group_id = body.working_group_id;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;
    
    // Admin-only fields
    if (body.isAdminUpdate) {
      if (body.approved !== undefined) updateData.approved = body.approved;
    }

    const { data: updatedEvent, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        activities(id, title),
        organizations(id, name, acronym),
        working_groups(id, label)
      `)
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error in calendar event PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const supabase = getSupabaseAdmin();

    // Check if event exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Only allow deleting unapproved events (users can only delete their own)
    if (existingEvent.approved) {
      return NextResponse.json(
        { error: 'Cannot delete approved events' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error in calendar event DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}