"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Building2,
  AlertTriangle,
  Mail,
  Bell,
  Repeat,
  Download,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TaskActionMenu } from './TaskActionMenu';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
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
      toast.error('You must be logged in to download attachments');
      return;
    }

    console.log('[Download] Fetching signed URL for:', { taskId, attachmentId, fileName });

    // Get signed URL from API
    const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}?userId=${userId}`);
    const data = await response.json();

    console.log('[Download] API response:', data);

    if (!response.ok) {
      console.error('[Download] API error:', data.error);
      toast.error(`Download failed: ${data.error || 'Unknown error'}`);
      return;
    }

    if (!data.success || !data.data?.download_url) {
      console.error('[Download] No download URL in response');
      toast.error('Failed to get download URL');
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
    toast.error('Failed to download attachment. Please try again.');
  }
}

interface TaskCardProps {
  assignment: TaskAssignment;
  onStatusChange?: (status: TaskStatus) => void;
  onReassign?: () => void;
  onShare?: () => void;
  onViewDetails?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  showCreator?: boolean;
  isCreatorView?: boolean;
}

export function TaskCard({
  assignment,
  onStatusChange,
  onReassign,
  onShare,
  onViewDetails,
  onArchive,
  onUnarchive,
  onDelete,
  showCreator = true,
  isCreatorView = false,
}: TaskCardProps) {
  const task = assignment.task;
  if (!task) return null;

  const deadline = task.deadline ? new Date(task.deadline) : null;
  const daysUntil = getDaysUntilDeadline(task.deadline);
  const isOverdue = assignment.is_overdue || (daysUntil !== null && daysUntil < 0);
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  const priorityClasses = getPriorityColor(task.priority);
  const statusClasses = getStatusColor(assignment.status);

  const getDeadlineText = () => {
    if (!deadline) return null;
    if (isOverdue) {
      return `Overdue by ${Math.abs(daysUntil || 0)} day${Math.abs(daysUntil || 0) !== 1 ? 's' : ''}`;
    }
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (isDueSoon) return `Due in ${daysUntil} days`;
    return `Due ${format(deadline, 'MMM d, yyyy')}`;
  };

  const creatorName = getTaskUserDisplayName(task.creator);
  const assigneeName = getTaskUserDisplayName(assignment.assignee);
  const assignerName = getTaskUserDisplayName(assignment.assigner);

  // Get assigner's role/job title
  const getAssignerRole = () => {
    if (assignment.assigner?.job_title) {
      return assignment.assigner.job_title;
    } else if (assignment.assigner?.role) {
      // Format role nicely (e.g., "super_user" -> "Super User")
      return assignment.assigner.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return null;
  };

  // Get assigner's department
  const getAssignerDepartment = () => {
    return assignment.assigner?.department || null;
  };

  // Get assigner's organization
  const getAssignerOrganization = () => {
    const org = assignment.assigner?.organization;
    if (!org) return null;
    return org.acronym ? `${org.name} (${org.acronym})` : org.name;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on action menu or buttons
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
    onViewDetails?.();
  };

  // Check for delivery indicators
  const hasEmail = task.send_email;
  const hasInApp = task.send_in_app;
  const hasRecurrence = !!task.recurrence_id;
  // Support both task.attachments and task.task_attachments (API returns task_attachments)
  const attachments = (task as any).task_attachments || task.attachments || [];
  const hasAttachments = attachments.length > 0;

  return (
    <Card
      className={cn(
        'relative transition-all hover:shadow-md',
        isOverdue && 'border-red-300 bg-red-50/30',
        isDueSoon && !isOverdue && 'border-amber-300 bg-amber-50/30',
        onViewDetails && 'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={cn('text-xs', priorityClasses)}>
                {getPriorityLabel(task.priority)}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', statusClasses)}>
                {getStatusLabel(assignment.status)}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {/* Attachment indicator in header - clickable to download */}
              {hasAttachments && (
                <div className="flex items-center gap-1">
                  {attachments.slice(0, 3).map((attachment: any) => {
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
                                'h-6 w-6 rounded border flex items-center justify-center hover:bg-accent transition-colors cursor-pointer',
                                getFileColor(attachment.file_type)
                              )}
                            >
                              <FileIcon className="h-3.5 w-3.5" />
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
                  {attachments.length > 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-6 w-6 rounded bg-muted border border-muted-foreground/20 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                            +{attachments.length - 3}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="text-xs">
                            <p className="font-medium mb-1">{attachments.length - 3} more attachment{attachments.length - 3 !== 1 ? 's' : ''}</p>
                            <ul className="space-y-0.5">
                              {attachments.slice(3).map((a: any) => (
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
            </div>
            <h3 className="font-semibold text-base line-clamp-2">{task.title}</h3>
          </div>

          <TaskActionMenu
            assignment={assignment}
            onStatusChange={onStatusChange}
            onReassign={onReassign}
            onShare={onShare}
            onViewDetails={onViewDetails}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
            isCreatorView={isCreatorView}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Entity Link */}
        {task.entity_type && (
          <div className="flex items-center gap-2 text-sm">
            {task.entity_type === 'activity' && task.activity && (
              <>
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground truncate">
                  {task.activity.title_narrative || task.activity.iati_identifier}
                </span>
              </>
            )}
            {task.entity_type === 'organization' && task.linked_organization && (
              <>
                <Building2 className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground truncate">
                  {task.linked_organization.name}
                </span>
              </>
            )}
          </div>
        )}

        {/* Deadline */}
        {deadline && (
          <div className={cn(
            'flex items-center gap-2 text-sm',
            isOverdue && 'text-[#DC2625] font-medium',
            isDueSoon && !isOverdue && 'text-[#DC2625] font-medium'
          )}>
            <Calendar className="h-4 w-4" />
            <span>{getDeadlineText()}</span>
          </div>
        )}

        {/* Feature Indicators (email, in-app, recurrence) */}
        {(hasEmail || hasInApp || hasRecurrence) && (
          <div className="flex items-center gap-3 text-muted-foreground">
            {hasEmail && (
              <div className="flex items-center gap-1 text-xs" title="Email notifications enabled">
                <Mail className="h-3.5 w-3.5" />
              </div>
            )}
            {hasInApp && (
              <div className="flex items-center gap-1 text-xs" title="In-app notifications enabled">
                <Bell className="h-3.5 w-3.5" />
              </div>
            )}
            {hasRecurrence && (
              <div className="flex items-center gap-1 text-xs" title="Recurring task">
                <Repeat className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        )}

        {/* Assigner / Assignee Info */}
        <div className="flex items-center justify-between pt-2 border-t">
          {showCreator && assignment.assigner && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={assignment.assigner.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {assignerName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground block">
                  Assigned by {assignerName}
                </span>
                {getAssignerRole() && (
                  <span className="text-xs text-muted-foreground/70 block">
                    {getAssignerRole()}
                  </span>
                )}
                {getAssignerDepartment() && (
                  <span className="text-xs text-muted-foreground/70 block">
                    {getAssignerDepartment()}
                  </span>
                )}
                {getAssignerOrganization() && (
                  <span className="text-xs text-muted-foreground/70 block">
                    {getAssignerOrganization()}
                  </span>
                )}
              </div>
            </div>
          )}

          {isCreatorView && assignment.assignee && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={assignment.assignee.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {assigneeName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                Assigned to {assigneeName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Completion Note */}
        {assignment.completion_note && (
          <div className="bg-muted/50 rounded p-2 text-sm">
            <span className="text-muted-foreground">Note: </span>
            {assignment.completion_note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
