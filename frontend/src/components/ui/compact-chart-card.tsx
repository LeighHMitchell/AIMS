"use client"

import React, { useState, cloneElement, isValidElement, ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Maximize2, Download, Table as TableIcon, BarChart3 } from 'lucide-react'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CompactChartCardProps {
  title: string
  shortDescription: string  // Shown in compact view
  fullDescription?: string  // Shown in expanded view (falls back to shortDescription)
  children: React.ReactNode // The chart component - should accept compact prop
  renderFilters?: () => React.ReactNode // Optional filters shown only when expanded
  exportData?: any[]
  exportFilename?: string
  onExport?: () => void
  className?: string
  hideViewToggle?: boolean
  compactHeight?: number // Height for compact view, defaults to 250
}

/**
 * A card wrapper for analytics charts that displays in a compact view by default
 * and can be expanded to show full chart with all filters.
 * 
 * The child chart component should accept a `compact` boolean prop.
 * When compact=true, the chart should hide its filters and use sensible defaults.
 */
export function CompactChartCard({
  title,
  shortDescription,
  fullDescription,
  children,
  renderFilters,
  exportData,
  exportFilename,
  onExport,
  className = "",
  hideViewToggle = false,
  compactHeight = 250
}: CompactChartCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const handleExport = () => {
    if (onExport) {
      onExport()
      return
    }

    if (!exportData || exportData.length === 0) {
      toast.error('No data available to export')
      return
    }

    exportChartToCSV(exportData, exportFilename || title)
    toast.success('Chart data exported successfully')
  }

  const renderTableView = () => {
    if (!exportData || exportData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No data available to display in table view
        </div>
      )
    }

    const headers = Object.keys(exportData[0])

    return (
      <div className="overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="font-semibold">
                  {header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {exportData.map((row, idx) => (
              <TableRow key={idx}>
                {headers.map((header) => (
                  <TableCell key={header}>
                    {typeof row[header] === 'number'
                      ? row[header].toLocaleString()
                      : String(row[header] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Clone child element and pass compact prop
  const renderChart = (compact: boolean) => {
    if (isValidElement(children)) {
      return cloneElement(children as ReactElement<{ compact?: boolean }>, { compact })
    }
    return children
  }

  return (
    <>
      {/* Compact Card View */}
      <Card className={cn("bg-white border-slate-200", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium text-slate-700 truncate">
                {title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {shortDescription}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 w-7 p-0 hover:bg-slate-100 flex-shrink-0 ml-2"
              title="Expand to full screen"
            >
              <Maximize2 className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: compactHeight }} className="overflow-hidden">
            {renderChart(true)}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <DialogTitle className="text-2xl font-semibold text-slate-800">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  {fullDescription || shortDescription}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {!hideViewToggle && exportData && exportData.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
                    className="h-9"
                  >
                    {viewMode === 'chart' ? (
                      <>
                        <TableIcon className="h-4 w-4 mr-2" />
                        View as Table
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View as Chart
                      </>
                    )}
                  </Button>
                )}
                {(exportData || onExport) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-9"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {/* Filters section - only shown when expanded */}
          {renderFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {renderFilters()}
            </div>
          )}
          
          {/* Chart content */}
          <div className="mt-6">
            {viewMode === 'chart' ? renderChart(false) : renderTableView()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


