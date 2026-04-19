'use client';

import React, { useState } from 'react';
import { Bell, Mail, Calendar, Clock, CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WizardFormData } from '../useTaskWizard';

interface TaskDeliveryStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  errors: string[];
}

const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 5, label: '5 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
];

export function TaskDeliveryStep({
  formData,
  updateFormData,
  errors,
}: TaskDeliveryStepProps) {
  const hasError = errors.length > 0;
  const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false);

  const deadlineDate = formData.deadline ? new Date(formData.deadline) : undefined;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {hasError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-body">
          {errors[0]}
        </div>
      )}

      {/* Notification Methods */}
      <div className="space-y-4">
        <Label className="text-body font-medium">Notification Methods</Label>
        <p className="text-helper text-muted-foreground -mt-2">
          Choose how recipients will be notified about this task
        </p>

        {/* In-App Notifications */}
        <div
          className={cn(
            'flex items-center justify-between p-4 rounded-lg border transition-colors',
            formData.send_in_app ? 'border-primary bg-primary/5' : ''
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              formData.send_in_app ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-body">In-App Notifications</div>
              <div className="text-helper text-muted-foreground">
                Recipients will see the task in their notification bell
              </div>
            </div>
          </div>
          <Switch
            checked={formData.send_in_app}
            onCheckedChange={(checked) => updateFormData({ send_in_app: checked })}
          />
        </div>

        {/* Email Notifications */}
        <div
          className={cn(
            'flex items-center justify-between p-4 rounded-lg border transition-colors',
            formData.send_email ? 'border-primary bg-primary/5' : ''
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              formData.send_email ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-body">Email Notifications</div>
              <div className="text-helper text-muted-foreground">
                Send an email notification to all recipients
              </div>
            </div>
          </div>
          <Switch
            checked={formData.send_email}
            onCheckedChange={(checked) => updateFormData({ send_email: checked })}
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label className="text-body font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Deadline
        </Label>
        <Popover open={deadlinePopoverOpen} onOpenChange={setDeadlinePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-[220px] justify-start text-left font-normal',
                !deadlineDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadlineDate ? format(deadlineDate, 'MMM d, yyyy') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100]" align="start">
            <CalendarComponent
              mode="single"
              selected={deadlineDate}
              onSelect={(date) => {
                updateFormData({ deadline: date ? date.toISOString() : null });
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
        {deadlineDate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-helper text-muted-foreground"
            onClick={() => updateFormData({ deadline: null })}
          >
            Clear deadline
          </Button>
        )}
        <p className="text-helper text-muted-foreground">
          Optional. Set a due date for task completion.
        </p>
      </div>

      {/* Reminder */}
      {formData.deadline && (
        <div className="space-y-2">
          <Label className="text-body font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Reminder
          </Label>
          <Select
            value={String(formData.reminder_days)}
            onValueChange={(value) => updateFormData({ reminder_days: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reminder timing" />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-helper text-muted-foreground">
            A reminder notification will be sent to recipients who haven&apos;t completed the task
          </p>
        </div>
      )}

    </div>
  );
}
