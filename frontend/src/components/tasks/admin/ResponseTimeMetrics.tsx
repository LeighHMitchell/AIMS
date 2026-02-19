'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';
import { formatResponseTime } from '@/hooks/useTaskAnalytics';
import { getTaskTypeLabel, getPriorityLabel } from '@/types/task';
import type { TaskTypeAnalytics, TaskPriorityAnalytics, TaskAnalyticsSummary } from '@/types/task';

interface ResponseTimeMetricsProps {
  byType: TaskTypeAnalytics[];
  byPriority: TaskPriorityAnalytics[];
  summary: TaskAnalyticsSummary | null;
}

export function ResponseTimeMetrics({ byType, byPriority, summary }: ResponseTimeMetricsProps) {
  if (!summary) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  // Calculate max completion rate for relative bar sizing
  const maxCompletionRate = Math.max(
    ...byType.map((t) => t.completion_rate),
    ...byPriority.map((p) => p.completion_rate),
    1
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Response Time Overview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Response Time Overview</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Average</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatResponseTime(summary.avg_response_time)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Median</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatResponseTime(summary.median_response_time)}
            </p>
          </div>
        </div>

        {/* On-time vs Late */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>On-Time Completion</span>
            <span className="font-medium text-slate-700">{summary.on_time_rate}%</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-slate-700 transition-all"
              style={{ width: `${summary.on_time_rate}%` }}
            />
            <div
              className="bg-slate-300 transition-all"
              style={{ width: `${100 - summary.on_time_rate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>On time</span>
            <span>Late</span>
          </div>
        </div>
      </div>

      {/* By Priority */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Completion by Priority</h4>
        <div className="space-y-3">
          {byPriority.map((item) => {
            const colors: Record<string, { bar: string; text: string }> = {
              high: { bar: 'bg-slate-800', text: 'text-slate-800' },
              medium: { bar: 'bg-slate-500', text: 'text-slate-600' },
              low: { bar: 'bg-slate-300', text: 'text-slate-500' },
            };
            const color = colors[item.priority] || colors.low;

            return (
              <div key={item.priority} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={color.text}>
                      {getPriorityLabel(item.priority)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.completed} / {item.total}
                    </span>
                  </div>
                  <span className="font-medium">{item.completion_rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${color.bar}`}
                    style={{ width: `${item.completion_rate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
