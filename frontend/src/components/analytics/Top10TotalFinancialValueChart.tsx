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
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { BarChart3, DollarSign } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS, CHART_RANKED_PALETTE, OTHERS_COLOR } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'

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
  organisationId: string | null
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
  const isExpanded = useChartExpansion()
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

      const response = await apiFetch(`/api/analytics/top-10/total-financial-value?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Top10TotalFinancialValue] Error response:', errorText)
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      
      const donors = (result.donors || []).map((d: any) => ({
        ...d,
        shortName: d.acronym || d.name.split(' ').slice(0, 2).join(' ')
      }))

      setData(donors)
      // Table-friendly shape with explicit, spaced column names so the
      // expanded dialog's table view shows "Organisation ID" with the
      // IATI org id rather than the internal UUID.
      onDataChange?.(donors.map((d: DonorData) => ({
        'Organisation ID': d.organisationId ?? '',
        'Name': d.acronym ? `${d.name} (${d.acronym})` : d.name,
        'Total Value (USD)': d.totalValue,
      })) as any)
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

  // Single bar colour — the bar length already encodes "more vs less", so
  // a varying ramp would just add noise. Use the darkest slate from the
  // shared ranked palette; "Others" stays a lighter shade for contrast.
  const BAR_COLOR = CHART_RANKED_PALETTE[0]

  // Tooltip styled to match the Financial Totals chart (light card, header
  // strip, table body) so hover UI is consistent across the dashboard.
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload
    const fullName = item.acronym ? `${item.name} (${item.acronym})` : item.name
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
        <div className="bg-surface-muted px-3 py-2 border-b border-border">
          <p className="font-semibold text-foreground">{fullName}</p>
        </div>
        <div className="p-3">
          <table className="w-full text-body">
            <tbody>
              <tr>
                <td className="py-1 pr-3 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR }}
                  />
                  <span className="text-foreground">Total Disbursements</span>
                </td>
                <td className="py-1 text-right font-semibold text-foreground">
                  {formatTooltipCurrency(item.totalValue, isExpanded)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <ChartLoadingPlaceholder />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No financial data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div>
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
            tickFormatter={formatAxisCurrency}
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
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Explanatory text */}
      <p className="text-body text-muted-foreground leading-relaxed mt-4">
        This chart ranks the top 10 organisations by total financial value, combining all transaction types within the selected date range. The horizontal bars make it easy to compare relative scale across organisations. Hover over any bar to see the exact USD amount.
      </p>
    </div>
  )
}

