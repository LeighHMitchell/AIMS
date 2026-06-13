"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, Info, CalendarIcon, Download, BarChart3, Table as TableIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect'
import { type Metric } from '@/lib/financial-metrics'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, PLANNED_DISBURSEMENT_COLOR, PERFECT_SPEND_COLOR, getTransactionTypeColor } from '@/lib/chart-colors';
import { formatAxisCurrency, formatCurrencyCompact } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { safeUsd } from '@/lib/safe-usd';

// Series colours resolve through the single source of truth (lib/chart-colors)
// so disbursements / planned / commitments / perfect-spend match every other
// financial chart. Structural greys (grid/axis/bg) stay local.
const COLOURS = {
  primaryScarlet: getTransactionTypeColor('3'), // Cumulative disbursements (= Disbursement scarlet)
  paleSlate: '#cfd0d5',                          // Grid lines
  blueSlate: '#4c5568',                          // Axis text
  coolSteel: PERFECT_SPEND_COLOR,                // Perfect spend trajectory (reference line)
  platinum: '#f1f4f8',                           // Background/tooltips
}

// All toggleable series, in render/legend order. Single source of truth for
// the Metrics dropdown, the legend, the <Line> elements, and the tooltip rows.
// `dashed` mirrors the existing visual treatment (baseline + planned dashed).
type SeriesKey =
  | 'perfectSpend'
  | 'cumulativeDisbursements'
  | 'cumulativeCommitments'
  | 'cumulativePlannedDisbursements'

interface SeriesDef {
  key: SeriesKey
  label: string
  color: string
  dashed?: boolean
  cumulative?: boolean // one of the three comparison series (not the baseline)
}

const SERIES_DEFS: SeriesDef[] = [
  { key: 'perfectSpend', label: 'Even-Spend Budget Baseline', color: PERFECT_SPEND_COLOR, dashed: true },
  { key: 'cumulativeDisbursements', label: 'Cumulative Aggregated Disbursements', color: getTransactionTypeColor('3'), cumulative: true },
  { key: 'cumulativeCommitments', label: 'Cumulative Aggregated Commitments', color: getTransactionTypeColor('2'), cumulative: true },
  { key: 'cumulativePlannedDisbursements', label: 'Cumulative Aggregated Planned Disbursements', color: PLANNED_DISBURSEMENT_COLOR, dashed: true, cumulative: true },
]
const CUMULATIVE_KEYS: SeriesKey[] = SERIES_DEFS.filter(s => s.cumulative).map(s => s.key)

