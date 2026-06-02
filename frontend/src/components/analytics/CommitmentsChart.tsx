"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { getYear, getQuarter } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { TrendingUp, BarChart3 as BarChartIcon, Table as TableIcon, Download } from 'lucide-react'
import { CHART_STRUCTURE_COLORS, getTransactionTypeColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { useChartCardToolbar } from '@/components/ui/compact-chart-card'
import { InlineViewToggle, InlineCsvButton } from '@/components/ui/inline-toolbar-buttons'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { ChartUpdating, ChartCrossfade } from '@/components/ui/chart-motion'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-fetch'
import { CustomYear, getCustomYearLabel, pickDefaultCalendarYearId } from '@/types/custom-years'
import { getFiscalYearForDate } from '@/utils/year-allocation'
import { MetricMultiSelect } from './shared/MetricMultiSelect'
import { type Metric } from './shared/metric-options'
import { txUsd, getReportableActivityIds, getPooledFundIds, excludeInternalTransfers } from '@/lib/analytics-transaction-filters'

// This chart only ever surfaces the two IATI transaction types it compares:
// Outgoing Commitments (tx_2) and Disbursements (tx_3). The shared metric
// dropdown is restricted to these via its `allowedMetrics` prop.
const COMMITMENT_METRICS: Metric[] = ['tx_2', 'tx_3']

interface CommitmentsChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ChartData[]) => void
}

interface ChartData {
  period: string
  commitments: number
  disbursements: number
}

interface RawTransaction {
  value: string | number | null
  value_usd: string | number | null
  currency: string | null
  transaction_type: string
  transaction_date: string
}

type PeriodMode = 'year' | 'quarter'
type ChartType = 'line' | 'bar'

