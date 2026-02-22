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
import { LoadingText } from '@/components/ui/loading-text'
import { AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';

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

interface SpendTrajectoryData {
  totalBudget: number
  currency: string
  startDate: string
  endDate: string
  disbursements: Disbursement[]
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
    
    // Full activity date range
    const fullStart = new Date(startDate)
    const fullEnd = new Date(endDate)
    
    // Calculate view window based on time range filter
    const today = new Date()
    let viewStart: Date
    let viewEnd: Date = new Date(Math.min(fullEnd.getTime(), today.getTime()))
    
    switch (timeRange) {
      case '1y':
        viewStart = new Date(today)
        viewStart.setFullYear(viewStart.getFullYear() - 1)
        break
      case '5y':
        viewStart = new Date(today)
        viewStart.setFullYear(viewStart.getFullYear() - 5)
        break
      case '10y':
        viewStart = new Date(today)
        viewStart.setFullYear(viewStart.getFullYear() - 10)
        break
      default:
        viewStart = fullStart
        viewEnd = fullEnd
    }
    
    // Clamp view to activity bounds
    if (viewStart < fullStart) viewStart = fullStart
    if (viewEnd > fullEnd) viewEnd = fullEnd
    
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
  }, [data, timeRange])

  const formatXAxisTick = (timestamp: number) => {
    return new Date(timestamp).getFullYear().toString()
  }

  // Custom tooltip matching Financial Overview style
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
      
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
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
                    <span className="text-slate-700 font-medium">Perfect spend</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {formatTooltipCurrency(perfectSpend)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: COLOURS.primaryScarlet }}
                    />
                    <span className="text-slate-700 font-medium">Actual spend</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {formatTooltipCurrency(cumulative)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 last:border-b-0">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div className="w-3 h-3 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">
                      {variance >= 0 ? 'Ahead' : 'Behind'}
                    </span>
                  </td>
                  <td 
                    className="py-1.5 text-right font-semibold"
                    style={{ color: variance >= 0 ? '#16a34a' : '#dc2626' }}
                  >
                    {Math.abs(variance) < 1 ? '—' : formatTooltipCurrency(Math.abs(variance))}
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

  if (noBudget) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Spend Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="font-medium">No total budget reported for this activity.</p>
              <p className="text-sm mt-2 text-slate-400">
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
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Spend Trajectory
          </CardTitle>
          <CardDescription>
            Actual cumulative disbursements compared against a perfect spend trajectory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Spend Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
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
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Spend Trajectory
            </CardTitle>
            <CardDescription>
              Actual cumulative disbursements compared against a perfect spend trajectory
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {TIME_RANGES.map(range => (
              <Button
                key={range.key}
                variant={timeRange === range.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range.key)}
                className="text-xs px-2 py-1 h-7"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {noDisbursements && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              No disbursements reported to date. Only the perfect spend trajectory is shown.
            </p>
          </div>
        )}
        
        <ResponsiveContainer width="100%" height={400}>
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
              tickFormatter={formatCurrencyCompact} 
              stroke={COLOURS.blueSlate} 
              fontSize={12}
              domain={[0, yAxisMax]}
              tick={{ fill: COLOURS.blueSlate }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
            />
            
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
      </CardContent>
    </Card>
  )
}

export default ActivitySpendTrajectoryChart
