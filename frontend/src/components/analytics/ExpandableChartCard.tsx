"use client"

import React, { useState, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'

interface ExpandableChartCardProps {
  title: string
  description?: string
  children: ReactNode
  expandedChildren?: ReactNode
  className?: string
  height?: number
}

export function ExpandableChartCard({
  title,
  description,
  children,
  expandedChildren,
  className = '',
  height = 320
}: ExpandableChartCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Card className={`relative ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setIsExpanded(true)}
              title="Expand chart"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: `${height}px` }}>
            {children}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 mt-4 min-h-0 overflow-x-auto overflow-y-auto">
            <div className="min-w-fit">
              {expandedChildren || children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ExpandableChartCard
