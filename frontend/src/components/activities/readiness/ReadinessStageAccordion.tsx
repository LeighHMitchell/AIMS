'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Clock,
  Circle,
  Award,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { 
  ReadinessStageWithData, 
  UpdateReadinessResponseRequest,
  SignOffStageRequest,
} from '@/types/readiness';
import { canSignOffStage } from '@/types/readiness';
import { ReadinessChecklistItem } from './ReadinessChecklistItem';
import { ReadinessStageSignoff } from './ReadinessStageSignoff';

interface ReadinessStageAccordionProps {
  stage: ReadinessStageWithData;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateResponse: (itemId: string, data: UpdateReadinessResponseRequest) => Promise<void>;
  onUploadDocument: (itemId: string, file: File) => Promise<void>;
  onDeleteDocument: (itemId: string, documentId: string) => Promise<void>;
  onSignOff: (templateId: string, data: SignOffStageRequest) => Promise<void>;
  isUpdating: boolean;
  updatingItemId: string | null;
  readOnly: boolean;
  canSignOff: boolean;
}

export function ReadinessStageAccordion({
  stage,
  isExpanded,
  onToggle,
  onUpdateResponse,
  onUploadDocument,
  onDeleteDocument,
  onSignOff,
  isUpdating,
  updatingItemId,
  readOnly,
  canSignOff: canSignOffPermission,
}: ReadinessStageAccordionProps) {
  const { progress, signoff, items } = stage;
  const isComplete = progress.percentage === 100;
  const isStageSigned = !!signoff;
  const canSign = canSignOffPermission && canSignOffStage(items) && !isStageSigned;

  const getStatusIcon = () => {
    if (isStageSigned) {
      return <Award className="h-5 w-5 text-green-600" />;
    }
    if (isComplete) {
      return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
    if (progress.in_progress > 0 || progress.completed > 0) {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Card className={cn(
      "transition-all",
      isStageSigned && "border-green-200",
      isComplete && !isStageSigned && "border-blue-200"
    )}>
      {/* Header - Always visible */}
      <CardHeader
        className={cn(
          "cursor-pointer select-none",
          isStageSigned && "bg-green-50",
          isComplete && !isStageSigned && "bg-blue-50"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Stage {stage.stage_order}: {stage.name}
              </h3>
              {stage.description && (
                <p className="text-sm text-gray-600">{stage.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm text-gray-600">
                {progress.completed + progress.not_required} / {progress.total} items
              </div>
              <div className="w-24">
                <Progress 
                  value={progress.percentage} 
                  className={cn(
                    "h-2",
                    isComplete && "[&>div]:bg-green-600"
                  )}
                />
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {isStageSigned && (
                <Badge className="bg-green-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Signed Off
                </Badge>
              )}
              {isComplete && !isStageSigned && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Ready for Sign-off
                </Badge>
              )}
            </div>

            {/* Expand/Collapse icon */}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Sign-off section at top if stage is signed */}
          {isStageSigned && (
            <ReadinessStageSignoff
              signoff={signoff}
              stage={stage}
              canSignOff={false}
              onSignOff={async () => {}}
              isUpdating={false}
            />
          )}

          {/* Items list */}
          <div className="space-y-3 mt-4">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No applicable items for this stage based on current configuration.
              </p>
            ) : (
              items.map((item) => (
                <ReadinessChecklistItem
                  key={item.id}
                  item={item}
                  response={item.response}
                  documents={item.documents}
                  onUpdateResponse={(data) => onUpdateResponse(item.id, data)}
                  onUploadDocument={(file) => onUploadDocument(item.id, file)}
                  onDeleteDocument={(docId) => onDeleteDocument(item.id, docId)}
                  isUpdating={isUpdating && updatingItemId === item.id}
                  readOnly={readOnly || isStageSigned}
                />
              ))
            )}
          </div>

          {/* Sign-off section at bottom if not yet signed */}
          {!isStageSigned && canSignOffPermission && (
            <div className="mt-6 pt-4 border-t">
              <ReadinessStageSignoff
                signoff={null}
                stage={stage}
                canSignOff={canSign}
                onSignOff={(data) => onSignOff(stage.id, data)}
                isUpdating={isUpdating}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ReadinessStageAccordion;
