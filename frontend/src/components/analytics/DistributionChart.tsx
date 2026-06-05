"use client"

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { formatCurrencyCompact, formatCurrencyPrecise } from '@/lib/format'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { BUDGET_COLOR } from '@/lib/chart-colors'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'

/**
 * Distribution viewer for the Outliers dashboard, with three interchangeable
 * views over the same data:
 *   - histogram : equal-width bars (default), bins pre-computed server-side
 *   - box       : horizontal box plot (quartiles + whiskers + outlier dots) —
 *                 the canonical outlier visualisation; the fence is drawn in
 *   - strip     : one dot per record on the value axis — outliers sit alone;
 *                 outlier dots are clickable through to the activity
 *
 * The histogram bins arrive in original units; box/strip plot raw `points` on a
 * log (or linear, for ratios) value axis.
 */

export interface DistHistogramBin {
  x0: number
  x1: number
  count: number
  isOutlier: boolean
}

export interface DistPoint {
  v: number
  o: boolean
  href?: string
}

export type DistChartType = 'histogram' | 'box' | 'strip'

interface DistributionChartProps {
  chartType?: DistChartType
  bins: DistHistogramBin[]
  points?: DistPoint[]
  summary?: { min: number; max: number; median: number; p25: number; p75: number }
  unit: 'usd' | 'ratio'
  scale?: 'linear' | 'log10'
  fenceUpper?: number | null
  fenceLower?: number | null
  countLabel?: string
  compact?: boolean
  height?: number
}

/** Outlier-bin fill — a UI "flagged" state colour, not a financial-series colour. */
const OUTLIER_COLOR = '#cf3759'

function fmt(value: number, unit: 'usd' | 'ratio', precise = false): string {
  if (unit === 'ratio') return `${value.toFixed(value < 10 ? 2 : 0)}×`
  return precise ? formatCurrencyPrecise(value) : formatCurrencyCompact(value)
}

