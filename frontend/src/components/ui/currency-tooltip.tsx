"use client"

import React from "react"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy')
    } catch {
      return dateString
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const tooltipContent = `Converted from ${formatAmount(originalAmount, originalCurrency)} using ${exchangeRate} rate on ${formatDate(conversionDate)}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipContent}</p>
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
          <p className="text-sm max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 