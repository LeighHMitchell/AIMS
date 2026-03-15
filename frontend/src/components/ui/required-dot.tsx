import React from "react"
import { cn } from "@/lib/utils"

interface RequiredDotProps {
  className?: string
}

/**
 * RequiredDot - Red dot indicator for required form fields.
 *
 * Usage:
 *   <Label>Field Name <RequiredDot /></Label>
 */
export function RequiredDot({ className }: RequiredDotProps) {
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle",
        className
      )}
      aria-hidden="true"
    />
  )
}
