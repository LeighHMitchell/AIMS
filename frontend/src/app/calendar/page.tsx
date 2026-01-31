'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Calendar, Clock, MapPin, Plus, Users, Filter, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MainLayout } from '@/components/layout/main-layout'
import { CalendarSkeleton } from '@/components/ui/skeleton-loader'
import { EventCreateModal } from '@/components/calendar/EventCreateModal'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { apiFetch } from '@/lib/api-fetch';

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
  color?: string
  organizerId: string
  organizerName: string
  organizerOrganizationId?: string
  organizerOrganizationName?: string
  attendees?: string[]
  createdAt: string
  updatedAt: string
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other'>('all')
  const [view, setView] = useState<'month' | 'list'>('month')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewingDate, setViewingDate] = useState<Date | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null)
  const [showPastMeetings, setShowPastMeetings] = useState(false)

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await apiFetch('/api/calendar-events')
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

  // Filter events based on selected filter (show both approved and pending)
  const filteredEvents = events.filter(event => {
    const validStatus = event.status === 'approved' || event.status === 'pending'
    if (filter === 'all') return validStatus
    return validStatus && event.type === filter
  })

  // Convert events for FullCalendar
  const calendarEvents = filteredEvents.map(event => {
    const isPending = event.status === 'pending'
    const eventColor = event.color || '#4c5568'

    return {
      id: event.id,
      title: isPending ? `${event.title} (Pending)` : event.title,
      start: event.start,
      end: event.end,
      backgroundColor: isPending ? 'transparent' : eventColor,
      borderColor: eventColor,
      textColor: isPending ? eventColor : '#ffffff',
      classNames: isPending ? ['pending-event'] : [],
      extendedProps: {
        description: event.description,
        location: event.location,
        type: event.type,
        status: event.status,
        color: eventColor,
        organizerName: event.organizerName,
      }
    }
  })

  const handleDateClick = (arg: any) => {
    setViewingDate(new Date(arg.dateStr))
  }

  const handleEventClick = (clickInfo: any) => {
    const clickedEvent = filteredEvents.find(e => e.id === clickInfo.event.id)
    if (clickedEvent) {
      setSelectedEvent(clickedEvent)
      setShowDetailModal(true)
    }
  }

  const handleEventMouseEnter = (info: any) => {
    const event = filteredEvents.find(e => e.id === info.event.id)
    if (event) {
      const rect = info.el.getBoundingClientRect()
      setHoveredEvent({
        event,
        x: rect.left + rect.width / 2,
        y: rect.top
      })
    }
  }

  const handleEventMouseLeave = () => {
    setHoveredEvent(null)
  }

  // Get events for the selected viewing date
  const eventsForSelectedDate = viewingDate
    ? filteredEvents.filter(event => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getFullYear() === viewingDate.getFullYear() &&
          eventDate.getMonth() === viewingDate.getMonth() &&
          eventDate.getDate() === viewingDate.getDate()
        )
      })
    : []

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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
      <style jsx global>{`
        .pending-event {
          border-style: dashed !important;
          border-width: 2px !important;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 5px,
            rgba(0, 0, 0, 0.05) 5px,
            rgba(0, 0, 0, 0.05) 10px
          ) !important;
        }
        .pending-event .fc-event-title {
          font-style: italic;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
        }
        .fc .fc-toolbar {
          flex-wrap: nowrap !important;
        }
        .fc .fc-toolbar-chunk {
          display: flex;
          align-items: center;
        }
        .fc .fc-button {
          background-color: transparent !important;
          border: 1px solid #cfd0d5 !important;
          color: #4c5568 !important;
          border-radius: 0.5rem !important;
          padding: 0.5rem !important;
        }
        .fc .fc-button:hover {
          background-color: #f1f4f8 !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #4c5568 !important;
          color: white !important;
        }
        .fc .fc-today-button {
          padding: 0.5rem 1rem !important;
        }
        .fc-event {
          cursor: pointer;
        }
      `}</style>
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
          <Select value={filter} onValueChange={(value: 'all' | 'meeting' | 'deadline' | 'workshop' | 'conference' | 'other') => setFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="deadline">Deadlines</SelectItem>
              <SelectItem value="workshop">Workshops</SelectItem>
              <SelectItem value="conference">Conferences</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={view} onValueChange={(value: 'month' | 'list') => setView(value)}>
            <SelectTrigger className="w-[120px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowAddModal(true)} className="bg-[#dc2625] hover:bg-[#dc2625]/90 rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <Card className="bg-white border-[#cfd0d5] rounded-xl">
            <CardContent className="p-6">
              {typeof window !== 'undefined' && (
                <FullCalendar
                  key={view}
                  plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                  initialView={view === 'month' ? 'dayGridMonth' : 'listWeek'}
                  headerToolbar={{
                    left: 'prev',
                    center: 'title today',
                    right: 'next'
                  }}
                  events={calendarEvents}
                  height="auto"
                  firstDay={1}
                  weekNumbers={true}
                  eventDisplay="block"
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  eventMouseEnter={handleEventMouseEnter}
                  eventMouseLeave={handleEventMouseLeave}
                  selectable={true}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-white border-[#cfd0d5] rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#4c5568]">
                  {showPastMeetings ? 'Past Meetings' : 'Upcoming Meetings'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPastMeetings(!showPastMeetings)}
                  className="text-xs text-[#7b95a7] hover:text-[#4c5568] h-8 px-2"
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  {showPastMeetings ? 'Show Upcoming' : 'Show Past'}
                </Button>
              </div>
              <CardDescription className="text-[#7b95a7]">
                {showPastMeetings
                  ? `${filteredEvents.filter(e => new Date(e.start) <= new Date()).length} past`
                  : `${filteredEvents.filter(e => new Date(e.start) > new Date()).length} upcoming`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredEvents
                .filter(e => showPastMeetings
                  ? new Date(e.start) <= new Date()
                  : new Date(e.start) > new Date()
                )
                .sort((a, b) => showPastMeetings
                  ? new Date(b.start).getTime() - new Date(a.start).getTime()
                  : new Date(a.start).getTime() - new Date(b.start).getTime()
                )
                .slice(0, 20)
                .map(event => (
                  <div
                    key={event.id}
                    className={`p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                      event.status === 'pending' ? 'border-l-4 border-dashed' : 'border-l-4'
                    }`}
                    style={{ borderLeftColor: event.color || '#4c5568' }}
                    onClick={() => {
                      setSelectedEvent(event)
                      setShowDetailModal(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-[#4c5568] truncate">{event.title}</h4>
                        <div className="flex items-center gap-1 mt-1 text-xs text-[#7b95a7]">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.start).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-[#7b95a7]">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start)}
                          {event.end && ` - ${formatTime(event.end)}`}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-[#7b95a7]">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      {event.status === 'pending' && (
                        <Badge variant="outline" className="text-xs border-[#cfd0d5] text-[#4c5568]">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              {filteredEvents.filter(e => showPastMeetings
                ? new Date(e.start) <= new Date()
                : new Date(e.start) > new Date()
              ).length === 0 && (
                <p className="text-sm text-[#7b95a7] text-center py-4">
                  {showPastMeetings ? 'No past meetings' : 'No upcoming meetings'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Date Events */}
      {viewingDate && (
        <Card className="bg-white border-[#cfd0d5] rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[#4c5568]">
                {formatDate(viewingDate)}
              </CardTitle>
              <CardDescription>
                {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? 's' : ''} on this day
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(viewingDate)
                  setShowAddModal(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDate(null)}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eventsForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events scheduled for this day
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {eventsForSelectedDate.map(event => {
                  const eventColor = event.color || '#4c5568'
                  return (
                  <Card
                    key={event.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      event.status === 'pending' ? 'border-dashed border-2' : ''
                    }`}
                    style={{ borderColor: eventColor }}
                    onClick={() => {
                      setSelectedEvent(event)
                      setShowDetailModal(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{event.title}</h4>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.start)}
                            {event.end && ` - ${formatTime(event.end)}`}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: eventColor, color: 'white' }}
                          >
                            {event.type}
                          </Badge>
                          {event.status === 'pending' && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      {event.description && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hover Tooltip */}
      {hoveredEvent && (
        <div
          className="fixed z-50 bg-white border border-[#cfd0d5] rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: hoveredEvent.x,
            top: hoveredEvent.y - 10,
            transform: 'translate(-50%, -100%)',
            maxWidth: '280px'
          }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: hoveredEvent.event.color || '#4c5568' }}
              />
              <div className="font-medium text-sm">{hoveredEvent.event.title}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTime(hoveredEvent.event.start)}
              {hoveredEvent.event.end && ` - ${formatTime(hoveredEvent.event.end)}`}
            </div>
            {hoveredEvent.event.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {hoveredEvent.event.location}
              </div>
            )}
            {hoveredEvent.event.organizerName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {hoveredEvent.event.organizerName}
              </div>
            )}
            {hoveredEvent.event.status === 'pending' && (
              <Badge variant="outline" className="text-xs mt-1">
                Pending Approval
              </Badge>
            )}
          </div>
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-white" style={{ marginTop: '-1px' }}></div>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      <EventCreateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        onEventCreated={fetchEvents}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        onEventUpdated={fetchEvents}
        onEventDeleted={fetchEvents}
        canEdit={true}
      />
      </div>
    </MainLayout>
  )
} 