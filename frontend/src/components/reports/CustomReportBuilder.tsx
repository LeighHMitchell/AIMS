"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { PivotFilters, PivotFilterState } from './PivotFilters'
import { SavedReportsManager, PivotConfig } from './SavedReportsManager'
import { FilterBreadcrumbs } from './FilterBreadcrumbs'
import { FieldPreviewTooltip } from './FieldPreviewTooltip'
import { CellDrillDownSheet, DrillDownContext } from './CellDrillDownSheet'
import { computeAllFieldStats, FieldStatsMap } from '@/lib/pivot-field-stats'
import { Download, AlertCircle, BarChart3, RefreshCw, Info, Search, ArrowLeftRight, RotateCcw, DecimalsArrowLeft, DecimalsArrowRight } from 'lucide-react'
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

// Field type definitions for visual type indicators
const FIELD_TYPES: Record<string, 'text' | 'number' | 'date' | 'percent' | 'boolean'> = {
  // Numeric fields
  'transaction_value_usd': 'number',
  'transaction_value_original': 'number',
  'planned_disbursement_value_usd': 'number',
  'budget_value_usd': 'number',
  'amount_usd': 'number',
  'weighted_amount_usd': 'number',
  'fiscal_month': 'number',

  // Percentage fields
  'sector_percentage': 'percent',
  'subnational_percentage': 'percent',

  // Date fields
  'start_date': 'date',
  'end_date': 'date',
  'planned_start_date': 'date',
  'planned_end_date': 'date',
  'actual_start_date': 'date',
  'actual_end_date': 'date',
  'transaction_date': 'date',
  'effective_date': 'date',

  // Boolean fields
  'is_nationwide': 'boolean',
  'is_humanitarian': 'boolean',
  'is_original_currency': 'boolean',

  // All others default to 'text' (including year fields which display as text)
}

// Type indicator icons (prefixed to field labels)
const TYPE_ICONS: Record<string, string> = {
  text: 'Abc',
  number: '123',
  date: '◷',
  percent: '%',
  boolean: 'Y/N',
}

// Helper to get the type icon for a field
const getFieldIcon = (fieldKey: string): string => {
  const type = FIELD_TYPES[fieldKey] || 'text'
  return TYPE_ICONS[type]
}

// Field label mapping for user-friendly names (with type indicators)
// Type indicators shown at the end of field names (styled via CSS)
// Format: "Field Name [Abc]" where the suffix is styled smaller and lighter gray
const TYPE_SUFFIX = {
  TEXT: '[Abc]',
  NUMERIC: '[123]',
  DATE: '[◷]',
  PERCENT: '[%]',
  BOOLEAN: '[Y/N]',
}

const FIELD_LABELS: Record<string, string> = {
  // Text fields
  'activity_id': `Activity ID ${TYPE_SUFFIX.TEXT}`,
  'iati_identifier': `IATI Identifier ${TYPE_SUFFIX.TEXT}`,
  'title': `Activity Title ${TYPE_SUFFIX.TEXT}`,
  'activity_status': `Activity Status ${TYPE_SUFFIX.TEXT}`,
  'activity_status_code': `Status Code ${TYPE_SUFFIX.TEXT}`,
  'reporting_org_name': `Organization Name ${TYPE_SUFFIX.TEXT}`,
  'reporting_org_acronym': `Organization Acronym ${TYPE_SUFFIX.TEXT}`,
  'reporting_org_full': `Organization Name + Acronym ${TYPE_SUFFIX.TEXT}`,
  'reporting_org_type': `Organization Type ${TYPE_SUFFIX.TEXT}`,
  'transaction_type': `Transaction Type ${TYPE_SUFFIX.TEXT}`,
  'transaction_type_code': `Transaction Type Code ${TYPE_SUFFIX.TEXT}`,
  'transaction_currency': `Currency ${TYPE_SUFFIX.TEXT}`,
  'fiscal_year': `Year ${TYPE_SUFFIX.TEXT}`,
  'fiscal_quarter': `Quarter ${TYPE_SUFFIX.TEXT}`,
  'sector_code': `Sector Code ${TYPE_SUFFIX.TEXT}`,
  'sector_name': `Sector ${TYPE_SUFFIX.TEXT}`,
  'sector_category_code': `Sector Category Code ${TYPE_SUFFIX.TEXT}`,
  'sector_category': `Sector Category ${TYPE_SUFFIX.TEXT}`,
  'aid_type': `Aid Type ${TYPE_SUFFIX.TEXT}`,
  'aid_type_code': `Aid Type Code ${TYPE_SUFFIX.TEXT}`,
  'finance_type': `Finance Type ${TYPE_SUFFIX.TEXT}`,
  'finance_type_code': `Finance Type Code ${TYPE_SUFFIX.TEXT}`,
  'flow_type': `Flow Type ${TYPE_SUFFIX.TEXT}`,
  'flow_type_code': `Flow Type Code ${TYPE_SUFFIX.TEXT}`,
  'tied_status': `Tied Status ${TYPE_SUFFIX.TEXT}`,
  'tied_status_code': `Tied Status Code ${TYPE_SUFFIX.TEXT}`,
  'activity_scope': `Activity Scope ${TYPE_SUFFIX.TEXT}`,
  'collaboration_type': `Collaboration Type ${TYPE_SUFFIX.TEXT}`,
  'subnational_region': `State/Region ${TYPE_SUFFIX.TEXT}`,
  'implementing_partners': `Implementing Partners ${TYPE_SUFFIX.TEXT}`,
  'funding_organizations': `Funding Organizations ${TYPE_SUFFIX.TEXT}`,
  'policy_markers_list': `Policy Markers ${TYPE_SUFFIX.TEXT}`,
  'humanitarian_scope_type': `Humanitarian Type ${TYPE_SUFFIX.TEXT}`,
  'humanitarian_scope_code': `Humanitarian Code ${TYPE_SUFFIX.TEXT}`,
  'record_type': `Record Type ${TYPE_SUFFIX.TEXT}`,
  'record_id': `Record ID ${TYPE_SUFFIX.TEXT}`,
  
  // NOTE: Fiscal Year fields are now generated dynamically from custom_years table
  // The API returns dynamic field labels for each active year type
  // See: frontend/src/app/api/reports/pivot-data/route.ts
  
  // Date fields
  'start_date': `Start Date ${TYPE_SUFFIX.DATE}`,
  'end_date': `End Date ${TYPE_SUFFIX.DATE}`,
  'planned_start_date': `Planned Start Date ${TYPE_SUFFIX.DATE}`,
  'planned_end_date': `Planned End Date ${TYPE_SUFFIX.DATE}`,
  'actual_start_date': `Actual Start Date ${TYPE_SUFFIX.DATE}`,
  'actual_end_date': `Actual End Date ${TYPE_SUFFIX.DATE}`,
  'transaction_date': `Transaction Date ${TYPE_SUFFIX.DATE}`,
  'effective_date': `Effective Date ${TYPE_SUFFIX.DATE}`,
  
  // Numeric fields
  'transaction_value_usd': `Transaction Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
  'transaction_value_original': `Original Amount ${TYPE_SUFFIX.NUMERIC}`,
  'planned_disbursement_value_usd': `Planned Disbursement (USD) ${TYPE_SUFFIX.NUMERIC}`,
  'budget_value_usd': `Budget Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
  'amount_usd': `Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
  'weighted_amount_usd': `Weighted Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
  'fiscal_month': `Month ${TYPE_SUFFIX.NUMERIC}`,

  // Percentage fields
  'sector_percentage': `Sector % ${TYPE_SUFFIX.PERCENT}`,
  'subnational_percentage': `Regional % ${TYPE_SUFFIX.PERCENT}`,

  // Boolean fields
  'is_nationwide': `Is Nationwide ${TYPE_SUFFIX.BOOLEAN}`,
  'is_humanitarian': `Is Humanitarian ${TYPE_SUFFIX.BOOLEAN}`,
  'is_original_currency': `Is Original Currency ${TYPE_SUFFIX.BOOLEAN}`,
}

