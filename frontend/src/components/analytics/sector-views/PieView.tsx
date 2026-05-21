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
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { SectorSlice } from './types'

interface PieViewProps {
  slices: SectorSlice[]
  height: number
  topN?: number
}

interface PieDatum {
  name: string
  code: string
  value: number
  percentage: number
  color: string
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

export function PieView({ slices, height, topN = 10 }: PieViewProps) {
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
        })
      }
    }
    return out
  }, [slices, topN])

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
        fill="#fff"
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
        label: 'Disbursements',
        value: formatTooltipCurrency(item.value, isExpanded),
        color: swatch,
      },
      {
        label: 'Share of total',
        value: `${(item.payload?.percentage ?? 0).toFixed(1)}%`,
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
