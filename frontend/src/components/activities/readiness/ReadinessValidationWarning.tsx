'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  ClipboardCheck, 
  ChevronRight,
  CheckCircle,
  Clock,
  Circle
} from 'lucide-react';

import type { ActivityReadinessState, ReadinessStageWithData } from '@/types/readiness';
import { apiFetch } from '@/lib/api-fetch';

interface ReadinessValidationWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  onProceed: () => void;
  onGoToChecklist: () => void;
}

export function ReadinessValidationWarning({
  open,
  onOpenChange,
  activityId,
  onProceed,
  onGoToChecklist,
}: ReadinessValidationWarningProps) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ActivityReadinessState | null>(null);

  useEffect(() => {
    if (open && activityId) {
      fetchReadinessState();
    }
  }, [open, activityId]);

  const fetchReadinessState = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/activities/${activityId}/readiness`);
      const data = await response.json();

      if (response.ok && data.data) {
        setState(data.data);
      }
    } catch (error) {
      console.error('[ReadinessValidationWarning] Error fetching state:', error);
    } finally {
      setLoading(false);
    }
  };

  const isComplete = state?.overallProgress?.percentage === 100;
  const allStagesSigned = state?.overallProgress?.stagesSignedOff === state?.overallProgress?.totalStages;

  // Find incomplete stages
  const incompleteStages = state?.stages.filter(s => 
    s.progress.percentage < 100 || !s.signoff
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete && allStagesSigned ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Readiness Checklist Status
          </DialogTitle>
          <DialogDescription>
            {isComplete && allStagesSigned
              ? 'The readiness checklist is complete.'
              : 'The readiness checklist has incomplete items.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading checklist status...
          </div>
        ) : state ? (
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <Badge variant={isComplete ? "default" : "secondary"}>
                  {state.overallProgress.percentage}%
                </Badge>
              </div>
              <Progress value={state.overallProgress.percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {state.overallProgress.completed + state.overallProgress.not_required} of{' '}
                  {state.overallProgress.total} items
                </span>
                <span>
                  {state.overallProgress.stagesSignedOff} of {state.overallProgress.totalStages} stages signed
                </span>
              </div>
            </div>

            {/* Incomplete Stages */}
            {incompleteStages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Incomplete Stages:</h4>
                <div className="space-y-1">
                  {incompleteStages.slice(0, 5).map((stage) => (
                    <div 
                      key={stage.id} 
                      className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {stage.signoff ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : stage.progress.percentage === 100 ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{stage.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {stage.progress.percentage}% complete
                        {stage.progress.percentage === 100 && !stage.signoff && ' (needs sign-off)'}
                      </span>
                    </div>
                  ))}
                  {incompleteStages.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      ...and {incompleteStages.length - 5} more stages
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Warning Message */}
            {!isComplete || !allStagesSigned ? (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  You are about to validate this activity without completing the readiness checklist.
                  This is allowed but not recommended.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All readiness checklist items are complete and all stages have been signed off.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500">
            No readiness checklist data available.
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onGoToChecklist}
            className="flex items-center gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Go to Checklist
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={onProceed}
            variant={isComplete && allStagesSigned ? "default" : "destructive"}
          >
            {isComplete && allStagesSigned ? 'Proceed' : 'Continue Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check if validation should show a warning
 */
export function useReadinessValidationCheck(activityId: string) {
  const [checkResult, setCheckResult] = useState<{
    isComplete: boolean;
    allStagesSigned: boolean;
    shouldWarn: boolean;
  } | null>(null);

  const checkReadiness = async () => {
    if (!activityId) {
      return { isComplete: false, allStagesSigned: false, shouldWarn: true };
    }

    try {
      const response = await apiFetch(`/api/activities/${activityId}/readiness`);
      const data = await response.json();

      if (response.ok && data.data) {
        const state = data.data as ActivityReadinessState;
        const isComplete = state.overallProgress.percentage === 100;
        const allStagesSigned = state.overallProgress.stagesSignedOff === state.overallProgress.totalStages;
        const shouldWarn = !isComplete || !allStagesSigned;

        const result = { isComplete, allStagesSigned, shouldWarn };
        setCheckResult(result);
        return result;
      }
    } catch (error) {
      console.error('[useReadinessValidationCheck] Error:', error);
    }

    return { isComplete: false, allStagesSigned: false, shouldWarn: true };
  };

  return {
    checkReadiness,
    checkResult,
  };
}

export default ReadinessValidationWarning;
