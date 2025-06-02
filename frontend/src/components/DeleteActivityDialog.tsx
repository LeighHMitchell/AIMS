import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Activity
          </DialogTitle>
          <DialogDescription className="pt-3">
            Are you sure you want to delete the activity "{activityTitle}"? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 