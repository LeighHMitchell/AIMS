'use client';

import { useMemo } from 'react';
import type { TaskTimeSeriesData } from '@/types/task';

interface CompletionRatesChartProps {
  data: TaskTimeSeriesData[];
}

export function CompletionRatesChart({ data }: CompletionRatesChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { labels: [], created: [], completed: [] };

    return {
      labels: data.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      created: data.map((d) => d.created),
      completed: data.map((d) => d.completed),
    };
  }, [data]);

  const maxValue = useMemo(() => {
    const allValues = [...chartData.created, ...chartData.completed];
    return Math.max(...allValues, 1);
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available for this period
      </div>
    );
  }

  // Simple bar chart using divs
  const barWidth = Math.max(20, Math.min(40, 600 / data.length - 4));

  return (
    <div className="h-[300px] overflow-hidden">
      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-slate-600" />
          <span>Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-slate-400" />
          <span>Completed</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-[220px] items-end gap-1 border-b border-l overflow-x-auto overflow-y-hidden pb-6">
        {data.map((item, index) => {
          const createdHeight = (item.created / maxValue) * 180;
          const completedHeight = (item.completed / maxValue) * 180;
          const date = new Date(item.date);
          const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div
              key={item.date}
              className="group relative flex flex-col items-center flex-shrink-0"
              style={{ width: barWidth }}
            >
              {/* Bars */}
              <div className="flex gap-[2px]">
                <div
                  className="rounded-t bg-slate-600 transition-all hover:bg-slate-700"
                  style={{
                    width: barWidth / 2 - 1,
                    height: Math.max(createdHeight, 2),
                  }}
                />
                <div
                  className="rounded-t bg-slate-400 transition-all hover:bg-slate-500"
                  style={{
                    width: barWidth / 2 - 1,
                    height: Math.max(completedHeight, 2),
                  }}
                />
              </div>

              {/* X-axis label (show every few labels for readability) */}
              {(index === 0 ||
                index === data.length - 1 ||
                (data.length <= 14 && index % 2 === 0) ||
                (data.length > 14 && index % 7 === 0)) && (
                <span className="absolute -bottom-5 text-[10px] text-muted-foreground whitespace-nowrap">
                  {label}
                </span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute -top-14 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-popover border px-2 py-1 text-xs shadow-lg group-hover:block whitespace-nowrap">
                <div className="font-medium">{label}</div>
                <div>Created: {item.created}</div>
                <div>Completed: {item.completed}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
