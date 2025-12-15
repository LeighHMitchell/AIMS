"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { BarChart3, PieChart, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface HumanitarianShareChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  refreshKey: number
  onDataChange?: (data: ShareData) => void
}

interface ShareData {
  humanitarian: number
  development: number
  total: number
  humanitarianPercent: number
  developmentPercent: number
}

type ViewMode = 'chart' | 'bar' | 'table'

export function HumanitarianShareChart({ dateRange, refreshKey, onDataChange }: HumanitarianShareChartProps) {
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('chart')

  useEffect(() => {
    fetchData()
  }, [dateRange, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Query transactions - use value_usd for USD-converted amounts
      const { data: transactions, error: queryError } = await supabase
        .from('transactions')
        .select('value, value_usd, currency, is_humanitarian, transaction_type, status, description')
        .in('transaction_type', ['2', '3', '4']) // Commitments, Disbursements, Expenditures
        .eq('status', 'actual')
        .gte('transaction_date', dateRange.from.toISOString())
        .lte('transaction_date', dateRange.to.toISOString())

      if (queryError) {
        console.error('[HumanitarianShareChart] Query error:', queryError)
        return
      }

      let humanitarian = 0
      let development = 0

      // Humanitarian classification criteria (same as HumanitarianChart)
      const humanitarianAidTypes = ['01', '02', '03']
      const humanitarianKeywords = ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis']

      transactions?.forEach((t: any) => {
        // Use value_usd if available, otherwise fall back to value (assuming USD if no conversion)
        let value = parseFloat(t.value_usd) || 0
        if (!value && t.currency === 'USD' && t.value) {
          value = parseFloat(t.value) || 0
        }
        if (isNaN(value) || value === 0) return

        const isHumanitarian = t.is_humanitarian
        const aidType = t.aid_type
        const description = t.description?.toLowerCase() || ''

        // Check if humanitarian
        if (isHumanitarian || 
            humanitarianAidTypes.includes(aidType) ||
            humanitarianKeywords.some(keyword => description.includes(keyword))) {
          humanitarian += value
        } else {
          development += value
        }
      })

      const total = humanitarian + development
      const humanitarianPercent = total > 0 ? Math.round((humanitarian / total) * 100) : 0
      const developmentPercent = total > 0 ? Math.round((development / total) * 100) : 0

      const shareData: ShareData = {
        humanitarian,
        development,
        total,
        humanitarianPercent,
        developmentPercent
      }

      setData(shareData)
      onDataChange?.(shareData)
    } catch (error) {
      console.error('[HumanitarianShareChart] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number): string => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      
      // Format in billions or millions
      if (value >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(2)} bn`
      } else if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)} M`
      } else if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)} K`
      }
      return `$${value.toFixed(2)}`
    } catch (error) {
      console.error('[HumanitarianShareChart] Error formatting currency:', error)
      return '$0'
    }
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-slate-100" />
          <Skeleton className="h-4 w-64 bg-slate-100 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-12 py-8">
            <Skeleton className="h-40 w-40 rounded-full bg-slate-100" />
            <Skeleton className="h-64 w-20 bg-slate-100" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-48 bg-slate-100" />
              <Skeleton className="h-4 w-48 bg-slate-100" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.total === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800">
            Share of humanitarian aid
          </CardTitle>
          <CardDescription>Share of total international aid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg">
            <p className="text-slate-600">No aid data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate bar heights (as percentages)
  const developmentHeight = data.developmentPercent
  const humanitarianHeight = data.humanitarianPercent

  // Bar chart data
  const barChartData = [
    { name: 'Development', value: data.development, percent: data.developmentPercent, color: '#1E4D6B' },
    { name: 'Humanitarian', value: data.humanitarian, percent: data.humanitarianPercent, color: '#DC2626' }
  ]

  const renderChartView = () => (
    <div className="flex items-center gap-8 md:gap-16 py-6">
      {/* Circle Indicator */}
      <div className="relative flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="#FEE2E2"
            stroke="none"
          />
          {/* Inner lighter area */}
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="#FEF2F2"
            stroke="none"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-red-700">
            {data.humanitarianPercent}
            <span className="text-2xl">%</span>
          </span>
        </div>
      </div>

      {/* Stacked Bar with Labels */}
      <div className="flex items-center gap-6">
        {/* Stacked Bar */}
        <div className="relative h-64 w-16 rounded-lg overflow-hidden flex flex-col">
          {/* Development (top/larger portion) */}
          <div 
            className="w-full transition-all duration-500"
            style={{ 
              height: `${developmentHeight}%`,
              backgroundColor: '#1E4D6B' // Dark teal
            }}
          />
          {/* Humanitarian (bottom/smaller portion) */}
          <div 
            className="w-full transition-all duration-500"
            style={{ 
              height: `${humanitarianHeight}%`,
              backgroundColor: '#DC2626' // Red for humanitarian
            }}
          />
        </div>

        {/* Labels with connector lines */}
        <div className="flex flex-col justify-between h-64 py-4">
          {/* Development Label */}
          <div className="flex items-start gap-3">
            <svg width="40" height="24" className="flex-shrink-0 mt-1">
              <path
                d="M0 12 Q10 12, 20 6 T40 6"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
            </svg>
            <div>
              <p className="font-semibold text-slate-800">Development cooperation</p>
              <p className="text-slate-600">
                {formatCurrency(data.development)} USD ({data.developmentPercent}%)
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Humanitarian Label */}
          <div className="flex items-start gap-3">
            <svg width="40" height="24" className="flex-shrink-0 mt-1">
              <path
                d="M0 12 Q10 12, 20 18 T40 18"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-700">Humanitarian assistance</p>
              <p className="text-slate-600">
                {formatCurrency(data.humanitarian)} USD ({data.humanitarianPercent}%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBarView = () => (
    <div className="py-6">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            tick={{ fill: '#64748b', fontSize: 12 }}
            width={120}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Value']}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {barChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  const renderTableView = () => (
    <div className="py-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Amount (USD)</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-3 px-4 text-slate-800">Development cooperation</td>
            <td className="text-right py-3 px-4 text-slate-600">{formatCurrency(data.development)}</td>
            <td className="text-right py-3 px-4 text-slate-600">{data.developmentPercent}%</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-3 px-4 text-red-700 font-medium">Humanitarian assistance</td>
            <td className="text-right py-3 px-4 text-slate-600">{formatCurrency(data.humanitarian)}</td>
            <td className="text-right py-3 px-4 text-red-600 font-medium">{data.humanitarianPercent}%</td>
          </tr>
          <tr className="bg-slate-50">
            <td className="py-3 px-4 font-semibold text-slate-800">Total</td>
            <td className="text-right py-3 px-4 font-semibold text-slate-800">{formatCurrency(data.total)}</td>
            <td className="text-right py-3 px-4 font-semibold text-slate-800">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <Card className="bg-white border-slate-200 rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-800">
              Share of humanitarian aid
            </CardTitle>
            <CardDescription className="text-slate-500">
              Share of total international aid
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="h-8 px-3"
            >
              <PieChart className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('bar')}
              className="h-8 px-3"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' && renderChartView()}
        {viewMode === 'bar' && renderBarView()}
        {viewMode === 'table' && renderTableView()}
      </CardContent>
    </Card>
  )
}



