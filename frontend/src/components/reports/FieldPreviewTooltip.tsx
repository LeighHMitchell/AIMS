"use client"

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FieldStats, getDataTypeLabel, formatValueForDisplay } from '@/lib/pivot-field-stats'
import { cn } from '@/lib/utils'
import { Hash, Type, Calendar, ToggleLeft, HelpCircle } from 'lucide-react'

interface FieldPreviewTooltipProps {
  stats: FieldStats | null
  anchorElement: HTMLElement | null
  visible: boolean
  onClose: () => void
}

// Data type icon mapping
function DataTypeIcon({ dataType }: { dataType: FieldStats['dataType'] }) {
  const iconProps = { className: "h-3.5 w-3.5" }
  
  switch (dataType) {
    case 'number':
      return <Hash {...iconProps} />
    case 'text':
      return <Type {...iconProps} />
    case 'date':
      return <Calendar {...iconProps} />
    case 'boolean':
      return <ToggleLeft {...iconProps} />
    default:
      return <HelpCircle {...iconProps} />
  }
}

// Mini bar component for value distribution
function MiniBar({ percentage, maxPercentage }: { percentage: number; maxPercentage: number }) {
  const width = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0
  
  return (
    <div className="w-20 h-2 bg-muted rounded-sm overflow-hidden">
      <div 
        className="h-full bg-primary/60 rounded-sm transition-all"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export function FieldPreviewTooltip({
  stats,
  anchorElement,
  visible,
  onClose,
}: FieldPreviewTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)

  // Handle mount for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Calculate position based on anchor element
  useEffect(() => {
    if (!anchorElement || !visible) return

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect()
      const tooltipWidth = 280
      const tooltipHeight = 300
      
      // Position below the element by default
      let top = rect.bottom + 8
      let left = rect.left
      
      // Adjust if tooltip would go off right edge
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16
      }
      
      // Adjust if tooltip would go off bottom
      if (top + tooltipHeight > window.innerHeight - 16) {
        // Position above the element instead
        top = rect.top - tooltipHeight - 8
      }
      
      // Ensure left doesn't go negative
      left = Math.max(16, left)
      
      setPosition({ top, left })
    }

    updatePosition()
    
    // Update position on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [anchorElement, visible])

  // Handle click outside to close
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!mounted || !visible || !stats) return null

  const maxPercentage = stats.topValues.length > 0 
    ? Math.max(...stats.topValues.map(v => v.percentage))
    : 0

  const remainingCount = stats.uniqueCount - stats.topValues.length

  const tooltipContent = (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={`Field preview for ${stats.fieldName}`}
      className={cn(
        "fixed z-[9999] w-[280px] bg-popover border border-border rounded-lg shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="font-medium text-sm text-foreground truncate">
          {stats.fieldName}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <DataTypeIcon dataType={stats.dataType} />
            {getDataTypeLabel(stats.dataType)}
          </span>
          <span>•</span>
          <span>{stats.uniqueCount.toLocaleString()} unique values</span>
        </div>
      </div>

      {/* Top values */}
      <div className="p-3 space-y-2">
        {stats.topValues.length > 0 ? (
          <>
            <div className="text-xs text-muted-foreground font-medium mb-2">
              Top values
            </div>
            <div className="space-y-1.5">
              {stats.topValues.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 truncate text-foreground" title={item.value}>
                    {formatValueForDisplay(item.value, stats.dataType)}
                  </div>
                  <MiniBar percentage={item.percentage} maxPercentage={maxPercentage} />
                  <div className="w-12 text-right text-muted-foreground tabular-nums">
                    {item.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2">
            No non-empty values
          </div>
        )}

        {/* Footer stats */}
        <div className="pt-2 mt-2 border-t border-border space-y-1">
          {remainingCount > 0 && (
            <div className="text-xs text-muted-foreground">
              +{remainingCount.toLocaleString()} more values...
            </div>
          )}
          {stats.nullCount > 0 && (
            <div className="text-xs text-muted-foreground">
              ({stats.nullCount.toLocaleString()} empty values)
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Total: {stats.totalCount.toLocaleString()} records
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(tooltipContent, document.body)
}