export function CommitmentsChart({ dateRange, refreshKey, onDataChange }: CommitmentsChartProps) {
  const [transactions, setTransactions] = useState<RawTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_2', 'tx_3'])
  const isExpanded = useChartExpansion()
  const toolbar = useChartCardToolbar()

  const showCommitments = selectedMetrics.includes('tx_2')
  const showDisbursements = selectedMetrics.includes('tx_3')

  // Custom-year (Calendar Type) state — drives both the X-axis buckets and the
  // YearRangeChip's calendar selector.
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')
  const [actualDataRange, setActualDataRange] = useState<{ minYear: number; maxYear: number } | null>(null)

  const commitmentColor = getTransactionTypeColor('2')
  const disbursementColor = getTransactionTypeColor('3')

  // Fetch custom years on mount and pick the system default calendar.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await apiFetch('/api/custom-years')
        if (!res.ok) return
        const result = await res.json()
        const years = (result.data || []) as CustomYear[]
        if (cancelled) return
        setCustomYears(years)
        // Default to the Gregorian Calendar Year regardless of the DB default.
        const defaultId = pickDefaultCalendarYearId(years, result.defaultId)
        if (defaultId) setCalendarType(defaultId)
      } catch {
        /* swallow — chart falls back to Gregorian calendar years */
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // Default the selected year range to the full span of years that have data
  // (set once the data range is known; later user selections stick).
  useEffect(() => {
    if (selectedYears.length === 0 && actualDataRange) {
      setSelectedYears([actualDataRange.minYear, actualDataRange.maxYear])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualDataRange?.minYear, actualDataRange?.maxYear])

  // Fetch ALL commitment/disbursement transactions once over a wide range, then
  // bucket/filter client-side — so expanding the year picker (incl. post-2026)
  // surfaces data without a refetch.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Canonical scoping: published & non-deleted activities only, and
        // exclude internal pooled-fund transfers — mirrors FinancialTotalsBarChart.
        const reportableIds = await getReportableActivityIds(supabase)
        const pooledFundIds = await getPooledFundIds(supabase)
        let query = supabase
          .from('transactions')
          .select('value, value_usd, currency, transaction_type, transaction_date')
          .in('transaction_type', ['2', '3']) // Commitments and Disbursements
          .eq('status', 'actual')
          .is('deleted_at', null)
          .in('activity_id', reportableIds)
          .gte('transaction_date', '2000-01-01T00:00:00.000Z')
          .lte('transaction_date', '2050-12-31T23:59:59.999Z')
        query = excludeInternalTransfers(query, pooledFundIds, ['2', '3'])
        const { data, error } = await query

        if (error) {
          console.error('[CommitmentsChart] Error fetching transactions:', error)
          return
        }

        const rows = (data || []) as RawTransaction[]
        setTransactions(rows)

        // Derive the actual data range (Gregorian years present) for the chip's
        // "Data" quick-select.
        let minYear = Infinity
        let maxYear = -Infinity
        rows.forEach(t => {
          const y = getYear(new Date(t.transaction_date))
          if (y < minYear) minYear = y
          if (y > maxYear) maxYear = y
        })
        if (minYear !== Infinity && maxYear !== -Infinity) {
          setActualDataRange({ minYear, maxYear })
        }
      } catch (err) {
        console.error('[CommitmentsChart] Error fetching commitments data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshKey])

  // Aggregate transactions into chart points. Both year and quarter modes honor
  // the selected custom year (CY/FY): year mode buckets by fiscal year, quarter
  // mode by fiscal quarters anchored to its start month. Both are filtered to
  // the selected year range.
  const chartData = useMemo<ChartData[]>(() => {
    if (transactions.length === 0) return []

    const customYear = customYears.find(cy => cy.id === calendarType)

    // Resolve the [minYear, maxYear] window from the selection, falling back to
    // the actual data range, then to all transaction years.
    let minYear: number
    let maxYear: number
    if (selectedYears.length >= 2) {
      minYear = Math.min(...selectedYears)
      maxYear = Math.max(...selectedYears)
    } else if (selectedYears.length === 1) {
      minYear = maxYear = selectedYears[0]
    } else if (actualDataRange) {
      minYear = actualDataRange.minYear
      maxYear = actualDataRange.maxYear
    } else {
      minYear = Infinity
      maxYear = -Infinity
      transactions.forEach(t => {
        const y = getYear(new Date(t.transaction_date))
        if (y < minYear) minYear = y
        if (y > maxYear) maxYear = y
      })
      if (minYear === Infinity) return []
    }

    if (periodMode === 'year') {
      const byYear = new Map<number, { commitments: number; disbursements: number }>()
      transactions.forEach(t => {
        const date = new Date(t.transaction_date)
        const fy = customYear ? getFiscalYearForDate(date, customYear) : getYear(date)
        if (fy < minYear || fy > maxYear) return
        if (!byYear.has(fy)) byYear.set(fy, { commitments: 0, disbursements: 0 })
        const bucket = byYear.get(fy)!
        const value = txUsd(t)
        if (t.transaction_type === '2') bucket.commitments += value
        else if (t.transaction_type === '3') bucket.disbursements += value
      })

      // Fill sequential year buckets so the axis is continuous.
      const out: ChartData[] = []
      for (let y = minYear; y <= maxYear; y++) {
        const bucket = byYear.get(y) || { commitments: 0, disbursements: 0 }
        out.push({
          period: customYear ? getCustomYearLabel(customYear, y) : String(y),
          commitments: bucket.commitments,
          disbursements: bucket.disbursements,
        })
      }
      return out
    }

    // Quarter mode — follows the selected calendar. For a fiscal/custom year the
    // quarters are anchored to its start month (e.g. AUFY Q1 = Jul–Sep) and the
    // year shown is the fiscal year; for Gregorian (no custom year) these reduce
    // to calendar quarters and calendar years. Filtered to the selected window
    // on the same (fiscal or calendar) year basis as the label.
    const byQuarter = new Map<string, { year: number; quarter: number; commitments: number; disbursements: number }>()
    transactions.forEach(t => {
      const date = new Date(t.transaction_date)
      let year: number
      let quarter: number
      if (customYear) {
        year = getFiscalYearForDate(date, customYear)
        // Months elapsed since the fiscal year's start month → quarter 1–4.
        const monthsSinceStart = (date.getMonth() + 1 - customYear.startMonth + 12) % 12
        quarter = Math.floor(monthsSinceStart / 3) + 1
      } else {
        year = getYear(date)
        quarter = getQuarter(date)
      }
      if (year < minYear || year > maxYear) return
      const key = `${year}-Q${quarter}`
      if (!byQuarter.has(key)) byQuarter.set(key, { year, quarter, commitments: 0, disbursements: 0 })
      const bucket = byQuarter.get(key)!
      const value = txUsd(t)
      if (t.transaction_type === '2') bucket.commitments += value
      else if (t.transaction_type === '3') bucket.disbursements += value
    })

    return Array.from(byQuarter.values())
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.quarter - b.quarter))
      .map(b => ({
        period: customYear
          ? `Q${b.quarter} ${getCustomYearLabel(customYear, b.year)}`
          : `Q${b.quarter} ${b.year}`,
        commitments: b.commitments,
        disbursements: b.disbursements,
      }))
  }, [transactions, customYears, calendarType, selectedYears, periodMode, actualDataRange])

  useEffect(() => {
    onDataChange?.(chartData)
  }, [chartData, onDataChange])

  const periodTypeLabel = useMemo(() => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (periodMode === 'quarter') {
      return customYear ? `${customYear.name} Quarter` : 'Calendar Quarter'
    }
    return customYear ? customYear.name : 'Gregorian Calendar Year'
  }, [periodMode, customYears, calendarType])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(Number(entry.value) || 0, isExpanded),
        color: entry.color || entry.fill || entry.stroke,
      }))
      return <ChartTooltipCard title={label} subtitle={periodTypeLabel} rows={rows} />
    }
    return null
  }

  if (loading && transactions.length === 0) {
    return <ChartLoadingPlaceholder />
  }

  // With many periods (quarter mode spans 8+ buckets) recharts' default tick
  // thinning hides labels like "Q3 2022". Force every tick and angle them so
  // they fit without overlapping; year mode (few ticks) stays horizontal.
  const manyXTicks = chartData.length > 8
  const chartMargin = { top: 5, right: 30, left: 20, bottom: 5 }
  const xAxis = (
    <XAxis
      dataKey="period"
      tick={{ fill: '#64748b', fontSize: 12 }}
      axisLine={{ stroke: '#cbd5e1' }}
      interval={0}
      {...(manyXTicks ? { angle: -45, textAnchor: 'end' as const, height: 64 } : {})}
    />
  )

  return (
    <div className="space-y-4">
      {/* Calendar + year selector on its own row at the top (expanded only). */}
      {isExpanded && (
        <YearRangeChip
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          actualDataRange={actualDataRange}
          customYears={customYears}
          calendarType={calendarType}
          onCalendarTypeChange={setCalendarType}
        />
      )}

      {/* Controls row — filters + toggles left, CSV right (expanded only). */}
      {isExpanded && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
          {/* Metric selector — restricted to Commitments + Disbursements */}
          <MetricMultiSelect
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            allowedMetrics={COMMITMENT_METRICS}
            align="start"
            triggerClassName="min-w-[220px] h-9 justify-between"
          />
          {/* Period grouping toggle */}
          <ChartViewToggle
            ariaLabel="Period grouping"
            variant="text"
            value={periodMode}
            onValueChange={setPeriodMode}
            options={[
              { value: 'year', label: 'Year' },
              { value: 'quarter', label: 'Quarter' },
            ]}
          />
          </div>
          {/* View toggle + CSV, right-aligned. */}
          <div className="flex items-center gap-2">
          {/* Unified line / bar / table view toggle — line & bar pick the chart
              style (and switch back to chart view); table switches to table view. */}
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", toolbar?.viewMode !== 'table' && chartType === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => { setChartType('line'); toolbar?.setViewMode('chart') }}
              title="Line"
              aria-label="Line"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", toolbar?.viewMode !== 'table' && chartType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => { setChartType('bar'); toolbar?.setViewMode('chart') }}
              title="Bar"
              aria-label="Bar"
            >
              <BarChartIcon className="h-4 w-4" />
            </Button>
            {toolbar?.hasTableView && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", toolbar?.viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => toolbar?.setViewMode('table')}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <InlineCsvButton />
          </div>
        </div>
      )}

      {/* Chart — hidden when the inline toolbar switches to table view. In the
          collapsed card the height is trimmed so the X-axis + legend fit inside
          compactHeight (otherwise the fixed 400px clips at the bottom). */}
      {toolbar?.viewMode !== 'table' && (
      <ChartUpdating loading={loading}>
      <ChartCrossfade transitionKey={`${chartType}-${periodMode}`}>
      <ResponsiveContainer width="100%" height={isExpanded ? 400 : 260}>
        {chartType === 'line' ? (
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
            {xAxis}
            <YAxis tickFormatter={(value) => formatAxisCurrency(value)} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
            {showCommitments && (
              <Line
                type="monotone"
                dataKey="commitments"
                stroke={commitmentColor}
                strokeWidth={2}
                dot={{ fill: commitmentColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="Outgoing Commitments"
              />
            )}
            {showDisbursements && (
              <Line
                type="monotone"
                dataKey="disbursements"
                stroke={disbursementColor}
                strokeWidth={2}
                dot={{ fill: disbursementColor, r: 4 }}
                activeDot={{ r: 6 }}
                name="Disbursements"
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} vertical={false} />
            {xAxis}
            <YAxis tickFormatter={(value) => formatAxisCurrency(value)} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
            {showCommitments && (
              <Bar dataKey="commitments" fill={commitmentColor} name="Outgoing Commitments" radius={[2, 2, 0, 0]} />
            )}
            {showDisbursements && (
              <Bar dataKey="disbursements" fill={disbursementColor} name="Disbursements" radius={[2, 2, 0, 0]} />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
      </ChartCrossfade>
      </ChartUpdating>
      )}

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart plots commitments (IATI transaction type 2) and disbursements (type 3) over time, making it easy to compare funding promises against actual spending. Use the calendar selector to switch the year basis (e.g. CY2024 vs FY2024-25), the period toggle to group by year or quarter, and the chart-type toggle to switch between line and grouped-bar views. A growing gap between the two series may indicate delivery bottlenecks or pipeline delays worth investigating.
        </p>
      )}
    </div>
  )
}
