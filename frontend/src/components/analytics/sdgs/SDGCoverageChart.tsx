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
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { SDG_GOALS } from '@/data/sdg-targets'

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

  useEffect(() => {
    fetchData()
  }, [organizationId, dateRange, selectedSdgs, metric, refreshKey])

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

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const formatValue = (value: number) => {
    if (metric === 'activities') {
      return value.toFixed(1)
    }
    return formatCurrency(value)
  }

  const getMetricValue = (item: CoverageData) => {
    if (metric === 'activities') return item.activityCount
    if (metric === 'budget') return item.totalBudget
    return item.totalPlannedDisbursements
  }

  const getMetricLabel = () => {
    if (metric === 'activities') return 'Number of Activities'
    if (metric === 'budget') return 'Total Activity Budget (USD)'
    return 'Total Planned Disbursements (USD)'
  }

  const chartData = data.map(item => ({
    ...item,
    value: getMetricValue(item),
    label: `SDG ${item.sdgGoal}`
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const goal = SDG_GOALS.find(g => g.id === data.sdgGoal)

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900 mb-2">
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">SDG {data.sdgGoal}</span>
            <span className="ml-2">{goal?.name || data.sdgName}</span>
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Activities:</span>
              <span className="font-medium">{data.activityCount.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Total Budget:</span>
              <span className="font-medium">{formatCurrency(data.totalBudget)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Planned Disbursements:</span>
              <span className="font-medium">{formatCurrency(data.totalPlannedDisbursements)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 text-xs text-slate-500 italic">
              Values are equally split when activities map to multiple SDGs
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom Y-axis tick with SDG code and label - wraps long names
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const goal = SDG_GOALS.find(g => g.id === payload.value)
    const goalName = goal?.name || ''

    // Check if we need to wrap
    const maxLength = 25
    const needsWrap = goalName.length > maxLength

    let line1 = goalName
    let line2 = ''

    if (needsWrap) {
      const words = goalName.split(' ')
      let currentLine = ''
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxLength) {
          currentLine = (currentLine + ' ' + word).trim()
        } else {
          if (!line2) {
            line1 = currentLine
            currentLine = word
          } else {
            currentLine = currentLine + ' ' + word
          }
        }
      }
      line2 = currentLine
    }

    // Calculate badge width based on SDG number
    const badgeText = `SDG ${payload.value}`
    const badgeWidth = badgeText.length * 6 + 8
    const labelWidth = line1.length * 6

    return (
      <g transform={`translate(${x},${y})`}>
        {/* Gray background for SDG code */}
        <rect
          x={-5 - labelWidth - 6 - badgeWidth}
          y={needsWrap ? -10 : -4}
          width={badgeWidth}
          height={16}
          rx={3}
          fill="#f1f5f9"
        />
        <text x={-5 - labelWidth - 6 - badgeWidth + 4} y={needsWrap ? 2 : 8} textAnchor="start" fontSize={9} fontFamily="monospace" fill="#475569">
          {badgeText}
        </text>
        {/* Label text */}
        <text x={-5} y={needsWrap ? -2 : 4} textAnchor="end" fontSize={10} fill="#64748b">
          {line1}
        </text>
        {needsWrap && (
          <text x={-5} y={10} textAnchor="end" fontSize={10} fill="#64748b">
            {line2}
          </text>
        )}
      </g>
    )
  }

  // Custom Y-axis tick for compact mode - wraps long names
  const CompactYAxisTick = ({ x, y, payload }: any) => {
    const goal = SDG_GOALS.find(g => g.id === payload.value)
    const goalName = goal?.name || ''

    // Check if we need to wrap
    const maxLength = 18
    const needsWrap = goalName.length > maxLength

    let line1 = goalName
    let line2 = ''

    if (needsWrap) {
      const words = goalName.split(' ')
      let currentLine = ''
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxLength) {
          currentLine = (currentLine + ' ' + word).trim()
        } else {
          if (!line2) {
            line1 = currentLine
            currentLine = word
          } else {
            currentLine = currentLine + ' ' + word
          }
        }
      }
      line2 = currentLine
    }

    // Calculate badge width based on SDG number
    const badgeText = `SDG ${payload.value}`
    const badgeWidth = badgeText.length * 4.5 + 6
    const labelWidth = line1.length * 4.5

    return (
      <g transform={`translate(${x},${y})`}>
        {/* Gray background for SDG code */}
        <rect
          x={-5 - labelWidth - 4 - badgeWidth}
          y={needsWrap ? -9 : -5}
          width={badgeWidth}
          height={14}
          rx={2}
          fill="#f1f5f9"
        />
        <text x={-5 - labelWidth - 4 - badgeWidth + 3} y={needsWrap ? 1 : 5} textAnchor="start" fontSize={7} fontFamily="monospace" fill="#475569">
          {badgeText}
        </text>
        {/* Label text */}
        <text x={-5} y={needsWrap ? -2 : 3} textAnchor="end" fontSize={8} fill="#64748b">
          {line1}
        </text>
        {needsWrap && (
          <text x={-5} y={8} textAnchor="end" fontSize={8} fill="#64748b">
            {line2}
          </text>
        )}
      </g>
    )
  }

  // Compact mode renders just the chart without Card wrapper and filters
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
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
            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
            <XAxis
              type="number"
              fontSize={9}
              tick={{ fill: '#64748b' }}
              tickFormatter={(v) => metric === 'activities' ? v.toFixed(1) : formatCurrency(v)}
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Coverage by Activities</CardTitle>
          <CardDescription>Number of activities and financial weight mapped to each SDG</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Coverage by Activities</CardTitle>
          <CardDescription>Number of activities and financial weight mapped to each SDG</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No SDG data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle>SDG Coverage</CardTitle>
        <CardDescription className="mt-1">
          Activity distribution across Sustainable Development Goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={550}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={metric === 'activities' ? (v) => v.toFixed(1) : formatCurrency}
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

        {/* Explanatory paragraph */}
        <div className="mt-6">
          <p className="text-sm text-slate-500 leading-relaxed">
            This chart shows how the organization&apos;s aid activities align with the 17 UN Sustainable Development Goals.
            Each bar represents the number of activities (or financial value) mapped to that SDG. When an activity addresses
            multiple SDGs, its value is split equally across those goals to avoid double-counting. Use this visualization to
            identify the organization&apos;s priority development areas, spot potential gaps in SDG coverage, and understand
            how aid flows are distributed across global development objectives. Higher bars indicate stronger focus areas,
            while absent or low bars may represent opportunities for expanded programming.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}






