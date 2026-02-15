"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-slate-900">{data.indicatorName}</p>
          <p className="text-xs text-slate-600 mb-2">{data.description}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-800">Compliant: {data.compliant_count} ({data.compliance_percentage}%)</p>
            <p className="text-slate-500">Non-compliant: {data.non_compliant_count} ({100 - data.compliance_percentage}%)</p>
          </div>
        </div>
      )
    }
    return null
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
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">GPEDC Principles Compliance</h3>
            <p className="text-sm text-slate-600">
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
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Overall Compliance</p>
                    <p className="text-2xl font-bold text-slate-900">{summary.overall_compliance}%</p>
                  </div>
                  <Shield className="h-6 w-6 text-slate-400" />
                </div>
                <Progress value={summary.overall_compliance} className="mt-2 bg-slate-200 [&>div]:bg-slate-700" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Best Indicator</p>
                    <p className="text-sm font-bold text-slate-900">{summary.best_indicator?.indicatorName}</p>
                    <p className="text-sm text-slate-500">{summary.best_indicator?.compliance_percentage}%</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Needs Focus</p>
                    <p className="text-sm font-bold text-slate-900">{summary.worst_indicator?.indicatorName}</p>
                    <p className="text-sm text-slate-500">{summary.worst_indicator?.compliance_percentage}%</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-slate-400" />
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
            <Card key={principle.principle} className="bg-white border-slate-200">
              <CardContent className="p-4">
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
                    <p className="text-sm font-medium text-slate-700">{principle.principle}</p>
                    <p className="text-xl font-bold text-slate-900">{principle.compliance}%</p>
                  </div>
                </div>
                <Progress 
                  value={principle.compliance} 
                  className="mt-3 bg-slate-200"
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
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-700">Detailed Indicator Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="indicatorName" 
                stroke="#64748b"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={120}
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
                dataKey="compliance_percentage" 
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={PRINCIPLE_COLORS[entry.principle as keyof typeof PRINCIPLE_COLORS] || '#64748b'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Indicator Breakdown */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-700">Indicator Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((indicator, index) => {
              const IconComponent = PRINCIPLE_ICONS[indicator.principle as keyof typeof PRINCIPLE_ICONS] || Shield
              return (
                <div key={indicator.indicator} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
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
                      <h4 className="font-medium text-slate-900">{indicator.indicatorName}</h4>
                      <p className="text-sm text-slate-600 mb-2">{indicator.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-800">
                          ✓ {indicator.compliant_count} compliant
                        </span>
                        <span className="text-slate-500">
                          ✗ {indicator.non_compliant_count} non-compliant
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{indicator.compliance_percentage}%</p>
                      <p className="text-xs text-slate-600">Compliance</p>
                    </div>
                    <Badge 
                      variant={indicator.compliance_percentage >= 80 ? "default" : indicator.compliance_percentage >= 60 ? "secondary" : "destructive"}
                      className={
                        indicator.compliance_percentage >= 80 ? "bg-slate-200 text-slate-800" :
                        indicator.compliance_percentage >= 60 ? "bg-slate-100 text-slate-700" :
                        "bg-slate-100 text-slate-500"
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
              <Card key={principle.principle} className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
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
                      <span className="text-2xl font-bold text-slate-900">{principle.overall_compliance}%</span>
                      <Badge 
                        variant={principle.overall_compliance >= 70 ? "default" : "secondary"}
                        className={principle.overall_compliance >= 70 ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600"}
                      >
                        {principle.overall_compliance >= 70 ? 'Strong' : 'Developing'}
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={principle.overall_compliance} 
                      className="bg-slate-200"
                      style={{ 
                        ['--progress-foreground' as any]: PRINCIPLE_COLORS[principle.principleName as keyof typeof PRINCIPLE_COLORS] 
                      }}
                    />
                    
                    <div className="space-y-1">
                      {principle.indicators.map((ind: any, idx: number) => (
                        <div key={ind.indicator} className="flex justify-between text-xs">
                          <span className="text-slate-600 truncate">{ind.indicatorName}</span>
                          <span className="text-slate-900 font-medium">{ind.compliance_percentage}%</span>
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
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-500" />
            GPEDC Compliance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Strengths</h4>
              <ul className="space-y-2 text-slate-700">
                {data.filter(i => i.compliance_percentage >= 70).map(indicator => (
                  <li key={indicator.indicator} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span>{indicator.indicatorName}: {indicator.compliance_percentage}%</span>
                  </li>
                ))}
                {data.filter(i => i.compliance_percentage >= 70).length === 0 && (
                  <li className="text-slate-500">No indicators with 70%+ compliance</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Priority Areas</h4>
              <ul className="space-y-2 text-slate-700">
                {data.filter(i => i.compliance_percentage < 60).map(indicator => (
                  <li key={indicator.indicator} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-slate-400" />
                    <span>{indicator.indicatorName}: {indicator.compliance_percentage}%</span>
                  </li>
                ))}
                {data.filter(i => i.compliance_percentage < 60).length === 0 && (
                  <li className="text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    All indicators above 60% compliance
                  </li>
                )}
              </ul>
            </div>
          </div>

          {summary && (
            <div className="mt-6 p-4 bg-white/50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Overall Assessment</h4>
              <p className="text-sm text-slate-700">
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
