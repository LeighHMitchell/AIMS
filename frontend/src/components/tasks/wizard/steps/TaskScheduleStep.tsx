'use client';

import React, { useState } from 'react';
import { Send, Clock, Repeat, Globe, CalendarDays } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WizardFormData } from '../useTaskWizard';
import { RecurrenceSelector } from '../RecurrenceSelector';
import { previewOccurrences, formatRecurrenceRule } from '@/lib/recurrence-utils';

interface TaskScheduleStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  errors: string[];
}

const DISPATCH_MODES = [
  {
    value: 'immediate' as const,
    label: 'Send Immediately',
    description: 'Task will be sent as soon as you submit',
    icon: Send,
  },
  {
    value: 'scheduled' as const,
    label: 'Schedule for Later',
    description: 'Choose a specific date and time to send',
    icon: Clock,
  },
  {
    value: 'recurring' as const,
    label: 'Set Up Recurring',
    description: 'Automatically repeat on a schedule',
    icon: Repeat,
  },
];

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Yangon', label: 'Myanmar (MMT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export function TaskScheduleStep({
  formData,
  updateFormData,
  errors,
}: TaskScheduleStepProps) {
  const hasError = errors.length > 0;
  const [showRecurrenceSelector, setShowRecurrenceSelector] = useState(false);

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

  // Get minimum scheduled time (now + 5 minutes)
  const getMinScheduledTime = () => {
    const min = new Date();
    min.setMinutes(min.getMinutes() + 5);
    return min.toISOString().slice(0, 16);
  };

  // Preview next occurrences for recurring
  const recurrencePreview = formData.recurrence
    ? previewOccurrences(formData.recurrence, 3)
    : [];

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {hasError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors[0]}
        </div>
      )}

      {/* Dispatch Mode Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">When should this task be sent?</Label>
        <div className="space-y-2">
          {DISPATCH_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = formData.dispatch_mode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  updateFormData({
                    dispatch_mode: mode.value,
                    scheduled_send_at: mode.value === 'scheduled' ? null : formData.scheduled_send_at,
                    recurrence: mode.value === 'recurring' ? formData.recurrence : null,
                  });
                }}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className={cn('font-medium', isSelected && 'text-primary')}>
                    {mode.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mode.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduled Date/Time */}
      {formData.dispatch_mode === 'scheduled' && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="scheduled_send_at" className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Send Date & Time
            </Label>
            <Input
              id="scheduled_send_at"
              type="datetime-local"
              value={formatDateTimeLocal(formData.scheduled_send_at)}
              onChange={(e) => updateFormData({ scheduled_send_at: parseDateTimeLocal(e.target.value) })}
              min={getMinScheduledTime()}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => updateFormData({ timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.scheduled_send_at && (
            <p className="text-sm text-muted-foreground">
              Task will be sent on{' '}
              <span className="font-medium text-foreground">
                {new Date(formData.scheduled_send_at).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Recurring Configuration */}
      {formData.dispatch_mode === 'recurring' && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          {formData.recurrence ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Recurrence Pattern</div>
                  <div className="text-sm text-muted-foreground">
                    {formatRecurrenceRule(formData.recurrence)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecurrenceSelector(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </button>
              </div>

              {recurrencePreview.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Next occurrences:
                  </div>
                  <ul className="text-sm space-y-1">
                    {recurrencePreview.map((date, i) => (
                      <li key={i} className="text-muted-foreground">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRecurrenceSelector(true)}
              className="w-full p-4 border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors"
            >
              <Repeat className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="font-medium text-sm">Configure Recurrence</div>
              <div className="text-xs text-muted-foreground">
                Set up a recurring schedule for this task
              </div>
            </button>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => updateFormData({ timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Recurrence Selector Modal */}
      <RecurrenceSelector
        open={showRecurrenceSelector}
        onOpenChange={setShowRecurrenceSelector}
        value={formData.recurrence}
        onChange={(recurrence) => updateFormData({ recurrence })}
      />
    </div>
  );
}
