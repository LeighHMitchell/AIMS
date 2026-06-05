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
} from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { ChartLoadingPlaceholder } from '@/components/ui/loading-text'
import { CHART_STRUCTURE_COLORS } from '@/lib/chart-colors'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

/**
 * Disbursement timeliness by provider — planned vs actual disbursement dates.
 * Each provider's planned disbursement tranches are checked against when the
 * activity's cumulative actual disbursements reached the planned target; the
 * bar shows the share delivered on or before the planned due date, with average
 * lateness. Data + method come from /api/analytics/disbursement-timeliness.
 * Presentational only — the parent CompactChartCard supplies the table/CSV
 * toolbar from the `exportData` pushed via onDataChange.
 */

interface TimelinessChartProps {
  dateRange: { from: Date; to: Date }
  refreshKey: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

interface TimelinessData {
  donor: string
  onTimePercentage: number
  averageDelay: number
  totalTransactions: number
}

export function TimelinessChart({ dateRange, refreshKey, onDataChange, compact = false }: TimelinessChartProps) {
  const isExpanded = useChartExpansion()
  const [data, setData] = useState<TimelinessData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (dateRange?.from) params.set('dateFrom', dateRange.from.toISOString())
    if (dateRange?.to) params.set('dateTo', dateRange.to.toISOString())
    apiFetch(`/api/analytics/disbursement-timeliness?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { data: TimelinessData[] }) => {
        if (cancelled) return
        const rows = json.data || []
        setData(rows)
        onDataChange?.(
          rows.map((d) => ({
            Provider: d.donor,
            'On-time (%)': d.onTimePercentage,
            'Avg delay (days)': d.averageDelay,
            'Planned tranches': d.totalTransactions,
          }))
        )
      })
      .catch(() => !cancelled && setData([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // onDataChange is a stable setter from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from, dateRange?.to, refreshKey])

  // Color by performance (slate ramp — darker = more on-time).
  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return '#475569'
    if (percentage >= 60) return '#64748b'
    if (percentage >= 40) return '#94a3b8'
    return '#cbd5e1'
  }

  if (loading) return <ChartLoadingPlaceholder />

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[260px] text-muted-foreground text-sm">
        No timeliness data available for the selected period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={isExpanded ? 400 : 280}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: compact ? 8 : 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STRUCTURE_COLORS.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(value) => `${Number.isFinite(value) ? value : 0}%`}
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis
          type="category"
          dataKey="donor"
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          width={compact ? 110 : 160}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const d = payload[0].payload as TimelinessData
              return (
                <ChartTooltipCard
                  title={d.donor}
                  rows={[
                    { label: 'On-time', value: `${d.onTimePercentage}%`, color: getBarColor(d.onTimePercentage) },
                    { label: 'Avg delay', value: `${d.averageDelay} days` },
                    { label: 'Planned tranches', value: d.totalTransactions },
                  ]}
                />
              )
            }
            return null
          }}
        />
        <Bar dataKey="onTimePercentage" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.onTimePercentage)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
