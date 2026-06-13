"use client"

import React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrencyPrecise, formatDate } from "@/lib/format"

interface CurrencyTooltipProps {
  children: React.ReactNode
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  conversionDate?: string
  className?: string
}

export function CurrencyTooltip({
  children,
  originalCurrency,
  originalAmount,
  exchangeRate,
  conversionDate,
  className = ""
}: CurrencyTooltipProps) {
  // Don't show tooltip if no conversion data available
  if (!originalCurrency || !originalAmount || !exchangeRate || !conversionDate) {
    return <>{children}</>
  }

  // Don't show tooltip for USD transactions (no conversion needed)
  if (originalCurrency === 'USD') {
    return <>{children}</>
  }

  // formatDate returns '' for invalid input — fall back to the raw string.
  const tooltipContent = `Converted from ${formatCurrencyPrecise(originalAmount, originalCurrency)} using ${exchangeRate} rate on ${formatDate(conversionDate) || conversionDate}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-body">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface InfoIconTooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function InfoIconTooltip({
  children,
  content,
  className = ""
}: InfoIconTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-body max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 