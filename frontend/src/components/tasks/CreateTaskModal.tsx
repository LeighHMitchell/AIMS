"use client";

import React, { useState, useCallback } from 'react';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { UserPicker } from './UserPicker';
import type { CreateTaskRequest, TaskPriority, TaskAssignees } from '@/types/task';
import { cn } from '@/lib/utils';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSubmit: (data: CreateTaskRequest) => Promise<void>;
  defaultActivityId?: string;
  defaultOrganizationId?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  userId,
  onSubmit,
  defaultActivityId,
  defaultOrganizationId,
}: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [reminderDays, setReminderDays] = useState(3);
  const [assignees, setAssignees] = useState<TaskAssignees>({
    user_ids: [],
    organization_ids: [],
    roles: [],
  });
  const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false);

  // Memoized handler for assignee changes
  const handleAssigneesChange = useCallback((newAssignees: TaskAssignees) => {
    setAssignees(newAssignees);
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDeadline(undefined);
    setReminderDays(3);
    setAssignees({ user_ids: [], organization_ids: [], roles: [] });
    setDeadlinePopoverOpen(false);
  };

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
      const data: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        deadline: deadline?.toISOString(),
        reminder_days: reminderDays,
        assignees,
      };

      console.log('[CreateTaskModal] Submitting task with assignees:', JSON.stringify(assignees, null, 2));

      // Add entity link if provided
      if (defaultActivityId) {
        data.entity_type = 'activity';
        data.activity_id = defaultActivityId;
      } else if (defaultOrganizationId) {
        data.entity_type = 'organization';
        data.organization_id = defaultOrganizationId;
      }

      await onSubmit(data);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('[CreateTaskModal] Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAssignees =
    (assignees.user_ids?.length || 0) +
    (assignees.organization_ids?.length || 0) +
    (assignees.roles?.length || 0);

  const canSubmit = title.trim() && totalAssignees > 0 && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a task and assign it to users. They will be notified and can track the task in their dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              tabIndex={1}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              tabIndex={2}
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
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="priority" tabIndex={3} className="w-[120px]">
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
              <Popover open={deadlinePopoverOpen} onOpenChange={setDeadlinePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    tabIndex={4}
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
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reminder Days */}
            {deadline && (
              <div className="space-y-2">
                <Label htmlFor="reminderDays">Reminder</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={reminderDays.toString()}
                    onValueChange={(v) => setReminderDays(parseInt(v))}
                  >
                    <SelectTrigger id="reminderDays" className="w-[140px]" tabIndex={5}>
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
            <Label>Assign To *</Label>
            <UserPicker
              userId={userId}
              selectedAssignees={assignees}
              onSelectionChange={handleAssigneesChange}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
