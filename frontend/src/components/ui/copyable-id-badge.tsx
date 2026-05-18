"use client"

import React, { useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CopyableIdBadgeProps {
  value: string | null | undefined
  label?: string
  toastMessage?: string
  className?: string
  emptyFallback?: React.ReactNode
  showCheckOnCopy?: boolean
  tooltip?: string
}

export function CopyableIdBadge({
  value,
  label = "ID",
  toastMessage,
  className,
  emptyFallback = <span className="text-muted-foreground">—</span>,
  showCheckOnCopy = true,
  tooltip = "Click to copy",
}: CopyableIdBadgeProps) {
  const [copied, setCopied] = useState(false)

  if (!value) return <>{emptyFallback}</>

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(toastMessage ?? `${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label} to clipboard`}
          className={cn(
            "text-xs font-mono text-muted-foreground bg-muted",
            "hover:bg-muted/80 hover:text-foreground",
            "transition-colors px-1.5 py-0.5 rounded",
            "inline-flex items-center gap-1 align-middle cursor-pointer max-w-full",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className="break-all text-left">{value}</span>
          {showCheckOnCopy && copied && (
            <Check className="h-3 w-3 text-[hsl(var(--success-icon))] flex-shrink-0" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
