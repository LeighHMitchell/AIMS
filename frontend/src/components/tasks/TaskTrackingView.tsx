"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Users,
  Calendar,
  RefreshCw,
  Pencil,
  Building2,
  UserCog,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import type { Task, TaskAssignment, UpdateTaskRequest } from '@/types/task';
import {
  getPriorityLabel,
  getPriorityColor,
  getStatusLabel,
  getStatusColor,
  getTaskUserDisplayName,
  getDaysUntilDeadline,
} from '@/types/task';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EditTaskModal } from './EditTaskModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type AssignmentSortField = 'assignee' | 'via' | 'status' | 'assigned' | 'completed' | 'note';
type SortDirection = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = { pending: 1, in_progress: 2, completed: 3, declined: 4 };
const VIA_ORDER: Record<string, number> = { individual: 1, organization: 2, role: 3 };

// Helper to get file icon based on MIME type
function getFileIcon(fileType: string) {
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('document')) {
    return FileText;
  }
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
    return FileSpreadsheet;
  }
  if (fileType.includes('image')) {
    return FileImage;
  }
  return File;
}

// Monochrome style for file icons
function getFileColor(_fileType: string): string {
  return 'bg-muted text-muted-foreground border-border';
}

interface TaskTrackingViewProps {
  userId: string;
  tasks: Task[];
  loading?: boolean;
  onRefresh?: () => void;
  onUpdateTask?: (taskId: string, data: UpdateTaskRequest) => Promise<Task | null>;
  onDeleteTask?: (taskId: string) => Promise<boolean>;
}

