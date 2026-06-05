"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { apiFetch } from '@/lib/api-fetch'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { getChartColor } from '@/lib/chart-colors'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartCardToolbarRow, useChartCardTableMode } from '@/components/ui/inline-toolbar-buttons'
import { YearRangeChip } from '@/components/ui/year-range-chip'
import { useChartYearRange } from '@/hooks/useChartYearRange'

/**
 * Donut breakdown of disbursements by an IATI classification (Flow Type, Aid
 * Type or Tied Status). Includes a grey "Not reported" slice so the chart
 * reconciles with the underlying financial total. Presentational only — the
 * parent CompactChartCard supplies the table/CSV/colour-scale toolbar from the
 * `exportData` we push via onDataChange.
 */

export type AidClassificationDimension = 'flow' | 'aid' | 'tied' | 'collaboration'

interface Row { code: string; name: string; disbursements: number; commitments: number }

interface Props {
  dimension: AidClassificationDimension
  refreshKey?: number
  onDataChange?: (rows: any[]) => void
  compact?: boolean
}

const NOT_REPORTED_CODE = '__none__'
const NOT_REPORTED_GREY = '#cbd5e1'
// Tied status carries a natural good→bad reading, so colour it semantically.
const TIED_COLORS: Record<string, string> = { '5': '#16a34a', '3': '#f59e0b', '4': '#dc2626' }
// Column key per dimension so the generic table header reads correctly.
const DIM_KEY: Record<AidClassificationDimension, string> = {
  flow: 'flowType',
  aid: 'aidType',
  tied: 'tiedStatus',
  collaboration: 'collaborationType',
}

// Plain-language explainer shown under each chart (expanded view). Written so a
// non-technical reader understands what the chart is, what it tells them, and
// how to read it.
const DESCRIPTIONS: Record<AidClassificationDimension, string> = {
  flow:
    "This chart splits disbursed aid by its 'flow type'. Most aid is Official Development Assistance (ODA) — concessional money given to support development — as opposed to Other Official Flows (OOF), which is public money on more commercial or non-concessional terms. Each slice is that flow type's share of total disbursements; hover to see the exact amount and percentage. A large ODA share means aid is mostly grant-like and development-focused. A grey 'Not reported' slice means some activities haven't recorded a flow type. Use the calendar and year controls (top-left) to change the period.",
  aid:
    "This chart shows how aid is delivered — its 'modality'. Budget support flows straight into the government's own budget and systems; project-type interventions fund specific stand-alone projects; technical assistance provides expertise and training; and so on. Bigger slices mean more money is delivered that way. It helps answer 'how much aid runs through our own systems versus separate projects?'. A grey 'Not reported' slice means the aid type wasn't recorded. Adjust the period with the calendar and year controls (top-left).",
  tied:
    "Tied aid requires the recipient to buy goods and services from the donor's own country; untied aid lets them buy from anywhere — which usually means better value for money and is a long-standing aid-effectiveness commitment. Green is untied (the good outcome), amber is partially tied, and red is tied. A mostly-green chart is a positive story. A grey 'Not reported' slice means the tied status wasn't recorded. Use the calendar and year controls (top-left) to change the period.",
  collaboration:
    "This chart groups aid by collaboration type — broadly, whether it is bilateral (one government to another) or multilateral (channelled through international organisations). It shows the mix of how partners work together to deliver aid. Hover any slice for the exact amount and share, and use the calendar and year controls (top-left) to change the period. A grey 'Not reported' slice means the collaboration type wasn't recorded.",
}

export default function AidClassificationChart({ dimension, refreshKey, onDataChange, compact }: Props) {
  const isExpanded = useChartExpansion()
  const { yearRangeProps, dateFrom, dateTo } = useChartYearRange()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'donut' | 'bar'>('donut')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        const res = await apiFetch(`/api/analytics/aid-classification?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setRows(Array.isArray(json?.[dimension]) ? json[dimension] : [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [dimension, dateFrom, dateTo, refreshKey])

  const colorFor = (r: Row, i: number) => {
    if (r.code === NOT_REPORTED_CODE) return NOT_REPORTED_GREY
    if (dimension === 'tied') return TIED_COLORS[r.code] || getChartColor(i)
    return getChartColor(i)
  }

  const pieData = useMemo(
    () => rows.filter(r => r.disbursements > 0).map((r, i) => ({ ...r, value: r.disbursements, color: colorFor(r, i) })),
    [rows, dimension],
  )

  // Push both metrics to the parent for the table view + CSV export.
  useEffect(() => {
    if (!onDataChange) return
    const key = DIM_KEY[dimension]
    onDataChange(rows.map(r => ({ [key]: r.name, disbursements: r.disbursements, commitments: r.commitments })))
    // onDataChange is a stable setter from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dimension])

  // Shared shaded-header tooltip (matches the rest of the dashboard).
  const total = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData])
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload as Row & { value: number; color: string }
    const code = d.code && d.code !== NOT_REPORTED_CODE ? d.code : undefined
    const pct = total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : undefined
    const title = code ? (
      <span>
        <code className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs mr-1.5">{code}</code>
        {d.name}
      </span>
    ) : d.name
    const rows = [
      { label: 'Disbursements', value: formatTooltipCurrency(d.disbursements, isExpanded), color: d.color, extra: pct },
    ]
    if (d.commitments) {
      rows.push({ label: 'Commitments', value: formatTooltipCurrency(d.commitments, isExpanded), color: undefined as any, extra: undefined })
    }
    return <ChartTooltipCard title={title} rows={rows} />
  }

  const tableMode = useChartCardTableMode()
  const height = isExpanded ? 460 : 260

  const body = loading ? (
    <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">Loading…</div>
  ) : pieData.length === 0 ? (
    <div className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">No data available</div>
  ) : viewType === 'bar' ? (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={pieData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatTooltipCurrency(v, false)}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis type="category" dataKey="name" width={compact ? 120 : 200} tick={{ fontSize: 11, fill: '#334155' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive={!isExpanded}>
          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
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
      <ChartCardToolbarRow
        filters={
          <>
            <YearRangeChip {...yearRangeProps} />
            {!tableMode && (
              <div className="inline-flex rounded-md border border-border overflow-hidden text-helper">
                {(['donut', 'bar'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setViewType(t)}
                    className={`px-2.5 py-1 transition-colors ${
                      viewType === t ? 'bg-foreground text-background' : 'bg-white text-muted-foreground hover:bg-muted'
                    }`}
                    title={t === 'donut' ? 'Donut' : 'Horizontal bar'}
                  >
                    {t === 'donut' ? 'Donut' : 'Bar'}
                  </button>
                ))}
              </div>
            )}
          </>
        }
      />
      {!tableMode && body}
      {isExpanded && (
        <p className="text-body text-muted-foreground leading-relaxed mt-3">
          {DESCRIPTIONS[dimension]}
        </p>
      )}
    </div>
  )
}
