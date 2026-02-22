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
import { AlertCircle, Info, Download, FileImage, BarChart3, Table as TableIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import html2canvas from 'html2canvas'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { useCustomYears } from '@/hooks/useCustomYears'
import { getCustomYearLabel } from '@/types/custom-years'
import { apiFetch } from '@/lib/api-fetch';

const COLOURS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
}

interface MonthlyDisbursement {
  month: string
  value: number
  cumulativeValue: number
}

interface PlannedDisbursement {
  period_start: string
  period_end?: string
  usd_amount: number
}

interface Commitment {
  transaction_date: string
  value_usd: number
}

interface SpendData {
  totalBudget: number
  startDate: string
  endDate: string
  monthlyDisbursements: MonthlyDisbursement[]
  plannedDisbursements: PlannedDisbursement[]
  commitments: Commitment[]
  activitiesIncluded: number
  activitiesExcluded: number
}

interface OrganizationSpendTrajectoryChartProps {
  organizationId: string
  organizationName?: string
  compact?: boolean
}

const formatCurrencyCompact = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(0)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(0)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

const formatTooltipCurrency = (value: number): string => {
  const absValue = Math.abs(value)
  if (absValue >= 1000000000) return `$${(value / 1000000000).toFixed(1)}b`
  if (absValue >= 1000000) return `$${(value / 1000000).toFixed(1)}m`
  if (absValue >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

export function OrganizationSpendTrajectoryChart({
  organizationId,
  organizationName,
  compact = false
}: OrganizationSpendTrajectoryChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SpendData | null>(null)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set(['cumulativePlannedDisbursements', 'cumulativeCommitments']))
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const chartRef = useRef<HTMLDivElement>(null)
  const [comparisonSeries, setComparisonSeries] = useState<'cumulativeDisbursements' | 'cumulativePlannedDisbursements' | 'cumulativeCommitments'>('cumulativeDisbursements')

  // Custom year selection for X-axis labels
  const { customYears, selectedId: selectedCustomYearId } = useCustomYears()

  // Get year label based on timestamp using custom year format
  const getYearLabelFromTimestamp = (timestamp: number): string => {
    const year = new Date(timestamp).getFullYear()
    const customYear = customYears.find(cy => cy.id === selectedCustomYearId)
    if (customYear) {
      return getCustomYearLabel(customYear, year)
    }
    return year.toString()
  }

  const comparisonSeriesKeys = ['cumulativeDisbursements', 'cumulativePlannedDisbursements', 'cumulativeCommitments']

  const handleLegendClick = (dataKey: string) => {
    if (comparisonSeriesKeys.includes(dataKey)) {
      setComparisonSeries(dataKey as typeof comparisonSeries)
      setHiddenSeries(prev => {
        const newSet = new Set(prev)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiFetch(`/api/organizations/${organizationId}/spend-trajectory`)

        if (!response.ok) {
          const errorData = await response.json()
          if (errorData.code === 'NO_BUDGET' || errorData.code === 'NO_ACTIVITIES') {
            setError(errorData.error)
            return
          }
          throw new Error(errorData.error || 'Failed to fetch spend trajectory data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('[OrgSpendTrajectoryChart] Error:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchData()
    }
  }, [organizationId])

  const { chartData, yearTicks } = useMemo(() => {
    if (!data) {
      return { chartData: [], yearTicks: [] }
    }

    const { totalBudget, startDate, endDate, monthlyDisbursements, plannedDisbursements, commitments } = data

    const fullStart = new Date(startDate)
    const fullEnd = new Date(endDate)
    const fullTotalMs = fullEnd.getTime() - fullStart.getTime()

    const getPerfectSpendValue = (date: Date): number => {
      if (fullTotalMs <= 0) return totalBudget
      const elapsedMs = date.getTime() - fullStart.getTime()
      const progress = Math.max(0, Math.min(1, elapsedMs / fullTotalMs))
      return progress * totalBudget
    }

    const disbursementMap = new Map<string, number>()
    for (const d of monthlyDisbursements) {
      disbursementMap.set(d.month, d.cumulativeValue)
    }

    // Build cumulative planned disbursements
    const plannedDisbursementsByMonth = new Map<string, number>()
    let cumulativePlanned = 0
    const sortedPlanned = [...(plannedDisbursements || [])]
      .filter(pd => pd.period_start && pd.usd_amount)
      .sort((a, b) => a.period_start.localeCompare(b.period_start))

    for (const pd of sortedPlanned) {
      const monthKey = pd.period_start.slice(0, 7)
      cumulativePlanned += pd.usd_amount || 0
      plannedDisbursementsByMonth.set(monthKey, cumulativePlanned)
    }

    // Build cumulative commitments
    const commitmentsByMonth = new Map<string, number>()
    let cumulativeCommit = 0
    const sortedCommitments = [...(commitments || [])]
      .filter(c => c.transaction_date && c.value_usd)
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))

    for (const c of sortedCommitments) {
      const monthKey = c.transaction_date.slice(0, 7)
      cumulativeCommit += c.value_usd || 0
      commitmentsByMonth.set(monthKey, cumulativeCommit)
    }

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

    let currentCumulative = 0
    let currentPlanned = 0
    let currentCommitments = 0

    const currentDate = new Date(fullStart.getFullYear(), fullStart.getMonth(), 1)

    while (currentDate <= fullEnd) {
      const monthKey = currentDate.toISOString().slice(0, 7)
      const monthMid = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15)

      if (disbursementMap.has(monthKey)) {
        currentCumulative = disbursementMap.get(monthKey)!
      }

      if (plannedDisbursementsByMonth.has(monthKey)) {
        currentPlanned = plannedDisbursementsByMonth.get(monthKey)!
      }

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

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    const ticks: number[] = []
    if (points.length > 0) {
      const startYear = points[0].year
      const endYear = points[points.length - 1].year
      for (let year = startYear; year <= endYear; year++) {
        ticks.push(new Date(year, 0, 1).getTime())
      }
    }

    return { chartData: points, yearTicks: ticks }
  }, [data])

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

  const latestDisbursementTimestamp = useMemo(() => {
    if (!data?.monthlyDisbursements?.length) return null
    const sorted = [...data.monthlyDisbursements]
      .filter(d => d.value > 0)
      .sort((a, b) => b.month.localeCompare(a.month))
    if (sorted.length === 0) return null
    return new Date(sorted[0].month + '-15').getTime()
  }, [data])

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
    link.setAttribute('download', `org-spend-trajectory-${organizationId}-${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
          link.download = `org-spend-trajectory-${organizationId}-${new Date().getTime()}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Error exporting chart:', error)
    }
  }

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
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLOURS.coolSteel }} />
                    <span className="text-slate-700 font-medium">Even-spend baseline</span>
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    {formatTooltipCurrency(perfectSpend)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getComparisonColor() }} />
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
                  <td className="py-1.5 text-right font-semibold" style={{ color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
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

  // Compact mode - render just the chart without card wrapper
  if (compact) {
    if (loading) {
      return <Skeleton className="h-[300px] w-full" />
    }
    if (error || !data || displayData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          <p className="text-sm">{error || 'No data available'}</p>
        </div>
      )
    }
    const compactMaxDisbursement = displayData.length
      ? Math.max(...displayData.map(d => Math.max(
          d.cumulativeDisbursements,
          d.cumulativePlannedDisbursements,
          d.cumulativeCommitments
        )))
      : 0
    const compactYAxisMax = Math.max(data.totalBudget, compactMaxDisbursement) * 1.1

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={displayData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
          <defs>
            <pattern
              id="orgDiagonalStripesCompact"
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
            tickFormatter={getYearLabelFromTimestamp}
            ticks={yearTicks}
            stroke={COLOURS.blueSlate}
            fontSize={10}
            tick={{ fill: COLOURS.blueSlate }}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            stroke={COLOURS.blueSlate}
            fontSize={10}
            domain={[0, compactYAxisMax]}
            tick={{ fill: COLOURS.blueSlate }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="linear"
            dataKey="gapArea"
            fill="url(#orgDiagonalStripesCompact)"
            stroke="none"
            isAnimationActive={false}
            legendType="none"
            name="Variance"
          />
          <Line
            type="linear"
            dataKey="perfectSpend"
            name="Even-Spend Baseline"
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
            name="Actual Disbursements"
            stroke={COLOURS.primaryScarlet}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Portfolio Spend Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Portfolio Spend Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || displayData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Portfolio Spend Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="font-medium">No activities with budget data found.</p>
              <p className="text-sm mt-2 text-slate-400">
                Add budget data to activities to view the spend trajectory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxDisbursement = displayData.length
    ? Math.max(...displayData.map(d => Math.max(
        d.cumulativeDisbursements,
        d.cumulativePlannedDisbursements,
        d.cumulativeCommitments
      )))
    : 0
  const yAxisMax = Math.max(data.totalBudget, maxDisbursement) * 1.1

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Portfolio Spend Trajectory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('chart')}
                className={cn("h-7 px-2", viewMode === 'chart' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
                title="Chart view"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn("h-7 px-2", viewMode === 'table' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportCSV}
                className="h-7 px-2"
                title="Export to CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportJPG}
                className="h-7 px-2"
                title="Export to JPG"
                disabled={viewMode === 'table'}
              >
                <FileImage className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          {viewMode === 'chart' ? (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <pattern
                    id="orgDiagonalStripes"
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
                  tickFormatter={getYearLabelFromTimestamp}
                  ticks={yearTicks}
                  stroke={COLOURS.blueSlate}
                  fontSize={12}
                  tick={{ fill: COLOURS.blueSlate }}
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
                            className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${isHidden ? 'opacity-40' : 'opacity-100'} hover:bg-slate-100`}
                          >
                            {isDashed ? (
                              <svg width="16" height="2" className="flex-shrink-0">
                                <line x1="0" y1="1" x2="16" y2="1" stroke={entry.color} strokeWidth="2" strokeDasharray="4 2" />
                              </svg>
                            ) : (
                              <div className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: entry.color }} />
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

                <Area
                  type="linear"
                  dataKey="gapArea"
                  fill="url(#orgDiagonalStripes)"
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                  name="Variance"
                />

                <Line
                  type="linear"
                  dataKey="perfectSpend"
                  name="Even-Spend Baseline"
                  stroke={hiddenSeries.has('perfectSpend') ? '#cbd5e1' : COLOURS.coolSteel}
                  strokeWidth={hiddenSeries.has('perfectSpend') ? 1 : 2}
                  strokeDasharray="8 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  opacity={hiddenSeries.has('perfectSpend') ? 0.3 : 1}
                />

                <Line
                  type="stepAfter"
                  dataKey="cumulativePlannedDisbursements"
                  name="Planned Disbursements"
                  stroke={hiddenSeries.has('cumulativePlannedDisbursements') ? '#cbd5e1' : '#4c5568'}
                  strokeWidth={hiddenSeries.has('cumulativePlannedDisbursements') ? 1 : 2}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  opacity={hiddenSeries.has('cumulativePlannedDisbursements') ? 0.3 : 1}
                />

                <Line
                  type="stepAfter"
                  dataKey="cumulativeCommitments"
                  name="Commitments"
                  stroke={hiddenSeries.has('cumulativeCommitments') ? '#cbd5e1' : '#5f7f7a'}
                  strokeWidth={hiddenSeries.has('cumulativeCommitments') ? 1 : 2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  opacity={hiddenSeries.has('cumulativeCommitments') ? 0.3 : 1}
                />

                <Line
                  type="stepAfter"
                  dataKey="cumulativeDisbursements"
                  name="Actual Disbursements"
                  stroke={hiddenSeries.has('cumulativeDisbursements') ? '#cbd5e1' : COLOURS.primaryScarlet}
                  strokeWidth={hiddenSeries.has('cumulativeDisbursements') ? 1 : 2.5}
                  dot={false}
                  activeDot={hiddenSeries.has('cumulativeDisbursements') ? false : { r: 5, strokeWidth: 0, fill: COLOURS.primaryScarlet }}
                  connectNulls
                  isAnimationActive={false}
                  opacity={hiddenSeries.has('cumulativeDisbursements') ? 0.3 : 1}
                />

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
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-white z-10">
                    <TableHead className="bg-white">Month</TableHead>
                    <TableHead className="text-right bg-white">Baseline (USD)</TableHead>
                    <TableHead className="text-right bg-white">Planned (USD)</TableHead>
                    <TableHead className="text-right bg-white">Commitments (USD)</TableHead>
                    <TableHead className="text-right bg-white">Disbursements (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(row.timestamp), 'MMM yyyy')}</TableCell>
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

        <div className="text-xs text-gray-500 mt-4 space-y-1">
          <p>
            Compares <strong>actual cumulative disbursements</strong> (red) against an <strong>even-spend budget baseline</strong> (grey dashed).
            The striped area shows the gap between actual spend and baseline.
          </p>
          <p className="italic">
            Based on {data.activitiesIncluded} activities with reported budgets. {data.activitiesExcluded > 0 && `${data.activitiesExcluded} activities without budgets excluded.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default OrganizationSpendTrajectoryChart
