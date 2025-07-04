"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause
} from "lucide-react";
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval } from "date-fns";

interface ActivityData {
  id: string;
  title: string;
  activity_status: string;
  role: string;
  start_date?: string;
  end_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
}

interface ActivityPortfolioTimelineProps {
  activities: ActivityData[];
}

export const ActivityPortfolioTimeline: React.FC<ActivityPortfolioTimelineProps> = ({
  activities
}) => {
  const timelineData = useMemo(() => {
    if (!activities.length) return { months: [], activities: [], yearRange: "" };

    // Filter activities with valid dates
    const validActivities = activities.filter(activity => {
      const startDate = activity.actual_start_date || activity.planned_start_date || activity.start_date;
      const endDate = activity.actual_end_date || activity.planned_end_date || activity.end_date;
      return startDate && endDate;
    });

    if (!validActivities.length) return { months: [], activities: [], yearRange: "" };

    // Find date range
    const allDates = validActivities.flatMap(activity => {
      const startDate = activity.actual_start_date || activity.planned_start_date || activity.start_date;
      const endDate = activity.actual_end_date || activity.planned_end_date || activity.end_date;
      return [parseISO(startDate!), parseISO(endDate!)];
    });

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Extend to full years
    const startYear = startOfYear(minDate);
    const endYear = endOfYear(maxDate);

    // Generate months
    const months = eachMonthOfInterval({ start: startYear, end: endYear });

    // Process activities for timeline
    const processedActivities = validActivities.map(activity => {
      const startDate = parseISO(activity.actual_start_date || activity.planned_start_date || activity.start_date!);
      const endDate = parseISO(activity.actual_end_date || activity.planned_end_date || activity.end_date!);
      
      return {
        ...activity,
        startDate,
        endDate,
        duration: Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) // months
      };
    });

    const yearRange = `${format(startYear, 'yyyy')} - ${format(endYear, 'yyyy')}`;

    return {
      months,
      activities: processedActivities,
      yearRange
    };
  }, [activities]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'implementation':
      case 'active':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'pipeline':
      case 'planning':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
      case 'suspended':
        return <Pause className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'completion':
        return 'bg-green-500';
      case 'implementation':
      case 'active':
        return 'bg-blue-500';
      case 'pipeline':
      case 'planning':
        return 'bg-yellow-500';
      case 'cancelled':
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'reporting':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'funding':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'implementing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'extending':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const calculatePosition = (activityStartDate: Date, activityEndDate: Date) => {
    const { months } = timelineData;
    if (!months.length) return { left: 0, width: 0 };

    const timelineStart = months[0];
    const timelineEnd = months[months.length - 1];
    
    const totalTimelineMonths = months.length;
    const activityStartMonth = Math.max(0, 
      Math.floor((activityStartDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const activityEndMonth = Math.min(totalTimelineMonths,
      Math.ceil((activityEndDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );

    const left = (activityStartMonth / totalTimelineMonths) * 100;
    const width = Math.max(2, ((activityEndMonth - activityStartMonth) / totalTimelineMonths) * 100);

    return { left, width };
  };

  if (!timelineData.activities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Portfolio Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities with valid dates found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity Portfolio Timeline
          <Badge variant="outline" className="ml-2">
            {timelineData.yearRange}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Header */}
          <div className="relative">
            <div className="flex text-xs text-gray-600 mb-2">
              {timelineData.months.map((month, index) => (
                <div 
                  key={index} 
                  className="flex-1 text-center border-l border-gray-200 first:border-l-0"
                  style={{ minWidth: '60px' }}
                >
                  {format(month, 'MMM yy')}
                </div>
              ))}
            </div>
            <div className="h-px bg-gray-300"></div>
          </div>

          {/* Activities */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {timelineData.activities.map((activity) => {
                const position = calculatePosition(activity.startDate, activity.endDate);
                
                return (
                  <div key={activity.id} className="relative">
                    {/* Activity Info */}
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(activity.activity_status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={activity.title}>
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRoleColor(activity.role)}`}
                          >
                            {activity.role}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(activity.startDate, 'MMM yyyy')} - {format(activity.endDate, 'MMM yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 h-full rounded-full ${getStatusColor(activity.activity_status)} opacity-80`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`
                        }}
                      />
                      {/* Current date indicator */}
                      <div 
                        className="absolute top-0 w-px h-full bg-red-500 z-10"
                        style={{
                          left: `${(new Date().getTime() - timelineData.months[0].getTime()) / 
                            (timelineData.months[timelineData.months.length - 1].getTime() - timelineData.months[0].getTime()) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Active/Implementation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Pipeline/Planning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-px h-3 bg-red-500"></div>
              <span>Current Date</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};