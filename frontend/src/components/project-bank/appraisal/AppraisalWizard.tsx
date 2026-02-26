"use client"

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAppraisalWizard } from '@/hooks/use-appraisal-wizard';
import { APPRAISAL_STAGE_LABELS } from '@/lib/project-bank-utils';
import { AppraisalProgressRail } from './AppraisalProgressRail';
import { StageIntake } from './StageIntake';
import { StagePreliminaryFS } from './StagePreliminaryFS';
import { StageMSDPScreening } from './StageMSDPScreening';
import { StageFIRR } from './StageFIRR';
import { StageEIRR } from './StageEIRR';
import { StagePPPStructuring } from './StagePPPStructuring';
import { StageRouting } from './StageRouting';
import { ContextualHelpButton } from '@/components/project-bank/ContextualHelpButton';

interface AppraisalWizardProps {
  projectId?: string;
}

export function AppraisalWizard({ projectId }: AppraisalWizardProps) {
  const router = useRouter();
  const wizard = useAppraisalWizard(projectId);

  const {
    currentStage,
    currentStageIndex,
    visibleStages,
    isLoading,
    isSaving,
    goToStage,
    canGoToStage,
    isStageComplete,
    saveAndContinue,
    saveAndBack,
    saveDraft,
  } = wizard;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFirstStage = currentStageIndex === 0;
  const isLastStage = currentStageIndex === visibleStages.length - 1;

  const renderStage = () => {
    switch (currentStage) {
      case 'intake':
        return <StageIntake wizard={wizard} />;
      case 'preliminary_fs':
        return <StagePreliminaryFS wizard={wizard} />;
      case 'msdp_screening':
        return <StageMSDPScreening wizard={wizard} />;
      case 'firr_assessment':
        return <StageFIRR wizard={wizard} />;
      case 'eirr_assessment':
        return <StageEIRR wizard={wizard} />;
      case 'vgf_assessment':
        return <StagePPPStructuring wizard={wizard} />;
      case 'dp_consultation':
        return <StageRouting wizard={wizard} />;
      default:
        return <div className="text-muted-foreground">Unknown stage: {currentStage}</div>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* Contextual Help Button */}
      <ContextualHelpButton stage={currentStage} />

      {/* Progress Rail */}
      <AppraisalProgressRail
        visibleStages={visibleStages}
        currentStage={currentStage}
        onStageClick={goToStage}
        canGoToStage={canGoToStage}
        isStageComplete={isStageComplete}
      />

      {/* Main Content */}
      <div>
        <Card>
          <CardContent className="p-6">
            {renderStage()}
          </CardContent>
        </Card>

        {/* Navigation Buttons — hidden on routing stage which has its own submit */}
        {currentStage !== 'dp_consultation' && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => isFirstStage ? router.back() : saveAndBack()}
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
                Continue →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
