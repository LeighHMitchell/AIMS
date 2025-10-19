import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteDialogProps {
  isOpen: boolean;
  itemCount: number;
  itemType: "activities" | "transactions";
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function BulkDeleteDialog({
  isOpen,
  itemCount,
  itemType,
  onConfirm,
  onCancel,
  isDeleting = false,
}: BulkDeleteDialogProps) {
  const itemLabel = itemType === "activities" ? "activity" : "transaction";
  const itemLabelPlural = itemType === "activities" ? "activities" : "transactions";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Multiple {itemType === "activities" ? "Activities" : "Transactions"}
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">
              {itemCount} {itemCount === 1 ? itemLabel : itemLabelPlural}
            </strong>
            ? This action cannot be undone and will permanently remove all selected items
            {itemType === "activities" && " and their associated data"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting
              ? "Deleting..."
              : `Delete ${itemCount} ${itemCount === 1 ? itemLabel : itemLabelPlural}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

