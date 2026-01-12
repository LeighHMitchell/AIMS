'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  TaskPriority,
  TaskType,
  TaskLifecycleStatus,
  TargetScope,
  CreateRecurrenceRequest,
  TaskTemplate,
  TaskAssignees,
} from '@/types/task';

export type WizardStep =
  | 'details'
  | 'audience'
  | 'delivery'
  | 'schedule'
  | 'attachments'
  | 'review';

export interface WizardFormData {
  // Step 1: Details
  title: string;
  description: string;
  priority: TaskPriority;
  task_type: TaskType;

  // Step 2: Audience
  target_scope: TargetScope | null;
  assignees: TaskAssignees;

  // Step 3: Delivery
  send_in_app: boolean;
  send_email: boolean;
  deadline: string | null;
  reminder_days: number;

  // Step 4: Schedule
  dispatch_mode: 'immediate' | 'scheduled' | 'recurring';
  scheduled_send_at: string | null;
  timezone: string;
  recurrence: CreateRecurrenceRequest | null;

  // Step 5: Attachments
  attachments: File[];

  // Metadata
  template_id: string | null;
  entity_type: 'activity' | 'organization' | null;
  activity_id: string | null;
  organization_id: string | null;
}

const DEFAULT_FORM_DATA: WizardFormData = {
  title: '',
  description: '',
  priority: 'medium',
  task_type: 'information',
  target_scope: null,
  assignees: {
    user_ids: [],
    organization_ids: [],
    roles: [],
  },
  send_in_app: true,
  send_email: false,
  deadline: null,
  reminder_days: 3,
  dispatch_mode: 'immediate',
  scheduled_send_at: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  recurrence: null,
  attachments: [],
  template_id: null,
  entity_type: null,
  activity_id: null,
  organization_id: null,
};

const STEPS: WizardStep[] = ['details', 'audience', 'delivery', 'schedule', 'attachments', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  details: 'Task Details',
  audience: 'Audience',
  delivery: 'Delivery',
  schedule: 'Schedule',
  attachments: 'Attachments',
  review: 'Review',
};

export interface UseTaskWizardReturn {
  // Current state
  currentStep: WizardStep;
  currentStepIndex: number;
  formData: WizardFormData;
  steps: WizardStep[];
  stepLabels: Record<WizardStep, string>;

  // Navigation
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Form management
  updateFormData: (updates: Partial<WizardFormData>) => void;
  resetForm: () => void;
  applyTemplate: (template: TaskTemplate) => void;

  // Validation
  validateCurrentStep: () => string[];
  isStepValid: (step: WizardStep) => boolean;
  getStepErrors: (step: WizardStep) => string[];

  // Submission
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  getSubmissionData: () => any;
}

export function useTaskWizard(
  initialData?: Partial<WizardFormData>
): UseTaskWizardReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[currentStepIndex];

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    const index = STEPS.indexOf(step);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  // Form management
  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setCurrentStepIndex(0);
  }, []);

  const applyTemplate = useCallback((template: TaskTemplate) => {
    setFormData(prev => ({
      ...prev,
      title: template.default_title,
      description: template.default_body || '',
      priority: template.default_priority,
      task_type: template.default_task_type,
      send_in_app: template.default_send_in_app,
      send_email: template.default_send_email,
      reminder_days: template.default_reminder_days,
      target_scope: template.default_target_scope || null,
      template_id: template.id,
    }));
  }, []);

  // Validation
  const getStepErrors = useCallback((step: WizardStep): string[] => {
    const errors: string[] = [];

    switch (step) {
      case 'details':
        if (!formData.title.trim()) {
          errors.push('Title is required');
        }
        if (formData.title.length > 200) {
          errors.push('Title must be less than 200 characters');
        }
        break;

      case 'audience':
        const hasAssignees =
          (formData.assignees.user_ids?.length || 0) > 0 ||
          (formData.assignees.organization_ids?.length || 0) > 0 ||
          (formData.assignees.roles?.length || 0) > 0;
        if (!hasAssignees) {
          errors.push('At least one recipient is required');
        }
        break;

      case 'delivery':
        if (!formData.send_in_app && !formData.send_email) {
          errors.push('At least one delivery method must be selected');
        }
        break;

      case 'schedule':
        if (formData.dispatch_mode === 'scheduled') {
          if (!formData.scheduled_send_at) {
            errors.push('Scheduled date/time is required');
          } else {
            const scheduledDate = new Date(formData.scheduled_send_at);
            if (scheduledDate <= new Date()) {
              errors.push('Scheduled time must be in the future');
            }
          }
        }
        if (formData.dispatch_mode === 'recurring') {
          if (!formData.recurrence) {
            errors.push('Recurrence settings are required');
          }
        }
        break;

      case 'attachments':
        // Attachments are optional, no validation needed
        break;

      case 'review':
        // Aggregate all errors
        for (const s of STEPS.slice(0, -1)) {
          errors.push(...getStepErrors(s));
        }
        break;
    }

    return errors;
  }, [formData]);

  const validateCurrentStep = useCallback(() => {
    return getStepErrors(currentStep);
  }, [currentStep, getStepErrors]);

  const isStepValid = useCallback((step: WizardStep) => {
    return getStepErrors(step).length === 0;
  }, [getStepErrors]);

  // Computed values
  const canGoNext = useMemo(() => {
    return currentStepIndex < STEPS.length - 1 && isStepValid(currentStep);
  }, [currentStepIndex, currentStep, isStepValid]);

  const canGoPrev = currentStepIndex > 0;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Build submission data
  const getSubmissionData = useCallback(() => {
    // Determine task status based on dispatch mode
    let status: TaskLifecycleStatus = 'sent';
    if (formData.dispatch_mode === 'scheduled') {
      status = 'scheduled';
    } else if (formData.dispatch_mode === 'recurring') {
      status = 'sent'; // First instance sends immediately
    }

    return {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      task_type: formData.task_type,
      deadline: formData.deadline || undefined,
      reminder_days: formData.reminder_days,
      entity_type: formData.entity_type || undefined,
      activity_id: formData.activity_id || undefined,
      organization_id: formData.organization_id || undefined,
      assignees: formData.assignees,
      status,
      send_in_app: formData.send_in_app,
      send_email: formData.send_email,
      scheduled_send_at: formData.dispatch_mode === 'scheduled' ? formData.scheduled_send_at : undefined,
      timezone: formData.timezone,
      template_id: formData.template_id || undefined,
      target_scope: formData.target_scope || undefined,
      recurrence: formData.dispatch_mode === 'recurring' ? formData.recurrence : undefined,
    };
  }, [formData]);

  return {
    currentStep,
    currentStepIndex,
    formData,
    steps: STEPS,
    stepLabels: STEP_LABELS,
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    updateFormData,
    resetForm,
    applyTemplate,
    validateCurrentStep,
    isStepValid,
    getStepErrors,
    isSubmitting,
    setIsSubmitting,
    getSubmissionData,
  };
}
