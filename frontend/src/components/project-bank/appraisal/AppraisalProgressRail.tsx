"use client"

import { Check } from 'lucide-react';
import type { AppraisalStage } from '@/types/project-bank';
import { APPRAISAL_STAGE_LABELS } from '@/lib/project-bank-utils';
import { cn } from '@/lib/utils';

/** Sub-items for each stage that has scrollable sections */
const SUB_STAGES: Partial<Record<AppraisalStage, { label: string; anchor: string }[]>> = {
  intake: [
    { label: 'General Info', anchor: 'section-general-info' },
    { label: 'Contact Officer', anchor: 'section-contact-officer' },
    { label: 'Sector / Sub-Sector', anchor: 'section-sector' },
    { label: 'Region / Townships', anchor: 'section-region' },
  ],
  preliminary_fs: [
    { label: 'Technical', anchor: 'section-technical' },
    { label: 'Cost Estimates', anchor: 'section-costs' },
    { label: 'Revenue', anchor: 'section-revenue' },
    { label: 'Environmental', anchor: 'section-environmental' },
  ],
};

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
  const handleSubItemClick = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-24 space-y-0">
          {visibleStages.map((stage, idx) => {
            const completed = isStageComplete(stage);
            const isCurrent = stage === currentStage;
            const clickable = canGoToStage(stage);
            const subItems = SUB_STAGES[stage];
            const showSubItems = isCurrent && subItems && subItems.length > 0;

            return (
              <div key={stage}>
                <div className="flex items-start gap-3">
                  {/* Vertical line + circle */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => clickable && onStageClick(stage)}
                      disabled={!clickable}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0',
                        completed && 'bg-gray-800 border-gray-800 text-white',
                        isCurrent && !completed && 'border-gray-600 bg-gray-100 text-gray-800',
                        !completed && !isCurrent && 'border-gray-300 bg-background text-gray-400',
                        clickable && 'cursor-pointer hover:scale-110',
                        !clickable && 'cursor-default',
                      )}
                    >
                      {completed ? <Check className="h-3.5 w-3.5" /> : <span className={cn(
                        'w-2 h-2 rounded-full',
                        isCurrent ? 'bg-gray-600' : 'bg-gray-300',
                      )} />}
                    </button>
                    {/* Connector line — taller when sub-items are shown */}
                    {idx < visibleStages.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 transition-colors',
                          completed ? 'bg-gray-600' : 'bg-gray-300',
                          showSubItems ? 'h-auto' : 'h-8',
                        )}
                        style={showSubItems ? { height: `${32 + subItems.length * 28}px` } : undefined}
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
                      completed && !isCurrent && 'text-gray-600',
                      !completed && !isCurrent && 'text-gray-400',
                      clickable && 'cursor-pointer hover:text-foreground',
                      !clickable && 'cursor-default',
                    )}
                  >
                    {APPRAISAL_STAGE_LABELS[stage]}
                  </button>
                </div>

                {/* Nested sub-items for current stage */}
                {showSubItems && (
                  <div className="ml-[14px] pl-[22px] border-l border-gray-300 space-y-1 pt-1 pb-1">
                    {subItems.map((sub) => (
                      <button
                        key={sub.anchor}
                        type="button"
                        onClick={() => handleSubItemClick(sub.anchor)}
                        className="block w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-1 pl-1"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mobile: horizontal bar */}
      <div className="lg:hidden flex gap-1 mb-4 overflow-x-auto pb-1">
        {visibleStages.map((stage) => {
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
                  completed && 'bg-gray-700',
                  isCurrent && !completed && 'bg-gray-500',
                  !completed && !isCurrent && 'bg-gray-200',
                )}
              />
              <span
                className={cn(
                  'text-[10px] leading-tight block truncate',
                  isCurrent && 'font-semibold text-foreground',
                  completed && !isCurrent && 'text-gray-600',
                  !completed && !isCurrent && 'text-gray-400',
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
