'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, Pencil, X, Loader2 } from 'lucide-react';

interface ActivityInRecycleBinDialogProps {
  open: boolean;
  /** Localised date string ("on May 12, 2026") or null. */
  deletedAt?: string | null;
  /** Friendly name of who soft-deleted, if known. */
  deletedByName?: string | null;
  /** Date string indicating when the activity will be hard-purged, or null. */
  purgeOnDate?: string | null;
  /** True if the current user is allowed to call the restore endpoint. */
  canRestore?: boolean;
  onRestore?: () => Promise<void> | void;
  onContinueEditing: () => void;
  onCancel: () => void;
}

const formatDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

export const ActivityInRecycleBinDialog: React.FC<ActivityInRecycleBinDialogProps> = ({
  open,
  deletedAt,
  deletedByName,
  purgeOnDate,
  canRestore = false,
  onRestore,
  onContinueEditing,
  onCancel,
}) => {
  const [restoring, setRestoring] = useState(false);

  const deletedAtLabel = formatDate(deletedAt);
  const purgeLabel = formatDate(purgeOnDate);

  const handleRestore = async () => {
    if (!onRestore) return;
    setRestoring(true);
    try {
      await onRestore();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[min(92vw,540px)] max-w-[540px] p-0">
        <DialogHeader className="bg-surface-muted border-b px-6 py-4 mx-0 mt-0 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            This activity is in the recycle bin
          </DialogTitle>
          <DialogDescription>
            You can still open and edit it, but it will be hard-deleted by the system unless someone
            restores it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-4 text-body">
          <dl className="space-y-1 text-helper">
            {deletedAtLabel && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sent to recycle bin</dt>
                <dd className="font-medium">{deletedAtLabel}</dd>
              </div>
            )}
            {deletedByName && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">By</dt>
                <dd className="font-medium">{deletedByName}</dd>
              </div>
            )}
            {purgeLabel && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Scheduled to be permanently deleted</dt>
                <dd className="font-medium">{purgeLabel}</dd>
              </div>
            )}
          </dl>

          {!canRestore && (
            <p className="rounded-md bg-muted px-3 py-2 text-helper text-muted-foreground">
              Only an administrator can restore activities. Ask one to restore it from{' '}
              <span className="font-medium">Admin → Recycle Bin</span> if you'd like it back in the
              system.
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onContinueEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit anyway
            </Button>
            {canRestore && onRestore && (
              <Button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="flex items-center"
              >
                {restoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Undo2 className="mr-2 h-4 w-4" />
                )}
                Restore activity
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityInRecycleBinDialog;
