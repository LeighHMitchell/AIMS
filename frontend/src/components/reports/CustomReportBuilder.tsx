"use client"

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PivotFilters, PivotFilterState } from './PivotFilters'
import { SavedReportsManager, PivotConfig } from './SavedReportsManager'
import { Download, AlertCircle, BarChart3, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'
import { exportTableToCSV } from '@/lib/csv-export'

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
  'finance_type': 'Finance Type',
  'flow_type': 'Flow Type',
  'tied_status': 'Tied Status',
  'activity_scope': 'Activity Scope',
  'collaboration_type': 'Collaboration Type',
}

// Attributes to hide from the pivot UI (internal IDs)
const HIDDEN_ATTRIBUTES = [
  'activity_id',
  'transaction_id',
  'reporting_org_id',
  'activity_status_code',
  'transaction_type_code',
  'sector_category_code',
  'activity_created_at',
  'activity_updated_at',
  'transaction_created_at',
]

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

  // Get hidden attributes with friendly names
  const hiddenAttributeLabels = HIDDEN_ATTRIBUTES.map(attr => FIELD_LABELS[attr] || attr)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Design Your Own Report
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

        {/* Pivot Table */}
        <div className="border rounded-lg overflow-auto bg-white dark:bg-gray-950">
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
                data={reportData}
                onChange={(s: PivotConfig) => setPivotState(s)}
                rows={pivotState.rows}
                cols={pivotState.cols}
                vals={pivotState.vals}
                aggregatorName={pivotState.aggregatorName}
                rendererName={pivotState.rendererName}
                valueFilter={pivotState.valueFilter}
                hiddenAttributes={hiddenAttributeLabels}
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
            <li>Drag numeric fields to &ldquo;values&rdquo; and select an aggregation (Sum, Average, Count, etc.)</li>
            <li>Click column headers to filter specific values</li>
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
        
        .pivot-table-container .pvtAxisContainer li span.pvtAttr {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
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
        
        .pivot-table-container select {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
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
      `}</style>
    </Card>
  )
}
