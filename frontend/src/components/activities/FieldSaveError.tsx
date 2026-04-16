"use client"

import React from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

interface FieldSaveErrorProps {
  /** The error object returned by the autosave hook (null when no error). */
  error: Error | null | undefined
  /** Called when the user clicks Retry. Typically re-invokes triggerFieldSave. */
  onRetry?: () => void
  /** Friendly name of the field for the message, e.g. "activity title". Optional. */
  fieldLabel?: string
  /** Extra Tailwind classes (e.g. "mt-2") */
  className?: string
}

/**
 * Displays a compact, user-friendly error message when a field autosave fails,
 * with an optional Retry button.
 *
 * Replaces the old pattern:
 *   {autosave.state.error && <p>Failed to save: {autosave.state.error.message}</p>}
 *
 * The raw error.message is never shown — it's usually a stack-trace-ish
 * network or server message that confuses non-technical users.
 */
export function FieldSaveError({
  error,
  onRetry,
  fieldLabel,
  className = "",
}: FieldSaveErrorProps) {
  if (!error) return null

  const what = fieldLabel ? `your changes to ${fieldLabel}` : "your changes"

  return (
    <div
      className={`flex items-start gap-2 text-xs text-red-600 ${className}`}
      role="alert"
    >
      <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="leading-relaxed">
        Couldn't save {what}. Check your connection and try again.
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto inline-flex items-center gap-1 text-red-700 underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}
