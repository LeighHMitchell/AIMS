'use client';

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar, Plus, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import AddEventModal from '@/components/calendar/AddEventModal';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'Activity Milestone' | 'Transaction' | 'Working Group Meeting' | 'Donor Conference' | 'Custom';
  start_date: string;
  end_date?: string;
  related_activity_id?: string;
  related_organisation_id?: string;
  working_group_id?: string;
  visibility: 'public' | 'org-only' | 'private';
  approved: boolean;
  created_by?: string;
  created_at: string;
}

const EVENT_COLORS = {
  'Activity Milestone': '#3B82F6', // Blue
  'Transaction': '#10B981', // Green
  'Working Group Meeting': '#8B5CF6', // Purple
  'Donor Conference': '#F59E0B', // Orange
  'Custom': '#6B7280' // Gray
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dayGridMonth');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string>('');
  const { user, isAuthenticated } = useAuth();

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (isAuthenticated && user?.id) {
        queryParams.set('includeUnapproved', 'true');
        queryParams.set('userId', user.id);
      }

      const response = await fetch(`/api/calendar-events?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [isAuthenticated, user?.id]);

  // Transform events for FullCalendar
  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start_date,
    end: event.end_date || undefined,
    backgroundColor: EVENT_COLORS[event.event_type],
    borderColor: EVENT_COLORS[event.event_type],
    extendedProps: {
      description: event.description,
      eventType: event.event_type,
      relatedActivity: event.related_activity_id,
      relatedOrganisation: event.related_organisation_id,
      workingGroup: event.working_group_id,
      originalEvent: event
    }
  }));

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event.extendedProps.originalEvent);
  };

  const handleDateClick = (dateInfo: any) => {
    if (isAuthenticated) {
      const clickedDate = dateInfo.dateStr;
      setPrefilledDate(clickedDate);
      setShowAddModal(true);
    }
  };

  const exportToICS = async () => {
    // TODO: Implement ICS export
    console.log('Exporting to ICS...');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">📅 Aether Calendar</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Toggle Buttons */}
              <div className="flex rounded-lg border border-gray-300 bg-white">
                <Button
                  variant={view === 'dayGridMonth' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('dayGridMonth')}
                  className="rounded-r-none"
                >
                  Month
                </Button>
                <Button
                  variant={view === 'timeGridWeek' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('timeGridWeek')}
                  className="rounded-none border-x-0"
                >
                  Week
                </Button>
                <Button
                  variant={view === 'listWeek' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('listWeek')}
                  className="rounded-l-none"
                >
                  List
                </Button>
              </div>

              {/* Export Button */}
              <Button onClick={exportToICS} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export (.ics)
              </Button>

              {/* Add Event Button (authenticated users only) */}
              {isAuthenticated && (
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Legend */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Event Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(EVENT_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-600">{type}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Event Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Events</span>
                    <span className="font-medium">{events.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>This Month</span>
                    <span className="font-medium">
                      {events.filter(e => 
                        new Date(e.start_date).getMonth() === new Date().getMonth()
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={view}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: ''
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    height="auto"
                    eventDisplay="block"
                    displayEventTime={false}
                    dayMaxEventRows={3}
                    moreLinkClick="popover"
                    eventMouseEnter={(info) => {
                      // TODO: Add tooltip with event description
                    }}
                    key={view} // Force re-render when view changes
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedEvent.title}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={getEventTypeBadgeVariant(selectedEvent.event_type)}>
                      {selectedEvent.event_type}
                    </Badge>
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: EVENT_COLORS[selectedEvent.event_type] }}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date</h4>
                  <p className="text-sm">
                    {new Date(selectedEvent.start_date).toLocaleDateString()}
                    {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && (
                      ` - ${new Date(selectedEvent.end_date).toLocaleDateString()}`
                    )}
                  </p>
                </div>
                
                {selectedEvent.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <p className="text-sm">{selectedEvent.description}</p>
                  </div>
                )}

                {/* TODO: Add related activity/organization links */}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPrefilledDate('');
        }}
        onEventCreated={fetchEvents}
        prefilledDate={prefilledDate}
      />
    </div>
  );
}