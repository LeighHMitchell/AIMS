"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { PivotFilters, PivotFilterState } from './PivotFilters'
import { SavedReportsManager, PivotConfig } from './SavedReportsManager'
import { Download, AlertCircle, BarChart3, RefreshCw, Info, Search, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { exportTableToCSV } from '@/lib/csv-export'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Dynamically import PivotTableUI to avoid SSR issues
const PivotTableUI = dynamic(
  () => import('react-pivottable/PivotTableUI'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading pivot table...</p>
        </div>
      </div>
    )
  }
)

// Import CSS for react-pivottable
import 'react-pivottable/pivottable.css'

// Field label mapping for user-friendly names
const FIELD_LABELS: Record<string, string> = {
  'activity_id': 'Activity ID',
  'iati_identifier': 'IATI Identifier',
  'title': 'Activity Title',
  'activity_status': 'Activity Status',
  'activity_status_code': 'Status Code',
  'start_date': 'Start Date',
  'end_date': 'End Date',
  'reporting_org_name': 'Development Partner',
  'reporting_org_type': 'Organization Type',
  'transaction_type': 'Transaction Type',
  'transaction_type_code': 'Transaction Type Code',
  'transaction_value_usd': 'Amount (USD)',
  'transaction_value_original': 'Original Amount',
  'transaction_currency': 'Currency',
  'transaction_date': 'Transaction Date',
  'fiscal_year': 'Year',
  'fiscal_quarter': 'Quarter',
  'fiscal_month': 'Month',
  'sector_code': 'Sector Code',
  'sector_name': 'Sector',
  'sector_category_code': 'Sector Category Code',
  'sector_category': 'Sector Category',
  'sector_percentage': 'Sector %',
  'aid_type': 'Aid Type',
  'aid_type_code': 'Aid Type Code',
  'finance_type': 'Finance Type',
  'finance_type_code': 'Finance Type Code',
  'flow_type': 'Flow Type',
  'flow_type_code': 'Flow Type Code',
  'tied_status': 'Tied Status',
  'tied_status_code': 'Tied Status Code',
  'activity_scope': 'Activity Scope',
  'collaboration_type': 'Collaboration Type',
}

// Attributes to hide from the pivot UI (internal IDs and codes)
const HIDDEN_ATTRIBUTES = [
  'activity_id',
  'transaction_id',
  'reporting_org_id',
  'activity_status_code',
  'transaction_type_code',
  'sector_category_code',
  'aid_type_code',
  'finance_type_code',
  'flow_type_code',
  'tied_status_code',
  'activity_created_at',
  'activity_updated_at',
  'transaction_created_at',
]

