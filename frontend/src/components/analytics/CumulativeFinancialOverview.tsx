"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, Download, LineChart as LineChartIcon, BarChart3, Table as TableIcon, TrendingUp as TrendingUpIcon, CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { excludeInternalTransfers, getPooledFundIds, getReportableActivityIds, DISBURSEMENT_TYPES } from '@/lib/analytics-transaction-filters'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  splitBudgetAcrossYears,
  splitPlannedDisbursementAcrossYears,
  splitTransactionAcrossYears,
  allocateAcrossFiscalYears,
  getFiscalYearForDate
} from '@/utils/year-allocation'
import { FINANCIAL_OVERVIEW_COLORS, BRAND_COLORS } from '@/components/analytics/sectors/sectorColorMap'
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect'
import { type Metric, metricColor } from '@/lib/financial-metrics'
import { CustomYear, getCustomYearRange, getCustomYearLabel, crossesCalendarYear, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { format, parseISO } from 'date-fns'
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

type DataMode = 'cumulative' | 'periodic'
type ChartType = 'line' | 'bar' | 'area' | 'table' | 'total'

// Single source of truth for every series the chart can render, in display
// order: the two planning series first, then all 13 IATI transaction types.
// `key` is the data key used on each chart row; `code` is the IATI tx code;
// `planning` marks Budgets/Planned Disbursements (dashed lines, shown first in
// legend & tooltip). Driving the pipeline + rendering from this list is what
// lets the Metrics dropdown offer (and the chart support) all 13 tx types.
interface SeriesDef {
  metric: Metric
  key: string
  code?: string
  planning?: boolean
}
const SERIES: SeriesDef[] = [
  { metric: 'budgets', key: 'Budgets', planning: true },
  { metric: 'planned', key: 'Planned Disbursements', planning: true },
  { metric: 'tx_1', key: 'Incoming Funds', code: '1' },
  { metric: 'tx_2', key: 'Outgoing Commitments', code: '2' },
  { metric: 'tx_3', key: 'Disbursements', code: '3' },
  { metric: 'tx_4', key: 'Expenditures', code: '4' },
  { metric: 'tx_5', key: 'Interest Payments', code: '5' },
  { metric: 'tx_6', key: 'Loan Repayments', code: '6' },
  { metric: 'tx_7', key: 'Reimbursements', code: '7' },
  { metric: 'tx_8', key: 'Purchases of Equity', code: '8' },
  { metric: 'tx_9', key: 'Sales of Equity', code: '9' },
  { metric: 'tx_10', key: 'Credit Guarantee', code: '10' },
  { metric: 'tx_11', key: 'Incoming Commitments', code: '11' },
  { metric: 'tx_12', key: 'Outgoing Pledges', code: '12' },
  { metric: 'tx_13', key: 'Incoming Pledges', code: '13' },
]
const SERIES_KEYS = SERIES.map(s => s.key)
const CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  SERIES.filter(s => s.code).map(s => [s.code as string, s.key])
)
const SERIES_COLOR: Record<string, string> = Object.fromEntries(
  SERIES.map(s => [s.key, metricColor(s.metric)])
)
const KEY_TO_CODE: Record<string, string | undefined> = Object.fromEntries(
  SERIES.map(s => [s.key, s.code])
)
const PLANNING_KEYS = SERIES.filter(s => s.planning).map(s => s.key)
const HIDDEN_COLOR = '#cbd5e1'
// Valid SVG id for the area gradient of a given series key.
const gradId = (key: string) => `cfo-grad-${key.replace(/[^a-zA-Z0-9]/g, '-')}`

// Generate list of available years (from 2010 to current year + 10 to cover all possible data)
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

interface CumulativeFinancialOverviewProps {
  dateRange?: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey?: number
  compact?: boolean
  organizationId?: string
}

