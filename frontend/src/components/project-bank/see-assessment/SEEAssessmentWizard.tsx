"use client"

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  useSEEAssessmentWizard,
  SEE_STAGE_ORDER,
  SEE_STAGE_LABELS,
} from '@/hooks/use-see-assessment-wizard';
import type { SEEAssessmentStage } from '@/hooks/use-see-assessment-wizard';
import { StageSEEProfile } from './StageSEEProfile';
import { StageFinancialHistory } from './StageFinancialHistory';
import { StageValuation } from './StageValuation';
import { StageRestructuring } from './StageRestructuring';
import { StageTransferMode } from './StageTransferMode';
import { cn } from '@/lib/utils';

interface SEEAssessmentWizardProps {
  transferId: string;
}

export function SEEAssessmentWizard({ transferId }: SEEAssessmentWizardProps) {
  const router = useRouter();
  const wizard = useSEEAssessmentWizard(transferId);

  const {
    currentStage,
    currentStageIndex,
    isLoading,
    isSaving,
    goToStage,
    canGoToStage,
    isStageComplete,
    saveAndContinue,
    saveAndBack,
    saveDraft,
    errors,
  } = wizard;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFirstStage = currentStageIndex === 0;
  const isLastStage = currentStageIndex === SEE_STAGE_ORDER.length - 1;

  const renderStage = () => {
    switch (currentStage) {
      case 'profile':
        return <StageSEEProfile wizard={wizard} />;
      case 'financials':
        return <StageFinancialHistory wizard={wizard} />;
      case 'valuation':
        return <StageValuation wizard={wizard} />;
      case 'restructuring':
        return <StageRestructuring wizard={wizard} />;
      case 'transfer_mode':
        return <StageTransferMode wizard={wizard} />;
      default:
        return <div className="text-muted-foreground">Unknown stage</div>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* Progress Rail */}
      <div className="hidden lg:block">
        <nav className="space-y-1 sticky top-24">
          {SEE_STAGE_ORDER.map((stage, idx) => {
            const isActive = stage === currentStage;
            const isComplete = isStageComplete(stage);
            const canClick = canGoToStage(stage);

            return (
              <button
                key={stage}
                onClick={() => canClick && goToStage(stage)}
                disabled={!canClick}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'text-muted-foreground',
                  !canClick && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className={cn(
                  'h-5 w-5 rounded-full text-xs flex items-center justify-center shrink-0 border',
                  isActive
                    ? 'bg-primary-foreground text-primary border-primary-foreground'
                    : isComplete
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30',
                )}>
                  {isComplete ? '✓' : idx + 1}
                </span>
                {SEE_STAGE_LABELS[stage]}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div>
        {/* Mobile Stage Indicator */}
        <div className="lg:hidden mb-4">
          <div className="text-sm text-muted-foreground">
            Step {currentStageIndex + 1} of {SEE_STAGE_ORDER.length}
          </div>
          <div className="text-lg font-semibold">{SEE_STAGE_LABELS[currentStage]}</div>
        </div>

        <Card>
          <CardContent className="p-6">
            {errors._form && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {errors._form}
              </div>
            )}
            {renderStage()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => isFirstStage ? router.push(`/project-bank/transfers/${transferId}`) : saveAndBack()}
            disabled={isSaving}
          >
            {isFirstStage ? '← Cancel' : '← Back'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Draft
            </Button>
            <Button
              onClick={saveAndContinue}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {isLastStage ? 'Complete Assessment' : 'Continue →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
