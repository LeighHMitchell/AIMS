"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Clock, RotateCcw, XCircle, ShieldCheck, Send, AlertCircle, ArrowLeft, Eye } from 'lucide-react';
import { useAppraisalWizard } from '@/hooks/use-appraisal-wizard';
import { AppraisalProgressRail } from './AppraisalProgressRail';
import { StageIntake } from './StageIntake';
import { StagePreliminaryFS, ViabilityDecisionSidebar } from './StagePreliminaryFS';
import { StageDetailedFS } from './StageDetailedFS';
import { StageEIRR } from './StageEIRR';
import { StagePPPStructuring } from './StagePPPStructuring';
import { StageRouting } from './StageRouting';
import { FS2AssignmentPanel } from '@/components/project-bank/fs2/FS2AssignmentPanel';
import { CategoryDecisionPanel } from '@/components/project-bank/categorization/CategoryDecisionPanel';
import { ContextualHelpButton } from '@/components/project-bank/ContextualHelpButton';
import { cn } from '@/lib/utils';
import type { ProjectPhase } from '@/types/project-bank';

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  name: 'Project Name',
  nominating_ministry: 'Nominating Ministry',
  sector: 'Sector',
  fs_conductor_type: 'Feasibility Study Conductor',
  fs_conductor_individual_name: 'Individual Conductor Name',
  fs_conductor_company_name: 'Company Conductor Name',
  cost_table_data: 'Financial Analysis Cost Table',
  environmental_impact_level: 'Environmental Impact Level',
  social_impact_level: 'Social Impact Level',
  study_date: 'Study Date',
  conductor_type: 'Study Conductor Type',
  demand_methodology: 'Demand Methodology',
  firr_cost_table_data: 'Financial Analysis Cost Table',
};

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
    fs2ActiveTab,
    setFs2ActiveTab,
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
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [viewingIntake, setViewingIntake] = useState(false);
  const [viewingFS1, setViewingFS1] = useState(false);
  const [viewingPhase, setViewingPhase] = useState<ProjectPhase | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFirstStage = currentStageIndex === 0;

  const clearViewing = () => {
    setViewingIntake(false);
    setViewingFS1(false);
    setViewingPhase(null);
  };

  /** Intercept stage clicks: viewing intake/FS-1 from a later phase sets read-only mode */
  const handleStageClick = (stage: Parameters<typeof goToStage>[0]) => {
    if (stage === 'intake' && currentPhase !== 'intake') {
      clearViewing();
      setViewingIntake(true);
      return;
    }
    if (stage === 'preliminary_fs' && currentPhase !== 'fs1') {
      clearViewing();
      setViewingFS1(true);
      return;
    }
    clearViewing();
    goToStage(stage);
  };

  /** Handle clicking FS-2 or FS-3 in the progress rail */
  const handlePhaseClick = (phase: ProjectPhase) => {
    clearViewing();
    setViewingPhase(phase);
  };

  const renderStage = () => {
    // Read-only intake view from a later phase
    if (viewingIntake && currentPhase !== 'intake') {
      return (
        <div className="pointer-events-none opacity-75">
          <StageIntake wizard={wizard} />
        </div>
      );
    }

    // Read-only FS-1 view from FS-2+ phase
    if (viewingFS1 && currentPhase !== 'fs1') {
      return (
        <div className="pointer-events-none opacity-75">
          <StagePreliminaryFS wizard={wizard} />
        </div>
      );
    }

    // Viewing FS-2 phase data from a later phase (read-only)
    if (viewingPhase === 'fs2' && currentPhase !== 'fs2') {
      return (
        <div className="pointer-events-none opacity-75">
          <StageDetailedFS wizard={wizard} />
        </div>
      );
    }

    // FS-2 active phase
    if (viewingPhase === null && currentPhase === 'fs2') {
      return <StageDetailedFS wizard={wizard} />;
    }

    if (viewingPhase === 'fs3' || (viewingPhase === null && currentPhase === 'fs3')) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">PPP Transaction Structuring</h3>
            {wizard.formData.project_code && (
              <p className="text-xs text-muted-foreground font-mono mb-1">{wizard.formData.project_code}</p>
            )}
            <p className="text-sm text-muted-foreground">Contract design, risk allocation, and VGF assessment.</p>
          </div>
          <StageRouting wizard={wizard} />
        </div>
      );
    }

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
    || (currentPhase === 'fs1' && (projectStage === 'fs1_draft' || projectStage === 'fs1_returned'))
    || (currentPhase === 'fs2' && (projectStage === 'fs2_in_progress' || projectStage === 'fs2_assigned' || projectStage === 'fs2_returned'));

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
    if (projectStage === 'fs2_completed' || projectStage === 'fs2_desk_reviewed' || projectStage === 'fs2_senior_reviewed') {
      return {
        icon: Clock,
        text: 'Detailed Feasibility Study submitted — awaiting review board decision.',
        bgClass: 'bg-surface-muted border-border',
        textClass: 'text-foreground',
        iconClass: 'text-muted-foreground',
      };
    }
    if (projectStage === 'fs2_returned') {
      return {
        icon: RotateCcw,
        text: 'The Detailed Feasibility Study was returned. Please address the reviewer\'s comments and resubmit.',
        bgClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-800',
        iconClass: 'text-amber-600',
      };
    }
    if (projectStage === 'fs2_categorized') {
      return {
        icon: ShieldCheck,
        text: 'Detailed Feasibility Study approved and categorized. The project may proceed to PPP structuring.',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-800',
        iconClass: 'text-green-600',
      };
    }
    return null;
  };

  const banner = getBannerConfig();

  const showFooter = (currentStage !== 'dp_consultation' || currentPhase === 'fs2') && !isLocked;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 pb-20">
      {/* Contextual Help Button */}
      <ContextualHelpButton stage={currentStage} />

      {/* Progress Rail */}
      <AppraisalProgressRail
        projectName={wizard.formData.name}
        projectCode={wizard.formData.project_code}
        visibleStages={visibleStages}
        currentStage={currentStage}
        projectStage={projectStage}
        currentPhase={currentPhase}
        fs1ActiveTab={fs1ActiveTab}
        fs2ActiveTab={fs2ActiveTab}
        onStageClick={handleStageClick}
        onFs1TabClick={(tab) => {
          clearViewing();
          setFs1ActiveTab(tab);
          // After React re-renders, scroll the tab content into view
          requestAnimationFrame(() => {
            const el = document.getElementById(`section-${tab}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }}
        onFs2TabClick={(tab) => {
          clearViewing();
          setFs2ActiveTab(tab);
          requestAnimationFrame(() => {
            const el = document.getElementById(`section-fs2-${tab}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }}
        canGoToStage={canGoToStage}
        isStageComplete={isStageComplete}
        onReturnToCurrentPhase={clearViewing}
        onPhaseClick={handlePhaseClick}
      />

      {/* Main Content */}
      <div className={(currentPhase === 'fs1' || viewingFS1) && !viewingIntake && !viewingPhase ? 'mr-[340px]' : ''}>
        {/* Read-only viewing banners */}
        {viewingIntake && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 mb-4">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 font-medium flex-1">Viewing intake data (read-only)</span>
            <Button size="sm" variant="outline" onClick={clearViewing} className="gap-1.5 shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </div>
        )}
        {viewingFS1 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 mb-4">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 font-medium flex-1">Viewing Preliminary Feasibility Study data (read-only)</span>
            <Button size="sm" variant="outline" onClick={clearViewing} className="gap-1.5 shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </div>
        )}
        {viewingPhase && viewingPhase !== currentPhase && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 mb-4">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 font-medium flex-1">
              Viewing {viewingPhase === 'fs2' ? 'Detailed Feasibility Study' : 'PPP Transaction Structuring'} data
            </span>
            <Button size="sm" variant="outline" onClick={clearViewing} className="gap-1.5 shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </div>
        )}

        {/* Status Banner */}
        {!viewingIntake && !viewingFS1 && !viewingPhase && banner && (
          <div className={cn('flex items-start gap-3 p-4 rounded-lg border mb-4', banner.bgClass)}>
            <banner.icon className={cn('h-5 w-5 mt-0.5 shrink-0', banner.iconClass)} />
            <div>
              <p className={cn('text-sm font-medium', banner.textClass)}>{banner.text}</p>
              {reviewComments && (projectStage === 'intake_returned' || projectStage === 'fs1_returned' || projectStage === 'fs2_returned') && (
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

      {/* Viability Decision — sticky sidebar (fs1 phase or viewing FS-1 read-only) */}
      {(currentPhase === 'fs1' || viewingFS1) && !viewingIntake && !viewingPhase && (
        <ViabilityDecisionSidebar wizard={wizard} />
      )}

      {/* Fixed Bottom Action Bar */}
      {showFooter && !viewingIntake && !viewingFS1 && !viewingPhase && (
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
                  onClick={() => {
                    const errs = wizard.validateCurrentStage();
                    if (Object.keys(errs).length > 0) {
                      setValidationErrors(errs);
                      setShowValidationErrors(true);
                    } else {
                      setShowSubmitDialog(true);
                    }
                  }}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {currentPhase === 'fs1' || currentPhase === 'fs2' ? 'Submit for Review Board Approval' : 'Submit for Review'}
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

      {/* Validation Errors Dialog */}
      <Dialog open={showValidationErrors} onOpenChange={setShowValidationErrors}>
        <DialogContent>
          <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Missing Required Information
            </DialogTitle>
            <DialogDescription>
              Please complete the following fields before submitting for review.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 pt-2">
            {Object.entries(validationErrors).map(([key, message]) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <span>
                  <strong>{VALIDATION_FIELD_LABELS[key] ?? key}</strong>
                  {message !== 'Required' && message !== 'required' ? ` — ${message}` : ''}
                </span>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button onClick={() => setShowValidationErrors(false)}>
              Go Back and Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Review Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit {currentPhase === 'intake' ? 'Intake' : currentPhase === 'fs2' ? 'Detailed Feasibility Study' : 'Preliminary Feasibility Study'} for Review
            </DialogTitle>
            <DialogDescription>
              {currentPhase === 'fs2'
                ? 'Your Detailed Feasibility Study will be submitted to the Review Board for assessment. The board will evaluate all study sections including demand, financial, environmental, and implementation analysis.'
                : currentPhase === 'fs1'
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
