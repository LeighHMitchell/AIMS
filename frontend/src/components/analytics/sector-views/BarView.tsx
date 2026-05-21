"use client"

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ResponsiveBar } from '@nivo/bar'
import { getSectorColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { SectorSlice } from './types'

interface BarViewProps {
  slices: SectorSlice[]
  height: number
}

interface SectorBarDatum {
  sector: string
  value: number
  color: string
  fullName: string
  code: string
  groupCode: string
  groupName: string
  // Required by Nivo's BarDatum constraint (Record<string, string | number>).
  [key: string]: string | number
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

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function BarView({ slices, height }: BarViewProps) {
  const isExpanded = useChartExpansion()

  // Track cursor inside the chart so we can render the tooltip via a portal to
  // document.body — Nivo's default tooltip lives inside the scroll container
  // and gets clipped when hovering bars near the top of the visible area.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setCursor({ x: e.clientX, y: e.clientY })
  }, [])
  const onPointerLeave = useCallback(() => setCursor(null), [])

  const data = useMemo<SectorBarDatum[]>(() => {
    // Colour by parent DAC group so e.g. every Education-* sector reads as the
    // same hue. Group ordering is stable across renders (first-seen order).
    const groupColor = new Map<string, string>()
    for (const s of slices) {
      if (!groupColor.has(s.groupCode)) {
        groupColor.set(s.groupCode, getSectorColor(groupColor.size))
      }
    }
    // Nivo renders the first datum at the bottom of a horizontal chart; reverse
    // so the largest sector ends up on top.
    return slices
      .filter(s => s.value > 0)
      .map(s => ({
        sector: s.name,
        value: s.value,
        color: groupColor.get(s.groupCode) ?? s.color,
        fullName: s.name,
        code: s.code,
        groupCode: s.groupCode,
        groupName: s.groupName,
      }))
      .reverse()
  }, [slices])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  // Internal vertical scroll: each row gets ~28 px, and we scroll within the
  // prop height. Tooltips are portaled to <body> so the scroll container's
  // overflow:auto can't clip them.
  const minHeight = data.length * 28 + 80
  const innerHeight = Math.max(height, minHeight)

  return (
    <div
      ref={scrollRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      // [&_svg]:max-w-none unsets the global `svg { max-width: 100% }` rule
      // in globals.css, which otherwise clamps Nivo's pixel-sized SVG to 0.
      className="w-full [&_svg]:max-w-none"
      style={{ height, overflowY: 'auto' }}
    >
      <div style={{ height: innerHeight, width: '100%' }}>
        <ResponsiveBar
          data={data}
          keys={['value']}
          indexBy="sector"
          layout="horizontal"
          margin={{ top: 8, right: 24, bottom: 40, left: 180 }}
          padding={0.25}
          colors={({ data: d }) => (d as SectorBarDatum).color}
          enableGridX
          enableGridY={false}
          axisBottom={{
            tickSize: 4,
            tickPadding: 6,
            format: (v: any) =>
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(Number(v) || 0),
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v: any) => truncate(String(v), 24),
          }}
          enableLabel={false}
          theme={{
            axis: {
              ticks: { text: { fontSize: 11, fill: '#64748b' } },
              legend: { text: { fontSize: 12, fill: '#475569' } },
            },
            grid: { line: { stroke: '#e2e8f0', strokeDasharray: '2 2' } },
          }}
          tooltip={({ data: d, value }) => {
            const datum = d as SectorBarDatum
            if (!cursor || typeof document === 'undefined') return null
            const card = (
              <div
                style={{
                  position: 'fixed',
                  left: cursor.x + 14,
                  top: cursor.y + 14,
                  pointerEvents: 'none',
                  zIndex: 9999,
                }}
              >
                <ChartTooltipCard
                  title={<TitleWithCode code={datum.code} name={datum.fullName} />}
                  rows={[
                    {
                      label: 'Disbursements',
                      value: formatTooltipCurrency(value as number, isExpanded),
                      color: datum.color,
                    },
                  ]}
                />
              </div>
            )
            return createPortal(card, document.body)
          }}
          animate={false}
          ariaLabel="Aid disbursements by sector"
        />
      </div>
    </div>
  )
}
