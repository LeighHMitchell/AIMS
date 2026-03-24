'use client';

import React from 'react';
import { Check, Lock, Settings, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface WizardStep {
  id: string;
  label: string;
  type: 'config' | 'stage' | 'endorsement';
  progress?: {
    completed: number;
    not_required: number;
    not_completed: number;
    total: number;
    percentage: number;
  };
}

interface ReadinessProgressRailProps {
  steps: WizardStep[];
  activeStep: number;
  onStepClick: (index: number) => void;
  canNavigateToStep: (index: number) => boolean;
  isStepComplete: (index: number) => boolean;
}

export function ReadinessProgressRail({
  steps,
  activeStep,
  onStepClick,
  canNavigateToStep,
  isStepComplete,
}: ReadinessProgressRailProps) {
  return (
    <nav className="w-[240px] shrink-0">
      <div className="sticky top-0">
        {steps.map((step, idx) => {
          const completed = isStepComplete(idx);
          const isCurrent = idx === activeStep;
          const clickable = canNavigateToStep(idx);
          const isLast = idx === steps.length - 1;
          const hasProgress = step.type === 'stage' && step.progress && step.progress.total > 0;

          return (
            <div key={step.id} className="flex gap-3" style={{ minHeight: isLast ? undefined : '60px' }}>
              {/* Circle + connector column */}
              <div className="flex flex-col items-center shrink-0">
                <button
                  onClick={() => clickable && onStepClick(idx)}
                  disabled={!clickable}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                    completed && 'bg-foreground border-foreground text-background',
                    isCurrent && !completed && 'border-muted-foreground bg-muted text-foreground',
                    !completed && !isCurrent && 'border-border bg-background text-muted-foreground/60',
                    clickable && 'cursor-pointer hover:scale-110',
                    !clickable && 'cursor-default',
                  )}
                >
                  {completed ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : !clickable && !isCurrent ? (
                    <Lock className="h-3 w-3" />
                  ) : step.type === 'config' ? (
                    <Settings className="h-3 w-3" />
                  ) : step.type === 'endorsement' ? (
                    <FileCheck className="h-3 w-3" />
                  ) : (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isCurrent ? 'bg-muted-foreground' : 'bg-border',
                      )}
                    />
                  )}
                </button>
                {/* Connector line - stretches to fill remaining height */}
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 transition-colors',
                      completed ? 'bg-muted-foreground' : 'bg-border',
                    )}
                  />
                )}
              </div>

              {/* Label + progress */}
              <button
                onClick={() => clickable && onStepClick(idx)}
                disabled={!clickable}
                className={cn(
                  'text-sm pt-1 text-left transition-colors min-w-0 pb-3',
                  isCurrent && 'font-semibold text-foreground',
                  completed && !isCurrent && 'text-muted-foreground',
                  !completed && !isCurrent && 'text-muted-foreground/60',
                  clickable && 'cursor-pointer hover:text-foreground',
                  !clickable && 'cursor-default',
                )}
              >
                <div>{step.label}</div>
                {/* Inline progress for stage steps */}
                {hasProgress && (
                  <div className="mt-1 space-y-1">
                    <div className="text-xs text-muted-foreground font-normal">
                      {step.progress!.completed + step.progress!.not_required} / {step.progress!.total} items
                    </div>
                    <Progress
                      value={step.progress!.percentage}
                      className="h-1 w-24"
                    />
                  </div>
                )}
                {/* Config step status */}
                {step.type === 'config' && (
                  <div className={cn(
                    'text-xs font-normal mt-0.5 flex items-center gap-1',
                    completed ? 'text-muted-foreground' : 'text-muted-foreground/60',
                  )}>
                    {completed ? (
                      <>
                        <Check className="h-3 w-3" />
                        Configured
                      </>
                    ) : 'Required'}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
