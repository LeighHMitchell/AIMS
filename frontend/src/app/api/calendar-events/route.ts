import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // For now, return mock data until database tables are set up
    const mockEvents = [
      {
        id: '1',
        title: 'Monthly Development Partners Meeting',
        description: 'Regular coordination meeting for all development partners',
        start: '2025-01-20T10:00:00Z',
        end: '2025-01-20T12:00:00Z',
        location: 'UNRC Conference Room',
        type: 'meeting',
        status: 'approved',
        organizerId: '1',
        organizerName: 'Development Coordination Unit',
        createdAt: '2025-01-15T08:00:00Z',
        updatedAt: '2025-01-15T08:00:00Z'
      },
      {
        id: '2',
        title: 'Activity Reporting Deadline',
        description: 'Quarterly activity reports due',
        start: '2025-01-25T23:59:59Z',
        location: 'Online',
        type: 'deadline',
        status: 'approved',
        organizerId: '2',
        organizerName: 'AIMS Administrator',
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-01-10T09:00:00Z'
      },
      {
        id: '3',
        title: 'Data Quality Workshop',
        description: 'Training session on improving data quality in AIMS',
        start: '2025-01-30T14:00:00Z',
        end: '2025-01-30T17:00:00Z',
        location: 'Ministry of Planning Training Center',
        type: 'workshop',
        status: 'approved',
        organizerId: '3',
        organizerName: 'AIMS Training Team',
        createdAt: '2025-01-12T10:00:00Z',
        updatedAt: '2025-01-12T10:00:00Z'
      }
    ]

    return NextResponse.json({ events: mockEvents })
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
    const { title, description, start, end, location, type, organizerId, organizerName } = body

    if (!title || !start || !organizerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // For now, return a success message - will implement database creation later
    return NextResponse.json({ 
      message: 'Event submitted for approval. Database setup required for full functionality.',
      event: {
        id: Date.now().toString(),
        title,
        description,
        start,
        end,
        location,
        type: type || 'other',
        status: 'pending',
        organizerId,
        organizerName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error in calendar events creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 