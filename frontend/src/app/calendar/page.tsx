'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Calendar, Clock, MapPin, Plus, Users, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MainLayout } from '@/components/layout/main-layout'
import { CalendarSkeleton } from '@/components/ui/skeleton-loader'
import { EventCreateModal } from '@/components/calendar/EventCreateModal'
import { supabase } from '@/lib/supabase'

// Dynamic import for FullCalendar to avoid SSR issues
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })

// Import plugins directly (they're not React components)
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end?: string
  location?: string
  type: 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other'
  status: 'pending' | 'approved'
  organizerId: string
  organizerName: string
  attendees?: string[]
  createdAt: string
  updatedAt: string
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'meeting' | 'deadline' | 'workshop'>('all')
  const [view, setView] = useState<'month' | 'list'>('month')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/calendar-events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Filter events based on selected filter
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return event.status === 'approved'
    return event.status === 'approved' && event.type === filter
  })

  // Convert events for FullCalendar
  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: getEventColor(event.type),
    borderColor: getEventColor(event.type),
    textColor: '#ffffff',
    extendedProps: {
      description: event.description,
      location: event.location,
      type: event.type,
      organizerName: event.organizerName,
    }
  }))

  function getEventColor(type: string): string {
    switch (type) {
      case 'meeting': return '#3b82f6'
      case 'deadline': return '#ef4444'
      case 'workshop': return '#10b981'
      case 'conference': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const handleDateClick = (arg: any) => {
    setSelectedDate(new Date(arg.dateStr))
    setShowAddModal(true)
  }

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event
    alert(`${event.title}\n${event.extendedProps.description || ''}\n${event.extendedProps.location || ''}`)
  }

  if (loading) {
    return (
      <MainLayout>
        <CalendarSkeleton />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Calendar Events
          </h1>
          <p className="text-muted-foreground">
            View and manage community events, deadlines, and meetings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value: 'all' | 'meeting' | 'deadline' | 'workshop') => setFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="deadline">Deadlines</SelectItem>
              <SelectItem value="workshop">Workshops</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={view} onValueChange={(value: 'month' | 'list') => setView(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <Card>
            <CardContent className="p-6">
              {typeof window !== 'undefined' && (
                <FullCalendar
                  plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                  initialView={view === 'month' ? 'dayGridMonth' : 'listWeek'}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: view === 'month' ? 'dayGridMonth' : 'listWeek'
                  }}
                  events={calendarEvents}
                  height="auto"
                  firstDay={1}
                  weekNumbers={true}
                  eventDisplay="block"
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  selectable={true}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <Badge variant="secondary">{filteredEvents.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <Badge variant="outline">
                  {filteredEvents.filter(e => new Date(e.start) > new Date()).length}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm">Meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm">Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm">Workshops</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-sm">Conferences</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Creation Modal */}
      <EventCreateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        onEventCreated={fetchEvents}
      />
      </div>
    </MainLayout>
  )
} 