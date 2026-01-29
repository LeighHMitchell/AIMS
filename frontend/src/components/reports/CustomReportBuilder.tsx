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

// Import sorting utilities from react-pivottable
import { naturalSort, sortAs } from 'react-pivottable/Utilities'

// Field label mapping for user-friendly names
const FIELD_LABELS: Record<string, string> = {
  'activity_id': 'Activity ID',
  'iati_identifier': 'IATI Identifier',
  'title': 'Activity Title',
  'activity_status': 'Activity Status',
  'activity_status_code': 'Status Code',
  'start_date': 'Start Date',
  'end_date': 'End Date',
  'planned_start_date': 'Planned Start Date',
  'planned_end_date': 'Planned End Date',
  'actual_start_date': 'Actual Start Date',
  'actual_end_date': 'Actual End Date',
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
  // New fields
  'subnational_region': 'State/Region',
  'subnational_percentage': 'Regional %',
  'is_nationwide': 'Is Nationwide',
  'implementing_partners': 'Implementing Partners',
  'funding_organizations': 'Funding Organizations',
  'policy_markers_list': 'Policy Markers',
  'is_humanitarian': 'Is Humanitarian',
  'humanitarian_scope_type': 'Humanitarian Type',
  'humanitarian_scope_code': 'Humanitarian Code',
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
  // Hide some internal fields from new additions
  'subnational_percentage',
  'is_nationwide',
  'humanitarian_scope_code',
]

// Custom sorters for pivot table columns and rows
// Uses friendly field labels (not database column names)
const PIVOT_SORTERS: Record<string, (a: string, b: string) => number> = {
  // Numeric fields - use natural sort for proper number ordering
  'Year': naturalSort,
  'Month': naturalSort,
  'Amount (USD)': naturalSort,
  'Original Amount': naturalSort,
  'Sector %': naturalSort,
  'Sector Code': naturalSort,
  'Status Code': naturalSort,
  'Transaction Type Code': naturalSort,
  'Aid Type Code': naturalSort,
  'Finance Type Code': naturalSort,
  'Flow Type Code': naturalSort,
  'Tied Status Code': naturalSort,
  'Sector Category Code': naturalSort,
  
  // Date fields - natural sort handles ISO date strings correctly
  'Transaction Date': naturalSort,
  'Start Date': naturalSort,
  'End Date': naturalSort,
  
  // Activity Status - logical progression order
  'Activity Status': sortAs([
    'Pipeline/Identification',
    'Implementation',
    'Finalisation',
    'Closed',
    'Cancelled',
    'Suspended',
  ]),
  
  // Transaction Types - logical order (commitments before disbursements)
  'Transaction Type': sortAs([
    'Incoming Commitment',
    'Outgoing Commitment',
    'Commitment',
    'Incoming Funds',
    'Disbursement',
    'Expenditure',
    'Interest Payment',
    'Loan Repayment',
    'Reimbursement',
    'Purchase of Equity',
    'Sale of Equity',
    'Credit Guarantee',
    'Incoming Pledge',
    'Outgoing Pledge',
  ]),
  
  // Quarter - sort Q1, Q2, Q3, Q4 in order
  'Quarter': sortAs(['Q1', 'Q2', 'Q3', 'Q4']),
}

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

