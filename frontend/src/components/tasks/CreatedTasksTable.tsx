"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { format } from 'date-fns';
import type { Task, UpdateTaskRequest } from '@/types/task';
import {
  getPriorityLabel,
  getPriorityColor,
  getTaskUserDisplayName,
  getDaysUntilDeadline,
} from '@/types/task';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-fetch';

type SortField = 'task' | 'priority' | 'status' | 'deadline' | 'assignees' | 'progress';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

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

// Helper to download an attachment
async function downloadAttachment(taskId: string, attachmentId: string, fileName: string) {
  try {
    const userDataStr = localStorage.getItem('aims_user');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const userId = userData?.id;

    if (!userId) {
      console.error('User not authenticated');
      alert('You must be logged in to download attachments');
      return;
    }

    console.log('[Download] Fetching signed URL for:', { taskId, attachmentId, fileName });

    const response = await apiFetch(`/api/tasks/${taskId}/attachments/${attachmentId}?userId=${userId}`);
    const data = await response.json();

    console.log('[Download] API response:', data);

    if (!response.ok) {
      console.error('[Download] API error:', data.error);
      alert(`Download failed: ${data.error || 'Unknown error'}`);
      return;
    }

    if (!data.success || !data.data?.download_url) {
      console.error('[Download] No download URL in response');
      alert('Failed to get download URL');
      return;
    }

    // Fetch the file and trigger download
    const fileResponse = await fetch(data.data.download_url);
    const blob = await fileResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    alert('Failed to download attachment');
  }
}

