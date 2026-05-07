"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
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
import { apiFetch } from '@/lib/api-fetch'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'

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
  budget: '#1e293b',      // Slate 800
  financial: '#334155',   // Slate 700
  audit: '#64748b',       // Slate 500
  procurement: '#94a3b8'  // Slate 400
}

export function GovernmentSystemsChart({ dateRange, filters, refreshKey }: GovernmentSystemsChartProps) {
  const [data, setData] = useState<GovernmentSystemData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'usage' | 'name'>('usage')

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

      const response = await apiFetch(`/api/aid-effectiveness/government-systems?${params}`)
      
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <ChartTooltipCard
        title={d.systemName}
        rows={[
          { label: 'Usage', value: `${d.usage_count} / ${d.total_activities}`, color: '#F37021' },
          { label: 'Share', value: `${d.usage_percentage}%` },
        ]}
      />
    )
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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No government systems data available</p>
          <p className="text-body">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Highest Usage</p>
                  <p className="text-lg font-bold text-foreground">{summary.highest_usage?.systemName}</p>
                  <p className="text-body text-muted-foreground">{summary.highest_usage?.usage_percentage}% adoption</p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Lowest Usage</p>
                  <p className="text-lg font-bold text-foreground">{summary.lowest_usage?.systemName}</p>
                  <p className="text-body text-muted-foreground">{summary.lowest_usage?.usage_percentage}% adoption</p>
                </div>
                <TrendingDown className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Average Usage</p>
                  <p className="text-lg font-bold text-foreground">{summary.average_usage}%</p>
                  <p className="text-body text-muted-foreground">Across all systems</p>
                </div>
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      {(() => {
        const sortedData = [...data].sort((a, b) =>
          sortBy === 'usage' ? b.usage_percentage - a.usage_percentage : a.systemName.localeCompare(b.systemName)
        )
        const sysChart = (height: number) => (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="systemName" stroke="#64748b" fontSize={12} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="usage_percentage" radius={[4, 4, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SYSTEM_COLORS[entry.system as keyof typeof SYSTEM_COLORS] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
        return (
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="mb-6 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Government Systems Usage</h3>
                <p className="text-body text-muted-foreground">Percentage of activities using each government system</p>
              </div>
              <ChartExpandButton
                title="Government Systems Usage"
                description="Percentage of activities using each government system"
                interpretation="Four bars, four GPEDC 5a sub-commitments: budget execution, financial reporting, audit, and procurement. The lowest bar is the country PFM system donors trust least — usually procurement or audit. That's the area where strengthening country-system credibility (or addressing specific fiduciary-risk findings head-on) unlocks the biggest jump in alignment. Bars above 60% indicate working systems donors will route funds through; below 30% means parallel donor systems are still the default and country capacity isn't being built."
                controls={
                  <div className="flex flex-col gap-1">
                    <Label className="text-helper text-muted-foreground">Sort by</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'usage' | 'name')}>
                      <SelectTrigger className="h-9 w-[150px] text-helper">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <CodedSelectItem value="usage" code="1">Usage</CodedSelectItem>
                        <CodedSelectItem value="name" code="2">System</CodedSelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                }
                csv={() => ({
                  filename: 'government-systems-usage.csv',
                  headers: ['System', 'Usage Count', 'Total Activities', 'Usage %'],
                  rows: sortedData.map((d) => [d.systemName, d.usage_count, d.total_activities, d.usage_percentage]),
                })}
                render={(h) => sysChart(h)}
              />
            </div>
            {sysChart(400)}
          </div>
        )
      })()}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((system) => (
          <Card key={system.system} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-body font-medium text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: SYSTEM_COLORS[system.system as keyof typeof SYSTEM_COLORS] }} />
                {system.systemName}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{system.usage_percentage}%</span>
                  <Badge 
                    variant={system.usage_percentage >= 50 ? "default" : "secondary"}
                    className={system.usage_percentage >= 50 ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}
                  >
                    {system.usage_percentage >= 50 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                
                <Progress 
                  value={system.usage_percentage} 
                  className="bg-muted"
                  style={{ 
                    ['--progress-foreground' as any]: SYSTEM_COLORS[system.system as keyof typeof SYSTEM_COLORS] 
                  }}
                />
                
                <p className="text-helper text-muted-foreground">
                  {system.usage_count} of {system.total_activities} activities
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Strong Performance</h4>
              <ul className="space-y-1 text-foreground">
                {data.filter(s => s.usage_percentage >= 70).map(system => (
                  <li key={system.system}>• {system.systemName}: {system.usage_percentage}%</li>
                ))}
                {data.filter(s => s.usage_percentage >= 70).length === 0 && (
                  <li className="text-muted-foreground">No systems with 70%+ usage</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Improvement Needed</h4>
              <ul className="space-y-1 text-foreground">
                {data.filter(s => s.usage_percentage < 50).map(system => (
                  <li key={system.system}>• {system.systemName}: {system.usage_percentage}%</li>
                ))}
                {data.filter(s => s.usage_percentage < 50).length === 0 && (
                  <li className="text-muted-foreground">All systems have 50%+ usage</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