// Number formatting utility
function formatNumber(value: number, abbreviated: boolean): string {
  if (value === null || value === undefined || isNaN(value)) return ''
  if (!abbreviated) return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const absValue = Math.abs(value)
  if (absValue >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// Default pivot configuration
const DEFAULT_PIVOT_STATE: PivotConfig = {
  rows: ['fiscal_year'],
  cols: ['reporting_org_name'],
  vals: ['transaction_value_usd'],
  aggregatorName: 'Sum',
  rendererName: 'Table',
}

interface CustomReportBuilderProps {
  isAdmin?: boolean
}

export function CustomReportBuilder({ isAdmin = false }: CustomReportBuilderProps) {
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([])
  const [pivotState, setPivotState] = useState<PivotConfig>(DEFAULT_PIVOT_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataInfo, setDataInfo] = useState<{ totalRows: number; truncated: boolean } | null>(null)
  const [dataVersion, setDataVersion] = useState(0) // Used to force pivot re-render when data changes
  
  // Number format toggle (default: abbreviated)
  const [useAbbreviatedNumbers, setUseAbbreviatedNumbers] = useState(true)
  
  // Field search filter
  const [fieldSearch, setFieldSearch] = useState('')
  
  // Filter state
  const [filters, setFilters] = useState<PivotFilterState>({
    startDate: null,
    endDate: null,
    organizationIds: [],
    statuses: [],
    sectorCodes: [],
    transactionTypes: [],
    fiscalYears: [],
  })

  // Transform data to use friendly field names
  const transformData = useCallback((data: Record<string, unknown>[]) => {
    return data.map(row => {
      const transformed: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        const label = FIELD_LABELS[key] || key
        transformed[label] = value
      }
      return transformed
    })
  }, [])
  
  // Memoized hidden attributes with field search applied
  const computedHiddenAttributes = useMemo(() => {
    const baseHidden = HIDDEN_ATTRIBUTES.map(attr => FIELD_LABELS[attr] || attr)
    
    if (!fieldSearch.trim()) {
      return baseHidden
    }
    
    // Hide fields that don't match the search
    const searchLower = fieldSearch.toLowerCase()
    const allLabels = Object.values(FIELD_LABELS)
    const nonMatchingLabels = allLabels.filter(
      label => !label.toLowerCase().includes(searchLower) && !baseHidden.includes(label)
    )
    
    return [...baseHidden, ...nonMatchingLabels]
  }, [fieldSearch])

  // Fetch pivot data from API
  const fetchPivotData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString().split('T')[0])
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString().split('T')[0])
      }
      filters.organizationIds.forEach(id => params.append('organizationIds', id))
      filters.statuses.forEach(s => params.append('statuses', s))
      filters.sectorCodes.forEach(c => params.append('sectorCodes', c))
      filters.transactionTypes.forEach(t => params.append('transactionTypes', t))
      filters.fiscalYears.forEach(y => params.append('fiscalYears', y))

      const response = await fetch(`/api/reports/pivot-data?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      
      const result = await response.json()
      const transformedData = transformData(result.data || [])
      setReportData(transformedData)
      setDataVersion(v => v + 1) // Force pivot table re-render
      setDataInfo({
        totalRows: result.totalRows,
        truncated: result.truncated,
      })
      
      if (result.truncated) {
        toast.warning(`Results limited to ${result.totalRows.toLocaleString()} rows. Use filters to narrow your data.`)
      }
    } catch (err) {
      console.error('Error fetching pivot data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      toast.error('Failed to load pivot data')
    } finally {
      setIsLoading(false)
    }
  }, [filters, transformData])

  // Load data on initial render
  useEffect(() => {
    fetchPivotData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle loading a saved report
  const handleLoadReport = (config: PivotConfig) => {
    // Transform field names in config to use labels
    const transformedConfig: PivotConfig = {
      ...config,
      rows: config.rows.map(r => FIELD_LABELS[r] || r),
      cols: config.cols.map(c => FIELD_LABELS[c] || c),
      vals: config.vals.map(v => FIELD_LABELS[v] || v),
    }
    setPivotState(transformedConfig)
  }

  // Get current config with original field names (for saving)
  const getCurrentConfigForSave = (): PivotConfig => {
    // Reverse transform: convert labels back to field names
    const reverseLabelMap = Object.fromEntries(
      Object.entries(FIELD_LABELS).map(([k, v]) => [v, k])
    )
    
    return {
      ...pivotState,
      rows: pivotState.rows.map(r => reverseLabelMap[r] || r),
      cols: pivotState.cols.map(c => reverseLabelMap[c] || c),
      vals: pivotState.vals.map(v => reverseLabelMap[v] || v),
    }
  }

  // Export current view to CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to export')
      return
    }

    // Get all unique keys from the data
    const allKeys = Array.from(
      new Set(reportData.flatMap(row => Object.keys(row)))
    )
    
    const headers = allKeys.map(key => ({ key, label: key }))
    const filename = `custom_report_${new Date().toISOString().split('T')[0]}`
    
    exportTableToCSV(reportData, headers, filename)
    toast.success('Report exported to CSV')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report Builder
            </CardTitle>
            <CardDescription>
              Create custom pivot tables by dragging and dropping fields. Filter data and save your configurations for later use.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <SavedReportsManager
              currentConfig={getCurrentConfigForSave()}
              onLoadReport={handleLoadReport}
              isAdmin={isAdmin}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => setUseAbbreviatedNumbers(!useAbbreviatedNumbers)}
                    className="gap-2 min-w-[100px]"
                  >
                    <Hash className="h-4 w-4" />
                    {useAbbreviatedNumbers ? '23.2M' : 'Full'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{useAbbreviatedNumbers ? 'Click to show full numbers' : 'Click to show abbreviated numbers'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filters Section */}
        <PivotFilters
          filters={filters}
          onChange={setFilters}
          onApply={fetchPivotData}
          isLoading={isLoading}
        />

        {/* Data info and status */}
        {dataInfo && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              {dataInfo.totalRows.toLocaleString()} rows loaded
            </span>
            {dataInfo.truncated && (
              <span className="text-yellow-600 dark:text-yellow-500">
                (results truncated - apply filters for complete data)
              </span>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Field Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {fieldSearch && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFieldSearch('')}
              className="text-xs"
            >
              Clear search
            </Button>
          )}
        </div>

        {/* Pivot Table */}
        <div className="border rounded-lg overflow-auto bg-white dark:bg-gray-950 max-h-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading data...</p>
              </div>
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or check that activities are published.
                </p>
              </div>
            </div>
          ) : (
            <div className="pivot-table-container">
              <PivotTableUI
                key={`pivot-${dataVersion}-${useAbbreviatedNumbers}`}
                data={reportData}
                onChange={(s: PivotConfig) => setPivotState(s)}
                rows={pivotState.rows}
                cols={pivotState.cols}
                vals={pivotState.vals}
                aggregatorName={pivotState.aggregatorName}
                rendererName={pivotState.rendererName}
                valueFilter={pivotState.valueFilter}
                hiddenAttributes={computedHiddenAttributes}
                hiddenFromAggregators={['Activity Title', 'IATI Identifier', 'Activity ID']}
                unusedOrientationCutoff={Infinity}
                {...pivotState}
              />
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <strong>How to use:</strong>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li>Drag field names from the unused area to &ldquo;rows&rdquo; or &ldquo;columns&rdquo; to create your pivot table structure</li>
            <li>Click the dropdown arrow on a field to filter values, or drag it back to remove</li>
            <li>Drag numeric fields to &ldquo;values&rdquo; and select an aggregation (Sum, Average, Count, etc.)</li>
            <li>Use the search box above to quickly find fields by name</li>
            <li>Toggle the number format button to switch between abbreviated (23.2M) and full values</li>
            <li>Use the renderer dropdown to switch between table, heatmap, and chart views</li>
            <li>Save your configuration to quickly reload it later</li>
          </ul>
        </div>
      </CardContent>

      {/* Custom styles for pivot table */}
      <style jsx global>{`
        .pivot-table-container {
          min-height: 400px;
        }
        
        .pivot-table-container .pvtUi {
          font-family: inherit;
        }
        
        .pivot-table-container .pvtTable {
          font-size: 12px;
        }
        
        .pivot-table-container .pvtAxisContainer,
        .pivot-table-container .pvtVals {
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        
        /* Field chips with X button for removal */
        .pivot-table-container .pvtAxisContainer li span.pvtAttr {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 4px;
          padding: 4px 24px 4px 8px;
          font-size: 11px;
          position: relative;
          cursor: grab;
        }
        
        .pivot-table-container .pvtAxisContainer li span.pvtAttr .pvtTriangle {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          opacity: 0.6;
          font-size: 10px;
        }
        
        .pivot-table-container .pvtAxisContainer li span.pvtAttr:hover .pvtTriangle {
          opacity: 1;
        }
        
        /* Add visible X button appearance to triangle */
        .pivot-table-container .pvtAxisContainer li span.pvtAttr .pvtTriangle::before {
          content: none;
        }
        
        .pivot-table-container .pvtDropdown {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        
        .pivot-table-container table.pvtTable thead tr th,
        .pivot-table-container table.pvtTable tbody tr th {
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
          font-weight: 500;
        }
        
        .pivot-table-container table.pvtTable tbody tr td {
          border-color: hsl(var(--border));
        }
        
        .pivot-table-container .pvtTotal,
        .pivot-table-container .pvtGrandTotal {
          font-weight: 600;
          background: hsl(var(--muted) / 0.5);
        }
        
        /* Sticky bottom totals row */
        .pivot-table-container table.pvtTable {
          position: relative;
        }
        
        .pivot-table-container table.pvtTable tfoot tr,
        .pivot-table-container table.pvtTable tbody tr:last-child {
          position: sticky;
          bottom: 0;
          z-index: 5;
        }
        
        .pivot-table-container table.pvtTable tfoot td,
        .pivot-table-container table.pvtTable tfoot th,
        .pivot-table-container table.pvtTable tbody tr:last-child td.pvtGrandTotal,
        .pivot-table-container table.pvtTable tbody tr:last-child th.pvtGrandTotal {
          background: hsl(var(--muted)) !important;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
        }
        
        .pivot-table-container select {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
        }
        
        /* Filter box styles */
        .pivot-table-container .pvtFilterBox {
          max-height: 300px;
          overflow-y: auto;
        }
        
        /* Dark mode adjustments */
        .dark .pivot-table-container .pvtUi {
          color: hsl(var(--foreground));
        }
        
        .dark .pivot-table-container table.pvtTable {
          color: hsl(var(--foreground));
        }
        
        .dark .pivot-table-container .pvtFilterBox {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        
        .dark .pivot-table-container .pvtCheckContainer {
          background: hsl(var(--background));
        }
        
        .dark .pivot-table-container table.pvtTable tfoot td,
        .dark .pivot-table-container table.pvtTable tfoot th {
          background: hsl(var(--muted)) !important;
        }
      `}</style>
    </Card>
  )
}
