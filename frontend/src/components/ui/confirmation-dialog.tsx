import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
}

/**
 * ConfirmationDialog — Reusable confirm/cancel dialog.
 *
 * Usage (delete):
 *   <ConfirmationDialog
 *     open={showDelete}
 *     onOpenChange={setShowDelete}
 *     onConfirm={handleDelete}
 *     title="Delete Activity"
 *     description='Are you sure? This cannot be undone.'
 *     confirmText="Delete"
 *     isDestructive
 *     isLoading={isDeleting}
 *   />
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {/* DialogTitle is text-only by design-system rule — no leading icon */}
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-3">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
