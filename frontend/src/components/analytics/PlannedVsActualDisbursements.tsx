"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, BarChart3, Download, Maximize2, TrendingUpIcon, Table as TableIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CHART_STRUCTURE_COLORS, PLANNED_DISBURSEMENT_COLOR, getTransactionTypeColor } from '@/lib/chart-colors'
import { Button } from '@/components/ui/button'
import { ChartViewToggle } from '@/components/ui/chart-view-toggle'
import { useChartExpansion, ChartExpansionProvider } from '@/lib/chart-expansion-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { exportChartToCSV } from '@/lib/chart-export'
import { toast } from 'sonner'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { useYearRangeDefault } from '@/hooks/useYearRangeDefault'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartDataTable } from '@/components/ui/chart-data-table'
import { txUsd, getReportableActivityIds, getPooledFundIds, excludeInternalTransfers } from '@/lib/analytics-transaction-filters'
import { safeUsd } from '@/lib/safe-usd'

type TimePeriod = '1m' | '3m' | '6m' | '1y' | '5y' | 'all'
type GroupBy = 'year' | 'month'

interface PlannedVsActualDisbursementsProps {
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
  onDataChange?: (data: Array<{ Period: string; "Planned (USD)": number; "Actual (USD)": number }>) => void
}

function PlannedVsActualDisbursementsInner({
  dateRange,
  filters,
  refreshKey,
  onDataChange,
  onExpand,
}: PlannedVsActualDisbursementsProps & { onExpand?: () => void }) {
  const isExpanded = useChartExpansion()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Canonical scoping: published & non-deleted activities only, and
        // exclude internal pooled-fund transfers — mirrors FinancialTotalsBarChart.
        const reportableIds = await getReportableActivityIds(supabase)
        const pooledFundIds = await getPooledFundIds(supabase)

        // Fetch actual disbursements (transaction type 3)
        let disbursementsQuery = supabase
          .from('transactions')
          .select('transaction_date, value, value_usd, currency, activity_id, provider_org_id')
          .eq('transaction_type', '3')
          .eq('status', 'actual')
          .is('deleted_at', null)
          .in('activity_id', reportableIds)
          .order('transaction_date', { ascending: true })

        // Fetch the full available span so the year picker reflects all years that have data.
        disbursementsQuery = disbursementsQuery
          .gte('transaction_date', new Date(2010, 0, 1).toISOString())
          .lte('transaction_date', new Date(new Date().getFullYear() + 10, 11, 31).toISOString())

        // Apply donor filter
        if (filters?.donor) {
          disbursementsQuery = disbursementsQuery.eq('provider_org_id', filters.donor)
        }

        // Exclude internal pooled-fund transfers (disbursements are outgoing).
        disbursementsQuery = excludeInternalTransfers(disbursementsQuery, pooledFundIds, ['3'])

        const { data: disbursements, error: disbursementsError } = await disbursementsQuery

        if (disbursementsError) {
          console.error('[PlannedVsActualDisbursements] Error fetching disbursements:', disbursementsError)
          setError('Failed to fetch disbursement data')
          return
        }

        // Fetch planned disbursements
        let plannedQuery = supabase
          .from('planned_disbursements')
          .select('period_start, amount, usd_amount, currency, activity_id')
          .in('activity_id', reportableIds)
          .order('period_start', { ascending: true })

        // Fetch the full available span so the year picker reflects all years that have data.
        plannedQuery = plannedQuery
          .gte('period_start', new Date(2010, 0, 1).toISOString())
          .lte('period_start', new Date(new Date().getFullYear() + 10, 11, 31).toISOString())

        const { data: plannedDisbursements, error: plannedError } = await plannedQuery

        if (plannedError) {
          console.error('[PlannedVsActualDisbursements] Error fetching planned disbursements:', plannedError)
        }

        // Process data by date
        const dateMap = new Map<string, any>()

        // Process actual disbursements
        disbursements?.forEach((disbursement: any) => {
          if (!disbursement.transaction_date) return

          const date = new Date(disbursement.transaction_date)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]
          const value = txUsd(disbursement)

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: date.toISOString(),
              timestamp: date.getTime(),
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              planned: 0,
              actual: 0
            })
          }

          dateMap.get(dateKey)!.actual += value
        })

        // Process planned disbursements
        plannedDisbursements?.forEach((planned: any) => {
          if (!planned.period_start) return

          const date = new Date(planned.period_start)
          if (isNaN(date.getTime())) return

          const dateKey = date.toISOString().split('T')[0]
          const value = safeUsd({ usd_value: planned.usd_amount, amount: planned.amount, currency: planned.currency })

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: date.toISOString(),
              timestamp: date.getTime(),
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              planned: 0,
              actual: 0
            })
          }

          dateMap.get(dateKey)!.planned += value
        })

        const sortedData = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp)
        setRawData(sortedData)
      } catch (err) {
        console.error('[PlannedVsActualDisbursements] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, filters, refreshKey])

  // Gregorian calendar years present in the loaded data — used to default the
  // year picker to the full span of years that actually have data.
  const dataYears = useMemo(
    () => rawData.map((item: any) => item.year as number),
    [rawData],
  )
  const actualDataRange = useYearRangeDefault(dataYears, selectedYears, setSelectedYears)

  // Group data by year or month
  const groupedData = useMemo(() => {
    if (rawData.length === 0) return []

    const grouped: any = {}

    rawData.forEach((item: any) => {
      let period: string
      let periodKey: string
      let sortKey: string

      if (groupBy === 'year') {
        period = item.year.toString()
        periodKey = period
        sortKey = period
      } else {
        const date = new Date(item.date)
        period = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        periodKey = `${item.year}-${String(item.month).padStart(2, '0')}`
        sortKey = periodKey
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          period,
          sortKey,
          timestamp: item.timestamp,
          date: item.date,
          planned: 0,
          actual: 0
        }
      }

      grouped[periodKey].planned += item.planned || 0
      grouped[periodKey].actual += item.actual || 0
    })

    return Object.values(grouped).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
  }, [rawData, groupBy])

  // Calculate cutoff date based on time period
  const getCutoffDate = (period: TimePeriod): Date | null => {
    if (period === 'all') return null

    const now = new Date()
    const cutoff = new Date()

    switch (period) {
      case '1m':
        cutoff.setMonth(now.getMonth() - 1)
        break
      case '3m':
        cutoff.setMonth(now.getMonth() - 3)
        break
      case '6m':
        cutoff.setMonth(now.getMonth() - 6)
        break
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1)
        break
      case '5y':
        cutoff.setFullYear(now.getFullYear() - 5)
        break
    }

    return cutoff
  }

  // Filter data by time period
  const filteredData = useMemo(() => {
    const cutoff = getCutoffDate(timePeriod)
    if (!cutoff) return groupedData

    return groupedData.filter((item: any) => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoff
    })
  }, [groupedData, timePeriod])

  // Emit a clean tabular representation of what the user currently sees.
  useEffect(() => {
    onDataChange?.(
      (filteredData as any[]).map((item) => ({
        Period: item.period,
        "Planned (USD)": Math.round(item.planned || 0),
        "Actual (USD)": Math.round(item.actual || 0),
      }))
    )
  }, [filteredData, onDataChange])

  // CSV export — Period / Planned / Actual, matching the table view.
  const handleExportCSV = () => {
    if ((filteredData as any[]).length === 0) {
      toast.error('No data available to export')
      return
    }
    const rows = (filteredData as any[]).map((item) => ({
      Period: item.period,
      "Planned (USD)": Math.round(item.planned || 0),
      "Actual (USD)": Math.round(item.actual || 0),
    }))
    exportChartToCSV(rows, 'Planned vs Actual Disbursements')
    toast.success('Chart data exported successfully')
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rows = payload.map((entry: any) => ({
        label: entry.name,
        value: formatTooltipCurrency(entry.value, isExpanded),
        color: entry.color || entry.stroke || entry.fill,
      }))
      return <ChartTooltipCard title={label} rows={rows} />
    }
    return null
  }

  const TimePeriodFilter = () => {
    const periods: { value: TimePeriod; label: string }[] = [
      { value: '1m', label: '1M' },
      { value: '3m', label: '3M' },
      { value: '6m', label: '6M' },
      { value: '1y', label: '1Y' },
      { value: '5y', label: '5Y' },
      { value: 'all', label: 'All' },
    ]

    return (
      <ChartViewToggle
        ariaLabel="Time period"
        variant="text"
        value={timePeriod}
        onValueChange={setTimePeriod}
        options={periods}
      />
    )
  }

  const GroupByToggle = () => {
    return (
      <ChartViewToggle
        ariaLabel="Group by"
        variant="text"
        value={groupBy}
        onValueChange={setGroupBy}
        options={[
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
        ]}
      />
    )
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Planned vs Actual Disbursements
          </CardTitle>
          <CardDescription className="text-body text-muted-foreground mt-0.5">
            Compare planned and actual disbursements across all activities
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
            className="mb-4"
          />
        )}
        {isExpanded && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <GroupByToggle />
              <TimePeriodFilter />
            </div>
            {/* Button groups + CSV, right-aligned. */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart-style toggle — Lines vs Columns, as a two-button group. */}
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('line')}
                  className={cn("h-8 w-8", chartType === 'line' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Lines"
                  aria-label="Lines"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartType('bar')}
                  className={cn("h-8 w-8", chartType === 'bar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Columns"
                  aria-label="Columns"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
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
              rows={filteredData as any[]}
              columns={[
                { key: 'period', label: 'Period', numeric: false },
                { key: 'planned', label: 'Planned', numeric: true, currency: 'USD', color: PLANNED_DISBURSEMENT_COLOR },
                { key: 'actual', label: 'Actual', numeric: true, currency: 'USD', color: getTransactionTypeColor('3') },
              ]}
              currency="USD"
              maxHeight={480}
            />
          ) : (
          <ResponsiveContainer width="100%" height={400} key={`disbursement-${groupBy}-${chartType}`}>
            {chartType === 'line' ? (
              <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: groupBy === 'month' ? 60 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                <XAxis
                  dataKey={groupBy === 'year' ? 'period' : 'timestamp'}
                  type={groupBy === 'year' ? 'category' : 'number'}
                  domain={groupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                  tickFormatter={(value) => {
                    if (groupBy === 'year') {
                      return value
                    }
                    const date = new Date(value)
                    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  }}
                  stroke="#64748B"
                  fontSize={12}
                  angle={groupBy === 'month' ? -45 : 0}
                  textAnchor={groupBy === 'month' ? 'end' : 'middle'}
                  height={groupBy === 'month' ? 80 : 30}
                />
                <YAxis tickFormatter={(value) => formatAxisCurrency(value)} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="planned"
                  name="Planned"
                  stroke={PLANNED_DISBURSEMENT_COLOR}
                  strokeWidth={2}
                  dot={{ fill: PLANNED_DISBURSEMENT_COLOR, r: 4 }}
                  animationDuration={300}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke={getTransactionTypeColor('3')}
                  strokeWidth={2}
                  dot={{ fill: getTransactionTypeColor('3'), r: 4 }}
                  animationDuration={300}
                />
              </LineChart>
            ) : (
              <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: groupBy === 'month' ? 60 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
                <XAxis
                  dataKey={groupBy === 'year' ? 'period' : 'timestamp'}
                  type={groupBy === 'year' ? 'category' : 'number'}
                  domain={groupBy === 'year' ? undefined : ['dataMin', 'dataMax']}
                  tickFormatter={(value) => {
                    if (groupBy === 'year') {
                      return value
                    }
                    const date = new Date(value)
                    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  }}
                  stroke="#64748B"
                  fontSize={12}
                  angle={groupBy === 'month' ? -45 : 0}
                  textAnchor={groupBy === 'month' ? 'end' : 'middle'}
                  height={groupBy === 'month' ? 80 : 30}
                />
                <YAxis tickFormatter={(value) => formatAxisCurrency(value)} stroke="#64748B" fontSize={12} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill={PLANNED_DISBURSEMENT_COLOR} radius={[4, 4, 0, 0]} animationDuration={300} />
                <Bar dataKey="actual" name="Actual" fill={getTransactionTypeColor('3')} radius={[4, 4, 0, 0]} animationDuration={300} />
              </BarChart>
            )}
          </ResponsiveContainer>
          )
        ) : (
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No disbursement data available</p>
              <p className="text-helper mt-2">Add planned disbursements or transactions to see this chart</p>
            </div>
          </div>
        )}

        {/* Explanatory text — only in expanded view */}
        {isExpanded && (
          <p className="text-body text-muted-foreground leading-relaxed mt-4">
            This chart compares planned disbursement schedules against actual disbursement transactions across all activities. Use the time period buttons to zoom into recent months or view the full history, and toggle between monthly and yearly grouping. Significant gaps between planned and actual lines may indicate forecasting issues or implementation delays.
          </p>
        )}
    </div>
  )
}

export function PlannedVsActualDisbursements(props: PlannedVsActualDisbursementsProps) {
  return <PlannedVsActualDisbursementsInner {...props} />
}
