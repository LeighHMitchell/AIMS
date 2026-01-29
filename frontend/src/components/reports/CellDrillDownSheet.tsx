"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  ExternalLink, 
  Download, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Hash,
  FileText,
  ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { exportTableToCSV } from '@/lib/csv-export'
import { PivotFilterState } from './PivotFilters'

interface DrillDownTransaction {
  activity_id: string
  iati_identifier: string | null
  title: string | null
  transaction_value_usd: number | null
  transaction_date: string | null
  transaction_type: string | null
  reporting_org_name: string | null
  sector_name: string | null
}

interface DrillDownSummary {
  transactionCount: number
  activityCount: number
  totalAmount: number
  avgAmount: number
  truncated: boolean
}

export interface DrillDownContext {
  rowFields: string[]
  colFields: string[]
  rowValues: string[]
  colValues: string[]
  cellValue: string
}

interface CellDrillDownSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: DrillDownContext | null
  filters: PivotFilterState
}

// Format currency
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

// Sorting types
type SortField = 'title' | 'iati_identifier' | 'transaction_type' | 'reporting_org_name' | 'transaction_value_usd' | 'transaction_date'
type SortDirection = 'asc' | 'desc'

export function CellDrillDownSheet({
  open,
  onOpenChange,
  context,
  filters,
}: CellDrillDownSheetProps) {
  const [data, setData] = useState<DrillDownTransaction[]>([])
  const [summary, setSummary] = useState<DrillDownSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('transaction_value_usd')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Fetch drill-down data when context changes
  useEffect(() => {
    if (!open || !context) {
      setData([])
      setSummary(null)
      return
    }

    async function fetchDrillDownData() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/reports/pivot-drill-down', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowFields: context.rowFields,
            colFields: context.colFields,
            rowValues: context.rowValues,
            colValues: context.colValues,
            filters: {
              startDate: filters.startDate?.toISOString().split('T')[0],
              endDate: filters.endDate?.toISOString().split('T')[0],
              organizationIds: filters.organizationIds,
              statuses: filters.statuses,
              sectorCodes: filters.sectorCodes,
              transactionTypes: filters.transactionTypes,
              fiscalYears: filters.fiscalYears,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch data')
        }

        const result = await response.json()
        setData(result.data || [])
        setSummary(result.summary || null)
      } catch (err) {
        console.error('Drill-down fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        toast.error('Failed to load drill-down data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDrillDownData()
  }, [open, context, filters])

  // Sort data
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: string | number | null = a[sortField]
      let bVal: string | number | null = b[sortField]
      
      // Handle nulls
      if (aVal === null) return sortDirection === 'asc' ? -1 : 1
      if (bVal === null) return sortDirection === 'asc' ? 1 : -1
      
      // Compare
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr)
    })
  }, [data, sortField, sortDirection])

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Export to CSV
  const handleExport = () => {
    if (data.length === 0) return

    const headers = [
      { key: 'title', label: 'Activity Title' },
      { key: 'iati_identifier', label: 'IATI ID' },
      { key: 'reporting_org_name', label: 'Development Partner' },
      { key: 'transaction_type', label: 'Transaction Type' },
      { key: 'transaction_value_usd', label: 'Amount (USD)' },
      { key: 'transaction_date', label: 'Date' },
      { key: 'sector_name', label: 'Sector' },
    ]

    const contextLabel = [
      ...context!.rowValues,
      ...context!.colValues,
    ].filter(Boolean).join('_')

    exportTableToCSV(
      data as unknown as Record<string, unknown>[],
      headers,
      `drill_down_${contextLabel}_${new Date().toISOString().split('T')[0]}`
    )
    toast.success('Data exported to CSV')
  }

  // Build title from context
  const getTitle = () => {
    if (!context) return 'Drill-Down Details'
    
    const parts: string[] = []
    context.rowFields.forEach((field, i) => {
      if (context.rowValues[i]) {
        parts.push(`${field}: ${context.rowValues[i]}`)
      }
    })
    context.colFields.forEach((field, i) => {
      if (context.colValues[i]) {
        parts.push(`${field}: ${context.colValues[i]}`)
      }
    })
    
    return parts.length > 0 ? parts.join(' / ') : 'All Data'
  }

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => (
    <ArrowUpDown 
      className={`h-3 w-3 ml-1 inline ${sortField === field ? 'text-foreground' : 'text-muted-foreground/50'}`} 
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            View the underlying transactions for this cell
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Summary Stats */}
          {summary && !isLoading && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Transactions</div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {summary.transactionCount.toLocaleString()}
                  {summary.truncated && (
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      max
                    </Badge>
                  )}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Total Amount</div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  {formatCurrency(summary.totalAmount)}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Activities</div>
                <div className="text-lg font-semibold">
                  {summary.activityCount.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {summary?.truncated && (
                <span className="text-yellow-600 dark:text-yellow-500">
                  Results limited to 100 transactions
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={data.length === 0 || isLoading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center h-48 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !error && (
            <ScrollArea className="flex-1 max-h-[50vh]">
              {data.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No transactions found for this selection
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th 
                        className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('title')}
                      >
                        Activity Title
                        <SortIndicator field="title" />
                      </th>
                      <th 
                        className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('iati_identifier')}
                      >
                        IATI Identifier
                        <SortIndicator field="iati_identifier" />
                      </th>
                      <th 
                        className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('transaction_type')}
                      >
                        Transaction Type
                        <SortIndicator field="transaction_type" />
                      </th>
                      <th 
                        className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('reporting_org_name')}
                      >
                        Partner
                        <SortIndicator field="reporting_org_name" />
                      </th>
                      <th 
                        className="text-right p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('transaction_value_usd')}
                      >
                        Amount
                        <SortIndicator field="transaction_value_usd" />
                      </th>
                      <th 
                        className="text-right p-2 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('transaction_date')}
                      >
                        Date
                        <SortIndicator field="transaction_date" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, index) => (
                      <tr 
                        key={`${row.activity_id}-${index}`}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-2">
                          <div className="font-medium line-clamp-1" title={row.title || undefined}>
                            {row.title || 'Untitled Activity'}
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          <span className="font-mono text-xs" title={row.iati_identifier || undefined}>
                            {row.iati_identifier || '-'}
                          </span>
                        </td>
                        <td className="p-2">
                          {row.transaction_type ? (
                            <Badge variant="outline" className="text-xs">
                              {row.transaction_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          <span className="line-clamp-1" title={row.reporting_org_name || undefined}>
                            {row.reporting_org_name || '-'}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(row.transaction_value_usd)}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatDate(row.transaction_date)}</span>
                            <Link 
                              href={`/activities/${row.activity_id}`}
                              target="_blank"
                              className="text-primary hover:text-primary/80"
                              title="View activity"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
