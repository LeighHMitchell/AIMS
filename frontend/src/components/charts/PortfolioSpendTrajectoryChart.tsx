"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Info, CalendarIcon, Download, FileImage, BarChart3, Table as TableIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import html2canvas from 'html2canvas'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch';

// Colour palette as specified
const COLOURS = {
  primaryScarlet: '#dc2625',  // Cumulative disbursements line (solid)
  paleSlate: '#cfd0d5',       // Grid lines
  blueSlate: '#4c5568',       // Axis text
  coolSteel: '#7b95a7',       // Perfect spend trajectory line (dashed)
  platinum: '#f1f4f8',        // Background/tooltips
}

// Generate list of available years (from 2010 to current year + 10 to cover all possible data)
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

interface MonthlyDisbursement {
  month: string
  value: number
  cumulativeValue: number
}

interface PortfolioSpendData {
  totalBudget: number
  currency: string
  startDate: string
  endDate: string
  monthlyDisbursements: MonthlyDisbursement[]
  activitiesWithBudget: number
  activitiesWithoutBudget: number
}

interface PlannedDisbursement {
  period_start: string
  period_end?: string
  usd_amount: number
  amount?: number
  currency?: string
}

interface Commitment {
  transaction_date: string
  value_usd: number
  value?: number
  currency?: string
}

interface PortfolioSpendTrajectoryChartProps {
  refreshKey?: number
  compact?: boolean
}

// Format currency with k/m suffixes
const formatCurrencyCompact = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(0)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(0)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

// Format for tooltip - slightly more precise
const formatTooltipCurrency = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(1)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(1)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

/**
 * PortfolioSpendTrajectoryChart
 * 
 * Aggregated view showing actual cumulative disbursements compared against
 * a perfect spend trajectory across all activities with reported budgets.
 */
