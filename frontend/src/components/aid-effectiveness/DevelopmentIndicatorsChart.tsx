"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
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
import { apiFetch } from '@/lib/api-fetch';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'

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

const INDICATOR_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']
const OUTCOME_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']

export function DevelopmentIndicatorsChart({ dateRange, filters, refreshKey }: DevelopmentIndicatorsChartProps) {
  const [indicators, setIndicators] = useState<DevelopmentIndicatorData[]>([])
  const [outcomeIndicators, setOutcomeIndicators] = useState<OutcomeIndicatorData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'pct' | 'name'>('pct')

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

      const response = await apiFetch(`/api/aid-effectiveness/development-indicators?${params}`)
      
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <ChartTooltipCard
        title={d.indicatorName}
        subtitle={`${d.total_activities} activities`}
        rows={[
          { label: 'Yes', value: `${d.yes_count} (${d.yes_percentage}%)`, color: '#F37021' },
          { label: 'No', value: `${d.no_count} (${100 - d.yes_percentage}%)` },
        ]}
      />
    )
  }

  const OutcomeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <ChartTooltipCard
        title={`${d.range} indicators`}
        rows={[
          { label: 'Activities', value: d.count, color: '#F37021' },
          { label: 'Share', value: `${d.percentage}%` },
        ]}
      />
    )
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
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Most Adopted</p>
                  <p className="text-lg font-bold text-foreground">{summary.most_adopted?.indicatorName}</p>
                  <p className="text-body text-muted-foreground">{summary.most_adopted?.yes_percentage}% compliance</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Least Adopted</p>
                  <p className="text-lg font-bold text-foreground">{summary.least_adopted?.indicatorName}</p>
                  <p className="text-body text-muted-foreground">{summary.least_adopted?.yes_percentage}% compliance</p>
                </div>
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Average Compliance</p>
                  <p className="text-lg font-bold text-foreground">{summary.avg_yes_percentage}%</p>
                  <p className="text-body text-muted-foreground">Across all indicators</p>
                </div>
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development Effectiveness Indicators */}
        {(() => {
          const sortedIndicators = [...indicators].sort((a, b) =>
            sortBy === 'pct' ? b.yes_percentage - a.yes_percentage : a.indicatorName.localeCompare(b.indicatorName)
          )
          const devChart = (height: number) => (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={sortedIndicators} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="indicatorName" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={100} interval={0} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="yes_percentage" radius={[4, 4, 0, 0]}>
                  {sortedIndicators.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INDICATOR_COLORS[index % INDICATOR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                    Development Effectiveness Indicators
                  </CardTitle>
                  <ChartExpandButton
                    title="Development Effectiveness Indicators"
                    interpretation="Five development-effectiveness checkpoints sorted by adoption. A bar above 80% is embedded portfolio practice; 50–80% means uneven adoption with one or two donors driving the average; below 50% is a principle most donors aren't applying yet. The 'Linked to Government Framework' bar is the bellwether — when it dips below the others, country-led planning is being bypassed. The 'Final Evaluation Planned' bar tells you whether learning loops will close on these activities."
                    controls={
                      <div className="flex flex-col gap-1">
                        <Label className="text-helper text-muted-foreground">Sort by</Label>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'pct' | 'name')}>
                          <SelectTrigger className="h-9 w-[160px] text-helper">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <CodedSelectItem value="pct" code="1">Adoption</CodedSelectItem>
                            <CodedSelectItem value="name" code="2">Indicator</CodedSelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    }
                    csv={() => ({
                      filename: 'development-effectiveness-indicators.csv',
                      headers: ['Indicator', 'Yes', 'No', 'Yes %', 'Total'],
                      rows: sortedIndicators.map((d) => [d.indicatorName, d.yes_count, d.no_count, d.yes_percentage, d.total_activities]),
                    })}
                    render={(h) => devChart(h)}
                  />
                </div>
              </CardHeader>
              <CardContent>{devChart(300)}</CardContent>
            </Card>
          )
        })()}

        {/* Outcome Indicators Distribution */}
        {(() => {
          const outcomePie = (height: number, inner: number, outer: number) => (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie data={outcomeIndicators} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer} paddingAngle={2} dataKey="count">
                  {outcomeIndicators.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<OutcomeTooltip />} />
                <Legend formatter={(value: any, entry: any) => `${entry?.payload?.range || ''} (${entry?.payload?.percentage || 0}%)`} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                    Outcome Indicators Distribution
                  </CardTitle>
                  <ChartExpandButton
                    title="Outcome Indicators Distribution"
                    interpretation="The '0' slice is the actionable number — those activities have no government-defined outcome indicators on their results framework at all. A 'None' slice over 25% is a serious results-measurement gap and the priority for strengthening M&E discipline. A heavy '10+' slice usually signals output counts mislabelled as outcomes, not stronger monitoring; spot-check those activities to confirm. The 3–5 indicator middle band is generally the sweet spot for measuring outcomes without overwhelming implementation teams with reporting."
                    csv={() => ({
                      filename: 'outcome-indicators-distribution.csv',
                      headers: ['Range', 'Activities', '%'],
                      rows: outcomeIndicators.map((d) => [d.range, d.count, d.percentage]),
                    })}
                    render={(h) => outcomePie(h, Math.round(h * 0.2), Math.round(h * 0.4))}
                  />
                </div>
              </CardHeader>
              <CardContent>{outcomePie(300, 60, 120)}</CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Detailed Indicator Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Detailed Indicator Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {indicators.map((indicator, index) => (
              <div key={indicator.indicator} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{indicator.indicatorName}</h4>
                  <div className="flex items-center gap-4 mt-2 text-body">
                    <div className="flex items-center gap-1 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span>{indicator.yes_count} Yes ({indicator.yes_percentage}%)</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{indicator.no_count} No ({100 - indicator.yes_percentage}%)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={indicator.yes_percentage >= 70 ? "default" : indicator.yes_percentage >= 50 ? "secondary" : "destructive"}
                    className={
                      indicator.yes_percentage >= 70 ? "bg-muted text-foreground" :
                      indicator.yes_percentage >= 50 ? "bg-muted text-foreground" :
                      "bg-muted text-muted-foreground"
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
