import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
    const transformedEvents = events?.map((event: DatabaseEvent) => ({
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
    const body = await request.json()
    const { title, description, start, end, location, type, organizerId, organizerName, attendees } = body

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
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        title,
        description,
        start: startDate.toISOString(),
        end: endDate?.toISOString(),
        location,
        type: type || 'other',
        organizer_id: organizerId,
        organizer_name: organizerName,
        attendees: attendees || [],
        status: 'pending' // All new events start as pending
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

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
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }

    return NextResponse.json({ 
      message: 'Event created successfully and submitted for approval.',
      event: transformedEvent
    })
  } catch (error) {
    console.error('Error in calendar events creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 