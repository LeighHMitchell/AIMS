'use client';

import React from 'react';
import {
  FileText,
  Users,
  Bell,
  Mail,
  Calendar,
  Clock,
  Repeat,
  Paperclip,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WizardFormData, WizardStep } from '../useTaskWizard';
import {
  getTaskTypeLabel,
  getTaskTypeColor,
  getPriorityLabel,
  getPriorityColor,
} from '@/types/task';
import { formatRecurrenceRule } from '@/lib/recurrence-utils';
import { formatFileSize } from '@/hooks/useTaskAttachments';

interface TaskReviewStepProps {
  formData: WizardFormData;
  errors: string[];
  goToStep: (step: WizardStep) => void;
}

interface ReviewSectionProps {
  title: string;
  icon: React.ElementType;
  step: WizardStep;
  onEdit: () => void;
  children: React.ReactNode;
}

function ReviewSection({ title, icon: Icon, onEdit, children }: ReviewSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 px-2 text-xs"
        >
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function TaskReviewStep({ formData, errors, goToStep }: TaskReviewStepProps) {
  const hasErrors = errors.length > 0;

  const totalRecipients =
    (formData.assignees.user_ids?.length || 0) +
    (formData.assignees.organization_ids?.length || 0) +
    (formData.assignees.roles?.length || 0);

  return (
    <div className="space-y-4">
      {/* Error Summary */}
      {hasErrors && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive">Please fix the following issues:</h4>
              <ul className="mt-2 text-sm text-destructive space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Section */}
      <ReviewSection title="Task Details" icon={FileText} step="details" onEdit={() => goToStep('details')}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Title</div>
            <div className="font-medium">{formData.title || <span className="text-destructive">Not set</span>}</div>
          </div>
          {formData.description && (
            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{formData.description}</div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <Badge variant="outline" className={cn('mt-1', getTaskTypeColor(formData.task_type))}>
                {getTaskTypeLabel(formData.task_type)}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Priority</div>
              <Badge variant="outline" className={cn('mt-1', getPriorityColor(formData.priority))}>
                {getPriorityLabel(formData.priority)}
              </Badge>
            </div>
          </div>
        </div>
      </ReviewSection>

      {/* Recipients Section */}
      <ReviewSection title="Recipients" icon={Users} step="audience" onEdit={() => goToStep('audience')}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Recipients</span>
            <Badge variant="secondary">
              {totalRecipients === 0 ? (
                <span className="text-destructive">None selected</span>
              ) : (
                `${totalRecipients} selected`
              )}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {(formData.assignees.user_ids?.length || 0) > 0 && (
              <div>{formData.assignees.user_ids!.length} individual user(s)</div>
            )}
            {(formData.assignees.organization_ids?.length || 0) > 0 && (
              <div>{formData.assignees.organization_ids!.length} organization(s)</div>
            )}
            {(formData.assignees.roles?.length || 0) > 0 && (
              <div>{formData.assignees.roles!.length} role(s)</div>
            )}
          </div>
        </div>
      </ReviewSection>

      {/* Delivery Section */}
      <ReviewSection title="Delivery" icon={Bell} step="delivery" onEdit={() => goToStep('delivery')}>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bell className={cn('h-4 w-4', formData.send_in_app ? 'text-green-600' : 'text-muted-foreground')} />
              <span className="text-sm">In-App: {formData.send_in_app ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className={cn('h-4 w-4', formData.send_email ? 'text-green-600' : 'text-muted-foreground')} />
              <span className="text-sm">Email: {formData.send_email ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {formData.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span>Deadline: {new Date(formData.deadline).toLocaleDateString()}</span>
            </div>
          )}
          {formData.deadline && (
            <div className="text-xs text-muted-foreground">
              Reminder: {formData.reminder_days} day(s) before deadline
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Schedule Section */}
      <ReviewSection title="Schedule" icon={Clock} step="schedule" onEdit={() => goToStep('schedule')}>
        <div className="space-y-2">
          {formData.dispatch_mode === 'immediate' && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Send immediately when submitted</span>
            </div>
          )}
          {formData.dispatch_mode === 'scheduled' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>
                  Scheduled for:{' '}
                  {formData.scheduled_send_at
                    ? new Date(formData.scheduled_send_at).toLocaleString()
                    : <span className="text-destructive">Not set</span>}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Timezone: {formData.timezone}
              </div>
            </div>
          )}
          {formData.dispatch_mode === 'recurring' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Repeat className="h-4 w-4 text-purple-600" />
                <span>
                  {formData.recurrence
                    ? formatRecurrenceRule(formData.recurrence)
                    : <span className="text-destructive">Recurrence not configured</span>}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Timezone: {formData.timezone}
              </div>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Attachments Section */}
      <ReviewSection title="Attachments" icon={Paperclip} step="attachments" onEdit={() => goToStep('attachments')}>
        {formData.attachments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No attachments</div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">{formData.attachments.length} file(s) attached</div>
            <div className="flex flex-wrap gap-2">
              {formData.attachments.map((file, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {file.name} ({formatFileSize(file.size)})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ReviewSection>

      {/* Ready to Submit */}
      {!hasErrors && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium text-sm">Ready to create task</span>
          </div>
          <p className="text-xs mt-1 text-green-700">
            Review the details above and click &quot;Create Task&quot; to proceed.
          </p>
        </div>
      )}
    </div>
  );
}
