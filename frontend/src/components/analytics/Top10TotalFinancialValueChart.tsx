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
import { CHART_STRUCTURE_COLORS, OTHERS_COLOR } from '@/lib/chart-colors';
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Top10Basis = 'total' | 'commitment' | 'disbursement'

const BASIS_LABEL: Record<Top10Basis, string> = {
  total: 'Commitments + Disbursements',
  commitment: 'Commitments',
  disbursement: 'Disbursements',
}

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
  // Basis controls which transaction types are summed server-side. Default
  // matches the original behaviour (commitments + disbursements together).
  const [basis, setBasis] = useState<Top10Basis>('total')

  useEffect(() => {
    fetchData()
  }, [dateRange, filters, refreshKey, basis])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        limit: '10',
        basis,
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

  // Single Blue Slate fill for all bars — bar length already encodes
  // "more vs less", so a varying ramp would just add noise. "Others"
  // stays a lighter shade for contrast.
  const BAR_COLOR = '#4c5568'

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload
    const fullName = item.acronym ? `${item.name} (${item.acronym})` : item.name
    return (
      <ChartTooltipCard
        title={fullName}
        rows={[{
          label: BASIS_LABEL[basis],
          value: formatTooltipCurrency(item.totalValue, isExpanded),
          color: item.orgId === 'others' ? OTHERS_COLOR : BAR_COLOR,
        }]}
      />
    )
  }

  // Basis toggle — surfaces what the bars represent so users can compare
  // Commitments alone vs Disbursements alone vs both together. Server-side
  // filter via `basis` query param.
  const basisToggle = (
    <div className="flex items-center justify-end">
      <Select value={basis} onValueChange={(v) => setBasis(v as Top10Basis)}>
        <SelectTrigger className="h-8 w-[240px] text-helper">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="total">Commitments + Disbursements</SelectItem>
          <SelectItem value="commitment">Commitments only</SelectItem>
          <SelectItem value="disbursement">Disbursements only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {basisToggle}
        <ChartLoadingPlaceholder />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-3">
        {basisToggle}
        <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No financial data available</p>
            <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {basisToggle}
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

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-4">
          This chart ranks the top external development partners by the sum of their outgoing commitments and disbursements within the selected date range. Myanmar government ministries (recipient-country entities) are excluded so domestic budget transfers do not appear as donor flows. The horizontal bars make it easy to compare relative scale across organisations — if fewer than 10 partners have qualifying transactions in the period, the chart shows only the available rows. Hover over any bar to see the exact USD amount.
        </p>
      )}
    </div>
  )
}

