import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyAdminsOfNewEvent } from '@/lib/calendar-notifications'

interface DatabaseEvent {
  id: string
  title: string
  description?: string
  start: string
  end?: string
  location?: string
  type: string
  status: string
  organizer_id: string
  organizer_name: string
  attendees?: string[]
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('Supabase admin client not available')
      return NextResponse.json({ events: [], message: 'Database not configured' })
    }

    // Fetch events from Supabase
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Transform the data to match the expected format
    const transformedEvents = events?.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      type: event.type,
      status: event.status,
      organizerId: event.organizer_id,
      organizerName: event.organizer_name,
      attendees: event.attendees,
      meetingLink: event.meeting_link,
      notificationMinutes: event.notification_minutes,
      recordingEnabled: event.recording_enabled,
      aiNotetaking: event.ai_notetaking,
      integrations: event.integrations,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    })) || []

    return NextResponse.json({ events: transformedEvents })
  } catch (error) {
    console.error('Error in calendar events API:', error)
    return NextResponse.json({ 
      events: [],
      message: 'Calendar service temporarily unavailable' 
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('Supabase admin client not available')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    console.log('[Calendar API] Using Supabase admin client')

    // First, test if the table exists by doing a simple query
    const { data: testData, error: testError } = await supabase
      .from('calendar_events')
      .select('id')
      .limit(1)
    
    console.log('[Calendar API] Table test:', { hasData: !!testData, error: testError ? JSON.stringify(testError) : null })
    
    if (testError) {
      console.error('[Calendar API] Table test failed:', testError)
      return NextResponse.json({ 
        error: 'Calendar events table not accessible', 
        details: testError.message || 'Unknown error'
      }, { status: 500 })
    }

    const body = await request.json()
    console.log('[Calendar API] Request body:', JSON.stringify(body, null, 2))
    const { 
      title, 
      description, 
      start, 
      end, 
      location, 
      type, 
      organizerId, 
      organizerName, 
      attendees,
      meetingLink,
      notificationMinutes,
      recordingEnabled,
      aiNotetaking,
      integrations
    } = body

    if (!title || !start || !organizerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate event type
    const validTypes = ['meeting', 'deadline', 'workshop', 'conference', 'other']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }
    
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
    }
    
    if (endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Insert event into Supabase
    // Only include fields that exist in the database schema
    const insertData: any = {
      title,
      description: description || null,
      start: startDate.toISOString(),
      end: endDate?.toISOString() || null,
      location: location || null,
      type: type || 'other',
      organizer_id: organizerId,
      organizer_name: organizerName,
      attendees: attendees || [],
      status: 'pending' // All new events start as pending
    }

    // Note: Optional fields like meeting_link, notification_minutes, etc. 
    // are not in the current database schema, so we don't insert them
    console.log('[Calendar API] Insert data:', JSON.stringify(insertData, null, 2))

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert(insertData)
      .select()
      .single()

    console.log('[Calendar API] Insert result:', { data: event, error: JSON.stringify(error) })

    if (error) {
      console.error('Supabase insert error:', error)
      console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      throw error
    }

    // Notify admins about the new event (async, don't block response)
    notifyAdminsOfNewEvent(event.id, title, organizerName).catch((err) => {
      console.error('[Calendar API] Error sending notifications:', err);
    });

    // Transform response to match expected format
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      type: event.type,
      status: event.status,
      organizerId: event.organizer_id,
      organizerName: event.organizer_name,
      attendees: event.attendees,
      meetingLink: event.meeting_link,
      notificationMinutes: event.notification_minutes,
      recordingEnabled: event.recording_enabled,
      aiNotetaking: event.ai_notetaking,
      integrations: event.integrations,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }

    return NextResponse.json({ 
      message: 'Event created successfully and submitted for approval.',
      event: transformedEvent
    })
  } catch (error: any) {
    console.error('Error in calendar events creation:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      details: error?.details || error?.hint || null
    }, { status: 500 })
  }
} 