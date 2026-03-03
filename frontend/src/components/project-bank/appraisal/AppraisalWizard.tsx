"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Clock, RotateCcw, XCircle, ShieldCheck, Send, AlertCircle } from 'lucide-react';
import { useAppraisalWizard } from '@/hooks/use-appraisal-wizard';
import { AppraisalProgressRail } from './AppraisalProgressRail';
import { StageIntake } from './StageIntake';
import { StagePreliminaryFS, ViabilityDecisionSidebar } from './StagePreliminaryFS';
import { StageEIRR } from './StageEIRR';
import { StagePPPStructuring } from './StagePPPStructuring';
import { StageRouting } from './StageRouting';
import { ContextualHelpButton } from '@/components/project-bank/ContextualHelpButton';
import { cn } from '@/lib/utils';

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
    projectStage,
    currentPhase,
    fs1ActiveTab,
    setFs1ActiveTab,
    isLoading,
    isSaving,
    isLocked,
    lockMessage,
    returnMessage,
    reviewComments,
    projectId: wizardProjectId,
    goToStage,
    canGoToStage,
    isStageComplete,
    saveAndContinue,
    saveAndBack,
    saveDraft,
    submitForReview,
  } = wizard;

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFirstStage = currentStageIndex === 0;

  const renderStage = () => {
    // In the unified model, intake and FS-1 are the two main editable phases
    if (currentPhase === 'intake') {
      return <StageIntake wizard={wizard} />;
    }
    if (currentPhase === 'fs1') {
      return <StagePreliminaryFS wizard={wizard} />;
    }

    // Legacy stages for EIRR/VGF/Routing (FS-2+ phases)
    switch (currentStage) {
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

  // Determine if we can show the submit button
  const canSubmit = (currentPhase === 'intake' && (projectStage === 'intake_draft' || projectStage === 'intake_returned'))
    || (currentPhase === 'fs1' && (projectStage === 'fs1_draft' || projectStage === 'fs1_returned'));

  // Status banner config
  const getBannerConfig = () => {
    if (projectStage === 'intake_submitted' || projectStage === 'fs1_submitted') {
      return {
        icon: Clock,
        text: lockMessage || 'This form is locked — awaiting review board decision.',
        bgClass: 'bg-surface-muted border-border',
        textClass: 'text-foreground',
        iconClass: 'text-muted-foreground',
      };
    }
    if (projectStage === 'intake_returned' || projectStage === 'fs1_returned') {
      return {
        icon: RotateCcw,
        text: returnMessage || 'This project was returned. Please address the reviewer\'s comments and resubmit.',
        bgClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-800',
        iconClass: 'text-amber-600',
      };
    }
    if (projectStage === 'intake_rejected' || projectStage === 'fs1_rejected') {
      return {
        icon: XCircle,
        text: lockMessage || 'This project has been rejected.',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-800',
        iconClass: 'text-red-600',
      };
    }
    if (projectStage === 'intake_approved') {
      return {
        icon: ShieldCheck,
        text: 'Intake approved. You can now begin the Preliminary Feasibility Study.',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-800',
        iconClass: 'text-green-600',
      };
    }
    if (projectStage === 'fs1_approved') {
      return {
        icon: ShieldCheck,
        text: 'Feasibility study approved. The project will proceed to the Detailed Feasibility Study.',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-800',
        iconClass: 'text-green-600',
      };
    }
    return null;
  };

  const banner = getBannerConfig();

  const showFooter = currentStage !== 'dp_consultation' && !isLocked;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 pb-20">
      {/* Contextual Help Button */}
      <ContextualHelpButton stage={currentStage} />

      {/* Progress Rail */}
      <AppraisalProgressRail
        visibleStages={visibleStages}
        currentStage={currentStage}
        projectStage={projectStage}
        currentPhase={currentPhase}
        fs1ActiveTab={fs1ActiveTab}
        onStageClick={goToStage}
        onFs1TabClick={setFs1ActiveTab}
        canGoToStage={canGoToStage}
        isStageComplete={isStageComplete}
      />

      {/* Main Content */}
      <div className={currentPhase === 'fs1' ? 'mr-[340px]' : ''}>
        {/* Status Banner */}
        {banner && (
          <div className={cn('flex items-start gap-3 p-4 rounded-lg border mb-4', banner.bgClass)}>
            <banner.icon className={cn('h-5 w-5 mt-0.5 shrink-0', banner.iconClass)} />
            <div>
              <p className={cn('text-sm font-medium', banner.textClass)}>{banner.text}</p>
              {reviewComments && (projectStage === 'intake_returned' || projectStage === 'fs1_returned') && (
                <div className="mt-2 p-3 bg-white/60 rounded border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Reviewer Comments</p>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{reviewComments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            {renderStage()}
          </CardContent>
        </Card>
      </div>

      {/* Viability Decision — sticky sidebar (third grid column, fs1 only) */}
      {currentPhase === 'fs1' && (
        <ViabilityDecisionSidebar wizard={wizard} />
      )}

      {/* Fixed Bottom Action Bar */}
      {showFooter && (
        <footer className="fixed bottom-0 left-72 right-0 z-[60] bg-card/60 backdrop-blur-md border-t py-4 px-8">
          <div className="flex items-center justify-between max-w-[1280px]">
            <Button
              variant="outline"
              onClick={() => {
                if (isFirstStage && currentPhase === 'intake') {
                  router.back();
                } else {
                  saveAndBack();
                }
              }}
              disabled={isSaving}
            >
              {isFirstStage && currentPhase === 'intake' ? '← Cancel' : '← Back'}
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
              {canSubmit && (
                <Button
                  variant="default"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {currentPhase === 'fs1' ? 'Submit for Review Board Approval' : 'Submit for Review'}
                </Button>
              )}
              {!canSubmit && (
                <Button
                  onClick={saveAndContinue}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Continue →
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}

      {/* Submit for Review Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit {currentPhase === 'intake' ? 'Intake' : 'FS-1'} for Review
            </DialogTitle>
            <DialogDescription>
              {currentPhase === 'fs1'
                ? 'Your Preliminary Feasibility Study will be submitted to the Review Board for assessment. The board will evaluate the technical, financial, and environmental data you have provided.'
                : 'Please confirm you are ready to submit this project for review board assessment.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>All project details will be <strong>locked</strong> and you will not be able to make further edits until the review board makes a decision.</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>Please ensure all information is accurate and complete before submitting.</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>The review board will evaluate the submission and may <strong>approve</strong> (proceed to next phase), <strong>return for revision</strong> (unlock the form for corrections), or <strong>reject</strong> the project (with a 6-month cool-down).</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const success = await submitForReview();
                setShowSubmitDialog(false);
                if (success && wizardProjectId) {
                  router.push(`/project-bank/${wizardProjectId}`);
                }
              }}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