export function CumulativeFinancialOverview({
  dateRange,
  filters,
  refreshKey,
  compact = false,
  organizationId
}: CumulativeFinancialOverviewProps) {
  const isExpanded = useChartExpansion()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [rawData, setRawData] = useState<{ transactions: any[]; plannedDisbursements: any[]; budgets: any[] } | null>(null)
  const [dataMode, setDataMode] = useState<DataMode>('cumulative')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [allocationMethod, setAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')
  // Metrics multiselect — which series to show. Default matches the prior
  // headline view: Budgets + Planned Disbursements + Disbursements.
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['budgets', 'planned', 'tx_3'])

  // Calendar type and year selection state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Calculate effective date range based on custom years and selected years
  const effectiveDateRange = useMemo(() => {
    const customYear = customYears.find(cy => cy.id === calendarType)

    // If we have selected years, use them
    if (customYears.length > 0 && selectedYears.length > 0 && calendarType && customYear) {
      const sortedYears = [...selectedYears].sort((a, b) => a - b)
      const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
      const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    // Fallback: use actual data range if available
    if (actualDataRange && customYear) {
      const firstYearRange = getCustomYearRange(customYear, actualDataRange.minYear)
      const lastYearRange = getCustomYearRange(customYear, actualDataRange.maxYear)
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    // Final fallback: use 5 years from now
    const now = new Date()
    const from = new Date()
    from.setFullYear(now.getFullYear() - 5)
    return { from, to: now }
  }, [customYears, selectedYears, calendarType, actualDataRange])

  // Fetch custom years on mount and set system default
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          // Determine which calendar to use
          let selectedCalendar: CustomYear | undefined

          // First priority: system default
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }

          // Fallback: first available custom year
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }

          // Set the calendar type
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err)
      } finally {
        setCustomYearsLoading(false)
      }
    }
    fetchCustomYears()
  }, [])

  // Fetch actual date range from data on mount to set default year selection
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!supabase) return

      try {
        // Query actual date range from transactions, budgets and planned disbursements
        const { data: transactionDates } = await supabase
          .from('transactions')
          .select('transaction_date')
          .not('transaction_date', 'is', null)

        const { data: budgetDates } = await supabase
          .from('activity_budgets')
          .select('period_start, period_end')
          .not('period_start', 'is', null)

        const { data: pdDates } = await supabase
          .from('planned_disbursements')
          .select('period_start, period_end')
          .not('period_start', 'is', null)

        // Find the actual min/max years from the data
        const allDates: string[] = []

        if (transactionDates) {
          transactionDates.forEach(t => {
            if (t.transaction_date) allDates.push(t.transaction_date)
          })
        }

        if (budgetDates) {
          budgetDates.forEach(b => {
            if (b.period_start) allDates.push(b.period_start)
            if (b.period_end) allDates.push(b.period_end)
          })
        }

        if (pdDates) {
          pdDates.forEach(pd => {
            if (pd.period_start) allDates.push(pd.period_start)
            if (pd.period_end) allDates.push(pd.period_end)
          })
        }

        if (allDates.length > 0) {
          const years = allDates.map(d => new Date(d).getFullYear()).filter(y => !isNaN(y))
          if (years.length > 0) {
            const minYear = Math.min(...years)
            const maxYear = Math.max(...years)
            // Store the actual data range for the "Data Range" button
            setActualDataRange({ minYear, maxYear })
            // Set the default selected years based on actual data
            setSelectedYears([minYear, maxYear])
          }
        } else {
          // Fallback to current year range if no data
          const currentYear = new Date().getFullYear()
          setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
          setSelectedYears([currentYear - 5, currentYear])
        }
      } catch (err) {
        console.error('[CumulativeFinancialOverview] Error fetching date range:', err)
        // Fallback to current year range
        const currentYear = new Date().getFullYear()
        setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
        setSelectedYears([currentYear - 5, currentYear])
      }
    }

    fetchDateRange()
  }, [])

  // Handle year click - select start and end of range
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        setSelectedYears([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      setSelectedYears([year])
    }
  }

  // Select all years
  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

  // Clear all years
  const clearAllYears = () => {
    setSelectedYears([])
  }

  // Select only the data range (years where data exists)
  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    } else {
      // Fallback if actualDataRange not yet loaded - use current year range
      const currentYear = new Date().getFullYear()
      setSelectedYears([currentYear - 10, currentYear + 3])
    }
  }

  // Check if a year is in range
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  // Get year label
  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Fetch raw data (separate from processing to allow allocationMethod changes without refetch)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) {
          console.error('[CumulativeFinancialOverview] Supabase client is not initialized')
          setError('Database connection not available. Please check your environment configuration.')
          return
        }

        // Canonical reporting scope: published & non-deleted activities only
        // (drafts and Recycle-Bin activities excluded) so the chart reconciles
        // with the report routes. Pooled-fund ids drive internal-transfer
        // exclusion on the disbursement series.
        const reportableIds = await getReportableActivityIds(supabase)
        const reportableSet = new Set(reportableIds)
        const pooledFundIds = await getPooledFundIds(supabase)

        // Activity-id scope applied to every query via `.in('activity_id', …)`.
        // Org mode: org's reporting activities intersected with the reportable
        // set. Portfolio mode: the full reportable set.
        let activityIds: string[]
        if (organizationId) {
          const { data: orgActivities, error: orgError } = await supabase
            .from('activities')
            .select('id')
            .eq('reporting_org_id', organizationId)
            .eq('publication_status', 'published')

          if (orgError) {
            console.error('[CumulativeFinancialOverview] Error fetching org activities:', orgError)
            setError('Failed to fetch organization activities')
            return
          }

          activityIds = (orgActivities || []).map(a => a.id).filter((id: string) => reportableSet.has(id))
        } else {
          activityIds = reportableIds
        }

        if (activityIds.length === 0) {
          // No in-scope activities - show empty state (chart renders nothing).
          setRawData({ transactions: [], plannedDisbursements: [], budgets: [] })
          setLoading(false)
          return
        }

        // Fetch ALL data without date filtering - filtering happens in the processing step
        // This allows instant switching between year ranges without refetching
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, activity_id, provider_org_id')
          .eq('status', 'actual')
          .is('deleted_at', null)
          .not('transaction_date', 'is', null)
          .in('activity_id', activityIds)
          .order('transaction_date', { ascending: true })

        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
        }

        // Exclude internal pooled-fund transfers on the disbursement (type 3)
        // series to avoid double-counting, matching the report routes.
        transactionsQuery = excludeInternalTransfers(transactionsQuery, pooledFundIds, DISBURSEMENT_TYPES)

        const { data: transactions, error: transactionsError } = await transactionsQuery

        if (transactionsError) {
          console.error('[CumulativeFinancialOverview] Error fetching transactions:', transactionsError)
          setError(`Failed to fetch transaction data: ${transactionsError.message || transactionsError.toString()}`)
          return
        }

        let plannedQuery = supabase
          .from('planned_disbursements')
          .select('period_start, period_end, amount, usd_amount, currency, activity_id')
          .not('period_start', 'is', null)
          .in('activity_id', activityIds)
          .order('period_start', { ascending: true })

        const { data: plannedDisbursements, error: plannedError } = await plannedQuery

        if (plannedError) {
          console.error('[CumulativeFinancialOverview] Error fetching planned disbursements:', plannedError)
        }

        let budgetsQuery = supabase
          .from('activity_budgets')
          .select('period_start, period_end, value, usd_value, currency, activity_id')
          .not('period_start', 'is', null)
          .is('deleted_at', null)
          .in('activity_id', activityIds)
          .order('period_start', { ascending: true })

        const { data: budgets, error: budgetsError } = await budgetsQuery

        if (budgetsError) {
          console.error('[CumulativeFinancialOverview] Error fetching budgets:', budgetsError)
        }

        // Store raw data for processing
        setRawData({
          transactions: transactions || [],
          plannedDisbursements: plannedDisbursements || [],
          budgets: budgets || []
        })
      } catch (err) {
        console.error('[CumulativeFinancialOverview] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters, refreshKey, organizationId]) // Don't depend on effectiveDateRange - fetch all data once, filter in processing

  // Process raw data into chart data (runs when allocationMethod or calendarType changes without refetching)
  useEffect(() => {
    if (!rawData) return

    const { transactions, plannedDisbursements, budgets } = rawData

    // Get the custom year for label formatting and fiscal year allocation
    const customYear = customYears.find(cy => cy.id === calendarType)
    const useFiscalYear = customYear && crossesCalendarYear(customYear)

    // Process data using year-based allocation
    // Per-year amounts keyed by series key (e.g. 'Disbursements', 'Budgets').
    const yearlyDataMap = new Map<number, Record<string, number>>()

    // Per-year amounts keyed by series key (e.g. 'Disbursements', 'Budgets').
    const ensureYearEntry = (year: number) => {
      if (!yearlyDataMap.has(year)) {
        const entry: Record<string, number> = {}
        SERIES_KEYS.forEach(k => { entry[k] = 0 })
        yearlyDataMap.set(year, entry)
      }
    }

    // Add a transaction amount to the correct series for a year. Handles all
    // 13 IATI transaction-type codes via CODE_TO_KEY (unknown codes ignored).
    const addTransactionToYear = (year: number, amount: number, type: string) => {
      const key = CODE_TO_KEY[type]
      if (!key) return
      ensureYearEntry(year)
      const yearData = yearlyDataMap.get(year)!
      yearData[key] += amount
    }

    // Process transactions
    transactions?.forEach((transaction: any) => {
      const type = transaction.transaction_type
      
      if (useFiscalYear && customYear && transaction.transaction_date) {
        // Use fiscal year allocation
        const value = parseFloat(String(transaction.value_usd)) || 
                     (transaction.currency === 'USD' ? parseFloat(String(transaction.value)) || 0 : 0)
        if (value > 0) {
          const date = parseISO(transaction.transaction_date)
          if (!isNaN(date.getTime())) {
            const fiscalYear = getFiscalYearForDate(date, customYear)
            addTransactionToYear(fiscalYear, value, type)
          }
        }
      } else {
        // Use calendar year allocation. Guard against negative/zero values so
        // the cumulative series stays monotonic (the fiscal path already does
        // this; this branch previously didn't).
        const txValue = parseFloat(String(transaction.value_usd)) ||
                       (transaction.currency === 'USD' ? parseFloat(String(transaction.value)) || 0 : 0)
        if (txValue <= 0) return

        const txToProcess = allocationMethod === 'proportional'
          ? transaction
          : { ...transaction, period_start: null, period_end: null }

        const yearAllocations = splitTransactionAcrossYears(txToProcess)

        yearAllocations.forEach(({ year, amount }) => {
          addTransactionToYear(year, amount, type)
        })
      }
    })

    // Process planned disbursements
    plannedDisbursements?.forEach((pd: any) => {
      const value = parseFloat(String(pd.usd_amount)) || 
                   (pd.currency === 'USD' ? parseFloat(String(pd.amount)) || 0 : 0)
      if (value <= 0) return

      if (useFiscalYear && customYear && pd.period_start) {
        // Use fiscal year allocation
        if (pd.period_end) {
          const fiscalAllocations = allocateAcrossFiscalYears(
            pd.period_start,
            pd.period_end,
            value,
            customYear
          )
          fiscalAllocations.forEach(({ fiscalYear, amount }) => {
            ensureYearEntry(fiscalYear)
            yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] +=amount
          })
        } else {
          // Single date - assign to fiscal year
          const date = parseISO(pd.period_start)
          if (!isNaN(date.getTime())) {
            const fiscalYear = getFiscalYearForDate(date, customYear)
            ensureYearEntry(fiscalYear)
            yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] +=value
          }
        }
      } else if (allocationMethod === 'proportional') {
        // Use calendar year allocation
        const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!['Planned Disbursements'] +=amount
        })
      } else {
        if (pd.period_start) {
          const startDate = new Date(pd.period_start)
          if (!isNaN(startDate.getTime())) {
            const year = startDate.getFullYear()
            ensureYearEntry(year)
            yearlyDataMap.get(year)!['Planned Disbursements'] +=value
          }
        }
      }
    })

    // Process budgets
    budgets?.forEach((budget: any) => {
      const value = parseFloat(String(budget.usd_value)) || 
                   (budget.currency === 'USD' ? parseFloat(String(budget.value)) || 0 : 0)
      if (value <= 0) return

      if (useFiscalYear && customYear && budget.period_start && budget.period_end) {
        // Use fiscal year allocation
        const fiscalAllocations = allocateAcrossFiscalYears(
          budget.period_start,
          budget.period_end,
          value,
          customYear
        )
        // [DIAGNOSTIC] surface any negative/odd budget allocation under a
        // fiscal calendar (investigating the reported -480m at FY2031/32).
        // Remove once the root cause is confirmed.
        const negativeAlloc = fiscalAllocations.find(a => a.amount < 0)
        const farFuture = fiscalAllocations.find(a => a.fiscalYear >= 2030)
        if (negativeAlloc || farFuture) {
          console.warn('[CFO-DIAG] budget allocation', {
            activity_id: budget.activity_id,
            period_start: budget.period_start,
            period_end: budget.period_end,
            usd_value: budget.usd_value,
            value,
            allocations: fiscalAllocations,
          })
        }
        fiscalAllocations.forEach(({ fiscalYear, amount }) => {
          ensureYearEntry(fiscalYear)
          yearlyDataMap.get(fiscalYear)!['Budgets'] +=amount
        })
      } else if (allocationMethod === 'proportional') {
        // Use calendar year allocation
        const yearAllocations = splitBudgetAcrossYears(budget)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!['Budgets'] +=amount
        })
      } else {
        if (budget.period_start) {
          const startDate = new Date(budget.period_start)
          if (!isNaN(startDate.getTime())) {
            const year = startDate.getFullYear()
            ensureYearEntry(year)
            yearlyDataMap.get(year)!['Budgets'] +=value
          }
        }
      }
    })

    // Convert to cumulative values — generic running total per series key.
    const sortedYears = Array.from(yearlyDataMap.keys()).sort((a, b) => a - b)

    const cumulative: Record<string, number> = {}
    SERIES_KEYS.forEach(k => { cumulative[k] = 0 })

    const yearlyMap = new Map<string, any>()

    sortedYears.forEach((year) => {
      const yearData = yearlyDataMap.get(year)!

      const yearKey = `${year}`
      const yearDate = new Date(year, 0, 1)
      const displayLabel = customYear ? getCustomYearLabel(customYear, year) : `${year}`

      const row: Record<string, any> = {
        date: yearDate.toISOString(),
        timestamp: yearDate.getTime(),
        yearKey,
        displayDate: displayLabel,
        fullDate: displayLabel,
      }
      SERIES_KEYS.forEach(k => {
        cumulative[k] += yearData[k] || 0
        row[k] = cumulative[k]
      })

      yearlyMap.set(yearKey, row)
    })

    const sortedData = Array.from(yearlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)

    if (sortedData.length === 0) {
      setCumulativeData([])
      return
    }

    // Fill in missing years - use selected year range, not just data range
    const filledData: any[] = []
    const dataMap = new Map(sortedData.map(d => [d.yearKey, d]))

    // Use effectiveDateRange to determine the full year range to display
    const startYear = effectiveDateRange.from.getFullYear()
    const endYear = effectiveDateRange.to.getFullYear()

    // Initialize with cumulative values from years BEFORE startYear (if any)
    // This ensures cumulative totals carry forward when viewing a subset of years
    let lastCumulativeValues = {
      incomingCommitment: 0,
      incomingFunds: 0,
      outgoingCommitment: 0,
      creditGuarantee: 0,
      disbursements: 0,
      expenditures: 0,
      plannedDisbursements: 0,
      plannedBudgets: 0
    }

    // Find the most recent year before startYear that has data
    const yearsBeforeStart = sortedData.filter(d => parseInt(d.yearKey) < startYear)
    if (yearsBeforeStart.length > 0) {
      const mostRecentPriorYear = yearsBeforeStart[yearsBeforeStart.length - 1]
      lastCumulativeValues = {
        incomingCommitment: mostRecentPriorYear['Incoming Commitments'] || 0,
        incomingFunds: mostRecentPriorYear['Incoming Funds'] || 0,
        outgoingCommitment: mostRecentPriorYear['Outgoing Commitments'] || 0,
        creditGuarantee: mostRecentPriorYear['Credit Guarantee'] || 0,
        disbursements: mostRecentPriorYear['Disbursements'] || 0,
        expenditures: mostRecentPriorYear['Expenditures'] || 0,
        plannedDisbursements: mostRecentPriorYear['Planned Disbursements'] || 0,
        plannedBudgets: mostRecentPriorYear['Budgets'] || 0
      }
    }

    for (let year = startYear; year <= endYear; year++) {
      const yearKey = `${year}`

      if (dataMap.has(yearKey)) {
        const existingData = dataMap.get(yearKey)!
        filledData.push(existingData)
        lastCumulativeValues = {
          incomingCommitment: existingData['Incoming Commitments'],
          incomingFunds: existingData['Incoming Funds'],
          outgoingCommitment: existingData['Outgoing Commitments'],
          creditGuarantee: existingData['Credit Guarantee'],
          disbursements: existingData['Disbursements'],
          expenditures: existingData['Expenditures'],
          plannedDisbursements: existingData['Planned Disbursements'],
          plannedBudgets: existingData['Budgets']
        }
      } else {
        const yearDate = new Date(year, 0, 1)
        const displayLabel = customYear ? getCustomYearLabel(customYear, year) : `${year}`
        filledData.push({
          date: yearDate.toISOString(),
          timestamp: yearDate.getTime(),
          yearKey,
          displayDate: displayLabel,
          fullDate: displayLabel,
          'Incoming Commitments': lastCumulativeValues.incomingCommitment,
          'Incoming Funds': lastCumulativeValues.incomingFunds,
          'Outgoing Commitments': lastCumulativeValues.outgoingCommitment,
          'Credit Guarantee': lastCumulativeValues.creditGuarantee,
          'Disbursements': lastCumulativeValues.disbursements,
          'Expenditures': lastCumulativeValues.expenditures,
          'Planned Disbursements': lastCumulativeValues.plannedDisbursements,
          'Budgets': null
        })
      }
    }

    setCumulativeData(filledData)
  }, [rawData, allocationMethod, customYears, calendarType, effectiveDateRange])

  // No filtering - use all available data
  const filteredData = useMemo(() => {
    return cumulativeData
  }, [cumulativeData])

  // Calculate periodic (non-cumulative) data — year-over-year delta per series.
  const periodicData = useMemo(() => {
    if (filteredData.length === 0) return []

    return filteredData.map((item, index) => {
      const out: Record<string, any> = { ...item }
      const prevItem = index === 0 ? null : filteredData[index - 1]
      SERIES_KEYS.forEach(k => {
        out[k] = prevItem ? (item[k] || 0) - (prevItem[k] || 0) : (item[k] || 0)
      })
      return out
    })
  }, [filteredData])

  // Calculate totals — last cumulative value per series.
  const totals = useMemo(() => {
    if (filteredData.length === 0) return null
    const lastItem = filteredData[filteredData.length - 1]
    const out: Record<string, number> = {}
    SERIES_KEYS.forEach(k => { out[k] = lastItem[k] || 0 })
    return out
  }, [filteredData])

  // Get display data based on data mode
  const displayData = useMemo(() => {
    if (dataMode === 'periodic') return periodicData
    return filteredData
  }, [dataMode, filteredData, periodicData])

  // Series that have non-zero data AND are selected in the Metrics dropdown.
  const activeSeries = useMemo(() => {
    const series = new Set<string>()
    if (displayData.length === 0) return series
    const selected = new Set(selectedMetrics)
    SERIES.forEach(s => {
      if (!selected.has(s.metric)) return
      const hasData = displayData.some(d => d[s.key] && d[s.key] !== 0)
      if (hasData) series.add(s.key)
    })
    return series
  }, [displayData, selectedMetrics])

  // SERIES entries currently rendered (selected + has data), in display order.
  const visibleSeries = useMemo(
    () => SERIES.filter(s => activeSeries.has(s.key)),
    [activeSeries]
  )

  // Calculate intelligent tick interval for x-axis (for yearly data)
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 10) return 0  // Show all years if 10 or fewer
    if (dataLength <= 20) return 1  // Show every other year
    if (dataLength <= 30) return 2  // Show every 3rd year
    return Math.floor(dataLength / 10)  // Show ~10 ticks
  }

  // IATI transaction-type code for a series key (null for Budgets/Planned).
  const getTransactionTypeCode = (seriesName: string): string | null =>
    KEY_TO_CODE[seriesName] || (seriesName === 'Commitments' ? '2' : null)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Try to get full date from the data point, fallback to label
      const fullDate = payload[0]?.payload?.fullDate || label
      const dataPoint = payload[0]?.payload

      // Build list of entries with their values
      const entries = payload.map((entry: any) => {
        let value = entry.value
        if (value == null || value === undefined || (typeof value === 'number' && (isNaN(value) || value === 0))) {
          value = dataPoint?.[entry.dataKey] ?? dataPoint?.[entry.name] ?? 0
        }
        const displayValue = Number(value) || 0
        return {
          ...entry,
          displayValue: displayValue
        }
      }).filter((entry: any) => entry.displayValue != null && entry.displayValue !== 0)

      if (entries.length === 0) {
        return null
      }

      // Planning series (Budgets, then Planned Disbursements) listed FIRST,
      // then a divider, then the transaction types — per request.
      const planningOrder = (name: string) => {
        const i = PLANNING_KEYS.indexOf(name)
        return i === -1 ? Number.MAX_SAFE_INTEGER : i
      }
      const seriesOrder = (name: string) => {
        const i = SERIES_KEYS.indexOf(name)
        return i === -1 ? Number.MAX_SAFE_INTEGER : i
      }
      const plannedBudgets = entries
        .filter((e: any) => PLANNING_KEYS.includes(e.name))
        .sort((a: any, b: any) => planningOrder(a.name) - planningOrder(b.name))
      const transactions = entries
        .filter((e: any) => !PLANNING_KEYS.includes(e.name))
        .sort((a: any, b: any) => seriesOrder(a.name) - seriesOrder(b.name))

      const toRow = (entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(entry.displayValue, isExpanded),
        color: entry.color,
        code: getTransactionTypeCode(entry.name) || undefined,
      })

      const rows: any[] = plannedBudgets.map(toRow)
      if (plannedBudgets.length > 0 && transactions.length > 0) {
        rows[rows.length - 1].bordered = true
      }
      transactions.forEach((e: any) => rows.push(toRow(e)))

      const calendarName = customYears.find(cy => cy.id === calendarType)?.name

      return (
        <ChartTooltipCard
          title={fullDate}
          subtitle={calendarName}
          rows={rows}
        />
      )
    }
    return null
  }

  // Handle legend click to toggle series visibility
  const handleLegendClick = (e: any) => {
    if (!e || !e.dataKey) return

    const dataKey = e.dataKey
    const newHiddenSeries = new Set(hiddenSeries)

    if (newHiddenSeries.has(dataKey)) {
      newHiddenSeries.delete(dataKey)
    } else {
      newHiddenSeries.add(dataKey)
    }

    setHiddenSeries(newHiddenSeries)
  }

  // Custom legend formatter to show opacity for hidden series
  const renderLegend = (props: any) => {
    const { payload } = props
    const isDashed = (dataKey: string) => dataKey === 'Planned Disbursements' || dataKey === 'Budgets'

    // Sort payload to put Budgets and Planned Disbursements first
    const legendOrder = ['Budgets', 'Planned Disbursements']
    const sortedPayload = [...payload].sort((a: any, b: any) => {
      const aIndex = legendOrder.indexOf(a.dataKey)
      const bIndex = legendOrder.indexOf(b.dataKey)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return 0
    })

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {sortedPayload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey)

          return (
            <li
              key={`item-${index}`}
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => handleLegendClick({ dataKey: entry.dataKey })}
              style={{ opacity: isHidden ? 0.3 : 1 }}
            >
              {chartType === 'line' || chartType === 'area' ? (
                isDashed(entry.dataKey) ? (
                  <svg width="16" height="3" className="flex-shrink-0">
                    <line
                      x1="0" y1="1.5" x2="16" y2="1.5"
                      stroke={entry.color}
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="3" className="flex-shrink-0">
                    <line
                      x1="0" y1="1.5" x2="16" y2="1.5"
                      stroke={entry.color}
                      strokeWidth="2"
                    />
                  </svg>
                )
              ) : (
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span className="text-body text-foreground">{entry.value}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = displayData.map(d => ({
      'Period': d.fullDate || d.displayDate,
      'Incoming Commitments': d['Incoming Commitments']?.toFixed(2) || '0.00',
      'Incoming Funds': d['Incoming Funds']?.toFixed(2) || '0.00',
      'Outgoing Commitments': d['Outgoing Commitments']?.toFixed(2) || '0.00',
      'Credit Guarantee': d['Credit Guarantee']?.toFixed(2) || '0.00',
      'Disbursements': d['Disbursements']?.toFixed(2) || '0.00',
      'Expenditures': d['Expenditures']?.toFixed(2) || '0.00',
      'Planned Disbursements': d['Planned Disbursements']?.toFixed(2) || '0.00',
      'Budgets': d['Budgets']?.toFixed(2) || '0.00'
    }))

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n")

    // Download CSV directly
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `cumulative-financial-overview-${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (error || displayData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">{error || 'No data available'}</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 20, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis
              dataKey="displayDate"
              stroke="#64748B"
              fontSize={11}
              tickLine={{ stroke: '#64748B' }}
              interval={Math.max(0, Math.floor(displayData.length / 6))}
              angle={0}
              textAnchor="middle"
              height={30}
            />
            <YAxis
              tickFormatter={formatAxisCurrency}
              stroke="#64748B"
              fontSize={10}
            />
            <Tooltip content={<CustomTooltip />} />
            {!hiddenSeries.has('Disbursements') && (
              <Line type="monotone" dataKey="Disbursements" name="Disbursements" stroke={FINANCIAL_OVERVIEW_COLORS['Disbursements']} strokeWidth={2} dot={false} />
            )}
            {!hiddenSeries.has('Outgoing Commitments') && (
              <Line type="monotone" dataKey="Outgoing Commitments" name="Commitments" stroke={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']} strokeWidth={2} dot={false} />
            )}
            {!hiddenSeries.has('Planned Disbursements') && (
              <Line type="monotone" dataKey="Planned Disbursements" name="Planned" stroke={FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-visible">
      <div className="flex flex-col gap-4 overflow-visible">

        {/* Calendar + year selector on its own row at the top */}
        <div className="flex items-start gap-2">
              {customYears.length > 0 && (
                <>
                  {/* Calendar Type Selector */}
                  <div className="flex gap-1 border rounded-lg p-1 bg-white">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {sortCustomYearsCalendarFirst(customYears).map(cy => (
                          <DropdownMenuItem
                            key={cy.id}
                            className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                            onClick={() => setCalendarType(cy.id)}
                          >
                            <span className="flex items-center gap-2">
                              {cy.shortName && (
                                <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  {cy.shortName.trim()}
                                </span>
                              )}
                              {cy.name}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Year Range Selector with Date Range below */}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 border rounded-lg p-1 bg-white">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            title={effectiveDateRange?.from && effectiveDateRange?.to
                              ? `${format(effectiveDateRange.from, 'd MMM yyyy')} – ${format(effectiveDateRange.to, 'd MMM yyyy')}`
                              : undefined}
                          >
                            <CalendarIcon className="h-4 w-4" />
                            {selectedYears.length === 0
                              ? 'Select years'
                              : selectedYears.length === 1
                                ? getYearLabel(selectedYears[0])
                                : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`}
                            <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="p-3 w-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-helper font-medium text-foreground">Select Year Range</span>
                            <div className="flex gap-1">
                              <button
                                onClick={selectAllYears}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                                title="Select all available years"
                              >
                                All
                              </button>
                              <button
                                onClick={selectDataRange}
                                className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                                title={actualDataRange ? `Select only years with data: ${getYearLabel(actualDataRange.minYear)} - ${getYearLabel(actualDataRange.maxYear)}` : 'Select years with data'}
                              >
                                Data
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {AVAILABLE_YEARS.map((year) => {
                              const isStartOrEnd = selectedYears.length > 0 &&
                                (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                              const inRange = isYearInRange(year)

                              return (
                                <button
                                  key={year}
                                  onClick={(e) => handleYearClick(year, e.shiftKey)}
                                  className={`
                                    px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                                    ${isStartOrEnd
                                      ? 'bg-muted text-foreground'
                                      : inRange
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }
                                  `}
                                  title="Click to select start, then click another to select end"
                                >
                                  {getYearLabel(year)}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            Click start year, then click end year
                          </p>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </>
              )}
        </div>
          {/* Controls row — filters + toggles left, CSV right. */}
          <div className="flex items-center justify-between gap-2 overflow-visible flex-wrap pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Metrics multiselect — show/hide Budgets, Planned Disbursements
                  and any of the 13 IATI transaction types. */}
              <MetricsMultiSelect
                selected={selectedMetrics}
                onChange={setSelectedMetrics}
                triggerClassName="h-8 justify-between min-w-[200px]"
              />
              {/* Periodic/Cumulative Toggle */}
              <ChartViewToggle
                ariaLabel="Data mode"
                variant="text"
                value={dataMode}
                onValueChange={setDataMode}
                options={[
                  { value: 'periodic', label: 'Periodic' },
                  { value: 'cumulative', label: 'Cumulative' },
                ]}
              />

              {/* Allocation Method Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white h-[34px]">
                  <Label htmlFor="allocation-toggle" className="text-body text-foreground cursor-pointer whitespace-nowrap">
                    {allocationMethod === 'proportional' ? 'Proportional' : 'Period Start'}
                  </Label>
                  <Switch
                    id="allocation-toggle"
                    checked={allocationMethod === 'proportional'}
                    onCheckedChange={(checked) => setAllocationMethod(checked ? 'proportional' : 'period-start')}
                  />
                </div>
                <HelpTextTooltip
                  content={
                    allocationMethod === 'proportional'
                      ? "Allocates budget and planned disbursement amounts across their time periods. For example, a $100,000 budget from July 2024 to June 2025 will be split proportionally across those 12 months."
                      : "Shows the full budget or planned disbursement amount at its start date. Useful for seeing when amounts were originally planned or committed."
                  }
                />
              </div>
            </div>
            {/* Chart-style toggle + CSV, right-aligned. */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart Type Toggle */}
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('line')}
                  className={cn("h-8 w-8", chartType === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Line"
                  aria-label="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('bar')}
                  className={cn("h-8 w-8", chartType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Bar"
                  aria-label="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('area')}
                  className={cn("h-8 w-8", chartType === 'area' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Area"
                  aria-label="Area"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('total')}
                  className={cn("h-8 w-8", chartType === 'total' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Total"
                  aria-label="Total"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('table')}
                  className={cn("h-8 w-8", chartType === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Table View"
                  aria-label="Table View"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

            {/* Export Button */}
            <div className="flex items-center rounded-md border border-border p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportCSV}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            </div>
          </div>
        </div>

        <div id="cumulative-financial-chart">
        {displayData.length > 0 ? (
          <>
            {/* Table View */}
            {chartType === 'table' && (
              <ChartDataTable
                rows={displayData}
                columns={[
                  {
                    key: 'fullDate',
                    label: 'Period',
                    numeric: false,
                    format: (_v, row) => (row as any).fullDate || (row as any).displayDate,
                  },
                  ...visibleSeries.map(s => ({
                    key: s.key,
                    label: s.key,
                    numeric: true,
                    currency: 'USD',
                    color: SERIES_COLOR[s.key],
                  })),
                ]}
                currency="USD"
                totalsRow={dataMode === 'periodic'}
                maxHeight={600}
              />
            )}

            {/* Total View */}
            {chartType === 'total' && totals && (() => {
              const totalData = visibleSeries
                .map(s => ({
                  name: s.key,
                  value: totals[s.key] || 0,
                  fill: SERIES_COLOR[s.key] || BRAND_COLORS.coolSteel,
                }))
                .sort((a, b) => b.value - a.value)
              return (
              <ResponsiveContainer width="100%" height={600}>
                <BarChart
                  data={totalData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p: any = payload[0]
                        return (
                          <ChartTooltipCard
                            title={p.payload.name}
                            rows={[{
                              label: p.payload.name,
                              value: formatTooltipCurrency(p.value as number, isExpanded),
                              color: p.payload.fill || p.color,
                            }]}
                          />
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {totalData.map((d, index) => (
                      <Cell key={`cell-${index}`} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )
            })()}

            {/* Bar Chart View */}
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={600}>
                <BarChart
                  data={displayData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`bar-${allocationMethod}-${dataMode}`}
                  barGap={0}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {visibleSeries.map(s => {
                    const hidden = hiddenSeries.has(s.key)
                    return (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.key}
                        fill={hidden ? HIDDEN_COLOR : SERIES_COLOR[s.key]}
                        opacity={hidden ? 0.3 : 1}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                      />
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart View */}
            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height={600}>
                <LineChart 
                  data={displayData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`line-${allocationMethod}-${dataMode}`}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {visibleSeries.map(s => {
                    const hidden = hiddenSeries.has(s.key)
                    const color = hidden ? HIDDEN_COLOR : SERIES_COLOR[s.key]
                    return (
                      <Line
                        key={s.key}
                        type={s.key === 'Budgets' ? 'linear' : 'monotone'}
                        dataKey={s.key}
                        name={s.key}
                        stroke={color}
                        strokeWidth={hidden ? 1 : (s.planning ? 2 : 2.5)}
                        strokeDasharray={s.planning ? '5 5' : undefined}
                        dot={{ fill: color, r: 3 }}
                        connectNulls={s.key === 'Budgets' ? true : undefined}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                        opacity={hidden ? 0.3 : 1}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Area Chart View */}
            {chartType === 'area' && (
              <ResponsiveContainer width="100%" height={600}>
                <AreaChart 
                  data={displayData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  key={`area-${allocationMethod}-${dataMode}`}
                >
                  <defs>
                    {visibleSeries.map(s => (
                      <linearGradient key={s.key} id={gradId(s.key)} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SERIES_COLOR[s.key]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={SERIES_COLOR[s.key]} stopOpacity={0.1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {visibleSeries.map(s => {
                    const hidden = hiddenSeries.has(s.key)
                    return (
                      <Area
                        key={s.key}
                        type={s.key === 'Budgets' ? 'linear' : 'monotone'}
                        dataKey={s.key}
                        name={s.key}
                        stroke={hidden ? HIDDEN_COLOR : SERIES_COLOR[s.key]}
                        strokeWidth={hidden ? 1 : (s.planning ? 2 : 2.5)}
                        strokeDasharray={s.planning ? '5 5' : undefined}
                        fill={`url(#${gradId(s.key)})`}
                        fillOpacity={hidden ? 0.1 : (s.planning ? 0.4 : 0.6)}
                        connectNulls={s.key === 'Budgets' ? true : undefined}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No cumulative overview data available</p>
              <p className="text-helper mt-2">Add transactions, planned disbursements, or budgets to see this chart</p>
            </div>
          </div>
        )}
        </div>

        {/* Explanatory text */}

        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart provides a comprehensive view of financial flows over time, tracking all IATI transaction types including incoming funds, commitments, disbursements, and expenditures, alongside planned disbursements and budgets.
          Toggle between cumulative view for running totals or periodic view for year-by-year changes, and use the proportional setting to distribute multi-year budgets evenly across their time periods. Click legend items to show or hide specific data series.
        </p>
    </div>
  )
}
