"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { LoadingText } from '@/components/ui/loading-text'
import { AlertCircle, CalendarIcon, ChevronDown, Download, BarChart3, LineChart as LineChartIcon, TrendingUp, Table2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
// Brand color palette - 5 distinct colors, no duplicates
const BRAND_PALETTE = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
} as const

// Ordered array for cycling through colors
const PALETTE_ARRAY = [
  BRAND_PALETTE.primaryScarlet,
  BRAND_PALETTE.blueSlate,
  BRAND_PALETTE.coolSteel,
  BRAND_PALETTE.paleSlate,
  BRAND_PALETTE.platinum,
]
import { CustomYear, getCustomYearRange, getCustomYearLabel, crossesCalendarYear } from '@/types/custom-years'
import { format, parseISO } from 'date-fns'
import {
  splitBudgetAcrossYears,
  splitPlannedDisbursementAcrossYears,
  splitTransactionAcrossYears,
  allocateAcrossFiscalYears,
  getFiscalYearForDate,
  type FiscalYearAllocation
} from '@/utils/year-allocation'

// Transaction type mapping (IATI Standard v2.03)
const TRANSACTION_TYPES: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge',
}

// Fixed color assignments for always-visible categories
const FIXED_COLORS: Record<string, string> = {
  'Budgets': BRAND_PALETTE.coolSteel,
  'Planned Disbursements': BRAND_PALETTE.paleSlate,
}

// Get color for a data key, ensuring no duplicates across active keys
function getColorForKey(key: string, activeKeys: string[], index: number): string {
  // Fixed categories get fixed colors
  if (FIXED_COLORS[key]) {
    return FIXED_COLORS[key]
  }
  
  // For transaction types, use remaining palette colors in order
  // Skip colors already used by fixed categories
  const usedColors = Object.values(FIXED_COLORS)
  const availableColors = PALETTE_ARRAY.filter(c => !usedColors.includes(c))
  
  // Find the index of this key among transaction types only
  const transactionKeys = activeKeys.filter(k => !FIXED_COLORS[k])
  const txIndex = transactionKeys.indexOf(key)
  
  if (txIndex >= 0 && txIndex < availableColors.length) {
    return availableColors[txIndex]
  }
  
  // Fallback if we run out of colors (shouldn't happen with 3 transaction types max recommended)
  return availableColors[txIndex % availableColors.length] || BRAND_PALETTE.blueSlate
}

// Generate list of available years
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

type ChartType = 'bar' | 'line' | 'area' | 'table'

interface FinancialTotalsBarChartProps {
  dateRange?: {
    from: Date
    to: Date
  }
  refreshKey?: number
  compact?: boolean
}

interface YearlyData {
  year: number
  displayYear: string
  Budgets: number
  'Planned Disbursements': number
  [key: string]: number | string
}

