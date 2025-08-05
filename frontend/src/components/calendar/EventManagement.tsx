'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, X, Clock, MapPin, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'

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

export function EventManagement() {
  const { user, permissions } = useUser()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

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

  const handleStatusChange = async (eventId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success(`Event ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`)
        fetchEvents() // Refresh the list
      } else {
        toast.error('Failed to update event status')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event status')
    }
  }

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    return event.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      meeting: 'bg-blue-100 text-blue-800',
      deadline: 'bg-red-100 text-red-800',
      workshop: 'bg-green-100 text-green-800',
      conference: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  if (!permissions?.canManageUsers) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to manage events.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Event Management
          </h2>
          <p className="text-muted-foreground">Review and approve community events</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending ({events.filter(e => e.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            Approved ({events.filter(e => e.status === 'approved').length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({events.length})
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">
                {filter === 'pending' ? 'No pending events to review' : `No ${filter} events found`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map(event => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      {getStatusBadge(event.status)}
                      {getTypeBadge(event.type)}
                    </div>
                    <CardDescription>{event.description}</CardDescription>
                  </div>
                  
                  {event.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(event.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(event.id, 'rejected')}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(event.start).toLocaleString()}
                        {event.end && ` - ${new Date(event.end).toLocaleString()}`}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Organized by {event.organizerName}</span>
                    </div>
                  </div>
                  
                  {event.attendees && event.attendees.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Attendees ({event.attendees.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {event.attendees.slice(0, 3).map((attendee, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {attendee}
                          </Badge>
                        ))}
                        {event.attendees.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{event.attendees.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}