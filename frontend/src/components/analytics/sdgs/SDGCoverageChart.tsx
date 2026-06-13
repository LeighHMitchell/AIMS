"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InlineViewToggle, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { AlertCircle } from 'lucide-react'
import { SDG_GOALS } from '@/data/sdg-targets'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { formatAxisCurrency, formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { useChartExpansion } from '@/lib/chart-expansion-context'

// Metric options shared by the metric selector and the sort-by selector.
type SDGMetric = 'activities' | 'budget' | 'planned'
const SDG_METRIC_OPTIONS: { value: SDGMetric; label: string }[] = [
  { value: 'activities', label: 'Activities' },
  { value: 'budget', label: 'Total Budget' },
  { value: 'planned', label: 'Planned Disbursement' },
]

interface SDGCoverageChartProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
  compact?: boolean
}

interface CoverageData {
  sdgGoal: number
  sdgName: string
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

export function SDGCoverageChart({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  refreshKey,
  compact = false
}: SDGCoverageChartProps) {
  const [data, setData] = useState<CoverageData[]>([])
  const [loading, setLoading] = useState(true)
  const tableMode = useChartCardTableMode()
  const isExpanded = useChartExpansion()
  // Metric to plot + metric to sort by — both controlled in-chart. Each row
  // already carries all three values, so switching is client-side.
  const [selectedMetric, setSelectedMetric] = useState<SDGMetric>(metric)
  const [sortBy, setSortBy] = useState<SDGMetric>(metric)

  useEffect(() => {
    fetchData()
  }, [organizationId, dateRange, selectedSdgs, selectedMetric, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        organizationId: organizationId || 'all',
        dateFrom: dateRange.from.toISOString().split('T')[0],
        dateTo: dateRange.to.toISOString().split('T')[0],
        selectedSdgs: selectedSdgs.length > 0 ? selectedSdgs.join(',') : 'all',
        metric,
        dataType: 'coverage'
      })

      const response = await fetch(`/api/analytics/sdgs?${params}`)
      const result = await response.json()

      if (result.success && result.coverage) {
        setData(result.coverage)
      } else {
        console.error('Error fetching SDG coverage data:', result.error)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching SDG coverage data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const metricValueOf = (item: CoverageData, m: SDGMetric) => {
    if (m === 'activities') return item.activityCount
    if (m === 'budget') return item.totalBudget
    return item.totalPlannedDisbursements
  }

  const getMetricValue = (item: CoverageData) => metricValueOf(item, selectedMetric)

  const getMetricLabel = () => {
    if (selectedMetric === 'activities') return 'Number of Activities'
    if (selectedMetric === 'budget') return 'Total Activity Budget (USD)'
    return 'Total Planned Disbursements (USD)'
  }

  // Sort by the chosen metric (descending) before plotting.
  const chartData = [...data]
    .sort((a, b) => metricValueOf(b, sortBy) - metricValueOf(a, sortBy))
    .map(item => ({
      ...item,
      value: getMetricValue(item),
      label: `SDG ${item.sdgGoal}`,
    }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const goal = SDG_GOALS.find(g => g.id === data.sdgGoal)
      const title = (
        <span>
          <code className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">SDG {data.sdgGoal}</code>
          <span className="ml-2">{goal?.name || data.sdgName}</span>
        </span>
      )
      return (
        <ChartTooltipCard
          title={title}
          subtitle="Values are equally split when activities map to multiple SDGs"
          rows={[
            { label: 'Activities', value: data.activityCount.toFixed(1), color: data.fill || data.color },
            { label: 'Total Budget', value: formatTooltipCurrency(data.totalBudget, isExpanded) },
            { label: 'Planned Disbursements', value: formatTooltipCurrency(data.totalPlannedDisbursements, isExpanded) },
          ]}
        />
      )
    }
    return null
  }

  // Custom Y-axis tick — SDG code badge inline immediately before the name, in
  // a single right-aligned block so they read on one line (no gap between them).
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const goal = SDG_GOALS.find(g => g.id === payload.value)
    const goalName = goal?.name || ''
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-270} y={-20} width={262} height={40}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingRight: '6px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'right', lineHeight: 1.3, whiteSpace: 'normal', overflowWrap: 'break-word' }}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '9px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '3px', marginRight: '5px', whiteSpace: 'nowrap' }}>
                SDG {payload.value}
              </span>
              {goalName}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }

  // Compact-mode Y-axis tick — same inline code + name, smaller.
  const CompactYAxisTick = ({ x, y, payload }: any) => {
    const goal = SDG_GOALS.find(g => g.id === payload.value)
    const goalName = goal?.name || ''
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-118} y={-18} width={112} height={36}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingRight: '4px' }}>
            <div style={{ fontSize: '8px', color: '#64748b', textAlign: 'right', lineHeight: 1.25, whiteSpace: 'normal', overflowWrap: 'break-word' }}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '7px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 3px', borderRadius: '2px', marginRight: '3px', whiteSpace: 'nowrap' }}>
                SDG {payload.value}
              </span>
              {goalName}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <ChartLoadingPlaceholder />
    }
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-body">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData.slice(0, 8)}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 5, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal vertical={false} />
            <XAxis
              type="number"
              fontSize={9}
              tick={{ fill: '#64748b' }}
              tickFormatter={(v) => selectedMetric === 'activities' ? v.toFixed(1) : formatAxisCurrency(v)}
              domain={[0, 'auto']}
            >
              <Label value={getMetricLabel()} position="bottom" offset={5} fontSize={9} fill="#64748b" />
            </XAxis>
            <YAxis
              type="category"
              dataKey="sdgGoal"
              tick={<CompactYAxisTick />}
              width={120}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
            >
              {chartData.slice(0, 8).map((entry, index) => {
                const goal = SDG_GOALS.find(g => g.id === entry.sdgGoal)
                return <Cell key={`cell-${index}`} fill={goal?.color || '#64748b'} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return <ChartLoadingPlaceholder />
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground font-medium">No SDG data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isExpanded && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Left: metric + sort dropdowns (chart view only — the table shows
              all metrics as columns and sorts via its own headers). */}
          <div className={`items-center gap-2 flex-wrap ${tableMode ? 'hidden' : 'flex'}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  Metric: {SDG_METRIC_OPTIONS.find(o => o.value === selectedMetric)?.label}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SDG_METRIC_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    className={selectedMetric === opt.value ? 'bg-muted font-medium' : ''}
                    onClick={() => setSelectedMetric(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  Sort: {SDG_METRIC_OPTIONS.find(o => o.value === sortBy)?.label}
                  <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SDG_METRIC_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    className={sortBy === opt.value ? 'bg-muted font-medium' : ''}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Right: view toggle + CSV. */}
          <div className="flex items-center gap-2 ml-auto">
            <InlineViewToggle />
            <CsvExportButton rows={chartData} title="SDG Coverage" />
          </div>
        </div>
      )}
      {!tableMode && (
      <ResponsiveContainer width="100%" height={550}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={selectedMetric === 'activities' ? (v) => v.toFixed(1) : formatAxisCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
              orientation="bottom"
              domain={[0, 'auto']}
            >
              <Label value={getMetricLabel()} position="bottom" offset={10} fontSize={11} fill="#64748b" />
            </XAxis>
            <YAxis
              type="category"
              dataKey="sdgGoal"
              tick={<CustomYAxisTick />}
              axisLine={false}
              tickLine={false}
              width={275}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => {
                const goal = SDG_GOALS.find(g => g.id === entry.sdgGoal)
                return (
                  <Cell key={`cell-${index}`} fill={goal?.color || '#64748b'} />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Explanatory paragraph — chart view only; in table view it renders
          under the table (see SDGTable). */}
      {!tableMode && (
        <div className="mt-6">
          <p className="text-body text-muted-foreground leading-relaxed">
            This chart shows how the organization&apos;s aid activities align with the 17 UN Sustainable Development Goals.
            Each bar represents the number of activities (or financial value) mapped to that SDG. When an activity addresses
            multiple SDGs, its value is split equally across those goals to avoid double-counting. Use this visualization to
            identify the organization&apos;s priority development areas, spot potential gaps in SDG coverage, and understand
            how aid flows are distributed across global development objectives. Higher bars indicate stronger focus areas,
            while absent or low bars may represent opportunities for expanded programming.
          </p>
        </div>
      )}
    </>
  )
}






