"use client"

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CopyableExchangeRateProps {
  value: number | null | undefined
  decimals?: number
  className?: string
  emptyDisplay?: React.ReactNode
  suffix?: React.ReactNode
}

export function CopyableExchangeRate({
  value,
  decimals = 4,
  className,
  emptyDisplay = <span className="text-muted-foreground">—</span>,
  suffix,
}: CopyableExchangeRateProps) {
  const [copied, setCopied] = useState(false)

  if (value == null || !Number.isFinite(value)) {
    return <>{emptyDisplay}</>
  }

  const formatted = value.toFixed(decimals)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      toast.success('Exchange rate copied')
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <span
      className={cn(
        'group inline-flex items-center gap-1 font-mono tabular-nums',
        className
      )}
    >
      <span>{formatted}</span>
      {suffix}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy exchange rate"
        className={cn(
          'p-0.5 rounded hover:bg-muted transition-opacity',
          copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
        )}
      >
        {copied ? (
          <Check className="h-3 w-3 text-[hsl(var(--success-icon))]" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </span>
  )
}
