'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ExternalLink, Users } from 'lucide-react';
import { getPriorityLabel, getPriorityColor, getTaskTypeLabel, getTaskUserDisplayName } from '@/types/task';
import type { OverdueTaskDetail } from '@/types/task';

interface OverdueTrackingTableProps {
  tasks: OverdueTaskDetail[];
}

export function OverdueTrackingTable({ tasks }: OverdueTrackingTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="mb-2 h-8 w-8 text-slate-400" />
        <p className="text-lg font-medium text-foreground">No Overdue Tasks</p>
        <p className="text-sm">All tasks are on track</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Days Overdue</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.task_id}>
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="truncate font-medium">{task.task_title}</p>
                  <p className="text-xs text-muted-foreground">
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
                      task.days_overdue > 7 ? 'text-slate-700' : 'text-slate-500'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      task.days_overdue > 7 ? 'text-slate-800' : 'text-slate-600'
                    }`}
                  >
                    {task.days_overdue} {task.days_overdue === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {task.completed_count} / {task.assignee_count}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(tasks.length, 20)} of {tasks.length} overdue tasks
          </p>
        </div>
      )}
    </div>
  );
}
