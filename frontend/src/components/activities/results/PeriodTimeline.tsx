'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { IndicatorPeriod, MeasureType } from '@/types/results';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PeriodTimelineProps {
  periods: IndicatorPeriod[];
  measure?: MeasureType;
  className?: string;
}

interface TimelinePoint {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  target?: number;
  actual?: number;
  achievement: number | null;
  status: 'high' | 'medium' | 'low' | 'none';
  label: string;
}

// Calculate achievement percentage
const calculateAchievement = (actual?: number, target?: number): number | null => {
  if (actual === undefined || target === undefined || target === 0) return null;
  return Math.round((actual / target) * 100);
};

// Get status based on achievement
const getStatus = (percentage: number | null): 'high' | 'medium' | 'low' | 'none' => {
  if (percentage === null) return 'none';
  if (percentage >= 80) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
};

// Format value based on measure type
const formatValue = (value: number | undefined, measure?: MeasureType): string => {
  if (value === undefined) return '—';
  switch (measure) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    default:
      return value.toLocaleString();
  }
};

// Format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
};

export function PeriodTimeline({ periods, measure, className }: PeriodTimelineProps) {
  const timelineData = useMemo(() => {
    if (!periods || periods.length === 0) return [];

    // Sort periods by end date
    const sorted = [...periods].sort((a, b) => 
      new Date(a.period_end).getTime() - new Date(b.period_end).getTime()
    );

    return sorted.map((period): TimelinePoint => {
      const achievement = calculateAchievement(period.actual_value, period.target_value);
      return {
        id: period.id,
        periodStart: new Date(period.period_start),
        periodEnd: new Date(period.period_end),
        target: period.target_value,
        actual: period.actual_value,
        achievement,
        status: getStatus(achievement),
        label: `${formatDate(new Date(period.period_start))} - ${formatDate(new Date(period.period_end))}`
      };
    });
  }, [periods]);

  if (timelineData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-slate-400 py-8", className)}>
        No periods defined
      </div>
    );
  }

  // Status colors
  const statusColors = {
    high: { bg: 'bg-[#6b9080]', border: 'border-[#6b9080]', text: 'text-[#4a6a5a]' },
    medium: { bg: 'bg-[#c4a35a]', border: 'border-[#c4a35a]', text: 'text-[#806830]' },
    low: { bg: 'bg-[#b87070]', border: 'border-[#b87070]', text: 'text-[#904848]' },
    none: { bg: 'bg-slate-300', border: 'border-slate-300', text: 'text-slate-500' }
  };

  return (
    <TooltipProvider>
      <div className={cn("py-4", className)}>
        {/* Timeline container */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
          
          {/* Period markers */}
          <div className="relative flex justify-between items-start">
            {timelineData.map((point, index) => (
              <div 
                key={point.id} 
                className="flex flex-col items-center"
                style={{ 
                  width: `${100 / timelineData.length}%`,
                  minWidth: '80px'
                }}
              >
                {/* Marker dot with tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110",
                        statusColors[point.status].bg,
                        statusColors[point.status].border,
                        "text-white text-xs font-medium"
                      )}
                    >
                      {point.achievement !== null ? (
                        <span className="text-[10px]">{point.achievement}%</span>
                      ) : (
                        <span className="text-[10px]">—</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{point.label}</div>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <div>Target: {formatValue(point.target, measure)}</div>
                        <div>Actual: {formatValue(point.actual, measure)}</div>
                        {point.achievement !== null && (
                          <div className={cn("font-medium", statusColors[point.status].text)}>
                            Achievement: {point.achievement}%
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Date label below */}
                <div className="mt-3 text-center">
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(point.periodEnd)}
                  </div>
                </div>

                {/* Values below date */}
                <div className="mt-1 text-center">
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400">T:</span> {formatValue(point.target, measure)}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    <span className="text-slate-400">A:</span> {formatValue(point.actual, measure)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-6 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#6b9080]" />
            <span>≥80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#c4a35a]" />
            <span>40-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#b87070]" />
            <span>&lt;40%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <span>No data</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default PeriodTimeline;






