'use client';

import React from 'react';
import { Bell, Mail, Calendar, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  // Format date for datetime-local input
  const formatDateTimeLocal = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  // Parse datetime-local to ISO string
  const parseDateTimeLocal = (value: string): string | null => {
    if (!value) return null;
    return new Date(value).toISOString();
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {hasError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors[0]}
        </div>
      )}

      {/* Notification Methods */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Notification Methods</Label>
        <p className="text-xs text-muted-foreground -mt-2">
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
              <div className="font-medium text-sm">In-App Notifications</div>
              <div className="text-xs text-muted-foreground">
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
              <div className="font-medium text-sm">Email Notifications</div>
              <div className="text-xs text-muted-foreground">
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
        <Label htmlFor="deadline" className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Deadline
        </Label>
        <Input
          id="deadline"
          type="datetime-local"
          value={formatDateTimeLocal(formData.deadline)}
          onChange={(e) => updateFormData({ deadline: parseDateTimeLocal(e.target.value) })}
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Set a due date for task completion.
        </p>
      </div>

      {/* Reminder */}
      {formData.deadline && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
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
          <p className="text-xs text-muted-foreground">
            A reminder notification will be sent to recipients who haven&apos;t completed the task
          </p>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h4 className="text-sm font-medium mb-2">Delivery Summary</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <Bell className={cn('h-4 w-4', formData.send_in_app ? 'text-green-600' : 'text-muted-foreground/50')} />
            In-app: {formData.send_in_app ? 'Enabled' : 'Disabled'}
          </li>
          <li className="flex items-center gap-2">
            <Mail className={cn('h-4 w-4', formData.send_email ? 'text-green-600' : 'text-muted-foreground/50')} />
            Email: {formData.send_email ? 'Enabled' : 'Disabled'}
          </li>
          {formData.deadline && (
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Due: {new Date(formData.deadline).toLocaleDateString()}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
