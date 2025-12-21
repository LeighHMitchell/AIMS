"use client"

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  OrganizationFundingEnvelope,
  getTemporalCategory
} from '@/types/organization-funding-envelope'
import { TrendingUp, AlertCircle, BarChart3, LineChart as LineChartIcon, Table as TableIcon, Layers } from 'lucide-react'

// Color scheme
const COLORS = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8'
}

interface OrganizationFundingVisualizationProps {
  envelopes: OrganizationFundingEnvelope[]
  organizationName?: string
}

type ChartViewType = 'line' | 'bar' | 'area' | 'table'

export default function OrganizationFundingVisualization({
  envelopes,
  organizationName
}: OrganizationFundingVisualizationProps) {
  const currentYear = new Date().getFullYear()
  const [chartView, setChartView] = useState<ChartViewType>('line')

  // Categorize envelopes
  const categorized = useMemo(() => {
    const past: OrganizationFundingEnvelope[] = []
    const current: OrganizationFundingEnvelope[] = []
    const future: OrganizationFundingEnvelope[] = []

    envelopes.forEach(envelope => {
      const category = getTemporalCategory(envelope, currentYear)
      if (category === 'past') {
        past.push(envelope)
      } else if (category === 'current') {
        current.push(envelope)
      } else {
        future.push(envelope)
      }
    })

    return { past, current, future }
  }, [envelopes, currentYear])

  // Prepare time series data (by year)
  const timeSeriesData = useMemo(() => {
    const yearMap = new Map<number, {
      year: number
      past: number
      current: number
      future: number
      total: number
      category: 'past' | 'current' | 'future'
    }>()

    envelopes.forEach(envelope => {
      const endYear = envelope.year_end || envelope.year_start
      const amount = envelope.amount_usd || envelope.amount || 0
      const category = getTemporalCategory(envelope, currentYear)

      // For multi-year, distribute across years (simple approach: use start year)
      const year = envelope.year_start

      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          past: 0,
          current: 0,
          future: 0,
          total: 0,
          category: category as 'past' | 'current' | 'future'
        })
      }

      const data = yearMap.get(year)!
      if (category === 'past') {
        data.past += amount
      } else if (category === 'current') {
        data.current += amount
      } else {
        data.future += amount
      }
      data.total += amount
      // Update category for the year (prioritize: future > current > past)
      if (category === 'future' || (category === 'current' && data.category === 'past')) {
        data.category = category as 'past' | 'current' | 'future'
      }
    })

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
  }, [envelopes, currentYear])


  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3" style={{ borderColor: COLORS.paleSlate }}>
          <p className="font-semibold mb-2" style={{ color: COLORS.blueSlate }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-sm">
              <span style={{ color: entry.color || COLORS.primaryScarlet }}>{entry.name}:</span>
              <span className="font-medium" style={{ color: COLORS.blueSlate }}>{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (envelopes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center" style={{ color: COLORS.blueSlate }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.paleSlate }} />
            <p>No funding envelope data available</p>
            <p className="text-sm mt-2">Add funding declarations to see visualizations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ backgroundColor: COLORS.platinum }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.blueSlate }}>Past Aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.primaryScarlet }}>
              {formatCurrency(
                categorized.past.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: COLORS.blueSlate }}>
              {categorized.past.length} {categorized.past.length === 1 ? 'entry' : 'entries'}
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: COLORS.platinum }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.blueSlate }}>Current Aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.coolSteel }}>
              {formatCurrency(
                categorized.current.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: COLORS.blueSlate }}>
              {categorized.current.length} {categorized.current.length === 1 ? 'entry' : 'entries'}
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: COLORS.platinum }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium" style={{ color: COLORS.blueSlate }}>Future Aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.blueSlate }}>
              {formatCurrency(
                categorized.future.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: COLORS.blueSlate }}>
              {categorized.future.length} {categorized.future.length === 1 ? 'entry' : 'entries'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      {timeSeriesData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" style={{ color: COLORS.primaryScarlet }} />
                  Funding Over Time
                </CardTitle>
                <p className="text-sm mt-1" style={{ color: COLORS.blueSlate }}>
                  Indicative organisation-level funding by temporal category (not aggregated across organisations)
                </p>
              </div>
              {/* Chart Type Toggle */}
              <div className="flex gap-1 border rounded-lg p-1" style={{ backgroundColor: COLORS.platinum }}>
                <Button
                  variant={chartView === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('line')}
                  className="h-8"
                  style={chartView === 'line' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartView === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('bar')}
                  className="h-8"
                  style={chartView === 'bar' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartView === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('area')}
                  className="h-8"
                  style={chartView === 'area' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartView === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('table')}
                  className="h-8"
                  style={chartView === 'table' ? { backgroundColor: COLORS.primaryScarlet } : {}}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartView === 'line' && (() => {
              // Create connected segments that share endpoints for smooth transitions
              // Find transition indices
              const firstCurrentIndex = timeSeriesData.findIndex(d => d.category === 'current')
              const firstFutureIndex = timeSeriesData.findIndex(d => d.category === 'future')
              
              // Past segment: from start through first current point (or first future if no current)
              const pastEndIndex = firstCurrentIndex >= 0 ? firstCurrentIndex : (firstFutureIndex >= 0 ? firstFutureIndex : timeSeriesData.length - 1)
              const pastSegment = timeSeriesData.slice(0, pastEndIndex + 1)
              
              // Current segment: from last past point through first future point
              const currentStartIndex = pastEndIndex > 0 ? pastEndIndex - 1 : 0
              const currentEndIndex = firstFutureIndex >= 0 ? firstFutureIndex : timeSeriesData.length - 1
              const currentSegment = firstCurrentIndex >= 0 ? timeSeriesData.slice(currentStartIndex, currentEndIndex + 1) : []
              
              // Future segment: from last current/past point to end (dashed)
              const futureStartIndex = currentEndIndex > 0 ? currentEndIndex - 1 : 0
              const futureSegment = firstFutureIndex >= 0 ? timeSeriesData.slice(futureStartIndex) : []
              
              // Get year range for X-axis domain
              const minYear = Math.min(...timeSeriesData.map(d => d.year))
              const maxYear = Math.max(...timeSeriesData.map(d => d.year))
              
              return (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                    <XAxis 
                      dataKey="year"
                      type="number"
                      domain={[minYear, maxYear]}
                      tickCount={maxYear - minYear + 1}
                      allowDecimals={false}
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                    />
                    <YAxis 
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {/* Past segment - solid red */}
                    {pastSegment.length > 1 && (
                      <Line
                        type="monotone"
                        data={pastSegment}
                        dataKey="total"
                        name="Total Funding"
                        stroke={COLORS.primaryScarlet}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.primaryScarlet }}
                        connectNulls={true}
                      />
                    )}
                    {/* Current segment - solid cool steel */}
                    {currentSegment.length > 1 && (
                      <Line
                        type="monotone"
                        data={currentSegment}
                        dataKey="total"
                        stroke={COLORS.coolSteel}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.coolSteel }}
                        legendType="none"
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                    )}
                    {/* Future segment - dashed blue slate */}
                    {futureSegment.length > 1 && (
                      <Line
                        type="monotone"
                        data={futureSegment}
                        dataKey="total"
                        stroke={COLORS.blueSlate}
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={{ r: 5, fill: COLORS.blueSlate }}
                        legendType="none"
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )
            })()}
            {chartView === 'bar' && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                  <XAxis 
                    dataKey="year" 
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                  />
                  <YAxis 
                    stroke={COLORS.blueSlate}
                    tick={{ fill: COLORS.blueSlate }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="total" name="Total Funding" radius={[4, 4, 0, 0]}>
                    {timeSeriesData.map((entry, index) => {
                      let color = COLORS.primaryScarlet
                      if (entry.category === 'past') color = COLORS.primaryScarlet
                      else if (entry.category === 'current') color = COLORS.coolSteel
                      else color = COLORS.blueSlate
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartView === 'area' && (() => {
              // Create connected segments for different colors (same logic as line chart)
              const firstCurrentIndex = timeSeriesData.findIndex(d => d.category === 'current')
              const firstFutureIndex = timeSeriesData.findIndex(d => d.category === 'future')
              
              const pastEndIndex = firstCurrentIndex >= 0 ? firstCurrentIndex : (firstFutureIndex >= 0 ? firstFutureIndex : timeSeriesData.length - 1)
              const pastSegment = timeSeriesData.slice(0, pastEndIndex + 1)
              
              const currentStartIndex = pastEndIndex > 0 ? pastEndIndex - 1 : 0
              const currentEndIndex = firstFutureIndex >= 0 ? firstFutureIndex : timeSeriesData.length - 1
              const currentSegment = firstCurrentIndex >= 0 ? timeSeriesData.slice(currentStartIndex, currentEndIndex + 1) : []
              
              const futureStartIndex = currentEndIndex > 0 ? currentEndIndex - 1 : 0
              const futureSegment = firstFutureIndex >= 0 ? timeSeriesData.slice(futureStartIndex) : []
              
              const minYear = Math.min(...timeSeriesData.map(d => d.year))
              const maxYear = Math.max(...timeSeriesData.map(d => d.year))
              
              return (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.paleSlate} />
                    <XAxis 
                      dataKey="year"
                      type="number"
                      domain={[minYear, maxYear]}
                      tickCount={maxYear - minYear + 1}
                      allowDecimals={false}
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                    />
                    <YAxis 
                      stroke={COLORS.blueSlate}
                      tick={{ fill: COLORS.blueSlate }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {/* Past segment - red area */}
                    {pastSegment.length > 1 && (
                      <Area
                        type="monotone"
                        data={pastSegment}
                        dataKey="total"
                        name="Total Funding"
                        stroke={COLORS.primaryScarlet}
                        fill={COLORS.primaryScarlet}
                        fillOpacity={0.6}
                        strokeWidth={2}
                        connectNulls={true}
                      />
                    )}
                    {/* Current segment - cool steel area */}
                    {currentSegment.length > 1 && (
                      <Area
                        type="monotone"
                        data={currentSegment}
                        dataKey="total"
                        stroke={COLORS.coolSteel}
                        fill={COLORS.coolSteel}
                        fillOpacity={0.6}
                        strokeWidth={2}
                        legendType="none"
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                    )}
                    {/* Future segment - blue slate area */}
                    {futureSegment.length > 1 && (
                      <Area
                        type="monotone"
                        data={futureSegment}
                        dataKey="total"
                        stroke={COLORS.blueSlate}
                        fill={COLORS.blueSlate}
                        fillOpacity={0.6}
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        legendType="none"
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )
            })()}
            {chartView === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: COLORS.platinum }}>
                      <th className="border p-3 text-left font-semibold" style={{ color: COLORS.blueSlate }}>Year</th>
                      <th className="border p-3 text-right font-semibold" style={{ color: COLORS.blueSlate }}>Total Funding</th>
                      <th className="border p-3 text-right font-semibold" style={{ color: COLORS.blueSlate }}>Past (Actual)</th>
                      <th className="border p-3 text-right font-semibold" style={{ color: COLORS.blueSlate }}>Current</th>
                      <th className="border p-3 text-right font-semibold" style={{ color: COLORS.blueSlate }}>Future (Indicative)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSeriesData.map((row, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : COLORS.platinum }}>
                        <td className="border p-3 font-medium" style={{ color: COLORS.blueSlate }}>{row.year}</td>
                        <td className="border p-3 text-right font-semibold" style={{ color: COLORS.primaryScarlet }}>
                          {formatCurrency(row.total)}
                        </td>
                        <td className="border p-3 text-right" style={{ color: COLORS.blueSlate }}>
                          {formatCurrency(row.past)}
                        </td>
                        <td className="border p-3 text-right" style={{ color: COLORS.blueSlate }}>
                          {formatCurrency(row.current)}
                        </td>
                        <td className="border p-3 text-right" style={{ color: COLORS.blueSlate }}>
                          {formatCurrency(row.future)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Important Note */}
      <Card style={{ borderColor: COLORS.paleSlate, backgroundColor: COLORS.platinum }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: COLORS.primaryScarlet }} />
            <div className="text-sm" style={{ color: COLORS.blueSlate }}>
              <p className="font-medium mb-1">Important: Non-Aggregatable Data</p>
              <p>
                These figures represent indicative organisation-level funding from the perspective of this organisation only. 
                They are intended for planning and coordination purposes and must not be aggregated across organisations or treated as national totals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

