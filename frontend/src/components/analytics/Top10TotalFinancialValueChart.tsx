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
  Cell
} from 'recharts'
import { LoadingText } from '@/components/ui/loading-text'
import { BarChart3, DollarSign } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors';

interface Top10TotalFinancialValueChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: DonorData[]) => void
}

interface DonorData {
  orgId: string
  name: string
  acronym: string | null
  totalValue: number
  shortName: string
}

export function Top10TotalFinancialValueChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange
}: Top10TotalFinancialValueChartProps) {
  const [data, setData] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        limit: '10'
      })
      
      if (filters?.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters?.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      console.log('[Top10TotalFinancialValue] Fetching from:', `/api/analytics/top-10/total-financial-value?${params}`)
      const response = await apiFetch(`/api/analytics/top-10/total-financial-value?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Top10TotalFinancialValue] Error response:', errorText)
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      console.log('[Top10TotalFinancialValue] API response full:', JSON.stringify(result, null, 2))
      
      const donors = (result.donors || []).map((d: any) => ({
        ...d,
        shortName: d.acronym || d.name.split(' ').slice(0, 2).join(' ')
      }))

      console.log('[Top10TotalFinancialValue] Final data count:', donors.length, 'items:', donors)
      setData(donors)
      onDataChange?.(donors)
    } catch (error) {
      console.error('[Top10TotalFinancialValueChart] Error:', error)
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
      console.error('[Top10TotalFinancialValueChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Generate shades of blue for bars
  const barColors = [
    '#1e40af', // blue-800
    '#2563eb', // blue-600
    '#3b82f6', // blue-500
    '#60a5fa', // blue-400
    '#93c5fd', // blue-300
    '#bfdbfe', // blue-200
    '#1e40af', // repeat
    '#2563eb',
    '#3b82f6',
    '#60a5fa',
    '#94a3b8' // slate-400 for "Others"
  ]

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
          <p className="text-slate-600">No financial data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_STRUCTURE_COLORS.grid}
          horizontal={false}
        />
        <XAxis 
          type="number"
          tickFormatter={formatCurrency}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          type="category"
          dataKey="shortName"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          width={90}
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
        <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.orgId === 'others' ? '#94a3b8' : barColors[index % (barColors.length - 1)]} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

