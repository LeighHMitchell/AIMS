'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getTaskTypeLabel, getTaskTypeColor } from '@/types/task';
import type { TaskTypeAnalytics, TaskType } from '@/types/task';

interface TaskTypeBreakdownProps {
  data: TaskTypeAnalytics[];
}

const typeColors: Record<TaskType, string> = {
  reporting: 'bg-slate-800',
  validation: 'bg-slate-600',
  compliance: 'bg-slate-400',
  information: 'bg-slate-300',
};

export function TaskTypeBreakdown({ data }: TaskTypeBreakdownProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.total, 0), [data]);

  if (total === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No tasks in this period
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pie chart visualization using CSS */}
      <div className="flex items-center justify-center">
        <div className="relative h-40 w-40">
          {/* Pie segments using conic-gradient */}
          <PieChart data={data} total={total} />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>
      </div>

      {/* Breakdown list */}
      <div className="space-y-3">
        {data.map((item) => {
          const percentage = total > 0 ? Math.round((item.total / total) * 100) : 0;

          return (
            <div key={item.task_type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${typeColors[item.task_type]}`} />
                  <span>{getTaskTypeLabel(item.task_type)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.total}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.completion_rate}% done
                  </Badge>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple pie chart component
function PieChart({ data, total }: { data: TaskTypeAnalytics[]; total: number }) {
  const segments = useMemo(() => {
    if (total === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

    let currentAngle = 0;
    const gradientParts: string[] = [];
    const colors: Record<TaskType, string> = {
      reporting: '#1e293b',
      validation: '#475569',
      compliance: '#94a3b8',
      information: '#cbd5e1',
    };

    for (const item of data) {
      if (item.total === 0) continue;

      const angle = (item.total / total) * 360;
      const color = colors[item.task_type];
      gradientParts.push(`${color} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  }, [data, total]);

  return (
    <div
      className="h-full w-full rounded-full"
      style={{ background: segments }}
    >
      {/* Inner white circle for donut effect */}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
    </div>
  );
}
