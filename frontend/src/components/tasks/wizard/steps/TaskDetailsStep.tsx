'use client';

import { RequiredDot } from "@/components/ui/required-dot";
import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WizardFormData } from '../useTaskWizard';
import type { TaskPriority, TaskType } from '@/types/task';

interface TaskDetailsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  errors: string[];
}

const TASK_TYPES: { value: TaskType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'information',
    label: 'Information',
    description: 'General information or updates',
    icon: Info,
  },
  {
    value: 'reporting',
    label: 'Reporting',
    description: 'Request for data submission',
    icon: FileText,
  },
  {
    value: 'validation',
    label: 'Validation',
    description: 'Review and approval needed',
    icon: CheckCircle,
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Mandatory compliance task',
    icon: AlertTriangle,
  },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-destructive bg-destructive/10 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'low', label: 'Low', color: 'text-muted-foreground bg-muted border-border' },
];

export function TaskDetailsStep({
  formData,
  updateFormData,
  errors,
}: TaskDetailsStepProps) {
  const hasError = (field: string) => errors.some(e => e.toLowerCase().includes(field.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
          Task Title <RequiredDot />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-[200px]">A descriptive title helps recipients understand the task quickly</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="Enter a clear, actionable title"
          className={cn(hasError('title') && 'border-destructive')}
          maxLength={200}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{hasError('title') ? errors.find(e => e.toLowerCase().includes('title')) : ''}</span>
          <span>{formData.title.length}/200</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1">
          Description
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-[200px]">Include any relevant details, deadlines context, or specific requirements</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Provide detailed instructions or context for the task..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Task Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Task Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {TASK_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.task_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ task_type: type.value })}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <Icon className={cn('h-5 w-5 mt-0.5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <div className={cn('font-medium text-sm', isSelected && 'text-primary')}>
                    {type.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {type.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          Priority
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-[200px]">High priority tasks appear prominently in recipient inboxes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex gap-2">
          {PRIORITIES.map((priority) => {
            const isSelected = formData.priority === priority.value;
            return (
              <button
                key={priority.value}
                type="button"
                onClick={() => updateFormData({ priority: priority.value })}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all',
                  isSelected ? priority.color : 'border-muted text-muted-foreground hover:border-muted-foreground/30'
                )}
              >
                {priority.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
