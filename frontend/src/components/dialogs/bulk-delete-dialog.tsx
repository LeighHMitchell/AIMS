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
  // Support both naming conventions
  isOpen?: boolean;
  open?: boolean;
  itemCount?: number;
  count?: number;
  itemType?: "activities" | "transactions";
  entityName?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
  isDeleting?: boolean;
}

export function BulkDeleteDialog({
  isOpen,
  open,
  itemCount,
  count,
  itemType,
  entityName,
  onConfirm,
  onCancel,
  onOpenChange,
  isDeleting = false,
}: BulkDeleteDialogProps) {
  // Support both prop naming conventions
  const dialogOpen = open ?? isOpen ?? false;
  const totalCount = count ?? itemCount ?? 0;
  
  // Determine labels based on props
  let itemLabel: string;
  let itemLabelPlural: string;
  let titleText: string;
  
  if (entityName) {
    // New flexible naming
    itemLabel = entityName;
    itemLabelPlural = totalCount === 1 ? entityName : `${entityName}s`;
    titleText = `Delete Multiple ${itemLabelPlural.charAt(0).toUpperCase() + itemLabelPlural.slice(1)}`;
  } else if (itemType) {
    // Legacy naming
    itemLabel = itemType === "activities" ? "activity" : "transaction";
    itemLabelPlural = itemType === "activities" ? "activities" : "transactions";
    titleText = `Delete Multiple ${itemType === "activities" ? "Activities" : "Transactions"}`;
  } else {
    itemLabel = "item";
    itemLabelPlural = "items";
    titleText = "Delete Multiple Items";
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isDeleting) {
      onOpenChange?.(false);
      onCancel?.();
    }
  };

  const handleCancel = () => {
    onOpenChange?.(false);
    onCancel?.();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {titleText}
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">
              {totalCount} {totalCount === 1 ? itemLabel : itemLabelPlural}
            </strong>
            ? This action cannot be undone and will permanently remove all selected items
            {itemType === "activities" && " and their associated data"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting
              ? "Deleting..."
              : `Delete ${totalCount} ${totalCount === 1 ? itemLabel : itemLabelPlural}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

