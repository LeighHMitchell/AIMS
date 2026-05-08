"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
import { Users, Building2, Target, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'

interface ImplementingPartnerData {
  partner_name: string
  partner_type: string
  activity_count: number
  total_budget: number
  avg_outcome_indicators: number
  gov_systems_usage_rate: number
  gpedc_compliance_rate: number
  tied_aid_percentage: number
}

interface ImplementingPartnersChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
}

const PARTNER_TYPE_COLORS = {
  'Government': '#0f172a',
  'NGO': '#334155',
  'Private Sector': '#475569',
  'International Organization': '#64748b',
  'Academic Institution': '#94a3b8',
  'Unknown': '#cbd5e1'
}

export function ImplementingPartnersChart({ dateRange, filters, refreshKey }: ImplementingPartnersChartProps) {
  const [data, setData] = useState<ImplementingPartnerData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [topN, setTopN] = useState('10')
  const [sortBy, setSortBy] = useState('activity_count')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, topN])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        donor: filters.donor,
        sector: filters.sector,
        country: filters.country,
        topN
      })

      const response = await apiFetch(`/api/aid-effectiveness/implementing-partners?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch implementing partners data')
        setData([])
      }
    } catch (error) {
      console.error('Error fetching implementing partners data:', error)
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
        title={d.partner_name}
        subtitle={d.partner_type}
        maxWidth={360}
        rows={[
          { label: 'Activities', value: d.activity_count, color: '#F37021' },
          { label: 'Budget', value: `$${(d.total_budget / 1000000).toFixed(1)}M` },
          { label: 'Avg outcome indicators', value: d.avg_outcome_indicators },
          { label: 'Gov systems usage', value: `${d.gov_systems_usage_rate}%` },
          { label: 'GPEDC compliance', value: `${d.gpedc_compliance_rate}%` },
          { label: 'Untied aid', value: `${100 - d.tied_aid_percentage}%` },
        ]}
      />
    )
  }

  // Sort data based on selected criteria
  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'gpedc_compliance_rate':
        return b.gpedc_compliance_rate - a.gpedc_compliance_rate
      case 'gov_systems_usage_rate':
        return b.gov_systems_usage_rate - a.gov_systems_usage_rate
      case 'total_budget':
        return b.total_budget - a.total_budget
      case 'avg_outcome_indicators':
        return b.avg_outcome_indicators - a.avg_outcome_indicators
      default:
        return b.activity_count - a.activity_count
    }
  })

  // Prepare data for scatter plot (compliance vs government systems usage)
  const scatterData = data.map(partner => ({
    ...partner,
    x: partner.gov_systems_usage_rate,
    y: partner.gpedc_compliance_rate,
    z: partner.activity_count
  }))

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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No implementing partners data available</p>
          <p className="text-body">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Implementing Partners Analysis</h3>
        </div>
        
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Sort by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <CodedSelectItem value="activity_count" code="1">Activity Count</CodedSelectItem>
                <CodedSelectItem value="gpedc_compliance_rate" code="2">GPEDC Compliance</CodedSelectItem>
                <CodedSelectItem value="gov_systems_usage_rate" code="3">Gov Systems Usage</CodedSelectItem>
                <CodedSelectItem value="total_budget" code="4">Total Budgeted</CodedSelectItem>
                <CodedSelectItem value="avg_outcome_indicators" code="5">Outcome Indicators</CodedSelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-helper text-muted-foreground">Show</Label>
            <Select value={topN} onValueChange={setTopN}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                <CodedSelectItem value="5" code="1">Top 5</CodedSelectItem>
                <CodedSelectItem value="10" code="2">Top 10</CodedSelectItem>
                <CodedSelectItem value="20" code="3">Top 20</CodedSelectItem>
                <CodedSelectItem value="all" code="4">All</CodedSelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Total Partners</p>
                  <p className="text-2xl font-bold text-foreground">{summary.total_partners}</p>
                </div>
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Avg Compliance</p>
                  <p className="text-2xl font-bold text-foreground">{summary.avg_compliance_rate}%</p>
                </div>
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Avg Gov Systems</p>
                  <p className="text-2xl font-bold text-foreground">{summary.avg_gov_systems_usage}%</p>
                </div>
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium text-muted-foreground">Most Active</p>
                  <p className="text-body font-bold text-foreground">{summary.most_active?.partner_name}</p>
                  <p className="text-helper text-muted-foreground">{summary.most_active?.activity_count} activities</p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Performance Chart */}
        {(() => {
          const partnerTitle =
            sortBy === 'activity_count' ? 'Activity Count' :
            sortBy === 'gpedc_compliance_rate' ? 'GPEDC Compliance' :
            sortBy === 'gov_systems_usage_rate' ? 'Government Systems Usage' :
            sortBy === 'total_budget' ? 'Total Budgeted' :
            'Average Outcome Indicators'
          const partnerBar = (height: number) => (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="partner_name" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={100} interval={0} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) =>
                  sortBy === 'total_budget' ? `$${(value / 1000000).toFixed(1)}M` :
                  sortBy.includes('rate') || sortBy.includes('percentage') ? `${value}%` :
                  value.toString()
                } />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={sortBy} radius={[4, 4, 0, 0]}>
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PARTNER_TYPE_COLORS[entry.partner_type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium text-foreground">{partnerTitle}</CardTitle>
                  <ChartExpandButton
                    title={partnerTitle}
                    interpretation="An implementing partner is the organisation contractually responsible for delivering an activity on the ground — distinct from the donor that funds it or the government that owns the broader programme. Implementing partners can be UN agencies, international or national NGOs, government ministries, private contractors, or research institutions. This chart compares them on a chosen effectiveness metric: how many activities each carries, what share meet the GPEDC compliance threshold, how often each uses country government systems, how much they have collectively budgeted, or how many outcome indicators their activities track on average. Together, the picture tells you which delivery organisations in country are operating at the effectiveness standard the international agenda calls for — and where partner-level dialogue or capacity support could lift portfolio performance most."
                    csv={() => ({
                      filename: `implementing-partners-${sortBy}.csv`,
                      headers: ['Partner', 'Type', 'Activities', 'Total Budget', 'Avg Outcome Indicators', 'Gov Systems %', 'GPEDC Compliance %', 'Tied Aid %'],
                      rows: sortedData.map((d) => [d.partner_name, d.partner_type, d.activity_count, d.total_budget, d.avg_outcome_indicators, d.gov_systems_usage_rate, d.gpedc_compliance_rate, d.tied_aid_percentage]),
                    })}
                    render={(h) => partnerBar(h)}
                  />
                </div>
              </CardHeader>
              <CardContent>{partnerBar(300)}</CardContent>
            </Card>
          )
        })()}

        {/* Compliance vs Gov Systems Scatter */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">
              GPEDC Compliance vs Government Systems Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Gov Systems Usage"
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="GPEDC Compliance"
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <ChartTooltipCard
                        title={d.partner_name}
                        subtitle={d.partner_type}
                        rows={[
                          { label: 'Gov systems', value: `${d.x}%`, color: '#F37021' },
                          { label: 'GPEDC compliance', value: `${d.y}%` },
                          { label: 'Activities', value: d.z },
                        ]}
                      />
                    )
                  }}
                />
                <Scatter 
                  data={scatterData} 
                  fill="#475569"
                >
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PARTNER_TYPE_COLORS[entry.partner_type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b'} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Partner Type Distribution */}
      {summary && summary.partner_types && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Partner Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.partner_types.map((type: string) => (
                <Badge 
                  key={type}
                  variant="outline"
                  className="text-body"
                  style={{ 
                    borderColor: PARTNER_TYPE_COLORS[type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b',
                    color: PARTNER_TYPE_COLORS[type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b'
                  }}
                >
                  {type} ({data.filter(p => p.partner_type === type).length})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Partner Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Partner Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedData.slice(0, 10).map((partner, index) => (
              <div key={partner.partner_name} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">#{index + 1}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{partner.partner_name}</h4>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: PARTNER_TYPE_COLORS[partner.partner_type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b',
                          color: PARTNER_TYPE_COLORS[partner.partner_type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b'
                        }}
                      >
                        {partner.partner_type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-body">
                      <div>
                        <span className="text-muted-foreground">Activities:</span>
                        <span className="ml-1 font-medium">{partner.activity_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="ml-1 font-medium">${(partner.total_budget / 1000000).toFixed(1)}M</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Indicators:</span>
                        <span className="ml-1 font-medium">{partner.avg_outcome_indicators}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Untied:</span>
                        <span className="ml-1 font-medium">{100 - partner.tied_aid_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-body text-muted-foreground">Gov Systems</p>
                    <p className="text-lg font-bold text-foreground">{partner.gov_systems_usage_rate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-body text-muted-foreground">GPEDC</p>
                    <p className="text-lg font-bold text-foreground">{partner.gpedc_compliance_rate}%</p>
                  </div>
                  <Badge 
                    variant={partner.gpedc_compliance_rate >= 80 ? "default" : partner.gpedc_compliance_rate >= 60 ? "secondary" : "destructive"}
                    className={
                      partner.gpedc_compliance_rate >= 80 ? "bg-muted text-foreground" :
                      partner.gpedc_compliance_rate >= 60 ? "bg-muted text-foreground" :
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {partner.gpedc_compliance_rate >= 80 ? 'Excellent' : 
                     partner.gpedc_compliance_rate >= 60 ? 'Good' : 'Needs Focus'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      {summary && summary.best_performer && (
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{summary.best_performer.partner_name}</p>
                <p className="text-body text-muted-foreground">{summary.best_performer.partner_type}</p>
                <div className="flex items-center gap-4 mt-2 text-body text-muted-foreground">
                  <span>GPEDC: {summary.best_performer.gpedc_compliance_rate}%</span>
                  <span>Gov Systems: {summary.best_performer.gov_systems_usage_rate}%</span>
                  <span>Activities: {summary.best_performer.activity_count}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-muted text-foreground">Excellence</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
