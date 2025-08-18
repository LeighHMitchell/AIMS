"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  'Government': '#3b82f6',
  'NGO': '#10b981',
  'Private Sector': '#8b5cf6',
  'International Organization': '#f59e0b',
  'Academic Institution': '#06b6d4',
  'Unknown': '#64748b'
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

      const response = await fetch(`/api/aid-effectiveness/implementing-partners?${params}`)
      
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg max-w-sm">
          <p className="font-semibold text-slate-900">{data.partner_name}</p>
          <p className="text-xs text-slate-600 mb-2">{data.partner_type}</p>
          <div className="space-y-1 text-sm">
            <p>Activities: {data.activity_count}</p>
            <p>Budget: ${(data.total_budget / 1000000).toFixed(1)}M</p>
            <p>Avg Outcome Indicators: {data.avg_outcome_indicators}</p>
            <p className="text-blue-600">Gov Systems Usage: {data.gov_systems_usage_rate}%</p>
            <p className="text-green-600">GPEDC Compliance: {data.gpedc_compliance_rate}%</p>
            <p className="text-orange-600">Untied Aid: {100 - data.tied_aid_percentage}%</p>
          </div>
        </div>
      )
    }
    return null
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
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No implementing partners data available</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Implementing Partners Analysis</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity_count">Activity Count</SelectItem>
              <SelectItem value="gpedc_compliance_rate">GPEDC Compliance</SelectItem>
              <SelectItem value="gov_systems_usage_rate">Gov Systems Usage</SelectItem>
              <SelectItem value="total_budget">Total Budget</SelectItem>
              <SelectItem value="avg_outcome_indicators">Outcome Indicators</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={topN} onValueChange={setTopN}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Top N" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Partners</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.total_partners}</p>
                </div>
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Avg Compliance</p>
                  <p className="text-2xl font-bold text-green-900">{summary.avg_compliance_rate}%</p>
                </div>
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Avg Gov Systems</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.avg_gov_systems_usage}%</p>
                </div>
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Most Active</p>
                  <p className="text-sm font-bold text-orange-900">{summary.most_active?.partner_name}</p>
                  <p className="text-xs text-orange-700">{summary.most_active?.activity_count} activities</p>
                </div>
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Performance Chart */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">
              {sortBy === 'activity_count' ? 'Activity Count' :
               sortBy === 'gpedc_compliance_rate' ? 'GPEDC Compliance' :
               sortBy === 'gov_systems_usage_rate' ? 'Government Systems Usage' :
               sortBy === 'total_budget' ? 'Total Budget' :
               'Average Outcome Indicators'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="partner_name" 
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
                  tickFormatter={(value) => 
                    sortBy === 'total_budget' ? `$${(value / 1000000).toFixed(1)}M` :
                    sortBy.includes('rate') || sortBy.includes('percentage') ? `${value}%` :
                    value.toString()
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={sortBy} 
                  radius={[4, 4, 0, 0]}
                >
                  {sortedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PARTNER_TYPE_COLORS[entry.partner_type as keyof typeof PARTNER_TYPE_COLORS] || '#64748b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compliance vs Gov Systems Scatter */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-slate-900">{data.partner_name}</p>
                          <p className="text-xs text-slate-600 mb-1">{data.partner_type}</p>
                          <p className="text-sm text-blue-600">Gov Systems: {data.x}%</p>
                          <p className="text-sm text-green-600">GPEDC Compliance: {data.y}%</p>
                          <p className="text-xs text-slate-500">Activities: {data.z}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter 
                  data={scatterData} 
                  fill="#3b82f6"
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
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-700">Partner Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.partner_types.map((type: string) => (
                <Badge 
                  key={type}
                  variant="outline"
                  className="text-sm"
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
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-slate-700">Partner Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedData.slice(0, 10).map((partner, index) => (
              <div key={partner.partner_name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">#{index + 1}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">{partner.partner_name}</h4>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Activities:</span>
                        <span className="ml-1 font-medium">{partner.activity_count}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Budget:</span>
                        <span className="ml-1 font-medium">${(partner.total_budget / 1000000).toFixed(1)}M</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Indicators:</span>
                        <span className="ml-1 font-medium">{partner.avg_outcome_indicators}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Untied:</span>
                        <span className="ml-1 font-medium">{100 - partner.tied_aid_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Gov Systems</p>
                    <p className="text-lg font-bold text-blue-600">{partner.gov_systems_usage_rate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600">GPEDC</p>
                    <p className="text-lg font-bold text-green-600">{partner.gpedc_compliance_rate}%</p>
                  </div>
                  <Badge 
                    variant={partner.gpedc_compliance_rate >= 80 ? "default" : partner.gpedc_compliance_rate >= 60 ? "secondary" : "destructive"}
                    className={
                      partner.gpedc_compliance_rate >= 80 ? "bg-green-100 text-green-800" :
                      partner.gpedc_compliance_rate >= 60 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
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
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-green-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">{summary.best_performer.partner_name}</p>
                <p className="text-sm text-green-700">{summary.best_performer.partner_type}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-green-600">
                  <span>GPEDC: {summary.best_performer.gpedc_compliance_rate}%</span>
                  <span>Gov Systems: {summary.best_performer.gov_systems_usage_rate}%</span>
                  <span>Activities: {summary.best_performer.activity_count}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-200 text-green-800">Excellence</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
