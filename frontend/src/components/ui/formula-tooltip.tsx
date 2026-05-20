"use client"

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * The "ƒ" calculation-explainer button used across the Analytics Dashboard
 * (see CompactChartCard / ExpandableCard). Extracted here so the Activity and
 * Organisation profile charts can render the exact same affordance: a small
 * bordered box showing an italic ƒ, with the math/calculation explanation in a
 * hover tooltip.
 *
 * `content` is math-only — it describes how the chart's numbers are computed.
 * It is intentionally separate from any "what this means" interpretation prose
 * the chart already shows.
 */
export function FormulaTooltip({
  content,
  size = 'sm',
  side = 'bottom',
  className,
}: {
  content: React.ReactNode
  /** sm = inline card header (h-7), md = expanded/dialog header (h-9). */
  size?: 'sm' | 'md'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  if (!content) return null

  const sizeClasses =
    size === 'md'
      ? 'h-9 w-9 text-base'
      : 'h-7 w-7 text-helper'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Calculation details"
            className={cn(
              'inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-serif leading-none',
              sizeClasses,
              className,
            )}
          >
            <span className="italic">ƒ</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm whitespace-normal text-body">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
