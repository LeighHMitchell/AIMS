"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RailBlockProps {
  label: string
  /** Optional help text shown via a small (?) icon next to the label. */
  helpText?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function RailBlock({ label, helpText, action, children, className }: RailBlockProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-foreground inline-flex items-center gap-1.5">
          {label}
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`What is "${label}"?`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-xs text-helper leading-relaxed">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h3>
        {action && <div className="text-helper">{action}</div>}
      </header>
      <div className="text-body leading-relaxed">{children}</div>
    </section>
  )
}
