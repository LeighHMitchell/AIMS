"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartCardToolbarRow, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { useChartYearRange } from '@/hooks/useChartYearRange'

/**
 * Recipient-government (RGC) counterpart contribution vs external development-
 * partner financing. Presentational only; the parent CompactChartCard renders
 * the table/CSV/colour-scale toolbar from exportData.
 */

const DESCRIPTION =
  "This chart compares what the government itself puts into aid activities — its 'counterpart' contribution, both cash (financial) and in-kind items like staff time, office space, land or tax exemptions — against what external development partners actually disburse. It answers a simple ownership question: how much of the financing is domestic versus external? A larger government share signals stronger national ownership and co-financing. Use the calendar and year controls (top-left) to change the period; note that some government contributions are recorded without a specific date, so they are always included regardless of the period selected."

interface GovData { external: number; governmentFinancial: number; governmentInKind: number }

interface Props {
  refreshKey?: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

const COLORS = {
  external: '#2563eb',   // blue — external partners
  financial: '#16a34a',  // green — government cash
  inKind: '#0d9488',     // teal — government in-kind / other
}

export default function GovernmentContributionChart({ refreshKey, onDataChange, compact }: Props) {
  const isExpanded = useChartExpansion()
  const { yearRangeProps, dateFrom, dateTo } = useChartYearRange()
  const [data, setData] = useState<GovData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        const res = await apiFetch(`/api/analytics/government-contribution?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [dateFrom, dateTo, refreshKey])

  const slices = useMemo(() => {
    if (!data) return []
    return [
      { source: 'External (development partners)', amount: data.external, color: COLORS.external },
      { source: 'Government – financial (RGC)', amount: data.governmentFinancial, color: COLORS.financial },
      { source: 'Government – in-kind / other', amount: data.governmentInKind, color: COLORS.inKind },
    ]
  }, [data])

  useEffect(() => {
    if (!onDataChange) return
    onDataChange(slices.map(s => ({ source: s.source, amount: s.amount })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices])

  const pieData = slices.filter(s => s.amount > 0)
  const total = useMemo(() => pieData.reduce((s, d) => s + d.amount, 0), [pieData])

  // Shared shaded-header tooltip (matches the rest of the dashboard).
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload as { source: string; amount: number; color: string }
    const pct = total > 0 ? `${((d.amount / total) * 100).toFixed(1)}%` : undefined
    return (
      <ChartTooltipCard
        title={d.source}
        rows={[{ label: 'Amount', value: formatTooltipCurrency(d.amount, isExpanded), color: d.color, extra: pct }]}
      />
    )
  }

  const tableMode = useChartCardTableMode()
  const height = isExpanded ? 460 : 260

  const body = loading ? (
    <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">Loading…</div>
  ) : pieData.length === 0 ? (
    <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">No data available</div>
  ) : (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="amount"
          nameKey="source"
          cx="50%"
          cy="50%"
          innerRadius={isExpanded ? 90 : 55}
          outerRadius={isExpanded ? 150 : 95}
          paddingAngle={1}
        >
          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {!compact && (
          <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
        )}
      </PieChart>
    </ResponsiveContainer>
  )

  return (
    <div className="w-full">
      {/* Controls row (expanded only): calendar + year-range picker left,
          Chart|Table toggle + Download CSV right. The card renders the generic
          table below in table mode. */}
      <ChartCardToolbarRow filters={<YearRangeChip {...yearRangeProps} />} />
      {!tableMode && body}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-3">
          {DESCRIPTION}
        </p>
      )}
    </div>
  )
}
