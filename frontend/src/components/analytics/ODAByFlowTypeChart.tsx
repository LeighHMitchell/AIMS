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
import { LoadingText, ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { BarChart3, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api-fetch';
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { InlineViewToggle, InlineCsvButton, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { formatTooltipCurrency, formatAxisCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { YearRangeChip } from '@/components/ui/year-range-chip'

// Full available span (2010 → current year + 10). The data is aggregated by
// flow type with no per-year field, so the picker defaults to this full range.
const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2010 + 11 },
  (_, i) => 2010 + i
)

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
  const isExpanded = useChartExpansion()
  const tableMode = useChartCardTableMode()
  const [data, setData] = useState<FlowData[]>([])
  const [loading, setLoading] = useState(true)
  const [includeNonODA, setIncludeNonODA] = useState(false)
  // Calendar + year-range selection (filters the date window sent to the API).
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [dateWindow, setDateWindow] = useState<{ from: Date; to: Date } | null>(null)

  // Default the year picker to the full available span (this chart's data is
  // aggregated by flow type with no per-year field to derive a data span from).
  useEffect(() => {
    if (selectedYears.length === 0) {
      setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [dateRange, dateWindow, filters, refreshKey, includeNonODA])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch the full available span so the picker shows all data by default.
      const effFrom = dateWindow?.from ?? new Date(AVAILABLE_YEARS[0], 0, 1)
      const effTo = dateWindow?.to ?? new Date(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1], 11, 31)
      const params = new URLSearchParams({
        dateFrom: effFrom.toISOString(),
        dateTo: effTo.toISOString(),
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

  // Generate colors by category — slate-only ramp for dashboard consistency.
  const getColorForCategory = (category: string, index: number): string => {
    const colors: Record<string, string[]> = {
      'ODA': ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],
      'OOF': ['#4c5568', '#5d6b7a', '#6b7789', '#7b95a7'],
      'Other': ['#94a3b8', '#a3b5c2', '#cbd5e1'],
      'Unknown': ['#8a9199']
    };

    const categoryColors = colors[category] || colors['Unknown'];
    return categoryColors[index % categoryColors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const datum = payload[0]?.payload
      const color = payload[0]?.color || payload[0]?.payload?.fill
      const rows: any[] = [{
        label: 'Total Value',
        value: formatTooltipCurrency(Number(payload[0].value) || 0, isExpanded),
        color,
      }]
      if (datum?.code) {
        rows.push({
          label: 'Code',
          value: <span className="font-mono">{datum.code}</span>,
        })
      }
      return (
        <ChartTooltipCard
          title={label}
          subtitle={datum?.category}
          rows={rows}
        />
      )
    }
    return null
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
          <p className="text-muted-foreground">No flow type data available</p>
          <p className="text-body text-muted-foreground mt-2">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls — expanded only. Calendar + year picker on top; below it the
          Non-ODA switch (left) and the view toggle + CSV (right). */}
      {isExpanded && (
        <div className="space-y-3">
          <YearRangeChip
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            onDateRangeChange={setDateWindow}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Switch
                id="include-non-oda"
                checked={includeNonODA}
                onCheckedChange={setIncludeNonODA}
              />
              <Label htmlFor="include-non-oda" className="text-body font-medium cursor-pointer">
                Include Non-ODA Flows (OOF, Private, etc.)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <InlineViewToggle />
              <InlineCsvButton />
            </div>
          </div>
        </div>
      )}

      {!tableMode && (
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
            tickFormatter={formatAxisCurrency}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
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
      )}

      {/* Explanatory text — only in expanded view */}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed">
          This chart breaks down Official Development Assistance by IATI flow type classification, showing how aid is categorised across grants, loans, equity, and other instruments. Toggle the non-ODA switch to include Other Official Flows and private flows for a broader picture, and use the calendar/year selector to set the period.
        </p>
      )}
    </div>
  )
}