// Currency formatter for axis labels (no decimals)
const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `$${Math.round(value / 1000000000)}b`
  } else if (value >= 1000000) {
    return `$${Math.round(value / 1000000)}m`
  } else if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`
  }
  return `$${Math.round(value)}`
}

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function FinancialTotalsBarChart({
  dateRange,
  refreshKey,
  compact = false,
}: FinancialTotalsBarChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{
    budgets: any[]
    plannedDisbursements: any[]
    transactions: any[]
  } | null>(null)
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['3']) // Default to Disbursements
  const [chartType, setChartType] = useState<ChartType>('bar')

  // Calendar type and year selection state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Calculate effective date range based on custom years and selected years
  const effectiveDateRange = useMemo(() => {
    const customYear = customYears.find(cy => cy.id === calendarType)

    if (customYears.length > 0 && selectedYears.length > 0 && calendarType && customYear) {
      const sortedYears = [...selectedYears].sort((a, b) => a - b)
      const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
      const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    if (actualDataRange && customYear) {
      const firstYearRange = getCustomYearRange(customYear, actualDataRange.minYear)
      const lastYearRange = getCustomYearRange(customYear, actualDataRange.maxYear)
      return { from: firstYearRange.start, to: lastYearRange.end }
    }

    const now = new Date()
    const from = new Date()
    from.setFullYear(now.getFullYear() - 5)
    return { from, to: now }
  }, [customYears, selectedYears, calendarType, actualDataRange])

  // Fetch custom years on mount
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await fetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)

          let selectedCalendar: CustomYear | undefined
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }
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

  // Fetch actual date range from data
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!supabase) return

      try {
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

        const allDates: string[] = []
        transactionDates?.forEach(t => { if (t.transaction_date) allDates.push(t.transaction_date) })
        budgetDates?.forEach(b => {
          if (b.period_start) allDates.push(b.period_start)
          if (b.period_end) allDates.push(b.period_end)
        })
        pdDates?.forEach(pd => {
          if (pd.period_start) allDates.push(pd.period_start)
          if (pd.period_end) allDates.push(pd.period_end)
        })

        if (allDates.length > 0) {
          const years = allDates.map(d => new Date(d).getFullYear()).filter(y => !isNaN(y))
          if (years.length > 0) {
            const minYear = Math.min(...years)
            const maxYear = Math.max(...years)
            setActualDataRange({ minYear, maxYear })
            setSelectedYears([minYear, maxYear])
          }
        } else {
          const currentYear = new Date().getFullYear()
          setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
          setSelectedYears([currentYear - 5, currentYear])
        }
      } catch (err) {
        console.error('[FinancialTotalsBarChart] Error fetching date range:', err)
        const currentYear = new Date().getFullYear()
        setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
        setSelectedYears([currentYear - 5, currentYear])
      }
    }

    fetchDateRange()
  }, [])

  // Handle year click
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

  const selectDataRange = () => {
    if (actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
  }

  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return `${year}`
  }

  // Fetch raw data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) {
          setError('Database connection not available')
          return
        }

        // Fetch all data without date filtering - filter in processing
        const { data: budgets, error: budgetsError } = await supabase
          .from('activity_budgets')
          .select('period_start, period_end, value, usd_value, currency')
          .not('period_start', 'is', null)

        if (budgetsError) {
          console.error('[FinancialTotalsBarChart] Error fetching budgets:', budgetsError)
        }

        const { data: plannedDisbursements, error: plannedError } = await supabase
          .from('planned_disbursements')
          .select('period_start, period_end, amount, usd_amount, currency')
          .not('period_start', 'is', null)

        if (plannedError) {
          console.error('[FinancialTotalsBarChart] Error fetching planned disbursements:', plannedError)
        }

        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency')
          .eq('status', 'actual')
          .not('transaction_date', 'is', null)

        if (transactionsError) {
          console.error('[FinancialTotalsBarChart] Error fetching transactions:', transactionsError)
        }

        setRawData({
          budgets: budgets || [],
          plannedDisbursements: plannedDisbursements || [],
          transactions: transactions || [],
        })
      } catch (err) {
        console.error('[FinancialTotalsBarChart] Unexpected error:', err)
        setError('Failed to load financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  // Process data into yearly chart data
  const chartData = useMemo(() => {
    if (!rawData) return []

    const customYear = customYears.find(cy => cy.id === calendarType)
    const yearlyDataMap = new Map<number, YearlyData>()
    
    // Check if we're using a fiscal year that crosses calendar boundaries
    const useFiscalYear = customYear && crossesCalendarYear(customYear)

    const ensureYearEntry = (year: number) => {
      if (!yearlyDataMap.has(year)) {
        yearlyDataMap.set(year, {
          year,
          displayYear: customYear ? getCustomYearLabel(customYear, year) : `${year}`,
          Budgets: 0,
          'Planned Disbursements': 0,
        })
      }
    }

    // Process budgets
    rawData.budgets.forEach(budget => {
      if (useFiscalYear && customYear && budget.period_start && budget.period_end) {
        // Use fiscal year allocation
        const value = parseFloat(String(budget.usd_value)) || 
                     (budget.currency === 'USD' ? parseFloat(String(budget.value)) || 0 : 0)
        if (value > 0) {
          const fiscalAllocations = allocateAcrossFiscalYears(
            budget.period_start,
            budget.period_end,
            value,
            customYear
          )
          fiscalAllocations.forEach(({ fiscalYear, amount }) => {
            ensureYearEntry(fiscalYear)
            yearlyDataMap.get(fiscalYear)!.Budgets += amount
          })
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitBudgetAcrossYears(budget)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!.Budgets += amount
        })
      }
    })

    // Process planned disbursements
    rawData.plannedDisbursements.forEach(pd => {
      if (useFiscalYear && customYear && pd.period_start) {
        // Use fiscal year allocation
        const value = parseFloat(String(pd.usd_amount)) || 
                     (pd.currency === 'USD' ? parseFloat(String(pd.amount)) || 0 : 0)
        if (value > 0) {
          if (pd.period_end) {
            const fiscalAllocations = allocateAcrossFiscalYears(
              pd.period_start,
              pd.period_end,
              value,
              customYear
            )
            fiscalAllocations.forEach(({ fiscalYear, amount }) => {
              ensureYearEntry(fiscalYear)
              yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] += amount
            })
          } else {
            // Single date - assign to fiscal year
            const date = parseISO(pd.period_start)
            if (!isNaN(date.getTime())) {
              const fiscalYear = getFiscalYearForDate(date, customYear)
              ensureYearEntry(fiscalYear)
              yearlyDataMap.get(fiscalYear)!['Planned Disbursements'] += value
            }
          }
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitPlannedDisbursementAcrossYears(pd)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          yearlyDataMap.get(year)!['Planned Disbursements'] += amount
        })
      }
    })

    // Process transactions
    rawData.transactions.forEach(tx => {
      const type = tx.transaction_type
      if (!type) return

      const typeName = TRANSACTION_TYPES[type]
      if (!typeName) return

      if (useFiscalYear && customYear && tx.transaction_date) {
        // Use fiscal year for transaction
        const value = parseFloat(String(tx.value_usd)) || 
                     (tx.currency === 'USD' ? parseFloat(String(tx.value)) || 0 : 0)
        if (value > 0) {
          const date = parseISO(tx.transaction_date)
          if (!isNaN(date.getTime())) {
            const fiscalYear = getFiscalYearForDate(date, customYear)
            ensureYearEntry(fiscalYear)
            const yearData = yearlyDataMap.get(fiscalYear)!
            if (!yearData[typeName]) {
              yearData[typeName] = 0
            }
            (yearData[typeName] as number) += value
          }
        }
      } else {
        // Use calendar year allocation
        const yearAllocations = splitTransactionAcrossYears(tx)
        yearAllocations.forEach(({ year, amount }) => {
          ensureYearEntry(year)
          const yearData = yearlyDataMap.get(year)!
          if (!yearData[typeName]) {
            yearData[typeName] = 0
          }
          (yearData[typeName] as number) += amount
        })
      }
    })

    // Filter to selected year range and sort
    // For fiscal years, we filter by fiscal year number, not calendar date
    let filteredData: YearlyData[]
    
    if (useFiscalYear && customYear && selectedYears.length > 0) {
      // Filter by selected fiscal years
      const minYear = Math.min(...selectedYears)
      const maxYear = Math.max(...selectedYears)
      filteredData = Array.from(yearlyDataMap.values())
        .filter(d => d.year >= minYear && d.year <= maxYear)
        .sort((a, b) => a.year - b.year)
    } else {
      // Filter by calendar date range
      const startYear = effectiveDateRange.from.getFullYear()
      const endYear = effectiveDateRange.to.getFullYear()
      filteredData = Array.from(yearlyDataMap.values())
        .filter(d => d.year >= startYear && d.year <= endYear)
        .sort((a, b) => a.year - b.year)
    }

    return filteredData
  }, [rawData, customYears, calendarType, effectiveDateRange, selectedYears])

  // Get available transaction types (those with data)
  const availableTransactionTypes = useMemo(() => {
    if (!chartData.length) return []

    return Object.entries(TRANSACTION_TYPES)
      .filter(([code, name]) => {
        return chartData.some(d => (d[name] as number) > 0)
      })
      .map(([code, name]) => ({ code, name }))
  }, [chartData])

  // Toggle transaction type selection
  const toggleTransactionType = (code: string) => {
    setSelectedTransactionTypes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code)
      }
      return [...prev, code]
    })
  }

  // Build active data keys for the bars
  const activeDataKeys = useMemo(() => {
    const keys = ['Budgets', 'Planned Disbursements']
    selectedTransactionTypes.forEach(code => {
      const name = TRANSACTION_TYPES[code]
      if (name) keys.push(name)
    })
    return keys
  }, [selectedTransactionTypes])

  // Build color map for active keys - no duplicate colors
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    activeDataKeys.forEach((key, index) => {
      map[key] = getColorForKey(key, activeDataKeys, index)
    })
    return map
  }, [activeDataKeys])

  // Export to CSV
  const handleExportCSV = () => {
    if (!chartData.length) return

    const headers = ['Year', ...activeDataKeys]
    const rows = chartData.map(d => {
      return [
        d.displayYear,
        ...activeDataKeys.map(key => (d[key] as number)?.toFixed(2) || '0.00')
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `financial-totals-${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground">{label}</p>
            {customYears.find(cy => cy.id === calendarType)?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{customYears.find(cy => cy.id === calendarType)!.name}</p>
            )}
          </div>
          <div className="p-3">
          <table className="w-full text-sm">
            <tbody>
              {payload.map((entry: any, index: number) => (
                <tr key={index} className={(entry.name || '').includes('Planned Disbursements') ? 'border-b' : ''}>
                  <td className="py-1 pr-3 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    {(() => {
                      const codeMap: Record<string, string> = { 'Incoming Funds': '1', 'Outgoing Commitments': '2', 'Commitments': '2', 'Disbursements': '3', 'Expenditures': '4', 'Credit Guarantee': '10', 'Incoming Commitments': '11', 'Disbursement': '3' }
                      const code = codeMap[entry.name]
                      return code ? <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground">{code}</code> : null
                    })()}
                    <span className="text-foreground">{entry.name}</span>
                  </td>
                  <td className="py-1 text-right font-semibold text-foreground">
                    {formatCurrencyFull(entry.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    )
  }

  // Render the appropriate chart type
  const renderChart = (height: number, isCompact: boolean) => {
    const margin = isCompact 
      ? { top: 10, right: 20, left: 20, bottom: 30 }
      : { top: 20, right: 30, left: 20, bottom: 60 }

    const commonProps = {
      data: chartData,
      margin,
    }

    const xAxisProps = {
      dataKey: "displayYear",
      stroke: "#64748B",
      fontSize: isCompact ? 11 : 12,
      tickLine: false,
    }

    const yAxisProps = {
      tickFormatter: formatCurrency,
      stroke: "#64748B",
      fontSize: isCompact ? 10 : 12,
    }

    if (chartType === 'table') {
      return (
        <div className="overflow-auto" style={{ maxHeight: height }}>
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-foreground border-b">Year</th>
                {activeDataKeys.map(key => (
                  <th key={key} className="text-right px-4 py-3 font-semibold text-foreground border-b">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: colorMap[key] }}
                      />
                      {key}
                    </div>
                  </th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-foreground border-b">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => {
                const rowTotal = activeDataKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0)
                return (
                  <tr key={row.displayYear} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/50'}>
                    <td className="px-4 py-2.5 font-medium text-foreground border-b border-border">
                      {row.displayYear}
                    </td>
                    {activeDataKeys.map(key => (
                      <td key={key} className="text-right px-4 py-2.5 text-muted-foreground border-b border-border font-mono">
                        {formatCurrencyFull(Number(row[key]) || 0)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 text-foreground font-semibold border-b border-border font-mono">
                      {formatCurrencyFull(rowTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted">
              <tr>
                <td className="px-4 py-3 font-semibold text-foreground border-t-2 border-border">Total</td>
                {activeDataKeys.map(key => {
                  const columnTotal = chartData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
                  return (
                    <td key={key} className="text-right px-4 py-3 font-semibold text-foreground border-t-2 border-border font-mono">
                      {formatCurrencyFull(columnTotal)}
                    </td>
                  )
                })}
                <td className="text-right px-4 py-3 font-bold text-foreground border-t-2 border-border font-mono">
                  {formatCurrencyFull(
                    chartData.reduce((grandTotal, row) => 
                      grandTotal + activeDataKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0), 0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {!isCompact && <Legend content={renderLegend} />}
            {activeDataKeys.map(key => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={colorMap[key]}
                strokeWidth={2}
                dot={{ fill: colorMap[key], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart {...commonProps}>
            <defs>
              {activeDataKeys.map(key => (
                <linearGradient key={`gradient-${key}`} id={`color-${key.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorMap[key]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colorMap[key]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {!isCompact && <Legend content={renderLegend} />}
            {activeDataKeys.map(key => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={colorMap[key]}
                strokeWidth={2}
                fill={`url(#color-${key.replace(/\s+/g, '')})`}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    // Default: Bar chart
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart {...commonProps} barGap={0} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {!isCompact && <Legend content={renderLegend} />}
          {activeDataKeys.map(key => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              fill={colorMap[key]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Compact mode
  if (compact) {
    if (loading || customYearsLoading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    }

    if (error || chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      )
    }

    // Use 100% height to fill the container
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 30 }} barGap={0} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
            <XAxis dataKey="displayYear" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} stroke="#64748B" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            {activeDataKeys.map(key => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                fill={colorMap[key]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Full view
  if (loading || customYearsLoading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex items-start gap-2 flex-wrap">
        {/* Calendar & Year Selectors */}
        {customYears.length > 0 && (
          <>
            {/* Calendar Type Selector */}
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {customYears.map(cy => (
                    <DropdownMenuItem
                      key={cy.id}
                      className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                      onClick={() => setCalendarType(cy.id)}
                    >
                      {cy.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Year Range Selector */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 border rounded-lg p-1 bg-card">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {selectedYears.length === 0
                        ? 'Select years'
                        : selectedYears.length === 1
                          ? getYearLabel(selectedYears[0])
                          : `${getYearLabel(Math.min(...selectedYears))} - ${getYearLabel(Math.max(...selectedYears))}`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-3 w-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">Select Year Range</span>
                      <button
                        onClick={selectDataRange}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                        title={actualDataRange ? `Select years with data: ${getYearLabel(actualDataRange.minYear)} - ${getYearLabel(actualDataRange.maxYear)}` : 'Select years with data'}
                      >
                        Data Range
                      </button>
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
                                ? 'bg-slate-200 text-slate-900'
                                : inRange
                                  ? 'bg-primary/20 text-primary'
                                  : 'text-muted-foreground hover:bg-muted'
                              }
                            `}
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
              {/* Date Range Indicator */}
              {effectiveDateRange?.from && effectiveDateRange?.to && (
                <span className="text-xs text-muted-foreground text-center">
                  {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Transaction Types Dropdown - stays open for multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Transaction Types ({selectedTransactionTypes.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
              <div className="space-y-1">
                {availableTransactionTypes.map(({ code, name }) => {
                  const isSelected = selectedTransactionTypes.includes(code)
                  const typeName = TRANSACTION_TYPES[code]
                  const displayColor = isSelected && typeName ? colorMap[typeName] : BRAND_PALETTE.paleSlate
                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleTransactionType(code)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTransactionType(code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono min-w-[24px] text-center">{code}</code>
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: displayColor }}
                      />
                      <span className="text-sm">{name}</span>
                    </div>
                  )
                })}
                {availableTransactionTypes.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No transaction data available
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Chart Type Toggle */}
          <div className="flex gap-1 rounded-lg p-1 bg-muted">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('bar')}
              className={cn("h-8", chartType === 'bar' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('line')}
              className={cn("h-8", chartType === 'line' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              title="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('area')}
              className={cn("h-8", chartType === 'area' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              title="Area Chart"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('table')}
              className={cn("h-8", chartType === 'table' ? "bg-card shadow-sm text-foreground hover:bg-card" : "text-muted-foreground hover:text-foreground")}
              title="Table View"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Export Button */}
          <div className="flex gap-1 border rounded-lg p-1 bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 px-2"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[500px]">
        {chartData.length > 0 ? (
          renderChart(500, false)
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No financial data available</p>
              <p className="text-xs mt-2">Add budgets, planned disbursements, or transactions to see this chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Explanatory text */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        This chart provides a comprehensive view of financial flows over time, helping you understand the full lifecycle of aid funding. 
        <strong> Budgets</strong> represent approved funding allocations, while <strong>Planned Disbursements</strong> show when funds are scheduled to be released. 
        By comparing these forward-looking figures with actual <strong>transaction types</strong> (such as disbursements, commitments, and expenditures), 
        you can assess aid predictability, identify gaps between planned and actual spending, and track how effectively funds flow from commitment to implementation. 
        This analysis is essential for development partners coordinating their support and for recipient governments planning their budgets around expected aid inflows.
      </p>
    </div>
  )
}
