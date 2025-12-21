import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { 
      status, 
      title, 
      description, 
      start, 
      end, 
      location, 
      type,
      meetingLink,
      notificationMinutes,
      recordingEnabled,
      aiNotetaking,
      integrations
    } = body

    // If only status is being updated, validate it
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (start !== undefined) updateData.start = new Date(start).toISOString()
    if (end !== undefined) updateData.end = end ? new Date(end).toISOString() : null
    if (location !== undefined) updateData.location = location
    if (type !== undefined) updateData.type = type
    if (meetingLink !== undefined) updateData.meeting_link = meetingLink
    if (notificationMinutes !== undefined) updateData.notification_minutes = notificationMinutes
    if (recordingEnabled !== undefined) updateData.recording_enabled = recordingEnabled
    if (aiNotetaking !== undefined) updateData.ai_notetaking = aiNotetaking
    if (integrations !== undefined) updateData.integrations = integrations

    // Update event in Supabase
    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
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
      meetingLink: event.meeting_link,
      notificationMinutes: event.notification_minutes,
      recordingEnabled: event.recording_enabled,
      aiNotetaking: event.ai_notetaking,
      integrations: event.integrations,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }

    return NextResponse.json({ 
      message: status ? `Event ${status} successfully` : 'Event updated successfully',
      event: transformedEvent
    })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Delete event from Supabase
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ 
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}