// Attributes to hide from the pivot UI (internal IDs and codes)
const HIDDEN_ATTRIBUTES = [
  'activity_id',
  'transaction_id',
  'record_id',
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
  'record_created_at',
  // Hide some internal fields from new additions
  'subnational_percentage',
  'is_nationwide',
  'humanitarian_scope_code',
  // Keep fiscal_year visible as legacy "Year" field for backward compatibility
]

// Custom sorters for pivot table columns and rows
// Uses friendly field labels (not database column names)
const PIVOT_SORTERS: Record<string, (a: string, b: string) => number> = {
  // Numeric fields - use natural sort for proper number ordering
  // Field names now use suffix format: "Field Name ·Type"
  [`Year ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Month ${TYPE_SUFFIX.NUMERIC}`]: sortAs(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']),
  [`Amount (USD) ${TYPE_SUFFIX.NUMERIC}`]: naturalSort,
  [`Transaction Amount (USD) ${TYPE_SUFFIX.NUMERIC}`]: naturalSort,
  [`Planned Disbursement (USD) ${TYPE_SUFFIX.NUMERIC}`]: naturalSort,
  [`Budget Amount (USD) ${TYPE_SUFFIX.NUMERIC}`]: naturalSort,
  [`Original Amount ${TYPE_SUFFIX.NUMERIC}`]: naturalSort,
  [`Sector % ${TYPE_SUFFIX.PERCENT}`]: naturalSort,
  [`Sector Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Status Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Transaction Type Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Aid Type Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Finance Type Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Flow Type Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Tied Status Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  [`Sector Category Code ${TYPE_SUFFIX.TEXT}`]: naturalSort,
  
  // Date fields - natural sort handles ISO date strings correctly
  [`Transaction Date ${TYPE_SUFFIX.DATE}`]: naturalSort,
  [`Effective Date ${TYPE_SUFFIX.DATE}`]: naturalSort,
  [`Start Date ${TYPE_SUFFIX.DATE}`]: naturalSort,
  [`End Date ${TYPE_SUFFIX.DATE}`]: naturalSort,
  
  // Activity Status - logical progression order
  [`Activity Status ${TYPE_SUFFIX.TEXT}`]: sortAs([
    'Pipeline/Identification',
    'Implementation',
    'Finalisation',
    'Closed',
    'Cancelled',
    'Suspended',
  ]),
  
  // Transaction Types - logical order (commitments before disbursements)
  [`Transaction Type ${TYPE_SUFFIX.TEXT}`]: sortAs([
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
    'Planned Disbursement',
    'Original Budget',
    'Revised Budget',
    'Budget',
  ]),
  
  // Record Type - logical order (transactions first, then planned, then budget)
  [`Record Type ${TYPE_SUFFIX.TEXT}`]: sortAs([
    'Transaction',
    'Planned Disbursement',
    'Budget',
  ]),
  
  // Quarter - sort Q1, Q2, Q3, Q4 in order
  [`Quarter ${TYPE_SUFFIX.TEXT}`]: sortAs(['Q1', 'Q2', 'Q3', 'Q4']),
}

// Create a Proxy-based sorter that handles both static sorters and dynamic year fields
// Year fields from custom_years table (e.g., "Calendar Year", "US Fiscal Year") all use naturalSort
const DYNAMIC_SORTERS = new Proxy(PIVOT_SORTERS, {
  get(target, prop: string) {
    // First check if there's a static sorter defined
    if (prop in target) {
      return target[prop]
    }
    // For any field containing "Year" or "Fiscal", use natural sort
    // This handles dynamic year types from custom_years table
    if (prop.toLowerCase().includes('year') || prop.toLowerCase().includes('fiscal')) {
      return naturalSort
    }
    return undefined
  }
})

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
// Ordered with Sum and Count first (most commonly used), then a separator, then other aggregators
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCustomAggregators(abbreviated: boolean): Record<string, any> {
  const fmt = (value: number) => formatNumber(value, abbreviated)
  
  return {
    // Most commonly used - at the top
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
    
    'Count': () => () => {
      let count = 0
      return {
        push: () => { count++ },
        value: () => count,
        format: fmt,
      }
    },
    
    // Visual separator (disabled in dropdown via CSS)
    '───────────': () => () => ({
      push: () => {},
      value: () => 0,
      format: () => '',
    }),
    
    // Other aggregators
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
  rows: [`Calendar Year ${TYPE_SUFFIX.TEXT}`],
  cols: [`Organization Name + Acronym ${TYPE_SUFFIX.TEXT}`],
  vals: [`Transaction Amount (USD) ${TYPE_SUFFIX.NUMERIC}`],
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
  
  // Dynamic field labels from API (for year types from custom_years table)
  const [dynamicFieldLabels, setDynamicFieldLabels] = useState<Record<string, string>>({})

  // Year types from API (includes start_month for fiscal year ordering)
  const [yearTypes, setYearTypes] = useState<Array<{ id: string; name: string; short_name: string; start_month: number }>>([])

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
    recordTypes: [],
  })
  
  // Filter option labels for breadcrumbs
  const [filterLabels, setFilterLabels] = useState<{
    organizationLabels: Map<string, string>
    sectorLabels: Map<string, string>
  }>({
    organizationLabels: new Map(),
    sectorLabels: new Map(),
  })
  
  // Field preview tooltip state
  const [hoveredField, setHoveredField] = useState<{
    name: string
    element: HTMLElement
  } | null>(null)
  const pivotContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Cell drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null)

  // Memoized custom aggregators - rebuilt when number format toggle changes
  const customAggregators = useMemo(
    () => createCustomAggregators(useAbbreviatedNumbers),
    [useAbbreviatedNumbers]
  )
  
  // Memoized field statistics for preview tooltips
  const fieldStats: FieldStatsMap = useMemo(
    () => computeAllFieldStats(reportData),
    [reportData]
  )

  // All months for padding when Month is used with a Year field
  const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MONTH_FIELD = `Month ${TYPE_SUFFIX.NUMERIC}`

  // Dynamic month sorter - rotates months based on selected fiscal year type's start month
  const dynamicSorters = useMemo(() => {
    // Find which year field is being used in rows or cols
    const allFields = [...pivotState.rows, ...pivotState.cols]
    const yearField = allFields.find(f => f.includes('Year') && f.includes(TYPE_SUFFIX.TEXT))

    // Determine the start month (1=Jan, 7=Jul for Australian FY, etc.)
    let startMonth = 1 // Default to January (calendar year)

    if (yearField && yearTypes.length > 0) {
      // Extract the year type name from the field label (e.g., "Australian Fiscal Year [Abc]" -> "Australian Fiscal Year")
      const yearTypeName = yearField.replace(` ${TYPE_SUFFIX.TEXT}`, '').trim()
      const matchingYearType = yearTypes.find(
        yt => yt.name === yearTypeName || yt.short_name === yearTypeName
      )
      if (matchingYearType) {
        startMonth = matchingYearType.start_month
      }
    }

    // Rotate months array to start from the fiscal year start month
    // start_month is 1-indexed (1=Jan, 7=Jul)
    const rotatedMonths = [
      ...ALL_MONTHS.slice(startMonth - 1),
      ...ALL_MONTHS.slice(0, startMonth - 1)
    ]

    // Create a new Proxy that includes the dynamic month sorter
    return new Proxy(PIVOT_SORTERS, {
      get(target, prop: string) {
        // Use dynamic month order for the Month field
        if (prop === MONTH_FIELD) {
          return sortAs(rotatedMonths)
        }
        // First check if there's a static sorter defined
        if (prop in target) {
          return target[prop]
        }
        // For any field containing "Year" or "Fiscal", use natural sort
        if (prop.toLowerCase().includes('year') || prop.toLowerCase().includes('fiscal')) {
          return naturalSort
        }
        return undefined
      }
    })
  }, [pivotState.rows, pivotState.cols, yearTypes])

  // Pad data with all months when Month is used alongside a Year field
  // This ensures all 12 months appear even if there's no data for some months
  const paddedReportData = useMemo(() => {
    const allFields = [...pivotState.rows, ...pivotState.cols]

    // Filter out non-Transaction records when Transaction Type is used as a dimension
    // Planned Disbursements and Budgets have NULL transaction_type, so they would appear as blank rows
    const transactionTypeField = `Transaction Type ${TYPE_SUFFIX.TEXT}`
    const recordTypeField = `Record Type ${TYPE_SUFFIX.TEXT}`
    const usesTransactionType = allFields.includes(transactionTypeField)

    let filteredData = reportData
    if (usesTransactionType) {
      // Keep only Transaction records (filter out Planned Disbursements and Budgets)
      // Also ensure transaction_type has a value (not null/undefined/empty)
      filteredData = reportData.filter(row => {
        const recordType = row[recordTypeField]
        const transactionType = row[transactionTypeField]
        return recordType === 'Transaction' && transactionType != null && transactionType !== ''
      })
    }

    const hasMonthField = allFields.includes(MONTH_FIELD)
    // Check for any year field (Calendar Year, Australian Fiscal Year, etc.)
    const yearField = allFields.find(f => f.includes('Year') && f.includes(TYPE_SUFFIX.TEXT))

    if (!hasMonthField || !yearField || filteredData.length === 0) {
      return filteredData
    }

    // Get all unique year values from the data
    const uniqueYears = new Set<string>()
    filteredData.forEach(row => {
      const yearValue = row[yearField]
      if (yearValue !== null && yearValue !== undefined) {
        uniqueYears.add(String(yearValue))
      }
    })

    // Track existing year-month combinations
    const existingCombos = new Set<string>()
    filteredData.forEach(row => {
      const yearValue = row[yearField]
      const monthValue = row[MONTH_FIELD]
      if (yearValue !== null && yearValue !== undefined && monthValue) {
        existingCombos.add(`${yearValue}|${monthValue}`)
      }
    })

    // Create placeholder rows for missing month combinations
    const placeholderRows: Record<string, unknown>[] = []
    uniqueYears.forEach(year => {
      ALL_MONTHS.forEach(month => {
        if (!existingCombos.has(`${year}|${month}`)) {
          // Create a minimal placeholder row with just the year and month
          placeholderRows.push({
            [yearField]: year,
            [MONTH_FIELD]: month,
          })
        }
      })
    })

    return [...filteredData, ...placeholderRows]
  }, [reportData, pivotState.rows, pivotState.cols])

  // Transform data to use friendly field names
  // Merge static and dynamic field labels
  // Frontend FIELD_LABELS take precedence (have type suffixes)
  // Dynamic labels from API provide year fields (also have type suffixes)
  const allFieldLabels = useMemo(() => ({
    ...dynamicFieldLabels,  // API labels first (includes dynamic year fields with suffixes)
    ...FIELD_LABELS,        // Frontend labels override (static fields with suffixes take precedence)
  }), [dynamicFieldLabels])
  
  // Priority fields to show at top of aggregator dropdown
  const PRIORITY_AGGREGATOR_FIELDS = [
    `Transaction Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
    `Planned Disbursement (USD) ${TYPE_SUFFIX.NUMERIC}`,
    `Budget Amount (USD) ${TYPE_SUFFIX.NUMERIC}`,
  ]

  const transformData = useCallback((data: Record<string, unknown>[]) => {
    return data.map(row => {
      const transformed: Record<string, unknown> = {}

      // First, add priority aggregator fields (ensures they appear at top of dropdowns)
      for (const priorityField of PRIORITY_AGGREGATOR_FIELDS) {
        // Find the raw key that maps to this priority field
        const rawKey = Object.keys(allFieldLabels).find(k => allFieldLabels[k] === priorityField)
        if (rawKey && rawKey in row) {
          transformed[priorityField] = row[rawKey]
        }
      }

      // Add separator after priority fields (same approach as aggregator separator)
      transformed['───────────'] = null

      // Then add all other fields
      for (const [key, value] of Object.entries(row)) {
        const label = allFieldLabels[key] || key
        // Skip if already added as priority field
        if (!PRIORITY_AGGREGATOR_FIELDS.includes(label)) {
          transformed[label] = value
        }
      }
      return transformed
    })
  }, [allFieldLabels])
  
  // Memoized hidden attributes with field search applied
  // Active fields (in rows/cols/vals) are never hidden by search
  const computedHiddenAttributes = useMemo(() => {
    const baseHidden = HIDDEN_ATTRIBUTES.map(attr => allFieldLabels[attr] || attr)
    
    if (!fieldSearch.trim()) {
      return baseHidden
    }
    
    // Fields currently in use should never be hidden by search
    const activeFields = new Set([
      ...pivotState.rows,
      ...pivotState.cols,
      ...pivotState.vals,
    ])
    
    // Hide fields that don't match the search (but not active fields)
    const searchLower = fieldSearch.toLowerCase()
    const allLabels = Object.values(allFieldLabels)
    const nonMatchingLabels = allLabels.filter(
      label => 
        !label.toLowerCase().includes(searchLower) && 
        !baseHidden.includes(label) &&
        !activeFields.has(label)  // Don't hide active fields
    )
    
    return [...baseHidden, ...nonMatchingLabels]
  }, [fieldSearch, pivotState.rows, pivotState.cols, pivotState.vals, allFieldLabels])

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

      // Determine effective record types:
      // If Transaction Type is used as a dimension (row or col), automatically filter to only
      // "Transaction" records since Planned Disbursements and Budgets don't have transaction types
      const transactionTypeField = `Transaction Type ${TYPE_SUFFIX.TEXT}`
      const usesTransactionType = pivotState.rows.includes(transactionTypeField) ||
                                   pivotState.cols.includes(transactionTypeField)

      let effectiveRecordTypes = filters.recordTypes
      if (usesTransactionType && filters.recordTypes.length === 0) {
        // Auto-filter to Transaction records when Transaction Type is a dimension
        effectiveRecordTypes = ['Transaction']
      }

      effectiveRecordTypes.forEach(r => params.append('recordTypes', r))

      const response = await fetch(`/api/reports/pivot-data?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      
      const result = await response.json()
      
      // Store dynamic field labels from API (year types from custom_years)
      if (result.fieldLabels) {
        setDynamicFieldLabels(result.fieldLabels)
      }

      // Store year types for dynamic month sorting
      if (result.yearTypes) {
        setYearTypes(result.yearTypes)
      }
      
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
  }, [filters, transformData, pivotState.rows, pivotState.cols])

  // Load data on initial render
  useEffect(() => {
    fetchPivotData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set up hover detection for field preview tooltips
  useEffect(() => {
    const container = pivotContainerRef.current
    if (!container || reportData.length === 0) return

    let hoverTimeout: NodeJS.Timeout | null = null
    
    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement
      
      // Only show tooltip for unused fields (not already in rows/cols/vals)
      const isUnusedField = target.closest('.pvtUnused')
      if (!target.classList.contains('pvtAttr') || !isUnusedField) {
        return
      }
      
      // Extract field name (remove filter dropdown arrow)
      const fieldName = target.textContent?.replace(/[▾×]/g, '').trim()
      if (!fieldName || !fieldStats.has(fieldName)) {
        return
      }
      
      // Add small delay to avoid flickering
      hoverTimeout = setTimeout(() => {
        setHoveredField({ name: fieldName, element: target })
      }, 300)
    }
    
    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('pvtAttr')) {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
          hoverTimeout = null
        }
        setHoveredField(null)
      }
    }
    
    // Use capture phase for better event handling with nested elements
    container.addEventListener('mouseenter', handleMouseEnter, true)
    container.addEventListener('mouseleave', handleMouseLeave, true)
    
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true)
      container.removeEventListener('mouseleave', handleMouseLeave, true)
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [reportData.length, fieldStats])

  // Close pivot field filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const filterBox = document.querySelector('.pvtFilterBox')
      
      if (!filterBox) return
      
      // Check if click is inside the filter box or on a filter trigger (triangle)
      const isInsideFilterBox = filterBox.contains(target)
      const isFilterTrigger = target.closest('.pvtTriangle') || target.classList.contains('pvtTriangle')
      
      // If clicking outside filter box and not on a filter trigger, close it
      if (!isInsideFilterBox && !isFilterTrigger) {
        // Find and click the cancel/close button to close the dropdown
        const cancelBtn = filterBox.querySelector('button:last-child') as HTMLElement
        if (cancelBtn) {
          cancelBtn.click()
        }
      }
    }
    
    // Use capture phase to handle events before they reach the filter box
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [])

  // Sort unused pivot fields alphabetically A-Z
  useEffect(() => {
    const container = pivotContainerRef.current
    if (!container) return

    const sortUnusedFields = () => {
      const unusedContainer = container.querySelector('.pvtUnused')
      if (!unusedContainer) return

      const items = Array.from(unusedContainer.querySelectorAll('li'))
      if (items.length === 0) return

      // Get field names and sort them alphabetically
      const itemsWithNames = items.map(item => {
        const attr = item.querySelector('.pvtAttr')
        const name = attr?.textContent?.replace(/[▾×]/g, '').trim() || ''
        return { item, name }
      })

      // Sort alphabetically (case-insensitive)
      itemsWithNames.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

      // Apply CSS order based on sorted position
      itemsWithNames.forEach(({ item }, index) => {
        (item as HTMLElement).style.order = String(index)
      })
    }

    // Run immediately
    sortUnusedFields()

    // Re-sort when pivot table changes (fields added/removed)
    const observer = new MutationObserver(sortUnusedFields)
    observer.observe(container, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [reportData.length])

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

    // Restore filters if saved with report
    if (config.filters) {
      setFilters({
        startDate: config.filters.startDate ? new Date(config.filters.startDate) : null,
        endDate: config.filters.endDate ? new Date(config.filters.endDate) : null,
        organizationIds: config.filters.organizationIds || [],
        statuses: config.filters.statuses || [],
        sectorCodes: config.filters.sectorCodes || [],
        transactionTypes: config.filters.transactionTypes || [],
        fiscalYears: config.filters.fiscalYears || [],
        recordTypes: config.filters.recordTypes || [],
      })
      // Trigger data refresh with new filters
      setTimeout(() => fetchPivotData(), 100)
    }
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
      // Include current filters in saved config
      filters: {
        startDate: filters.startDate?.toISOString().split('T')[0] || null,
        endDate: filters.endDate?.toISOString().split('T')[0] || null,
        organizationIds: filters.organizationIds,
        statuses: filters.statuses,
        sectorCodes: filters.sectorCodes,
        transactionTypes: filters.transactionTypes,
        fiscalYears: filters.fiscalYears,
        recordTypes: filters.recordTypes,
      },
    }
  }

  // Handle pivot state changes with deduplication
  // When dragging a field from rows to cols (or vice versa), the library's Sortable.js
  // creates a duplicate instead of moving. This handler removes the duplicate.
  const handlePivotStateChange = useCallback((newState: PivotConfig) => {
    // Find fields that appear in both rows and cols
    const duplicates = newState.rows.filter(field => newState.cols.includes(field))

    if (duplicates.length === 0) {
      // No duplicates, just set the state
      setPivotState(newState)
      return
    }

    // For each duplicate, determine where it was originally and remove from there
    const deduplicatedState = { ...newState }

    for (const field of duplicates) {
      const wasInRows = pivotState.rows.includes(field)
      const wasInCols = pivotState.cols.includes(field)

      if (wasInRows && !wasInCols) {
        // Field was moved from rows to cols - remove from rows
        deduplicatedState.rows = deduplicatedState.rows.filter(f => f !== field)
      } else if (wasInCols && !wasInRows) {
        // Field was moved from cols to rows - remove from cols
        deduplicatedState.cols = deduplicatedState.cols.filter(f => f !== field)
      } else {
        // Field was in neither (dragged from unused to both somehow) or in both already
        // Remove from cols to keep it in rows (arbitrary choice)
        deduplicatedState.cols = deduplicatedState.cols.filter(f => f !== field)
      }
    }

    setPivotState(deduplicatedState)
  }, [pivotState.rows, pivotState.cols])

  // Handle filter options loaded from PivotFilters
  const handleFilterOptionsLoaded = useCallback((options: {
    organizationLabels: Map<string, string>
    sectorLabels: Map<string, string>
  }) => {
    setFilterLabels(options)
  }, [])

  // Handle removing a filter from breadcrumbs
  const handleRemoveFilter = useCallback((filterKey: keyof PivotFilterState, value?: string) => {
    setFilters(prev => {
      const updated = { ...prev }
      
      if (filterKey === 'startDate' || filterKey === 'endDate') {
        updated.startDate = null
        updated.endDate = null
      } else if (Array.isArray(prev[filterKey])) {
        // For array filters, clear the entire array (or remove specific value if provided)
        if (value) {
          (updated[filterKey] as string[]) = (prev[filterKey] as string[]).filter(v => v !== value)
        } else {
          (updated[filterKey] as string[]) = []
        }
      }
      
      return updated
    })
    // Auto-apply filters after removal (with small delay for UX)
    setTimeout(() => {
      fetchPivotData()
    }, 100)
  }, [fetchPivotData])

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setFilters({
      startDate: null,
      endDate: null,
      organizationIds: [],
      statuses: [],
      sectorCodes: [],
      transactionTypes: [],
      fiscalYears: [],
      recordTypes: [],
    })
    // Auto-apply after clearing
    setTimeout(() => {
      fetchPivotData()
    }, 100)
  }, [fetchPivotData])

  // Handle cell click for drill-down
  const handlePivotCellClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    
    // Only handle clicks on value cells (not headers or totals)
    const cell = target.closest('td.pvtVal')
    if (!cell || cell.classList.contains('pvtTotal') || cell.classList.contains('pvtGrandTotal')) {
      return
    }
    
    // Find the pivot table
    const table = cell.closest('table.pvtTable')
    if (!table) return
    
    const row = cell.parentElement as HTMLTableRowElement
    if (!row) return
    
    const cellIndex = Array.from(row.cells).indexOf(cell as HTMLTableCellElement)
    const rowIndex = row.rowIndex
    
    // Extract row values from row headers (th elements in the same row)
    const rowValues: string[] = []
    const rowHeaders = Array.from(row.querySelectorAll('th.pvtRowLabel'))
    rowHeaders.forEach(th => {
      const text = th.textContent?.trim()
      if (text) rowValues.push(text)
    })
    
    // Extract column values from column headers
    // We need to look at the thead rows and find the th that corresponds to our cell's column
    const colValues: string[] = []
    const thead = table.querySelector('thead')
    if (thead) {
      const headerRows = Array.from(thead.querySelectorAll('tr'))
      headerRows.forEach(headerRow => {
        const headerCells = Array.from(headerRow.querySelectorAll('th.pvtColLabel'))
        // Find which header cell corresponds to our column
        // This is complex due to colspan, but we can iterate and count
        let currentColIndex = 0
        const rowLabelCount = row.querySelectorAll('th').length
        
        for (const headerCell of headerCells) {
          const colspan = parseInt(headerCell.getAttribute('colspan') || '1', 10)
          const headerCellIndex = Array.from(headerRow.cells).indexOf(headerCell as HTMLTableCellElement)
          
          // Adjust for row label offset
          const effectiveCellIndex = cellIndex - rowLabelCount
          
          if (effectiveCellIndex >= currentColIndex && effectiveCellIndex < currentColIndex + colspan) {
            const text = headerCell.textContent?.trim()
            if (text) colValues.push(text)
            break
          }
          currentColIndex += colspan
        }
      })
    }
    
    // Get the cell value
    const cellValue = cell.textContent?.trim() || ''
    
    // Only proceed if we have some context
    if (rowValues.length === 0 && colValues.length === 0) {
      return
    }
    
    // Set drill-down context
    setDrillDownContext({
      rowFields: pivotState.rows,
      colFields: pivotState.cols,
      rowValues,
      colValues,
      cellValue,
    })
    setDrillDownOpen(true)
  }, [pivotState.rows, pivotState.cols])

  // Export current filtered view to CSV
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
    const filename = `filtered_report_${new Date().toISOString().split('T')[0]}`
    
    exportTableToCSV(reportData, headers, filename)
    toast.success(`Exported ${reportData.length} rows`)
  }

  // Export full unfiltered dataset to CSV
  const [isExportingFull, setIsExportingFull] = useState(false)
  
  const handleExportFullDataset = async () => {
    try {
      setIsExportingFull(true)
      toast.info('Fetching full dataset...')
      
      // Fetch without any filters (high limit)
      const response = await fetch('/api/reports/pivot-data?limit=100000')
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      const transformedData = transformData(result.data || [])
      
      if (transformedData.length === 0) {
        toast.error('No data available to export')
        return
      }
      
      const allKeys = Array.from(
        new Set(transformedData.flatMap(row => Object.keys(row)))
      )
      const headers = allKeys.map(key => ({ key, label: key }))
      const filename = `full_dataset_${new Date().toISOString().split('T')[0]}`
      
      exportTableToCSV(transformedData, headers, filename)
      toast.success(`Exported ${transformedData.length} rows`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export full dataset')
    } finally {
      setIsExportingFull(false)
    }
  }

  // Clear all pivot layout (rows, columns, and values)
  const handleClearLayout = () => {
    setPivotState({
      rows: [],
      cols: [],
      vals: [],
      aggregatorName: 'Sum',
      rendererName: 'Table',
    })
  }

  // Transpose: swap rows and columns
  const handleTranspose = () => {
    setPivotState(prev => ({
      ...prev,
      rows: prev.cols,
      cols: prev.rows,
    }))
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
          <SavedReportsManager
            currentConfig={getCurrentConfigForSave()}
            onLoadReport={handleLoadReport}
            isAdmin={isAdmin}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filters Section */}
        <PivotFilters
          filters={filters}
          onChange={setFilters}
          onApply={fetchPivotData}
          isLoading={isLoading}
          onFilterOptionsLoaded={handleFilterOptionsLoaded}
        />

        {/* Filter Breadcrumbs */}
        <FilterBreadcrumbs
          filters={filters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
          organizationLabels={filterLabels.organizationLabels}
          sectorLabels={filterLabels.sectorLabels}
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

        {/* Warning when mixing record types */}
        {filters.recordTypes.length === 0 && dataInfo && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Data accuracy warning:</strong> You are viewing all record types together (Transactions + Planned Disbursements + Budgets).
              Summing amounts across these types may be misleading. Use the <strong>Record Type</strong> filter to analyze specific data types,
              or use <strong>Weighted Amount (USD)</strong> for accurate sector-level analysis.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar: Field Search + Action Buttons */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
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
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearLayout}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear Layout
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all fields from rows, columns, and values</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTranspose}
                    disabled={pivotState.rows.length === 0 && pivotState.cols.length === 0}
                    className="gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Transpose
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Swap row and column fields</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUseAbbreviatedNumbers(!useAbbreviatedNumbers)}
                    className="gap-2 min-w-[100px]"
                  >
                    {useAbbreviatedNumbers ? (
                      <DecimalsArrowRight className="h-4 w-4" />
                    ) : (
                      <DecimalsArrowLeft className="h-4 w-4" />
                    )}
                    {useAbbreviatedNumbers ? 'Compact' : 'Full #s'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{useAbbreviatedNumbers ? 'Currently showing compact (1.2M). Click to show full numbers.' : 'Currently showing full numbers. Click to show compact (1.2M).'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={reportData.length === 0}
                className="gap-2 rounded-r-none"
              >
                <Download className="h-4 w-4" />
                Export Filtered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFullDataset}
                disabled={isExportingFull}
                className="gap-2 rounded-l-none"
              >
                {isExportingFull ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export All Data
              </Button>
            </div>
          </div>
        </div>

        {/* Pivot Table */}
        <div 
          ref={pivotContainerRef}
          className="border rounded-lg overflow-auto bg-white dark:bg-gray-950 max-h-[600px]"
          onClick={(e) => {
            // Handle clicks on remove buttons for pivot fields
            const target = e.target as HTMLElement
            if (target.classList.contains('pvt-remove-btn')) {
              const fieldName = target.getAttribute('data-field')
              const area = target.getAttribute('data-area')
              if (fieldName && area) {
                e.preventDefault()
                e.stopPropagation()
                if (area === 'rows') {
                  setPivotState(prev => ({
                    ...prev,
                    rows: prev.rows.filter(r => r !== fieldName)
                  }))
                } else if (area === 'cols') {
                  setPivotState(prev => ({
                    ...prev,
                    cols: prev.cols.filter(c => c !== fieldName)
                  }))
                } else if (area === 'vals') {
                  setPivotState(prev => ({
                    ...prev,
                    vals: prev.vals.filter(v => v !== fieldName)
                  }))
                }
              }
            }
            
            // Handle cell clicks for drill-down (only on value cells)
            handlePivotCellClick(e)
          }}
        >
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
            <div className="pivot-table-container" ref={(container) => {
              // Add remove buttons to pivot field chips after render
              if (!container) return
              
              // Type suffix patterns to style (matched at end of field names)
              const TYPE_SUFFIXES = ['[Abc]', '[123]', '[◷]', '[%]', '[Y/N]']
              
              // Style type suffixes in field chips - wrap them in styled spans (without brackets)
              const styleTypeSuffixes = () => {
                container.querySelectorAll('.pvtAttr').forEach(attr => {
                  // Skip if already processed
                  if (attr.querySelector('.field-type-suffix')) return

                  // Get all text content from the element (handles both direct text nodes and nested text)
                  const fullText = attr.textContent || ''

                  // Find if text ends with any type suffix
                  for (const suffix of TYPE_SUFFIXES) {
                    const suffixPattern = ` ${suffix}`
                    if (fullText.includes(suffixPattern)) {
                      // Find and modify the text node that contains the suffix
                      const walker = document.createTreeWalker(attr, NodeFilter.SHOW_TEXT, null)
                      let node: Text | null
                      while ((node = walker.nextNode() as Text | null)) {
                        if (node.textContent && node.textContent.includes(suffixPattern)) {
                          const text = node.textContent
                          const idx = text.lastIndexOf(suffixPattern)
                          const fieldName = text.substring(0, idx)

                          // Create the styled suffix span - strip brackets for cleaner chip display
                          const suffixSpan = document.createElement('span')
                          suffixSpan.className = 'field-type-suffix'
                          const displaySuffix = suffix.replace(/^\[|\]$/g, '') // Remove [ and ]
                          suffixSpan.textContent = ` ${displaySuffix}`

                          // Update text node to just the field name
                          node.textContent = fieldName

                          // Insert suffix span after the text node
                          if (node.parentNode) {
                            node.parentNode.insertBefore(suffixSpan, node.nextSibling)
                          }
                          break
                        }
                      }
                      break
                    }
                  }
                })
              }
              
              // Helper to get the original field name (with brackets) from a styled attr element
              const getOriginalFieldName = (attr: Element): string | null => {
                // Check if already styled (suffix in separate span without brackets)
                const suffixSpan = attr.querySelector('.field-type-suffix')
                if (suffixSpan) {
                  // Get base name from text nodes (excluding the suffix span)
                  let baseName = ''
                  attr.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                      baseName += node.textContent || ''
                    }
                  })
                  baseName = baseName.replace(/[▾×]/g, '').trim()
                  // Get suffix and add brackets back
                  const suffix = suffixSpan.textContent?.trim() || ''
                  if (suffix) {
                    return `${baseName} [${suffix}]`
                  }
                  return baseName
                }
                // Not styled yet - text already has brackets
                return attr.textContent?.replace(/[▾×]/g, '').trim() || null
              }

              // Helper to get display name (without suffix)
              const getDisplayName = (fieldName: string): string => {
                return fieldName.replace(/ \[(Abc|123|◷|%|Y\/N)\]$/, '')
              }

              const addRemoveButtons = () => {
                // First style the type suffixes
                styleTypeSuffixes()

                // Hide separator field from unused area (it's only for dropdowns)
                container.querySelectorAll('.pvtAttr').forEach(attr => {
                  if (attr.textContent?.includes('───────────')) {
                    (attr as HTMLElement).style.display = 'none'
                  }
                })

                // Process rows area
                const rowsContainer = container.querySelector('.pvtRows')
                if (rowsContainer) {
                  rowsContainer.querySelectorAll('.pvtAttr').forEach(attr => {
                    const fieldName = getOriginalFieldName(attr)
                    const displayName = fieldName ? getDisplayName(fieldName) : ''
                    if (fieldName && !attr.querySelector('.pvt-remove-btn')) {
                      const removeBtn = document.createElement('span')
                      removeBtn.className = 'pvt-remove-btn'
                      removeBtn.setAttribute('data-field', fieldName)
                      removeBtn.setAttribute('data-area', 'rows')
                      removeBtn.innerHTML = '×'
                      removeBtn.title = `Remove ${displayName}`
                      attr.appendChild(removeBtn)
                    }
                  })
                }

                // Process cols area
                const colsContainer = container.querySelector('.pvtCols')
                if (colsContainer) {
                  colsContainer.querySelectorAll('.pvtAttr').forEach(attr => {
                    const fieldName = getOriginalFieldName(attr)
                    const displayName = fieldName ? getDisplayName(fieldName) : ''
                    if (fieldName && !attr.querySelector('.pvt-remove-btn')) {
                      const removeBtn = document.createElement('span')
                      removeBtn.className = 'pvt-remove-btn'
                      removeBtn.setAttribute('data-field', fieldName)
                      removeBtn.setAttribute('data-area', 'cols')
                      removeBtn.innerHTML = '×'
                      removeBtn.title = `Remove ${displayName}`
                      attr.appendChild(removeBtn)
                    }
                  })
                }

                // Process vals area
                const valsContainer = container.querySelector('.pvtVals')
                if (valsContainer) {
                  valsContainer.querySelectorAll('.pvtAttr').forEach(attr => {
                    const fieldName = getOriginalFieldName(attr)
                    const displayName = fieldName ? getDisplayName(fieldName) : ''
                    if (fieldName && !attr.querySelector('.pvt-remove-btn')) {
                      const removeBtn = document.createElement('span')
                      removeBtn.className = 'pvt-remove-btn'
                      removeBtn.setAttribute('data-field', fieldName)
                      removeBtn.setAttribute('data-area', 'vals')
                      removeBtn.innerHTML = '×'
                      removeBtn.title = `Remove ${displayName}`
                      attr.appendChild(removeBtn)
                    }
                  })
                }
              }

              // Run immediately and observe for changes
              addRemoveButtons()
              const observer = new MutationObserver(addRemoveButtons)
              observer.observe(container, { childList: true, subtree: true })
              
              // Cleanup on unmount
              return () => observer.disconnect()
            }}>
              <PivotTableUI
                key={`pivot-${dataVersion}-${useAbbreviatedNumbers}-${paddedReportData.length}-${[...pivotState.rows, ...pivotState.cols].find(f => f.includes('Year')) || 'none'}`}
                data={paddedReportData}
                onChange={handlePivotStateChange}
                {...pivotState}
                sorters={dynamicSorters}
                aggregators={customAggregators}
                hiddenAttributes={computedHiddenAttributes}
                hiddenFromAggregators={[
                  `Activity Title ${TYPE_SUFFIX.TEXT}`,
                  `IATI Identifier ${TYPE_SUFFIX.TEXT}`,
                  `Activity ID ${TYPE_SUFFIX.TEXT}`
                ]}
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
            <li>Hover over unused fields to preview their value distribution</li>
            <li>Click the <strong>×</strong> button on any field in rows/columns/values to quickly remove it</li>
            <li>Use <strong>Clear Layout</strong> to reset all rows, columns, and values at once</li>
            <li>Use <strong>Transpose</strong> to swap row and column fields</li>
            <li>Click the dropdown arrow on a field to filter values</li>
            <li><strong>Click any cell value</strong> to drill down and see the underlying transactions</li>
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
        
        /* Unused fields container - flexbox for A-Z sorting via order property */
        .pivot-table-container .pvtUnused {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        /* Field chips with X button for removal */
        .pivot-table-container .pvtAxisContainer li span.pvtAttr,
        .pivot-table-container .pvtRows .pvtAttr,
        .pivot-table-container .pvtCols .pvtAttr,
        .pivot-table-container .pvtVals .pvtAttr {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 4px;
          padding: 4px 44px 4px 8px;
          font-size: 11px;
          position: relative;
          cursor: grab;
        }
        
        .pivot-table-container .pvtAxisContainer li span.pvtAttr .pvtTriangle {
          position: absolute;
          right: 26px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          opacity: 0.6;
          font-size: 10px;
        }
        
        .pivot-table-container .pvtAxisContainer li span.pvtAttr:hover .pvtTriangle {
          opacity: 1;
        }
        
        /* Custom remove button styles */
        .pivot-table-container .pvt-remove-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          color: hsl(var(--muted-foreground));
          border-radius: 50%;
          transition: all 0.15s ease;
          line-height: 1;
        }
        
        .pivot-table-container .pvt-remove-btn:hover {
          background: hsl(var(--destructive) / 0.1);
          color: hsl(var(--destructive));
        }
        
        /* Unused area should not have remove buttons */
        .pivot-table-container .pvtUnused .pvt-remove-btn {
          display: none;
        }
        
        /* Field type suffix styling - smaller and lighter gray at end of field names */
        .pivot-table-container .field-type-suffix {
          font-size: 9px;
          color: hsl(var(--muted-foreground) / 0.6);
          font-weight: 400;
          margin-left: 2px;
          letter-spacing: -0.5px;
        }

        .dark .pivot-table-container .field-type-suffix {
          color: hsl(var(--muted-foreground) / 0.5);
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
        
        /* Clickable value cells for drill-down */
        .pivot-table-container table.pvtTable tbody tr td.pvtVal:not(.pvtTotal):not(.pvtGrandTotal) {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .pivot-table-container table.pvtTable tbody tr td.pvtVal:not(.pvtTotal):not(.pvtGrandTotal):hover {
          background-color: hsl(var(--primary) / 0.08);
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
        
        /* Aggregator and field separator styling - gray divider between common and other options */
        .pivot-table-container .pvtAggregator option[value="───────────"],
        .pivot-table-container select option[value="───────────"] {
          color: hsl(var(--muted-foreground));
          font-size: 8px;
          background: hsl(var(--muted));
          pointer-events: none;
        }

        /* Hide separator field from draggable unused fields area */
        .pivot-table-container .pvtUnused .pvtAttr[data-id="───────────"],
        .pivot-table-container .pvtAxisContainer .pvtAttr[data-id="───────────"] {
          display: none !important;
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

      {/* Field Preview Tooltip */}
      <FieldPreviewTooltip
        stats={hoveredField ? fieldStats.get(hoveredField.name) || null : null}
        anchorElement={hoveredField?.element || null}
        visible={!!hoveredField}
        onClose={() => setHoveredField(null)}
      />

      {/* Cell Drill-Down Sheet */}
      <CellDrillDownSheet
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        context={drillDownContext}
        filters={filters}
      />
    </Card>
  )
}
