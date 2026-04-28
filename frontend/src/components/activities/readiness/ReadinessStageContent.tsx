'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

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

  // Parent-owned expansion state keyed by item id. Reset when the stage changes
  // so opening a different stage collapses any items that were expanded previously.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    setExpandedIds(new Set());
  }, [stage.id]);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const allExpanded = items.length > 0 && items.every((i) => expandedIds.has(i.id));
  const expandOrCollapseAll = () => {
    if (allExpanded) setExpandedIds(new Set());
    else setExpandedIds(new Set(items.map((i) => i.id)));
  };

  // An item is "answered" when it has a persisted response whose status is
  // anything other than the default 'not_completed', OR when it has remarks.
  const itemsToClear = useMemo(
    () => items.filter((i) => {
      const r = i.response;
      if (!r) return false;
      return (r.status && r.status !== 'not_completed') || !!(r.remarks && r.remarks.trim().length > 0);
    }),
    [items]
  );
  const hasAnything = itemsToClear.length > 0;
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const clearAll = async () => {
    setConfirmClearOpen(false);
    if (itemsToClear.length === 0) return;
    // Reset each previously-answered item back to its blank state.
    let ok = 0;
    for (const item of itemsToClear) {
      try {
        await onUpdateResponse(item.id, { status: 'not_completed', remarks: null });
        ok++;
      } catch {
        // hook already surfaces the error toast
      }
    }
    if (ok > 0) {
      toast(`Cleared ${ok} item${ok === 1 ? '' : 's'}`);
    }
  };

  return (
    <div>
      {/* Stage-level controls */}
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandOrCollapseAll}
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-4 w-4 mr-1.5" />
                Collapse all
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-4 w-4 mr-1.5" />
                Expand all
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={readOnly || isStageSigned || !hasAnything}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Stage header */}
      <div className="p-6 rounded-lg border mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Stage {stage.stage_order}: {stage.name}
            </h3>
            {stage.description && (
              <p className="text-body text-muted-foreground">{stage.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <div className="text-body text-muted-foreground">
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
          <p className="text-body text-muted-foreground text-center py-8">
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
              isExpanded={expandedIds.has(item.id)}
              onToggleExpanded={() => toggleItemExpanded(item.id)}
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

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all items in this stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This resets the status and remarks for {itemsToClear.length} item{itemsToClear.length === 1 ? '' : 's'} in Stage {stage.stage_order}: {stage.name}. Uploaded documents are left in place. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={clearAll}
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
