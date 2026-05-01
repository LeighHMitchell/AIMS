import React from "react"
import { DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"
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
  // Default the submit icon to <Save /> for non-destructive actions, since "save"
  // is the right semantic for both Add and Update form submissions.
  const resolvedIcon =
    submitIcon !== undefined
      ? submitIcon
      : submitVariant === "destructive"
        ? null
        : <Save className="h-4 w-4" />;
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
            {resolvedIcon && <span className="mr-2 flex items-center">{resolvedIcon}</span>}
            {submitText}
          </>
        )}
      </Button>
    </DialogFooter>
  )
}
