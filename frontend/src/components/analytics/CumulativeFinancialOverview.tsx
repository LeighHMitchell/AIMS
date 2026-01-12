"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Download, FileImage, LineChart as LineChartIcon, BarChart3, Table as TableIcon, TrendingUp as TrendingUpIcon, CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import html2canvas from 'html2canvas'
import {
  splitBudgetAcrossYears,
  splitPlannedDisbursementAcrossYears,
  splitTransactionAcrossYears
} from '@/utils/year-allocation'
import { FINANCIAL_OVERVIEW_COLORS, BRAND_COLORS } from '@/components/analytics/sectors/sectorColorMap'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { format } from 'date-fns'
// Inline currency formatter to avoid initialization issues
const formatCurrencyAbbreviated = (value: number): string => {
  const isNegative = value < 0
  const absValue = Math.abs(value)

  let formatted = ''
  if (absValue >= 1000000000) {
    formatted = `$${(absValue / 1000000000).toFixed(1)}b`
  } else if (absValue >= 1000000) {
    formatted = `$${(absValue / 1000000).toFixed(1)}m`
  } else if (absValue >= 1000) {
    formatted = `$${(absValue / 1000).toFixed(1)}k`
  } else {
    formatted = `$${absValue.toFixed(0)}`
  }

  return isNegative ? `-${formatted}` : formatted
}

type DataMode = 'cumulative' | 'periodic'
type ChartType = 'line' | 'bar' | 'area' | 'table' | 'total'

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
}

