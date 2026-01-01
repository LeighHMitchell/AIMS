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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Download, FileImage, LineChart as LineChartIcon, BarChart3, Table as TableIcon, TrendingUp as TrendingUpIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { exportToCSV } from '@/lib/csv-export'
import { MultiSelect } from '@/components/ui/multi-select'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  splitBudgetAcrossYears, 
  splitPlannedDisbursementAcrossYears, 
  splitTransactionAcrossYears 
} from '@/utils/year-allocation'
import { FINANCIAL_OVERVIEW_COLORS, BRAND_COLORS } from '@/components/analytics/sectors/sectorColorMap'
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
type TimeRange = '3m' | '6m' | '12m' | '3y' | '5y'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '3y', label: 'Last 3 years' },
  { value: '5y', label: 'Last 5 years' },
]

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
  const [dataMode, setDataMode] = useState<DataMode>('cumulative')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [activities, setActivities] = useState<Array<{ id: string; title: string; iati_identifier?: string }>>([])
  const [allocationMethod, setAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('5y')

  // Calculate effective date range based on selected time range
  const effectiveDateRange = useMemo(() => {
    const now = new Date()
    const from = new Date()

    switch (selectedTimeRange) {
      case '3m':
        from.setMonth(now.getMonth() - 3)
        break
      case '6m':
        from.setMonth(now.getMonth() - 6)
        break
      case '12m':
        from.setFullYear(now.getFullYear() - 1)
        break
      case '3y':
        from.setFullYear(now.getFullYear() - 3)
        break
      case '5y':
        from.setFullYear(now.getFullYear() - 5)
        break
    }

    return { from, to: now }
  }, [selectedTimeRange])

  // Fetch activities list for filter
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities?limit=1000')
        if (response.ok) {
          const data = await response.json()
          const activitiesList = (data.activities || data).map((activity: any) => ({
            id: activity.id,
            title: activity.title_narrative || activity.title || 'Untitled Activity',
            iati_identifier: activity.iati_identifier
          }))
          setActivities(activitiesList)
        }
      } catch (error) {
        console.error('[CumulativeFinancialOverview] Error fetching activities:', error)
      }
    }
    fetchActivities()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if Supabase client is available
        if (!supabase) {
          console.error('[CumulativeFinancialOverview] Supabase client is not initialized')
          setError('Database connection not available. Please check your environment configuration.')
          return
        }

        // Fetch all transactions
        console.log('[CumulativeFinancialOverview] === FETCHING TRANSACTIONS ===')
        console.log('[CumulativeFinancialOverview] Query filters:', {
          effectiveDateRange: { from: effectiveDateRange.from.toISOString(), to: effectiveDateRange.to.toISOString() },
          selectedTimeRange,
          donor: filters?.donor || 'none',
          selectedActivities: selectedActivities.length > 0 ? selectedActivities : 'none'
        })

        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, activity_id, provider_org_id')
          .eq('status', 'actual')
          .order('transaction_date', { ascending: true })

        // Apply date range filter based on selected time range
        transactionsQuery = transactionsQuery
          .gte('transaction_date', effectiveDateRange.from.toISOString())
          .lte('transaction_date', effectiveDateRange.to.toISOString())

        // Apply donor filter
        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
        }

        // Apply activity filter
        if (selectedActivities.length > 0) {
          transactionsQuery = transactionsQuery.in('activity_id', selectedActivities)
        }

        console.log('[CumulativeFinancialOverview] Executing query...')
        const { data: transactions, error: transactionsError } = await transactionsQuery
        console.log('[CumulativeFinancialOverview] Query completed. Error:', transactionsError ? transactionsError.message : 'none')
        console.log('[CumulativeFinancialOverview] Transactions count:', transactions?.length ?? 'null/undefined')

        if (transactionsError) {
          console.error('[CumulativeFinancialOverview] Error fetching transactions:', transactionsError)
          setError(`Failed to fetch transaction data: ${transactionsError.message || transactionsError.toString()}`)
          return
        }

        console.log('[CumulativeFinancialOverview] Transactions fetched:', transactions?.length || 0)
        if (transactions && transactions.length > 0) {
          console.log('[CumulativeFinancialOverview] Sample transaction:', transactions[0])
        } else {
          console.log('[CumulativeFinancialOverview] No transactions found or transactions is null/undefined')
        }

        // Debug: Log transaction type distribution
        if (transactions && transactions.length > 0) {
          const typeCounts = transactions.reduce((acc: Record<string, number>, tx: any) => {
            const type = tx.transaction_type || 'unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {})
          console.log('[CumulativeFinancialOverview] Transaction type counts:', typeCounts)
          console.log('[CumulativeFinancialOverview] Total transactions:', transactions.length)
          
          // Check for type '2' transactions specifically
          const type2Transactions = transactions.filter((tx: any) => tx.transaction_type === '2')
          console.log('[CumulativeFinancialOverview] Type 2 (Outgoing Commitment) transactions:', type2Transactions.length)
          if (type2Transactions.length > 0) {
            console.log('[CumulativeFinancialOverview] Sample type 2 transactions:', type2Transactions.slice(0, 3).map((tx: any) => ({
              date: tx.transaction_date,
              value: tx.value,
              value_usd: tx.value_usd,
              currency: tx.currency
            })))
          }
        }

        // Fetch planned disbursements
        let plannedDisbursementsQuery = supabase
          .from('planned_disbursements')
          .select('period_start, period_end, amount, usd_amount, currency, activity_id')
          .order('period_start', { ascending: true })

        // Apply date range filter based on selected time range
        plannedDisbursementsQuery = plannedDisbursementsQuery
          .gte('period_start', effectiveDateRange.from.toISOString())
          .lte('period_start', effectiveDateRange.to.toISOString())

        // Apply activity filter
        if (selectedActivities.length > 0) {
          plannedDisbursementsQuery = plannedDisbursementsQuery.in('activity_id', selectedActivities)
        }

        const { data: plannedDisbursements, error: plannedError } = await plannedDisbursementsQuery

        if (plannedError) {
          console.error('[CumulativeFinancialOverview] Error fetching planned disbursements:', plannedError)
        }

        // Fetch budgets
        let budgetsQuery = supabase
          .from('activity_budgets')
          .select('period_start, period_end, value, usd_value, currency, activity_id')
          .order('period_start', { ascending: true })

        // Apply date range filter based on selected time range
        budgetsQuery = budgetsQuery
          .gte('period_start', effectiveDateRange.from.toISOString())
          .lte('period_start', effectiveDateRange.to.toISOString())

        // Apply activity filter
        if (selectedActivities.length > 0) {
          budgetsQuery = budgetsQuery.in('activity_id', selectedActivities)
        }

        const { data: budgets, error: budgetsError } = await budgetsQuery

        if (budgetsError) {
          console.error('[CumulativeFinancialOverview] Error fetching budgets:', budgetsError)
        }

        // Process data using year-based proportional allocation
        // Aggregate directly into yearly buckets
        const yearlyDataMap = new Map<number, {
          incomingCommitment: number  // Type '1'
          incomingFunds: number       // Type '12'
          outgoingCommitment: number // Type '2'
          creditGuarantee: number     // Type '11'
          disbursements: number       // Type '3'
          expenditures: number        // Type '4'
          plannedDisbursements: number
          plannedBudgets: number
        }>()

        // Helper to initialize year entry if needed
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

        // Process transactions by type and year
        let skippedTransactions = 0
        let processedByType: Record<string, number> = {}
        
        transactions?.forEach((transaction: any) => {
          // If allocation method is NOT proportional, we force single-date behavior
          // even if the transaction has a period range.
          // If it IS proportional, splitTransactionAcrossYears will handle period ranges if present.
          const txToProcess = allocationMethod === 'proportional' 
            ? transaction 
            : { ...transaction, period_start: null, period_end: null }

          const yearAllocations = splitTransactionAcrossYears(txToProcess)
          
          // Track if transaction was skipped (no allocations returned)
          if (yearAllocations.length === 0) {
            skippedTransactions++
            const type = transaction.transaction_type || 'unknown'
            if (!processedByType[type]) processedByType[type] = 0
            return
          }
          
          yearAllocations.forEach(({ year, amount }) => {
            ensureYearEntry(year)
            const yearData = yearlyDataMap.get(year)!
            const type = transaction.transaction_type

            // Track processed transactions by type
            if (!processedByType[type]) processedByType[type] = 0
            processedByType[type]++

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
            } else {
              // Log unhandled transaction types for debugging
              console.warn('[CumulativeFinancialOverview] Unhandled transaction type:', type, transaction)
            }
          })
        })
        
        // Debug: Log processing summary
        if (skippedTransactions > 0) {
          console.warn('[CumulativeFinancialOverview] Skipped transactions (no value or invalid date):', skippedTransactions)
        }
        console.log('[CumulativeFinancialOverview] Processed transactions by type:', processedByType)

        // Process planned disbursements
        plannedDisbursements?.forEach((pd: any) => {
          if (allocationMethod === 'proportional') {
            // Use year-based proportional allocation
            const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
            yearAllocations.forEach(({ year, amount }) => {
              ensureYearEntry(year)
              yearlyDataMap.get(year)!.plannedDisbursements += amount
            })
          } else {
            // Period start allocation: full amount to start year
            if (pd.period_start) {
              const startDate = new Date(pd.period_start)
              if (!isNaN(startDate.getTime())) {
                const year = startDate.getFullYear()
                ensureYearEntry(year)
                
                // Get value (prefer USD)
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
            // Use year-based proportional allocation
            const yearAllocations = splitBudgetAcrossYears(budget)
            yearAllocations.forEach(({ year, amount }) => {
              ensureYearEntry(year)
              yearlyDataMap.get(year)!.plannedBudgets += amount
            })
          } else {
            // Period start allocation: full amount to start year
            if (budget.period_start) {
              const startDate = new Date(budget.period_start)
              if (!isNaN(startDate.getTime())) {
                const year = startDate.getFullYear()
                ensureYearEntry(year)
                
                // Get value (prefer USD)
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

        // Convert yearly data to sorted array and calculate cumulative values
        const sortedYears = Array.from(yearlyDataMap.keys()).sort((a, b) => a - b)
        
        let cumulativeIncomingCommitment = 0
        let cumulativeIncomingFunds = 0
        let cumulativeOutgoingCommitment = 0
        let cumulativeCreditGuarantee = 0
        let cumulativeDisbursements = 0
        let cumulativeExpenditures = 0
        let cumulativePlannedDisbursements = 0
        let cumulativePlannedBudgets = 0

        // Aggregate into yearly buckets for visualization
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

          // Use year as key for yearly aggregation
          const yearKey = `${year}`
          const yearDate = new Date(year, 0, 1) // January 1st of the year

          // Keep the latest cumulative values for each year (end of year snapshot)
          yearlyMap.set(yearKey, {
            date: yearDate.toISOString(),
            timestamp: yearDate.getTime(),
            yearKey,
            displayDate: `${year}`,
            fullDate: `${year}`,
            'Incoming Commitment': cumulativeIncomingCommitment,
            'Incoming Funds': cumulativeIncomingFunds,
            'Outgoing Commitment': cumulativeOutgoingCommitment,
            'Credit Guarantee': cumulativeCreditGuarantee,
            'Disbursements': cumulativeDisbursements,
            'Expenditures': cumulativeExpenditures,
            'Planned Disbursements': cumulativePlannedDisbursements,
            'Budgets': cumulativePlannedBudgets
          })
        })

        const sortedData = Array.from(yearlyMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // Fill in missing years to ensure continuous time axis
        if (sortedData.length === 0) {
          setCumulativeData([])
          return
        }

        const filledData: any[] = []
        const firstDate = new Date(sortedData[0].timestamp)
        const lastDate = new Date(sortedData[sortedData.length - 1].timestamp)

        // Create a map for quick lookup
        const dataMap = new Map(sortedData.map(d => [d.yearKey, d]))

        // Iterate through all years from first to last
        const startYear = firstDate.getFullYear()
        const endYear = lastDate.getFullYear()

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

        for (let year = startYear; year <= endYear; year++) {
          const yearKey = `${year}`

          if (dataMap.has(yearKey)) {
            const existingData = dataMap.get(yearKey)!
            filledData.push(existingData)
            // Update last known cumulative values
            lastCumulativeValues = {
              incomingCommitment: existingData['Incoming Commitment'],
              incomingFunds: existingData['Incoming Funds'],
              outgoingCommitment: existingData['Outgoing Commitment'],
              creditGuarantee: existingData['Credit Guarantee'],
              disbursements: existingData['Disbursements'],
              expenditures: existingData['Expenditures'],
              plannedDisbursements: existingData['Planned Disbursements'],
              plannedBudgets: existingData['Budgets']
            }
          } else {
            // Fill missing year with last cumulative values (carry forward) for transactions
            // but set Budgets to null so only actual budget points are plotted
            const yearDate = new Date(year, 0, 1)
            filledData.push({
              date: yearDate.toISOString(),
              timestamp: yearDate.getTime(),
              yearKey,
              displayDate: `${year}`,
              fullDate: `${year}`,
              'Incoming Commitment': lastCumulativeValues.incomingCommitment,
              'Incoming Funds': lastCumulativeValues.incomingFunds,
              'Outgoing Commitment': lastCumulativeValues.outgoingCommitment,
              'Credit Guarantee': lastCumulativeValues.creditGuarantee,
              'Disbursements': lastCumulativeValues.disbursements,
              'Expenditures': lastCumulativeValues.expenditures,
              'Planned Disbursements': lastCumulativeValues.plannedDisbursements,
              'Budgets': null  // null for years without budget data
            })
          }
        }

        setCumulativeData(filledData)
      } catch (err) {
        console.error('[CumulativeFinancialOverview] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveDateRange, filters, refreshKey, selectedActivities, allocationMethod])

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
          'Incoming Commitment': item['Incoming Commitment'],
          'Incoming Funds': item['Incoming Funds'],
          'Outgoing Commitment': item['Outgoing Commitment'],
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
        'Incoming Commitment': item['Incoming Commitment'] - prevItem['Incoming Commitment'],
        'Incoming Funds': item['Incoming Funds'] - prevItem['Incoming Funds'],
        'Outgoing Commitment': item['Outgoing Commitment'] - prevItem['Outgoing Commitment'],
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
      'Incoming Commitment': lastItem['Incoming Commitment'],
      'Incoming Funds': lastItem['Incoming Funds'],
      'Outgoing Commitment': lastItem['Outgoing Commitment'],
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
    const seriesKeys = ['Incoming Commitment', 'Incoming Funds', 'Outgoing Commitment', 'Credit Guarantee', 'Disbursements', 'Expenditures', 'Planned Disbursements', 'Budgets']

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
      'Incoming Commitment': '1',
      'Incoming Funds': '12',
      'Outgoing Commitment': '2',
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
        // Get value - entry.value should contain the numeric value for the dataKey
        // If it's not available or is 0/null, try to get from payload using dataKey or name
        let value = entry.value
        if (value == null || value === undefined || (typeof value === 'number' && (isNaN(value) || value === 0))) {
          // Try to get from payload using dataKey (the key used in the Line/Bar component)
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

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{fullDate}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                {entries.map((entry: any, index: number) => {
                  const transactionTypeCode = getTransactionTypeCode(entry.name)
                  
                  return (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-1.5 pr-4 flex items-center gap-2">
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
                      <td className="py-1.5 text-right font-semibold text-slate-900">
                        {formatTooltipValue(entry.displayValue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey)

          return (
            <li
              key={`item-${index}`}
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => handleLegendClick({ dataKey: entry.dataKey })}
              style={{ opacity: isHidden ? 0.3 : 1 }}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
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
      'Incoming Commitment': d['Incoming Commitment']?.toFixed(2) || '0.00',
      'Incoming Funds': d['Incoming Funds']?.toFixed(2) || '0.00',
      'Outgoing Commitment': d['Outgoing Commitment']?.toFixed(2) || '0.00',
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

    exportToCSV(csv, `cumulative-financial-overview-${new Date().getTime()}.csv`)
  }

  // Export to JPG
  const handleExportJPG = () => {
    const chartElement = document.querySelector('#cumulative-financial-chart') as HTMLElement
    if (!chartElement) return

    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(canvas => {
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
      })
    })
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
            {!hiddenSeries.has('Outgoing Commitment') && (
              <Line type="monotone" dataKey="Outgoing Commitment" name="Commitments" stroke={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']} strokeWidth={2} dot={false} />
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
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cumulative Financial Overview
          </CardTitle>
          <CardDescription>
            Cumulative view of all transaction types, planned disbursements, and planned budgets over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cumulative Financial Overview
          </CardTitle>
          <CardDescription>
            Cumulative view of all transaction types, planned disbursements, and planned budgets over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title and Description */}
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Financial Overview
            </CardTitle>
            <CardDescription>
              {dataMode === 'cumulative' && chartType !== 'total' && 'Cumulative tracking of actual transactions, planned disbursements, and budgets across all activities over time'}
              {dataMode === 'periodic' && chartType !== 'total' && 'Period-by-period changes in actual transactions, planned disbursements, and budgets across all activities'}
              {chartType === 'total' && 'Total values of transactions, planned disbursements, and budgets aggregated across all periods and activities'}
            </CardDescription>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filters - Left Side */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Time Range Filter */}
              <div className="w-[160px]">
                <Select
                  value={selectedTimeRange}
                  onValueChange={(value) => setSelectedTimeRange(value as TimeRange)}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Multi-Select */}
              <div className="w-[280px]">
                <MultiSelect
                  options={activities.map(activity => ({
                    label: activity.iati_identifier
                      ? `${activity.title} (${activity.iati_identifier})`
                      : activity.title,
                    value: activity.id
                  }))}
                  selected={selectedActivities}
                  onChange={setSelectedActivities}
                  placeholder="Activities (All)"
                  showSelectAll={true}
                  selectedLabel="Activities selected"
                />
              </div>
            </div>

            {/* View Controls and Export - Right Side */}
            <div className="flex items-center gap-2 flex-wrap">
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
                <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white">
                  <Label htmlFor="allocation-toggle" className="text-sm text-slate-700 cursor-pointer">
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
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 px-2"
                  title="Export to CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
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
      </CardHeader>
      <CardContent id="cumulative-financial-chart">
        {displayData.length > 0 ? (
          <>
            {/* Table View */}
            {chartType === 'table' && (
              <div className="rounded-md border overflow-auto h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-white z-10">
                      <TableHead className="bg-white">Period</TableHead>
                      {activeSeries.has('Incoming Commitment') && (
                        <TableHead className="text-right bg-white">Incoming Commitment</TableHead>
                      )}
                      {activeSeries.has('Incoming Funds') && (
                        <TableHead className="text-right bg-white">Incoming Funds</TableHead>
                      )}
                      {activeSeries.has('Outgoing Commitment') && (
                        <TableHead className="text-right bg-white">Outgoing Commitment</TableHead>
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
                        {activeSeries.has('Incoming Commitment') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Incoming Commitment'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Incoming Funds') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Incoming Funds'] || 0)}</TableCell>
                        )}
                        {activeSeries.has('Outgoing Commitment') && (
                          <TableCell className="text-right">{formatTooltipValue(item['Outgoing Commitment'] || 0)}</TableCell>
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
                        {activeSeries.has('Incoming Commitment') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Incoming Commitment'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Incoming Commitment'] || 0), 0))
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
                        {activeSeries.has('Outgoing Commitment') && (
                          <TableCell className="text-right">
                            {dataMode === 'cumulative'
                              ? formatTooltipValue(displayData[displayData.length - 1]['Outgoing Commitment'] || 0)
                              : formatTooltipValue(displayData.reduce((sum, item) => sum + (item['Outgoing Commitment'] || 0), 0))
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
                  {activeSeries.has('Incoming Commitment') && (
                    <Bar
                      dataKey="Incoming Commitment"
                      fill={hiddenSeries.has('Incoming Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitment']}
                      opacity={hiddenSeries.has('Incoming Commitment') ? 0.3 : 1}
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
                  {activeSeries.has('Outgoing Commitment') && (
                    <Bar
                      dataKey="Outgoing Commitment"
                      fill={hiddenSeries.has('Outgoing Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']}
                      opacity={hiddenSeries.has('Outgoing Commitment') ? 0.3 : 1}
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
                  {activeSeries.has('Incoming Commitment') && (
                    <Line
                      type="monotone"
                      dataKey="Incoming Commitment"
                      stroke={hiddenSeries.has('Incoming Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitment']}
                      strokeWidth={hiddenSeries.has('Incoming Commitment') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Incoming Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitment'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Incoming Commitment') ? 0.3 : 1}
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
                  {activeSeries.has('Outgoing Commitment') && (
                    <Line
                      type="monotone"
                      dataKey="Outgoing Commitment"
                      stroke={hiddenSeries.has('Outgoing Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']}
                      strokeWidth={hiddenSeries.has('Outgoing Commitment') ? 1 : 2.5}
                      dot={{ fill: hiddenSeries.has('Outgoing Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment'], r: 3 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      opacity={hiddenSeries.has('Outgoing Commitment') ? 0.3 : 1}
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
                    {activeSeries.has('Incoming Commitment') && (
                      <linearGradient id="colorIncomingCommitment" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Commitment']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Commitment']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Incoming Funds') && (
                      <linearGradient id="colorIncomingFunds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Funds']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Incoming Funds']} stopOpacity={0.1}/>
                      </linearGradient>
                    )}
                    {activeSeries.has('Outgoing Commitment') && (
                      <linearGradient id="colorOutgoingCommitment" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']} stopOpacity={0.1}/>
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
                  {activeSeries.has('Incoming Commitment') && (
                    <Area
                      type="monotone"
                      dataKey="Incoming Commitment"
                      stroke={hiddenSeries.has('Incoming Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Incoming Commitment']}
                      strokeWidth={hiddenSeries.has('Incoming Commitment') ? 1 : 2.5}
                      fill={hiddenSeries.has('Incoming Commitment') ? 'url(#colorIncomingCommitment)' : 'url(#colorIncomingCommitment)'}
                      fillOpacity={hiddenSeries.has('Incoming Commitment') ? 0.1 : 0.6}
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
                  {activeSeries.has('Outgoing Commitment') && (
                    <Area
                      type="monotone"
                      dataKey="Outgoing Commitment"
                      stroke={hiddenSeries.has('Outgoing Commitment') ? '#cbd5e1' : FINANCIAL_OVERVIEW_COLORS['Outgoing Commitment']}
                      strokeWidth={hiddenSeries.has('Outgoing Commitment') ? 1 : 2.5}
                      fill={hiddenSeries.has('Outgoing Commitment') ? 'url(#colorOutgoingCommitment)' : 'url(#colorOutgoingCommitment)'}
                      fillOpacity={hiddenSeries.has('Outgoing Commitment') ? 0.1 : 0.6}
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
      </CardContent>
    </Card>
  )
}
