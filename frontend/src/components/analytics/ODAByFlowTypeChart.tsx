"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { LoadingText } from '@/components/ui/loading-text'
import { BarChart3, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface ODAByFlowTypeChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: FlowData[]) => void
}

interface FlowData {
  code: string
  label: string
  category: string
  totalValue: number
}

export function ODAByFlowTypeChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange
}: ODAByFlowTypeChartProps) {
  const [data, setData] = useState<FlowData[]>([])
  const [loading, setLoading] = useState(true)
  const [includeNonODA, setIncludeNonODA] = useState(false)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, includeNonODA])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        includeNonODA: includeNonODA.toString()
      })
      
      if (filters?.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters?.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      const response = await apiFetch(`/api/analytics/top-10/oda-by-flow-type?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      const flows = result.flows || []
      setData(flows)
      onDataChange?.(flows)
    } catch (error) {
      console.error('[ODAByFlowTypeChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    try {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '$0'
      }
      const safeValue = Number(value)
      if (isNaN(safeValue) || !isFinite(safeValue)) {
        return '$0'
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(safeValue)
    } catch (error) {
      console.error('[ODAByFlowTypeChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Generate colors by category
  const getColorForCategory = (category: string, index: number): string => {
    const colors: Record<string, string[]> = {
      'ODA': ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'], // Blue shades
      'OOF': ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d'], // Amber shades
      'Other': ['#64748b', '#94a3b8', '#cbd5e1'], // Slate shades
      'Unknown': ['#6b7280']
    };

    const categoryColors = colors[category] || colors['Unknown'];
    return categoryColors[index % categoryColors.length];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No flow type data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toggle for non-ODA flows */}
      <div className="flex items-center space-x-2 pb-2">
        <Switch
          id="include-non-oda"
          checked={includeNonODA}
          onCheckedChange={setIncludeNonODA}
        />
        <Label htmlFor="include-non-oda" className="text-sm font-medium cursor-pointer">
          Include Non-ODA Flows (OOF, Private, etc.)
        </Label>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} />
          <XAxis 
            dataKey="label"
            angle={-45}
            textAnchor="end"
            height={120}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelStyle={{ color: '#94a3b8' }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Legend />
          <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColorForCategory(entry.category, index)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        {data.length > 0 && (
          <>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-900">
                {formatCurrency(data.filter(f => f.category === 'ODA').reduce((sum, f) => sum + f.totalValue, 0))}
              </div>
              <div className="text-blue-600 text-xs">Total ODA</div>
            </div>
            {includeNonODA && (
              <>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="font-semibold text-amber-900">
                    {formatCurrency(data.filter(f => f.category === 'OOF').reduce((sum, f) => sum + f.totalValue, 0))}
                  </div>
                  <div className="text-amber-600 text-xs">Total OOF</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-900">
                    {formatCurrency(data.filter(f => f.category === 'Other').reduce((sum, f) => sum + f.totalValue, 0))}
                  </div>
                  <div className="text-slate-600 text-xs">Total Other</div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}















