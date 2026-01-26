'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  MinusCircle,
  Award,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { ReadinessStageWithData } from '@/types/readiness';

interface OverallProgress {
  completed: number;
  in_progress: number;
  not_required: number;
  not_completed: number;
  total: number;
  percentage: number;
  stagesSignedOff: number;
  totalStages: number;
}

interface ReadinessProgressSummaryProps {
  progress: OverallProgress;
  stages: ReadinessStageWithData[];
}

export function ReadinessProgressSummary({ progress, stages }: ReadinessProgressSummaryProps) {
  const isComplete = progress.percentage === 100;
  const allStagesSigned = progress.stagesSignedOff === progress.totalStages;

  return (
    <Card className={cn(
      "border-2",
      isComplete && allStagesSigned
        ? "border-green-200 bg-green-50"
        : isComplete
        ? "border-blue-200 bg-blue-50"
        : "border-gray-200"
    )}>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
              <Badge 
                variant={isComplete ? "default" : "secondary"}
                className={cn(
                  isComplete && "bg-green-600"
                )}
              >
                {progress.percentage}% Complete
              </Badge>
            </div>

            <Progress 
              value={progress.percentage} 
              className={cn(
                "h-3",
                isComplete && "[&>div]:bg-green-600"
              )}
            />

            {/* Status breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{progress.completed}</span> Completed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{progress.in_progress}</span> In Progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{progress.not_completed}</span> Not Started
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MinusCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{progress.not_required}</span> Not Required
                </span>
              </div>
            </div>
          </div>

          {/* Stage Sign-off Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Stage Sign-offs</h3>
              <Badge 
                variant={allStagesSigned ? "default" : "secondary"}
                className={cn(
                  allStagesSigned && "bg-green-600"
                )}
              >
                {progress.stagesSignedOff} / {progress.totalStages} Signed
              </Badge>
            </div>

            {/* Stage indicators */}
            <div className="space-y-2">
              {stages.map((stage) => (
                <div 
                  key={stage.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    stage.signoff 
                      ? "bg-green-100" 
                      : stage.progress.percentage === 100 
                      ? "bg-blue-100"
                      : "bg-gray-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {stage.signoff ? (
                      <Award className="h-4 w-4 text-green-600" />
                    ) : stage.progress.percentage === 100 ? (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    ) : stage.progress.percentage > 0 ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={cn(
                      "font-medium",
                      stage.signoff ? "text-green-800" : "text-gray-700"
                    )}>
                      {stage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs",
                      stage.signoff ? "text-green-700" : "text-gray-500"
                    )}>
                      {stage.signoff 
                        ? 'Signed Off'
                        : `${stage.progress.percentage}%`
                      }
                    </span>
                    {stage.signoff && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Completion message */}
        {isComplete && !allStagesSigned && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                All items are complete, but stages need to be signed off
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                A designated official must sign off on each stage to formally certify completion.
              </p>
            </div>
          </div>
        )}

        {isComplete && allStagesSigned && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg flex items-start gap-2">
            <Award className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Readiness checklist is complete
              </p>
              <p className="text-xs text-green-700 mt-1">
                All items have been completed and all stages have been signed off.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReadinessProgressSummary;
