"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, BarChart3, Download, Maximize2, Table as TableIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { useChartExpansion, ChartExpansionProvider } from '@/lib/chart-expansion-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { ChartUpdating } from '@/components/ui/chart-motion'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-fetch'
import { CustomYear, getCustomYearLabel, pickDefaultCalendarYearId } from '@/types/custom-years'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'
import { getFiscalYearForDate } from '@/utils/year-allocation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { MetricsMultiSelect } from '@/components/analytics/MetricsMultiSelect'
import { type Metric, metricColor } from '@/lib/financial-metrics'
import { getReportableActivityIds, getPooledFundIds, excludeInternalTransfers } from '@/lib/analytics-transaction-filters'

// Series this chart can render as separate cumulative lines. Order = display
// order. `key` is the data key on each point, `code` the IATI tx code,
// `planning` marks Budgets/Planned Disbursements (period-based, bucketed at
// their period_start; transactions bucket at transaction_date).
interface SeriesDef { metric: Metric; key: string; code?: string; planning?: boolean }
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
const gradId = (key: string) => `cspend-grad-${key.replace(/[^a-zA-Z0-9]/g, '-')}`
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

interface CumulativeSpendingOverTimeProps {
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
  onDataChange?: (data: Array<Record<string, string | number>>) => void
}