export function DistributionChart({
  chartType = 'histogram',
  bins,
  points = [],
  summary,
  unit,
  scale = 'log10',
  fenceUpper,
  fenceLower,
  countLabel = 'Records',
  compact = false,
  height,
}: DistributionChartProps) {
  const isExpanded = useChartExpansion()
  const h = height ?? (isExpanded ? 360 : 240)

  if (chartType === 'strip') {
    return (
      <StripPlot
        points={points}
        unit={unit}
        scale={scale}
        fenceUpper={fenceUpper ?? null}
        fenceLower={fenceLower ?? null}
        countLabel={countLabel}
        compact={compact}
        height={h}
      />
    )
  }
  if (chartType === 'box') {
    return (
      <BoxPlot
        points={points}
        summary={summary}
        unit={unit}
        scale={scale}
        fenceUpper={fenceUpper ?? null}
        fenceLower={fenceLower ?? null}
        height={h}
      />
    )
  }
  return (
    <Histogram
      bins={bins}
      unit={unit}
      fenceUpper={fenceUpper ?? null}
      countLabel={countLabel}
      compact={compact}
      height={h}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Histogram (default)
// ─────────────────────────────────────────────────────────────────────────────
function Histogram({
  bins,
  unit,
  fenceUpper,
  countLabel,
  compact,
  height,
}: {
  bins: DistHistogramBin[]
  unit: 'usd' | 'ratio'
  fenceUpper: number | null
  countLabel: string
  compact: boolean
  height: number
}) {
  const isExpanded = useChartExpansion()
  const data = useMemo(
    () =>
      bins.map((b, i) => ({
        idx: i,
        label: fmt(b.x0, unit),
        rangeLabel: `${fmt(b.x0, unit)} – ${fmt(b.x1, unit)}`,
        count: b.count,
        isOutlier: b.isOutlier,
      })),
    [bins, unit]
  )
  const fenceIdx = useMemo(() => {
    const i = bins.findIndex((b) => b.isOutlier && fenceUpper != null && b.x0 >= fenceUpper)
    return i === -1 ? null : i
  }, [bins, fenceUpper])

  if (bins.length === 0) return <Empty />
  const tickEvery = compact ? 6 : 4

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="idx"
          tickFormatter={(idx: number) => (idx % tickEvery === 0 ? data[idx]?.label ?? '' : '')}
          tick={{ fontSize: 11, fill: '#64748b' }}
          interval={0}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null
            const d = payload[0].payload as (typeof data)[number]
            return (
              <ChartTooltipCard
                title={d.rangeLabel}
                subtitle={d.isOutlier ? 'Flagged — beyond the fence' : undefined}
                rows={[{ label: countLabel, value: d.count.toLocaleString(), color: d.isOutlier ? OUTLIER_COLOR : BUDGET_COLOR }]}
              />
            )
          }}
        />
        {fenceIdx != null && (
          <ReferenceLine
            x={fenceIdx}
            stroke={OUTLIER_COLOR}
            strokeDasharray="4 4"
            label={{ value: `fence ${fmt(fenceUpper as number, unit)}`, position: 'top', fontSize: 10, fill: OUTLIER_COLOR }}
          />
        )}
        <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={!isExpanded}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isOutlier ? OUTLIER_COLOR : BUDGET_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip plot — one dot per record on the value axis (jittered vertically)
// ─────────────────────────────────────────────────────────────────────────────
function StripPlot({
  points,
  unit,
  scale,
  fenceUpper,
  fenceLower,
  countLabel,
  compact,
  height,
}: {
  points: DistPoint[]
  unit: 'usd' | 'ratio'
  scale: 'linear' | 'log10'
  fenceUpper: number | null
  fenceLower: number | null
  countLabel: string
  compact: boolean
  height: number
}) {
  // Deterministic pseudo-jitter so dots don't stack on one line.
  const data = useMemo(
    () =>
      points
        .filter((p) => (scale === 'log10' ? p.v > 0 : Number.isFinite(p.v)))
        .map((p, i) => ({ v: p.v, y: 0.15 + (((i * 2654435761) % 1000) / 1000) * 0.7, o: p.o, href: p.href })),
    [points, scale]
  )
  const domain = useMemo(() => {
    if (data.length === 0) return [0, 1] as [number, number]
    let min = Infinity
    let max = -Infinity
    for (const d of data) {
      if (d.v < min) min = d.v
      if (d.v > max) max = d.v
    }
    return [min, max] as [number, number]
  }, [data])

  if (data.length === 0) return <Empty />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          dataKey="v"
          scale={scale === 'log10' ? 'log' : 'linear'}
          domain={domain}
          tickFormatter={(v: number) => fmt(v, unit)}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis type="number" dataKey="y" domain={[0, 1]} hide />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null
            const d = payload[0].payload as (typeof data)[number]
            return (
              <ChartTooltipCard
                title={fmt(d.v, unit, true)}
                subtitle={d.o ? 'Flagged — beyond the fence' : undefined}
                rows={[{ label: countLabel.replace(/s$/, ''), value: d.o ? 'flagged' : 'within range', color: d.o ? OUTLIER_COLOR : BUDGET_COLOR }]}
              />
            )
          }}
        />
        {fenceUpper != null && (
          <ReferenceLine x={fenceUpper} stroke={OUTLIER_COLOR} strokeDasharray="4 4"
            label={{ value: `fence ${fmt(fenceUpper, unit)}`, position: 'top', fontSize: 10, fill: OUTLIER_COLOR }} />
        )}
        {fenceLower != null && fenceLower > (domain[0] ?? 0) && (
          <ReferenceLine x={fenceLower} stroke={OUTLIER_COLOR} strokeDasharray="4 4" />
        )}
        <Scatter
          data={data}
          isAnimationActive={false}
          onClick={(d: any) => {
            const href = d?.href
            if (href) window.open(href, '_blank')
          }}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.o ? OUTLIER_COLOR : BUDGET_COLOR} fillOpacity={d.o ? 0.95 : 0.45} cursor={d.href ? 'pointer' : 'default'} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Box plot — horizontal, custom SVG (recharts has no native box plot)