// Create custom aggregators with configurable number formatting
// react-pivottable expects: aggregator(attributeArray)() -> returns aggregator instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCustomAggregators(abbreviated: boolean): Record<string, any> {
  const fmt = (value: number) => formatNumber(value, abbreviated)
  
  return {
    'Count': () => () => {
      let count = 0
      return {
        push: () => { count++ },
        value: () => count,
        format: fmt,
      }
    },
    
    'Count Unique Values': ([attr]: string[]) => () => {
      const seen = new Set<unknown>()
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) seen.add(record[attr])
        },
        value: () => seen.size,
        format: fmt,
        numInputs: 1,
      }
    },
    
    'List Unique Values': ([attr]: string[]) => () => {
      const seen = new Set<string>()
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = record[attr]
            if (val !== null && val !== undefined) {
              seen.add(String(val))
            }
          }
        },
        value: () => Array.from(seen).sort().join(', '),
        format: (v: unknown) => String(v),
        numInputs: 1,
      }
    },
    
    'Sum': ([attr]: string[]) => () => {
      let total = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) total += val
          }
        },
        value: () => total,
        format: fmt,
        numInputs: 1,
      }
    },
    
    'Integer Sum': ([attr]: string[]) => () => {
      let total = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseInt(String(record[attr]), 10)
            if (!isNaN(val)) total += val
          }
        },
        value: () => total,
        format: (v: number) => formatNumber(Math.round(v), abbreviated),
        numInputs: 1,
      }
    },
    
    'Average': ([attr]: string[]) => () => {
      let total = 0
      let count = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) {
              total += val
              count++
            }
          }
        },
        value: () => (count > 0 ? total / count : 0),
        format: fmt,
        numInputs: 1,
      }
    },
    
    'Median': ([attr]: string[]) => () => {
      const values: number[] = []
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) values.push(val)
          }
        },
        value: () => {
          if (values.length === 0) return 0
          const sorted = [...values].sort((a, b) => a - b)
          const mid = Math.floor(sorted.length / 2)
          return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2
        },
        format: fmt,
        numInputs: 1,
      }
    },
    
    'Minimum': ([attr]: string[]) => () => {
      let min = Infinity
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val) && val < min) min = val
          }
        },
        value: () => (min === Infinity ? 0 : min),
        format: fmt,
        numInputs: 1,
      }
    },
    
    'Maximum': ([attr]: string[]) => () => {
      let max = -Infinity
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val) && val > max) max = val
          }
        },
        value: () => (max === -Infinity ? 0 : max),
        format: fmt,
        numInputs: 1,
      }
    },
    
    'First': ([attr]: string[]) => () => {
      let first: unknown = null
      return {
        push: (record: Record<string, unknown>) => {
          if (first === null && attr) {
            first = record[attr]
          }
        },
        value: () => first,
        format: (v: unknown) => (v === null ? '' : String(v)),
        numInputs: 1,
      }
    },
    
    'Last': ([attr]: string[]) => () => {
      let last: unknown = null
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            last = record[attr]
          }
        },
        value: () => last,
        format: (v: unknown) => (v === null ? '' : String(v)),
        numInputs: 1,
      }
    },
    
    'Sum over Sum': ([attr1, attr2]: string[]) => () => {
      let sumNum = 0
      let sumDenom = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr1 && attr2) {
            const num = parseFloat(String(record[attr1]))
            const denom = parseFloat(String(record[attr2]))
            if (!isNaN(num)) sumNum += num
            if (!isNaN(denom)) sumDenom += denom
          }
        },
        value: () => (sumDenom !== 0 ? sumNum / sumDenom : 0),
        format: fmt,
        numInputs: 2,
      }
    },
    
    'Sum as Fraction of Total': ([attr]: string[]) => () => {
      let sum = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) sum += val
          }
        },
        value: () => sum,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
        numInputs: 1,
      }
    },
    
    'Sum as Fraction of Rows': ([attr]: string[]) => () => {
      let sum = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) sum += val
          }
        },
        value: () => sum,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
        numInputs: 1,
      }
    },
    
    'Sum as Fraction of Columns': ([attr]: string[]) => () => {
      let sum = 0
      return {
        push: (record: Record<string, unknown>) => {
          if (attr) {
            const val = parseFloat(String(record[attr]))
            if (!isNaN(val)) sum += val
          }
        },
        value: () => sum,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
        numInputs: 1,
      }
    },
    
    'Count as Fraction of Total': () => () => {
      let count = 0
      return {
        push: () => { count++ },
        value: () => count,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
      }
    },
    
    'Count as Fraction of Rows': () => () => {
      let count = 0
      return {
        push: () => { count++ },
        value: () => count,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
      }
    },
    
    'Count as Fraction of Columns': () => () => {
      let count = 0
      return {
        push: () => { count++ },
        value: () => count,
        format: (v: number) => `${(v * 100).toFixed(1)}%`,
      }
    },
  }
}

// Default pivot configuration (uses friendly labels to match transformed data)
const DEFAULT_PIVOT_STATE: PivotConfig = {
  rows: ['Year'],
  cols: ['Development Partner'],
  vals: ['Amount (USD)'],
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
  
  // Number format toggle (default: full numbers)
  const [useAbbreviatedNumbers, setUseAbbreviatedNumbers] = useState(false)
  
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

  // Memoized custom aggregators - rebuilt when number format toggle changes
  const customAggregators = useMemo(
    () => createCustomAggregators(useAbbreviatedNumbers),
    [useAbbreviatedNumbers]
  )

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
                    {useAbbreviatedNumbers ? 'Compact' : 'Full #s'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{useAbbreviatedNumbers ? 'Currently showing compact (1.2M). Click to show full numbers.' : 'Currently showing full numbers. Click to show compact (1.2M).'}</p>
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
                {...pivotState}
                sorters={PIVOT_SORTERS}
                aggregators={customAggregators}
                hiddenAttributes={computedHiddenAttributes}
                hiddenFromAggregators={['Activity Title', 'IATI Identifier', 'Activity ID']}
                unusedOrientationCutoff={Infinity}
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
            <li>Columns and rows are automatically sorted (years, dates, amounts numerically; statuses and transaction types logically)</li>
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
