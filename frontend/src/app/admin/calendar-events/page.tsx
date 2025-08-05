'use client'

import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

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

interface EventStats {
  total: number
  pending: number
  approved: number
  thisMonth: number
}

export default function AdminCalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [stats, setStats] = useState<EventStats>({ total: 0, pending: 0, approved: 0, thisMonth: 0 })
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const fetchEvents = async () => {
    try {
      // Mock data for admin view - will be replaced with real API
      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Weekly Coordination Meeting',
          description: 'Weekly meeting for project coordination',
          start: '2025-01-22T15:00:00Z',
          location: 'Conference Room A',
          type: 'meeting',
          status: 'pending',
          organizerId: '4',
          organizerName: 'Jane Smith',
          createdAt: '2025-01-18T09:00:00Z',
          updatedAt: '2025-01-18T09:00:00Z'
        },
        {
          id: '2',
          title: 'Budget Review Deadline',
          description: 'Final deadline for budget submissions',
          start: '2025-01-28T23:59:59Z',
          location: 'Online',
          type: 'deadline',
          status: 'pending',
          organizerId: '5',
          organizerName: 'Finance Team',
          createdAt: '2025-01-16T11:00:00Z',
          updatedAt: '2025-01-16T11:00:00Z'
        }
      ]
      
      setEvents(mockEvents)
      setStats({
        total: mockEvents.length,
        pending: mockEvents.filter(e => e.status === 'pending').length,
        approved: mockEvents.filter(e => e.status === 'approved').length,
        thisMonth: mockEvents.length
      })
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents()
    }
  }, [isAuthenticated])

  const handleApprove = async (eventId: string) => {
    try {
      // Mock approval - will be replaced with real API
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, status: 'approved' as const }
          : event
      ))
      toast.success('The event has been approved and is now visible to users.')
    } catch (error) {
      toast.error('Failed to approve event')
    }
  }

  const handleReject = async (eventId: string) => {
    try {
      // Mock rejection - will be replaced with real API
      setEvents(prev => prev.filter(event => event.id !== eventId))
      toast.success('The event has been rejected and removed.')
    } catch (error) {
      toast.error('Failed to reject event')
    }
  }

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    return event.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
    return <Badge className={colors[type as keyof typeof colors] || colors.other}>{type}</Badge>
  }

  if (!isAuthenticated || !user?.role || user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-lg text-muted-foreground">Access denied. Admin permissions required.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Calendar Event Management
        </h1>
        <p className="text-muted-foreground">
          Review and approve community calendar events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(value: 'all' | 'pending' | 'approved') => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No events found</p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      {getStatusBadge(event.status)}
                      {getTypeBadge(event.type)}
                    </div>
                    
                    {event.description && (
                      <p className="text-muted-foreground">{event.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📅 {new Date(event.start).toLocaleDateString()}</span>
                      {event.location && <span>📍 {event.location}</span>}
                      <span>👤 {event.organizerName}</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(event.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {event.status === 'pending' && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(event.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(event.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
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