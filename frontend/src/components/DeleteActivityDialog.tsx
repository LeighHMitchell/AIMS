import React from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface DeleteActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  activityTitle: string;
}

export function DeleteActivityDialog({
  open,
  onOpenChange,
  onConfirm,
  activityTitle,
}: DeleteActivityDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Activity"
      description={`Are you sure you want to delete the activity "${activityTitle}"? This action cannot be undone.`}
      confirmText="Delete Activity"
      isDestructive
    />
  );
}
