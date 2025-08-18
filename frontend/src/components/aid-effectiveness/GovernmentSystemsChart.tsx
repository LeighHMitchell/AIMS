"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Building2, TrendingUp, TrendingDown } from 'lucide-react'
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

interface GovernmentSystemData {
  system: string
  systemName: string
  usage_count: number
  usage_percentage: number
  total_activities: number
}

interface GovernmentSystemsChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
}

const SYSTEM_COLORS = {
  budget: '#3b82f6',      // Blue
  financial: '#10b981',   // Green
  audit: '#f59e0b',       // Orange
  procurement: '#8b5cf6'  // Purple
}

export function GovernmentSystemsChart({ dateRange, filters, refreshKey }: GovernmentSystemsChartProps) {
  const [data, setData] = useState<GovernmentSystemData[]>([])
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

      const response = await fetch(`/api/aid-effectiveness/government-systems?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch government systems data')
        setData([])
      }
    } catch (error) {
      console.error('Error fetching government systems data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{data.systemName}</p>
          <p className="text-sm text-slate-600">
            Usage: {data.usage_count} of {data.total_activities} activities ({data.usage_percentage}%)
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
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No government systems data available</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Highest Usage</p>
                  <p className="text-lg font-bold text-blue-900">{summary.highest_usage?.systemName}</p>
                  <p className="text-sm text-blue-700">{summary.highest_usage?.usage_percentage}% adoption</p>
                </div>
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Lowest Usage</p>
                  <p className="text-lg font-bold text-orange-900">{summary.lowest_usage?.systemName}</p>
                  <p className="text-sm text-orange-700">{summary.lowest_usage?.usage_percentage}% adoption</p>
                </div>
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Average Usage</p>
                  <p className="text-lg font-bold text-slate-900">{summary.average_usage}%</p>
                  <p className="text-sm text-slate-700">Across all systems</p>
                </div>
                <Building2 className="h-6 w-6 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Government Systems Usage</h3>
          <p className="text-sm text-slate-600">
            Percentage of activities using each government system
          </p>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="systemName" 
              stroke="#64748b"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="usage_percentage" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={SYSTEM_COLORS[entry.system as keyof typeof SYSTEM_COLORS] || '#64748b'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((system) => (
          <Card key={system.system} className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: SYSTEM_COLORS[system.system as keyof typeof SYSTEM_COLORS] }} />
                {system.systemName}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">{system.usage_percentage}%</span>
                  <Badge 
                    variant={system.usage_percentage >= 50 ? "default" : "secondary"}
                    className={system.usage_percentage >= 50 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                  >
                    {system.usage_percentage >= 50 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                
                <Progress 
                  value={system.usage_percentage} 
                  className="bg-slate-200"
                  style={{ 
                    ['--progress-foreground' as any]: SYSTEM_COLORS[system.system as keyof typeof SYSTEM_COLORS] 
                  }}
                />
                
                <p className="text-xs text-slate-600">
                  {system.usage_count} of {system.total_activities} activities
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-blue-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Strong Performance</h4>
              <ul className="space-y-1 text-blue-800">
                {data.filter(s => s.usage_percentage >= 70).map(system => (
                  <li key={system.system}>• {system.systemName}: {system.usage_percentage}%</li>
                ))}
                {data.filter(s => s.usage_percentage >= 70).length === 0 && (
                  <li className="text-blue-600">No systems with 70%+ usage</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Improvement Needed</h4>
              <ul className="space-y-1 text-blue-800">
                {data.filter(s => s.usage_percentage < 50).map(system => (
                  <li key={system.system}>• {system.systemName}: {system.usage_percentage}%</li>
                ))}
                {data.filter(s => s.usage_percentage < 50).length === 0 && (
                  <li className="text-blue-600">All systems have 50%+ usage</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
