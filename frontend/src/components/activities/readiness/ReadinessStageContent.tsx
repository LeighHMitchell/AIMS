'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Clock,
  Circle,
  Award,
  Lock
} from 'lucide-react';

import type {
  ReadinessStageWithData,
  UpdateReadinessResponseRequest,
  SignOffStageRequest,
} from '@/types/readiness';
import { canSignOffStage } from '@/types/readiness';
import { ReadinessChecklistItem } from './ReadinessChecklistItem';
import { ReadinessStageSignoff } from './ReadinessStageSignoff';

interface ReadinessStageContentProps {
  stage: ReadinessStageWithData;
  onUpdateResponse: (itemId: string, data: UpdateReadinessResponseRequest) => Promise<void>;
  onUploadDocument: (itemId: string, file: File) => Promise<void>;
  onDeleteDocument: (itemId: string, documentId: string) => Promise<void>;
  onRenameDocument: (itemId: string, documentId: string, fileName: string) => Promise<void>;
  onSignOff: (templateId: string, data: SignOffStageRequest) => Promise<void>;
  isUpdating: boolean;
  updatingItemId: string | null;
  readOnly: boolean;
  canSignOff: boolean;
}

export function ReadinessStageContent({
  stage,
  onUpdateResponse,
  onUploadDocument,
  onDeleteDocument,
  onRenameDocument,
  onSignOff,
  isUpdating,
  updatingItemId,
  readOnly,
  canSignOff: canSignOffPermission,
}: ReadinessStageContentProps) {
  const { progress, signoff, items } = stage;
  const isComplete = progress.percentage === 100;
  const isStageSigned = !!signoff;
  const canSign = canSignOffPermission && canSignOffStage(items) && !isStageSigned;

  const getStatusIcon = () => {
    if (isStageSigned) {
      return <Award className="h-5 w-5 text-foreground" />;
    }
    if (isComplete) {
      return <CheckCircle className="h-5 w-5 text-foreground" />;
    }
    if (progress.in_progress > 0 || progress.completed > 0) {
      return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground/50" />;
  };

  return (
    <div>
      {/* Stage header */}
      <div className="p-6 rounded-lg border mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Stage {stage.stage_order}: {stage.name}
              </h3>
              {stage.description && (
                <p className="text-sm text-muted-foreground">{stage.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {progress.completed + progress.not_required} / {progress.total} items
              </div>
              <div className="w-24">
                <Progress
                  value={progress.percentage}
                  className="h-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isStageSigned && (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Signed Off
                </Badge>
              )}
              {isComplete && !isStageSigned && (
                <Badge variant="secondary">
                  Ready for Sign-off
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign-off details if already signed */}
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
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
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
              onRenameDocument={(docId, fileName) => onRenameDocument(item.id, docId, fileName)}
              isUpdating={isUpdating && updatingItemId === item.id}
              readOnly={readOnly || isStageSigned}
            />
          ))
        )}
      </div>

      {/* Sign-off form at bottom if not yet signed */}
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
    </div>
  );
}