export function PortfolioSpendTrajectoryChart({ refreshKey, compact = false }: PortfolioSpendTrajectoryChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PortfolioSpendData | null>(null)
  const [plannedDisbursements, setPlannedDisbursements] = useState<PlannedDisbursement[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set(['cumulativePlannedDisbursements', 'cumulativeCommitments']))
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const chartRef = useRef<HTMLDivElement>(null)

  // Which series to compare against perfect spend (only one at a time)
  const [comparisonSeries, setComparisonSeries] = useState<'cumulativeDisbursements' | 'cumulativePlannedDisbursements' | 'cumulativeCommitments'>('cumulativeDisbursements')

  // Toggle series visibility - for comparison series, only allow one at a time
  const comparisonSeriesKeys = ['cumulativeDisbursements', 'cumulativePlannedDisbursements', 'cumulativeCommitments']

  const handleLegendClick = (dataKey: string) => {
    if (comparisonSeriesKeys.includes(dataKey)) {
      // For comparison series, switch to this one and hide the others
      setComparisonSeries(dataKey as typeof comparisonSeries)
      setHiddenSeries(prev => {
        const newSet = new Set(prev)
        // Hide all comparison series except the clicked one
        comparisonSeriesKeys.forEach(key => {
          if (key === dataKey) {
            newSet.delete(key)
          } else {
            newSet.add(key)
          }
        })
        return newSet
      })
    } else {
      // For other series (perfectSpend), toggle normally
      setHiddenSeries(prev => {
        const newSet = new Set(prev)
        if (newSet.has(dataKey)) {
          newSet.delete(dataKey)
        } else {
          newSet.add(dataKey)
        }
        return newSet
      })
    }
  }

  // Calendar type and year selection state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  // Fetch custom years on mount
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await apiFetch('/api/custom-years')
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

  const selectAllYears = () => {
    setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
  }

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch main portfolio spend data
        const response = await apiFetch('/api/analytics/portfolio-spend-trajectory')

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch portfolio spend data')
        }

        const result = await response.json()
        setData(result)

        // Fetch planned disbursements
        if (supabase) {
          const { data: pdData, error: pdError } = await supabase
            .from('planned_disbursements')
            .select('period_start, period_end, usd_amount, amount, currency')
            .not('period_start', 'is', null)
            .order('period_start', { ascending: true })

          if (pdError) {
            console.error('[PortfolioSpendTrajectoryChart] Planned disbursements error:', pdError)
          }
          if (pdData) {
            // Use usd_amount if available, otherwise use amount (assuming USD)
            const processedPd = pdData.map(pd => ({
              ...pd,
              usd_amount: pd.usd_amount || pd.amount || 0
            }))
            setPlannedDisbursements(processedPd)
          }

          // Fetch commitments (transaction type 1 = incoming commitment, 2 = outgoing commitment)
          const { data: commitmentData, error: commitError } = await supabase
            .from('transactions')
            .select('transaction_date, value_usd, value, currency')
            .in('transaction_type', ['1', '2'])
            .not('transaction_date', 'is', null)
            .order('transaction_date', { ascending: true })

          if (commitError) {
            console.error('[PortfolioSpendTrajectoryChart] Commitments error:', commitError)
          }
          if (commitmentData) {
            // Use value_usd if available, otherwise use value (assuming USD)
            const processedCommitments = commitmentData.map(c => ({
              ...c,
              value_usd: c.value_usd || c.value || 0
            }))
            setCommitments(processedCommitments)
          }

          // Query actual date range from budgets and planned disbursements
          const { data: budgetDates } = await supabase
            .from('budgets')
            .select('period_start, period_end')
            .not('period_start', 'is', null)

          const { data: pdDates } = await supabase
            .from('planned_disbursements')
            .select('period_start, period_end')
            .not('period_start', 'is', null)

          // Find the actual min/max years from the data
          let minYear = new Date().getFullYear()
          let maxYear = new Date().getFullYear()

          const allDates: string[] = []

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
              minYear = Math.min(...years)
              maxYear = Math.max(...years)
              // Store the actual data range for the "Data Range" button
              setActualDataRange({ minYear, maxYear })
              // Set the default selected years based on actual data
              setSelectedYears([minYear, maxYear])
            }
          } else {
            // Fallback if no data
            const currentYear = new Date().getFullYear()
            setActualDataRange({ minYear: currentYear - 5, maxYear: currentYear })
            setSelectedYears([currentYear - 5, currentYear])
          }
        }
      } catch (err) {
        console.error('[PortfolioSpendTrajectoryChart] Error:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  // Process monthly data into chart data with gap areas
  const { chartData, yearTicks } = useMemo(() => {
    if (!data) {
      return { chartData: [], yearTicks: [] }
    }

    const { totalBudget, startDate, endDate, monthlyDisbursements } = data

    // Full portfolio date range (used for perfect spend calculation)
    const fullStart = new Date(startDate)
    const fullEnd = new Date(endDate)

    // Use the effective date range from calendar/year selection (don't clamp - show full selected range)
    const viewStart = new Date(effectiveDateRange.from)
    const viewEnd = new Date(effectiveDateRange.to)

    // Calculate full-life perfect spend trajectory
    const fullTotalMs = fullEnd.getTime() - fullStart.getTime()
    const getPerfectSpendValue = (date: Date): number => {
      if (fullTotalMs <= 0) return totalBudget
      const elapsedMs = date.getTime() - fullStart.getTime()
      const progress = Math.max(0, Math.min(1, elapsedMs / fullTotalMs))
      return progress * totalBudget
    }

    // Build a map of month -> cumulative value for quick lookup
    const disbursementMap = new Map<string, number>()
    for (const d of monthlyDisbursements) {
      disbursementMap.set(d.month, d.cumulativeValue)
    }

    // Build cumulative planned disbursements by month
    const plannedDisbursementsByMonth = new Map<string, number>()
    let cumulativePlanned = 0
    const sortedPlanned = [...plannedDisbursements]
      .filter(pd => pd.period_start && pd.usd_amount)
      .sort((a, b) => a.period_start.localeCompare(b.period_start))

    for (const pd of sortedPlanned) {
      const monthKey = pd.period_start.slice(0, 7)
      cumulativePlanned += pd.usd_amount || 0
      plannedDisbursementsByMonth.set(monthKey, cumulativePlanned)
    }

    // Build cumulative commitments by month
    const commitmentsByMonth = new Map<string, number>()
    let cumulativeCommit = 0
    const sortedCommitments = [...commitments]
      .filter(c => c.transaction_date && c.value_usd)
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))

    for (const c of sortedCommitments) {
      const monthKey = c.transaction_date.slice(0, 7)
      cumulativeCommit += c.value_usd || 0
      commitmentsByMonth.set(monthKey, cumulativeCommit)
    }

    // Generate points for EVERY month in the view window
    const points: Array<{
      date: Date
      month: string
      timestamp: number
      year: number
      perfectSpend: number
      cumulativeDisbursements: number
      cumulativePlannedDisbursements: number
      cumulativeCommitments: number
      gapArea: [number, number]
    }> = []

    // Find the cumulative values just before viewStart for filtered views
    let currentCumulative = 0
    let currentPlanned = 0
    let currentCommitments = 0

    const sortedDisbursements = [...monthlyDisbursements].sort((a, b) => a.month.localeCompare(b.month))
    for (const d of sortedDisbursements) {
      const monthDate = new Date(d.month + '-01')
      if (monthDate < viewStart) {
        currentCumulative = d.cumulativeValue
      }
    }

    // Get planned disbursements before viewStart
    for (const [monthKey, value] of plannedDisbursementsByMonth.entries()) {
      const monthDate = new Date(monthKey + '-01')
      if (monthDate < viewStart) {
        currentPlanned = value
      }
    }

    // Get commitments before viewStart
    for (const [monthKey, value] of commitmentsByMonth.entries()) {
      const monthDate = new Date(monthKey + '-01')
      if (monthDate < viewStart) {
        currentCommitments = value
      }
    }

    // Iterate month by month through the view window
    const currentDate = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1)

    while (currentDate <= viewEnd) {
      const monthKey = currentDate.toISOString().slice(0, 7)
      const monthMid = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15)

      // Update cumulative if there's a disbursement this month
      if (disbursementMap.has(monthKey)) {
        currentCumulative = disbursementMap.get(monthKey)!
      }

      // Update planned disbursements
      if (plannedDisbursementsByMonth.has(monthKey)) {
        currentPlanned = plannedDisbursementsByMonth.get(monthKey)!
      }

      // Update commitments
      if (commitmentsByMonth.has(monthKey)) {
        currentCommitments = commitmentsByMonth.get(monthKey)!
      }

      const perfectValue = getPerfectSpendValue(monthMid)
      const minVal = Math.min(perfectValue, currentCumulative)
      const maxVal = Math.max(perfectValue, currentCumulative)

      points.push({
        date: monthMid,
        month: monthKey,
        timestamp: monthMid.getTime(),
        year: currentDate.getFullYear(),
        perfectSpend: perfectValue,
        cumulativeDisbursements: currentCumulative,
        cumulativePlannedDisbursements: currentPlanned,
        cumulativeCommitments: currentCommitments,
        gapArea: [minVal, maxVal],
      })

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // Generate year ticks
    const ticks: number[] = []
    if (points.length > 0) {
      const startYear = points[0].year
      const endYear = points[points.length - 1].year
      for (let year = startYear; year <= endYear; year++) {
        ticks.push(new Date(year, 0, 1).getTime())
      }
    }

    return { chartData: points, yearTicks: ticks }
  }, [data, effectiveDateRange, plannedDisbursements, commitments])

  // Compute display data with dynamic gap area based on selected comparison series
  const displayData = useMemo(() => {
    return chartData.map(point => {
      const comparisonValue = point[comparisonSeries] || 0
      const minVal = Math.min(point.perfectSpend, comparisonValue)
      const maxVal = Math.max(point.perfectSpend, comparisonValue)
      return {
        ...point,
        gapArea: [minVal, maxVal] as [number, number]
      }
    })
  }, [chartData, comparisonSeries])

  // Find the latest reported disbursement date
  const latestDisbursementTimestamp = useMemo(() => {
    if (!data?.monthlyDisbursements?.length) return null
    const sorted = [...data.monthlyDisbursements]
      .filter(d => d.value > 0)
      .sort((a, b) => b.month.localeCompare(a.month))
    if (sorted.length === 0) return null
    const latestMonth = sorted[0].month
    return new Date(latestMonth + '-15').getTime()
  }, [data])

  // Find the latest commitment date
  const latestCommitmentTimestamp = useMemo(() => {
    if (!commitments?.length) return null
    const sorted = [...commitments]
      .filter(c => c.transaction_date && c.value_usd > 0)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    if (sorted.length === 0) return null
    return new Date(sorted[0].transaction_date).getTime()
  }, [commitments])

  // Compute x-axis domain
  const xAxisDomain = useMemo(() => {
    if (displayData.length === 0) return ['dataMin', 'dataMax'] as const
    const dataMin = displayData[0].timestamp
    const dataMax = displayData[displayData.length - 1].timestamp
    return [dataMin, dataMax]
  }, [displayData])

  const formatXAxisTick = (timestamp: number) => {
    const year = new Date(timestamp).getFullYear()
    return getYearLabel(year)
  }

  // Get the label for the current comparison series
  const getComparisonLabel = () => {
    switch (comparisonSeries) {
      case 'cumulativeDisbursements': return 'actual disbursements'
      case 'cumulativePlannedDisbursements': return 'planned disbursements'
      case 'cumulativeCommitments': return 'commitments'
      default: return 'actual disbursements'
    }
  }

  const getComparisonColor = () => {
    switch (comparisonSeries) {
      case 'cumulativeDisbursements': return COLOURS.primaryScarlet
      case 'cumulativePlannedDisbursements': return '#4c5568'
      case 'cumulativeCommitments': return '#5f7f7a'
      default: return COLOURS.primaryScarlet
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = displayData.map(d => ({
      'Month': format(new Date(d.timestamp), 'MMMM yyyy'),
      'Even-Spend Budget Baseline (USD)': d.perfectSpend?.toFixed(2) || '0.00',
      'Cumulative Planned Disbursements (USD)': d.cumulativePlannedDisbursements?.toFixed(2) || '0.00',
      'Cumulative Commitments (USD)': d.cumulativeCommitments?.toFixed(2) || '0.00',
      'Cumulative Disbursements (USD)': d.cumulativeDisbursements?.toFixed(2) || '0.00',
    }))

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n")

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `portfolio-spend-trajectory-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export to JPG
  const handleExportJPG = async () => {
    const chartElement = chartRef.current
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
          link.download = `portfolio-spend-trajectory-${new Date().getTime()}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Error exporting chart:', error)
    }
  }

  // Custom tooltip matching Financial Overview style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload
      const date = dataPoint?.date
      const formattedDate = date ? new Date(date).toLocaleDateString('en-AU', {
        month: 'long',
        year: 'numeric'
      }) : ''

      const perfectSpend = dataPoint?.perfectSpend || 0
      const comparisonValue = dataPoint?.[comparisonSeries] || 0
      const variance = comparisonValue - perfectSpend

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{formattedDate}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: COLOURS.coolSteel }}
                    />
                    <span className="text-slate-700 font-medium">Even-spend baseline</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {formatTooltipCurrency(perfectSpend)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getComparisonColor() }}
                    />
                    <span className="text-slate-700 font-medium capitalize">{getComparisonLabel()}</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {formatTooltipCurrency(comparisonValue)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div className="w-3 h-3 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">Gap to baseline</span>
                  </td>
                  <td
                    className="py-1.5 text-right font-semibold"
                    style={{ color: variance >= 0 ? '#16a34a' : '#dc2626' }}
                  >
                    {Math.abs(variance) < 1 ? '—' : `${variance >= 0 ? '+' : '-'}${formatTooltipCurrency(Math.abs(variance))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  // Compact mode check FIRST - before any Card returns
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (error || !data || displayData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      )
    }
    // Calculate yAxisMax for compact mode
    const maxDisbursement = displayData.length
      ? Math.max(...displayData.map(d => Math.max(
          d.cumulativeDisbursements,
          d.cumulativePlannedDisbursements,
          d.cumulativeCommitments
        )))
      : 0
    const yAxisMax = Math.max(data.totalBudget, maxDisbursement) * 1.1
    
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={displayData} 
            margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              <pattern 
                id="portfolioDiagonalStripesCompact" 
                patternUnits="userSpaceOnUse" 
                width="8" 
                height="8"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill="#f3f4f6" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#9ca3af" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOURS.paleSlate} opacity={0.5} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisTick}
              ticks={yearTicks}
              stroke={COLOURS.blueSlate}
              fontSize={10}
              tick={{ fill: COLOURS.blueSlate }}
            />
            <YAxis 
              tickFormatter={formatCurrencyCompact} 
              stroke={COLOURS.blueSlate} 
              fontSize={10}
              domain={[0, yAxisMax]}
              tick={{ fill: COLOURS.blueSlate }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="linear"
              dataKey="gapArea"
              fill="url(#portfolioDiagonalStripesCompact)"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              name="Variance"
            />
            <Line
              type="linear"
              dataKey="perfectSpend"
              name="Perfect spend"
              stroke={COLOURS.coolSteel}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="stepAfter"
              dataKey="cumulativeDisbursements"
              name="Actual spend"
              stroke={COLOURS.primaryScarlet}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Non-compact mode: loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  // Non-compact mode: error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    )
  }

  // Non-compact mode: no data state
  if (!data || displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Info className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <p className="font-medium">No activities with budget data found.</p>
          <p className="text-sm mt-2 text-slate-400">
            Add budget data to activities to view the portfolio spend trajectory.
          </p>
        </div>
      </div>
    )
  }

  // Non-compact mode: calculate chart dimensions
  const maxDisbursement = displayData.length
    ? Math.max(...displayData.map(d => Math.max(
        d.cumulativeDisbursements,
        d.cumulativePlannedDisbursements,
        d.cumulativeCommitments
      )))
    : 0
  const yAxisMax = Math.max(data.totalBudget, maxDisbursement) * 1.1

  return (
    <div className="space-y-4 overflow-visible">
      <div className="flex items-start justify-between gap-4 overflow-visible">
        {/* Left side - Calendar & Year Selectors */}
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

              {/* Year Range Selector */}
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

        {/* Right side - View Toggle & Export Buttons */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="h-8"
              title="Chart view"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
              title="Table view"
            >
              <TableIcon className="h-4 w-4" />
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
              disabled={viewMode === 'table'}
            >
              <FileImage className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div ref={chartRef}>
        {viewMode === 'chart' ? (
          <ResponsiveContainer width="100%" height={400}>
          <ComposedChart 
            data={displayData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {/* Diagonal stripe pattern for gap area */}
              <pattern 
                id="portfolioDiagonalStripes" 
                patternUnits="userSpaceOnUse" 
                width="8" 
                height="8"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill="#f3f4f6" />
                <line 
                  x1="0" y1="0" x2="0" y2="8" 
                  stroke="#9ca3af" 
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={COLOURS.paleSlate} 
              opacity={0.5} 
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xAxisDomain}
              tickFormatter={formatXAxisTick}
              ticks={yearTicks}
              stroke={COLOURS.blueSlate}
              fontSize={12}
              tick={{ fill: COLOURS.blueSlate }}
              tickLine={{ stroke: COLOURS.blueSlate }}
            />
            <YAxis 
              tickFormatter={formatCurrencyCompact} 
              stroke={COLOURS.blueSlate} 
              fontSize={12}
              domain={[0, yAxisMax]}
              tick={{ fill: COLOURS.blueSlate }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-4">
                  {payload?.filter(entry => entry.value !== 'Variance').map((entry, index) => {
                    const dataKey = entry.dataKey as string
                    const isHidden = hiddenSeries.has(dataKey)
                    const isDashed = dataKey === 'perfectSpend' || dataKey === 'cumulativePlannedDisbursements'

                    return (
                      <button
                        key={index}
                        onClick={() => handleLegendClick(dataKey)}
                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                          isHidden ? 'opacity-40' : 'opacity-100'
                        } hover:bg-slate-100`}
                      >
                        {isDashed ? (
                          <svg width="16" height="2" className="flex-shrink-0">
                            <line
                              x1="0" y1="1" x2="16" y2="1"
                              stroke={entry.color}
                              strokeWidth="2"
                              strokeDasharray="4 2"
                            />
                          </svg>
                        ) : (
                          <div
                            className="w-4 h-0.5 flex-shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                        )}
                        <span className={`text-xs ${isHidden ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {entry.value}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            />

            {/* Gap area with diagonal stripes - use linear to follow the diagonal perfect spend line */}
            <Area
              type="linear"
              dataKey="gapArea"
              fill="url(#portfolioDiagonalStripes)"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              name="Variance"
            />

            {/* Perfect Spend Trajectory - dashed line */}
            <Line
              type="linear"
              dataKey="perfectSpend"
              name="Even-Spend Budget Baseline (USD)"
              stroke={hiddenSeries.has('perfectSpend') ? '#cbd5e1' : COLOURS.coolSteel}
              strokeWidth={hiddenSeries.has('perfectSpend') ? 1 : 2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
              opacity={hiddenSeries.has('perfectSpend') ? 0.3 : 1}
            />

            {/* Cumulative Planned Disbursements */}
            <Line
              type="stepAfter"
              dataKey="cumulativePlannedDisbursements"
              name="Cumulative Aggregated Planned Disbursements (USD)"
              stroke={hiddenSeries.has('cumulativePlannedDisbursements') ? '#cbd5e1' : '#4c5568'}
              strokeWidth={hiddenSeries.has('cumulativePlannedDisbursements') ? 1 : 2}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
              isAnimationActive={false}
              opacity={hiddenSeries.has('cumulativePlannedDisbursements') ? 0.3 : 1}
            />

            {/* Cumulative Commitments */}
            <Line
              type="stepAfter"
              dataKey="cumulativeCommitments"
              name="Cumulative Aggregated Commitments (USD)"
              stroke={hiddenSeries.has('cumulativeCommitments') ? '#cbd5e1' : '#5f7f7a'}
              strokeWidth={hiddenSeries.has('cumulativeCommitments') ? 1 : 2}
              dot={false}
              connectNulls
              isAnimationActive={false}
              opacity={hiddenSeries.has('cumulativeCommitments') ? 0.3 : 1}
            />

            {/* Cumulative Disbursements - stepped solid line */}
            <Line
              type="stepAfter"
              dataKey="cumulativeDisbursements"
              name="Cumulative Aggregated Disbursements (USD)"
              stroke={hiddenSeries.has('cumulativeDisbursements') ? '#cbd5e1' : COLOURS.primaryScarlet}
              strokeWidth={hiddenSeries.has('cumulativeDisbursements') ? 1 : 2.5}
              dot={false}
              activeDot={hiddenSeries.has('cumulativeDisbursements') ? false : { r: 5, strokeWidth: 0, fill: COLOURS.primaryScarlet }}
              connectNulls
              isAnimationActive={false}
              opacity={hiddenSeries.has('cumulativeDisbursements') ? 0.3 : 1}
            />

            {/* Latest Data Markers - show based on selected comparison series */}
            {comparisonSeries === 'cumulativeDisbursements' && latestDisbursementTimestamp && (
              <ReferenceLine
                x={latestDisbursementTimestamp}
                stroke={COLOURS.primaryScarlet}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: 'Latest disbursement',
                  position: 'insideTopRight',
                  fill: COLOURS.primaryScarlet,
                  fontSize: 10,
                }}
              />
            )}
            {comparisonSeries === 'cumulativeCommitments' && latestCommitmentTimestamp && (
              <ReferenceLine
                x={latestCommitmentTimestamp}
                stroke="#5f7f7a"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: 'Latest commitment',
                  position: 'insideTopRight',
                  fill: '#5f7f7a',
                  fontSize: 10,
                }}
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
        ) : (
          /* Table View */
          <div className="rounded-md border overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-white z-10">
                  <TableHead className="bg-white">Month</TableHead>
                  <TableHead className="text-right bg-white">Even-Spend Budget Baseline (USD)</TableHead>
                  <TableHead className="text-right bg-white">Planned Disbursements (USD)</TableHead>
                  <TableHead className="text-right bg-white">Commitments (USD)</TableHead>
                  <TableHead className="text-right bg-white">Disbursements (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{format(new Date(row.timestamp), 'MMMM yyyy')}</TableCell>
                    <TableCell className="text-right">{formatTooltipCurrency(row.perfectSpend || 0)}</TableCell>
                    <TableCell className="text-right">{formatTooltipCurrency(row.cumulativePlannedDisbursements || 0)}</TableCell>
                    <TableCell className="text-right">{formatTooltipCurrency(row.cumulativeCommitments || 0)}</TableCell>
                    <TableCell className="text-right">{formatTooltipCurrency(row.cumulativeDisbursements || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Explanatory Text */}
      <div className="text-xs text-gray-500 mt-4 space-y-2">
        <p>
          This chart compares the portfolio's <strong>actual cumulative disbursements</strong> (red stepped line) against an
          <strong> even-spend budget baseline</strong> (grey dashed line) that models uniform spending across each activity's
          budget period. The <strong>cumulative planned disbursements</strong> (blue line) and <strong>cumulative commitments</strong> (purple line)
          provide additional context on planned versus actual financial flows.
        </p>
        <p>
          The striped area highlights the gap between the baseline and selected comparison series. When the selected line is
          above the baseline, execution is ahead of the even-spend model; when below, it is behind. Note that many aid activities
          have legitimate front-loaded procurement, back-loaded infrastructure works, or seasonal disbursement patterns—so
          deviation from the baseline does not necessarily indicate poor performance.
        </p>
        <p className="italic">
          Baseline reflects activities with reported budgets only. Activities without budget data are excluded.
          Data shown up to the latest reported disbursement date.
        </p>
      </div>
    </div>
  )
}

export default PortfolioSpendTrajectoryChart
