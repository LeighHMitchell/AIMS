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
import { Button } from '@/components/ui/button'
import { BarChart3, CheckCircle2, Table as TableIcon } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'

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

type ViewMode = 'bar' | 'table'

export function Top10GovernmentValidatedChart({
  dateRange,
  filters,
  refreshKey,
  onDataChange,
  compact = false
}: Top10GovernmentValidatedChartProps) {
  const [data, setData] = useState<PartnerData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('bar')

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

      const response = await apiFetch(`/api/analytics/top-10/government-validated?${params}`)
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
        maximumFractionDigits: 0
      }).format(safeValue)
    } catch (error) {
      console.error('[Top10GovernmentValidatedChart] Error formatting currency:', error, value)
      return '$0'
    }
  }

  // Custom Y-axis tick that never wraps text
  const NoWrapTick = ({ x, y, payload, fontSize = 11 }: any) => {
    const label = payload?.value || ''
    return (
      <text x={x} y={y} textAnchor="end" dominantBaseline="central" fill="#64748b" fontSize={fontSize}>
        {label}
      </text>
    )
  }

  const ValidatedTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const orgDisplay = item.acronym ? `${item.name} (${item.acronym})` : item.name
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-surface-muted px-3 py-2 border-b border-slate-200">
            <p className="font-semibold text-slate-900 text-sm">{orgDisplay}</p>
          </div>
          <div className="p-2">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-slate-700 font-medium">Value</td>
                  <td className="py-1 text-right font-semibold text-slate-900">{formatCurrency(item.totalValue)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-slate-700 font-medium">Projects</td>
                  <td className="py-1 text-right font-semibold text-slate-900">{item.projectCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return null
  }

  const BAR_COLOR = '#4C5568'
  const OTHERS_COLOR = '#94a3b8'

  // Compact mode renders just the chart
  if (compact) {
    if (loading) {
      return <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="shortName" tick={<NoWrapTick fontSize={9} />} width={55} interval={0} />
            <Tooltip content={<ValidatedTooltip />} />
            <Bar dataKey="totalValue" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
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
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex">
          <Button
            variant={viewMode === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('bar')}
            className="h-8 rounded-r-none"
            title="Bar Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 rounded-l-none"
            title="Table"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'bar' ? (
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
              tick={<NoWrapTick fontSize={12} />}
              axisLine={{ stroke: '#cbd5e1' }}
              width={90}
              interval={0}
            />
            <Tooltip content={<ValidatedTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="totalValue" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Organization</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Total Value</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Projects</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={entry.orgId} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-slate-900">
                    {entry.name}{entry.acronym ? ` (${entry.acronym})` : ''}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-medium">
                    {formatCurrency(entry.totalValue)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900">
                    {entry.projectCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-slate-600 leading-relaxed">
        This chart ranks development partners by the total value of projects that have been government-validated.
        Use this to identify which partners have the strongest track record of completing the validation process
        and to prioritize engagement with partners committed to transparency and government oversight.
      </p>
    </div>
  )
}