// Get overall status for a task based on its assignments
function getTaskOverallStatus(task: Task): { label: string; color: string } {
  const assignments = task.task_assignments || [];
  if (assignments.length === 0) {
    return { label: 'No Assignees', color: 'text-muted-foreground bg-muted border-muted' };
  }

  const completed = assignments.filter(a => a.status === 'completed').length;
  const inProgress = assignments.filter(a => a.status === 'in_progress').length;
  const declined = assignments.filter(a => a.status === 'declined').length;
  const pending = assignments.filter(a => a.status === 'pending').length;

  if (completed === assignments.length) {
    return { label: 'All Completed', color: 'text-[#5f7f7a] bg-[#5f7f7a]/10 border-[#5f7f7a]/30' };
  }
  if (declined === assignments.length) {
    return { label: 'All Declined', color: 'text-gray-600 bg-gray-50 border-gray-200' };
  }
  if (inProgress > 0) {
    return { label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  }
  if (completed > 0) {
    return { label: 'Partial', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  }
  return { label: 'Pending', color: 'text-slate-600 bg-slate-50 border-slate-200' };
}

// Get progress percentage for a task
function getTaskProgress(task: Task): number {
  const assignments = task.task_assignments || [];
  if (assignments.length === 0) return 0;
  const completed = assignments.filter(a => a.status === 'completed').length;
  return Math.round((completed / assignments.length) * 100);
}

interface CreatedTasksTableProps {
  tasks: Task[];
  loading?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => Promise<boolean>;
  onViewDetails?: (task: Task) => void;
  emptyMessage?: string;
}

export function CreatedTasksTable({
  tasks,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  emptyMessage = 'No tasks created',
}: CreatedTasksTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!onDelete) return;
    setDeletingTaskId(taskId);
    try {
      await onDelete(taskId);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;

    return [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'task':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'priority':
          comparison = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          break;
        case 'status':
          comparison = getTaskProgress(a) - getTaskProgress(b);
          break;
        case 'deadline':
          const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          comparison = deadlineA - deadlineB;
          break;
        case 'assignees':
          comparison = (a.task_assignments?.length || 0) - (b.task_assignments?.length || 0);
          break;
        case 'progress':
          comparison = getTaskProgress(a) - getTaskProgress(b);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium hover:bg-transparent"
                onClick={() => handleSort('task')}
              >
                Task
                <SortIcon field="task" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium hover:bg-transparent"
                onClick={() => handleSort('priority')}
              >
                Priority
                <SortIcon field="priority" />
              </Button>
            </TableHead>
            <TableHead>
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
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium hover:bg-transparent"
                onClick={() => handleSort('deadline')}
              >
                Deadline
                <SortIcon field="deadline" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium hover:bg-transparent"
                onClick={() => handleSort('assignees')}
              >
                Assignees
                <SortIcon field="assignees" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">Attachments</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium hover:bg-transparent"
                onClick={() => handleSort('progress')}
              >
                Progress
                <SortIcon field="progress" />
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const deadline = task.deadline ? new Date(task.deadline) : null;
            const daysUntil = getDaysUntilDeadline(task.deadline);
            const assignments = task.task_assignments || [];
            const hasActiveAssignments = assignments.some(a => ['pending', 'in_progress'].includes(a.status));
            const isOverdue = daysUntil !== null && daysUntil < 0 && hasActiveAssignments;
            const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && hasActiveAssignments;
            const overallStatus = getTaskOverallStatus(task);
            const progress = getTaskProgress(task);
            const attachments = task.task_attachments || [];

            return (
              <TableRow
                key={task.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  isOverdue && 'bg-red-50/50',
                  isDueSoon && !isOverdue && 'bg-amber-50/50'
                )}
                onClick={() => onViewDetails?.(task)}
              >
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium line-clamp-1">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn('text-xs', overallStatus.color)}>
                      {overallStatus.label}
                    </Badge>
                    {isOverdue && (
                      <AlertTriangle className="h-4 w-4 text-[#DC2625]" />
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {deadline ? (
                    <div className={cn(
                      'text-sm',
                      isOverdue && 'text-[#DC2625] font-medium',
                      isDueSoon && !isOverdue && 'text-[#DC2625]'
                    )}>
                      {format(deadline, 'MMM d, yyyy')}
                      {daysUntil !== null && (
                        <div className="text-xs">
                          {isOverdue
                            ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
                            : daysUntil === 0
                            ? 'Due today'
                            : daysUntil === 1
                            ? 'Due tomorrow'
                            : `${daysUntil} days left`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No deadline</span>
                  )}
                </TableCell>

                <TableCell>
                  {assignments.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {assignments.slice(0, 3).map((assignment: any, idx: number) => {
                          const assignee = assignment.assignee;
                          const name = getTaskUserDisplayName(assignee);
                          return (
                            <TooltipProvider key={assignment.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar
                                    className="h-6 w-6 border-2 border-background cursor-default"
                                    style={{ zIndex: 3 - idx }}
                                  >
                                    <AvatarImage src={assignee?.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <div className="text-xs">
                                    <p className="font-medium">{name}</p>
                                    <p className="text-muted-foreground capitalize">{assignment.status.replace('_', ' ')}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        {assignments.length > 3 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center cursor-default">
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    +{assignments.length - 3}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">{assignments.length - 3} more assignee{assignments.length - 3 !== 1 ? 's' : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({assignments.length})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Users className="h-4 w-4" />
                      <span>None</span>
                    </div>
                  )}
                </TableCell>

                {/* Attachments Column */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {attachments.length === 0 ? (
                    <span className="text-muted-foreground text-xs">-</span>
                  ) : (
                    <div className="flex items-center gap-1 flex-wrap">
                      {attachments.slice(0, 4).map((attachment: any) => {
                        const FileIcon = getFileIcon(attachment.file_type);
                        return (
                          <TooltipProvider key={attachment.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAttachment(task.id, attachment.id, attachment.file_name);
                                  }}
                                  className={cn(
                                    'h-7 w-7 rounded border flex items-center justify-center hover:bg-accent transition-colors cursor-pointer',
                                    getFileColor(attachment.file_type)
                                  )}
                                >
                                  <FileIcon className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <div className="text-xs">
                                  <p className="font-medium">{attachment.file_name}</p>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <Download className="h-3 w-3" /> Click to download
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                      {attachments.length > 4 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-7 w-7 rounded bg-muted border border-muted-foreground/20 flex items-center justify-center text-xs font-medium text-muted-foreground">
                                +{attachments.length - 4}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <div className="text-xs">
                                <p className="font-medium mb-1">{attachments.length - 4} more attachment{attachments.length - 4 !== 1 ? 's' : ''}</p>
                                <ul className="space-y-0.5">
                                  {attachments.slice(4).map((a: any) => (
                                    <li key={a.id} className="truncate text-muted-foreground">{a.file_name}</li>
                                  ))}
                                </ul>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  {assignments.length > 0 ? (
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            progress === 100 ? 'bg-[#5f7f7a]' : 'bg-primary'
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-medium tabular-nums',
                        progress === 100 && 'text-[#5f7f7a]'
                      )}>
                        {progress}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            disabled={deletingTaskId === task.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