// ─────────────────────────────────────────────────────────────────────────────
function BoxPlot({
  points,
  summary,
  unit,
  scale,
  fenceUpper,
  fenceLower,
  height,
}: {
  points: DistPoint[]
  summary?: { min: number; max: number; median: number; p25: number; p75: number }
  unit: 'usd' | 'ratio'
  scale: 'linear' | 'log10'
  fenceUpper: number | null
  fenceLower: number | null
  height: number
}) {
  const usable = useMemo(() => points.filter((p) => (scale === 'log10' ? p.v > 0 : Number.isFinite(p.v))), [points, scale])

  const model = useMemo(() => {
    if (!summary || usable.length === 0) return null
    const min = Math.min(summary.min, ...usable.map((p) => p.v))
    const max = Math.max(summary.max, ...usable.map((p) => p.v))
    // Tukey whiskers: extent of the non-outlier points.
    const inRange = usable.filter((p) => !p.o).map((p) => p.v)
    const whiskerLo = inRange.length ? Math.min(...inRange) : summary.p25
    const whiskerHi = inRange.length ? Math.max(...inRange) : summary.p75
    const outliers = usable.filter((p) => p.o)
    return { min, max, whiskerLo, whiskerHi, outliers }
  }, [summary, usable])

  if (!summary || !model) return <Empty />

  const { min, max, whiskerLo, whiskerHi, outliers } = model
  // value → percent across the plot (log or linear)
  const pct = (v: number): number => {
    if (max <= min) return 50
    if (scale === 'log10') {
      const l0 = Math.log10(min)
      const l1 = Math.log10(max)
      return Math.max(0, Math.min(100, ((Math.log10(Math.max(v, min)) - l0) / (l1 - l0)) * 100))
    }
    return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  }

  const cy = Math.round(height * 0.42)
  const boxH = Math.min(64, Math.round(height * 0.32))
  const ticks = [min, summary.median, max]

  return (
    <div className="w-full" style={{ height }}>
      <svg width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Box plot">
        {/* whisker line */}
        <line x1={`${pct(whiskerLo)}%`} x2={`${pct(whiskerHi)}%`} y1={cy} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
        {/* whisker caps */}
        {[whiskerLo, whiskerHi].map((v, i) => (
          <line key={i} x1={`${pct(v)}%`} x2={`${pct(v)}%`} y1={cy - boxH / 2} y2={cy + boxH / 2} stroke="#94a3b8" strokeWidth={1.5} />
        ))}
        {/* box (Q1–Q3) */}
        <rect
          x={`${pct(summary.p25)}%`}
          y={cy - boxH / 2}
          width={`${Math.max(0, pct(summary.p75) - pct(summary.p25))}%`}
          height={boxH}
          fill={BUDGET_COLOR}
          fillOpacity={0.18}
          stroke={BUDGET_COLOR}
          strokeWidth={1.5}
        >
          <title>{`Q1 ${fmt(summary.p25, unit, true)} – Q3 ${fmt(summary.p75, unit, true)}`}</title>
        </rect>
        {/* median */}
        <line x1={`${pct(summary.median)}%`} x2={`${pct(summary.median)}%`} y1={cy - boxH / 2} y2={cy + boxH / 2} stroke={BUDGET_COLOR} strokeWidth={2.5}>
          <title>{`Median ${fmt(summary.median, unit, true)}`}</title>
        </line>
        {/* fence marker */}
        {fenceUpper != null && fenceUpper <= max && (
          <line x1={`${pct(fenceUpper)}%`} x2={`${pct(fenceUpper)}%`} y1={cy - boxH} y2={cy + boxH} stroke={OUTLIER_COLOR} strokeWidth={1} strokeDasharray="4 4" />
        )}
        {/* outlier dots */}
        {outliers.map((p, i) => (
          <circle
            key={i}
            cx={`${pct(p.v)}%`}
            cy={cy + (i % 2 === 0 ? -6 : 6)}
            r={4}
            fill={OUTLIER_COLOR}
            fillOpacity={0.9}
            style={{ cursor: p.href ? 'pointer' : 'default' }}
            onClick={() => p.href && window.open(p.href, '_blank')}
          >
            <title>{fmt(p.v, unit, true)}</title>
          </circle>
        ))}
        {/* axis ticks */}
        {ticks.map((v, i) => (
          <text key={i} x={`${pct(v)}%`} y={height - 6} fontSize={11} fill="#64748b" textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>
            {fmt(v, unit)}
          </text>
        ))}
        {fenceUpper != null && fenceUpper <= max && (
          <text x={`${pct(fenceUpper)}%`} y={cy - boxH - 4} fontSize={10} fill={OUTLIER_COLOR} textAnchor="middle">
            fence {fmt(fenceUpper, unit)}
          </text>
        )}
      </svg>
    </div>
  )
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-body">No data available</div>
  )
}
