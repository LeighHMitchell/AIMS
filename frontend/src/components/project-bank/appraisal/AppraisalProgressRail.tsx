"use client"

import { Check } from 'lucide-react';
import type { AppraisalStage } from '@/types/project-bank';
import { APPRAISAL_STAGE_LABELS } from '@/lib/project-bank-utils';
import { cn } from '@/lib/utils';

interface AppraisalProgressRailProps {
  visibleStages: AppraisalStage[];
  currentStage: AppraisalStage;
  onStageClick: (stage: AppraisalStage) => void;
  canGoToStage: (stage: AppraisalStage) => boolean;
  isStageComplete: (stage: AppraisalStage) => boolean;
}

export function AppraisalProgressRail({
  visibleStages,
  currentStage,
  onStageClick,
  canGoToStage,
  isStageComplete,
}: AppraisalProgressRailProps) {
  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-24 space-y-0">
          {visibleStages.map((stage, idx) => {
            const completed = isStageComplete(stage);
            const isCurrent = stage === currentStage;
            const clickable = canGoToStage(stage);

            return (
              <div key={stage} className="flex items-start gap-3">
                {/* Vertical line + circle */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => clickable && onStageClick(stage)}
                    disabled={!clickable}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                      completed && 'bg-green-500 border-green-500 text-white',
                      isCurrent && !completed && 'border-blue-500 bg-blue-50 text-blue-700',
                      !completed && !isCurrent && 'border-muted-foreground/30 bg-background text-muted-foreground',
                      clickable && 'cursor-pointer hover:scale-110',
                      !clickable && 'cursor-default',
                    )}
                  >
                    {completed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </button>
                  {idx < visibleStages.length - 1 && (
                    <div
                      className={cn(
                        'w-0.5 h-8 transition-colors',
                        completed ? 'bg-green-500' : 'bg-muted-foreground/20',
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <button
                  onClick={() => clickable && onStageClick(stage)}
                  disabled={!clickable}
                  className={cn(
                    'text-sm pt-1 text-left transition-colors',
                    isCurrent && 'font-semibold text-foreground',
                    completed && !isCurrent && 'text-green-700',
                    !completed && !isCurrent && 'text-muted-foreground',
                    clickable && 'cursor-pointer hover:text-foreground',
                    !clickable && 'cursor-default',
                  )}
                >
                  {APPRAISAL_STAGE_LABELS[stage]}
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mobile: horizontal bar */}
      <div className="lg:hidden flex gap-1 mb-4 overflow-x-auto pb-1">
        {visibleStages.map((stage, idx) => {
          const completed = isStageComplete(stage);
          const isCurrent = stage === currentStage;
          const clickable = canGoToStage(stage);

          return (
            <button
              key={stage}
              onClick={() => clickable && onStageClick(stage)}
              disabled={!clickable}
              className="flex-1 min-w-0 text-center"
            >
              <div
                className={cn(
                  'h-1.5 rounded-full mb-1 transition-colors',
                  completed && 'bg-green-500',
                  isCurrent && !completed && 'bg-blue-500',
                  !completed && !isCurrent && 'bg-muted',
                )}
              />
              <span
                className={cn(
                  'text-[10px] leading-tight block truncate',
                  isCurrent && 'font-semibold text-foreground',
                  completed && !isCurrent && 'text-green-600',
                  !completed && !isCurrent && 'text-muted-foreground',
                )}
              >
                {APPRAISAL_STAGE_LABELS[stage]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
