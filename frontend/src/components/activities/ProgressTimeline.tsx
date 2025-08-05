'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  IndicatorPeriod, 
  ResultIndicator, 
  MeasureType,
  STATUS_THRESHOLDS 
} from '@/types/results';

interface ProgressTimelineProps {
  indicator: ResultIndicator;
  periods: IndicatorPeriod[];
  activityStartDate?: string;
  activityEndDate?: string;
  className?: string;
}

interface TimelineSegment {
  period: IndicatorPeriod;
  achievementRate: number;
  status: 'green' | 'yellow' | 'red' | 'gray';
  widthPercentage: number;
  position: number;
}

export function ProgressTimeline({ 
  indicator, 
  periods, 
  activityStartDate, 
  activityEndDate,
  className 
}: ProgressTimelineProps) {
  // Calculate timeline segments
  const calculateTimelineSegments = (): TimelineSegment[] => {
    if (!periods || periods.length === 0) return [];

    // Sort periods by start date
    const sortedPeriods = [...periods].sort((a, b) => 
      new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
    );

    // Calculate total timeline duration
    const timelineStart = activityStartDate 
      ? new Date(activityStartDate)
      : new Date(sortedPeriods[0].period_start);
    
    const timelineEnd = activityEndDate 
      ? new Date(activityEndDate)
      : new Date(sortedPeriods[sortedPeriods.length - 1].period_end);
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    return sortedPeriods.map(period => {
      const periodStart = new Date(period.period_start);
      const periodEnd = new Date(period.period_end);
      const periodDuration = periodEnd.getTime() - periodStart.getTime();
      
      // Calculate position and width as percentages
      const position = ((periodStart.getTime() - timelineStart.getTime()) / totalDuration) * 100;
      const widthPercentage = (periodDuration / totalDuration) * 100;
      
      // Calculate achievement rate
      const target = period.target_value || 0;
      const actual = period.actual_value || 0;
      const achievementRate = target > 0 ? (actual / target) * 100 : 0;
      
      // Determine status
      let status: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
      if (achievementRate >= STATUS_THRESHOLDS.GREEN) {
        status = 'green';
      } else if (achievementRate >= STATUS_THRESHOLDS.YELLOW) {
        status = 'yellow';
      } else if (achievementRate > 0) {
        status = 'red';
      }

      return {
        period,
        achievementRate,
        status,
        widthPercentage: Math.max(widthPercentage, 2), // Minimum 2% width for visibility
        position
      };
    });
  };

  // Format value based on measure type
  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return '—';
    
    switch (indicator.measure) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'unit':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'yellow':
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
      case 'red':
        return <XCircle className="h-3 w-3 text-red-600" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  // Get trend indicator
  const getTrendIndicator = (segments: TimelineSegment[], index: number) => {
    if (index === 0) return null;
    
    const current = segments[index].achievementRate;
    const previous = segments[index - 1].achievementRate;
    
    if (current > previous + 5) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (current < previous - 5) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    } else {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const segments = calculateTimelineSegments();

  if (segments.length === 0) {
    return (
      <div className={cn("p-4 bg-gray-50 rounded-lg", className)}>
        <p className="text-sm text-gray-600 text-center">
          No periods available for timeline visualization
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Timeline Header */}
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium">Progress Timeline</h5>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>On track (≥85%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Attention (60-84%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Off track (<60%)</span>
            </div>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          {segments.map((segment, index) => (
            <Tooltip key={segment.period.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute top-0 h-full rounded transition-all duration-200 hover:opacity-80 cursor-pointer",
                    segment.status === 'green' && "bg-green-500",
                    segment.status === 'yellow' && "bg-yellow-500",
                    segment.status === 'red' && "bg-red-500",
                    segment.status === 'gray' && "bg-gray-400"
                  )}
                  style={{
                    left: `${segment.position}%`,
                    width: `${segment.widthPercentage}%`
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-medium">
                    {new Date(segment.period.period_start).toLocaleDateString()} - {' '}
                    {new Date(segment.period.period_end).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <div>Target: {formatValue(segment.period.target_value)}</div>
                    <div>Actual: {formatValue(segment.period.actual_value)}</div>
                    <div>Achievement: {Math.round(segment.achievementRate)}%</div>
                  </div>
                  {segment.period.facet && segment.period.facet !== 'Total' && (
                    <div className="text-xs text-gray-300">
                      Facet: {segment.period.facet}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Period Details */}
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div 
              key={segment.period.id}
              className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded text-xs"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(segment.status)}
                {getTrendIndicator(segments, index)}
                <span className="font-medium">
                  {new Date(segment.period.period_start).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-600">Target:</span> {formatValue(segment.period.target_value)}
                </div>
                <div>
                  <span className="text-gray-600">Actual:</span> {formatValue(segment.period.actual_value)}
                </div>
                <Badge 
                  variant={segment.status === 'green' ? 'default' : 'secondary'}
                  className={cn(
                    "text-xs",
                    segment.status === 'green' && "bg-green-100 text-green-700",
                    segment.status === 'yellow' && "bg-yellow-100 text-yellow-700",
                    segment.status === 'red' && "bg-red-100 text-red-700",
                    segment.status === 'gray' && "bg-gray-100 text-gray-700"
                  )}
                >
                  {Math.round(segment.achievementRate)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-gray-600">
              {indicator.latestActual ? formatValue(indicator.latestActual) : '0'} / {' '}
              {indicator.totalTarget ? formatValue(indicator.totalTarget) : '0'}
            </span>
          </div>
          <Progress 
            value={indicator.status?.percentage || 0}
            className={cn(
              "h-2",
              indicator.status?.color === 'green' && "[&>div]:bg-green-600",
              indicator.status?.color === 'yellow' && "[&>div]:bg-yellow-600",
              indicator.status?.color === 'red' && "[&>div]:bg-red-600"
            )}
          />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>0%</span>
            <span className="font-medium">
              {indicator.status?.percentage || 0}% ({indicator.status?.label || 'No progress'})
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}