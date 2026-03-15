"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HelpTextTooltipProps {
  /** Tooltip content as children (alternative to `content` / `text` prop) */
  children?: React.ReactNode
  /** Tooltip text (simple string shorthand) */
  content?: string
  /** Alias for `content` — accepted for convenience */
  text?: string
  /** Additional classes for the HelpCircle icon */
  className?: string
  /** Icon size variant */
  size?: "sm" | "default"
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
}

export function HelpTextTooltip({
  children,
  content,
  text,
  className,
  size = "default",
  side,
  align,
  sideOffset = 4
}: HelpTextTooltipProps) {
  const resolvedContent = content || text || children
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={cn(
            size === "sm" ? "h-3.5 w-3.5" : "w-4 h-4",
            "text-muted-foreground/60 hover:text-muted-foreground cursor-help inline-block ml-1",
            className
          )} />
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[16rem] border border-gray-200 bg-white shadow-lg"
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          <p className="text-sm text-gray-600 font-normal">{resolvedContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Alias — drop-in replacement for local HelpTooltip components */
export const HelpTooltip = HelpTextTooltip