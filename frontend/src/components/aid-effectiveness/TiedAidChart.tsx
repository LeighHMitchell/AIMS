"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe, Handshake, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
import { apiFetch } from '@/lib/api-fetch'

interface TiedAidData {
  category: string
  tied_count: number
  untied_count: number
  partially_tied_count: number
  tied_percentage: number
  untied_percentage: number
  partially_tied_percentage: number
  total_activities: number
}

interface TiedAidChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
}

const TIED_COLORS = {
  tied: '#94a3b8',           // Slate 400 (lightest - tied)
  untied: '#1e293b',         // Slate 800 (darkest - untied)
  partially_tied: '#64748b'  // Slate 500 (mid - partially tied)
}

export function TiedAidChart({ dateRange, filters, refreshKey }: TiedAidChartProps) {
  const [data, setData] = useState<TiedAidData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [groupBy, setGroupBy] = useState('overall')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, groupBy])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        donor: filters.donor,
        sector: filters.sector,
        country: filters.country,
        implementingPartner: filters.implementingPartner,
        groupBy
      })

      const response = await apiFetch(`/api/aid-effectiveness/tied-aid?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch tied aid data')
        setData([])
      }
    } catch (error) {
      console.error('Error fetching tied aid data:', error)
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
          <p className="font-semibold text-slate-900">{data.category}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-900">Untied: {data.untied_count} ({data.untied_percentage}%)</p>
            <p className="text-slate-600">Partially Tied: {data.partially_tied_count} ({data.partially_tied_percentage}%)</p>
            <p className="text-slate-400">Tied: {data.tied_count} ({data.tied_percentage}%)</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Total: {data.total_activities} activities</p>
        </div>
      )
    }
    return null
  }

  // Prepare data for stacked bar chart
  const stackedData = data.map(item => ({
    ...item,
    name: item.category.length > 15 ? item.category.substring(0, 15) + '...' : item.category
  }))

  // Prepare overall summary for pie chart
  const overallPieData = summary ? [
    { name: 'Untied', value: summary.overall_untied_percentage, count: data.reduce((sum, d) => sum + d.untied_count, 0) },
    { name: 'Partially Tied', value: summary.overall_partially_tied_percentage, count: data.reduce((sum, d) => sum + d.partially_tied_count, 0) },
    { name: 'Tied', value: summary.overall_tied_percentage, count: data.reduce((sum, d) => sum + d.tied_count, 0) }
  ] : []

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
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-900">Aid Tying Analysis</h3>
        </div>
        
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Group by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Overall</SelectItem>
            <SelectItem value="donor">By Donor</SelectItem>
            <SelectItem value="sector">By Sector</SelectItem>
            <SelectItem value="country">By Country</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Untied Aid</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.overall_untied_percentage}%</p>
                  <p className="text-sm text-slate-500">Best practice compliance</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Partially Tied</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.overall_partially_tied_percentage}%</p>
                  <p className="text-sm text-slate-500">Some restrictions</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Tied Aid</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.overall_tied_percentage}%</p>
                  <p className="text-sm text-slate-500">Needs improvement</p>
                </div>
                <Handshake className="h-6 w-6 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">Overall Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={overallPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {overallPieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={TIED_COLORS[entry.name.toLowerCase().replace(' ', '_') as keyof typeof TIED_COLORS] || '#64748b'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${props.payload.count} activities (${value}%)`, 
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breakdown by Category */}
        {groupBy !== 'overall' && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-slate-700">
                Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={10}
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
                  <Bar dataKey="untied_percentage" stackId="tied" fill={TIED_COLORS.untied} />
                  <Bar dataKey="partially_tied_percentage" stackId="tied" fill={TIED_COLORS.partially_tied} />
                  <Bar dataKey="tied_percentage" stackId="tied" fill={TIED_COLORS.tied} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Insights */}
      {summary && summary.best_performer && summary.needs_improvement && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                Best Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-slate-900">{summary.best_performer.category}</p>
              <p className="text-sm text-slate-600">
                {summary.best_performer.untied_percentage}% untied aid
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {summary.best_performer.untied_count} of {summary.best_performer.total_activities} activities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-slate-900">{summary.needs_improvement.category}</p>
              <p className="text-sm text-slate-600">
                {summary.needs_improvement.tied_percentage}% tied aid
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {summary.needs_improvement.tied_count} of {summary.needs_improvement.total_activities} activities
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