// Map between the shared financial-metric model (used by the Metrics
// dropdown, same as the Financial Totals chart) and this chart's internal
// series keys. The chart only plots four series, so only four metrics are
// offered: Total Budgets → the even-spend baseline (which is derived from
// budgets), Outgoing Commitments → commitments, Disbursements, and Planned
// Disbursements.
const SERIES_TO_METRIC: Record<SeriesKey, Metric> = {
  perfectSpend: 'budgets',
  cumulativeCommitments: 'tx_2',
  cumulativeDisbursements: 'tx_3',
  cumulativePlannedDisbursements: 'planned',
}
const METRIC_TO_SERIES = Object.fromEntries(
  Object.entries(SERIES_TO_METRIC).map(([s, m]) => [m, s as SeriesKey])
) as Partial<Record<Metric, SeriesKey>>
// Offered in METRIC_DEFS order: budgets, planned, then tx codes.
const PORTFOLIO_METRIC_KEYS: Metric[] = ['budgets', 'planned', 'tx_2', 'tx_3']

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
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // Which series are currently visible. Multiple may be on at once — this is
  // the single source of truth driven by both the Metrics dropdown and the
  // (clickable) legend. Default matches the prior behaviour: baseline +
  // actual disbursements.
  const [visibleSeries, setVisibleSeries] = useState<Set<SeriesKey>>(
    new Set<SeriesKey>(['perfectSpend', 'cumulativeDisbursements'])
  )
  const [metricsOpen, setMetricsOpen] = useState(false)

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Bridge between visibleSeries (the render driver) and the shared
  // MetricsMultiSelect, which speaks the financial-metric model.
  const selectedMetrics = useMemo<Metric[]>(
    () => SERIES_DEFS.filter(s => visibleSeries.has(s.key)).map(s => SERIES_TO_METRIC[s.key]),
    [visibleSeries]
  )
  const handleMetricsChange = (next: Metric[]) => {
    const keys = next
      .map(m => METRIC_TO_SERIES[m])
      .filter((k): k is SeriesKey => !!k)
    setVisibleSeries(new Set(keys))
  }

  // The striped gap area + the "Gap to baseline" tooltip row are only
  // meaningful against a single cumulative series. When the baseline and
  // exactly one cumulative series are visible, that series is the comparison;
  // otherwise there is none (gap hidden).
  const visibleCumulative = CUMULATIVE_KEYS.filter(k => visibleSeries.has(k))
  const singleComparison: SeriesKey | null =
    visibleSeries.has('perfectSpend') && visibleCumulative.length === 1
      ? visibleCumulative[0]
      : null

  // Legend click mirrors the Metrics dropdown — plain toggle, no exclusivity.
  const handleLegendClick = (dataKey: string) => {
    if (SERIES_DEFS.some(s => s.key === dataKey)) {
      toggleSeries(dataKey as SeriesKey)
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
              usd_amount: safeUsd({ usd_value: pd.usd_amount, amount: pd.amount, currency: pd.currency })
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
            // Currency-safe: only fall back to raw value when currency === 'USD'.
            // A non-USD commitment without a stored conversion contributes 0
            // rather than being silently treated as USD.
            const processedCommitments = commitmentData.map((c: any) => ({
              ...c,
              value_usd: (c.value_usd != null && Number.isFinite(Number(c.value_usd))) ? Number(c.value_usd)
                : ((c.currency ?? '').toString().toUpperCase() === 'USD' ? Number(c.value) || 0 : 0)
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

  // Compute display data with the gap area only when a single cumulative
  // series is being compared against the baseline; otherwise leave gapArea
  // undefined so the striped <Area> draws nothing.
  const displayData = useMemo(() => {
    return chartData.map(point => {
      if (!singleComparison) {
        return { ...point, gapArea: undefined }
      }
      const comparisonValue = point[singleComparison] || 0
      const minVal = Math.min(point.perfectSpend, comparisonValue)
      const maxVal = Math.max(point.perfectSpend, comparisonValue)
      return {
        ...point,
        gapArea: [minVal, maxVal] as [number, number]
      }
    })
  }, [chartData, singleComparison])

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload
      const date = dataPoint?.date
      // Gregorian month + year, with the selected calendar's year label
      // appended when it differs (e.g. Myanmar FY → "May 2026 · MMFY 2025/26").
      // Under the Gregorian calendar getYearLabel returns the plain year, so
      // no suffix is added. Keeps the tooltip consistent with the X-axis.
      const greg = date ? new Date(date).toLocaleDateString('en-AU', {
        month: 'long',
        year: 'numeric'
      }) : ''
      const calLabel = dataPoint ? getYearLabel(dataPoint.year) : ''
      const title = (calLabel && calLabel !== String(dataPoint?.year)) ? `${greg} · ${calLabel}` : greg

      const perfectSpend = dataPoint?.perfectSpend || 0

      // One row per visible series, in SERIES_DEFS order.
      const rows: Array<{ label: React.ReactNode; value: React.ReactNode; color?: string; bordered?: boolean }> = []
      for (const def of SERIES_DEFS) {
        if (!visibleSeries.has(def.key)) continue
        const value = def.key === 'perfectSpend' ? perfectSpend : (dataPoint?.[def.key] || 0)
        rows.push({ label: def.label, value: formatCurrencyCompact(value), color: def.color })
      }

      // Gap-to-baseline row only when a single cumulative series is compared.
      if (singleComparison) {
        const comparisonValue = dataPoint?.[singleComparison] || 0
        const variance = comparisonValue - perfectSpend
        const varianceColor = variance >= 0 ? '#16a34a' : '#dc2626'
        rows.push({
          label: 'Gap to baseline',
          bordered: true,
          value: (
            <span style={{ color: varianceColor }}>
              {Math.abs(variance) < 1
                ? '—'
                : `${variance >= 0 ? '+' : '-'}${formatCurrencyCompact(Math.abs(variance))}`}
            </span>
          ),
        })
      }

      return <ChartTooltipCard title={title} rows={rows} />
    }
    return null
  }

  // Compact mode check FIRST - before any Card returns
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (error || !data || displayData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">{error || 'No data available'}</p>
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
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
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
              tickFormatter={formatAxisCurrency}
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
        <ChartLoadingPlaceholder />
      </div>
    )
  }

  // Non-compact mode: error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">No activities with budget data found.</p>
          <p className="text-body mt-2 text-muted-foreground">
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
      {/* Calendar + year selector — moved below the chart */}
      <div className="flex items-start gap-2 mb-4">
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

              {/* Year Range Selector */}
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
                                  ? 'bg-primary text-primary-foreground'
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
      <div className="flex items-center justify-between gap-4 overflow-visible">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Metrics multi-select — the shared component used by the
              Financial Totals & External Development Partners charts. Scoped
              via availableKeys to the four series this chart plots. Only
              relevant in chart view. */}
          {viewMode === 'chart' && (
            <MetricsMultiSelect
              selected={selectedMetrics}
              onChange={handleMetricsChange}
              availableKeys={PORTFOLIO_METRIC_KEYS}
              open={metricsOpen}
              onOpenChange={setMetricsOpen}
              triggerClassName="h-9 min-w-[200px] justify-between"
            />
          )}
        </div>
        {/* Button groups + CSV, right-aligned. */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('chart')}
              className={cn("h-8 w-8", viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Chart View"
              aria-label="Chart View"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('table')}
              className={cn("h-8 w-8", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
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

      <div>
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
              stroke={CHART_STRUCTURE_COLORS.grid}
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
              tickFormatter={formatAxisCurrency}
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
                    const isHidden = !visibleSeries.has(dataKey as SeriesKey)
                    const isDashed = dataKey === 'perfectSpend' || dataKey === 'cumulativePlannedDisbursements'

                    return (
                      <button
                        key={index}
                        onClick={() => handleLegendClick(dataKey)}
                        className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                          isHidden ? 'opacity-40' : 'opacity-100'
                        } hover:bg-muted`}
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
                        <span className={`text-xs ${isHidden ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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
              name="Even-Spend Budget Baseline"
              hide={!visibleSeries.has('perfectSpend')}
              stroke={COLOURS.coolSteel}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Cumulative Planned Disbursements */}
            <Line
              type="stepAfter"
              dataKey="cumulativePlannedDisbursements"
              name="Cumulative Aggregated Planned Disbursements"
              hide={!visibleSeries.has('cumulativePlannedDisbursements')}
              stroke={PLANNED_DISBURSEMENT_COLOR}
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Cumulative Commitments */}
            <Line
              type="stepAfter"
              dataKey="cumulativeCommitments"
              name="Cumulative Aggregated Commitments"
              hide={!visibleSeries.has('cumulativeCommitments')}
              stroke={getTransactionTypeColor('2')}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Cumulative Disbursements - stepped solid line */}
            <Line
              type="stepAfter"
              dataKey="cumulativeDisbursements"
              name="Cumulative Aggregated Disbursements"
              hide={!visibleSeries.has('cumulativeDisbursements')}
              stroke={COLOURS.primaryScarlet}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: COLOURS.primaryScarlet }}
              connectNulls
              isAnimationActive={false}
            />

            {/* Latest Data Markers - show for each visible cumulative series */}
            {visibleSeries.has('cumulativeDisbursements') && latestDisbursementTimestamp && (
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
            {visibleSeries.has('cumulativeCommitments') && latestCommitmentTimestamp && (
              <ReferenceLine
                x={latestCommitmentTimestamp}
                stroke={getTransactionTypeColor('2')}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: 'Latest commitment',
                  position: 'insideTopRight',
                  fill: getTransactionTypeColor('2'),
                  fontSize: 10,
                }}
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
        ) : (
          /* Table View — shared ChartDataTable (sticky header, sortable
             columns, color squares, footer totals, h+v scroll). Money columns
             use full-precision currency; the Month column reuses the existing
             "MMMM yyyy" formatting of each row's timestamp. */
          <ChartDataTable
            rows={displayData}
            columns={[
              {
                key: 'timestamp',
                label: 'Month',
                numeric: false,
                format: (v) => format(new Date(Number(v)), 'MMMM yyyy'),
              },
              { key: 'perfectSpend', label: 'Even-Spend Budget Baseline', numeric: true, currency: 'USD', color: PERFECT_SPEND_COLOR },
              { key: 'cumulativePlannedDisbursements', label: 'Planned Disbursements', numeric: true, currency: 'USD', color: PLANNED_DISBURSEMENT_COLOR },
              { key: 'cumulativeCommitments', label: 'Commitments', numeric: true, currency: 'USD', color: getTransactionTypeColor('2') },
              { key: 'cumulativeDisbursements', label: 'Disbursements', numeric: true, currency: 'USD', color: COLOURS.primaryScarlet },
            ]}
            currency="USD"
            maxHeight={500}
          />
        )}
      </div>


      {/* Explanatory Text */}
      <div className="text-helper text-muted-foreground mt-4 space-y-2">
        <p>
          This chart compares the portfolio's <strong>actual cumulative disbursements</strong> (red stepped line) against an
          <strong> even-spend budget baseline</strong> (grey dashed line) that models uniform spending across each activity's
          budget period. The <strong>cumulative planned disbursements</strong> (blue line) and <strong>cumulative commitments</strong> (purple line)
          provide additional context on planned versus actual financial flows.
        </p>
        <p>
          The striped area highlights the gap between the baseline and selected comparison series. When the selected line is
          above the baseline, execution is ahead of the even-spend model; when below, it is behind. Note that many aid activities
          have legitimate front-loaded procurement, back-loaded infrastructure works, or seasonal disbursement patterns, so
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
