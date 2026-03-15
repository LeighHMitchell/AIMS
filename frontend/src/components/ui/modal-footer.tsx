import React from "react"
import { DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalFooterProps {
  onCancel: () => void
  onSubmit?: () => void
  cancelText?: string
  submitText?: string
  loadingText?: string
  isLoading?: boolean
  isDisabled?: boolean
  submitVariant?: "default" | "destructive" | "outline" | "ghost"
  submitIcon?: React.ReactNode
  /** Submit button type — set to "submit" when inside a <form> */
  submitType?: "button" | "submit"
  className?: string
}

/**
 * ModalFooter — Standardised Cancel + Submit button pair for dialogs.
 *
 * Usage:
 *   <ModalFooter
 *     onCancel={handleClose}
 *     onSubmit={handleSave}
 *     submitText="Create User"
 *     isLoading={isSubmitting}
 *   />
 */
export function ModalFooter({
  onCancel,
  onSubmit,
  cancelText = "Cancel",
  submitText = "Save",
  loadingText,
  isLoading = false,
  isDisabled = false,
  submitVariant = "default",
  submitIcon,
  submitType = "button",
  className,
}: ModalFooterProps) {
  return (
    <DialogFooter className={cn(className)}>
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button
        type={submitType}
        variant={submitVariant}
        onClick={submitType === "button" ? onSubmit : undefined}
        disabled={isLoading || isDisabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loadingText || submitText}
          </>
        ) : (
          <>
            {submitIcon && <span className="mr-2 flex items-center">{submitIcon}</span>}
            {submitText}
          </>
        )}
      </Button>
    </DialogFooter>
  )
}
