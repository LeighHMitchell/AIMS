"use client"

import React, { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { OTHERS_COLOR } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency, formatCurrencyCompact } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { SectorSlice } from './types'

interface PieViewProps {
  slices: SectorSlice[]
  height: number
  topN?: number
  // Label for the value row in the tooltip (the pie shows the sum across the
  // selected metrics). Defaults to "Value".
  valueLabel?: string
}

interface PieDatum {
  name: string
  code: string
  value: number
  percentage: number
  color: string
  activityCount: number
}

// Dark/white label text for best contrast against a slice colour.
function contrastText(color?: string): string {
  let r = 100, g = 116, b = 139
  if (color?.startsWith('#')) {
    const h = color.slice(1)
    const hex = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    const m = color?.match(/\d+(\.\d+)?/g)
    if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2] }
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1e293b' : '#ffffff'
}

// Sub-label under the center total, e.g. "total disbursements". When the metric
// label already starts with "Total" (the multi-metric case) it's used as-is so
// we don't get "total total (2 metrics)".
function metricTotalPhrase(valueLabel?: string): string {
  if (!valueLabel || valueLabel === 'Value') return 'total'
  return /^total/i.test(valueLabel) ? valueLabel.toLowerCase() : `total ${valueLabel.toLowerCase()}`
}

function TitleWithCode({ code, name }: { code: string; name: string }) {
  if (!code) return <>{name}</>
  return (
    <>
      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-muted-foreground mr-2 align-middle">
        {code}
      </code>
      <span className="align-middle">{name}</span>
    </>
  )
}

export function PieView({ slices, height, topN = 10, valueLabel = 'Value' }: PieViewProps) {
  const isExpanded = useChartExpansion()

  const data = useMemo<PieDatum[]>(() => {
    const total = slices.reduce((sum, s) => sum + s.value, 0)
    if (total <= 0) return []

    const top = slices.slice(0, topN)
    const rest = slices.slice(topN)

    const out: PieDatum[] = top.map(s => ({
      name: s.name,
      code: s.code,
      value: s.value,
      percentage: (s.value / total) * 100,
      color: s.color,
      activityCount: s.activityCount,
    }))

    if (rest.length > 0) {
      const othersValue = rest.reduce((sum, s) => sum + s.value, 0)
      if (othersValue > 0) {
        out.push({
          name: 'Others',
          code: '',
          value: othersValue,
          percentage: (othersValue / total) * 100,
          color: OTHERS_COLOR,
          // Approximate: distinct activities can't be summed exactly across the
          // bucketed sectors, so the Others count may overstate slightly.
          activityCount: rest.reduce((sum, s) => sum + s.activityCount, 0),
        })
      }
    }
    return out
  }, [slices, topN])

  // Center summary: grand total across ALL slices (not just the visible top-N)
  // and the count of funded sectors (non-zero slices).
  const grandTotal = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices])
  const sectorCount = useMemo(() => slices.filter(s => s.value > 0).length, [slices])
  const metricPhrase = metricTotalPhrase(valueLabel)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props
    const pct = isNaN(percentage) || !isFinite(percentage) ? 0 : percentage
    // Skip labels on slices too narrow to fit "NN%" without overlapping the
    // arc edges; tuned slightly higher for the donut since the readable area
    // per slice is the ring band, not the whole pie.
    if (pct < 5) return null
    // Exact midpoint of the donut ring, anchored centrally on both axes so
    // the label sits squarely in the middle of each slice instead of leaning
    // toward the inner or outer edge.
    const radius = innerRadius + (outerRadius - innerRadius) / 2
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)
    return (
      <text
        x={x}
        y={y}
        fill={contrastText(props.payload?.color || props.color)}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-helper font-semibold"
      >
        {`${Math.round(pct)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const item = payload[0]
    const swatch = item.payload?.color || item.color
    const rows = [
      {
        label: valueLabel,
        value: formatTooltipCurrency(item.value, isExpanded),
        color: swatch,
      },
      {
        label: 'Share of total',
        value: `${(item.payload?.percentage ?? 0).toFixed(1)}%`,
      },
      {
        label: 'Activities',
        value: (item.payload?.activityCount ?? 0).toLocaleString(),
      },
    ]
    return (
      <ChartTooltipCard
        title={<TitleWithCode code={item.payload?.code ?? ''} name={item.name} />}
        rows={rows}
      />
    )
  }

  // Compact mode hides the legend so the pie can claim the whole card; expanded
  // mode reserves the bottom ~28% for the legend grid.
  const pieAreaHeight = isExpanded ? Math.max(220, Math.round(height * 0.72)) : height

  return (
    <div className="w-full" style={{ height }}>
      <div className="relative w-full" style={{ height: pieAreaHeight }}>
        <ResponsiveContainer width="100%" height={pieAreaHeight}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              // Donut: hollow center via a 55% inner radius. Outer at 92% keeps
              // plenty of room for the in-slice percentage labels at the
              // midpoint between inner and outer.
              innerRadius="55%"
              outerRadius="92%"
              paddingAngle={1}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center summary sits in the donut hole; pointer-events-none so hover
            still reaches the slices underneath. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className={`font-bold leading-none text-foreground ${isExpanded ? 'text-2xl' : 'text-base'}`}>
            {formatCurrencyCompact(grandTotal)}
          </span>
          <span className={`text-muted-foreground leading-tight mt-0.5 ${isExpanded ? 'text-xs' : 'text-[10px]'}`}>
            {metricPhrase}
          </span>
          <span className={`text-muted-foreground leading-tight mt-1 ${isExpanded ? 'text-xs' : 'text-[10px]'}`}>
            {sectorCount} {sectorCount === 1 ? 'sector' : 'sectors'} funded
          </span>
        </div>
      </div>
      {isExpanded && (
        // Center the legend horizontally beneath the pie: outer flex centers,
        // inner ul keeps the two-column flow so long sector names don't wrap
        // unevenly.
        <div className="w-full flex justify-center pt-4">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 max-w-3xl">
            {data.map(d => (
              <li
                key={d.name}
                className="flex items-center gap-2 text-helper text-muted-foreground min-w-0"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate" title={d.name}>{d.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
