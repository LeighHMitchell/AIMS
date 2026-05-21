"use client"

import React, { useMemo } from 'react'
import { ResponsiveSunburst } from '@nivo/sunburst'
import { getSectorColor } from '@/lib/chart-colors'
import { useChartExpansion } from '@/lib/chart-expansion-context'
import { formatTooltipCurrency } from '@/lib/format'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import type { HierarchyRow } from './types'

interface SunburstViewProps {
  rows: HierarchyRow[]
  height: number
}

interface SunburstNode {
  id: string
  name: string
  code: string
  color?: string
  value?: number
  children?: SunburstNode[]
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

export function SunburstView({ rows, height }: SunburstViewProps) {
  const isExpanded = useChartExpansion()

  // Sunburst always shows the full Group → Category → Sub-Sector hierarchy
  // regardless of the level toggle on the container — the inner rings ARE
  // the level toggle, visually.
  const data = useMemo<SunburstNode>(() => {
    const groups = new Map<string, {
      name: string
      categories: Map<string, {
        name: string
        sectors: Map<string, { name: string; value: number }>
      }>
    }>()

    for (const r of rows) {
      if (r.value <= 0) continue
      let g = groups.get(r.groupCode)
      if (!g) {
        g = { name: r.groupName || r.groupCode, categories: new Map() }
        groups.set(r.groupCode, g)
      }
      let c = g.categories.get(r.categoryCode)
      if (!c) {
        c = { name: r.categoryName || r.categoryCode, sectors: new Map() }
        g.categories.set(r.categoryCode, c)
      }
      const s = c.sectors.get(r.sectorCode)
      if (s) {
        s.value += r.value
      } else {
        c.sectors.set(r.sectorCode, { name: r.sectorName || r.sectorCode, value: r.value })
      }
    }

    // Assign group-anchor colors stable across renders by group ordering.
    const groupOrder = Array.from(groups.keys()).sort()

    const tree: SunburstNode = {
      id: 'root',
      name: 'All Sectors',
      code: '',
      children: groupOrder.map((gCode, gi) => {
        const g = groups.get(gCode)!
        const groupColor = getSectorColor(gi)
        return {
          id: `group:${gCode}`,
          name: g.name,
          code: gCode,
          color: groupColor,
          children: Array.from(g.categories.entries()).map(([cCode, c]) => ({
            id: `cat:${cCode}`,
            name: c.name,
            code: cCode,
            color: groupColor,
            children: Array.from(c.sectors.entries()).map(([sCode, s]) => ({
              id: `sec:${sCode}`,
              name: s.name,
              code: sCode,
              color: groupColor,
              value: s.value,
            })),
          })),
        }
      }),
    }
    return tree
  }, [rows])

  const isEmpty = !data.children || data.children.length === 0
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No sector data available</p>
      </div>
    )
  }

  return (
    <div
      // [&_svg]:max-w-none unsets the global svg max-width:100% in globals.css.
      className="w-full [&_svg]:max-w-none"
      style={{ height, width: '100%' }}
    >
      <ResponsiveSunburst
      data={data as any}
      id="id"
      value="value"
      cornerRadius={1}
      borderWidth={1}
      borderColor="#ffffff"
      colors={(node: any) => (node.data?.color as string) || '#94a3b8'}
      childColor={{ from: 'color', modifiers: [['brighter', 0.25]] }}
      enableArcLabels
      arcLabel={(node: any) => (node.value > 0 ? `${Math.round((node.percentage ?? 0))}%` : '')}
      arcLabelsSkipAngle={12}
      arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
      tooltip={(node: any) => (
        <ChartTooltipCard
          title={
            <TitleWithCode
              code={node.data?.code ?? ''}
              name={node.data?.name ?? node.id}
            />
          }
          rows={[
            {
              label: 'Disbursements',
              value: formatTooltipCurrency(node.value, isExpanded),
              color: node.color,
            },
            {
              label: 'Share of total',
              value: `${(node.percentage ?? 0).toFixed(1)}%`,
            },
          ]}
        />
      )}
        animate={false}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      />
    </div>
  )
}
