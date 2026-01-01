"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface ChartGridProps {
  children: React.ReactNode
  className?: string
}

/**
 * A responsive grid layout for compact chart cards.
 * Displays 1 column on mobile, 2 columns on medium screens and up.
 */
export function ChartGrid({ children, className }: ChartGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-6",
      className
    )}>
      {children}
    </div>
  )
}


