'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import type { TaskUser, TaskOrganization } from '@/types/task';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTaskWizard, WizardStep, WizardFormData } from './useTaskWizard';
import { TaskDetailsStep } from './steps/TaskDetailsStep';
import { TaskAudienceStep } from './steps/TaskAudienceStep';
import { TaskDeliveryStep } from './steps/TaskDeliveryStep';
import { TaskScheduleStep } from './steps/TaskScheduleStep';
import { TaskAttachmentsStep } from './steps/TaskAttachmentsStep';
import { TaskReviewStep } from './steps/TaskReviewStep';
import { apiFetch } from '@/lib/api-fetch';

interface TaskCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any, attachments: File[]) => Promise<void>;
  initialData?: Partial<WizardFormData>;
  userId?: string;
  // Context for linking task to entity
  entityType?: 'activity' | 'organization';
  activityId?: string;
  organizationId?: string;
}

export function TaskCreationWizard({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  userId,
  entityType,
  activityId,
  organizationId,
}: TaskCreationWizardProps) {
  const wizard = useTaskWizard({
    ...initialData,
    entity_type: entityType || null,
    activity_id: activityId || null,
    organization_id: organizationId || null,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fetch users and organizations in background as soon as wizard opens
  const [taskableUsers, setTaskableUsers] = useState<TaskUser[]>([]);
  const [taskableOrgs, setTaskableOrgs] = useState<TaskOrganization[]>([]);
  const [orgMemberCounts, setOrgMemberCounts] = useState<Record<string, number>>({});
  const [taskableLoading, setTaskableLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setTaskableLoading(true);
      apiFetch(`/api/users/taskable?userId=${userId}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
        .then(data => {
          setTaskableUsers(data.users || []);
          setTaskableOrgs(data.organizations || []);
          setOrgMemberCounts(data.orgMemberCounts || {});
        })
        .catch(err => {
          console.error('Failed to fetch taskable users:', err);
        })
        .finally(() => {
          setTaskableLoading(false);
        });
    }
  }, [open, userId]);

  const handleSubmit = async () => {
    const errors = wizard.getStepErrors('review');
    if (errors.length > 0) {
      setSubmitError(errors[0]);
      return;
    }

    wizard.setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = wizard.getSubmissionData();
      await onSubmit(data, wizard.formData.attachments);
      wizard.resetForm();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setSubmitError(message);
    } finally {
      wizard.setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!wizard.isSubmitting) {
      wizard.resetForm();
      onOpenChange(false);
    }
  };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'details':
        return (
          <TaskDetailsStep
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            errors={wizard.getStepErrors('details')}
          />
        );
      case 'audience':
        return (
          <TaskAudienceStep
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            errors={wizard.getStepErrors('audience')}
            users={taskableUsers}
            organizations={taskableOrgs}
            orgMemberCounts={orgMemberCounts}
            isLoading={taskableLoading}
          />
        );
      case 'delivery':
        return (
          <TaskDeliveryStep
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            errors={wizard.getStepErrors('delivery')}
          />
        );
      case 'schedule':
        return (
          <TaskScheduleStep
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            errors={wizard.getStepErrors('schedule')}
          />
        );
      case 'attachments':
        return (
          <TaskAttachmentsStep
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
          />
        );
      case 'review':
        return (
          <TaskReviewStep
            formData={wizard.formData}
            errors={wizard.getStepErrors('review')}
            goToStep={wizard.goToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Create Task</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={wizard.isSubmitting}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex-shrink-0 px-1 py-4">
          <div className="flex items-center justify-between">
            {wizard.steps.map((step, index) => {
              const isActive = index === wizard.currentStepIndex;
              const isCompleted = index < wizard.currentStepIndex;
              const isValid = wizard.isStepValid(step);

              return (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={() => wizard.goToStep(step)}
                    disabled={wizard.isSubmitting}
                    className={cn(
                      'flex flex-col items-center gap-1 transition-colors',
                      isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground',
                      !wizard.isSubmitting && 'hover:text-primary cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-muted-foreground/30 bg-background'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">
                      {wizard.stepLabels[step]}
                    </span>
                  </button>
                  {index < wizard.steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        index < wizard.currentStepIndex ? 'bg-green-600' : 'bg-muted'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1 py-4 min-h-[300px]">
          {renderStep()}
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="flex-shrink-0 px-1 py-2">
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {submitError}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={wizard.prevStep}
            disabled={wizard.isFirstStep || wizard.isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {wizard.isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={wizard.isSubmitting || wizard.getStepErrors('review').length > 0}
              >
                {wizard.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            ) : (
              <Button
                onClick={wizard.nextStep}
                disabled={!wizard.canGoNext || wizard.isSubmitting}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