function CumulativeSpendingOverTimeInner({
  dateRange,
  filters,
  refreshKey,
  onDataChange,
  onExpand,
}: CumulativeSpendingOverTimeProps & { onExpand?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeData, setCumulativeData] = useState<any[]>([])
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  // Period granularity for the cumulative series — Year (default) or Quarter,
  // bucketed by the selected calendar-year type rather than plotting per day.
  const [granularity, setGranularity] = useState<'year' | 'quarter'>('year')
  // Calendar selection (owned here so the X-axis + tooltip reflect the chosen
  // CY/FY); YearRangeChip is driven as a controlled component below.
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [calendarType, setCalendarType] = useState<string>('')
  // Metrics multiselect — each selected metric renders as its own cumulative
  // line. Default = Disbursements + Expenditures (the chart's original "spend").
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['tx_3', 'tx_4'])
  const isExpanded = useChartExpansion()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // USD-normalised value: prefer converted value, fall back to raw only
        // when already USD. Non-USD rows without a converted value contribute 0
        // so we never sum mixed currencies.
        const usdValue = (usd: any, raw: any, currency: any) =>
          parseFloat(String(usd)) ||
          (currency === 'USD' ? parseFloat(String(raw)) || 0 : 0)

        // Canonical scoping: published & non-deleted activities only, and
        // exclude internal pooled-fund transfers — mirrors FinancialTotalsBarChart.
        const reportableIds = await getReportableActivityIds(supabase)
        const pooledFundIds = await getPooledFundIds(supabase)

        // Fetch all actual transactions (every IATI type), plus budgets and
        // planned disbursements, so any selected metric can be charted.
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, value_usd, currency, activity_id, provider_org_id')
          .eq('status', 'actual')
          .is('deleted_at', null)
          .in('activity_id', reportableIds)
          .order('transaction_date', { ascending: true })

        let budgetsQuery = supabase
          .from('activity_budgets')
          .select('period_start, value, usd_value, currency, activity_id')
          .not('period_start', 'is', null)
          .in('activity_id', reportableIds)

        let plannedQuery = supabase
          .from('planned_disbursements')
          .select('period_start, amount, usd_amount, currency, activity_id')
          .not('period_start', 'is', null)
          .in('activity_id', reportableIds)

        // Apply date range filter
        if (dateRange) {
          transactionsQuery = transactionsQuery
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
          budgetsQuery = budgetsQuery
            .gte('period_start', dateRange.from.toISOString())
            .lte('period_start', dateRange.to.toISOString())
          plannedQuery = plannedQuery
            .gte('period_start', dateRange.from.toISOString())
            .lte('period_start', dateRange.to.toISOString())
        }

        // Apply donor filter (transactions only — budgets/PD have no provider)
        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
        }

        // Exclude internal pooled-fund transfers (mixed tx types → both directions).
        transactionsQuery = excludeInternalTransfers(transactionsQuery, pooledFundIds)

        const [{ data: transactions, error: transactionsError }, { data: budgets }, { data: planned }] =
          await Promise.all([transactionsQuery, budgetsQuery, plannedQuery])

        if (transactionsError) {
          console.error('[CumulativeSpendingOverTime] Error fetching transactions:', transactionsError)
          setError('Failed to fetch transaction data')
          return
        }

        // Bucket each series' increment by day.
        const dateMap = new Map<string, { date: Date; timestamp: number; inc: Record<string, number> }>()
        const ensure = (date: Date) => {
          const dateKey = date.toISOString().split('T')[0]
          let entry = dateMap.get(dateKey)
          if (!entry) {
            const inc: Record<string, number> = {}
            SERIES_KEYS.forEach(k => { inc[k] = 0 })
            entry = { date, timestamp: date.getTime(), inc }
            dateMap.set(dateKey, entry)
          }
          return entry
        }

        transactions?.forEach((t: any) => {
          if (!t.transaction_date) return
          const date = new Date(t.transaction_date)
          if (isNaN(date.getTime())) return
          const key = CODE_TO_KEY[t.transaction_type]
          if (!key) return
          const value = usdValue(t.value_usd, t.value, t.currency)
          if (value <= 0) return
          ensure(date).inc[key] += value
        })

        budgets?.forEach((b: any) => {
          const date = new Date(b.period_start)
          if (isNaN(date.getTime())) return
          const value = usdValue(b.usd_value, b.value, b.currency)
          if (value <= 0) return
          ensure(date).inc['Budgets'] += value
        })

        planned?.forEach((p: any) => {
          const date = new Date(p.period_start)
          if (isNaN(date.getTime())) return
          const value = usdValue(p.usd_amount, p.amount, p.currency)
          if (value <= 0) return
          ensure(date).inc['Planned Disbursements'] += value
        })

        // Sort by date and build a running cumulative total per series.
        const sortedPoints = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)
        const cumulative: Record<string, number> = {}
        SERIES_KEYS.forEach(k => { cumulative[k] = 0 })

        const cumulativeArray = sortedPoints.map(point => {
          const row: Record<string, any> = {
            date: point.date.toISOString(),
            timestamp: point.timestamp,
            displayDate: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          }
          SERIES_KEYS.forEach(k => {
            cumulative[k] += point.inc[k] || 0
            row[k] = cumulative[k]
          })
          return row
        })

        setCumulativeData(cumulativeArray)
      } catch (err) {
        console.error('[CumulativeSpendingOverTime] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, filters, refreshKey])

  // Fetch custom-year calendars once and pick the system default.
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
        /* swallow */
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const activeCustomYear = useMemo(
    () => customYears.find(cy => cy.id === calendarType),
    [customYears, calendarType],
  )
  // Label for the selected calendar, used in the tooltip subtitle.
  const calendarLabel = activeCustomYear?.name || 'Gregorian Calendar Year'

  // Default the year picker to the full span of years that have data.
  const dataYears = useMemo(
    () => cumulativeData.map(item => new Date(item.date).getFullYear()),
    [cumulativeData],
  )
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Filter the displayed window to the selected year range, using the chosen
  // calendar's fiscal year (so e.g. US-FY2023-24 includes Jul 2023 – Jun 2024).
  // The running cumulative total is computed over all history in the fetch, so
  // the line correctly starts at the accumulated value as of the window start.
  const filteredData = useMemo(() => {
    if (selectedYears.length === 0) return cumulativeData
    const minY = Math.min(...selectedYears)
    const maxY = Math.max(...selectedYears)
    return cumulativeData.filter(item => {
      const d = new Date(item.date)
      if (isNaN(d.getTime())) return false
      const y = activeCustomYear ? getFiscalYearForDate(d, activeCustomYear) : d.getFullYear()
      return y >= minY && y <= maxY
    })
  }, [cumulativeData, selectedYears, activeCustomYear])

  // Label the X-axis by the selected calendar's year (e.g. "CY2024", "FY24-25").
  // Each point is a day, so we tick only at the FIRST point of each fiscal year
  // and format that tick to the calendar-year label.
  const { xAxisTicks, xAxisLabelByDate } = useMemo(() => {
    const labelByDate: Record<string, string> = {}
    const ticks: string[] = []
    const seen = new Set<string>()
    for (const item of filteredData as any[]) {
      const date = new Date(item.date)
      if (isNaN(date.getTime())) continue
      const fy = activeCustomYear ? getFiscalYearForDate(date, activeCustomYear) : date.getFullYear()
      const label = activeCustomYear ? getCustomYearLabel(activeCustomYear, fy) : String(fy)
      labelByDate[item.displayDate] = label
      if (!seen.has(label)) {
        seen.add(label)
        ticks.push(item.displayDate)
      }
    }
    return { xAxisTicks: ticks, xAxisLabelByDate: labelByDate }
  }, [filteredData, activeCustomYear])

  // Series to render: selected in the dropdown AND with non-zero cumulative
  // data in the current window, in display order.
  const visibleSeries = useMemo(() => {
    const selected = new Set(selectedMetrics)
    return SERIES.filter(s =>
      selected.has(s.metric) &&
      filteredData.some((d: any) => d[s.key] && d[s.key] !== 0)
    )
  }, [filteredData, selectedMetrics])

  // Bucket the daily cumulative series into Year or Quarter periods (taking the
  // cumulative value as of each bucket's END), labelled by the selected
  // calendar-year type — e.g. "CY2024" / "FY24-25", or "Q1 CY2024".
  const bucketedData = useMemo(() => {
    if (filteredData.length === 0) return [] as any[]
    const buckets = new Map<string, any>()
    const order: string[] = []
    filteredData.forEach((item: any) => {
      const date = new Date(item.date)
      if (isNaN(date.getTime())) return
      const fy = activeCustomYear ? getFiscalYearForDate(date, activeCustomYear) : date.getFullYear()
      const yearLabel = activeCustomYear ? getCustomYearLabel(activeCustomYear, fy) : String(fy)
      let label = yearLabel
      if (granularity === 'quarter') {
        const startMonth = activeCustomYear?.startMonth ?? 1
        const m = date.getMonth() + 1
        const q = Math.floor((((m - startMonth) + 12) % 12) / 3) + 1
        label = `Q${q} ${yearLabel}`
      }
      if (!buckets.has(label)) order.push(label)
      // filteredData is date-ascending, so the last write per label is the
      // bucket-end cumulative total.
      buckets.set(label, { ...item, period: label })
    })
    return order.map(l => buckets.get(l))
  }, [filteredData, granularity, activeCustomYear])

  // Emit a clean tabular representation of what the user currently sees —
  // Period plus one column per visible series.
  useEffect(() => {
    onDataChange?.(
      bucketedData.map((item: any) => {
        const row: Record<string, string | number> = { Period: item.period }
        visibleSeries.forEach(s => { row[s.key] = Math.round(item[s.key] || 0) })
        return row
      })
    )
  }, [bucketedData, onDataChange])

  // CSV export — same Date + per-series columns as the table view.
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data available to export')
      return
    }
    const rows = bucketedData.map((item: any) => {
      const row: Record<string, string | number> = { Period: item.period }
      visibleSeries.forEach(s => { row[s.key] = Math.round(item[s.key] || 0) })
      return row
    })
    exportChartToCSV(rows, 'Cumulative Spending Over Time')
    toast.success('Chart data exported successfully')
  }

  // Use the module-level currency formatter for tooltips
  const formatTooltipValue = (value: number) => formatTooltipCurrency(value, isExpanded)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipValue(entry.value),
        color: entry.color || entry.stroke || entry.fill,
      }))
      return <ChartTooltipCard title={label} subtitle={calendarLabel} rows={rows} />
    }
    return null
  }

  // Only show the full placeholder on the very first load (no data yet). On
  // later refetches we keep the existing chart mounted and dim it (below) so it
  // animates to the new data instead of flashing out and back.
  if (loading && cumulativeData.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Cumulative Spending Over Time
          </CardTitle>
          <CardDescription className="text-body text-muted-foreground mt-0.5">
            Track accumulated spending progression across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartLoadingPlaceholder />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Cumulative Spending Over Time
          </CardTitle>
          <CardDescription className="text-body text-muted-foreground mt-0.5">
            Track accumulated spending progression across all activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
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
    <div className="h-full flex flex-col">
        {/* Calendar + year selector on its own row at the top (expanded only). */}
        {isExpanded && (
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            actualDataRange={actualDataRange}
            customYears={customYears}
            calendarType={calendarType}
            onCalendarTypeChange={setCalendarType}
            className="mb-4"
          />
        )}
        {isExpanded && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <MetricsMultiSelect
                selected={selectedMetrics}
                onChange={setSelectedMetrics}
                triggerClassName="h-8 justify-between min-w-[200px]"
              />
              <ChartViewToggle
                ariaLabel="Period granularity"
                variant="text"
                value={granularity}
                onValueChange={(v) => setGranularity(v as 'year' | 'quarter')}
                options={[
                  { value: 'year', label: 'Year' },
                  { value: 'quarter', label: 'Quarter' },
                ]}
              />
            </div>
            {/* Button groups + CSV, right-aligned. */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  viewMode === 'chart' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('chart')}
                title="Chart View"
                aria-label="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('table')}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportCSV}
              className="h-8 w-8"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
            </div>
          </div>
        )}
        {filteredData.length > 0 ? (
          viewMode === 'table' ? (
            <ChartDataTable
              rows={bucketedData}
              columns={[
                { key: 'period', label: granularity === 'quarter' ? 'Quarter' : 'Year', numeric: false },
                ...visibleSeries.map(s => ({
                  key: s.key,
                  label: s.key,
                  numeric: true,
                  currency: 'USD',
                  color: SERIES_COLOR[s.key],
                })),
              ]}
              currency="USD"
              totalsRow={false}
              maxHeight={600}
            />
          ) : (
          <ChartUpdating loading={loading}>
          <ResponsiveContainer width="100%" height={isExpanded ? 400 : 260}>
            <AreaChart data={bucketedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                dataKey="period"
                stroke="#64748B"
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatAxisCurrency} stroke="#64748B" fontSize={12} />
              <RechartsTooltip content={<CustomTooltip />} />
              {visibleSeries.map(s => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.key}
                  stroke={SERIES_COLOR[s.key]}
                  strokeWidth={s.planning ? 2 : 2.5}
                  strokeDasharray={s.planning ? '5 5' : undefined}
                  fillOpacity={1}
                  fill={`url(#${gradId(s.key)})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          </ChartUpdating>
          )
        ) : (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No cumulative data available</p>
              <p className="text-helper mt-2">Add transactions, budgets, or planned disbursements to see this chart</p>
            </div>
          </div>
        )}

        {/* Explanatory text — only in expanded view */}
        {isExpanded && (
          <p className="text-body text-muted-foreground leading-relaxed mt-4">
            This chart tracks running totals over time, with a separate line per selected metric. Use the Metrics dropdown to choose any combination of Budgets, Planned Disbursements, and the 13 IATI transaction types (default: Disbursements + Expenditures). All amounts are USD-normalised — transactions are added on their transaction date, while budgets and planned disbursements are added on their period start date. A steeper slope indicates a higher rate over that period.
          </p>
        )}
    </div>
  )
}

export function CumulativeSpendingOverTime(props: CumulativeSpendingOverTimeProps) {
  return <CumulativeSpendingOverTimeInner {...props} />
}
