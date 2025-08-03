'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Calendar, Eye, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  visibility: string;
  approved: boolean;
  created_by?: string;
  created_at: string;
  activities?: { title: string };
  organizations?: { name: string; acronym?: string };
  working_groups?: { label: string };
}

interface EventStats {
  total: number;
  pending: number;
  approved: number;
  thisMonth: number;
}

export default function AdminCalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [stats, setStats] = useState<EventStats>({ total: 0, pending: 0, approved: 0, thisMonth: 0 });
  const { user, isAuthenticated } = useAuth();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar-events?includeAll=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      const eventsData = data.events || [];
      setEvents(eventsData);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const stats: EventStats = {
        total: eventsData.length,
        pending: eventsData.filter((e: CalendarEvent) => !e.approved).length,
        approved: eventsData.filter((e: CalendarEvent) => e.approved).length,
        thisMonth: eventsData.filter((e: CalendarEvent) => {
          const eventDate = new Date(e.start_date);
          return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        }).length
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch calendar events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApprove = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: true,
          isAdminUpdate: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve event');
      }

      toast({
        title: 'Event Approved',
        description: 'The event has been approved and is now visible to users.',
      });

      fetchEvents(); // Refresh the list
    } catch (error) {
      console.error('Error approving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve event',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reject event');
      }

      toast({
        title: 'Event Rejected',
        description: 'The event has been rejected and removed.',
      });

      fetchEvents(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject event',
        variant: 'destructive'
      });
    }
  };

  const getFilteredEvents = () => {
    switch (filter) {
      case 'pending':
        return events.filter(event => !event.approved);
      case 'approved':
        return events.filter(event => event.approved);
      default:
        return events;
    }
  };

  const getEventTypeBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'Activity Milestone': return 'default';
      case 'Transaction': return 'secondary';
      case 'Working Group Meeting': return 'outline';
      case 'Donor Conference': return 'destructive';
      default: return 'secondary';
    }
  };

  const getVisibilityBadgeVariant = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'default';
      case 'org-only': return 'secondary';
      case 'private': return 'outline';
      default: return 'secondary';
    }
  };

  // Check if user has admin privileges (you may need to adjust this based on your auth system)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the admin panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Calendar Events Admin</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={stats.pending > 0 ? 'destructive' : 'secondary'}>
                {stats.pending} Pending
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Events</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">This Month</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.thisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-4 mb-6">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            Approved ({stats.approved})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Events ({stats.total})
          </Button>
        </div>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredEvents().map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(event.start_date).toLocaleDateString()}
                          {event.end_date && event.end_date !== event.start_date && (
                            <div className="text-gray-500">
                              to {new Date(event.end_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getVisibilityBadgeVariant(event.visibility)}>
                          {event.visibility}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.approved ? (
                          <Badge variant="default">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{selectedEvent?.title}</DialogTitle>
                              </DialogHeader>
                              {selectedEvent && (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium">Description</h4>
                                    <p className="text-sm text-gray-600">
                                      {selectedEvent.description || 'No description provided'}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium">Event Type</h4>
                                      <Badge variant={getEventTypeBadgeVariant(selectedEvent.event_type)}>
                                        {selectedEvent.event_type}
                                      </Badge>
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Visibility</h4>
                                      <Badge variant={getVisibilityBadgeVariant(selectedEvent.visibility)}>
                                        {selectedEvent.visibility}
                                      </Badge>
                                    </div>
                                  </div>
                                  {selectedEvent.activities && (
                                    <div>
                                      <h4 className="font-medium">Related Activity</h4>
                                      <p className="text-sm text-gray-600">{selectedEvent.activities.title}</p>
                                    </div>
                                  )}
                                  {selectedEvent.organizations && (
                                    <div>
                                      <h4 className="font-medium">Related Organization</h4>
                                      <p className="text-sm text-gray-600">
                                        {selectedEvent.organizations.name}
                                        {selectedEvent.organizations.acronym && ` (${selectedEvent.organizations.acronym})`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {!event.approved && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(event.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(event.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && getFilteredEvents().length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500">
                  {filter === 'pending' 
                    ? 'No events are pending approval.'
                    : filter === 'approved'
                    ? 'No events have been approved yet.'
                    : 'No calendar events have been created yet.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}