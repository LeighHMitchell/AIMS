"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, UpdateTaskRequest, TaskPriority, TaskAssignees } from '@/types/task';
import { cn } from '@/lib/utils';
import { UserPicker } from './UserPicker';

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  userId: string;
  onSubmit: (taskId: string, data: UpdateTaskRequest) => Promise<Task | null>;
  onDelete?: (taskId: string) => Promise<boolean>;
}

export function EditTaskModal({
  open,
  onOpenChange,
  task,
  userId,
  onSubmit,
  onDelete,
}: EditTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [reminderDays, setReminderDays] = useState(task.reminder_days || 3);
  const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignees>({
    user_ids: task.task_assignments?.map(a => a.assignee_id) || [],
    organization_ids: [],
    roles: [],
  });

  // Memoized handler for assignee changes
  const handleAssigneesChange = useCallback((newAssignees: TaskAssignees) => {
    setAssignees(newAssignees);
  }, []);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDeadline(task.deadline ? new Date(task.deadline) : undefined);
    setReminderDays(task.reminder_days || 3);
    setShowDeleteConfirm(false);
    setAssignees({
      user_ids: task.task_assignments?.map(a => a.assignee_id) || [],
      organization_ids: [],
      roles: [],
    });
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const totalAssignees =
      (assignees.user_ids?.length || 0) +
      (assignees.organization_ids?.length || 0) +
      (assignees.roles?.length || 0);

    if (totalAssignees === 0) return;

    setLoading(true);
    try {
      const data: UpdateTaskRequest = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        deadline: deadline?.toISOString() || null,
        reminder_days: reminderDays,
        assignees,
      };

      const result = await onSubmit(task.id, data);
      if (result) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('[EditTaskModal] Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAssignees =
    (assignees.user_ids?.length || 0) +
    (assignees.organization_ids?.length || 0) +
    (assignees.roles?.length || 0);

  const handleDelete = async () => {
    if (!onDelete) return;

    setDeleting(true);
    try {
      const success = await onDelete(task.id);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('[EditTaskModal] Delete error:', error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const clearDeadline = () => {
    setDeadline(undefined);
  };

  const canSubmit = title.trim() && totalAssignees > 0 && !loading && !deleting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="mx-0 mt-0 px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details and assignees.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail..."
              rows={3}
            />
          </div>

          {/* Priority, Deadline, and Reminder Row */}
          <div className="flex items-end gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="edit-priority" className="w-[120px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label>Deadline</Label>
              <div className="flex gap-1">
                <Popover open={deadlinePopoverOpen} onOpenChange={setDeadlinePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-[160px] justify-start text-left font-normal',
                        !deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, 'MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={(date) => {
                        setDeadline(date);
                        setDeadlinePopoverOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {deadline && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={clearDeadline}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Reminder Days */}
            {deadline && (
              <div className="space-y-2">
                <Label htmlFor="edit-reminderDays">Reminder</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={reminderDays.toString()}
                    onValueChange={(v) => setReminderDays(parseInt(v))}
                  >
                    <SelectTrigger id="edit-reminderDays" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="2">2 days before</SelectItem>
                      <SelectItem value="3">3 days before</SelectItem>
                      <SelectItem value="5">5 days before</SelectItem>
                      <SelectItem value="7">7 days before</SelectItem>
                      <SelectItem value="14">14 days before</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(deadline.getTime() - reminderDays * 24 * 60 * 60 * 1000), 'EEEE do MMMM yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assign To <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <UserPicker
              userId={userId}
              selectedAssignees={assignees}
              onSelectionChange={handleAssigneesChange}
              existingUsers={task.task_assignments
                ?.filter(a => a.assignee)
                .map(a => a.assignee!) || []}
            />
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && onDelete && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-sm text-red-800 font-medium">
                Are you sure you want to delete this task?
              </p>
              <p className="text-sm text-red-600">
                This will remove the task and all its assignments. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Yes, Delete Task
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2 sm:gap-0">
            {onDelete && !showDeleteConfirm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Task
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