export function CumulativeFinancialOverview({
  dateRange,
  filters,
  refreshKey,
  compact = false
}: CumulativeFinancialOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [rawData, setRawData] = useState<{ transactions: any[]; plannedDisbursements: any[]; budgets: any[] } | null>(null)
  const [dataMode, setDataMode] = useState<DataMode>('cumulative')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [allocationMethod, setAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')

  // Calendar type and year selection state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

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
        const response = await fetch('/api/custom-years')
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

        // Fetch ALL data without date filtering - filtering happens in the processing step
        // This allows instant switching between year ranges without refetching
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, activity_id, provider_org_id')
          .eq('status', 'actual')
          .not('transaction_date', 'is', null)
          .order('transaction_date', { ascending: true })

        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery

        if (transactionsError) {
          console.error('[CumulativeFinancialOverview] Error fetching transactions:', transactionsError)
          setError(`Failed to fetch transaction data: ${transactionsError.message || transactionsError.toString()}`)
          return
        }

        const { data: plannedDisbursements, error: plannedError } = await supabase
          .from('planned_disbursements')
          .select('period_start, period_end, amount, usd_amount, currency, activity_id')
          .not('period_start', 'is', null)
          .order('period_start', { ascending: true })

        if (plannedError) {
          console.error('[CumulativeFinancialOverview] Error fetching planned disbursements:', plannedError)
        }

        const { data: budgets, error: budgetsError } = await supabase
          .from('activity_budgets')
          .select('period_start, period_end, value, usd_value, currency, activity_id')
          .not('period_start', 'is', null)
          .order('period_start', { ascending: true })

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
  }, [filters, refreshKey]) // Don't depend on effectiveDateRange - fetch all data once, filter in processing

  // Process raw data into chart data (runs when allocationMethod or calendarType changes without refetching)
  useEffect(() => {
    if (!rawData) return

    const { transactions, plannedDisbursements, budgets } = rawData

    // Get the custom year for label formatting
    const customYear = customYears.find(cy => cy.id === calendarType)

    // Process data using year-based allocation
    const yearlyDataMap = new Map<number, {
      incomingCommitment: number
      incomingFunds: number
      outgoingCommitment: number
      creditGuarantee: number
      disbursements: number
      expenditures: number
      plannedDisbursements: number
      plannedBudgets: number
    }>()

    const ensureYearEntry = (year: number) => {
      if (!yearlyDataMap.has(year)) {
        yearlyDataMap.set(year, {
          incomingCommitment: 0,
          incomingFunds: 0,
          outgoingCommitment: 0,
          creditGuarantee: 0,
          disbursements: 0,
          expenditures: 0,
          plannedDisbursements: 0,
          plannedBudgets: 0
        })
      }
    }

    // Process transactions
    transactions?.forEach((transaction: any) => {
      const txToProcess = allocationMethod === 'proportional'
        ? transaction
        : { ...transaction, period_start: null, period_end: null }

      const yearAllocations = splitTransactionAcrossYears(txToProcess)

      yearAllocations.forEach(({ year, amount }) => {
        ensureYearEntry(year)
        const yearData = yearlyDataMap.get(year)!
        const type = transaction.transaction_type

        if (type === '1') {
          yearData.incomingCommitment += amount
        } else if (type === '12') {
          yearData.incomingFunds += amount
        } else if (type === '2') {
          yearData.outgoingCommitment += amount
        } else if (type === '11') {
          yearData.creditGuarantee += amount
        } else if (type === '3') {
          yearData.disbursements += amount
        } else if (type === '4') {
          yearData.expenditures += amount
        }
      })
    })

    // Process planned disbursements
    plannedDisbursements?.forEach((pd: any) => {
      if (allocationMethod === 'proportional') {
        const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!.plannedDisbursements += amount
        })
      } else {
        if (pd.period_start) {
          const startDate = new Date(pd.period_start)
          if (!isNaN(startDate.getTime())) {
            const year = startDate.getFullYear()
            ensureYearEntry(year)
            let value = parseFloat(String(pd.usd_amount)) || 0
            if (!value && pd.currency === 'USD' && pd.amount) {
              value = parseFloat(String(pd.amount)) || 0
            }
            if (value) {
              yearlyDataMap.get(year)!.plannedDisbursements += value
            }
          }
        }
      }
    })

    // Process budgets
    budgets?.forEach((budget: any) => {
      if (allocationMethod === 'proportional') {
        const yearAllocations = splitBudgetAcrossYears(budget)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!.plannedBudgets += amount
        })
      } else {
        if (budget.period_start) {
          const startDate = new Date(budget.period_start)
          if (!isNaN(startDate.getTime())) {
            const year = startDate.getFullYear()
            ensureYearEntry(year)
            let value = parseFloat(String(budget.usd_value)) || 0
            if (!value && budget.currency === 'USD' && budget.value) {
              value = parseFloat(String(budget.value)) || 0
            }
            if (value) {
              yearlyDataMap.get(year)!.plannedBudgets += value
            }
          }
        }
      }
    })

    // Convert to cumulative values
    const sortedYears = Array.from(yearlyDataMap.keys()).sort((a, b) => a - b)

    let cumulativeIncomingCommitment = 0
    let cumulativeIncomingFunds = 0
    let cumulativeOutgoingCommitment = 0
    let cumulativeCreditGuarantee = 0
    let cumulativeDisbursements = 0
    let cumulativeExpenditures = 0
    let cumulativePlannedDisbursements = 0
    let cumulativePlannedBudgets = 0

    const yearlyMap = new Map<string, any>()

    sortedYears.forEach((year) => {
      const yearData = yearlyDataMap.get(year)!

      cumulativeIncomingCommitment += yearData.incomingCommitment
      cumulativeIncomingFunds += yearData.incomingFunds
      cumulativeOutgoingCommitment += yearData.outgoingCommitment
      cumulativeCreditGuarantee += yearData.creditGuarantee
      cumulativeDisbursements += yearData.disbursements
      cumulativeExpenditures += yearData.expenditures
      cumulativePlannedDisbursements += yearData.plannedDisbursements
      cumulativePlannedBudgets += yearData.plannedBudgets

      const yearKey = `${year}`
      const yearDate = new Date(year, 0, 1)

      // Use calendar-appropriate label for display
      const displayLabel = customYear ? getCustomYearLabel(customYear, year) : `${year}`

      yearlyMap.set(yearKey, {
        date: yearDate.toISOString(),
        timestamp: yearDate.getTime(),
        yearKey,
        displayDate: displayLabel,
        fullDate: displayLabel,
        'Incoming Commitments': cumulativeIncomingCommitment,
        'Incoming Funds': cumulativeIncomingFunds,
        'Outgoing Commitments': cumulativeOutgoingCommitment,
        'Credit Guarantee': cumulativeCreditGuarantee,
        'Disbursements': cumulativeDisbursements,
        'Expenditures': cumulativeExpenditures,
        'Planned Disbursements': cumulativePlannedDisbursements,
        'Budgets': cumulativePlannedBudgets
      })
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

  // Calculate periodic (non-cumulative) data
  const periodicData = useMemo(() => {
    if (filteredData.length === 0) return []

    return filteredData.map((item, index) => {
      if (index === 0) {
        // First period shows the actual values (not differences)
        return {
          ...item,
          'Incoming Commitments': item['Incoming Commitments'],
          'Incoming Funds': item['Incoming Funds'],
          'Outgoing Commitments': item['Outgoing Commitments'],
          'Credit Guarantee': item['Credit Guarantee'],
          'Disbursements': item['Disbursements'],
          'Expenditures': item['Expenditures'],
          'Planned Disbursements': item['Planned Disbursements'],
          'Budgets': item['Budgets']
        }
      }

      const prevItem = filteredData[index - 1]
      return {
        ...item,
        'Incoming Commitments': item['Incoming Commitments'] - prevItem['Incoming Commitments'],
        'Incoming Funds': item['Incoming Funds'] - prevItem['Incoming Funds'],
        'Outgoing Commitments': item['Outgoing Commitments'] - prevItem['Outgoing Commitments'],
        'Credit Guarantee': item['Credit Guarantee'] - prevItem['Credit Guarantee'],
        'Disbursements': item['Disbursements'] - prevItem['Disbursements'],
        'Expenditures': item['Expenditures'] - prevItem['Expenditures'],
        'Planned Disbursements': item['Planned Disbursements'] - prevItem['Planned Disbursements'],
        'Budgets': item['Budgets'] - prevItem['Budgets']
      }
    })
  }, [filteredData])

  // Calculate totals
  const totals = useMemo(() => {
    if (filteredData.length === 0) return null

    const lastItem = filteredData[filteredData.length - 1]
    return {
      'Incoming Commitments': lastItem['Incoming Commitments'],
      'Incoming Funds': lastItem['Incoming Funds'],
      'Outgoing Commitments': lastItem['Outgoing Commitments'],
      'Credit Guarantee': lastItem['Credit Guarantee'],
      'Disbursements': lastItem['Disbursements'],
      'Expenditures': lastItem['Expenditures'],
      'Planned Disbursements': lastItem['Planned Disbursements'],
      'Budgets': lastItem['Budgets']
    }
  }, [filteredData])

  // Get display data based on data mode
  const displayData = useMemo(() => {
    if (dataMode === 'periodic') return periodicData
    return filteredData
  }, [dataMode, filteredData, periodicData])

  // Determine which series have any non-zero data to show in legend
  const activeSeries = useMemo(() => {
    if (displayData.length === 0) return new Set()

    const series = new Set<string>()
    const seriesKeys = ['Incoming Commitments', 'Incoming Funds', 'Outgoing Commitments', 'Credit Guarantee', 'Disbursements', 'Expenditures', 'Planned Disbursements', 'Budgets']

    seriesKeys.forEach(key => {
      const hasData = displayData.some(d => d[key] && d[key] > 0)
      if (hasData) series.add(key)
    })

    return series
  }, [displayData])

  // Calculate intelligent tick interval for x-axis (for yearly data)
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 10) return 0  // Show all years if 10 or fewer
    if (dataLength <= 20) return 1  // Show every other year
    if (dataLength <= 30) return 2  // Show every 3rd year
    return Math.floor(dataLength / 10)  // Show ~10 ticks
  }

  const formatCurrency = (value: number) => {
    const isNegative = value < 0
    const absValue = Math.abs(value)

    let formatted = ''
    if (absValue >= 1000000000) {
      formatted = `$${Math.round(absValue / 1000000000)}b`
    } else if (absValue >= 1000000) {
      formatted = `$${Math.round(absValue / 1000000)}m`
    } else if (absValue >= 1000) {
      formatted = `$${Math.round(absValue / 1000)}k`
    } else {
      formatted = `$${Math.round(absValue)}`
    }

    return isNegative ? `-${formatted}` : formatted
  }

  // Use the module-level currency formatter for tooltips
  const formatTooltipValue = formatCurrencyAbbreviated

  // Map series names to transaction type codes
  const getTransactionTypeCode = (seriesName: string): string | null => {
    const mapping: Record<string, string | null> = {
      'Incoming Commitments': '1',
      'Incoming Funds': '12',
      'Outgoing Commitments': '2',
      'Commitments': '2', // Also handle the display name
      'Credit Guarantee': '11',
      'Disbursements': '3',
      'Expenditures': '4',
      // Planned Disbursements and Budgets are not transaction types
      'Planned Disbursements': null,
      'Budgets': null
    }
    return mapping[seriesName] || null
  }

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

      // Separate transactions from planned/budgets
      const plannedBudgetNames = ['Planned Disbursements', 'Budgets']
      const transactions = entries.filter((e: any) => !plannedBudgetNames.includes(e.name))
      const plannedBudgets = entries.filter((e: any) => plannedBudgetNames.includes(e.name))

      const renderRow = (entry: any, index: number) => {
        const transactionTypeCode = getTransactionTypeCode(entry.name)
        return (
          <tr key={index}>
            <td className="py-1 pr-4 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-700 font-medium flex items-center gap-2">
                {transactionTypeCode && (
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                    {transactionTypeCode}
                  </code>
                )}
                <span>{entry.name}</span>
              </span>
            </td>
            <td className="py-1 text-right font-semibold text-slate-900">
              {formatTooltipValue(entry.displayValue)}
            </td>
          </tr>
        )
      }

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{fullDate}</p>
          </div>
          <div className="p-2">
            {transactions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Transactions</p>
                <table className="w-full text-sm mb-2">
                  <tbody>
                    {transactions.map(renderRow)}
                  </tbody>
                </table>
              </>
            )}
            {plannedBudgets.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 mt-2 pt-2 border-t border-slate-100">Planned Disbursements & Budgets</p>
                <table className="w-full text-sm">
                  <tbody>
                    {plannedBudgets.map(renderRow)}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
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
              <span className="text-sm text-slate-700">{entry.value}</span>
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

  // Export to JPG
  const handleExportJPG = async () => {
    const chartElement = chartRef.current || document.querySelector('#cumulative-financial-chart') as HTMLElement
    if (!chartElement) return

    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      })
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `cumulative-financial-overview-${new Date().getTime()}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Error exporting chart:', error)
    }
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (error || displayData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="period" 
              stroke="#64748B"
              fontSize={10}
              tickLine={{ stroke: '#64748B' }}
            />
            <YAxis 
              tickFormatter={(value) => {
                if (value >= 1000000000) return `$${(value / 1000000000).toFixed(0)}b`
                if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}m`
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                return `$${value}`
              }} 
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
      <div className="flex items-center justify-center h-[500px]">
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
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

          {/* Controls Row */}
          <div className="flex items-start gap-2 overflow-visible flex-wrap pb-1">
            {/* Left Side - Calendar & Year Selectors */}
            <div className="flex items-start gap-2 flex-shrink-0">
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
                        {customYears.map(cy => (
                          <DropdownMenuItem
                            key={cy.id}
                            className={calendarType === cy.id ? 'bg-slate-100 font-medium' : ''}
                            onClick={() => setCalendarType(cy.id)}
                          >
                            {cy.name}
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
                          <Button variant="ghost" size="sm" className="h-8 gap-1">
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
                            <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                            <div className="flex gap-1">
                              <button
                                onClick={selectAllYears}
                                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
                                title="Select all available years"
                              >
                                All
                              </button>
                              <button
                                onClick={selectDataRange}
                                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 hover:bg-slate-100 rounded"
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
                                      ? 'bg-primary text-primary-foreground'
                                      : inRange
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }
                                  `}
                                  title="Click to select start, then click another to select end"
                                >
                                  {getYearLabel(year)}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Click start year, then click end year
                          </p>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Date Range Indicator */}
                    {effectiveDateRange?.from && effectiveDateRange?.to && (
                      <span className="text-xs text-slate-500 text-center">
                        {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {/* Periodic/Cumulative Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={dataMode === 'periodic' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDataMode('periodic')}
                  className="h-8"
                >
                  Periodic
                </Button>
                <Button
                  variant={dataMode === 'cumulative' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDataMode('cumulative')}
                  className="h-8"
                >
                  Cumulative
                </Button>
              </div>

              {/* Allocation Method Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white h-[34px]">
                  <Label htmlFor="allocation-toggle" className="text-sm text-slate-700 cursor-pointer whitespace-nowrap">
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

              {/* Chart Type Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="h-8"
                  title="Line"
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className="h-8"
                  title="Bar"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className="h-8"
                  title="Area"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('table')}
                  className="h-8"
                  title="Table"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'total' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('total')}
                  className="h-8"
                  title="Total"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportJPG}
                  className="h-8 px-2"
                  title="Export to JPG"
                  disabled={chartType === 'table'}
                >
                  <FileImage className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div ref={chartRef} id="cumulative-financial-chart">
        {displayData.length > 0 ? (
          <>
            {/* Table View */}
            {chartType === 'table' && (
              <div className="rounded-md border overflow-auto h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-white z-10">
                      <TableHead className="bg-white">Period</TableHead>
                      {activeSeries.has('Incoming Commitments') && (
                        <TableHead className="text-right bg-white">Incoming Commitments</TableHead>
                      )}
                      {activeSeries.has('Incoming Funds') && (
                        <TableHead className="text-right bg-white">Incoming Funds</TableHead>
                      )}
                      {activeSeries.has('Outgoing Commitments') && (
                        <TableHead className="text-right bg-white">Outgoing Commitments</TableHead>
                      )}
                      {activeSeries.has('Credit Guarantee') && (
                        <TableHead className="text-right bg-white">Credit Guarantee</TableHead>
                      )}
                      {activeSeries.has('Disbursements') && (
                        <TableHead className="text-right bg-white">Disbursements</TableHead>
                      )}
                      {activeSeries.has('Expenditures') && (
                        <TableHead className="text-right bg-white">Expenditures</TableHead>
                      )}
                      {activeSeries.has('Planned Disbursements') && (
                        <TableHead className="text-right bg-white">Planned Disbursements</TableHead>
                      )}
                      {activeSeries.has('Budgets') && (
                        <TableHead className="text-right bg-white">Budgets</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.fullDate || item.displayDate}</TableCell>
                        {activeSeries.has('Incoming Commitments') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Incoming Commitments'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Incoming Funds') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Incoming Funds'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Outgoing Commitments') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Outgoing Commitments'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Credit Guarantee') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Credit Guarantee'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Disbursements') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Disbursements'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Expenditures') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Expenditures'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Planned Disbursements') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Planned Disbursements'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Budgets') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Budgets'] || 0)}</TableCell>
                        )}
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    {displayData.length > 0 && (
                      <TableRow className="bg-slate-50 font-semibold border-t-2 border-slate-300 sticky bottom-0">
                        <TableCell className="font-semibold">Total</TableCell>
                        {activeSeries.has('Incoming Commitments') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Incoming Commitments'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Incoming Commitments'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Incoming Funds') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Incoming Funds'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Incoming Funds'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Outgoing Commitments') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Outgoing Commitments'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Outgoing Commitments'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Credit Guarantee') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Credit Guarantee'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Credit Guarantee'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Disbursements') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Disbursements'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Disbursements'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Expenditures') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Expenditures'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Expenditures'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Planned Disbursements') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Planned Disbursements'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Planned Disbursements'] || 0), 0))
                            }
                          </TableCell>
                        )}
                        {activeSeries.has('Budgets') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Budgets'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Budgets'] || 0), 0))
                            }
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Total View */}
            {chartType === 'total' && totals && (
              <ResponsiveContainer width="100%" height={600}>
                <BarChart
                  data={Object.entries(totals)
                    .map(([key, value]) => ({
                      name: key,
                      value,
                      fill: FINANCIAL_OVERVIEW_COLORS[key as keyof typeof FINANCIAL_OVERVIEW_COLORS] || BRAND_COLORS.coolSteel
                    }))
                    .sort((a, b) => b.value - a.value)
                  }
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
                            <p className="font-semibold text-slate-900 text-sm">{payload[0].payload.name}</p>
                            <p className="font-bold text-slate-900 text-lg">{formatTooltipValue(payload[0].value as number)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value">
                    {Object.entries(totals).map(([key, value], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={FINANCIAL_OVERVIEW_COLORS[key as keyof typeof FINANCIAL_OVERVIEW_COLORS] || BRAND_COLORS.coolSteel}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

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
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {activeSeries.has('Incoming Commitments') && (
                    <Bar
                      dataKey="Incoming Commitments"
                      fill={hiddenSeries.has('Incoming Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitments']}
                      opacity={hiddenSeries.has('Incoming Commitments') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Incoming Funds') && (
                    <Bar
                      dataKey="Incoming Funds"
                      fill={hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Funds']}
                      opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Outgoing Commitments') && (
                    <Bar
                      dataKey="Outgoing Commitments"
                      fill={hiddenSeries.has('Outgoing Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']}
                      opacity={hiddenSeries.has('Outgoing Commitments') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Credit Guarantee') && (
                    <Bar
                      dataKey="Credit Guarantee"
                      fill={hiddenSeries.has('Credit Guarantee') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Credit Guarantee']}
                      opacity={hiddenSeries.has('Credit Guarantee') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Disbursements') && (
                    <Bar
                      dataKey="Disbursements"
                      fill={hiddenSeries.has('Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Disbursements']}
                      opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Expenditures') && (
                    <Bar
                      dataKey="Expenditures"
                      fill={hiddenSeries.has('Expenditures') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Expenditures']}
                      opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Planned Disbursements') && (
                    <Bar
                      dataKey="Planned Disbursements"
                      fill={hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']}
                      opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Budgets') && (
                    <Bar
                      dataKey="Budgets"
                      fill={hiddenSeries.has('Budgets') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Budgets']}
                      opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {activeSeries.has('Incoming Commitments') && (
                    <Line
                      type="monotone"
                      dataKey="Incoming Commitments"
                      stroke={hiddenSeries.has('Incoming Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitments']}
                      strokeWidth={hiddenSeries.has('Incoming Commitments') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Incoming Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitments'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Incoming Commitments') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Incoming Funds') && (
                    <Line
                      type="monotone"
                      dataKey="Incoming Funds"
                      stroke={hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Funds']}
                      strokeWidth={hiddenSeries.has('Incoming Funds') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Funds'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Incoming Funds') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Outgoing Commitments') && (
                    <Line
                      type="monotone"
                      dataKey="Outgoing Commitments"
                      stroke={hiddenSeries.has('Outgoing Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']}
                      strokeWidth={hiddenSeries.has('Outgoing Commitments') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Outgoing Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Outgoing Commitments') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Credit Guarantee') && (
                    <Line
                      type="monotone"
                      dataKey="Credit Guarantee"
                      stroke={hiddenSeries.has('Credit Guarantee') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Credit Guarantee']}
                      strokeWidth={hiddenSeries.has('Credit Guarantee') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Credit Guarantee') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Credit Guarantee'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Credit Guarantee') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Disbursements') && (
                    <Line
                      type="monotone"
                      dataKey="Disbursements"
                      stroke={hiddenSeries.has('Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Disbursements']}
                      strokeWidth={hiddenSeries.has('Disbursements') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Disbursements'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Expenditures') && (
                    <Line
                      type="monotone"
                      dataKey="Expenditures"
                      stroke={hiddenSeries.has('Expenditures') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Expenditures']}
                      strokeWidth={hiddenSeries.has('Expenditures') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Expenditures') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Expenditures'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Expenditures') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Planned Disbursements') && (
                    <Line
                      type="monotone"
                      dataKey="Planned Disbursements"
                      stroke={hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']}
                      strokeWidth={hiddenSeries.has('Planned Disbursements') ? 1 : 2}
                      strokeDasharray="5 5"
                      dot={{ fill: hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Planned Disbursements'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Planned Disbursements') ? 0.3 : 1}
                    />
                  )}
                  {activeSeries.has('Budgets') && (
                    <Line
                      type="linear"
                      dataKey="Budgets"
                      stroke={hiddenSeries.has('Budgets') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Budgets']}
                      strokeWidth={hiddenSeries.has('Budgets') ? 1 : 2}
                      strokeDasharray="5 5"
                      dot={{ fill: hiddenSeries.has('Budgets') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Budgets'], r: 3 }}
                      connectNulls={true}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Budgets') ? 0.3 : 1}
                    />
                  )}
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
                    {activeSeries.has('Incoming Commitments') && (
                      <linearGradient id="colorIncomingCommitment" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Commitments']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Commitments']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Incoming Funds') && (
                      <linearGradient id="colorIncomingFunds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Funds']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Funds']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Outgoing Commitments') && (
                      <linearGradient id="colorOutgoingCommitment" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Credit Guarantee') && (
                      <linearGradient id="colorCreditGuarantee" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Credit Guarantee']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Credit Guarantee']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Disbursements') && (
                      <linearGradient id="colorDisbursements" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Disbursements']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Disbursements']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Expenditures') && (
                      <linearGradient id="colorExpenditures" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Expenditures']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Expenditures']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Planned Disbursements') && (
                      <linearGradient id="colorPlannedDisbursements" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Budgets') && (
                      <linearGradient id="colorBudgets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Budgets']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Budgets']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748B"
                    fontSize={12}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                  {activeSeries.has('Incoming Commitments') && (
                    <Area
                      type="monotone"
                      dataKey="Incoming Commitments"
                      stroke={hiddenSeries.has('Incoming Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitments']}
                      strokeWidth={hiddenSeries.has('Incoming Commitments') ? 1 : 2.5}
                      fill={hiddenSeries.has('Incoming Commitments') ? 'url(#colorIncomingCommitment)' : 'url(#colorIncomingCommitment)'}
                      fillOpacity={hiddenSeries.has('Incoming Commitments') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Incoming Funds') && (
                    <Area
                      type="monotone"
                      dataKey="Incoming Funds"
                      stroke={hiddenSeries.has('Incoming Funds') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Funds']}
                      strokeWidth={hiddenSeries.has('Incoming Funds') ? 1 : 2.5}
                      fill={hiddenSeries.has('Incoming Funds') ? 'url(#colorIncomingFunds)' : 'url(#colorIncomingFunds)'}
                      fillOpacity={hiddenSeries.has('Incoming Funds') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Outgoing Commitments') && (
                    <Area
                      type="monotone"
                      dataKey="Outgoing Commitments"
                      stroke={hiddenSeries.has('Outgoing Commitments') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitments']}
                      strokeWidth={hiddenSeries.has('Outgoing Commitments') ? 1 : 2.5}
                      fill={hiddenSeries.has('Outgoing Commitments') ? 'url(#colorOutgoingCommitment)' : 'url(#colorOutgoingCommitment)'}
                      fillOpacity={hiddenSeries.has('Outgoing Commitments') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Credit Guarantee') && (
                    <Area
                      type="monotone"
                      dataKey="Credit Guarantee"
                      stroke={hiddenSeries.has('Credit Guarantee') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Credit Guarantee']}
                      strokeWidth={hiddenSeries.has('Credit Guarantee') ? 1 : 2.5}
                      fill={hiddenSeries.has('Credit Guarantee') ? 'url(#colorCreditGuarantee)' : 'url(#colorCreditGuarantee)'}
                      fillOpacity={hiddenSeries.has('Credit Guarantee') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Disbursements') && (
                    <Area
                      type="monotone"
                      dataKey="Disbursements"
                      stroke={hiddenSeries.has('Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Disbursements']}
                      strokeWidth={hiddenSeries.has('Disbursements') ? 1 : 2.5}
                      fill={hiddenSeries.has('Disbursements') ? 'url(#colorDisbursements)' : 'url(#colorDisbursements)'}
                      fillOpacity={hiddenSeries.has('Disbursements') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Expenditures') && (
                    <Area
                      type="monotone"
                      dataKey="Expenditures"
                      stroke={hiddenSeries.has('Expenditures') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Expenditures']}
                      strokeWidth={hiddenSeries.has('Expenditures') ? 1 : 2.5}
                      fill={hiddenSeries.has('Expenditures') ? 'url(#colorExpenditures)' : 'url(#colorExpenditures)'}
                      fillOpacity={hiddenSeries.has('Expenditures') ? 0.1 : 0.6}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Planned Disbursements') && (
                    <Area
                      type="monotone"
                      dataKey="Planned Disbursements"
                      stroke={hiddenSeries.has('Planned Disbursements') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Planned Disbursements']}
                      strokeWidth={hiddenSeries.has('Planned Disbursements') ? 1 : 2}
                      strokeDasharray="5 5"
                      fill={hiddenSeries.has('Planned Disbursements') ? 'url(#colorPlannedDisbursements)' : 'url(#colorPlannedDisbursements)'}
                      fillOpacity={hiddenSeries.has('Planned Disbursements') ? 0.1 : 0.4}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                  {activeSeries.has('Budgets') && (
                    <Area
                      type="linear"
                      dataKey="Budgets"
                      stroke={hiddenSeries.has('Budgets') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Budgets']}
                      strokeWidth={hiddenSeries.has('Budgets') ? 1 : 2}
                      strokeDasharray="5 5"
                      fill={hiddenSeries.has('Budgets') ? 'url(#colorBudgets)' : 'url(#colorBudgets)'}
                      fillOpacity={hiddenSeries.has('Budgets') ? 0.1 : 0.4}
                      connectNulls={true}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No cumulative overview data available</p>
              <p className="text-xs mt-2">Add transactions, planned disbursements, or budgets to see this chart</p>
            </div>
          </div>
        )}
        </div>

        {/* Explanatory Text */}
        <p className="text-xs text-gray-500 mt-4">
          This chart provides a comprehensive view of financial flows over time, tracking all IATI transaction types including
          Incoming Commitments (type 1), Incoming Funds (type 12), Outgoing Commitments (type 2), Credit Guarantees (type 11),
          Disbursements (type 3), and Expenditures (type 4), alongside Planned Disbursements and Budgets.
          Toggle between <strong>Cumulative</strong> view to see running totals over time, or <strong>Periodic</strong> view
          to see year-by-year changes. The <strong>Proportional</strong> setting distributes multi-year budgets and planned
          disbursements across their time periods, while <strong>Period Start</strong> shows the full amount at the start date.
          Click on legend items to show or hide specific data series. Year labels adjust based on the selected calendar type.
        </p>
    </div>
  )
}
