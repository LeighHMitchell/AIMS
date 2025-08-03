import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true';
    const includeAll = searchParams.get('includeAll') === 'true';
    const userId = searchParams.get('userId');

    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        activities(id, title),
        organizations(id, name, acronym),
        working_groups(id, label)
      `);

    if (includeAll) {
      // Admin view: show all events regardless of approval status
      // No additional filtering - return all events
    } else if (includeUnapproved && userId) {
      // For authenticated users: show their own events + approved public events
      query = query.or(`and(approved.eq.true,visibility.eq.public),created_by.eq.${userId}`);
    } else {
      // Public view: only approved public events
      query = query.eq('approved', true).eq('visibility', 'public');
    }

    const { data: events, error } = await query.order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in calendar events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.start_date) {
      return NextResponse.json(
        { error: 'Title and start date are required' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = [
      'Activity Milestone',
      'Transaction',
      'Working Group Meeting',
      'Donor Conference',
      'Custom'
    ];
    
    if (body.event_type && !validEventTypes.includes(body.event_type)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Validate visibility
    const validVisibility = ['public', 'org-only', 'private'];
    if (body.visibility && !validVisibility.includes(body.visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility setting' },
        { status: 400 }
      );
    }

    // Validate dates
    if (body.end_date && new Date(body.end_date) < new Date(body.start_date)) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const eventData = {
      title: body.title,
      description: body.description || null,
      event_type: body.event_type || 'Custom',
      start_date: body.start_date,
      end_date: body.end_date || null,
      related_activity_id: body.related_activity_id || null,
      related_organisation_id: body.related_organisation_id || null,
      working_group_id: body.working_group_id || null,
      visibility: body.visibility || 'public',
      created_by: body.created_by,
      approved: false // Always start as unapproved
    };

    const { data: newEvent, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select(`
        *,
        activities(id, title),
        organizations(id, name, acronym),
        working_groups(id, label)
      `)
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      event: newEvent,
      message: 'Event submitted for approval. You\'ll be notified once published.'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in calendar events POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}