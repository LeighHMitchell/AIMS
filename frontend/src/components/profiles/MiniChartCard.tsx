'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'

interface MiniChartCardProps {
  title: string
  children: React.ReactNode
  expandedContent?: React.ReactNode
  /** One-line subtitle shown under the title in the expanded view. */
  description?: string
}

export function MiniChartCard({ title, children, expandedContent, description }: MiniChartCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Card className="group">
        <CardHeader className="py-2 px-3 flex-row items-center justify-between space-y-0 group-hover:bg-surface-muted transition-colors rounded-t-lg">
          <CardTitle className="text-xs font-medium text-foreground">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground"
            title="Expand"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {children}
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent chart className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>
              {description ?? `An enlarged view of the ${title} chart for closer inspection.`}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full [&>div]:!h-[400px]">
            {expandedContent || children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
