"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Play,
  FileText,
  Plus,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { TaskAssignmentHistory, HistoryAction } from '@/types/task';
import { getStatusLabel, getTaskUserDisplayName } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskHistoryTimelineProps {
  history: TaskAssignmentHistory[];
  className?: string;
}

export function TaskHistoryTimeline({ history, className }: TaskHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No history available
      </div>
    );
  }

  const getActionIcon = (action: HistoryAction, newStatus?: string | null) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'reassigned':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'status_changed':
        if (newStatus === 'completed') return <CheckCircle2 className="h-4 w-4" />;
        if (newStatus === 'declined') return <XCircle className="h-4 w-4" />;
        if (newStatus === 'in_progress') return <Play className="h-4 w-4" />;
        return <Clock className="h-4 w-4" />;
      case 'note_added':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: HistoryAction, newStatus?: string | null) => {
    switch (action) {
      case 'created':
        return 'bg-blue-100 text-blue-600';
      case 'reassigned':
        return 'bg-purple-100 text-purple-600';
      case 'status_changed':
        if (newStatus === 'completed') return 'bg-green-100 text-green-600';
        if (newStatus === 'declined') return 'bg-gray-100 text-gray-600';
        if (newStatus === 'in_progress') return 'bg-amber-100 text-amber-600';
        return 'bg-slate-100 text-slate-600';
      case 'note_added':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getActionDescription = (entry: TaskAssignmentHistory): string => {
    const performerName = getTaskUserDisplayName(entry.performer);

    switch (entry.action) {
      case 'created':
        return `${performerName} assigned this task`;

      case 'reassigned':
        const prevName = getTaskUserDisplayName(entry.previous_assignee);
        const newName = getTaskUserDisplayName(entry.new_assignee);
        return `${performerName} reassigned from ${prevName} to ${newName}`;

      case 'status_changed':
        const fromStatus = entry.previous_status ? getStatusLabel(entry.previous_status) : 'Unknown';
        const toStatus = entry.new_status ? getStatusLabel(entry.new_status) : 'Unknown';
        return `${performerName} changed status from ${fromStatus} to ${toStatus}`;

      case 'note_added':
        return `${performerName} added a note`;

      default:
        return `${performerName} made a change`;
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {history.map((entry, index) => {
          const iconColor = getActionColor(entry.action, entry.new_status);
          const isLast = index === history.length - 1;

          return (
            <div key={entry.id} className="relative pl-10">
              {/* Icon */}
              <div
                className={cn(
                  'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                  iconColor
                )}
              >
                {getActionIcon(entry.action, entry.new_status)}
              </div>

              {/* Content */}
              <div className={cn('pb-4', !isLast && 'border-b')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {entry.performer && (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getTaskUserDisplayName(entry.performer).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm font-medium">
                      {getActionDescription(entry)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Note */}
                {entry.note && (
                  <div className="mt-2 bg-muted/50 rounded p-2 text-sm">
                    {entry.note}
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
