'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  FileText,
  Building2,
  AlertTriangle,
  User,
  Paperclip,
  History,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Bell,
  RefreshCw,
  Users,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { TaskHistoryTimeline } from './TaskHistoryTimeline';
import type { Task, TaskAssignment, TaskAttachment, TaskAssignmentHistory } from '@/types/task';
import {
  getPriorityLabel,
  getPriorityColor,
  getStatusLabel,
  getStatusColor,
  getTaskUserDisplayName,
  getDaysUntilDeadline,
} from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  assignmentId?: string | null;
  userId: string;
}

interface TaskDetailData {
  task: Task;
  assignments: TaskAssignment[];
  history: TaskAssignmentHistory[];
  attachments: TaskAttachment[];
}

export function TaskDetailModal({
  open,
  onOpenChange,
  taskId,
  assignmentId,
  userId,
}: TaskDetailModalProps) {
  const [data, setData] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else {
      setData(null);
      setActiveTab('details');
    }
  }, [open, taskId]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch task details
      const taskResponse = await fetch(`/api/tasks/${taskId}?userId=${userId}`);
      if (!taskResponse.ok) {
        throw new Error('Failed to fetch task details');
      }
      const taskData = await taskResponse.json();

      // Fetch attachments
      let attachments: TaskAttachment[] = [];
      try {
        const attachmentsResponse = await fetch(`/api/tasks/${taskId}/attachments?userId=${userId}`);
        if (attachmentsResponse.ok) {
          const attachmentsData = await attachmentsResponse.json();
          attachments = attachmentsData.data || [];
        }
      } catch (err) {
        console.error('Failed to fetch attachments:', err);
      }

      setData({
        task: taskData.data,
        assignments: taskData.assignments || [],
        history: taskData.history || [],
        attachments,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load task';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }
    if (fileType.includes('zip') || fileType.includes('archive')) {
      return <FileArchive className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachment.id}?userId=${userId}`
      );
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (!open) return null;

  const task = data?.task;
  const assignments = data?.assignments || [];
  const history = data?.history || [];
  const attachments = data?.attachments || [];

  const deadline = task?.deadline ? new Date(task.deadline) : null;
  const daysUntil = getDaysUntilDeadline(task?.deadline);
  const isOverdue = daysUntil !== null && daysUntil < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchTaskDetails}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : task ? (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    {task.task_type && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {task.task_type}
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-xl">{task.title}</DialogTitle>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                  )}
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <div className="px-6">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="details" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="assignees" className="gap-2">
                    <Users className="h-4 w-4" />
                    Assignees ({assignments.length})
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({attachments.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
                <div className="p-6 pt-4">
                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-0 space-y-6">
                    {/* Key Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Calendar className="h-4 w-4" />
                            Deadline
                          </div>
                          <p className={cn(
                            'font-medium',
                            isOverdue && 'text-red-600'
                          )}>
                            {deadline ? format(deadline, 'PPP') : 'No deadline'}
                          </p>
                          {daysUntil !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {isOverdue
                                ? `${Math.abs(daysUntil)} days overdue`
                                : daysUntil === 0
                                ? 'Due today'
                                : `${daysUntil} days remaining`}
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <User className="h-4 w-4" />
                            Created by
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.creator?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getTaskUserDisplayName(task.creator).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{getTaskUserDisplayName(task.creator)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.created_at && formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Delivery Settings */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Delivery Settings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Bell className={cn(
                              'h-4 w-4',
                              task.send_in_app ? 'text-green-600' : 'text-muted-foreground'
                            )} />
                            <span className="text-sm">
                              In-app: {task.send_in_app ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className={cn(
                              'h-4 w-4',
                              task.send_email ? 'text-green-600' : 'text-muted-foreground'
                            )} />
                            <span className="text-sm">
                              Email: {task.send_email ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          {task.reminder_days > 0 && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                Reminder: {task.reminder_days} days before
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Linked Entity */}
                    {task.entity_type && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Linked To</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            {task.entity_type === 'activity' && task.activity && (
                              <>
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span>{task.activity.title_narrative || task.activity.iati_identifier}</span>
                              </>
                            )}
                            {task.entity_type === 'organization' && task.linked_organization && (
                              <>
                                <Building2 className="h-4 w-4 text-purple-500" />
                                <span>{task.linked_organization.name}</span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Assignees Tab */}
                  <TabsContent value="assignees" className="mt-0">
                    {assignments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No assignees yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignments.map((assignment) => {
                          const assigneeName = getTaskUserDisplayName(assignment.assignee);
                          return (
                            <Card key={assignment.id}>
                              <CardContent className="py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={assignment.assignee?.avatar_url || undefined} />
                                      <AvatarFallback>
                                        {assigneeName.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{assigneeName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {assignment.assignee?.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge
                                      variant="outline"
                                      className={cn('text-xs', getStatusColor(assignment.status))}
                                    >
                                      {getStatusLabel(assignment.status)}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {assignment.completed_at
                                        ? `Completed ${formatDistanceToNow(new Date(assignment.completed_at), { addSuffix: true })}`
                                        : `Assigned ${formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })}`}
                                    </p>
                                  </div>
                                </div>
                                {(assignment.completion_note || assignment.declined_reason) && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm text-muted-foreground">
                                      {assignment.completion_note || assignment.declined_reason}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Attachments Tab */}
                  <TabsContent value="attachments" className="mt-0">
                    {attachments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attachments</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <Card key={attachment.id} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-muted rounded">
                                    {getFileIcon(attachment.file_type)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{attachment.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(attachment.file_size)} &bull;{' '}
                                      {attachment.uploaded_at &&
                                        formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(attachment)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-0">
                    <TaskHistoryTimeline history={history} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
