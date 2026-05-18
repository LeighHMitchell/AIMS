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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle, Info, CalendarIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';
import { formatAxisCurrency } from '@/lib/format';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip';
import { ChartFullscreen, ChartExpandIconButton } from '@/components/charts/ChartFullscreen';
import { cn } from '@/lib/utils';
import { useCalendarYearSelector, CalendarYearSelector } from '@/components/charts/CalendarYearSelector';
import { ChartViewToggle, type ChartView } from '@/components/charts/ChartViewToggle';

// Colour palette as specified
const COLOURS = {
  primaryScarlet: '#dc2625',  // Cumulative disbursements line (solid)
  paleSlate: '#cfd0d5',       // Grid lines
  blueSlate: '#4c5568',       // Axis text
  coolSteel: '#7b95a7',       // Perfect spend trajectory line (dashed)
  platinum: '#f1f4f8',        // Background/tooltips
}

// Time range filter options
const TIME_RANGES = [
  { key: 'all', label: 'All' },
  { key: '10y', label: '10 years' },
  { key: '5y', label: '5 years' },
  { key: '1y', label: '1 year' },
] as const

type TimeRangeKey = typeof TIME_RANGES[number]['key']

interface Disbursement {
  date: string
  value: number
  cumulativeValue: number
}

interface YearlyAggregate {
  year: number
  value: number
  cumulative: number
}

interface SpendTrajectoryData {
  totalBudget: number
  currency: string
  startDate: string
  endDate: string
  disbursements: Disbursement[]
  commitmentsByYear?: YearlyAggregate[]
  plannedByYear?: YearlyAggregate[]
}

interface ActivitySpendTrajectoryChartProps {
  activityId: string
}

// Format currency with k/m suffixes
const formatCurrencyCompact = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(1)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(1)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

// Format for tooltip - slightly more precise
const formatTooltipCurrency = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(2)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(2)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

/**
 * ActivitySpendTrajectoryChart
 * 
 * Shows actual cumulative disbursements compared against a perfect spend trajectory.
 * Shaded areas indicate the gap between actual and benchmark spending.
 */
