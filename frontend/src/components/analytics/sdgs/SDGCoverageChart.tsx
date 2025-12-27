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
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Layout, AlertCircle } from 'lucide-react'
import { SDG_GOALS } from '@/data/sdg-targets'

interface SDGCoverageChartProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
}

interface CoverageData {
  sdgGoal: number
  sdgName: string
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

type ChartOrientation = 'vertical' | 'horizontal'

export function SDGCoverageChart({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  refreshKey
}: SDGCoverageChartProps) {
  const [data, setData] = useState<CoverageData[]>([])
  const [loading, setLoading] = useState(true)
  const [orientation, setOrientation] = useState<ChartOrientation>('vertical')

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
            SDG {data.sdgGoal} – {goal?.name || data.sdgName}
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SDG Coverage by Activities</CardTitle>
            <CardDescription>
              {getMetricLabel()} mapped to each SDG. Values are equally split when activities map to multiple SDGs.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={orientation === 'vertical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrientation('vertical')}
            >
              <Layout className="h-4 w-4 mr-2" />
              Vertical
            </Button>
            <Button
              variant={orientation === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrientation('horizontal')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Horizontal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          {orientation === 'vertical' ? (
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickFormatter={metric === 'activities' ? (v) => v.toFixed(0) : formatCurrency}
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const goal = SDG_GOALS.find(g => g.id === entry.sdgGoal)
                  return (
                    <Cell key={`cell-${index}`} fill={goal?.color || '#64748b'} />
                  )
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={metric === 'activities' ? (v) => v.toFixed(0) : formatCurrency}
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                type="category"
                dataKey="sdgGoal"
                tickFormatter={(value) => {
                  const goal = SDG_GOALS.find(g => g.id === value)
                  return `SDG ${value} – ${goal?.name || ''}`
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                width={180}
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
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}





