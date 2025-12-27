"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Info } from 'lucide-react'

interface SDGConcentrationChartProps {
  organizationId: string
  dateRange: { from: Date; to: Date }
  selectedSdgs: number[]
  metric: 'activities' | 'budget' | 'planned'
  refreshKey: number
}

interface ConcentrationData {
  year: number
  sdgCount: number
  activityCount: number
  totalBudget: number
  totalPlannedDisbursements: number
}

export function SDGConcentrationChart({
  organizationId,
  dateRange,
  selectedSdgs,
  metric,
  refreshKey
}: SDGConcentrationChartProps) {
  const [data, setData] = useState<ConcentrationData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [organizationId, dateRange, selectedSdgs, metric, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        organizationId: organizationId || 'all',
        dateFrom: dateRange.from.toISOString().split('T')[0],
        dateTo: dateRange.to.toISOString().split('T')[0],
        selectedSdgs: selectedSdgs.length > 0 ? selectedSdgs.join(',') : 'all',
        metric,
        dataType: 'concentration'
      })

      const response = await fetch(`/api/analytics/sdgs?${params}`)
      const result = await response.json()

      if (result.success && result.concentration) {
        setData(result.concentration)
      } else {
        console.error('Error fetching SDG concentration data:', result.error)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching SDG concentration data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const getMetricValue = (item: ConcentrationData) => {
    if (metric === 'activities') return item.activityCount
    if (metric === 'budget') return item.totalBudget
    return item.totalPlannedDisbursements
  }

  const getMetricLabel = () => {
    if (metric === 'activities') return 'Number of Activities'
    if (metric === 'budget') return 'Total Activity Budget (USD)'
    return 'Total Planned Disbursements (USD)'
  }

  // Transform data for line chart - group by year and create lines for each SDG count category
  const chartData = useMemo(() => {
    const yearMap = new Map<number, {
      '1 SDG': number
      '2 SDGs': number
      '3 SDGs': number
      '4 SDGs': number
      '5+ SDGs': number
    }>()

    data.forEach(item => {
      if (!yearMap.has(item.year)) {
        yearMap.set(item.year, {
          '1 SDG': 0,
          '2 SDGs': 0,
          '3 SDGs': 0,
          '4 SDGs': 0,
          '5+ SDGs': 0
        })
      }

      const yearData = yearMap.get(item.year)!
      const value = getMetricValue(item)
      const category = item.sdgCount === 1 ? '1 SDG' :
                      item.sdgCount === 2 ? '2 SDGs' :
                      item.sdgCount === 3 ? '3 SDGs' :
                      item.sdgCount === 4 ? '4 SDGs' : '5+ SDGs'
      
      yearData[category] = value
    })

    return Array.from(yearMap.entries())
      .map(([year, values]) => ({
        year,
        ...values
      }))
      .sort((a, b) => a.year - b.year)
  }, [data, metric])

  const lineColors = {
    '1 SDG': '#3B82F6',    // blue
    '2 SDGs': '#10B981',    // green
    '3 SDGs': '#F59E0B',    // amber
    '4 SDGs': '#EF4444',    // red
    '5+ SDGs': '#8B5CF6'    // purple
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900 mb-2">Year: {label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600">{entry.name}</span>
                </span>
                <span className="font-medium">
                  {metric === 'activities'
                    ? entry.value.toFixed(0)
                    : formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Concentration Over Time</CardTitle>
          <CardDescription>
            Assess whether activities are becoming more concentrated or dispersed across SDGs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDG Concentration Over Time</CardTitle>
          <CardDescription>
            Assess whether activities are becoming more concentrated or dispersed across SDGs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-slate-600 font-medium">No SDG concentration data available</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDG Concentration Over Time</CardTitle>
        <CardDescription>
          {getMetricLabel()} grouped by number of SDGs mapped to each activity. An activity is considered active in a year if the year falls between its planned or actual start and end dates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tickFormatter={metric === 'activities' ? (v) => v.toFixed(0) : formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="1 SDG"
              stroke={lineColors['1 SDG']}
              strokeWidth={2}
              dot={{ fill: lineColors['1 SDG'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="2 SDGs"
              stroke={lineColors['2 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['2 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="3 SDGs"
              stroke={lineColors['3 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['3 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="4 SDGs"
              stroke={lineColors['4 SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['4 SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="5+ SDGs"
              stroke={lineColors['5+ SDGs']}
              strokeWidth={2}
              dot={{ fill: lineColors['5+ SDGs'], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Explanatory Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Interpretation Note</p>
              <p>
                Activities mapped to many SDGs may indicate broad or unfocused design. This is an analytical signal, not a judgement of effectiveness. 
                Higher concentration (fewer SDGs per activity) may suggest more focused strategic alignment, while dispersion (more SDGs per activity) 
                may reflect integrated or cross-cutting approaches.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}