export function ActivitySpendTrajectoryChart({ activityId }: ActivitySpendTrajectoryChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SpendTrajectoryData | null>(null)
  const [noBudget, setNoBudget] = useState(false)
  const [noDisbursements, setNoDisbursements] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all')
  const [view, setView] = useState<ChartView>('chart')

  // Calendar / year selectors — shared component used by every finance chart.
  const calendarYearDates = useMemo(
    () => (data?.disbursements ?? []).map((d) => new Date(d.date)),
    [data],
  )
  const calendarYearState = useCalendarYearSelector(calendarYearDates)
  const { effectiveDateRange } = calendarYearState

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        setNoBudget(false)
        setNoDisbursements(false)

        const response = await apiFetch(`/api/activities/${activityId}/spend-trajectory`)
        
        if (!response.ok) {
          const errorData = await response.json()
          if (errorData.code === 'NO_BUDGET') {
            setNoBudget(true)
            return
          }
          throw new Error(errorData.error || 'Failed to fetch spend trajectory data')
        }

        const result = await response.json()
        setData(result)
        
        if (result.disbursements.length === 0) {
          setNoDisbursements(true)
        }
      } catch (err) {
        console.error('[ActivitySpendTrajectoryChart] Error:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (activityId) {
      fetchData()
    }
  }, [activityId])

  // Build daily cumulative series with gap areas
  const { chartData, yearTicks } = useMemo(() => {
    if (!data) return { chartData: [], yearTicks: [] }

    const { totalBudget, startDate, endDate, disbursements } = data

    // Activity's planned date range — used to compute the perfect-spend
    // baseline regardless of what data has actually been reported.
    const fullStart = new Date(startDate)
    const fullEnd = new Date(endDate)

    // The view window comes from the calendar / year picker when available;
    // otherwise fall back to the years that actually have reported
    // disbursements (rounded to whole-year boundaries). If there's nothing
    // reported yet, fall further back to the activity's planned date range.
    let viewStart: Date
    let viewEnd: Date
    if (effectiveDateRange) {
      viewStart = effectiveDateRange.from
      viewEnd = effectiveDateRange.to
    } else if (disbursements.length > 0) {
      const disbTimestamps = disbursements.map(d => new Date(d.date).getTime())
      const earliestYear = new Date(Math.min(...disbTimestamps)).getFullYear()
      const latestYear = new Date(Math.max(...disbTimestamps)).getFullYear()
      viewStart = new Date(earliestYear, 0, 1)
      viewEnd = new Date(latestYear, 11, 31)
    } else {
      viewStart = fullStart
      viewEnd = fullEnd
    }
    
    // Calculate full-life perfect spend trajectory
    const fullTotalMs = fullEnd.getTime() - fullStart.getTime()
    const getPerfectSpendValue = (date: Date): number => {
      if (fullTotalMs <= 0) return totalBudget
      const elapsedMs = date.getTime() - fullStart.getTime()
      const progress = Math.max(0, Math.min(1, elapsedMs / fullTotalMs))
      return progress * totalBudget
    }

    // Build a map of transaction dates to values
    const disbursementMap = new Map<string, number>()
    disbursements.forEach(d => {
      const dateKey = d.date.split('T')[0]
      disbursementMap.set(dateKey, (disbursementMap.get(dateKey) || 0) + d.value)
    })

    // Generate data points
    const points: Array<{
      date: Date
      dateStr: string
      timestamp: number
      year: number
      perfectSpend: number
      cumulativeDisbursements: number
      gapArea: [number, number]
    }> = []

    let cumulativeValue = 0
    
    // Calculate cumulative value up to view start (for filtered views)
    const sortedDisbursements = [...disbursements].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    for (const d of sortedDisbursements) {
      const dDate = new Date(d.date)
      if (dDate < viewStart) {
        cumulativeValue += d.value
      }
    }
    
    // Iterate through the view window
    const currentDate = new Date(viewStart)
    const samplingInterval = 7
    let dayCount = 0
    
    while (currentDate <= viewEnd) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Add disbursements for this date
      cumulativeValue += disbursementMap.get(dateStr) || 0
      
      const hasDisbursement = disbursementMap.has(dateStr)
      const isStartOrEnd = dayCount === 0 || currentDate.getTime() >= viewEnd.getTime() - 86400000
      const isSamplingDay = dayCount % samplingInterval === 0
      
      if (hasDisbursement || isStartOrEnd || isSamplingDay) {
        const perfectValue = getPerfectSpendValue(currentDate)
        
        // Gap area: always from min to max of the two values
        const minVal = Math.min(perfectValue, cumulativeValue)
        const maxVal = Math.max(perfectValue, cumulativeValue)
        
        points.push({
          date: new Date(currentDate),
          dateStr,
          timestamp: currentDate.getTime(),
          year: currentDate.getFullYear(),
          perfectSpend: perfectValue,
          cumulativeDisbursements: cumulativeValue,
          gapArea: [minVal, maxVal],
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
      dayCount++
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
  }, [data, timeRange, effectiveDateRange])

  // Annual rollup for the table view — one row per calendar year, using the
  // last per-year observation for cumulative columns and the delta from the
  // prior year for "Disbursed in year".
  const annualRollup = useMemo(() => {
    if (!data) return []
    const { totalBudget, startDate, endDate, disbursements } = data
    const fullStart = new Date(startDate)
    const fullEnd = new Date(endDate)
    const fullTotalMs = fullEnd.getTime() - fullStart.getTime()
    const baselineAt = (date: Date): number => {
      if (fullTotalMs <= 0) return totalBudget
      const elapsed = date.getTime() - fullStart.getTime()
      const progress = Math.max(0, Math.min(1, elapsed / fullTotalMs))
      return progress * totalBudget
    }

    const yearCumulative = new Map<number, number>()
    let running = 0
    const sorted = [...disbursements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    for (const d of sorted) {
      const year = new Date(d.date).getUTCFullYear()
      if (!Number.isFinite(year)) continue
      running += d.value
      yearCumulative.set(year, running)
    }

    const plannedMap = new Map<number, number>()
    ;(data.plannedByYear ?? []).forEach((p) => plannedMap.set(p.year, p.cumulative))
    const commitMap = new Map<number, number>()
    ;(data.commitmentsByYear ?? []).forEach((c) => commitMap.set(c.year, c.cumulative))

    const years = new Set<number>()
    Array.from(yearCumulative.keys()).forEach((y) => years.add(y))
    Array.from(plannedMap.keys()).forEach((y) => years.add(y))
    Array.from(commitMap.keys()).forEach((y) => years.add(y))
    if (years.size === 0) return []
    const sortedYears = Array.from(years).sort((a, b) => a - b)

    let lastActual = 0
    let lastPlanned = 0
    let lastCommit = 0
    return sortedYears.map((year) => {
      const cumulativeActual = yearCumulative.get(year) ?? lastActual
      const disbursedInYear = cumulativeActual - lastActual
      lastActual = cumulativeActual
      const cumulativePlanned = plannedMap.get(year) ?? lastPlanned
      lastPlanned = cumulativePlanned
      const cumulativeCommitments = commitMap.get(year) ?? lastCommit
      lastCommit = cumulativeCommitments
      // Baseline at the end of the year (capped by the activity's end date)
      const yearEnd = new Date(Date.UTC(year, 11, 31))
      const baselineDate = yearEnd > fullEnd ? fullEnd : yearEnd < fullStart ? fullStart : yearEnd
      const baseline = baselineAt(baselineDate)
      return {
        year,
        disbursedInYear,
        cumulativeActual,
        baseline,
        cumulativePlanned,
        cumulativeCommitments,
      }
    })
  }, [data])

  const formatXAxisTick = (timestamp: number) => {
    return calendarYearState.getYearLabel(new Date(timestamp).getFullYear())
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload
      const date = dataPoint?.date
      const formattedDate = date ? new Date(date).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : ''

      const perfectSpend = dataPoint?.perfectSpend || 0
      const cumulative = dataPoint?.cumulativeDisbursements || 0
      const variance = cumulative - perfectSpend
      const varianceColor = variance >= 0 ? '#16a34a' : '#dc2626'
      const varianceValue = (
        <span style={{ color: varianceColor }}>
          {Math.abs(variance) < 1 ? '—' : formatTooltipCurrency(Math.abs(variance))}
        </span>
      )

      return (
        <ChartTooltipCard
          title={formattedDate}
          rows={[
            { label: 'Perfect spend', value: formatTooltipCurrency(perfectSpend), color: COLOURS.coolSteel },
            { label: 'Actual spend', value: formatTooltipCurrency(cumulative), color: COLOURS.primaryScarlet },
            { label: variance >= 0 ? 'Ahead' : 'Behind', value: varianceValue },
          ]}
        />
      )
    }
    return null
  }

  if (noBudget) {
    return (
      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Spend Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No total budget reported for this activity.</p>
              <p className="text-body mt-2 text-muted-foreground">
                Add budget data to view the spend trajectory chart.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Spend Trajectory
          </CardTitle>
          <CardDescription>
            Actual vs perfect cumulative disbursement
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
      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Spend Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-destructive">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxDisbursement = chartData.length 
    ? Math.max(...chartData.map(d => d.cumulativeDisbursements))
    : 0
  const yAxisMax = Math.max(data?.totalBudget || 0, maxDisbursement) * 1.1

  return (
    <ChartFullscreen>
      {({ isFullscreen, toggle }) => (
    <Card className={cn("bg-white border-border", isFullscreen && "border-0 shadow-none rounded-none h-full flex flex-col")}>
      <CardHeader className={cn(isFullscreen && "bg-surface-muted border-b rounded-t-lg")}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Spend Trajectory
            </CardTitle>
            <CardDescription>
              Actual vs perfect cumulative disbursement
            </CardDescription>
          </div>
          {!isFullscreen && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <ChartExpandIconButton isFullscreen={isFullscreen} onClick={toggle} />
            </div>
          )}
        </div>
      </CardHeader>
      {isFullscreen && (
        <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
          <CalendarYearSelector {...calendarYearState} />
          <div className="ml-auto flex items-center gap-2">
            <ChartViewToggle view={view} setView={setView} />
          </div>
        </div>
      )}
      <CardContent className={cn(isFullscreen && "flex-1 min-h-0 flex flex-col")}>
        {noDisbursements && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-body text-amber-700">
              No disbursements reported to date. Only the perfect spend trajectory is shown.
            </p>
          </div>
        )}
        
        <div className={cn(isFullscreen ? "flex-1 min-h-0 relative" : "h-[500px]")}>
          {isFullscreen && view === 'table' ? (
            <div className="absolute inset-0 overflow-auto rounded-md border border-border">
              <table className="w-full text-body">
                <thead className="sticky top-0 bg-surface-muted z-10">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">Year</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Disbursed in year</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Cumulative actual</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Even-spend baseline</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Variance vs baseline</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Cumulative planned</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">Cumulative commitments</th>
                  </tr>
                </thead>
                <tbody>
                  {annualRollup.map((row) => {
                    const variance = row.cumulativeActual - row.baseline
                    const varianceColor = Math.abs(variance) < 1
                      ? undefined
                      : variance >= 0 ? '#16a34a' : '#dc2626'
                    return (
                      <tr key={row.year} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2.5 px-4 font-medium text-foreground">{calendarYearState.getYearLabel(row.year)}</td>
                        <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatTooltipCurrency(row.disbursedInYear)}</td>
                        <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatTooltipCurrency(row.cumulativeActual)}</td>
                        <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatTooltipCurrency(row.baseline)}</td>
                        <td className="text-right py-2.5 px-4 tabular-nums" style={{ color: varianceColor }}>
                          {Math.abs(variance) < 1
                            ? '—'
                            : `${variance >= 0 ? '+' : '−'}${formatTooltipCurrency(Math.abs(variance))}`}
                        </td>
                        <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatTooltipCurrency(row.cumulativePlanned)}</td>
                        <td className="text-right py-2.5 px-4 text-foreground tabular-nums">{formatTooltipCurrency(row.cumulativeCommitments)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className={isFullscreen ? "absolute inset-0" : "h-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {/* Diagonal stripe pattern for gap area */}
              <pattern 
                id="activityDiagonalStripes" 
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
              domain={['dataMin', 'dataMax']}
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
            {isFullscreen && (
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
              />
            )}

            {/* Gap area with diagonal stripes - use linear to follow the diagonal perfect spend line */}
            <Area
              type="linear"
              dataKey="gapArea"
              fill="url(#activityDiagonalStripes)"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              name="Variance"
            />
            
            {/* Perfect Spend Trajectory - dashed line */}
            <Line
              type="linear"
              dataKey="perfectSpend"
              name="Perfect spend trajectory"
              stroke={COLOURS.coolSteel}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            
            {/* Cumulative Disbursements - stepped solid line */}
            <Line
              type="stepAfter"
              dataKey="cumulativeDisbursements"
              name="Cumulative disbursements"
              stroke={COLOURS.primaryScarlet}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: COLOURS.primaryScarlet }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
          </div>
          )}
        </div>
        {isFullscreen && (
          <p className="text-body text-muted-foreground leading-relaxed mt-auto pt-6 shrink-0">
            The dashed line is the activity's <strong>perfect spend trajectory</strong> — what cumulative disbursements would look like if the full budget were paid out evenly across the planned start and end dates — while the solid stepped line tracks the <strong>actual cumulative disbursements</strong> reported to date. When the solid line sits below the dashed one the activity is behind on disbursing funds; above it, ahead. The diagonal-striped band measures that variance, and a persistent gap below the line is an early signal that planned activities aren't being funded on time — worth investigating against procurement, partner readiness, or reporting lag.
          </p>
        )}
      </CardContent>
    </Card>
      )}
    </ChartFullscreen>
  )
}

export default ActivitySpendTrajectoryChart
