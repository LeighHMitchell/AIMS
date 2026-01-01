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
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, CheckCircle2 } from 'lucide-react'

interface Top10GovernmentValidatedChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    sector?: string
  }
  refreshKey: number
  onDataChange?: (data: PartnerData[]) => void
  compact?: boolean
}

interface PartnerData {
  orgId: string
  name: string
  acronym: string | null
  totalValue: number
  projectCount: number
  shortName: string
}

export function Top10GovernmentValidatedChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange,
  compact = false
}: Top10GovernmentValidatedChartProps) {
  const [data, setData] = useState<PartnerData[]>([])
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

      const response = await fetch(`/api/analytics/top-10/government-validated?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Top10GovernmentValidatedChart] API error:', response.status, errorText)
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      console.log('[Top10GovernmentValidatedChart] API response:', result)
      
      const partners = (result.partners || []).map((p: any) => ({
        ...p,
        shortName: p.acronym || p.name.split(' ').slice(0, 2).join(' ')
      }))

      console.log('[Top10GovernmentValidatedChart] Processed partners:', partners.length)
      setData(partners)
      onDataChange?.(partners)
    } catch (error) {
      console.error('[Top10GovernmentValidatedChart] Error:', error)
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
      console.error('[Top10GovernmentValidatedChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Generate shades of amber/gold for bars
  const barColors = [
    '#d97706', // amber-600
    '#f59e0b', // amber-500
    '#fbbf24', // amber-400
    '#fcd34d', // amber-300
    '#fde68a', // amber-200
    '#fef3c7', // amber-100
    '#d97706', // repeat
    '#f59e0b',
    '#fbbf24',
    '#fcd34d',
    '#94a3b8' // slate-400 for "Others"
  ]

  // Compact mode renders just the chart
  if (compact) {
    if (loading) {
      return <Skeleton className="h-full w-full" />
    }
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p className="text-sm">No data available</p>
        </div>
      )
    }
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="shortName" tick={{ fontSize: 9 }} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[400px] w-full bg-slate-100" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No government-validated project data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={data}
        layout="horizontal"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#e2e8f0" 
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
          formatter={(value: number, name: string, props: any) => {
            if (name === 'totalValue') {
              return [
                formatCurrency(value),
                `Value (${props.payload.projectCount} project${props.payload.projectCount !== 1 ? 's' : ''})`
              ]
            }
            return [value, name]
          }}
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















