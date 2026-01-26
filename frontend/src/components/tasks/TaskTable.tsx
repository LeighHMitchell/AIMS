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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TaskActionMenu } from './TaskActionMenu';
import { format } from 'date-fns';
import type { TaskAssignment, TaskStatus } from '@/types/task';
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
import { apiFetch } from '@/lib/api-fetch';

type SortField = 'task' | 'priority' | 'status' | 'deadline' | 'person';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };
const STATUS_ORDER = { pending: 1, in_progress: 2, completed: 3, declined: 4 };

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
    // Get the current user ID from localStorage or session
    const userDataStr = localStorage.getItem('aims_user');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const userId = userData?.id;

    if (!userId) {
      console.error('User not authenticated');
      alert('You must be logged in to download attachments');
      return;
    }

    console.log('[Download] Fetching signed URL for:', { taskId, attachmentId, fileName });

    // Get signed URL from API
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

interface TaskTableProps {
  assignments: TaskAssignment[];
  loading?: boolean;
  onStatusChange?: (assignmentId: string, status: TaskStatus) => void;
  onReassign?: (assignment: TaskAssignment) => void;
  onShare?: (assignment: TaskAssignment) => void;
  onViewDetails?: (assignment: TaskAssignment) => void;
  onArchive?: (assignmentId: string) => void;
  onUnarchive?: (assignmentId: string) => void;
  isCreatorView?: boolean;
  emptyMessage?: string;
}

export function TaskTable({
  assignments,
  loading = false,
  onStatusChange,
  onReassign,
  onShare,
  onViewDetails,
  onArchive,
  onUnarchive,
  isCreatorView = false,
  emptyMessage = 'No tasks found',
}: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssignments = useMemo(() => {
    if (!sortField) return assignments;

    return [...assignments].sort((a, b) => {
      let comparison = 0;
      const taskA = a.task;
      const taskB = b.task;

      switch (sortField) {
        case 'task':
          comparison = (taskA?.title || '').localeCompare(taskB?.title || '');
          break;
        case 'priority':
          comparison = (PRIORITY_ORDER[taskA?.priority || 'low'] || 0) - (PRIORITY_ORDER[taskB?.priority || 'low'] || 0);
          break;
        case 'status':
          comparison = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case 'deadline':
          const deadlineA = taskA?.deadline ? new Date(taskA.deadline).getTime() : Infinity;
          const deadlineB = taskB?.deadline ? new Date(taskB.deadline).getTime() : Infinity;
          comparison = deadlineA - deadlineB;
          break;
        case 'person':
          const personA = isCreatorView ? a.assignee : a.assigner;
          const personB = isCreatorView ? b.assignee : b.assigner;
          comparison = getTaskUserDisplayName(personA).localeCompare(getTaskUserDisplayName(personB));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assignments, sortField, sortDirection, isCreatorView]);

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

  if (assignments.length === 0) {
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
            <TableHead className="w-[35%]">
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
                onClick={() => handleSort('person')}
              >
                {isCreatorView ? 'Assignee' : 'Assigned by'}
                <SortIcon field="person" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">Attachments</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssignments.map((assignment) => {
            const task = assignment.task;
            if (!task) return null;

            const deadline = task.deadline ? new Date(task.deadline) : null;
            const daysUntil = getDaysUntilDeadline(task.deadline);
            const isOverdue = assignment.is_overdue || (daysUntil !== null && daysUntil < 0);
            const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

            const personToShow = isCreatorView ? assignment.assignee : assignment.assigner;
            const personName = getTaskUserDisplayName(personToShow);

            // Get role/job title for assigner
            const getPersonRole = () => {
              if (!personToShow || isCreatorView) return null;
              if (personToShow.job_title) {
                return personToShow.job_title;
              } else if (personToShow.role) {
                return personToShow.role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              }
              return null;
            };

            // Get department for assigner
            const getPersonDepartment = () => {
              if (!personToShow || isCreatorView) return null;
              return personToShow.department || null;
            };

            // Get organization for assigner
            const getPersonOrganization = () => {
              if (!personToShow || isCreatorView) return null;
              const org = personToShow.organization;
              if (!org) return null;
              return org.acronym ? `${org.name} (${org.acronym})` : org.name;
            };

            return (
              <TableRow
                key={assignment.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  isOverdue && 'bg-red-50/50',
                  isDueSoon && !isOverdue && 'bg-amber-50/50'
                )}
                onClick={() => onViewDetails?.(assignment)}
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
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(assignment.status))}>
                      {getStatusLabel(assignment.status)}
                    </Badge>
                    {isOverdue && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
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
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={personToShow?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {personName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="text-sm block">{personName}</span>
                      {getPersonRole() && (
                        <span className="text-xs text-muted-foreground block">
                          {getPersonRole()}
                        </span>
                      )}
                      {getPersonDepartment() && (
                        <span className="text-xs text-muted-foreground block">
                          {getPersonDepartment()}
                        </span>
                      )}
                      {getPersonOrganization() && (
                        <span className="text-xs text-muted-foreground block">
                          {getPersonOrganization()}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Attachments Column */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const attachments = (task as any).task_attachments || [];
                    if (attachments.length === 0) {
                      return <span className="text-muted-foreground text-xs">-</span>;
                    }
                    return (
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
                    );
                  })()}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <TaskActionMenu
                    assignment={assignment}
                    onStatusChange={onStatusChange ? (status) => onStatusChange(assignment.id, status) : undefined}
                    onReassign={onReassign ? () => onReassign(assignment) : undefined}
                    onShare={onShare ? () => onShare(assignment) : undefined}
                    onViewDetails={onViewDetails ? () => onViewDetails(assignment) : undefined}
                    onArchive={onArchive ? () => onArchive(assignment.id) : undefined}
                    onUnarchive={onUnarchive ? () => onUnarchive(assignment.id) : undefined}
                    isCreatorView={isCreatorView}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
