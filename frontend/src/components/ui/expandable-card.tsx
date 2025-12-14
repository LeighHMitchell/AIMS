"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Maximize2, Download, Table as TableIcon, BarChart3 } from 'lucide-react'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ExpandableCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  exportData?: any[]
  exportFilename?: string
  onExport?: () => void
  hideViewToggle?: boolean
}

export function ExpandableCard({
  title,
  description,
  children,
  className = "",
  headerClassName = "",
  exportData,
  exportFilename,
  onExport,
  hideViewToggle = false
}: ExpandableCardProps) {
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

    const chartTitle = typeof title === 'string' ? title : exportFilename || 'chart-data'
    exportChartToCSV(exportData, chartTitle)
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

    // Get column headers from first data item
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

  return (
    <>
      <Card className={className}>
        <CardHeader className={headerClassName}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {typeof title === 'string' ? (
                <CardTitle className="text-lg font-medium text-slate-700">
                  {title}
                </CardTitle>
              ) : (
                title
              )}
              {description && (
                typeof description === 'string' ? (
                  <CardDescription>{description}</CardDescription>
                ) : (
                  description
                )
              )}
            </div>
            <div className="flex items-center gap-1">
              {!hideViewToggle && exportData && exportData.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                  title={viewMode === 'chart' ? 'View as table' : 'View as chart'}
                >
                  {viewMode === 'chart' ? (
                    <TableIcon className="h-4 w-4 text-slate-600" />
                  ) : (
                    <BarChart3 className="h-4 w-4 text-slate-600" />
                  )}
                </Button>
              )}
              {(exportData || onExport) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4 text-slate-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title="Expand to full screen"
              >
                <Maximize2 className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'chart' ? children : renderTableView()}
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                {typeof title === 'string' ? (
                  <DialogTitle className="text-2xl font-semibold text-slate-800">
                    {title}
                  </DialogTitle>
                ) : (
                  <DialogTitle>{title}</DialogTitle>
                )}
                {description && (
                  typeof description === 'string' ? (
                    <DialogDescription className="text-base mt-2">
                      {description}
                    </DialogDescription>
                  ) : (
                    <DialogDescription>{description}</DialogDescription>
                  )
                )}
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
          <div className="mt-6">
            {viewMode === 'chart' ? children : renderTableView()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
