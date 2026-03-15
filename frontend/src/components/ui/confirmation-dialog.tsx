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
import { AlertTriangle, Loader2 } from "lucide-react"

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
  /** Custom icon — defaults to AlertTriangle for destructive, none otherwise */
  icon?: React.ReactNode
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
  icon,
}: ConfirmationDialogProps) {
  const displayIcon =
    icon !== undefined
      ? icon
      : isDestructive
        ? <AlertTriangle className="h-5 w-5 text-destructive" />
        : null

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {displayIcon}
            {title}
          </DialogTitle>
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
