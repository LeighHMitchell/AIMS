'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
  sortableHeaderClasses,
} from '@/components/ui/table';
import { AlertTriangle, ExternalLink, Users } from 'lucide-react';
import { getPriorityLabel, getPriorityColor, getTaskTypeLabel, getTaskUserDisplayName } from '@/types/task';
import type { OverdueTaskDetail } from '@/types/task';

type SortField = 'task' | 'type' | 'priority' | 'days_overdue' | 'progress' | 'creator';
type SortDirection = 'asc' | 'desc';

interface OverdueTrackingTableProps {
  tasks: OverdueTaskDetail[];
}

export function OverdueTrackingTable({ tasks }: OverdueTrackingTableProps) {
  const [sortField, setSortField] = useState<SortField>('days_overdue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return [...tasks].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'task':
          return dir * a.task_title.localeCompare(b.task_title);
        case 'type':
          return dir * (a.task_type || '').localeCompare(b.task_type || '');
        case 'priority':
          return dir * ((priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
        case 'days_overdue':
          return dir * (a.days_overdue - b.days_overdue);
        case 'progress': {
          const rateA = a.assignee_count > 0 ? a.completed_count / a.assignee_count : 0;
          const rateB = b.assignee_count > 0 ? b.completed_count / b.assignee_count : 0;
          return dir * (rateA - rateB);
        }
        case 'creator': {
          const nameA = a.creator ? getTaskUserDisplayName(a.creator) : '';
          const nameB = b.creator ? getTaskUserDisplayName(b.creator) : '';
          return dir * nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });
  }, [tasks, sortField, sortDirection]);

  if (tasks.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">No Overdue Tasks</p>
        <p className="text-body">All tasks are on track</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('task')}>
              <div className="flex items-center gap-1">Task {getSortIcon('task', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('type')}>
              <div className="flex items-center gap-1">Type {getSortIcon('type', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('priority')}>
              <div className="flex items-center gap-1">Priority {getSortIcon('priority', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('days_overdue')}>
              <div className="flex items-center gap-1">Days Overdue {getSortIcon('days_overdue', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('progress')}>
              <div className="flex items-center gap-1">Progress {getSortIcon('progress', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className={sortableHeaderClasses} onClick={() => handleSort('creator')}>
              <div className="flex items-center gap-1">Creator {getSortIcon('creator', sortField, sortDirection)}</div>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => (
            <TableRow key={task.task_id}>
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="truncate text-body text-foreground">{task.task_title}</p>
                  <p className="text-helper text-muted-foreground">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getTaskTypeLabel(task.task_type)}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityColor(task.priority)}>
                  {getPriorityLabel(task.priority)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      task.days_overdue > 7 ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-body text-foreground">
                    {task.days_overdue} {task.days_overdue === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body text-foreground">
                    {task.completed_count} / {task.assignee_count}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-body text-foreground">
                  {task.creator ? getTaskUserDisplayName(task.creator) : 'Unknown'}
                </span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" asChild>
                  <a href={`/tasks/${task.task_id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {tasks.length > 10 && (
        <div className="border-t p-2 text-center">
          <p className="text-body text-muted-foreground">
            Showing {Math.min(tasks.length, 20)} of {tasks.length} overdue tasks
          </p>
        </div>
      )}
    </div>
  );
}
