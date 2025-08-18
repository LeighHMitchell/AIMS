"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Target, CheckCircle2, XCircle, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface DevelopmentIndicatorData {
  indicator: string
  indicatorName: string
  yes_count: number
  no_count: number
  yes_percentage: number
  total_activities: number
}

interface OutcomeIndicatorData {
  range: string
  count: number
  percentage: number
}

interface DevelopmentIndicatorsChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
}

const INDICATOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
const OUTCOME_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#059669']

export function DevelopmentIndicatorsChart({ dateRange, filters, refreshKey }: DevelopmentIndicatorsChartProps) {
  const [indicators, setIndicators] = useState<DevelopmentIndicatorData[]>([])
  const [outcomeIndicators, setOutcomeIndicators] = useState<OutcomeIndicatorData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        donor: filters.donor,
        sector: filters.sector,
        country: filters.country,
        implementingPartner: filters.implementingPartner
      })

      const response = await fetch(`/api/aid-effectiveness/development-indicators?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setIndicators(result.indicators || [])
        setOutcomeIndicators(result.outcomeIndicators || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch development indicators data')
        setIndicators([])
        setOutcomeIndicators([])
      }
    } catch (error) {
      console.error('Error fetching development indicators data:', error)
      setIndicators([])
      setOutcomeIndicators([])
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{data.indicatorName}</p>
          <p className="text-sm text-green-600">
            Yes: {data.yes_count} ({data.yes_percentage}%)
          </p>
          <p className="text-sm text-red-600">
            No: {data.no_count} ({100 - data.yes_percentage}%)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Total activities: {data.total_activities}
          </p>
        </div>
      )
    }
    return null
  }

  const OutcomeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{data.range} Indicators</p>
          <p className="text-sm text-slate-600">
            {data.count} activities ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Most Adopted</p>
                  <p className="text-lg font-bold text-green-900">{summary.most_adopted?.indicatorName}</p>
                  <p className="text-sm text-green-700">{summary.most_adopted?.yes_percentage}% compliance</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Least Adopted</p>
                  <p className="text-lg font-bold text-red-900">{summary.least_adopted?.indicatorName}</p>
                  <p className="text-sm text-red-700">{summary.least_adopted?.yes_percentage}% compliance</p>
                </div>
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Average Compliance</p>
                  <p className="text-lg font-bold text-blue-900">{summary.avg_yes_percentage}%</p>
                  <p className="text-sm text-blue-700">Across all indicators</p>
                </div>
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development Effectiveness Indicators */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Development Effectiveness Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={indicators} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="indicatorName" 
                  stroke="#64748b"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="yes_percentage" 
                  radius={[4, 4, 0, 0]}
                >
                  {indicators.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={INDICATOR_COLORS[index % INDICATOR_COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome Indicators Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Outcome Indicators Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeIndicators}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {outcomeIndicators.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<OutcomeTooltip />} />
                <Legend 
                  formatter={(value: any, entry: any) => `${entry?.payload?.range || ''} (${entry?.payload?.percentage || 0}%)`}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Indicator Breakdown */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-700">Detailed Indicator Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {indicators.map((indicator, index) => (
              <div key={indicator.indicator} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{indicator.indicatorName}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{indicator.yes_count} Yes ({indicator.yes_percentage}%)</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>{indicator.no_count} No ({100 - indicator.yes_percentage}%)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={indicator.yes_percentage >= 70 ? "default" : indicator.yes_percentage >= 50 ? "secondary" : "destructive"}
                    className={
                      indicator.yes_percentage >= 70 ? "bg-green-100 text-green-800" :
                      indicator.yes_percentage >= 50 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }
                  >
                    {indicator.yes_percentage >= 70 ? 'Excellent' : 
                     indicator.yes_percentage >= 50 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: INDICATOR_COLORS[index % INDICATOR_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
