"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
import { Shield, Target, Building2, Users, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch';
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'

interface GPEDCIndicator {
  indicator: string
  indicatorName: string
  description: string
  compliant_count: number
  non_compliant_count: number
  compliance_percentage: number
  total_activities: number
  principle: string
}

interface GPEDCComplianceChartProps {
  dateRange: { from: Date; to: Date }
  filters: {
    donor: string
    sector: string
    country: string
    implementingPartner: string
  }
  refreshKey: number
  detailed?: boolean
}

const PRINCIPLE_COLORS = {
  'Ownership': '#0f172a',
  'Alignment': '#334155',
  'Harmonisation': '#475569',
  'Results': '#64748b',
  'Accountability': '#94a3b8'
}

const PRINCIPLE_ICONS = {
  'Ownership': Target,
  'Alignment': Building2,
  'Harmonisation': Users,
  'Results': CheckCircle2,
  'Accountability': FileText
}

export function GPEDCComplianceChart({ dateRange, filters, refreshKey, detailed = false }: GPEDCComplianceChartProps) {
  const [data, setData] = useState<GPEDCIndicator[]>([])
  const [principles, setPrinciples] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'compliance' | 'name'>('compliance')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, detailed])

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
        detailed: detailed.toString()
      })

      const response = await apiFetch(`/api/aid-effectiveness/gpedc-compliance?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || result.indicators || [])
        setPrinciples(result.principles || [])
        setSummary(result.summary || null)
      } else {
        console.error('Failed to fetch GPEDC compliance data')
        setData([])
        setPrinciples([])
      }
    } catch (error) {
      console.error('Error fetching GPEDC compliance data:', error)
      setData([])
      setPrinciples([])
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
        subtitle={d.description}
        maxWidth={320}
        rows={[
          { label: 'Compliant', value: `${d.compliant_count} (${d.compliance_percentage}%)`, color: '#F37021' },
          { label: 'Non-compliant', value: `${d.non_compliant_count} (${100 - d.compliance_percentage}%)` },
        ]}
      />
    )
  }

  // Prepare data for radar chart (principles summary)
  const radarData = summary?.principles_summary?.map((p: any) => ({
    principle: p.principle,
    compliance: p.compliance
  })) || []

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

  if (!detailed) {
    // Simple overview for the overview tab
    return (
      <div className="space-y-6">
        {/* GPEDC Principles Radar */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">GPEDC Principles Compliance</h3>
            <p className="text-body text-muted-foreground">
              Compliance across the five core GPEDC effectiveness principles
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis 
                dataKey="principle" 
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Radar
                name="Compliance"
                dataKey="compliance"
                stroke="#334155"
                fill="#334155"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip 
                formatter={(value: any) => [`${value}%`, 'Compliance']}
                labelFormatter={(label: any) => `${label} Principle`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-muted-foreground">Overall Compliance</p>
                    <p className="text-2xl font-bold text-foreground">{summary.overall_compliance}%</p>
                  </div>
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={summary.overall_compliance} className="mt-2 bg-muted [&>div]:bg-slate-700" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-muted-foreground">Best Indicator</p>
                    <p className="text-body font-bold text-foreground">{summary.best_indicator?.indicatorName}</p>
                    <p className="text-body text-muted-foreground">{summary.best_indicator?.compliance_percentage}%</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-muted-foreground">Needs Focus</p>
                    <p className="text-body font-bold text-foreground">{summary.worst_indicator?.indicatorName}</p>
                    <p className="text-body text-muted-foreground">{summary.worst_indicator?.compliance_percentage}%</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Detailed view for the compliance tab
  return (
    <div className="space-y-6">
      {/* GPEDC Principles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {summary?.principles_summary?.map((principle: any, index: number) => {
          const IconComponent = PRINCIPLE_ICONS[principle.principle as keyof typeof PRINCIPLE_ICONS] || Shield
          return (
            <Card key={principle.principle} className="bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${PRINCIPLE_COLORS[principle.principle as keyof typeof PRINCIPLE_COLORS]}20` }}
                  >
                    <IconComponent 
                      className="h-5 w-5" 
                      style={{ color: PRINCIPLE_COLORS[principle.principle as keyof typeof PRINCIPLE_COLORS] }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-body font-medium text-foreground">{principle.principle}</p>
                    <p className="text-xl font-bold text-foreground">{principle.compliance}%</p>
                  </div>
                </div>
                <Progress 
                  value={principle.compliance} 
                  className="mt-3 bg-muted"
                  style={{ 
                    ['--progress-foreground' as any]: PRINCIPLE_COLORS[principle.principle as keyof typeof PRINCIPLE_COLORS] 
                  }}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed Indicators Chart */}
      {(() => {
        const sortedData = [...data].sort((a, b) =>
          sortBy === 'compliance' ? b.compliance_percentage - a.compliance_percentage : a.indicatorName.localeCompare(b.indicatorName)
        )
        const detailBar = (height: number) => (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="indicatorName" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={120} interval={0} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="compliance_percentage" radius={[4, 4, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PRINCIPLE_COLORS[entry.principle as keyof typeof PRINCIPLE_COLORS] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
        return (
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-medium text-foreground">Detailed Indicator Compliance</CardTitle>
                <ChartExpandButton
                  title="Detailed Indicator Compliance"
                  interpretation="The Global Partnership for Effective Development Co-operation (GPEDC) framework decomposes seven high-level effectiveness principles into specific monitoring indicators — concrete questions that test whether each principle is being honoured at activity level (does the activity have a formal government agreement, is it included in the national plan, is funding shared on time, is procurement untied, is there a joint annual review, and so on). This chart shows each of those individual indicators as a separate bar, colour-coded by which of the seven principles it belongs to. Together, this is the most granular possible view of the country's effectiveness picture — every commitment that makes up the GPEDC framework, ranked by how broadly the country's portfolio is meeting it, so you can see exactly which paragraphs of the international effectiveness agenda the country's external assistance is and isn't delivering against."
                  controls={
                    <div className="flex flex-col gap-1">
                      <Label className="text-helper text-muted-foreground">Sort by</Label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'compliance' | 'name')}>
                        <SelectTrigger className="h-9 w-[170px] text-helper">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <CodedSelectItem value="compliance" code="1">Compliance</CodedSelectItem>
                          <CodedSelectItem value="name" code="2">Indicator</CodedSelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  }
                  csv={() => ({
                    filename: 'gpedc-indicator-compliance.csv',
                    headers: ['Indicator', 'Principle', 'Compliant', 'Non-compliant', 'Compliance %'],
                    rows: sortedData.map((d) => [d.indicatorName, d.principle, d.compliant_count, d.non_compliant_count, d.compliance_percentage]),
                  })}
                  render={(h) => detailBar(h)}
                />
              </div>
            </CardHeader>
            <CardContent>{detailBar(400)}</CardContent>
          </Card>
        )
      })()}

      {/* Detailed Indicator Breakdown */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Indicator Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((indicator, index) => {
              const IconComponent = PRINCIPLE_ICONS[indicator.principle as keyof typeof PRINCIPLE_ICONS] || Shield
              return (
                <div key={indicator.indicator} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${PRINCIPLE_COLORS[indicator.principle as keyof typeof PRINCIPLE_COLORS]}20` }}
                    >
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: PRINCIPLE_COLORS[indicator.principle as keyof typeof PRINCIPLE_COLORS] }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{indicator.indicatorName}</h4>
                      <p className="text-body text-muted-foreground mb-2">{indicator.description}</p>
                      <div className="flex items-center gap-4 text-body">
                        <span className="text-foreground">
                          ✓ {indicator.compliant_count} compliant
                        </span>
                        <span className="text-muted-foreground">
                          ✗ {indicator.non_compliant_count} non-compliant
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{indicator.compliance_percentage}%</p>
                      <p className="text-helper text-muted-foreground">Compliance</p>
                    </div>
                    <Badge 
                      variant={indicator.compliance_percentage >= 80 ? "default" : indicator.compliance_percentage >= 60 ? "secondary" : "destructive"}
                      className={
                        indicator.compliance_percentage >= 80 ? "bg-muted text-foreground" :
                        indicator.compliance_percentage >= 60 ? "bg-muted text-foreground" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {indicator.compliance_percentage >= 80 ? 'Excellent' : 
                       indicator.compliance_percentage >= 60 ? 'Good' : 'Needs Work'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* GPEDC Principles Performance */}
      {principles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {principles.map((principle) => {
            const IconComponent = PRINCIPLE_ICONS[principle.principleName as keyof typeof PRINCIPLE_ICONS] || Shield
            return (
              <Card key={principle.principle} className="bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-medium text-foreground flex items-center gap-2">
                    <IconComponent 
                      className="h-4 w-4" 
                      style={{ color: PRINCIPLE_COLORS[principle.principleName as keyof typeof PRINCIPLE_COLORS] }}
                    />
                    {principle.principleName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-foreground">{principle.overall_compliance}%</span>
                      <Badge 
                        variant={principle.overall_compliance >= 70 ? "default" : "secondary"}
                        className={principle.overall_compliance >= 70 ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}
                      >
                        {principle.overall_compliance >= 70 ? 'Strong' : 'Developing'}
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={principle.overall_compliance} 
                      className="bg-muted"
                      style={{ 
                        ['--progress-foreground' as any]: PRINCIPLE_COLORS[principle.principleName as keyof typeof PRINCIPLE_COLORS] 
                      }}
                    />
                    
                    <div className="space-y-1">
                      {principle.indicators.map((ind: any, idx: number) => (
                        <div key={ind.indicator} className="flex justify-between text-helper">
                          <span className="text-muted-foreground truncate">{ind.indicatorName}</span>
                          <span className="text-foreground font-medium">{ind.compliance_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Key Insights and Recommendations */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">
            GPEDC Compliance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-body">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Strengths</h4>
              <ul className="space-y-2 text-foreground">
                {data.filter(i => i.compliance_percentage >= 70).map(indicator => (
                  <li key={indicator.indicator} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>{indicator.indicatorName}: {indicator.compliance_percentage}%</span>
                  </li>
                ))}
                {data.filter(i => i.compliance_percentage >= 70).length === 0 && (
                  <li className="text-muted-foreground">No indicators with 70%+ compliance</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Priority Areas</h4>
              <ul className="space-y-2 text-foreground">
                {data.filter(i => i.compliance_percentage < 60).map(indicator => (
                  <li key={indicator.indicator} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{indicator.indicatorName}: {indicator.compliance_percentage}%</span>
                  </li>
                ))}
                {data.filter(i => i.compliance_percentage < 60).length === 0 && (
                  <li className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    All indicators above 60% compliance
                  </li>
                )}
              </ul>
            </div>
          </div>

          {summary && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Overall Assessment</h4>
              <p className="text-body text-foreground">
                {summary.overall_compliance >= 80 ? 
                  "Excellent GPEDC compliance across all principles. Continue current practices and share best practices with other organizations." :
                  summary.overall_compliance >= 60 ?
                  "Good progress on GPEDC compliance. Focus on strengthening weaker indicators to reach excellence." :
                  "Significant improvement needed in GPEDC compliance. Consider developing an action plan to address priority areas."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
