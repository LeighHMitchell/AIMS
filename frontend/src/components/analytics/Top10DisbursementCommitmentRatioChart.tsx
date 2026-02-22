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
import { BarChart3, TrendingUp } from 'lucide-react'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

interface Top10DisbursementCommitmentRatioChartProps {
  dateRange: {
    from: Date
    to: Date
  }
  filters: {
    country?: string
    sector?: string
  }
  refreshKey: number
}

interface PartnerData {
  orgId: string
  name: string
  acronym: string | null
  commitments: number
  disbursements: number
  ratio: number
  shortName: string
}

export function Top10DisbursementCommitmentRatioChart({ 
  dateRange, 
  filters, 
  refreshKey 
}: Top10DisbursementCommitmentRatioChartProps) {
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
      
      if (filters.country && filters.country !== 'all') {
        params.append('country', filters.country)
      }
      if (filters.sector && filters.sector !== 'all') {
        params.append('sector', filters.sector)
      }

      const response = await fetch(`/api/analytics/top-10/disbursement-commitment-ratio?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      
      const partners = (result.partners || [])
        .filter((p: any) => {
          // Validate all numeric fields
          const isValid = p.ratio != null && 
                 !isNaN(p.ratio) && 
                 isFinite(p.ratio) &&
                 p.commitments != null &&
                 !isNaN(p.commitments) &&
                 isFinite(p.commitments) &&
                 p.disbursements != null &&
                 !isNaN(p.disbursements) &&
                 isFinite(p.disbursements);
          return isValid;
        })
        .map((p: any) => ({
          ...p,
          ratio: Number(p.ratio),
          commitments: Number(p.commitments),
          disbursements: Number(p.disbursements),
          shortName: p.acronym || p.name.split(' ').slice(0, 2).join(' ')
        }))

      setData(partners)
    } catch (error) {
      console.error('[Top10DisbursementCommitmentRatioChart] Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const formatPercentage = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '0.0%'
    }
    return `${Number(value).toFixed(1)}%`
  }

  // Generate shades of purple for bars
  const barColors = [
    '#7c3aed', // violet-600
    '#8b5cf6', // violet-500
    '#a78bfa', // violet-400
    '#c4b5fd', // violet-300
    '#ddd6fe', // violet-200
    '#ede9fe', // violet-100
    '#7c3aed', // repeat
    '#8b5cf6',
    '#a78bfa',
    '#c4b5fd',
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
          <TrendingUp className="h-8 w-8 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No disbursement data available</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    return `$${(value / 1000000).toFixed(1)}M`
  }

  // Final data sanitization to ensure no NaN values
  const sanitizedData = data.map(item => ({
    ...item,
    disbursements: isNaN(item.disbursements) || !isFinite(item.disbursements) ? 0 : item.disbursements
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={sanitizedData}
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
        <Bar dataKey="disbursements" radius={[0, 4, 4, 0]}>
          {sanitizedData.map((entry, index) => (
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

