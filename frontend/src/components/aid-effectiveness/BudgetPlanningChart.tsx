"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { BarChart3, FileText, Calendar, TrendingUp, Eye } from 'lucide-react'
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

interface BudgetPlanningData {
  category: string
  annual_budget_shared: number
  forward_plan_shared: number
  both_shared: number
  none_shared: number
  total_activities: number
  transparency_score: number
}

interface BudgetPlanningChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
}

const TRANSPARENCY_COLORS = {
  both: '#10b981',      // Green
  annual: '#3b82f6',    // Blue  
  forward: '#8b5cf6',   // Purple
  none: '#ef4444'       // Red
}

export function BudgetPlanningChart({ dateRange, filters, refreshKey }: BudgetPlanningChartProps) {
  const [data, setData] = useState<BudgetPlanningData[]>([])
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

      const response = await fetch(`/api/aid-effectiveness/budget-planning?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch budget planning data')
        setData([])
      }
    } catch (error) {
      console.error('Error fetching budget planning data:', error)
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
          <p className="text-sm text-slate-600 mb-2">Transparency Score: {data.transparency_score}%</p>
          <div className="space-y-1 text-xs">
            <p className="text-green-600">Both Shared: {data.both_shared}</p>
            <p className="text-blue-600">Annual Only: {data.annual_budget_shared}</p>
            <p className="text-purple-600">Forward Only: {data.forward_plan_shared}</p>
            <p className="text-red-600">None Shared: {data.none_shared}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Total: {data.total_activities} activities</p>
        </div>
      )
    }
    return null
  }

  // Prepare data for stacked bar chart (showing counts)
  const stackedData = data.map(item => ({
    ...item,
    name: item.category.length > 15 ? item.category.substring(0, 15) + '...' : item.category
  }))

  // Prepare overall summary for pie chart
  const overallPieData = summary ? [
    { 
      name: 'Both Shared', 
      value: summary.both_shared_percentage, 
      count: data.reduce((sum, d) => sum + d.both_shared, 0),
      description: 'Annual budget and forward plan shared'
    },
    { 
      name: 'Annual Only', 
      value: summary.annual_budget_percentage - summary.both_shared_percentage, 
      count: data.reduce((sum, d) => sum + d.annual_budget_shared, 0),
      description: 'Only annual budget shared'
    },
    { 
      name: 'Forward Only', 
      value: summary.forward_plan_percentage - summary.both_shared_percentage, 
      count: data.reduce((sum, d) => sum + d.forward_plan_shared, 0),
      description: 'Only forward plan shared'
    },
    { 
      name: 'None Shared', 
      value: summary.none_shared_percentage, 
      count: data.reduce((sum, d) => sum + d.none_shared, 0),
      description: 'No budget information shared'
    }
  ].filter(item => item.value > 0) : []

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
          <FileText className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Budget Planning & Transparency</h3>
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

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-800">Transparency Score</p>
                  <p className="text-2xl font-bold text-indigo-900">{summary.overall_transparency_score}%</p>
                </div>
                <Eye className="h-6 w-6 text-indigo-600" />
              </div>
              <Progress value={summary.overall_transparency_score} className="mt-2 bg-indigo-200 [&>div]:bg-indigo-600" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Annual Budget</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.annual_budget_percentage}%</p>
                </div>
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Forward Plan</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.forward_plan_percentage}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Both Shared</p>
                  <p className="text-2xl font-bold text-green-900">{summary.both_shared_percentage}%</p>
                </div>
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">Budget Sharing Distribution</CardTitle>
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
                      fill={TRANSPARENCY_COLORS[entry.name.toLowerCase().replace(' ', '_') as keyof typeof TRANSPARENCY_COLORS] || '#64748b'} 
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

        {/* Transparency Scores by Category */}
        {groupBy !== 'overall' && data.length > 0 && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-slate-700">
                Transparency Scores by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
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
                  <Bar 
                    dataKey="transparency_score" 
                    radius={[4, 4, 0, 0]}
                    fill="#4f46e5"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Breakdown */}
      {groupBy !== 'overall' && data.length > 0 && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.slice(0, 10).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{item.category}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-green-600">Both: {item.both_shared}</span>
                      <span className="text-blue-600">Annual: {item.annual_budget_shared}</span>
                      <span className="text-purple-600">Forward: {item.forward_plan_shared}</span>
                      <span className="text-red-600">None: {item.none_shared}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{item.transparency_score}%</p>
                      <p className="text-xs text-slate-600">Transparency</p>
                    </div>
                    <Badge 
                      variant={item.transparency_score >= 80 ? "default" : item.transparency_score >= 60 ? "secondary" : "destructive"}
                      className={
                        item.transparency_score >= 80 ? "bg-green-100 text-green-800" :
                        item.transparency_score >= 60 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }
                    >
                      {item.transparency_score >= 80 ? 'Excellent' : 
                       item.transparency_score >= 60 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      {summary && summary.best_performer && summary.needs_improvement && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Best Transparency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-green-900">{summary.best_performer.category}</p>
              <p className="text-sm text-green-700">
                {summary.best_performer.transparency_score}% transparency score
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs text-green-600">
                  Both: {summary.best_performer.both_shared} | 
                  Annual: {summary.best_performer.annual_budget_shared} | 
                  Forward: {summary.best_performer.forward_plan_shared}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-red-900">{summary.needs_improvement.category}</p>
              <p className="text-sm text-red-700">
                {summary.needs_improvement.transparency_score}% transparency score
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs text-red-600">
                  None shared: {summary.needs_improvement.none_shared} activities
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Recommendations */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-indigo-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Key Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-indigo-900 mb-2">Transparency Best Practices</h4>
              <ul className="space-y-1 text-indigo-800">
                <li>• Share both annual budgets and forward spending plans</li>
                <li>• Provide detailed, disaggregated budget information</li>
                <li>• Update budget information regularly and proactively</li>
                <li>• Use standardized formats for budget sharing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-indigo-900 mb-2">Areas for Improvement</h4>
              <ul className="space-y-1 text-indigo-800">
                {summary && summary.overall_transparency_score < 70 && (
                  <li>• Overall transparency score below 70% target</li>
                )}
                {summary && summary.none_shared_percentage > 20 && (
                  <li>• {summary.none_shared_percentage}% of activities share no budget info</li>
                )}
                {summary && summary.both_shared_percentage < 50 && (
                  <li>• Only {summary.both_shared_percentage}% share both annual and forward plans</li>
                )}
                <li>• Encourage more comprehensive budget transparency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
