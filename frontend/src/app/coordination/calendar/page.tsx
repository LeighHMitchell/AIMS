"use client"

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Clock,
  MapPin,
  Users,
  Filter,
  ChevronRight,
  Video,
  CircleDot,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

const COORDINATION_LEVELS = [
  { value: "national", label: "National" },
  { value: "sub_national", label: "Sub-National" },
  { value: "cluster", label: "Cluster" },
  { value: "working_group", label: "Working Group" },
  { value: "bilateral", label: "Bilateral" },
];

const LEVEL_COLORS: Record<string, string> = {
  national: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  sub_national: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  cluster: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  working_group: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  bilateral: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

interface CoordinationEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  location: string | null;
  type: string;
  status: string;
  color: string;
  organizerId: string;
  organizerName: string;
  attendees: string[];
  sectorTags: string[];
  workingGroupId: string | null;
  workingGroupName: string | null;
  isRecurring: boolean;
  recurrencePattern: string | null;
  meetingNotes: string | null;
  actionItems: any[];
  isPublic: boolean;
  coordinationLevel: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarStats {
  thisWeek: number;
  thisMonth: number;
  total: number;
  byLevel: Record<string, number>;
}

export default function CoordinationCalendarPage() {
  const [events, setEvents] = useState<CoordinationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CalendarStats>({ thisWeek: 0, thisMonth: 0, total: 0, byLevel: {} });

  // Filters
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [coordinationLevel, setCoordinationLevel] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sectorFilter) params.set("sector", sectorFilter);
      if (coordinationLevel) params.set("coordination_level", coordinationLevel);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      // Default to next 30 days if no date filter
      if (!dateFrom && !dateTo) {
        const now = new Date();
        params.set("dateFrom", now.toISOString());
        const thirtyDaysOut = new Date(now);
        thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
        params.set("dateTo", thirtyDaysOut.toISOString());
      }

      const res = await apiFetch(`/api/coordination-calendar?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const data = await res.json();

      setEvents(data.events || []);
      setStats(data.stats || { thisWeek: 0, thisMonth: 0, total: 0, byLevel: {} });
    } catch (err: any) {
      console.error("[CoordinationCalendar] Error:", err);
      toast.error("Failed to load coordination calendar");
    } finally {
      setLoading(false);
    }
  }, [sectorFilter, coordinationLevel, dateFrom, dateTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLevelLabel = (level: string) => {
    return COORDINATION_LEVELS.find(l => l.value === level)?.label || level;
  };

  const clearFilters = () => {
    setSectorFilter("");
    setCoordinationLevel("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = sectorFilter || coordinationLevel || dateFrom || dateTo;

  // Group events by date
  const groupedEvents = events.reduce<Record<string, CoordinationEvent[]>>((acc, event) => {
    const dateKey = formatDateTime(event.start);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6" />
            Coordination Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upcoming coordination meetings, cluster sessions, and working group events.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-3 px-4">
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4">
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <div className="text-xs text-muted-foreground">Next 30 Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4">
              <div className="text-2xl font-bold">{Object.keys(stats.byLevel).length}</div>
              <div className="text-xs text-muted-foreground">Coordination Levels</div>
            </CardContent>
          </Card>
        </div>

        {/* By Level Breakdown */}
        {Object.keys(stats.byLevel).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byLevel)
              .sort((a, b) => b[1] - a[1])
              .map(([level, count]) => (
                <Badge
                  key={level}
                  className={LEVEL_COLORS[level] || "bg-gray-100 text-gray-800"}
                  variant="secondary"
                >
                  {getLevelLabel(level)}: {count}
                </Badge>
              ))}
          </div>
        )}

        {/* Filter Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />

              <Input
                type="text"
                placeholder="Sector..."
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-[160px]"
              />

              <Select value={coordinationLevel} onValueChange={setCoordinationLevel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Coordination Level" />
                </SelectTrigger>
                <SelectContent>
                  {COORDINATION_LEVELS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more events."
                  : "No coordination meetings are scheduled for the next 30 days."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-sm font-semibold text-foreground">{dateLabel}</div>
                  <div className="flex-1 border-t" />
                  <Badge variant="secondary" className="text-xs">
                    {dateEvents.length} event{dateEvents.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Events for this date */}
                <div className="space-y-2">
                  {dateEvents.map((event) => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          {/* Time column */}
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="text-sm font-semibold">{formatTime(event.start)}</div>
                            {event.end && (
                              <div className="text-xs text-muted-foreground">{formatTime(event.end)}</div>
                            )}
                          </div>

                          {/* Color bar */}
                          <div
                            className="w-1 self-stretch rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color || "#4c5568" }}
                          />

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm">{event.title}</h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {event.isRecurring && (
                                  <Badge variant="outline" className="text-[10px] gap-0.5">
                                    <CircleDot className="h-2.5 w-2.5" />
                                    {event.recurrencePattern || "Recurring"}
                                  </Badge>
                                )}
                                {event.coordinationLevel && (
                                  <Badge
                                    className={`text-[10px] ${LEVEL_COLORS[event.coordinationLevel] || ""}`}
                                    variant="secondary"
                                  >
                                    {getLevelLabel(event.coordinationLevel)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Working Group */}
                            {event.workingGroupName && (
                              <Badge variant="secondary" className="text-xs">
                                {event.workingGroupName}
                              </Badge>
                            )}

                            {/* Sector Tags */}
                            {event.sectorTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {event.sectorTags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </span>
                              )}
                              {event.attendees && event.attendees.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {event.organizerName && (
                                <span className="text-muted-foreground">
                                  Organized by {event.organizerName}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
