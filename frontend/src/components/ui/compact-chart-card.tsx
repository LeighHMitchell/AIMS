"use client"

import React, { useState, cloneElement, isValidElement, ReactElement, createContext, useContext } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Maximize2, Download, Table as TableIcon, BarChart3, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChartExpansionProvider } from '@/lib/chart-expansion-context'
import { formatCurrencyPrecise } from '@/lib/format'

// Toolbar context — when CompactChartCard is rendering with `inlineToolbar`,
// it suppresses its own header table/CSV buttons and provides their handlers
// here so the child chart can render them inline (e.g. on the same row as
// its own filter controls). Returns null when the chart is not inside a
// toolbar-aware card, so `useChartCardToolbar()` callers can no-op safely.
interface ChartCardToolbarValue {
  viewMode: 'chart' | 'table'
  setViewMode: (mode: 'chart' | 'table') => void
  handleExport: () => void
  hasExportData: boolean
  hasTableView: boolean
}
const ChartCardToolbarContext = createContext<ChartCardToolbarValue | null>(null)
export function useChartCardToolbar(): ChartCardToolbarValue | null {
  return useContext(ChartCardToolbarContext)
}

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
  /**
   * Optional rich custom table to render when the user toggles to table view in
   * the expanded dialog. When provided, the table-view button shows even without
   * `exportData`, and clicking it renders this node instead of the generic
   * `exportData` table.
   */
  tableView?: React.ReactNode
  /**
   * Optional explanation of the math/calculations behind this chart. When
   * provided, a small Σ icon renders next to the title; hovering it shows
   * the explanation in a tooltip.
   */
  mathTooltip?: React.ReactNode
  /**
   * When true, hide the table-view + CSV-download buttons from the dialog
   * header. The child chart is expected to call `useChartCardToolbar()` and
   * render those controls itself (e.g. next to its own filter controls).
   * The math (ƒ) and close (×) buttons stay in the header either way.
   */
  inlineToolbar?: boolean
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
  compactHeight = 250,
  tableView,
  mathTooltip,
  inlineToolbar = false,
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

    // Canonical table layout — matches FinancialTotalsBarChart so every chart
    // on the analytics dashboard, activity profile and org profile reads the
    // same way: sticky bg-surface-muted header, hover rows, right-aligned
    // currency, tabular-nums, footer with column + grand totals.
    //
    // Numeric columns are formatted as full USD amounts with 2 decimals via
    // formatCurrencyPrecise. Headers ending in (XXX) are treated as that
    // currency code — the suffix is hidden in the header and used to format
    // the cell value (e.g. "Value (EUR)" → cells formatted in EUR).
    const headers = Object.keys(exportData[0])
    const currencyMatch = (h: string) => h.match(/\(([A-Z]{3})\)\s*$/)
    const stripCurrency = (h: string) => h.replace(/\s*\([A-Z]{3}\)\s*$/, '')
    const formatHeader = (h: string) => {
      const cleaned = stripCurrency(h)
      return cleaned.includes(' ')
        ? cleaned
        : cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/([A-Z])/g, ' $1')
    }
    const isNumericColumn = (h: string) =>
      exportData.some(row => typeof row[h] === 'number')
    const columnTotal = (h: string) =>
      exportData.reduce((sum, row) => sum + (typeof row[h] === 'number' ? row[h] : 0), 0)
    const anyNumeric = headers.some(isNumericColumn)

    return (
      <div className="overflow-auto max-h-[500px] rounded-md border">
        <table className="w-full text-body">
          <thead className="bg-surface-muted sticky top-0">
            <tr>
              {headers.map((header) => {
                const numeric = isNumericColumn(header)
                return (
                  <th
                    key={header}
                    className={cn(
                      "px-4 py-3 font-medium text-foreground border-b whitespace-nowrap",
                      numeric ? "text-right" : "text-left"
                    )}
                  >
                    {formatHeader(header)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {exportData.map((row, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50">
                {headers.map((header) => {
                  const value = row[header]
                  const ccy = currencyMatch(header)?.[1] || 'USD'
                  if (typeof value === 'number') {
                    return (
                      <td
                        key={header}
                        className="text-right px-4 py-2.5 text-foreground tabular-nums"
                      >
                        {formatCurrencyPrecise(value, ccy)}
                      </td>
                    )
                  }
                  return (
                    <td key={header} className="px-4 py-2.5 text-foreground">
                      {String(value ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {anyNumeric && (
            <tfoot className="bg-muted">
              <tr>
                {headers.map((header, i) => {
                  const numeric = isNumericColumn(header)
                  if (!numeric) {
                    return (
                      <td
                        key={header}
                        className="px-4 py-3 font-semibold text-foreground border-t-2 border-border"
                      >
                        {i === 0 ? 'Total' : ''}
                      </td>
                    )
                  }
                  return (
                    <td
                      key={header}
                      className="text-right px-4 py-3 font-semibold text-foreground border-t-2 border-border tabular-nums"
                    >
                      {formatCurrencyPrecise(columnTotal(header), currencyMatch(header)?.[1] || 'USD')}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
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
      <Card className={cn("bg-white border-border flex flex-col", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground truncate">
                {title}
              </CardTitle>
              <CardDescription className="text-body text-muted-foreground line-clamp-1 mt-0.5">
                {shortDescription}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {mathTooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Calculation details"
                        className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-serif text-helper leading-none"
                      >
                        <span className="italic">ƒ</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm whitespace-normal text-body">
                      {mathTooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="h-7 w-7 flex-shrink-0"
              title="Expand to full screen"
              aria-label="Expand to full screen"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1">
          <div
            style={{ height: compactHeight }}
            className="overflow-hidden [&_.text-body.text-muted-foreground.leading-relaxed]:hidden"
          >
            <ChartExpansionProvider isExpanded={false}>
              {renderChart(true)}
            </ChartExpansionProvider>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          chart
          className="max-w-[1800px] w-[98vw] max-h-[95vh] overflow-y-auto overflow-x-visible"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-body mt-2">
                  {fullDescription || shortDescription}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {mathTooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Calculation details"
                          className="h-9 w-9 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-serif text-base leading-none"
                        >
                          <span className="italic">ƒ</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-md whitespace-normal text-body">
                        {mathTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {!inlineToolbar && !hideViewToggle && (tableView || (exportData && exportData.length > 0)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
                    className="h-9"
                    title={viewMode === 'chart' ? 'View as table' : 'View as chart'}
                  >
                    {viewMode === 'chart' ? (
                      <TableIcon className="h-4 w-4" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!inlineToolbar && (exportData || onExport) && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleExport}
                    className="h-9 w-9"
                    title="Export CSV"
                    aria-label="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {/* Explicit close button. Radix Dialog already supports click-
                    outside and Escape to close, but a visible X is the
                    convention users expect on a chart-expand modal — esp. on
                    touch devices where there is no Escape key. */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="h-9 w-9"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Filters section - only shown when expanded */}
          {renderFilters && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
              {renderFilters()}
            </div>
          )}
          
          {/* Chart content */}
          <div className="mt-6">
            <ChartExpansionProvider isExpanded={true}>
              <ChartCardToolbarContext.Provider
                value={{
                  viewMode,
                  setViewMode,
                  handleExport,
                  hasExportData: !!(exportData && exportData.length > 0) || !!onExport,
                  hasTableView: !!(tableView || (exportData && exportData.length > 0)),
                }}
              >
                {viewMode === 'chart' && renderChart(false)}
                {viewMode === 'table' && inlineToolbar && (
                  /* Inline-toolbar charts render their own controls row even
                     in table mode — when viewMode === 'table' the chart hides
                     its plot body, leaving the controls (including the back-
                     to-chart button) intact above the table. */
                  <div className="mb-4">{renderChart(false)}</div>
                )}
                {viewMode === 'table' && (tableView ?? renderTableView())}
              </ChartCardToolbarContext.Provider>
            </ChartExpansionProvider>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


