"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface HelpTextTooltipProps {
  children?: React.ReactNode
  content?: string
  className?: string
}

export function HelpTextTooltip({ children, content, className = "" }: HelpTextTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`w-4 h-4 text-gray-500 hover:text-gray-700 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
          <p className="text-sm text-gray-600 font-normal">{content || children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 