export function TaskTrackingView({
  userId,
  tasks,
  loading = false,
  onRefresh,
  onUpdateTask,
  onDeleteTask,
}: TaskTrackingViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<AssignmentSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleDelete = async (taskId: string) => {
    if (!onDeleteTask) return;
    setDeletingTaskId(taskId);
    try {
      await onDeleteTask(taskId);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSort = (field: AssignmentSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortAssignments = (assignments: any[]) => {
    if (!sortField) return assignments;

    return [...assignments].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'assignee':
          comparison = getTaskUserDisplayName(a.assignee).localeCompare(getTaskUserDisplayName(b.assignee));
          break;
        case 'via':
          comparison = (VIA_ORDER[a.assignment_type] || 0) - (VIA_ORDER[b.assignment_type] || 0);
          break;
        case 'status':
          comparison = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case 'assigned':
          const assignedA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const assignedB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = assignedA - assignedB;
          break;
        case 'completed':
          const completedA = a.completed_at ? new Date(a.completed_at).getTime() : (a.declined_at ? new Date(a.declined_at).getTime() : Infinity);
          const completedB = b.completed_at ? new Date(b.completed_at).getTime() : (b.declined_at ? new Date(b.declined_at).getTime() : Infinity);
          comparison = completedA - completedB;
          break;
        case 'note':
          const noteA = a.completion_note || a.declined_reason || '';
          const noteB = b.completion_note || b.declined_reason || '';
          comparison = noteA.localeCompare(noteB);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const SortIcon = ({ field }: { field: AssignmentSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tasks created</h3>
          <p className="text-muted-foreground text-center mt-1">
            You haven't created any tasks yet. Create a task to assign work to others.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task List with Expandable Rows */}
      {tasks.map((task) => {
        const isExpanded = expandedTasks.has(task.id);
        const assignments = task.task_assignments || [];
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const daysUntil = getDaysUntilDeadline(task.deadline);
        const isOverdue = daysUntil !== null && daysUntil < 0;
        const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

        // Calculate stats for this task
        const pending = assignments.filter(a => a.status === 'pending').length;
        const inProgress = assignments.filter(a => a.status === 'in_progress').length;
        const completed = assignments.filter(a => a.status === 'completed').length;
        const declined = assignments.filter(a => a.status === 'declined').length;
        const progressPercent = assignments.length > 0
          ? Math.round((completed / assignments.length) * 100)
          : 0;

        return (
          <Card
            key={task.id}
            className={cn(
              'transition-all',
              isOverdue && pending + inProgress > 0 && 'border-red-200 bg-red-50/30',
              isDueSoon && !isOverdue && pending + inProgress > 0 && 'border-amber-200 bg-amber-50/30'
            )}
          >
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(task.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                          {isOverdue && pending + inProgress > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <CardDescription className="mt-1 line-clamp-1">
                            {task.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      {deadline && (
                        <div className={cn(
                          'flex items-center gap-1 text-sm',
                          isOverdue && 'text-red-600',
                          isDueSoon && !isOverdue && 'text-amber-600'
                        )}>
                          <Calendar className="h-4 w-4" />
                          {format(deadline, 'MMM d')}
                        </div>
                      )}
                      {/* Assignee Avatars */}
                      {assignments.length > 0 && (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {assignments.slice(0, 4).map((assignment: any, idx: number) => {
                              const assignee = assignment.assignee;
                              const name = getTaskUserDisplayName(assignee);
                              return (
                                <Avatar
                                  key={assignment.id}
                                  className="h-6 w-6 border-2 border-background"
                                  style={{ zIndex: 4 - idx }}
                                >
                                  <AvatarImage src={assignee?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                            {assignments.length > 4 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  +{assignments.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Attachment Avatars */}
                      {task.task_attachments && task.task_attachments.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <div className="flex -space-x-1.5">
                                  {task.task_attachments.slice(0, 3).map((attachment: any, idx: number) => {
                                    const FileIcon = getFileIcon(attachment.file_type);
                                    return (
                                      <div
                                        key={attachment.id}
                                        className={cn(
                                          'h-6 w-6 rounded border flex items-center justify-center',
                                          getFileColor(attachment.file_type)
                                        )}
                                        style={{ zIndex: 3 - idx }}
                                      >
                                        <FileIcon className="h-3.5 w-3.5" />
                                      </div>
                                    );
                                  })}
                                  {task.task_attachments.length > 3 && (
                                    <div className="h-6 w-6 rounded bg-muted border border-muted-foreground/20 flex items-center justify-center">
                                      <span className="text-[10px] font-medium text-muted-foreground">
                                        +{task.task_attachments.length - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="text-xs">
                                <p className="font-medium mb-1">{task.task_attachments.length} attachment{task.task_attachments.length !== 1 ? 's' : ''}</p>
                                <ul className="space-y-0.5">
                                  {task.task_attachments.slice(0, 5).map((a: any) => (
                                    <li key={a.id} className="truncate text-muted-foreground">{a.file_name}</li>
                                  ))}
                                  {task.task_attachments.length > 5 && (
                                    <li className="text-muted-foreground">...and {task.task_attachments.length - 5} more</li>
                                  )}
                                </ul>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <div className="flex items-center gap-1">
                        {pending > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {pending}
                          </Badge>
                        )}
                        {inProgress > 0 && (
                          <Badge variant="outline" className="text-xs gap-1 border-blue-200 bg-blue-50 text-blue-700">
                            <PlayCircle className="h-3 w-3" />
                            {inProgress}
                          </Badge>
                        )}
                        {completed > 0 && (
                          <Badge variant="outline" className="text-xs gap-1 border-green-200 bg-green-50 text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {completed}
                          </Badge>
                        )}
                        {declined > 0 && (
                          <Badge variant="outline" className="text-xs gap-1 border-gray-200 bg-gray-50 text-gray-700">
                            <XCircle className="h-3 w-3" />
                            {declined}
                          </Badge>
                        )}
                      </div>
                      {/* Progress Indicator */}
                      {assignments.length > 0 && (
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all',
                                progressPercent === 100 ? 'bg-green-500' : 'bg-primary'
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-xs font-medium tabular-nums',
                            progressPercent === 100 && 'text-green-600'
                          )}>
                            {progressPercent}%
                          </span>
                        </div>
                      )}
                      {/* Edit Button */}
                      {onUpdateTask && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                        </Button>
                      )}
                      {/* Delete Button */}
                      {onDeleteTask && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                              disabled={deletingTaskId === task.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{task.title}"? This will notify all {assignments.length} assignee{assignments.length !== 1 ? 's' : ''} that the task has been deleted. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(task.id)}
                              >
                                Delete Task
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {/* Assignments Table */}
                  {assignments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden w-full">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[20%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('assignee')}
                              >
                                Assignee
                                <SortIcon field="assignee" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[12%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('via')}
                              >
                                Via
                                <SortIcon field="via" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[12%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('status')}
                              >
                                Status
                                <SortIcon field="status" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[14%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('assigned')}
                              >
                                Assigned
                                <SortIcon field="assigned" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[14%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('completed')}
                              >
                                Completed
                                <SortIcon field="completed" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[28%]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8 font-medium hover:bg-transparent"
                                onClick={() => handleSort('note')}
                              >
                                Note
                                <SortIcon field="note" />
                              </Button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortAssignments(assignments).map((assignment: any) => {
                            const assignee = assignment.assignee;
                            const assigneeName = getTaskUserDisplayName(assignee);
                            const assignmentDeadline = task.deadline ? new Date(task.deadline) : null;
                            const assignmentDaysUntil = getDaysUntilDeadline(task.deadline);
                            const assignmentOverdue = assignmentDaysUntil !== null && assignmentDaysUntil < 0 &&
                              ['pending', 'in_progress'].includes(assignment.status);

                            return (
                              <TableRow
                                key={assignment.id}
                                className={cn(
                                  assignmentOverdue && 'bg-red-50/50'
                                )}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarImage src={assignee?.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {assigneeName.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-sm">{assigneeName}</div>
                                      {assignee?.email && (
                                        <div className="text-xs text-muted-foreground">{assignee.email}</div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                          {assignment.assignment_type === 'organization' ? (
                                            <>
                                              <Building2 className="h-3.5 w-3.5" />
                                              <span>Org</span>
                                            </>
                                          ) : assignment.assignment_type === 'role' ? (
                                            <>
                                              <UserCog className="h-3.5 w-3.5" />
                                              <span>Role</span>
                                            </>
                                          ) : (
                                            <>
                                              <Users className="h-3.5 w-3.5" />
                                              <span>Direct</span>
                                            </>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {assignment.assignment_type === 'organization' && assignment.assignment_source
                                          ? `Assigned via organization`
                                          : assignment.assignment_type === 'role' && assignment.assignment_source
                                          ? `Assigned via role: ${assignment.assignment_source}`
                                          : 'Directly assigned'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className={cn('text-xs', getStatusColor(assignment.status))}>
                                      {getStatusLabel(assignment.status)}
                                    </Badge>
                                    {assignmentOverdue && (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {assignment.created_at
                                    ? formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {assignment.completed_at ? (
                                    format(new Date(assignment.completed_at), 'MMM d, yyyy')
                                  ) : assignment.declined_at ? (
                                    <span className="text-muted-foreground">
                                      Declined {format(new Date(assignment.declined_at), 'MMM d')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px]">
                                  {assignment.completion_note ? (
                                    <span className="truncate block">{assignment.completion_note}</span>
                                  ) : assignment.declined_reason ? (
                                    <span className="truncate block text-muted-foreground">
                                      {assignment.declined_reason}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No assignees yet
                    </p>
                  )}

                  {/* Progress Bar */}
                  {assignments.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {completed} of {assignments.length} completed
                          ({Math.round((completed / assignments.length) * 100)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(completed / assignments.length) * 100}%` }}
                        />
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(inProgress / assignments.length) * 100}%` }}
                        />
                        <div
                          className="h-full bg-gray-400 transition-all"
                          style={{ width: `${(declined / assignments.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Edit Task Modal */}
      {editingTask && onUpdateTask && (
        <EditTaskModal
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
          task={editingTask}
          userId={userId}
          onSubmit={async (taskId, data) => {
            const result = await onUpdateTask(taskId, data);
            if (result) {
              setEditingTask(null);
              onRefresh?.();
            }
            return result;
          }}
          onDelete={onDeleteTask ? async (taskId) => {
            const success = await onDeleteTask(taskId);
            if (success) {
              setEditingTask(null);
              onRefresh?.();
            }
            return success;
          } : undefined}
        />
      )}
    </div>
  );
}
