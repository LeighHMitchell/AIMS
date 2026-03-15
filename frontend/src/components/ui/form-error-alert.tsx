import React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface FormErrorAlertProps {
  error: string | null | undefined
}

/**
 * FormErrorAlert — Conditional destructive alert for form errors.
 *
 * Renders nothing when error is falsy.
 *
 * Usage:
 *   <FormErrorAlert error={error} />
 */
export function FormErrorAlert({ error }: FormErrorAlertProps) {
  if (!error) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
