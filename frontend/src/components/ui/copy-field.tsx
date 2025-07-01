"use client"

import React, { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CopyFieldProps {
  label: string
  value: string
  placeholder?: string
  variant?: "inline" | "stacked"
  className?: string
  hideLabel?: boolean
  labelClassName?: string
  fieldClassName?: string
  showToast?: boolean
  toastMessage?: string
}

export function CopyField({
  label,
  value,
  placeholder = "Not set",
  variant = "stacked",
  className = "",
  hideLabel = false,
  labelClassName = "",
  fieldClassName = "",
  showToast = true,
  toastMessage = "Copied to clipboard!"
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleCopy = async () => {
    if (!value || value.trim() === "") {
      if (showToast) {
        toast.error("No value to copy")
      }
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setCopyError(false)
      
      if (showToast) {
        toast.success(toastMessage)
      }
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      setCopyError(true)
      
      if (showToast) {
        toast.error("Failed to copy to clipboard")
      }
      
      // Reset error state after 2 seconds
      setTimeout(() => setCopyError(false), 2000)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleCopy()
    }
  }

  const displayValue = value && value.trim() !== "" ? value : placeholder
  const hasValue = value && value.trim() !== ""
  const isPlaceholder = !hasValue

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {!hideLabel && (
          <label className={cn("text-sm font-medium text-gray-700 min-w-0 flex-shrink-0", labelClassName)}>
            {label}:
          </label>
        )}
        <div className={cn(
          "flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm flex-1 min-w-0",
          "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
          fieldClassName
        )}>
          <span className={cn(
            "truncate flex-1 min-w-0",
            isPlaceholder ? "text-gray-400 italic" : "text-gray-900 font-mono"
          )}>
            {displayValue}
          </span>
          {hasValue && (
            <button
              type="button"
              onClick={handleCopy}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              aria-label={`Copy ${label} to clipboard`}
              className={cn(
                "ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0",
                copied && "text-green-600",
                copyError && "text-red-600"
              )}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Stacked variant (default)
  return (
    <div className={cn("space-y-2", className)}>
      {!hideLabel && (
        <label className={cn("text-sm font-medium text-gray-700", labelClassName)}>
          {label}
        </label>
      )}
      <div className={cn(
        "flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm",
        "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
        fieldClassName
      )}>
        <span className={cn(
          "truncate flex-1 min-w-0",
          isPlaceholder ? "text-gray-400 italic" : "text-gray-900 font-mono"
        )}>
          {displayValue}
        </span>
        {hasValue && (
          <button
            type="button"
            onClick={handleCopy}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label={`Copy ${label} to clipboard`}
            className={cn(
              "ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0",
              copied && "text-green-600",
              copyError && "text-red-600"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Additional utility component for grouped copy fields
interface CopyFieldGroupProps {
  children: React.ReactNode
  title?: string
  variant?: "grid" | "stack"
  className?: string
}

export function CopyFieldGroup({
  children,
  title,
  variant = "stack",
  className = ""
}: CopyFieldGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
          {title}
        </h3>
      )}
      <div className={cn(
        variant === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
          : "space-y-4"
      )}>
        {children}
      </div>
    </div>
  )
}