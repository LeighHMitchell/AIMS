"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
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
import { apiFetch } from '@/lib/api-fetch'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'

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
  both: '#1e293b',      // Slate 800
  annual: '#475569',    // Slate 600
  forward: '#94a3b8',   // Slate 400
  none: '#cbd5e1'       // Slate 300
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

      const response = await apiFetch(`/api/aid-effectiveness/budget-planning?${params}`)
      
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <ChartTooltipCard
        title={d.category}
        subtitle={`${d.total_activities} activities · transparency ${d.transparency_score}%`}
        rows={[
          { label: 'Both shared', value: d.both_shared, color: TRANSPARENCY_COLORS.both },
          { label: 'Annual only', value: d.annual_budget_shared, color: TRANSPARENCY_COLORS.annual },
          { label: 'Forward only', value: d.forward_plan_shared, color: TRANSPARENCY_COLORS.forward },
          { label: 'None shared', value: d.none_shared, color: TRANSPARENCY_COLORS.none },
        ]}
      />
    )
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
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Budget Planning & Transparency</h3>
        </div>
        
        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Group by</Label>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <CodedSelectItem value="overall" code="1">Overall</CodedSelectItem>
              <CodedSelectItem value="donor" code="2">By Development Partner</CodedSelectItem>
              <CodedSelectItem value="sector" code="3">By Sector</CodedSelectItem>
              <CodedSelectItem value="country" code="4">By Country</CodedSelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Transparency Score</p>
                  <p className="text-2xl font-bold text-foreground">{summary.overall_transparency_score}%</p>
                </div>
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
              <Progress value={summary.overall_transparency_score} className="mt-2 bg-muted [&>div]:bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Annual Budget</p>
                  <p className="text-2xl font-bold text-foreground">{summary.annual_budget_percentage}%</p>
                </div>
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Forward Plan</p>
                  <p className="text-2xl font-bold text-foreground">{summary.forward_plan_percentage}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Both Shared</p>
                  <p className="text-2xl font-bold text-foreground">{summary.both_shared_percentage}%</p>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Distribution */}
        {(() => {
          const budgetPie = (height: number, inner: number, outer: number) => (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie data={overallPieData} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer} paddingAngle={2} dataKey="value">
                  {overallPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TRANSPARENCY_COLORS[entry.name.toLowerCase().replace(' ', '_') as keyof typeof TRANSPARENCY_COLORS] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any, props: any) => [`${props.payload.count} activities (${value}%)`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium text-foreground">Budget Sharing Distribution</CardTitle>
                  <ChartExpandButton
                    title="Budget Sharing Distribution"
                    interpretation="Two GPEDC commitments hide in this pie: annual budget sharing (Indicator 5b) and forward-plan sharing (Indicator 6). Activities in the 'Both shared' slice meet both fully — that's the target. The 'None shared' slice is the highest-priority issue: recipient governments can't plan against funding they don't know is coming. If 'None' is larger than 'Both', predictability is the principle to tackle first. The two single-slice categories ('Annual only', 'Forward only') usually shrink as donors mature their reporting practice."
                    csv={() => ({
                      filename: 'budget-sharing-distribution.csv',
                      headers: ['Status', 'Activities', '%'],
                      rows: overallPieData.map((d) => [d.name, d.count, d.value]),
                    })}
                    render={(h) => budgetPie(h, Math.round(h * 0.2), Math.round(h * 0.4))}
                  />
                </div>
              </CardHeader>
              <CardContent>{budgetPie(250, 50, 100)}</CardContent>
            </Card>
          )
        })()}

        {/* Transparency Scores by Category */}
        {groupBy !== 'overall' && data.length > 0 && (() => {
          const transparencyBar = (height: number) => (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="transparency_score" radius={[4, 4, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          )
          const title = `Transparency Scores by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium text-foreground">{title}</CardTitle>
                  <ChartExpandButton
                    title={title}
                    interpretation="Each row's bar is a composite transparency score (0–100) for one donor, sector, or country, blending annual budget sharing, forward-plan sharing, and the 'both' overlap. Bars below 40 are predictability black holes — the recipient government can't plan against that funding. The top bars are partners or sectors already honouring 5b/6 commitments fully, useful as practice exemplars. The biggest gains come from moving the bottom third of bars from 'Annual only' to 'Both shared'."
                    csv={() => ({
                      filename: `transparency-by-${groupBy}.csv`,
                      headers: ['Category', 'Both Shared', 'Annual Only', 'Forward Only', 'None Shared', 'Transparency %', 'Total'],
                      rows: stackedData.map((d: any) => [d.category, d.both_shared, d.annual_budget_shared, d.forward_plan_shared, d.none_shared, d.transparency_score, d.total_activities]),
                    })}
                    render={(h) => transparencyBar(h)}
                  />
                </div>
              </CardHeader>
              <CardContent>{transparencyBar(250)}</CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Detailed Breakdown */}
      {groupBy !== 'overall' && data.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.slice(0, 10).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{item.category}</h4>
                    <div className="flex items-center gap-4 mt-2 text-body">
                      <span className="text-foreground">Both: {item.both_shared}</span>
                      <span className="text-foreground">Annual: {item.annual_budget_shared}</span>
                      <span className="text-muted-foreground">Forward: {item.forward_plan_shared}</span>
                      <span className="text-muted-foreground">None: {item.none_shared}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{item.transparency_score}%</p>
                      <p className="text-helper text-muted-foreground">Transparency</p>
                    </div>
                    <Badge 
                      variant={item.transparency_score >= 80 ? "default" : item.transparency_score >= 60 ? "secondary" : "destructive"}
                      className={
                        item.transparency_score >= 80 ? "bg-muted text-foreground" :
                        item.transparency_score >= 60 ? "bg-muted text-foreground" :
                        "bg-muted text-muted-foreground"
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
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardHeader>
              <CardTitle className="text-body font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Best Transparency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-foreground">{summary.best_performer.category}</p>
              <p className="text-body text-muted-foreground">
                {summary.best_performer.transparency_score}% transparency score
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-helper text-muted-foreground">
                  Both: {summary.best_performer.both_shared} |
                  Annual: {summary.best_performer.annual_budget_shared} |
                  Forward: {summary.best_performer.forward_plan_shared}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardHeader>
              <CardTitle className="text-body font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-foreground">{summary.needs_improvement.category}</p>
              <p className="text-body text-muted-foreground">
                {summary.needs_improvement.transparency_score}% transparency score
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-helper text-muted-foreground">
                  None shared: {summary.needs_improvement.none_shared} activities
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Recommendations */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Key Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Transparency Best Practices</h4>
              <ul className="space-y-1 text-foreground">
                <li>• Share both annual budgets and forward spending plans</li>
                <li>• Provide detailed, disaggregated budget information</li>
                <li>• Update budget information regularly and proactively</li>
                <li>• Use standardized formats for budget sharing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Areas for Improvement</h4>
              <ul className="space-y-1 text-foreground">
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
