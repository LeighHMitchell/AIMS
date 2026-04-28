'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReadinessWizardFooterProps {
  activeStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isUpdating: boolean;
}

export function ReadinessWizardFooter({
  activeStep,
  totalSteps,
  onBack,
  onNext,
  canGoNext,
  isUpdating,
}: ReadinessWizardFooterProps) {
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  return (
    <div className="flex items-center justify-between pt-6 mt-6">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {!isLastStep && (
        <Button
          onClick={onNext}
          disabled={!canGoNext || isUpdating}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
